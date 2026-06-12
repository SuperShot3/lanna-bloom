import { Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ImportantDatesForm } from './ImportantDatesForm';
import './important-dates.css';

export const metadata = {
  title: 'Important dates | Lanna Bloom',
  description: 'Save a date and get gentle email reminders for flowers in Chiang Mai.',
};

export default function ImportantDatesPage() {
  return (
    <div className="id-page">
      <div className="id-inner">
        <p style={{ textAlign: 'center', marginBottom: 16 }}>
          <Link href="/en" className="id-brand-link" aria-label="Back to Lanna Bloom">
            <Image
              src="/logo_icon_64.png"
              alt=""
              width={48}
              height={48}
              className="id-logo"
              priority
            />
            <span>Lanna Bloom</span>
          </Link>
        </p>
        <h1 className="id-title">Save an important date</h1>
        <p className="id-lead">
          A quick form — we will email you with bouquet ideas before the big day. Email only; no new accounts.
        </p>
        <Suspense fallback={<p className="id-lead">Loading…</p>}>
          <ImportantDatesForm />
        </Suspense>
      </div>
    </div>
  );
}
