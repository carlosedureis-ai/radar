import { Link } from "react-router-dom";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link className="brand" to="/" aria-label="Radar, página inicial">
      <img src="/radar-app-icon.svg" alt="" width="44" height="44" />
      {!compact && <span>RADAR</span>}
    </Link>
  );
}
