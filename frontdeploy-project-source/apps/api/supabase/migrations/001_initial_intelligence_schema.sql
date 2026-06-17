create extension if not exists pgcrypto;

create table if not exists wallet_labels (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null,
  address text not null,
  label text not null check (char_length(label) between 1 and 64),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, address)
);

create table if not exists wallet_profiles (
  address text primary key,
  risk_score integer not null check (risk_score between 1 and 100),
  label text not null,
  summary text not null,
  metrics jsonb not null default '{}'::jsonb,
  recent_activity text[] not null default array[]::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists token_risk_cache (
  address text primary key,
  risk_score integer not null check (risk_score between 1 and 100),
  label text not null,
  summary text not null,
  metrics jsonb not null default '{}'::jsonb,
  recent_activity text[] not null default array[]::text[],
  provider_payload jsonb not null default '{}'::jsonb,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists wallet_labels_owner_id_idx on wallet_labels (owner_id);
create index if not exists wallet_profiles_updated_at_idx on wallet_profiles (updated_at desc);
create index if not exists token_risk_cache_expires_at_idx on token_risk_cache (expires_at);
