import React, { useState, useEffect } from 'react';
import { useGame } from '../../context/GameContext';
import { API_BASE_URL } from '../../services/api';
import confetti from 'canvas-confetti';
import { Flame, Zap, ArrowLeft, Trophy, Sparkles, Loader, CheckCircle, XCircle, Skull } from 'lucide-react';

const API_BASE = API_BASE_URL;

interface AITestCase {
  id: string;
  input: string;
  expectedOutput: string;
  description: string;
}

interface BossChallenge {
  title: string;
  description: string;
  storyContext: string;
  initialCode: string;
  testCases: AITestCase[];
  hints: string[];
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

const BOSS_MAX_HP = 3000;
const PHASE_DAMAGE = 1000;

export const BossFight: React.FC = () => {
  const { setActiveTab, completeChallenge, triggerNotification, activeNode, profile } = useGame();

  const [phases, setPhases] = useState<BossChallenge[]>([]);
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
  const [bossHealth, setBossHealth] = useState(BOSS_MAX_HP);
  const [playerHealth, setPlayerHealth] = useState(100);
  const [userCode, setUserCode] = useState('');
  const [isVictor, setIsVictor] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isExecuting, setIsExecuting] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [executionOutput, setExecutionOutput] = useState('');

  const bossName = activeNode?.title || 'The Loop Dragon';
  const realmName = activeNode?.realmId || 'Loop Castle';

  useEffect(() => {
    const generatePhases = async () => {
      setIsLoading(true);
      const generated: BossChallenge[] = [];

      for (let i = 0; i < 3; i++) {
        try {
          const params = new URLSearchParams({
            node_id: activeNode?.id || 'boss-node',
            node_title: `${bossName} — Phase ${i + 1}`,
            realm_name: realmName,
            node_type: 'boss',
            skill_rating: String(Math.min(2500, (profile.rankRating || 905) + i * 150)),
          });
          const resp = await fetch(`${API_BASE}/challenges/generate?${params}`);
          if (!resp.ok) throw new Error();
          const data = await resp.json();
          generated.push(data.challenge);
        } catch {
          generated.push({
            title: `Phase ${i + 1}: The Boss Strikes`,
            description: `Write a function solve_${i + 1}(n) that returns the sum of squares of all numbers from 1 to n.`,
            storyContext: `The ${bossName} unleashes a devastating Phase ${i + 1} attack!`,
            initialCode: `def solve_${i + 1}(n):\n    # Your code here\n    pass\n\nprint(solve_${i + 1}(3))`,
            testCases: [
              { id: 't1', input: '3', expectedOutput: '14', description: `solve_${i+1}(3) = 1+4+9 = 14` },
              { id: 't2', input: '5', expectedOutput: '55', description: `solve_${i+1}(5) = 1+4+9+16+25 = 55` },
            ],
            hints: ['Use a loop to accumulate squared values'],
            xpReward: 500 + i * 200,
            coinReward: 200 + i * 100,
          });
        }
      }

      setPhases(generated);
      setUserCode(generated[0]?.initialCode || '');
      setIsLoading(false);
    };
    generatePhases();
  }, [activeNode?.id]);

