import type { Realm } from '../types/game';

export const realmsData: Realm[] = [
  {
    id: 'starter-village',
    name: 'EPIC 17-POINT CODE REALM',
    tagline: 'Explore 17 Major Waypoints containing hundreds of sub-level trials',
    description: 'Each map point contains multiple sub-levels, quizzes, bug hunts, speedruns, and loot rewards.',
    order: 1,
    unlocked: true,
    themeColor: '#38A169',
    icon: '🌍',
    nodes: [
      {
        id: 'node-1',
        realmId: 'starter-village',
        title: '1. The Spark of Logic',
        type: 'puzzle',
        x: 50,
        y: 95,
        unlocked: true,
        completed: false,
        stars: 3,
        challengeId: 'starter-1',
        prerequisites: [],
        iconName: 'Sparkles',
        subLevels: [
          { id: 'sub-1-1', title: 'Level 1.1: Hello World & Console Output', type: 'puzzle', xp: 100, coins: 50, completed: false, stars: 3 },
          { id: 'sub-1-2', title: 'Level 1.2: Variable Declarations', type: 'puzzle', xp: 120, coins: 60, completed: false, stars: 3 },
          { id: 'sub-1-3', title: 'Level 1.3: Data Type Casting', type: 'puzzle', xp: 150, coins: 75, completed: false, stars: 0 }
        ]
      },
      {
        id: 'node-2',
        realmId: 'starter-village',
        title: '2. Variable Grove',
        type: 'puzzle',
        x: 35,
        y: 89,
        unlocked: true,
        completed: false,
        stars: 3,
        challengeId: 'starter-1',
        prerequisites: ['node-1'],
        iconName: 'Code2',
        subLevels: [
          { id: 'sub-2-1', title: 'Level 2.1: Integer Arithmetic', type: 'puzzle', xp: 140, coins: 70, completed: false, stars: 3 },
          { id: 'sub-2-2', title: 'Level 2.2: String Concatenation & Interpolation', type: 'puzzle', xp: 160, coins: 80, completed: false, stars: 0 },
          { id: 'sub-2-3', title: 'Level 2.3: Boolean Flags & State', type: 'puzzle', xp: 180, coins: 90, completed: false, stars: 0 }
        ]
      },
      {
        id: 'node-3',
        realmId: 'starter-village',
        title: '3. Syntax Speedrun',
        type: 'speedrun',
        x: 65,
        y: 83,
        unlocked: true,
        completed: false,
        stars: 0,
        challengeId: 'starter-1',
        prerequisites: ['node-2'],
        iconName: 'Zap',
        subLevels: [
          { id: 'sub-3-1', title: 'Level 3.1: 60-Second Rapid Syntax Test', type: 'speedrun', xp: 200, coins: 100, completed: false, stars: 0 },
          { id: 'sub-3-2', title: 'Level 3.2: 45-Second Error Spotter', type: 'speedrun', xp: 250, coins: 125, completed: false, stars: 0 }
        ]
      },
      {
        id: 'node-4',
        realmId: 'starter-village',
        title: '4. Gatekeeper of Logic',
        type: 'puzzle',
        x: 50,
        y: 77,
        unlocked: true,
        completed: false,
        stars: 0,
        challengeId: 'logic-1',
        prerequisites: ['node-3'],
        iconName: 'ShieldCheck',
        subLevels: [
          { id: 'sub-4-1', title: 'Level 4.1: If / Else Branching', type: 'puzzle', xp: 180, coins: 90, completed: false, stars: 0 },
          { id: 'sub-4-2', title: 'Level 4.2: Logical AND / OR Tables', type: 'puzzle', xp: 200, coins: 100, completed: false, stars: 0 },
          { id: 'sub-4-3', title: 'Level 4.3: Nested Conditions Guard', type: 'puzzle', xp: 220, coins: 110, completed: false, stars: 0 }
        ]
      },
      {
        id: 'node-5',
        realmId: 'starter-village',
        title: '5. Corruption Hunt',
        type: 'bughunt',
        x: 25,
        y: 71,
        unlocked: true,
        completed: false,
        stars: 0,
        challengeId: 'logic-2',
        prerequisites: ['node-4'],
        iconName: 'Bug',
        subLevels: [
          { id: 'sub-5-1', title: 'Level 5.1: Fix Off-by-One Logical Bug', type: 'bughunt', xp: 220, coins: 110, completed: false, stars: 0 },
          { id: 'sub-5-2', title: 'Level 5.2: Fix Null Reference Exception', type: 'bughunt', xp: 250, coins: 125, completed: false, stars: 0 }
        ]
      },
      {
        id: 'node-6',
        realmId: 'starter-village',
        title: '6. Mystery Chamber',
        type: 'mystery',
        x: 75,
        y: 71,
        unlocked: true,
        completed: false,
        stars: 0,
        challengeId: 'logic-1',
        prerequisites: ['node-4'],
        iconName: 'HelpCircle',
        subLevels: [
          { id: 'sub-6-1', title: 'Level 6.1: The Boolean Crypt Riddle', type: 'mystery', xp: 250, coins: 150, completed: false, stars: 0 }
        ]
      },
      {
        id: 'node-7',
        realmId: 'starter-village',
        title: '7. Mini-Boss: Logic Golem',
        type: 'boss',
        x: 50,
        y: 64,
        unlocked: true,
        completed: false,
        stars: 0,
        bossId: 'monarch-1',
        prerequisites: ['node-5', 'node-6'],
        iconName: 'Flame',
        subLevels: [
          { id: 'sub-7-1', title: 'Phase 1: Golem Shield Break', type: 'boss', xp: 300, coins: 200, completed: false, stars: 0 },
          { id: 'sub-7-2', title: 'Phase 2: Final Overdrive Defeat', type: 'boss', xp: 500, coins: 350, completed: false, stars: 0 }
        ]
      },
      {
        id: 'node-8',
        realmId: 'starter-village',
        title: '8. For-Loop Stairway',
        type: 'puzzle',
        x: 35,
        y: 57,
        unlocked: true,
        completed: false,
        stars: 0,
        challengeId: 'loop-1',
        prerequisites: ['node-7'],
        iconName: 'Code2',
        subLevels: [
          { id: 'sub-8-1', title: 'Level 8.1: Basic For-Loop Iteration', type: 'puzzle', xp: 200, coins: 100, completed: false, stars: 0 },
          { id: 'sub-8-2', title: 'Level 8.2: Range & Step Slicing', type: 'puzzle', xp: 220, coins: 110, completed: false, stars: 0 }
        ]
      },
      {
        id: 'node-9',
        realmId: 'starter-village',
        title: '9. While-Loop Abyss',
        type: 'bughunt',
        x: 65,
        y: 51,
        unlocked: true,
        completed: false,
        stars: 0,
        challengeId: 'loop-1',
        prerequisites: ['node-8'],
        iconName: 'Bug',
        subLevels: [
          { id: 'sub-9-1', title: 'Level 9.1: Break Out of Infinite Loop', type: 'bughunt', xp: 240, coins: 120, completed: false, stars: 0 }
        ]
      },
      {
        id: 'node-10',
        realmId: 'starter-village',
        title: '10. Array Traverser',
        type: 'puzzle',
        x: 40,
        y: 44,
        unlocked: true,
        completed: false,
        stars: 0,
        challengeId: 'loop-1',
        prerequisites: ['node-9'],
        iconName: 'Code2',
        subLevels: [
          { id: 'sub-10-1', title: 'Level 10.1: Summing Array Elements', type: 'puzzle', xp: 250, coins: 125, completed: false, stars: 0 },
          { id: 'sub-10-2', title: 'Level 10.2: Filter & Map Operations', type: 'puzzle', xp: 280, coins: 140, completed: false, stars: 0 }
        ]
      },
      {
        id: 'node-11',
        realmId: 'starter-village',
        title: '11. Parameter Bridge',
        type: 'puzzle',
        x: 60,
        y: 37,
        unlocked: true,
        completed: false,
        stars: 0,
        challengeId: 'starter-1',
        prerequisites: ['node-10'],
        iconName: 'Sparkles',
        subLevels: [
          { id: 'sub-11-1', title: 'Level 11.1: Positional vs Keyword Arguments', type: 'puzzle', xp: 260, coins: 130, completed: false, stars: 0 }
        ]
      },
      {
        id: 'node-12',
        realmId: 'starter-village',
        title: '12. Scope Sentinel',
        type: 'mystery',
        x: 30,
        y: 31,
        unlocked: true,
        completed: false,
        stars: 0,
        challengeId: 'logic-1',
        prerequisites: ['node-11'],
        iconName: 'HelpCircle',
        subLevels: [
          { id: 'sub-12-1', title: 'Level 12.1: Global vs Local Scope Vault', type: 'mystery', xp: 280, coins: 140, completed: false, stars: 0 }
        ]
      },
      {
        id: 'node-13',
        realmId: 'starter-village',
        title: '13. Recursion Cavern',
        type: 'puzzle',
        x: 70,
        y: 25,
        unlocked: true,
        completed: false,
        stars: 0,
        challengeId: 'loop-1',
        prerequisites: ['node-12'],
        iconName: 'Code2',
        subLevels: [
          { id: 'sub-13-1', title: 'Level 13.1: Factorial Base Case', type: 'puzzle', xp: 300, coins: 150, completed: false, stars: 0 },
          { id: 'sub-13-2', title: 'Level 13.2: Fibonacci Call Stack', type: 'puzzle', xp: 350, coins: 175, completed: false, stars: 0 }
        ]
      },
      {
        id: 'node-14',
        realmId: 'starter-village',
        title: '14. Speedrun: Lambda Express',
        type: 'speedrun',
        x: 50,
        y: 19,
        unlocked: true,
        completed: false,
        stars: 0,
        challengeId: 'starter-1',
        prerequisites: ['node-13'],
        iconName: 'Zap',
        subLevels: [
          { id: 'sub-14-1', title: 'Level 14.1: Anonymous Function Rush', type: 'speedrun', xp: 300, coins: 150, completed: false, stars: 0 }
        ]
      },
      {
        id: 'node-15',
        realmId: 'starter-village',
        title: '15. System Architecture Summit',
        type: 'puzzle',
        x: 35,
        y: 13,
        unlocked: true,
        completed: false,
        stars: 0,
        challengeId: 'logic-2',
        prerequisites: ['node-14'],
        iconName: 'ShieldCheck',
        subLevels: [
          { id: 'sub-15-1', title: 'Level 15.1: Class Inheritance Design', type: 'puzzle', xp: 350, coins: 175, completed: false, stars: 0 }
        ]
      },
      {
        id: 'node-16',
        realmId: 'starter-village',
        title: '16. Bug Apocalypse Citadel',
        type: 'bughunt',
        x: 65,
        y: 8,
        unlocked: true,
        completed: false,
        stars: 0,
        challengeId: 'logic-2',
        prerequisites: ['node-15'],
        iconName: 'Bug',
        subLevels: [
          { id: 'sub-16-1', title: 'Level 16.1: Production Memory Leak Debug', type: 'bughunt', xp: 400, coins: 200, completed: false, stars: 0 }
        ]
      },
      {
        id: 'node-17',
        realmId: 'starter-village',
        title: '17. FINAL BOSS: MONARCH OF LOOPS',
        type: 'boss',
        x: 50,
        y: 3,
        unlocked: true,
        completed: false,
        stars: 0,
        bossId: 'monarch-1',
        prerequisites: ['node-16'],
        iconName: 'Flame',
        subLevels: [
          { id: 'sub-17-1', title: 'Final Phase 1: Infinite Loop Breaking', type: 'boss', xp: 500, coins: 300, completed: false, stars: 0 },
          { id: 'sub-17-2', title: 'Final Phase 2: Crown of Staff Engineer', type: 'boss', xp: 1000, coins: 600, completed: false, stars: 0 }
        ]
      }
    ]
  }
];
