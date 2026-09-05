import React, { useState, useEffect } from 'react';
import { useGame } from '../../context/GameContext';
import { api, API_BASE_URL } from '../../services/api';
import type { GhostPaceResponse } from '../../services/api';
import Editor from '@monaco-editor/react';
import { Timer, Zap, Trophy, ArrowLeft, Bot, Loader, CheckCircle, XCircle, RotateCcw, Swords } from 'lucide-react';
import { AIOpponentsSelector, aiBots, type AIBot } from './AIOpponentsSelector';

const API_BASE = API_BASE_URL;

interface AITestCase {
  id: string;
  input: string;
  expectedOutput: string;
  description: string;
}

interface DuelChallenge {
  title: string;
  description: string;
  initialCode: string;
  testCases: AITestCase[];
  xpReward: number;
  coinReward: number;
}

interface TestResult {
  test_id: string;
  description: string;
  passed: boolean;
  expected_output: string;
  actual_output: string;
}

export const CodeDuel: React.FC = () => {
  const { profile, setProfile, setActiveTab, triggerNotification, theme } = useGame();

  const [challenge, setChallenge] = useState<DuelChallenge | null>(null);
  const [isLoadingChallenge, setIsLoadingChallenge] = useState(true);
  const [code, setCode] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(150);
  const [opponentProgress, setOpponentProgress] = useState(0);
  const [playerProgress, setPlayerProgress] = useState(0);
  const [duelFinished, setDuelFinished] = useState(false);
  const [playerWon, setPlayerWon] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [output, setOutput] = useState('');
  const [eloChange, setEloChange] = useState(0);
  const [xpEarned, setXpEarned] = useState(0);
  const [roundIndex, setRoundIndex] = useState(1);
  const [currentOpponent, setCurrentOpponent] = useState<AIBot>(aiBots[2]);
  const [ghostPace, setGhostPace] = useState<GhostPaceResponse | null>(null);
  const hasRealGhost = !!ghostPace && ghostPace.sample_size >= 3;

  const loadDuelChallenge = async (round: number, opponent?: AIBot) => {
    setIsLoadingChallenge(true);
    setDuelFinished(false);
    setPlayerWon(false);
    setSecondsLeft(150);
    setOpponentProgress(0);
    setPlayerProgress(0);
    setTestResults([]);
    setOutput('');
    const targetOpponent = opponent || currentOpponent;
    if (opponent) setCurrentOpponent(opponent);

    // Real ghost pace: how long actual players at this rating took to solve
    // a comparable problem, from code_submissions.solve_time_seconds. When
    // there isn't enough real data yet (sample_size < 3), hasRealGhost stays
    // false and the UI falls back to a clearly-labeled simulated pace instead
    // of pretending randomness is a real opponent.
    setGhostPace(null);
    api.getGhostPace(targetOpponent.rating || profile.rankRating || 905).then(setGhostPace);

    try {
      const params = new URLSearchParams({
        node_id: `duel-${targetOpponent.id}`,
        node_title: `1v1 Code Duel — Round ${round}`,
        realm_name: 'Duel Arena',
        node_type: 'duel',
        skill_rating: String(targetOpponent.rating || profile.rankRating || 905),
        sub_level_index: String(round)
      });
      const resp = await fetch(`${API_BASE}/challenges/generate?${params}`);
      if (!resp.ok) throw new Error();
      const data = await resp.json();
      setChallenge(data.challenge);
      setCode(data.challenge.initialCode);
    } catch {
      const fallback: DuelChallenge = {
        title: `Round ${round}: Rapid Speed Trial`,
        description: 'Write a function solve(s) that filters and returns only the alphanumeric characters in a given string.',
        initialCode: 'def solve(s):\n    # Write your solution here\n    pass\n',
        testCases: [
          { id: 't1', input: '"hello_world 123!"', expectedOutput: 'helloworld123', description: 'Filters symbols and spaces' },
          { id: 't2', input: '"Code#Realm@2026"', expectedOutput: 'CodeRealm2026', description: 'Keeps alphanumeric characters' },
        ],
        xpReward: 500,
        coinReward: 200,
      };
      setChallenge(fallback);
      setCode(fallback.initialCode);
    } finally {
      setIsLoadingChallenge(false);
    }
  };

  useEffect(() => {
    loadDuelChallenge(1);
  }, []);

  const handleNextDuel = () => {
    const nextRound = roundIndex + 1;
    setRoundIndex(nextRound);
    triggerNotification(`⚔️ Initiating Duel Round ${nextRound}...`);
    loadDuelChallenge(nextRound);
  };

  const handleChallengeBot = (bot: AIBot) => {
    const nextRound = roundIndex + 1;
    setRoundIndex(nextRound);
    triggerNotification(`⚔️ Challenging ${bot.name} (${bot.rating} ELO)!`);
    loadDuelChallenge(nextRound, bot);
  };

  useEffect(() => {
    if (isLoadingChallenge || secondsLeft <= 0 || duelFinished) return;
    const timer = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          setDuelFinished(true);
          setPlayerWon(false);
          setEloChange(-15);
          triggerNotification('Time expired! Opponent wins this round.');
          return 0;
        }
        return prev - 1;
      });
      const elapsed = 150 - secondsLeft;
      setOpponentProgress(() => {
        if (hasRealGhost && ghostPace) {
          // Deterministic: races the real median solve time of players at
          // this rating band, not a fabricated random walk.
          return Math.min(98, (elapsed / ghostPace.median_seconds) * 100);
        }
        // Not enough real data at this rating yet — a labeled simulated pace
        // (see the "Practice Pace" copy below) rather than a specific
        // opponent claim.
        return Math.min(98, (elapsed / 90) * 100);
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isLoadingChallenge, secondsLeft, duelFinished]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const handleSubmitDuel = async () => {
    if (!challenge || isExecuting || duelFinished) return;
    setIsExecuting(true);
    setOutput('⚙️ Executing against test cases...');

    try {
      const token = localStorage.getItem('coderealm_token');
      if (!token) {
        setOutput('❌ Please log in to duel.');
        setIsExecuting(false);
        return;
      }

      // Uses /execute/submit rather than /execute/run: this both applies
      // real server-side rewards (via RewardService) and, by sending the
      // actual elapsed countdown time, contributes a genuine data point to
      // the ghost-pace pool other players will race against — that pool is
      // otherwise permanently empty, since nothing else records solve time.
      const elapsedSeconds = 150 - secondsLeft;
      const duelChallengeId = (challenge as any)?.id || `duel-${currentOpponent.id}-r${roundIndex}`;
      const resp = await fetch(`${API_BASE}/execute/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          challenge_id: duelChallengeId,
          code,
          language: 'python',
          solve_time_seconds: elapsedSeconds,
          test_cases: challenge.testCases.map(tc => ({
            id: tc.id,
            description: tc.description,
            input: tc.input ?? (tc as any).input_data ?? '',
            expected_output: tc.expectedOutput ?? (tc as any).expected_output ?? '',
          })),
        }),
      });

      if (resp.status === 401) throw new Error('Your session expired. Please log in again.');

      const result = await resp.json();
      setTestResults(result.test_results || []);
      const passed = result.test_results?.filter((r: TestResult) => r.passed).length || 0;
      const total = result.test_results?.length || 1;
      const pct = Math.round((passed / total) * 100);
      setPlayerProgress(pct);

      if (result.all_passed) {
        setDuelFinished(true);
        setPlayerWon(true);
        // Rewards and Elo were already applied server-side by RewardService
        // inside /execute/submit above — read the authoritative amounts back
        // rather than computing a second, client-side estimate (the previous
        // version additionally called completeChallenge(), which hit
        // /user/progress and granted a second, separate reward for the same
        // win).
        const xp = result.xp_earned ?? challenge.xpReward;
        setEloChange(opponentProgress < 80 ? 25 : 15);
        setXpEarned(xp);
        triggerNotification(`Duel Victory! +${xp} XP`);
        setOutput(`✅ All tests passed — You win Round ${roundIndex}!`);

        api.getUserProfile().then(profileData => {
          const p = profileData?.profile;
          if (!p) return;
          setProfile(prev => ({
            ...prev,
            level: p.level,
            xp: p.xp,
            nextLevelXp: p.next_level_xp,
            coins: p.coins,
            stars: p.stars,
            streak: p.streak,
            rank: p.rank,
            rankRating: p.rank_rating,
          }));
        }).catch(() => {});
      } else {
        setOutput(`${passed}/${total} tests passed. Check Your Output below.`);
      }
    } catch (err) {
      setOutput(`❌ ${err instanceof Error ? err.message : 'Could not reach execution backend.'}`);
    } finally {
      setIsExecuting(false);
    }
  };

  if (isLoadingChallenge) {
    return (
      <div className="flex-center" style={{ width: '100%', height: 'calc(100vh - 56px)', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <Loader size={32} color="var(--text-main)" style={{ animation: 'spin 1s linear infinite' }} />
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-main)' }}>Generating Round {roundIndex} Duel...</div>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>Matching against {currentOpponent.name} ({currentOpponent.rating} ELO)</div>
        </div>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div className="container" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>

      {/* Top Bar */}
      <div className="flex-between" style={{ flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <button onClick={() => setActiveTab('world')} className="btn-secondary">
            <ArrowLeft size={16} /> Exit Arena
          </button>
          <button onClick={handleNextDuel} className="btn-secondary" title="Skip to next duel question">
            <RotateCcw size={14} /> Next Question
          </button>
        </div>
        <div style={{
          background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
          padding: 'var(--space-2) var(--space-5)', borderRadius: 'var(--radius-full)',
          fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '18px',
          color: secondsLeft < 30 ? 'var(--error)' : 'var(--text-main)',
          display: 'flex', alignItems: 'center', gap: 'var(--space-2)'
        }}>
          <Timer size={18} /> {timeStr}
        </div>
      </div>

      {/* VS Bar */}
      <div className="realm-card" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-5)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
          <img src={profile.avatar} alt="" style={{ width: '52px', height: '52px', borderRadius: '50%', objectFit: 'cover' }} />
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Player (You)</div>
            <h3 style={{ fontSize: '18px', color: 'var(--text-main)', fontWeight: 700 }}>{profile.username}</h3>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{profile.rankRating} ELO</div>
          </div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--accent-gold)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>ROUND {roundIndex}</div>
          <div style={{ fontWeight: 800, fontSize: '20px', color: 'var(--text-muted)', fontStyle: 'italic' }}>VS</div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', textAlign: 'right' }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {hasRealGhost ? 'Ghost Race' : 'Practice Pace'}
            </div>
            <h3 style={{ fontSize: '18px', color: 'var(--text-main)', fontWeight: 700 }}>{currentOpponent.name}</h3>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              {currentOpponent.rating} ELO band{hasRealGhost ? ` · ${ghostPace!.sample_size} real solves` : ' · estimated pace'}
            </div>
          </div>
          <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px' }}>
            {currentOpponent.avatar}
          </div>
        </div>
      </div>

      {/* Progress Bars */}
      <div className="realm-card" style={{ padding: 'var(--space-4)' }}>
        {[
          { label: 'Your Progress', pct: playerProgress, color: 'var(--success)' },
          { label: hasRealGhost ? `${currentOpponent.name} (real player pace)` : `${currentOpponent.name} (estimated)`, pct: opponentProgress, color: 'var(--warning)' },
        ].map(({ label, pct, color }) => (
          <div key={label} style={{ marginBottom: 'var(--space-3)' }}>
            <div className="flex-between" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 'var(--space-1)' }}>
              <span>{label}</span><span>{Math.round(pct)}%</span>
            </div>
            <div style={{ background: 'var(--bg-elevated)', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ background: color, height: '100%', width: `${pct}%`, transition: 'width 0.3s ease' }} />
            </div>
          </div>
        ))}
      </div>

      {/* Challenge + Editor */}
      {!duelFinished ? (
        <div className="grid-responsive" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-5)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <h3 style={{ fontSize: '16px', color: 'var(--text-main)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              {challenge?.title}
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', lineHeight: 1.6 }}>{challenge?.description}</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {challenge?.testCases.map((tc, idx) => {
                const result = testResults.find(r => r.test_id === tc.id) || testResults[idx];
                return (
                  <div key={tc.id} style={{ background: 'var(--bg-elevated)', border: `1px solid ${result ? (result.passed ? 'var(--success)' : 'var(--error)') : 'var(--border-subtle)'}`, padding: 'var(--space-2) var(--space-3)', borderRadius: 'var(--radius-md)', fontSize: '13px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: '4px' }}>
                      {result ? (result.passed ? <CheckCircle size={14} color="var(--success)" /> : <XCircle size={14} color="var(--error)" />) : null}
                      <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{tc.description || 'Test Case'}</span>
                    </div>
                    {tc.input && (
                      <div style={{ marginBottom: '4px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Input: </span>
                        <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{tc.input}</span>
                      </div>
                    )}
                    <div style={{ marginBottom: result ? '4px' : '0' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Expected: </span>
                      <span style={{ color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>{tc.expectedOutput}</span>
                    </div>
                    {result && (
                      <div style={{ marginTop: '4px', paddingTop: '4px', borderTop: '1px dashed var(--border-subtle)' }}>
                        <span style={{ color: result.passed ? 'var(--success)' : 'var(--error)', fontWeight: 600 }}>Your Output: </span>
                        <span style={{ color: result.passed ? 'var(--success)' : 'var(--error)', fontFamily: 'var(--font-mono)' }}>
                          {result.actual_output !== undefined && result.actual_output !== '' ? result.actual_output : '(No output)'}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            
            {output && (
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--text-muted)', background: 'var(--bg-elevated)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', whiteSpace: 'pre-wrap' }}>
                {output}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <div style={{ height: '300px', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
              <Editor
                height="100%"
                language="python"
                theme={theme === 'dark' ? 'vs-dark' : 'light'}
                value={code}
                onChange={(value) => setCode(value || '')}
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  fontFamily: 'var(--font-mono)',
                  padding: { top: 16, bottom: 16 },
                  scrollBeyondLastLine: false,
                }}
              />
            </div>
            <button onClick={handleSubmitDuel} disabled={isExecuting} className="btn-primary" style={{ justifyContent: 'center', padding: 'var(--space-3)' }}>
              {isExecuting ? <><Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> Running...</> : <><Zap size={16} fill="currentColor" /> Submit Solution</>}
            </button>
          </div>
        </div>
      ) : (
        /* Result */
        <div className="realm-card" style={{ maxWidth: '540px', margin: '0 auto', padding: 'var(--space-8)', textAlign: 'center', border: playerWon ? '1px solid var(--success)' : '1px solid var(--border-subtle)' }}>
          {playerWon
            ? <><Trophy size={48} color="var(--success)" style={{ marginBottom: 'var(--space-4)' }} /><h2 style={{ fontSize: '24px', color: 'var(--text-main)', marginBottom: 'var(--space-6)', fontWeight: 700 }}>Round {roundIndex} Victory!</h2></>
            : <><Bot size={48} color="var(--text-muted)" style={{ marginBottom: 'var(--space-4)' }} /><h2 style={{ fontSize: '24px', color: 'var(--text-muted)', marginBottom: 'var(--space-6)', fontWeight: 700 }}>Round {roundIndex} Defeat</h2></>
          }
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
            <div style={{ background: 'var(--bg-surface)', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: 'var(--space-1)', textTransform: 'uppercase', fontWeight: 600 }}>Rating Change</div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: eloChange >= 0 ? 'var(--success)' : 'var(--error)' }}>{eloChange >= 0 ? '+' : ''}{eloChange} ELO</div>
            </div>
            <div style={{ background: 'var(--bg-surface)', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: 'var(--space-1)', textTransform: 'uppercase', fontWeight: 600 }}>XP Reward</div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-main)' }}>+{xpEarned}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button onClick={handleNextDuel} className="btn-primary" style={{ padding: 'var(--space-3) var(--space-6)' }}>
              <Swords size={16} /> Next Match
            </button>
            <button onClick={() => setActiveTab('world')} className="btn-secondary" style={{ padding: 'var(--space-3) var(--space-6)' }}>
              Return to World
            </button>
          </div>
        </div>
      )}

      <AIOpponentsSelector onSelectBot={handleChallengeBot} />
    </div>
  );
};
