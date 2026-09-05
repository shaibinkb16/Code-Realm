import React from 'react';
import { useGame } from '../../context/GameContext';
import { Trophy, Crown, Swords, Construction } from 'lucide-react';

export const Championship: React.FC = () => {
  const { setActiveTab, triggerNotification } = useGame();

  // This screen previously showed a fully fabricated bracket — fictional
  // opponent names, a fake "LIVE" timer, invented match scores — with no
  // backend behind any of it. A tournament system that real is a genuine
  // build (matchmaking, scheduling, a bracket persisted server-side), not
  // something to fake in the meantime. Until that exists, be honest about
  // it instead: no fabricated matches, but still point at the real
  // competitive feature that exists today (Code Duels).
  return (
    <div className="container" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      <div className="realm-card" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-4)', border: '1px solid var(--accent-primary)' }}>
        <div>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)',
            background: 'var(--bg-elevated)', color: 'var(--accent-primary)',
            fontSize: '11px', fontWeight: 700, padding: 'var(--space-1) var(--space-3)',
            borderRadius: 'var(--radius-full)', marginBottom: 'var(--space-2)', border: '1px solid var(--accent-primary)'
          }}>
            <Crown size={14} /> Championship
          </div>
          <h1 style={{ fontSize: '24px', color: 'var(--text-main)', fontWeight: 700 }}>Seasonal Tournament</h1>
          <div style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: 'var(--space-1)' }}>
            Real bracketed tournaments are in development.
          </div>
        </div>
      </div>

      <div className="realm-card" style={{ padding: 'var(--space-8)', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-4)' }}>
        <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: '50%', width: '64px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Construction size={28} color="var(--text-muted)" />
        </div>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-main)', marginBottom: 'var(--space-2)' }}>
            Championship mode is still being built
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', maxWidth: '440px', lineHeight: 1.6 }}>
            We want tournament brackets, matchmaking, and prizes to be real when they ship —
            not placeholder matches. In the meantime, Code Duels is the real competitive mode
            available today.
          </p>
        </div>
        <button
          onClick={() => {
            triggerNotification('⚔️ Entering the Duel Arena!');
            setActiveTab('duel');
          }}
          className="btn-primary"
          style={{ marginTop: 'var(--space-2)' }}
        >
          <Swords size={16} /> Go to Code Duels
        </button>
      </div>

      <div className="realm-card" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', color: 'var(--text-muted)', fontSize: '13px' }}>
        <Trophy size={18} />
        <span>Want to see who's actually winning right now? Check the <button onClick={() => setActiveTab('leaderboards')} style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', fontWeight: 600, padding: 0, font: 'inherit' }}>global leaderboard</button> — that one's real.</span>
      </div>
    </div>
  );
};
