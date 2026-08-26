begin;

alter table public.profiles
  add column if not exists is_admin boolean not null default false;

create table if not exists public.artist_candidates (
  provider text not null,
  provider_artist_id text not null,
  name text,
  image_url text,
  followers integer check (followers is null or followers >= 0),
  popularity integer check (popularity is null or popularity between 0 and 100),
  metadata_refreshed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(provider, provider_artist_id)
);

create index if not exists listening_events_provider_artist_idx
  on public.listening_events(provider, provider_artist_id, played_at);

-- TEST_UNSUPPORTED_BEGIN
alter table public.artist_candidates enable row level security;
revoke all on table public.artist_candidates from anon, authenticated;
-- TEST_UNSUPPORTED_END

commit;
