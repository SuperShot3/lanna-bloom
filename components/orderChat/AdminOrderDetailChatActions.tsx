'use client';

import { AdminOpenChatButton } from '@/components/orderChat/AdminOpenChatButton';

export function AdminOrderDetailChatActions({
  orderId,
  chatLink,
  unreadCount = 0,
}: {
  orderId: string;
  chatLink: string | null;
  unreadCount?: number;
}) {
  return (
    <AdminOpenChatButton
      orderId={orderId}
      chatLink={chatLink}
      unreadCount={unreadCount}
      className="admin-btn admin-btn-outline"
    />
  );
}
