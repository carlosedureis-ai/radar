import {
  CardsThree,
  Headphones,
  House,
  PlugsConnected,
  UserCircle,
  ShieldCheck,
} from "@phosphor-icons/react";
import { NavLink, Outlet } from "react-router-dom";
import { RadarDataProvider, useRadarData } from "../data/RadarDataProvider";
import { Brand } from "./Brand";

const baseNavItems = [
  { to: "/", label: "Início", icon: House, end: true },
  { to: "/cartas", label: "Cartas", icon: CardsThree },
  { to: "/escutas", label: "Escutas", icon: Headphones },
  { to: "/conexoes", label: "Conexões", icon: PlugsConnected },
  { to: "/conta", label: "Conta", icon: UserCircle },
];

function ShellContent() {
  const { error, me, refresh, refreshing } = useRadarData();
  const navItems = me?.isAdmin
    ? [...baseNavItems, { to: "/admin/artistas", label: "Admin", icon: ShieldCheck }]
    : baseNavItems;
  return (
    <div className="app-frame">
      <header className="topbar">
        <Brand />
        <nav className="desktop-nav" aria-label="Navegação principal">
          {navItems.map(({ to, label, end }) => (
            <NavLink key={to} to={to} end={end}>{label}</NavLink>
          ))}
        </nav>
      </header>

      {error && (
        <div className="global-error" role="alert">
          <span>{error}</span>
          <button type="button" onClick={() => void refresh()} disabled={refreshing}>
            {refreshing ? "Tentando" : "Tentar de novo"}
          </button>
        </div>
      )}

      <main className="app-main">
        <Outlet />
      </main>

      <nav className={`bottom-nav${me?.isAdmin ? " bottom-nav--admin" : ""}`} aria-label="Navegação principal">
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end}>
            <Icon size={23} weight="bold" aria-hidden="true" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

export function AppShell() {
  return (
    <RadarDataProvider>
      <ShellContent />
    </RadarDataProvider>
  );
}
