import React, { useState } from 'react';
import { useGame } from '../../context/GameContext';
import { Brain, ArrowRight, Zap } from 'lucide-react';

export const AdaptiveAssessmentModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { triggerNotification } = useGame();
  const [step, setStep] = useState<number>(1);
  const [experience, setExperience] = useState<string>('Beginner');
  const [goal, setGoal] = useState<string>('Full-Stack Engineer');

  if (!isOpen) return null;

  const handleFinish = () => {
    triggerNotification('🎯 AI Assessment Complete! Personalized Journey Map generated.');
    onClose();
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.85)',
      backdropFilter: 'blur(6px)',
      zIndex: 1100,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div className="realm-card-gold" style={{
        width: '560px',
        maxWidth: '100%',
        padding: '32px',
        borderRadius: '20px',
        textAlign: 'center',
        boxShadow: '0 0 50px rgba(217, 160, 54, 0.35)'
      }}>
        {step === 1 && (
          <div>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(217, 160, 54, 0.2)',
              color: 'var(--accent-gold)',
              fontSize: '11px',
              fontWeight: 800,
              padding: '4px 12px',
              borderRadius: '12px',
              marginBottom: '12px'
            }}>
              <Brain size={14} /> ADAPTIVE ONBOARDING
            </div>
            <h2 style={{ fontSize: '28px', color: 'var(--text-main)', marginBottom: '8px' }}>
              WELCOME TO CODE REALM
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', lineHeight: 1.6, marginBottom: '24px' }}>
              Let's discover your current programming ability and learning style so the AI Game Master can build your personal journey map.
            </p>

            <div style={{ textAlign: 'left', marginBottom: '24px' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent-gold)', marginBottom: '8px', display: 'block' }}>
                SELECT YOUR EXPERIENCE LEVEL
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {['Child / absolute beginner', 'Beginner (Basic Syntax)', 'Intermediate (Building Apps)', 'Advanced Engineer'].map(lvl => (
                  <button
                    key={lvl}
                    onClick={() => setExperience(lvl)}
                    style={{
                      background: experience === lvl ? 'rgba(217, 160, 54, 0.15)' : 'var(--bg-elevated)',
                      border: '1px solid',
                      borderColor: experience === lvl ? 'var(--accent-gold)' : 'var(--border-dark)',
                      color: experience === lvl ? 'var(--accent-gold)' : 'var(--text-main)',
                      padding: '12px',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={() => setStep(2)} className="btn-primary" style={{ width: '100%', justifyContent: 'center', fontSize: '15px' }}>
              CONTINUE ASSESSMENT <ArrowRight size={18} />
            </button>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 style={{ fontSize: '24px', color: 'var(--text-main)', marginBottom: '8px' }}>
              🎯 CHOOSE YOUR CAREER GOAL
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '20px' }}>
              The AI will customize your world map nodes to match your target domain.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '24px' }}>
              {['Backend Engineer', 'AI & LLM Engineer', 'Full-Stack Developer', 'Software Architect'].map(g => (
                <button
                  key={g}
                  onClick={() => setGoal(g)}
                  style={{
                    background: goal === g ? 'rgba(230, 103, 43, 0.15)' : 'var(--bg-elevated)',
                    border: '1px solid',
                    borderColor: goal === g ? 'var(--accent-orange)' : 'var(--border-dark)',
                    color: goal === g ? 'var(--accent-orange)' : 'var(--text-main)',
                    padding: '12px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {g}
                </button>
              ))}
            </div>

            <button onClick={handleFinish} className="btn-orange" style={{ width: '100%', justifyContent: 'center', fontSize: '15px' }}>
              <Zap size={18} fill="currentColor" /> GENERATE MY PERSONAL JOURNEY MAP
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
