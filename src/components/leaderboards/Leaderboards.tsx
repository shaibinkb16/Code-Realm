import React, { useState, useEffect } from 'react';
import { useGame } from '../../context/GameContext';
import { API_BASE_URL } from '../../services/api';
import { Globe, Users, Crown, Trophy, Medal, ListOrdered, Loader } from 'lucide-react';
import type { LeaderboardEntry } from '../../types/game';

const API_BASE = API_BASE_URL;

export const Leaderboards: React.FC = () => {
  const { profile } = useGame();
  const [activeFilter, setActiveFilter] = useState<'global' | 'country' | 'guild' | 'weekly'>('global');
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setIsLoading(true);
      try {
        const resp = await fetch(`${API_BASE}/leaderboards/global`);
        if (!resp.ok) throw new Error('Server error');
        const data: any[] = await resp.json();

        const entries: LeaderboardEntry[] = data.map((p, i) => ({
          rank: i + 1,
          username: p.username,
          avatar: p.avatar || `/avatars/${['cipherlord', 'syntaxqueen', 'byteninja', 'aethercoder', 'pythoneerx'][i % 5]}.svg`,
          rating: p.rating,
          xp: p.xp,
          wins: p.wins || 0,
          streak: p.streak || 0,
          league: p.league || 'Unranked',
          isCurrentUser: p.username === profile.username,
        }));

        if (entries.length === 0) {
          setLeaderboardData([{
            rank: 1,
            username: `${profile.username} (You)`,
            avatar: profile.avatar || '/avatars/aethercoder.svg',
            rating: profile.rankRating,
            xp: profile.xp,
            wins: 0,
            streak: profile.streak,
            league: profile.rank,
            isCurrentUser: true,
          }]);
        } else {
          const hasCurrentUser = entries.some(e => e.username === profile.username);
          if (!hasCurrentUser) {
            entries.push({
              rank: entries.length + 1,
              username: `${profile.username} (You)`,
              avatar: profile.avatar || '/avatars/aethercoder.svg',
              rating: profile.rankRating,
              xp: profile.xp,
              wins: 0,
              streak: profile.streak,
              league: profile.rank,
              isCurrentUser: true,
            });
          }
          setLeaderboardData(entries);
        }
      } catch (err) {
        setLeaderboardData([{
          rank: 1,
          username: `${profile.username} (You)`,
          avatar: profile.avatar || '/avatars/aethercoder.svg',
          rating: profile.rankRating,
          xp: profile.xp,
          wins: 0,
          streak: profile.streak,
          league: profile.rank,
          isCurrentUser: true,
        }]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchLeaderboard();
  }, [activeFilter]);

  const filters = [
    { id: 'global' as const, label: 'Global', icon: Globe },
    { id: 'country' as const, label: 'Country', icon: Users },
    { id: 'guild' as const, label: 'Guild', icon: Crown },
    { id: 'weekly' as const, label: 'Weekly', icon: Trophy },
  ];

  const top3 = leaderboardData.slice(0, 3);

  return (
    <div className="container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 'var(--space-6)' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--text-main)', marginBottom: 'var(--space-1)' }}>
          Leaderboards
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Live rankings from the database</p>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: 'var(--space-2)', background: 'var(--bg-surface)', padding: 'var(--space-2)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', marginBottom: 'var(--space-6)', overflowX: 'auto', maxWidth: '100%' }}>
        {filters.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveFilter(id)}
            style={{
              background: activeFilter === id ? 'var(--bg-elevated)' : 'transparent',
              border: `1px solid ${activeFilter === id ? 'var(--border-bright)' : 'transparent'}`,
              color: activeFilter === id ? 'var(--text-main)' : 'var(--text-muted)',
              padding: '6px 14px', borderRadius: 'var(--radius-md)', fontWeight: 600,
              fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
              transition: 'all 0.15s ease', whiteSpace: 'nowrap'
            }}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex-center" style={{ flexDirection: 'column', gap: 'var(--space-3)', marginTop: 'var(--space-8)' }}>
          <Loader size={32} color="var(--text-muted)" style={{ animation: 'spin 1s linear infinite' }} />
          <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Loading live rankings...</span>
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : (
        <div style={{ width: '100%', maxWidth: '800px', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          
          {/* Top 3 Podium */}
          {top3.length >= 3 && (
            <div className="grid-responsive">
              {/* Rank 2 */}
              <div className="realm-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 'var(--space-4)' }}>
                <Medal size={24} color="var(--text-muted)" style={{ marginBottom: 'var(--space-2)' }} />
                <img src={top3[1]?.avatar} alt="" style={{ width: '56px', height: '56px', borderRadius: '50%', objectFit: 'cover', marginBottom: 'var(--space-2)' }} />
                <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text-main)' }}>{top3[1]?.username}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: 600 }}>{top3[1]?.rating} ELO</div>
              </div>

              {/* Rank 1 */}
              <div className="realm-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 'var(--space-4)', border: '1px solid var(--border-bright)', background: 'var(--bg-elevated)' }}>
                <Trophy size={28} color="var(--accent-primary)" style={{ marginBottom: 'var(--space-2)' }} />
                <img src={top3[0]?.avatar} alt="" style={{ width: '72px', height: '72px', borderRadius: '50%', border: '2px solid var(--border-bright)', objectFit: 'cover', marginBottom: 'var(--space-2)' }} />
                <div style={{ fontWeight: 700, fontSize: '16px', color: 'var(--text-main)' }}>{top3[0]?.username}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '14px', fontWeight: 600 }}>{top3[0]?.rating} ELO</div>
              </div>

              {/* Rank 3 */}
              <div className="realm-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 'var(--space-4)' }}>
                <ListOrdered size={24} color="var(--text-dim)" style={{ marginBottom: 'var(--space-2)' }} />
                <img src={top3[2]?.avatar} alt="" style={{ width: '56px', height: '56px', borderRadius: '50%', objectFit: 'cover', marginBottom: 'var(--space-2)' }} />
                <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text-main)' }}>{top3[2]?.username}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: 600 }}>{top3[2]?.rating} ELO</div>
              </div>
            </div>
          )}

          {/* Full Table */}
          <div className="realm-card" style={{ padding: 0, overflow: 'hidden' }}>
            {leaderboardData.map((player, idx) => (
              <div
                key={player.rank}
                style={{
                  padding: 'var(--space-3) var(--space-4)',
                  borderBottom: idx < leaderboardData.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: player.isCurrentUser ? 'var(--bg-elevated)' : 'transparent',
                  borderLeft: player.isCurrentUser ? '3px solid var(--accent-primary)' : '3px solid transparent',
                  flexWrap: 'wrap',
                  gap: 'var(--space-3)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '14px', color: player.rank <= 3 ? 'var(--text-main)' : 'var(--text-muted)', width: '28px' }}>
                    #{player.rank}
                  </div>
                  <img src={player.avatar} alt="" style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-main)' }}>
                      {player.username} {player.isCurrentUser && <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '4px' }}>(You)</span>}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{player.league} • {player.streak}d streak</div>
                  </div>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                  <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '14px' }}>{player.rating} ELO</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{player.wins} Wins</span>
                  </div>
                  <div style={{ background: 'var(--bg-surface)', padding: '4px 8px', borderRadius: 'var(--radius-sm)', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', border: '1px solid var(--border-subtle)' }}>
                    {player.xp.toLocaleString()} XP
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
