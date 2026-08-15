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
  Search,
  Activity,
  LogOut,
  Zap,
  TrendingUp,
  Server,
  Database,
  Lock,
  Eye,
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

interface AdminDashboardPortalProps {
  onSwitchToStudentView?: () => void;
}

export const AdminDashboardPortal: React.FC<AdminDashboardPortalProps> = ({ onSwitchToStudentView }) => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'challenges' | 'ai' | 'logs'>('overview');

  // Overview & Metrics state
  const [llmUsage, setLlmUsage] = useState({ total_calls: 0, total_tokens: 0, avg_latency_ms: 0 });
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(false);

  // Users state
  const [usersList, setUsersList] = useState<AdminUser[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
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
    if (activeTab === 'overview') { fetchMetrics(); fetchUsers(); }
    if (activeTab === 'users') fetchUsers();
    if (activeTab === 'challenges') fetchChallenges();
    if (activeTab === 'ai') fetchMetrics();
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
        body: JSON.stringify({ review_status: reviewStatus, comments: `Reviewed via Admin Portal by ${user?.username}` })
      });
      if (resp.ok) {
        await fetchChallenges();
      }
    } catch (e) {
      console.error("Review challenge error:", e);
    }
  };

  const filteredUsers = usersList.filter(u => {
    const matchesSearch = u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          u.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const activeUsersCount = usersList.filter(u => u.is_active).length;

  return (
    <div style={{
      minHeight: '100dvh',
      width: '100%',
      background: '#090a16',
      color: '#f8fafc',
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      display: 'flex',
      flexDirection: 'column'
    }}>

      {/* ── TOP EXECUTIVE CONTROL HEADER ── */}
      <header style={{
        height: '64px',
        background: 'rgba(15, 17, 35, 0.95)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        backdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '10px',
            background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)'
          }}>
            <ShieldAlert size={20} color="#ffffff" />
          </div>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 800, letterSpacing: '-0.01em', color: '#ffffff' }}>
              CODE REALM <span style={{ color: '#ef4444', fontWeight: 700, fontSize: '11px', padding: '2px 6px', background: 'rgba(239,68,68,0.15)', borderRadius: '4px', marginLeft: '6px' }}>ADMIN TOWER</span>
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>Standalone Control Portal</div>
          </div>
        </div>

        {/* User Identity & Global Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff' }}>
              {user?.full_name || user?.username}
            </div>
            <div style={{ fontSize: '11px', color: '#a5b4fc', fontWeight: 600 }}>
              {user?.role === 'super_admin' ? '👑 SUPER ADMIN' : '🛡️ ADMINISTRATOR'}
            </div>
          </div>

          {onSwitchToStudentView && (
            <button
              onClick={onSwitchToStudentView}
              style={{
                background: 'rgba(99, 102, 241, 0.12)',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                color: '#a5b4fc',
                padding: '7px 14px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease'
              }}
            >
              <Eye size={14} /> Preview Student View
            </button>
          )}

          <button
            onClick={logout}
            style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#fca5a5',
              padding: '7px 14px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease'
            }}
          >
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      </header>

      {/* ── MAIN ADMIN BODY (LEFT NAVIGATION + CONTENT) ── */}
      <div style={{ display: 'flex', flex: 1, minHeight: 'calc(100vh - 64px)' }}>
        
        {/* Left Admin Navigation Sidebar */}
        <aside style={{
          width: '240px',
          background: '#0d0f22',
          borderRight: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '20px 14px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', padding: '0 8px 8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Management
            </div>

            {[
              { id: 'overview', label: 'Overview', icon: TrendingUp },
              { id: 'users', label: 'User Roster', icon: Users, count: usersList.length },
              { id: 'challenges', label: 'Content Queue', icon: FileCheck, count: pendingChallenges.length },
              { id: 'ai', label: 'AI Engine & Gateway', icon: Cpu },
              { id: 'logs', label: 'Security & Audit Logs', icon: Activity },
            ].map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as any)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    background: isActive ? 'rgba(239, 68, 68, 0.15)' : 'transparent',
                    border: `1px solid ${isActive ? 'rgba(239, 68, 68, 0.3)' : 'transparent'}`,
                    color: isActive ? '#ffffff' : '#94a3b8',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: isActive ? 700 : 500,
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Icon size={16} color={isActive ? '#ef4444' : '#64748b'} />
                    <span>{item.label}</span>
                  </div>
                  {item.count !== undefined && item.count > 0 && (
                    <span style={{
                      fontSize: '11px', fontWeight: 700, padding: '2px 6px', borderRadius: '10px',
                      background: isActive ? '#ef4444' : 'rgba(255,255,255,0.08)',
                      color: isActive ? '#ffffff' : '#94a3b8'
                    }}>
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div style={{
            padding: '12px',
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '10px',
            fontSize: '11px',
            color: '#64748b'
          }}>
            <div style={{ fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>System Health</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#34d399' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399' }} /> PostgreSQL Online
            </div>
          </div>
        </aside>

        {/* Right Main Dashboard Workspace */}
        <main style={{ flex: 1, padding: '28px clamp(16px, 3vw, 36px)', overflowY: 'auto', background: '#090a16' }}>
          
          {/* ── 1. EXECUTIVE OVERVIEW TAB ── */}
          {activeTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div>
                <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.01em' }}>Executive Platform Overview</h2>
                <p style={{ fontSize: '13.5px', color: '#94a3b8', marginTop: '4px' }}>Key performance metrics and platform user status</p>
              </div>

              {isLoadingMetrics && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8', fontSize: '13px' }}>
                  <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> Syncing platform metrics...
                </div>
              )}

              {/* KPI Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 230px), 1fr))', gap: '16px' }}>
                <div style={{ background: '#12142b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase' }}>
                    <span>Registered Explorers</span>
                    <Users size={16} color="#818cf8" />
                  </div>
                  <div style={{ fontSize: '32px', fontWeight: 800, color: '#ffffff', marginTop: '10px', fontFamily: 'var(--font-mono)' }}>
                    {usersList.length}
                  </div>
                  <div style={{ fontSize: '12px', color: '#34d399', marginTop: '6px', fontWeight: 600 }}>
                    {activeUsersCount} Active Accounts
                  </div>
                </div>

                <div style={{ background: '#12142b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase' }}>
                    <span>AI LLM Generations</span>
                    <Cpu size={16} color="#c084fc" />
                  </div>
                  <div style={{ fontSize: '32px', fontWeight: 800, color: '#ffffff', marginTop: '10px', fontFamily: 'var(--font-mono)' }}>
                    {llmUsage.total_calls.toLocaleString()}
                  </div>
                  <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '6px' }}>
                    {llmUsage.total_tokens.toLocaleString()} Tokens Processed
                  </div>
                </div>

                <div style={{ background: '#12142b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase' }}>
                    <span>Avg AI Latency</span>
                    <Zap size={16} color="#fbbf24" />
                  </div>
                  <div style={{ fontSize: '32px', fontWeight: 800, color: '#ffffff', marginTop: '10px', fontFamily: 'var(--font-mono)' }}>
                    {llmUsage.avg_latency_ms} ms
                  </div>
                  <div style={{ fontSize: '12px', color: '#34d399', marginTop: '6px', fontWeight: 600 }}>
                    Groq / Gemini Gateway
                  </div>
                </div>

                <div style={{ background: '#12142b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase' }}>
                    <span>Pending Moderation</span>
                    <FileCheck size={16} color="#ef4444" />
                  </div>
                  <div style={{ fontSize: '32px', fontWeight: 800, color: '#ffffff', marginTop: '10px', fontFamily: 'var(--font-mono)' }}>
                    {pendingChallenges.length}
                  </div>
                  <div style={{ fontSize: '12px', color: pendingChallenges.length > 0 ? '#fca5a5' : '#34d399', marginTop: '6px', fontWeight: 600 }}>
                    {pendingChallenges.length > 0 ? 'Requires Review' : 'Queue Clear'}
                  </div>
                </div>
              </div>

              {/* Server Stack Status */}
              <div style={{ background: '#12142b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '24px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#ffffff', marginBottom: '16px' }}>Infrastructure Readiness</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                  {[
                    { name: 'Supabase PostgreSQL DB', desc: 'Primary persistent data store', icon: Database, status: 'Healthy', color: '#34d399' },
                    { name: 'Upstash Redis Cache', desc: 'Rate limiting & session TTL', icon: Server, status: 'Connected', color: '#34d399' },
                    { name: 'FastAPI Execution Engine', desc: 'Docker isolated sandbox', icon: Cpu, status: 'Active', color: '#34d399' },
                    { name: 'JWT Auth & Argon2id', desc: 'Security & hashing layer', icon: Lock, status: 'Enforced', color: '#34d399' },
                  ].map(item => {
                    const Icon = item.icon;
                    return (
                      <div key={item.name} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                          <Icon size={18} color="#818cf8" />
                          <div style={{ fontWeight: 700, fontSize: '13px', color: '#ffffff' }}>{item.name}</div>
                        </div>
                        <div style={{ fontSize: '11.5px', color: '#94a3b8', marginBottom: '8px' }}>{item.desc}</div>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: item.color, display: 'flex', alignItems: 'center', gap: '4px' }}>
                          ● {item.status}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ── 2. USER ROSTER TAB ── */}
          {activeTab === 'users' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '14px' }}>
                <div>
                  <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#ffffff' }}>User Roster Management</h2>
                  <p style={{ fontSize: '13.5px', color: '#94a3b8', marginTop: '2px' }}>Search, sanction, and manage explorer accounts</p>
                </div>

                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    style={{
                      background: '#12142b', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px',
                      color: '#ffffff', padding: '8px 12px', fontSize: '13px', outline: 'none'
                    }}
                  >
                    <option value="all">All Roles</option>
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                    <option value="super_admin">Super Admin</option>
                  </select>

                  <div style={{ position: 'relative', width: '260px' }}>
                    <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                    <input
                      type="text"
                      placeholder="Search name or email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{
                        width: '100%', padding: '8px 12px 8px 36px', background: '#12142b',
                        border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px',
                        color: '#ffffff', fontSize: '13px', outline: 'none'
                      }}
                    />
                  </div>
                </div>
              </div>

              <div style={{ background: '#12142b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', overflow: 'hidden' }}>
                {isLoadingUsers ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                    <Loader size={20} style={{ animation: 'spin 1s linear infinite' }} /> Loading user database...
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8', fontSize: '11.5px', textTransform: 'uppercase' }}>
                          <th style={{ padding: '14px 18px' }}>User</th>
                          <th style={{ padding: '14px 18px' }}>Email</th>
                          <th style={{ padding: '14px 18px' }}>Role</th>
                          <th style={{ padding: '14px 18px' }}>Status</th>
                          <th style={{ padding: '14px 18px' }}>Created</th>
                          <th style={{ padding: '14px 18px', textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUsers.map((u, i) => (
                          <tr key={u.id} style={{ borderBottom: i < filteredUsers.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                            <td style={{ padding: '14px 18px', fontWeight: 600, color: '#ffffff' }}>
                              {u.full_name || u.username} <span style={{ fontSize: '11px', color: '#64748b' }}>(@{u.username})</span>
                            </td>
                            <td style={{ padding: '14px 18px', color: '#94a3b8', fontFamily: 'var(--font-mono)' }}>{u.email}</td>
                            <td style={{ padding: '14px 18px' }}>
                              <span style={{
                                padding: '3px 8px', borderRadius: '4px', fontSize: '10.5px', fontWeight: 700,
                                background: u.role === 'super_admin' ? 'rgba(239, 68, 68, 0.2)' : u.role === 'admin' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255,255,255,0.06)',
                                color: u.role === 'super_admin' ? '#ef4444' : u.role === 'admin' ? '#fbbf24' : '#94a3b8',
                                border: '1px solid currentColor'
                              }}>
                                {u.role.toUpperCase()}
                              </span>
                            </td>
                            <td style={{ padding: '14px 18px' }}>
                              <span style={{ color: u.is_active ? '#34d399' : '#ef4444', fontWeight: 600, fontSize: '12px' }}>
                                {u.is_active ? 'Active' : 'Suspended'}
                              </span>
                            </td>
                            <td style={{ padding: '14px 18px', color: '#64748b', fontSize: '12px' }}>
                              {new Date(u.created_at).toLocaleDateString()}
                            </td>
                            <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                              <button
                                onClick={() => setSanctionModalUser(u)}
                                style={{
                                  background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)',
                                  color: '#fca5a5', borderRadius: '6px', padding: '5px 10px', fontSize: '12px',
                                  cursor: 'pointer', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px'
                                }}
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
            </div>
          )}

          {/* ── 3. CONTENT MODERATION QUEUE TAB ── */}
          {activeTab === 'challenges' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#ffffff' }}>Content Moderation Queue</h2>
                <p style={{ fontSize: '13.5px', color: '#94a3b8', marginTop: '2px' }}>Approve, flag, or retire AI-generated challenge nodes</p>
              </div>

              <div style={{ background: '#12142b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '24px' }}>
                {isLoadingChallenges ? (
                  <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>
                    <Loader size={18} style={{ animation: 'spin 1s linear infinite' }} /> Loading pending challenges...
                  </div>
                ) : pendingChallenges.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                    <CheckCircle size={36} color="#34d399" style={{ marginBottom: '10px' }} />
                    <div style={{ fontSize: '15px', fontWeight: 700, color: '#ffffff' }}>No Pending Challenges</div>
                    <div style={{ fontSize: '13px', marginTop: '4px' }}>All AI generated nodes are approved or active in the curriculum graph.</div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {pendingChallenges.map(c => (
                      <div key={c.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '16px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '15px', color: '#ffffff' }}>{c.title}</div>
                          <div style={{ fontSize: '12.5px', color: '#94a3b8', marginTop: '4px' }}>
                            Node: <span style={{ color: '#818cf8', fontFamily: 'var(--font-mono)' }}>{c.node_id}</span> · Language: {c.language} · Difficulty: {c.difficulty}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <button
                            onClick={() => handleReviewChallenge(c.id, 'approved')}
                            style={{ background: '#10b981', border: 'none', color: '#ffffff', padding: '7px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                          >
                            <CheckCircle size={14} /> Approve
                          </button>
                          <button
                            onClick={() => handleReviewChallenge(c.id, 'retired')}
                            style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', padding: '7px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                          >
                            <XCircle size={14} /> Retire
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── 4. AI ENGINE & GATEWAY TAB ── */}
          {activeTab === 'ai' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#ffffff' }}>AI Gateway & LLM Monitor</h2>
                <p style={{ fontSize: '13.5px', color: '#94a3b8', marginTop: '2px' }}>API token usage analytics and model fallbacks</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '16px' }}>
                <div style={{ background: '#12142b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '20px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Primary AI Model</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#818cf8', marginTop: '8px' }}>Gemini 3.6 Flash</div>
                  <div style={{ fontSize: '12px', color: '#34d399', marginTop: '4px' }}>Active Default Provider</div>
                </div>

                <div style={{ background: '#12142b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '20px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Secondary AI Model</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#c084fc', marginTop: '8px' }}>Groq Llama-3</div>
                  <div style={{ fontSize: '12px', color: '#34d399', marginTop: '4px' }}>High-Speed Fallback</div>
                </div>
              </div>
            </div>
          )}

          {/* ── 5. SECURITY & AUDIT LOGS TAB ── */}
          {activeTab === 'logs' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#ffffff' }}>Security & Action Audit Logs</h2>
                <p style={{ fontSize: '13.5px', color: '#94a3b8', marginTop: '2px' }}>Immutable audit log of administrative actions</p>
              </div>

              <div style={{ background: '#12142b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '24px' }}>
                {isLoadingLogs ? (
                  <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>
                    <Loader size={18} style={{ animation: 'spin 1s linear infinite' }} /> Loading audit trail...
                  </div>
                ) : actionLogs.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>No administrative logs recorded yet.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {actionLogs.map(l => (
                      <div key={l.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', padding: '14px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <Activity size={16} color="#818cf8" />
                          <div>
                            <span style={{ fontWeight: 700, color: '#ffffff' }}>{l.action}</span> on <span style={{ fontFamily: 'var(--font-mono)', color: '#a5b4fc' }}>{l.target_type}:{l.target_id}</span>
                          </div>
                        </div>
                        <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                          {new Date(l.created_at).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

        </main>
      </div>

      {/* Sanction Modal */}
      {sanctionModalUser && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: '#12142b', border: '1px solid rgba(239,68,68,0.4)', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '440px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px', color: '#ef4444' }}>
              <AlertTriangle size={22} />
              <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#ffffff' }}>Sanction @{sanctionModalUser.username}</h3>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '6px' }}>Action Type</label>
              <select
                value={sanctionType}
                onChange={e => setSanctionType(e.target.value)}
                style={{ width: '100%', padding: '10px', background: '#090a16', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', color: '#ffffff', outline: 'none' }}
              >
                <option value="warn">Warn User</option>
                <option value="mute">Mute Chat</option>
                <option value="suspend">Suspend Account</option>
                <option value="ban">Ban User Permanently</option>
              </select>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '6px' }}>Reason for Audit Log</label>
              <textarea
                value={sanctionReason}
                onChange={e => setSanctionReason(e.target.value)}
                placeholder="Specify reason..."
                style={{ width: '100%', height: '90px', padding: '10px', background: '#090a16', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', color: '#ffffff', outline: 'none', resize: 'none' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setSanctionModalUser(null)} style={{ flex: 1, padding: '10px', background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: '#ffffff', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleApplySanction} disabled={isSubmittingSanction || !sanctionReason.trim()} style={{ flex: 1, padding: '10px', background: '#ef4444', border: 'none', color: '#ffffff', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}>
                {isSubmittingSanction ? <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> : 'Apply Sanction'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
