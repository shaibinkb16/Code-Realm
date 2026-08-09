import React, { useState, useEffect } from 'react';
import { useGame } from '../../context/GameContext';
import { Loader } from 'lucide-react';

const API_BASE = 'http://localhost:8000/api/v1';

export const PlayerProfileView: React.FC = () => {
  const { profile } = useGame();
  const [globalRank, setGlobalRank] = useState<number | null>(null);
  const [aiRecommendation, setAiRecommendation] = useState<string>('');
  const [isLoadingRec, setIsLoadingRec] = useState(false);

  useEffect(() => {
    const fetchRank = async () => {
      try {
        const resp = await fetch(`${API_BASE}/leaderboards/global`);
        if (!resp.ok) throw new Error();
        const data: any[] = await resp.json();
        const myIdx = data.findIndex((p: any) => p.username === profile.username);
        if (myIdx >= 0) setGlobalRank(myIdx + 1);
        else setGlobalRank(data.length + 1);
      } catch {
        setGlobalRank(null);
      }
    };
    fetchRank();
  }, [profile.username]);

  useEffect(() => {
    const fetchRec = async () => {
      setIsLoadingRec(true);
      try {
        const resp = await fetch(`${API_BASE}/career/recommend`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ skill_ratings: profile.skills, rank_rating: profile.rankRating }),
        });
        const data = await resp.json();
        const topPath = data.paths?.[0];
        if (topPath?.aiReason) {
          setAiRecommendation(`Your top career match is ${topPath.name} (${topPath.matchScore}% match). ${topPath.aiReason}`);
        }
      } catch {
        const weakest = Object.entries(profile.skills).sort(([, a], [, b]) => (a as number) - (b as number))[0];
        const strongest = Object.entries(profile.skills).sort(([, a], [, b]) => (b as number) - (a as number))[0];
        setAiRecommendation(`Your strongest skill is ${strongest[0]} (${strongest[1]}). Focus on improving ${weakest[0]} (${weakest[1]}) to unlock more advanced challenges.`);
      } finally {
        setIsLoadingRec(false);
      }
    };
    fetchRec();
  }, []);

  const skillEntries = Object.entries(profile.skills).map(([name, rating]) => ({
    name: name.charAt(0).toUpperCase() + name.replace(/([A-Z])/g, ' $1').slice(1),
    rating: rating as number,
  })).sort((a, b) => b.rating - a.rating);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>

      {/* Profile Header */}
      <div className="realm-card" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 'var(--space-5)', padding: 'var(--space-6)' }}>
        <img src={profile.avatar} alt={profile.username} style={{ width: '88px', height: '88px', borderRadius: '50%', border: '2px solid var(--border-bright)', objectFit: 'cover' }} />
        <div style={{ flex: 1, minWidth: '200px' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--space-1)' }}>{profile.seasonBadge}</div>
          <h1 style={{ fontSize: '24px', color: 'var(--text-main)', fontFamily: 'var(--font-display)', fontWeight: 700 }}>{profile.username}</h1>
          <div style={{ color: 'var(--text-muted)', fontWeight: 500, fontSize: '14px' }}>{profile.title} · {profile.guildName}</div>
        </div>
        <div style={{ textAlign: 'right', minWidth: '150px' }}>
          <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', padding: 'var(--space-2) var(--space-4)', borderRadius: 'var(--radius-md)', fontSize: '14px', fontWeight: 600, color: 'var(--text-main)', marginBottom: 'var(--space-2)' }}>
            {profile.rank.toUpperCase()} ({profile.rankRating} ELO)
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Global Rank:{' '}
            <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>
              {globalRank !== null ? `#${globalRank}` : '—'}
            </span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid-responsive">
        {/* Skill Ratings */}
        <div className="realm-card">
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)', marginBottom: 'var(--space-4)' }}>Skill Rating Matrix</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {skillEntries.map(skill => (
              <div key={skill.name}>
                <div className="flex-between" style={{ fontSize: '13px', fontWeight: 500, marginBottom: 'var(--space-1)' }}>
                  <span style={{ color: 'var(--text-main)' }}>{skill.name}</span>
                  <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{skill.rating} / 999</span>
                </div>
                <div style={{ background: 'var(--bg-elevated)', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{
                    background: 'var(--text-main)',
                    height: '100%',
                    width: `${(skill.rating / 999) * 100}%`,
                    borderRadius: '3px',
                    opacity: 0.7 + (skill.rating / 999) * 0.3
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Analytics */}
        <div className="realm-card">
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)', marginBottom: 'var(--space-4)' }}>Adaptive Journey</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {[
              { label: 'Nodes Completed', value: `${profile.completedNodeIds?.length || 0}` },
              { label: 'Total XP', value: `${profile.xp.toLocaleString()}` },
              { label: 'Coins', value: `${profile.coins.toLocaleString()}` },
              { label: 'Current Streak', value: `${profile.streak} days` },
              { label: 'Stars Earned', value: `${profile.stars}` },
            ].map(item => (
              <div key={item.label} className="flex-between" style={{ background: 'var(--bg-surface)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>{item.label}</div>
                <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>{item.value}</div>
              </div>
            ))}

            {/* AI Recommendation */}
            <div style={{ background: 'var(--bg-elevated)', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', marginTop: 'var(--space-2)' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 'var(--space-2)', textTransform: 'uppercase' }}>AI Recommendation</div>
              {isLoadingRec
                ? <div className="flex-center" style={{ gap: 'var(--space-2)', color: 'var(--text-dim)', fontSize: '13px' }}>
                    <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> Analysing profile...
                    <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
                  </div>
                : <div style={{ fontSize: '13px', color: 'var(--text-main)', lineHeight: 1.6 }}>{aiRecommendation}</div>
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
