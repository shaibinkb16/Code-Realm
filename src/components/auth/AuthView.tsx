import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Terminal, Code2, Cpu, ArrowRight, ShieldCheck, Key, Mail, User } from 'lucide-react';
import './AuthView.css'; // We will create this next

export const AuthView: React.FC = () => {
  const { login, register } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ username: '', email: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      if (isLogin) {
        await login({ username: formData.username, password: formData.password });
      } else {
        await register(formData);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
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
    return score; // 0 to 4
  };

  const strength = calculatePasswordStrength(formData.password);
  const strengthLabels = ['Too Weak', 'Weak', 'Fair', 'Good', 'Strong'];
  const strengthColors = ['var(--danger)', 'var(--danger)', 'var(--warning)', 'var(--info)', 'var(--success)'];

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
            <div className="auth-tabs">
              <button 
                className={`auth-tab ${isLogin ? 'active' : ''}`}
                onClick={() => { setIsLogin(true); setError(null); }}
              >
                Sign In
              </button>
              <button 
                className={`auth-tab ${!isLogin ? 'active' : ''}`}
                onClick={() => { setIsLogin(false); setError(null); }}
              >
                Create Account
              </button>
            </div>

            <form onSubmit={handleSubmit} className={`auth-form ${isLogin ? 'is-login' : 'is-register'}`}>
              <h2>{isLogin ? 'Welcome Back' : 'Join the Realm'}</h2>
              <p className="auth-subtitle">
                {isLogin ? 'Enter your credentials to continue your journey.' : 'Register to start your coding adventure.'}
              </p>

              {error && <div className="auth-error">{error}</div>}

              <div className="input-group">
                <label>Username</label>
                <div className="input-wrapper">
                  <User size={18} className="input-icon" />
                  <input 
                    type="text" 
                    placeholder="e.g. CodeNinja" 
                    value={formData.username}
                    onChange={(e) => setFormData({...formData, username: e.target.value})}
                    required 
                  />
                </div>
              </div>

              {!isLogin && (
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
                <div className="input-wrapper">
                  <Key size={18} className="input-icon" />
                  <input 
                    type="password" 
                    placeholder="••••••••" 
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    required 
                  />
                </div>
                {!isLogin && formData.password.length > 0 && (
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

              <button type="submit" className="auth-submit-btn" disabled={isLoading}>
                {isLoading ? (
                  <span className="spinner"></span>
                ) : (
                  <>
                    {isLogin ? 'Authenticate' : 'Initialize Account'}
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
