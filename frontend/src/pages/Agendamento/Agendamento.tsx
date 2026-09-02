/*
===========================================
  GLOSSÁRIO - ESTRUTURA DO ARQUIVO
===========================================
Linhas 1-30:    Imports
Linhas 31-70:   Interfaces e tipos (Ride)
Linhas 71-100:  Função auxiliar determineUserRole
Linhas 101-150: Componente Agendamento - Declaração e estados
Linhas 151-250: useEffect - Autenticação e carregamento de corridas
Linhas 251-300: Funções Aceitar / Recusar
Linhas 301-400: JSX - Header e user-bar
Linhas 401-500: JSX - Minhas Corridas (Cards)
Linhas 501-600: JSX - Histórico de Corridas
Linhas 601-650: JSX - Modal de recusa
===========================================
*/

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Agendamento.css';
import TagStatus from '../../components/common/TagStatus.tsx';
import SettingsMenu from '../../components/common/SettingsMenu.tsx';
import logoImg from '../../assets/logo-CESMAC-redux.svg';
import Campusico from '../../assets/corrida.svg';
import userImg from '../../assets/Icones-Perfil.svg';
import api from '../../api/axios.ts';

// Interface de Corrida - baseada no modelo Django
interface Corridas {
  id_corrida?: number;
  ponto_inicio: string;           // ponto de partida
  ponto_chegada: string;          // ponto de chegada
  data_solicitacao: string;       // data em formato ISO
  horario_inicio: string;         // "HH:MM"
  horario_retorno?: string;       // "HH:MM" (opcional)
  status: 'pendente' | 'confirmada' | 'reconfirmacao_necessaria' | 'em_andamento' | 'concluida' | 'cancelada' | 'recusada';
  motorista?: number;             // ID do motorista
  motorista_id?: number;          // alternativa
  motorista_nome?: string;
  veiculo?: number;               // ID do veículo
  veiculo_id?: number;            // alternativa
  veiculo_nome?: string;
  veiculo_placa?: string;
  solicitante?: string;
  destinos?: string;
  servico?: string;
  data_inicio?: string;
  data_conclusao?: string;
  observacao?: string;
}

// Determina a role do usuário a partir dos dados armazenados (igual ao LoginPage)
const determineUserRole = (userData: any): 'admin' | 'motorista' | 'unknown' => {
  if (!userData) return 'unknown';
  if (
    userData.nivel_acesso === 'admin' ||
    userData.nivel_acesso === 1 ||
    userData.is_superuser ||
    userData.is_staff
  ) {
    return 'admin';
  }
  if (userData.groups && userData.groups.length > 0) {
    const groupNames = userData.groups.map((g: any) => g.name.toLowerCase());
    if (groupNames.includes('motorista') || groupNames.includes('driver')) {
      return 'motorista';
    }
  }
  if (
    userData.nivel_acesso === 'motorista' ||
    userData.nivel_acesso === 'driver' ||
    userData.nivel_acesso === 3
  ) {
    return 'motorista';
  }
  return 'unknown';
};

// Função para ordenar corridas com critérios customizados
const sortRides = (a: Corridas, b: Corridas) => {
  // Prioridade de status: em_andamento > reconfirmacao_necessaria > pendente > confirmada
  const statusPriority: { [key: string]: number } = {
    'em_andamento': 1,
    'reconfirmacao_necessaria': 2,
    'pendente': 3,
    'confirmada': 4
  };
  
  const aPriority = statusPriority[a.status] || 999;
  const bPriority = statusPriority[b.status] || 999;
  
  if (aPriority !== bPriority) {
    return aPriority - bPriority;
  }
  
  const aDate = new Date(a.data_solicitacao);
  const bDate = new Date(b.data_solicitacao);
  const aDateNum = aDate.getFullYear() * 10000 + (aDate.getMonth() + 1) * 100 + aDate.getDate();
  const bDateNum = bDate.getFullYear() * 10000 + (bDate.getMonth() + 1) * 100 + bDate.getDate();
  
  if (aDateNum !== bDateNum) {
    return aDateNum - bDateNum;
  }
  
  // Se data for igual, ordenar por hora (menor primeiro)
  // Converter HH:MM para número HHMM
  const aHourNum = a.horario_inicio ? parseInt(a.horario_inicio.replace(':', '')) : 0;
  const bHourNum = b.horario_inicio ? parseInt(b.horario_inicio.replace(':', '')) : 0;
  
  return aHourNum - bHourNum;
};

