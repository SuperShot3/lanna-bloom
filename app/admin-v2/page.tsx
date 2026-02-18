import { setAdminSecret } from './actions';

export default async function AdminV2LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <div className="admin-v2-login">
      <h1 className="admin-v2-title">Admin Dashboard v2</h1>
      <p className="admin-v2-hint">Enter your admin secret to continue.</p>
      {error === 'invalid' && (
        <p className="admin-v2-error">Invalid secret. Please try again.</p>
      )}
      <form action={setAdminSecret} className="admin-v2-form">
        <input
          type="password"
          name="secret"
          placeholder="Admin secret"
          autoComplete="off"
          className="admin-v2-input"
          required
        />
        <button type="submit" className="admin-v2-btn">
          Continue
        </button>
      </form>
    </div>
  );
}
