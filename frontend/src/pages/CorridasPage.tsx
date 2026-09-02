import React, { useState, useEffect } from 'react';
import '../components/geral/GeralCSS.css';
import '../components/common/ListasCSS.css';
import '../components/corridas/CorridasCSS.css';

import BottomMenu from '../components/common/BottomMenu.tsx';
import SideBarMenu from '../components/common/SideBarMenu.tsx';
import Header from '../components/common/HeaderFULL.tsx';
import TagStatus from '../components/common/TagStatus.tsx';
import api from '../api/axios.ts';
import { cycleSort, sortItems, type SortState } from '../utils/tableSorting.ts';
import { useNavigate, useLocation } from 'react-router-dom';

type StatusOption = 'Todos' | 'pendente' | 'confirmada' | 'reconfirmacao_necessaria' | 'em_andamento' | 'concluida' | 'cancelada';
type CorridaSortKey = 'data' | 'rota' | 'status' | 'veiculo' | 'motorista';

// Interface Corrigida para Corrida (baseada no models.py)
interface Corrida {
  id_corrida: number;
  ponto_inicio: string;
  solicitante?: string;
  destinos?: string;
  servico?: string;
  ponto_chegada: string;
  horario_inicio?: string | null;
  horario_retorno?: string | null;
  paradas_intermediarias: Array<{nome: string, endereco: string, ordem: number}>;
  motorista: number | null;
  veiculo: number | null;
  status: string;
  data_solicitacao: string;
  data_inicio: string | null;
  data_conclusao: string | null;
  data_cancelamento: string | null;
  observacao: string | null;
  distancia_estimada_km: number | null;
  valor_estimado: number | null;
  // Campos relacionados (se a API retornar dados aninhados)
  motorista_nome?: string;
  veiculo_nome?: string;
  veiculo_placa?: string;
}

interface ApiResponse {
  data: Corrida[];
}

