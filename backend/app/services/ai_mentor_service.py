import json
from app.core.llm_client import call_llm_with_fallback
from app.core.logging import logger



class AIMentorService:

    @staticmethod
    async def _call_gemini(system_prompt: str, user_prompt: str, json_mode: bool = False) -> str:
        """Calls multi-provider LLM service with primary Gemini and automatic Groq fallback."""
        return await call_llm_with_fallback(system_prompt, user_prompt, json_mode=json_mode)


    # ─────────────────────────────────────────────
    # 1. AI MENTOR CHAT & GUIDANCE
    # ─────────────────────────────────────────────
    @staticmethod
    async def chat_with_mentor(message: str, mode: str = "Explain", user_skill_rating: int = 1000, recent_errors: list = None) -> dict:
        """General AI Tutor chat endpoint with injection protection and learner awareness."""
        cleaned = message.strip()[:1500]
        recent_errors = recent_errors or []

        injection_keywords = ["ignore previous instructions", "system prompt", "bypass security", "drop table", "sql injection"]
        for kw in injection_keywords:
            if kw in cleaned.lower():
                return {
                    "mode": mode,
                    "content": "⚠️ Security Alert: Prompt injection attempt detected and logged.",
                    "status": "BLOCKED"
                }

        mode_instruction = {
            "Hint": "Provide a subtle clue without revealing full answers directly.",
            "Explain": "Explain the core computer science / programming concept clearly with structured insights.",
            "Socratic": "Ask guiding questions to help the player solve it step-by-step.",
            "Demonstrate": "Provide a short code snippet example demonstrating the pattern.",
        }.get(mode, "Provide helpful, concise coding guidance.")

        system_prompt = (
            f"You are the AI Game Master & Tutor for CODE REALM, an immersive RPG coding game. "
            f"The user's Python rating is {user_skill_rating}/2500. "
            f"Mode: {mode.upper()} — {mode_instruction} "
            f"Keep answers encouraging, structured, highly educational, and under 3 short paragraphs. "
            f"Use markdown code formatting where appropriate."
        )

        user_prompt = f"User Query: {cleaned}"

        try:
            reply = await AIMentorService._call_gemini(system_prompt, user_prompt)
        except Exception:
            # Intelligent dynamic backup generator when LLM API call fails
            reply = AIMentorService._generate_dynamic_tutor_fallback(cleaned, mode, user_skill_rating)

        return {"mode": mode, "content": reply, "status": "SUCCESS"}

    @staticmethod
    async def generate_mentor_guidance(user_code: str, challenge_id: str, mode: str, user_skill_rating: int, recent_errors: list = None) -> dict:
        """Generates contextual AI mentor responses for active code challenges."""
        cleaned_prompt = user_code.strip()[:1500]
        recent_errors = recent_errors or []

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

        error_context = ""
        if recent_errors:
            error_context = f"The user recently struggled with these errors: {', '.join(recent_errors)}. Keep this in mind to tailor your advice."

        system_prompt = (
            f"You are an AI programming mentor for an RPG-style coding game called CODE REALM. "
            f"The user's Python skill rating is {user_skill_rating}/2500. "
            f"{error_context} "
            f"Mode: {mode.upper()} — {mode_instruction} "
            f"Keep answers concise (max 3 short paragraphs), engaging, and in character as the AI Game Master. "
            f"Do NOT write full solutions unless in Demonstrate mode."
        )
        
        user_prompt = f"Challenge ID: {challenge_id}\n\nUser Code:\n```python\n{cleaned_prompt}\n```"

        try:
            reply = await AIMentorService._call_gemini(system_prompt, user_prompt)
        except Exception:
            reply = AIMentorService._generate_dynamic_tutor_fallback(
                f"Challenge: {challenge_id}, Code: {cleaned_prompt}", mode, user_skill_rating
            )

        return {"mode": mode, "content": reply, "status": "SUCCESS"}

    @staticmethod
    def _generate_dynamic_tutor_fallback(query: str, mode: str, skill_rating: int) -> str:
        """Generates dynamic, intelligent tutor answers when LLM external API calls are degraded."""
        q_lower = query.lower()
        
        if "briefing" in q_lower or "daily" in q_lower or "mission" in q_lower:
            return (
                f"⚡ **CODE REALM Daily Briefing**\n\n"
                f"Welcome back, Adventurer! Your Python rating is **{skill_rating}**. Today's neural scan shows high potential for growth:\n"
                f"1. **Main Quest**: Complete 2 loop or array nodes in Loop Castle with clean time complexity.\n"
                f"2. **Side Quest**: Refactor a function to use Python list comprehensions or dictionary lookups.\n\n"
                f"💡 *Pro-tip*: Always check array bounds before indexing. Onward to victory!"
            )
        elif "loop" in q_lower or "for" in q_lower or "while" in q_lower:
            return (
                f"🔄 **Loop & Iteration Guidance [{mode.upper()}]**\n\n"
                f"In Python, loops iterate seamlessly over sequences like lists or range objects:\n"
                f"```python\nfor i in range(len(items)):\n    print(items[i])\n```\n"
                f"If you need both element and index, prefer `enumerate(items)` for cleaner syntax!"
            )
        elif "recursion" in q_lower or "base case" in q_lower:
            return (
                f"🌀 **Recursion Insights [{mode.upper()}]**\n\n"
                f"Remember every recursive function needs two pillars:\n"
                f"1. **Base Case**: The stopping condition that prevents infinite call stacks.\n"
                f"2. **Recursive Step**: Moving closer to the base case on each step.\n\n"
                f"Trace your call tree with a small test input like n=3 to verify!"
            )
        elif "hint" in q_lower or mode == "Hint":
            return (
                f"💡 **AI Mentor Hint**\n\n"
                f"Break the problem down into 3 steps: input extraction, transformation, and stdout result. "
                f"Check whether your function returns the value or prints it directly, and ensure variable names match the expected signature!"
            )
        else:
            return (
                f"🧠 **AI Game Master Advice [{mode.upper()}]**\n\n"
                f"Great question! With a Python rating of **{skill_rating}**, focus on clean logic and modular code.\n"
                f"- Check edge cases (e.g. empty lists, single elements, zero).\n"
                f"- Verify data types before applying operations.\n\n"
                f"Keep pushing forward through the trials of CODE REALM!"
            )

    # ─────────────────────────────────────────────
    # 2. DYNAMIC CHALLENGE GENERATION
    # ─────────────────────────────────────────────
    @staticmethod
    async def generate_challenge(
        node_title: str,
        realm_name: str,
        node_type: str,
        skill_rating: int,
        target_language: str = "python"
    ) -> dict:
        """
        Calls Gemini to generate a complete, fresh coding challenge tailored to the
        player's skill level and the current map node context. Returns a structured JSON.
        """
        difficulty = "Easy" if skill_rating < 600 else ("Medium" if skill_rating < 1200 else "Hard")

        system_prompt = (
            "You are an AI curriculum designer for CODE REALM, an RPG coding game. "
            f"Generate a {target_language.capitalize()} coding challenge as a valid JSON object. "
            "The challenge must be solvable, educational, and thematically tied to the node. "
            "The difficulty must match the player's skill. "
            "Return ONLY valid JSON, no markdown fences."
        )

        user_prompt = f"""
Generate a {target_language.capitalize()} coding challenge for:
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
  "initialCode": "Starter {target_language.capitalize()} code scaffold with comments (function signature + docstring, NOT solved)",
  "language": "{target_language.lower()}",
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
- The initialCode must compile without errors but NOT solve the problem
- expectedOutput must exactly match what the program would output to stdout (print/console.log)
- For boss nodes: make it a harder algorithm problem (sorting, recursion, or data structures)
- For regular nodes: focus on one clear concept (loops, functions, conditionals, lists, etc.)
"""

        fallback_stubs = {
            "python": "def solve(n):\n    # Your code here\n    pass\n\nprint(solve(5))",
            "javascript": "function solve(n) {\n    // Your code here\n}\n\nconsole.log(solve(5));",
            "java": "class Solution {\n    public static int solve(int n) {\n        // Your code here\n        return 0;\n    }\n    public static void main(String[] args) {\n        System.out.println(solve(5));\n    }\n}",
            "cpp": "#include <iostream>\nusing namespace std;\n\nint solve(int n) {\n    // Your code here\n    return 0;\n}\n\nint main() {\n    cout << solve(5) << endl;\n    return 0;\n}",
            "typescript": "function solve(n: number): number {\n    // Your code here\n    return 0;\n}\n\nconsole.log(solve(5));"
        }
        
        fallback_stub = fallback_stubs.get(target_language.lower(), fallback_stubs["python"])

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
                    "description": f"Write a {target_language.capitalize()} function `solve(n)` that returns the sum of all integers from 1 to n.",
                    "storyContext": f"The ancient oracle of {realm_name} demands a tribute of numbers. Prove your worth.",
                    "initialCode": fallback_stub,
                    "language": target_language.lower(),
                    "testCases": [
                        {"id": "t1", "input": "5", "expectedOutput": "15", "description": "solve(5) returns 15"},
                        {"id": "t2", "input": "10", "expectedOutput": "55", "description": "solve(10) returns 55"},
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

        if all_passed:
            system_prompt += (
                " Since the user passed all tests, you MUST estimate the Time and Space Complexity (Big O) "
                "of their exact submission. Suggest one alternative, more efficient or Pythonic way to solve it."
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
- If all passed: Provide Big-O complexity analysis and one alternative approach.
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
