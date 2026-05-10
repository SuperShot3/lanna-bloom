/**
 * Single cap for expense receipt uploads (admin). Client compresses toward this; API enforces the same.
 */
export const MAX_RECEIPT_UPLOAD_BYTES = 2 * 1024 * 1024; // 2 MB

export const MAX_RECEIPT_UPLOAD_LABEL = '2 MB';
