export type OrderChatSenderType = 'customer' | 'admin';

export type OrderChatMessage = {
  id: string;
  orderId: string;
  senderType: OrderChatSenderType;
  body: string;
  createdAt: string;
};

export type OrderChatAdminState = {
  orderId: string;
  lastReadAt: string | null;
  purgeAfter: string | null;
};

export type OrderChatAvailability = {
  open: boolean;
  purgeAfter: string | null;
  orderStatus: string | null;
};

export type OrderChatUnreadSummary = {
  totalUnreadOrders: number;
  byOrderId: Record<string, number>;
};
