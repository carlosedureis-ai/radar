import { ArrowsClockwise, CheckCircle, LinkSimple, PlugsConnected, Trash } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { LoadingView } from "../components/LoadingView";
import { useRadarData } from "../data/RadarDataProvider";
import { formatXp } from "../lib/progression";
import type { SpotifySyncResult } from "../types";

export function ConnectionsPage() {
  const { connections, loading, connectSpotify, syncSpotify, disconnectProvider } = useRadarData();
  const [searchParams, setSearchParams] = useSearchParams();
  const [busy, setBusy] = useState<"connect" | "sync" | "disconnect" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<SpotifySyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const spotify = connections.find((connection) => connection.provider === "spotify" && connection.status === "active");

  useEffect(() => {
    if (searchParams.get("provider") === "spotify" && searchParams.get("status") === "connected") {
      setMessage("Spotify conectado. Agora você pode sincronizar suas escutas.");
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  if (loading) return <LoadingView label="Verificando suas conexões" />;

  async function run(action: "connect" | "sync" | "disconnect") {
    setBusy(action);
    setError(null);
    setMessage(null);
    setSyncResult(null);
    try {
      if (action === "connect") await connectSpotify();
      if (action === "sync") {
        const result = await syncSpotify();
        setSyncResult(result);
      }
      if (action === "disconnect") {
        const confirmed = window.confirm("Desconectar o Spotify? As cartas e o histórico já registrados serão preservados.");
        if (!confirmed) return;
        await disconnectProvider("spotify");
        setMessage("Spotify desconectado. Seu progresso foi preservado.");
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível concluir a ação.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="page-stack">
      <header className="page-intro"><div><p className="section-label">ESCUTE FORA DO APP</p><h1>CONEXÕES</h1><p>Você escolhe a plataforma e autoriza o acesso. O Radar nunca pede sua senha musical.</p></div></header>
      {message && <p className="form-message form-message--success" aria-live="polite"><CheckCircle size={20} weight="fill" />{message}</p>}
      {syncResult && <SyncReceipt result={syncResult} />}
      {error && <p className="form-message form-message--error" role="alert">{error}</p>}
      <section className="provider-sheet">
        <div className="provider-logo" aria-hidden="true">S</div>
        <div className="provider-copy">
          <div><h2>Spotify</h2>{spotify && <span className="status-chip"><CheckCircle size={17} weight="fill" />Conectado</span>}</div>
          <p>{spotify ? "Sincronize o histórico recente para atualizar cartas e conta." : "Conecte com OAuth. Sua senha permanece no Spotify."}</p>
          {spotify?.updatedAt && <small>Última atualização: {new Date(spotify.updatedAt).toLocaleString("pt-BR")}</small>}
        </div>
        <div className="provider-actions">
          {spotify ? (
            <>
              <button className="button button-primary" type="button" onClick={() => void run("sync")} disabled={Boolean(busy)}><ArrowsClockwise size={20} weight="bold" />{busy === "sync" ? "Sincronizando" : "Sincronizar"}</button>
              <button className="button button-quiet" type="button" onClick={() => void run("disconnect")} disabled={Boolean(busy)}><Trash size={19} weight="bold" />Desconectar</button>
            </>
          ) : <button className="button button-primary" type="button" onClick={() => void run("connect")} disabled={Boolean(busy)}><LinkSimple size={20} weight="bold" />{busy === "connect" ? "Abrindo" : "Conectar Spotify"}</button>}
        </div>
      </section>
      <section className="privacy-note"><PlugsConnected size={27} weight="bold" /><div><h2>Você mantém o controle</h2><p>A autorização pode ser removida a qualquer momento. Escutas, XP e conexões só são alterados pelo backend autenticado.</p></div></section>
    </div>
  );
}

function SyncReceipt({ result }: { result: SpotifySyncResult }) {
  const madeProgress = result.xpAwarded > 0;
  return (
    <section className="sync-receipt" aria-live="polite" aria-labelledby="sync-receipt-title">
      <div className="sync-receipt__status">
        <CheckCircle size={24} weight="fill" aria-hidden="true" />
        <div>
          <h2 id="sync-receipt-title">{madeProgress ? "CAMADA ADICIONADA" : "RADAR ATUALIZADO"}</h2>
          <p>{madeProgress ? "Suas escutas válidas avançaram a jornada." : "Nenhuma escuta nova gerou progresso desta vez."}</p>
        </div>
      </div>
      <dl>
        <div><dt>XP confirmado</dt><dd>+{formatXp(result.xpAwarded)}</dd></div>
        <div><dt>Artistas que avançaram</dt><dd>{result.artistsAdvanced}</dd></div>
        <div><dt>Eventos analisados</dt><dd>{result.processed}</dd></div>
      </dl>
      {(result.rejected > 0 || result.duplicate > 0) && (
        <p className="sync-receipt__audit">
          {result.awarded} com progresso · {result.rejected} sem qualificação · {result.duplicate} já registrados
        </p>
      )}
    </section>
  );
}
