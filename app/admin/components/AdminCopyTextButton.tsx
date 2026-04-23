'use client';

import { useCallback, useState, type ReactNode } from 'react';

type AdminCopyTextButtonProps = {
  text: string;
  children: ReactNode;
  ariaLabel: string;
  className?: string;
};

export function AdminCopyTextButton({ text, children, ariaLabel, className = '' }: AdminCopyTextButtonProps) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(false);
  const disabled = !text.trim();

  const onCopy = useCallback(async () => {
    if (disabled) return;
    setError(false);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError(true);
      setTimeout(() => setError(false), 3000);
    }
  }, [text, disabled]);

  return (
    <button
      type="button"
      className={`admin-btn admin-btn-outline admin-copy-text-btn ${disabled ? 'admin-copy-text-btn--disabled' : ''} ${className}`.trim()}
      onClick={onCopy}
      disabled={disabled}
      aria-label={ariaLabel}
      title={disabled ? 'Nothing to copy' : ariaLabel}
    >
      {copied ? 'Copied!' : error ? 'Copy failed' : children}
    </button>
  );
}
