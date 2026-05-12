'use client';

import { useMemo, useState } from 'react';

type CopyStatus = 'idle' | 'copied' | 'error';

interface CustomerReviewInviteProps {
  reviewUrl: string;
}

function fallbackCopy(text: string): boolean {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.top = '-9999px';
  textarea.style.opacity = '0';

  document.body.appendChild(textarea);
  textarea.select();

  try {
    return document.execCommand('copy');
  } finally {
    document.body.removeChild(textarea);
  }
}

async function copyText(text: string) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // Fall back for browsers that block clipboard access outside secure contexts.
    }
  }

  if (!fallbackCopy(text)) {
    throw new Error('Copy failed');
  }
}

export function CustomerReviewInvite({ reviewUrl }: CustomerReviewInviteProps) {
  const [status, setStatus] = useState<CopyStatus>('idle');

  const reviewMessage = useMemo(
    () =>
      `Hi! 🌸 Thank you for ordering from Lanna Bloom. If you loved your flowers, please leave us a quick Google review ⭐\n\n${reviewUrl}\n\nThank you so much! 🙏`,
    [reviewUrl]
  );

  async function handleCopyMessage() {
    setStatus('idle');

    try {
      await copyText(reviewMessage);
      setStatus('copied');
    } catch {
      setStatus('error');
    }
  }

  async function handleCopyLink() {
    setStatus('idle');

    try {
      await copyText(reviewUrl);
      setStatus('copied');
    } catch {
      setStatus('error');
    }
  }

  return (
    <div className="admin-form" style={{ gap: 12 }}>
      <div className="admin-form-group" style={{ marginBottom: 0 }}>
        <label htmlFor="customer-review-message">Message to customer</label>
        <textarea
          id="customer-review-message"
          className="admin-input"
          rows={4}
          value={reviewMessage}
          readOnly
          onFocus={(e) => e.currentTarget.select()}
        />
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <button type="button" className="admin-btn admin-btn-primary" onClick={handleCopyMessage}>
          {status === 'copied' ? 'Copied!' : 'Copy message 🌸'}
        </button>
        <button type="button" className="admin-btn admin-btn-outline" onClick={handleCopyLink}>
          Copy link
        </button>
      </div>

      {status === 'error' && (
        <p className="admin-costs-error" style={{ marginTop: 4 }}>
          Could not copy automatically. Select the message and copy it manually.
        </p>
      )}
    </div>
  );
}
