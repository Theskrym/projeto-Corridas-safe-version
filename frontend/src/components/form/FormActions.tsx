interface FormActionsProps {
  onSave: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export const FormActions = ({ onSave, onCancel, loading = false }: FormActionsProps) => {
  return (
    <div style={{ display: 'flex', gap: '10px', margin: '20px', justifyContent: 'center' }}>
      <button
        className="secondary-button"
        onClick={onSave}
        disabled={loading}
        style={{
          opacity: loading ? 0.6 : 1,
          cursor: loading ? 'not-allowed' : 'pointer'
        }}
      >
        {loading ? 'Salvando...' : 'Salvar'}
      </button>
      <button
        className="secondary-button"
        onClick={onCancel}
        disabled={loading}
        style={{
          opacity: loading ? 0.6 : 1,
          cursor: loading ? 'not-allowed' : 'pointer'
        }}
      >
        Cancelar
      </button>
    </div>
  );
};

export default FormActions;
