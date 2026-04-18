'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface RemoveOrderButtonProps {
  orderId: string;
  returnTo?: string;
  canEdit: boolean;
}

export function RemoveOrderButton({ orderId, returnTo, canEdit }: RemoveOrderButtonProps) {
  const router = useRouter();
  const [removing, setRemoving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  if (!canEdit) return null;

  const performRemove = async () => {
    setShowConfirm(false);
    setRemoving(true);
    try {
      const res = await fetch(`/api/admin/orders/${encodeURIComponent(orderId)}/remove`, {
        method: 'DELETE',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error ?? 'Failed to remove order');
        return;
      }
      router.push(returnTo && returnTo.startsWith('/admin') ? returnTo : '/admin/orders');
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Network error');
    } finally {
      setRemoving(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setShowConfirm(true)}
        disabled={removing}
        className="admin-btn admin-btn-outline admin-btn-danger"
        title="Remove from system (e.g. after delivery)"
      >
        {removing ? 'Removing…' : 'Delivered — Remove'}
      </button>

      {showConfirm && (
        <div
          className="admin-product-detail-delete-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="remove-order-modal-title"
        >
          <div
            className="admin-product-detail-delete-modal-backdrop"
            onClick={() => !removing && setShowConfirm(false)}
            aria-hidden
          />
          <div className="admin-product-detail-delete-modal-content">
            <h3 id="remove-order-modal-title">Remove this order?</h3>
            <p>
              Are you sure you want to delete this order? This cannot be undone. The customer order link will no
              longer work.
            </p>
            <div className="admin-product-detail-delete-modal-actions">
              <button
                type="button"
                className="admin-btn admin-btn-outline"
                disabled={removing}
                onClick={() => setShowConfirm(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="admin-btn admin-btn-danger"
                disabled={removing}
                onClick={performRemove}
              >
                Delete order
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
