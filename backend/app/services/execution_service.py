import sys
import io
import time
import subprocess
import tempfile
import os
import json
import re
from typing import Dict, Any, List

from app.schemas.execution import ExecutionResponse, TestResultResponse
from app.core.redis import redis_manager
from app.core.logging import logger
import asyncio
import uuid

class ExecutionService:
    @staticmethod
    def _clean_ts_cpp_java_code(user_code: str, lang: str) -> str:
        """
        Transpiles/cleans TypeScript, C++, Java, C# code into executable JS for the Node runner
        when native compilers are not present.
        """
        clean = user_code
        if lang in ["typescript", "ts"]:
            clean = re.sub(r':\s*[A-Za-z0-9_<>\[\]]+', '', clean)
            clean = re.sub(r'as\s+[A-Za-z0-9_<>\[\]]+', '', clean)
            clean = re.sub(r'interface\s+\w+\s*\{[^}]*\}', '', clean)
            clean = re.sub(r'type\s+\w+\s*=\s*[^;]+;', '', clean)
        elif lang in ["cpp", "c++", "c", "java", "cs", "csharp"]:
            clean = re.sub(r'public\s+class\s+\w+\s*\{', '', clean)
            clean = re.sub(r'using\s+namespace\s+std;', '', clean)
            clean = re.sub(r'#include\s+<[^>]+>', '', clean)
            clean = re.sub(r'(?:public|private|protected|static|\s)*\b(?:int|double|float|long|short|void|bool|boolean|String|auto)\b\s+([A-Za-z0-9_]+)\s*\(([^)]*)\)', r'function \1(\2)', clean)
            clean = re.sub(r'\b(?:int|double|float|long|short|bool|boolean|String|auto)\b\s+', '', clean)
            clean = re.sub(r'std::cout\s*<<\s*([^;]+);', r'console.log(\1);', clean)
            clean = re.sub(r'System\.out\.println\s*\(([^)]+)\);', r'console.log(\1);', clean)
            clean = re.sub(r'Console\.WriteLine\s*\(([^)]+)\);', r'console.log(\1);', clean)
        return clean

    @staticmethod
    async def _execute_python_locally(user_code: str, test_cases: List[Dict[str, Any]]) -> Dict[str, Any]:
        start_time = time.time()
        
        user_code_json = json.dumps(user_code)
        test_cases_json = json.dumps(test_cases)
        
        runner_code = f"""import sys
import io
import ast

user_code = {user_code_json}
test_cases = {test_cases_json}

print('===RESULTS_START===')

namespace = {{}}
top_level_error = None
try:
    old_stdout = sys.stdout
    sys.stdout = io.StringIO()
    exec(user_code, namespace)
    sys.stdout = old_stdout
except Exception as e:
    top_level_error = str(e)
    sys.stdout = old_stdout

for i, tc in enumerate(test_cases):
    print(f'---TC_{{i}}---')
    if top_level_error:
        print(f'RUNTIME_ERROR: {{top_level_error}}')
        print(f'---ERR_{{i}}---')
        continue

    old_stdout = sys.stdout
    sys.stdout = io.StringIO()
    
    old_stdin = sys.stdin
    raw_in = str(tc.get('input', '')).strip()
    sys.stdin = io.StringIO(raw_in)
    
    try:
        user_fns = [v for k, v in namespace.items() if callable(v) and not k.startswith('__')]
        res = None
        called = False
        if user_fns:
            fn = user_fns[-1]
            if not raw_in:
                res = fn()
                called = True
            else:
                try:
                    parsed = ast.literal_eval(f'({{raw_in}},)')
                    if isinstance(parsed, tuple) and len(parsed) == 1 and isinstance(parsed[0], tuple):
                        parsed = parsed[0]
                    res = fn(*parsed) if isinstance(parsed, tuple) else fn(parsed)
                except Exception:
                    res = fn(raw_in)
                called = True
        
        if called and res is not None:
            sys.stdout = io.StringIO()
            print(res)
        elif not called:
            exec(user_code, namespace)
    except Exception as e:
        print(f'RUNTIME_ERROR: {{e}}')
        
    output = sys.stdout.getvalue()
    sys.stdout = old_stdout
    sys.stdin = old_stdin
    
    print(output.strip())
    print(f'---ERR_{{i}}---')
"""

        def _run_py_process(code_str: str):
            temp_path = None
            try:
                with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False, encoding='utf-8') as f:
                    f.write(code_str)
                    temp_path = f.name
                
                proc = subprocess.run(
                    [sys.executable, temp_path],
                    capture_output=True,
                    text=True,
                    timeout=4.0
                )
                return proc.stdout, proc.stderr, False
            except subprocess.TimeoutExpired:
                return "", "Execution Timeout", True
            except Exception as ex:
                return "", str(ex), False
            finally:
                if temp_path and os.path.exists(temp_path):
                    try:
                        os.remove(temp_path)
                    except Exception:
                        pass

        try:
            logs, err_logs, is_timeout = await asyncio.to_thread(_run_py_process, runner_code)
            if is_timeout:
                return {"status": "TIMEOUT", "output": "Execution Timeout", "test_results": []}

            if "===RESULTS_START===" not in logs:
                err_msg = err_logs if err_logs else logs
                return {"status": "RUNTIME_ERROR", "output": err_msg or "Runtime error during execution.", "test_results": []}
                
            results_section = logs.split("===RESULTS_START===")[1]
            test_results = []
            all_passed = True
            
            for i, tc in enumerate(test_cases):
                exp_val = tc.get("expected_output")
                if exp_val is None:
                    exp_val = tc.get("expectedOutput")
                expected = "" if exp_val is None else str(exp_val).strip().replace('\r\n', '\n')
                    
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
    async def _execute_js_locally(user_code: str, test_cases: List[Dict[str, Any]], lang: str = "javascript") -> Dict[str, Any]:
        start_time = time.time()
        clean_code = ExecutionService._clean_ts_cpp_java_code(user_code, lang)
        
        user_code_json = json.dumps(clean_code)
        test_cases_json = json.dumps(test_cases)

        runner_js = f"""
const testCases = {test_cases_json};
const userCode = {user_code_json};

function parseInput(raw) {{
    if (raw === undefined || raw === null) return raw;
    if (typeof raw !== 'string') return raw;
    const trimmed = raw.trim();
    if (trimmed === '') return '';
    try {{
        return JSON.parse(trimmed);
    }} catch (e) {{
        if (!isNaN(trimmed)) return Number(trimmed);
        return trimmed;
    }}
}}

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
        const inputVal = parseInput(tc.input);
        let res = fn(inputVal);
        if (res !== undefined && res !== null) {{
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
        def _run_js_process(code_str: str):
            temp_path = None
            try:
                with tempfile.NamedTemporaryFile(mode='w', suffix='.js', delete=False, encoding='utf-8') as f:
                    f.write(code_str)
                    temp_path = f.name
                
                proc = subprocess.run(
                    ["node", temp_path],
                    capture_output=True,
                    text=True,
                    timeout=4.0
                )
                return proc.stdout, proc.stderr, False
            except subprocess.TimeoutExpired:
                return "", "Execution Timeout", True
            except Exception as ex:
                return "", str(ex), False
            finally:
                if temp_path and os.path.exists(temp_path):
                    try:
                        os.remove(temp_path)
                    except Exception:
                        pass

        try:
            logs, err_logs, is_timeout = await asyncio.to_thread(_run_js_process, runner_js)
            if is_timeout:
                return {"status": "TIMEOUT", "output": "Execution Timeout", "test_results": []}

            if "===RESULTS_START===" not in logs:
                err_msg = err_logs if err_logs else logs
                return {"status": "RUNTIME_ERROR", "output": err_msg or "Runtime error in JS sandbox execution.", "test_results": []}

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
        if lang in ["javascript", "js", "typescript", "ts", "cpp", "c++", "c", "java", "cs", "csharp"]:
            result = await ExecutionService._execute_js_locally(user_code, test_cases, lang)
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

