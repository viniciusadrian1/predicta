// ── Route table ───────────────────────────────────────────────────────────────
// Real URLs replace the old useState<Page> switch. /login is public; everything
// else lives under the AppShell layout route. (RequireAuth guard arrives in Phase 7.)

import { lazy, Suspense } from "react";
import { createBrowserRouter, Navigate } from "react-router";
import { C } from "@/lib/theme";
import { RootLayout } from "@/components/layout/RootLayout";
import { AppShell } from "@/components/layout/AppShell";
import { Gate } from "@/auth/RequireAuth";

// Code-split the OCR page — it pulls in tesseract.js (large WASM/lang assets).
const CadastroOCR = lazy(() => import("@/pages/CadastroOCR"));
const Loading = () => <div className="text-[12px] p-6" style={{ color: C.slate }}>Carregando…</div>;
const lazyEl = (node: React.ReactNode) => <Suspense fallback={<Loading />}>{node}</Suspense>;

import Login from "@/pages/Login";
import Landing from "@/pages/Landing";
import Dashboard from "@/pages/Dashboard";
import Painel from "@/pages/Painel";
import AtivosLista from "@/pages/AtivosLista";
import ListaPlantas from "@/pages/ListaPlantas";
import PlantaDetail from "@/pages/PlantaDetail";
import AtivoDetail from "@/pages/AtivoDetail";
import AtivoOverview from "@/pages/ativo/Overview";
import AtivoTelemetria from "@/pages/ativo/Telemetria";
import AtivoSaudeIA from "@/pages/ativo/SaudeIA";
import AtivoGemeoDigital from "@/pages/ativo/GemeoDigital";
import AtivoTecnico from "@/pages/ativo/Tecnico";
import GemeoRedirect from "@/pages/GemeoRedirect";
import AlertasLista from "@/pages/AlertasLista";
import AlertaDetalhe from "@/pages/AlertaDetalhe";
import OrdensServico from "@/pages/OrdensServico";
import Assistente from "@/pages/Assistente";
import CadastroManual from "@/pages/CadastroManual";
import MapaPlanta from "@/pages/MapaPlanta";
import Configuracoes from "@/pages/Configuracoes";
import GovernancaOverview from "@/pages/governanca/Overview";
import Hierarquia from "@/pages/governanca/Hierarquia";
import DICI from "@/pages/governanca/DICI";
import Dicionario from "@/pages/governanca/Dicionario";
import RBAC from "@/pages/governanca/RBAC";
import Auditoria from "@/pages/admin/Auditoria";

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { path: "/login", element: <Login /> },
      { path: "/landing", element: <Landing /> },
      {
        path: "/",
        element: <AppShell />,
        children: [
          { index: true, element: <Navigate to="/dashboard" replace /> },
          { path: "dashboard", element: <Dashboard /> },
          { path: "operacional", element: <Painel /> },

          { path: "plantas", element: <ListaPlantas /> },
          { path: "plantas/:planta", element: <PlantaDetail /> },
          // Back-compat: a antiga Lista de Ativos e o Gêmeo global saíram da sidebar,
          // mas as rotas seguem válidas (links antigos, deep-links, drawer de ativos).
          { path: "ativos", element: <AtivosLista /> },
          { path: "gemeo", element: <GemeoRedirect /> },
          {
            path: "ativos/:id",
            element: <AtivoDetail />,
            children: [
              { index: true, element: <Navigate to="overview" replace /> },
              { path: "overview", element: <AtivoOverview /> },
              { path: "telemetria", element: <AtivoTelemetria /> },
              { path: "saude", element: <AtivoSaudeIA /> },
              { path: "gemeo", element: <AtivoGemeoDigital /> },
              { path: "tecnico", element: <AtivoTecnico /> },
            ],
          },

          { path: "alertas", element: <Gate modulo="Alertas"><AlertasLista /></Gate> },
          { path: "alertas/:id", element: <Gate modulo="Alertas"><AlertaDetalhe /></Gate> },
          { path: "ordens", element: <Gate modulo="Alertas"><OrdensServico /></Gate> },

          { path: "assistente", element: <Assistente /> },
          { path: "assistente/:assetId", element: <Assistente /> },

          { path: "cadastro", element: <Gate modulo="Cadastro"><CadastroManual /></Gate> },
          { path: "cadastro/ocr", element: <Gate modulo="OCR">{lazyEl(<CadastroOCR />)}</Gate> },
          { path: "mapa", element: <MapaPlanta /> },
          { path: "configuracoes", element: <Configuracoes /> },

          // Administração (a antiga "Governança", agora dissolvida em administração da operação)
          { path: "admin", element: <Gate modulo="Governança"><GovernancaOverview /></Gate> },
          { path: "admin/estrutura", element: <Gate modulo="Governança"><Hierarquia /></Gate> },
          { path: "admin/ciclo", element: <Gate modulo="Governança"><DICI /></Gate> },
          { path: "admin/catalogo", element: <Gate modulo="Governança"><Dicionario /></Gate> },
          { path: "admin/acessos", element: <Gate modulo="RBAC"><RBAC /></Gate> },
          { path: "admin/auditoria", element: <Gate modulo="Governança"><Auditoria /></Gate> },
          // Back-compat redirects from the old /governanca/* URLs
          { path: "governanca", element: <Navigate to="/admin" replace /> },
          { path: "governanca/hierarquia", element: <Navigate to="/admin/estrutura" replace /> },
          { path: "governanca/dici", element: <Navigate to="/admin/ciclo" replace /> },
          { path: "governanca/dicionario", element: <Navigate to="/admin/catalogo" replace /> },
          { path: "governanca/rbac", element: <Navigate to="/admin/acessos" replace /> },
        ],
      },
      { path: "*", element: <Navigate to="/dashboard" replace /> },
    ],
  },
]);
