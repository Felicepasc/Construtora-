-- Rode isto no SQL Editor do Supabase
-- Pascaretta Construtora (sistema separado): foto de capa da obra +
-- avanço físico por etapa (fica verde conforme conclui cada etapa)

-- 1. Foto de capa/representativa de cada obra
alter table projects
  add column if not exists capa_path text;

-- 2. Etapas de execução da obra (limpeza, fundação, paredes, reboco, revestimento...)
create table if not exists obra_etapas (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id bigint not null references projects(id) on delete cascade,
  ordem int not null default 1,
  nome text not null,
  status text not null default 'pendente' check (status in ('pendente','andamento','concluida')),
  data_conclusao date,
  created_at timestamptz not null default now()
);

alter table obra_etapas enable row level security;

drop policy if exists "select_own" on obra_etapas;
create policy "select_own" on obra_etapas for select using (auth.uid() = user_id);
drop policy if exists "insert_own" on obra_etapas;
create policy "insert_own" on obra_etapas for insert with check (auth.uid() = user_id);
drop policy if exists "update_own" on obra_etapas;
create policy "update_own" on obra_etapas for update using (auth.uid() = user_id);
drop policy if exists "delete_own" on obra_etapas;
create policy "delete_own" on obra_etapas for delete using (auth.uid() = user_id);

create index if not exists idx_obra_etapas_project on obra_etapas(project_id);

-- 3. Popular uma obra com as etapas padrão de uma construção residencial.
--    Rode para cada obra (trocando os valores):
--    select seed_etapas_padrao(<project_id>, '<seu-user-id>');
create or replace function seed_etapas_padrao(p_project_id bigint, p_user_id uuid)
returns void
language plpgsql
as $$
begin
  insert into obra_etapas (user_id, project_id, ordem, nome, status)
  values
  (p_user_id, p_project_id, 1, 'Limpeza e preparo do terreno', 'pendente'),
  (p_user_id, p_project_id, 2, 'Terraplenagem/locação da obra', 'pendente'),
  (p_user_id, p_project_id, 3, 'Fundação', 'pendente'),
  (p_user_id, p_project_id, 4, 'Estrutura (pilares, vigas, lajes)', 'pendente'),
  (p_user_id, p_project_id, 5, 'Alvenaria/Paredes', 'pendente'),
  (p_user_id, p_project_id, 6, 'Cobertura', 'pendente'),
  (p_user_id, p_project_id, 7, 'Instalações elétricas', 'pendente'),
  (p_user_id, p_project_id, 8, 'Instalações hidrossanitárias', 'pendente'),
  (p_user_id, p_project_id, 9, 'Reboco/Emboço', 'pendente'),
  (p_user_id, p_project_id, 10, 'Contrapiso', 'pendente'),
  (p_user_id, p_project_id, 11, 'Revestimento (piso e parede)', 'pendente'),
  (p_user_id, p_project_id, 12, 'Esquadrias (portas e janelas)', 'pendente'),
  (p_user_id, p_project_id, 13, 'Pintura', 'pendente'),
  (p_user_id, p_project_id, 14, 'Acabamento e limpeza final', 'pendente'),
  (p_user_id, p_project_id, 15, 'Entrega/Habite-se', 'pendente')
  on conflict do nothing;
end;
$$;
