import React, { createContext, useContext, useState, useEffect } from 'react';
import type { PlayerProfile, ActiveTab, MapNode, Achievement } from '../types/game';
import { realmsData } from '../data/realmsData';
import { achievementsData } from '../data/achievementsData';
import { api } from '../services/api';
import { useAuth } from './AuthContext';

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
  sendAiMessage: (text: string, mode?: string) => void;
  completeChallenge: (nodeId: string, stars: number, xp: number, coins: number) => void;
  achievements: Achievement[];
  upgradePet: () => void;
  upgradeHq: () => void;
  triggerNotification: (msg: string) => void;
  notification: string | null;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
}

const buildProfileFromUser = (user: any, existingSavedProfile?: Partial<PlayerProfile>): PlayerProfile => {
  const p = user?.profile || {};
  const s = user?.skills || {};
  const username = user?.username || 'Explorer';
  const fullName = user?.full_name || user?.name || username;
  const email = user?.email || '';

  return {
    username: username,
    fullName: fullName,
    email: email,
    title: p.title || existingSavedProfile?.title || 'Code Realm Explorer ⚔️',
    avatar: p.avatar || existingSavedProfile?.avatar || '/avatars/aethercoder.svg',
    level: existingSavedProfile?.level ?? p.level ?? 1,
    xp: existingSavedProfile?.xp ?? p.xp ?? 0,
    nextLevelXp: existingSavedProfile?.nextLevelXp ?? p.next_level_xp ?? 1000,
    coins: existingSavedProfile?.coins ?? p.coins ?? 100,
    stars: existingSavedProfile?.stars ?? p.stars ?? 0,
    streak: existingSavedProfile?.streak ?? p.streak ?? 1,
    rank: existingSavedProfile?.rank || p.rank || 'Bronze',
    rankRating: existingSavedProfile?.rankRating ?? p.rank_rating ?? 500,
    skills: {
      python: existingSavedProfile?.skills?.python ?? s.python ?? 500,
      javascript: existingSavedProfile?.skills?.javascript ?? s.javascript ?? 500,
      algorithms: existingSavedProfile?.skills?.algorithms ?? s.algorithms ?? 500,
      debugging: existingSavedProfile?.skills?.debugging ?? s.debugging ?? 500,
      databases: existingSavedProfile?.skills?.databases ?? s.databases ?? 500,
      systemDesign: existingSavedProfile?.skills?.systemDesign ?? s.system_design ?? 500,
      aiEngineering: existingSavedProfile?.skills?.aiEngineering ?? s.ai_engineering ?? 500,
    },
    pet: existingSavedProfile?.pet || {
      id: `pet-${user?.id || '1'}`,
      name: 'Pyra',
      stage: p.pet_stage || 'Baby',
      xp: 0,
      level: p.pet_level ?? 1,
      avatar: '🐉',
      mood: 'Energetic'
    },
    hq: existingSavedProfile?.hq || {
      levelName: p.hq_level || 'Room',
      unlockedBuildings: ['API Tower'],
      customizations: {
        theme: 'Warm Charcoal',
        deskItem: 'Mechanical Keyboard',
        banner: 'Season 01 Explorer'
      }
    },
    completedNodeIds: existingSavedProfile?.completedNodeIds || [],
    nodeStars: existingSavedProfile?.nodeStars || {},
    unlockedAchievements: existingSavedProfile?.unlockedAchievements || ['first-blood'],
    guildName: existingSavedProfile?.guildName || 'CODE REALM EXPLORERS',
    seasonBadge: existingSavedProfile?.seasonBadge || 'SEASON 01 — PYTHON AGE'
  };
};

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  const [profile, setProfile] = useState<PlayerProfile>(() => {
    if (user) {
      const saved = localStorage.getItem(`coderealm_profile_${user.id}`);
      const savedParsed = saved ? JSON.parse(saved) : undefined;
      return buildProfileFromUser(user, savedParsed);
    }
    return buildProfileFromUser(null);
  });

  const [activeTab, setActiveTab] = useState<ActiveTab>('world');
  const [activeNode, setActiveNode] = useState<MapNode | null>(realmsData[0]?.nodes[0] || null);
  const [isAiModalOpen, setIsAiModalOpen] = useState<boolean>(false);
  const [notification, setNotification] = useState<string | null>(null);

  const [achievements] = useState<Achievement[]>(achievementsData);

  const [aiChatMessages, setAiChatMessages] = useState<{ sender: 'ai' | 'user'; text: string; time: string }[]>(() => [
    {
      sender: 'ai',
      text: `Greetings, Explorer ${user?.username || 'Coder'}! I am your AI Mentor & Game Director. How can I assist your coding journey today?`,
      time: 'Just now'
    }
  ]);

  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    if (user) {
      const saved = localStorage.getItem(`coderealm_profile_${user.id}`);
      const savedParsed = saved ? JSON.parse(saved) : undefined;
      setProfile(buildProfileFromUser(user, savedParsed));
    }
  }, [user]);

  useEffect(() => {
    if (user?.id) {
      localStorage.setItem(`coderealm_profile_${user.id}`, JSON.stringify(profile));
    }
  }, [profile, user?.id]);

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

  const sendAiMessage = async (text: string, mode: string = 'Explain') => {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setAiChatMessages(prev => [...prev, { sender: 'user', text, time: timeStr }]);

    const apiRes = await api.askAiMentor(text, mode, profile.skills.python);
    
    let reply = '';
    if (apiRes && apiRes.content) {
      reply = apiRes.content;
    } else {
      reply = `I evaluated your request. Focus on clean syntax and logical flow!`;
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
