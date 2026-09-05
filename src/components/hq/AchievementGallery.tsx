import React from 'react';
import type { Achievement } from '../../types/game';
import {
  Award, Zap, Brain, Bug, Flame, Building2, HelpCircle, Lock,
  Sword, BookOpen, Compass, Shield, Star, Trophy, Crown,
} from 'lucide-react';

interface Props {
  achievements: Achievement[];
}

export const AchievementGallery: React.FC<Props> = ({ achievements }) => {
  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Award': return <Award size={24} />;
      case 'Zap': return <Zap size={24} />;
      case 'Brain': return <Brain size={24} />;
      case 'Bug': return <Bug size={24} />;
      case 'Flame': return <Flame size={24} />;
      case 'Building2': return <Building2 size={24} />;
      case 'HelpCircle': return <HelpCircle size={24} />;
      case 'Sword': return <Sword size={24} />;
      case 'BookOpen': return <BookOpen size={24} />;
      case 'Compass': return <Compass size={24} />;
      case 'Shield': return <Shield size={24} />;
      case 'Star': return <Star size={24} />;
      case 'Trophy': return <Trophy size={24} />;
      case 'Crown': return <Crown size={24} />;
      default: return <Award size={24} />;
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px' }}>
      {achievements.map((ach) => (
        <div
          key={ach.id}
          className={ach.unlocked ? 'realm-card-gold' : 'realm-card'}
          style={{
            padding: '20px',
            borderRadius: '12px',
            opacity: ach.unlocked ? 1 : 0.6,
            border: '1px solid',
            borderColor: ach.unlocked ? 'var(--border-bright)' : 'var(--border-dark)',
            position: 'relative'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
            <div style={{
              background: ach.unlocked ? 'rgba(217, 160, 54, 0.2)' : 'var(--bg-dark)',
              color: ach.unlocked ? 'var(--accent-gold)' : 'var(--text-dim)',
              padding: '10px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {ach.unlocked ? getIcon(ach.icon) : <Lock size={24} />}
            </div>

            <div>
              <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--accent-orange)' }}>
                {ach.category.toUpperCase()}
              </div>
              <h4 style={{ fontSize: '15px', color: 'var(--text-main)' }}>{ach.title}</h4>
            </div>
          </div>

          <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.4, marginBottom: '12px' }}>
            {ach.description}
          </p>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 700 }}>
            <span style={{ color: 'var(--accent-gold)' }}>+{ach.xpReward} XP</span>
            <span style={{ color: '#F6AD55' }}>+{ach.coinReward} 🪙</span>
          </div>
        </div>
      ))}
    </div>
  );
};
