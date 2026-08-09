import React, { useState, useEffect } from 'react';
import { useGame } from '../../context/GameContext';
import { Timer, Zap, Trophy, ArrowLeft, Bot, Loader, CheckCircle, XCircle } from 'lucide-react';
import { AIOpponentsSelector } from './AIOpponentsSelector';

const API_BASE = 'http://localhost:8000/api/v1';

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
  const { profile, setActiveTab, triggerNotification, completeChallenge } = useGame();

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

  useEffect(() => {
    const generateDuel = async () => {
      setIsLoadingChallenge(true);
      try {
        const params = new URLSearchParams({
          node_id: 'duel',
          node_title: '1v1 Code Duel',
          realm_name: 'Duel Arena',
          node_type: 'duel',
          skill_rating: String(profile.rankRating || 905),
        });
        const resp = await fetch(`${API_BASE}/challenges/generate?${params}`);
        if (!resp.ok) throw new Error();
        const data = await resp.json();
        setChallenge(data.challenge);
        setCode(data.challenge.initialCode);
      } catch {
        const fallback: DuelChallenge = {
          title: 'Reverse String Battle',
          description: 'Write a function reverse_words(s) that reverses the order of words in a sentence.',
          initialCode: 'def reverse_words(s):\n    # Your code here\n    pass\n\nprint(reverse_words("hello world"))',
          testCases: [
            { id: 't1', input: '', expectedOutput: 'world hello', description: 'Reverses hello world' },
            { id: 't2', input: '', expectedOutput: 'c b a', description: 'Reverses a b c' },
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
    generateDuel();
  }, []);

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
      setOpponentProgress(prev => {
        const boost = Math.random() > 0.55 ? Math.random() * 4 : 0;
        return Math.min(98, prev + boost);
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
      const resp = await fetch(`${API_BASE}/execute/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          language: 'python',
          test_cases: challenge.testCases.map(tc => ({
            id: tc.id,
            description: tc.description,
            input: tc.input || '',
            expected_output: tc.expectedOutput,
          })),
        }),
      });

      const result = await resp.json();
      setTestResults(result.test_results || []);
      const passed = result.test_results?.filter((r: TestResult) => r.passed).length || 0;
      const total = result.test_results?.length || 1;
      const pct = Math.round((passed / total) * 100);
      setPlayerProgress(pct);

      if (result.all_passed) {
        setDuelFinished(true);
        setPlayerWon(true);
        const elo = opponentProgress < 80 ? 25 : 15;
        const xp = challenge.xpReward;
        setEloChange(elo);
        setXpEarned(xp);
        completeChallenge('duel', 3, xp, challenge.coinReward);
        triggerNotification(`Duel Victory! +${elo} ELO | +${xp} XP`);
        setOutput(`✅ All tests passed — You win the duel!`);
      } else {
        setOutput(`${passed}/${total} tests passed. Keep improving!`);
      }
    } catch {
      setOutput('❌ Could not reach execution backend.');
    } finally {
      setIsExecuting(false);
    }
  };

  if (isLoadingChallenge) {
    return (
      <div className="flex-center" style={{ width: '100%', height: 'calc(100vh - 56px)', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <Loader size={32} color="var(--text-main)" style={{ animation: 'spin 1s linear infinite' }} />
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-main)' }}>Generating Duel...</div>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>Finding an opponent near {profile.rankRating} ELO</div>
        </div>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div className="container" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>

      {/* Top Bar */}
      <div className="flex-between" style={{ flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <button onClick={() => setActiveTab('world')} className="btn-secondary">
          <ArrowLeft size={16} /> Exit Arena
        </button>
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

        <div style={{ fontWeight: 800, fontSize: '18px', color: 'var(--text-muted)', fontStyle: 'italic' }}>VS</div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', textAlign: 'right' }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>AI Opponent</div>
            <h3 style={{ fontSize: '18px', color: 'var(--text-main)', fontWeight: 700 }}>Algorithm Bot</h3>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{Math.max(800, (profile.rankRating || 905) - 50)} ELO</div>
          </div>
          <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Bot size={28} color="var(--text-muted)" />
          </div>
        </div>
      </div>

      {/* Progress Bars */}
      <div className="realm-card" style={{ padding: 'var(--space-4)' }}>
        {[
          { label: 'Your Progress', pct: playerProgress, color: 'var(--success)' },
          { label: 'Opponent Progress', pct: opponentProgress, color: 'var(--warning)' },
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
              {challenge?.testCases.map((tc) => {
                const result = testResults.find(r => r.test_id === tc.id);
                return (
                  <div key={tc.id} style={{ background: 'var(--bg-elevated)', border: `1px solid ${result ? (result.passed ? 'var(--success)' : 'var(--error)') : 'var(--border-subtle)'}`, padding: 'var(--space-2) var(--space-3)', borderRadius: 'var(--radius-md)', fontSize: '13px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: '4px' }}>
                      {result ? (result.passed ? <CheckCircle size={14} color="var(--success)" /> : <XCircle size={14} color="var(--error)" />) : null}
                      <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Test Case</span>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Expected: </span>
                      <span style={{ color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>{tc.expectedOutput}</span>
                    </div>
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
            <textarea
              value={code}
              onChange={e => setCode(e.target.value)}
              spellCheck={false}
              style={{
                width: '100%', height: '300px', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)', padding: 'var(--space-4)', color: 'var(--text-main)',
                fontFamily: 'var(--font-mono)', fontSize: '14px', outline: 'none', resize: 'vertical'
              }}
            />
            <button onClick={handleSubmitDuel} disabled={isExecuting} className="btn-primary" style={{ justifyContent: 'center', padding: 'var(--space-3)' }}>
              {isExecuting ? <><Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> Running...</> : <><Zap size={16} fill="currentColor" /> Submit Solution</>}
            </button>
          </div>
        </div>
      ) : (
        /* Result */
        <div className="realm-card" style={{ maxWidth: '500px', margin: '0 auto', padding: 'var(--space-8)', textAlign: 'center', border: playerWon ? '1px solid var(--success)' : '1px solid var(--border-subtle)' }}>
          {playerWon
            ? <><Trophy size={48} color="var(--success)" style={{ marginBottom: 'var(--space-4)' }} /><h2 style={{ fontSize: '24px', color: 'var(--text-main)', marginBottom: 'var(--space-6)', fontWeight: 700 }}>Duel Victory!</h2></>
            : <><Bot size={48} color="var(--text-muted)" style={{ marginBottom: 'var(--space-4)' }} /><h2 style={{ fontSize: '24px', color: 'var(--text-muted)', marginBottom: 'var(--space-6)', fontWeight: 700 }}>Duel Defeat</h2></>
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
          <button onClick={() => setActiveTab('world')} className="btn-primary" style={{ padding: 'var(--space-3) var(--space-6)' }}>Return to World</button>
        </div>
      )}

      <AIOpponentsSelector onSelectBot={(bot) => triggerNotification(`Challenged ${bot.name} (${bot.rating} ELO)!`)} />
    </div>
  );
};
