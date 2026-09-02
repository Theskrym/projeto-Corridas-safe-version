/**
 * Form Configurations
 * Define a estrutura de cada tipo de formulário (Corrida, Motorista, Veículo)
 * Reutilizável para validação, rendering e transformação de dados
 */

export interface FormFieldConfig {
  name: string;
  label: string;
  type: 'text' | 'email' | 'date' | 'time' | 'textarea' | 'select' | 'phone' | 'number';
  placeholder?: string;
  required?: boolean;
  disabled?: (isNew: boolean) => boolean;
  options?: Array<{ value: string | number; label: string }>;
  validation?: (value: any) => string | null;
  gridColumn?: string; // Controlar layout do grid (ex: '1 / -1' para ocupar tudo)
  defaultValue?: any;
}

export interface EntityFormConfig {
  endpoint: string;
  title: (isNew: boolean) => string;
  fields: FormFieldConfig[];
  transformData?: (apiData: any) => any;
  transformPayload?: (formData: any) => any;
  statusOptions?: Array<{ value: string; label: string }>;
}

// ===== CORRIDA FORM =====
// ===== CORRIDA FORM =====
// ===== CORRIDA FORM =====
export const corridaFormConfig: EntityFormConfig = {
  endpoint: '/corrida/',
  title: (isNew) => isNew ? 'Cadastrar Corrida' : 'Editar Corrida',
  transformData: (apiData) => {
    // Extrair IDs de motorista e veículo, se forem objetos ou primitivos
    const motoristaId = typeof apiData.motorista === 'object' 
      ? apiData.motorista?.id_usuario 
      : apiData.motorista;
    const veiculoId = typeof apiData.veiculo === 'object' 
      ? apiData.veiculo?.id_veiculo 
      : apiData.veiculo;
    
    return {
      ponto_inicio: apiData.ponto_inicio || "",
      ponto_chegada: apiData.ponto_chegada || "",
      solicitante: apiData.solicitante || "",
      destinos: apiData.destinos || "",
      servico: apiData.servico || "",
      horario_inicio: apiData.horario_inicio || "",
      data_inicio: apiData.data_inicio?.split('T')[0] || "",
      observacao: apiData.observacao || "",
      motorista: motoristaId || "",
      veiculo: veiculoId || "",
      status: apiData.status || 'pendente'
    };
  },
  transformPayload: (formData) => {
    const paradas_intermediarias: any[] = [];
    const destinos = formData.destinos?.trim() || "";
    
    if (destinos) {
      const paradas_nomes = destinos
        .split(',')
        .map((p: string) => p.trim())
        .filter((p: string) => p.length > 0);
      
      paradas_nomes.forEach((nome: string, index: number) => {
        paradas_intermediarias.push({
          nome: nome,
          endereco: nome,
          ordem: index
        });
      });
    }

    return {
      ponto_inicio: formData.ponto_inicio?.trim() || "",
      ponto_chegada: formData.ponto_chegada?.trim() || "",
      data_inicio: formData.data_inicio || "",
      solicitante: formData.solicitante?.trim() || null,
      destinos: destinos || null,
      paradas_intermediarias: paradas_intermediarias,
      servico: formData.servico?.trim() || null,
      horario_inicio: formData.horario_inicio || null,
      horario_retorno: null,
      observacao: formData.observacao?.trim() || null,
      motorista: formData.motorista ? parseInt(formData.motorista) : null,
      veiculo: formData.veiculo ? parseInt(formData.veiculo) : null,
      status: formData.isCancelada ? "cancelada" : "pendente"
    };
  },
  fields: [
    {
      name: 'ponto_inicio',
      label: 'Ponto de Embarque',
      type: 'text',
      placeholder: 'Ponto de Embarque',
      required: true,
      validation: (val) => !val?.trim() ? 'Ponto de Embarque é obrigatório' : null
    },
    {
      name: 'ponto_chegada',
      label: 'Ponto de Desembarque',
      type: 'text',
      placeholder: 'Ponto de Desembarque',
      required: true,
      validation: (val) => !val?.trim() ? 'Ponto de Desembarque é obrigatório' : null
    },
    {
      name: 'data_inicio',
      label: 'Data de Início',
      type: 'date',
      required: true,
      validation: (val) => !val ? 'Data de Início é obrigatória' : null
    },
    {
      name: 'solicitante',
      label: 'Solicitante',
      type: 'text',
      placeholder: 'Nome do solicitante',
      required: false
    },
    {
      name: 'motorista',
      label: 'Motorista',
      type: 'select',
      required: false
    },
    {
      name: 'veiculo',
      label: 'Veículo',
      type: 'select',
      required: false
    },
    {
      name: 'horario_inicio',
      label: 'Horário de Início',
      type: 'time',
      required: false
    },
    {
      name: 'servico',
      label: 'Serviço',
      type: 'text',
      placeholder: 'Tipo de serviço',
      required: false
    },
    {
      name: 'destinos',
      label: 'Paradas',
      type: 'text',
      placeholder: 'Parada 1, Parada 2, ...',
      required: false
    },
    {
      name: 'observacao',
      label: 'Observação',
      type: 'textarea',
      placeholder: 'Observações adicionais',
      required: false,
      gridColumn: '1 / -1'
    }
  ]
};


