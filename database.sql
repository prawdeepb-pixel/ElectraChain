-- ElectraChain Supabase schema
-- Run this in the Supabase SQL editor when you are ready to move beyond
-- the built-in localStorage fallback.

create table if not exists profiles (
  id text primary key,
  name text not null,
  email text not null unique,
  password text not null,
  role text not null check (role in ('Admin', 'Energy User')),
  city text,
  energy_type text,
  status text not null,
  producer_verified boolean default false,
  consumer_verified boolean default false,
  created_at timestamptz,
  approved_at timestamptz,
  rejected_at timestamptz,
  suspended_at timestamptz
);

create table if not exists wallets (
  id text primary key,
  user_id text not null references profiles(id) on delete cascade,
  wallet_address text not null,
  confirmed_balance numeric(14, 2) default 1000,
  pending_balance numeric(14, 2) default 0,
  energy_tokens numeric(14, 2) default 100,
  created_at timestamptz,
  updated_at timestamptz
);

create table if not exists energy_listings (
  id text primary key,
  producer_id text not null references profiles(id) on delete cascade,
  producer_name text not null,
  amount numeric(14, 2) not null,
  remaining_amount numeric(14, 2) not null,
  price_per_token numeric(14, 2) not null,
  energy_source text not null,
  location text not null,
  description text,
  status text not null,
  created_at timestamptz,
  approved_at timestamptz,
  rejected_at timestamptz
);

create table if not exists purchase_requests (
  id text primary key,
  listing_id text not null references energy_listings(id) on delete cascade,
  buyer_id text not null references profiles(id) on delete cascade,
  seller_id text not null references profiles(id) on delete cascade,
  amount numeric(14, 2) not null,
  price_per_token numeric(14, 2) not null,
  total_price numeric(14, 2) not null,
  status text not null,
  created_at timestamptz,
  approved_at timestamptz,
  rejected_at timestamptz,
  blockchain_hash text
);

create table if not exists transactions (
  id text primary key,
  request_id text not null references purchase_requests(id) on delete cascade,
  listing_id text not null references energy_listings(id) on delete cascade,
  buyer_id text not null references profiles(id) on delete cascade,
  seller_id text not null references profiles(id) on delete cascade,
  amount numeric(14, 2) not null,
  price_per_token numeric(14, 2) not null,
  total_price numeric(14, 2) not null,
  status text not null,
  blockchain_status text not null,
  hash text,
  block_number bigint,
  timestamp timestamptz
);

create table if not exists wallet_history (
  id text primary key,
  wallet_id text not null references wallets(id) on delete cascade,
  user_id text not null references profiles(id) on delete cascade,
  confirmed_balance numeric(14, 2) not null,
  pending_balance numeric(14, 2) not null,
  energy_tokens numeric(14, 2) not null,
  delta_coins numeric(14, 2) default 0,
  delta_tokens numeric(14, 2) default 0,
  activity text not null,
  created_at timestamptz
);

create table if not exists support_requests (
  id text primary key,
  user_id text not null references profiles(id) on delete cascade,
  user_name text not null,
  user_email text not null,
  category text not null,
  subject text not null,
  message text not null,
  status text not null,
  admin_reply text,
  created_at timestamptz,
  updated_at timestamptz
);

create table if not exists blockchain_logs (
  id text primary key,
  block_number bigint not null,
  transaction_hash text not null,
  buyer text not null,
  buyer_email text not null,
  seller text not null,
  seller_email text not null,
  amount numeric(14, 2) not null,
  total_price numeric(14, 2) not null,
  status text not null,
  timestamp timestamptz
);

create table if not exists approvals (
  id text primary key,
  type text not null,
  entity_id text not null,
  actor_id text not null,
  actor_email text not null,
  action text not null,
  status text not null,
  note text,
  created_at timestamptz
);

create index if not exists profiles_status_idx on profiles(status);
create index if not exists profiles_role_idx on profiles(role);
create index if not exists wallets_user_id_idx on wallets(user_id);
create index if not exists energy_listings_status_idx on energy_listings(status);
create index if not exists purchase_requests_status_idx on purchase_requests(status);
create index if not exists transactions_hash_idx on transactions(hash);
create index if not exists wallet_history_user_id_idx on wallet_history(user_id);
create index if not exists wallet_history_created_at_idx on wallet_history(created_at);
create index if not exists support_requests_user_id_idx on support_requests(user_id);
create index if not exists support_requests_status_idx on support_requests(status);
create index if not exists blockchain_logs_block_number_idx on blockchain_logs(block_number);
create index if not exists approvals_entity_id_idx on approvals(entity_id);

-- Security note:
-- The local browser storage path is for controlled academic presentation only.
-- For production, replace local credentials with Supabase Auth and row-level security.
