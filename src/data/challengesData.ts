import type { Challenge, BossBattle } from '../types/game';

export const challengesData: Record<string, Challenge> = {
  // 🌱 starter-1: Variables & Printing
  'starter-1': {
    id: 'starter-1',
    title: 'The Spark of Logic',
    type: 'puzzle',
    difficulty: 'Easy',
    description: 'Create a variable named `realm_name` and set it to `"Code Realm"`. Then print `"Welcome to " + realm_name`.',
    storyContext: 'You arrive at the edge of Starter Village. The stone altar awakes when you speak the name of the realm into existence.',
    initialCode: `# Create a variable named realm_name set to "Code Realm"
# Then print "Welcome to " + realm_name

# Write your code below:

`,
    language: 'python',
    testCases: [
      {
        id: 't1',
        input: '',
        expectedOutput: 'Welcome to Code Realm',
        description: 'Outputs the exact welcome message'
      }
    ],
    xpReward: 100,
    coinReward: 50,
    hints: [
      'Use assignment operator = to store string values.',
      'String concatenation uses the + operator.'
    ],
    explanation: 'Variables in Python are created when you assign a value to them using `=`. Printing combines strings with `+`.'
  },

  // 🌲 logic-1: Conditional Statements
  'logic-1': {
    id: 'logic-1',
    title: 'Gatekeeper of Logic',
    type: 'puzzle',
    difficulty: 'Easy',
    description: 'Write a function `check_passcode(code)` that returns `"ACCESS GRANTED"` if code is `777`, else `"ACCESS DENIED"`.',
    storyContext: 'The iron gates of Logic Forest are sealed with an ancient passcode mechanism. Pass the test to enter.',
    initialCode: `def check_passcode(code):
    # TODO: Return "ACCESS GRANTED" if code is 777, else "ACCESS DENIED"
    pass

# Test invocation
print(check_passcode(777))
`,
    language: 'python',
    testCases: [
      {
        id: 't1',
        input: '777',
        expectedOutput: 'ACCESS GRANTED',
        description: 'Returns ACCESS GRANTED for code 777'
      },
      {
        id: 't2',
        input: '123',
        expectedOutput: 'ACCESS DENIED',
        description: 'Returns ACCESS DENIED for wrong codes'
      }
    ],
    xpReward: 150,
    coinReward: 75,
    hints: [
      'Use == for comparison in Python conditional statements.',
      'Remember Python relies on strict indentation.'
    ],
    explanation: '`if` statements check conditions. Use `==` for equality comparison and `!=` for inequality.'
  },

  // 🌲 logic-2: Bug Hunt
  'logic-2': {
    id: 'logic-2',
    title: 'Forest Corruption Hunt',
    type: 'bughunt',
    difficulty: 'Easy',
    description: 'Fix the bug in `calculate_mana_cost(level, spells)`. Currently it calculates incorrectly!',
    storyContext: 'Corrupted code vines are draining mana from the Logic Forest spirits. Repair the calculation formula!',
    initialCode: `def calculate_mana_cost(level, spells):
    # BUG: Incorrect formula! Must return level * 10 + spells * 5
    total = level + spells # Fix this calculation!
    return total

print(calculate_mana_cost(3, 4))
`,
    language: 'python',
    testCases: [
      {
        id: 't1',
        input: '3, 4',
        expectedOutput: '50',
        description: 'Correctly calculates mana for Level 3 with 4 spells (3*10 + 4*5 = 50)'
      },
      {
        id: 't2',
        input: '5, 2',
        expectedOutput: '60',
        description: 'Calculates mana for Level 5 with 2 spells (50 + 10 = 60)'
      }
    ],
    xpReward: 200,
    coinReward: 100,
    hints: [
      'Ensure formula calculates level * 10 plus spells * 5.',
      'Return the total numerical result.'
    ],
    explanation: 'Debugging requires carefully reading error output and inspecting formula precedence.'
  },

  // 🏰 loop-1: For Loops
  'loop-1': {
    id: 'loop-1',
    title: 'The Staircase of Loops',
    type: 'puzzle',
    difficulty: 'Medium',
    description: 'Write a function `sum_even_numbers(n)` that returns the sum of all even integers from `2` up to `n` (inclusive).',
    storyContext: 'To ascend the spiral stairs of Loop Castle, you must sum the power of all even step numbers.',
    initialCode: `def sum_even_numbers(n):
    # TODO: Return the sum of all even integers from 2 up to n (inclusive)
    total = 0
    # Your code here:
    
    return total

print(sum_even_numbers(10)) # Should be 2+4+6+8+10 = 30
`,
    language: 'python',
    testCases: [
      {
        id: 't1',
        input: '10',
        expectedOutput: '30',
        description: 'Calculates sum of evens up to 10 (30)'
      },
      {
        id: 't2',
        input: '6',
        expectedOutput: '12',
        description: 'Calculates sum of evens up to 6 (2+4+6 = 12)'
      }
    ],
    xpReward: 250,
    coinReward: 125,
    hints: [
      'Use range(start, stop) where stop is exclusive (n+1).',
      'Check if i % 2 == 0 to test for even numbers.'
    ],
    explanation: '`range(2, n+1)` generates integers from 2 to n. Modulo `% 2` checks for even numbers.'
  },

  // 🏰 loop-boss-challenge
  'loop-boss-challenge': {
    id: 'loop-boss-challenge',
    title: 'Defeat the Loop Dragon',
    type: 'boss',
    difficulty: 'Boss',
    description: 'Write a function `dragon_shield(power_levels)` that filters out negative numbers and returns the sum of squared positive values.',
    storyContext: '🐉 THE LOOP DRAGON breathes fiery energy loops! Shield the realm by filtering out corrupt negative power pulses and squaring the positive forces!',
    initialCode: `def dragon_shield(power_levels):
    # TODO: Filter out negative numbers, square positive ones, return the sum
    total = 0
    # Your code here:
    
    return total

print(dragon_shield([3, -2, 4, -5, 2])) # Expected: 29
`,
    language: 'python',
    testCases: [
      {
        id: 't1',
        input: '[3, -2, 4, -5, 2]',
        expectedOutput: '29',
        description: 'Filters negative numbers and sums squares (9+16+4 = 29)'
      },
      {
        id: 't2',
        input: '[-10, 5, -1, 1]',
        expectedOutput: '26',
        description: 'Calculates 5^2 + 1^2 = 26'
      }
    ],
    xpReward: 500,
    coinReward: 300,
    hints: [
      'Loop over each element in power_levels.',
      'Check if p > 0 before adding p ** 2 to total.'
    ],
    explanation: 'Combining conditionals with loops lets you filter and transform data structures efficiently.'
  },

  // 🏙️ devcity-1: Functions & Scope
  'devcity-1': {
    id: 'devcity-1',
    title: 'The City Grid API',
    type: 'build',
    difficulty: 'Medium',
    description: 'Build a function `format_user_profile(username, score, role="Developer")` that returns `"USER: [username] | SCORE: [score] | ROLE: [role]"`.',
    storyContext: 'Developer City needs a standardized profile formatter for its central networking directory.',
    initialCode: `def format_user_profile(username, score, role="Developer"):
    # TODO: Return formatted string: "USER: <username> | SCORE: <score> | ROLE: <role>"
    pass

print(format_user_profile("Aether", 950))
`,
    language: 'python',
    testCases: [
      {
        id: 't1',
        input: '"Aether", 950',
        expectedOutput: 'USER: Aether | SCORE: 950 | ROLE: Developer',
        description: 'Formats profile with default role Developer'
      },
      {
        id: 't2',
        input: '"Cipher", 1200, "Architect"',
        expectedOutput: 'USER: Cipher | SCORE: 1200 | ROLE: Architect',
        description: 'Formats profile with custom role Architect'
      }
    ],
    xpReward: 300,
    coinReward: 150,
    hints: [
      'Use Python f-strings f"..." for clean template formatting.',
      'Default arguments are assigned in function parameters like role="Developer".'
    ],
    explanation: 'Default arguments make functions flexible while f-strings provide performant string interpolation.'
  },

  // 🌐 web-1: Async JavaScript & API Fetching
  'web-1': {
    id: 'web-1',
    title: 'The Async Portal',
    type: 'puzzle',
    difficulty: 'Medium',
    description: 'Write a JavaScript function `parseApiResponse(jsonString)` that parses JSON and returns the `data.status` property if available, else `"FAILED"`.',
    storyContext: 'At the gates of Web Kingdom, async signals flow continuously. Parse raw JSON data streams cleanly.',
    initialCode: `function parseApiResponse(jsonString) {
  // TODO: Parse JSON string and return obj.data.status if present, else "FAILED"
  return "FAILED";
}

console.log(parseApiResponse('{"data": {"status": "SUCCESS"}}'));
`,
    language: 'javascript',
    testCases: [
      {
        id: 't1',
        input: '\'{"data": {"status": "SUCCESS"}}\'',
        expectedOutput: 'SUCCESS',
        description: 'Parses valid JSON and returns status SUCCESS'
      },
      {
        id: 't2',
        input: '\'{"error": "not found"}\'',
        expectedOutput: 'FAILED',
        description: 'Handles missing status property gracefully returning FAILED'
      }
    ],
    xpReward: 350,
    coinReward: 200,
    hints: [
      'Wrap JSON.parse in try...catch to handle malformed input.',
      'Use optional chaining or logical AND to safely navigate nested objects.'
    ],
    explanation: 'Safely parsing API payloads prevents web applications from crashing on invalid networks.'
  }
};

export const bossBattlesData: Record<string, BossBattle> = {
  'boss-loop-dragon': {
    id: 'boss-loop-dragon',
    name: 'LOOP DRAGON',
    title: 'The Fiery Monarch of Infinite Loops',
    avatar: '🐉',
    totalHealth: 3000,
    phases: [
      {
        phaseNumber: 1,
        phaseTitle: 'Phase 1: Simple Loop Barrage',
        bossHealthPercent: 100,
        challenge: challengesData['loop-1']
      },
      {
        phaseNumber: 2,
        phaseTitle: 'Phase 2: Nested Matrix Overload',
        bossHealthPercent: 66,
        challenge: challengesData['loop-boss-challenge']
      },
      {
        phaseNumber: 3,
        phaseTitle: 'Phase 3: Algorithmic Flame Optimization',
        bossHealthPercent: 33,
        challenge: challengesData['starter-1']
      }
    ],
    loot: {
      xp: 2000,
      coins: 500,
      title: 'Loop Dragon Slayer 🐉',
      badge: 'badge-loop-master'
    }
  }
};
