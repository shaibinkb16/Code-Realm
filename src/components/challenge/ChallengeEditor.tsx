import React, { useState, useEffect } from 'react';
import { useGame } from '../../context/GameContext';
import { api, API_BASE_URL } from '../../services/api';
import type { CodeReviewResponse } from '../../services/api';
import { AITeacherPanel } from './AITeacherPanel';
import Editor from '@monaco-editor/react';
import confetti from 'canvas-confetti';
import { FormattedText } from '../ui/FormattedText';
import {
  Play,
  CheckCircle,
  XCircle,
  Terminal,
  RotateCcw,
  ArrowLeft,
  Sparkles,
  Zap,
  Loader,
  X,
  MessageSquare,
  ArrowRight
} from 'lucide-react';

interface AITestCase {
  id: string;
  input: string;
  expectedOutput: string;
  description: string;
}

interface AIChallenge {
  title: string;
  type: string;
  difficulty: string;
  description: string;
  storyContext: string;
  initialCode: string;
  language: string;
  testCases: AITestCase[];
  hints: string[];
  explanation: string;
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

interface ExecutionResult {
  status: string;
  all_passed: boolean;
  output: string;
  execution_time_ms: number;
  stars_earned: number;
  xp_earned: number;
  coins_earned: number;
  test_results: TestResult[];
}

const API_BASE = API_BASE_URL;

export const ChallengeEditor: React.FC = () => {
  const { activeNode, setActiveTab, completeChallenge, profile, setProfile, theme, activeSubLevelIdx, setActiveSubLevelIdx } = useGame();

  const [challenge, setChallenge] = useState<AIChallenge | null>(null);
  const [isLoadingChallenge, setIsLoadingChallenge] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [code, setCode] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('python');
  const [isExecuting, setIsExecuting] = useState(false);
  const [output, setOutput] = useState('');
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [hasPassedAll, setHasPassedAll] = useState(false);

  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [isLoadingFeedback, setIsLoadingFeedback] = useState(false);
  const [codeReview, setCodeReview] = useState<CodeReviewResponse | null>(null);
  const [isLoadingReview, setIsLoadingReview] = useState(false);

  const [isSwapping, setIsSwapping] = useState(false);
  const [subLevelIdx, setSubLevelIdx] = useState<number>(() => {
    if (activeSubLevelIdx) return activeSubLevelIdx;
    if (activeNode) {
      const subLevels = activeNode.subLevels || [];
      const firstUncompleted = subLevels.findIndex(s => !profile.completedNodeIds.includes(s.id));
      return firstUncompleted >= 0 ? firstUncompleted + 1 : 1;
    }
    return 1;
  });

  const generateChallenge = async (lang: string, subIdx: number = subLevelIdx) => {
    setIsLoadingChallenge(true);
    setLoadError(null);
    setCode('');
    setOutput('');
    setTestResults([]);
    setHasPassedAll(false);

    const nodeId = activeNode?.id || 'node-loop-1';
    const nodeTitle = activeNode?.title || 'The Unknown Trial';
    const realmName = activeNode?.realmId || 'Code Realm';
    const nodeType = activeNode?.type || 'challenge';

    try {
      const token = localStorage.getItem('coderealm_token');
      const params = new URLSearchParams({
        node_id: nodeId,
        node_title: nodeTitle,
        realm_name: realmName,
        node_type: nodeType,
        skill_rating: String(profile.rankRating || 905),
        target_language: lang,
        sub_level_index: String(subIdx)
      });

      const resp = await fetch(`${API_BASE}/challenges/generate?${params}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (!resp.ok) throw new Error(`Server error ${resp.status}`);

      const data = await resp.json();
      const aiChallenge: AIChallenge = data.challenge;

      setChallenge(aiChallenge);
      setCode(data.savedCode || aiChallenge.initialCode);
      setSelectedLanguage(aiChallenge.language?.toLowerCase() || lang);
    } catch (err) {
      setLoadError('Could not connect to the AI backend.');
    } finally {
      setIsLoadingChallenge(false);
    }
  };

  const handleNextQuestion = () => {
    const nextIdx = subLevelIdx + 1;
    setSubLevelIdx(nextIdx);
    if (setActiveSubLevelIdx) setActiveSubLevelIdx(nextIdx);
    setIsFeedbackOpen(false);
    setTestResults([]);
    setHasPassedAll(false);
    setOutput(`🚀 Advanced to Question ${nextIdx}! Loading challenge scaffold...`);
    generateChallenge(selectedLanguage, nextIdx);
  };

  const handleSwapChallenge = async () => {
    if (!challenge || isSwapping) return;
    setIsSwapping(true);
    try {
      const token = localStorage.getItem('coderealm_token');
      const nodeId = activeNode?.id || 'node-loop-1';
      const resp = await fetch(`${API_BASE}/challenges/swap`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          node_id: nodeId,
          target_language: selectedLanguage
        })
      });
      if (!resp.ok) throw new Error('Swap request failed');
      const data = await resp.json();
      setChallenge(data.challenge);
      setCode(data.savedCode || data.challenge.initialCode);
      setTestResults([]);
      setHasPassedAll(false);
      setOutput(`🔄 Swapped! ${data.message || ''}`);
    } catch (err) {
      setOutput('❌ Could not swap to alternate challenge.');
    } finally {
      setIsSwapping(false);
    }
  };

  useEffect(() => {
    let targetIdx = activeSubLevelIdx;
    if (!targetIdx && activeNode) {
      const subLevels = activeNode.subLevels || [];
      const firstUncompleted = subLevels.findIndex(s => !profile.completedNodeIds.includes(s.id));
      targetIdx = firstUncompleted >= 0 ? firstUncompleted + 1 : 1;
    }
    const finalIdx = targetIdx || 1;
    setSubLevelIdx(finalIdx);
    generateChallenge(selectedLanguage, finalIdx);
  }, [activeNode?.id, activeSubLevelIdx]);

  const handleRunCode = async () => {
    if (!challenge) return;
    setIsExecuting(true);
    setOutput('⚙️ Sending to execution sandbox...');
    setTestResults([]);

    try {
      const token = localStorage.getItem('coderealm_token');
      if (!token) {
        setOutput('❌ Please log in to run code.');
        setIsExecuting(false);
        return;
      }

      const resp = await fetch(`${API_BASE}/execute/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          code,
          language: selectedLanguage,
          test_cases: challenge.testCases.map(tc => ({
            id: tc.id,
            description: tc.description,
            input: tc.input ?? (tc as any).input_data ?? '',
            expected_output: tc.expectedOutput ?? (tc as any).expected_output ?? '',
          })),
        }),
      });

