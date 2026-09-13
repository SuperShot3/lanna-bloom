'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { EXPENSE_CATEGORY_COLORS } from '@/types/expenses';
import type { ExpenseCategoryRow } from '@/lib/expenses/expenseCategoryQueries';

interface Props {
  categories: ExpenseCategoryRow[];
  onClose: () => void;
}

interface EditDraft {
  label: string;
  color: string;
  is_cogs: boolean;
}

export function ManageCategoriesModal({ categories, onClose }: Props) {
  const router = useRouter();

  const [showAddForm, setShowAddForm] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newColor, setNewColor] = useState(EXPENSE_CATEGORY_COLORS[0]);
  const [newIsCogs, setNewIsCogs] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editingValue, setEditingValue] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null);
  const [rowBusyValue, setRowBusyValue] = useState<string | null>(null);

  const resetAddForm = () => {
    setNewLabel('');
    setNewColor(EXPENSE_CATEGORY_COLORS[0]);
    setNewIsCogs(false);
    setShowAddForm(false);
    setError(null);
  };

  const submitNewCategory = async () => {
    if (!newLabel.trim()) {
      setError('Name is required');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/expense-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: newLabel.trim(), color: newColor, is_cogs: newIsCogs }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Failed to create category');
        return;
      }
      resetAddForm();
      router.refresh();
    } catch {
      setError('Unexpected error while creating category');
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (cat: ExpenseCategoryRow) => {
    setEditingValue(cat.value);
    setEditDraft({ label: cat.label, color: cat.color, is_cogs: cat.is_cogs });
    setError(null);
  };

  const cancelEdit = () => {
    setEditingValue(null);
    setEditDraft(null);
  };

  const saveEdit = async (value: string) => {
    if (!editDraft || !editDraft.label.trim()) {
      setError('Name is required');
      return;
    }
    setRowBusyValue(value);
    setError(null);
    try {
      const res = await fetch(`/api/admin/expense-categories/${encodeURIComponent(value)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: editDraft.label.trim(),
          color: editDraft.color,
          is_cogs: editDraft.is_cogs,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Failed to update category');
        return;
      }
      cancelEdit();
      router.refresh();
    } catch {
      setError('Unexpected error while updating category');
    } finally {
      setRowBusyValue(null);
    }
  };

  const setActive = async (value: string, active: boolean) => {
    setRowBusyValue(value);
    setError(null);
    try {
      const res = await fetch(`/api/admin/expense-categories/${encodeURIComponent(value)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Failed to update category');
        return;
      }
      router.refresh();
    } catch {
      setError('Unexpected error while updating category');
    } finally {
      setRowBusyValue(null);
    }
  };

  return (
    <div className="admin-modal-backdrop" onClick={onClose}>
      <div className="admin-modal admin-category-modal" onClick={(e) => e.stopPropagation()}>
        <div className="admin-modal-header">
          <h2 className="admin-modal-title">Manage Expense Categories</h2>
          <button type="button" className="admin-icon-btn" onClick={onClose} aria-label="Close">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="admin-modal-body admin-category-modal-body">
          {error && <span className="admin-field-error">{error}</span>}

          {showAddForm ? (
            <div className="admin-category-new-card">
              <p className="admin-category-new-title">Add a new category</p>
              <div>
                <span className="admin-category-field-label">Name</span>
                <input
                  className="admin-input admin-category-name-input"
                  type="text"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="e.g. Cold storage rental"
                  maxLength={80}
                  disabled={submitting}
                />
              </div>
              <div>
                <span className="admin-category-field-label">Color</span>
                <div className="admin-category-swatch-row">
                  {EXPENSE_CATEGORY_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={`admin-category-swatch${c === newColor ? ' admin-category-swatch-selected' : ''}`}
                      style={{ background: c }}
                      aria-label={c}
                      onClick={() => setNewColor(c)}
                      disabled={submitting}
                    />
                  ))}
                </div>
              </div>
              <div>
                <span className="admin-category-field-label">Cost type</span>
                <div className="admin-category-segmented">
                  <button
                    type="button"
                    className={`admin-category-segment${!newIsCogs ? '' : ' admin-category-segment-active'}`}
                    onClick={() => setNewIsCogs(true)}
                    disabled={submitting}
                  >
                    COGS
                  </button>
                  <button
                    type="button"
                    className={`admin-category-segment${newIsCogs ? '' : ' admin-category-segment-active'}`}
                    onClick={() => setNewIsCogs(false)}
                    disabled={submitting}
                  >
                    Operating
                  </button>
                </div>
              </div>
              <div className="admin-category-new-actions">
                <button type="button" className="admin-btn admin-btn-outline admin-btn-sm" onClick={resetAddForm} disabled={submitting}>
                  Cancel
                </button>
                <button type="button" className="admin-btn admin-btn-primary admin-btn-sm" onClick={submitNewCategory} disabled={submitting}>
                  {submitting ? 'Saving…' : 'Save category'}
                </button>
              </div>
            </div>
          ) : (
            <button type="button" className="admin-btn admin-btn-outline admin-btn-sm" onClick={() => setShowAddForm(true)}>
              + Add category
            </button>
          )}

          <div>
            <p className="admin-category-list-label">Categories · {categories.length}</p>
            <div className="admin-category-list">
              {categories.map((cat) => {
                const isEditing = editingValue === cat.value;
                const busy = rowBusyValue === cat.value;

                if (isEditing && editDraft) {
                  return (
                    <div key={cat.value} className="admin-category-row admin-category-row-editing">
                      <input
                        className="admin-input admin-category-name-input"
                        type="text"
                        value={editDraft.label}
                        onChange={(e) => setEditDraft({ ...editDraft, label: e.target.value })}
                        maxLength={80}
                        disabled={busy}
                      />
                      <div className="admin-category-swatch-row">
                        {EXPENSE_CATEGORY_COLORS.map((c) => (
                          <button
                            key={c}
                            type="button"
                            className={`admin-category-swatch${c === editDraft.color ? ' admin-category-swatch-selected' : ''}`}
                            style={{ background: c }}
                            aria-label={c}
                            onClick={() => setEditDraft({ ...editDraft, color: c })}
                            disabled={busy}
                          />
                        ))}
                      </div>
                      <div className="admin-category-segmented">
                        <button
                          type="button"
                          className={`admin-category-segment${!editDraft.is_cogs ? '' : ' admin-category-segment-active'}`}
                          onClick={() => setEditDraft({ ...editDraft, is_cogs: true })}
                          disabled={busy}
                        >
                          COGS
                        </button>
                        <button
                          type="button"
                          className={`admin-category-segment${editDraft.is_cogs ? '' : ' admin-category-segment-active'}`}
                          onClick={() => setEditDraft({ ...editDraft, is_cogs: false })}
                          disabled={busy}
                        >
                          Operating
                        </button>
                      </div>
                      <div className="admin-category-new-actions">
                        <button type="button" className="admin-btn admin-btn-outline admin-btn-sm" onClick={cancelEdit} disabled={busy}>
                          Cancel
                        </button>
                        <button
                          type="button"
                          className="admin-btn admin-btn-primary admin-btn-sm"
                          onClick={() => saveEdit(cat.value)}
                          disabled={busy}
                        >
                          {busy ? 'Saving…' : 'Save'}
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={cat.value} className={`admin-category-row${cat.active ? '' : ' admin-category-row-archived'}`}>
                    <span className="admin-category-dot" style={{ background: cat.color }} />
                    <span className="admin-category-name">{cat.label}</span>
                    <span className={`admin-category-cost-pill ${cat.is_cogs ? 'admin-category-cost-cogs' : 'admin-category-cost-op'}`}>
                      {cat.is_cogs ? 'COGS' : 'Operating'}
                    </span>
                    {!cat.active && <span className="admin-category-archived-pill">Archived</span>}
                    <span className="admin-category-row-actions">
                      {cat.active ? (
                        <>
                          <button
                            type="button"
                            className="admin-icon-btn"
                            title="Edit"
                            aria-label={`Edit ${cat.label}`}
                            onClick={() => startEdit(cat)}
                            disabled={busy}
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                            </svg>
                          </button>
                          {!cat.is_system && (
                            <button
                              type="button"
                              className="admin-icon-btn"
                              title="Archive"
                              aria-label={`Archive ${cat.label}`}
                              onClick={() => setActive(cat.value, false)}
                              disabled={busy}
                            >
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="7" width="18" height="4" rx="1" />
                                <path d="M5 11v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8" />
                              </svg>
                            </button>
                          )}
                        </>
                      ) : (
                        <button
                          type="button"
                          className="admin-btn admin-btn-outline admin-btn-sm"
                          onClick={() => setActive(cat.value, true)}
                          disabled={busy}
                        >
                          {busy ? 'Restoring…' : 'Restore'}
                        </button>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
