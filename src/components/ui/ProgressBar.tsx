import React from 'react';

export interface ProgressBarProps {
  value: number;
  max?: number;
  height?: string;
  colorGradient?: string;
  label?: string;
  showText?: boolean;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  height = '8px',
  colorGradient = 'linear-gradient(90deg, var(--accent-gold) 0%, var(--accent-orange) 100%)',
  label,
  showText = false
}) => {
  const percent = Math.min(100, Math.max(0, Math.round((value / max) * 100)));

  return (
    <div style={{ width: '100%' }}>
      {(label || showText) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
          {label && <span style={{ color: 'var(--text-main)' }}>{label}</span>}
          {showText && <span style={{ color: 'var(--accent-gold)' }}>{percent}%</span>}
        </div>
      )}
      <div style={{ background: 'rgba(0,0,0,0.5)', height, borderRadius: '4px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{
          background: colorGradient,
          height: '100%',
          width: `${percent}%`,
          borderRadius: '4px',
          transition: 'width 0.4s ease'
        }} />
      </div>
    </div>
  );
};
