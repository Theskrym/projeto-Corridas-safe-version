import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import '../components/geral/GeralCSS.css';
import Header from '../components/common/HeaderFULL.tsx';
import BottomMenu from '../components/common/BottomMenu.tsx';
import SideBarMenu from '../components/common/SideBarMenu.tsx';
import emailOpen from '../assets/email-open.svg';
import emailClosed from '../assets/email-closed.svg';
import api from '../api/axios.ts';

interface Notificacao {
  id_notificacao: number;
  titulo: string;
  mensagem: string;
  data_criacao: string;
  lida: boolean;
  tipo: string;
}

const NotificacoesPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [filtro, setFiltro] = useState<'todas' | 'lidas' | 'nao-lidas'>('nao-lidas');
  const [loading, setLoading] = useState(true);
  const [hoverFiltro, setHoverFiltro] = useState<string | null>(null);
  const [animatingFiltro, setAnimatingFiltro] = useState<string | null>(null);
  const [modoSelecao, setModoSelecao] = useState(false);
  const [selecionadas, setSelecionadas] = useState<Set<number>>(new Set());
  const [deletando, setDeletando] = useState(false);
  const [marcandoLidas, setMarcandoLidas] = useState(false);
  const [canScroll, setCanScroll] = useState(false);
  const [showTopShadow, setShowTopShadow] = useState(false);
  const [showBottomShadow, setShowBottomShadow] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  // Detectar se é motorista
  const storedUser = localStorage.getItem('user');
  const currentUser = storedUser ? JSON.parse(storedUser) : null;
  const isMotorista = currentUser && (
    currentUser.nivel_acesso === 'motorista' ||
    currentUser.nivel_acesso === 'driver' ||
    currentUser.nivel_acesso === 3
  );

  // Busca notificações
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    const fetchNotificacoes = async () => {
      try {
        const response = await api.get('/notificacoes/', {
          headers: { Authorization: `Bearer ${token}` }
        });

        const data = Array.isArray(response.data) ? response.data : response.data.results || [];
        setNotificacoes(data);
      } catch (error) {
        console.error('Erro ao buscar notificações:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchNotificacoes();
  }, [navigate]);

  const handleAbrirNotificacao = (notif: Notificacao) => {
    navigate('/notificacao', { 
      state: {
        id_notificacao: notif.id_notificacao,
        titulo: notif.titulo,
        mensagem: notif.mensagem,
        data_criacao: notif.data_criacao,
        lida: notif.lida,
        tipo: notif.tipo
      }
    });
  };

  const handleFiltroClick = (novoFiltro: 'todas' | 'lidas' | 'nao-lidas') => {
    setAnimatingFiltro(novoFiltro);
    setFiltro(novoFiltro);
    setTimeout(() => setAnimatingFiltro(null), 300);
  };

  const toggleSelecao = (id: number) => {
    const novaSelecao = new Set(selecionadas);
    if (novaSelecao.has(id)) {
      novaSelecao.delete(id);
    } else {
      novaSelecao.add(id);
    }
    setSelecionadas(novaSelecao);
  };

  const cancelarModoSelecao = () => {
    setModoSelecao(false);
    setSelecionadas(new Set());
  };

  const filteredNotificacoes = notificacoes.filter(notificacao => {
    if (filtro === 'todas') return true;
    if (filtro === 'lidas') return notificacao.lida;
    return !notificacao.lida;
  });

  const updateScrollShadows = () => {
    const element = listRef.current;
    if (!element) return;

    const hasScrollableContent = element.scrollHeight > element.clientHeight + 1;
    const atTop = element.scrollTop <= 1;
    const atBottom = element.scrollTop + element.clientHeight >= element.scrollHeight - 1;

    setCanScroll(hasScrollableContent);
    setShowTopShadow(hasScrollableContent && !atTop);
    setShowBottomShadow(hasScrollableContent && !atBottom);
  };

  useEffect(() => {
    updateScrollShadows();

    const element = listRef.current;
    if (!element) return;

    element.addEventListener('scroll', updateScrollShadows, { passive: true });
    window.addEventListener('resize', updateScrollShadows);

    return () => {
      element.removeEventListener('scroll', updateScrollShadows);
      window.removeEventListener('resize', updateScrollShadows);
    };
  }, [loading, filteredNotificacoes.length, filtro, modoSelecao]);

  const handleSelecionarTodas = () => {
    const todasIds = new Set(filteredNotificacoes.map(n => n.id_notificacao));
    if (selecionadas.size === filteredNotificacoes.length && filteredNotificacoes.length > 0) {
      setSelecionadas(new Set());
    } else {
      setSelecionadas(todasIds);
    }
  };

  const handleDeletarMultiplas = async () => {
    try {
      setDeletando(true);
      const token = localStorage.getItem('token');
      if (!token) return;

      const idsArray = Array.from(selecionadas);
      await api.post('/notificacoes/ocultar_multiplas/', 
        { ids: idsArray },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setNotificacoes(prev => prev.filter(n => !selecionadas.has(n.id_notificacao)));
      cancelarModoSelecao();
      alert('Notificações deletadas com sucesso!');
    } catch (error) {
      console.error('Erro ao deletar notificações:', error);
      alert('Erro ao deletar notificações');
    } finally {
      setDeletando(false);
    }
  };


  const handleMarcarTodasComoLidas = async () => {
    try {
      setMarcandoLidas(true);
      const token = localStorage.getItem('token');
      if (!token) return;

      const idsArray = notificacoes.filter(n => !n.lida).map(n => n.id_notificacao);
      if (idsArray.length === 0) return;

      await api.post('/notificacoes/marcar_multiplas/',
        { ids: idsArray, lida: true },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setNotificacoes(prev => prev.map(n => ({ ...n, lida: true })));
    } catch (error) {
      console.error('Erro ao marcar notificações como lidas:', error);
      alert('Erro ao marcar notificações como lidas');
    } finally {
      setMarcandoLidas(false);
    }
  };

  const handleMarcarTodasComoNaoLidas = async () => {
    try {
      setMarcandoLidas(true);
      const token = localStorage.getItem('token');
      if (!token) return;

      const idsArray = notificacoes.filter(n => n.lida).map(n => n.id_notificacao);
      if (idsArray.length === 0) return;

      await api.post('/notificacoes/marcar_multiplas/',
        { ids: idsArray, lida: false },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setNotificacoes(prev => prev.map(n => ({ ...n, lida: false })));
    } catch (error) {
      console.error('Erro ao marcar notificações como não lidas:', error);
      alert('Erro ao marcar notificações como não lidas');
    } finally {
      setMarcandoLidas(false);
    }
  };

  return (
    <div className="home-main-container notificacoes-page">
      <Header title="Notificações" showLeft={isMotorista} showRight={true} onLeftClick={() => navigate('/agendamento')} />

      <div className="home-content-wrapper">
        {!isMotorista && <SideBarMenu />}

        <main className="conteudo" key={location.pathname} style={isMotorista ? { marginLeft: 0 } : undefined}>
          <div style={{ maxWidth: '900px', margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', minHeight: 'calc(100dvh - 220px)' }}>
            {/* Filtros */}
            <div className="notification-filters" style={{ display: 'flex', gap: '12px', marginBottom: '20px', borderBottom: '1px solid #e0e0e0', padding: '0 0 15px 0', minHeight: '44px', alignItems: 'center' }}>
              <button
                onClick={() => handleFiltroClick('nao-lidas')}
                onMouseEnter={() => setHoverFiltro('nao-lidas')}
                onMouseLeave={() => setHoverFiltro(null)}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  minHeight: '44px',
                  border: 'none',
                  borderBottom: hoverFiltro === 'nao-lidas' ? '2px solid rgba(0, 105, 173, 0.5)' : filtro === 'nao-lidas' ? '2px solid #0069AD' : '2px solid transparent',
                  background: 'none',
                  cursor: 'pointer',
                  color: '#999',
                  fontWeight: filtro === 'nao-lidas' ? 'bold' : 'normal',
                  fontSize: '14px',
                  textAlign: 'center',
                  whiteSpace: 'nowrap',
                  transform: animatingFiltro === 'nao-lidas' ? 'scaleX(1.1)' : 'scaleX(1)',
                  transformOrigin: 'center',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <img src={emailClosed} alt="Não Lidas" style={{ width: '14px', marginRight: '4px', verticalAlign: 'middle' }} />
                Não Lidas ({notificacoes.filter(n => !n.lida).length})
              </button>
              <button
                onClick={() => handleFiltroClick('lidas')}
                onMouseEnter={() => setHoverFiltro('lidas')}
                onMouseLeave={() => setHoverFiltro(null)}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  minHeight: '44px',
                  border: 'none',
                  borderBottom: hoverFiltro === 'lidas' ? '2px solid rgba(0, 105, 173, 0.5)' : filtro === 'lidas' ? '2px solid #0069AD' : '2px solid transparent',
                  background: 'none',
                  cursor: 'pointer',
                  color: '#999',
                  fontWeight: filtro === 'lidas' ? 'bold' : 'normal',
                  fontSize: '14px',
                  textAlign: 'center',
                  whiteSpace: 'nowrap',
                  transform: animatingFiltro === 'lidas' ? 'scaleX(1.1)' : 'scaleX(1)',
                  transformOrigin: 'center',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <img src={emailOpen} alt="Lidas" style={{ width: '14px', marginRight: '4px', verticalAlign: 'middle' }} />
                Lidas ({notificacoes.filter(n => n.lida).length})
              </button>
              <button
                onClick={() => handleFiltroClick('todas')}
                onMouseEnter={() => setHoverFiltro('todas')}
                onMouseLeave={() => setHoverFiltro(null)}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  minHeight: '44px',
                  border: 'none',
                  borderBottom: hoverFiltro === 'todas' ? '2px solid rgba(0, 105, 173, 0.5)' : filtro === 'todas' ? '2px solid #0069AD' : '2px solid transparent',
                  background: 'none',
                  cursor: 'pointer',
                  color: '#999',
                  fontWeight: filtro === 'todas' ? 'bold' : 'normal',
                  fontSize: '14px',
                  textAlign: 'center',
                  whiteSpace: 'nowrap',
                  transform: animatingFiltro === 'todas' ? 'scaleX(1.1)' : 'scaleX(1)',
                  transformOrigin: 'center',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                Todas ({notificacoes.length})
              </button>
            </div>

            {/* Lista de Notificações */}
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>Carregando...</div>
            ) : filteredNotificacoes.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                Nenhuma notificação {filtro !== 'todas' ? filtro === 'lidas' ? 'lida' : 'não lida' : ''}
              </div>
            ) : (
              <div style={{ position: 'relative', flex: '1 1 auto', minHeight: 0 }}>
                <div
                  ref={listRef}
                  onScroll={updateScrollShadows}
                  style={{ display: 'flex', flexDirection: 'column', gap: '12px', height: '100%', overflowY: 'auto', overflowX: 'hidden', paddingRight: '8px' }}
                >
                  {filteredNotificacoes.map(notif => {
                    const isSelected = selecionadas.has(notif.id_notificacao);
                    const isSelecionavel = modoSelecao;
                    
                    return (
                      <div
                        key={notif.id_notificacao}
                        onClick={() => {
                          if (isSelecionavel) {
                            toggleSelecao(notif.id_notificacao);
                          } else {
                            handleAbrirNotificacao(notif);
                          }
                        }}
                        style={{
                          padding: '14px',
                          border: '1px solid #e0e0e0',
                          borderRadius: '6px',
                          backgroundColor: isSelected ? 'rgba(255, 107, 107, 0.3)' : (notif.lida ? '#fafafa' : '#f0f8ff'),
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          borderLeft: (isSelected && isSelecionavel) ? '4px solid #ff6b6b' : '4px solid #0069AD'
                        }}
                        onMouseEnter={(e) => {
                          if (isSelecionavel) {
                            e.currentTarget.style.backgroundColor = 'rgba(255, 107, 107, 0.3)';
                            e.currentTarget.style.boxShadow = '0 2px 8px rgba(255,107,107,0.2)';
                          } else {
                            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,105,173,0.1)';
                            e.currentTarget.style.opacity = '0.8';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (isSelecionavel) {
                            if (!isSelected) {
                              e.currentTarget.style.backgroundColor = notif.lida ? '#fafafa' : '#f0f8ff';
                            }
                            e.currentTarget.style.boxShadow = 'none';
                          } else {
                            e.currentTarget.style.boxShadow = 'none';
                            e.currentTarget.style.opacity = '1';
                          }
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div style={{ flex: 1 }}>
                            <h3 style={{
                              margin: '0 0 6px 0',
                              fontSize: '15px',
                              fontWeight: 'bold',
                              color: isSelected ? '#ff6b6b' : '#0069AD'
                            }}>
                              {notif.titulo}
                            </h3>
                            <p style={{
                              margin: '0 0 6px 0',
                              fontSize: '13px',
                              color: '#333',
                              lineHeight: '1.4'
                            }}>
                              {notif.mensagem}
                            </p>
                            <small style={{ color: '#999', fontSize: '11px' }}>
                              {new Date(notif.data_criacao).toLocaleString('pt-BR')}
                            </small>
                          </div>
                          <div style={{ marginLeft: '12px', flexShrink: 0 }}>
                            {isSelecionavel ? (
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSelecao(notif.id_notificacao)}
                                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                              />
                            ) : (
                              <img
                                src={notif.lida ? emailOpen : emailClosed}
                                alt={notif.lida ? 'Lida' : 'Não lida'}
                                style={{ width: '18px', height: '18px' }}
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '10px',
                    pointerEvents: 'none',
                    background: 'linear-gradient(to bottom, rgba(0, 0, 0, 0.20), rgba(0, 0, 0, 0.05) 60%, transparent)',
                    opacity: showTopShadow && canScroll ? 1 : 0,
                    transition: 'opacity 0.25s ease-in-out',
                    zIndex: 2
                  }}
                />

                <div
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: '10px',
                    pointerEvents: 'none',
                    background: 'linear-gradient(to top, rgba(0, 0, 0, 0.20), rgba(0, 0, 0, 0.05) 60%, transparent)',
                    opacity: showBottomShadow && canScroll ? 1 : 0,
                    transition: 'opacity 0.25s ease-in-out',
                    zIndex: 2
                  }}
                />
              </div>
            )}

            {/* Botões de ação */}
            <div style={{ marginTop: 'auto', paddingBottom: '1px', width: '100%' }}>
              {!modoSelecao ? (
                <div className="notification-actions">
                  {filtro === 'lidas' ? (
                    <button
                      onClick={handleMarcarTodasComoNaoLidas}
                      className="secondary-btn secondary-btn-confirm"
                      disabled={marcandoLidas || notificacoes.every(n => !n.lida)}
                    >
                      <strong>{marcandoLidas ? 'Marcando...' : 'Marcar Todas como Não Lidas'}</strong>
                    </button>
                  ) : (
                    <button
                      onClick={handleMarcarTodasComoLidas}
                      className="secondary-btn secondary-btn-confirm"
                      disabled={marcandoLidas || notificacoes.every(n => n.lida)}
                    >
                      <strong>{marcandoLidas ? 'Marcando...' : 'Marcar Todas como Lidas'}</strong>
                    </button>
                  )}
                  <button
                    onClick={() => setModoSelecao(true)}
                    className="secondary-btn secondary-btn-delete"
                  >
                    <strong>Excluir Notificações</strong>
                  </button>
                </div>
              ) : (
                <div className="secondary-buttons-container notification-selection-actions">
                  <button
                    onClick={cancelarModoSelecao}
                    className="secondary-btn secondary-btn-cancel"
                    disabled={deletando}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSelecionarTodas}
                    className="secondary-btn secondary-btn-confirm"
                    style={{ color: '#333', backgroundColor: '#4da6ff' }}
                    disabled={deletando}
                  >
                    {selecionadas.size === filteredNotificacoes.length && filteredNotificacoes.length > 0 ? 'Desmarcar Todas' : 'Selecionar Todas'}
                  </button>
                  <button
                    onClick={handleDeletarMultiplas}
                    className="secondary-btn secondary-btn-confirm"
                    disabled={selecionadas.size === 0 || deletando}
                  >
                    {deletando ? 'Deletando...' : `✓ Confirmar (${selecionadas.size})`}
                  </button>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {!isMotorista && <BottomMenu />}
    </div>
  );
};

export default NotificacoesPage;
