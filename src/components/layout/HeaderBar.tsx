import React from 'react';
import { useGame } from '../../context/GameContext';
import { Sun, Moon, Brain, Menu } from 'lucide-react';

interface HeaderBarProps {
  onOpenAssessment: () => void;
  onToggleMenu: () => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({ onOpenAssessment, onToggleMenu }) => {
  const { activeTab, theme, toggleTheme } = useGame();

  const getTitleInfo = () => {
    switch (activeTab) {
      case 'world':
        return { title: 'World Map', subtitle: 'Explore 8 RPG realms' };
      case 'challenge':
        return { title: 'Code Workstation', subtitle: 'Solve challenges & run isolated tests' };
      case 'boss':
        return { title: 'Boss Battle', subtitle: 'Multi-phase combat' };
      case 'duel':
        return { title: 'Code Duels', subtitle: 'Real-time battles' };
      case 'leaderboards':
        return { title: 'Leaderboards', subtitle: 'Global & guild divisions' };
      case 'championship':
        return { title: 'Championship', subtitle: 'Season 01 tournament' };
      case 'hq':
        return { title: 'Study Labs', subtitle: 'Manage companion & study room upgrades' };
      case 'career':
        return { title: 'Class Board', subtitle: 'Homework assignment board & tutoring exams' };
      case 'profile':
        return { title: 'Report Card', subtitle: 'Your fundamental programming skill breakdown' };
      case 'admin':
        return { title: 'Admin Console', subtitle: 'System metrics, user management & moderation' };
      default:
        return { title: 'Code Realm', subtitle: 'Adaptive Matrix' };
    }
  };

  const info = getTitleInfo();

  return (
    <header className="header-bar">
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <button className="mobile-menu-btn" onClick={onToggleMenu}>
          <Menu size={20} />
        </button>
        <div>
          <h2 style={{
            fontSize: '15px',
            fontWeight: 600,
            fontFamily: 'var(--font-display)',
            color: 'var(--text-main)',
            lineHeight: 1.2
          }}>
            {info.title}
          </h2>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            {info.subtitle}
          </p>
        </div>
      </div>

      <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
        <button
          onClick={toggleTheme}
          className="btn-secondary"
          title="Toggle Theme"
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        <button
          onClick={onOpenAssessment}
          className="btn-secondary"
        >
          <Brain size={16} />
          <span>Adaptive Roadmap</span>
        </button>
      </div>
    </header>
  );
};
