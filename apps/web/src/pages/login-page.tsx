import { useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams, Navigate } from 'react-router-dom';
import { useAuth } from '../auth/auth-context';
import { ApiError } from '../api/client';

export function LoginPage() {
  const { login, status } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (status === 'authenticated') {
    const returnTo = params.get('returnTo') || '/projects';
    return <Navigate to={returnTo} replace />;
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      const returnTo = params.get('returnTo') || '/projects';
      navigate(returnTo, { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.statusCode >= 400 && err.statusCode < 500) {
        setError('Invalid email or password');
      } else {
        setError('Something went wrong. Try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    'w-full px-3 py-2 border border-ink-200 rounded-md bg-white text-ink-800 placeholder:text-ink-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-400/20 transition-shadow';

  return (
    <div className="min-h-screen bg-ink-50 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-8 justify-center">
          <span className="w-8 h-8 rounded-lg bg-brand-400 grid place-items-center">
            <span className="block w-3.5 h-3.5 rounded-sm bg-white" />
          </span>
          <span className="text-base font-semibold tracking-tight text-ink-800">
            E2E Quickstart
          </span>
        </div>

        <div className="bg-white rounded-lg shadow-soft border border-ink-200 p-6">
          <h1 className="text-lg font-semibold text-ink-800 mb-1">
            Welcome back
          </h1>
          <p className="text-sm text-ink-500 mb-6">
            Sign in with{' '}
            <code className="text-xs bg-ink-100 text-ink-700 px-1.5 py-0.5 rounded">
              admin@example.com
            </code>{' '}
            /{' '}
            <code className="text-xs bg-ink-100 text-ink-700 px-1.5 py-0.5 rounded">
              Admin123!
            </code>
          </p>
          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <div>
              <label
                htmlFor="login-email"
                className="block text-xs font-medium text-ink-700 mb-1.5"
              >
                Email
              </label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label
                htmlFor="login-password"
                className="block text-xs font-medium text-ink-700 mb-1.5"
              >
                Password
              </label>
              <input
                id="login-password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
              />
            </div>
            {error && (
              <p
                data-testid="login-error-message"
                className="text-sm text-red-600"
                role="alert"
              >
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2 rounded-md bg-brand-400 text-ink-900 font-medium hover:bg-brand-500 hover:text-white disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
