import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../services/api';
import { SocialAuthButtons } from './SocialAuthButtons';
import { EmailLoginForm } from './EmailLoginForm';
import { OnboardingFlow } from './OnboardingFlow';
import { SessionManager } from './SessionManager';
import { LegalModal, type LegalModalType } from '../legal/LegalModal';
import { TrendingUp, Target, Users, Lock, ArrowLeft } from 'lucide-react';
import './AuthView.css';

type AuthViewMode = 'login' | 'register' | 'otp' | 'onboarding' | 'security';

export const AuthLayout: React.FC = () => {
  const { login, register, finalizeLogin } = useAuth();
  const { success, error: showError } = useToast();

  const [viewMode, setViewMode] = useState<AuthViewMode>('login');
  const [legalModalType, setLegalModalType] = useState<LegalModalType>(null);
  const [formData, setFormData] = useState({ username: '', email: '', password: '' });
  const [otpCode, setOtpCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  useEffect(() => {
    // Handle URL hash auth callbacks or error messages
    const hash = window.location.hash || '';
    const search = window.location.search || '';
    if (hash.includes('auth_error') || search.includes('message=')) {
      const queryString = hash.includes('?') ? hash.split('?')[1] : (search.startsWith('?') ? search.substring(1) : '');
      const params = new URLSearchParams(queryString);
      const errorMsg = params.get('message');
      if (errorMsg) {
        showError(decodeURIComponent(errorMsg));
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }

    let interval: number;
    if (resendTimer > 0) {
      interval = window.setInterval(() => setResendTimer(prev => prev - 1), 1000);
    }
    return () => window.clearInterval(interval);
  }, [resendTimer, showError]);

  const handleFormSubmit = async (data: any) => {
    setFormData(data);
    setIsLoading(true);
    try {
      if (viewMode === 'login') {
        await login({ username: data.username, password: data.password });
        success("Welcome back to Code Realm!");
      } else if (viewMode === 'register') {
        await register(data);
        setViewMode('otp');
        setResendTimer(60);
        success("Registration submitted! Check your email for OTP verification.");
      }
    } catch (err: any) {
      if (err.detail && typeof err.detail === 'object' && err.detail.message === "Account not verified") {
        setFormData(prev => ({ ...prev, email: err.detail.email || data.email }));
        setViewMode('otp');
        showError("Account unverified. A fresh verification OTP has been sent.");
        setResendTimer(60);
      } else {
        const msg = typeof err.detail === 'string' ? err.detail : (err.message || 'Authentication failed');
        showError(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialSuccess = async (tokens: any) => {
    await finalizeLogin(tokens);
    success("Identity verified! Entering Code Realm...");
  };

  const handleOtpVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const tokens = await api.verifyOtp(formData.email, otpCode);
      await finalizeLogin(tokens);
      success("Identity verified! Welcome Explorer.");
      setViewMode('onboarding');
    } catch (err: any) {
      showError(err.message || 'OTP verification failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendTimer > 0) return;
    setIsLoading(true);
    try {
      await api.resendOtp(formData.email);
      success("A new verification code has been dispatched.");
      setResendTimer(60);
    } catch (err: any) {
      showError(err.message || 'Failed to resend OTP');
    } finally {
      setIsLoading(false);
    }
  };

  if (viewMode === 'onboarding') {
    return (
      <div className="cr-auth-wrapper">
        <OnboardingFlow onComplete={() => setViewMode('login')} />
      </div>
    );
  }

  if (viewMode === 'security') {
    return (
      <div className="cr-auth-wrapper">
        <div className="cr-auth-container" style={{ minHeight: 'auto' }}>
          <button
            type="button"
            onClick={() => setViewMode('login')}
            className="cr-sec-center-btn"
            style={{ marginBottom: '24px', alignSelf: 'flex-start' }}
          >
            <ArrowLeft size={14} />
            <span>Back to Authentication</span>
          </button>
          <SessionManager />
        </div>
      </div>
    );
  }

  return (
    <div className="cr-auth-wrapper">
      <div className="cr-auth-container">
        {/* Top Navigation Header */}
        <header className="cr-auth-header">
          <div className="cr-logo">
            <span className="cr-logo-icon">&lt;/&gt;</span>
            <span className="cr-logo-text">CODE</span>
            <span className="cr-logo-sub">REALM</span>
          </div>
        </header>

        {/* Main Content Split */}
        <main className="cr-auth-body">
          {/* Left Column Showcase */}
          <div className="cr-showcase">
            <div>
              <h1 className="cr-hero-heading">
                <span className="cr-hero-white">Welcome back,</span>
                <span className="cr-hero-purple">Explorer</span>
              </h1>
              <p className="cr-hero-sub">
                Continue your journey. Your code.<br />
                Your realm. Your rules.
              </p>
            </div>

            <div className="cr-features">
              {/* Feature 1 */}
              <div className="cr-feature-item">
                <div className="cr-feature-icon-box">
                  <TrendingUp size={20} className="cr-feature-icon-indigo" />
                </div>
                <div className="cr-feature-text">
                  <span className="cr-feature-title">Track Progress</span>
                  <span className="cr-feature-desc">Level up your skills and unlock new realms.</span>
                </div>
              </div>

              {/* Feature 2 */}
              <div className="cr-feature-item">
                <div className="cr-feature-icon-box">
                  <Target size={20} className="cr-feature-icon-emerald" />
                </div>
                <div className="cr-feature-text">
                  <span className="cr-feature-title">Smart Challenges</span>
                  <span className="cr-feature-desc">AI-crafted challenges adapted to you.</span>
                </div>
              </div>

              {/* Feature 3 */}
              <div className="cr-feature-item">
                <div className="cr-feature-icon-box">
                  <Users size={20} className="cr-feature-icon-amber" />
                </div>
                <div className="cr-feature-text">
                  <span className="cr-feature-title">Join a Community</span>
                  <span className="cr-feature-desc">Compete, collaborate, and grow together.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column Form Card */}
          <div className="cr-form-card">
            {viewMode === 'otp' ? (
              /* OTP Verification Screen */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="cr-form-header">
                  <h2 className="cr-form-title">Verify Your Identity</h2>
                  <p className="cr-form-subtitle">
                    We sent a code to <strong style={{ color: '#818cf8' }}>{formData.email}</strong>
                  </p>
                </div>

                <form onSubmit={handleOtpVerify} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div className="cr-field">
                    <label className="cr-label">Verification Code</label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      placeholder="123456"
                      className="cr-input"
                      style={{ textAlign: 'center', fontSize: '20px', letterSpacing: '0.4em', paddingLeft: '14px' }}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || otpCode.length < 6}
                    className="cr-btn-primary"
                  >
                    {isLoading ? 'Verifying...' : 'Verify Identity →'}
                  </button>
                </form>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13px' }}>
                  <button
                    type="button"
                    onClick={() => setViewMode('register')}
                    className="cr-toggle-link"
                  >
                    ← Back
                  </button>
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resendTimer > 0}
                    className="cr-toggle-link"
                  >
                    {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend code'}
                  </button>
                </div>
              </div>
            ) : (
              /* Standard Sign In / Register Screen */
              <>
                <div className="cr-form-header">
                  <h2 className="cr-form-title">
                    {viewMode === 'login' ? 'Sign in to your account' : 'Create your account'}
                  </h2>
                  <p className="cr-form-subtitle">
                    {viewMode === 'login'
                      ? 'Choose your preferred sign-in method'
                      : 'Join Code Realm and master programming'}
                  </p>
                </div>

                {/* Row of 3 Social Buttons */}
                <SocialAuthButtons onSuccess={handleSocialSuccess} onError={showError} />

                {/* Divider */}
                <div className="cr-divider">
                  <span>or</span>
                </div>

                {/* Email / Password Form */}
                <EmailLoginForm
                  mode={viewMode}
                  onSubmit={handleFormSubmit}
                  isLoading={isLoading}
                  onToggleMode={() => setViewMode(viewMode === 'login' ? 'register' : 'login')}
                />

                {/* Security Encryption Guarantee Banner */}
                <div className="cr-security-banner">
                  <Lock size={16} className="cr-security-lock-icon" />
                  <div className="cr-security-text">
                    <span className="cr-security-title">Your data is encrypted and secure</span>
                    <span className="cr-security-sub">We never share your information.</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </main>

        {/* Footer */}
        <footer className="cr-auth-footer">
          <div>© 2026 Code Realm. All rights reserved.</div>

          <div className="cr-footer-links">
            <button
              type="button"
              onClick={() => setLegalModalType('privacy')}
              className="cr-footer-link"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              Privacy
            </button>
            <button
              type="button"
              onClick={() => setLegalModalType('terms')}
              className="cr-footer-link"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              Terms
            </button>
            <button
              type="button"
              onClick={() => setLegalModalType('help')}
              className="cr-footer-link"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              Help
            </button>
          </div>
        </footer>
      </div>

      <LegalModal
        type={legalModalType}
        onClose={() => setLegalModalType(null)}
      />
    </div>
  );
};
