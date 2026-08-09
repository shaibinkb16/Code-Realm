import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'gold' | 'elevated';
  padding?: string;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  padding = '24px',
  className = '',
  style,
  ...props
}) => {
  const getClassName = () => {
    switch (variant) {
      case 'gold': return 'realm-card-gold';
      default: return 'realm-card';
    }
  };

  return (
    <div
      className={`${getClassName()} ${className}`}
      style={{
        padding,
        borderRadius: '16px',
        ...style
      }}
      {...props}
    >
      {children}
    </div>
  );
};
