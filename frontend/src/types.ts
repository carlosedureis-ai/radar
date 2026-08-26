export type RadarUser = {
  id: string;
  email: string | null;
  displayName: string;
  accountXp: number;
  accountLevel: number;
  createdAt: string;
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

export type RadarSnapshot = {
  me: RadarUser | null;
  progression: Progression | null;
  connections: MusicConnection[];
  cards: ArtistCard[];
  listens: Listen[];
};
