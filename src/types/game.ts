export type ActiveTab = 'world' | 'challenge' | 'boss' | 'duel' | 'leaderboards' | 'championship' | 'hq' | 'admin';

export type ChallengeType = 
  | 'puzzle' 
  | 'battle' 
  | 'bughunt' 
  | 'detective' 
  | 'mystery' 
  | 'speedrun' 
  | 'build' 
  | 'boss' 
  | 'explain';

export type RankTier = 
  | 'Bronze' 
  | 'Iron' 
  | 'Silver' 
  | 'Gold' 
  | 'Platinum' 
  | 'Diamond' 
  | 'Master' 
  | 'Grandmaster' 
  | 'Legend' 
  | 'Code Champion';

export interface TestCase {
  id: string;
  input: string;
  expectedOutput: string;
  description: string;
  hidden?: boolean;
}

export interface Challenge {
  id: string;
  title: string;
  type: ChallengeType;
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Boss' | 'Extreme';
  description: string;
  storyContext?: string;
  initialCode: string;
  language: 'python' | 'javascript';
  testCases: TestCase[];
  xpReward: number;
  coinReward: number;
  hints: string[];
  explanation: string;
}

export interface SubLevel {
  id: string;
  title: string;
  type: ChallengeType;
  xp: number;
  coins: number;
  completed: boolean;
  stars: number;
}

export interface MapNode {
  id: string;
  realmId: string;
  title: string;
  type: ChallengeType;
  x: number; // Percentage coordinate on map (0-100)
  y: number; // Percentage coordinate on map (0-100)
  unlocked: boolean;
  completed: boolean;
  stars: number; // 0 to 3
  challengeId?: string;
  prerequisites: string[]; // Node IDs required before unlocking
  iconName: string;
  bossId?: string;
  subLevels?: SubLevel[];
}

export interface Realm {
  id: string;
  name: string;
  tagline: string;
  description: string;
  order: number;
  unlocked: boolean;
  nodes: MapNode[];
  themeColor: string;
  icon: string;
}

export interface PlayerPet {
  id: string;
  name: string;
  stage: 'Baby' | 'Junior' | 'Advanced' | 'Master' | 'Legend Dragon';
  xp: number;
  level: number;
  avatar: string;
  mood: 'Happy' | 'Energetic' | 'Focused' | 'Sleeping';
}

export interface PlayerHQ {
  levelName: 'Room' | 'Office' | 'Studio' | 'Developer HQ' | 'AI Laboratory' | 'Tech Empire';
  unlockedBuildings: string[]; // e.g. ['API Tower', 'Database Center']
  customizations: {
    theme: string;
    deskItem: string;
    banner: string;
  };
}

export interface SkillRating {
  python: number;
  javascript: number;
  algorithms: number;
  debugging: number;
  databases: number;
  systemDesign: number;
  aiEngineering: number;
}

export interface PlayerProfile {
  username: string;
  fullName?: string;
  email?: string;
  title: string;
  avatar: string;
  level: number;
  xp: number;
  nextLevelXp: number;
  coins: number;
  stars: number;
  streak: number;
  rank: RankTier;
  rankRating: number;
  skills: SkillRating;
  pet: PlayerPet;
  hq: PlayerHQ;
  completedNodeIds: string[];
  nodeStars: Record<string, number>;
  unlockedAchievements: string[];
  guildName?: string;
  seasonBadge?: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  category: 'Learning' | 'Competition' | 'Debugging' | 'Speed' | 'Projects' | 'Secret';
  icon: string;
  xpReward: number;
  coinReward: number;
  unlocked: boolean;
  progress?: number;
  maxProgress?: number;
}

export interface LeaderboardEntry {
  rank: number;
  username: string;
  avatar: string;
  rating: number;
  xp: number;
  wins: number;
  streak: number;
  league: RankTier;
  isCurrentUser?: boolean;
}

export interface BossPhase {
  phaseNumber: number;
  phaseTitle: string;
  bossHealthPercent: number;
  challenge: Challenge;
}

export interface BossBattle {
  id: string;
  name: string;
  title: string;
  avatar: string;
  totalHealth: number;
  phases: BossPhase[];
  loot: {
    xp: number;
    coins: number;
    title: string;
    badge: string;
  };
}

export interface AITeachingResponse {
  mode: 'Hint' | 'Explain' | 'Socratic' | 'Demonstrate' | 'Review';
  content: string;
  codeSnippet?: string;
}

export interface SprintTicket {
  id: string;
  title: string;
  type: 'Bug' | 'Feature' | 'Refactor' | 'Incident';
  priority: 'High' | 'Medium' | 'Critical';
  assignedTo: string;
  status: 'Backlog' | 'In Progress' | 'PR Review' | 'Done';
  rewardXp: number;
  codeContext: string;
}
