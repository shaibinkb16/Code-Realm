import type { SprintTicket } from '../types/game';

export interface CareerPath {
  id: string;
  name: string;
  role: string;
  description: string;
  icon: string;
  matchScore: number;
  skillsRequired: string[];
  nodesCount: number;
}

export const careerPaths: CareerPath[] = [
  {
    id: 'python-explorer',
    name: 'Python Explorer',
    role: 'Variables, Loops & Simple Logic',
    description: 'Learn the foundational building blocks of programming: storing values, making choices, and repeating blocks of code.',
    icon: 'Terminal',
    matchScore: 95,
    skillsRequired: ['Variables', 'If Statements', 'For Loops', 'Lists'],
    nodesCount: 15
  },
  {
    id: 'web-apprentice',
    name: 'Web Design Apprentice',
    role: 'HTML, CSS & Interactive Layouts',
    description: 'Discover how web pages are structured and styled. Learn to build your very first user interfaces.',
    icon: 'Layers',
    matchScore: 90,
    skillsRequired: ['HTML Structure', 'CSS Styling', 'Basic JavaScript', 'Forms'],
    nodesCount: 18
  },
  {
    id: 'game-creator',
    name: 'Game Logic Creator',
    role: 'Conditionals & Game Loops',
    description: 'Code the logic behind classic text-based and visual games. Master decision-making logic and state tracking.',
    icon: 'Cpu',
    matchScore: 85,
    skillsRequired: ['Random Numbers', 'While Loops', 'Functions', 'Math Logic'],
    nodesCount: 20
  },
  {
    id: 'algo-apprentice',
    name: 'Algorithm Apprentice',
    role: 'List Sorting & Search Logic',
    description: 'Learn how computers solve puzzles efficiently. Master basic sorting, searching, and puzzle-solving strategies.',
    icon: 'Brain',
    matchScore: 80,
    skillsRequired: ['List Searching', 'Sorting Algorithms', 'Logic Puzzles', 'Problem Solving'],
    nodesCount: 22
  }
];

export const virtualCompanyTickets: SprintTicket[] = [
  {
    id: 'HW-101',
    title: 'FIX-101: Fix Syntax in Simple Addition Function',
    type: 'Bug',
    priority: 'Critical',
    assignedTo: 'You',
    status: 'In Progress',
    rewardXp: 200,
    codeContext: `def add_numbers(a, b):
    # BUG: Missing return statement or wrong keyword!
    total = a + b
    # Fix this line to return the sum
    pass`
  },
  {
    id: 'HW-102',
    title: 'FEAT-202: Write a Function to Check if Number is Odd',
    type: 'Feature',
    priority: 'High',
    assignedTo: 'You',
    status: 'PR Review',
    rewardXp: 300,
    codeContext: `def is_odd(n):
    # Hint: Use the modulo operator (%)
    # Check if division by 2 leaves a remainder
    return n % 2 != 0`
  },
  {
    id: 'HW-103',
    title: 'ASSIGN-303: Calculate Class Grade Average',
    type: 'Refactor',
    priority: 'Medium',
    assignedTo: 'Backend Team',
    status: 'Backlog',
    rewardXp: 400,
    codeContext: `def find_average(grades):
  # Calculate sum of list and divide by length
  total_sum = sum(grades)
  return total_sum / len(grades)`
  }
];
