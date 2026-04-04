'use client';

import { useCallback, useState } from 'react';

export function OrderSummaryCopyAllButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(false);

  const onCopy = useCallback(async () => {
    setError(false);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError(true);
      setTimeout(() => setError(false), 3000);
    }
  }, [text]);

  return (
    <button
      type="button"
      className="admin-btn admin-btn-outline admin-summary-copy-btn"
      onClick={onCopy}
      aria-label="Copy full order summary to clipboard"
    >
      {copied ? 'Copied!' : error ? 'Copy failed' : 'Copy all'}
    </button>
  );
}
