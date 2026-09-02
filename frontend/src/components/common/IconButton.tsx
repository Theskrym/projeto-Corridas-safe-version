import React from 'react';
import './IconButton.css';

interface IconButtonProps {
  icon: React.ReactNode;
  onClick?: () => void;
  ariaLabel?: string;
  withRotation?: boolean;
  badge?: number;
  title?: string;
}

const IconButton: React.FC<IconButtonProps> = ({ 
  icon, 
  onClick, 
  ariaLabel = 'Ação',
  withRotation = false,
  badge,
  title
}) => {
  return (
    <div className="icon-button-wrapper">
      <button 
        className={`icon-button ${withRotation ? 'icon-button--rotate' : ''}`}
        onClick={onClick}
        aria-label={ariaLabel}
        title={title}
      >
        {icon}
      </button>
      {badge !== undefined && badge > 0 && (
        <span className="icon-button-badge">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </div>
  );
};

export default IconButton;
