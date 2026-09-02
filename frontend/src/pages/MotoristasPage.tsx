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

interface Motorista {
  id_usuario: number;
  nome: string;
  is_active: boolean;
  numero_corridas?: number;
}

type StatusOption = 'Todos' | 'Ativo' | 'Inativo';
type MotoristaSortKey = 'nome' | 'corridas' | 'status';

const StatusDropdown = ({ onStatusChange }: { onStatusChange: (status: StatusOption) => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState<StatusOption>('Todos');

  const options: StatusOption[] = ['Todos', 'Ativo', 'Inativo'];

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

const MotoristasPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [motoristas, setMotoristas] = useState<Motorista[]>([]);
  const [filteredMotoristas, setFilteredMotoristas] = useState<Motorista[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<StatusOption>('Todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [sort, setSort] = useState<SortState<MotoristaSortKey> | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    const fetchMotoristas = async () => {
      try {
        setLoading(true);
        const response = await api.get('/motoristas/', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        setMotoristas(response.data.data);
        setFilteredMotoristas(response.data.data);
      } catch (error: any) {
        setError('Erro ao carregar motoristas');
      } finally {
        setLoading(false);
      }
    };
    fetchMotoristas();
  }, [navigate]);

  useEffect(() => {
    let filtered = [...motoristas];
    if (selectedStatus !== 'Todos') {
      const isActive = selectedStatus === 'Ativo';
      filtered = filtered.filter(m => m.is_active === isActive);
    }
    if (searchTerm) {
      filtered = filtered.filter(m =>
        m.nome.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    filtered = sortItems(filtered, sort, (motorista, key) => {
      if (key === 'nome') return motorista.nome;
      if (key === 'corridas') return motorista.numero_corridas || 0;
      return motorista.is_active ? 'Ativo' : 'Inativo';
    });
    setFilteredMotoristas(filtered);
  }, [selectedStatus, searchTerm, motoristas, sort]);

  const handleEditMotorista = (id: number) => navigate(`/motoristas/editar/${id}`);
  const handleAddMotorista = () => navigate('/motoristas/novo');
  const handleStatusChange = (status: StatusOption) => setSelectedStatus(status);
  const handleSort = (key: MotoristaSortKey) => setSort(current => cycleSort(current, key));
  const sortIndicator = (key: MotoristaSortKey) => sort?.key === key ? (sort.direction === 'asc' ? ' ↑' : ' ↓') : '';

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setSearchTerm(e.target.value);

  return (
    <div className="home-main-container">
      <Header title="Motoristas" showLeft={false} showRight={true} />
      <div className="home-content-wrapper">
        <SideBarMenu />
        <main className="conteudo" key={location.pathname}>
          <div className="motoristas-container list-page-shell">
            <div className="list-page-content">
              <div className="veiculos-header">
                <div className="status-section">
                  <label className="status-label">Status</label>
                  <StatusDropdown onStatusChange={handleStatusChange} />
                </div>

                <button className="add-button" onClick={handleAddMotorista} title="Adicionar Motorista">
                  +
                </button>
              </div>

              <div className="search-section" style={{ maxWidth: '100%'}}>
                <label className="search-label">Buscar Motorista</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                  <div className="search-input-wrapper" style={{ maxWidth: '400px' }}>
                    <input
                      type="text"
                      className="search-input"
                      placeholder="Digite o nome"
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
                    <p>Carregando Motoristas...</p>
                  </div>
                ) : error ? (
                  <div className="error-message">
                    <p>{error}</p>
                    <button onClick={() => window.location.reload()}>Tentar novamente</button>
                  </div>
                ) : (
                  <>
                    <div className="table-header motoristas-table-header">
                      <button className="table-sort-button col-nome" onClick={() => handleSort('nome')}>Nome{sortIndicator('nome')}</button>
                      <button className="table-sort-button col-corridas" onClick={() => handleSort('corridas')}>Corridas{sortIndicator('corridas')}</button>
                      <button className="table-sort-button col-status" onClick={() => handleSort('status')}>Status{sortIndicator('status')}</button>
                      <span className="col-acoes">Ações</span>
                    </div>
                    {filteredMotoristas.length > 0 ? (
                      <div className="table-body">
                        {filteredMotoristas.map((motorista, index) => (
                          <div
                            key={motorista.id_usuario}
                            className={`table-row motoristas-table-row ${index % 2 === 0 ? 'even' : 'odd'}`}
                          >
                            <span className="table-cell col-nome">{motorista.nome}</span>
                            <span className="table-cell col-corridas">{motorista.numero_corridas || 0}</span>
                            <span className="table-cell col-status">
                              <TagStatus status={motorista.is_active ? 'Ativo' : 'Inativo'} entityType="motorista" />
                            </span>
                            <button
                              className="table-cell col-acoes edit-button"
                              onClick={() => handleEditMotorista(motorista.id_usuario)}
                              title="Editar Motorista"
                              style={{ border: 'none', background: 'none', cursor: 'pointer' }}
                            >
                              ✏️
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="table-empty">
                        <p>Nenhum Motorista encontrado.</p>
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

export default MotoristasPage;