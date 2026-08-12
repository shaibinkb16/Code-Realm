import sys
import io
import time
import subprocess
import tempfile
import os
import json
from typing import Dict, Any, List

from app.schemas.execution import ExecutionResponse, TestResultResponse
from app.core.redis import redis_manager
from app.core.logging import logger
import asyncio
import uuid

class ExecutionService:
    @staticmethod
    async def _execute_python_locally(user_code: str, test_cases: List[Dict[str, Any]]) -> Dict[str, Any]:
        start_time = time.time()
        
        # Escape user code properly for string interpolation by escaping single triple-quotes
        escaped_user_code = user_code.replace("'''", "\\'\\'\\'")
        
        runner_code = f"""
import sys
import io
import ast

user_code = '''{escaped_user_code}'''
test_cases = {test_cases}

print('===RESULTS_START===')
for i, tc in enumerate(test_cases):
    print(f'---TC_{{i}}---')
    
    old_stdout = sys.stdout
    sys.stdout = io.StringIO()
    
    old_stdin = sys.stdin
    raw_in = str(tc.get('input', '')).strip()
    sys.stdin = io.StringIO(raw_in)
    
    try:
        namespace = {{}}
        exec(user_code, namespace)
        
        out = sys.stdout.getvalue()
        if not out.strip() or out.strip() == 'None':
            # Clear top-level 'None' print output if unreturned function printed None
            sys.stdout = io.StringIO()
            user_fns = [v for k, v in namespace.items() if callable(v) and not k.startswith('__')]
            if user_fns:
                fn = user_fns[-1]
                if not raw_in:
                    res = fn()
                else:
                    try:
                        parsed = ast.literal_eval(f'({{raw_in}},)')
                        if isinstance(parsed, tuple) and len(parsed) == 1 and isinstance(parsed[0], tuple):
                            parsed = parsed[0]
                        res = fn(*parsed) if isinstance(parsed, tuple) else fn(parsed)
                    except Exception:
                        res = fn(raw_in)
                if res is not None:
                    print(res)
    except Exception as e:
        print(f'RUNTIME_ERROR: {{e}}')
        
    output = sys.stdout.getvalue()
    
    sys.stdout = old_stdout
    sys.stdin = old_stdin
    
    print(output.strip())
    print(f'---ERR_{{i}}---')
"""


        try:
            with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
                f.write(runner_code)
                temp_path = f.name
            
            proc = await asyncio.create_subprocess_exec(
                "python", temp_path,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            try:
                stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=3.0)
                logs = stdout.decode('utf-8')
            except asyncio.TimeoutError:
                proc.kill()
                return {"status": "TIMEOUT", "output": "Execution Timeout", "test_results": []}
            finally:
                os.remove(temp_path)
                
            if "===RESULTS_START===" not in logs:
                return {"status": "RUNTIME_ERROR", "output": logs, "test_results": []}
                
            results_section = logs.split("===RESULTS_START===")[1]
            test_results = []
            all_passed = True
            
            for i, tc in enumerate(test_cases):
                exp_val = tc.get("expected_output")
                if exp_val is None:
                    exp_val = tc.get("expectedOutput")
                if exp_val is None:
                    expected = ""
                else:
                    expected = str(exp_val).strip().replace('\r\n', '\n')
                    
                marker_out = f"---TC_{i}---"
                marker_err = f"---ERR_{i}---"
                next_marker = f"---TC_{i+1}---"
                
                try:
                    tc_block = results_section.split(marker_out)[1]
                    if next_marker in tc_block:
                        tc_block = tc_block.split(next_marker)[0]
                    actual_stdout = tc_block.split(marker_err)[0].strip().replace('\r\n', '\n')
                except IndexError:
                    actual_stdout = ""
                    
                passed = bool(expected) and (actual_stdout == expected) and not (actual_stdout in ("None", "None\n") and expected != "None")
                if not passed:
                    all_passed = False
                    
                test_results.append({
                    "test_id": tc.get("id", ""),
                    "description": tc.get("description", ""),
                    "passed": passed,
                    "expected_output": expected,
                    "actual_output": actual_stdout
                })
                
            return {
                "status": "ACCEPTED" if all_passed else "FAILED",
                "execution_time_ms": int((time.time() - start_time) * 1000),
                "test_results": test_results,
                "output": "Execution Complete."
            }
        except Exception as e:
            return {"status": "RUNTIME_ERROR", "output": str(e), "test_results": []}

    @staticmethod
    async def _execute_js_locally(user_code: str, test_cases: List[Dict[str, Any]]) -> Dict[str, Any]:

        start_time = time.time()
        escaped_user_code = user_code.replace("`", "\\`").replace("${", "\\${")
        test_cases_json = json.dumps(test_cases)

        runner_js = f"""
const testCases = {test_cases_json};
const userCode = `{escaped_user_code}`;

console.log("===RESULTS_START===");

testCases.forEach((tc, i) => {{
    console.log(`---TC_${{i}}---`);
    let output = "";
    const originalLog = console.log;
    console.log = (...args) => {{
        output += args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(" ") + "\\n";
    }};

    try {{
        const fn = new Function("input", `${{userCode}}\\nif (typeof solve === 'function') return solve(input);`);
        let res = fn(tc.input);
        if (res !== undefined && res !== null && !output.trim()) {{
            output = String(res);
        }}
    }} catch (err) {{
        output += `RUNTIME_ERROR: ${{err.message}}`;
    }}

    console.log = originalLog;
    console.log(output.trim());
    console.log(`---ERR_${{i}}---`);
}});
"""
        try:
            with tempfile.NamedTemporaryFile(mode='w', suffix='.js', delete=False) as f:
                f.write(runner_js)
                temp_path = f.name

            proc = await asyncio.create_subprocess_exec(
                "node", temp_path,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )

            try:
                stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=3.0)
                logs = stdout.decode('utf-8')
            except asyncio.TimeoutError:
                proc.kill()
                return {"status": "TIMEOUT", "output": "Execution Timeout", "test_results": []}
            finally:
                os.remove(temp_path)

            if "===RESULTS_START===" not in logs:
                return {"status": "RUNTIME_ERROR", "output": logs, "test_results": []}

            results_section = logs.split("===RESULTS_START===")[1]
            test_results = []
            all_passed = True

            for i, tc in enumerate(test_cases):
                exp_val = tc.get("expected_output") if tc.get("expected_output") is not None else tc.get("expectedOutput", "")
                expected = str(exp_val).strip().replace('\r\n', '\n')

                marker_out = f"---TC_{i}---"
                marker_err = f"---ERR_{i}---"
                next_marker = f"---TC_{i+1}---"

                try:
                    tc_block = results_section.split(marker_out)[1]
                    if next_marker in tc_block:
                        tc_block = tc_block.split(next_marker)[0]
                    actual_stdout = tc_block.split(marker_err)[0].strip().replace('\r\n', '\n')
                except IndexError:
                    actual_stdout = ""

                passed = bool(expected) and (actual_stdout == expected)
                if not passed:
                    all_passed = False

                test_results.append({
                    "test_id": tc.get("id", ""),
                    "description": tc.get("description", ""),
                    "passed": passed,
                    "expected_output": expected,
                    "actual_output": actual_stdout
                })

            return {
                "status": "ACCEPTED" if all_passed else "FAILED",
                "execution_time_ms": int((time.time() - start_time) * 1000),
                "test_results": test_results,
                "output": "Execution Complete."
            }
        except Exception as e:
            return {"status": "RUNTIME_ERROR", "output": str(e), "test_results": []}

    @staticmethod
    async def execute_code(user_code: str, language: str, test_cases: List[Dict[str, Any]]) -> ExecutionResponse:
        start_time = time.time()
        
        prohibited_modules = ["os", "sys", "subprocess", "shutil", "socket", "urllib", "requests", "child_process", "fs"]
        for mod in prohibited_modules:
            if f"import {mod}" in user_code or f"from {mod}" in user_code or f"require('{mod}')" in user_code:
                return ExecutionResponse(
                    status="SECURITY_ERROR",
                    all_passed=False,
                    output=f"Security Violation: Access to module '{mod}' is prohibited.",
                    execution_time_ms=0,
                    stars_earned=0,
                    xp_earned=0,
                    coins_earned=0,
                    test_results=[]
                )

        lang = (language or "python").lower()
        if lang in ["javascript", "js", "typescript", "ts"]:
            result = await ExecutionService._execute_js_locally(user_code, test_cases)
        else:
            result = await ExecutionService._execute_python_locally(user_code, test_cases)

        elapsed_ms = result.get("execution_time_ms", int((time.time() - start_time) * 1000))
        all_passed = result.get("status") == "ACCEPTED"
        stars = 3 if all_passed else 0
        xp = 250 if all_passed else 20
        coins = 100 if all_passed else 10
        
        parsed_test_results = [
            TestResultResponse(
                test_id=tr.get("test_id", ""),
                description=tr.get("description", ""),
                passed=tr.get("passed", False),
                expected_output=tr.get("expected_output", ""),
                actual_output=tr.get("actual_output", "")
            )
            for tr in result.get("test_results", [])
        ]
        
        return ExecutionResponse(
            status=result.get("status", "FAILED"),
            all_passed=all_passed,
            output=result.get("output", ""),
            execution_time_ms=elapsed_ms,
            stars_earned=stars,
            xp_earned=xp,
            coins_earned=coins,
            test_results=parsed_test_results
        )

    @staticmethod
    async def execute_python_code(user_code: str, test_cases: List[Dict[str, Any]]) -> ExecutionResponse:
        """Backward compatibility alias for python execution."""
        return await ExecutionService.execute_code(user_code, "python", test_cases)


execution_service = ExecutionService()
