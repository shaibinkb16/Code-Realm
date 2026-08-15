import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../services/api';
import {
  ShieldAlert,
  Users,
  Cpu,
  FileCheck,
  Ban,
  CheckCircle,
  XCircle,
  Loader,
  RefreshCw,
  Search,
  Activity,
  AlertTriangle
} from 'lucide-react';

const API_BASE = API_BASE_URL;

interface AdminUser {
  id: string;
  email: string;
  username: string;
  full_name: string | null;
  role: string;
  is_active: boolean;
  created_at: string;
}

interface ActionLog {
  id: string;
  admin_user_id: string | null;
  action: string;
  target_type: string;
  target_id: string;
  created_at: string;
}

interface PendingChallenge {
  id: string;
  title: string;
  difficulty: string;
  language: string;
  node_id: string;
  created_at: string;
}

export const AdminConsole: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'metrics' | 'users' | 'challenges' | 'logs'>('metrics');

  // Metrics state
  const [llmUsage, setLlmUsage] = useState({ total_calls: 0, total_tokens: 0, avg_latency_ms: 0 });
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(false);

  // Users state
  const [usersList, setUsersList] = useState<AdminUser[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [sanctionModalUser, setSanctionModalUser] = useState<AdminUser | null>(null);
  const [sanctionReason, setSanctionReason] = useState('');
  const [sanctionType, setSanctionType] = useState('warn');
  const [isSubmittingSanction, setIsSubmittingSanction] = useState(false);

  // Pending challenges state
  const [pendingChallenges, setPendingChallenges] = useState<PendingChallenge[]>([]);
  const [isLoadingChallenges, setIsLoadingChallenges] = useState(false);

  // Logs state
  const [actionLogs, setActionLogs] = useState<ActionLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  const getHeaders = () => {
    const token = localStorage.getItem('coderealm_token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    };
  };

  useEffect(() => {
    fetchMetrics();
    fetchUsers();
  }, []);

  useEffect(() => {
    if (activeTab === 'metrics') fetchMetrics();
    if (activeTab === 'users') fetchUsers();
    if (activeTab === 'challenges') fetchChallenges();
    if (activeTab === 'logs') fetchLogs();
  }, [activeTab]);

  const fetchMetrics = async () => {
    setIsLoadingMetrics(true);
    try {
      const resp = await fetch(`${API_BASE}/admin/llm/usage`, { headers: getHeaders() });
      if (resp.ok) {
        const data = await resp.json();
        setLlmUsage(data.usage || { total_calls: 0, total_tokens: 0, avg_latency_ms: 0 });
      }
    } catch (e) {
      console.warn("Metrics fetch error:", e);
    } finally {
      setIsLoadingMetrics(false);
    }
  };

  const fetchUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const resp = await fetch(`${API_BASE}/admin/users`, { headers: getHeaders() });
      if (resp.ok) {
        const data = await resp.json();
        setUsersList(data.users || []);
      }
    } catch (e) {
      console.warn("Users fetch error:", e);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const fetchChallenges = async () => {
    setIsLoadingChallenges(true);
    try {
      const resp = await fetch(`${API_BASE}/admin/challenges/pending`, { headers: getHeaders() });
      if (resp.ok) {
        const data = await resp.json();
        setPendingChallenges(data.pending || []);
      }
    } catch (e) {
      console.warn("Challenges fetch error:", e);
    } finally {
      setIsLoadingChallenges(false);
    }
  };

  const fetchLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const resp = await fetch(`${API_BASE}/admin/logs/admin-actions`, { headers: getHeaders() });
      if (resp.ok) {
        const data = await resp.json();
        setActionLogs(data.action_logs || []);
      }
    } catch (e) {
      console.warn("Logs fetch error:", e);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const handleApplySanction = async () => {
    if (!sanctionModalUser || !sanctionReason.trim() || isSubmittingSanction) return;
    setIsSubmittingSanction(true);
    try {
      const resp = await fetch(`${API_BASE}/admin/users/${sanctionModalUser.id}/sanction`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ type: sanctionType, reason: sanctionReason })
      });
      if (resp.ok) {
        setSanctionModalUser(null);
        setSanctionReason('');
        await fetchUsers();
      }
    } catch (e) {
      console.error("Sanction error:", e);
    } finally {
      setIsSubmittingSanction(false);
    }
  };

  const handleReviewChallenge = async (challengeId: string, reviewStatus: 'approved' | 'flagged' | 'retired') => {
    try {
      const resp = await fetch(`${API_BASE}/admin/challenges/${challengeId}/review`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ review_status: reviewStatus, comments: `Reviewed via Admin Console by ${user?.username}` })
      });
      if (resp.ok) {
        await fetchChallenges();
      }
    } catch (e) {
      console.error("Review challenge error:", e);
    }
  };

  const filteredUsers = usersList.filter(u =>
    u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const subTabStyle = (id: string): React.CSSProperties => ({
    background: activeTab === id ? 'var(--bg-elevated)' : 'transparent',
    border: `1px solid ${activeTab === id ? 'var(--border-bright)' : 'transparent'}`,
    color: activeTab === id ? 'var(--text-main)' : 'var(--text-muted)',
    padding: '8px 16px',
    borderRadius: 'var(--radius-md)',
    fontWeight: 600,
    fontSize: '13px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 0.15s ease',
    whiteSpace: 'nowrap'
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', width: '100%' }}>

      {/* Header Banner */}
      <div className="realm-card" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-4)', border: '1px solid var(--accent-primary)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
          <div style={{ background: 'var(--bg-elevated)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-bright)' }}>
            <ShieldAlert size={32} color="var(--accent-primary)" />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              System Command Center
            </div>
            <h1 style={{ fontSize: '22px', color: 'var(--text-main)', fontWeight: 700 }}>
              Admin Console
            </h1>
            <div style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '2px' }}>
              Authenticated as: <strong style={{ color: 'var(--text-main)' }}>{user?.username}</strong> ({user?.role || 'admin'})
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <button onClick={() => { fetchMetrics(); fetchUsers(); }} className="btn-secondary">
            <RefreshCw size={14} /> Refresh Data
          </button>
        </div>
      </div>

      {/* Tab Switcher */}
      <div style={{ display: 'flex', gap: 'var(--space-2)', background: 'var(--bg-surface)', padding: 'var(--space-2)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', overflowX: 'auto' }}>
        <button onClick={() => setActiveTab('metrics')} style={subTabStyle('metrics')}><Cpu size={16} /> Analytics & LLM</button>
        <button onClick={() => setActiveTab('users')} style={subTabStyle('users')}><Users size={16} /> User Management ({usersList.length})</button>
        <button onClick={() => setActiveTab('challenges')} style={subTabStyle('challenges')}><FileCheck size={16} /> Content Queue</button>
        <button onClick={() => setActiveTab('logs')} style={subTabStyle('logs')}><Activity size={16} /> Audit Trail</button>
      </div>

      {/* Main Tab Content */}
      <div>
        {/* ── 1. METRICS & LLM ── */}
        {activeTab === 'metrics' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
            {isLoadingMetrics && (
              <div className="flex-center" style={{ gap: 'var(--space-2)', color: 'var(--text-muted)', fontSize: '13px' }}>
                <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> Fetching system analytics...
              </div>
            )}
            <div className="grid-responsive">
              <div className="realm-card">
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>Total AI Generations</div>
                <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>
                  {llmUsage.total_calls.toLocaleString()}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '4px' }}>AI Mentor & Challenge Prompt Queries</div>
              </div>

              <div className="realm-card">
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>Tokens Processed</div>
                <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>
                  {llmUsage.total_tokens.toLocaleString()}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '4px' }}>Input & Output Tokens Consumed</div>
              </div>

              <div className="realm-card">
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>Average API Latency</div>
                <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>
                  {llmUsage.avg_latency_ms} ms
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '4px' }}>Response Time Benchmark</div>
              </div>
            </div>

            <div className="realm-card">
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main)', marginBottom: 'var(--space-4)' }}>System Status</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-3)' }}>
                {[
                  { name: 'PostgreSQL Database', status: 'Healthy', color: 'var(--success)' },
                  { name: 'Redis Cache (Upstash)', status: 'Connected', color: 'var(--success)' },
                  { name: 'AI LLM Provider Gateway', status: 'Operational', color: 'var(--success)' },
                  { name: 'Isolated Code Execution Sandbox', status: 'Ready', color: 'var(--success)' },
                ].map(s => (
                  <div key={s.name} style={{ background: 'var(--bg-surface)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>{s.name}</div>
                    <div style={{ fontWeight: 700, fontSize: '14px', color: s.color, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color }} />
                      {s.status}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── 2. USER MANAGEMENT ── */}
        {activeTab === 'users' && (
          <div className="realm-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: 'var(--space-4)', borderBottom: '1px solid var(--border-subtle)', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-3)' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)' }}>User Roster & Sanctions</h3>
              <div style={{ position: 'relative', width: '100%', maxWidth: '300px' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                <input
                  type="text"
                  placeholder="Search username or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%', padding: '8px 12px 8px 36px', background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-bright)', borderRadius: 'var(--radius-md)',
                    color: 'var(--text-main)', fontSize: '13px', outline: 'none'
                  }}
                />
              </div>
            </div>

            {isLoadingUsers ? (
              <div className="flex-center" style={{ padding: 'var(--space-8)', gap: 'var(--space-2)', color: 'var(--text-muted)' }}>
                <Loader size={18} style={{ animation: 'spin 1s linear infinite' }} /> Loading user roster...
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)', fontSize: '12px', textTransform: 'uppercase' }}>
                      <th style={{ padding: '12px 16px' }}>User</th>
                      <th style={{ padding: '12px 16px' }}>Email</th>
                      <th style={{ padding: '12px 16px' }}>Role</th>
                      <th style={{ padding: '12px 16px' }}>Status</th>
                      <th style={{ padding: '12px 16px' }}>Joined</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u, i) => (
                      <tr key={u.id} style={{ borderBottom: i < filteredUsers.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                        <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-main)' }}>
                          {u.full_name || u.username} <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>(@{u.username})</span>
                        </td>
                        <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{u.email}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{
                            padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700,
                            background: u.role === 'super_admin' ? 'rgba(239, 68, 68, 0.15)' : u.role === 'admin' ? 'rgba(245, 158, 11, 0.15)' : 'var(--bg-elevated)',
                            color: u.role === 'super_admin' ? 'var(--error)' : u.role === 'admin' ? 'var(--warning)' : 'var(--text-muted)',
                            border: '1px solid currentColor'
                          }}>
                            {u.role.toUpperCase()}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ color: u.is_active ? 'var(--success)' : 'var(--error)', fontWeight: 600, fontSize: '12px' }}>
                            {u.is_active ? 'Active' : 'Suspended'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', color: 'var(--text-dim)', fontSize: '12px' }}>
                          {new Date(u.created_at).toLocaleDateString()}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                          <button
                            onClick={() => setSanctionModalUser(u)}
                            className="btn-secondary"
                            style={{ padding: '4px 10px', fontSize: '12px', color: 'var(--error)', borderColor: 'rgba(239,68,68,0.3)' }}
                          >
                            <Ban size={12} /> Sanction
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── 3. CONTENT QUEUE ── */}
        {activeTab === 'challenges' && (
          <div className="realm-card">
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)', marginBottom: 'var(--space-4)' }}>
              Pending AI Challenge Review Queue
            </h3>
            {isLoadingChallenges ? (
              <div className="flex-center" style={{ padding: 'var(--space-6)', gap: 'var(--space-2)', color: 'var(--text-muted)' }}>
                <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> Loading pending challenges...
              </div>
            ) : pendingChallenges.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--text-muted)' }}>
                <CheckCircle size={32} color="var(--success)" style={{ marginBottom: 'var(--space-2)' }} />
                <div>All AI-generated challenge nodes have been reviewed!</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {pendingChallenges.map(c => (
                  <div key={c.id} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: 'var(--space-4)', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-3)' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-main)' }}>{c.title}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        Node: {c.node_id} · Language: {c.language} · Difficulty: {c.difficulty}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                      <button onClick={() => handleReviewChallenge(c.id, 'approved')} className="btn-primary" style={{ padding: '4px 12px', fontSize: '12px' }}>
                        <CheckCircle size={14} /> Approve
                      </button>
                      <button onClick={() => handleReviewChallenge(c.id, 'retired')} className="btn-secondary" style={{ padding: '4px 12px', fontSize: '12px', color: 'var(--error)', borderColor: 'rgba(239,68,68,0.3)' }}>
                        <XCircle size={14} /> Retire
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── 4. AUDIT TRAIL ── */}
        {activeTab === 'logs' && (
          <div className="realm-card">
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)', marginBottom: 'var(--space-4)' }}>
              Administrative Action Audit Logs
            </h3>
            {isLoadingLogs ? (
              <div className="flex-center" style={{ padding: 'var(--space-6)', gap: 'var(--space-2)', color: 'var(--text-muted)' }}>
                <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> Loading audit trail...
              </div>
            ) : actionLogs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 'var(--space-6)', color: 'var(--text-muted)' }}>No audit logs recorded yet.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {actionLogs.map(l => (
                  <div key={l.id} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                      <Activity size={16} color="var(--text-muted)" />
                      <div>
                        <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{l.action}</span> on <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{l.target_type}:{l.target_id}</span>
                      </div>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                      {new Date(l.created_at).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sanction User Modal */}
      {sanctionModalUser && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-4)' }}>
          <div className="realm-card" style={{ width: '100%', maxWidth: '440px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-3)', color: 'var(--error)' }}>
              <AlertTriangle size={20} />
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)' }}>Sanction @{sanctionModalUser.username}</h3>
            </div>

            <div style={{ marginBottom: 'var(--space-3)' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Action Type</label>
              <select
                value={sanctionType}
                onChange={e => setSanctionType(e.target.value)}
                style={{ width: '100%', padding: '8px', background: 'var(--bg-surface)', border: '1px solid var(--border-dark)', borderRadius: 'var(--radius-md)', color: 'var(--text-main)', outline: 'none' }}
              >
                <option value="warn">Warn User</option>
                <option value="mute">Mute Chat</option>
                <option value="suspend">Suspend Account</option>
                <option value="ban">Ban User Permanently</option>
              </select>
            </div>

            <div style={{ marginBottom: 'var(--space-4)' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Reason for Audit Log</label>
              <textarea
                value={sanctionReason}
                onChange={e => setSanctionReason(e.target.value)}
                placeholder="Explain the violation..."
                style={{ width: '100%', height: '90px', padding: '8px', background: 'var(--bg-surface)', border: '1px solid var(--border-dark)', borderRadius: 'var(--radius-md)', color: 'var(--text-main)', outline: 'none', resize: 'none' }}
              />
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <button onClick={() => setSanctionModalUser(null)} className="btn-secondary" style={{ flex: 1 }}>Cancel</button>
              <button onClick={handleApplySanction} disabled={isSubmittingSanction || !sanctionReason.trim()} className="btn-primary" style={{ flex: 1, background: 'var(--error)', borderColor: 'var(--error)' }}>
                {isSubmittingSanction ? <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> : 'Apply Sanction'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
