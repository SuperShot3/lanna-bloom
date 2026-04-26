'use client';

import { useCallback, useEffect, useState } from 'react';

type TemplateRow = {
  id: string;
  template_key: string;
  template_name: string;
  subject_template: string;
  preview_text: string | null;
  html_template: string;
  text_template: string | null;
  is_active: boolean;
  updated_at: string;
};

type OutboxRow = {
  id: string;
  order_id: string | null;
  customer_email: string;
  email_type: string;
  status: string;
  created_at: string;
  sent_at: string | null;
  subject: string;
};

type ReminderItem = {
  id: string;
  customer_name: string;
  customer_email: string;
  recipient_name: string;
  occasion_type: string;
  occasion_day: number;
  occasion_month: number;
  is_active: boolean;
  consent_given: boolean;
  created_at: string;
  lastEmailAt: string | null;
  lastEmailStatus: string | null;
  preferred_reminder_timing: string;
};

type Tab = 'templates' | 'preview' | 'outbox' | 'reminders';

export function EmailControlCenterClient() {
  const [tab, setTab] = useState<Tab>('templates');
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [outbox, setOutbox] = useState<OutboxRow[]>([]);
  const [reminders, setReminders] = useState<ReminderItem[]>([]);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [editing, setEditing] = useState<TemplateRow | null>(null);

  const load = useCallback(async () => {
    setLoadErr(null);
    try {
      const [t, o, r] = await Promise.all([
        fetch('/api/admin/emails/templates', { cache: 'no-store' }),
        fetch('/api/admin/emails/outbox', { cache: 'no-store' }),
        fetch('/api/admin/emails/reminders', { cache: 'no-store' }),
      ]);
      if (!t.ok) throw new Error('Templates failed');
      if (!o.ok) throw new Error('Outbox failed');
      if (!r.ok) throw new Error('Reminders failed');
      const tj = (await t.json()) as { items: TemplateRow[] };
      const oj = (await o.json()) as { items: OutboxRow[] };
      const rj = (await r.json()) as { items: ReminderItem[] };
      setTemplates(tj.items);
      setOutbox(oj.items);
      setReminders(rj.items);
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : 'Load error');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="admin-detail" style={{ padding: '0 0 32px' }}>
      <header className="admin-header admin-page-header">
        <div>
          <h1 className="admin-title">Email &amp; Reminder Control Center</h1>
          <p className="admin-hint">Templates, previews, outbox, and important-date reminders</p>
        </div>
        <div className="admin-header-actions">
          <button type="button" className="admin-btn admin-btn-outline" onClick={() => void load()}>
            Refresh
          </button>
        </div>
      </header>
      {loadErr && <p className="admin-costs-error">{loadErr}</p>}

      <div className="admin-mail-tabs" style={{ marginBottom: 16 }}>
        {(
          [
            ['templates', 'Templates'],
            ['preview', 'Preview & test'],
            ['outbox', 'Outbox / sent'],
            ['reminders', 'Reminder emails'],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            className={tab === k ? 'admin-mail-tab--active' : undefined}
            onClick={() => setTab(k as Tab)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'templates' && (
        <section className="admin-section">
          <h2 className="admin-section-title">Email templates</h2>
          <div className="admin-orders" style={{ overflowX: 'auto' }}>
            <table className="admin-table" style={{ width: '100%', minWidth: 600 }}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Key</th>
                  <th>Status</th>
                  <th>Updated</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {templates.map((row) => (
                  <tr key={row.id}>
                    <td>{row.template_name}</td>
                    <td>
                      <code style={{ fontSize: '0.85rem' }}>{row.template_key}</code>
                    </td>
                    <td>
                      <span
                        className={row.is_active ? 'admin-badge' : 'admin-badge admin-badge-cancelled'}
                      >
                        {row.is_active ? 'active' : 'off'}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.88rem' }}>{row.updated_at?.slice(0, 16) ?? '—'}</td>
                    <td>
                      <button
                        type="button"
                        className="admin-btn admin-btn-sm admin-btn-outline"
                        onClick={() => setEditing(row)}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === 'preview' && (
        <PreviewTab
          onRefreshTemplates={() => void load()}
        />
      )}

      {tab === 'outbox' && (
        <OutboxTab
          rows={outbox}
          onAction={() => void load()}
        />
      )}

      {tab === 'reminders' && (
        <RemindersTab rows={reminders} onAction={() => void load()} />
      )}

      {editing && (
        <TemplateEditModal
          row={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void load();
          }}
        />
      )}
    </div>
  );
}

function TemplateEditModal({
  row,
  onClose,
  onSaved,
}: {
  row: TemplateRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [s, setS] = useState(row);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const save = async () => {
    setSaving(true);
    setErr(null);
    const res = await fetch('/api/admin/emails/templates', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: s.id,
        template_name: s.template_name,
        subject_template: s.subject_template,
        preview_text: s.preview_text,
        html_template: s.html_template,
        text_template: s.text_template,
        is_active: s.is_active,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      setErr(d.error ?? 'Save failed');
      return;
    }
    onSaved();
  };

  return (
    <div className="admin-modal-backdrop" role="dialog" aria-modal>
      <div className="admin-modal admin-modal-wide">
        <h2 className="admin-section-title" style={{ marginTop: 0 }}>{row.template_name}</h2>
        {err && <p className="admin-costs-error">{err}</p>}
        <label className="admin-label">Template name</label>
        <input
          className="admin-input admin-input-compact"
          value={s.template_name}
          onChange={(e) => setS((o) => ({ ...o, template_name: e.target.value }))}
        />
        <label className="admin-label">Subject</label>
        <input
          className="admin-input admin-input-compact"
          value={s.subject_template}
          onChange={(e) => setS((o) => ({ ...o, subject_template: e.target.value }))}
        />
        <label className="admin-label">Preview text (preheader, optional)</label>
        <input
          className="admin-input admin-input-compact"
          value={s.preview_text ?? ''}
          onChange={(e) => setS((o) => ({ ...o, preview_text: e.target.value }))}
        />
        <label className="admin-label">HTML body</label>
        <textarea
          className="admin-textarea admin-textarea-compact"
          rows={12}
          value={s.html_template}
          onChange={(e) => setS((o) => ({ ...o, html_template: e.target.value }))}
        />
        <label className="admin-label">Plain text (optional)</label>
        <textarea
          className="admin-textarea admin-textarea-compact"
          rows={5}
          value={s.text_template ?? ''}
          onChange={(e) => setS((o) => ({ ...o, text_template: e.target.value }))}
        />
        <label className="admin-hint" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="checkbox"
            checked={s.is_active}
            onChange={(e) => setS((o) => ({ ...o, is_active: e.target.checked }))}
          />
          Active
        </label>
        <div className="admin-mail-actions" style={{ marginTop: 16 }}>
          <button type="button" className="admin-btn" onClick={() => void save()} disabled={saving}>
            Save
          </button>
          <button type="button" className="admin-btn admin-btn-outline" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function PreviewTab({ onRefreshTemplates: _r }: { onRefreshTemplates: () => void }) {
  const [templateKey, setTemplateKey] = useState('order_delivered');
  const [orderId, setOrderId] = useState('');
  const [useMock, setUseMock] = useState(true);
  const [subject, setSubject] = useState('');
  const [html, setHtml] = useState('');
  const [miss, setMiss] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const runPreview = async () => {
    setErr(null);
    const res = await fetch('/api/admin/emails/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ templateKey, orderId: orderId || null, useMock }),
    });
    const d = (await res.json().catch(() => ({}))) as {
      error?: string;
      subject?: string;
      html?: string;
      missingVariables?: string[];
    };
    if (!res.ok) {
      setErr(d.error ?? 'Preview failed');
      return;
    }
    setSubject(d.subject ?? '');
    setHtml(d.html ?? '');
    setMiss(d.missingVariables ?? []);
  };

  const testSend = async () => {
    setSending(true);
    setErr(null);
    const res = await fetch('/api/admin/emails/test-send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ templateKey, orderId: orderId || null }),
    });
    setSending(false);
    const d = (await res.json().catch(() => ({}))) as { error?: string; ok?: boolean };
    if (!res.ok) setErr(d.error ?? 'Test send failed');
  };

  return (
    <section className="admin-section">
      <h2 className="admin-section-title">Preview &amp; test send</h2>
      {err && <p className="admin-costs-error">{err}</p>}
      <div className="admin-form" style={{ maxWidth: 520 }}>
        <div className="admin-form-group">
          <label>Template key</label>
          <input
            className="admin-input"
            value={templateKey}
            onChange={(e) => setTemplateKey(e.target.value)}
          />
        </div>
        <div className="admin-form-group">
          <label>Sample order id (optional)</label>
          <input
            className="admin-input"
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            placeholder="e.g. order-abc123"
          />
        </div>
        <label className="admin-hint" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input type="checkbox" checked={useMock} onChange={(e) => setUseMock(e.target.checked)} />
          Use mock data (ignore order for variables)
        </label>
        <div className="admin-mail-actions">
          <button type="button" className="admin-btn" onClick={() => void runPreview()}>
            Render preview
          </button>
          <button
            type="button"
            className="admin-btn admin-btn-outline"
            onClick={() => void testSend()}
            disabled={sending}
          >
            Send test to me
          </button>
        </div>
      </div>
      {miss.length > 0 && (
        <p className="admin-error-warning" style={{ marginTop: 12, padding: 10, borderRadius: 6 }}>
          Missing/empty: {miss.join(', ')}
        </p>
      )}
      {subject && (
        <p style={{ marginTop: 16, fontWeight: 600 }}>Subject: {subject}</p>
      )}
      <div style={{ display: 'grid', gap: 16, marginTop: 8, gridTemplateColumns: '1fr' }}>
        <div>
          <p className="admin-hint" style={{ marginBottom: 6 }}>
            Desktop width preview
          </p>
          <div className="email-html-preview-box" style={{ maxWidth: 600 }}>
            {html && (
              <iframe title="Email preview" className="admin-mail-iframe" srcDoc={html} style={{ minHeight: 300 }} />
            )}
          </div>
        </div>
        <div>
          <p className="admin-hint" style={{ marginBottom: 6 }}>
            Narrow (mobile) preview
          </p>
          <div className="admin-mail-iframe--narrow">
            {html && (
              <div className="email-html-preview-box">
                <iframe
                  title="Email narrow"
                  className="admin-mail-iframe"
                  style={{ minHeight: 280, maxWidth: 360, margin: '0 auto' }}
                  srcDoc={html}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function OutboxTab({ rows, onAction }: { rows: OutboxRow[]; onAction: () => void }) {
  const [detail, setDetail] = useState<{ id: string; html_body: string; subject: string } | null>(null);

  const doSend = async (id: string) => {
    const res = await fetch(`/api/admin/emails/outbox/${encodeURIComponent(id)}/send`, { method: 'POST' });
    if (res.ok) onAction();
  };
  const doCancel = async (id: string) => {
    const res = await fetch(`/api/admin/emails/outbox/${encodeURIComponent(id)}/cancel`, { method: 'POST' });
    if (res.ok) onAction();
  };
  const open = async (id: string) => {
    const res = await fetch(`/api/admin/emails/outbox/${encodeURIComponent(id)}`, { cache: 'no-store' });
    const d = (await res.json().catch(() => ({}))) as { outbox?: { html_body: string; subject: string } };
    if (d.outbox) setDetail({ id, html_body: d.outbox.html_body, subject: d.outbox.subject });
  };

  return (
    <section className="admin-section">
      <h2 className="admin-section-title">Outbox &amp; sent</h2>
      <div className="admin-orders" style={{ overflowX: 'auto' }}>
        <table className="admin-table" style={{ width: '100%', minWidth: 720 }}>
          <thead>
            <tr>
              <th>Created</th>
              <th>Email</th>
              <th>Order</th>
              <th>Type</th>
              <th>Status</th>
              <th>Sent</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td style={{ fontSize: '0.85rem' }}>{r.created_at?.slice(0, 19) ?? '—'}</td>
                <td style={{ fontSize: '0.88rem' }}>{r.customer_email}</td>
                <td>
                  {r.order_id ? (
                    <a href={`/admin/orders/${encodeURIComponent(r.order_id)}`} className="admin-link">
                      {r.order_id}
                    </a>
                  ) : (
                    '—'
                  )}
                </td>
                <td>
                  <code style={{ fontSize: '0.8rem' }}>{r.email_type}</code>
                </td>
                <td>
                  <span className="admin-badge">{r.status}</span>
                </td>
                <td style={{ fontSize: '0.85rem' }}>{r.sent_at?.slice(0, 19) ?? '—'}</td>
                <td>
                  <button
                    type="button"
                    className="admin-btn admin-btn-sm admin-btn-outline"
                    onClick={() => void open(r.id)}
                  >
                    Preview
                  </button>{' '}
                  {(r.status === 'failed' || r.status === 'draft' || r.status === 'scheduled') && (
                    <>
                      <button
                        type="button"
                        className="admin-btn admin-btn-sm"
                        onClick={() => void doSend(r.id)}
                      >
                        {r.status === 'failed' ? 'Resend' : 'Send'}
                      </button>{' '}
                    </>
                  )}
                  {(r.status === 'draft' || r.status === 'scheduled') && (
                    <button
                      type="button"
                      className="admin-btn admin-btn-sm admin-btn-outline"
                      onClick={() => void doCancel(r.id)}
                    >
                      Cancel
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {detail && (
        <div className="admin-modal-backdrop" role="dialog" aria-modal onClick={() => setDetail(null)}>
          <div
            className="admin-modal admin-modal-wide"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="admin-section-title" style={{ marginTop: 0 }}>{detail.subject}</h2>
            <iframe
              title="Outbox"
              className="admin-mail-iframe"
              style={{ minHeight: 400 }}
              srcDoc={detail.html_body}
            />
            <div className="admin-mail-actions" style={{ marginTop: 8 }}>
              <button type="button" className="admin-btn admin-btn-outline" onClick={() => setDetail(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function RemindersTab({ rows, onAction }: { rows: ReminderItem[]; onAction: () => void }) {
  const toggle = async (id: string, isActive: boolean) => {
    const res = await fetch('/api/admin/emails/reminders', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, is_active: !isActive }),
    });
    if (res.ok) onAction();
  };

  return (
    <section className="admin-section">
      <h2 className="admin-section-title">Customer reminders (important dates)</h2>
      <p className="admin-hint" style={{ marginBottom: 12 }}>
        Upcoming runs are sent by the daily cron. Deactivate a row to stop all future reminder emails
        to that person for saved dates.
      </p>
      <div className="admin-orders" style={{ overflowX: 'auto' }}>
        <table className="admin-table" style={{ width: '100%', minWidth: 720 }}>
          <thead>
            <tr>
              <th>Created</th>
              <th>Customer</th>
              <th>Occasion</th>
              <th>Date (d/m)</th>
              <th>Timing</th>
              <th>Active</th>
              <th>Last email</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td style={{ fontSize: '0.85rem' }}>{r.created_at?.slice(0, 10) ?? '—'}</td>
                <td>
                  {r.customer_name} <br />
                  <span style={{ fontSize: '0.8rem' }}>{r.customer_email}</span>
                </td>
                <td>
                  {r.occasion_type} → {r.recipient_name}
                </td>
                <td>
                  {r.occasion_day}/{r.occasion_month}
                </td>
                <td>
                  <code style={{ fontSize: '0.75rem' }}>{r.preferred_reminder_timing}</code>
                </td>
                <td>
                  <span className="admin-badge">{r.is_active ? 'yes' : 'no'}</span>
                </td>
                <td style={{ fontSize: '0.82rem' }}>
                  {r.lastEmailAt?.slice(0, 19) ?? '—'}
                  {r.lastEmailStatus ? ` (${r.lastEmailStatus})` : ''}
                </td>
                <td>
                  {r.is_active ? (
                    <button
                      type="button"
                      className="admin-btn admin-btn-sm admin-btn-outline"
                      onClick={() => void toggle(r.id, r.is_active)}
                    >
                      Deactivate
                    </button>
                  ) : (
                    '—'
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
