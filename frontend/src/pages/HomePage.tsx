import { ArrowRight, CardsThree, Headphones, PlugsConnected } from "@phosphor-icons/react";
import { Link } from "react-router-dom";
import { AccountProgress } from "../components/AccountProgress";
import { ArtistCardView } from "../components/ArtistCardView";
import { EmptyState } from "../components/EmptyState";
import { LoadingView } from "../components/LoadingView";
import { JourneyPanel } from "../components/JourneyPanel";
import { useRadarData } from "../data/RadarDataProvider";

export function HomePage() {
  const { loading, progression, cards, listens, connections, createJourneyShare } = useRadarData();
  if (loading) return <LoadingView />;

  const connected = connections.some((connection) => connection.status === "active");
  return (
    <div className="page-stack">
      <header className="page-intro page-intro--home">
        <div>
          <p className="section-label">SEU RADAR</p>
          <h1>{progression?.account.displayName ? `OLÁ, ${progression.account.displayName.toUpperCase()}` : "SUA MÚSICA, EM CAMADAS"}</h1>
          <p>Acompanhe o que suas escutas reais estão construindo.</p>
        </div>
        <div className="intro-stamp" aria-hidden="true">R</div>
      </header>

      {progression && <AccountProgress progression={progression} />}

      {progression && <JourneyPanel stats={progression.journey} onCreateShare={createJourneyShare} />}

      {!connected && (
        <EmptyState
          icon={PlugsConnected}
          title="Conecte sua primeira plataforma"
          body="O Radar usa seu histórico autorizado para reconhecer escutas e criar progresso."
          action={<Link className="button button-primary" to="/conexoes">Conectar Spotify <ArrowRight size={20} weight="bold" /></Link>}
        />
      )}

      <section className="content-section">
        <div className="section-heading">
          <div><h2>CARTAS EM MOVIMENTO</h2><p>As cartas que mais avançaram na sua coleção.</p></div>
          <Link to="/cartas">Ver todas <ArrowRight size={18} weight="bold" /></Link>
        </div>
        {cards.length ? (
          <div className="card-grid card-grid--preview">
            {cards.slice(0, 2).map((card) => <ArtistCardView key={card.artistId} card={card} rules={progression?.rules} />)}
          </div>
        ) : (
          <EmptyState icon={CardsThree} title="Suas cartas começam com uma escuta" body="Depois da primeira sincronização válida, cada artista reconhecido ganha sua própria carta." />
        )}
      </section>

      <section className="content-section">
        <div className="section-heading">
          <div><h2>ESCUTAS RECENTES</h2><p>Eventos verificados pelo servidor, com XP e motivo registrados.</p></div>
          <Link to="/escutas">Abrir histórico <ArrowRight size={18} weight="bold" /></Link>
        </div>
        {listens.length ? <RecentListens items={listens.slice(0, 4)} /> : <EmptyState icon={Headphones} title="Nada sincronizado ainda" body="Conecte o Spotify e sincronize para trazer as escutas recentes." />}
      </section>
    </div>
  );
}

function RecentListens({ items }: { items: ReturnType<typeof useRadarData>["listens"] }) {
  return (
    <div className="listen-list">
      {items.map((listen) => (
        <article key={listen.id} className="listen-row">
          <div><strong>{listen.artistName || "Artista ainda não catalogado"}</strong><span>{new Date(listen.playedAt).toLocaleString("pt-BR")}</span></div>
          <span className={listen.qualified ? "xp-positive" : "xp-neutral"}>{listen.qualified ? `+${listen.xpAwarded} XP` : "Sem XP"}</span>
        </article>
      ))}
    </div>
  );
}
