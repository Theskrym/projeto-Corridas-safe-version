import { Navigate, useLocation } from 'react-router-dom';

const determineUserRole = (userData: any): 'admin' | 'motorista' | 'unknown' => {
  if (!userData) return 'unknown';

  const nivelAc = typeof userData.nivel_acesso === 'string'
    ? Number(userData.nivel_acesso)
    : userData.nivel_acesso;

  const groupNames = (userData.groups || []).map((g: any) => String(g.name || '').toLowerCase());

  if (
    userData.nivel_acesso === 'admin' ||
    nivelAc === 1 ||
    nivelAc === 2 ||
    nivelAc === 4 ||
    userData.is_superuser ||
    userData.is_staff ||
    groupNames.includes('admin') ||
    groupNames.includes('gerente') ||
    groupNames.includes('operador')
  ) {
    return 'admin';
  }

  if (
    userData.nivel_acesso === 'motorista' ||
    userData.nivel_acesso === 'driver' ||
    nivelAc === 3
  ) {
    return 'motorista';
  }

  return 'unknown';
};

const RequireAdminAuth = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const user = localStorage.getItem('user');

  if (!user) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  try {
    const parsedUser = JSON.parse(user);
    const role = determineUserRole(parsedUser);
    
    if (role !== 'admin') {
      return <Navigate to="/not-found" replace />;
    }

    return children;
  } catch {
    return <Navigate to="/" state={{ from: location }} replace />;
  }
};

export default RequireAdminAuth;
