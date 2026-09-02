import { useLocation, useNavigate } from 'react-router-dom';
import '../../components/home/HomeCSS.css';

const items = [
  { name: 'Início', path: '/home', icon: 'home' },
  { name: 'Corridas', path: '/corridas', icon: 'corrida' },
  { name: 'Motoristas', path: '/motoristas', icon: 'motorista' },
  { name: 'Veículos', path: '/veiculos', icon: 'veiculo' },
  { name: 'Notificações', path: '/notificacoes', icon: 'notifica' },
];

const BottomMenu = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="menu-inferior">
      {items.map((item) => {
        const isActive = location.pathname === item.path;

        return (
          <button
            key={item.name}
            className={`bottom-menu-button ${isActive ? 'active' : ''}`}
            onClick={() => navigate(item.path)}
            type="button"
          >
            <img
              src={`/assets/${item.icon}.svg`}
              alt={item.name}
              className="bottom-menu-icon"
            />
            <span className="bottom-menu-label">{item.name}</span>
          </button>
        );
      })}
    </div>
  );
};

export default BottomMenu;
