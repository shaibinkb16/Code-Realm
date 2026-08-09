import React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'gold' | 'orange' | 'emerald' | 'purple' | 'red';
  icon?: React.ReactNode;
  style?: React.CSSProperties;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'gold',
  icon,
  style
}) => {
  const getColors = () => {
    switch (variant) {
      case 'orange':
        return { bg: 'rgba(230, 103, 43, 0.2)', color: 'var(--accent-orange)', border: 'rgba(230, 103, 43, 0.4)' };
      case 'emerald':
        return { bg: 'rgba(56, 161, 105, 0.2)', color: '#68D391', border: 'rgba(56, 161, 105, 0.4)' };
      case 'purple':
        return { bg: 'rgba(128, 90, 213, 0.2)', color: '#B794F4', border: 'rgba(128, 90, 213, 0.4)' };
      case 'red':
        return { bg: 'rgba(197, 48, 48, 0.2)', color: '#FC8181', border: 'rgba(197, 48, 48, 0.4)' };
      default:
        return { bg: 'rgba(217, 160, 54, 0.2)', color: 'var(--accent-gold)', border: 'rgba(217, 160, 54, 0.4)' };
    }
  };

  const colors = getColors();

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      padding: '4px 10px',
      borderRadius: '20px',
      background: colors.bg,
      color: colors.color,
      border: `1px solid ${colors.border}`,
      fontSize: '11px',
      fontWeight: 800,
      letterSpacing: '0.05em',
      ...style
    }}>
      {icon}
      <span>{children}</span>
    </span>
  );
};
