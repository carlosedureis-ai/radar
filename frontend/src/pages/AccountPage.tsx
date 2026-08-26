import { CalendarBlank, EnvelopeSimple, SignOut, UserCircle } from "@phosphor-icons/react";
import { useState } from "react";
import { useAuth } from "../auth/AuthProvider";
import { AccountProgress } from "../components/AccountProgress";
import { LoadingView } from "../components/LoadingView";
import { useRadarData } from "../data/RadarDataProvider";

export function AccountPage() {
  const { signOut } = useAuth();
  const { me, progression, loading } = useRadarData();
  const [busy, setBusy] = useState(false);
  if (loading) return <LoadingView label="Abrindo sua conta" />;
  return (
    <div className="page-stack">
      <header className="page-intro"><div><p className="section-label">IDENTIDADE</p><h1>SUA CONTA</h1><p>O nível da conta reúne sua jornada sem esconder como o progresso foi calculado.</p></div></header>
      {progression && <AccountProgress progression={progression} />}
      <section className="profile-sheet">
        <div className="profile-avatar" aria-hidden="true"><UserCircle size={46} weight="duotone" /></div>
        <div className="profile-name"><h2>{me?.displayName || "Ouvinte Radar"}</h2><span>Nível {me?.accountLevel ?? 1}</span></div>
        <dl>
          <div><dt><EnvelopeSimple size={19} weight="bold" />E-mail</dt><dd>{me?.email || "Não informado"}</dd></div>
          <div><dt><CalendarBlank size={19} weight="bold" />No Radar desde</dt><dd>{me?.createdAt ? new Date(me.createdAt).toLocaleDateString("pt-BR", { dateStyle: "long" }) : "Agora"}</dd></div>
        </dl>
        <button className="button button-secondary" type="button" disabled={busy} onClick={() => { setBusy(true); void signOut().finally(() => setBusy(false)); }}><SignOut size={20} weight="bold" />{busy ? "Saindo" : "Sair da conta"}</button>
      </section>
      {progression?.rules.some((rule) => rule.provisional) && <p className="provisional-note">As faixas atuais de XP são provisórias e serão validadas antes do lançamento público.</p>}
    </div>
  );
}
