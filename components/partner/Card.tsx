'use client';

import type { ReactNode } from 'react';

type CardProps = {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
};

export function Card({ children, className = '', style }: CardProps) {
  return (
    <div className={`partner-card ${className}`} style={style}>
      {children}
    </div>
  );
}
