import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios, { AxiosError } from 'axios';
import '../components/login/AutoLogin.css';

interface UserData {
  id: string;
  login: string;
  nome: string;
  email: string;
  nivel_acesso: string;
  force_password_change: boolean;
}

interface AutoLoginResponse {
  token: string;
  user_id: string;
  login: string;
  nome: string;
  email: string;
  nivel_acesso: string;
  force_password_change: boolean;
}

const AutoLoginPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get('token');
    const forceChangeParam = searchParams.get('force_change');
    const forceChange = forceChangeParam === 'true';

    console.log('Token from URL:', token);
    console.log('Force change param:', forceChangeParam);

    if (!token) {
      console.error('Token not found in URL');
      navigate('/');
      return;
    }

    const performAutoLogin = async () => {
      try {
        console.log('Sending token to backend...');
        const response = await axios.post<AutoLoginResponse>(
          'http://localhost:8003/api/auth/auto-login/', 
          { token }
        );
        
        console.log('AutoLogin response:', response.data);
        
        // Extract data from response
        const { token: authToken, user_id, login, nome, email, nivel_acesso, force_password_change } = response.data;

        // Save token and user data
        localStorage.setItem('token', authToken);
        
        const userData: UserData = {
          id: user_id,
          login: login,
          nome: nome,
          email: email,
          nivel_acesso: nivel_acesso,
          force_password_change: force_password_change || forceChange
        };
        
        localStorage.setItem('user', JSON.stringify(userData));
        console.log('User data saved to localStorage:', userData);

        // Redirect based on password change requirement
        if (force_password_change || forceChange) {
          console.log('Redirecting to password change page');
          navigate('/alterar-senha', { replace: true });
        } else {
          console.log('Redirecting to home page');
          navigate('/home', { replace: true });
        }
        
      } catch (error) {
        console.error('AutoLogin error:', error);
        const axiosError = error as AxiosError;
        
        let errorMessage = 'Link inválido ou expirado';
        
        if (axiosError.response) {
          console.error('Error response data:', axiosError.response.data);
          
          // Handle different error formats
          if (typeof axiosError.response.data === 'string') {
            errorMessage = axiosError.response.data;
          } else if (typeof axiosError.response.data === 'object') {
            const data = axiosError.response.data as any;
            errorMessage = data.error || data.message || data.detail || errorMessage;
          }
        } else if (axiosError.message) {
          errorMessage = axiosError.message;
        }
        
        setError(errorMessage);
        setTimeout(() => navigate('/', { replace: true }), 5000);
      }
    };

    performAutoLogin();
  }, [navigate, searchParams]);

  return (
    <div className="auto-login-container">
      {error ? (
        <div className="error-message">
          <p>{error}</p>
          <p>Redirecionando para a página de login em 5 segundos...</p>
        </div>
      ) : (
        <div className="loading-message">
          <p>Autenticando...</p>
          <div className="loading-spinner"></div>
        </div>
      )}
    </div>
  );
};

export default AutoLoginPage;