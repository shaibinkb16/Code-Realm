import React, { useState, useEffect, useMemo } from 'react';
import { useGame } from '../../context/GameContext';
import { API_BASE_URL } from '../../services/api';
import { AchievementGallery } from './AchievementGallery';
import type { Achievement } from '../../types/game';
import {
  Layers, Sparkles, Flame, Award,
  ArrowUpCircle, Loader, RefreshCw, Bot,
  Zap, Building, Brain
} from 'lucide-react';

const API_BASE = API_BASE_URL;

const HQ_TIERS = [
  { name: 'Room',          buildings: 0, cost: 0,    desc: 'A humble coding corner.' },
  { name: 'Office',        buildings: 1, cost: 1000, desc: 'A proper developer office.', unlocks: 'API Tower' },
  { name: 'Studio',        buildings: 2, cost: 2000, desc: 'A professional coding studio.', unlocks: 'Logic Citadel' },
  { name: 'Developer HQ',  buildings: 3, cost: 3500, desc: 'Your full Developer HQ.', unlocks: 'Database Center' },
  { name: 'AI Laboratory', buildings: 4, cost: 6000, desc: 'Cutting-edge AI research lab.', unlocks: 'AI Inference Engine' },
  { name: 'Tech Empire',   buildings: 5, cost: 10000, desc: 'A sprawling Tech Empire.', unlocks: 'Global CDN Node' },
];

const BUILDINGS = [
  { name: 'API Tower',           icon: <Zap size={20} />, passive: 50,  desc: 'REST API gateway for your empire' },
  { name: 'Logic Citadel',       icon: <Brain size={20} />, passive: 80,  desc: 'Algorithmic logic processing core' },
  { name: 'Database Center',     icon: <Layers size={20} />, passive: 120, desc: 'Persistent data storage fortress' },
  { name: 'AI Inference Engine', icon: <Bot size={20} />, passive: 200, desc: 'Neural network inference cluster' },
  { name: 'Global CDN Node',     icon: <GlobeIcon size={20} />, passive: 300, desc: 'Worldwide content delivery network' },
];

function GlobeIcon(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/><path d="M2 12h20"/>
    </svg>
  );
}

function computeAchievements(profile: ReturnType<typeof useGame>['profile']): Achievement[] {
  const completedCount = profile.completedNodeIds?.length || 0;
  const hasDefeatedBoss = profile.completedNodeIds?.some(id => id.includes('boss')) || false;
  const buildingCount = profile.hq?.unlockedBuildings?.length || 0;

  return [
    { id: 'first-blood', title: 'First Blood', description: 'Solve your first programming challenge.', category: 'Learning', icon: 'Award', xpReward: 100, coinReward: 50, unlocked: completedCount >= 1, progress: Math.min(1, completedCount), maxProgress: 1 },
    { id: 'unstoppable', title: 'Unstoppable', description: 'Complete 10 challenges.', category: 'Speed', icon: 'Zap', xpReward: 300, coinReward: 150, unlocked: completedCount >= 10, progress: Math.min(10, completedCount), maxProgress: 10 },
    { id: 'streak-warrior', title: 'Streak Warrior', description: 'Maintain a 7-day coding streak.', category: 'Learning', icon: 'Flame', xpReward: 400, coinReward: 200, unlocked: (profile.streak || 0) >= 7, progress: Math.min(7, profile.streak || 0), maxProgress: 7 },
    { id: 'xp-hunter', title: 'XP Hunter', description: 'Earn 5,000 total XP.', category: 'Learning', icon: 'Award', xpReward: 500, coinReward: 250, unlocked: (profile.xp || 0) >= 5000, progress: Math.min(5000, profile.xp || 0), maxProgress: 5000 },
    { id: 'star-collector', title: 'Star Collector', description: 'Earn 30 stars across all challenges.', category: 'Learning', icon: 'Award', xpReward: 600, coinReward: 300, unlocked: (profile.stars || 0) >= 30, progress: Math.min(30, profile.stars || 0), maxProgress: 30 },
    { id: 'dragon-slayer', title: 'Dragon Slayer', description: 'Defeat a Boss in multi-phase boss fight combat.', category: 'Competition', icon: 'Flame', xpReward: 1000, coinReward: 500, unlocked: hasDefeatedBoss, progress: hasDefeatedBoss ? 1 : 0, maxProgress: 1 },
    { id: 'coin-hoarder', title: 'Coin Hoarder', description: 'Accumulate 5,000 coins.', category: 'Projects', icon: 'Building2', xpReward: 400, coinReward: 0, unlocked: (profile.coins || 0) >= 5000, progress: Math.min(5000, profile.coins || 0), maxProgress: 5000 },
    { id: 'code-architect', title: 'Tech Architect', description: 'Unlock 3 buildings in your Developer HQ.', category: 'Projects', icon: 'Building2', xpReward: 800, coinReward: 400, unlocked: buildingCount >= 3, progress: Math.min(3, buildingCount), maxProgress: 3 },
    { id: 'python-master', title: 'Python Master', description: 'Reach 900+ Python skill rating.', category: 'Learning', icon: 'Brain', xpReward: 700, coinReward: 350, unlocked: (profile.skills?.python || 0) >= 900, progress: Math.min(900, profile.skills?.python || 0), maxProgress: 900 },
    { id: 'level-10', title: 'Seasoned Coder', description: 'Reach Level 10.', category: 'Learning', icon: 'Award', xpReward: 1000, coinReward: 500, unlocked: (profile.level || 0) >= 10, progress: Math.min(10, profile.level || 0), maxProgress: 10 },
  ];
}

