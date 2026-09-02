import { Routes, Route } from "react-router-dom";
import RequireAuth from './RequireAuth.tsx';
import RequireAdminAuth from './RequireAdminAuth.tsx';

import HomePage from "../pages/HomePage.tsx";
import GerarRelatorioPage from "../pages/GerarRelatorioPage.tsx";
import StatusColorsPage from "../pages/StatusColorsPage.tsx";
import { Agendamento } from "../pages/Agendamento/Agendamento.tsx";
import NotFoundPage from "../pages/NotFoundPage.tsx";

import LoginPage from "../pages/LoginPage.tsx";
import AutoLogin from "../pages/AutoLoginPage.tsx"; 
import EsqueceuPage from "../pages/EsqueceuPage.tsx";

import DadosPessoaisPage from "../pages/DadosPessoaisPage.tsx";
import AlterarSenha from "../pages/AlterarSenhaPage.tsx";

import CorridasPage from "../pages/CorridasPage.tsx";
import FormPage from '../pages/FormPage.tsx';

import MotoristasPage from "../pages/MotoristasPage.tsx";

import VeiculosPage from "../pages/VeiculosPage.tsx";

import NotificacoesPage from "../pages/NotificacoesPage.tsx";
import NotificacaoPage from "../pages/NotificacaoPage.tsx";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/auto-login" element={<AutoLogin />} /> 
      <Route path="/esqueceu-senha" element={<EsqueceuPage />} />

      <Route path="/home" element={<RequireAdminAuth><HomePage /></RequireAdminAuth>} />
      <Route path="/agendamento" element={<RequireAuth><Agendamento /></RequireAuth>} />
      <Route path="/gerar-relatorio" element={<RequireAdminAuth><GerarRelatorioPage /></RequireAdminAuth>} />
      <Route path="/status-colors" element={<RequireAdminAuth><StatusColorsPage /></RequireAdminAuth>} />

      <Route path="/corridas" element={<RequireAdminAuth><CorridasPage /></RequireAdminAuth>} />
      <Route path="/corridas/novo" element={<RequireAdminAuth><FormPage /></RequireAdminAuth>} />
      <Route path="/corridas/editar/:id" element={<RequireAdminAuth><FormPage /></RequireAdminAuth>} />

      <Route path="/motoristas" element={<RequireAdminAuth><MotoristasPage /></RequireAdminAuth>} />
      <Route path="/motoristas/novo" element={<RequireAdminAuth><FormPage /></RequireAdminAuth>} />
      <Route path="/motoristas/editar/:id" element={<RequireAdminAuth><FormPage /></RequireAdminAuth>} />

      <Route path="/veiculos" element={<RequireAdminAuth><VeiculosPage /></RequireAdminAuth>} />
      <Route path="/veiculos/novo" element={<RequireAdminAuth><FormPage /></RequireAdminAuth>} />
      <Route path="/veiculos/editar/:id" element={<RequireAdminAuth><FormPage /></RequireAdminAuth>} />

      <Route path="/notificacoes" element={<RequireAuth><NotificacoesPage /></RequireAuth>} />
      <Route path="/notificacao" element={<RequireAuth><NotificacaoPage /></RequireAuth>} />
      
      <Route path="/dados-pessoais" element={<RequireAuth><DadosPessoaisPage /></RequireAuth>} />
      <Route path="/alterar-senha" element={<RequireAuth><AlterarSenha /></RequireAuth>} />
      
      <Route path="/not-found" element={<NotFoundPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}