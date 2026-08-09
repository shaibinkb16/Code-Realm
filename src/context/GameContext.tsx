import React, { createContext, useContext, useState, useEffect } from 'react';
import type { PlayerProfile, ActiveTab, MapNode, Achievement } from '../types/game';
import { realmsData } from '../data/realmsData';
import { achievementsData } from '../data/achievementsData';
import { api } from '../services/api';

interface GameContextType {
  profile: PlayerProfile;
  setProfile: React.Dispatch<React.SetStateAction<PlayerProfile>>;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  activeNode: MapNode | null;
  setActiveNode: (node: MapNode | null) => void;
  isAiModalOpen: boolean;
  setIsAiModalOpen: (open: boolean) => void;
  aiChatMessages: { sender: 'ai' | 'user'; text: string; time: string }[];
  sendAiMessage: (text: string) => void;
  completeChallenge: (nodeId: string, stars: number, xp: number, coins: number) => void;
  achievements: Achievement[];
  upgradePet: () => void;
  upgradeHq: () => void;
  triggerNotification: (msg: string) => void;
  notification: string | null;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
}

const initialProfile: PlayerProfile = {
  username: 'AetherCoder',
  title: 'Code Realm Explorer ⚔️',
  avatar: '/avatars/aethercoder.svg',
  level: 14,
  xp: 2840,
  nextLevelXp: 3000,
  coins: 12450,
  stars: 42,
  streak: 14,
  rank: 'Gold',
  rankRating: 905,
  skills: {
    python: 905,
    javascript: 620,
    algorithms: 742,
    debugging: 812,
    databases: 530,
    systemDesign: 411,
    aiEngineering: 350
  },
  pet: {
    id: 'pet-dragon-1',
    name: 'Pyra',
    stage: 'Junior',
    xp: 450,
    level: 3,
    avatar: '🐉',
    mood: 'Energetic'
  },
  hq: {
    levelName: 'Developer HQ',
    unlockedBuildings: ['API Tower', 'Logic Citadel'],
    customizations: {
      theme: 'Warm Charcoal',
      deskItem: 'Golden Mechanical Keyboard',
      banner: 'Season 01 Legend'
    }
  },
  completedNodeIds: ['node-starter-1', 'node-starter-2', 'node-logic-1'],
  nodeStars: {
    'node-starter-1': 3,
    'node-starter-2': 3,
    'node-logic-1': 2
  },
  unlockedAchievements: ['first-blood', 'unstoppable'],
  guildName: 'PYTHON MASTERS 🐍',
  seasonBadge: 'SEASON 01 — PYTHON AGE'
};

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profile, setProfile] = useState<PlayerProfile>(() => {
    const saved = localStorage.getItem('coderealm_profile');
    return saved ? JSON.parse(saved) : initialProfile;
  });

  const [activeTab, setActiveTab] = useState<ActiveTab>('world');
  const [activeNode, setActiveNode] = useState<MapNode | null>(realmsData[0]?.nodes[0] || null);
  const [isAiModalOpen, setIsAiModalOpen] = useState<boolean>(false);
  const [notification, setNotification] = useState<string | null>(null);

  const [achievements] = useState<Achievement[]>(achievementsData);

  const [aiChatMessages, setAiChatMessages] = useState<{ sender: 'ai' | 'user'; text: string; time: string }[]>([
    {
      sender: 'ai',
      text: 'Greetings, Explorer Aether! I am your AI Mentor & Game Director. I see you are currently in Loop Castle. How can I assist your coding journey today?',
      time: 'Just now'
    }
  ]);

  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    localStorage.setItem('coderealm_profile', JSON.stringify(profile));
  }, [profile]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  const triggerNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  const completeChallenge = (nodeId: string, stars: number, xp: number, coins: number) => {
    setProfile(prev => {
      const newXp = prev.xp + xp;
      let newLevel = prev.level;
      let newNextXp = prev.nextLevelXp;

      if (newXp >= prev.nextLevelXp) {
        newLevel += 1;
        newNextXp += 1000;
        triggerNotification(`🎉 LEVEL UP! You reached Level ${newLevel}!`);
      } else {
        triggerNotification(`⭐ Node Cleared! +${xp} XP | +${coins} 🪙`);
      }

      const updatedCompleted = prev.completedNodeIds.includes(nodeId)
        ? prev.completedNodeIds
        : [...prev.completedNodeIds, nodeId];

      const existingStars = prev.nodeStars[nodeId] || 0;
      const updatedStarsMap = {
        ...prev.nodeStars,
        [nodeId]: Math.max(existingStars, stars)
      };

      const addedStars = Math.max(0, stars - existingStars);

      return {
        ...prev,
        level: newLevel,
        xp: newXp,
        nextLevelXp: newNextXp,
        coins: prev.coins + coins,
        stars: prev.stars + addedStars,
        completedNodeIds: updatedCompleted,
        nodeStars: updatedStarsMap,
        skills: {
          ...prev.skills,
          python: Math.min(999, prev.skills.python + 12),
          debugging: Math.min(999, prev.skills.debugging + 8)
        }
      };
    });
  };

  const sendAiMessage = async (text: string) => {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setAiChatMessages(prev => [...prev, { sender: 'user', text, time: timeStr }]);

    const apiRes = await api.askAiMentor(text, 'Explain', profile.skills.python);
    
    let reply = '';
    if (apiRes && apiRes.content) {
      reply = apiRes.content;
    } else {
      reply = `That's a great question! `;
      const lower = text.toLowerCase();
      if (lower.includes('hint') || lower.includes('stuck')) {
        reply += `I evaluated your active code. Try checking your loop bounds or ensuring you iterate through all elements cleanly. Avoid mutating lists directly while looping!`;
      } else if (lower.includes('python') || lower.includes('loop')) {
        reply += `In Python, loops can be written as 'for item in items:' or 'for i in range(len(items)):'. Range generation is fast and handles bounds automatically.`;
      } else if (lower.includes('career') || lower.includes('job')) {
        reply += `Your Python skill rating is 905 (Top 5% in Gold Division)! Your strongest domain is Debugging. I recommend tackling System Design next in the Career Arena.`;
      } else {
        reply += `Based on your recent solve time of 4m 12s, you are demonstrating strong algorithmic speed! Keep pushing forward through Loop Castle!`;
      }
    }

    setAiChatMessages(prev => [...prev, { sender: 'ai', text: reply, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
  };

  const upgradePet = () => {
    if (profile.coins >= 500) {
      setProfile(prev => ({
        ...prev,
        coins: prev.coins - 500,
        pet: {
          ...prev.pet,
          stage: prev.pet.stage === 'Baby' ? 'Junior' : prev.pet.stage === 'Junior' ? 'Advanced' : 'Master',
          level: prev.pet.level + 1
        }
      }));
      triggerNotification('🐲 Your Pet Companion Pyra evolved!');
    } else {
      triggerNotification('❌ Not enough coins! (Requires 500 🪙)');
    }
  };

  const upgradeHq = () => {
    if (profile.coins >= 1000) {
      setProfile(prev => ({
        ...prev,
        coins: prev.coins - 1000,
        hq: {
          ...prev.hq,
          unlockedBuildings: [...prev.hq.unlockedBuildings, 'Database Center']
        }
      }));
      triggerNotification('🏰 Developer HQ upgraded! Unlocked Database Center!');
    } else {
      triggerNotification('❌ Not enough coins! (Requires 1,000 🪙)');
    }
  };

  return (
    <GameContext.Provider
      value={{
        profile,
        setProfile,
        activeTab,
        setActiveTab,
        activeNode,
        setActiveNode,
        isAiModalOpen,
        setIsAiModalOpen,
        aiChatMessages,
        sendAiMessage,
        completeChallenge,
        achievements,
        upgradePet,
        upgradeHq,
        triggerNotification,
        notification,
        theme,
        toggleTheme
      }}
    >
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};
