// src/components/common/Header.tsx
import React from "react";
import { useNavigate } from "react-router-dom";
import SettingsMenu from './SettingsMenu.tsx';

// Importe os ícones e a logo
import iconeEsquerdo from "../../assets/icone-esquerdo.png";
import logoCesmac from "../../assets/logo-CESMAC-redux.svg";

interface SettingsOption {
  label: string;
  action: () => void;
  icon?: string;
}

interface HeaderProps {
  title: string;
  onLeftClick?: () => void;
  onRightClick?: () => void;
  showLeft?: boolean;
  showRight?: boolean;
  settingsOptions?: SettingsOption[];
}

const Header: React.FC<HeaderProps> = ({
  title,
  onLeftClick,
  showLeft = true,
  showRight = true,
  settingsOptions = [],
}) => {
  const navigate = useNavigate();

  const handleLeftClick = () => {
    console.log("Botão VOLTAR clicado");
    if (onLeftClick) {
      onLeftClick();
    } else {
      navigate(-1);
    }
  };

  // Opções padrão para o menu de configurações
  const defaultOptions: SettingsOption[] = [
    { 
      label: 'Dados Pessoais', 
      action: () => {
        console.log('Abrir Dados Pessoais');
        navigate('/dados-pessoais');
      },
      icon: '👤'
    },
    { 
      label: 'Alterar Senha', 
      action: () => {
        console.log('Abrir Alterar Senha');
        navigate('/alterar-senha');
      },
      icon: '🔒'
    },
    { 
      label: 'Sair', 
      action: () => {
        localStorage.removeItem('token');
        navigate('/');
      },
      icon: '🚪'
    }
  ];

  const options = settingsOptions.length > 0 ? settingsOptions : defaultOptions;

  return (
    <>
      <header className="header">
        <div className="header-logo-content flex items-center relative">
          {/* Ícone esquerdo */}
          {showLeft ? (
            <div
              className="icone-esquerdo cursor-pointer z-10"
              onClick={handleLeftClick}
              style={{
                transition: 'transform 0.2s ease',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              <img
                src={iconeEsquerdo}
                alt="Voltar"
                className="w-full h-full object-contain pointer-events-none"
                draggable={false}
              />
            </div>
          ) : (
            <div
              className="icone-esquerdo"
              style={{ visibility: 'hidden' }}
            />
          )}

          {/* LOGO */}
          <img src={logoCesmac} alt="CESMAC" className="home-logo mx-4" />

          {/* Ícone direito */}
          {showRight ? (
            <div className="icone-direito relative ml-auto">
              <SettingsMenu options={options} />
            </div>
          ) : (
            <div
              className="icone-direito relative ml-auto"
              style={{ visibility: 'hidden' }}
            />
          )}
        </div>
      </header>

      {/* Título da Página */}
      <div className="home-header-bar">
        <h1 className="home-title">{title}</h1>
      </div>
    </>
  );
};

export default Header;
