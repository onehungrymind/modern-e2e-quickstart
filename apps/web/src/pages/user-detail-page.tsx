import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiFetch, ApiError } from '../api/client';
import { useAuth } from '../auth/auth-context';

type User = { id: string; name: string; email: string; role: string };
type Task = {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate: string | null;
  projectId: string;
  project?: { id: string; name: string };
};

export function UserDetailPage() {
  const { id = '' } = useParams();
  const { token } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    apiFetch<User & { assignedTasks?: Task[] }>(`/users/${id}`, { token })
      .then((u) => {
        if (cancelled) return;
        setUser({ id: u.id, name: u.name, email: u.email, role: u.role });
        setTasks(u.assignedTasks ?? []);
        setError(null);
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
  }, [id, token]);

  if (loading) return <p className="text-sm text-ink-500">Loading…</p>;
  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!user) return <p className="text-sm text-ink-500">User not found.</p>;

  return (
    <div>
      <div className="mb-1 text-sm text-ink-500">
        <Link to="/users" className="hover:text-ink-800 transition-colors">
          Users
        </Link>{' '}
        /
      </div>
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 rounded-full bg-brand-100 text-brand-700 grid place-items-center text-lg font-semibold">
          {user.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <h1
            data-testid="user-detail-name"
            className="text-2xl font-semibold tracking-tight text-ink-800"
          >
            {user.name}
          </h1>
          <p
            data-testid="user-detail-email"
            className="text-sm text-ink-500 mt-0.5"
          >
            {user.email} ·{' '}
            <span
              className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                user.role === 'admin'
                  ? 'bg-brand-100 text-brand-700'
                  : 'bg-ink-100 text-ink-600'
              }`}
            >
              {user.role}
            </span>
          </p>
        </div>
      </div>

      <h2 className="text-base font-semibold text-ink-800 mb-3">
        Assigned tasks
      </h2>
      {tasks.length === 0 ? (
        <div
          data-testid="user-detail-tasks-empty-state"
          className="bg-white border border-dashed border-ink-200 rounded-lg p-10 text-center"
        >
          <p className="text-sm text-ink-500">No tasks assigned.</p>
        </div>
      ) : (
        <ul
          data-testid="user-detail-tasks-list"
          className="bg-white border border-ink-200 rounded-lg divide-y divide-ink-200 overflow-hidden shadow-soft"
        >
          {tasks.map((t) => (
            <li key={t.id} className="transition-colors hover:bg-ink-50">
              <Link to={`/projects/${t.projectId}`} className="block px-4 py-3.5">
                <div className="font-medium text-ink-800">{t.title}</div>
                <div className="text-xs text-ink-500 mt-1">
                  status: {t.status} · priority: {t.priority}
                  {t.dueDate ? ` · due: ${t.dueDate.slice(0, 10)}` : ''}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
