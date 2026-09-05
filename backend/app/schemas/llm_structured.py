"""
Pydantic schemas for every LLM call that expects structured JSON back.

Before this, every JSON-mode call in the codebase (challenge generation,
career recommendations, sprint tickets, interview prep) parsed the response
with a bare json.loads() and, at best, a manual `if field not in x: raise`
check — malformed output was either silently patched with hardcoded defaults
or fell all the way through to a generic hardcoded fallback, with no
opportunity for the model to correct itself. These schemas are validated by
services/structured_llm.py's generate_structured(), which retries once with
the validation error fed back to the model before giving up.

Field names intentionally stay camelCase to match the wire format the
frontend already consumes (these are not database models).
"""
from typing import List, Optional
from pydantic import BaseModel, Field, field_validator


class LLMTestCase(BaseModel):
    id: str
    input: str = ""
    expectedOutput: str
    description: str = ""


class LLMChallenge(BaseModel):
    title: str
    type: str = "puzzle"
    difficulty: str
    description: str
    storyContext: Optional[str] = None
    initialCode: str
    language: str
    testCases: List[LLMTestCase]
    hints: List[str] = Field(default_factory=list)
    explanation: str
    xpReward: int = 100
    coinReward: int = 50

    @field_validator("testCases")
    @classmethod
    def at_least_two_test_cases(cls, v: List[LLMTestCase]) -> List[LLMTestCase]:
        if len(v) < 2:
            raise ValueError("testCases must contain at least 2 entries")
        return v


class LLMCareerPath(BaseModel):
    id: str
    name: str
    role: str
    description: str
    matchScore: int
    skillsRequired: List[str] = Field(default_factory=list)
    nodesCount: int
    aiReason: str


class LLMCareerRecommendations(BaseModel):
    paths: List[LLMCareerPath]

    @field_validator("paths")
    @classmethod
    def non_empty(cls, v: List[LLMCareerPath]) -> List[LLMCareerPath]:
        if not v:
            raise ValueError("paths must contain at least 1 entry")
        return v


class LLMSprintTicket(BaseModel):
    id: str
    title: str
    priority: str
    codeContext: str
    rewardXp: int
    skill: str


class LLMSprintTickets(BaseModel):
    tickets: List[LLMSprintTicket]


class LLMInterviewQuestion(BaseModel):
    question: str
    topic: str
    difficulty: str
    hint: str


class LLMInterviewBreakdown(BaseModel):
    technicalDepth: int
    problemSolving: int
    communication: int
    codeQuality: int


class LLMInterviewEvaluation(BaseModel):
    overallScore: int
    breakdown: LLMInterviewBreakdown
    feedback: str
