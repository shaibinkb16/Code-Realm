import React from 'react';

interface PasswordStrengthProps {
  password: string;
}

export const calculatePasswordStrength = (password: string) => {
  if (!password) return { score: 0, label: '', color: 'bg-slate-700' };
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  if (score <= 1) return { score: 1, label: 'Weak', color: 'bg-rose-500' };
  if (score <= 3) return { score: 2, label: 'Good', color: 'bg-amber-500' };
  return { score: 3, label: 'Strong', color: 'bg-emerald-500' };
};

export const PasswordStrength: React.FC<PasswordStrengthProps> = ({ password }) => {
  if (!password) return null;
  const { score, label, color } = calculatePasswordStrength(password);

  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex items-center justify-between text-[11px] font-mono">
        <span className="text-slate-400">Password strength</span>
        <span className={score === 1 ? 'text-rose-400' : score === 2 ? 'text-amber-400' : 'text-emerald-400'}>
          {label}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-1.5 h-1">
        <div className={`rounded-full transition-all duration-300 ${score >= 1 ? color : 'bg-white/10'}`} />
        <div className={`rounded-full transition-all duration-300 ${score >= 2 ? color : 'bg-white/10'}`} />
        <div className={`rounded-full transition-all duration-300 ${score >= 3 ? color : 'bg-white/10'}`} />
      </div>
    </div>
  );
};
