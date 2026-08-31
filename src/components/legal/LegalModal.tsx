import React, { useState } from 'react';
import { X, Shield, FileText, HelpCircle, ChevronRight, Lock } from 'lucide-react';

export type LegalModalType = 'privacy' | 'terms' | 'help' | null;

interface Props {
  type: LegalModalType;
  onClose: () => void;
}

export const LegalModal: React.FC<Props> = ({ type, onClose }) => {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  if (!type) return null;

  const toggleFaq = (idx: number) => {
    setActiveFaq(prev => prev === idx ? null : idx);
  };

  const faqs = [
    {
      q: "How does Code Realm level progression work?",
      a: "Each world realm contains 17 major waypoints with 100 sub-level questions each. To unlock the next major level (e.g. Level 2), you must complete at least 75 questions in your current level."
    },
    {
      q: "How do 1v1 Code Duels work?",
      a: "In the Arena, you compete in real-time against algorithmic bots or other players. Solve the speed challenge, pass all unit test cases before your opponent or timer expires, and climb the ELO rating ladder!"
    },
    {
      q: "How do Multi-Phase Boss Battles work?",
      a: "Boss battles consist of 3 escalating combat phases. Each phase presents a unique combat calculation or algorithmic puzzle. Writing code that passes all test cases unleashes 1,000 HP combat strikes on the boss."
    },
    {
      q: "Is my code safe and private in the sandbox?",
      a: "Yes. All code runs in ephemeral, isolated sandboxes with strict execution timeouts and no filesystem access to user data. We never sell or train public models on private solutions."
    },
    {
      q: "How do I earn XP, Coins, and Evolve Companions?",
      a: "Solving workstation challenges, winning arena duels, and defeating bosses grants XP and Coins. Coins can be used in your Developer HQ to upgrade your study rooms and evolve your pet companion from Baby to Legend Dragon."
    }
  ];

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.82)',
      backdropFilter: 'blur(6px)',
      zIndex: 2000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px'
    }}>
      <div className="realm-card-gold" style={{
        width: '640px',
        maxWidth: '100%',
        maxHeight: '88vh',
        borderRadius: '16px',
        display: 'flex',
        flexDirection: 'column',
        padding: 0,
        overflow: 'hidden',
        boxShadow: '0 0 40px rgba(0, 0, 0, 0.9), 0 0 20px rgba(217, 160, 54, 0.25)',
        border: '1px solid var(--border-bright)'
      }}>
        {/* Modal Header */}
        <div style={{
          padding: '18px 24px',
          background: 'var(--bg-surface)',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              background: type === 'privacy' ? 'rgba(52, 211, 153, 0.15)' : type === 'terms' ? 'rgba(217, 160, 54, 0.15)' : 'rgba(99, 102, 241, 0.15)',
              color: type === 'privacy' ? '#34d399' : type === 'terms' ? 'var(--accent-gold)' : '#818cf8',
              padding: '8px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {type === 'privacy' && <Shield size={20} />}
              {type === 'terms' && <FileText size={20} />}
              {type === 'help' && <HelpCircle size={20} />}
            </div>
            <div>
              <h3 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                {type === 'privacy' && 'Privacy Policy'}
                {type === 'terms' && 'Terms of Service'}
                {type === 'help' && 'Help & FAQ Center'}
              </h3>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                CODE REALM • Platform Documentation
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div style={{
          padding: '24px',
          overflowY: 'auto',
          fontSize: '13.5px',
          color: 'var(--text-muted)',
          lineHeight: 1.65,
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          {type === 'privacy' && (
            <>
              <div style={{ background: 'rgba(52, 211, 153, 0.08)', border: '1px solid rgba(52, 211, 153, 0.25)', borderRadius: '10px', padding: '14px' }}>
                <div style={{ color: '#34d399', fontWeight: 700, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Lock size={15} /> Your Code & Privacy are Sacred
                </div>
                <div style={{ fontSize: '12.5px', color: 'var(--text-main)' }}>
                  Code Realm is built on zero-data monetization principles. We do not sell your personal data, and your code submissions are strictly used for test execution and real-time AI mentoring.
                </div>
              </div>

              <div>
                <h4 style={{ color: 'var(--text-main)', fontSize: '14px', fontWeight: 700, marginBottom: '6px' }}>1. Information We Collect</h4>
                <p>When you register or log in, we collect your email address, username, encrypted password hashes (Argon2id/bcrypt), and in-game progression data (solved levels, stars, XP, and ratings).</p>
              </div>

              <div>
                <h4 style={{ color: 'var(--text-main)', fontSize: '14px', fontWeight: 700, marginBottom: '6px' }}>2. Code Execution Sandboxing</h4>
                <p>Code submitted in the workstation or duels is executed in isolated execution environments with strict resource constraints and memory limits. Code is discarded immediately after unit tests conclude.</p>
              </div>

              <div>
                <h4 style={{ color: 'var(--text-main)', fontSize: '14px', fontWeight: 700, marginBottom: '6px' }}>3. Data Storage & Security</h4>
                <p>All credentials, session tokens, and database records are stored in managed PostgreSQL databases with encryption at rest and in transit via TLS 1.3.</p>
              </div>
            </>
          )}

          {type === 'terms' && (
            <>
              <div style={{ background: 'rgba(217, 160, 54, 0.08)', border: '1px solid rgba(217, 160, 54, 0.25)', borderRadius: '10px', padding: '14px' }}>
                <div style={{ color: 'var(--accent-gold)', fontWeight: 700, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FileText size={15} /> Fair Play & Community Guidelines
                </div>
                <div style={{ fontSize: '12.5px', color: 'var(--text-main)' }}>
                  Code Realm is designed for genuine algorithmic learning, competitive programming growth, and friendly peer duels.
                </div>
              </div>

              <div>
                <h4 style={{ color: 'var(--text-main)', fontSize: '14px', fontWeight: 700, marginBottom: '6px' }}>1. Account Responsibility</h4>
                <p>You are responsible for maintaining the confidentiality of your credentials and all activities occurring under your account.</p>
              </div>

              <div>
                <h4 style={{ color: 'var(--text-main)', fontSize: '14px', fontWeight: 700, marginBottom: '6px' }}>2. Fair Play in Duels & Championships</h4>
                <p>Automated submission scripts, bots that exploit sandbox vulnerabilities, or network tampering in ranked duels are strictly prohibited and result in permanent rating resets.</p>
              </div>

              <div>
                <h4 style={{ color: 'var(--text-main)', fontSize: '14px', fontWeight: 700, marginBottom: '6px' }}>3. Virtual Rewards</h4>
                <p>XP, Coins, Badges, and HQ buildings are virtual in-game achievements and possess no real-world monetary value.</p>
              </div>
            </>
          )}

          {type === 'help' && (
            <>
              <div style={{ background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.25)', borderRadius: '10px', padding: '14px' }}>
                <div style={{ color: '#818cf8', fontWeight: 700, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <HelpCircle size={15} /> Frequently Asked Questions
                </div>
                <div style={{ fontSize: '12.5px', color: 'var(--text-main)' }}>
                  Quick answers to common questions about realms, duels, boss battles, and developer progression.
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {faqs.map((faq, i) => {
                  const isOpen = activeFaq === i;
                  return (
                    <div
                      key={i}
                      style={{
                        background: 'var(--bg-elevated)',
                        border: `1px solid ${isOpen ? 'var(--border-bright)' : 'var(--border-subtle)'}`,
                        borderRadius: '10px',
                        overflow: 'hidden'
                      }}
                    >
                      <button
                        onClick={() => toggleFaq(i)}
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--text-main)',
                          fontWeight: 700,
                          fontSize: '13px',
                          textAlign: 'left',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '8px'
                        }}
                      >
                        <span>{faq.q}</span>
                        <ChevronRight
                          size={16}
                          style={{
                            transform: isOpen ? 'rotate(90deg)' : 'none',
                            transition: 'transform 0.2s ease',
                            flexShrink: 0
                          }}
                        />
                      </button>
                      {isOpen && (
                        <div style={{
                          padding: '0 16px 14px 16px',
                          fontSize: '12.5px',
                          color: 'var(--text-muted)',
                          lineHeight: 1.6,
                          borderTop: '1px solid rgba(255,255,255,0.05)'
                        }}>
                          {faq.a}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div style={{
          padding: '14px 24px',
          background: 'var(--bg-surface)',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          justifyContent: 'flex-end'
        }}>
          <button
            onClick={onClose}
            className="btn-primary"
            style={{ padding: '6px 20px', fontSize: '13px' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
