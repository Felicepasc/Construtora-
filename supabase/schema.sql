-- Ledger CFO — schema Supabase (Postgres)
-- Rode isto no SQL Editor do seu projeto Supabase (Database > SQL Editor > New query)

create table if not exists transactions (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('despesa','receita')),
  description text not null,
  category text not null,
  value numeric not null,
  date date not null default current_date,
  created_at timestamptz not null default now()
);

create table if not exists budgets (
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null,
  limit_value numeric not null default 0,
  primary key (user_id, category)
);

create table if not exists goals (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  target numeric not null,
  current numeric not null default 0,
  months int not null,
  created_at timestamptz not null default now()
);

create table if not exists investments (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null,
  value numeric not null,
  created_at timestamptz not null default now()
);

create table if not exists patrimonio (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null check (type in ('ativo','passivo')),
  value numeric not null,
  created_at timestamptz not null default now()
);

-- Row Level Security: cada usuário só acessa suas próprias linhas
alter table transactions enable row level security;
alter table budgets enable row level security;
alter table goals enable row level security;
alter table investments enable row level security;
alter table patrimonio enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['transactions','budgets','goals','investments','patrimonio']
  loop
    execute format('drop policy if exists "select_own" on %I', t);
    execute format('create policy "select_own" on %I for select using (auth.uid() = user_id)', t);
    execute format('drop policy if exists "insert_own" on %I', t);
    execute format('create policy "insert_own" on %I for insert with check (auth.uid() = user_id)', t);
    execute format('drop policy if exists "update_own" on %I', t);
    execute format('create policy "update_own" on %I for update using (auth.uid() = user_id)', t);
    execute format('drop policy if exists "delete_own" on %I', t);
    execute format('create policy "delete_own" on %I for delete using (auth.uid() = user_id)', t);
  end loop;
end $$;

create index if not exists idx_transactions_user on transactions(user_id);
create index if not exists idx_budgets_user on budgets(user_id);
create index if not exists idx_goals_user on goals(user_id);
create index if not exists idx_investments_user on investments(user_id);
create index if not exists idx_patrimonio_user on patrimonio(user_id);
