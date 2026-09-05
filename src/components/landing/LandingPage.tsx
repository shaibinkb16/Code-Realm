import React, { useState } from 'react';
import { LandingBackground } from './LandingBackground';
import { LandingHeroDemo } from './LandingHeroDemo';
import { LegalModal, type LegalModalType } from '../legal/LegalModal';
import {
  Sparkles,
  Play,
  Swords,
  ChevronDown,
  ArrowRight,
  Terminal,
  CheckCircle2,
  Laptop
} from 'lucide-react';
import './LandingPage.css';

interface Props {
  onOpenAuth: (mode?: 'login' | 'register') => void;
}

export const LandingPage: React.FC<Props> = ({ onOpenAuth }) => {
  const [legalModalType, setLegalModalType] = useState<LegalModalType>(null);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(prev => (prev === index ? null : index));
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const faqItems = [
    {
      q: 'Is Code Realm completely free to start?',
      a: 'Yes! You can explore Realm 1 (Starter Village), solve 100-level sub-quests, duel opponents, evolve your companion pet, and test code in real Python/JavaScript sandboxes for free.'
    },
    {
      q: 'What programming languages are supported?',
      a: 'Code Realm currently supports Python and JavaScript with real server-side execution, interactive test-case runners, AI syntax evaluation, and dynamic question generators.'
    },
    {
      q: 'How does the RPG leveling and Elo rating work?',
      a: 'Every quest you clear awards XP, Coins, and Skill Elo ratings. Competing in 1v1 PvP matches increases your competitive ranking from Bronze to Grandmaster.'
    },
    {
      q: 'Are the challenges real code execution or just multiple choice?',
      a: 'Zero multiple choice filler! Every trial is a genuine coding challenge executed in a secure backend container sandbox against strict test cases.'
    },
    {
      q: 'Can I play with my friends or guild mates?',
      a: 'Yes! You can challenge developers in real-time Code Duels, climb global and guild leaderboards, and team up for Multi-Phase Boss Raids.'
    }
  ];

  return (
    <div className="landing-root">
      <LandingBackground />

      {/* ─── 1. TOP NAVIGATION ─── */}
      <header className="landing-navbar">
        <div className="landing-nav-container">
          <div className="landing-brand" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <img
              src="/logo.jpg"
              alt="CODE REALM"
              className="brand-logo-img"
            />
            <div className="brand-text-block">
              <span className="brand-title">CODE REALM</span>
              <span className="brand-subtitle">MMORPG CODE ENGINE</span>
            </div>
          </div>

          <nav className="landing-nav-links">
            <button onClick={() => scrollToSection('gameplay')} className="nav-link-btn">
              Gameplay
            </button>
            <button onClick={() => scrollToSection('features')} className="nav-link-btn">
              Features
            </button>
            <button onClick={() => scrollToSection('realms')} className="nav-link-btn">
              World Map
            </button>
            <button onClick={() => scrollToSection('faq')} className="nav-link-btn">
              FAQ
            </button>
          </nav>

          <div className="landing-nav-actions">
            <button onClick={() => onOpenAuth('login')} className="btn-nav-signin">
              Sign In
            </button>
            <button onClick={() => onOpenAuth('register')} className="btn-nav-playfree">
              <span>Start Free</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </header>

      {/* ─── 2. HERO SECTION ─── */}
      <section className="landing-hero-section">
        <div className="hero-content-container">
          {/* Animated Launch Pill */}
          <div className="hero-pill-badge">
            <span className="pill-dot" />
            <span className="pill-text">SEASON 01 • PYTHON AGE • 1,700+ QUESTS ACTIVE</span>
            <Sparkles size={14} className="pill-sparkle" />
          </div>

          {/* Primary Hero Headline */}
          <h1 className="hero-main-headline">
            🎮 Learn to Code Like You’re Playing an RPG
          </h1>

          {/* Punchy Startup Subtext */}
          <p className="hero-subtext">
            Complete coding quests. Defeat challenges. Level up your skills. Compete with other developers.
          </p>

          {/* Hero Actions */}
          <div className="hero-cta-group">
            <button onClick={() => onOpenAuth('register')} className="btn-hero-primary">
              <span className="btn-shimmer" />
              <Play size={18} fill="currentColor" />
              <span>Start Playing — Free</span>
              <ArrowRight size={18} />
            </button>

            <button onClick={() => scrollToSection('gameplay')} className="btn-hero-secondary">
              <Laptop size={18} />
              <span>Try Live Sandbox Demo</span>
            </button>
          </div>

          {/* Trust Highlights */}
          <div className="hero-trust-bar">
            <div className="trust-item">
              <CheckCircle2 size={16} color="#34d399" />
              <span>17 Map Waypoints</span>
            </div>
            <div className="trust-divider" />
            <div className="trust-item">
              <Terminal size={16} color="#38bdf8" />
              <span>Real PostgreSQL Sandbox</span>
            </div>
            <div className="trust-divider" />
            <div className="trust-item">
              <Swords size={16} color="#f59e0b" />
              <span>1v1 Live Code Duels</span>
            </div>
            <div className="trust-divider" />
            <div className="trust-item">
              <Sparkles size={16} color="#ec4899" />
              <span>24/7 AI Mentor</span>
            </div>
          </div>
        </div>

        {/* ─── 3. INTERACTIVE HERO GAMEPLAY DEMO WIDGET ─── */}
        <div id="gameplay" className="hero-gameplay-container">
          <div className="gameplay-section-header">
            <span className="badge-glow">INTERACTIVE GAMEPLAY PREVIEW</span>
            <h2 className="gameplay-title">Experience Code Realm Right Now</h2>
            <p className="gameplay-sub">Click around below: run code in the live sandbox, explore RPG waypoints, or simulate a 1v1 duel.</p>
          </div>

          <LandingHeroDemo onStartFree={() => onOpenAuth('register')} />
        </div>
      </section>

      {/* ─── 4. BENTO GRID FEATURES SHOWCASE ─── */}
      <section id="features" className="landing-bento-section">
        <div className="section-title-wrap">
          <span className="badge-glow">CORE ENGINE FEATURES</span>
          <h2 className="section-title">Built Like a AAA RPG. Engineered for Real Devs.</h2>
          <p className="section-sub">Everything you need to master algorithms, syntax, and system design from scratch to senior engineer.</p>
        </div>

        <div className="bento-grid">
          {/* Card 1: 17 Waypoints */}
          <div className="bento-card card-large">
            <div className="bento-card-bg glow-teal" />
            <div className="bento-card-content">
              <div className="card-icon-badge">🗺️</div>
              <h3 className="card-heading">17-Point RPG World Map</h3>
              <p className="card-desc">
                Progress through 17 thematic waypoints containing 100 sub-levels each. From elementary variable storage to complex dynamic programming and AI algorithms.
              </p>
              <div className="card-stat-pill">1,700+ Total Quest Stages</div>
            </div>
          </div>

          {/* Card 2: 1v1 Arena */}
          <div className="bento-card card-medium">
            <div className="bento-card-bg glow-amber" />
            <div className="bento-card-content">
              <div className="card-icon-badge">⚔️</div>
              <h3 className="card-heading">Ranked 1v1 Code Duels</h3>
              <p className="card-desc">
                Matchmake against players or AI opponents in 60-second rapid-fire syntax battles. Climb from Bronze to Grandmaster.
              </p>
              <div className="card-stat-pill">Real-time Elo Ratings</div>
            </div>
          </div>

          {/* Card 3: Overlord Boss Raids */}
          <div className="bento-card card-medium">
            <div className="bento-card-bg glow-red" />
            <div className="bento-card-content">
              <div className="card-icon-badge">🐲</div>
              <h3 className="card-heading">Multi-Phase Boss Battles</h3>
              <p className="card-desc">
                Defeat epic bosses like the Memory Leak Hydra and Loop Monarch with phase-breaking code solutions.
              </p>
              <div className="card-stat-pill">Massive XP & Rare Badges</div>
            </div>
          </div>

          {/* Card 4: AI Mentor */}
          <div className="bento-card card-large">
            <div className="bento-card-bg glow-indigo" />
            <div className="bento-card-content">
              <div className="card-icon-badge">🤖</div>
              <h3 className="card-heading">Lore-Driven AI Mentor & Game Director</h3>
              <p className="card-desc">
                Get intelligent explanations, hints, and error diagnostics tailored directly to your current coding rating without giving away the answers.
              </p>
              <div className="card-stat-pill">24/7 Contextual Guidance</div>
            </div>
          </div>

          {/* Card 5: Developer HQ & Companions */}
          <div className="bento-card card-full">
            <div className="bento-card-bg glow-gold" />
            <div className="bento-card-content flex-row-responsive">
              <div className="bento-text-left">
                <div className="card-icon-badge">🏰</div>
                <h3 className="card-heading">Developer HQ & Evolving Companion Pyra</h3>
                <p className="card-desc">
                  Maintain your daily streak to evolve your pet Pyra into a Legend Dragon. Build API Towers, Variable Labs, and collect daily passive coin income.
                </p>
              </div>
              <div className="bento-badge-right">
                <button onClick={() => onOpenAuth('register')} className="btn-bento-cta">
                  Claim Companion Pyra →
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 4.5. WORLD MAP & PROGRESSION REALMS SECTION ─── */}
      <section id="realms" className="landing-realms-section">
        <div className="section-title-wrap">
          <span className="badge-glow">WORLD MAP & REALMS</span>
          <h2 className="section-title">Explore 17 Major Waypoint Realms</h2>
          <p className="section-sub">A continuous RPG skill journey designed to turn programming beginners into elite engineers.</p>
        </div>

        <div className="realms-grid">
          {[
            {
              id: 'starter-village',
              name: '1. Starter Village',
              tagline: 'The Spark of Logic & Variables',
              desc: 'Master primitive datatypes, standard I/O, string formatting, and boolean states across 100 trials.',
              color: '#34d399',
              icon: '🌱',
              stages: '100 Stages',
              difficulty: 'Beginner',
              boss: 'Mini-Boss: Logic Golem'
            },
            {
              id: 'variable-grove',
              name: '2. Variable Grove',
              tagline: 'Memory & Scope Citadel',
              desc: 'Deep-dive into immutable types, memory allocation, string slicing, and arithmetic operators.',
              color: '#38bdf8',
              icon: '⚡',
              stages: '100 Stages',
              difficulty: 'Beginner+',
              boss: 'Off-by-One Specter'
            },
            {
              id: 'gatekeeper-logic',
              name: '3. Gatekeeper of Logic',
              tagline: 'Branching & Boolean Crypts',
              desc: 'Control flow, nested match-case statements, ternary conditionals, and boolean algebra tables.',
              color: '#818cf8',
              icon: '🛡️',
              stages: '100 Stages',
              difficulty: 'Intermediate',
              boss: 'Boolean Crypt Riddle'
            },
            {
              id: 'loop-citadel',
              name: '4. Loop Citadel',
              tagline: 'Iteration & Loop Stairways',
              desc: 'For-loops, while loops, range steps, list comprehensions, break/continue flow optimizations.',
              color: '#f59e0b',
              icon: '🔁',
              stages: '100 Stages',
              difficulty: 'Intermediate',
              boss: 'Infinite Loop Guardian'
            },
            {
              id: 'algo-highlands',
              name: '5. Algorithm Highlands',
              tagline: 'Recursion & Data Structures',
              desc: 'Binary search, stacks, queues, hash maps, recursion depth trees, and sliding window paradigms.',
              color: '#ec4899',
              icon: '⛰️',
              stages: '100 Stages',
              difficulty: 'Advanced',
              boss: 'Recursion Depth Hydra'
            },
            {
              id: 'monarch-citadel',
              name: '6. Overlord Citadel',
              tagline: 'Final Boss & Staff Engineering',
              desc: 'System architecture, production memory leak debug, dynamic programming, and AI heuristic challenges.',
              color: '#ef4444',
              icon: '👑',
              stages: '100 Stages',
              difficulty: 'Master / Staff',
              boss: 'Final Boss: Monarch of Loops'
            }
          ].map((realm) => (
            <div key={realm.id} className="realm-preview-card" style={{ '--realm-accent': realm.color } as React.CSSProperties}>
              <div className="realm-card-top">
                <span className="realm-card-icon">{realm.icon}</span>
                <span className="realm-diff-badge" style={{ color: realm.color, borderColor: `${realm.color}40`, background: `${realm.color}15` }}>
                  {realm.difficulty}
                </span>
              </div>

              <h3 className="realm-card-name">{realm.name}</h3>
              <div className="realm-card-tagline">{realm.tagline}</div>
              <p className="realm-card-desc">{realm.desc}</p>

              <div className="realm-card-meta">
                <span className="realm-stage-count">🎯 {realm.stages}</span>
                <span className="realm-boss-preview">🔥 {realm.boss}</span>
              </div>

              <button onClick={() => onOpenAuth('register')} className="btn-enter-realm">
                <span>Enter Waypoint</span>
                <ArrowRight size={14} />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* ─── 5. LIVE STATS / ARCHITECTURE STRIP ─── */}
      <section className="landing-stats-strip">
        <div className="stats-container">
          <div className="stat-box">
            <span className="stat-number">1,700+</span>
            <span className="stat-label">Coding Quests</span>
          </div>
          <div className="stat-box">
            <span className="stat-number">100%</span>
            <span className="stat-label">Real Sandboxes (Zero Mock)</span>
          </div>
          <div className="stat-box">
            <span className="stat-number">5 Tiers</span>
            <span className="stat-label">HQ Buildings & Evolution</span>
          </div>
          <div className="stat-box">
            <span className="stat-number">&lt; 15ms</span>
            <span className="stat-label">Sandbox Execution Speed</span>
          </div>
        </div>
      </section>

      {/* ─── 6. FAQ SECTION ─── */}
      <section id="faq" className="landing-faq-section">
        <div className="section-title-wrap">
          <span className="badge-glow">FREQUENTLY ASKED QUESTIONS</span>
          <h2 className="section-title">Everything You Need to Know</h2>
          <p className="section-sub">Have questions? We have answers. If you need anything else, our AI Mentor is ready 24/7.</p>
        </div>

        <div className="faq-accordion-wrap">
          {faqItems.map((item, idx) => {
            const isOpen = openFaqIndex === idx;
            return (
              <div key={idx} className={`faq-card ${isOpen ? 'open' : ''}`}>
                <button onClick={() => toggleFaq(idx)} className="faq-question-btn">
                  <span className="faq-q-text">{item.q}</span>
                  <ChevronDown size={18} className={`faq-chevron ${isOpen ? 'rotated' : ''}`} />
                </button>
                {isOpen && (
                  <div className="faq-answer-pane">
                    <p>{item.a}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── 7. CONVERSION BOTTOM BANNER ─── */}
      <section className="landing-bottom-cta">
        <div className="bottom-cta-card">
          <div className="cta-glow-mesh" />
          <div className="cta-content">
            <span className="badge-gold">START YOUR ADVENTURE TODAY</span>
            <h2 className="cta-headline">Ready to Master Code Like an RPG Hero?</h2>
            <p className="cta-sub">Join thousands of developers leveling up their problem solving skills every day.</p>
            <div className="cta-action-row">
              <button onClick={() => onOpenAuth('register')} className="btn-cta-main">
                <Play size={18} fill="currentColor" />
                <span>Start Playing Free ⚔️</span>
              </button>
              <button onClick={() => onOpenAuth('login')} className="btn-cta-ghost">
                <span>Already an Explorer? Sign In</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 8. STARTUP FOOTER ─── */}
      <footer className="landing-footer">
        <div className="footer-container">
          <div className="footer-top-row">
            <div className="footer-brand-info">
              <div className="brand-inline">
                <img
                  src="/logo.jpg"
                  alt="CODE REALM"
                  className="footer-logo-img"
                />
                <span className="brand-name">CODE REALM</span>
              </div>
              <p className="footer-tagline">
                The next-generation gamified coding platform. Master programming through RPG mechanics, 1v1 duels, and live container sandboxes.
              </p>
              <div className="system-status-indicator">
                <span className="status-ping" />
                <span>All Sandbox Systems Operational</span>
              </div>
            </div>

            <div className="footer-links-group">
              <div className="footer-col">
                <h4 className="footer-col-title">Game Realms</h4>
                <a onClick={() => scrollToSection('realms')}>Starter Village</a>
                <a onClick={() => scrollToSection('gameplay')}>PvP Code Arena</a>
                <a onClick={() => scrollToSection('gameplay')}>Boss Raids</a>
                <a onClick={() => scrollToSection('features')}>Developer HQ</a>
              </div>

              <div className="footer-col">
                <h4 className="footer-col-title">Platform</h4>
                <a onClick={() => onOpenAuth('register')}>Create Free Account</a>
                <a onClick={() => onOpenAuth('login')}>Member Login</a>
                <a onClick={() => scrollToSection('faq')}>FAQ</a>
              </div>

              <div className="footer-col">
                <h4 className="footer-col-title">Legal & Trust</h4>
                <a onClick={() => setLegalModalType('privacy')}>Privacy Policy</a>
                <a onClick={() => setLegalModalType('terms')}>Terms of Service</a>
                <a onClick={() => setLegalModalType('help')}>Help & Support</a>
              </div>
            </div>
          </div>

          <div className="footer-bottom-row">
            <p className="copyright-text">
              © {new Date().getFullYear()} Code Realm Inc. Engineered with zero mocks & real production sandboxes.
            </p>
            <div className="footer-tech-badge">
              <span>PostgreSQL • Docker Sandbox • FastAPI • React</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Legal Modals */}
      <LegalModal type={legalModalType} onClose={() => setLegalModalType(null)} />
    </div>
  );
};
