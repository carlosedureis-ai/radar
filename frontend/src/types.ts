export type RadarUser = {
  id: string;
  email: string | null;
  displayName: string;
  accountXp: number;
  accountLevel: number;
  isAdmin: boolean;
  createdAt: string;
};

export type AdminArtistCandidate = {
  provider: string;
  providerArtistId: string;
  name: string | null;
  imageUrl: string | null;
  followers: number | null;
  popularity: number | null;
  metadataRefreshedAt: string | null;
  artistId: string | null;
  isEmerging: boolean;
  eligibilityStatus: "uncataloged" | "eligible" | "pending" | "ineligible";
  listenCount: number;
  waitingCount: number;
  firstSeenAt: string;
  lastSeenAt: string;
};

export type AdminArtistResponse = {
  items: AdminArtistCandidate[];
  summary: { total: number; waiting: number; cataloged: number; listensWaiting: number };
};

export type MusicConnection = {
  provider: string;
  providerUserId: string | null;
  scopes: string;
  status: string;
  lastCursor: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ArtistCard = {
  artistId: string;
  artistName: string;
  slug: string;
  isEmerging: boolean;
  xp: number;
  listenCount: number;
  level: number;
  updatedAt: string;
};

export type Listen = {
  id: string;
  provider: string;
  providerTrackId: string;
  playedAt: string;
  qualified: boolean;
  xpAwarded: number;
  rejectionReason: string | null;
  artistId: string | null;
  artistName: string | null;
};

export type ProgressionRule = {
  scope: "card" | "account";
  level: number;
  name: string;
  minXp: number;
  provisional: boolean;
};

export type Progression = {
  account: {
    id: string;
    displayName: string;
    xp: number;
    level: number;
  };
  rules: ProgressionRule[];
  journey: JourneyStats;
};

export type JourneyStats = {
  qualifiedListenCount: number;
  artistCount: number;
  highestCardLevel: number;
};

export type SpotifySyncResult = {
  processed: number;
  awarded: number;
  rejected: number;
  duplicate: number;
  xpAwarded: number;
  artistsAdvanced: number;
};

export type PublicShare = {
  token: string;
  artistName: string;
  artistSlug: string;
  cardLevel: number;
  cardXp: number;
  accountLevel: number;
  createdAt: string;
};

export type PublicJourneyShare = {
  token: string;
  accountXp: number;
  accountLevel: number;
  journey: JourneyStats;
  createdAt: string;
};

export type RadarSnapshot = {
  me: RadarUser | null;
  progression: Progression | null;
  connections: MusicConnection[];
  cards: ArtistCard[];
  listens: Listen[];
};
