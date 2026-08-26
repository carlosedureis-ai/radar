import {
  ArrowsClockwise,
  CheckCircle,
  ClockCounterClockwise,
  Headphones,
  ShieldCheck,
  UserFocus,
  XCircle,
} from "@phosphor-icons/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { EmptyState } from "../components/EmptyState";
import { LoadingView } from "../components/LoadingView";
import { useRadarData } from "../data/RadarDataProvider";
import { apiRequest } from "../lib/api";
import type { AdminArtistCandidate, AdminArtistResponse } from "../types";

/*
THESIS: Curadoria é uma fila auditável, não um dashboard genérico nem uma aprovação invisível.
OWN-WORLD: papel marfim, tinta estrutural, ação ultramarina e marcador coral administrativo.
STORY: o administrador vê a fila, reconhece o artista, decide a elegibilidade e recebe o resultado do reprocessamento.
FIRST VIEWPORT: título editorial, marcador coral, contagens imediatas, atualização de dados e filtros sempre acessíveis.
FORM: extensão Operate na identidade Camadas Vivas; concept seed não se aplica a esta adição estreita.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.
*/

type Filter = "waiting" | "cataloged" | "all";

export function AdminArtistsPage() {
  const { session } = useAuth();
  const { me, loading: radarLoading, refresh: refreshRadar } = useRadarData();
  const [data, setData] = useState<AdminArtistResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshingMetadata, setRefreshingMetadata] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("waiting");
  const attemptedMetadata = useRef(false);
  const token = session?.access_token ?? null;

  const load = useCallback(async () => {
    if (!token) return null;
    setError(null);
    try {
      const response = await apiRequest<AdminArtistResponse>("/v1/admin/artists", token);
      setData(response);
      return response;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível abrir a curadoria.");
      return null;
    } finally {
      setLoading(false);
    }
  }, [token]);

  const refreshMetadata = useCallback(async (silent = false) => {
    if (!token) return;
    setRefreshingMetadata(true);
    if (!silent) {
      setNotice(null);
      setError(null);
    }
    try {
      const result = await apiRequest<{ refreshed: number; missing: number }>(
        "/v1/admin/artists/refresh",
        token,
        { method: "POST" },
      );
      await load();
      if (!silent) {
        setNotice(
          result.refreshed > 0
            ? `${result.refreshed} artista${result.refreshed === 1 ? " atualizado" : "s atualizados"} pelo Spotify.`
            : "Os dados dos artistas já estão atualizados.",
        );
      }
    } catch (caught) {
      if (!silent) {
        setError(caught instanceof Error ? caught.message : "Não foi possível consultar o Spotify.");
      }
    } finally {
      setRefreshingMetadata(false);
    }
  }, [load, token]);

  useEffect(() => {
    if (!me?.isAdmin) return;
    void load().then((response) => {
      if (
        response?.items.some((item) => !item.name) &&
        !attemptedMetadata.current
      ) {
        attemptedMetadata.current = true;
        void refreshMetadata(true);
      }
    });
  }, [load, me?.isAdmin, refreshMetadata]);

  const visibleItems = useMemo(() => {
    const items = data?.items ?? [];
    if (filter === "waiting") return items.filter((item) => item.eligibilityStatus === "uncataloged");
    if (filter === "cataloged") return items.filter((item) => item.eligibilityStatus !== "uncataloged");
    return items;
  }, [data?.items, filter]);

  async function saveCandidate(
    candidate: AdminArtistCandidate,
    input: { name: string; isEmerging: boolean; eligibilityStatus: "eligible" | "ineligible" },
  ) {
    if (!token) return;
    setNotice(null);
    setError(null);
    const result = await apiRequest<{
      artistId: string;
      reprocessed: number;
      awarded: number;
      rejected: number;
    }>(
      `/v1/admin/artists/${encodeURIComponent(candidate.provider)}/${encodeURIComponent(candidate.providerArtistId)}`,
      token,
      { method: "PUT", body: JSON.stringify(input) },
    );
    await Promise.all([load(), refreshRadar()]);
    const action = input.eligibilityStatus === "eligible" ? "aprovado" : "marcado como inelegível";
    setNotice(
      `${input.name} foi ${action}. ${result.reprocessed} escuta${result.reprocessed === 1 ? " foi reprocessada" : "s foram reprocessadas"}; ${result.awarded === 1 ? "1 recebeu" : `${result.awarded} receberam`} XP.`,
    );
  }

  if (radarLoading) return <LoadingView label="Verificando acesso à curadoria" />;
  if (!me?.isAdmin) return <Navigate to="/" replace />;

  return (
    <div className="page-stack admin-catalog-page">
      <header className="page-intro admin-intro">
        <div>
          <h1>CURADORIA DE ARTISTAS</h1>
          <p>Reconheça os artistas encontrados nas escutas e decida quem entra no catálogo Radar.</p>
        </div>
        <div className="intro-stamp intro-stamp--admin" aria-hidden="true"><ShieldCheck size={62} weight="fill" /></div>
      </header>

      <section className="catalog-summary" aria-label="Resumo do catálogo">
        <div><span>Aguardando</span><strong>{data?.summary.waiting ?? 0}</strong></div>
        <div><span>Catalogados</span><strong>{data?.summary.cataloged ?? 0}</strong></div>
        <div><span>Escutas na fila</span><strong>{data?.summary.listensWaiting ?? 0}</strong></div>
        <button
          type="button"
          className="button button-primary"
          onClick={() => void refreshMetadata()}
          disabled={refreshingMetadata}
        >
          <ArrowsClockwise size={20} weight="bold" aria-hidden="true" />
          {refreshingMetadata ? "Consultando Spotify" : "Atualizar dados"}
        </button>
      </section>

      {error && <p className="form-message form-message--error" role="alert">{error}</p>}
      {notice && <p className="form-message form-message--success" role="status"><CheckCircle size={20} weight="fill" />{notice}</p>}

      <section className="content-section">
        <div className="catalog-toolbar">
          <div>
            <h2>FILA DE RECONHECIMENTO</h2>
            <p>Aprovar uma entrada reprocessa somente eventos auditados e ainda sem XP.</p>
          </div>
          <div className="catalog-tabs" role="group" aria-label="Filtrar artistas">
            <button type="button" aria-pressed={filter === "waiting"} onClick={() => setFilter("waiting")}>Aguardando</button>
            <button type="button" aria-pressed={filter === "cataloged"} onClick={() => setFilter("cataloged")}>Catalogados</button>
            <button type="button" aria-pressed={filter === "all"} onClick={() => setFilter("all")}>Todos</button>
          </div>
        </div>

        {loading ? (
          <LoadingView label="Organizando a fila" />
        ) : visibleItems.length ? (
          <div className="catalog-list">
            {visibleItems.map((candidate) => (
              <CandidateRow key={`${candidate.provider}:${candidate.providerArtistId}`} candidate={candidate} onSave={saveCandidate} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={filter === "waiting" ? CheckCircle : UserFocus}
            title={filter === "waiting" ? "A fila está em dia" : "Nenhum artista nesta visão"}
            body={filter === "waiting" ? "Novos artistas aparecerão aqui depois das próximas sincronizações." : "Altere o filtro para consultar o restante do catálogo."}
          />
        )}
      </section>
    </div>
  );
}

function CandidateRow({
  candidate,
  onSave,
}: {
  candidate: AdminArtistCandidate;
  onSave: (
    candidate: AdminArtistCandidate,
    input: { name: string; isEmerging: boolean; eligibilityStatus: "eligible" | "ineligible" },
  ) => Promise<void>;
}) {
  const [name, setName] = useState(candidate.name ?? "");
  const [isEmerging, setIsEmerging] = useState(candidate.isEmerging);
  const [busy, setBusy] = useState<"eligible" | "ineligible" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isCataloged = candidate.eligibilityStatus !== "uncataloged";
  const displayName = candidate.name || "Artista sem nome carregado";

  async function submit(eligibilityStatus: "eligible" | "ineligible") {
    const normalizedName = name.trim();
    if (!normalizedName) {
      setError("Atualize os dados do Spotify ou informe o nome do artista.");
      return;
    }
    setBusy(eligibilityStatus);
    setError(null);
    try {
      await onSave(candidate, { name: normalizedName, isEmerging, eligibilityStatus });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível salvar o artista.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <article className="catalog-row">
      <div className="catalog-portrait">
        {candidate.imageUrl ? (
          <img src={candidate.imageUrl} alt={`Foto de ${displayName}`} loading="lazy" />
        ) : (
          <span aria-hidden="true">{displayName.charAt(0).toUpperCase() || "?"}</span>
        )}
      </div>

      <div className="catalog-identity">
        <div className="catalog-status-line">
          <span className={`catalog-status catalog-status--${candidate.eligibilityStatus}`}>
            {statusLabel(candidate.eligibilityStatus)}
          </span>
          <span>Spotify</span>
        </div>
        <label>
          <span>Nome do artista</span>
          <input type="text" value={name} onChange={(event) => setName(event.target.value)} maxLength={120} placeholder="Carregue ou informe o nome" />
        </label>
        <div className="catalog-facts">
          <span><Headphones size={18} weight="bold" />{candidate.listenCount} escuta{candidate.listenCount === 1 ? "" : "s"}</span>
          <span><ClockCounterClockwise size={18} weight="bold" />Última em {new Date(candidate.lastSeenAt).toLocaleDateString("pt-BR")}</span>
          {candidate.followers !== null && <span>{compactNumber(candidate.followers)} seguidores</span>}
          {candidate.popularity !== null && <span>Popularidade {candidate.popularity}/100</span>}
        </div>
        <label className="emerging-check">
          <input type="checkbox" checked={isEmerging} onChange={(event) => setIsEmerging(event.target.checked)} />
          <span><strong>Destaque emergente</strong><small>Aplica o bônus provisório de XP já definido no produto.</small></span>
        </label>
        {error && <p className="catalog-row-error" role="alert">{error}</p>}
      </div>

      <div className="catalog-actions">
        <button type="button" className="button button-primary" onClick={() => void submit("eligible")} disabled={busy !== null}>
          <CheckCircle size={20} weight="bold" />
          {busy === "eligible" ? "Aprovando" : isCataloged ? "Salvar alterações" : "Aprovar no catálogo"}
        </button>
        {!isCataloged && (
          <button type="button" className="button button-secondary" onClick={() => void submit("ineligible")} disabled={busy !== null}>
            <XCircle size={20} weight="bold" />
            {busy === "ineligible" ? "Salvando" : "Marcar inelegível"}
          </button>
        )}
      </div>
    </article>
  );
}

function statusLabel(status: AdminArtistCandidate["eligibilityStatus"]): string {
  if (status === "eligible") return "Elegível";
  if (status === "ineligible") return "Inelegível";
  if (status === "pending") return "Em análise";
  return "Não catalogado";
}

function compactNumber(value: number): string {
  return new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}
