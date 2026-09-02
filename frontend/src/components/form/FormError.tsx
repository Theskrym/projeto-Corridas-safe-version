interface FormErrorProps {
  error?: string | null;
  veiculoConflito?: any;
}

export const FormError = ({ error, veiculoConflito }: FormErrorProps) => {
  return (
    <>
      {error && (
        <div style={{
          color: 'white',
          backgroundColor: '#d32f2f',
          padding: '12px',
          margin: '10px',
          borderRadius: '4px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span>❌</span>
          {error}
        </div>
      )}
      {veiculoConflito && (
        <div style={{
          color: '#d97706',
          backgroundColor: '#fef3c7',
          padding: '12px',
          margin: '10px',
          borderRadius: '4px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          border: '1px solid #fcd34d'
        }}>
          <span>⚠️</span>
          Conflito de horário para o veículo em {veiculoConflito.data_inicio}
        </div>
      )}
    </>
  );
};

export default FormError;
