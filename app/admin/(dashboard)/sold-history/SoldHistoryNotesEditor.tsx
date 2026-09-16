'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { SoldProductEntityType } from '@/lib/admin/soldProductsHistoryTypes';

const MAX_SOLD_HISTORY_NOTES_LENGTH = 2000;

interface SoldHistoryNotesEditorProps {
  entityType: SoldProductEntityType;
  entityId: string;
  initialNotes: string | null;
  canEdit: boolean;
}

export function SoldHistoryNotesEditor({
  entityType,
  entityId,
  initialNotes,
  canEdit,
}: SoldHistoryNotesEditorProps) {
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
    if (next.length > MAX_SOLD_HISTORY_NOTES_LENGTH) {
      setMessage({
        type: 'error',
        text: `Notes must be ${MAX_SOLD_HISTORY_NOTES_LENGTH} characters or fewer`,
      });
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(
        `/api/admin/products/sold-history/${entityType}/${encodeURIComponent(entityId)}/notes`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sold_history_notes: next || null }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ type: 'error', text: data.error ?? 'Failed to update notes' });
        return;
      }
      setMessage({ type: 'success', text: 'Notes saved' });
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
    <div className="admin-sold-history-notes">
      <div className="admin-summary-card-header" style={{ marginBottom: 8 }}>
        <h4 style={{ margin: 0 }}>Notes</h4>
        {canEdit && !editing ? (
          <button
            type="button"
            className="admin-btn admin-btn-outline admin-btn-sm"
            onClick={() => {
              setEditing(true);
              setMessage(null);
            }}
          >
            Edit notes
          </button>
        ) : null}
      </div>

      {!editing ? (
        <p className="admin-hint" style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
          {savedNotes || '—'}
        </p>
      ) : (
        <div className="admin-form" style={{ gap: 12 }}>
          <div className="admin-form-group" style={{ marginBottom: 0 }}>
            <textarea
              className="admin-input"
              rows={4}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              disabled={saving}
              maxLength={MAX_SOLD_HISTORY_NOTES_LENGTH}
              placeholder="e.g. Reliable size, customer loved the vase pairing…"
            />
            <p className="admin-hint" style={{ marginTop: 6, marginBottom: 0 }}>
              {draft.trim().length}/{MAX_SOLD_HISTORY_NOTES_LENGTH}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="admin-btn admin-btn-primary admin-btn-sm"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving…' : 'Save notes'}
            </button>
            <button
              type="button"
              className="admin-btn admin-btn-outline admin-btn-sm"
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
          style={{ marginTop: 8, marginBottom: 0 }}
          role="status"
        >
          {message.text}
        </p>
      ) : null}
    </div>
  );
}
