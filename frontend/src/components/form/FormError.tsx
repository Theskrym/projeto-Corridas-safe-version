interface FormErrorProps {
  error?: string | null;
  veiculoConflito?: { data_inicio?: string } | null;
}

export const FormError = ({ error, veiculoConflito }: FormErrorProps) => {
  return (
    <>
      {error && (
        <div style={{
          color: '#7f1d1d',
          backgroundColor: '#fef2f2',
          padding: '12px',
          margin: '10px',
          borderRadius: '4px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          border: '1px solid #b42318'
        }} role="alert">
          <span aria-hidden="true">!</span>
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
          border: '1px solid #92400e'
        }} role="status">
          <span aria-hidden="true">!</span>
          Conflito de horário para o veículo em {veiculoConflito.data_inicio}
        </div>
      )}
    </>
  );
};

export default FormError;
