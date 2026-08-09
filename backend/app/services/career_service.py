import httpx
import json
from app.core.config import settings
from app.core.logging import logger


class CareerService:

    @staticmethod
    async def _call_gemini(system_prompt: str, user_prompt: str) -> str:
        url = (
            f"https://generativelanguage.googleapis.com/v1beta/models/"
            f"gemini-1.5-flash:generateContent?key={settings.AI_API_KEY}"
        )
        payload = {
            "system_instruction": {"parts": [{"text": system_prompt}]},
            "contents": [{"parts": [{"text": user_prompt}]}],
            "generationConfig": {"response_mime_type": "application/json"},
        }
        async with httpx.AsyncClient() as client:
            resp = await client.post(url, json=payload, timeout=20.0)
            resp.raise_for_status()
            data = resp.json()
            return data["candidates"][0]["content"]["parts"][0]["text"]

    @staticmethod
    async def generate_career_recommendations(
        skill_ratings: dict, rank_rating: int
    ) -> dict:
        """Gemini generates 4 personalized career paths based on the user's actual skill ratings."""
        system_prompt = (
            "You are a senior engineering career advisor AI for CODE REALM, an RPG coding game. "
            "Generate personalized career path recommendations based on the player's skill ratings. "
            "Return ONLY valid JSON, no markdown."
        )
        user_prompt = f"""
Player skill ratings (out of 999):
{json.dumps(skill_ratings, indent=2)}
Overall ELO rating: {rank_rating}/2500

Generate exactly 4 career path recommendations tailored to these skills.
Return this JSON schema:
{{
  "paths": [
    {{
      "id": "unique-id",
      "name": "Career Title",
      "role": "Specific role subtitle",
      "description": "2-3 sentence description of this career path and what they'll build",
      "matchScore": 85,
      "skillsRequired": ["Skill 1", "Skill 2", "Skill 3", "Skill 4", "Skill 5"],
      "nodesCount": 24,
      "aiReason": "1 sentence explaining why this is recommended for THIS player's specific skill profile"
    }}
  ]
}}

Rules:
- matchScore should be computed honestly from the skill ratings (highest rated skills = higher match)
- The #1 recommendation should be their strongest path based on the ratings
- nodesCount should be realistic (18-40)
- Skills listed should reflect what they already know + what they need to learn
"""
        try:
            raw = await CareerService._call_gemini(system_prompt, user_prompt)
            data = json.loads(raw)
            return {"status": "SUCCESS", "paths": data["paths"]}
        except Exception as e:
            logger.error(f"Career generation error: {e}")
            return {
                "status": "FALLBACK",
                "paths": [
                    {"id": "fullstack", "name": "Full-Stack Developer", "role": "End-to-End Product Creator",
                     "description": "Build complete web products from React frontends to FastAPI backends.",
                     "matchScore": 88, "skillsRequired": ["React", "Python", "FastAPI", "PostgreSQL", "TypeScript"],
                     "nodesCount": 30, "aiReason": "Your Python and JavaScript ratings suggest full-stack is a great fit."},
                ]
            }

    @staticmethod
    async def generate_sprint_tickets(skill_ratings: dict) -> dict:
        """Gemini generates realistic sprint tickets based on the user's weakest skills."""
        weakest = sorted(skill_ratings.items(), key=lambda x: x[1])[:3]
        weak_skills = [k for k, v in weakest]

        system_prompt = (
            "You are an AI project manager at a fictional tech company called TechCorp Inc. "
            "Generate realistic software engineering sprint tickets that help the developer "
            "improve their weakest coding skills. Return ONLY valid JSON."
        )
        user_prompt = f"""
The developer's weakest skills are: {', '.join(weak_skills)}

Generate 4 realistic sprint board tickets that target these skills.
Return this JSON schema:
{{
  "tickets": [
    {{
      "id": "TC-101",
      "title": "SHORT-101: Descriptive ticket title",
      "priority": "Critical or High or Medium",
      "codeContext": "// A 3-5 line code snippet showing the problem or task context",
      "rewardXp": 200,
      "skill": "which skill this improves"
    }}
  ]
}}

Make the tickets realistic engineering tasks (bug fixes, features, refactors).
Vary the priorities. XP rewards: Critical=300, High=200, Medium=150.
"""
        try:
            raw = await CareerService._call_gemini(system_prompt, user_prompt)
            data = json.loads(raw)
            return {"status": "SUCCESS", "tickets": data["tickets"]}
        except Exception as e:
            logger.error(f"Sprint ticket generation error: {e}")
            return {"status": "FALLBACK", "tickets": []}

    @staticmethod
    async def generate_interview_question(skill_ratings: dict) -> dict:
        """Generates a technical interview question targeting the user's growth areas."""
        weakest_skill = min(skill_ratings, key=skill_ratings.get)
        system_prompt = (
            "You are a senior software engineering interviewer at a top tech company. "
            "Generate a challenging but fair technical interview question. Return ONLY valid JSON."
        )
        user_prompt = f"""
The candidate's weakest skill is: {weakest_skill} (rating: {skill_ratings[weakest_skill]}/999)
Their best skill is: {max(skill_ratings, key=skill_ratings.get)}

Generate a technical interview question that tests their knowledge of {weakest_skill}.
Return:
{{
  "question": "The full interview question text (2-4 sentences)",
  "topic": "{weakest_skill}",
  "difficulty": "Medium or Hard",
  "hint": "A subtle hint for if they get stuck (1 sentence)"
}}
"""
        try:
            raw = await CareerService._call_gemini(system_prompt, user_prompt)
            return {"status": "SUCCESS", **json.loads(raw)}
        except Exception as e:
            logger.error(f"Interview question generation error: {e}")
            return {
                "status": "FALLBACK",
                "question": "Explain how a hash table works under the hood. What happens during a collision, and how does Python's dict handle this?",
                "topic": "Algorithms",
                "difficulty": "Medium",
                "hint": "Think about what happens when two keys hash to the same bucket index."
            }

    @staticmethod
    async def evaluate_interview_answer(question: str, answer: str, skill: str) -> dict:
        """Gemini evaluates the user's interview answer and returns structured scores."""
        system_prompt = (
            "You are a senior software engineering interviewer. "
            "Evaluate the candidate's answer and return a structured JSON score breakdown. "
            "Return ONLY valid JSON."
        )
        user_prompt = f"""
Question: "{question}"
Topic: {skill}
Candidate's Answer: "{answer[:2000]}"

Return:
{{
  "overallScore": 85,
  "breakdown": {{
    "technicalDepth": 90,
    "problemSolving": 80,
    "communication": 85,
    "codeQuality": 82
  }},
  "feedback": "2-3 sentence feedback highlighting strengths and one area to improve"
}}
"""
        try:
            raw = await CareerService._call_gemini(system_prompt, user_prompt)
            return {"status": "SUCCESS", **json.loads(raw)}
        except Exception as e:
            logger.error(f"Interview evaluation error: {e}")
            return {
                "status": "FALLBACK",
                "overallScore": 75,
                "breakdown": {"technicalDepth": 75, "problemSolving": 75, "communication": 75, "codeQuality": 75},
                "feedback": "Good effort! Review the core concepts and try to give more concrete examples."
            }


career_service = CareerService()
