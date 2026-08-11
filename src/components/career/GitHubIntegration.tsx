import React from 'react';
import { useGame } from '../../context/GameContext';
import { GitBranch, Sparkles, CheckCircle2, GitPullRequest } from 'lucide-react';

export const GitHubIntegration: React.FC = () => {
  const { profile } = useGame();
  const stats = [
    { name: 'Basic Syntax & Variables', score: 92, color: '#38A169' },
    { name: 'Control Flow & Loops', score: 85, color: '#D9A036' },
    { name: 'Lists & Data Structures', score: 74, color: '#E6672B' },
    { name: 'Functions & Modules', score: 68, color: '#3182CE' },
    { name: 'Code Formatting & Comments', score: 88, color: '#805AD5' }
  ];

  return (
    <div className="realm-card-gold" style={{ padding: '28px', borderRadius: '16px', marginTop: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: 'var(--bg-surface)', padding: '10px', borderRadius: '10px', border: '1px solid var(--border-bright)' }}>
            <GitBranch size={24} color="var(--text-main)" />
          </div>
          <div>
            <h3 style={{ fontSize: '20px', color: 'var(--text-main)' }}>STUDENT LAB AUDIT</h3>
            <div style={{ fontSize: '12px', color: 'var(--accent-gold)', fontWeight: 600 }}>
              AI analysis of your coding syntax & fundamentals
            </div>
          </div>
        </div>

        <div style={{
          background: 'rgba(56, 161, 105, 0.2)',
          color: '#68D391',
          padding: '6px 14px',
          borderRadius: '20px',
          fontSize: '12px',
          fontWeight: 800,
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          <CheckCircle2 size={16} /> REPO CONNECTED (@{profile.username})
        </div>
      </div>

      <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '20px' }}>
        AI continuously parses your submitted assignments and school code repositories, evaluates your syntax usage, logic structures, and generates your beginner coding score matrix.
      </p>

      {/* Developer Profile Matrix Bars */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
        {stats.map((s) => (
          <div key={s.name} style={{ background: 'var(--bg-elevated)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-dark)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
              <span style={{ color: 'var(--text-main)' }}>{s.name}</span>
              <span style={{ color: s.color }}>{s.score} / 100</span>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.5)', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ background: s.color, height: '100%', width: `${s.score}%`, borderRadius: '4px' }} />
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '12px' }}>
        <button className="btn-secondary" style={{ flex: 1, justifyContent: 'center' }}>
          <GitPullRequest size={16} /> RE-AUDIT REPOSITORIES
        </button>
        <button className="btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
          <Sparkles size={16} /> GENERATE PORTFOLIO PROFILE
        </button>
      </div>
    </div>
  );
};
