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

  const parseInlineFormatting = (text: string) => {
    const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\$[^$]+\$)/g);
    return parts.map((part, idx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={idx} style={{ color: 'var(--accent-gold)', fontWeight: 700 }}>{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code key={idx} style={{
            background: 'var(--bg-elevated)',
            color: 'var(--accent-teal-bright)',
            padding: '2px 6px',
            borderRadius: '4px',
            fontFamily: 'var(--font-mono)',
            fontSize: '12px',
            border: '1px solid var(--border-subtle)'
          }}>
            {part.slice(1, -1)}
          </code>
        );
      }
      if (part.startsWith('$') && part.endsWith('$') && part.length >= 3) {
        return (
          <code key={idx} style={{
            background: 'rgba(217, 160, 54, 0.15)',
            color: 'var(--accent-gold)',
            padding: '2px 6px',
            borderRadius: '4px',
            fontFamily: 'var(--font-mono)',
            fontWeight: 700,
            fontSize: '12px',
            border: '1px solid rgba(217, 160, 54, 0.3)',
            display: 'inline-block',
            margin: '0 2px'
          }}>
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
  };

  const renderFormattedContent = (content: string) => {
    if (!content) return null;
    const blocks = content.split(/\n\n+/);

    return blocks.map((block, bIdx) => {
      const trimmed = block.trim();

      if (trimmed.startsWith('# ') || trimmed.startsWith('## ') || trimmed.startsWith('### ')) {
        const headingText = trimmed.replace(/^#+\s*/, '');
        return (
          <h4 key={bIdx} style={{
            fontSize: '14px',
            fontWeight: 800,
            color: 'var(--accent-teal-bright)',
            marginTop: bIdx === 0 ? '0' : '14px',
            marginBottom: '8px',
            paddingBottom: '4px',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <Sparkles size={14} style={{ color: 'var(--accent-gold)' }} />
            {headingText}
          </h4>
        );
      }

      if (/^\*\*[^*]+\*\*$/.test(trimmed) || /^\*\*[^*]+:\s*[^*]+\*\*$/.test(trimmed)) {
        const headingText = trimmed.replace(/^\*\*|\*\*$/g, '');
        return (
          <h4 key={bIdx} style={{
            fontSize: '13px',
            fontWeight: 800,
            color: 'var(--accent-gold)',
            marginTop: bIdx === 0 ? '0' : '14px',
            marginBottom: '8px',
            paddingBottom: '4px',
            borderBottom: '1px solid rgba(217, 160, 54, 0.25)',
            letterSpacing: '0.4px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <BookOpen size={13} />
            {headingText}
          </h4>
        );
      }

      const lines = trimmed.split('\n');

      return (
        <div key={bIdx} style={{ marginBottom: bIdx === blocks.length - 1 ? 0 : '10px' }}>
          {lines.map((line, lIdx) => {
            const lTrim = line.trim();

            if (lTrim.startsWith('- ') || lTrim.startsWith('* ')) {
              return (
                <div key={lIdx} style={{ display: 'flex', gap: '8px', marginLeft: '4px', marginBottom: '4px' }}>
                  <span style={{ color: 'var(--accent-gold)', fontWeight: 800 }}>•</span>
                  <span>{parseInlineFormatting(lTrim.substring(2))}</span>
                </div>
              );
            }

            return (
              <p key={lIdx} style={{ margin: '0 0 4px 0', lineHeight: 1.6 }}>
                {parseInlineFormatting(line)}
              </p>
            );
          })}
        </div>
      );
    });
  };

  return (
    <div style={{
      width: '100%',
      minWidth: 0,
      maxWidth: '100%',
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
            {renderFormattedContent(aiResponse)}
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
