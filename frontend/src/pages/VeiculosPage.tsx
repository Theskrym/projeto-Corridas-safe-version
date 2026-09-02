import React, { useState, useEffect } from 'react';
import '../components/geral/GeralCSS.css';
import '../components/common/ListasCSS.css';
import BottomMenu from '../components/common/BottomMenu.tsx';
import SideBarMenu from '../components/common/SideBarMenu.tsx';
import Header from '../components/common/HeaderFULL.tsx';
import TagStatus from '../components/common/TagStatus.tsx';
import api from '../api/axios.ts';
import { cycleSort, sortItems, type SortState } from '../utils/tableSorting.ts';
import { useNavigate, useLocation } from 'react-router-dom';

type StatusOption = 'Todos' | 'Ativos' | 'Inativos' | 'Em manutenção' | 'Disponíveis';
type VeiculoSortKey = 'nome' | 'placa' | 'corridas' | 'status';

interface Veiculo {
  id_veiculo: number;
  nome: string;
  placa: string;
  status: string;
  numero_corridas?: number;
}

interface ApiResponse {
  data: Veiculo[];
}

const StatusDropdown = ({ onStatusChange }: { onStatusChange: (status: StatusOption) => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState<StatusOption>('Todos');

  const options: StatusOption[] = ['Todos', 'Ativos', 'Inativos', 'Em manutenção', 'Disponíveis'];

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
        <span className="status-dropdown-title">{selectedOption}</span>
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
              {option}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const VeiculosPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [filteredVeiculos, setFilteredVeiculos] = useState<Veiculo[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<StatusOption>('Todos');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sort, setSort] = useState<SortState<VeiculoSortKey> | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    const fetchVeiculos = async () => {
      try {
        setLoading(true);
        const response = await api.get<ApiResponse>('/veiculos/', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
      setVeiculos(response.data.data);
      setFilteredVeiculos(response.data.data);
    } catch (error: any) {
        console.error('Erro ao buscar veículos:', error);
        setError(error.response?.data?.message || 'Erro ao carregar veículos');
      } finally {
        setLoading(false);
      }
    };

    fetchVeiculos();
  }, [navigate]);

  useEffect(() => {
    let filtered = [...veiculos];

    if (selectedStatus !== 'Todos') {
      filtered = filtered.filter(veiculo => veiculo.status === selectedStatus);
    }

    if (searchTerm) {
      filtered = filtered.filter(veiculo => 
        veiculo.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        veiculo.placa.toLowerCase().includes(searchTerm.toLowerCase()) 
      );
    }

    filtered = sortItems(filtered, sort, (veiculo, key) => {
      if (key === 'nome') return veiculo.nome;
      if (key === 'placa') return veiculo.placa;
      if (key === 'corridas') return veiculo.numero_corridas || 0;
      return veiculo.status;
    });

    setFilteredVeiculos(filtered);
  }, [selectedStatus, searchTerm, veiculos, sort]);

  const handleStatusChange = (status: StatusOption) => setSelectedStatus(status);

  const handleSort = (key: VeiculoSortKey) => setSort(current => cycleSort(current, key));
  const sortIndicator = (key: VeiculoSortKey) => sort?.key === key ? (sort.direction === 'asc' ? ' ↑' : ' ↓') : '';

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value);

  const handleAddVeiculo = () => navigate('/veiculos/novo');
  const handleEditVeiculo = (id: number) => navigate(`/veiculos/editar/${id}`);

  return (
      <div className="home-main-container">
      <Header title="Veículos" showLeft={false} showRight={true} />

      <div className="home-content-wrapper">
        <SideBarMenu />
        
        <main className="conteudo" key={location.pathname}>
          <div className="veiculos-container list-page-shell">
            <div className="list-page-content">
              <div className="veiculos-header">
                <div className="status-section">
                  <label className="status-label">Status</label>
                  <StatusDropdown onStatusChange={handleStatusChange} />
                </div>

                <button className="add-button" onClick={handleAddVeiculo} title="Adicionar veículo">
                  +
                </button>
              </div>

              <div className="search-section" style={{ maxWidth: '100%'}}>
                <label className="search-label">Buscar Veículo</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                  <div className="search-input-wrapper" style={{ maxWidth: '400px' }}>
                    <input
                      type="text"
                      className="search-input"
                      placeholder="Digite o nome, placa ou modelo"
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
              </div>

              <div className="table-container">
                {loading ? (
                  <div className="loading-message">
                    <div className="spinner"></div>
                    <p>Carregando veículos...</p>
                  </div>
                ) : error ? (
                  <div className="error-message">
                    <p>{error}</p>
                    <button onClick={() => window.location.reload()}>Tentar novamente</button>
                  </div>
                ) : (
                  <>
                    <div className="table-header veiculos-table-header">
                      <button className="table-sort-button col-nome" onClick={() => handleSort('nome')}>Nome{sortIndicator('nome')}</button>
                      <button className="table-sort-button col-placa" onClick={() => handleSort('placa')}>Placa{sortIndicator('placa')}</button>
                      <button className="table-sort-button col-corridas" onClick={() => handleSort('corridas')}>Corridas{sortIndicator('corridas')}</button>
                      <button className="table-sort-button col-status" onClick={() => handleSort('status')}>Status{sortIndicator('status')}</button>
                      <span className="col-acoes">Ações</span>
                    </div>

                    {filteredVeiculos.length > 0 ? (
                      <div className="table-body">
                        {filteredVeiculos.map((veiculo, index) => (
                          <div 
                            key={veiculo.id_veiculo} 
                            className={`table-row veiculos-table-row ${index % 2 === 0 ? 'even' : 'odd'}`}
                          >
                            <span className="table-cell col-nome">{veiculo.nome}</span>
                            <span className="table-cell col-placa">{veiculo.placa}</span>
                            <span className="table-cell col-corridas">{veiculo.numero_corridas || 0}</span>
                            <span className="table-cell col-status">
                              <TagStatus status={veiculo.status} entityType="veiculo" />
                            </span>
                            <button
                              className="table-cell col-acoes edit-button"
                              onClick={() => handleEditVeiculo(veiculo.id_veiculo)}
                              title="Editar veículo"
                              style={{ border: 'none', background: 'none', cursor: 'pointer' }}
                            >
                              ✏️
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="table-empty">
                        <p>Nenhum veículo encontrado.</p>
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

export default VeiculosPage;