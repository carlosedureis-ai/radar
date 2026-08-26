import { ArrowLeft, CheckCircle, Circle, MusicNotes, SealCheck } from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { Brand } from "../components/Brand";
import { LoadingView } from "../components/LoadingView";
import { apiRequest } from "../lib/api";
import { completedJourneyMilestones, journeyComparison, journeyMilestones } from "../lib/journey";
import { formatXp } from "../lib/progression";
import type { Progression, PublicJourneyShare } from "../types";

export function JourneySharePage() {
  const { token = "" } = useParams();
  const { session, loading: authLoading } = useAuth();
  const [share, setShare] = useState<PublicJourneyShare | null>(null);
  const [current, setCurrent] = useState<Progression | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [comparisonError, setComparisonError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    void apiRequest<PublicJourneyShare>(`/v1/journey-shares/${encodeURIComponent(token)}`, null)
      .then(setShare)
      .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : "Jornada compartilhada não encontrada."));
  }, [token]);

  useEffect(() => {
    setCurrent(null);
    setComparisonError(null);
    if (!session?.access_token) return;
    void apiRequest<Progression>("/v1/progression", session.access_token)
      .then(setCurrent)
      .catch((caught: unknown) => setComparisonError(caught instanceof Error ? caught.message : "Não foi possível carregar sua jornada."));
  }, [session?.access_token]);

  const milestones = useMemo(() => share ? journeyMilestones(share.journey) : [], [share]);
  const comparison = useMemo(() => share && current ? journeyComparison(share, current) : [], [current, share]);
  const returnPath = `/jornada/${encodeURIComponent(token)}`;

  if (!share && !error) return <LoadingView label="Abrindo esta Jornada Radar" />;
  return (
    <main className="journey-share-page">
      <header><Brand /><Link to="/"><ArrowLeft size={18} weight="bold" />Abrir Radar</Link></header>
      {error ? (
        <section className="share-error"><MusicNotes size={42} weight="duotone" /><h1>LINK INDISPONÍVEL</h1><p>{error}</p></section>
      ) : share && (
        <>
          <section className="shared-journey" aria-labelledby="shared-journey-title">
            <div className="shared-journey__layer shared-journey__layer--one" aria-hidden="true" />
            <div className="shared-journey__layer shared-journey__layer--two" aria-hidden="true" />
            <div className="shared-journey__front">
              <header>
                <div>
                  <h1 id="shared-journey-title">UMA HISTÓRIA EM CAMADAS</h1>
                  <p>Snapshot verificado em {new Date(share.createdAt).toLocaleDateString("pt-BR")}.</p>
                </div>
                <div className="shared-journey__score"><strong>{completedJourneyMilestones(share.journey)}</strong><span>de 4 marcos</span></div>
              </header>
              <dl className="shared-journey__facts">
                <div><dt>Nível da conta</dt><dd>{share.accountLevel}</dd></div>
                <div><dt>XP acumulado</dt><dd>{formatXp(share.accountXp)}</dd></div>
                <div><dt>Artistas na coleção</dt><dd>{share.journey.artistCount}</dd></div>
                <div><dt>Escutas válidas</dt><dd>{share.journey.qualifiedListenCount}</dd></div>
              </dl>
              <ol className="shared-journey__milestones" aria-label="Marcos desta jornada">
                {milestones.map((milestone) => (
                  <li key={milestone.id} data-complete={milestone.complete}>
                    {milestone.complete ? <CheckCircle size={24} weight="fill" /> : <Circle size={23} />}
                    <div><strong>{milestone.title}</strong><span>{milestone.complete ? "Concluído" : `${Math.min(milestone.current, milestone.target)} de ${milestone.target}`}</span></div>
                  </li>
                ))}
              </ol>
              <span className="shared-journey__seal"><SealCheck size={20} weight="fill" />Sem músicas, horários ou identidade pública</span>
            </div>
          </section>

          <section className="journey-comparison" aria-labelledby="comparison-title">
            <div className="journey-comparison__intro">
              <h2 id="comparison-title">DUAS JORNADAS, LADO A LADO</h2>
              <p>Compare caminhos musicais sem transformar gosto em disputa.</p>
            </div>
            {current ? (
              <div className="journey-comparison__table" role="table" aria-label="Comparação entre a jornada compartilhada e a sua jornada">
                <div className="journey-comparison__head" role="row"><span role="columnheader">Trajetória</span><strong role="columnheader">Esta jornada</strong><strong role="columnheader">Sua jornada</strong></div>
                {comparison.map((row) => <div className="journey-comparison__row" role="row" key={row.id}><span role="rowheader">{row.label}</span><strong role="cell">{row.shared}</strong><strong role="cell">{row.current}</strong></div>)}
              </div>
            ) : comparisonError ? (
              <p className="form-message form-message--error" role="alert">{comparisonError}</p>
            ) : authLoading || session ? (
              <p className="journey-comparison__waiting">Preparando sua jornada para a comparação…</p>
            ) : (
              <div className="journey-comparison__invite">
                <p>Entre no Radar para colocar sua própria jornada ao lado desta.</p>
                <Link className="button button-primary" to={`/entrar?voltar=${encodeURIComponent(returnPath)}`}>Entrar para comparar</Link>
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}
