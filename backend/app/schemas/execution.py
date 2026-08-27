from pydantic import BaseModel
from typing import List, Optional, Any, Dict

class TestCaseInput(BaseModel):
    id: Optional[str] = ""
    description: Optional[str] = ""
    input: Optional[str] = ""
    expected_output: Optional[str] = ""

class CodeExecutionRequest(BaseModel):
    challenge_id: Optional[str] = None
    code: str
    language: str = "python"
    # AI-generated test cases passed directly from the frontend
    test_cases: List[TestCaseInput] = []

class CodeFeedbackRequest(BaseModel):
    code: str
    challenge_title: str
    challenge_description: str
    test_results: List[Dict[str, Any]]
    skill_rating: int = 905

class TestResultResponse(BaseModel):
    test_id: str
    description: str
    passed: bool
    expected_output: str
    actual_output: str

class ExecutionResponse(BaseModel):
    status: str  # PASSED, FAILED, SYNTAX_ERROR, TIMEOUT, SECURITY_ERROR
    all_passed: bool
    output: str
    execution_time_ms: int
    stars_earned: int
    xp_earned: int
    coins_earned: int
    test_results: List[TestResultResponse]
