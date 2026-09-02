import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/common/HeaderFULL.tsx";
import BottomMenu from "../components/common/BottomMenu.tsx";
import SideBarMenu from "../components/common/SideBarMenu.tsx";
import api from "../api/axios.ts";
import "../components/geral/GeralCSS.css";

interface PasswordData {
  senhaAtual: string;
  novaSenha: string;
  confirmarSenha: string;
}

const AlterarSenhaPage: React.FC = () => {
  const navigate = useNavigate();
  const [passwordData, setPasswordData] = useState<PasswordData>({
    senhaAtual: "",
    novaSenha: "",
    confirmarSenha: ""
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
    
    // Limpar mensagens de erro/sucesso quando o usuário começar a digitar
    if (error) setError(null);
    if (success) setSuccess(null);
  };

  const validateForm = (): boolean => {
    if (!passwordData.senhaAtual.trim()) {
      setError("Por favor, digite sua senha atual.");
      return false;
    }

    if (!passwordData.novaSenha.trim()) {
      setError("Por favor, digite uma nova senha.");
      return false;
    }

    if (passwordData.novaSenha.length < 6) {
      setError("A nova senha deve ter pelo menos 6 caracteres.");
      return false;
    }

    if (!passwordData.confirmarSenha.trim()) {
      setError("Por favor, confirme sua nova senha.");
      return false;
    }

    if (passwordData.novaSenha !== passwordData.confirmarSenha) {
      setError("As senhas não coincidem.");
      return false;
    }

    if (passwordData.senhaAtual === passwordData.novaSenha) {
      setError("A nova senha deve ser diferente da senha atual.");
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem("token");
      
      if (!token) {
        navigate("/");
        return;
      }

      await api.put("/change-password/", {
        senhaAtual: passwordData.senhaAtual,
        novaSenha: passwordData.novaSenha,
        confirmarSenha: passwordData.confirmarSenha
    });
      
      setSuccess("Senha alterada com sucesso!");
      
      // Limpar os campos após sucesso
      setPasswordData({
        senhaAtual: "",
        novaSenha: "",
        confirmarSenha: ""
      });
      
      // Opcional: redirecionar após alguns segundos
      setTimeout(() => {
        navigate("/home"); // ou para onde você quiser redirecionar
      }, 2000);
      
    } catch (error: any) {
      if (error.response?.status === 401) {
        setError("Senha atual incorreta.");
      } else if (error.response?.status === 400) {
        setError("Dados inválidos. Verifique as informações.");
      } else {
        setError("Erro ao alterar senha. Tente novamente.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setPasswordData({
      senhaAtual: "",
      novaSenha: "",
      confirmarSenha: ""
    });
    setError(null);
    setSuccess(null);
  };

  const storedUser = localStorage.getItem("user");
  const currentUser = storedUser ? JSON.parse(storedUser) : null;
  const isMotorista = currentUser && (
    currentUser.nivel_acesso === 'motorista' ||
    currentUser.nivel_acesso === 'driver' ||
    currentUser.nivel_acesso === 3
  );

  const handleGoBack = () => {
    handleCancel();
    if (isMotorista) {
      navigate("/agendamento");
    } else {
      navigate(-1);
    }
  };

  return (
    <div className="home-main-container">
      <Header title="Alterar Senha" showLeft={false} showRight={true} />
      
      <div className="home-content-wrapper">
        {!isMotorista && <SideBarMenu />}
        
        <main className="conteudo" style={isMotorista ? { marginLeft: 0 } : undefined}>
          <div className="login-form-card alterar-senha-card">
            <h1 className="login-form-title">Alterar Senha</h1>

            {error && (
              <div className="login-error-message">
                <p>{error}</p>
              </div>
            )}

            {success && (
              <div className="login-help-text">
                <p>{success}</p>
              </div>
            )}

            <div className="login-input-group">
              <label className="login-input-label">Senha Atual</label>
              <div className="login-input-wrapper">
                <input
                  type="password"
                  name="senhaAtual"
                  value={passwordData.senhaAtual}
                  onChange={handleInputChange}
                  className="login-input-field"
                  placeholder="Digite sua senha atual"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="login-input-group">
              <label className="login-input-label">Nova Senha</label>
              <div className="login-input-wrapper">
                <input
                  type="password"
                  name="novaSenha"
                  value={passwordData.novaSenha}
                  onChange={handleInputChange}
                  className="login-input-field"
                  placeholder="Digite sua nova senha"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="login-input-group">
              <label className="login-input-label">Confirme a Nova Senha</label>
              <div className="login-input-wrapper">
                <input
                  type="password"
                  name="confirmarSenha"
                  value={passwordData.confirmarSenha}
                  onChange={handleInputChange}
                  className="login-input-field"
                  placeholder="Confirme sua nova senha"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="secondary-buttons-container">
              <button 
                className="secondary-btn secondary-btn-cancel" 
                onClick={handleGoBack}
                disabled={loading}
              >
                {isMotorista ? "← Voltar" : "Cancelar"}
              </button>
              <button 
                className="secondary-btn secondary-btn-confirm" 
                onClick={handleSubmit}
                disabled={loading}
              >
                {loading ? "Alterando..." : "Confirmar"}
              </button>
            </div>

            {loading && (
              <div className="login-help-text">
                <div className="spinner"></div>
                <p>Alterando senha...</p>
              </div>
            )}
          </div>
        </main>
      </div>

      <BottomMenu />
    </div>
  );
};

export default AlterarSenhaPage;