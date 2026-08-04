'use client';

import { useState } from 'react';
import { AdminOrderChatModal } from './AdminOrderChatModal';

export function AdminOpenChatButton({
  orderId,
  chatLink,
  unreadCount = 0,
  className = 'admin-btn admin-btn-outline',
  sizeClass,
}: {
  orderId: string;
  chatLink?: string | null;
  unreadCount?: number;
  className?: string;
  sizeClass?: string;
}) {
  const [open, setOpen] = useState(false);
  const badge = unreadCount > 0 ? (unreadCount > 99 ? '99+' : String(unreadCount)) : null;

  return (
    <>
      <button
        type="button"
        className={`${className}${sizeClass ? ` ${sizeClass}` : ''}`}
        onClick={() => setOpen(true)}
      >
        Open Chat
        {badge ? (
          <span
            style={{
              marginLeft: 6,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: 18,
              height: 18,
              padding: '0 5px',
              borderRadius: 999,
              background: '#c45c3e',
              color: '#fff',
              fontSize: 11,
              fontWeight: 700,
            }}
          >
            {badge}
          </span>
        ) : null}
      </button>
      <AdminOrderChatModal
        orderId={orderId}
        open={open}
        onClose={() => setOpen(false)}
        chatLink={chatLink}
      />
    </>
  );
}
