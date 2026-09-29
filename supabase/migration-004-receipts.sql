-- Rode isto no SQL Editor do Supabase (anexo de fotos de nota/comprovante)

-- 1. Cria o bucket de armazenamento privado para as fotos
insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false)
on conflict (id) do nothing;

-- 2. Cria as politicas: cada usuario so acessa arquivos dentro da sua
--    propria pasta (nome da pasta = seu user id). RLS ja vem ativado por
--    padrao em storage.objects nos projetos Supabase.

drop policy if exists "receipts_select_own" on storage.objects;
create policy "receipts_select_own" on storage.objects for select
  using (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "receipts_insert_own" on storage.objects;
create policy "receipts_insert_own" on storage.objects for insert
  with check (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "receipts_delete_own" on storage.objects;
create policy "receipts_delete_own" on storage.objects for delete
  using (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);

-- 3. Coluna para guardar o caminho da foto em cada lancamento
alter table transactions
  add column if not exists receipt_path text;

alter table actual_costs
  add column if not exists receipt_path text;
