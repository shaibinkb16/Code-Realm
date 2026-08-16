import React from 'react';
import { useGame } from '../../context/GameContext';
import { useAuth } from '../../context/AuthContext';
import type { ActiveTab } from '../../types/game';
import {
  Globe,
  TerminalSquare,
  Swords,
  Trophy,
  Building,
  Star,
  Coins,
  Bot,
  Award,
  ChevronRight,
  Flame,
  LogOut,
  ShieldAlert
} from 'lucide-react';

interface SidebarProps {
  onOpenAiModal: () => void;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onOpenAiModal, isOpen, onClose }) => {
  const { profile, activeTab, setActiveTab } = useGame();
  const { user, logout } = useAuth();

  const navGroups = [
    {
      title: 'Journey',
      items: [
        { id: 'world' as ActiveTab, label: 'World Map', icon: Globe, badge: 'MAIN' },
        { id: 'challenge' as ActiveTab, label: 'Workstation', icon: TerminalSquare },
        { id: 'boss' as ActiveTab, label: 'Boss Battle', icon: Flame, badge: 'BOSS' },
        { id: 'duel' as ActiveTab, label: 'Code Duels', icon: Swords, badge: 'PVP' }
      ]
    },
    {
      title: 'Competition',
      items: [
        { id: 'leaderboards' as ActiveTab, label: 'Leaderboards', icon: Trophy },
        { id: 'championship' as ActiveTab, label: 'Championship', icon: Award, badge: 'S01' }
      ]
    },
    {
      title: 'Hub',
      items: [
        { id: 'hq' as ActiveTab, label: 'Study Labs', icon: Building }
      ]
    },
    ...((user?.role === 'admin' || user?.role === 'super_admin') ? [
      {
        title: 'Management',
        items: [
          { id: 'admin' as ActiveTab, label: 'Admin Console', icon: ShieldAlert, badge: 'ADM' }
        ]
      }
    ] : [])
  ];

  const handleNavClick = (id: ActiveTab) => {
    setActiveTab(id);
    if (window.innerWidth <= 1024) {
      onClose();
    }
  };

  const xpPercent = Math.min(100, Math.round((profile.xp / profile.nextLevelXp) * 100));

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      {/* Brand Header */}
      <div style={{
        padding: 'var(--space-4)',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-3)'
      }}>
        <img
          src="/logo.jpg"
          alt="CODE REALM"
          style={{
            width: '36px',
            height: '36px',
            borderRadius: 'var(--radius-md)',
            objectFit: 'cover',
            border: '1px solid var(--border-bright)'
          }}
        />
        <div>
          <h1 style={{
            fontSize: '15px',
            fontWeight: 700,
            color: 'var(--text-main)',
            letterSpacing: '-0.01em',
            lineHeight: 1.2
          }}>
            CODE REALM
          </h1>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Adaptive Matrix
          </div>
        </div>
      </div>

      {/* Player Mini Profile */}
      <div style={{
        padding: 'var(--space-4)',
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-subtle)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
          <img
            src={profile.avatar}
            alt={profile.username}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-bright)',
              objectFit: 'cover'
            }}
          />
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {profile.fullName || profile.username}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>Lvl {profile.level}</span>
              <span style={{ opacity: 0.5 }}>•</span>
              <span>{profile.rank}</span>
            </div>
          </div>
        </div>

        {/* XP Bar */}
        <div style={{ background: 'var(--bg-elevated)', height: '4px', borderRadius: '2px', overflow: 'hidden' }}>
          <div style={{
            background: 'var(--text-main)',
            height: '100%',
            width: `${xpPercent}%`,
            transition: 'width 0.3s ease'
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-dim)', marginTop: '6px', fontWeight: 500, fontFamily: 'var(--font-mono)' }}>
          <span>{profile.xp.toLocaleString()} XP</span>
          <span>{profile.nextLevelXp.toLocaleString()} XP</span>
        </div>
      </div>

      {/* Navigation Groups */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-4) var(--space-3)' }}>
        {navGroups.map((group, idx) => (
          <div key={idx} style={{ marginBottom: 'var(--space-5)' }}>
            <div style={{
              fontSize: '11px',
              fontWeight: 600,
              color: 'var(--text-dim)',
              padding: '0 var(--space-2) var(--space-2)',
              textTransform: 'uppercase',
              letterSpacing: '0.02em'
            }}>
              {group.title}
            </div>

            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px var(--space-2)',
                    borderRadius: 'var(--radius-md)',
                    marginBottom: '2px',
                    background: isActive ? 'var(--bg-elevated)' : 'transparent',
                    border: 'none',
                    color: isActive ? 'var(--text-main)' : 'var(--text-muted)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    fontWeight: isActive ? 600 : 500,
                    fontSize: '13px',
                    fontFamily: 'var(--font-body)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                    <Icon size={16} color={isActive ? 'var(--text-main)' : 'var(--text-dim)'} />
                    <span>{item.label}</span>
                  </div>

                  {item.badge ? (
                    <span style={{
                      fontSize: '10px',
                      fontWeight: 600,
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: isActive ? 'var(--text-main)' : 'var(--bg-elevated)',
                      color: isActive ? 'var(--bg-dark)' : 'var(--text-muted)'
                    }}>
                      {item.badge}
                    </span>
                  ) : (
                    isActive && <ChevronRight size={14} color="var(--text-main)" />
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Currency & Streak HUD */}
      <div style={{
        padding: 'var(--space-4)',
        background: 'var(--bg-surface)',
        borderTop: '1px solid var(--border-subtle)'
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
          <div style={{ background: 'var(--bg-elevated)', padding: 'var(--space-2)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-main)', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
              <Star size={12} /> {profile.stars}
            </div>
          </div>
          <div style={{ background: 'var(--bg-elevated)', padding: 'var(--space-2)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-main)', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
              <Coins size={12} /> {profile.coins > 999 ? '999+' : profile.coins}
            </div>
          </div>
          <div style={{ background: 'var(--bg-elevated)', padding: 'var(--space-2)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-main)', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
              <Flame size={12} /> {profile.streak}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <button
            onClick={onOpenAiModal}
            className="btn-secondary"
            style={{ flex: 1, justifyContent: 'center' }}
          >
            <Bot size={16} /> AI Mentor
          </button>
          <button
            onClick={logout}
            className="btn-secondary"
            style={{ color: 'var(--error)', borderColor: 'rgba(239, 68, 68, 0.3)' }}
            title="Sign Out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
};
