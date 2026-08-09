import React, { useState, useEffect } from 'react';
import { useGame } from '../../context/GameContext';
import { GitHubIntegration } from './GitHubIntegration';
import { API_BASE_URL } from '../../services/api';
import { Briefcase, Building2, Video, Send, Loader, RefreshCw } from 'lucide-react';

const API_BASE = API_BASE_URL;

interface CareerPath {
  id: string;
  name: string;
  role: string;
  description: string;
  matchScore: number;
  skillsRequired: string[];
  nodesCount: number;
  aiReason: string;
}

interface SprintTicket {
  id: string;
  title: string;
  priority: string;
  codeContext: string;
  rewardXp: number;
  skill: string;
}

interface InterviewQuestion {
  question: string;
  topic: string;
  difficulty: string;
  hint: string;
}

interface EvaluationResult {
  overallScore: number;
  breakdown: { technicalDepth: number; problemSolving: number; communication: number; codeQuality: number };
  feedback: string;
}

export const CareerCompany: React.FC = () => {
  const { profile } = useGame();
  const [activeTab, setActiveTab] = useState<'career' | 'company' | 'interview'>('career');

  // Career state
  const [careerPaths, setCareerPaths] = useState<CareerPath[]>([]);
  const [isLoadingCareers, setIsLoadingCareers] = useState(false);

  // Sprint board state
  const [tickets, setTickets] = useState<SprintTicket[]>([]);
  const [isLoadingTickets, setIsLoadingTickets] = useState(false);

  // Interview state
  const [interviewQ, setInterviewQ] = useState<InterviewQuestion | null>(null);
  const [isLoadingQ, setIsLoadingQ] = useState(false);
  const [answer, setAnswer] = useState('');
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);

  const skillPayload = {
    skill_ratings: profile.skills,
    rank_rating: profile.rankRating,
  };

  useEffect(() => {
    if (activeTab === 'career' && careerPaths.length === 0) fetchCareers();
    if (activeTab === 'company' && tickets.length === 0) fetchTickets();
    if (activeTab === 'interview' && !interviewQ) fetchInterviewQ();
  }, [activeTab]);

  const fetchCareers = async () => {
    setIsLoadingCareers(true);
    try {
      const resp = await fetch(`${API_BASE}/career/recommend`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(skillPayload),
      });
      const data = await resp.json();
      setCareerPaths(data.paths || []);
    } catch {
      setCareerPaths([{
        id: 'fullstack', name: 'Full-Stack Developer', role: 'End-to-End Product Creator',
        description: 'Build complete web products from React frontends to FastAPI backends.',
        matchScore: 88, skillsRequired: ['React', 'Python', 'FastAPI', 'PostgreSQL', 'TypeScript'],
        nodesCount: 30, aiReason: 'Your skill profile is well suited for full-stack development.',
      }]);
    } finally {
      setIsLoadingCareers(false);
    }
  };

  const fetchTickets = async () => {
    setIsLoadingTickets(true);
    try {
      const resp = await fetch(`${API_BASE}/career/sprint-tickets`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(skillPayload),
      });
      const data = await resp.json();
      setTickets(data.tickets || []);
    } catch {
      setTickets([]);
    } finally {
      setIsLoadingTickets(false);
    }
  };

  const fetchInterviewQ = async () => {
    setIsLoadingQ(true);
    setEvaluation(null);
    setAnswer('');
    try {
      const resp = await fetch(`${API_BASE}/career/interview/question`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(skillPayload),
      });
      const data = await resp.json();
      setInterviewQ({ question: data.question, topic: data.topic, difficulty: data.difficulty, hint: data.hint });
    } catch {
      setInterviewQ({ question: 'Explain how a hash table works. What happens during a collision?', topic: 'Algorithms', difficulty: 'Medium', hint: 'Think about what happens when two keys hash to the same bucket.' });
    } finally {
      setIsLoadingQ(false);
    }
  };

  const handleSubmitInterview = async () => {
    if (!interviewQ || !answer.trim()) return;
    setIsEvaluating(true);
    try {
      const resp = await fetch(`${API_BASE}/career/interview/evaluate`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: interviewQ.question, answer, skill: interviewQ.topic }),
      });
      const data = await resp.json();
      setEvaluation(data);
    } catch {
      setEvaluation({ overallScore: 75, breakdown: { technicalDepth: 75, problemSolving: 75, communication: 75, codeQuality: 75 }, feedback: 'Good effort! Review core concepts and try to provide concrete examples.' });
    } finally {
      setIsEvaluating(false);
    }
  };

  const tabBtnStyle = (id: string): React.CSSProperties => ({
    background: activeTab === id ? 'var(--bg-elevated)' : 'transparent',
    border: `1px solid ${activeTab === id ? 'var(--border-subtle)' : 'transparent'}`,
    color: activeTab === id ? 'var(--text-main)' : 'var(--text-muted)',
    padding: 'var(--space-2) var(--space-4)', borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: '13px',
    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 'var(--space-2)', transition: 'all 0.15s',
  });

  const LoadingPlaceholder = ({ text }: { text: string }) => (
    <div className="flex-center" style={{ gap: 'var(--space-3)', padding: 'var(--space-8)', color: 'var(--text-muted)' }}>
      <Loader size={20} style={{ animation: 'spin 1s linear infinite' }} />
      <span>{text}</span>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>

      {/* Tab Switcher */}
      <div style={{ display: 'flex', gap: 'var(--space-2)', background: 'var(--bg-surface)', padding: 'var(--space-2)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', overflowX: 'auto' }}>
        <button onClick={() => setActiveTab('career')} style={tabBtnStyle('career')}><Briefcase size={16} /> Career Paths</button>
        <button onClick={() => setActiveTab('company')} style={tabBtnStyle('company')}><Building2 size={16} /> Sprint Board</button>
        <button onClick={() => setActiveTab('interview')} style={tabBtnStyle('interview')}><Video size={16} /> AI Interview</button>
      </div>

      <div>
        {/* ── CAREER PATHS ── */}
        {activeTab === 'career' && (
          <>
            {isLoadingCareers
              ? <LoadingPlaceholder text="AI is analysing your skill ratings..." />
              : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
                  <div className="grid-responsive">
                    {careerPaths.map(path => (
                      <div key={path.id} className="realm-card">
                        <div className="flex-between" style={{ alignItems: 'flex-start', marginBottom: 'var(--space-3)' }}>
                          <div>
                            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Career Journey</div>
                            <h3 style={{ fontSize: '18px', color: 'var(--text-main)', fontWeight: 700 }}>{path.name}</h3>
                            <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600 }}>{path.role}</div>
                          </div>
                          <div style={{ background: 'var(--bg-elevated)', color: 'var(--accent-primary)', fontWeight: 700, fontSize: '13px', padding: 'var(--space-1) var(--space-3)', borderRadius: 'var(--radius-full)', border: '1px solid var(--border-bright)' }}>
                            {path.matchScore}% Match
                          </div>
                        </div>
                        <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 'var(--space-3)' }}>{path.description}</p>
                        {path.aiReason && (
                          <div style={{ fontSize: '13px', color: 'var(--text-dim)', fontStyle: 'italic', marginBottom: 'var(--space-4)', borderLeft: '2px solid var(--border-bright)', paddingLeft: 'var(--space-3)' }}>
                            AI: {path.aiReason}
                          </div>
                        )}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
                          {path.skillsRequired.map((skill, i) => (
                            <span key={i} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', padding: '2px 8px', borderRadius: 'var(--radius-sm)', fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>{skill}</span>
                          ))}
                        </div>
                        <button className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                          Select Path ({path.nodesCount} Nodes)
                        </button>
                      </div>
                    ))}
                  </div>
                  <div>
                    <button onClick={fetchCareers} className="btn-secondary">
                      <RefreshCw size={14} /> Regenerate Recommendations
                    </button>
                  </div>
                  <GitHubIntegration />
                </div>
              )
            }
          </>
        )}

        {/* ── SPRINT BOARD ── */}
        {activeTab === 'company' && (
          <div className="realm-card" style={{ padding: 'var(--space-6)' }}>
            <div className="flex-between" style={{ flexWrap: 'wrap', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
              <div>
                <h2 style={{ fontSize: '20px', color: 'var(--text-main)', fontWeight: 700 }}>Agile Sprint Board</h2>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: 'var(--space-1)' }}>
                  AI-generated tickets targeting your weakest skills
                </div>
              </div>
              <button onClick={fetchTickets} className="btn-secondary">
                <RefreshCw size={14} /> Refresh
              </button>
            </div>
            {isLoadingTickets
              ? <LoadingPlaceholder text="Generating sprint tickets..." />
              : (
                <div className="grid-responsive">
                  {tickets.map(ticket => (
                    <div key={ticket.id} className="realm-card" style={{ background: 'var(--bg-surface)' }}>
                      <div className="flex-between" style={{ marginBottom: 'var(--space-2)' }}>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>{ticket.id}</span>
                        <span style={{
                          fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: 'var(--radius-full)',
                          background: ticket.priority === 'Critical' ? 'rgba(239, 68, 68, 0.1)' : ticket.priority === 'High' ? 'rgba(245, 158, 11, 0.1)' : 'var(--bg-elevated)',
                          color: ticket.priority === 'Critical' ? 'var(--error)' : ticket.priority === 'High' ? 'var(--warning)' : 'var(--text-muted)',
                          border: '1px solid currentColor'
                        }}>{ticket.priority}</span>
                      </div>
                      <h4 style={{ fontSize: '14px', color: 'var(--text-main)', marginBottom: 'var(--space-3)', lineHeight: 1.4, fontWeight: 600 }}>{ticket.title}</h4>
                      <div style={{ background: 'var(--bg-elevated)', padding: 'var(--space-2) var(--space-3)', borderRadius: 'var(--radius-md)', fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)', marginBottom: 'var(--space-4)', whiteSpace: 'pre-wrap' }}>
                        {ticket.codeContext}
                      </div>
                      <div className="flex-between">
                        <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>Improves: {ticket.skill}</span>
                        <button className="btn-secondary" style={{ fontSize: '12px', padding: 'var(--space-1) var(--space-3)' }}>
                          Claim (+{ticket.rewardXp} XP)
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )
            }
          </div>
        )}

        {/* ── AI INTERVIEW ── */}
        {activeTab === 'interview' && (
          <div className="realm-card" style={{ padding: 'var(--space-6)' }}>
            <div className="flex-between" style={{ flexWrap: 'wrap', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                <Video size={24} color="var(--text-main)" />
                <h2 style={{ fontSize: '20px', color: 'var(--text-main)', fontWeight: 700 }}>AI Technical Interview</h2>
              </div>
              <button onClick={fetchInterviewQ} className="btn-secondary">
                <RefreshCw size={14} /> New Question
              </button>
            </div>

            {isLoadingQ
              ? <LoadingPlaceholder text="AI Senior Architect is preparing your question..." />
              : interviewQ && (
                <>
                  <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', padding: 'var(--space-5)', borderRadius: 'var(--radius-lg)', marginBottom: 'var(--space-5)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
                      <span style={{ fontWeight: 700, color: 'var(--text-muted)', fontSize: '12px', textTransform: 'uppercase' }}>Interviewer (AI Senior Architect) — {interviewQ.topic} · {interviewQ.difficulty}</span>
                    </div>
                    <p style={{ fontSize: '15px', color: 'var(--text-main)', lineHeight: 1.6 }}>"{interviewQ.question}"</p>
                    {!evaluation && (
                      <div style={{ marginTop: 'var(--space-3)', fontSize: '13px', color: 'var(--text-dim)', fontStyle: 'italic' }}>
                        💡 Hint: {interviewQ.hint}
                      </div>
                    )}
                  </div>

                  {!evaluation ? (
                    <>
                      <textarea
                        value={answer}
                        onChange={e => setAnswer(e.target.value)}
                        placeholder="Type your technical explanation here..."
                        style={{ width: '100%', height: '160px', background: 'var(--bg-surface)', border: '1px solid var(--border-dark)', borderRadius: 'var(--radius-md)', padding: 'var(--space-4)', color: 'var(--text-main)', fontSize: '14px', outline: 'none', marginBottom: 'var(--space-4)', resize: 'vertical' }}
                      />
                      <button onClick={handleSubmitInterview} disabled={isEvaluating || !answer.trim()} className="btn-primary">
                        {isEvaluating
                          ? <><Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> Evaluating...</>
                          : <><Send size={16} /> Submit for Evaluation</>
                        }
                      </button>
                    </>
                  ) : (
                    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-bright)', padding: 'var(--space-6)', borderRadius: 'var(--radius-lg)' }}>
                      <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-main)', marginBottom: 'var(--space-5)' }}>
                        Score: {evaluation.overallScore}%
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 'var(--space-3)', marginBottom: 'var(--space-5)' }}>
                        {Object.entries(evaluation.breakdown).map(([key, val]) => (
                          <div key={key} style={{ background: 'var(--bg-elevated)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                            <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: 'var(--space-2)', textTransform: 'uppercase', fontWeight: 600 }}>{key.replace(/([A-Z])/g, ' $1').trim()}</div>
                            <div style={{ fontWeight: 700, fontSize: '20px', color: 'var(--text-main)' }}>{val}%</div>
                          </div>
                        ))}
                      </div>
                      <div style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.6, borderLeft: '3px solid var(--border-bright)', paddingLeft: 'var(--space-4)' }}>
                        {evaluation.feedback}
                      </div>
                      <button onClick={fetchInterviewQ} className="btn-secondary" style={{ marginTop: 'var(--space-5)' }}>
                        <RefreshCw size={14} /> Try Another Question
                      </button>
                    </div>
                  )}
                </>
              )
            }
          </div>
        )}
      </div>
    </div>
  );
};
