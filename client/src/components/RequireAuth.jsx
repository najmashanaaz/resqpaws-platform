import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Spinner from './Spinner.jsx';

export default function RequireAuth({ children, adminOnly = false }) {
  const { user, ready } = useAuth();
  const loc = useLocation();

  if (!ready) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <Spinner label="Checking your session" className="h-8 w-8" />
      </div>
    );
  }

  // Not logged in at all → send to welcome page
  if (!user) return <Navigate to="/welcome" replace state={{ from: loc.pathname }} />;

  // Admin-only pages: guests and regular users are redirected home
  if (adminOnly && user.role !== 'admin') return <Navigate to="/home" replace />;

  return children;
}
