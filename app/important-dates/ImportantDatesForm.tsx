'use client';

import { useSearchParams } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { getLineContactUrl, getWhatsAppContactUrl } from '@/lib/messenger';
import { SUPPORT_EMAIL } from '@/lib/siteContact';

const RELATIONSHIPS = [
  { v: 'wife_girlfriend', l: 'Wife / girlfriend' },
  { v: 'husband_boyfriend', l: 'Husband / boyfriend' },
  { v: 'mother', l: 'Mother' },
  { v: 'father', l: 'Father' },
  { v: 'friend', l: 'Friend' },
  { v: 'boss', l: 'Boss' },
  { v: 'colleague', l: 'Colleague' },
  { v: 'client', l: 'Client' },
  { v: 'other', l: 'Other' },
];

const OCCASIONS = [
  { v: 'birthday', l: 'Birthday' },
  { v: 'anniversary', l: 'Anniversary' },
  { v: 'valentine', l: "Valentine's" },
  { v: 'mothers_day', l: "Mother's Day" },
  { v: 'congratulations', l: 'Congratulations' },
  { v: 'apology', l: 'Apology' },
  { v: 'get_well', l: 'Get well' },
  { v: 'custom', l: 'Custom' },
  { v: 'other', l: 'Other' },
];

const TIMING = [
  { v: '7_and_3_days', l: '7 and 3 days before' },
  { v: '7_days_only', l: '7 days only' },
  { v: '3_days_only', l: '3 days only' },
  { v: 'all', l: '7, 3, and 1 day before' },
];

export function ImportantDatesForm() {
  const sp = useSearchParams();
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const email = sp?.get('email') ?? '';
  const name = sp?.get('name') ?? '';
  const order = sp?.get('order') ?? '';

  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [relationship, setRelationship] = useState('other');
  const [occasionType, setOccasionType] = useState('birthday');
  const [occasionDay, setOccasionDay] = useState(1);
  const [occasionMonth, setOccasionMonth] = useState(1);
  const [occasionYear, setOccasionYear] = useState('');
  const [budget, setBudget] = useState('');
  const [style, setStyle] = useState('');
  const [timing, setTiming] = useState('7_and_3_days');
  const [consent, setConsent] = useState(false);
  const prefilled = useRef(false);
  const resetForAnotherReminder = () => {
    setDone(false);
    setErr(null);
    setRecipientName('');
    setRelationship('other');
    setOccasionType('birthday');
    setOccasionDay(1);
    setOccasionMonth(1);
    setOccasionYear('');
    setBudget('');
    setStyle('');
    setTiming('7_and_3_days');
    setConsent(false);
  };
  useEffect(() => {
    if (prefilled.current) return;
    if (name) setCustomerName(name);
    if (email) setCustomerEmail(email);
    if (name || email) prefilled.current = true;
  }, [name, email]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consent) {
      setErr('Please accept the consent to continue');
      return;
    }
    setErr(null);
    setSaving(true);
    try {
      const res = await fetch('/api/important-dates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: customerName,
          customer_email: customerEmail,
          recipient_name: recipientName,
          relationship,
          occasion_type: occasionType,
          occasion_day: occasionDay,
          occasion_month: occasionMonth,
          occasion_year: occasionYear.trim() ? parseInt(occasionYear, 10) : null,
          preferred_budget: budget,
          preferred_flower_style: style,
          preferred_reminder_timing: timing,
          consent: true,
          source_order_id: order || null,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setErr(data.error ?? 'Something went wrong');
        return;
      }
      setDone(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Network error');
    } finally {
      setSaving(false);
    }
  };

  if (done) {
    return (
      <div className="id-success">
        <div className="id-success-mark" aria-hidden="true">✓</div>
        <h2 className="id-success-title">Reminder saved successfully</h2>
        <p className="id-success-p">
          Thank you. We will email you before this important date with a gentle reminder and bouquet ideas.
        </p>
        <div className="id-success-actions">
          <button type="button" className="id-submit" onClick={resetForAnotherReminder}>
            Add another reminder
          </button>
          <a href="/en" className="id-secondary-btn">
            Back to main website
          </a>
        </div>
        <div className="id-contact-card">
          <p className="id-contact-title">Need help or want to talk to us?</p>
          <div className="id-contact-links">
            <a href={getLineContactUrl()} target="_blank" rel="noopener noreferrer">
              LINE
            </a>
            <a href={getWhatsAppContactUrl()} target="_blank" rel="noopener noreferrer">
              WhatsApp
            </a>
            <a href={`mailto:${SUPPORT_EMAIL}`}>
              Email
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="id-form">
      {err && <p className="id-error" role="alert">{err}</p>}
      <label className="id-label">
        Your name
        <input
          className="id-input"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          required
        />
      </label>
      <label className="id-label">
        Your email
        <input
          className="id-input"
          type="email"
          value={customerEmail}
          onChange={(e) => setCustomerEmail(e.target.value)}
          required
        />
      </label>
      <label className="id-label">
        Recipient’s name
        <input
          className="id-input"
          value={recipientName}
          onChange={(e) => setRecipientName(e.target.value)}
          required
        />
      </label>
      <label className="id-label">
        Relationship
        <select
          className="id-input"
          value={relationship}
          onChange={(e) => setRelationship(e.target.value)}
        >
          {RELATIONSHIPS.map((o) => (
            <option key={o.v} value={o.v}>{o.l}</option>
          ))}
        </select>
      </label>
      <label className="id-label">
        Occasion
        <select
          className="id-input"
          value={occasionType}
          onChange={(e) => setOccasionType(e.target.value)}
        >
          {OCCASIONS.map((o) => (
            <option key={o.v} value={o.v}>{o.l}</option>
          ))}
        </select>
      </label>
      <div className="id-row">
        <label className="id-label id-label-inline">
          Day
          <input
            className="id-input"
            type="number"
            min={1}
            max={31}
            value={occasionDay}
            onChange={(e) => setOccasionDay(parseInt(e.target.value, 10) || 1)}
            required
          />
        </label>
        <label className="id-label id-label-inline">
          Month
          <input
            className="id-input"
            type="number"
            min={1}
            max={12}
            value={occasionMonth}
            onChange={(e) => setOccasionMonth(parseInt(e.target.value, 10) || 1)}
            required
          />
        </label>
        <label className="id-label id-label-inline">
          Year (optional)
          <input
            className="id-input"
            type="number"
            min={2000}
            max={2100}
            placeholder="e.g. 2026"
            value={occasionYear}
            onChange={(e) => setOccasionYear(e.target.value)}
          />
        </label>
      </div>
      <label className="id-label">
        Budget hint (optional)
        <input className="id-input" value={budget} onChange={(e) => setBudget(e.target.value)} />
      </label>
      <label className="id-label">
        Style preference (optional)
        <input className="id-input" value={style} onChange={(e) => setStyle(e.target.value)} />
      </label>
      <label className="id-label">
        When to remind
        <select
          className="id-input"
          value={timing}
          onChange={(e) => setTiming(e.target.value)}
        >
          {TIMING.map((o) => (
            <option key={o.v} value={o.v}>{o.l}</option>
          ))}
        </select>
      </label>
      <label className="id-consent">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
        />
        <span>
          I agree that Lanna Bloom may store these details and send me reminder emails before important
          dates with flower suggestions. I can unsubscribe anytime.
        </span>
      </label>
      <button type="submit" className="id-submit" disabled={saving}>
        {saving ? 'Saving…' : 'Save my reminder'}
      </button>
    </form>
  );
}
