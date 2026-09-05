import React, { useState, useEffect, useMemo } from 'react';
import { useGame } from '../../context/GameContext';
import { api } from '../../services/api';
import type { SkillMasteryResponse, DailyMissionResponse } from '../../services/api';
import { AchievementGallery } from './AchievementGallery';
import { FormattedText } from '../ui/FormattedText';
import type { Achievement } from '../../types/game';
import {
  Layers, Sparkles, Flame, Award,
  ArrowUpCircle, Loader, RefreshCw, Bot,
  Zap, Building, Brain, TrendingUp, Target, CheckCircle2, Circle
} from 'lucide-react';

const HQ_TIERS = [
  { name: 'Room',          buildings: 0, cost: 0,    desc: 'A simple student study desk.' },
  { name: 'Office',        buildings: 1, cost: 1000, desc: 'A comfortable student study room.', unlocks: 'Variables Lab' },
  { name: 'Studio',        buildings: 2, cost: 2000, desc: 'A collaborative code classroom.', unlocks: 'Loop Citadel' },
  { name: 'Developer HQ',  buildings: 3, cost: 3500, desc: 'Your full Coding Matrix HQ.', unlocks: 'List Vault' },
  { name: 'AI Laboratory', buildings: 4, cost: 6000, desc: 'Advanced AI Tutor study hall.', unlocks: 'AI Tutor Room' },
  { name: 'Tech Empire',   buildings: 5, cost: 10000, desc: 'A sprawling Coding Academy.', unlocks: 'Graduation Hall' },
];

const BUILDINGS = [
  { name: 'Variables Lab',      icon: <Zap size={20} />, passive: 50,  desc: 'Study data storage and assignment operators' },
  { name: 'Loop Citadel',       icon: <Brain size={20} />, passive: 80,  desc: 'Master repeating tasks and code block flows' },
  { name: 'List Vault',         icon: <Layers size={20} />, passive: 120, desc: 'Learn simple array and collection structures' },
  { name: 'AI Tutor Room',      icon: <Bot size={20} />, passive: 200, desc: 'Interact with your neural tutoring system' },
  { name: 'Graduation Hall',    icon: <GlobeIcon size={20} />, passive: 300, desc: 'Showcase your solved coding challenges' },
];

function GlobeIcon(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/><path d="M2 12h20"/>
    </svg>
  );
}

