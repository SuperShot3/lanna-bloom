'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export type DeliveredPreviewPayload = {
  outboxId: string;
  subject: string;
  htmlBody: string;
  textBody: string | null;
  customerEmail: string;
  missingVariables: string[];
};

type Props = {
  open: boolean;
  onClose: () => void;
  orderId: string;
  initial: DeliveredPreviewPayload;
};

export function DeliveredEmailPreviewModal({ open, onClose, orderId, initial }: Props) {
  const router = useRouter();
  const [subject, setSubject] = useState(initial.subject);
  const [htmlBody, setHtmlBody] = useState(initial.htmlBody);
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  if (!open) return null;

  const saveDraft = async () => {
    setErr(null);
    const res = await fetch(`/api/admin/emails/outbox/${encodeURIComponent(initial.outboxId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject, html_body: htmlBody, text_body: initial.textBody }),
    });
    if (!res.ok) {
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      setErr(d.error ?? 'Save failed');
      return false;
    }
    return true;
  };

  const send = async () => {
    if (editing) {
      const ok = await saveDraft();
      if (!ok) return;
    }
    setSending(true);
    setErr(null);
    try {
      const res = await fetch(
        `/api/admin/emails/outbox/${encodeURIComponent(initial.outboxId)}/send`,
        { method: 'POST' }
      );
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setErr(d.error ?? 'Send failed');
        return;
      }
      onClose();
      router.refresh();
    } finally {
      setSending(false);
    }
  };

  const skip = async () => {
    setSending(true);
    setErr(null);
    try {
      const res = await fetch(
        `/api/admin/emails/outbox/${encodeURIComponent(initial.outboxId)}/cancel`,
        { method: 'POST' }
      );
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        setErr(d.error ?? 'Could not update');
        return;
      }
      onClose();
      router.refresh();
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="admin-modal-backdrop" role="dialog" aria-modal aria-labelledby="del-email-title">
      <div className="admin-modal admin-modal-wide">
        <h2 id="del-email-title" className="admin-section-title" style={{ marginTop: 0 }}>
          Review delivery email
        </h2>
        <p className="admin-hint" style={{ marginBottom: 8 }}>
          To: <strong>{initial.customerEmail}</strong> — Order: <strong>{orderId}</strong>
        </p>
        {initial.missingVariables.length > 0 && (
          <p className="admin-costs-error" style={{ fontSize: '0.9rem' }}>
            Empty or missing template variables: {initial.missingVariables.join(', ')} — the email is still
            sendable; fill template defaults or body before send if needed.
          </p>
        )}
        {err && <p className="admin-costs-error">{err}</p>}

        {editing ? (
          <div className="admin-mail-edit">
            <label className="admin-label" htmlFor="mail-subj">
              Subject
            </label>
            <input
              id="mail-subj"
              className="admin-input"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
            <label className="admin-label" htmlFor="mail-body">
              HTML body
            </label>
            <textarea
              id="mail-body"
              className="admin-textarea"
              rows={12}
              value={htmlBody}
              onChange={(e) => setHtmlBody(e.target.value)}
            />
          </div>
        ) : (
          <div className="admin-mail-preview">
            <p style={{ fontWeight: 600, marginBottom: 8 }}>{subject}</p>
            <iframe
              title="Email preview"
              className="admin-mail-iframe"
              srcDoc={htmlBody}
              sandbox="allow-same-origin"
            />
          </div>
        )}

        <div className="admin-mail-actions">
          <button
            type="button"
            className="admin-btn"
            onClick={send}
            disabled={sending}
          >
            {sending ? '…' : 'Send email'}
          </button>
          <button
            type="button"
            className="admin-btn admin-btn-outline"
            onClick={async () => {
              if (editing) {
                await saveDraft();
              }
              setEditing((e) => !e);
            }}
            disabled={sending}
          >
            {editing ? 'Preview' : 'Edit before sending'}
          </button>
          <button
            type="button"
            className="admin-btn admin-btn-outline"
            onClick={skip}
            disabled={sending}
          >
            Change status without email
          </button>
          <button type="button" className="admin-btn admin-btn-outline" onClick={onClose} disabled={sending}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
