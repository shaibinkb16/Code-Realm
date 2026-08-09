import React from 'react';
import { useGame } from '../../context/GameContext';
import type { ActiveTab } from '../../types/game';
import { 
  GiScrollUnfurled as Globe, 
  GiCrossedSwords as Swords, 
  GiTrophyCup as Trophy, 
  GiSchoolBag as Briefcase, 
  GiCharacter as User, 
  GiDragonHead as Flame, 
  GiStarMedal as Star, 
  GiCoins as Coins, 
  GiRobotGolem as Bot, 
  GiAnvil as Code2,
  GiSparkles as Sparkles,
  GiShield as Shield,
  GiStack as Layers
} from 'react-icons/gi';

export const Navbar: React.FC = () => {
  const { profile, activeTab, setActiveTab, setIsAiModalOpen } = useGame();

  const xpPercent = Math.min(100, Math.round((profile.xp / profile.nextLevelXp) * 100));

  const navItems: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
    { id: 'world', label: 'WORLD', icon: <Globe size={18} /> },
    { id: 'challenge', label: 'CHALLENGES', icon: <Code2 size={18} /> },
    { id: 'duel', label: 'ARENA', icon: <Swords size={18} /> },
    { id: 'hq', label: 'HQ & PET', icon: <Layers size={18} /> },
    { id: 'leaderboards', label: 'RANKINGS', icon: <Trophy size={18} /> },
    { id: 'career', label: 'CAREER', icon: <Briefcase size={18} /> },
    { id: 'profile', label: 'PROFILE', icon: <User size={18} /> }
  ];

  return (
    <header style={{
      background: 'var(--bg-surface)',
      borderBottom: '1px solid var(--border-subtle)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      padding: '0 24px',
      height: '68px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      boxShadow: 'var(--shadow-game)'
    }}>
      {/* Left: Brand Logo & Tagline */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div 
          onClick={() => setActiveTab('world')}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '10px', 
            cursor: 'pointer' 
          }}
        >
          <div style={{
            background: 'linear-gradient(135deg, var(--accent-gold) 0%, var(--accent-orange) 100%)',
            padding: '8px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--bg-dark)',
            boxShadow: 'var(--shadow-gold)'
          }}>
            <Sparkles size={22} strokeWidth={2.5} />
          </div>
          <div>
            <div style={{ 
              fontFamily: 'var(--font-display)', 
              fontWeight: 800, 
              fontSize: '20px', 
              letterSpacing: '0.05em',
              color: 'var(--text-main)',
              lineHeight: 1.1
            }}>
              CODE REALM
            </div>
            <div style={{ 
              fontSize: '10px', 
              fontWeight: 600, 
              color: 'var(--accent-gold)', 
              letterSpacing: '0.1em' 
            }}>
              PLAY. CODE. COMPETE. EVOLVE.
            </div>
          </div>
        </div>
      </div>

      {/* Center Nav Tabs */}
      <nav style={{ display: 'flex', gap: '4px' }}>
        {navItems.map(item => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              style={{
                background: isActive ? 'var(--bg-elevated)' : 'transparent',
                border: '1px solid',
                borderColor: isActive ? 'var(--border-bright)' : 'transparent',
                color: isActive ? 'var(--accent-gold)' : 'var(--text-muted)',
                padding: '8px 14px',
                borderRadius: '8px',
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
                transition: 'all 0.15s ease'
              }}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Right HUD Stats & Profile */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Level & XP bar */}
        <div style={{
          background: 'var(--bg-elevated)',
          padding: '6px 12px',
          borderRadius: '8px',
          border: '1px solid var(--border-dark)',
          display: 'flex',
          flexDirection: 'column',
          minWidth: '130px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 700 }}>
            <span style={{ color: 'var(--accent-gold)' }}>LVL {profile.level}</span>
            <span style={{ color: 'var(--text-muted)' }}>{profile.xp}/{profile.nextLevelXp} XP</span>
          </div>
          <div style={{
            background: 'rgba(0,0,0,0.4)',
            height: '6px',
            borderRadius: '3px',
            marginTop: '4px',
            overflow: 'hidden'
          }}>
            <div style={{
              background: 'linear-gradient(90deg, var(--accent-gold) 0%, var(--accent-orange) 100%)',
              height: '100%',
              width: `${xpPercent}%`,
              borderRadius: '3px',
              transition: 'width 0.3s ease'
            }} />
          </div>
        </div>

        {/* Currency Counters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--accent-gold)', fontWeight: 700, fontSize: '14px' }}>
            <Star size={16} fill="var(--accent-gold)" color="var(--accent-gold)" />
            <span>{profile.stars}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#F6AD55', fontWeight: 700, fontSize: '14px' }}>
            <Coins size={16} />
            <span>{profile.coins.toLocaleString()}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--accent-orange)', fontWeight: 700, fontSize: '14px' }}>
            <Flame size={16} fill="var(--accent-orange)" />
            <span>{profile.streak}d</span>
          </div>
        </div>

        {/* Rank Badge */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(217, 160, 54, 0.15) 0%, rgba(26, 24, 22, 0.9) 100%)',
          border: '1px solid var(--border-bright)',
          padding: '6px 12px',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          color: 'var(--accent-gold)',
          fontWeight: 700,
          fontSize: '12px'
        }}>
          <Shield size={14} />
          <span>{profile.rank.toUpperCase()} III</span>
        </div>

        {/* Persistent AI Mentor Button */}
        <button
          onClick={() => setIsAiModalOpen(true)}
          style={{
            background: 'linear-gradient(135deg, var(--accent-teal-bright) 0%, var(--accent-teal) 100%)',
            color: '#FFF',
            border: '1px solid rgba(255,255,255,0.2)',
            padding: '8px 14px',
            borderRadius: '8px',
            fontWeight: 700,
            fontSize: '13px',
            fontFamily: 'var(--font-display)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 0 12px rgba(61, 110, 101, 0.5)',
            transition: 'all 0.18s ease'
          }}
        >
          <Bot size={18} />
          <span>AI TUTOR</span>
        </button>
      </div>
    </header>
  );
};
