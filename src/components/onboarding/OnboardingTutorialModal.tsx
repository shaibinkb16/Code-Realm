import React, { useState, useEffect } from 'react';
import { soundManager } from '../../utils/audio';
import {
  Globe,
  Code2,
  Bot,
  Building,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  X,
  CheckCircle2
} from 'lucide-react';

interface TutorialStep {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  content: string;
  highlightText: string;
  badge: string;
}

export const OnboardingTutorialModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<number>(0);

  useEffect(() => {
    // Automatically trigger for beginner users if not completed
    const completed = localStorage.getItem('coderealm_tutorial_completed');
    if (!completed) {
      setIsOpen(true);
    }
  }, []);

  const tutorialSteps: TutorialStep[] = [
    {
      title: 'WELCOME TO CODE REALM!',
      subtitle: 'Play. Code. Compete. Evolve.',
      icon: <Sparkles size={32} color="var(--text-main)" />,
      content: 'You don\'t just take a coding course. You enter an interactive RPG world where you solve challenges, battle bosses, level up your pet dragon, and build real production software!',
      highlightText: '🚀 Core Mission: Evolve from beginner explorer to staff engineer through adaptive AI gameplay.',
      badge: 'WELCOME'
    },
    {
      title: 'EXPLORE RPG WORLD REALMS',
      subtitle: '8 Interactive Adaptive Biomes',
      icon: <Globe size={32} color="var(--text-main)" />,
      content: 'Navigate through 8 RPG realms from Starter Village to High Systems Temple. Each node contains Puzzles, Bug Hunts, Speed Runs, or Epic Boss Battles.',
      highlightText: '🧩 Click any unlocked node on the World Map to view mission details and launch trials.',
      badge: 'WORLD MAP'
    },
    {
      title: 'THE CODE WORKSTATION',
      subtitle: 'Isolated Sandboxed Execution',
      icon: <Code2 size={32} color="var(--text-main)" />,
      content: 'Write code in Python 3.11 or JavaScript. Run tests safely inside our isolated sandbox engine and get instant execution output in milliseconds.',
      highlightText: '⚡ Pass all test assertions to earn XP, Gold Coins, and Star Ratings!',
      badge: 'IDE WORKSTATION'
    },
    {
      title: '24/7 AI MENTOR & TUTOR',
      subtitle: 'Contextual AI Guidance',
      icon: <Bot size={32} color="var(--text-main)" />,
      content: 'Stuck on a bug? Click "ASK AI MENTOR" anytime in the sidebar. The AI analyzes your exact code context, detects prompt injection, and gives step-by-step guidance.',
      highlightText: '🧠 AI continuously adapts challenge difficulty to match your personal skill level.',
      badge: 'AI TUTOR'
    },
    {
      title: 'DEVELOPER HQ & PET DRAGON',
      subtitle: 'Career & Virtual Company',
      icon: <Building size={32} color="var(--text-main)" />,
      content: 'Feed and level up your companion dragon Pyra, customize your Developer HQ, complete sprint tickets at virtual tech companies, and climb the global leaderboards!',
      highlightText: '🏆 You are fully equipped. Time to begin your quest!',
      badge: 'DEVELOPER HQ'
    }
  ];

  const handleNext = () => {
    soundManager.playClick();
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    soundManager.playClick();
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSkip = () => {
    soundManager.playClick();
    handleComplete();
  };

  const handleComplete = () => {
    soundManager.playSuccess();
    localStorage.setItem('coderealm_tutorial_completed', 'true');
    setIsOpen(false);
  };

  if (!isOpen) return null;

  const step = tutorialSteps[currentStep];

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.85)',
      backdropFilter: 'blur(6px)',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        width: '560px',
        maxWidth: '100%',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-bright)',
        borderRadius: '14px',
        boxShadow: 'var(--shadow-game)',
        overflow: 'hidden',
        animation: 'fadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Top Header Bar */}
        <div style={{
          padding: '20px 24px',
          background: 'var(--bg-elevated)',
          borderBottom: '1px solid var(--border-dark)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{
              fontSize: '10px',
              fontWeight: 800,
              padding: '3px 8px',
              borderRadius: '4px',
              background: 'var(--text-main)',
              color: 'var(--bg-dark)',
              fontFamily: 'var(--font-mono)'
            }}>
              {step.badge}
            </span>
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              STEP {currentStep + 1} OF {tutorialSteps.length}
            </span>
          </div>

          <button
            onClick={handleSkip}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <span>Skip Tutorial</span>
            <X size={16} />
          </button>
        </div>

        {/* Step Body Content */}
        <div style={{ padding: '32px 28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '12px',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-bright)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              {step.icon}
            </div>
            <div>
              <h3 style={{ fontSize: '20px', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--text-main)', lineHeight: 1.2 }}>
                {step.title}
              </h3>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600, marginTop: '2px' }}>
                {step.subtitle}
              </div>
            </div>
          </div>

          <p style={{ fontSize: '14px', color: 'var(--text-main)', lineHeight: 1.6 }}>
            {step.content}
          </p>

          <div style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-dark)',
            padding: '14px 18px',
            borderRadius: '8px',
            fontSize: '13px',
            color: 'var(--text-main)',
            fontWeight: 600,
            lineHeight: 1.5
          }}>
            {step.highlightText}
          </div>
        </div>

        {/* Step Navigation Footer */}
        <div style={{
          padding: '16px 28px 24px',
          borderTop: '1px solid var(--border-dark)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          {/* Step Indicator Dots */}
          <div style={{ display: 'flex', gap: '6px' }}>
            {tutorialSteps.map((_, idx) => (
              <div
                key={idx}
                style={{
                  width: idx === currentStep ? '20px' : '8px',
                  height: '8px',
                  borderRadius: '4px',
                  background: idx === currentStep ? 'var(--text-main)' : 'var(--border-dark)',
                  transition: 'all 0.2s ease'
                }}
              />
            ))}
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '10px' }}>
            {currentStep > 0 && (
              <button
                onClick={handlePrev}
                className="btn-secondary"
                style={{ padding: '8px 16px', fontSize: '13px' }}
              >
                <ChevronLeft size={16} /> Back
              </button>
            )}

            <button
              onClick={handleNext}
              className="btn-primary"
              style={{ padding: '8px 20px', fontSize: '13px' }}
            >
              {currentStep < tutorialSteps.length - 1 ? (
                <>
                  <span>Next Step</span>
                  <ChevronRight size={16} />
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  <span>Start Playing!</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
