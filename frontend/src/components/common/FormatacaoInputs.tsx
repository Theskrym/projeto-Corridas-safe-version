import React, { useState } from "react";

// Função de formatação (mantém igual ao seu código)
export const formatarTelefone = (e: React.FormEvent<HTMLInputElement>) => {
  const input = e.currentTarget;
  let value = input.value.replace(/\D/g, '');

  // Limita o tamanho (código + DDD + número = 13 dígitos)
  value = value.substring(0, 13);

  let formatted = '';

  if (value.length > 0) {
    formatted = '+' + value.substring(0, 2); // +55

    if (value.length > 2) {
      formatted += ' (' + value.substring(2, 4); // (00

      if (value.length > 4) {
        formatted += ') ' + value.substring(4, 9); // ) 00000

        if (value.length > 9) {
          formatted += '-' + value.substring(9, 13); // -0000
        }
      }
    }
  }

  input.value = formatted;
};

// Componente pronto para uso
export const FormatarTelefone: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => {
  const [value, setValue] = useState("");

  const handleInput = (e: React.FormEvent<HTMLInputElement>) => {
    formatarTelefone(e);
    setValue(e.currentTarget.value);
    if (props.onInput) props.onInput(e as any);
  };

  return (
    <>
      <div className="secondary-field-label">Telefone</div>
      <div className="tel-input-container">
        <input
          className="secondary-textfield tel-input"
          type="tel"
          placeholder="+55 (00) 00000-0000"
          maxLength={19}
          required
          value={value}
          onInput={handleInput}
          {...props}
        />
      </div>
      <div className="tel-validation-message">Formato: +55 (00) 00000-0000</div>
    </>
  );
};



// Formatação de email: sempre termina com @cesmac.edu.br
export const formatarEmailCesmac = (e: React.FormEvent<HTMLInputElement>) => {
  const input = e.currentTarget;
  const dominio = '@cesmac.edu.br';

  // Remove o domínio se já existir para evitar duplicidade
  let value = input.value;
  const dominioIndex = value.indexOf(dominio);

  if (dominioIndex !== -1) {
    value = value.substring(0, dominioIndex);
  }

  // Remove espaços e caracteres inválidos antes do domínio
  value = value.replace(/\s/g, '');

  // Adiciona o domínio ao final, sempre
  input.value = value + dominio;

  // Posição do cursor ANTES da atualização
  const selectionStart = input.selectionStart ?? 0;

  // Calcula a posição correta do cursor (antes do @)
  const beforeDomain = value.length;

  // Se o cursor estava depois do domínio, move para antes do domínio
  // Se estava antes, mantém onde estava (para digitação fluida)
  setTimeout(() => {
    if (selectionStart > beforeDomain) {
      input.setSelectionRange(beforeDomain, beforeDomain);
    } else {
      input.setSelectionRange(selectionStart, selectionStart);
    }
  }, 0);

  // Impede apagar o domínio: se tentar apagar tudo, mantém o domínio
  if (input.value.length < dominio.length) {
    input.value = dominio;
    setTimeout(() => {
      input.setSelectionRange(0, 0);
    }, 0);
  }
};

export const EmailCesmac: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => {
  const dominio = "@cesmac.edu.br";
  const [value, setValue] = useState("");

  const handleInput = (e: React.FormEvent<HTMLInputElement>) => {
    // Só aceita o que o usuário digitar antes do domínio
    let val = e.currentTarget.value.replace(/\s/g, "");
    setValue(val);
    if (props.onInput) props.onInput(e as any);
  };

  return (
    <>
      <div className="secondary-field-label">Email Corporativo</div>
      <div style={{ position: "relative", display: "inline-block", width: "100%" }}>
        <input
          className="secondary-textfield"
          type="text"
          placeholder="nome.sobrenome"
          required
          value={value}
          onInput={handleInput}
          style={{ paddingRight: "140px" }}
          {...props}
        />
        <span
          style={{
            position: "absolute",
            right: "12px",
            top: "50%",
            transform: "translateY(-50%)",
            color: "#888",
            pointerEvents: "none",
            fontSize: "1em",
            background: "white",
            paddingLeft: "2px"
          }}
        >
          {dominio}
        </span>
      </div>
      <div className="tel-validation-message">Formato: nome.sobrenome@cesmac.edu.br</div>
    </>
  );
};