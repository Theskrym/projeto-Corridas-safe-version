import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/common/HeaderFULL.tsx";
import BottomMenu from "../components/common/BottomMenu.tsx";
import SideBarMenu from "../components/common/SideBarMenu.tsx";
import api from "../api/axios.ts";
import "../components/geral/GeralCSS.css";
import "../components/dados/DadosPessoaisCSS.css";

interface UserData {
  id_usuario: number;
  nome: string;
  telefone: string;
  email: string;
  matricula: string;
}

const DadosPessoaisPage: React.FC = () => {
  const navigate = useNavigate();
  const [userData, setUserData] = useState<UserData>({
    id_usuario: 0,
    nome: "",
    telefone: "",
    email: "",
    matricula: ""
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");
        
        if (!token) {
          navigate("/");
          return;
        }

       // Corrigido o endpoint para /user_personal_data/
      const response = await api.get("/user_personal_data/");
      
      setUserData({
        id_usuario: response.data.id_usuario,
        nome: response.data.nome,
        telefone: response.data.telefone || "",
        email: response.data.email,
        matricula: response.data.matricula || ""
      });
        
        setError(null);
      } catch (error: any) {
        console.error("Erro ao buscar dados do usuário:", error);
        
        if (error.response?.status === 401) {
          setError("Sessão expirada. Faça login novamente.");
        } else {
          setError("Erro ao carregar dados. Tente novamente.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [navigate]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let finalValue = value;
    
    // Aplicar formatação de telefone
    if (name === 'telefone') {
      const numericOnly = value.replace(/[^0-9]/g, '');
      if (numericOnly.length > 0) {
        if (numericOnly.length <= 2) {
          finalValue = `(${numericOnly}`;
        } else if (numericOnly.length <= 7) {
          finalValue = `(${numericOnly.slice(0, 2)}) ${numericOnly.slice(2)}`;
        } else {
          finalValue = `(${numericOnly.slice(0, 2)}) ${numericOnly.slice(2, 7)}-${numericOnly.slice(7, 11)}`;
        }
      }
    }
    
    setUserData(prev => ({ ...prev, [name]: finalValue }));
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      
      const response = await api.put("/user_personal_data/", {
        nome: userData.nome,
        telefone: userData.telefone
    });
      
      setUserData({
        ...userData,
        nome: response.data.nome,
        telefone: response.data.telefone
      });
      
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      localStorage.setItem("user", JSON.stringify({ 
        ...user, 
        nome: response.data.nome,
        telefone: response.data.telefone
      }));
      
      alert("Dados atualizados com sucesso!");
      setIsEditing(false);
    } catch (error: any) {
      console.error("Erro ao atualizar dados:", error);
      setError("Erro ao atualizar dados.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    setUserData(prev => ({
      ...prev,
      nome: user.nome || prev.nome,
      telefone: user.telefone || prev.telefone
    }));
    setIsEditing(false);
  };

  const storedUser = localStorage.getItem("user");
  const currentUser = storedUser ? JSON.parse(storedUser) : null;
  const isMotorista = currentUser && (
    currentUser.nivel_acesso === 'motorista' ||
    currentUser.nivel_acesso === 'driver' ||
    currentUser.nivel_acesso === 3
  );

  const handleGoBack = () => {
    if (isMotorista) {
      navigate("/agendamento"); // Voltar para dashboard do motorista
    } else {
      navigate(-1); // Voltar para página anterior
    }
  };

  return (
    <div className="home-main-container">
      <Header title="Dados Pessoais" showLeft={false} showRight={true} />
      
      <div className="home-content-wrapper">
        {!isMotorista && <SideBarMenu />}
        
        <main className="conteudo" style={isMotorista ? { marginLeft: 0 } : undefined}>
          <div className="login-form-card dados-pessoais-card">
            <h1 className="login-form-title">Dados Pessoais</h1>

            {loading ? (
              <div className="loading-message">
                <div className="spinner"></div>
                <p>Carregando dados...</p>
              </div>
            ) : error ? (
              <div className="error-message">
                <p>{error}</p>
                <button 
                  onClick={() => {
                    localStorage.removeItem("token");
                    localStorage.removeItem("user");
                    navigate("/");
                  }}
                  className="login-again-button"
                >
                  Fazer login novamente
                </button>
              </div>
            ) : (
              <>
                <div className="dados-fields-grid">
                  <div className="login-input-group dados-group">
                    <label className="login-input-label dados-label">Nome</label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="nome"
                        value={userData.nome}
                        onChange={handleInputChange}
                        className="login-input-field dados-input"
                        placeholder="Digite seu nome"
                      />
                    ) : (
                      <div className="dados-value dados-readonly-field">{userData.nome}</div>
                    )}
                  </div>

                  <div className="login-input-group dados-group">
                    <label className="login-input-label dados-label">Telefone</label>
                    {isEditing ? (
                      <input
                        type="tel"
                        name="telefone"
                        value={userData.telefone}
                        onChange={handleInputChange}
                        className="login-input-field dados-input"
                        placeholder="Digite seu telefone"
                      />
                    ) : (
                      <div className="dados-value dados-readonly-field">{userData.telefone || "Não informado"}</div>
                    )}
                  </div>

                  <div className="login-input-group dados-group">
                    <label className="login-input-label dados-label">Email Corporativo</label>
                    <div className="dados-value dados-readonly-field">{userData.email}</div>
                  </div>

                  <div className="login-input-group dados-group">
                    <label className="login-input-label dados-label">Matrícula</label>
                    <div className="dados-value dados-readonly-field">{userData.matricula || "Não informada"}</div>
                  </div>
                </div>

                <div className="secondary-buttons-container">
                  {isEditing ? (
                    <>
                      <button 
                        className="secondary-btn secondary-btn-cancel" 
                        onClick={handleCancel}
                        disabled={loading}
                      >
                        Cancelar
                      </button>
                      <button 
                        className="secondary-btn secondary-btn-confirm" 
                        onClick={handleSubmit}
                        disabled={loading}
                      >
                        {loading ? "Salvando..." : "Confirmar"}
                      </button>
                    </>
                  ) : (
                    <>
                      {isMotorista && (
                        <button 
                          className="secondary-btn secondary-btn-cancel" 
                          onClick={handleGoBack}
                          disabled={loading}
                        >
                          ← Voltar
                        </button>
                      )}
                      <button 
                        className="secondary-btn secondary-btn-confirm" 
                        onClick={() => setIsEditing(true)}
                        disabled={loading}
                      >
                        Editar Dados
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </main>
      </div>

      <BottomMenu />
    </div>
  );
};

export default DadosPessoaisPage;