import { useState } from 'react';
import type { FormEvent } from 'react';
import api from '../api/axios.ts';
import { useNavigate } from 'react-router-dom';
import '../../src/components/geral/GeralCSS.css';
import logoCesmac from '../assets/logo-CESMAC-redux.svg';
import iconLogin from '../assets/icon-login.svg';
import iconeSenha from '../assets/icone-senha.svg';

// Helper function to determine user role from user data
const determineUserRole = (userData: any): 'admin' | 'motorista' | 'unknown' => {
  if (!userData) return 'unknown';

  const nivelAc = typeof userData.nivel_acesso === 'string'
    ? Number(userData.nivel_acesso)
    : userData.nivel_acesso;

  const groupNames = (userData.groups || []).map((g: any) => String(g.name || '').toLowerCase());

  // Admin/gerente/operador têm acesso ao painel administrativo
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

  if (groupNames.includes('motorista') || groupNames.includes('driver')) {
    return 'motorista';
  }

  // Motorista: nivel_acesso = 'motorista' or nivel_acesso = 3
  if (userData.nivel_acesso === 'motorista' || userData.nivel_acesso === 'driver' || nivelAc === 3) {
    return 'motorista';
  }

  return 'unknown';
};

// Determine navigation path based on user role
const getNavigationPath = (userData: any): string => {
  const role = determineUserRole(userData);
  return role === 'admin' ? '/home' : '/agendamento';
};

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    login: '',
    password: ''
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await api.post('/login/', formData);
      // Suportar ambos os formatos: antigo e novo
      const data = response.data;

      // Formato novo: {success, access_token, user: {...}}
      const token = data.access_token || data.token;
      const user = data.user || {
        id_usuario: data.user_id,
        login: data.login,
        nome: data.nome,
        email: data.email,
        nivel_acesso: data.nivel_acesso
      };

      if (token && user) {
        localStorage.setItem('token', token);
        localStorage.setItem('refresh_token', data.refresh_token || '');
        
        // Normalizar o objeto do usuário para usar ID correto
        const userId = user.id || user.id_usuario;
        const userToStore = {
          id: userId,
          login: user.login,
          nome: user.nome,
          email: user.email,
          nivel_acesso: user.nivel_acesso
        };
        
        localStorage.setItem('user', JSON.stringify(userToStore));

        const navPath = getNavigationPath(userToStore);
        // Role-based navigation: admin goes to /home, others go to /agendamento
        navigate(navPath, { replace: true });
      } else {
        setError('Resposta inválida do servidor');
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || 'Usuário ou senha inválidos';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="login-content-wrapper">
      {/* Header */}
        <img src={logoCesmac} alt="CESMAC" className="home-logo" />
      <div className="header">
        <div className="home-header-bar">
          <h1 className="home-title">Sistema de Gerenciamento de Motoristas</h1>
        </div>
      </div>

      {/* Conteúdo principal */}
      <div className="login-form-card">
        <h2 className="login-form-title">Login</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="login-input-group">
            <label className="login-input-label" htmlFor="login">
              Login
            </label>
            <div className="login-input-wrapper">
              <img src={iconLogin} alt="" className="login-input-icon" />
              <input
                id="login"
                type="text"
                name="login"
                className="login-input-field"
                value={formData.login}
                onChange={handleChange}
                placeholder="Digite seu login"
                required
                tabIndex={1}
              />
            </div>
          </div>

          <div className="login-input-group">
            <label className="login-input-label" htmlFor="password">
              Senha
            </label>
            <div className="login-input-wrapper">
              <img src={iconeSenha} alt="" className="login-input-icon" />
              <input
                id="password"
                type="password"
                name="password"
                className="login-input-field"
                value={formData.password}
                onChange={handleChange}
                placeholder="Digite sua senha"
                required
                tabIndex={2}
              />
            </div>
          </div>

          {error && (
            <div className="login-error-message" role="alert">
              {error}
            </div>
          )}

          <div className="login-forgot-password">
            <span 
              onClick={() => navigate('/esqueceu-senha')} 
              className="forgot-password-link"
              style={{ cursor: 'pointer' }}
              role="button"
              tabIndex={4}
              onKeyDown={(e) => e.key === 'Enter' && navigate('/esqueceu-senha')}>
              Esqueceu sua senha?
            </span>
          </div>

          <button 
            type="submit" 
            className="login-submit-button"
            disabled={loading}
            tabIndex={3}
          >
            {loading ? 'Carregando...' : 'Entrar'}
          </button>
        </form>
      </div>

      <p className="login-footer-text text-center text-sm text-[#1A4D8C]">
        Não possui uma conta? Entre em contato com:<br />
        <strong>Suporte CTI – (82) 3215–5133</strong><br /><br />
        © 2026 CESMAC – Todos os direitos reservados
      </p>
    </div>
  );
};

export default Login;