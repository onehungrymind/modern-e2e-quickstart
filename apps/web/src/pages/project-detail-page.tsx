import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { apiFetch, ApiError } from '../api/client';
import { useAuth } from '../auth/auth-context';

type Project = {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  owner?: { id: string; name: string; email: string };
  createdAt: string;
};

type Task = {
  id: string;
  title: string;
  description: string | null;
  status: 'todo' | 'doing' | 'done' | string;
  priority: 'low' | 'medium' | 'high' | string;
  dueDate: string | null;
  projectId: string;
  assigneeId: string | null;
  assignee?: { id: string; name: string } | null;
};

type User = { id: string; name: string; email: string; role: string };

const STATUSES = ['todo', 'doing', 'done'] as const;
const PRIORITIES = ['low', 'medium', 'high'] as const;

const STATUS_STYLES: Record<string, string> = {
  todo: 'bg-ink-100 text-ink-700',
  doing: 'bg-blue-100 text-blue-800',
  done: 'bg-brand-100 text-brand-700',
};

const PRIORITY_STYLES: Record<string, string> = {
  low: 'bg-ink-100 text-ink-600',
  medium: 'bg-amber-100 text-amber-800',
  high: 'bg-red-100 text-red-800',
};

export function ProjectDetailPage() {
  const { id = '' } = useParams();
  const { token, user: currentUser } = useAuth();
  const navigate = useNavigate();

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [statusFilter, setStatusFilter] = useState<'' | (typeof STATUSES)[number]>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewTask, setShowNewTask] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  const canManageProject =
    currentUser?.role === 'admin' || currentUser?.id === project?.ownerId;

  const reloadTasks = useCallback(
    async (filter: typeof statusFilter) => {
      const query = filter ? `?status=${filter}` : '';
      const t = await apiFetch<Task[]>(`/projects/${id}/tasks${query}`, { token });
      setTasks(t);
    },
    [id, token],
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      apiFetch<Project>(`/projects/${id}`, { token }),
      apiFetch<Task[]>(`/projects/${id}/tasks`, { token }),
      apiFetch<User[]>('/users', { token }),
    ])
      .then(([p, t, u]) => {
        if (cancelled) return;
        setProject(p);
        setTasks(t);
        setUsers(u);
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

  const onStatusFilterChange = async (value: typeof statusFilter) => {
    setStatusFilter(value);
    await reloadTasks(value);
  };

  const onTaskCreated = (t: Task) => {
    setTasks((prev) => [...prev, t]);
    setShowNewTask(false);
  };

  const onTaskUpdated = (updated: Task) => {
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    setEditingTaskId(null);
  };

  const onTaskDeleted = (deletedId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== deletedId));
    setEditingTaskId(null);
  };

  const onDeleteProject = async () => {
    if (!project) return;
    if (!window.confirm(`Delete project "${project.name}"? Tasks will be removed too.`)) return;
    try {
      await apiFetch(`/projects/${project.id}`, { method: 'DELETE', token });
      navigate('/projects', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to delete');
    }
  };

  if (loading) return <p className="text-sm text-ink-500">Loading…</p>;
  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!project) return <p className="text-sm text-ink-500">Project not found.</p>;

  return (
    <div>
      <div className="mb-1 text-sm text-ink-500">
        <Link to="/projects" className="hover:text-ink-800 transition-colors">
          Projects
        </Link>{' '}
        /
      </div>
      <div className="flex items-start gap-3 mb-8">
        <div>
          <h1
            data-testid="project-detail-name"
            className="text-2xl font-semibold tracking-tight text-ink-800"
          >
            {project.name}
          </h1>
          {project.description && (
            <p
              data-testid="project-detail-description"
              className="text-sm text-ink-500 mt-1"
            >
              {project.description}
            </p>
          )}
        </div>
        {canManageProject && (
          <button
            type="button"
            onClick={onDeleteProject}
            className="ml-auto px-3.5 py-2 rounded-md border border-red-200 text-red-700 text-sm font-medium hover:bg-red-50 transition-colors"
          >
            Delete project
          </button>
        )}
      </div>

      <section>
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-base font-semibold text-ink-800">Tasks</h2>
          <div className="ml-auto flex items-center gap-2">
            <label
              htmlFor="task-status-filter"
              className="text-xs font-medium text-ink-500"
            >
              Status
            </label>
            <select
              id="task-status-filter"
              value={statusFilter}
              onChange={(e) =>
                onStatusFilterChange(e.target.value as typeof statusFilter)
              }
              className="px-2.5 py-1.5 border border-ink-200 rounded-md bg-white text-sm focus:border-brand-400 focus:ring-2 focus:ring-brand-400/20 transition-shadow"
            >
              <option value="">All</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setShowNewTask((v) => !v)}
              className="px-3.5 py-2 rounded-md bg-brand-400 text-ink-900 text-sm font-medium hover:bg-brand-500 hover:text-white transition-colors"
            >
              Add task
            </button>
          </div>
        </div>

        {showNewTask && (
          <TaskForm
            token={token}
            projectId={project.id}
            users={users}
            onSaved={onTaskCreated}
            onCancel={() => setShowNewTask(false)}
          />
        )}

        {tasks.length === 0 ? (
          <div
            data-testid="project-detail-tasks-empty-state"
            className="bg-white border border-dashed border-ink-200 rounded-lg p-10 text-center"
          >
            <p className="text-sm text-ink-500">No tasks yet.</p>
          </div>
        ) : (
          <ul
            data-testid="tasks-list"
            className="bg-white border border-ink-200 rounded-lg divide-y divide-ink-200 overflow-hidden shadow-soft"
          >
            {tasks.map((t) => (
              <li key={t.id} data-testid="task-row">
                {editingTaskId === t.id ? (
                  <div className="p-4">
                    <TaskForm
                      token={token}
                      projectId={project.id}
                      users={users}
                      existing={t}
                      onSaved={onTaskUpdated}
                      onCancel={() => setEditingTaskId(null)}
                      onDeleted={onTaskDeleted}
                    />
                  </div>
                ) : (
                  <TaskRow
                    task={t}
                    users={users}
                    onEdit={() => setEditingTaskId(t.id)}
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function TaskRow({
  task,
  users,
  onEdit,
}: {
  task: Task;
  users: User[];
  onEdit: () => void;
}) {
  const assignee = users.find((u) => u.id === task.assigneeId);
  return (
    <div className="px-4 py-3.5 flex items-center gap-4">
      <div className="flex-1 min-w-0">
        <div className="font-medium text-ink-800 truncate">{task.title}</div>
        {task.description && (
          <div className="text-sm text-ink-500 mt-0.5 truncate">
            {task.description}
          </div>
        )}
        <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
          <span
            data-testid="task-row-status"
            className={`px-2 py-0.5 rounded-full font-medium ${
              STATUS_STYLES[task.status] ?? 'bg-ink-100 text-ink-700'
            }`}
          >
            status: {task.status}
          </span>
          <span
            data-testid="task-row-priority"
            className={`px-2 py-0.5 rounded-full font-medium ${
              PRIORITY_STYLES[task.priority] ?? 'bg-ink-100 text-ink-700'
            }`}
          >
            priority: {task.priority}
          </span>
          {task.dueDate && (
            <span
              data-testid="task-row-due"
              className="px-2 py-0.5 rounded-full bg-ink-100 text-ink-600 font-medium"
            >
              due: {task.dueDate.slice(0, 10)}
            </span>
          )}
          <span
            data-testid="task-row-assignee"
            className="px-2 py-0.5 rounded-full bg-ink-100 text-ink-600 font-medium"
          >
            assignee: {assignee ? assignee.name : 'unassigned'}
          </span>
        </div>
      </div>
      <button
        type="button"
        onClick={onEdit}
        className="px-3 py-1.5 rounded-md border border-ink-200 text-ink-700 text-sm font-medium hover:bg-ink-50 transition-colors"
      >
        Edit
      </button>
    </div>
  );
}

function TaskForm({
  token,
  projectId,
  users,
  existing,
  onSaved,
  onCancel,
  onDeleted,
}: {
  token: string | null;
  projectId: string;
  users: User[];
  existing?: Task;
  onSaved: (t: Task) => void;
  onCancel: () => void;
  onDeleted?: (id: string) => void;
}) {
  const [title, setTitle] = useState(existing?.title ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [status, setStatus] = useState<Task['status']>(existing?.status ?? 'todo');
  const [priority, setPriority] = useState<Task['priority']>(existing?.priority ?? 'medium');
  const [dueDate, setDueDate] = useState(existing?.dueDate?.slice(0, 10) ?? '');
  const [assigneeId, setAssigneeId] = useState(existing?.assigneeId ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const payload = {
      title,
      description: description || undefined,
      status,
      priority,
      dueDate: dueDate ? new Date(dueDate).toISOString() : existing ? null : undefined,
      assigneeId: assigneeId || undefined,
    };
    try {
      const saved = existing
        ? await apiFetch<Task>(`/tasks/${existing.id}`, {
            method: 'PATCH',
            body: payload,
            token,
          })
        : await apiFetch<Task>(`/projects/${projectId}/tasks`, {
            method: 'POST',
            body: payload,
            token,
          });
      onSaved(saved);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    if (!existing || !onDeleted) return;
    if (!window.confirm(`Delete task "${existing.title}"?`)) return;
    try {
      await apiFetch(`/tasks/${existing.id}`, { method: 'DELETE', token });
      onDeleted(existing.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to delete');
    }
  };

  const inputClass =
    'w-full px-3 py-2 border border-ink-200 rounded-md bg-white text-sm placeholder:text-ink-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-400/20 transition-shadow';
  const labelClass = 'block text-xs font-medium text-ink-700 mb-1.5';

  return (
    <form
      onSubmit={onSubmit}
      className="bg-ink-50 border border-ink-200 rounded-lg p-4 space-y-3"
      data-testid="task-form"
    >
      <div>
        <label htmlFor="task-title" className={labelClass}>
          Title
        </label>
        <input
          id="task-title"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor="task-description" className={labelClass}>
          Description
        </label>
        <textarea
          id="task-description"
          value={description ?? ''}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className={inputClass}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="task-status" className={labelClass}>
            Status
          </label>
          <select
            id="task-status"
            value={status}
            onChange={(e) => setStatus(e.target.value as Task['status'])}
            className={inputClass}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="task-priority" className={labelClass}>
            Priority
          </label>
          <select
            id="task-priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value as Task['priority'])}
            className={inputClass}
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="task-due" className={labelClass}>
            Due date
          </label>
          <input
            id="task-due"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="task-assignee" className={labelClass}>
            Assignee
          </label>
          <select
            id="task-assignee"
            value={assigneeId}
            onChange={(e) => setAssigneeId(e.target.value)}
            className={inputClass}
          >
            <option value="">Unassigned</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="px-3.5 py-2 rounded-md bg-brand-400 text-ink-900 text-sm font-medium hover:bg-brand-500 hover:text-white disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving…' : existing ? 'Save' : 'Create'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-3.5 py-2 rounded-md border border-ink-200 text-ink-700 text-sm font-medium hover:bg-ink-50 transition-colors"
        >
          Cancel
        </button>
        {existing && onDeleted && (
          <button
            type="button"
            onClick={onDelete}
            className="ml-auto px-3.5 py-2 rounded-md border border-red-200 text-red-700 text-sm font-medium hover:bg-red-50 transition-colors"
          >
            Delete
          </button>
        )}
      </div>
    </form>
  );
}