const StatusDropdown = ({ onStatusChange }: { onStatusChange: (status: StatusOption) => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState<StatusOption>('Todos');

  const options: StatusOption[] = ['Todos', 'pendente', 'confirmada', 'reconfirmacao_necessaria', 'em_andamento', 'concluida', 'cancelada'];

  // Mapear status para exibição amigável
  const getStatusLabel = (status: StatusOption): string => {
    const labels: Record<StatusOption, string> = {
      'Todos': 'Todos',
      'pendente': 'Pendente',
      'confirmada': 'Confirmada',
      'reconfirmacao_necessaria': 'Reconfirmação Necessária',
      'em_andamento': 'Em Andamento',
      'concluida': 'Concluída',
      'cancelada': 'Cancelada'
    };
    return labels[status];
  };

  const toggleDropdown = () => setIsOpen(!isOpen);

  const handleOptionClick = (option: StatusOption) => {
    setSelectedOption(option);
    setIsOpen(false);
    onStatusChange(option);
  };

  return (
    <div className={`status-dropdown ${isOpen ? 'open' : ''}`}>
      <div className="status-dropdown-header" role="button" tabIndex={0} aria-expanded={isOpen} onClick={toggleDropdown} onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          toggleDropdown();
        }
        if (event.key === 'Escape') setIsOpen(false);
      }}>
        <span className="status-dropdown-title">{getStatusLabel(selectedOption)}</span>
        <svg className="status-dropdown-icon" width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      
      {isOpen && (
        <div className="status-dropdown-options">
          {options.map((option) => (
            <div key={option} className="status-option" role="option" tabIndex={0} onClick={() => handleOptionClick(option)} onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') handleOptionClick(option);
            }}>
              {getStatusLabel(option)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const CorridasPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [corridas, setCorridas] = useState<Corrida[]>([]);
  const [filteredCorridas, setFilteredCorridas] = useState<Corrida[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<StatusOption>('Todos');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sort, setSort] = useState<SortState<CorridaSortKey> | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    const fetchCorridas = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await api.get<ApiResponse>('/corrida/', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        // Verificar estrutura da resposta
        const corridasData = response.data.data || response.data || [];
        
        setCorridas(corridasData);
        setFilteredCorridas(corridasData);
      } catch (error: any) {
        // Mensagem de erro mais específica
        let errorMessage = 'Erro ao carregar corridas';
        if (error.response) {
          if (error.response.status === 401) {
            errorMessage = 'Sessão expirada. Faça login novamente.';
            localStorage.removeItem('token');
            navigate('/login');
          } else if (error.response.status === 404) {
            errorMessage = 'Endpoint de corridas não encontrado. Verifique a URL da API.';
          } else if (error.response.data?.message) {
            errorMessage = error.response.data.message;
          }
        } else if (error.request) {
          errorMessage = 'Não foi possível conectar ao servidor. Verifique sua conexão.';
        }
        
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchCorridas();

    // Refetch dados quando a página ganha foco (volta da edição)
    const handleFocus = () => {
      fetchCorridas();
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [navigate]);

  useEffect(() => {
    let filtered = [...corridas];

    if (selectedStatus !== 'Todos') {
      filtered = filtered.filter(corrida => corrida.status === selectedStatus);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(corrida => 
        corrida.ponto_inicio?.toLowerCase().includes(term) ||
        corrida.ponto_chegada?.toLowerCase().includes(term) ||
        corrida.solicitante?.toLowerCase().includes(term) ||
        corrida.destinos?.toLowerCase().includes(term) ||
        corrida.servico?.toLowerCase().includes(term) ||
        corrida.veiculo_nome?.toLowerCase().includes(term) ||
        corrida.veiculo_placa?.toLowerCase().includes(term) ||
        corrida.motorista_nome?.toLowerCase().includes(term) ||
        corrida.id_corrida?.toString().includes(term)
      );
    }

    filtered = sortItems(filtered, sort, (corrida, key) => {
      if (key === 'data') return new Date(corrida.data_solicitacao);
      if (key === 'rota') return `${corrida.ponto_inicio || ''} ${corrida.ponto_chegada || corrida.destinos || ''}`;
      if (key === 'status') return corrida.status;
      if (key === 'veiculo') return `${corrida.veiculo_nome || ''} ${corrida.veiculo_placa || ''}`;
      return corrida.motorista_nome || `Motorista ID: ${corrida.motorista || ''}`;
    });

    setFilteredCorridas(filtered);
  }, [selectedStatus, searchTerm, corridas, sort]);

  const handleStatusChange = (status: StatusOption) => setSelectedStatus(status);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value);
  const handleSort = (key: CorridaSortKey) => setSort(current => cycleSort(current, key));
  const sortIndicator = (key: CorridaSortKey) => sort?.key === key ? (sort.direction === 'asc' ? ' ↑' : ' ↓') : '';

  const handleAddCorrida = () => navigate('/corridas/novo');
  const handleEditCorrida = (id: number) => navigate(`/corridas/editar/${id}`);

  // Função para formatar data
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '—';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="home-main-container">
      <Header title="Corridas" showLeft={false} showRight={true} />

      <div className="home-content-wrapper">
        <SideBarMenu />
        
        <main className="conteudo" key={location.pathname}>
          <div className="corridas-container list-page-shell">
            <div className="list-page-content">
              <div className="corridas-header">
                <div className="status-section">
                  <label className="status-label">Status</label>
                  <StatusDropdown onStatusChange={handleStatusChange} />
                </div>

                <button className="add-button" onClick={handleAddCorrida} title="Adicionar Corrida">
                  +
                </button>
              </div>

              <div className="search-section">
                <label className="search-label">Buscar Corrida</label>
                <div className="search-input-wrapper">
                  <input
                    type="text"
                    className="search-input"
                    placeholder="Digite o ponto de início, chegada ou veículo"
                    value={searchTerm}
                    onChange={handleSearchChange}
                  />
                  <svg className="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path 
                      d="M21 21L16.514 16.506L21 21ZM19 10.5C19 15.194 15.194 19 10.5 19C5.806 19 2 15.194 2 10.5C2 5.806 5.806 2 10.5 2C15.194 2 19 5.806 19 10.5Z" 
                      stroke="currentColor" 
                      strokeWidth="2" 
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
              </div>

              <div className="table-container">
                {loading ? (
                  <div className="loading-message">
                    <div className="spinner"></div>
                    <p>Carregando Corridas...</p>
                  </div>
                ) : error ? (
                  <div className="error-message">
                    <p>{error}</p>
                    <button onClick={() => window.location.reload()}>Tentar novamente</button>
                  </div>
                ) : (
                  <>
                    <div className="table-header corridas-table-header">
                      <button className="table-sort-button col-data" onClick={() => handleSort('data')}>Data | Hora{sortIndicator('data')}</button>
                      <button className="table-sort-button col-rota" onClick={() => handleSort('rota')}>Rota{sortIndicator('rota')}</button>
                      <button className="table-sort-button col-status" onClick={() => handleSort('status')}>Status{sortIndicator('status')}</button>
                      <button className="table-sort-button col-recursos" onClick={() => handleSort('veiculo')}>Veículo{sortIndicator('veiculo')}</button>
                      <button className="table-sort-button col-recursos" onClick={() => handleSort('motorista')}>Motorista{sortIndicator('motorista')}</button>
                      <span className="col-acoes">Ações</span>
                    </div>

                    {filteredCorridas.length > 0 ? (
                      <div className="table-body">
                        {filteredCorridas.map((corrida, index) => (
                          <div 
                            key={corrida.id_corrida} 
                            className={`table-row corridas-table-row ${index % 2 === 0 ? 'even' : 'odd'}`}
                          >
                            <span className="table-cell col-data">
                              {formatDate(corrida.data_solicitacao)}
                            </span>
                            <span className="table-cell col-rota" title={`${corrida.ponto_inicio} → ${corrida.ponto_chegada || corrida.destinos || '—'}`}>
                              {`${corrida.ponto_inicio?.substring(0, 20) || '—'}... → ${(corrida.ponto_chegada || corrida.destinos)?.substring(0, 20) || '—'}...`}
                            </span>
                            <span className="table-cell col-status">
                              <TagStatus status={corrida.status} entityType="corrida" />
                            </span>
                            <span className="table-cell col-recursos">
                              {corrida.veiculo_nome && corrida.veiculo_placa 
                                ? `${corrida.veiculo_nome} | ${corrida.veiculo_placa}`
                                : corrida.veiculo_placa || corrida.veiculo_nome || `Veículo ID: ${corrida.veiculo || '—'}`}
                            </span>
                            <span className="table-cell col-recursos">
                              {corrida.motorista_nome || `Motorista ID: ${corrida.motorista || '—'}`}
                            </span>
                            <button 
                              className="table-cell col-acoes edit-button"
                              onClick={() => handleEditCorrida(corrida.id_corrida)}
                              title="Editar Corrida"
                              style={{ border: 'none', background: 'none', cursor: 'pointer' }}
                            >
                              ✏️
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="table-empty">
                        <p>Nenhuma corrida encontrada.</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>

      <BottomMenu />
    </div>
  );
};

export default CorridasPage;