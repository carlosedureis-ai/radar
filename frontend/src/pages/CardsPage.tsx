import { CardsThree, Check, Copy, MagnifyingGlass, SlidersHorizontal, X } from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import { ArtistCardView } from "../components/ArtistCardView";
import { EmptyState } from "../components/EmptyState";
import { LoadingView } from "../components/LoadingView";
import { useRadarData } from "../data/RadarDataProvider";
import { organizeCards, type CardFilter, type CardSort } from "../lib/cards";
import type { ArtistCard } from "../types";

const filters: Array<{ id: CardFilter; label: string }> = [
  { id: "all", label: "Todas" },
  { id: "moving", label: "Nível 2+" },
  { id: "emerging", label: "Emergentes" },
];

export function CardsPage() {
  const { cards, progression, loading, createShare } = useRadarData();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<CardFilter>("all");
  const [sort, setSort] = useState<CardSort>("recent");
  const [sharingId, setSharingId] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const visibleCards = useMemo(() => organizeCards(cards, { query, filter, sort }), [cards, filter, query, sort]);
  const emergingCount = cards.filter((card) => card.isEmerging).length;
  const movingCount = cards.filter((card) => card.level >= 2).length;

  if (loading) return <LoadingView label="Abrindo sua coleção" />;

  async function share(card: ArtistCard) {
    setSharingId(card.artistId);
    setError(null);
    setCopied(false);
    try {
      const url = await createShare(card.artistId);
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
      setError(caught instanceof Error ? caught.message : "Não foi possível gerar o compartilhamento.");
    } finally {
      setSharingId(null);
    }
  }

  async function copy() {
    if (!shareUrl) return;
    setError(null);
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
    } catch {
      setError("O link foi criado, mas o navegador bloqueou a cópia. Abra a prévia e copie pela barra de endereço.");
    }
  }

  function resetView() {
    setQuery("");
    setFilter("all");
    setSort("recent");
  }

  return (
    <div className="page-stack cards-page">
      <header className="page-intro"><div><h1>SUAS CARTAS</h1><p>Uma coleção viva: cada artista ocupa seu lugar e ganha novas camadas conforme suas escutas verificadas.</p></div></header>

      {cards.length > 0 && (
        <section className="collection-index" aria-label="Resumo da coleção">
          <strong>{cards.length} {cards.length === 1 ? "artista" : "artistas"}</strong>
          <span>{movingCount} em níveis avançados</span>
          <span>{emergingCount} {emergingCount === 1 ? "emergente" : "emergentes"}</span>
        </section>
      )}

      {error && <p className="form-message form-message--error" role="alert">{error}</p>}
      {shareUrl && (
        <section className="share-result" aria-live="polite">
          <div><strong>Link da carta criado</strong><span>O snapshot não expõe e-mail nem histórico. <a href={shareUrl}>Abrir prévia</a></span></div>
          <button className="button button-secondary button-small" type="button" onClick={() => void copy()}>
            {copied ? <Check size={19} weight="bold" /> : <Copy size={19} weight="bold" />}{copied ? "Copiado" : "Copiar link"}
          </button>
        </section>
      )}

      {cards.length ? (
        <>
          <section className="collection-toolbar" aria-label="Organizar coleção">
            <label className="collection-search">
              <span className="visually-hidden">Buscar artista</span>
              <MagnifyingGlass size={20} weight="bold" aria-hidden="true" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar artista" type="search" />
              {query && <button type="button" onClick={() => setQuery("")} aria-label="Limpar busca"><X size={18} weight="bold" /></button>}
            </label>
            <div className="collection-filters" aria-label="Filtrar cartas">
              {filters.map((item) => <button key={item.id} type="button" aria-pressed={filter === item.id} onClick={() => setFilter(item.id)}>{item.label}</button>)}
            </div>
            <label className="collection-sort">
              <SlidersHorizontal size={20} weight="bold" aria-hidden="true" />
              <span className="visually-hidden">Ordenar cartas</span>
              <select value={sort} onChange={(event) => setSort(event.target.value as CardSort)}>
                <option value="recent">Último avanço</option><option value="level">Maior nível</option><option value="listens">Mais escutas</option><option value="name">Nome A–Z</option>
              </select>
            </label>
          </section>

          <div className="collection-results-heading"><h2>{visibleCards.length} {visibleCards.length === 1 ? "carta encontrada" : "cartas encontradas"}</h2><span>As cores e camadas representam o nível, não a posição na grade.</span></div>

          {visibleCards.length ? (
            <div className="card-grid card-grid--collection">
              {visibleCards.map((card) => <ArtistCardView key={card.artistId} card={card} rules={progression?.rules} onShare={(item) => void share(item)} sharing={sharingId === card.artistId} />)}
            </div>
          ) : (
            <EmptyState icon={CardsThree} title="Nenhuma carta nesta seleção" body="Mude o filtro ou limpe a busca para reencontrar artistas da sua coleção." action={<button className="button button-secondary" type="button" onClick={resetView}>Mostrar todas</button>} />
          )}
        </>
      ) : (
        <EmptyState icon={CardsThree} title="Sua coleção ainda está vazia" body="Conecte uma plataforma e sincronize suas escutas para formar as primeiras cartas." />
      )}
    </div>
  );
}
