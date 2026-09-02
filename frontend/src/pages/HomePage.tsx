import { useState, useEffect } from "react";
import SideBarMenu from "../components/common/SideBarMenu.tsx";
import BottomMenu from "../components/common/BottomMenu.tsx";
import Header from "../components/common/HeaderFULL.tsx";
import "../components/geral/GeralCSS.css";
import "./style.css";
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../api/axios.ts';

interface Stats {
  motoristas: {
    total: number;
    ativos: number;
    inativos: number;
  };
  veiculos: {
    total: number;
    disponiveis: number;
    indisponiveis: number;
  };
  corridas: {
    hoje: number;
    pendentes_hoje: number;
    em_andamento: number;
  };
  ultima_atualizacao: string;
}

const HomePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/login');
          return;
        }

        const response = await api.get('/home/stats/', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        setStats(response.data);
        setError(null);
      } catch (err: any) {
        console.error('Erro ao carregar estatísticas:', err);
        setError('Erro ao carregar estatísticas');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [navigate]);

  return (
    <div className="home-main-container">
      <Header title="Início" showLeft={false} showRight={true} />
      
      <div className="home-content-wrapper">
        <SideBarMenu />
        
        <main className="conteudo" key={location.pathname}>
          <div className="dashboard-container">
            <div className="dashboard-header">
              
            </div>
            
            <div className="dashboard-cards">
              <div className="metric-card">
                <div className="metric-value">{loading ? '...' : stats?.corridas.hoje || 0}</div>
                <div className="metric-label">Corridas de Hoje</div>
                <div className="metric-divider"></div>
              </div>

              <div className="metric-card">
                <div className="metric-value">{loading ? '...' : stats?.corridas.em_andamento || 0}</div>
                <div className="metric-label">Em Andamento</div>
                <div className="metric-divider"></div>
              </div>

              <div className="metric-card">
                <div className="metric-value">{loading ? '...' : stats?.motoristas.ativos || 0}</div>
                <div className="metric-label">Motoristas Ativos</div>
                <div className="metric-divider"></div>
              </div>

              <div className="metric-card">
                <div className="metric-value">{loading ? '...' : stats?.veiculos.disponiveis || 0}</div>
                <div className="metric-label">Veículos Disponíveis</div>
                <div className="metric-divider"></div>
              </div>
            </div>
            
            <div className="report-section">
              <div className="status" onClick={() => navigate("/gerar-relatorio")} style={{ cursor: 'pointer' }}>
                <div className="text-wrapper-4">Gerar Relatório</div>
              </div>
            </div>

            {error && (
              <div style={{ color: '#d32f2f', marginTop: '16px' }}>
                {error}
              </div>
            )}
          </div>
        </main>
      </div>

      <BottomMenu />
    </div>
  );
};

export default HomePage;