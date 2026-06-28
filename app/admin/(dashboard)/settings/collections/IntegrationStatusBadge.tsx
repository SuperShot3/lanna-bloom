export function IntegrationStatusBadge({ ok }: { ok: boolean }) {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: 999,
        fontSize: 12,
        background: ok ? '#dcfce7' : '#fef3c7',
        color: ok ? '#166534' : '#92400e',
      }}
    >
      {ok ? 'Configured' : 'Not set'}
    </span>
  );
}
