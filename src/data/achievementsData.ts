import type { Achievement } from '../types/game';

export const achievementsData: Achievement[] = [
  {
    id: 'first-blood',
    title: '🩸 First Blood',
    description: 'Solve your very first programming challenge in Starter Village.',
    category: 'Learning',
    icon: 'Award',
    xpReward: 100,
    coinReward: 50,
    unlocked: true,
    progress: 1,
    maxProgress: 1
  },
  {
    id: 'unstoppable',
    title: '🔥 Unstoppable',
    description: 'Complete 10 successful challenges without a single syntax failure.',
    category: 'Speed',
    icon: 'Zap',
    xpReward: 300,
    coinReward: 150,
    unlocked: true,
    progress: 10,
    maxProgress: 10
  },
  {
    id: 'no-hint-master',
    title: '🧠 Independent Mind',
    description: 'Solve 5 consecutive challenges without asking the AI for a hint.',
    category: 'Learning',
    icon: 'Brain',
    xpReward: 500,
    coinReward: 250,
    unlocked: false,
    progress: 3,
    maxProgress: 5
  },
  {
    id: 'bug-slayer',
    title: '🐛 Bug Slayer',
    description: 'Fix corrupt code in 5 Bug Hunt challenges.',
    category: 'Debugging',
    icon: 'Bug',
    xpReward: 400,
    coinReward: 200,
    unlocked: false,
    progress: 1,
    maxProgress: 5
  },
  {
    id: 'dragon-slayer',
    title: '🐉 Loop Dragon Slayer',
    description: 'Defeat the Loop Dragon in multi-phase boss fight combat.',
    category: 'Competition',
    icon: 'Flame',
    xpReward: 1000,
    coinReward: 500,
    unlocked: false,
    progress: 0,
    maxProgress: 1
  },
  {
    id: 'code-architect',
    title: '🏗️ Tech Architect',
    description: 'Unlock the API Tower and Database Center in your personal Developer HQ.',
    category: 'Projects',
    icon: 'Building2',
    xpReward: 800,
    coinReward: 400,
    unlocked: false,
    progress: 1,
    maxProgress: 2
  },
  {
    id: 'secret-portal',
    title: '🕵️ Mystery Solver',
    description: 'Uncover a hidden mystery level in Logic Forest.',
    category: 'Secret',
    icon: 'HelpCircle',
    xpReward: 600,
    coinReward: 300,
    unlocked: false,
    progress: 0,
    maxProgress: 1
  }
];
