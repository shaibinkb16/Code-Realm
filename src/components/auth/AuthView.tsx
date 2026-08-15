import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { api, API_BASE_URL } from '../../services/api';
import { Terminal, Code2, Cpu, ArrowRight, ShieldCheck, Key, Mail, User, ShieldAlert } from 'lucide-react';
import './AuthView.css';

export const AuthView: React.FC = () => {
  const { login, register, finalizeLogin } = useAuth();
  const { success, error: showError } = useToast();
  
  const [viewMode, setViewMode] = useState<'login' | 'register' | 'otp'>('login');
  
  const [formData, setFormData] = useState({ username: '', email: '', password: '' });
  const [otpCode, setOtpCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);

  const [resendTimer, setResendTimer] = useState(0);

  useEffect(() => {
    // Check if redirected with an auth_error in URL hash or search
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      if (viewMode === 'login') {
        await login({ username: formData.username, password: formData.password });
        success("Welcome back to Code Realm!");
      } else if (viewMode === 'register') {
        await register(formData);
        setViewMode('otp');
        success("Registration successful! Check your email for the OTP.");
        setResendTimer(60);
      }
    } catch (err: any) {
      if (err.detail && typeof err.detail === 'object' && err.detail.message === "Account not verified") {
        setFormData(prev => ({ ...prev, email: err.detail.email || formData.email }));
        setViewMode('otp');
        showError("Your account is not verified. A new OTP has been sent to your email.");
        setResendTimer(60);
      } else {
        const msg = typeof err.detail === 'string' ? err.detail : (err.message || 'Authentication failed');
        showError(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const tokens = await api.verifyOtp(formData.email, otpCode);
      await finalizeLogin(tokens);
      success("Identity verified! Entering the realm...");
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
      success("A new code has been sent to your email.");
      setResendTimer(60);
    } catch (err: any) {
      showError(err.message || 'Failed to resend OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const calculatePasswordStrength = (pwd: string) => {
    if (!pwd) return 0;
    let score = 0;
    if (pwd.length > 7) score += 1;
    if (/[A-Z]/.test(pwd)) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;
    return score;
  };

  const strength = calculatePasswordStrength(formData.password);
  const strengthLabels = ['Too Weak', 'Weak', 'Fair', 'Good', 'Strong'];
  const strengthColors = ['var(--danger)', 'var(--danger)', 'var(--warning)', 'var(--info)', 'var(--success)'];

  const renderForm = () => {
    if (viewMode === 'otp') {
      return (
        <form onSubmit={handleOtpVerify} className="auth-form is-otp">
          <h2>Verify Identity</h2>
          <p className="auth-subtitle">
            We sent a 6-digit code to <strong>{formData.email}</strong>.
          </p>

          <div className="input-group" style={{ marginTop: '24px' }}>
            <label>Security Code</label>
            <div className="input-wrapper">
              <ShieldAlert size={18} className="input-icon" />
              <input 
                type="text" 
                placeholder="123456" 
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                required 
                style={{ letterSpacing: '0.5em', fontSize: '18px', textAlign: 'center' }}
              />
            </div>
          </div>

          <button type="submit" className="auth-submit-btn" disabled={isLoading || otpCode.length < 6}>
            {isLoading ? <span className="spinner"></span> : 'Verify Code'}
          </button>
          
          <div style={{ textAlign: 'center', marginTop: '16px' }}>
            <button 
              type="button" 
              onClick={handleResendOtp}
              disabled={resendTimer > 0 || isLoading}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '13px', cursor: resendTimer > 0 ? 'not-allowed' : 'pointer', textDecoration: resendTimer > 0 ? 'none' : 'underline' }}
            >
              {resendTimer > 0 ? `Resend Code in ${resendTimer}s` : 'Resend Code'}
            </button>
          </div>
          
          <div style={{ textAlign: 'center', marginTop: '16px' }}>
            <button 
              type="button" 
              onClick={() => { setViewMode('login'); }}
              style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontSize: '13px', cursor: 'pointer' }}
            >
              Back to Login
            </button>
          </div>
        </form>
      );
    }

    return (
      <>
        <div className="auth-tabs">
          <button 
            className={`auth-tab ${viewMode === 'login' ? 'active' : ''}`}
            onClick={() => { setViewMode('login'); }}
          >
            Sign In
          </button>
          <button 
            className={`auth-tab ${viewMode === 'register' ? 'active' : ''}`}
            onClick={() => { setViewMode('register'); }}
          >
            Create Account
          </button>
        </div>

        <form onSubmit={handleSubmit} className={`auth-form ${viewMode === 'login' ? 'is-login' : 'is-register'}`}>
          <h2>{viewMode === 'login' ? 'Welcome Back' : 'Join the Realm'}</h2>
          <p className="auth-subtitle">
            {viewMode === 'login' ? 'Enter your credentials to continue your journey.' : 'Register to start your coding adventure.'}
          </p>

          <div className="input-group" style={{ marginTop: '24px' }}>
            <label>{viewMode === 'login' ? 'Username or Email' : 'Username'}</label>
            <div className="input-wrapper">
              <User size={18} className="input-icon" />
              <input 
                type="text" 
                placeholder={viewMode === 'login' ? "e.g. CodeNinja or user@example.com" : "e.g. CodeNinja"} 
                value={formData.username}
                onChange={(e) => setFormData({...formData, username: e.target.value})}
                required 
              />
            </div>
          </div>

          {viewMode === 'register' && (
            <div className="input-group">
              <label>Email Address</label>
              <div className="input-wrapper">
                <Mail size={18} className="input-icon" />
                <input 
                  type="email" 
                  placeholder="you@example.com" 
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  required 
                />
              </div>
            </div>
          )}

          <div className="input-group">
            <label>Password</label>
            <div className="input-wrapper" style={{ position: 'relative' }}>
              <Key size={18} className="input-icon" />
              <input 
                type={showPassword ? "text" : "password"} 
                placeholder="••••••••" 
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                required 
                style={{ paddingRight: '40px' }}
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '4px'
                }}
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"></path><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"></path><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"></path><line x1="2" y1="2" x2="22" y2="22"></line></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                )}
              </button>
            </div>
            {viewMode === 'register' && formData.password.length > 0 && (
              <div className="password-strength">
                <div className="strength-bars">
                  {[1, 2, 3, 4].map(idx => (
                    <div 
                      key={idx} 
                      className="strength-bar" 
                      style={{ 
                        background: strength >= idx ? strengthColors[strength] : 'var(--bg-surface)' 
                      }}
                    />
                  ))}
                </div>
                <span style={{ color: strengthColors[strength] }}>
                  {strengthLabels[strength]}
                </span>
              </div>
            )}
          </div>

          {/* Social Authentication Options */}
          <div className="auth-social-section">
            <div className="auth-divider">
              <span>OR</span>
            </div>
            <div className="social-auth-group">
              <button 
                type="button" 
                className="social-btn social-btn-google"
                onClick={() => {
                  const googleUrl = `${API_BASE_URL.replace('/v1', '')}/auth/google`;
                  window.location.href = googleUrl;
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" className="social-icon">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                <span>Continue with Google</span>
              </button>

              <button 
                type="button" 
                className="social-btn social-btn-github"
                onClick={() => {
                  const githubUrl = `${API_BASE_URL.replace('/v1', '')}/auth/github`;
                  window.location.href = githubUrl;
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="social-icon">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
                </svg>
                <span>Continue with GitHub</span>
              </button>
            </div>
          </div>

          <button type="submit" className="auth-submit-btn" disabled={isLoading}>
            {isLoading ? (
              <span className="spinner"></span>
            ) : (
              <>
                {viewMode === 'login' ? 'Authenticate' : 'Initialize Account'}
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>
      </>
    );
  };

  return (
    <div className="auth-container">
      <div className="auth-background">
        <div className="glow glow-1"></div>
        <div className="glow glow-2"></div>
        <div className="glow glow-3"></div>
      </div>

      <div className="auth-content">
        <div className="auth-showcase">
          <div className="showcase-icon">
            <Terminal size={48} color="var(--accent-primary)" />
          </div>
          <h1>Welcome to<br/>Code Realm</h1>
          <p>Level up your programming skills, battle bosses, and build your digital empire.</p>
          
          <div className="feature-list">
            <div className="feature-item"><Code2 size={20} /> <span>Interactive Coding Challenges</span></div>
            <div className="feature-item"><Cpu size={20} /> <span>AI Mentor & Code Reviews</span></div>
            <div className="feature-item"><ShieldCheck size={20} /> <span>Competitive Leaderboards</span></div>
          </div>
        </div>

        <div className="auth-form-wrapper">
          <div className="auth-glass-panel">
            {renderForm()}
          </div>
        </div>
      </div>
    </div>
  );
};
