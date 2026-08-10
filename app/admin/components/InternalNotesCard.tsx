'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminCopyTextButton } from '@/app/admin/components/AdminCopyTextButton';

const MAX_INTERNAL_NOTES_LENGTH = 2000;

interface InternalNotesCardProps {
  orderId: string;
  initialNotes: string | null;
  canEdit: boolean;
}

export function InternalNotesCard({ orderId, initialNotes, canEdit }: InternalNotesCardProps) {
  const router = useRouter();
  const savedNotes = initialNotes?.trim() ?? '';

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(savedNotes);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (editing) return;
    setDraft(savedNotes);
  }, [savedNotes, editing]);

  const handleCancel = () => {
    setEditing(false);
    setDraft(savedNotes);
    setMessage(null);
  };

  const handleSave = async () => {
    if (!canEdit || saving) return;
    const next = draft.trim();
    if (next.length > MAX_INTERNAL_NOTES_LENGTH) {
      setMessage({
        type: 'error',
        text: `Notes must be ${MAX_INTERNAL_NOTES_LENGTH} characters or fewer`,
      });
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(
        `/api/admin/orders/${encodeURIComponent(orderId)}/internal-notes`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ internal_notes: next || null }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ type: 'error', text: data.error ?? 'Failed to update internal notes' });
        return;
      }
      setMessage({ type: 'success', text: 'Internal notes saved' });
      setEditing(false);
      setTimeout(() => setMessage(null), 3000);
      router.refresh();
    } catch (e) {
      setMessage({ type: 'error', text: e instanceof Error ? e.message : 'Network error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="admin-section">
      <div className="admin-summary-card-header" style={{ marginBottom: 12 }}>
        <h2 className="admin-section-title" style={{ marginBottom: 0 }}>
          Internal staff notes
        </h2>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <AdminCopyTextButton
            text={savedNotes}
            ariaLabel="Copy internal staff notes"
          >
            {savedNotes ? 'Copy notes' : 'No notes'}
          </AdminCopyTextButton>
          {canEdit && !editing ? (
            <button
              type="button"
              className="admin-btn admin-btn-outline"
              onClick={() => {
                setEditing(true);
                setMessage(null);
              }}
            >
              Edit notes
            </button>
          ) : null}
        </div>
      </div>

      <p className="admin-hint" style={{ marginBottom: 12 }}>
        Staff only — not shown to customers or drivers. Use for internal instructions from
        customers or ops.
      </p>

      {!editing ? (
        <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{savedNotes || '—'}</p>
      ) : (
        <div className="admin-form" style={{ gap: 12 }}>
          <div className="admin-form-group" style={{ marginBottom: 0 }}>
            <label htmlFor={`internal-notes-${orderId}`}>Notes</label>
            <textarea
              id={`internal-notes-${orderId}`}
              className="admin-input"
              rows={5}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              disabled={saving}
              maxLength={MAX_INTERNAL_NOTES_LENGTH}
              placeholder="e.g. Customer asked to call before delivery; gate code is…"
            />
            <p className="admin-hint" style={{ marginTop: 6, marginBottom: 0 }}>
              {draft.trim().length}/{MAX_INTERNAL_NOTES_LENGTH}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="admin-btn admin-btn-primary"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving…' : 'Save notes'}
            </button>
            <button
              type="button"
              className="admin-btn admin-btn-outline"
              onClick={handleCancel}
              disabled={saving}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {message ? (
        <p
          className={message.type === 'success' ? 'admin-success' : 'admin-error'}
          style={{ marginTop: 12, marginBottom: 0 }}
          role="status"
        >
          {message.text}
        </p>
      ) : null}
    </section>
  );
}
