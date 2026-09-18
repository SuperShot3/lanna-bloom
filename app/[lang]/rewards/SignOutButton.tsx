'use client';

export function SignOutButton() {
  return (
    <button
      type="button"
      onClick={async () => {
        await fetch('/api/rewards/signout', { method: 'POST' });
        window.location.reload();
      }}
      style={{ background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer' }}
    >
      Sign out
    </button>
  );
}
