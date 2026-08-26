import { ShareNetwork } from "@phosphor-icons/react";
import { formatXp } from "../lib/progression";
import type { ArtistCard } from "../types";

export function ArtistCardView({
  card,
  onShare,
  sharing = false,
}: {
  card: ArtistCard;
  onShare?(card: ArtistCard): void;
  sharing?: boolean;
}) {
  return (
    <article className="artist-card">
      <div className="artist-card__underlay" aria-hidden="true" />
      <div className="artist-card__sheet">
        <div className="artist-card__meta">
          <span>NÍVEL {card.level}</span>
          {card.isEmerging && <span className="achievement-chip">EMERGENTE</span>}
        </div>
        <div className="artist-card__portrait" aria-hidden="true">
          <span>{card.artistName.slice(0, 1).toUpperCase()}</span>
        </div>
        <div>
          <h2>{card.artistName}</h2>
          <p>{formatXp(card.xp)} XP · {card.listenCount} escutas válidas</p>
        </div>
        {onShare && (
          <button className="button button-secondary button-small" type="button" onClick={() => onShare(card)} disabled={sharing}>
            <ShareNetwork size={19} weight="bold" aria-hidden="true" />
            {sharing ? "Gerando" : "Compartilhar"}
          </button>
        )}
      </div>
    </article>
  );
}
