import React, { useState } from 'react';
import { api } from '../../services/api';
import { Sparkles, Check, ArrowRight } from 'lucide-react';

interface OnboardingFlowProps {
  onComplete: () => void;
}

const TITLES = [
  { id: 'Shadow Coder ⚔️', label: 'Shadow Coder', icon: '⚔️', desc: 'Masters of algorithms & stealth logic' },
  { id: 'Algorithm Knight 🛡️', label: 'Algorithm Knight', icon: '🛡️', desc: 'Defenders of clean code & structure' },
  { id: 'Code Ranger 🏹', label: 'Code Ranger', icon: '🏹', desc: 'Explorers of multi-realm architectures' },
  { id: 'AI Architect 🤖', label: 'AI Architect', icon: '🤖', desc: 'Builders of intelligent AI systems' }
];

const GOALS = [
  'Become job-ready',
  'Improve coding skills',
  'Prepare for technical interviews',
  'Master AI engineering & LLMs',
  'Conquer algorithm challenges',
  'Build real-world projects'
];

const SKILL_LEVELS = [
  { id: 'Beginner', label: 'Beginner', desc: 'Just starting my coding adventure' },
  { id: 'Intermediate', label: 'Intermediate', desc: 'Comfortable with basic syntax & logic' },
  { id: 'Advanced', label: 'Advanced', desc: 'Seasoned engineer aiming for mastery' }
];

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ onComplete }) => {
  const [step, setStep] = useState<number>(1);
  const [selectedTitle, setSelectedTitle] = useState(TITLES[0].id);
  const [selectedGoals, setSelectedGoals] = useState<string[]>(['Become job-ready']);
  const [skillLevel, setSkillLevel] = useState('Intermediate');
  const [isInitializing, setIsInitializing] = useState(false);
  const [progressStep, setProgressStep] = useState(0);

  const toggleGoal = (g: string) => {
    setSelectedGoals(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g]);
  };

  const handleFinish = async () => {
    setIsInitializing(true);

    // Simulate animated sequence
    setTimeout(() => setProgressStep(1), 600);
    setTimeout(() => setProgressStep(2), 1200);
    setTimeout(() => setProgressStep(3), 1800);

    try {
      await api.saveOnboarding({
        title: selectedTitle,
        goals: selectedGoals,
        skill_level: skillLevel
      });
    } catch (e) {
      console.warn('Failed saving onboarding:', e);
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
          <p className="text-xs text-slate-400 mt-1 font-mono">Preparing your adaptive RPG experience</p>
        </div>

        <div className="space-y-3 text-left font-mono text-xs">
          <div className="flex items-center justify-between p-2.5 bg-white/5 rounded-xl">
            <span className="text-slate-300">Creating your explorer profile</span>
            {progressStep >= 1 ? <Check className="w-4 h-4 text-emerald-400" /> : <span className="text-slate-600">...</span>}
          </div>
          <div className="flex items-center justify-between p-2.5 bg-white/5 rounded-xl">
            <span className="text-slate-300">Analyzing your goals & skill level</span>
            {progressStep >= 2 ? <Check className="w-4 h-4 text-emerald-400" /> : <span className="text-slate-600">...</span>}
          </div>
          <div className="flex items-center justify-between p-2.5 bg-white/5 rounded-xl">
            <span className="text-slate-300">Unlocking Starter Village</span>
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
        <span className="text-indigo-400 font-semibold uppercase tracking-wider">Step {step} of 3</span>
        <span className="text-slate-500">Explorer Customization</span>
      </div>

      {/* Step 1: Choose Explorer Title */}
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">Choose Your Explorer Identity</h2>
            <p className="text-xs text-slate-400 mt-1">Select your starting class title in Code Realm</p>
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

          <button
            type="button"
            onClick={() => setStep(2)}
            className="w-full flex items-center justify-center space-x-2 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-sm font-semibold text-white shadow-lg transition-all"
          >
            <span>Next: Set Goals</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Step 2: Choose Goals */}
      {step === 2 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">What are you here to achieve?</h2>
            <p className="text-xs text-slate-400 mt-1">Select all goals that apply to your journey</p>
          </div>

          <div className="grid grid-cols-1 gap-2">
            {GOALS.map((g) => {
              const isSelected = selectedGoals.includes(g);
              return (
                <button
                  key={g}
                  type="button"
                  onClick={() => toggleGoal(g)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border text-xs font-medium text-left transition-all ${
                    isSelected
                      ? 'bg-indigo-600/15 border-indigo-500/80 text-white'
                      : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'
                  }`}
                >
                  <span>{g}</span>
                  <div className={`w-4 h-4 rounded-md border flex items-center justify-center ${isSelected ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-slate-600'}`}>
                    {isSelected && <Check className="w-3 h-3" />}
                  </div>
                </button>
              );
            })}
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
              <span>Next: Experience</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Skill Level */}
      {step === 3 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">What's your coding experience?</h2>
            <p className="text-xs text-slate-400 mt-1">This helps our AI mentor calibrate challenge difficulty</p>
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
