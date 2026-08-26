import { ArrowRight, Check, CheckCircle, Circle, Copy, ShareNetwork } from "@phosphor-icons/react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { journeyMilestones } from "../lib/journey";
import type { JourneyStats } from "../types";

export function JourneyPanel({
  stats,
  onCreateShare,
}: {
  stats: JourneyStats;
  onCreateShare: () => Promise<string>;
}) {
  const milestones = journeyMilestones(stats);
  const next = milestones.find((milestone) => !milestone.complete) ?? null;
  const completed = milestones.filter((milestone) => milestone.complete).length;
  const percent = next ? Math.min(100, (next.current / next.target) * 100) : 100;
  const [sharing, setSharing] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);

  async function shareJourney() {
    setSharing(true);
    setShareError(null);
    setCopied(false);
    try {
      const url = await onCreateShare();
      setShareUrl(url);
      if (navigator.clipboard) {
        try {
          await navigator.clipboard.writeText(url);
          setCopied(true);
        } catch {
          setCopied(false);
        }
      }
    } catch (caught) {
      setShareError(caught instanceof Error ? caught.message : "Não foi possível criar o link da jornada.");
    } finally {
      setSharing(false);
    }
  }

  async function copyShare() {
    if (!shareUrl) return;
    setShareError(null);
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
    } catch {
      setShareError("O link foi criado, mas o navegador bloqueou a cópia. Abra a prévia e copie pela barra de endereço.");
    }
  }

  return (
    <section className="journey-panel" aria-labelledby="journey-title">
      <header className="journey-header">
        <div>
          <h2 id="journey-title">JORNADA RADAR</h2>
          <p>Marcos da história que suas escutas verificadas já construíram.</p>
        </div>
        <div className="journey-header__actions">
          <strong>{completed}/{milestones.length} marcos</strong>
          <button className="button button-secondary button-small" type="button" onClick={() => void shareJourney()} disabled={sharing}>
            <ShareNetwork size={18} weight="bold" />{sharing ? "Criando link" : "Compartilhar jornada"}
          </button>
        </div>
      </header>

      <div className="journey-layout">
        <article className="journey-next">
          <span className="journey-tab">{next ? "PRÓXIMA CAMADA" : "CAPÍTULO COMPLETO"}</span>
          {next ? (
            <>
              <div className="journey-next__copy">
                <h3>{next.title}</h3>
                <p>{next.description}</p>
              </div>
              <div
                className="journey-progress"
                role="progressbar"
                aria-label={`Progresso de ${next.title}`}
                aria-valuemin={0}
                aria-valuemax={next.target}
                aria-valuenow={Math.min(next.current, next.target)}
                aria-valuetext={`${Math.min(next.current, next.target)} de ${next.target} ${next.unit}`}
              >
                <span style={{ width: `${percent}%` }} />
              </div>
              <div className="journey-next__footer">
                <strong>{Math.min(next.current, next.target)} / {next.target} {next.unit}</strong>
                <Link to={next.href}>{next.action}<ArrowRight size={18} weight="bold" /></Link>
              </div>
            </>
          ) : (
            <>
              <div className="journey-next__copy">
                <h3>Seu primeiro capítulo está registrado.</h3>
                <p>Continue escutando: novas camadas serão adicionadas sem apagar o que você já conquistou.</p>
              </div>
              <Link className="button button-primary" to="/cartas">Ver coleção<ArrowRight size={18} weight="bold" /></Link>
            </>
          )}
        </article>

        <ol className="journey-track" aria-label="Marcos da Jornada Radar">
          {milestones.map((milestone, index) => {
            const isCurrent = milestone.id === next?.id;
            return (
              <li key={milestone.id} data-state={milestone.complete ? "complete" : isCurrent ? "current" : "upcoming"}>
                <span className="journey-track__icon" aria-hidden="true">
                  {milestone.complete ? <CheckCircle size={24} weight="fill" /> : <Circle size={22} weight={isCurrent ? "bold" : "regular"} />}
                </span>
                <div>
                  <span>MARCO {String(index + 1).padStart(2, "0")}</span>
                  <strong>{milestone.title}</strong>
                  <small>{milestone.complete ? "Concluído" : `${Math.min(milestone.current, milestone.target)} de ${milestone.target}`}</small>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
      <p className="journey-note">Marcos não dão XP extra: eles tornam visível o progresso que já veio das suas escutas.</p>
      {shareError && <p className="journey-share-error" role="alert">{shareError}</p>}
      {shareUrl && (
        <div className="journey-share-result" aria-live="polite">
          <div><strong>Jornada pronta para compartilhar</strong><span>O link mostra apenas totais de progresso, sem músicas, horários ou identidade. <a href={shareUrl}>Abrir prévia</a></span></div>
          <button className="button button-secondary button-small" type="button" onClick={() => void copyShare()}>
            {copied ? <Check size={18} weight="bold" /> : <Copy size={18} weight="bold" />}{copied ? "Copiado" : "Copiar link"}
          </button>
        </div>
      )}
    </section>
  );
}