const Agendamento: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<'admin' | 'motorista' | 'unknown'>('unknown');
  const [rides, setRides] = useState<Corridas[]>([]);
  const [historico, setHistorico] = useState<Corridas[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mostrarTodasCorridas, setMostrarTodasCorridas] = useState(false);
  const [mostrarTodoHistorico, setMostrarTodoHistorico] = useState(false);
  const [isFadingOutRides, setIsFadingOutRides] = useState(false);
  const [isFadingOutHistory, setIsFadingOutHistory] = useState(false);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  // Confirmação de recusa
  const [showCancelConfirmation, setShowCancelConfirmation] = useState(false);
  const [rideToCancel, setRideToCancel] = useState<number | null>(null);
  
  // Notificações
  const [notificationCount, setNotificationCount] = useState<number>(0);

  // Verifica autenticação e role ao montar o componente
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');

    if (!storedUser || !token) {
      navigate('/', { replace: true });
      return;
    }

    try {
      const parsedUser = JSON.parse(storedUser);
      const role = determineUserRole(parsedUser);
      if (role !== 'motorista') {
        setError('Acesso negado: esta página é destinada a motoristas.');
        navigate('/', { replace: true });
        return;
      }
      setUser(parsedUser);
      setUserRole(role);
    } catch {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      navigate('/', { replace: true });
    }
  }, [navigate]);

  // Carrega as corridas do motorista
  useEffect(() => {
    const loadRides = async () => {
      if (!user || userRole !== 'motorista') {
        console.log('Pulando carregamento: user=', user, 'userRole=', userRole);
        return;
      }

      try {
        setLoading(true);
        console.log('Carregando corridas do motorista:', user.id_usuario);
        const response = await api.get('/corrida/'); // Obtém dados da tabela Corridas
        console.log('Resposta de corridas:', response.data);
        
        // Filtra apenas as corridas do motorista logado
        let ridesData = response.data;
        
        // Se for um objeto com propriedade 'data', pega essa propriedade
        if (ridesData && typeof ridesData === 'object' && !Array.isArray(ridesData) && 'data' in ridesData) {
          ridesData = ridesData.data;
        }
        
        // Se não for um array, torna um array vazio
        if (!Array.isArray(ridesData)) {
          ridesData = [];
        }
        
        const myRides = ridesData.filter((r: Corridas) => {
          // O backend retorna 'motorista' não 'motorista_id'
          const rideMotoristaId = r.motorista || r.motorista_id;
          const rideMotoristaName = r.motorista_nome?.toLowerCase() || '';
          const currentUserName = user.nome?.toLowerCase() || '';
          const currentUserLogin = user.login?.toLowerCase() || '';
          const currentUserId = user.id_usuario; // Campo correto do backend

          const matches = (
            rideMotoristaId === currentUserId ||
            rideMotoristaName === currentUserName ||
            rideMotoristaName === currentUserLogin
          );

          return matches;
        });
        
        const activeRides = myRides.filter((r: Corridas) => r.status !== 'cancelada' && r.status !== 'concluida');

        setRides(activeRides);
        setHistorico(myRides);
      } catch (err: any) {
        console.error('Erro ao carregar corridas:', err);
        setError('Erro ao carregar dados. Tente novamente.');
      } finally {
        setLoading(false);
      }
    };

    loadRides();
  }, [user, userRole]);

  // Limpar seleção ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.agendamento-card') && !target.closest('.historico-card')) {
        setSelectedCardId(null);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleCardClick = (e: React.MouseEvent<HTMLDivElement>, cardId: string) => {
    // Evita seleção quando clica em botões
    const target = e.target as HTMLElement;
    if (target.closest('button')) {
      return;
    }
    // Toggle: se clicar no mesmo card, desseleciona; se for outro, seleciona
    setSelectedCardId(selectedCardId === cardId ? null : cardId);
  };

  // Buscar notificações
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const response = await api.get('/notificacoes/contagem/');
        if (response && response.data && typeof response.data.total_nao_lidas === 'number') {
          setNotificationCount(response.data.total_nao_lidas);
        }
      } catch (error: any) {
        // Silenciar erros de notificação para não quebrar a página
        if (error.response?.status !== 404) {
          console.error('Erro ao buscar notificações:', error);
        }
      }
    };

    // Busca inicial apenas se houver token
    const token = localStorage.getItem('token');
    if (token) {
      fetchNotifications();
      // Poll a cada 10 segundos
      const interval = setInterval(fetchNotifications, 10000);
      return () => clearInterval(interval);
    }
  }, []);

  // Aceitar corrida
  const handleAccept = async (rideId: number) => {
    try {
      await api.patch(`/corrida/${rideId}/`, { status: 'confirmada' });
      setRides(prev =>
        prev.map(r => {
          const currentRideId = r.id_corrida;
          return currentRideId === rideId ? { ...r, status: 'confirmada' } : r;
        })
      );
    } catch (err) {
      console.error('Erro ao aceitar corrida:', err);
      setError('Erro ao aceitar a corrida.');
    }
  };

  // Abrir modal de recusa
  const handleReject = (rideId: number) => {
    setRideToCancel(rideId);
    setShowCancelConfirmation(true);
  };

  // Confirmar recusa
  const confirmReject = async () => {
    if (!rideToCancel) return;
    try {
      await api.post(`/corrida/${rideToCancel}/recusar/`);
      
      // Update rides list and histórico with the response data
      setRides(prev => prev.filter(r => r.id_corrida !== rideToCancel));
      setHistorico(prev =>
        prev.map(r => {
          const currentRideId = r.id_corrida;
          return currentRideId === rideToCancel ? { ...r, status: 'recusada' } : r;
        })
      );
    } catch (err) {
      console.error('Erro ao recusar corrida:', err);
      setError('Erro ao recusar a corrida.');
    } finally {
      setShowCancelConfirmation(false);
      setRideToCancel(null);
    }
  };

  const cancelReject = () => {
    setShowCancelConfirmation(false);
    setRideToCancel(null);
  };

  // Toggle Ver mais/menos com animação para corridas
  const handleToggleRides = () => {
    if (mostrarTodasCorridas) {
      // Está expandido, vai colapsar - fade out
      setIsFadingOutRides(true);
      setTimeout(() => {
        setMostrarTodasCorridas(false);
        setIsFadingOutRides(false);
      }, 300);
    } else {
      // Está colapsado, vai expandir - fade in
      setMostrarTodasCorridas(true);
    }
  };

  // Toggle Ver mais/menos com animação para histórico
  const handleToggleHistory = () => {
    if (mostrarTodoHistorico) {
      // Está expandido, vai colapsar - fade out
      setIsFadingOutHistory(true);
      setTimeout(() => {
        setMostrarTodoHistorico(false);
        setIsFadingOutHistory(false);
      }, 300);
    } else {
      // Está colapsado, vai expandir - fade in
      setMostrarTodoHistorico(true);
    }
  };

  // Verificar se faltam 30 minutos ou menos para a corrida
  const isTimeToStart = (dataStr: string, horaStr: string): boolean => {
    try {
      const [ano, mes, dia] = dataStr.split('-').map(Number);
      const [hora, minuto] = horaStr.split(':').map(Number);
      
      // Criar data/hora da corrida
      const rideDateTime = new Date(ano, mes - 1, dia, hora, minuto, 0);
      const now = new Date();
      
      // Calcular diferença em minutos
      const diffMs = rideDateTime.getTime() - now.getTime();
      const diffMinutes = diffMs / (1000 * 60);
      
      // Mostrar botão se: faltam 30 minutos ou menos E corrida ainda não começou
      return diffMinutes <= 30
    } catch (err) {
      console.error('Erro ao calcular tempo:', err);
      return false;
    }
  };

  // Iniciar corrida (mudar para em_andamento)
  const handleStart = async (rideId: number) => {
    try {
      await api.patch(`/corrida/${rideId}/`, { status: 'em_andamento' });
      setRides(prev =>
        prev.map(r => {
          const currentRideId = r.id_corrida;
          return currentRideId === rideId ? { ...r, status: 'em_andamento' } : r;
        })
      );
    } catch (err) {
      console.error('Erro ao iniciar corrida:', err);
      setError('Erro ao iniciar a corrida.');
    }
  };

  // Concluir corrida
  const handleComplete = async (rideId: number) => {
    try {
      await api.post(`/corrida/${rideId}/complete_ride/`);
      
      // Move corrida para o histórico
      const completedRide = rides.find(r => r.id_corrida === rideId);
      if (completedRide) {
        setRides(prev => prev.filter(r => r.id_corrida !== rideId));
        setHistorico(prev => 
          [{...completedRide, status: 'concluida'}, ...prev]
        );
      }
    } catch (err) {
      console.error('Erro ao concluir corrida:', err);
      setError('Erro ao concluir a corrida.');
    }
  };

  // Logout
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  // Abrir notificações com animação
  const handleOpenNotifications = () => {
    setIsAnimatingOut(true);
    setTimeout(() => {
      navigate('/notificacoes');
    }, 300);
  };

  // Configurar opções de settings
  const settingsOptions = [
    {
      label: 'Dados Pessoais',
      action: () => navigate('/dados-pessoais'),
      icon: '👤'
    },
    {
      label: 'Alterar Senha',
      action: () => navigate('/alterar-senha'),
      icon: '🔐'
    },
    {
      label: 'Sair',
      action: handleLogout,
      icon: '🚪'
    }
  ];

  if (loading && !user) return <div>Carregando...</div>;
  if (!user || userRole !== 'motorista') return null;

  return (
    <div className="agendamento-container">
      <header className="header">
        <div className="blue-bar"></div>
      </header>

      <div className={`animated-wrapper ${isAnimatingOut ? 'slide-out-right' : 'slide-in-left'}`}>
        <div className="white-bar">
          <div className="header-logo-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            {/* Notificações à ESQUERDA */}
            <div 
              style={{ 
                position: 'relative',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                width: '40px',
                justifyContent: 'center',
                color: '#045ca4',
                marginRight: '24px'
              }}
              onClick={handleOpenNotifications}
            >
              <svg 
                width="24"
                height="24"
                viewBox="0 0 25 25"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M22.5 0H2.5C1.83696 0 1.20107 0.263392 0.732233 0.732233C0.263392 1.20107 0 1.83696 0 2.5V25L5 20H22.5C23.163 20 23.7989 19.7366 24.2678 19.2678C24.7366 18.7989 25 18.163 25 17.5V2.5C25 1.83696 24.7366 1.20107 24.2678 0.732233C23.7989 0.263392 23.163 0 22.5 0ZM7.5 15H5V12.5H7.5V15ZM7.5 11.25H5V8.75H7.5V11.25ZM7.5 7.5H5V5H7.5V7.5ZM16.25 15H10V12.5H16.25V15ZM20 11.25H10V8.75H20V11.25ZM20 7.5H10V5H20V7.5Z" fill="currentColor"/>
              </svg>
              {notificationCount > 0 && (
                <span 
                  style={{
                    position: 'absolute',
                    top: '-5px',
                    right: '-8px',
                    backgroundColor: '#FF3B30',
                    color: 'white',
                    borderRadius: '50%',
                    width: '20px',
                    height: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}
                >
                  {notificationCount > 99 ? '99+' : notificationCount}
                </span>
              )}
            </div>

            {/* Logo no CENTRO */}
            <img src={logoImg} alt="Logo" className="home-logo" style={{ width: '40%', height: 'auto' }} onClick={() => navigate("/home")} />

            {/* Engrenagem de configurações à DIREITA */}
            <div style={{ marginLeft: '24px' }}>
              <SettingsMenu options={settingsOptions} />
            </div>
          </div>
        </div>

        <main className="main-content">
        <div className="user-bar">
          <img
            src={user?.profile_photo || userImg}
            alt="Perfil"
            className="user-photo"
          />
          <div className="user-info">
            <span className="welcome">Bem-vindo!</span>
            <span className="username">
              {user ? (user.nome || user.login) : 'Motorista'}
            </span>
          </div>
          {/* Botões "Agendar" e "Verificar" removidos */}
        </div>

        <section className="proximos-agendamentos">
          <h2>Minhas Corridas</h2>
          {loading ? (
            <p>Carregando...</p>
          ) : error ? (
            <div className="error-message">{error}</div>
          ) : (
            <>
              <div className="agendamentos-list">
                {(() => {
                  const filteredRides = rides
                    .filter(ride => ['pendente', 'confirmada', 'reconfirmacao_necessaria', 'em_andamento'].includes(ride.status))
                    .sort(sortRides);
                  
                  // Empty state
                  if (filteredRides.length === 0) {
                    return (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '40px 20px',
                        backgroundColor: '#ffffff',
                        borderRadius: '8px',
                        border: '1px solid #e0e0e0',
                        minHeight: '200px',
                        flexDirection: 'column'
                      }}>
                        <img 
                          src={Campusico} 
                          alt="Nenhuma corrida" 
                          style={{
                            width: '60px',
                            height: '60px',
                            marginBottom: '20px',
                            opacity: 0.7,
                            filter: 'invert(0.5) brightness(0.8) sepia(1) hue-rotate(189deg) saturate(6)'
                          }}
                        />
                        <p style={{
                          fontSize: '16px',
                          color: '#666666',
                          margin: '0',
                          fontWeight: '500'
                        }}>
                          Nenhuma corrida Agendada
                        </p>
                      </div>
                    );
                  }
                  
                  const toRender = filteredRides.slice(0, mostrarTodasCorridas ? undefined : 2);
                  
                  return toRender.map(ride => {
                    const cardId = `ride-${ride.id_corrida}`;
                    return (
                      <div 
                        key={ride.id_corrida} 
                        className={`agendamento-card ${isFadingOutRides ? 'fade-out' : 'fade-in'} ${selectedCardId === cardId ? 'selected' : ''}`}
                        onClick={(e) => handleCardClick(e, cardId)}
                      >
                        <div className="card-content">
                          <div className={`card-left ${ride.status}`}>
                            <div className="building-icon">
                              <img src={Campusico} alt="Origem" className="campus-icon" />
                              <span className="campus-name">{ride.ponto_inicio}</span>
                            </div>
                          </div>
                          <div className="card-right">
                            <div className="local-details">
                              <h2 className="route-title">
                                {ride.ponto_inicio}
                                <svg 
                                  width="24" 
                                  height="16" 
                                  viewBox="0 0 24 16" 
                                  fill="none" 
                                  xmlns="http://www.w3.org/2000/svg"
                                  style={{ margin: '0 8px', display: 'inline-block', verticalAlign: 'middle' }}
                                >
                                  <path 
                                    d="M0 8H20M20 8L14 2M20 8L14 14" 
                                    stroke="currentColor" 
                                    strokeWidth="2.5" 
                                    strokeLinecap="round" 
                                    strokeLinejoin="round"
                                  />
                                </svg>
                                {ride.ponto_chegada}
                              </h2>
                            </div>
                            <div className="agendamento-info">
                              <div className="info-row">
                                <p className="info-item"> {new Date(ride.data_solicitacao).toLocaleDateString()}</p>
                                <p className="info-item"> {ride.horario_inicio}{ride.horario_retorno ? ` - ${ride.horario_retorno}` : ''}</p>
                              </div>
                              <p className="info-item info-veiculo">{ride.veiculo_nome ? ` ${ride.veiculo_nome}${ride.veiculo_placa ? ` (${ride.veiculo_placa})` : ''}` : ''}</p>
                              <p className="info-item info-solicitante">{ride.solicitante ? ` ${ride.solicitante}` : ''}</p>
                              <p className="info-destinos">{ride.destinos ? `${ride.destinos}` : ''}</p>
                            </div>
                            {ride.status === 'pendente' && (
                              <div className="ride-actions">
                                <button className="accept-button" onClick={() => handleAccept(ride.id_corrida || 0)}>
                                  Aceitar
                                </button>
                                <button className="reject-button" onClick={() => handleReject(ride.id_corrida || 0)}>
                                  Recusar
                                </button>
                              </div>
                            )}
                            {ride.status === 'reconfirmacao_necessaria' && (
                              <div className="ride-actions">
                                <button className="accept-button" onClick={() => handleAccept(ride.id_corrida || 0)}>
                                  Reconfirmar
                                </button>
                                <button className="reject-button" onClick={() => handleReject(ride.id_corrida || 0)}>
                                  Recusar
                                </button>
                              </div>
                            )}
                            {ride.status === 'confirmada' && ride.data_inicio && isTimeToStart(ride.data_inicio, ride.horario_inicio) && (
                              <div className="ride-actions">
                                <button className="start-button" onClick={() => handleStart(ride.id_corrida || 0)}>
                                  Iniciar Corrida
                                </button>
                              </div>
                            )}
                            {ride.status === 'em_andamento' && (
                              <div className="ride-actions">
                                <button className="complete-button" onClick={() => handleComplete(ride.id_corrida || 0)}>
                                  Concluir Corrida
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
              {rides.filter(ride => ['pendente', 'confirmada', 'reconfirmacao_necessaria', 'em_andamento'].includes(ride.status)).length > 2 && (
                <button className="ver-mais" onClick={handleToggleRides}>
                  {mostrarTodasCorridas ? 'Ver menos' : 'Ver mais'}
                </button>
              )}
            </>
          )}
        </section>

        <section className="historico">
          <h2>Histórico de corridas</h2>
          <div className="historico-list">
            {(() => {
              const filteredHistorico = historico
                .filter(ride => ride.status !== 'pendente')
                .sort((a, b) => new Date(b.data_solicitacao).getTime() - new Date(a.data_solicitacao).getTime());
              
              // Empty state
              if (filteredHistorico.length === 0) {
                return (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '40px 20px',
                    backgroundColor: '#ffffff',
                    borderRadius: '8px',
                    border: '1px solid #e0e0e0',
                    minHeight: '200px',
                    flexDirection: 'column'
                  }}>
                    <img 
                      src={Campusico} 
                      alt="Nenhuma corrida" 
                      style={{
                        width: '60px',
                        height: '60px',
                        marginBottom: '20px',
                        opacity: 0.7,
                        filter: 'invert(0.5) brightness(0.8) sepia(1) hue-rotate(189deg) saturate(6)'
                      }}
                    />
                    <p style={{
                      fontSize: '16px',
                      color: '#666666',
                      margin: '0',
                      fontWeight: '500'
                    }}>
                      Nenhuma Corrida no Histórico
                    </p>
                  </div>
                );
              }
              
              return (
                <>
                  {filteredHistorico
                  .slice(0, mostrarTodoHistorico ? undefined : 2)
                  .map(ride => {
                    const cardId = `historico-${ride.id_corrida}`;
                    return (
                    <div 
                      key={ride.id_corrida} 
                      className={`historico-card ${ride.status} ${isFadingOutHistory ? 'fade-out' : 'fade-in'} ${selectedCardId === cardId ? 'selected' : ''}`}
                      onClick={(e) => handleCardClick(e, cardId)}
                    >
                      <div className="historico-tags">
                        <TagStatus status={ride.status} entityType="corrida" />
                        <span className="tag tag-time">
                          {ride.horario_inicio}{ride.horario_retorno ? ` - ${ride.horario_retorno}` : ''}
                        </span>
                        <span className="tag tag-date">
                          {new Date(ride.data_solicitacao).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="historico-location">
                        <h2 className="route-title">
                          {ride.ponto_inicio}
                          <svg 
                            width="24" 
                            height="16" 
                            viewBox="0 0 24 16" 
                            fill="none" 
                            xmlns="http://www.w3.org/2000/svg"
                            style={{ margin: '0 8px', display: 'inline-block', verticalAlign: 'middle' }}
                          >
                            <path 
                              d="M0 8H20M20 8L14 2M20 8L14 14" 
                              stroke="currentColor" 
                              strokeWidth="2.5" 
                              strokeLinecap="round" 
                              strokeLinejoin="round"
                            />
                          </svg>
                          {ride.ponto_chegada}
                        </h2>
                      </div>
                      <div className="historico-details">
                        {ride.veiculo_nome && (
                          <p><strong>Veículo:</strong> {ride.veiculo_nome}</p>
                        )}
                        {ride.solicitante && (
                          <p><strong>Solicitante:</strong> {ride.solicitante}</p>
                        )}
                      </div>
                    </div>
                  );
                  })}
                </>
              );
            })()}
          </div>
          {historico.filter(ride => ride.status !== 'pendente').length > 2 && (
            <button className="ver-mais" onClick={handleToggleHistory}>
              {mostrarTodoHistorico ? 'Ver menos' : 'Ver mais'}
            </button>
          )}
        </section>
      </main>
      </div>

      {/* Modal de confirmação para recusa */}
      {showCancelConfirmation && (
        <div className="popup-overlay">
          <div className="popup-content">
            <p>Tem certeza que deseja recusar esta corrida?</p>
            <div className="popup-buttons">
              <button className="popup-button cancel" onClick={confirmReject}>
                Sim, Recusar
              </button>
              <button className="popup-button no" onClick={cancelReject}>
                Não
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Agendamento;
export { Agendamento }; // exportação nomeada para manter compatibilidade com rotas