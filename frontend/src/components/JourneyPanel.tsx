import { ArrowRight, CheckCircle, Circle } from "@phosphor-icons/react";
import { Link } from "react-router-dom";
import { journeyMilestones } from "../lib/journey";
import type { JourneyStats } from "../types";

export function JourneyPanel({ stats }: { stats: JourneyStats }) {
  const milestones = journeyMilestones(stats);
  const next = milestones.find((milestone) => !milestone.complete) ?? null;
  const completed = milestones.filter((milestone) => milestone.complete).length;
  const percent = next ? Math.min(100, (next.current / next.target) * 100) : 100;

  return (
    <section className="journey-panel" aria-labelledby="journey-title">
      <header className="journey-header">
        <div>
          <h2 id="journey-title">JORNADA RADAR</h2>
          <p>Marcos da história que suas escutas verificadas já construíram.</p>
        </div>
        <strong>{completed}/{milestones.length} marcos</strong>
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
    </section>
  );
}
