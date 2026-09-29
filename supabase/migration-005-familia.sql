-- Rode isto no SQL Editor do Supabase (modulo Conta de Familia)

create table if not exists familia_pessoas (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  nome text not null,
  tipo text not null default 'credito' check (tipo in ('credito','custodia')),
  created_at timestamptz not null default now()
);

create table if not exists familia_lancamentos (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  pessoa_id bigint not null references familia_pessoas(id) on delete cascade,
  tipo text not null check (tipo in ('emprestimo','aporte','lucro','devolucao','entrada','repasse')),
  valor numeric not null,
  data date not null,
  prev numeric not null default 0,
  obs text,
  created_at timestamptz not null default now()
);

create table if not exists familia_config (
  user_id uuid primary key references auth.users(id) on delete cascade,
  cdi numeric not null default 13.9,
  pct numeric not null default 100
);

alter table familia_pessoas enable row level security;
alter table familia_lancamentos enable row level security;
alter table familia_config enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['familia_pessoas','familia_lancamentos','familia_config']
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

create index if not exists idx_familia_pessoas_user on familia_pessoas(user_id);
create index if not exists idx_familia_lancamentos_pessoa on familia_lancamentos(pessoa_id);
create index if not exists idx_familia_lancamentos_user on familia_lancamentos(user_id);
