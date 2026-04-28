import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/auth-context';

export function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const navClass = ({ isActive }: { isActive: boolean }) =>
    [
      'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
      isActive
        ? 'bg-ink-100 text-ink-800'
        : 'text-ink-500 hover:text-ink-800 hover:bg-ink-100',
    ].join(' ');

  return (
    <div className="min-h-screen bg-ink-50 text-ink-800">
      <header
        data-testid="app-nav"
        className="bg-white border-b border-ink-200 sticky top-0 z-10 backdrop-blur-sm"
      >
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center gap-6">
          <Link to="/projects" className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-md bg-brand-400 grid place-items-center">
              <span className="block w-2.5 h-2.5 rounded-sm bg-white" />
            </span>
            <span className="text-sm font-semibold tracking-tight text-ink-800">
              E2E Quickstart
            </span>
          </Link>
          <nav className="flex items-center gap-1">
            <NavLink to="/projects" className={navClass}>
              Projects
            </NavLink>
            <NavLink to="/users" className={navClass}>
              Users
            </NavLink>
          </nav>
          <div
            className="ml-auto flex items-center gap-3"
            data-testid="app-nav-user-menu"
          >
            {user && (
              <Link
                to="/profile"
                className="text-sm text-ink-500 hover:text-ink-800 transition-colors"
                data-testid="app-nav-profile-link"
              >
                {user.name}
              </Link>
            )}
            <button
              type="button"
              onClick={handleLogout}
              className="text-sm px-3 py-1.5 rounded-md bg-ink-800 text-white hover:bg-ink-700 transition-colors"
            >
              Log out
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
