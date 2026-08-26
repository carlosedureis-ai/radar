begin;

create table if not exists public.share_journeys (
  id uuid primary key,
  public_token text not null unique,
  user_id uuid not null references public.profiles(id) on delete cascade,
  account_xp integer not null check (account_xp >= 0),
  account_level integer not null check (account_level >= 1),
  qualified_listen_count integer not null check (qualified_listen_count >= 0),
  artist_count integer not null check (artist_count >= 0),
  highest_card_level integer not null check (highest_card_level >= 0),
  created_at timestamptz not null default now()
);

-- TEST_UNSUPPORTED_BEGIN
alter table public.share_journeys enable row level security;
revoke all on table public.share_journeys from anon, authenticated;
-- TEST_UNSUPPORTED_END

commit;
