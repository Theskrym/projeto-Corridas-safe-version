// RequireAuth.tsx
import { Navigate, useLocation } from 'react-router-dom';

const RequireAuth = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const user = localStorage.getItem('user');

  if (!user) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return children;
};

export default RequireAuth;