import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch, ApiError } from '../api/client';
import { useAuth } from '../auth/auth-context';

type Project = {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  createdAt: string;
};

export function ProjectsListPage() {
  const { token } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    apiFetch<Project[]>('/projects', { token })
      .then((res) => {
        if (!cancelled) {
          setProjects(res);
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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter((p) => p.name.toLowerCase().includes(q));
  }, [projects, search]);

  const onCreated = (project: Project) => {
    setProjects((prev) => [...prev, project]);
    setShowNew(false);
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink-800">
            Projects
          </h1>
          <p className="text-sm text-ink-500 mt-1">
            {projects.length} project{projects.length === 1 ? '' : 's'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowNew((v) => !v)}
          className="ml-auto px-3.5 py-2 rounded-md bg-brand-400 text-ink-900 text-sm font-medium hover:bg-brand-500 hover:text-white transition-colors"
        >
          New project
        </button>
      </div>

      <div className="mb-5">
        <label htmlFor="projects-search" className="sr-only">
          Search projects
        </label>
        <input
          id="projects-search"
          type="search"
          placeholder="Search projects"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-md px-3 py-2 border border-ink-200 rounded-md bg-white text-sm placeholder:text-ink-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-400/20 transition-shadow"
        />
      </div>

      {showNew && (
        <NewProjectForm
          token={token}
          onCreated={onCreated}
          onCancel={() => setShowNew(false)}
        />
      )}

      {loading && (
        <p
          data-testid="projects-list-loading"
          className="text-sm text-ink-500"
        >
          Loading…
        </p>
      )}
      {error && (
        <p
          data-testid="projects-list-error"
          className="text-sm text-red-600"
        >
          Failed to load projects
        </p>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div
          data-testid="projects-list-empty-state"
          className="bg-white border border-dashed border-ink-200 rounded-lg p-10 text-center"
        >
          <p className="text-sm text-ink-500">No projects match your search.</p>
        </div>
      )}

      {filtered.length > 0 && (
        <ul
          data-testid="projects-list"
          className="bg-white border border-ink-200 rounded-lg divide-y divide-ink-200 overflow-hidden shadow-soft"
        >
          {filtered.map((p) => (
            <li
              key={p.id}
              data-testid="projects-list-item"
              className="transition-colors hover:bg-ink-50"
            >
              <Link to={`/projects/${p.id}`} className="block px-4 py-3.5">
                <div className="font-medium text-ink-800">{p.name}</div>
                {p.description && (
                  <div className="text-sm text-ink-500 mt-1 truncate">
                    {p.description}
                  </div>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function NewProjectForm({
  token,
  onCreated,
  onCancel,
}: {
  token: string | null;
  onCreated: (p: Project) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const p = await apiFetch<Project>('/projects', {
        method: 'POST',
        body: { name, description: description || undefined },
        token,
      });
      onCreated(p);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create');
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    'w-full px-3 py-2 border border-ink-200 rounded-md bg-white text-sm placeholder:text-ink-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-400/20 transition-shadow';

  return (
    <form
      onSubmit={onSubmit}
      className="mb-5 bg-white border border-ink-200 rounded-lg p-5 space-y-3 shadow-soft"
      data-testid="project-new-form"
    >
      <div>
        <label
          htmlFor="project-name"
          className="block text-xs font-medium text-ink-700 mb-1.5"
        >
          Name
        </label>
        <input
          id="project-name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputClass}
        />
      </div>
      <div>
        <label
          htmlFor="project-description"
          className="block text-xs font-medium text-ink-700 mb-1.5"
        >
          Description
        </label>
        <textarea
          id="project-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={inputClass}
          rows={2}
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="px-3.5 py-2 rounded-md bg-brand-400 text-ink-900 text-sm font-medium hover:bg-brand-500 hover:text-white disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving…' : 'Create'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-3.5 py-2 rounded-md border border-ink-200 text-ink-700 text-sm font-medium hover:bg-ink-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
