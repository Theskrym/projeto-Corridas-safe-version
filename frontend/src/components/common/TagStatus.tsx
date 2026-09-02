import React from 'react';
import '../../pages/Agendamento/Agendamento.css';

interface TagStatusProps {
  status: string;
  entityType: 'veiculo' | 'corrida' | 'motorista';
}

const TagStatus: React.FC<TagStatusProps> = ({ status, entityType }) => {
  // Garantir que status é uma string
  if (!status) {
    return <span className="tag-status default">—</span>;
  }

  const statusString = String(status);

  // Mapear status do backend para nomes de classe CSS
  const getStatusClass = (status: string, entityType: string): string => {
    const normalizedStatus = status.toLowerCase();
    
    if (entityType === 'corrida') {
      const corrida_map: Record<string, string> = {
        'pendente': 'pendente',
        'confirmada': 'confirmado',
        'reconfirmacao_necessaria': 'pendente',
        'em_andamento': 'em_andamento',
        'concluida': 'concluido',
        'cancelada': 'cancelado',
        'recusada': 'cancelado'
      };
      return corrida_map[normalizedStatus] || 'default';
    } else if (entityType === 'veiculo') {
      const veiculo_map: Record<string, string> = {
        'disponivel': 'disponivel',
        'indisponivel': 'indisponivel',
        'manutencao': 'manutencao'
      };
      return veiculo_map[normalizedStatus] || 'default';
    } else if (entityType === 'motorista') {
      const motorista_map: Record<string, string> = {
        'ativo': 'ativo',
        'inativo': 'inativo'
      };
      return motorista_map[normalizedStatus] || 'default';
    }
    return 'default';
  };

  const statusClass = getStatusClass(statusString, entityType);
  
  // Mapear para textos de exibição
  const getDisplayText = (status: string, entityType: string): string => {
    const normalizedStatus = status.toLowerCase();
    
    if (entityType === 'corrida') {
      const labels: Record<string, string> = {
        'pendente': 'Pendente',
        'confirmada': 'Confirmada',
        'reconfirmacao_necessaria': 'Reconfirmação Necessária',
        'em_andamento': 'Em Andamento',
        'concluida': 'Concluída',
        'cancelada': 'Cancelada',
        'recusada': 'Recusada'
      };
      return labels[normalizedStatus] || status;
    } else if (entityType === 'veiculo') {
      const labels: Record<string, string> = {
        'disponivel': 'Disponível',
        'indisponivel': 'Indisponível',
        'manutencao': 'Em Manutenção'
      };
      return labels[normalizedStatus] || status;
    } else if (entityType === 'motorista') {
      const labels: Record<string, string> = {
        'ativo': 'Ativo',
        'inativo': 'Inativo'
      };
      return labels[normalizedStatus] || status;
    }
    return status;
  };

  return (
    <span className={`tag-status ${statusClass}`}>
      {getDisplayText(statusString, entityType)}
    </span>
  );
};

export default TagStatus;
