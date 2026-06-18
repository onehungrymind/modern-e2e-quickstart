import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/auth-context';

export function ProfilePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const onLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-ink-800 mb-6">
        Profile
      </h1>
      <div className="bg-white border border-ink-200 rounded-lg p-6 max-w-md shadow-soft">
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-ink-200">
          <div className="w-14 h-14 rounded-full bg-brand-100 text-brand-700 grid place-items-center text-xl font-semibold">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="text-base font-semibold text-ink-800">
              {user.name}
            </div>
            <div className="text-sm text-ink-500">{user.email}</div>
          </div>
        </div>
        <dl className="space-y-3" data-testid="profile-info">
          <div className="flex justify-between items-center">
            <dt className="text-xs font-medium text-ink-500 uppercase tracking-wide">
              Name
            </dt>
            <dd className="text-sm text-ink-800">{user.name}</dd>
          </div>
          <div className="flex justify-between items-center">
            <dt className="text-xs font-medium text-ink-500 uppercase tracking-wide">
              Email
            </dt>
            <dd className="text-sm text-ink-800">{user.email}</dd>
          </div>
          <div className="flex justify-between items-center">
            <dt className="text-xs font-medium text-ink-500 uppercase tracking-wide">
              Role
            </dt>
            <dd>
              <span
                className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                  user.role === 'admin'
                    ? 'bg-brand-100 text-brand-700'
                    : 'bg-ink-100 text-ink-600'
                }`}
              >
                {user.role}
              </span>
            </dd>
          </div>
        </dl>
        <button
          type="button"
          onClick={onLogout}
          className="mt-6 w-full py-2 rounded-md bg-ink-800 text-white text-sm font-medium hover:bg-ink-700 transition-colors"
        >
          Log out
        </button>
      </div>
    </div>
  );
}
