import httpx
import json
from app.core.config import settings
from app.core.logging import logger


class AIMentorService:

    @staticmethod
    def _gemini_url() -> str:
        return (
            f"https://generativelanguage.googleapis.com/v1beta/models/"
            f"gemini-1.5-flash:generateContent?key={settings.AI_API_KEY}"
        )

    @staticmethod
    async def _call_gemini(system_prompt: str, user_prompt: str, json_mode: bool = False) -> str:
        """Low-level Gemini API call. Returns raw text response."""
        payload: dict = {
            "system_instruction": {"parts": [{"text": system_prompt}]},
            "contents": [{"parts": [{"text": user_prompt}]}],
        }
        if json_mode:
            payload["generationConfig"] = {"response_mime_type": "application/json"}

        url = AIMentorService._gemini_url()
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.post(url, json=payload, timeout=20.0)
                resp.raise_for_status()
                data = resp.json()
                return data["candidates"][0]["content"]["parts"][0]["text"]
        except Exception as e:
            logger.error(f"Gemini API Error: {e}")
            raise

    # ─────────────────────────────────────────────
    # 1. AI MENTOR CHAT
    # ─────────────────────────────────────────────
    @staticmethod
    async def generate_mentor_guidance(user_prompt: str, mode: str, user_skill_rating: int) -> dict:
        """Generates AI mentor responses with prompt injection protection."""
        cleaned_prompt = user_prompt.strip()[:500]

        injection_keywords = ["ignore previous instructions", "system prompt", "bypass security", "drop table"]
        for kw in injection_keywords:
            if kw in cleaned_prompt.lower():
                return {
                    "mode": mode,
                    "content": "⚠️ Security Alert: Prompt injection attempt detected and logged.",
                    "status": "BLOCKED"
                }

        mode_instruction = {
            "Hint": "Provide a subtle clue without revealing the full solution.",
            "Explain": "Explain the underlying CS concept clearly with examples.",
            "Socratic": "Ask prompting questions that guide the user to reason about their code.",
            "Demonstrate": "Provide a short, abstract example demonstrating the pattern.",
        }.get(mode, "Provide helpful, concise coding advice.")

        system_prompt = (
            f"You are an AI programming mentor for an RPG-style coding game called CODE REALM. "
            f"The user's Python skill rating is {user_skill_rating}/2500. "
            f"Mode: {mode.upper()} — {mode_instruction} "
            f"Keep answers concise (max 3 short paragraphs), engaging, and in character as the AI Game Master. "
            f"Do NOT write full solutions unless in Demonstrate mode."
        )

        try:
            reply = await AIMentorService._call_gemini(system_prompt, cleaned_prompt)
        except Exception:
            reply = "I'm recalibrating my neural net. Please try again in a moment!"

        return {"mode": mode, "content": reply, "status": "SUCCESS"}

    # ─────────────────────────────────────────────
    # 2. DYNAMIC CHALLENGE GENERATION
    # ─────────────────────────────────────────────
    @staticmethod
    async def generate_challenge(
        node_title: str,
        realm_name: str,
        node_type: str,
        skill_rating: int,
    ) -> dict:
        """
        Calls Gemini to generate a complete, fresh coding challenge tailored to the
        player's skill level and the current map node context. Returns a structured JSON.
        """
        difficulty = "Easy" if skill_rating < 600 else ("Medium" if skill_rating < 1200 else "Hard")

        system_prompt = (
            "You are an AI curriculum designer for CODE REALM, an RPG coding game. "
            "Generate a Python coding challenge as a valid JSON object. "
            "The challenge must be solvable, educational, and thematically tied to the node. "
            "The difficulty must match the player's skill. "
            "Return ONLY valid JSON, no markdown fences."
        )

        user_prompt = f"""
Generate a Python coding challenge for:
- Map Node: "{node_title}"
- Realm: "{realm_name}"
- Node Type: "{node_type}" (boss nodes should be harder multi-part problems)
- Player Skill Rating: {skill_rating}/2500 → Difficulty: {difficulty}

Return this exact JSON schema (all fields required):
{{
  "title": "Short dramatic challenge title",
  "type": "puzzle",
  "difficulty": "{difficulty}",
  "description": "Clear task description (what the user must write/implement)",
  "storyContext": "1-2 sentence immersive RPG flavor text tying the coding task to the game world",
  "initialCode": "Starter Python code scaffold with comments (function signature + docstring, NOT solved)",
  "language": "python",
  "testCases": [
    {{
      "id": "t1",
      "input": "the stdin input for this test (empty string if none needed)",
      "expectedOutput": "exact stdout output the code must produce",
      "description": "what this test verifies"
    }}
  ],
  "hints": ["hint 1", "hint 2"],
  "explanation": "Brief concept explanation (1-2 sentences) shown after solving",
  "xpReward": 150,
  "coinReward": 75
}}

Rules:
- Minimum 2 test cases, maximum 4
- The initialCode must compile without errors but NOT solve the problem (use `pass` or placeholder)
- expectedOutput must exactly match what Python's print() would output
- For boss nodes: make it a harder algorithm problem (sorting, recursion, or data structures)
- For regular nodes: focus on one clear Python concept (loops, functions, conditionals, lists, etc.)
"""

        try:
            raw = await AIMentorService._call_gemini(system_prompt, user_prompt, json_mode=True)
            challenge = json.loads(raw)
            # Ensure required fields exist
            required = ["title", "description", "storyContext", "initialCode", "testCases", "hints"]
            for field in required:
                if field not in challenge:
                    raise ValueError(f"Missing field: {field}")
            return {"status": "SUCCESS", "challenge": challenge}
        except Exception as e:
            logger.error(f"Challenge generation error: {e}")
            # Structured fallback so the frontend never crashes
            return {
                "status": "FALLBACK",
                "challenge": {
                    "title": f"The Trial of {node_title}",
                    "type": "puzzle",
                    "difficulty": difficulty,
                    "description": "Write a Python function `solve(n)` that returns the sum of all integers from 1 to n.",
                    "storyContext": f"The ancient oracle of {realm_name} demands a tribute of numbers. Prove your worth.",
                    "initialCode": "def solve(n):\n    # Your code here\n    pass\n\nprint(solve(5))",
                    "language": "python",
                    "testCases": [
                        {"id": "t1", "input": "", "expectedOutput": "15", "description": "solve(5) returns 15"},
                        {"id": "t2", "input": "", "expectedOutput": "55", "description": "solve(10) returns 55"},
                    ],
                    "hints": ["Use a loop or the formula n*(n+1)//2", "Make sure to return, not just print"],
                    "explanation": "Summation is a fundamental building block of algorithms.",
                    "xpReward": 100,
                    "coinReward": 50,
                }
            }

    # ─────────────────────────────────────────────
    # 3. PERSONALIZED CODE FEEDBACK
    # ─────────────────────────────────────────────
    @staticmethod
    async def generate_feedback(
        code: str,
        challenge_title: str,
        challenge_description: str,
        test_results: list,
        skill_rating: int,
    ) -> dict:
        """
        After code execution, Gemini reviews the user's code and provides
        personalized, constructive feedback.
        """
        all_passed = all(r.get("passed", False) for r in test_results)
        passed_count = sum(1 for r in test_results if r.get("passed", False))
        total_count = len(test_results)

        system_prompt = (
            "You are an expert programming tutor for CODE REALM, an RPG coding game. "
            "Review the student's code submission and provide concise, constructive, "
            "encouraging feedback. Max 4 sentences. Be specific about what they did well or what to fix."
        )

        user_prompt = f"""
Challenge: "{challenge_title}"
Task: {challenge_description}

Student's Code:
```python
{code[:1500]}
```

Test Results: {passed_count}/{total_count} passed
All Passed: {all_passed}
Player Skill Rating: {skill_rating}/2500

Provide a short feedback (3-4 sentences):
- If all passed: Praise what they did well + one tip to improve code quality/efficiency
- If failed: Explain the key mistake clearly + give a hint without giving the solution
"""

        try:
            feedback = await AIMentorService._call_gemini(system_prompt, user_prompt)
        except Exception:
            feedback = (
                "Great effort! Keep reviewing the test case expectations — "
                "make sure your output exactly matches what's required. You've got this!"
            )

        return {
            "feedback": feedback,
            "all_passed": all_passed,
            "status": "SUCCESS"
        }


ai_mentor_service = AIMentorService()
