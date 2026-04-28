import { Route, Routes, Navigate } from 'react-router-dom';
import { AuthProvider } from '../auth/auth-context';
import { RequireAuth } from '../auth/require-auth';
import { AppLayout } from '../components/app-layout';
import { LoginPage } from '../pages/login-page';
import { ProjectsListPage } from '../pages/projects-list-page';
import { ProjectDetailPage } from '../pages/project-detail-page';
import { UsersListPage } from '../pages/users-list-page';
import { UserDetailPage } from '../pages/user-detail-page';
import { ProfilePage } from '../pages/profile-page';

export function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          element={
            <RequireAuth>
              <AppLayout />
            </RequireAuth>
          }
        >
          <Route path="/projects" element={<ProjectsListPage />} />
          <Route path="/projects/:id" element={<ProjectDetailPage />} />
          <Route path="/users" element={<UsersListPage />} />
          <Route path="/users/:id" element={<UserDetailPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>
        <Route path="*" element={<Navigate to="/projects" replace />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
