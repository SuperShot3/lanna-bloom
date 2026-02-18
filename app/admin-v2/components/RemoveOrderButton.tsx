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

  if (!canEdit) return null;

  const handleRemove = async () => {
    if (!confirm('Remove this order from the system? This cannot be undone. The customer order link will no longer work.')) {
      return;
    }
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
      router.push(returnTo && returnTo.startsWith('/admin-v2') ? returnTo : '/admin-v2/orders');
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Network error');
    } finally {
      setRemoving(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleRemove}
      disabled={removing}
      className="admin-v2-btn admin-v2-btn-outline admin-v2-btn-danger"
      title="Remove from system (e.g. after delivery)"
    >
      {removing ? 'Removing…' : 'Delivered — Remove'}
    </button>
  );
}
