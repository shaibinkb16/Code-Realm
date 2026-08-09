from fastapi import APIRouter
from app.schemas.execution import CodeExecutionRequest, ExecutionResponse
from app.services.execution_service import execution_service

router = APIRouter()


@router.post("/run", response_model=ExecutionResponse)
async def run_code_sandbox(req: CodeExecutionRequest):
    """
    Executes user code in the backend Python sandbox against the
    AI-generated test cases that are passed directly in the request body.
    No hardcoded data_loader — test cases come from the AI.
    """
    test_cases = [
        {
            "id": tc.id,
            "description": tc.description,
            "input": tc.input or "",
            "expected_output": tc.expected_output,
        }
        for tc in req.test_cases
    ]
    return execution_service.execute_python_code(req.code, test_cases)


@router.post("/submit", response_model=ExecutionResponse)
async def submit_code_solution(req: CodeExecutionRequest):
    """
    Submits the final solution. Evaluates test cases from the request body
    (AI-generated), runs in the server-side sandbox, and returns authoritative results.
    """
    test_cases = [
        {
            "id": tc.id,
            "description": tc.description,
            "input": tc.input or "",
            "expected_output": tc.expected_output,
        }
        for tc in req.test_cases
    ]
    return execution_service.execute_python_code(req.code, test_cases)
