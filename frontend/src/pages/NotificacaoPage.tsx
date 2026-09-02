import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import '../components/geral/GeralCSS.css';
import Header from '../components/common/HeaderFULL.tsx';
import BottomMenu from '../components/common/BottomMenu.tsx';
import SideBarMenu from '../components/common/SideBarMenu.tsx';
import api from '../api/axios.ts';

interface NotificacaoDetalhes {
  id_notificacao: number;
  titulo: string;
  mensagem: string;
  data_criacao: string;
  lida: boolean;
  tipo: string;
}

export const NotificacaoPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLida, setIsLida] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);

  // Detectar se é motorista
  const storedUser = localStorage.getItem('user');
  const currentUser = storedUser ? JSON.parse(storedUser) : null;
  const isMotorista = currentUser && (
    currentUser.nivel_acesso === 'motorista' ||
    currentUser.nivel_acesso === 'driver' ||
    currentUser.nivel_acesso === 3
  );
  
  const notificacao: NotificacaoDetalhes = location.state || {
    id_notificacao: 0,
    titulo: 'Notificação não encontrada',
    mensagem: 'Volte para a lista de notificações e tente novamente',
    data_criacao: new Date().toISOString(),
    lida: false,
    tipo: 'UNKNOWN'
  };

  useEffect(() => {
    setIsLida(notificacao.lida);
  }, [notificacao.lida]);

  const handleVoltar = () => {
    navigate('/notificacoes');
  };

  const handleAlternarLida = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) return;

      if (isLida) {
        // Desmarcar como lida
        await api.post(`/notificacoes/${notificacao.id_notificacao}/marcar_como_nao_lida/`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        // Marcar como lida
        await api.post(`/notificacoes/${notificacao.id_notificacao}/marcar_como_lida/`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }

      setIsLida(!isLida);
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      alert('Erro ao alterar status da notificação');
    } finally {
      setLoading(false);
    }
  };

  const formatarData = (dataString: string) => {
    try {
      return new Date(dataString).toLocaleString('pt-BR');
    } catch {
      return dataString;
    }
  };

  return (
    <div className="home-main-container">
      <Header 
        title="Detalhes da Notificação" 
        showLeft={false} 
        showRight={true}
        onLeftClick={() => navigate('/agendamento')}
      />

      <div className="home-content-wrapper">
        {!isMotorista && <SideBarMenu />}

        <main className="conteudo" style={isMotorista ? { marginLeft: 0 } : undefined}>
          <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
            {/* Cabeçalho da notificação */}
            <div style={{
              padding: '20px',
              backgroundColor: '#f0f8ff',
              borderLeft: '4px solid #0069AD',
              borderRadius: '6px',
              marginBottom: '20px'
            }}>
              <h2 style={{
                margin: '0 0 8px 0',
                color: '#0069AD',
                fontSize: '18px'
              }}>
                {notificacao.titulo}
              </h2>
              <small style={{
                color: '#999',
                fontSize: '12px'
              }}>
                {formatarData(notificacao.data_criacao)}
              </small>
            </div>

            {/* Conteúdo da notificação */}
            <div style={{
              padding: '20px',
              border: '1px solid #e0e0e0',
              borderRadius: '6px',
              marginBottom: '20px',
              lineHeight: '1.6',
              color: '#333',
              fontSize: '14px'
            }}>
              {notificacao.mensagem}
            </div>

            {/* Botões de ação */}
            <div className="secondary-buttons-container">
              <button
                className="secondary-btn secondary-btn-cancel"
                onClick={handleVoltar}
                disabled={loading}
              >
                Voltar
              </button>
              <button
                className="secondary-btn secondary-btn-confirm"
                onClick={handleAlternarLida}
                disabled={loading}
              >
                {loading ? 'Processando...' : (isLida ? 'Marcar como Não Lida' : 'Marcar como Lida')}
              </button>
            </div>
          </div>
        </main>
      </div>

      <BottomMenu />
    </div>
  );
};

export default NotificacaoPage;