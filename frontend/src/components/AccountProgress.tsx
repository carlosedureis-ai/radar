import { formatXp, progressWindow } from "../lib/progression";
import type { Progression } from "../types";

export function AccountProgress({ progression }: { progression: Progression }) {
  const window = progressWindow(progression.rules, "account", progression.account.xp);
  const levelName = window.current?.name || `Nível ${progression.account.level}`;
  const progressLabel = window.next
    ? `${formatXp(window.remainingXp)} XP para ${window.next.name}`
    : "Nível máximo atual alcançado";

  return (
    <section className="account-progress" aria-labelledby="account-progress-title">
      <div>
        <p className="section-label">SUA CONTA</p>
        <h2 id="account-progress-title">{levelName}</h2>
        <p>{formatXp(progression.account.xp)} XP acumulados</p>
      </div>
      <div className="level-number" aria-label={`Nível ${progression.account.level}`}>
        {String(progression.account.level).padStart(2, "0")}
      </div>
      <div
        className="progress-track"
        role="progressbar"
        aria-label="Progresso da conta"
        aria-valuemin={window.current?.minXp ?? 0}
        aria-valuemax={window.next?.minXp ?? progression.account.xp}
        aria-valuenow={progression.account.xp}
        aria-valuetext={progressLabel}
      >
        <span style={{ width: `${window.percent}%` }} />
      </div>
      <p className="progress-copy">{progressLabel}</p>
    </section>
  );
}
