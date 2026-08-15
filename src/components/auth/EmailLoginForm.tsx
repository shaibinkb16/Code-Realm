import React, { useState } from 'react';
import { Mail, Eye, EyeOff, ArrowRight, Loader2 } from 'lucide-react';
import { PasswordStrength } from './PasswordStrength';
import './AuthView.css';

interface EmailLoginFormProps {
  mode: 'login' | 'register';
  onSubmit: (formData: any) => Promise<void>;
  isLoading: boolean;
  onToggleMode: () => void;
}

export const EmailLoginForm: React.FC<EmailLoginFormProps> = ({ mode, onSubmit, isLoading, onToggleMode }) => {
  const [formData, setFormData] = useState({ username: '', email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [emailError, setEmailError] = useState('');

  const handleEmailChange = (val: string) => {
    setFormData(prev => ({ ...prev, email: val }));
    if (val && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
      setEmailError('Please enter a valid email address');
    } else {
      setEmailError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
      {/* Email / Username Field */}
      <div className="cr-field">
        <label className="cr-label">
          {mode === 'login' ? 'Email or Username' : 'Username'}
        </label>
        <div className="cr-input-wrapper">
          <Mail size={16} className="cr-input-icon" />
          <input
            type="text"
            required
            autoComplete="username"
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            placeholder={mode === 'login' ? 'Enter username or email' : 'Choose explorer name'}
            className="cr-input"
          />
        </div>
      </div>

      {/* Email Field (Required in Register Mode) */}
      {mode === 'register' && (
        <div className="cr-field">
          <label className="cr-label">Email Address</label>
          <div className="cr-input-wrapper">
            <Mail size={16} className="cr-input-icon" />
            <input
              type="email"
              required
              autoComplete="email"
              value={formData.email}
              onChange={(e) => handleEmailChange(e.target.value)}
              placeholder="name@example.com"
              className="cr-input"
              style={emailError ? { borderColor: '#ef4444' } : {}}
            />
          </div>
          {emailError && (
            <p style={{ marginTop: '4px', fontSize: '11px', color: '#fca5a5' }}>
              ⚠ {emailError}
            </p>
          )}
        </div>
      )}

      {/* Password Field */}
      <div className="cr-field">
        <label className="cr-label">Password</label>
        <div className="cr-input-wrapper">
          <input
            type={showPassword ? 'text' : 'password'}
            required
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            placeholder="••••••••••••••••"
            className="cr-input"
            style={{ paddingLeft: '14px', paddingRight: '40px' }}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="cr-input-toggle"
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        {mode === 'register' && <PasswordStrength password={formData.password} />}
      </div>

      {/* Controls Row (Remember me & Forgot password) */}
      {mode === 'login' && (
        <div className="cr-options-row">
          <label className="cr-remember">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="cr-checkbox"
            />
            <span>Remember me</span>
          </label>

          <a href="#forgot" className="cr-forgot-link">
            Forgot password?
          </a>
        </div>
      )}

      {/* Primary Action Button */}
      <button
        type="submit"
        disabled={isLoading || (mode === 'register' && !!emailError)}
        className="cr-btn-primary"
      >
        {isLoading ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            <span>Authenticating...</span>
          </>
        ) : (
          <>
            <span>{mode === 'login' ? 'Enter Code Realm' : 'Begin Journey'}</span>
            <ArrowRight size={16} />
          </>
        )}
      </button>

      {/* Mode Toggle */}
      <div className="cr-toggle-account">
        <span>{mode === 'login' ? 'New here?' : 'Already have an account?'}</span>
        <button
          type="button"
          onClick={onToggleMode}
          className="cr-toggle-link"
        >
          {mode === 'login' ? 'Create your account' : 'Sign in'}
        </button>
      </div>
    </form>
  );
};
