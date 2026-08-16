import React, { useState } from 'react';
import { api } from '../../services/api';
import { useGame } from '../../context/GameContext';
import { Sparkles, Check, ArrowRight, Code2 } from 'lucide-react';

interface OnboardingFlowProps {
  onComplete: () => void;
}

const LANGUAGES = [
  { id: 'python', label: 'Python 🐍', desc: 'Data Science, AI & Backend Engineering' },
  { id: 'javascript', label: 'JavaScript 📜', desc: 'Web Apps, Frontend & Node.js Development' },
  { id: 'cpp', label: 'C++ ⚡', desc: 'Competitive Programming & High Performance Systems' },
  { id: 'java', label: 'Java ☕', desc: 'Enterprise Applications & Android Engineering' },
  { id: 'sql', label: 'SQL 𝄠', desc: 'Database Analytics & Relational Query Mastery' }
];

const TITLES = [
  { id: 'Shadow Coder ⚔️', label: 'Shadow Coder', icon: '⚔️', desc: 'Masters of algorithms & stealth logic' },
  { id: 'Algorithm Knight 🛡️', label: 'Algorithm Knight', icon: '🛡️', desc: 'Defenders of clean code & structure' },
  { id: 'Code Ranger 🏹', label: 'Code Ranger', icon: '🏹', desc: 'Explorers of multi-realm architectures' },
  { id: 'AI Architect 🤖', label: 'AI Architect', icon: '🤖', desc: 'Builders of intelligent AI systems' }
];

const SKILL_LEVELS = [
  { id: 'Child / absolute beginner', label: 'Child / Absolute Beginner', desc: 'Starting from scratch · ELO 300' },
  { id: 'Beginner', label: 'Beginner', desc: 'Basic syntax & variables · ELO 500' },
  { id: 'Intermediate', label: 'Intermediate', desc: 'Functions, arrays & logic · ELO 800' },
  { id: 'Advanced Engineer', label: 'Advanced Engineer', desc: 'Complex algorithms & architecture · ELO 1200' }
];

