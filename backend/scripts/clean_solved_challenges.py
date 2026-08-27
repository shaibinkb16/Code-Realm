import asyncio
import re
from app.core.database import AsyncSessionLocal
from app.models.challenge import Challenge
from sqlalchemy import select


def make_unsolved_skeleton(code: str, lang: str = "python") -> str:
    """If initialCode contains full implementation, replace body with pass/TODO."""
    if not code:
        return "def solve(n):\n    # Write your solution here\n    pass\n"
    
    lines = code.strip().split("\n")
    cleaned_lines = []
    in_func = False
    func_indent = ""
    
    for line in lines:
        cleaned_lines.append(line)
        # Check if line defines a function
        match_py = re.match(r"^(\s*)def\s+([a-zA-Z0-9_]+)\s*\((.*?)\):", line)
        match_js = re.match(r"^(\s*)function\s+([a-zA-Z0-9_]+)\s*\((.*?)\)\s*\{?", line)
        
        if match_py:
            indent = match_py.group(1) + "    "
            cleaned_lines.append(f"{indent}# Write your code here")
            cleaned_lines.append(f"{indent}pass")
            break
        elif match_js:
            indent = match_js.group(1) + "    "
            cleaned_lines.append(f"{indent}// Write your code here")
            cleaned_lines.append("}")
            break

    if len(cleaned_lines) > 0:
        return "\n".join(cleaned_lines)
    return code

async def clean_database_challenges():
    async with AsyncSessionLocal() as session:
        # Option A: Clean all existing challenges to have unsolved stubs
        res = await session.execute(select(Challenge))
        chals = res.scalars().all()
        print(f"Found {len(chals)} challenges in DB. Cleaning solved code...")
        
        for c in chals:
            # If the code has return statements or multiple implementation lines inside function:
            if "def " in c.initial_code:
                c.initial_code = make_unsolved_skeleton(c.initial_code, "python")
            elif "function " in c.initial_code:
                c.initial_code = make_unsolved_skeleton(c.initial_code, "javascript")
        
        await session.commit()
        print("Successfully updated database challenges with unsolved skeletons!")

if __name__ == "__main__":
    asyncio.run(clean_database_challenges())
