import sys
import io
import time
import subprocess
import tempfile
import os
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
        
        # Escape user code properly for string interpolation
        escaped_user_code = user_code.replace('\"\"\"', '\\\"\\\"\\\"')
        
        runner_code = f\"\"\"
import sys
import io

user_code = \"\"\"{escaped_user_code}\"\"\"
test_cases = {test_cases}

print('===RESULTS_START===')
for i, tc in enumerate(test_cases):
    print(f'---TC_{{i}}---')
    
    old_stdout = sys.stdout
    sys.stdout = io.StringIO()
    
    old_stdin = sys.stdin
    sys.stdin = io.StringIO(tc.get('input', ''))
    
    try:
        # Create a fresh namespace for each test case
        namespace = {{}}
        exec(user_code, namespace)
    except Exception as e:
        print(f'RUNTIME_ERROR: {{e}}')
        
    output = sys.stdout.getvalue()
    
    sys.stdout = old_stdout
    sys.stdin = old_stdin
    
    print(output.strip())
    print(f'---ERR_{{i}}---')
\"\"\"

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
                expected = str(tc.get("expected_output", tc.get("expectedOutput", ""))).strip()
                marker_out = f"---TC_{i}---"
                marker_err = f"---ERR_{i}---"
                next_marker = f"---TC_{i+1}---"
                
                try:
                    tc_block = results_section.split(marker_out)[1]
                    if next_marker in tc_block:
                        tc_block = tc_block.split(next_marker)[0]
                    actual_stdout = tc_block.split(marker_err)[0].strip()
                except IndexError:
                    actual_stdout = ""
                    
                passed = (actual_stdout == expected)
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
    async def execute_python_code(user_code: str, test_cases: List[Dict[str, Any]]) -> ExecutionResponse:
        start_time = time.time()
        
        prohibited_modules = ["os", "sys", "subprocess", "shutil", "socket", "urllib", "requests"]
        for mod in prohibited_modules:
            if f"import {mod}" in user_code or f"from {mod}" in user_code:
                return ExecutionResponse(
                    status="SECURITY_ERROR",
                    all_passed=False,
                    output=f"Security Violation: Import of module '{mod}' is prohibited.",
                    execution_time_ms=0,
                    stars_earned=0,
                    xp_earned=0,
                    coins_earned=0,
                    test_results=[]
                )

        submission_id = str(uuid.uuid4())
        
        # Determine if we should run locally (bypass ARQ/Docker)
        run_locally = True # Force local execution on Render
        
        if run_locally:
            logger.info("Executing code locally via subprocess fallback")
            result = await ExecutionService._execute_python_locally(user_code, test_cases)
        else:
            try:
                if not redis_manager.arq_pool:
                    raise Exception("Redis not connected")
                job = await redis_manager.arq_pool.enqueue_job(
                    "run_code_task",
                    submission_id=submission_id,
                    code=user_code,
                    language="python",
                    test_cases=test_cases,
                    _job_id=submission_id
                )
                if not job:
                    raise Exception("Failed to enqueue execution job")
                result = await asyncio.wait_for(job.result(), timeout=10.0)
            except Exception as e:
                logger.warning(f"ARQ execution failed: {e}. Falling back to local execution.")
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

execution_service = ExecutionService()