const CAREER_GOALS = [
  'Full-Stack Developer',
  'AI & LLM Engineer',
  'Backend Architect',
  'Game & Algorithmic Dev'
];

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ onComplete }) => {
  const { setProfile } = useGame();
  const [step, setStep] = useState<number>(1);
  const [selectedLanguage, setSelectedLanguage] = useState('python');
  const [selectedTitle, setSelectedTitle] = useState(TITLES[0].id);
  const [skillLevel, setSkillLevel] = useState('Beginner');
  const [careerGoal, setCareerGoal] = useState('Full-Stack Developer');
  const [isInitializing, setIsInitializing] = useState(false);
  const [progressStep, setProgressStep] = useState(0);

  const handleFinish = async () => {
    setIsInitializing(true);

    setTimeout(() => setProgressStep(1), 600);
    setTimeout(() => setProgressStep(2), 1200);
    setTimeout(() => setProgressStep(3), 1800);

    const eloMap: Record<string, number> = {
      'Child / absolute beginner': 300,
      'Beginner': 500,
      'Intermediate': 800,
      'Advanced Engineer': 1200
    };
    const calibratedElo = eloMap[skillLevel] || 500;

    try {
      const res = await api.saveOnboarding({
        title: selectedTitle,
        preferred_language: selectedLanguage,
        skill_level: skillLevel,
        career_goal: careerGoal,
        goals: [careerGoal]
      });

      const finalElo = res.profile?.rank_rating || calibratedElo;

      setProfile(prev => ({
        ...prev,
        title: selectedTitle,
        rankRating: finalElo,
        skills: {
          ...prev.skills,
          [selectedLanguage]: finalElo
        }
      }));
    } catch (e) {
      console.warn('Failed saving onboarding preferences:', e);
    }

    setTimeout(() => {
      onComplete();
    }, 2400);
  };

  if (isInitializing) {
    return (
      <div className="w-full max-w-md mx-auto bg-slate-900/90 border border-white/10 rounded-2xl p-8 text-center space-y-6 shadow-2xl backdrop-blur-xl">
        <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center mx-auto text-indigo-400 animate-pulse">
          <Sparkles className="w-8 h-8" />
        </div>

        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Initializing Your Realm...</h2>
          <p className="text-xs text-slate-400 mt-1 font-mono">Calibrating your adaptive RPG experience</p>
        </div>

        <div className="space-y-3 text-left font-mono text-xs">
          <div className="flex items-center justify-between p-2.5 bg-white/5 rounded-xl">
            <span className="text-slate-300">Setting preferred language: {selectedLanguage.toUpperCase()}</span>
            {progressStep >= 1 ? <Check className="w-4 h-4 text-emerald-400" /> : <span className="text-slate-600">...</span>}
          </div>
          <div className="flex items-center justify-between p-2.5 bg-white/5 rounded-xl">
            <span className="text-slate-300">Calibrating starting ELO for {skillLevel}</span>
            {progressStep >= 2 ? <Check className="w-4 h-4 text-emerald-400" /> : <span className="text-slate-600">...</span>}
          </div>
          <div className="flex items-center justify-between p-2.5 bg-white/5 rounded-xl">
            <span className="text-slate-300">Generating adaptive starter village</span>
            {progressStep >= 3 ? <Check className="w-4 h-4 text-emerald-400" /> : <span className="text-slate-600">...</span>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto bg-slate-900/90 border border-white/10 rounded-2xl p-6 md:p-8 space-y-6 shadow-2xl backdrop-blur-xl">
      {/* Header Indicator */}
      <div className="flex items-center justify-between text-xs font-mono border-b border-white/10 pb-4">
        <span className="text-indigo-400 font-semibold uppercase tracking-wider">Step {step} of 4</span>
        <span className="text-slate-500">Adaptive Onboarding</span>
      </div>

      {/* Step 1: Language Selection */}
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">Select Primary Coding Language</h2>
            <p className="text-xs text-slate-400 mt-1">Choose the primary language path you wish to study</p>
          </div>

          <div className="space-y-2.5">
            {LANGUAGES.map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => setSelectedLanguage(l.id)}
                className={`w-full flex items-center justify-between p-3.5 rounded-xl border text-left transition-all ${
                  selectedLanguage === l.id
                    ? 'bg-indigo-600/15 border-indigo-500 text-white shadow-md'
                    : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'
                }`}
              >
                <div>
                  <div className="text-sm font-semibold text-white">{l.label}</div>
                  <div className="text-xs text-slate-400">{l.desc}</div>
                </div>
                {selectedLanguage === l.id && <Check className="w-4 h-4 text-indigo-400" />}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setStep(2)}
            className="w-full flex items-center justify-center space-x-2 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-sm font-semibold text-white shadow-lg transition-all"
          >
            <span>Next: Choose Title</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Step 2: Choose Explorer Title */}
      {step === 2 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">Choose Your Explorer Title</h2>
            <p className="text-xs text-slate-400 mt-1">Select your starting class title badge</p>
          </div>

          <div className="space-y-2.5">
            {TITLES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelectedTitle(t.id)}
                className={`w-full flex items-center justify-between p-3.5 rounded-xl border text-left transition-all ${
                  selectedTitle === t.id
                    ? 'bg-indigo-600/10 border-indigo-500 text-white shadow-md'
                    : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <span className="text-xl">{t.icon}</span>
                  <div>
                    <div className="text-sm font-semibold text-white">{t.label}</div>
                    <div className="text-xs text-slate-400">{t.desc}</div>
                  </div>
                </div>
                {selectedTitle === t.id && <Check className="w-4 h-4 text-indigo-400" />}
              </button>
            ))}
          </div>

          <div className="flex items-center space-x-3 pt-2">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="w-1/3 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-semibold text-slate-300 transition-all"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              className="w-2/3 flex items-center justify-center space-x-2 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-semibold text-white shadow-lg transition-all"
            >
              <span>Next: Skill Level</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Skill Level */}
      {step === 3 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">Select Your Experience Level</h2>
            <p className="text-xs text-slate-400 mt-1">This sets your initial ELO rank rating in the database</p>
          </div>

          <div className="space-y-2.5">
            {SKILL_LEVELS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSkillLevel(s.id)}
                className={`w-full flex items-center justify-between p-3.5 rounded-xl border text-left transition-all ${
                  skillLevel === s.id
                    ? 'bg-indigo-600/10 border-indigo-500 text-white'
                    : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'
                }`}
              >
                <div>
                  <div className="text-sm font-semibold text-white">{s.label}</div>
                  <div className="text-xs text-slate-400">{s.desc}</div>
                </div>
                {skillLevel === s.id && <Check className="w-4 h-4 text-indigo-400" />}
              </button>
            ))}
          </div>

          <div className="flex items-center space-x-3 pt-2">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="w-1/3 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-semibold text-slate-300 transition-all"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => setStep(4)}
              className="w-2/3 flex items-center justify-center space-x-2 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-semibold text-white shadow-lg transition-all"
            >
              <span>Next: Target Goal</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Target Career Goal */}
      {step === 4 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">Select Target Career Goal</h2>
            <p className="text-xs text-slate-400 mt-1">The AI mentor will target challenges toward this domain</p>
          </div>

          <div className="space-y-2.5">
            {CAREER_GOALS.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setCareerGoal(g)}
                className={`w-full flex items-center justify-between p-3.5 rounded-xl border text-left transition-all ${
                  careerGoal === g
                    ? 'bg-indigo-600/10 border-indigo-500 text-white'
                    : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'
                }`}
              >
                <span className="text-sm font-semibold text-white">{g}</span>
                {careerGoal === g && <Check className="w-4 h-4 text-indigo-400" />}
              </button>
            ))}
          </div>

          <div className="flex items-center space-x-3 pt-2">
            <button
              type="button"
              onClick={() => setStep(3)}
              className="w-1/3 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-semibold text-slate-300 transition-all"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleFinish}
              className="w-2/3 flex items-center justify-center space-x-2 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-semibold text-white shadow-lg transition-all"
            >
              <span>Enter Realm →</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
