import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'orange' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  className = '',
  disabled,
  style,
  ...props
}) => {
  const getClassName = () => {
    switch (variant) {
      case 'orange': return 'btn-orange';
      case 'secondary': return 'btn-secondary';
      default: return 'btn-primary';
    }
  };

  const getPadding = () => {
    switch (size) {
      case 'sm': return '6px 12px';
      case 'lg': return '14px 28px';
      default: return '10px 20px';
    }
  };

  const getFontSize = () => {
    switch (size) {
      case 'sm': return '12px';
      case 'lg': return '16px';
      default: return '14px';
    }
  };

  return (
    <button
      className={`${getClassName()} ${className}`}
      disabled={disabled || isLoading}
      style={{
        padding: getPadding(),
        fontSize: getFontSize(),
        opacity: disabled ? 0.6 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        ...style
      }}
      {...props}
    >
      {isLoading ? (
        <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⌛</span>
      ) : (
        <>
          {leftIcon}
          <span>{children}</span>
          {rightIcon}
        </>
      )}
    </button>
  );
};