export const DeveloperHQ: React.FC = () => {
  const { profile, setProfile, triggerNotification } = useGame() as any;
  const [activeSubTab, setActiveSubTab] = useState<'workspace' | 'pet' | 'achievements' | 'briefing'>('workspace');
  const [briefing, setBriefing] = useState('');
  const [isLoadingBriefing, setIsLoadingBriefing] = useState(false);

  const achievements: Achievement[] = useMemo(() => computeAchievements(profile), [profile]);

  const petMood = useMemo(() => {
    if (profile.streak >= 14) return { label: 'Legendary', color: 'var(--success)' };
    if (profile.streak >= 7)  return { label: 'Energetic', color: 'var(--warning)' };
    if (profile.streak >= 3)  return { label: 'Focused',   color: 'var(--info)' };
    if (profile.streak >= 1)  return { label: 'Happy',     color: 'var(--text-main)' };
    return { label: 'Sleeping', color: 'var(--text-muted)' };
  }, [profile.streak]);

  const passiveIncome = useMemo(() => {
    return (profile.hq?.unlockedBuildings || []).reduce((total: number, name: string) => {
      const b = BUILDINGS.find(b => b.name === name);
      return total + (b?.passive || 0);
    }, 0);
  }, [profile.hq?.unlockedBuildings]);

  const currentTier = useMemo(() => {
    const count = (profile.hq?.unlockedBuildings || []).length;
    return HQ_TIERS.find(t => t.buildings === count) || HQ_TIERS[HQ_TIERS.indexOf(HQ_TIERS.find(t => t.buildings <= count) || HQ_TIERS[0])];
  }, [profile.hq?.unlockedBuildings]);

  const nextTier = useMemo(() => {
    const idx = HQ_TIERS.findIndex(t => t.name === currentTier?.name);
    return idx >= 0 && idx < HQ_TIERS.length - 1 ? HQ_TIERS[idx + 1] : null;
  }, [currentTier]);

  const handleUpgradeHq = () => {
    if (!nextTier) { triggerNotification('Max tier reached — Tech Empire!'); return; }
    if (profile.coins < nextTier.cost) {
      triggerNotification(`Not enough coins! Need ${nextTier.cost} 🪙`); return;
    }
    setProfile((prev: any) => ({
      ...prev,
      coins: prev.coins - nextTier.cost,
      hq: {
        ...prev.hq,
        levelName: nextTier.name,
        unlockedBuildings: nextTier.unlocks
          ? [...(prev.hq?.unlockedBuildings || []), nextTier.unlocks]
          : prev.hq?.unlockedBuildings || [],
      }
    }));
    triggerNotification(`HQ Upgraded to ${nextTier.name}! Unlocked ${nextTier.unlocks}!`);
  };

  const handleUpgradePet = () => {
    const stages = ['Baby', 'Junior', 'Advanced', 'Master', 'Legend Dragon'];
    const currentIdx = stages.indexOf(profile.pet?.stage || 'Baby');
    if (currentIdx >= stages.length - 1) { triggerNotification('Your pet reached Legend Dragon — Max!'); return; }
    if (profile.coins < 500) { triggerNotification('Need 500 coins to evolve!'); return; }
    const nextStage = stages[currentIdx + 1];
    setProfile((prev: any) => ({
      ...prev,
      coins: prev.coins - 500,
      pet: { ...prev.pet, stage: nextStage, level: prev.pet.level + 1 }
    }));
    triggerNotification(`${profile.pet?.name} evolved to ${nextStage} stage!`);
  };

  const fetchBriefing = async () => {
    setIsLoadingBriefing(true);
    setBriefing('');
    try {
      const resp = await fetch(`${API_BASE}/ai/mentor/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Give me a personalized daily coding briefing. My stats:
- Level ${profile.level}, ${profile.xp} XP, ${profile.streak}-day streak
- Completed ${profile.completedNodeIds?.length || 0} challenges
- Python: ${profile.skills?.python}, Algorithms: ${profile.skills?.algorithms}, Debugging: ${profile.skills?.debugging}
- Weakest: ${Object.entries(profile.skills || {}).sort(([,a],[,b]) => (a as number)-(b as number))[0]?.[0]}
Give me: 1 motivational opener, 2 specific daily missions targeting my weakest skills, and a tip. Keep it short and exciting.`,
          mode: 'Explain',
          skill_rating: profile.rankRating || 905,
        }),
      });
      const data = await resp.json();
      setBriefing(data.content || 'The AI Game Master is preparing your briefing...');
    } catch {
      const weakest = Object.entries(profile.skills || {}).sort(([,a],[,b]) => (a as number)-(b as number))[0];
      setBriefing(`Good day, ${profile.username}! Your ${profile.streak}-day streak is legendary. Today, focus on improving ${weakest?.[0] || 'algorithms'} — attempt 3 challenge nodes and aim for all tests passing on first try!`);
    } finally {
      setIsLoadingBriefing(false);
    }
  };

  useEffect(() => {
    if (activeSubTab === 'briefing' && !briefing) fetchBriefing();
  }, [activeSubTab]);

  const tabStyle = (id: string): React.CSSProperties => ({
    background: activeSubTab === id ? 'var(--bg-elevated)' : 'transparent',
    border: `1px solid ${activeSubTab === id ? 'var(--border-subtle)' : 'transparent'}`,
    color: activeSubTab === id ? 'var(--text-main)' : 'var(--text-muted)',
    padding: 'var(--space-2) var(--space-4)', borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: '13px',
    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 'var(--space-2)', transition: 'all 0.15s ease',
  });

  const unlockedCount = achievements.filter(a => a.unlocked).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      {/* HQ Banner */}
      <div className="realm-card" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
          <div style={{ background: 'var(--bg-elevated)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <Building size={32} color="var(--text-main)" />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Developer Realm</div>
            <h1 style={{ fontSize: '20px', color: 'var(--text-main)', fontWeight: 700 }}>
              {(profile.hq?.levelName || 'Developer HQ')}
            </h1>
            <div style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 'var(--space-2)' }}>
              <span>Pet: {profile.pet?.name} ({profile.pet?.stage})</span>
              <span style={{ color: 'var(--border-subtle)' }}>|</span>
              <span style={{ color: 'var(--success)' }}>+{passiveIncome} Coins/day</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          {[
            { label: 'Level', value: profile.level },
            { label: 'Streak', value: `${profile.streak}d` },
            { label: 'Stars', value: profile.stars },
          ].map(s => (
            <div key={s.label} style={{ textAlign: 'center', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', padding: 'var(--space-2) var(--space-3)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main)' }}>{s.value}</div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>{s.label}</div>
            </div>
          ))}
          {nextTier && (
            <button onClick={handleUpgradeHq} className="btn-primary" style={{ marginLeft: 'var(--space-2)' }}>
              <ArrowUpCircle size={16} /> Upgrade ({nextTier.cost.toLocaleString()})
            </button>
          )}
        </div>
      </div>

      {/* Sub-nav */}
      <div style={{ display: 'flex', gap: 'var(--space-2)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 'var(--space-3)', overflowX: 'auto' }}>
        <button onClick={() => setActiveSubTab('workspace')} style={tabStyle('workspace')}><Layers size={16} /> Workspace</button>
        <button onClick={() => setActiveSubTab('pet')} style={tabStyle('pet')}><Flame size={16} /> Companion</button>
        <button onClick={() => setActiveSubTab('achievements')} style={tabStyle('achievements')}><Award size={16} /> Achievements</button>
        <button onClick={() => setActiveSubTab('briefing')} style={tabStyle('briefing')}><Bot size={16} /> Briefing</button>
      </div>

      <div>
        {/* ── WORKSPACE TAB ── */}
        {activeSubTab === 'workspace' && (
          <div className="grid-responsive">
            <div className="realm-card">
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)', marginBottom: 'var(--space-4)' }}>HQ Progression</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {HQ_TIERS.map((tier, idx) => {
                  const isUnlocked = (profile.hq?.unlockedBuildings?.length || 0) >= tier.buildings;
                  const isCurrent = tier.name === (currentTier?.name || 'Room');
                  return (
                    <div key={tier.name} style={{
                      padding: 'var(--space-3)', borderRadius: 'var(--radius-md)',
                      background: isCurrent ? 'var(--bg-elevated)' : 'transparent',
                      border: `1px solid ${isCurrent ? 'var(--border-subtle)' : 'transparent'}`,
                      display: 'flex', alignItems: 'center', gap: 'var(--space-3)', opacity: isUnlocked ? 1 : 0.4,
                    }}>
                      <div style={{ width: '24px', textAlign: 'center', fontWeight: 600, color: 'var(--text-muted)' }}>{isUnlocked ? '✓' : idx + 1}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-main)' }}>
                          {tier.name} {isCurrent && <span style={{ fontSize: '10px', color: 'var(--accent-primary)', marginLeft: 'var(--space-2)', background: 'var(--bg-surface)', padding: '2px 6px', borderRadius: '4px' }}>CURRENT</span>}
                        </div>
                        {tier.unlocks && <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Unlocks: {tier.unlocks}</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="realm-card">
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)', marginBottom: 'var(--space-4)' }}>Infrastructure</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {BUILDINGS.map(building => {
                  const isUnlocked = (profile.hq?.unlockedBuildings || []).includes(building.name);
                  return (
                    <div key={building.name} style={{
                      background: isUnlocked ? 'var(--bg-elevated)' : 'transparent',
                      border: `1px solid ${isUnlocked ? 'var(--border-subtle)' : 'transparent'}`,
                      padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center',
                      gap: 'var(--space-3)', opacity: isUnlocked ? 1 : 0.4,
                    }}>
                      <div style={{ color: 'var(--text-muted)' }}>{building.icon}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-main)' }}>{building.name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{building.desc}</div>
                      </div>
                      <div style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                        {isUnlocked
                          ? <span style={{ color: 'var(--success)' }}>+{building.passive}/day</span>
                          : <span style={{ color: 'var(--text-muted)' }}>Locked</span>
                        }
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── PET TAB ── */}
        {activeSubTab === 'pet' && (
          <div className="grid-responsive">
            <div className="realm-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-8)' }}>
              <div style={{ fontSize: '64px', marginBottom: 'var(--space-4)' }}>{profile.pet?.avatar}</div>
              <h2 style={{ fontSize: '20px', color: 'var(--text-main)', fontWeight: 700 }}>{profile.pet?.name}</h2>
              <div style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: 'var(--space-2)' }}>{profile.pet?.stage} Stage · Level {profile.pet?.level}</div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: petMood.color, marginBottom: 'var(--space-4)' }}>
                Mood: {petMood.label}
              </div>
              <button onClick={handleUpgradePet} className="btn-primary">
                <Sparkles size={16} /> Evolve Companion (500)
              </button>
            </div>

            <div className="realm-card">
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)', marginBottom: 'var(--space-4)' }}>Evolution Roadmap</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {['Baby', 'Junior', 'Advanced', 'Master', 'Legend'].map((stage, idx) => {
                  const stages = ['Baby', 'Junior', 'Advanced', 'Master', 'Legend Dragon'];
                  const currentIdx = stages.indexOf(profile.pet?.stage || 'Baby');
                  const isUnlocked = idx <= currentIdx;
                  const isCurrent = stage === profile.pet?.stage || (stage === 'Legend' && profile.pet?.stage === 'Legend Dragon');
                  return (
                    <div key={stage} style={{
                      padding: 'var(--space-3)', borderRadius: 'var(--radius-md)',
                      background: isCurrent ? 'var(--bg-elevated)' : 'transparent',
                      border: `1px solid ${isCurrent ? 'var(--border-subtle)' : 'transparent'}`,
                      display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
                      opacity: isUnlocked ? 1 : 0.4,
                    }}>
                      <div style={{ fontSize: '18px' }}>{['🥚', '🐣', '🐲', '🐉', '⚡🐉'][idx]}</div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-main)' }}>
                          {stage} {isCurrent && <span style={{ fontSize: '10px', color: 'var(--accent-primary)', marginLeft: 'var(--space-2)', background: 'var(--bg-surface)', padding: '2px 6px', borderRadius: '4px' }}>CURRENT</span>}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {idx === 0 ? 'Starting companion' : `Unlocked at ${idx * 500} coins spent`}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── ACHIEVEMENTS TAB ── */}
        {activeSubTab === 'achievements' && (
          <div className="realm-card">
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)', gap: 'var(--space-3)' }}>
              <div>
                <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)' }}>Trophies</h2>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{unlockedCount} of {achievements.length} unlocked</div>
              </div>
              <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', padding: 'var(--space-2) var(--space-3)', borderRadius: 'var(--radius-md)', fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>
                {Math.round((unlockedCount / achievements.length) * 100)}% Complete
              </div>
            </div>
            <AchievementGallery achievements={achievements} />
          </div>
        )}

        {/* ── BRIEFING TAB ── */}
        {activeSubTab === 'briefing' && (
          <div className="realm-card">
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)', gap: 'var(--space-3)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                <Bot size={24} color="var(--text-main)" />
                <div>
                  <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)' }}>AI Briefing</h2>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Personalised daily mission</div>
                </div>
              </div>
              <button onClick={fetchBriefing} className="btn-secondary">
                <RefreshCw size={14} /> Refresh
              </button>
            </div>

            <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: 'var(--space-4)', minHeight: '120px' }}>
              {isLoadingBriefing ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--text-muted)' }}>
                  <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> Generating briefing...
                  <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
                </div>
              ) : (
                <div style={{ fontSize: '14px', color: 'var(--text-main)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                  {briefing}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
