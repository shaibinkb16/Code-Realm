import React, { useState, useEffect } from 'react';
import { soundManager } from '../../utils/audio';
import {
  ChevronRight,
  ChevronLeft,
  X,
  CheckCircle2
} from 'lucide-react';

interface TourStep {
  target: string;
  title: string;
  badge: string;
  icon: string;
  description: string;
  howToUse: string;
}

export const SpotlightTour: React.FC = () => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const tourSteps: TourStep[] = [
    {
      target: 'brand',
      title: 'BRAND & PLAYER PROFILE',
      badge: 'PROFILES & STATS',
      icon: '🌍',
      description: 'Your command center profile! Shows your current Developer Level, XP progress bar, and Rank rating.',
      howToUse: 'Watch this bar fill up as you submit passing code solutions and clear nodes.'
    },
    {
      target: 'world',
      title: 'RPG WORLD MAP',
      badge: 'MAIN JOURNEY',
      icon: '🗺️',
      description: 'The core RPG adventure map spanning 8 distinct realms from Starter Village to High Systems Temple.',
      howToUse: 'Click here to view unlocked node missions, puzzles, bug hunts, and boss battles.'
    },
    {
      target: 'challenge',
      title: 'CODE WORKSTATION',
      badge: 'IDE EDITOR',
      icon: '💻',
      description: 'Your isolated sandboxed code execution environment supporting Python 3.11 and JavaScript.',
      howToUse: 'Write code, click "RUN TESTS" to run unit tests in 16ms, and click "SUBMIT" to claim XP.'
    },
    {
      target: 'boss',
      title: 'BOSS BATTLE ARENA',
      badge: 'COMBAT LOOPS',
      icon: '🐉',
      description: 'Multi-phase combat against epic boss algorithms like The Fiery Monarch of Infinite Loops.',
      howToUse: 'Solve time-critical algorithmic problems to deal damage and defeat the boss before the timer expires.'
    },
    {
      target: 'leaderboards',
      title: 'GLOBAL LEADERBOARDS',
      badge: 'COMPETITION',
      icon: '🏆',
      description: 'Global, regional, and guild rankings showing top developers across the realm.',
      howToUse: 'Climb the ladder by earning stars and maintaining high ELO in 1v1 Code Duels.'
    },
    {
      target: 'hq',
      title: 'DEVELOPER HQ & PET DRAGON',
      badge: 'COMPANION & HQ',
      icon: '🏰',
      description: 'Your personal office HQ and pet dragon companion Pyra! Upgrade your desk items and feed your dragon.',
      howToUse: 'Spend Gold Coins to upgrade your pet and unlock new tech infrastructure towers.'
    },
    {
      target: 'hud',
      title: 'CURRENCY & STREAK HUD',
      badge: 'INVENTORY',
      icon: '🪙',
      description: 'Tracks your Stars ⭐, Gold Coins 🪙, and Daily Login Streak 🔥.',
      howToUse: 'Log in daily to keep your streak alive and earn bonus multiplier rewards.'
    },
    {
      target: 'ai-btn',
      title: 'ASK AI MENTOR',
      badge: 'AI GUIDANCE',
      icon: '🧠',
      description: 'Your 24/7 intelligent AI tutor and prompt injection defense engine.',
      howToUse: 'Click this button anytime to ask for debugging help, code explanations, or hints.'
    },
    {
      target: 'theme-toggle',
      title: 'LIGHT & DARK THEME SWITCHER',
      badge: 'UI THEME',
      icon: '🌗',
      description: 'Instant toggle between High-Contrast Dark Mode and Pure White Light Mode.',
      howToUse: 'Click anytime to adjust workspace contrast to your preferred environment.'
    }
  ];

  useEffect(() => {
    const completed = localStorage.getItem('coderealm_spotlight_completed');
    if (!completed) {
      setIsOpen(true);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const step = tourSteps[currentStep];
    const el = document.querySelector(`[data-tour="${step.target}"]`);
    if (el) {
      const rect = el.getBoundingClientRect();
      setTargetRect(rect);
    } else {
      setTargetRect(null);
    }
  }, [isOpen, currentStep]);

  const handleNext = () => {
    soundManager.playClick();
    if (currentStep < tourSteps.length - 1) {
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
    localStorage.setItem('coderealm_spotlight_completed', 'true');
    setIsOpen(false);
  };

  if (!isOpen) return null;

  const step = tourSteps[currentStep];

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 1000,
      pointerEvents: 'auto'
    }}>
      {/* Target Cutout Hole Backdrop using SVG Mask (100% Un-blurred & Crystal Clear Target) */}
      <svg
        style={{
          position: 'fixed',
          inset: 0,
          width: '100vw',
          height: '100vh',
          pointerEvents: 'none',
          zIndex: 1000
        }}
      >
        <defs>
          <mask id="spotlight-mask">
            {/* White canvas = show backdrop */}
            <rect width="100%" height="100%" fill="white" />
            {/* Black cutout = 100% clear un-blurred hole for target element */}
            {targetRect && (
              <rect
                x={targetRect.left - 6}
                y={targetRect.top - 6}
                width={targetRect.width + 12}
                height={targetRect.height + 12}
                rx={8}
                fill="black"
              />
            )}
          </mask>
        </defs>

        {/* Dim Overlay with Mask Cutout */}
        <rect
          width="100%"
          height="100%"
          fill="rgba(0, 0, 0, 0.7)"
          mask="url(#spotlight-mask)"
        />
      </svg>

      {/* Crystal Clear Target Outline Ring */}
      {targetRect && (
        <div style={{
          position: 'fixed',
          left: `${targetRect.left - 6}px`,
          top: `${targetRect.top - 6}px`,
          width: `${targetRect.width + 12}px`,
          height: `${targetRect.height + 12}px`,
          border: '2px solid var(--text-main)',
          borderRadius: '8px',
          boxShadow: '0 0 16px var(--text-main)',
          zIndex: 1001,
          pointerEvents: 'none',
          transition: 'all 0.25s ease'
        }} />
      )}

      {/* Guided Tooltip Popover Drawer */}
      <div style={{
        position: 'fixed',
        left: targetRect ? `${Math.min(window.innerWidth - 440, Math.max(300, targetRect.right + 24))}px` : '50%',
        top: targetRect ? `${Math.min(window.innerHeight - 380, Math.max(80, targetRect.top))}px` : '50%',
        transform: targetRect ? 'none' : 'translate(-50%, -50%)',
        width: '420px',
        maxWidth: '90vw',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-bright)',
        borderRadius: '12px',
        boxShadow: 'var(--shadow-game)',
        padding: '24px',
        zIndex: 1002,
        animation: 'fadeIn 0.2s ease',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <span style={{
              fontSize: '9px',
              fontWeight: 800,
              padding: '2px 6px',
              borderRadius: '4px',
              background: 'var(--text-main)',
              color: 'var(--bg-dark)',
              fontFamily: 'var(--font-mono)'
            }}>
              {step.badge} ({currentStep + 1}/{tourSteps.length})
            </span>
            <h3 style={{ fontSize: '18px', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--text-main)', marginTop: '6px' }}>
              {step.icon} {step.title}
            </h3>
          </div>

          <button
            onClick={handleSkip}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Description */}
        <p style={{ fontSize: '13px', color: 'var(--text-main)', lineHeight: 1.6 }}>
          {step.description}
        </p>

        {/* How to Use Box */}
        <div style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-dark)',
          padding: '12px 14px',
          borderRadius: '8px',
          fontSize: '12px',
          color: 'var(--text-main)',
          fontWeight: 600,
          lineHeight: 1.5
        }}>
          💡 <strong>HOW TO USE:</strong> {step.howToUse}
        </div>

        {/* Footer Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
          <div style={{ display: 'flex', gap: '4px' }}>
            {tourSteps.map((_, idx) => (
              <div
                key={idx}
                style={{
                  width: idx === currentStep ? '16px' : '6px',
                  height: '6px',
                  borderRadius: '3px',
                  background: idx === currentStep ? 'var(--text-main)' : 'var(--border-dark)',
                  transition: 'all 0.2s ease'
                }}
              />
            ))}
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            {currentStep > 0 && (
              <button
                onClick={handlePrev}
                className="btn-secondary"
                style={{ padding: '6px 12px', fontSize: '12px' }}
              >
                <ChevronLeft size={14} /> Back
              </button>
            )}

            <button
              onClick={handleNext}
              className="btn-primary"
              style={{ padding: '6px 16px', fontSize: '12px' }}
            >
              {currentStep < tourSteps.length - 1 ? (
                <>
                  <span>Next Icon</span>
                  <ChevronRight size={14} />
                </>
              ) : (
                <>
                  <CheckCircle2 size={14} />
                  <span>Got It!</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
