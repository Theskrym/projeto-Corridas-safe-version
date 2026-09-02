import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../components/geral/GeralCSS.css';
import logoCesmac from '../assets/logo-CESMAC.svg';

const NotFoundPage = () => {
  const navigate = useNavigate();
  const user = localStorage.getItem('user');

  // Remove margins do body para garantir que o background vai até o topo
  React.useEffect(() => {
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    document.documentElement.style.margin = '0';
    document.documentElement.style.padding = '0';
    
    return () => {
      document.body.style.margin = '';
      document.body.style.padding = '';
      document.documentElement.style.margin = '';
      document.documentElement.style.padding = '';
    };
  }, []);

  // Determina para qual página redirecionar
  const getRedirectPath = () => {
    if (!user) return '/';
    
    try {
      const parsedUser = JSON.parse(user);
      // Se for motorista (nivel_acesso === 3), vai para agendamento
      if (parsedUser.nivel_acesso === 3) {
        return '/agendamento';
      }
      // Se for admin (nivel_acesso === 1), vai para home
      if (parsedUser.nivel_acesso === 1) {
        return '/home';
      }
      // Se não for nenhum dos 2, vai para login
      return '/';
    } catch {
      return '/';
    }
  };

  const handleGoBack = () => {
    navigate(getRedirectPath());
  };

  return (
    <>
      {/* Background fixo no topo */}
      <div style={{
        position: 'fixed',
        top: '-10%',
        left: '-50px',
        width: 'calc(100% + 100px)',
        height: 'calc(100% + 100px)',
        backgroundImage: 'url(https://acesso.cesmac.edu.br/common/img/specific/opening/bg-opening.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        zIndex: -1,
        overflow: 'hidden'
      }} />

      {/* Conteúdo da página */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh'
      }}>
      {/* Header com Logo */}
      <header style={{
        padding: '20px',
        display: 'flex',
        justifyContent: 'center'
      }}>
        <img 
          src={logoCesmac} 
          alt="Logo CESMAC" 
          style={{
            height: '60px'
          }}
        />
      </header>

      {/* Conteúdo Central */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
        padding: '20px'
      }}>
      <div style={{
        borderRadius: '8px',
        padding: '40px 20px',
        maxWidth: '500px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        textAlign: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)'
      }}>
        <h1 style={{
          fontSize: '72px',
          fontWeight: 'bold',
          color: '#0069AD',
          margin: '0 0 20px 0'
        }}>
          404
        </h1>
        
        <h2 style={{
          fontSize: '24px',
          color: '#333',
          margin: '0 0 10px 0'
        }}>
          Página não encontrada
        </h2>
        
        <p style={{
          fontSize: '16px',
          color: '#666',
          margin: '0 0 30px 0',
          lineHeight: '1.5'
        }}>
          Desculpe, a página que você está tentando acessar não existe ou você não tem permissão para acessá-la.
        </p>
        
        <div style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'center',
          flexWrap: 'wrap'
        }}>
          <button
            onClick={handleGoBack}
            style={{
              backgroundColor: '#0072c6',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '500',
              transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#045ca4')}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#0072c6')}
            title="Voltar"
          >
            Voltar
          </button>
        </div>
      </div>
      </div>
    </div>
    </>
  );
};

export default NotFoundPage;