      if (resp.status === 401) throw new Error('Your session expired. Please log in again.');
      if (!resp.ok) throw new Error(`Execution server error ${resp.status}`);

      const result: ExecutionResult = await resp.json();
      setTestResults(result.test_results);
      setHasPassedAll(result.all_passed);

      const statusLine = result.all_passed
        ? `✅ ALL ${result.test_results.length} TESTS PASSED — ${result.execution_time_ms}ms`
        : `❌ ${result.test_results.filter(r => r.passed).length}/${result.test_results.length} TESTS PASSED — ${result.execution_time_ms}ms`;

      const details = result.test_results && result.test_results.length > 0
        ? result.test_results.map((tr, i) => 
            `[Test ${i + 1}] ${tr.description || 'Test'}: ${tr.passed ? 'PASSED ✓' : 'FAILED ✗'}\n  Expected:    ${tr.expected_output}\n  Your Output: ${tr.actual_output !== undefined && tr.actual_output !== '' ? tr.actual_output : '(No output)'}`
          ).join('\n\n')
        : (result.output || '');

      setOutput(`${statusLine}\n\n${details}`);
    } catch (err) {
      setOutput(`❌ ${err instanceof Error ? err.message : 'Could not reach the execution backend.'}`);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleSubmit = async () => {
    if (!challenge) return;

    if (!hasPassedAll && testResults.length === 0) {
      await handleRunCode();
      return;
    }

    if (!hasPassedAll) {
      fetchAIFeedback();
      return;
    }

    const nodeId = activeNode?.id || 'node-1';
    const subId = `${nodeId}-sub-${subLevelIdx}`;
    const challengeId = (challenge as any)?.id || subId;

    try {
      const token = localStorage.getItem('coderealm_token');
      if (token) {
        const resp = await fetch(`${API_BASE}/execute/submit`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            challenge_id: challengeId,
            code,
            language: selectedLanguage,
            test_cases: challenge.testCases.map(tc => ({
              id: tc.id,
              description: tc.description,
              input: tc.input ?? (tc as any).input_data ?? '',
              expected_output: tc.expectedOutput ?? (tc as any).expected_output ?? '',
            })),
          })
        });

        if (resp.ok) {
          const profileData = await api.getUserProfile();
          if (profileData && profileData.profile) {
            const p = profileData.profile;
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
              hq: { ...prev.hq, levelName: p.hq_level },
              pet: { ...prev.pet, stage: p.pet_stage, level: p.pet_level },
              completedNodeIds: Array.isArray(p.completed_node_ids) ? p.completed_node_ids : prev.completedNodeIds,
              nodeStars: (p.node_stars && typeof p.node_stars === 'object') ? p.node_stars : prev.nodeStars
            }));
          }
        }
      }
    } catch (e) {
      console.warn('Backend submission persistence error:', e);
    }

    confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
    completeChallenge(subId, 3, challenge.xpReward, challenge.coinReward);
    if (subLevelIdx >= 75) {
      completeChallenge(nodeId, 3, 0, 0);
    }
    fetchAIFeedback();
  };

  const fetchAIFeedback = async () => {
    if (!challenge) return;
    setIsFeedbackOpen(true);
    setIsLoadingFeedback(true);
    setFeedbackText('');
    setCodeReview(null);
    setIsLoadingReview(true);

    const formattedTestResults = testResults.map(r => ({
      test_id: r.test_id,
      description: r.description,
      passed: r.passed,
      expected_output: r.expected_output,
      actual_output: r.actual_output,
    }));

    // Scored rubric fetched in parallel — independent of the free-text
    // feedback call, so a slow/failed review never blocks the feedback text.
    api.getCodeReview(
      code,
      challenge.title,
      challenge.description,
      formattedTestResults,
      profile.rankRating || 905
    )
      .then(setCodeReview)
      .finally(() => setIsLoadingReview(false));

    try {
      const resp = await fetch(`${API_BASE}/challenges/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          challenge_title: challenge.title,
          challenge_description: challenge.description,
          test_results: formattedTestResults,
          skill_rating: profile.rankRating || 905,
        }),
      });

      const data = await resp.json();
      setFeedbackText(data.feedback || 'Great effort! Keep pushing!');
    } catch {
      setFeedbackText('Great effort! Review the test expectations carefully and try again.');
    } finally {
      setIsLoadingFeedback(false);
    }
  };


  if (isLoadingChallenge) {
    return (
      <div className="flex-center" style={{ width: '100%', height: '100%', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <Loader size={32} color="var(--text-main)" style={{ animation: 'spin 1s linear infinite' }} />
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-main)' }}>Loading Challenge...</div>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>Tailoring to Rating: {profile.rankRating}</div>
        </div>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (loadError || !challenge) {
    return (
      <div className="flex-center" style={{ width: '100%', height: '100%', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <XCircle size={40} color="var(--error)" />
        <div style={{ textAlign: 'center', maxWidth: '400px' }}>
          <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-main)' }}>Backend Error</div>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>{loadError}</div>
          <button onClick={() => window.location.reload()} className="btn-primary" style={{ marginTop: 'var(--space-4)' }}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="challenge-workspace">

      {/* ── AI FEEDBACK MODAL ── */}
      {isFeedbackOpen && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-4)'
        }}>
          <div className="realm-card" style={{ width: '100%', maxWidth: '500px' }}>
            <div className="flex-between" style={{ marginBottom: 'var(--space-4)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <MessageSquare size={18} />
                <span style={{ fontWeight: 600, fontSize: '15px' }}>AI Feedback</span>
              </div>
              <button onClick={() => setIsFeedbackOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{
              background: hasPassedAll ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              border: `1px solid ${hasPassedAll ? 'var(--success)' : 'var(--error)'}`,
              borderRadius: 'var(--radius-md)', padding: 'var(--space-3)', marginBottom: 'var(--space-4)',
              display: 'flex', alignItems: 'center', gap: 'var(--space-2)'
            }}>
              {hasPassedAll
                ? <><CheckCircle size={16} color="var(--success)" /><span style={{ color: 'var(--success)', fontWeight: 600, fontSize: '13px' }}>All Tests Passed (+{challenge.xpReward} XP)</span></>
                : <><XCircle size={16} color="var(--error)" /><span style={{ color: 'var(--error)', fontWeight: 600, fontSize: '13px' }}>Tests Failed - Try Again</span></>
              }
            </div>

            {(isLoadingReview || codeReview) && (
              <div style={{
                background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)', padding: 'var(--space-3)', marginBottom: 'var(--space-3)',
              }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--space-2)' }}>
                  AI Code Review
                </div>
                {isLoadingReview ? (
                  <div className="flex-center" style={{ gap: 'var(--space-2)', fontSize: '13px', color: 'var(--text-muted)' }}>
                    <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> Scoring your submission...
                  </div>
                ) : codeReview && (
                  <>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
                      <span style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-main)' }}>{codeReview.overall_score}</span>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>/ 100 overall</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
                      {Object.entries(codeReview.breakdown).map(([key, value]) => (
                        <div key={key} style={{ fontSize: '11px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', marginBottom: '2px', textTransform: 'capitalize' }}>
                            <span>{key}</span><span>{value}</span>
                          </div>
                          <div style={{ background: 'var(--bg-surface, rgba(255,255,255,0.05))', borderRadius: '999px', height: '5px', overflow: 'hidden' }}>
                            <div style={{ width: `${value}%`, height: '100%', background: value >= 75 ? 'var(--success)' : value >= 40 ? 'var(--warning)' : 'var(--error)' }} />
                          </div>
                        </div>
                      ))}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5 }}>{codeReview.summary}</div>
                  </>
                )}
              </div>
            )}

            <div style={{
              background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)', padding: 'var(--space-4)', minHeight: '100px',
              fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6, maxHeight: '300px', overflowY: 'auto'
            }}>
              {isLoadingFeedback
                ? <div className="flex-center" style={{ gap: 'var(--space-2)' }}><Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> AI Analyzing Code & Optimization Strategy...</div>
                : <FormattedText text={feedbackText || 'Great work completing this challenge!'} />
              }
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
              {hasPassedAll ? (
                <>
                  <button className="btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => {
                    setIsFeedbackOpen(false);
                    setActiveTab('world');
                  }}>
                    Back to Map
                  </button>
                  <button className="btn-primary" style={{ flex: 2, justifyContent: 'center' }} onClick={handleNextQuestion}>
                    <span>Next Question Q{subLevelIdx + 1}</span>
                    <ArrowRight size={16} />
                  </button>
                </>
              ) : (
                <button className="btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setIsFeedbackOpen(false)}>
                  Keep Trying
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* LEFT PANEL: Problem Statement */}
      <div className="challenge-panel" style={{ borderRight: '1px solid var(--border-subtle)' }}>
        <div style={{
          padding: 'var(--space-3)', borderBottom: '1px solid var(--border-subtle)',
          background: 'var(--bg-surface)', display: 'flex', alignItems: 'center', gap: 'var(--space-3)'
        }}>
          <button onClick={() => setActiveTab('world')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <ArrowLeft size={18} />
          </button>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              {challenge.difficulty} • {challenge.type}
            </div>
            <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)' }}>{challenge.title}</h2>
          </div>
        </div>

        <div className="challenge-panel-scrollable">
          <div style={{
            background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
            padding: 'var(--space-3)', borderRadius: 'var(--radius-md)',
            fontSize: '13px', color: 'var(--text-muted)', marginBottom: 'var(--space-4)'
          }}>
            <div style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: 'var(--space-2)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: '12px' }}>
              <Sparkles size={14} /> Context
            </div>
            {challenge.storyContext}
          </div>

          <h3 style={{ fontSize: '13px', fontWeight: 600, marginBottom: 'var(--space-2)' }}>Objective</h3>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: 'var(--space-4)', lineHeight: 1.6 }}>{challenge.description}</p>

          <h3 style={{ fontSize: '13px', fontWeight: 600, marginBottom: 'var(--space-3)' }}>Test Suite</h3>
          {challenge.testCases.map((tc, idx) => {
            const result = testResults.find(r => r.test_id === tc.id) || testResults[idx];
            return (
              <div key={tc.id} style={{
                background: result ? (result.passed ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)') : 'var(--bg-elevated)',
                border: `1px solid ${result ? (result.passed ? 'var(--success)' : 'var(--error)') : 'var(--border-subtle)'}`,
                padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-2)', fontSize: '13px'
              }}>
                <div style={{ fontWeight: 600, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {result ? (result.passed ? <CheckCircle size={14} color="var(--success)" /> : <XCircle size={14} color="var(--error)" />) : <span style={{ width: 14, height: 14, borderRadius: '50%', background: 'var(--border-bright)' }} />}
                  {tc.description || `Test ${idx + 1}`}
                </div>
                {tc.input && (
                  <div style={{ marginBottom: '6px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px', textTransform: 'uppercase' }}>Input</div>
                    <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', background: 'var(--bg-surface)', padding: '6px 8px', borderRadius: '4px', whiteSpace: 'pre-wrap', border: '1px solid var(--border-subtle)' }}>{tc.input}</div>
                  </div>
                )}
                <div style={{ marginBottom: result ? '6px' : '0' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px', textTransform: 'uppercase' }}>Expected Output</div>
                  <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-main)', background: 'var(--bg-surface)', padding: '6px 8px', borderRadius: '4px', whiteSpace: 'pre-wrap', border: '1px solid var(--border-subtle)' }}>{tc.expectedOutput}</div>
                </div>
                {result && (
                  <div>
                    <div style={{ 
                      fontSize: '11px', 
                      color: result.passed ? 'var(--success)' : 'var(--error)', 
                      marginBottom: '2px', 
                      textTransform: 'uppercase',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}>
                      <span>Your Output</span>
                      <span>{result.passed ? '✓ MATCH' : '✗ MISMATCH'}</span>
                    </div>
                    <div style={{ 
                      fontFamily: 'var(--font-mono)', 
                      color: result.passed ? 'var(--success)' : 'var(--error)', 
                      background: result.passed ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.1)', 
                      padding: '6px 8px', 
                      borderRadius: '4px', 
                      whiteSpace: 'pre-wrap', 
                      border: `1px solid ${result.passed ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.2)'}` 
                    }}>
                      {result.actual_output !== undefined && result.actual_output !== '' ? result.actual_output : '(No output / None)'}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* CENTER PANEL: Code Editor */}
      <div className="challenge-panel" style={{ background: 'var(--bg-surface)' }}>
        <div style={{
          padding: 'var(--space-2) var(--space-4)', borderBottom: '1px solid var(--border-subtle)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-surface)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <Terminal size={14} />
            <select 
              value={selectedLanguage}
              onChange={(e) => {
                const lang = e.target.value;
                setSelectedLanguage(lang);
                generateChallenge(lang);
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-main)',
                fontFamily: 'var(--font-mono)',
                fontSize: '13px',
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="python">Python</option>
              <option value="javascript">JavaScript</option>
              <option value="typescript">TypeScript</option>
              <option value="java">Java</option>
              <option value="cpp">C++</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <button onClick={handleSwapChallenge} disabled={isSwapping || isExecuting} className="btn-secondary" title="Try an alternate question for this node">
              {isSwapping ? <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <RotateCcw size={14} />}
              <span className="hide-mobile">Swap Question</span>
            </button>
            <button onClick={() => setCode(challenge.initialCode)} className="btn-secondary">
              <RotateCcw size={14} /> <span className="hide-mobile">Reset</span>
            </button>
            <button onClick={handleRunCode} disabled={isExecuting} className="btn-secondary">
              {isExecuting ? <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Play size={14} />} 
              <span className="hide-mobile">Run</span>
            </button>
            <button onClick={handleSubmit} disabled={isExecuting} className="btn-primary">
              <Zap size={14} /> <span className="hide-mobile">Submit</span>
            </button>
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          <Editor
            height="100%"
            language={selectedLanguage}
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

        <div style={{ height: '200px', minHeight: '200px', maxHeight: '200px', flexShrink: 0, borderTop: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', background: 'var(--bg-elevated)' }}>
          <div style={{ padding: 'var(--space-2) var(--space-4)', borderBottom: '1px solid var(--border-subtle)', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>Console</span>
            {testResults.length > 0 && <span style={{ color: hasPassedAll ? 'var(--success)' : 'var(--error)' }}>{testResults.filter(r => r.passed).length}/{testResults.length} Passed</span>}
          </div>
          <div style={{ flex: 1, padding: 'var(--space-3) var(--space-4)', fontFamily: 'var(--font-mono)', fontSize: '13px', overflowY: 'auto', whiteSpace: 'pre-wrap' }}>
            {output || 'Ready to run tests...'}
          </div>
        </div>
      </div>

      {/* RIGHT PANEL: AI Teacher */}
      <AITeacherPanel challengeId={challenge.title} userCode={code} />
    </div>
  );
};
