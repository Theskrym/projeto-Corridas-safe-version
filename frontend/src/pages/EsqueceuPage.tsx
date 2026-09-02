import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios.ts';
import '../../src/components/geral/GeralCSS.css';
import iconLogin from '../assets/icon-login.svg';
import Header from '../components/common/HeaderFULL.tsx';

const Esqueceu: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!formData.email.endsWith('@cesmac.edu.br')) {
      setError('Por favor, use seu email corporativo (@cesmac.edu.br)');
      setLoading(false);
      return;
    }

    try {
      const response = await api.post('/forgot-password/', {
        email: formData.email.toLowerCase()
      });
      
      console.log('Password reset response:', response.data);
      setSuccess(true);
      
      // Redirect to login page after 3 seconds
      setTimeout(() => {
        navigate('/', { replace: true });
      }, 3000);
      
    } catch (error: any) {
      console.error('Password reset error:', error);
      setError(error.response?.data?.error || 'Erro ao processar solicitação');
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
      <Header title="Recuperação de Senha" showLeft={true} showRight={false} />
      
      <div className="login-form-card">
        <h2 className="login-form-title">Informe o seu e-mail:</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="login-input-group">
            <label className="login-input-label" htmlFor="email">
              E-mail
            </label>
            <div className="login-input-wrapper">
              <img src={iconLogin} alt="" className="login-input-icon" />
              <input
                id="email"
                type="email"
                name="email"
                className="login-input-field"
                value={formData.email}
                onChange={handleChange}
                placeholder="seu.email@cesmac.edu.br"
                required
                tabIndex={1}
              />
            </div>
          </div>

          {error && (
            <div className="login-error-message" role="alert">
              {error}
            </div>
          )}

          {success && (
            <div className="login-success-message" role="alert">
              Email enviado com sucesso! Redirecionando...
            </div>
          )}

          <button 
            type="submit" 
            className="login-submit-button"
            disabled={loading}
            tabIndex={2}
          >
            {loading ? 'Enviando...' : 'Enviar'}
          </button>
        </form>
      </div>

      <p className="login-footer-text text-center text-sm text-[#1A4D8C]">
        Não possui uma conta? Entre em contato com:<br />
        <strong>Suporte CTI – (82) 3215–5133</strong><br /><br />
        © 2025 CESMAC – Todos os direitos reservados
      </p>
    </div>
  );
};

export default Esqueceu;