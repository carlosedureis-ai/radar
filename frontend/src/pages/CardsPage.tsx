import { CardsThree, Check, Copy } from "@phosphor-icons/react";
import { useState } from "react";
import { ArtistCardView } from "../components/ArtistCardView";
import { EmptyState } from "../components/EmptyState";
import { LoadingView } from "../components/LoadingView";
import { useRadarData } from "../data/RadarDataProvider";
import type { ArtistCard } from "../types";

export function CardsPage() {
  const { cards, loading, createShare } = useRadarData();
  const [sharingId, setSharingId] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (loading) return <LoadingView label="Abrindo sua coleção" />;

  async function share(card: ArtistCard) {
    setSharingId(card.artistId);
    setError(null);
    try {
      const url = await createShare(card.artistId);
      setShareUrl(url);
      await navigator.clipboard?.writeText(url);
      setCopied(Boolean(navigator.clipboard));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível gerar o compartilhamento.");
    } finally {
      setSharingId(null);
    }
  }

  async function copy() {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
  }

  return (
    <div className="page-stack">
      <header className="page-intro"><div><p className="section-label">COLEÇÃO</p><h1>SUAS CARTAS</h1><p>Cada nível acrescenta matéria à história que você construiu com um artista.</p></div></header>
      {error && <p className="form-message form-message--error" role="alert">{error}</p>}
      {shareUrl && (
        <section className="share-result" aria-live="polite">
          <div><strong>Link criado</strong><span>O snapshot não expõe e-mail nem dados privados.</span></div>
          <button className="button button-secondary button-small" type="button" onClick={() => void copy()}>
            {copied ? <Check size={19} weight="bold" /> : <Copy size={19} weight="bold" />}
            {copied ? "Copiado" : "Copiar link"}
          </button>
        </section>
      )}
      {cards.length ? (
        <div className="card-grid">
          {cards.map((card) => <ArtistCardView key={card.artistId} card={card} onShare={(item) => void share(item)} sharing={sharingId === card.artistId} />)}
        </div>
      ) : (
        <EmptyState icon={CardsThree} title="Sua coleção ainda está vazia" body="Conecte uma plataforma e sincronize suas escutas para formar as primeiras cartas." />
      )}
    </div>
  );
}
