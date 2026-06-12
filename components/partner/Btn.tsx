'use client';

import type { ReactNode } from 'react';

type BtnProps = {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'rose' | 'danger';
  small?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit';
  className?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
};

export function Btn({
  children,
  variant = 'primary',
  small,
  onClick,
  type = 'button',
  className = '',
  style,
  disabled,
}: BtnProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`partner-btn partner-btn--${variant} ${small ? 'partner-btn--small' : ''} ${className}`}
      style={style}
    >
      {children}
    </button>
  );
}
