import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch, ApiError } from '../api/client';
import { useAuth } from '../auth/auth-context';

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
};

export function UsersListPage() {
  const { token } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    apiFetch<User[]>('/users', { token })
      .then((u) => {
        if (!cancelled) {
          setUsers(u);
          setError(null);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.statusCode === 401) return;
        setError(err instanceof Error ? err.message : 'Failed to load');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (loading) return <p className="text-sm text-ink-500">Loading…</p>;
  if (error) return <p className="text-sm text-red-600">{error}</p>;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-ink-800">
          Users
        </h1>
        <p className="text-sm text-ink-500 mt-1">
          {users.length} user{users.length === 1 ? '' : 's'}
        </p>
      </div>
      <ul
        data-testid="users-list"
        className="bg-white border border-ink-200 rounded-lg divide-y divide-ink-200 overflow-hidden shadow-soft"
      >
        {users.map((u) => (
          <li
            key={u.id}
            data-testid="users-list-item"
            className="transition-colors hover:bg-ink-50"
          >
            <Link to={`/users/${u.id}`} className="block px-4 py-3.5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 grid place-items-center text-sm font-semibold">
                  {u.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-ink-800 truncate">
                    {u.name}
                  </div>
                  <div className="text-sm text-ink-500 truncate">
                    {u.email}
                  </div>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    u.role === 'admin'
                      ? 'bg-brand-100 text-brand-700'
                      : 'bg-ink-100 text-ink-600'
                  }`}
                >
                  {u.role}
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
