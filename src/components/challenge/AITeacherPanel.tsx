import React, { useState } from 'react';
import { useGame } from '../../context/GameContext';
import { Bot, Lightbulb, BookOpen, HelpCircle, Code2, Sparkles, CheckCircle2 } from 'lucide-react';
import { API_BASE_URL } from '../../services/api';

interface Props {
  challengeId: string;
  userCode: string;
}

export const AITeacherPanel: React.FC<Props> = ({ challengeId, userCode }) => {
  const { profile } = useGame();
  const [activeTab, setActiveTab] = useState<'hint' | 'explain' | 'socratic' | 'example'>('hint');
  const [aiResponse, setAiResponse] = useState<string>(
    'I am evaluating your code approach in real-time. Click any mode below for dynamic guidance!'
  );
  const [loading, setLoading] = useState<boolean>(false);


  const handleAction = async (mode: 'hint' | 'explain' | 'socratic' | 'example') => {
    setActiveTab(mode);
    setLoading(true);
    setAiResponse('Consulting the neural network...');

    try {
      const resp = await fetch(`${API_BASE_URL}/ai/mentor/guidance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(localStorage.getItem('coderealm_token') || localStorage.getItem('token')
            ? { 'Authorization': `Bearer ${localStorage.getItem('coderealm_token') || localStorage.getItem('token')}` }
            : {})
        },
        body: JSON.stringify({
          challenge_id: challengeId,
          user_code: userCode,
          mode: mode.charAt(0).toUpperCase() + mode.slice(1) // e.g. "Hint", "Explain"
        })
      });
      
      if (!resp.ok) throw new Error('Failed to get guidance');
      
      const data = await resp.json();
      setAiResponse(data.content);
    } catch (err) {
      setAiResponse("⚠️ Connection to AI Mentor lost. Please check your network and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      width: '320px',
      background: 'var(--bg-surface)',
      borderLeft: '1px solid var(--border-subtle)',
      display: 'flex',
      flexDirection: 'column',
      height: '100%'
    }}>
      {/* Panel Header */}
      <div style={{
        padding: '16px',
        borderBottom: '1px solid var(--border-dark)',
        background: 'var(--bg-card)',
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
      }}>
        <div style={{
          background: 'linear-gradient(135deg, var(--accent-teal-bright) 0%, var(--accent-teal) 100%)',
          padding: '8px',
          borderRadius: '8px',
          color: '#FFF'
        }}>
          <Bot size={20} />
        </div>
        <div>
          <div style={{ fontWeight: 800, fontSize: '14px', color: 'var(--text-main)' }}>AI TEACHER</div>
          <div style={{ fontSize: '11px', color: 'var(--accent-teal-bright)', fontWeight: 600 }}>
            Adaptive • Python rating {profile.skills.python}
          </div>
        </div>
      </div>

      {/* Mode Action Buttons */}
      <div style={{
        padding: '12px',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '8px',
        borderBottom: '1px solid var(--border-dark)'
      }}>
        <button
          onClick={() => handleAction('hint')}
          style={{
            background: activeTab === 'hint' ? 'rgba(217, 160, 54, 0.15)' : 'var(--bg-elevated)',
            border: '1px solid',
            borderColor: activeTab === 'hint' ? 'var(--accent-gold)' : 'var(--border-dark)',
            color: activeTab === 'hint' ? 'var(--accent-gold)' : 'var(--text-muted)',
            padding: '8px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <Lightbulb size={14} /> HINT
        </button>

        <button
          onClick={() => handleAction('explain')}
          style={{
            background: activeTab === 'explain' ? 'rgba(217, 160, 54, 0.15)' : 'var(--bg-elevated)',
            border: '1px solid',
            borderColor: activeTab === 'explain' ? 'var(--accent-gold)' : 'var(--border-dark)',
            color: activeTab === 'explain' ? 'var(--accent-gold)' : 'var(--text-muted)',
            padding: '8px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <BookOpen size={14} /> EXPLAIN
        </button>

        <button
          onClick={() => handleAction('socratic')}
          style={{
            background: activeTab === 'socratic' ? 'rgba(217, 160, 54, 0.15)' : 'var(--bg-elevated)',
            border: '1px solid',
            borderColor: activeTab === 'socratic' ? 'var(--accent-gold)' : 'var(--border-dark)',
            color: activeTab === 'socratic' ? 'var(--accent-gold)' : 'var(--text-muted)',
            padding: '8px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <HelpCircle size={14} /> SOCRATIC
        </button>

        <button
          onClick={() => handleAction('example')}
          style={{
            background: activeTab === 'example' ? 'rgba(217, 160, 54, 0.15)' : 'var(--bg-elevated)',
            border: '1px solid',
            borderColor: activeTab === 'example' ? 'var(--accent-gold)' : 'var(--border-dark)',
            color: activeTab === 'example' ? 'var(--accent-gold)' : 'var(--text-muted)',
            padding: '8px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <Code2 size={14} /> EXAMPLE
        </button>
      </div>

      {/* Dynamic Feedback Stream */}
      <div style={{ flex: 1, padding: '16px', overflowY: 'auto' }}>
        {loading ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={16} className="animate-spin" />
            <span>AI analyzing syntax trees...</span>
          </div>
        ) : (
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            padding: '14px',
            borderRadius: '8px',
            fontSize: '13px',
            color: 'var(--text-main)',
            lineHeight: 1.6,
            whiteSpace: 'pre-wrap',
            fontFamily: activeTab === 'example' ? 'var(--font-mono)' : 'var(--font-body)'
          }}>
            {aiResponse}
          </div>
        )}
      </div>

      {/* Learner Performance Snapshot */}
      <div style={{
        padding: '14px',
        background: 'var(--bg-card)',
        borderTop: '1px solid var(--border-dark)',
        fontSize: '11px',
        color: 'var(--text-muted)'
      }}>
        <div style={{ fontWeight: 700, color: 'var(--accent-gold)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <CheckCircle2 size={12} /> LEARNER PREFERENCE
        </div>
        Hands-on preference: High • Hint usage: Minimal
      </div>
    </div>
  );
};
