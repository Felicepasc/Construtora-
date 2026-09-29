-- Rode isto no SQL Editor do Supabase
-- Modulo: Pascaretta Construtora - gestao completa da obra
-- (documentos, fotos de evolucao, nao conformidades, checklist de requisitos, KPIs)

-- 1. Bucket de armazenamento privado para documentos/desenhos/liberacoes/fotos da obra
insert into storage.buckets (id, name, public)
values ('obra-docs', 'obra-docs', false)
on conflict (id) do nothing;

drop policy if exists "obradocs_select_own" on storage.objects;
create policy "obradocs_select_own" on storage.objects for select
  using (bucket_id = 'obra-docs' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "obradocs_insert_own" on storage.objects;
create policy "obradocs_insert_own" on storage.objects for insert
  with check (bucket_id = 'obra-docs' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "obradocs_delete_own" on storage.objects;
create policy "obradocs_delete_own" on storage.objects for delete
  using (bucket_id = 'obra-docs' and (storage.foldername(name))[1] = auth.uid()::text);

-- 2. Percentual de execucao da obra (usado nos KPIs de execucao)
alter table projects
  add column if not exists progresso_pct numeric not null default 0;

alter table projects
  add column if not exists municipio text not null default 'Paulista/PE';

alter table projects
  add column if not exists financiamento text not null default 'MCMV';

-- 3. Documentos da obra (tecnico, financeiro, desenho, liberacao, outro)
create table if not exists obra_documentos (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id bigint not null references projects(id) on delete cascade,
  categoria text not null check (categoria in ('tecnico','financeiro','desenho','liberacao','outro')),
  titulo text not null,
  descricao text,
  path text not null,
  data date not null default current_date,
  validade date,
  created_at timestamptz not null default now()
);

-- 4. Fotos de evolucao da obra
create table if not exists obra_fotos (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id bigint not null references projects(id) on delete cascade,
  path text not null,
  legenda text,
  etapa text,
  data date not null default current_date,
  created_at timestamptz not null default now()
);

-- 5. Nao conformidades (com historico de status)
create table if not exists nao_conformidades (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id bigint not null references projects(id) on delete cascade,
  titulo text not null,
  descricao text,
  categoria text not null default 'execucao' check (categoria in ('execucao','seguranca','qualidade','documental','outro')),
  gravidade text not null default 'media' check (gravidade in ('baixa','media','alta')),
  responsavel text,
  data_abertura date not null default current_date,
  prazo date,
  status text not null default 'aberta' check (status in ('aberta','em_tratativa','resolvida')),
  data_resolucao date,
  acao_corretiva text,
  path_foto text,
  created_at timestamptz not null default now()
);

-- 6. Checklist de requisitos regulatorios (municipal / Caixa MCMV / ambiental)
create table if not exists requisitos_checklist (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id bigint not null references projects(id) on delete cascade,
  categoria text not null default 'municipal' check (categoria in ('municipal','caixa_mcmv','ambiental','outro')),
  item text not null,
  descricao text,
  status text not null default 'pendente' check (status in ('pendente','em_andamento','concluido','nao_aplicavel')),
  responsavel text,
  prazo date,
  observacao text,
  path_doc text,
  created_at timestamptz not null default now()
);

-- 7. RLS padrao para todas as novas tabelas
alter table obra_documentos enable row level security;
alter table obra_fotos enable row level security;
alter table nao_conformidades enable row level security;
alter table requisitos_checklist enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['obra_documentos','obra_fotos','nao_conformidades','requisitos_checklist']
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

create index if not exists idx_obra_documentos_project on obra_documentos(project_id);
create index if not exists idx_obra_fotos_project on obra_fotos(project_id);
create index if not exists idx_nao_conformidades_project on nao_conformidades(project_id);
create index if not exists idx_requisitos_checklist_project on requisitos_checklist(project_id);

-- 8. Funcao auxiliar: ao criar uma obra nova, popular automaticamente o
--    checklist de requisitos com os itens padrao (Paulista/PE + Caixa MCMV).
--    Chame isto manualmente para uma obra ja existente, passando o project_id
--    e o user_id (rode uma linha por vez, trocando os valores):
--
--    select seed_requisitos_checklist(<project_id>, '<seu-user-id>');

create or replace function seed_requisitos_checklist(p_project_id bigint, p_user_id uuid)
returns void
language plpgsql
as $$
begin
  insert into requisitos_checklist (user_id, project_id, categoria, item, descricao, status)
  values
  -- Municipal (Prefeitura de Paulista/PE) - generico, adaptavel a outros municipios
  (p_user_id, p_project_id, 'municipal', 'Alvara de construcao', 'Requerimento + projeto arquitetonico aprovado junto a Secretaria de Infraestrutura/Habitacao de Paulista-PE', 'pendente'),
  (p_user_id, p_project_id, 'municipal', 'ART/RRT de execucao', 'Anotacao/Registro de Responsabilidade Tecnica do engenheiro/arquiteto responsavel pela obra, junto ao CREA/CAU', 'pendente'),
  (p_user_id, p_project_id, 'municipal', 'Matricula atualizada do imovel', 'Certidao de matricula do terreno, emitida no Cartorio de Registro de Imoveis competente', 'pendente'),
  (p_user_id, p_project_id, 'municipal', 'IPTU quitado / CND municipal', 'Certidao negativa de debitos municipais do imovel', 'pendente'),
  (p_user_id, p_project_id, 'municipal', 'Projeto de implantacao/topografico', 'Planta com implantacao da edificacao no lote e levantamento planialtimetrico', 'pendente'),
  (p_user_id, p_project_id, 'municipal', 'Habite-se', 'Certificado de conclusao de obra emitido pela Prefeitura ao final da construcao', 'pendente'),
  (p_user_id, p_project_id, 'municipal', 'Licenca ambiental (se aplicavel)', 'Dependendo do porte/localizacao, pode ser exigida licenca da Secretaria de Meio Ambiente', 'pendente'),

  -- Caixa Economica Federal - Minha Casa Minha Vida (lado construtora)
  (p_user_id, p_project_id, 'caixa_mcmv', 'Carta Proposta / enquadramento MCMV', 'Proposta de adesao ao programa protocolada junto a Caixa', 'pendente'),
  (p_user_id, p_project_id, 'caixa_mcmv', 'PCI - Proposta de Construcao Individual', 'Documento tecnico validado pela engenharia da Caixa contra a tabela SINAPI, base para liberacao por etapas', 'pendente'),
  (p_user_id, p_project_id, 'caixa_mcmv', 'ART/RRT dos projetos (arquitetonico, estrutural, eletrico, hidrossanitario)', 'Uma ART/RRT por projeto complementar exigido pela Caixa', 'pendente'),
  (p_user_id, p_project_id, 'caixa_mcmv', 'Certidao de regularidade CREA/CAU da empresa e do responsavel tecnico', 'Comprova habilitacao da construtora e do RT junto ao conselho', 'pendente'),
  (p_user_id, p_project_id, 'caixa_mcmv', 'Atestado de Capacidade Tecnica', 'Comprova experiencia da construtora em obras semelhantes', 'pendente'),
  (p_user_id, p_project_id, 'caixa_mcmv', 'Parecer de engenharia - capacidade de producao simultanea', 'Avaliacao da Caixa sobre a capacidade da construtora tocar as obras contratadas ao mesmo tempo', 'pendente'),
  (p_user_id, p_project_id, 'caixa_mcmv', 'Certificado PBQP-H (ou SiAC)', 'Certificacao de qualidade do sistema construtivo, exigida em muitas operacoes MCMV', 'pendente'),
  (p_user_id, p_project_id, 'caixa_mcmv', 'Manifestacao do orgao ambiental competente', 'Quando exigida pelo porte do empreendimento', 'pendente'),
  (p_user_id, p_project_id, 'caixa_mcmv', 'Cronograma fisico-financeiro aprovado', 'Etapas de obra vinculadas aos desembolsos (medicoes) que a Caixa libera', 'pendente'),
  (p_user_id, p_project_id, 'caixa_mcmv', 'Medicao/vistoria de engenharia da Caixa por etapa', 'Cada liberacao de parcela depende de vistoria confirmando o percentual executado', 'pendente'),
  (p_user_id, p_project_id, 'caixa_mcmv', 'Habite-se + matricula individualizada (unidade)', 'Condicao para a liberacao final e assinatura do contrato com o mutuario', 'pendente'),
  (p_user_id, p_project_id, 'caixa_mcmv', 'Registro de servidao de passagem (quando aplicavel)', 'Necessario quando ha necessidade de acesso por lote de terceiros', 'pendente')
  on conflict do nothing;
end;
$$;
