import { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import "../components/geral/GeralCSS.css";
import api from "../api/axios.ts";
import { getFormConfig } from "../config/formConfigs.ts";
import FormField from "../components/form/FormField.tsx";
import FormActions from "../components/form/FormActions.tsx";
import FormError from "../components/form/FormError.tsx";
import Header from '../components/common/HeaderFULL.tsx';
import BottomMenu from '../components/common/BottomMenu.tsx';
import SideBarMenu from '../components/common/SideBarMenu.tsx';

export const FormPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();

  // Detectar entidade pela rota (/corridas, /motoristas, /veiculos)
  const entityType = location.pathname.split('/')[1];
  const formConfig = getFormConfig(entityType);

  const getCurrentAccessLevel = () => {
    try {
      const storedUser = localStorage.getItem('user');
      if (!storedUser) return null;
      const parsedUser = JSON.parse(storedUser);
      const nivelAc = typeof parsedUser.nivel_acesso === 'string'
        ? Number(parsedUser.nivel_acesso)
        : parsedUser.nivel_acesso;
      return Number.isNaN(nivelAc) ? null : nivelAc;
    } catch {
      return null;
    }
  };

  const currentAccessLevel = getCurrentAccessLevel();
  const isOperador = currentAccessLevel === 4;
  const isAdmin = currentAccessLevel === 1;

  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(!!(id));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [selectOptions, setSelectOptions] = useState<Record<string, any[]>>({});
  const [veiculoConflito, setVeiculoConflito] = useState<any>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [isCancelada, setIsCancelada] = useState(false);

  const isNew = !id;

  // Inicializar formData com campos vazios
  useEffect(() => {
    if (formConfig) {
      const initialData: Record<string, any> = {};
      formConfig.fields.forEach(field => {
        initialData[field.name] = field.defaultValue ?? '';
      });

      if (isNew && entityType === 'motoristas') {
        initialData.nivel_acesso = '3';
      }

      setFormData(initialData);
    }
  }, [formConfig, entityType, isNew]);

  // Carregar dados se editando
  useEffect(() => {
    if (isNew || !formConfig) return;

    const loadData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await api.get(`${formConfig.endpoint}${id}/`);
        const transformed = formConfig.transformData
          ? formConfig.transformData(response.data)
          : response.data;
        setFormData(transformed);
        
        // Se for corrida e status for cancelada, ativar o toggle
        if (entityType === 'corridas' && response.data.status === 'cancelada') {
          setIsCancelada(true);
        }
      } catch (err: any) {
        setError(err.response?.data?.message || 'Erro ao carregar dados');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [id, isNew, formConfig, entityType]);

  // Carregar opções de select (motoristas, veículos)
  useEffect(() => {
    const loadSelectOptions = async () => {
      try {
        const options: Record<string, any[]> = {};

        // Carregar motoristas se existir campo
        if (formConfig?.fields.some(f => f.name === 'motorista')) {
          const res = await api.get('/motoristas/');
          options['motorista'] = (res.data.data || res.data || []).map((m: any) => ({
            value: m.id_usuario,
            label: m.nome
          }));
        }

        // Carregar veículos se existir campo
        if (formConfig?.fields.some(f => f.name === 'veiculo')) {
          const res = await api.get('/veiculos/');
          options['veiculo'] = (res.data.data || res.data || []).map((v: any) => ({
            value: v.id_veiculo,
            label: `${v.nome} - ${v.placa}`
          }));
        }

        setSelectOptions(options);
      } catch (err) {
        console.error('Erro ao carregar opções:', err);
      }
    };

    loadSelectOptions();
  }, [formConfig]);

  // Validação de conflito de veículo
  useEffect(() => {
    const checkVeiculoConflito = async () => {
      if (entityType !== 'corridas' || !formData.veiculo || !formData.data_inicio || !formData.horario_inicio) {
        setVeiculoConflito(null);
        return;
      }

      try {
        const response = await api.get(`/veiculos/${formData.veiculo}/conflitos/`, {
          params: {
            data_inicio: formData.data_inicio,
            horario_inicio: formData.horario_inicio,
            horario_retorno: formData.horario_retorno,
            excluir_corrida_id: id || undefined
          }
        });

        if (response.data.conflito) {
          setVeiculoConflito(response.data);
        } else {
          setVeiculoConflito(null);
        }
      } catch (err) {
        console.error('Erro ao verificar conflitos:', err);
        setVeiculoConflito(null);
      }
    };

    const timer = setTimeout(() => {
      checkVeiculoConflito();
    }, 500);

    return () => clearTimeout(timer);
  }, [formData.veiculo, formData.data_inicio, formData.horario_inicio, formData.horario_retorno, entityType, id]);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formConfig) return false;

    formConfig.fields.forEach(field => {
      const validation = field.validation?.(formData[field.name]);
      if (validation) {
        errors[field.name] = validation;
      }
    });

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    setError(null);

    if (!validateForm()) {
      return;
    }

    if (veiculoConflito && entityType === 'corridas') {
      setError('Há conflito de horário para o veículo selecionado');
      return;
    }

    if (!formConfig) return;

    setSaving(true);
    try {
      // Incluir isCancelada para corridas
      const dataToSave = entityType === 'corridas' 
        ? { ...formData, isCancelada }
        : formData;
      
      const payload = formConfig.transformPayload
        ? formConfig.transformPayload(dataToSave)
        : dataToSave;

      let endpoint = formConfig.endpoint;
      
      // Usar endpoint especial para criar motorista
      if (isNew && entityType === 'motoristas') {
        endpoint = '/motoristas/novo/';
      }

      if (isNew) {
        await api.post(endpoint, payload);
      } else {
        await api.patch(`${formConfig.endpoint}${id}/`, payload);
      }

      navigate(`/${entityType}`);
    } catch (err: any) {
      const errorMsg = err.response?.data?.message ||
        err.response?.data?.detail ||
        'Erro ao salvar';
      setError(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  if (!formConfig) {
    return <div>Formulário não encontrado</div>;
  }

  if (isLoading) {
    return <div>Carregando...</div>;
  }

  return (
    <div className="home-main-container">
      <Header title={formConfig.title(isNew)} showLeft={true} showRight={true} />

      <div className="home-content-wrapper">
        <SideBarMenu />

        <main className="conteudo">
          <FormError error={error} veiculoConflito={veiculoConflito} />

          {/* Mensagem de senha padrão ao criar motorista */}
          {isNew && entityType === 'motoristas' && (
            <div style={{
              backgroundColor: '#E3F2FD',
              border: '1px solid #2196F3',
              borderRadius: '4px',
              padding: '15px',
              marginBottom: '20px',
              maxWidth: '1000px',
              margin: '0 auto 20px'
            }}>
              <p style={{
                margin: '0 0 8px 0',
                fontSize: '14px',
                color: '#1976D2',
                fontWeight: '500'
              }}>
                ℹ️ Ao criar uma nova conta:
              </p>
              <p style={{
                margin: '0 0 6px 0',
                fontSize: '14px',
                color: '#1976D2',
                marginLeft: '20px'
              }}>
                • <strong>Login:</strong> {formData.email_corporativo ? <strong>{formData.email_corporativo.split('@')[0]}</strong> : 'Preencha o email corporativo'}
              </p>
              <p style={{
                margin: '0',
                fontSize: '14px',
                color: '#1976D2',
                marginLeft: '20px'
              }}>
                • <strong>Senha padrão:</strong> <strong>cesmac@2026</strong>
              </p>
            </div>
          )}

          <div className="secondary-form-grid">
        {formConfig.fields.map((field: any) => {
          if (field.name === 'nivel_acesso' && isOperador) {
            return null;
          }

          // Determinar opções para select
          let fieldOptions = field.options;
          if (field.type === 'select' && !fieldOptions) {
            fieldOptions = selectOptions[field.name];
          }

          if (field.name === 'nivel_acesso') {
            const baseOptions = [...(fieldOptions || [])];
            fieldOptions = isOperador
              ? []
              : (isAdmin ? baseOptions : baseOptions.filter(opt => opt.value !== '1'));
          }

          return (
            <div key={field.name} style={field.gridColumn ? { gridColumn: field.gridColumn } : {}}>
              <FormField
                field={field}
                value={formData[field.name]}
                onChange={(value) => {
                  setFormData({ ...formData, [field.name]: value });
                  // Limpar erro ao editar
                  if (validationErrors[field.name]) {
                    const newErrors = { ...validationErrors };
                    delete newErrors[field.name];
                    setValidationErrors(newErrors);
                  }
                }}
                error={validationErrors[field.name]}
                selectOptions={fieldOptions}
                isDisabled={field.disabled?.(isNew)}
              />
            </div>
          );
        })}
          </div>

          {/* Toggle para cancelar corrida */}
          {entityType === 'corridas' && !isNew && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '15px',
              padding: '20px',
              maxWidth: '1000px',
              margin: '0 auto 20px'
            }}>
              <label style={{
                fontSize: '14px',
                fontWeight: '500',
                color: '#045CA4'
              }}>
                Cancelar Corrida
              </label>
              <input
                type="checkbox"
                checked={isCancelada}
                onChange={(e) => setIsCancelada(e.target.checked)}
                style={{
                  width: '20px',
                  height: '20px',
                  cursor: 'pointer'
                }}
              />
            </div>
          )}

          <FormActions
            onSave={handleSave}
            onCancel={() => navigate(-1)}
            loading={saving}
          />
        </main>
      </div>

      <BottomMenu />
    </div>
  );
};

export default FormPage;
