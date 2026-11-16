import { useNavigate } from 'react-router-dom';
import '../components/geral/GeralCSS.css';
import logoCesmac from '../assets/logo-CESMAC.svg';
import './NotFoundPage.css';

const NotFoundPage = () => {
  const navigate = useNavigate();
  const user = localStorage.getItem('user');

  const getRedirectPath = () => {
    if (!user) return '/';
    
    try {
      const parsedUser = JSON.parse(user);
      if (parsedUser.nivel_acesso === 3) {
        return '/agendamento';
      }
      if (parsedUser.nivel_acesso === 1) {
        return '/home';
      }
      return '/';
    } catch {
      return '/';
    }
  };

  const handleGoBack = () => {
    navigate(getRedirectPath());
  };

  return (
    <div className="not-found-page">
      <header className="not-found-header">
        <img src={logoCesmac} alt="CESMAC" />
      </header>
      <main className="not-found-content">
        <section className="not-found-card" aria-labelledby="not-found-title">
          <p className="not-found-code" aria-hidden="true">404</p>
          <h1 id="not-found-title">Não encontramos esta página</h1>
          <p>O endereço pode estar incorreto ou a página pode ter sido movida.</p>
          <button type="button" className="not-found-action" onClick={handleGoBack}>
            Ir para o início
          </button>
        </section>
      </main>
    </div>
  );
};

export default NotFoundPage;
