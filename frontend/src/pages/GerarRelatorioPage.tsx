import React, { useState, useEffect } from "react";
import BottomMenu from '../components/common/BottomMenu.tsx';
import SideBarMenu from '../components/common/SideBarMenu.tsx';
import Header from '../components/common/HeaderFULL.tsx';
import TagStatus from '../components/common/TagStatus.tsx';
import '../components/common/ListasCSS.css';
import '../components/geral/GeralCSS.css';
import '../components/corridas/CorridasCSS.css';
import api from '../api/axios.ts';
import { cycleSort, sortItems, type SortState } from '../utils/tableSorting.ts';
import { useNavigate, useLocation } from 'react-router-dom';

// Interface para os dados do relatório
interface Motorista {
  id_usuario: number;
  nome: string;
  telefone: string;
  is_active: boolean;
  corridas_count: number;
  corridas_concluidas: number;
  corridas_canceladas: number;
}

interface Corrida {
  id_corrida: number;
  ponto_inicio: string;
  ponto_chegada: string;
  solicitante?: string;
  destinos?: string;
  paradas_intermediarias?: Array<{nome: string, endereco: string, ordem: number}>;
  motorista?: number;
  motorista_nome?: string;
  status: string;
  data_solicitacao: string;
  data_inicio?: string;
}

interface RelatorioData {
  periodo: {
    data_inicio: string;
    data_fim: string;
  };
  resumo: {
    total_corridas: number;
    corridas_concluidas: number;
    corridas_canceladas: number;
    corridas_recusadas: number;
    corridas_pendentes: number;
    distancia_total_km: number;
  };
  motoristas?: Motorista[];
  corridas?: Corrida[];
}

type RelatorioSortKey = 'motorista' | 'solicitante' | 'status' | 'destino' | 'paradas' | 'data';

