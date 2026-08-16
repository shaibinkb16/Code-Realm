import React, { useState } from 'react';
import { useGame } from '../../context/GameContext';
import { api } from '../../services/api';
import { Brain, ArrowRight, Zap, Check, X } from 'lucide-react';

export const AdaptiveAssessmentModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { setProfile, triggerNotification } = useGame();
  const [step, setStep] = useState<number>(1);
  const [language, setLanguage] = useState<string>('python');
  const [experience, setExperience] = useState<string>('Beginner');
  const [goal, setGoal] = useState<string>('Full-Stack Developer');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleFinish = async () => {
    setIsSubmitting(true);
    try {
      const res = await api.saveOnboarding({
        preferred_language: language,
        skill_level: experience,
        career_goal: goal,
        goals: [goal]
      });

      const eloMap: Record<string, number> = {
        'Child / absolute beginner': 300,
        'Beginner (Basic Syntax)': 500,
        'Intermediate (Building Apps)': 800,
        'Advanced Engineer': 1200
      };

      const newElo = res.profile?.rank_rating || eloMap[experience] || 500;

      setProfile(prev => ({
        ...prev,
        rankRating: newElo,
        skills: {
          ...prev.skills,
          [language]: newElo
        }
      }));

      triggerNotification(`🎯 Adaptive Roadmap Calibrated! ELO set to ${newElo} for ${language.toUpperCase()}.`);
      onClose();
    } catch (e: any) {
      triggerNotification(e.message || 'Assessment complete. Journey map updated!');
      onClose();
    } finally {
      setIsSubmitting(false);
    }
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
        boxShadow: '0 0 50px rgba(217, 160, 54, 0.35)',
        position: 'relative'
      }}>
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            zIndex: 10
          }}
        >
          <X size={20} />
        </button>
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
              <Brain size={14} /> ADAPTIVE ROADMAP ASSESSMENT
            </div>
            <h2 style={{ fontSize: '26px', color: 'var(--text-main)', marginBottom: '8px', fontFamily: 'var(--font-display)' }}>
              SELECT PRIMARY CODING LANGUAGE
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', lineHeight: 1.6, marginBottom: '24px' }}>
              Choose which programming language you want to study and master in your primary realm path.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '24px' }}>
              {[
                { id: 'python', label: 'Python 🐍', desc: 'Data Science, AI & Backend' },
                { id: 'javascript', label: 'JavaScript 📜', desc: 'Web Apps, Frontend & Node.js' },
                { id: 'cpp', label: 'C++ ⚡', desc: 'Competitive Programming & Systems' },
                { id: 'java', label: 'Java ☕', desc: 'Enterprise Systems & Android' },
                { id: 'sql', label: 'SQL 𝄠', desc: 'Database Queries & Relational DBs' }
              ].map(lang => (
                <button
                  key={lang.id}
                  onClick={() => setLanguage(lang.id)}
                  style={{
                    background: language === lang.id ? 'rgba(217, 160, 54, 0.18)' : 'var(--bg-elevated)',
                    border: '1px solid',
                    borderColor: language === lang.id ? 'var(--accent-gold)' : 'var(--border-dark)',
                    color: language === lang.id ? 'var(--accent-gold)' : 'var(--text-main)',
                    padding: '16px',
                    borderRadius: '12px',
                    fontSize: '15px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{lang.label}</span>
                    {language === lang.id && <Check size={16} color="var(--accent-gold)" />}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', fontWeight: 500 }}>
                    {lang.desc}
                  </div>
                </button>
              ))}
            </div>

            <button onClick={() => setStep(2)} className="btn-primary" style={{ width: '100%', justifyContent: 'center', fontSize: '15px' }}>
              NEXT: EXPERIENCE LEVEL <ArrowRight size={18} />
            </button>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 style={{ fontSize: '24px', color: 'var(--text-main)', marginBottom: '8px', fontFamily: 'var(--font-display)' }}>
              SELECT YOUR SKILL LEVEL
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '20px' }}>
              This calibrates your starting ELO rating and adaptive challenge difficulty.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '24px' }}>
              {[
                { id: 'Child / absolute beginner', label: 'Child / Absolute Beginner', desc: 'ELO 300 · Simple intro logic' },
                { id: 'Beginner (Basic Syntax)', label: 'Beginner', desc: 'ELO 500 · Basic syntax & loops' },
                { id: 'Intermediate (Building Apps)', label: 'Intermediate', desc: 'ELO 800 · Functions & arrays' },
                { id: 'Advanced Engineer', label: 'Advanced Engineer', desc: 'ELO 1200 · Algorithms & system design' }
              ].map(lvl => (
                <button
                  key={lvl.id}
                  onClick={() => setExperience(lvl.id)}
                  style={{
                    background: experience === lvl.id ? 'rgba(217, 160, 54, 0.15)' : 'var(--bg-elevated)',
                    border: '1px solid',
                    borderColor: experience === lvl.id ? 'var(--accent-gold)' : 'var(--border-dark)',
                    color: experience === lvl.id ? 'var(--accent-gold)' : 'var(--text-main)',
                    padding: '12px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  <div>{lvl.label}</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px', fontWeight: 500 }}>{lvl.desc}</div>
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setStep(1)} className="btn-secondary" style={{ width: '30%', justifyContent: 'center' }}>
                BACK
              </button>
              <button onClick={() => setStep(3)} className="btn-primary" style={{ width: '70%', justifyContent: 'center', fontSize: '15px' }}>
                NEXT: CAREER GOAL <ArrowRight size={18} />
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 style={{ fontSize: '24px', color: 'var(--text-main)', marginBottom: '8px', fontFamily: 'var(--font-display)' }}>
              🎯 TARGET CAREER PATH
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '20px' }}>
              The AI Game Master will prioritize challenges targeting your goal.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '24px' }}>
              {['Full-Stack Developer', 'AI & LLM Engineer', 'Backend Architect', 'Game & Algorithmic Dev'].map(g => (
                <button
                  key={g}
                  onClick={() => setGoal(g)}
                  style={{
                    background: goal === g ? 'rgba(230, 103, 43, 0.15)' : 'var(--bg-elevated)',
                    border: '1px solid',
                    borderColor: goal === g ? 'var(--accent-orange)' : 'var(--border-dark)',
                    color: goal === g ? 'var(--accent-orange)' : 'var(--text-main)',
                    padding: '14px',
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

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setStep(2)} className="btn-secondary" style={{ width: '30%', justifyContent: 'center' }}>
                BACK
              </button>
              <button
                onClick={handleFinish}
                disabled={isSubmitting}
                className="btn-orange"
                style={{ width: '70%', justifyContent: 'center', fontSize: '15px' }}
              >
                <Zap size={18} fill="currentColor" /> {isSubmitting ? 'CALIBRATING ROADMAP...' : 'GENERATE MY ADAPTIVE ROADMAP'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
