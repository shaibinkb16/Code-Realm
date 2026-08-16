import React, { useState } from 'react';
import { useGame } from '../../context/GameContext';
import { api } from '../../services/api';
import { Settings as SettingsIcon, X, Check, Save, MessageSquare, Code2, Shield, Sun, Moon } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenFeedback: () => void;
}

const LANGUAGES = [
  { id: 'python', label: 'Python 🐍', desc: 'Data Science, AI & Backend' },
  { id: 'javascript', label: 'JavaScript 📜', desc: 'Web Apps, Frontend & Node.js' },
  { id: 'cpp', label: 'C++ ⚡', desc: 'Competitive Programming & Systems' },
  { id: 'java', label: 'Java ☕', desc: 'Enterprise Systems & Android' },
  { id: 'sql', label: 'SQL 𝄠', desc: 'Data Queries & Relational DBs' }
];

const TITLES = [
  'Shadow Coder ⚔️',
  'Algorithm Knight 🛡️',
  'Code Ranger 🏹',
  'AI Architect 🤖'
];

const SKILL_LEVELS = [
  { id: 'Child / absolute beginner', label: 'Child / Absolute Beginner', elo: 300 },
  { id: 'Beginner', label: 'Beginner', elo: 500 },
  { id: 'Intermediate', label: 'Intermediate', elo: 800 },
  { id: 'Advanced Engineer', label: 'Advanced Engineer', elo: 1200 }
];

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onOpenFeedback }) => {
  const { profile, setProfile, triggerNotification, theme, toggleTheme } = useGame();
  const [selectedLang, setSelectedLang] = useState<string>('python');
  const [selectedTitle, setSelectedTitle] = useState<string>(profile.title || TITLES[0]);
  const [selectedLevel, setSelectedLevel] = useState<string>('Intermediate');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const eloMap: Record<string, number> = {
        'Child / absolute beginner': 300,
        'Beginner': 500,
        'Intermediate': 800,
        'Advanced Engineer': 1200
      };
      const newElo = eloMap[selectedLevel] || 500;

      const res = await api.saveOnboarding({
        title: selectedTitle,
        preferred_language: selectedLang,
        skill_level: selectedLevel
      });

      const updatedElo = res.profile?.rank_rating || newElo;

      setProfile(prev => ({
        ...prev,
        title: selectedTitle,
        rankRating: updatedElo,
        skills: {
          ...prev.skills,
          [selectedLang]: updatedElo
        }
      }));

      triggerNotification('⚙️ Settings updated! Preferences saved to database.');
      onClose();
    } catch (err: any) {
      triggerNotification(err.message || 'Settings saved locally.');
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.85)',
      backdropFilter: 'blur(6px)',
      zIndex: 1150,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div className="realm-card-gold" style={{
        width: '580px',
        maxWidth: '100%',
        padding: '28px',
        borderRadius: '20px',
        position: 'relative',
        boxShadow: '0 0 50px rgba(217, 160, 54, 0.3)',
        maxHeight: '90vh',
        overflowY: 'auto'
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
            cursor: 'pointer'
          }}
        >
          <X size={20} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
          <div style={{ background: 'rgba(217, 160, 54, 0.15)', padding: '8px', borderRadius: '10px', color: 'var(--accent-gold)' }}>
            <SettingsIcon size={22} />
          </div>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-main)', fontFamily: 'var(--font-display)', lineHeight: 1.2 }}>
              EXPLORER SETTINGS & PREFERENCES
            </h2>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Customize your target programming language, difficulty & experience</div>
          </div>
        </div>

        {/* 1. Target Programming Language */}
        <div style={{ marginBottom: '22px' }}>
          <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent-gold)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px', textTransform: 'uppercase' }}>
            <Code2 size={14} /> Primary Target Language
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {LANGUAGES.map(lang => (
              <button
                key={lang.id}
                type="button"
                onClick={() => setSelectedLang(lang.id)}
                style={{
                  background: selectedLang === lang.id ? 'rgba(217, 160, 54, 0.18)' : 'var(--bg-elevated)',
                  border: '1px solid',
                  borderColor: selectedLang === lang.id ? 'var(--accent-gold)' : 'var(--border-subtle)',
                  color: selectedLang === lang.id ? 'var(--accent-gold)' : 'var(--text-main)',
                  padding: '12px',
                  borderRadius: '10px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>{lang.label}</span>
                  {selectedLang === lang.id && <Check size={14} color="var(--accent-gold)" />}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px', fontWeight: 500 }}>
                  {lang.desc}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 2. Skill Level & Calibrated ELO */}
        <div style={{ marginBottom: '22px' }}>
          <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent-gold)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px', textTransform: 'uppercase' }}>
            <Shield size={14} /> Experience Level & ELO
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {SKILL_LEVELS.map(lvl => (
              <button
                key={lvl.id}
                type="button"
                onClick={() => setSelectedLevel(lvl.id)}
                style={{
                  background: selectedLevel === lvl.id ? 'rgba(217, 160, 54, 0.15)' : 'var(--bg-elevated)',
                  border: '1px solid',
                  borderColor: selectedLevel === lvl.id ? 'var(--accent-gold)' : 'var(--border-subtle)',
                  color: selectedLevel === lvl.id ? 'var(--accent-gold)' : 'var(--text-main)',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <div>{lvl.label}</div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 500 }}>ELO Rating: {lvl.elo}</div>
              </button>
            ))}
          </div>
        </div>

        {/* 3. Explorer Title Badge */}
        <div style={{ marginBottom: '22px' }}>
          <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent-gold)', marginBottom: '8px', display: 'block', textTransform: 'uppercase' }}>
            Explorer Title Badge
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {TITLES.map(title => (
              <button
                key={title}
                type="button"
                onClick={() => setSelectedTitle(title)}
                style={{
                  background: selectedTitle === title ? 'rgba(217, 160, 54, 0.15)' : 'var(--bg-elevated)',
                  border: '1px solid',
                  borderColor: selectedTitle === title ? 'var(--accent-gold)' : 'var(--border-subtle)',
                  color: selectedTitle === title ? 'var(--accent-gold)' : 'var(--text-main)',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                {title}
              </button>
            ))}
          </div>
        </div>

        {/* 4. App Theme & Feedback Bar */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '24px', paddingTop: '8px', borderTop: '1px solid var(--border-subtle)' }}>
          <button
            type="button"
            onClick={toggleTheme}
            className="btn-secondary"
            style={{ flex: 1, justifyContent: 'center' }}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            <span>Theme: {theme.toUpperCase()}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenFeedback();
            }}
            className="btn-secondary"
            style={{ flex: 1, justifyContent: 'center', color: 'var(--accent-gold)', borderColor: 'rgba(217,160,54,0.3)' }}
          >
            <MessageSquare size={16} />
            <span>Submit App Feedback</span>
          </button>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="btn-primary"
          style={{ width: '100%', justifyContent: 'center', fontSize: '14px' }}
        >
          <Save size={16} /> {isSaving ? 'SAVING SETTINGS...' : 'SAVE SETTINGS & UPDATE REALM'}
        </button>
      </div>
    </div>
  );
};
