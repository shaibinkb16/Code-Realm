import React, { useState } from 'react';
import { useGame } from '../../context/GameContext';
import { FormattedText } from '../ui/FormattedText';
import { X, Bot, Send, Sparkles, Lightbulb, BookOpen, HelpCircle, Code } from 'lucide-react';

export const AICompanionModal: React.FC = () => {
  const { isAiModalOpen, setIsAiModalOpen, aiChatMessages, sendAiMessage, profile } = useGame();
  const [inputText, setInputText] = useState('');
  const [activeMode, setActiveMode] = useState<'Explain' | 'Hint' | 'Socratic' | 'Demonstrate'>('Explain');

  if (!isAiModalOpen) return null;

  const handleSend = () => {
    if (!inputText.trim()) return;
    sendAiMessage(inputText, activeMode);
    setInputText('');
  };

  const handleQuickPrompt = (promptText: string) => {
    sendAiMessage(promptText, activeMode);
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(4px)',
      zIndex: 1000,
      display: 'flex',
      justifyContent: 'flex-end',
      animation: 'fadeIn 0.2s ease'
    }}>
      <div style={{
        width: '460px',
        height: '100%',
        background: 'var(--bg-surface)',
        borderLeft: '1px solid var(--border-bright)',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '-10px 0 30px rgba(0,0,0,0.8)'
      }}>
        {/* Modal Header */}
        <div style={{
          padding: '20px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--bg-card)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              background: 'linear-gradient(135deg, var(--accent-teal-bright) 0%, var(--accent-teal) 100%)',
              padding: '10px',
              borderRadius: '10px',
              color: '#FFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Bot size={24} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '18px', color: 'var(--text-main)' }}>AI GAME MASTER & TUTOR</div>
              <div style={{ fontSize: '12px', color: 'var(--accent-teal-bright)', fontWeight: 600 }}>
                Context Aware • Python Rating: {profile.skills.python}
              </div>
            </div>
          </div>
          <button
            onClick={() => setIsAiModalOpen(false)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px'
            }}
          >
            <X size={22} />
          </button>
        </div>

        {/* Teaching Mode Selector */}
        <div style={{
          padding: '12px 20px',
          background: 'var(--bg-elevated)',
          borderBottom: '1px solid var(--border-dark)',
          display: 'flex',
          gap: '8px'
        }}>
          <button
            onClick={() => setActiveMode('Explain')}
            style={{
              flex: 1,
              padding: '6px',
              borderRadius: '6px',
              border: '1px solid',
              borderColor: activeMode === 'Explain' ? 'var(--accent-gold)' : 'transparent',
              background: activeMode === 'Explain' ? 'rgba(217, 160, 54, 0.15)' : 'transparent',
              color: activeMode === 'Explain' ? 'var(--accent-gold)' : 'var(--text-muted)',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px'
            }}
          >
            <BookOpen size={14} /> EXPLAIN
          </button>
          <button
            onClick={() => setActiveMode('Hint')}
            style={{
              flex: 1,
              padding: '6px',
              borderRadius: '6px',
              border: '1px solid',
              borderColor: activeMode === 'Hint' ? 'var(--accent-gold)' : 'transparent',
              background: activeMode === 'Hint' ? 'rgba(217, 160, 54, 0.15)' : 'transparent',
              color: activeMode === 'Hint' ? 'var(--accent-gold)' : 'var(--text-muted)',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px'
            }}
          >
            <Lightbulb size={14} /> HINT
          </button>
          <button
            onClick={() => setActiveMode('Socratic')}
            style={{
              flex: 1,
              padding: '6px',
              borderRadius: '6px',
              border: '1px solid',
              borderColor: activeMode === 'Socratic' ? 'var(--accent-gold)' : 'transparent',
              background: activeMode === 'Socratic' ? 'rgba(217, 160, 54, 0.15)' : 'transparent',
              color: activeMode === 'Socratic' ? 'var(--accent-gold)' : 'var(--text-muted)',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px'
            }}
          >
            <HelpCircle size={14} /> SOCRATIC
          </button>
          <button
            onClick={() => setActiveMode('Demonstrate')}
            style={{
              flex: 1,
              padding: '6px',
              borderRadius: '6px',
              border: '1px solid',
              borderColor: activeMode === 'Demonstrate' ? 'var(--accent-gold)' : 'transparent',
              background: activeMode === 'Demonstrate' ? 'rgba(217, 160, 54, 0.15)' : 'transparent',
              color: activeMode === 'Demonstrate' ? 'var(--accent-gold)' : 'var(--text-muted)',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px'
            }}
          >
            <Code size={14} /> EXAMPLE
          </button>
        </div>

        {/* Conversation Stream */}
        <div style={{
          flex: 1,
          padding: '20px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          {aiChatMessages.map((msg, index) => (
            <div
              key={index}
              style={{
                alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '85%',
                background: msg.sender === 'user' 
                  ? 'linear-gradient(135deg, var(--accent-orange) 0%, #D8561B 100%)' 
                  : 'var(--bg-elevated)',
                border: msg.sender === 'ai' ? '1px solid var(--border-subtle)' : 'none',
                padding: '12px 16px',
                borderRadius: '12px',
                color: 'var(--text-main)',
                fontSize: '14px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
              }}
            >
              <div style={{
                fontSize: '11px',
                fontWeight: 700,
                color: msg.sender === 'user' ? '#FFE3D1' : 'var(--accent-gold)',
                marginBottom: '4px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                {msg.sender === 'ai' ? <Sparkles size={12} /> : <UserIcon />}
                <span>{msg.sender === 'ai' ? 'AI GAME MASTER' : profile.username}</span>
                <span style={{ marginLeft: 'auto', opacity: 0.7, fontWeight: 400 }}>{msg.time}</span>
              </div>
              <div style={{ lineHeight: 1.5 }}>
                <FormattedText text={msg.text} />
              </div>
            </div>
          ))}
        </div>

        {/* Quick Suggestion Chips */}
        <div style={{
          padding: '10px 20px',
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          background: 'var(--bg-card)',
          borderTop: '1px solid var(--border-dark)'
        }}>
          <button
            onClick={() => handleQuickPrompt("Give me a hint for Loop Castle!")}
            style={{
              whiteSpace: 'nowrap',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-muted)',
              padding: '6px 12px',
              borderRadius: '20px',
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            💡 Hint for Loop Castle
          </button>
          <button
            onClick={() => handleQuickPrompt("Analyze my debugging progress")}
            style={{
              whiteSpace: 'nowrap',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-muted)',
              padding: '6px 12px',
              borderRadius: '20px',
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            📊 My Debugging Skill
          </button>
        </div>

        {/* Input Bar */}
        <div style={{
          padding: '16px 20px',
          background: 'var(--bg-surface)',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          gap: '10px'
        }}>
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={`Ask AI Game Master in [${activeMode}] mode...`}
            style={{
              flex: 1,
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-bright)',
              borderRadius: '8px',
              padding: '12px 14px',
              color: 'var(--text-main)',
              fontSize: '14px',
              outline: 'none'
            }}
          />
          <button
            onClick={handleSend}
            className="btn-primary"
            style={{ padding: '0 16px' }}
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

const UserIcon: React.FC = () => (
  <span style={{ fontSize: '10px' }}>👤</span>
);