// Componente principal
const GerarRelatorioPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [relatorioData, setRelatorioData] = useState<RelatorioData | null>(null);
  const [motoristas, setMotoristas] = useState<Motorista[]>([]);
  const [corridas, setCorridas] = useState<Corrida[]>([]);
  const [filteredMotoristas, setFilteredMotoristas] = useState<Motorista[]>([]);
  const [filteredCorridas, setFilteredCorridas] = useState<Corrida[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('Todos');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dataInicio, setDataInicio] = useState<string>('');
  const [dataFim, setDataFim] = useState<string>('');
  const [sort, setSort] = useState<SortState<RelatorioSortKey> | null>(null);

  // Buscar dados da API
  const fetchRelatorio = async (inicio: string = '', fim: string = '') => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      // Se datas inválidas, não busca
      if (!((inicio === '' && fim === '') || (inicio && fim && inicio <= fim))) {
        setError('Data de início não pode ser maior que data de fim');
        setLoading(false);
        return;
      }

      const params = new URLSearchParams();
      if (inicio) params.append('data_inicio', inicio);
      if (fim) params.append('data_fim', fim);

      const response = await api.get(`/relatorios/?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      setRelatorioData(response.data);
      // Priorizar corridas, se não tiver, usar motoristas
      if (response.data.corridas) {
        setCorridas(response.data.corridas || []);
        setFilteredCorridas(response.data.corridas || []);
      } else {
        setMotoristas(response.data.motoristas || []);
        setFilteredMotoristas(response.data.motoristas || []);
      }
      setError(null);
    } catch (err: any) {
      console.error('Erro ao carregar relatório:', err);
      setError('Erro ao carregar relatório');
    } finally {
      setLoading(false);
    }
  };

  // Buscar relatório na primeira vez que carrega a página
  useEffect(() => {
    fetchRelatorio();
  }, [navigate]);

  // Buscar relatório quando datas mudarem
  useEffect(() => {
    if (dataInicio !== '' || dataFim !== '') {
      setLoading(true);
      fetchRelatorio(dataInicio, dataFim);
    }
  }, [dataInicio, dataFim]);

  // Filtrar motoristas/corridas com base no termo de busca e status
  const filterMotoristas = (motoristasData?: Motorista[], search?: string, status?: string) => {
    let filtered = [...(motoristasData || motoristas)];

    const currentStatus = status || statusFilter;
    if (currentStatus !== 'Todos') {
      const isActive = currentStatus === 'Ativo';
      filtered = filtered.filter(m => m.is_active === isActive);
    }

    const currentSearch = search || searchTerm;
    if (currentSearch) {
      const term = currentSearch.toLowerCase();
      filtered = filtered.filter(m => 
        m.nome.toLowerCase().includes(term) || 
        m.telefone?.toLowerCase().includes(term)
      );
    }

    filtered = sortItems(filtered, sort, (motorista, key) => {
      if (key === 'motorista') return motorista.nome;
      if (key === 'solicitante') return motorista.telefone;
      if (key === 'status') return motorista.is_active ? 'Ativo' : 'Inativo';
      return '';
    });

    setFilteredMotoristas(filtered);
  };

  const filterCorridas = (corridasData?: Corrida[], search?: string, status?: string) => {
    let filtered = [...(corridasData || corridas)];

    const currentStatus = status || statusFilter;
    if (currentStatus !== 'Todos') {
      filtered = filtered.filter(c => c.status === currentStatus);
    }

    const currentSearch = search || searchTerm;
    if (currentSearch) {
      const term = currentSearch.toLowerCase();
      filtered = filtered.filter(c => 
        c.ponto_inicio?.toLowerCase().includes(term) || 
        c.ponto_chegada?.toLowerCase().includes(term) ||
        c.solicitante?.toLowerCase().includes(term) ||
        c.motorista_nome?.toLowerCase().includes(term)
      );
    }

    filtered = sortItems(filtered, sort, (corrida, key) => {
      if (key === 'motorista') return corrida.motorista_nome || `ID: ${corrida.motorista || ''}`;
      if (key === 'solicitante') return corrida.solicitante;
      if (key === 'status') return corrida.status;
      if (key === 'destino') return `${corrida.ponto_inicio || ''} ${corrida.ponto_chegada || corrida.destinos || ''}`;
      if (key === 'paradas') return corrida.paradas_intermediarias?.map(parada => parada.nome).join(', ');
      return new Date(corrida.data_solicitacao);
    });

    setFilteredCorridas(filtered);
  };

  // Atualizar filtros
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    if (corridas.length > 0) {
      filterCorridas(corridas, value, statusFilter);
    } else {
      filterMotoristas(motoristas, value, statusFilter);
    }
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setStatusFilter(value);
    if (corridas.length > 0) {
      filterCorridas(corridas, searchTerm, value);
    } else {
      filterMotoristas(motoristas, searchTerm, value);
    }
  };

  useEffect(() => {
    if (corridas.length > 0) {
      filterCorridas(corridas, searchTerm, statusFilter);
    } else if (motoristas.length > 0) {
      filterMotoristas(motoristas, searchTerm, statusFilter);
    }
  }, [sort, corridas, motoristas]);

  const handleSort = (key: RelatorioSortKey) => setSort(current => cycleSort(current, key));
  const sortIndicator = (key: RelatorioSortKey) => sort?.key === key ? (sort.direction === 'asc' ? ' ↑' : ' ↓') : '';

  // Limpar filtros de data
  const handleClearDateFilters = () => {
    setDataInicio('');
    setDataFim('');
    setLoading(true);
    fetchRelatorio('', '');
  };

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

  // Fazer download do relatório em Excel
  const handleDownloadReport = async () => {
    try {
      // Validar datas antes do download
      if (!((dataInicio === '' && dataFim === '') || (dataInicio && dataFim && dataInicio <= dataFim))) {
        alert('Data de início não pode ser maior que data de fim');
        return;
      }

      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      const params = new URLSearchParams();
      if (dataInicio) params.append('data_inicio', dataInicio);
      if (dataFim) params.append('data_fim', dataFim);

      const response = await api.get(`/relatorios/download/?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` },
        responseType: 'blob' // Importante: receber como blob para download
      });

      // Criar URL do blob e fazer download
      const url = window.URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      
      // Gerar nome do arquivo usando as datas da página
      let filename = 'relatorio_corridas.xlsx';
      
      if (dataInicio && dataFim) {
        // Converter para Date para comparar e ordenar
        const dataInicioDate = new Date(dataInicio);
        const dataFimDate = new Date(dataFim);
        const minData = dataInicioDate < dataFimDate ? dataInicioDate : dataFimDate;
        const maxData = dataInicioDate < dataFimDate ? dataFimDate : dataInicioDate;
        
        // Formatar datas
        const minDataStr = minData.toLocaleDateString('pt-BR');
        const maxDataStr = maxData.toLocaleDateString('pt-BR');
        
        filename = `relatorio_corridas ${minDataStr} - ${maxDataStr}.xlsx`;
      } else if (dataInicio || dataFim) {
        // Se apenas uma data foi preenchida
        const dataStr = (dataInicio || dataFim);
        const date = new Date(dataStr);
        const dateFormatted = date.toLocaleDateString('pt-BR');
        filename = `relatorio_corridas ${dateFormatted}.xlsx`;
      } else {
        // Se nenhuma data foi preenchida, usar hoje
        const hoje = new Date().toLocaleDateString('pt-BR');
        filename = `relatorio_corridas ${hoje}.xlsx`;
      }
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Erro ao fazer download:', err);
      alert('Erro ao gerar arquivo de download');
    }
  };

  return (
    <div className="home-main-container">
      <Header title="Gerar Relatório" showLeft={false} showRight={true} />
      
      <div className="home-content-wrapper">
        <SideBarMenu />
        
        <main className="conteudo relatorio-page" key={location.pathname}>
          <div className="corridas-container list-page-shell">
            <div className="list-page-content">
              <div className="relatorio-header">
                <div className="relatorio-filtros-grid">
                <div className="relatorio-filtro">
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>Buscar Motorista ou Veículo</label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <input
                      type="text"
                      className="search-input"
                      placeholder="Digite para buscar"
                      value={searchTerm}
                      onChange={handleSearchChange}
                    />
                    <svg className="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ position: 'absolute', right: '8px' }}>
                      <path 
                        d="M21 21L16.514 16.506L21 21ZM19 10.5C19 15.194 15.194 19 10.5 19C5.806 19 2 15.194 2 10.5C2 5.806 5.806 2 10.5 2C15.194 2 19 5.806 19 10.5Z" 
                        stroke="currentColor" 
                        strokeWidth="2" 
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                </div>

                <div className="relatorio-filtro">
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>Status</label>
                  <select 
                    className="secondary-dropdown"
                    value={statusFilter}
                    onChange={handleStatusChange}
                  >
                    <option value="Todos">Todos</option>
                    <option value="Ativo">Ativo</option>
                    <option value="Inativo">Inativo</option>
                  </select>
                </div>

                <div className="relatorio-filtro">
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>Data Início</label>
                  <input
                    type="date"
                    className="secondary-textfield"
                    value={dataInicio}
                    onChange={(e) => setDataInicio(e.target.value)}
                    style={{ width: '100%' }}
                  />
                </div>

                <div className="relatorio-filtro">
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>Data Fim</label>
                  <input
                    type="date"
                    className="secondary-textfield"
                    value={dataFim}
                    onChange={(e) => setDataFim(e.target.value)}
                    style={{ width: '100%' }}
                  />
                </div>

                <button 
                  className="secondary-btn secondary-btn-cancel relatorio-limpar"
                  onClick={handleClearDateFilters}
                >
                  Limpar
                </button>
                </div>
              </div>

              <div className="table-container relatorio-table-container">
              {loading && (
                <div style={{ textAlign: 'center', padding: '20px' }}>
                  <div style={{ fontSize: '18px' }}>Carregando relatório...</div>
                </div>
              )}

              {error && (
                <div style={{ color: '#d32f2f', padding: '20px' }}>
                  {error}
                </div>
              )}

              {!loading && relatorioData && (
                <>
                  <div className="table-header relatorio-table-header">
                    <button className="table-sort-button table-cell col-nome" onClick={() => handleSort('motorista')}>MOTORISTA{sortIndicator('motorista')}</button>
                    <button className="table-sort-button table-cell col-nome" onClick={() => handleSort('solicitante')}>SOLICITANTE{sortIndicator('solicitante')}</button>
                    <button className="table-sort-button table-cell col-status" onClick={() => handleSort('status')}>STATUS{sortIndicator('status')}</button>
                    <button className="table-sort-button table-cell col-rota" onClick={() => handleSort('destino')}>DESTINO{sortIndicator('destino')}</button>
                    <button className="table-sort-button table-cell col-nome" onClick={() => handleSort('paradas')}>PARADAS{sortIndicator('paradas')}</button>
                    <button className="table-sort-button table-cell col-data" onClick={() => handleSort('data')}>DATA | HORA{sortIndicator('data')}</button>
                  </div>

                  <div className="table-body">
                    {corridas.length > 0 ? (
                      filteredCorridas.length > 0 ? (
                        filteredCorridas.map((corrida, index) => {
                          // Formatar paradas
                          let paradasStr = "—";
                          if (corrida.paradas_intermediarias && corrida.paradas_intermediarias.length > 0) {
                            paradasStr = corrida.paradas_intermediarias.map(p => p.nome).join(", ");
                            if (paradasStr.length > 30) paradasStr = paradasStr.substring(0, 27) + "...";
                          }

                          return (
                            <div 
                              key={corrida.id_corrida} 
                              className={`table-row relatorio-table-row ${index % 2 === 0 ? 'even' : 'odd'}`}
                            >
                              <span className="table-cell col-nome">{corrida.motorista_nome || `ID: ${corrida.motorista || '—'}`}</span>
                              <span className="table-cell col-nome">{corrida.solicitante || '—'}</span>
                              <span className="table-cell col-status">
                                <TagStatus status={corrida.status} entityType="corrida" />
                              </span>
                              <span className="table-cell col-rota" title={`${corrida.ponto_inicio} → ${corrida.ponto_chegada || '—'}`}>
                                {`${corrida.ponto_inicio?.substring(0, 15) || '—'}... → ${(corrida.ponto_chegada)?.substring(0, 15) || '—'}...`}
                              </span>
                              <span className="table-cell col-nome" title={paradasStr === "—" ? "" : paradasStr}>
                                {paradasStr}
                              </span>
                              <span className="table-cell col-data">
                                {formatDate(corrida.data_solicitacao)}
                              </span>
                            </div>
                          );
                        })
                      ) : (
                        <div className="table-empty">
                          <p>Nenhuma corrida encontrada para este período.</p>
                        </div>
                      )
                    ) : (
                      filteredMotoristas.length > 0 ? (
                        filteredMotoristas.map((motorista, index) => (
                          <div 
                            key={motorista.id_usuario} 
                            className={`table-row relatorio-table-row ${index % 2 === 0 ? 'even' : 'odd'}`}
                          >
                            <span className="table-cell col-nome">{motorista.nome}</span>
                            <span className="table-cell col-telefone">—</span>
                            <span className="table-cell col-status">
                              <TagStatus status={motorista.is_active ? 'Ativo' : 'Inativo'} entityType="motorista" />
                            </span>
                            <span className="table-cell col-rota">—</span>
                            <span className="table-cell col-nome">—</span>
                            <span className="table-cell col-data">—</span>
                          </div>
                        ))
                      ) : (
                        <div className="table-empty">
                          <p>Nenhum motorista encontrado para este período.</p>
                        </div>
                      )
                    )}
                  </div>
                </>
              )}
            </div>

              <div className="secondary-buttons-container">
                <button 
                  className="secondary-btn secondary-btn-confirm"
                  onClick={handleDownloadReport}
                >
                  Gerar Relatório
                </button>
                <button 
                  className="secondary-btn"
                  onClick={() => navigate('/status-colors')}
                  style={{ marginLeft: '10px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                  aria-label="Opções"
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                  >
                    <path
                      d="M10.3246 4.31731C10.751 2.5609 13.249 2.56 13.6754 4.31731C13.9508 5.45193 15.2507 5.99038 16.2478 5.38285C17.7913 4.44239 19.5576 6.2087 18.6172 7.75218C18.0096 8.74925 18.5481 10.0492 19.6827 10.3246C21.4391 10.751 21.4391 13.249 19.6827 13.6754C18.5481 13.9508 18.0096 15.2507 18.6172 16.2478C19.5576 17.7913 17.7913 19.5576 16.2478 18.6172C15.2507 18.0096 13.9508 18.5481 13.6754 19.6827C13.249 21.4391 10.751 21.4391 10.3246 19.6827C10.0492 18.5481 8.74926 18.0096 7.75219 18.6172C6.2087 19.5576 4.44239 17.7913 5.38285 16.2478C5.99038 15.2507 5.45193 13.9508 4.31731 13.6754C2.5609 13.249 2.5609 10.751 4.31731 10.3246C5.45193 10.0492 5.99037 8.74926 5.38285 7.75218C4.44239 6.2087 6.2087 4.44239 7.75219 5.38285C8.74926 5.99037 10.0492 5.45193 10.3246 4.31731Z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M15 12C15 13.6569 13.6569 15 12 15C10.3431 15 9 13.6569 9 12C9 10.3431 10.3431 9 12 9C13.6569 9 15 10.3431 15 12Z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span>Opções</span>
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>

      <BottomMenu />
    </div>
  );
};

export default GerarRelatorioPage;