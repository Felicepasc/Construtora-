-- Rode isto no SQL Editor do Supabase (adiciona o campo Futilidade/Prevista)
alter table transactions
  add column if not exists nature text check (nature in ('futilidade','prevista'));
