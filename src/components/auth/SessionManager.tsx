import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { passkeyService } from '../../services/passkey';
import { ShieldCheck, Monitor, Smartphone, Plus, Trash2, Key } from 'lucide-react';

export const SessionManager: React.FC = () => {
  const [passkeys, setPasskeys] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  const loadSecurityData = async () => {
    setIsLoading(true);
    try {
      const [pkData, sessData] = await Promise.all([
        api.getPasskeys().catch(() => ({ passkeys: [] })),
        api.getSessions().catch(() => ({ sessions: [] }))
      ]);
      setPasskeys(pkData.passkeys || []);
      setSessions(sessData.sessions || []);
    } catch (err: any) {
      console.warn('Security data load warning:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSecurityData();
  }, []);

  const handleAddPasskey = async () => {
    setActionError('');
    setActionSuccess('');
    try {
      await passkeyService.registerPasskey();
      setActionSuccess('Passkey registered successfully!');
      await loadSecurityData();
    } catch (err: any) {
      setActionError(err.message || 'Failed to register passkey.');
    }
  };

  const handleDeletePasskey = async (id: string) => {
    try {
      await api.deletePasskey(id);
      setActionSuccess('Passkey removed.');
      setPasskeys(prev => prev.filter(k => k.id !== id));
    } catch (err: any) {
      setActionError('Failed to remove passkey.');
    }
  };

  const handleRevokeSession = async (id: string) => {
    try {
      await api.revokeSession(id);
      setActionSuccess('Session revoked.');
      setSessions(prev => prev.filter(s => s.id !== id));
    } catch (err: any) {
      setActionError('Failed to revoke session.');
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center text-xs font-mono text-slate-400">
        Loading Account Security Center...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto p-6 bg-slate-900/90 border border-white/10 rounded-2xl shadow-xl font-sans">
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-indigo-400" />
            <span>Account Security & Passkeys</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">Manage cryptographic passkeys & active device sessions</p>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-400 font-mono">
          ✓ {actionSuccess}
        </div>
      )}
      {actionError && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400 font-mono">
          ⚠ {actionError}
        </div>
      )}

      {/* 1. Passkeys Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white font-mono uppercase tracking-wider">Registered Passkeys</h3>
          <button
            type="button"
            onClick={handleAddPasskey}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 border border-indigo-500/50 rounded-lg text-xs font-semibold text-white transition-all shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Passkey</span>
          </button>
        </div>

        {passkeys.length === 0 ? (
          <div className="p-4 bg-white/5 border border-white/5 rounded-xl text-xs text-slate-400 text-center font-mono">
            No passkeys registered yet. Click above to add modern passwordless security.
          </div>
        ) : (
          <div className="space-y-2">
            {passkeys.map((pk) => (
              <div key={pk.id} className="flex items-center justify-between p-3.5 bg-white/5 border border-white/5 rounded-xl">
                <div className="flex items-center space-x-3">
                  <Key className="w-4 h-4 text-indigo-400" />
                  <div>
                    <div className="text-xs font-medium text-white">{pk.name}</div>
                    <div className="text-[11px] text-slate-500 font-mono">Added: {new Date(pk.created_at).toLocaleDateString()}</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeletePasskey(pk.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-400 transition-colors"
                  title="Remove Passkey"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. Active Sessions Section */}
      <div className="space-y-3 pt-4 border-t border-white/10">
        <h3 className="text-sm font-semibold text-white font-mono uppercase tracking-wider">Active Device Sessions</h3>

        {sessions.length === 0 ? (
          <div className="p-4 bg-white/5 border border-white/5 rounded-xl text-xs text-slate-400 text-center font-mono">
            1 active session (current device)
          </div>
        ) : (
          <div className="space-y-2">
            {sessions.map((sess) => (
              <div key={sess.id} className="flex items-center justify-between p-3.5 bg-white/5 border border-white/5 rounded-xl">
                <div className="flex items-center space-x-3">
                  {sess.device_type === 'mobile' ? (
                    <Smartphone className="w-4 h-4 text-slate-400" />
                  ) : (
                    <Monitor className="w-4 h-4 text-slate-400" />
                  )}
                  <div>
                    <div className="text-xs font-medium text-white flex items-center space-x-2">
                      <span>{sess.device_name}</span>
                      {sess.is_current && (
                        <span className="px-1.5 py-0.5 bg-indigo-500/20 text-indigo-300 text-[10px] rounded font-mono">Current Session</span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono">{sess.ip_address} • Last active: {new Date(sess.last_used_at).toLocaleTimeString()}</div>
                  </div>
                </div>
                {!sess.is_current && (
                  <button
                    type="button"
                    onClick={() => handleRevokeSession(sess.id)}
                    className="px-2.5 py-1 text-xs text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 rounded-lg transition-colors font-mono"
                  >
                    Revoke
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
