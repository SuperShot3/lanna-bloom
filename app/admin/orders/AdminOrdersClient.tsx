'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Order } from '@/lib/orders';

const STORAGE_KEY = 'lannabloom-admin-secret';

function getHeaders(secret: string): Record<string, string> {
  return { 'x-admin-secret': secret };
}

export function AdminOrdersClient() {
  const [secret, setSecret] = useState('');
  const [savedSecret, setSavedSecret] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const s = sessionStorage.getItem(STORAGE_KEY);
      if (s) setSavedSecret(s);
    }
  }, []);

  const loadOrders = useCallback(async (adminSecret: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/orders', { headers: getHeaders(adminSecret) });
      if (res.status === 401) {
        setError('Invalid secret');
        setOrders([]);
        return;
      }
      if (!res.ok) {
        setError('Failed to load orders');
        setOrders([]);
        return;
      }
      const data = await res.json();
      setOrders(Array.isArray(data) ? data : []);
    } catch {
      setError('Network error');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (savedSecret) loadOrders(savedSecret);
  }, [savedSecret, loadOrders]);

  const handleSubmitSecret = (e: React.FormEvent) => {
    e.preventDefault();
    const s = secret.trim();
    if (!s) return;
    sessionStorage.setItem(STORAGE_KEY, s);
    setSavedSecret(s);
    setSecret('');
  };

  const handleRemove = async (orderId: string) => {
    if (!savedSecret) return;
    setRemoving(orderId);
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}`, {
        method: 'DELETE',
        headers: getHeaders(savedSecret),
      });
      if (res.ok) {
        setOrders((prev) => prev.filter((o) => o.orderId !== orderId));
      } else if (res.status === 401) {
        setError('Session expired');
        sessionStorage.removeItem(STORAGE_KEY);
        setSavedSecret('');
      }
    } catch {
      setError('Failed to remove order');
    } finally {
      setRemoving(null);
    }
  };

  const logout = () => {
    sessionStorage.removeItem(STORAGE_KEY);
    setSavedSecret('');
    setOrders([]);
    setError(null);
  };

  if (!savedSecret) {
    return (
      <div className="admin-orders">
        <h2>Orders admin</h2>
        <p>Enter your admin secret to list and remove orders (e.g. after delivery).</p>
        <form onSubmit={handleSubmitSecret} className="admin-orders-form">
          <input
            type="password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder="Admin secret"
            autoComplete="off"
            className="admin-orders-input"
          />
          <button type="submit" className="admin-orders-btn">Continue</button>
        </form>
        {error && <p className="admin-orders-error">{error}</p>}
      </div>
    );
  }

  return (
    <div className="admin-orders">
      <div className="admin-orders-header">
        <h2>Orders</h2>
        <button type="button" onClick={logout} className="admin-orders-logout">Log out</button>
      </div>
      <p className="admin-orders-hint">Remove an order after you have delivered it.</p>
      {error && <p className="admin-orders-error">{error}</p>}
      {loading ? (
        <p>Loading…</p>
      ) : orders.length === 0 ? (
        <p>No orders.</p>
      ) : (
        <ul className="admin-orders-list">
          {orders.map((order) => (
            <li key={order.orderId} className="admin-orders-item">
              <div className="admin-orders-item-main">
                <strong>{order.orderId}</strong>
                <span> — {order.customerName ?? '—'}</span>
                <span> ฿{order.pricing?.grandTotal?.toLocaleString() ?? '—'}</span>
                <span> ({order.delivery?.address || order.delivery?.district || '—'})</span>
              </div>
              <div className="admin-orders-item-actions">
                <a href={`/order/${order.orderId}`} target="_blank" rel="noopener noreferrer" className="admin-orders-link">View</a>
                <button
                  type="button"
                  onClick={() => handleRemove(order.orderId)}
                  disabled={removing === order.orderId}
                  className="admin-orders-remove"
                  title="Remove from system (e.g. after delivery)"
                >
                  {removing === order.orderId ? 'Removing…' : 'Delivered — Remove'}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
