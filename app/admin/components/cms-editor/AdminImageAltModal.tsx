'use client';

import { AdminCmsModal } from './AdminCmsModal';

type Props = {
  open: boolean;
  title?: string;
  altEn: string;
  altTh?: string;
  onAltEnChange: (value: string) => void;
  onAltThChange?: (value: string) => void;
  onSave: () => void;
  onClose: () => void;
  saving?: boolean;
  altEnLabel?: string;
  altThLabel?: string;
};

export function AdminImageAltModal({
  open,
  title = 'Edit alt text',
  altEn,
  altTh,
  onAltEnChange,
  onAltThChange,
  onSave,
  onClose,
  saving,
  altEnLabel = 'Alt (EN)',
  altThLabel = 'Alt (TH)',
}: Props) {
  const showTh = altTh !== undefined && onAltThChange !== undefined;

  return (
    <AdminCmsModal
      open={open}
      title={title}
      onClose={onClose}
      footer={
        <div className="admin-cms-modal-actions">
          <button type="button" className="admin-cms-btn admin-cms-btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="admin-cms-btn admin-cms-btn-primary"
            disabled={saving}
            onClick={onSave}
          >
            Save
          </button>
        </div>
      }
    >
      <label className="admin-cms-field">
        <span className="admin-cms-field-label">{showTh ? altEnLabel : 'Alt text'}</span>
        <input
          className="admin-cms-input"
          value={altEn}
          onChange={(e) => onAltEnChange(e.target.value)}
          autoFocus
        />
      </label>
      {showTh ? (
        <label className="admin-cms-field">
          <span className="admin-cms-field-label">{altThLabel}</span>
          <input
            className="admin-cms-input"
            value={altTh}
            onChange={(e) => onAltThChange(e.target.value)}
          />
        </label>
      ) : null}
    </AdminCmsModal>
  );
}
