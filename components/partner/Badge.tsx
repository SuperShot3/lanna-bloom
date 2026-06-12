'use client';

type BadgeProps = {
  status: 'pending' | 'approved' | 'active' | 'rejected' | 'submitted' | 'needs_changes';
  labelTh?: string;
  labelEn?: string;
};

const STATUS_CLASS: Record<string, string> = {
  pending: 'pending',
  approved: 'approved',
  active: 'active',
  rejected: 'rejected',
  submitted: 'submitted',
  needs_changes: 'needs_changes',
};

export function Badge({ status, labelTh, labelEn }: BadgeProps) {
  const cls = STATUS_CLASS[status] || 'pending';
  return (
    <span className={`partner-badge partner-badge--${cls}`}>
      {labelTh ?? status}
      {labelEn && <span className="partner-badge-en">{labelEn}</span>}
    </span>
  );
}
