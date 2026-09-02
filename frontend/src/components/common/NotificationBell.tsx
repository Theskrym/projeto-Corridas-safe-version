import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios.ts';
import './NotificationBell.css';

interface Notification {
  id_notificacao: number;
  titulo: string;
  tipo: string;
  data_criacao: string;
}

interface NotificationBellProps {
  userId?: number;
}

const NotificationBell: React.FC<NotificationBellProps> = () => {
  const navigate = useNavigate();
  const [count, setCount] = useState<number>(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showDropdown, setShowDropdown] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  // Buscar notificações não lidas
  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await api.get('/notificacoes/contagem/', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      setCount(response.data.total_nao_lidas || 0);
      setNotifications(response.data.ultimas_nao_lidas || []);
    } catch (error) {
      console.error('Erro ao buscar notificações:', error);
    } finally {
      setLoading(false);
    }
  };

  // Polling a cada 10 segundos
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, []);

  // Marcar como lida
  const markAsRead = async (id: number) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      await api.post(`/notificacoes/${id}/marcar_como_lida/`, {}, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      setCount(prev => Math.max(0, prev - 1));
      setNotifications(prev => prev.filter(n => n.id_notificacao !== id));
    } catch (error) {
      console.error('Erro ao marcar como lida:', error);
    }
  };

  // Navegar para notificação
  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id_notificacao);
    // TODO: Navegar para a corrida relacionada
    // navigate(`/corridas/${notification.corrida_id}`);
    setShowDropdown(false);
  };

  // Navegar para página de notificações
  const handleBellClick = () => {
    setShowDropdown(!showDropdown);
  };

  if (loading) return null;

  return (
    <div className="notification-bell-container">
      <button 
        className="notification-bell" 
        onClick={handleBellClick}
        title="Notificações"
        aria-label="Notificações"
      >
        <svg 
          width="24" 
          height="24" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2"
        >
          <path 
            d="M18 8C18 6.4087 17.3679 4.88258 16.2426 3.75736C15.1174 2.63214 13.5913 2 12 2C10.4087 2 8.88258 2.63214 7.75736 3.75736C6.63214 4.88258 6 6.4087 6 8C6 11.1757 4.52926 13.9511 2 16V18H22V16C19.4707 13.9511 18 11.1757 18 8Z" 
            fill="currentColor"
            fillOpacity="0.2"
          />
          <path 
            d="M18 8C18 6.4087 17.3679 4.88258 16.2426 3.75736C15.1174 2.63214 13.5913 2 12 2C10.4087 2 8.88258 2.63214 7.75736 3.75736C6.63214 4.88258 6 6.4087 6 8C6 11.1757 4.52926 13.9511 2 16V18H22V16C19.4707 13.9511 18 11.1757 18 8Z" 
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path 
            d="M13.73 21C13.5542 21.3031 13.3031 21.5542 13 21.73C12.6969 21.5542 12.4458 21.3031 12.27 21C12.0942 21.3031 11.8431 21.5542 11.6673 21.73C11.4915 21.5542 11.2404 21.3031 11.0646 21" 
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {count > 0 && (
          <span className="notification-badge">{count}</span>
        )}
      </button>

      {/* Dropdown */}
      {showDropdown && (
        <div className="notification-dropdown">
          <div className="notification-dropdown-header">
            <h3>Notificações</h3>
            <span 
              className="mark-all-read"
              onClick={() => {
                // TODO: Marcar todas como lidas
                setCount(0);
                setNotifications([]);
              }}
            >
              Marcar todas como lidas
            </span>
          </div>
          
          <div className="notification-dropdown-list">
            {notifications.length === 0 ? (
              <div className="no-notifications">Nenhuma notificação nova</div>
            ) : (
              notifications.map((notification) => (
                <div 
                  key={notification.id_notificacao}
                  className={`notification-item ${notification.tipo}`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="notification-content">
                    <h4>{notification.titulo}</h4>
                    <span className="notification-time">
                      {new Date(notification.data_criacao).toLocaleString('pt-BR')}
                    </span>
                  </div>
                  <div 
                    className="mark-read"
                    onClick={(e) => {
                      e.stopPropagation();
                      markAsRead(notification.id_notificacao);
                    }}
                  >
                    ✅
                  </div>
                </div>
              ))
            )}
          </div>

          <div 
            style={{
              padding: '12px',
              borderTop: '1px solid #e0e0e0',
              textAlign: 'center',
              cursor: 'pointer'
            }}
            onClick={() => {
              navigate('/notificacoes');
              setShowDropdown(false);
            }}
          >
            <span style={{ color: '#045ca4', fontWeight: 500, fontSize: '14px' }}>
              Ver todas as notificações →
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