  const handleAttackBoss = async () => {
    const currentPhase = phases[currentPhaseIndex];
    if (!currentPhase || isExecuting) return;

    setIsExecuting(true);
    setExecutionOutput('⚙️ Executing boss phase challenge...');
    setTestResults([]);

    try {
      const resp = await fetch(`${API_BASE}/execute/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: userCode,
          language: 'python',
          test_cases: currentPhase.testCases.map(tc => ({
            id: tc.id,
            description: tc.description,
            input: tc.input ?? (tc as any).input_data ?? '',
            expected_output: tc.expectedOutput ?? (tc as any).expected_output ?? '',
          })),
        }),
      });

      const result = await resp.json();
      setTestResults(result.test_results || []);

      if (result.all_passed) {
        const newHp = Math.max(0, bossHealth - PHASE_DAMAGE);
        setBossHealth(newHp);
        setExecutionOutput(`✅ CRITICAL HIT! All tests passed — dealt ${PHASE_DAMAGE} damage!`);

        if (newHp === 0) {
          setIsVictor(true);
          confetti({ particleCount: 250, spread: 120, origin: { y: 0.5 } });
          const totalXp = phases.reduce((sum, p) => sum + (p.xpReward || 500), 0);
          const totalCoins = phases.reduce((sum, p) => sum + (p.coinReward || 200), 0);
          completeChallenge(activeNode?.id || 'boss-node', 3, totalXp, totalCoins);
          triggerNotification(`BOSS DEFEATED! +${totalXp} XP earned!`);
        } else {
          const next = Math.min(phases.length - 1, currentPhaseIndex + 1);
          setCurrentPhaseIndex(next);
          setUserCode(phases[next]?.initialCode || '');
          setTestResults([]);
          triggerNotification(`CRITICAL HIT! Phase ${next + 1} Unlocked!`);
        }
      } else {
        const dmg = 15 + Math.floor(Math.random() * 15);
        setPlayerHealth(prev => Math.max(0, prev - dmg));
        setExecutionOutput(`❌ Tests failed — Boss deals ${dmg} damage to you!\n\n${result.output}`);
        if (playerHealth - dmg <= 0) {
          triggerNotification('You were defeated! Try again!');
          setTimeout(() => setActiveTab('world'), 2000);
        }
      }
    } catch {
      setExecutionOutput('❌ Could not reach execution backend.');
    } finally {
      setIsExecuting(false);
    }
  };

  const currentPhase = phases[currentPhaseIndex];

  if (isLoading) {
    return (
      <div className="flex-center" style={{ width: '100%', height: 'calc(100vh - 56px)', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <Loader size={32} color="var(--text-main)" style={{ animation: 'spin 1s linear infinite' }} />
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-main)' }}>Summoning Boss...</div>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>Generating 3 phases for {bossName}</div>
        </div>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div className="container" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>

      {/* Top Navigation */}
      <div className="flex-between" style={{ flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <button onClick={() => setActiveTab('world')} className="btn-secondary">
          <ArrowLeft size={16} /> Exit Boss Arena
        </button>
        <div style={{
          background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
          padding: 'var(--space-2) var(--space-4)', borderRadius: 'var(--radius-full)', color: 'var(--text-muted)',
          fontWeight: 600, fontSize: '13px', display: 'flex', alignItems: 'center', gap: 'var(--space-2)'
        }}>
          <Flame size={16} color="var(--error)" />
          <span>Phase {currentPhaseIndex + 1} of {phases.length}: {currentPhase?.title}</span>
        </div>
      </div>

      {/* Boss Header */}
      <div className="realm-card" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-5)', border: '1px solid var(--error)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
          <div style={{ background: 'var(--bg-elevated)', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <Skull size={40} color="var(--error)" />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--error)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Legendary Boss</div>
            <h1 style={{ fontSize: '20px', color: 'var(--text-main)', fontWeight: 700 }}>{bossName}</h1>
            <div style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>{realmName}</div>
          </div>
        </div>

        <div style={{ flex: 1, minWidth: '250px', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {/* Boss HP */}
          <div>
            <div className="flex-between" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--error)', marginBottom: '4px' }}>
              <span>Boss HP</span><span>{bossHealth} / {BOSS_MAX_HP}</span>
            </div>
            <div style={{ background: 'var(--bg-elevated)', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ background: 'var(--error)', height: '100%', width: `${(bossHealth / BOSS_MAX_HP) * 100}%`, transition: 'width 0.4s ease' }} />
            </div>
          </div>
          {/* Player HP */}
          <div>
            <div className="flex-between" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--success)', marginBottom: '4px' }}>
              <span>Player HP</span><span>{playerHealth} / 100</span>
            </div>
            <div style={{ background: 'var(--bg-elevated)', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ background: 'var(--success)', height: '100%', width: `${playerHealth}%`, transition: 'width 0.3s ease' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Battle Area */}
      {!isVictor ? (
        <div className="grid-responsive" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-5)' }}>
          {/* Phase Objective */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--text-main)', fontWeight: 700, marginBottom: 'var(--space-3)', fontSize: '13px', textTransform: 'uppercase' }}>
              <Sparkles size={14} /> Phase Objective
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', lineHeight: 1.6, marginBottom: 'var(--space-4)' }}>
              {currentPhase?.description}
            </p>
            <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', fontSize: '13px', color: 'var(--text-muted)', marginBottom: 'var(--space-4)' }}>
              <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>Story: </span>{currentPhase?.storyContext}
            </div>

            {/* Test results */}
            {testResults.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {testResults.map(r => (
                  <div key={r.test_id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: '13px' }}>
                    {r.passed ? <CheckCircle size={14} color="var(--success)" /> : <XCircle size={14} color="var(--error)" />}
                    <span style={{ color: r.passed ? 'var(--success)' : 'var(--error)' }}>{r.description}</span>
                  </div>
                ))}
              </div>
            )}
            {executionOutput && (
              <div style={{ marginTop: 'var(--space-4)', fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--text-muted)', background: 'var(--bg-elevated)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', whiteSpace: 'pre-wrap' }}>
                {executionOutput}
              </div>
            )}
          </div>

          {/* Code Input */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <textarea
              value={userCode}
              onChange={(e) => setUserCode(e.target.value)}
              spellCheck={false}
              style={{
                width: '100%', height: '300px', background: 'var(--bg-elevated)',
                border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)',
                padding: 'var(--space-4)', color: 'var(--text-main)', fontFamily: 'var(--font-mono)',
                fontSize: '14px', outline: 'none', resize: 'vertical'
              }}
            />
            <button
              onClick={handleAttackBoss}
              disabled={isExecuting}
              className="btn-primary"
              style={{ justifyContent: 'center', padding: 'var(--space-3)' }}
            >
              {isExecuting
                ? <><Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> Executing...</>
                : <><Zap size={16} fill="currentColor" /> Unleash Combat Strike</>
              }
            </button>
          </div>
        </div>
      ) : (
        /* VICTORY SCREEN */
        <div className="realm-card" style={{ maxWidth: '600px', margin: '0 auto', padding: 'var(--space-8)', textAlign: 'center', border: '1px solid var(--success)' }}>
          <Trophy size={48} color="var(--success)" style={{ marginBottom: 'var(--space-4)' }} />
          <h1 style={{ fontSize: '24px', color: 'var(--text-main)', marginBottom: 'var(--space-2)', fontWeight: 700 }}>
            Boss Defeated!
          </h1>
          <div style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: 'var(--space-6)' }}>
            {bossName} has been vanquished from {realmName}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
            {[
              { label: 'Total XP', value: `+${phases.reduce((s, p) => s + p.xpReward, 0)}` },
              { label: 'Coins', value: `+${phases.reduce((s, p) => s + p.coinReward, 0)}` },
              { label: 'Phases', value: `${phases.length}/3` },
            ].map(item => (
              <div key={item.label} style={{ background: 'var(--bg-surface)', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: 'var(--space-2)', textTransform: 'uppercase', fontWeight: 600 }}>{item.label}</div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-main)' }}>{item.value}</div>
              </div>
            ))}
          </div>
          <button onClick={() => setActiveTab('world')} className="btn-primary" style={{ padding: 'var(--space-3) var(--space-6)' }}>
            Return to World Map
          </button>
        </div>
      )}
    </div>
  );
};