// ===== MOTORISTA FORM =====
// ===== MOTORISTA FORM =====
// ===== MOTORISTA FORM =====


const formatarTelefone = (telefone: string): string => {
  const apenasNumeros = telefone.replace(/\D/g, '');
  if (apenasNumeros.length === 11) {
    return `+55 (${apenasNumeros.slice(0, 2)}) ${apenasNumeros.slice(2, 7)}-${apenasNumeros.slice(7)}`;
  }
  return telefone;
};

export const motoristaFormConfig: EntityFormConfig = {
  endpoint: '/motoristas/',
  title: (isNew) => isNew ? 'Cadastrar Motorista' : 'Editar Motorista',
  transformData: (apiData) => ({
    nome: apiData.nome || "",
    matricula: apiData.matricula || "",
    email_corporativo: apiData.email || "",
    telefone: apiData.telefone || "",
    nivel_acesso: apiData.nivel_acesso != null ? String(apiData.nivel_acesso) : '3',
    status: (apiData.status || 'ativo').toLowerCase()
  }),
  transformPayload: (formData) => {
    const payload: any = {
      nome: formData.nome?.trim() || "",
      email: formData.email_corporativo?.trim() || "",
      matricula: formData.matricula?.trim() || "",
    };
    if (formData.telefone?.trim()) payload.telefone = formatarTelefone(formData.telefone);
    payload.nivel_acesso = formData.nivel_acesso ? Number(formData.nivel_acesso) : 3;
    if (formData.status) payload.status = formData.status;
    return payload;
  },
  fields: [
    {
      name: 'nome',
      label: 'Nome',
      type: 'text',
      placeholder: 'Digite o nome do motorista',
      required: true,
      validation: (val) => !val?.trim() ? 'Nome é obrigatório' : null
    },
    {
      name: 'matricula',
      label: 'Matrícula',
      type: 'number',
      placeholder: '123456',
      required: true,
      validation: (val) => {
        if (!val) return 'Matrícula é obrigatória';
        const strVal = String(val).trim();
        if (!/^\d{6}$/.test(strVal)) return 'Matrícula deve conter exatamente 6 dígitos';
        return null;
      }
    },
    {
      name: 'email_corporativo',
      label: 'Email Corporativo',
      type: 'email',
      placeholder: 'usuario@cesmac.edu.br',
      required: true,
      validation: (val) => {
        if (!val?.trim()) return 'Email corporativo é obrigatório';
        if (!val.toLowerCase().includes('@cesmac.edu.br')) {
          return 'Email corporativo deve ser de @cesmac.edu.br';
        }
        return null;
      }
    },
    {
      name: 'telefone',
      label: 'Telefone',
      type: 'phone',
      placeholder: '(85) 99999-9999',
      required: false
    },
    {
      name: 'nivel_acesso',
      label: 'Tipo de Usuário',
      type: 'select',
      required: false,
      defaultValue: '3',
      options: [
        { value: '1', label: 'Administrador' },
        { value: '2', label: 'Gerente' },
        { value: '3', label: 'Motorista' },
        { value: '4', label: 'Operador' },
        { value: '5', label: 'Visualizador' }
      ]
    },
    {
      name: 'status',
      label: 'Status',
      type: 'select',
      required: false,
      disabled: (isNew) => isNew,
      options: [
        { value: 'ativo', label: 'Ativo' },
        { value: 'inativo', label: 'Inativo' }
      ]
    }
  ]
};

// ===== VEÍCULO FORM =====
// ===== VEÍCULO FORM =====
// ===== VEÍCULO FORM =====
export const veiculoFormConfig: EntityFormConfig = {
  endpoint: '/veiculos/',
  title: (isNew) => isNew ? 'Cadastrar Veículo' : 'Editar Veículo',
  transformData: (apiData) => ({
    nome: apiData.nome || "",
    placa: apiData.placa || "",
    status: apiData.status || 'disponivel'
  }),
  transformPayload: (formData) => {
    const payload: any = {
      nome: formData.nome?.trim() || "",
      placa: formData.placa?.trim().toUpperCase() || "",
    };
    if (formData.status) payload.status = formData.status;
    return payload;
  },
  fields: [
    {
      name: 'nome',
      label: 'Nome do Veículo',
      type: 'text',
      placeholder: 'Ex: Corolla, HB20, etc',
      required: true,
      validation: (val) => !val?.trim() ? 'Nome do veículo é obrigatório' : null
    },
    {
      name: 'placa',
      label: 'Placa',
      type: 'text',
      placeholder: 'ABC1234',
      required: true,
      validation: (val) => !val?.trim() ? 'Placa é obrigatória' : null
    },
    {
      name: 'status',
      label: 'Status',
      type: 'select',
      required: false,
      disabled: (isNew) => isNew,
      options: [
        { value: 'disponivel', label: 'Disponível' },
        { value: 'indisponivel', label: 'Indisponível' }
      ]
    }
  ]
};

// ===== MAPPER PARA ROTAS =====
export const formConfigMap: Record<string, EntityFormConfig> = {
  'corridas': corridaFormConfig,
  'motoristas': motoristaFormConfig,
  'veiculos': veiculoFormConfig
};

export function getFormConfig(entityType: string): EntityFormConfig | null {
  return formConfigMap[entityType] || null;
}
