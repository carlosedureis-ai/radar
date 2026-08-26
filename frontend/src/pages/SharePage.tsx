import { ArrowLeft, MusicNotes, SealCheck } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Brand } from "../components/Brand";
import { LoadingView } from "../components/LoadingView";
import { apiRequest } from "../lib/api";
import { formatXp } from "../lib/progression";
import type { PublicShare } from "../types";

export function SharePage() {
  const { token = "" } = useParams();
  const [share, setShare] = useState<PublicShare | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void apiRequest<PublicShare>(`/v1/shares/${encodeURIComponent(token)}`, null)
      .then(setShare)
      .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : "Compartilhamento não encontrado."));
  }, [token]);

  if (!share && !error) return <LoadingView label="Revelando esta carta" />;
  return (
    <main className="share-page">
      <header><Brand /><Link to="/"><ArrowLeft size={18} weight="bold" />Abrir Radar</Link></header>
      {error ? (
        <section className="share-error"><MusicNotes size={42} weight="duotone" /><h1>LINK INDISPONÍVEL</h1><p>{error}</p></section>
      ) : share && (
        <section className="shared-card">
          <div className="shared-card__layer shared-card__layer--one" aria-hidden="true" />
          <div className="shared-card__layer shared-card__layer--two" aria-hidden="true" />
          <div className="shared-card__front">
            <p>CARTA RADAR</p>
            <div className="shared-card__initial" aria-hidden="true">{share.artistName.slice(0, 1).toUpperCase()}</div>
            <h1>{share.artistName}</h1>
            <dl><div><dt>Nível da carta</dt><dd>{share.cardLevel}</dd></div><div><dt>XP</dt><dd>{formatXp(share.cardXp)}</dd></div><div><dt>Nível da conta</dt><dd>{share.accountLevel}</dd></div></dl>
            <span className="shared-card__seal"><SealCheck size={20} weight="fill" />Snapshot verificado pelo Radar</span>
          </div>
        </section>
      )}
    </main>
  );
}
