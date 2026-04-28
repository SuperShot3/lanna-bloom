'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';

export function AdminLoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();
  const callbackError = (searchParams ?? new URLSearchParams()).get('error');
  const callbackCode = searchParams?.get('code');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await signIn('credentials', {
        email: email.trim().toLowerCase(),
        password,
        remember: rememberMe ? 'true' : 'false',
        redirect: false,
      });
      if (result?.error) {
        if (result.code === 'locked_out') {
          setError(
            'Too many incorrect password attempts. Try again in 30 minutes (from your last attempt).'
          );
        } else {
          setError('Invalid email or password.');
        }
        return;
      }
      if (result?.ok) {
        window.location.href = '/admin/orders';
        return;
      }
      setError('Sign in failed. Please try again.');
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="admin-form">
      {(error || callbackError === 'CredentialsSignin') && (
        <p className="admin-error">
          {error ||
            (callbackCode === 'locked_out'
              ? 'Too many incorrect password attempts. Try again in 30 minutes (from your last attempt).'
              : 'Invalid email or password.')}
        </p>
      )}
      <div className="admin-form-group">
        <label htmlFor="admin-email">Email</label>
        <input
          id="admin-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="admin@example.com"
          autoComplete="email"
          className="admin-input"
          required
        />
      </div>
      <div className="admin-form-group">
        <label htmlFor="admin-password">Password</label>
        <div className="admin-password-field">
          <input
            id="admin-password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            autoComplete="current-password"
            className="admin-input admin-password-input"
            required
          />
          <button
            type="button"
            className="admin-password-toggle"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            aria-pressed={showPassword}
            onClick={() => setShowPassword((v) => !v)}
          >
            <span className="material-symbols-outlined admin-password-toggle-icon" aria-hidden>
              {showPassword ? 'visibility_off' : 'visibility'}
            </span>
          </button>
        </div>
      </div>
      <label className="admin-checkbox-row">
        <input
          type="checkbox"
          checked={rememberMe}
          onChange={(e) => setRememberMe(e.target.checked)}
          className="admin-checkbox"
        />
        <span>Remember me for 30 days</span>
      </label>
      <button type="submit" className="admin-btn admin-btn-primary admin-btn-full" disabled={loading}>
        {loading ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}
