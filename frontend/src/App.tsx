import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth/AuthProvider";
import { AppShell } from "./components/AppShell";
import { LoadingView } from "./components/LoadingView";

const AccountPage = lazy(() => import("./pages/AccountPage").then((module) => ({ default: module.AccountPage })));
const AdminArtistsPage = lazy(() => import("./pages/AdminArtistsPage").then((module) => ({ default: module.AdminArtistsPage })));
const AuthPage = lazy(() => import("./pages/AuthPage").then((module) => ({ default: module.AuthPage })));
const CardsPage = lazy(() => import("./pages/CardsPage").then((module) => ({ default: module.CardsPage })));
const ConnectionsPage = lazy(() => import("./pages/ConnectionsPage").then((module) => ({ default: module.ConnectionsPage })));
const HomePage = lazy(() => import("./pages/HomePage").then((module) => ({ default: module.HomePage })));
const ListensPage = lazy(() => import("./pages/ListensPage").then((module) => ({ default: module.ListensPage })));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage").then((module) => ({ default: module.NotFoundPage })));
const PasswordResetPage = lazy(() => import("./pages/PasswordResetPage").then((module) => ({ default: module.PasswordResetPage })));
const SharePage = lazy(() => import("./pages/SharePage").then((module) => ({ default: module.SharePage })));

function PrivateApp() {
  const { session, loading } = useAuth();
  if (loading) return <LoadingView label="Confirmando sua sessão" />;
  if (!session) return <Navigate to="/entrar" replace />;
  return <AppShell />;
}

function AuthRoute() {
  const { session, loading } = useAuth();
  if (loading) return <LoadingView label="Confirmando sua sessão" />;
  if (session) return <Navigate to="/" replace />;
  return <AuthPage />;
}

function PasswordResetRoute() {
  const { loading } = useAuth();
  if (loading) return <LoadingView label="Validando seu link de recuperação" />;
  return <PasswordResetPage />;
}

export function App() {
  return (
    <Suspense fallback={<LoadingView />}>
      <Routes>
        <Route path="/entrar" element={<AuthRoute />} />
        <Route path="/redefinir-senha" element={<PasswordResetRoute />} />
        <Route path="/compartilhar/:token" element={<SharePage />} />
        <Route element={<PrivateApp />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/cartas" element={<CardsPage />} />
          <Route path="/escutas" element={<ListensPage />} />
          <Route path="/conexoes" element={<ConnectionsPage />} />
          <Route path="/conta" element={<AccountPage />} />
          <Route path="/admin/artistas" element={<AdminArtistsPage />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
