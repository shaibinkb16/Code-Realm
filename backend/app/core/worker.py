import asyncio
from arq.connections import RedisSettings
from app.core.config import settings
from app.core.logging import logger
import docker
import json
import time
import base64

def _encode_b64(text: str) -> str:
    return base64.b64encode(text.encode('utf-8')).decode('utf-8')

async def run_code_task(ctx, submission_id: str, code: str, language: str, test_cases: list):
    """
    Executes the given code securely within an isolated Docker container.
    """
    logger.info(f"Starting execution for submission {submission_id} in {language}")
    start_time = time.time()
    
    try:
        client = docker.from_env()
    except Exception as e:
        logger.error(f"Failed to connect to Docker daemon: {e}")
        return {"status": "RUNTIME_ERROR", "error": "Docker not available"}

    # Determine image and commands based on language
    lang_config = {
        "python": {
            "image": "python:3.11-alpine",
            "filename": "solution.py",
            "compile": "",
            "run": "python solution.py"
        },
        "javascript": {
            "image": "node:20-alpine",
            "filename": "solution.js",
            "compile": "",
            "run": "node solution.js"
        },
        "typescript": {
            "image": "node:20-alpine",
            "filename": "solution.ts",
            "compile": "npx -y tsc solution.ts > /dev/null 2>&1 || true",
            "run": "node solution.js"
        },
        "java": {
            "image": "openjdk:17-alpine",
            "filename": "Solution.java",
            "compile": "javac Solution.java",
            "run": "java Solution"
        },
        "cpp": {
            "image": "gcc:13", # gcc 13 has alpine-like image or just gcc
            "filename": "solution.cpp",
            "compile": "g++ solution.cpp -o sol",
            "run": "./sol"
        }
    }

    config = lang_config.get(language.lower(), lang_config["python"])

    # Generate a bash script that decodes the code, compiles it, and runs it against all test cases.
    # We use base64 to safely inject code and inputs without escaping nightmares.
    script_lines = [
        "#!/bin/sh",
        "set -e", # Exit on error
        f"echo '{_encode_b64(code)}' | base64 -d > {config['filename']}"
    ]
    
    if config["compile"]:
        script_lines.append(f"if ! {config['compile']}; then")
        script_lines.append("  echo 'COMPILE_ERROR'")
        script_lines.append("  exit 1")
        script_lines.append("fi")

    script_lines.append("echo '===RESULTS_START==='")
    
    for i, tc in enumerate(test_cases):
        input_data = tc.get("input", "")
        # Run the program, pipe input, capture stdout
        script_lines.append(f"echo '{_encode_b64(input_data)}' | base64 -d > in_{i}.txt")
        # Run and capture output securely, with a timeout
        script_lines.append(f"timeout 2s {config['run']} < in_{i}.txt > out_{i}.txt 2> err_{i}.txt || true")
        script_lines.append(f"echo '---TC_{i}---'")
        script_lines.append(f"cat out_{i}.txt")
        script_lines.append(f"echo '---ERR_{i}---'")
        script_lines.append(f"cat err_{i}.txt")

    runner_script = "\n".join(script_lines)
    runner_b64 = _encode_b64(runner_script)
    
    container_cmd = f"echo '{runner_b64}' | base64 -d > run.sh && chmod +x run.sh && ./run.sh"

    try:
        container = client.containers.run(
            config["image"],
            command=["sh", "-c", container_cmd],
            mem_limit="256m",
            cpu_period=100000,
            cpu_quota=50000, # 0.5 CPUs
            network_mode="none",
            detach=True,
        )
        
        container.wait(timeout=10)
        logs = container.logs().decode("utf-8")
        container.remove(force=True)
        
        # Parse the output
        if "COMPILE_ERROR" in logs:
            return {
                "status": "COMPILE_ERROR",
                "execution_time_ms": int((time.time() - start_time) * 1000),
                "test_results": [],
                "output": "Compilation Error."
            }

        if "===RESULTS_START===" not in logs:
            return {
                "status": "RUNTIME_ERROR",
                "execution_time_ms": int((time.time() - start_time) * 1000),
                "test_results": [],
                "output": "Execution crashed or timed out.\n" + logs
            }
            
        results_section = logs.split("===RESULTS_START===")[1]
        
        test_results = []
        all_passed = True
        
        for i, tc in enumerate(test_cases):
            expected = str(tc.get("expected_output", tc.get("expectedOutput", ""))).strip()
            
            # Extract actual output for this test case
            marker_out = f"---TC_{i}---"
            marker_err = f"---ERR_{i}---"
            next_marker = f"---TC_{i+1}---"
            
            try:
                tc_block = results_section.split(marker_out)[1]
                if next_marker in tc_block:
                    tc_block = tc_block.split(next_marker)[0]
                    
                actual_stdout = tc_block.split(marker_err)[0].strip()
                # We can also extract stderr if needed
            except IndexError:
                actual_stdout = ""
                
            passed = (actual_stdout == expected)
            if not passed:
                all_passed = False
                
            test_results.append({
                "test_id": tc.get("id"),
                "description": tc.get("description"),
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
        
    except docker.errors.ContainerError as e:
        logger.error(f"Container failed: {e}")
        return {"status": "RUNTIME_ERROR", "error": str(e)}
    except Exception as e:
        logger.error(f"Sandbox error: {e}")
        return {"status": "RUNTIME_ERROR", "error": "Sandbox timeout or failure"}


class WorkerSettings:
    """
    Settings for the ARQ worker.
    Run this with: `arq app.core.worker.WorkerSettings`
    """
    redis_settings = RedisSettings.from_dsn(settings.REDIS_URI)
    functions = [run_code_task]
    max_jobs = 10
    
    async def on_startup(ctx):
        logger.info("ARQ Worker Starting up...")
        # Pre-pull images in background
        client = docker.from_env()
        images = ["python:3.11-alpine", "node:20-alpine", "openjdk:17-alpine", "gcc:13"]
        for img in images:
            try:
                client.images.get(img)
            except docker.errors.ImageNotFound:
                logger.info(f"Pre-pulling image {img}...")
                client.images.pull(img)
        
    async def on_shutdown(ctx):
        logger.info("ARQ Worker Shutting down...")
