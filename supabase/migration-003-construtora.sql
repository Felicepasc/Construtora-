-- Rode isto no SQL Editor do Supabase (modulo Pascaretta Construtora)

create table if not exists projects (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  address text,
  status text not null default 'em_andamento' check (status in ('planejamento','em_andamento','concluida','pausada')),
  start_date date,
  end_date_estimated date,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists units (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id bigint not null references projects(id) on delete cascade,
  code text not null,
  area_m2 numeric,
  type text not null default 'propria' check (type in ('propria','investidor')),
  sale_price_estimated numeric not null default 0,
  sale_price_real numeric,
  status text not null default 'disponivel' check (status in ('disponivel','reservada','vendida')),
  created_at timestamptz not null default now()
);

create table if not exists investors (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  unit_id bigint not null references units(id) on delete cascade,
  investor_name text not null,
  amount_invested numeric not null default 0,
  estimated_profit numeric not null default 0,
  real_profit numeric,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists budget_items (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id bigint not null references projects(id) on delete cascade,
  category text not null,
  description text,
  estimated_value numeric not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists actual_costs (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id bigint not null references projects(id) on delete cascade,
  budget_item_id bigint references budget_items(id) on delete set null,
  category text not null,
  description text,
  value numeric not null default 0,
  date date not null default current_date,
  supplier text,
  created_at timestamptz not null default now()
);

alter table projects enable row level security;
alter table units enable row level security;
alter table investors enable row level security;
alter table budget_items enable row level security;
alter table actual_costs enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['projects','units','investors','budget_items','actual_costs']
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

create index if not exists idx_projects_user on projects(user_id);
create index if not exists idx_units_project on units(project_id);
create index if not exists idx_investors_unit on investors(unit_id);
create index if not exists idx_budget_items_project on budget_items(project_id);
create index if not exists idx_actual_costs_project on actual_costs(project_id);
