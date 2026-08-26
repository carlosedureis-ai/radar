import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "../auth/AuthProvider";
import { apiRequest } from "../lib/api";
import type {
  ArtistCard,
  Listen,
  MusicConnection,
  Progression,
  RadarSnapshot,
  RadarUser,
  SpotifySyncResult,
} from "../types";

type RadarDataContextValue = RadarSnapshot & {
  loading: boolean;
  error: string | null;
  refreshing: boolean;
  refresh(): Promise<void>;
  connectSpotify(): Promise<void>;
  syncSpotify(): Promise<SpotifySyncResult>;
  disconnectProvider(provider: string): Promise<void>;
  createShare(artistId: string): Promise<string>;
  createJourneyShare(): Promise<string>;
};

const emptySnapshot: RadarSnapshot = {
  me: null,
  progression: null,
  connections: [],
  cards: [],
  listens: [],
};

const RadarDataContext = createContext<RadarDataContextValue | null>(null);

export function RadarDataProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const [snapshot, setSnapshot] = useState<RadarSnapshot>(emptySnapshot);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const token = session?.access_token ?? null;

  const refresh = useCallback(async () => {
    if (!token) return;
    setRefreshing(true);
    setError(null);
    try {
      const [me, progression, connections, cards, listens] = await Promise.all([
        apiRequest<RadarUser>("/v1/me", token),
        apiRequest<Progression>("/v1/progression", token),
        apiRequest<{ items: MusicConnection[] }>("/v1/music/connections", token),
        apiRequest<{ items: ArtistCard[] }>("/v1/cards", token),
        apiRequest<{ items: Listen[] }>("/v1/listens?limit=30", token),
      ]);
      setSnapshot({ me, progression, connections: connections.items, cards: cards.items, listens: listens.items });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível carregar seu Radar.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    setSnapshot(emptySnapshot);
    setLoading(true);
    void refresh();
  }, [refresh]);

  const value = useMemo<RadarDataContextValue>(
    () => ({
      ...snapshot,
      loading,
      refreshing,
      error,
      refresh,
      async connectSpotify() {
        const result = await apiRequest<{ authorizationUrl: string }>(
          "/v1/music/spotify/authorize",
          token,
          { method: "POST" },
        );
        window.location.assign(result.authorizationUrl);
      },
      async syncSpotify() {
        const response = await apiRequest<{
          result: SpotifySyncResult;
        }>("/v1/music/spotify/sync", token, { method: "POST" });
        await refresh();
        return response.result;
      },
      async disconnectProvider(provider) {
        await apiRequest<void>(`/v1/music/connections/${encodeURIComponent(provider)}`, token, {
          method: "DELETE",
        });
        await refresh();
      },
      async createShare(artistId) {
        const result = await apiRequest<{ token: string }>(
          `/v1/cards/${encodeURIComponent(artistId)}/share`,
          token,
          { method: "POST" },
        );
        return `${window.location.origin}/compartilhar/${result.token}`;
      },
      async createJourneyShare() {
        const result = await apiRequest<{ token: string }>(
          "/v1/progression/share",
          token,
          { method: "POST" },
        );
        return `${window.location.origin}/jornada/${result.token}`;
      },
    }),
    [error, loading, refresh, refreshing, snapshot, token],
  );

  return <RadarDataContext.Provider value={value}>{children}</RadarDataContext.Provider>;
}

export function useRadarData(): RadarDataContextValue {
  const value = useContext(RadarDataContext);
  if (!value) throw new Error("useRadarData precisa estar dentro de RadarDataProvider");
  return value;
}
