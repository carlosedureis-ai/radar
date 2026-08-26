import { CheckCircle, Headphones, Info, XCircle } from "@phosphor-icons/react";
import { EmptyState } from "../components/EmptyState";
import { LoadingView } from "../components/LoadingView";
import { useRadarData } from "../data/RadarDataProvider";

const reasonLabels: Record<string, string> = {
  duplicate: "Evento repetido",
  "repeat-too-soon": "Faixa repetida em intervalo curto",
  "daily-artist-cap": "Limite diário do artista alcançado",
  "artist-not-in-catalog": "Artista ainda não catalogado",
  "artist-pending": "Artista aguardando elegibilidade",
  "artist-ineligible": "Artista fora da progressão",
};

export function ListensPage() {
  const { listens, loading } = useRadarData();
  if (loading) return <LoadingView label="Lendo seu histórico" />;
  return (
    <div className="page-stack">
      <header className="page-intro"><div><p className="section-label">AUDITÁVEL</p><h1>ESCUTAS</h1><p>Você vê o que contou, quanto valeu e por que um evento não gerou XP.</p></div></header>
      {listens.length ? (
        <div className="activity-timeline">
          {listens.map((listen) => (
            <article className="activity-item" key={listen.id}>
              <span className={listen.qualified ? "activity-icon activity-icon--ok" : "activity-icon"}>
                {listen.qualified ? <CheckCircle size={22} weight="fill" /> : <XCircle size={22} weight="fill" />}
              </span>
              <div className="activity-copy">
                <h2>{listen.artistName || "Artista não catalogado"}</h2>
                <p>{new Date(listen.playedAt).toLocaleString("pt-BR", { dateStyle: "medium", timeStyle: "short" })}</p>
                {!listen.qualified && <span><Info size={16} weight="bold" />{reasonLabels[listen.rejectionReason || ""] || "Escuta não qualificada"}</span>}
              </div>
              <strong className={listen.qualified ? "xp-positive" : "xp-neutral"}>{listen.qualified ? `+${listen.xpAwarded} XP` : "0 XP"}</strong>
            </article>
          ))}
        </div>
      ) : <EmptyState icon={Headphones} title="Sem escutas sincronizadas" body="Quando você sincronizar uma plataforma, os eventos aparecerão aqui com o resultado da validação." />}
    </div>
  );
}
