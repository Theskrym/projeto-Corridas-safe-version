import { useId } from 'react';
import type { FormFieldConfig } from '../../config/formConfigs';

interface FormFieldProps {
  field: FormFieldConfig;
  value: string | number | null | undefined;
  onChange: (value: string | number) => void;
  error?: string | null;
  selectOptions?: Array<{ value: string | number; label: string }>;
  isDisabled?: boolean;
}

export const FormField = ({
  field,
  value,
  onChange,
  error,
  selectOptions,
  isDisabled
}: FormFieldProps) => {
  const isFieldDisabled = isDisabled || (field.disabled?.(isDisabled ?? false) ?? false);
  const generatedId = useId();
  const fieldId = `field-${field.name}-${generatedId}`;
  const errorId = `${fieldId}-error`;
  const commonAttributes = {
    id: fieldId,
    required: field.required,
    'aria-invalid': Boolean(error),
    'aria-describedby': error ? errorId : undefined
  };

  return (
    <div style={{ marginBottom: '15px' }}>
      <label className="secondary-field-label" htmlFor={fieldId} style={{ marginBottom: '5px', display: 'block' }}>
        {field.label}{field.required && <> <span aria-hidden="true">*</span><span className="visually-hidden"> (obrigatório)</span></>}
      </label>

      {field.type === 'textarea' ? (
        <textarea
          {...commonAttributes}
          className="secondary-textfield"
          placeholder={field.placeholder}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          disabled={isFieldDisabled}
          rows={3}
          style={{
            borderColor: error ? '#b42318' : undefined,
            backgroundColor: isFieldDisabled ? '#f0f0f0' : undefined
          }}
        />
      ) : field.type === 'select' ? (
        <select
          {...commonAttributes}
          className="secondary-textfield"
          value={value || ''}
          onChange={(e) => onChange(e.target.value ? (field.name === 'motorista' || field.name === 'veiculo' ? Number(e.target.value) : e.target.value) : "")}
          disabled={isFieldDisabled}
          style={{
            borderColor: error ? '#b42318' : undefined,
            backgroundColor: isFieldDisabled ? '#f0f0f0' : undefined
          }}
        >
          <option value="">Selecione uma opção</option>
          {selectOptions?.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ) : field.type === 'phone' ? (
        <input
          {...commonAttributes}
          className="secondary-textfield"
          type="tel"
          inputMode="tel"
          placeholder={field.placeholder}
          value={value || ''}
          onChange={(e) => {
            const numericOnly = e.target.value.replace(/[^0-9]/g, '');
            let formatted = numericOnly;
            if (numericOnly.length > 0) {
              if (numericOnly.length <= 2) {
                formatted = `(${numericOnly}`;
              } else if (numericOnly.length <= 7) {
                formatted = `(${numericOnly.slice(0, 2)}) ${numericOnly.slice(2)}`;
              } else {
                formatted = `(${numericOnly.slice(0, 2)}) ${numericOnly.slice(2, 7)}-${numericOnly.slice(7, 11)}`;
              }
            }
            onChange(formatted);
          }}
          disabled={isFieldDisabled}
          maxLength={15}
          style={{
            borderColor: error ? '#b42318' : undefined,
            backgroundColor: isFieldDisabled ? '#f0f0f0' : undefined
          }}
        />
      ) : field.type === 'number' && field.name === 'matricula' ? (
        <input
          {...commonAttributes}
          className="secondary-textfield"
          type="text"
          inputMode="numeric"
          placeholder={field.placeholder}
          value={value || ''}
          onChange={(e) => {
            const numericOnly = e.target.value.replace(/[^0-9]/g, '');
            if (numericOnly.length <= 6) {
              onChange(numericOnly);
            }
          }}
          onKeyPress={(e) => {
            if (!/[0-9]/.test(e.key)) {
              e.preventDefault();
            }
          }}
          disabled={isFieldDisabled}
          maxLength={6}
          style={{
            borderColor: error ? '#b42318' : undefined,
            backgroundColor: isFieldDisabled ? '#f0f0f0' : undefined
          }}
        />
      ) : (
        <input
          {...commonAttributes}
          className="secondary-textfield"
          type={field.type}
          placeholder={field.placeholder}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          disabled={isFieldDisabled}
          style={{
            borderColor: error ? '#b42318' : undefined,
            backgroundColor: isFieldDisabled ? '#f0f0f0' : undefined
          }}
        />
      )}

      {error && (
        <div id={errorId} role="alert" style={{ color: '#b42318', fontSize: '14px', marginTop: '4px' }}>
          {error}
        </div>
      )}
    </div>
  );
};

export default FormField;
