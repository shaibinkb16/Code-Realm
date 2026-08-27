import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useGame } from '../../context/GameContext';
import { X, MessageSquare, Star, Send, CheckCircle2, Clock, CheckCircle, AlertCircle, RefreshCw, Loader } from 'lucide-react';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface MyFeedbackItem {
  id: string;
  category: string;
  rating: number;
  message: string;
  status: string;
  admin_notes: string | null;
  resolved_at: string | null;
  created_at: string;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose }) => {
  const { triggerNotification } = useGame();
  const [activeSubTab, setActiveSubTab] = useState<'submit' | 'my_reports'>('submit');
  const [category, setCategory] = useState<string>('feature');
  const [rating, setRating] = useState<number>(5);
  const [message, setMessage] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);

  const [myFeedbackList, setMyFeedbackList] = useState<MyFeedbackItem[]>([]);
  const [isLoadingMyFeedback, setIsLoadingMyFeedback] = useState<boolean>(false);

  const fetchMyFeedback = async () => {
    setIsLoadingMyFeedback(true);
    try {
      const res = await api.getMyFeedback();
      setMyFeedbackList(res.feedback || []);
    } catch {
      // Ignore if unauthenticated
    } finally {
      setIsLoadingMyFeedback(false);
    }
  };

  useEffect(() => {
    if (isOpen && activeSubTab === 'my_reports') {
      fetchMyFeedback();
    }
  }, [isOpen, activeSubTab]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await api.submitFeedback({
        category,
        rating,
        message: message.trim()
      });

      setIsSubmitted(true);
      triggerNotification('⭐ Thank you! Your report has been submitted to the CODE REALM team.');
      setTimeout(() => {
        setIsSubmitted(false);
        setMessage('');
        setActiveSubTab('my_reports');
      }, 1500);
    } catch (err: any) {
      triggerNotification(err.message || 'Failed to submit feedback');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (statusStr: string) => {
    switch (statusStr) {
      case 'resolved':
        return (
          <span style={{
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            color: '#10b981',
            padding: '3px 8px',
            borderRadius: '6px',
            fontSize: '11px',
            fontWeight: 800,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <CheckCircle size={12} /> RESOLVED / FIXED
          </span>
        );
      case 'in_progress':
        return (
          <span style={{
            background: 'rgba(59, 130, 246, 0.15)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            color: '#60a5fa',
            padding: '3px 8px',
            borderRadius: '6px',
            fontSize: '11px',
            fontWeight: 800,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <Clock size={12} /> IN PROGRESS
          </span>
        );
      default:
        return (
          <span style={{
            background: 'rgba(217, 160, 54, 0.15)',
            border: '1px solid rgba(217, 160, 54, 0.3)',
            color: 'var(--accent-gold)',
            padding: '3px 8px',
            borderRadius: '6px',
            fontSize: '11px',
            fontWeight: 800,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <AlertCircle size={12} /> PENDING REVIEW
          </span>
        );
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.85)',
      backdropFilter: 'blur(6px)',
      zIndex: 1200,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div className="realm-card-gold" style={{
        width: '560px',
        maxWidth: '100%',
        padding: '28px',
        borderRadius: '20px',
        position: 'relative',
        boxShadow: '0 0 50px rgba(217, 160, 54, 0.3)',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column'
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

        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
          <div style={{ background: 'rgba(217, 160, 54, 0.15)', padding: '8px', borderRadius: '10px', color: 'var(--accent-gold)' }}>
            <MessageSquare size={22} />
          </div>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-main)', fontFamily: 'var(--font-display)', lineHeight: 1.2 }}>
              FEEDBACK & SUGGESTIONS
            </h2>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Help shape Code Realm with your ideas and bug reports</div>
          </div>
        </div>

        {/* Active Development Notice Banner */}
        <div style={{
          background: 'rgba(99, 102, 241, 0.12)',
          border: '1px solid rgba(99, 102, 241, 0.3)',
          borderRadius: '10px',
          padding: '10px 14px',
          marginBottom: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <span style={{ fontSize: '16px' }}>🚀</span>
          <div style={{ fontSize: '12px', color: 'var(--text-main)', lineHeight: 1.4 }}>
            <strong>Code Realm is under active development!</strong> We review all feedback daily — share your suggestions, ideas, or report any issues below.
          </div>
        </div>

        {/* Sub-tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '18px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '10px' }}>
          <button
            onClick={() => setActiveSubTab('submit')}
            style={{
              background: activeSubTab === 'submit' ? 'var(--bg-elevated)' : 'transparent',
              border: '1px solid',
              borderColor: activeSubTab === 'submit' ? 'var(--border-subtle)' : 'transparent',
              color: activeSubTab === 'submit' ? 'var(--text-main)' : 'var(--text-muted)',
              padding: '6px 14px',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            Submit Suggestion / Report
          </button>
          <button
            onClick={() => setActiveSubTab('my_reports')}
            style={{
              background: activeSubTab === 'my_reports' ? 'var(--bg-elevated)' : 'transparent',
              border: '1px solid',
              borderColor: activeSubTab === 'my_reports' ? 'var(--border-subtle)' : 'transparent',
              color: activeSubTab === 'my_reports' ? 'var(--text-main)' : 'var(--text-muted)',
              padding: '6px 14px',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            My Reports & Status
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {activeSubTab === 'submit' && (
            isSubmitted ? (
              <div style={{ textAlign: 'center', padding: '32px 16px' }}>
                <CheckCircle2 size={48} color="var(--success)" style={{ margin: '0 auto 16px' }} />
                <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-main)', marginBottom: '8px' }}>
                  FEEDBACK SUBMITTED!
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
                  Your suggestion has been logged. You can check its review and fix status in the "My Reports" tab.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                {/* Category Selector */}
                <div style={{ marginBottom: '18px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent-gold)', marginBottom: '6px', display: 'block', textTransform: 'uppercase' }}>
                    Category
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    {[
                      { id: 'bug', label: '🐛 Bug Report' },
                      { id: 'feature', label: '💡 Feature Idea' },
                      { id: 'content', label: '📚 Content / Questions' },
                      { id: 'general', label: '⭐ General Feedback' }
                    ].map(cat => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setCategory(cat.id)}
                        style={{
                          background: category === cat.id ? 'rgba(217, 160, 54, 0.15)' : 'var(--bg-elevated)',
                          border: '1px solid',
                          borderColor: category === cat.id ? 'var(--accent-gold)' : 'var(--border-subtle)',
                          color: category === cat.id ? 'var(--accent-gold)' : 'var(--text-main)',
                          padding: '10px 12px',
                          borderRadius: '8px',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          textAlign: 'left'
                        }}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Rating Stars */}
                <div style={{ marginBottom: '18px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent-gold)', marginBottom: '6px', display: 'block', textTransform: 'uppercase' }}>
                    Your Rating
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {[1, 2, 3, 4, 5].map(star => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '4px'
                        }}
                      >
                        <Star
                          size={24}
                          fill={star <= rating ? 'var(--accent-gold)' : 'transparent'}
                          color={star <= rating ? 'var(--accent-gold)' : 'var(--text-dim)'}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Message */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent-gold)', marginBottom: '6px', display: 'block', textTransform: 'uppercase' }}>
                    Message Details
                  </label>
                  <textarea
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    placeholder="Describe the bug, missing feature, or app improvement details..."
                    required
                    rows={4}
                    style={{
                      width: '100%',
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '10px',
                      padding: '12px',
                      color: 'var(--text-main)',
                      fontSize: '13px',
                      fontFamily: 'var(--font-body)',
                      resize: 'vertical',
                      outline: 'none'
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || !message.trim()}
                  className="btn-primary"
                  style={{ width: '100%', justifyContent: 'center', fontSize: '14px', opacity: isSubmitting || !message.trim() ? 0.6 : 1 }}
                >
                  <Send size={16} /> {isSubmitting ? 'SUBMITTING...' : 'SUBMIT REPORT'}
                </button>
              </form>
            )
          )}

          {activeSubTab === 'my_reports' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>Your Submitted Reports & Status</span>
                <button onClick={fetchMyFeedback} className="btn-secondary" style={{ padding: '4px 10px', fontSize: '11px' }}>
                  <RefreshCw size={12} /> Refresh
                </button>
              </div>

              {isLoadingMyFeedback ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '32px', color: 'var(--text-muted)' }}>
                  <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> Fetching reports status...
                  <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
                </div>
              ) : myFeedbackList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)', fontSize: '13px' }}>
                  You haven't submitted any bug reports or feedback yet.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {myFeedbackList.map(item => (
                    <div
                      key={item.id}
                      style={{
                        background: 'var(--bg-elevated)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '10px',
                        padding: '14px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                          {item.category === 'bug' ? '🐛 Bug' : item.category === 'feature' ? '💡 Feature' : item.category} · {new Date(item.created_at).toLocaleDateString()}
                        </span>
                        {getStatusBadge(item.status)}
                      </div>

                      <div style={{ fontSize: '13px', color: 'var(--text-main)', lineHeight: 1.5 }}>
                        {item.message}
                      </div>

                      {item.admin_notes && (
                        <div style={{
                          background: 'rgba(16, 185, 129, 0.1)',
                          border: '1px solid rgba(16, 185, 129, 0.25)',
                          borderRadius: '8px',
                          padding: '10px',
                          fontSize: '12px',
                          color: '#10b981',
                          marginTop: '4px'
                        }}>
                          <div style={{ fontWeight: 800, marginBottom: '2px', textTransform: 'uppercase', fontSize: '10px' }}>
                            🛡️ Admin Fix / Resolution Note:
                          </div>
                          <div>{item.admin_notes}</div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
