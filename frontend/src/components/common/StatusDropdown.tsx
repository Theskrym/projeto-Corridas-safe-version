import React from 'react';

type StatusOption = 'Todos' | 'Ativo' | 'Inativo';

interface StatusDropdownProps {
  onStatusChange: (status: StatusOption) => void;
}

const StatusDropdown: React.FC<StatusDropdownProps> = ({ onStatusChange }) => (
  <select
    className="status-dropdown-header"
    onChange={e => onStatusChange(e.target.value as StatusOption)}
    defaultValue="Todos"
  >
    <option value="Todos">Todos</option>
    <option value="Ativo">Ativo</option>
    <option value="Inativo">Inativo</option>
  </select>
);

export default StatusDropdown;