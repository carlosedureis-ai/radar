begin;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  display_name text not null check (char_length(display_name) between 2 and 60),
  account_xp integer not null default 0 check (account_xp >= 0),
  account_level integer not null default 1 check (account_level >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.music_connections (
  id uuid primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  provider text not null,
  provider_user_id text,
  access_token_encrypted text not null,
  refresh_token_encrypted text not null,
  token_expires_at timestamptz not null,
  scopes text not null,
  last_cursor text,
  status text not null default 'active' check (status in ('active', 'expired', 'revoked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint music_connections_user_provider_key unique(user_id, provider)
);

create unique index if not exists music_connections_provider_user_unique_idx
  on public.music_connections(provider, provider_user_id)
  where provider_user_id is not null;

create table if not exists public.oauth_states (
  state text primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  provider text not null,
  code_verifier_encrypted text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.artists (
  id uuid primary key,
  slug text not null unique,
  name text not null,
  is_emerging boolean not null default false,
  eligibility_status text not null default 'pending'
    check (eligibility_status in ('eligible', 'pending', 'ineligible')),
  created_at timestamptz not null default now()
);

create table if not exists public.artist_provider_ids (
  provider text not null,
  provider_artist_id text not null,
  artist_id uuid not null references public.artists(id) on delete cascade,
  primary key(provider, provider_artist_id)
);

create table if not exists public.listening_events (
  id uuid primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  provider text not null,
  provider_track_id text not null,
  provider_artist_id text not null,
  artist_id uuid references public.artists(id) on delete set null,
  played_at timestamptz not null,
  qualified boolean not null,
  xp_awarded integer not null default 0 check (xp_awarded >= 0),
  rejection_reason text,
  created_at timestamptz not null default now(),
  constraint listening_events_identity_key
    unique(user_id, provider, provider_track_id, played_at)
);

create index if not exists listening_events_user_time_idx
  on public.listening_events(user_id, played_at desc);
create index if not exists listening_events_user_artist_idx
  on public.listening_events(user_id, artist_id, played_at desc);

create table if not exists public.artist_cards (
  user_id uuid not null references public.profiles(id) on delete cascade,
  artist_id uuid not null references public.artists(id) on delete cascade,
  xp integer not null default 0 check (xp >= 0),
  listen_count integer not null default 0 check (listen_count >= 0),
  level integer not null default 1 check (level between 1 and 5),
  updated_at timestamptz not null default now(),
  primary key(user_id, artist_id)
);

create table if not exists public.progression_rules (
  scope text not null check (scope in ('card', 'account')),
  level integer not null,
  name text not null,
  min_xp integer not null check (min_xp >= 0),
  provisional boolean not null default true,
  primary key(scope, level),
  unique(scope, min_xp)
);

create table if not exists public.share_cards (
  id uuid primary key,
  public_token text not null unique,
  user_id uuid not null references public.profiles(id) on delete cascade,
  artist_id uuid not null references public.artists(id) on delete cascade,
  card_level integer not null,
  card_xp integer not null,
  account_level integer not null,
  created_at timestamptz not null default now()
);

insert into public.progression_rules(scope, level, name, min_xp, provisional) values
  ('card', 1, 'Descoberta', 0, true),
  ('card', 2, 'Ouvinte', 100, true),
  ('card', 3, 'Fã', 500, true),
  ('card', 4, 'Especialista', 1500, true),
  ('card', 5, 'Lenda', 10000, true),
  ('account', 1, 'Explorador', 0, true),
  ('account', 2, 'Descobridor', 250, true),
  ('account', 3, 'Curador', 1000, true),
  ('account', 4, 'Referência', 3000, true),
  ('account', 5, 'Radar Vivo', 10000, true)
on conflict(scope, level) do nothing;

-- TEST_UNSUPPORTED_BEGIN
alter table public.profiles enable row level security;
alter table public.music_connections enable row level security;
alter table public.oauth_states enable row level security;
alter table public.artists enable row level security;
alter table public.artist_provider_ids enable row level security;
alter table public.listening_events enable row level security;
alter table public.artist_cards enable row level security;
alter table public.progression_rules enable row level security;
alter table public.share_cards enable row level security;

revoke all on table public.profiles from anon, authenticated;
revoke all on table public.music_connections from anon, authenticated;
revoke all on table public.oauth_states from anon, authenticated;
revoke all on table public.artists from anon, authenticated;
revoke all on table public.artist_provider_ids from anon, authenticated;
revoke all on table public.listening_events from anon, authenticated;
revoke all on table public.artist_cards from anon, authenticated;
revoke all on table public.progression_rules from anon, authenticated;
revoke all on table public.share_cards from anon, authenticated;
-- TEST_UNSUPPORTED_END

commit;
