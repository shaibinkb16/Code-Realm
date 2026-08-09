import React from 'react';
import { Trophy, Crown, Timer, Swords } from 'lucide-react';

export const Championship: React.FC = () => {

  const bracketData = {
    qualifiers: [
      { p1: 'AetherCoder', p2: 'CodeRider', winner: 'AetherCoder', score: '3-1' },
      { p1: 'ByteNinja', p2: 'AlgoMaster', winner: 'ByteNinja', score: '3-0' },
      { p1: 'SyntaxQueen', p2: 'PyHero', winner: 'SyntaxQueen', score: '3-2' },
      { p1: 'CipherLord', p2: 'LogicKnight', winner: 'CipherLord', score: '3-0' }
    ],
    semifinals: [
      { p1: 'AetherCoder (You)', p2: 'ByteNinja', winner: 'AetherCoder', score: '3-2' },
      { p1: 'SyntaxQueen', p2: 'CipherLord', winner: 'CipherLord', score: '3-1' }
    ],
    finals: [
      { p1: 'AetherCoder (You)', p2: 'CipherLord', timeRemaining: '04:12 Live', status: 'IN PROGRESS' }
    ]
  };

  return (
    <div className="container" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      {/* Header Banner */}
      <div className="realm-card" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-4)', border: '1px solid var(--accent-primary)' }}>
        <div>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)',
            background: 'var(--bg-elevated)', color: 'var(--accent-primary)',
            fontSize: '11px', fontWeight: 700, padding: 'var(--space-1) var(--space-3)',
            borderRadius: 'var(--radius-full)', marginBottom: 'var(--space-2)', border: '1px solid var(--accent-primary)'
          }}>
            <Crown size={14} /> Season 01 Championship
          </div>
          <h1 style={{ fontSize: '24px', color: 'var(--text-main)', fontWeight: 700 }}>The Python Age Tournament</h1>
          <div style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: 'var(--space-1)' }}>
            Prize Pool: 50,000 Coins + Season 01 Legend Badge & Title
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Grand Finals Match</div>
          <div style={{
            fontSize: '24px', fontWeight: 700, color: 'var(--accent-primary)',
            fontFamily: 'var(--font-mono)', marginTop: 'var(--space-1)',
            display: 'flex', alignItems: 'center', gap: 'var(--space-2)'
          }}>
            <Timer size={20} /> 04:12 LIVE
          </div>
        </div>
      </div>

      {/* Bracket Tree Visualizer */}
      <div className="realm-card" style={{ padding: 'var(--space-6)', overflowX: 'auto' }}>
        <h3 style={{ fontSize: '16px', color: 'var(--text-main)', marginBottom: 'var(--space-6)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontWeight: 700 }}>
          <Trophy size={18} color="var(--accent-primary)" /> Tournament Bracket
        </h3>

        <div style={{ display: 'flex', gap: 'var(--space-8)', minWidth: '800px' }}>
          {/* Round 1: Qualifiers */}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 'var(--space-4)' }}>
              Round 1 (Qualifiers)
            </div>
            {bracketData.qualifiers.map((match, i) => (
              <div key={i} style={{
                background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)', padding: 'var(--space-3)', marginBottom: 'var(--space-3)', fontSize: '13px'
              }}>
                <div className="flex-between" style={{ fontWeight: match.winner === match.p1 ? 700 : 500, color: match.winner === match.p1 ? 'var(--text-main)' : 'var(--text-muted)' }}>
                  <span>{match.p1}</span>
                  <span>{match.score.split('-')[0]}</span>
                </div>
                <div style={{ height: '1px', background: 'var(--border-subtle)', margin: 'var(--space-2) 0' }} />
                <div className="flex-between" style={{ fontWeight: match.winner === match.p2 ? 700 : 500, color: match.winner === match.p2 ? 'var(--text-main)' : 'var(--text-muted)' }}>
                  <span>{match.p2}</span>
                  <span>{match.score.split('-')[1]}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Round 2: Semifinals */}
          <div style={{ flex: 1, marginTop: 'var(--space-6)' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 'var(--space-4)' }}>
              Semifinals
            </div>
            {bracketData.semifinals.map((match, i) => (
              <div key={i} style={{
                background: 'var(--bg-elevated)', border: '1px solid var(--border-bright)',
                borderRadius: 'var(--radius-md)', padding: 'var(--space-4)', marginBottom: 'var(--space-5)', fontSize: '13px'
              }}>
                <div className="flex-between" style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                  <span>{match.p1}</span>
                  <span>{match.score.split('-')[0]}</span>
                </div>
                <div style={{ height: '1px', background: 'var(--border-subtle)', margin: 'var(--space-2) 0' }} />
                <div className="flex-between" style={{ color: 'var(--text-muted)' }}>
                  <span>{match.p2}</span>
                  <span>{match.score.split('-')[1]}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Grand Finals */}
          <div style={{ flex: 1, marginTop: 'calc(var(--space-8) + var(--space-4))' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent-primary)', textTransform: 'uppercase', marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
              🔥 Grand Finals (Live)
            </div>
            <div className="realm-card" style={{ padding: 'var(--space-4)', border: '1px solid var(--accent-primary)', background: 'var(--bg-elevated)' }}>
              <div className="flex-between" style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '14px' }}>
                <span>{bracketData.finals[0].p1}</span>
                <span style={{ color: 'var(--accent-primary)' }}>2</span>
              </div>
              <div style={{ height: '1px', background: 'var(--border-bright)', margin: 'var(--space-2) 0' }} />
              <div className="flex-between" style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '14px' }}>
                <span>{bracketData.finals[0].p2}</span>
                <span>2</span>
              </div>

              <button className="btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 'var(--space-4)' }}>
                <Swords size={16} /> Enter Match
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