export const DeveloperHQ: React.FC = () => {
  const { profile, setProfile, triggerNotification } = useGame() as any;
  const [activeSubTab, setActiveSubTab] = useState<'workspace' | 'pet' | 'achievements' | 'skills' | 'briefing'>('workspace');
  const [briefing, setBriefing] = useState('');
  const [isLoadingBriefing, setIsLoadingBriefing] = useState(false);
  const [mastery, setMastery] = useState<SkillMasteryResponse | null>(null);
  const [isLoadingMastery, setIsLoadingMastery] = useState(false);
  const [dailyMission, setDailyMission] = useState<DailyMissionResponse | null>(null);
  const [isClaimingMission, setIsClaimingMission] = useState(false);
  const [weeklyMission, setWeeklyMission] = useState<DailyMissionResponse | null>(null);
  const [isClaimingWeeklyMission, setIsClaimingWeeklyMission] = useState(false);

  // Server-authoritative achievement list — replaces the old computeAchievements(),
  // which derived a separate 10-achievement set from local profile state with
  // no backend record. That list could show "unlocked" for something the
  // server never actually granted XP/coins for.
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [isLoadingAchievements, setIsLoadingAchievements] = useState(false);

  const fetchAchievements = async () => {
    setIsLoadingAchievements(true);
    try {
      const res = await api.getAchievements();
      if (res?.achievements) {
        setAchievements(res.achievements.map(a => ({
          id: a.id,
          title: a.title,
          description: a.description,
          category: a.category,
          icon: a.icon_name,
          xpReward: a.xp_reward,
          coinReward: a.coin_reward,
          unlocked: a.unlocked,
          progress: a.progress,
          maxProgress: a.target,
        })));
      }
    } finally {
      setIsLoadingAchievements(false);
    }
  };

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

  const handleUpgradeHq = async () => {
    if (!nextTier) { triggerNotification('Max tier reached — Tech Empire!'); return; }
    if (profile.coins < nextTier.cost) {
      triggerNotification(`Not enough coins! Need ${nextTier.cost} 🪙`); return;
    }
    try {
      const res = await api.upgradeHq();
      setProfile((prev: any) => ({
        ...prev,
        coins: res.coins,
        hq: {
          ...prev.hq,
          levelName: res.hq_level,
          unlockedBuildings: res.unlocked_building
            ? [...(prev.hq?.unlockedBuildings || []), res.unlocked_building]
            : prev.hq?.unlockedBuildings || [],
        }
      }));
      triggerNotification(res.message);
    } catch (err: any) {
      triggerNotification(err.message || 'HQ upgrade failed');
    }
  };

  const handleUpgradePet = async () => {
    const stages = ['Baby', 'Junior', 'Advanced', 'Master', 'Legend Dragon'];
    const currentIdx = stages.indexOf(profile.pet?.stage || 'Baby');
    if (currentIdx >= stages.length - 1) { triggerNotification('Your pet reached Legend Dragon — Max!'); return; }
    if (profile.coins < 500) { triggerNotification('Need 500 coins to evolve!'); return; }
    try {
      const res = await api.upgradePet();
      setProfile((prev: any) => ({
        ...prev,
        coins: res.coins,
        pet: { ...prev.pet, stage: res.pet_stage, level: res.pet_level }
      }));
      triggerNotification(res.message);
    } catch (err: any) {
      triggerNotification(err.message || 'Pet evolution failed');
    }
  };

  const handleClaimPassive = async () => {
    if (passiveIncome <= 0) {
      triggerNotification('No passive income yet! Upgrade your HQ to earn daily coins.');
      return;
    }
    try {
      const res = await api.claimPassiveIncome();
      setProfile((prev: any) => ({
        ...prev,
        coins: res.coins
      }));
      triggerNotification(res.message);
    } catch (err: any) {
      triggerNotification(err.message || 'Failed to claim coins');
    }
  };

  const fetchBriefing = async () => {
    setIsLoadingBriefing(true);
    setBriefing('');
    try {
      const prompt = `Give me a personalized daily coding briefing. My stats:
- Level ${profile.level}, ${profile.xp} XP, ${profile.streak}-day streak
- Completed ${profile.completedNodeIds?.length || 0} challenges
- Python: ${profile.skills?.python}, Algorithms: ${profile.skills?.algorithms}, Debugging: ${profile.skills?.debugging}
- Weakest: ${Object.entries(profile.skills || {}).sort(([,a],[,b]) => (a as number)-(b as number))[0]?.[0]}
Give me: 1 motivational opener, 2 specific daily missions targeting my weakest skills, and a tip. Keep it short and exciting.`;

      const data = await api.askAiMentor(prompt, 'Explain', profile.rankRating || 905);
      setBriefing(data?.content || 'The AI Game Master is preparing your briefing...');
    } catch {
      const weakest = Object.entries(profile.skills || {}).sort(([,a],[,b]) => (a as number)-(b as number))[0];
      setBriefing(`Good day, ${profile.username}! Your ${profile.streak}-day streak is legendary. Today, focus on improving ${weakest?.[0] || 'algorithms'} — attempt 3 challenge nodes and aim for all tests passing on first try!`);
    } finally {
      setIsLoadingBriefing(false);
    }
  };

  const fetchMastery = async () => {
    setIsLoadingMastery(true);
    try {
      const data = await api.getSkillMastery();
      setMastery(data);
    } finally {
      setIsLoadingMastery(false);
    }
  };

  useEffect(() => {
    if (activeSubTab === 'briefing' && !briefing) fetchBriefing();
    if (activeSubTab === 'skills' && !mastery) fetchMastery();
    if (activeSubTab === 'achievements' && achievements.length === 0) fetchAchievements();
  }, [activeSubTab]);

  useEffect(() => {
    api.getDailyMission().then(setDailyMission);
    api.getWeeklyMission().then(setWeeklyMission);
  }, []);

  const applyProfileRefresh = async () => {
    // Re-fetch full profile rather than patching xp/coins locally, since a
    // level-up needs the server's recalculated level/nextLevelXp too.
    const profileData = await api.getUserProfile();
    const p = profileData?.profile;
    if (p) {
      setProfile((prev: any) => ({
        ...prev,
        level: p.level,
        xp: p.xp,
        nextLevelXp: p.next_level_xp,
        coins: p.coins,
      }));
    }
  };

  const handleClaimWeeklyMission = async () => {
    setIsClaimingWeeklyMission(true);
    try {
      const res = await api.claimWeeklyMission();
      if (res?.status === 'CLAIMED') {
        triggerNotification(`Weekly mission complete! +${res.xp} XP, +${res.coins} coins`);
        setWeeklyMission(prev => prev ? { ...prev, claimed: true } : prev);
        await applyProfileRefresh();
      } else if (res?.status === 'ALREADY_CLAIMED') {
        setWeeklyMission(prev => prev ? { ...prev, claimed: true } : prev);
      } else {
        triggerNotification('Complete all three tasks before claiming.');
      }
    } finally {
      setIsClaimingWeeklyMission(false);
    }
  };

  const handleClaimMission = async () => {
    setIsClaimingMission(true);
    try {
      const res = await api.claimDailyMission();
      if (res?.status === 'CLAIMED') {
        triggerNotification(`Daily mission complete! +${res.xp} XP, +${res.coins} coins`);
        setDailyMission(prev => prev ? { ...prev, claimed: true } : prev);
        await applyProfileRefresh();
      } else if (res?.status === 'ALREADY_CLAIMED') {
        setDailyMission(prev => prev ? { ...prev, claimed: true } : prev);
      } else {
        triggerNotification('Complete all three tasks before claiming.');
      }
    } finally {
      setIsClaimingMission(false);
    }
  };

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
              <span style={{ color: 'var(--success)', fontWeight: 600 }}>+{passiveIncome} Coins/day</span>
              {passiveIncome > 0 && (
                <button
                  onClick={handleClaimPassive}
                  className="btn-secondary"
                  style={{ padding: '2px 8px', fontSize: '11px', fontWeight: 700, color: 'var(--accent-gold)', borderColor: 'var(--accent-gold)', marginLeft: '4px' }}
                >
                  🪙 Claim
                </button>
              )}
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
        <button onClick={() => setActiveSubTab('skills')} style={tabStyle('skills')}><TrendingUp size={16} /> Skills</button>
        <button onClick={() => setActiveSubTab('briefing')} style={tabStyle('briefing')}><Bot size={16} /> Briefing</button>
      </div>

      <div>
        {/* ── WORKSPACE TAB ── */}
        {activeSubTab === 'workspace' && (
          <div className="grid-responsive">
            {dailyMission && (
              <MissionCard
                title="Today's Mission"
                mission={dailyMission}
                isClaiming={isClaimingMission}
                onClaim={handleClaimMission}
              />
            )}

            {weeklyMission && (
              <MissionCard
                title="This Week's Mission"
                mission={weeklyMission}
                isClaiming={isClaimingWeeklyMission}
                onClaim={handleClaimWeeklyMission}
              />
            )}

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
                {achievements.length > 0 ? Math.round((unlockedCount / achievements.length) * 100) : 0}% Complete
              </div>
            </div>
            {isLoadingAchievements ? (
              <div className="flex-center" style={{ gap: 'var(--space-2)', color: 'var(--text-muted)', padding: 'var(--space-4)' }}>
                <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> Loading trophies...
                <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
              </div>
            ) : (
              <AchievementGallery achievements={achievements} />
            )}
          </div>
        )}

        {/* ── SKILLS TAB ── */}
        {activeSubTab === 'skills' && (
          <div className="realm-card">
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)', gap: 'var(--space-3)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                <TrendingUp size={24} color="var(--text-main)" />
                <div>
                  <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)' }}>Skill Mastery</h2>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Tracked automatically from your graded submissions</div>
                </div>
              </div>
              <button onClick={fetchMastery} className="btn-secondary">
                <RefreshCw size={14} /> Refresh
              </button>
            </div>

            {isLoadingMastery ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--text-muted)', padding: 'var(--space-4)' }}>
                <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> Loading skill breakdown...
                <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
              </div>
            ) : !mastery || (mastery.languages.length === 0 && mastery.topics.length === 0) ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '13px', padding: 'var(--space-4)', textAlign: 'center' }}>
                No graded submissions yet — solve a few challenges and your per-language and per-skill mastery will appear here.
              </div>
            ) : (
              <div className="grid-responsive">
                {mastery.languages.length > 0 && (
                  <div>
                    <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--space-3)' }}>By Language</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                      {mastery.languages.map(entry => (
                        <MasteryBar key={entry.name} entry={entry} />
                      ))}
                    </div>
                  </div>
                )}
                {mastery.topics.length > 0 && (
                  <div>
                    <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--space-3)' }}>By Challenge Type</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                      {mastery.topics.map(entry => (
                        <MasteryBar key={entry.name} entry={entry} />
                      ))}
                    </div>
                    {mastery.weakest_topic && (
                      <div style={{ marginTop: 'var(--space-3)', fontSize: '12px', color: 'var(--text-muted)' }}>
                        Weakest area: <strong style={{ color: 'var(--text-main)' }}>{mastery.weakest_topic}</strong> — worth practicing next.
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
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
                <FormattedText text={briefing} style={{ fontSize: '14px' }} />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const MissionCard: React.FC<{
  title: string;
  mission: DailyMissionResponse;
  isClaiming: boolean;
  onClaim: () => void;
}> = ({ title, mission, isClaiming, onClaim }) => (
  <div className="realm-card">
    <div className="flex-between" style={{ marginBottom: 'var(--space-3)' }}>
      <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
        <Target size={16} /> {title}
      </h3>
      {mission.claimed && (
        <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--success)', textTransform: 'uppercase' }}>Claimed</span>
      )}
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
      {mission.tasks.map(task => (
        <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: '13px' }}>
          {task.completed
            ? <CheckCircle2 size={16} color="var(--success)" />
            : <Circle size={16} color="var(--text-muted)" />}
          <span style={{ color: task.completed ? 'var(--text-main)' : 'var(--text-muted)', flex: 1 }}>{task.label}</span>
          <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>{task.progress}/{task.target}</span>
        </div>
      ))}
    </div>
    <button
      className="btn-primary"
      style={{ width: '100%', justifyContent: 'center' }}
      disabled={!mission.all_completed || mission.claimed || isClaiming}
      onClick={onClaim}
    >
      {mission.claimed
        ? 'Reward Claimed'
        : `Claim +${mission.bonus_xp} XP, +${mission.bonus_coins} Coins`}
    </button>
  </div>
);

const MasteryBar: React.FC<{ entry: { name: string; mastery_percentage: number; skill_rating: number } }> = ({ entry }) => {
  const pct = Math.max(0, Math.min(100, entry.mastery_percentage));
  const color = pct >= 75 ? 'var(--success)' : pct >= 40 ? 'var(--warning)' : 'var(--text-muted)';
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
        <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{entry.name}</span>
        <span style={{ color: 'var(--text-muted)' }}>{Math.round(pct)}% · {entry.skill_rating} rating</span>
      </div>
      <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-full, 999px)', height: '8px', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, transition: 'width 0.4s ease' }} />
      </div>
    </div>
  );
};
