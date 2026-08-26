import { ShareNetwork } from "@phosphor-icons/react";
import { formatXp, progressWindow } from "../lib/progression";
import type { ArtistCard, ProgressionRule } from "../types";

export function ArtistCardView({
  card,
  onShare,
  sharing = false,
  rules = [],
}: {
  card: ArtistCard;
  onShare?(card: ArtistCard): void;
  sharing?: boolean;
  rules?: ProgressionRule[];
}) {
  const window = progressWindow(rules, "card", card.xp);
  const levelName = window.current?.name ?? `Nível ${card.level}`;
  const progressLabel = window.next
    ? `${formatXp(window.remainingXp)} XP para ${window.next.name}`
    : "Evolução máxima atual";

  return (
    <article className="artist-card" data-level={Math.min(5, Math.max(1, card.level))}>
      <div className="artist-card__underlay" aria-hidden="true" />
      <div className="artist-card__level-layer" aria-hidden="true" />
      <div className="artist-card__sheet">
        <div className="artist-card__meta">
          <span>NÍVEL {card.level} · {levelName.toUpperCase()}</span>
          {card.isEmerging && <span className="achievement-chip">EMERGENTE</span>}
        </div>
        <div className="artist-card__portrait" aria-hidden="true">
          <span>{card.artistName.slice(0, 1).toUpperCase()}</span>
        </div>
        <div>
          <h2>{card.artistName}</h2>
          <dl className="artist-card__facts">
            <div><dt>XP da carta</dt><dd>{formatXp(card.xp)}</dd></div>
            <div><dt>Escutas válidas</dt><dd>{card.listenCount}</dd></div>
          </dl>
        </div>
        <div className="artist-card__progress">
          <div
            className="artist-card__progress-track"
            role="progressbar"
            aria-label={`Evolução da carta de ${card.artistName}`}
            aria-valuemin={window.current?.minXp ?? 0}
            aria-valuemax={window.next?.minXp ?? card.xp}
            aria-valuenow={card.xp}
            aria-valuetext={progressLabel}
          ><span style={{ width: `${window.percent}%` }} /></div>
          <span>{progressLabel}</span>
        </div>
        {onShare && (
          <button className="artist-card__share" type="button" onClick={() => onShare(card)} disabled={sharing}>
            <ShareNetwork size={19} weight="bold" aria-hidden="true" />
            {sharing ? "Gerando" : "Compartilhar"}
          </button>
        )}
      </div>
    </article>
  );
}
