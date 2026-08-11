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
    async def execute_python_code(user_code: str, test_cases: List[Dict[str, Any]]) -> ExecutionResponse:
        """Executes user code securely by enqueuing it to the ARQ worker which runs the Docker sandbox."""
        start_time = time.time()
        test_results: List[TestResultResponse] = []
        all_passed = True
        console_output = ""

        # Pre-validate syntax & prohibited dangerous imports
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
        
        try:
            if not redis_manager.arq_pool:
                logger.error("ARQ pool not initialized. Is Redis running?")
                return ExecutionResponse(
                    status="SYSTEM_ERROR",
                    all_passed=False,
                    output="Execution Engine Unavailable: Cannot connect to the code execution queue (Redis). Please ensure Docker and Redis are running.",
                    execution_time_ms=0,
                    stars_earned=0,
                    xp_earned=0,
                    coins_earned=0,
                    test_results=[]
                )

            # Enqueue the job
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
                
            # Wait for result (timeout 10s)
            result = await asyncio.wait_for(job.result(), timeout=10.0)
            
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
            
        except asyncio.TimeoutError:
            return ExecutionResponse(
                status="TIMEOUT",
                all_passed=False,
                output="Execution Timeout: Code exceeded 3.0 second execution limit.",
                execution_time_ms=3000,
                stars_earned=0,
                xp_earned=0,
                coins_earned=0,
                test_results=[]
            )
        except Exception as e:
            logger.error(f"Execution enqueue error: {e}")
            return ExecutionResponse(
                status="RUNTIME_ERROR",
                all_passed=False,
                output=f"System Error: {str(e)}",
                execution_time_ms=int((time.time() - start_time) * 1000),
                stars_earned=0,
                xp_earned=0,
                coins_earned=0,
                test_results=[]
            )

execution_service = ExecutionService()
