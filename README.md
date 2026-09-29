# Pascaretta Construtora — app separado (deploy no Cloudflare Pages + Supabase)

Sistema dedicado à gestão das obras: financeiro, execução física e
conformidade documental. Usa o **mesmo projeto Supabase** do app de
Finanças/Família (mesmo login, mesmos dados de obra) — é só a interface que
agora é um site à parte, com seu próprio endereço.

## 1. Banco de dados (Supabase)

Se você já rodou as migrations 001 a 006 no Supabase (do app anterior), falta
só rodar a migration nova:

1. No **SQL Editor** do mesmo projeto Supabase, cole e rode
   `supabase/migration-007-capa-etapas.sql`. Ela adiciona a foto de capa da
   obra e a tabela de etapas de avanço físico (fica verde por etapa).
2. Para cada obra já cadastrada, rode (trocando os valores):
   ```sql
   select seed_etapas_padrao(<id_da_obra>, '<seu_user_id>');
   ```
   Isso preenche a obra com as etapas padrão: limpeza, terraplenagem,
   fundação, estrutura, alvenaria, cobertura, instalações elétricas e
   hidrossanitárias, reboco, contrapiso, revestimento, esquadrias, pintura,
   acabamento/limpeza e entrega/habite-se. Você pode editar, excluir ou
   adicionar etapas próprias a qualquer momento pela tela "Avanço da obra".

   (Se você ainda não rodou as migrations anteriores, rode nesta ordem:
   `schema.sql`, `migration-002-nature.sql`, `migration-003-construtora.sql`,
   `migration-004-receipts.sql`, `migration-006-obra-completa.sql`, e por
   fim `migration-007-capa-etapas.sql`.)

## 2. Variáveis de ambiente

Use as **mesmas** `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` do seu app
de Finanças (mesmo projeto Supabase). Configure em **Project Settings → API**
no Supabase, e no Cloudflare Pages em **Settings → Environment variables**.

## 3. Deploy no Cloudflare Pages (site separado)

1. Crie um novo repositório no GitHub (ex: `pascaretta-construtora`) e faça
   upload de todos os arquivos desta pasta pela interface web do GitHub
   ("Add file → Upload files"), mantendo a estrutura de pastas
   (`src/`, `supabase/`, `public/`, etc.).
2. No Cloudflare Pages, clique em **Create a project → Connect to Git** e
   selecione esse novo repositório.
3. Configurações de build:
   - Framework preset: **None**
   - Build command: `npm run build`
   - Output directory: `dist`
   - Root directory: deixe em branco (a menos que os arquivos tenham ficado
     dentro de uma subpasta — nesse caso, aponte para ela)
4. Adicione as variáveis de ambiente do passo 2.
5. Clique em **Save and Deploy**. Você receberá um endereço próprio, do tipo
   `pascaretta-construtora.pages.dev` — separado do app de Finanças.
6. Depois do primeiro deploy, adicione um ícone à tela inicial do celular
   normalmente (Compartilhar → Adicionar à Tela de Início), do mesmo jeito
   que fez com o outro app. Como é um domínio diferente, ele vira um ícone
   independente.

## O que tem neste app

- **Dashboard** — relatório de desempenho consolidado de todas as obras:
  obras em andamento/concluídas, valor contratado/recebido, custo
  previsto/real, lucro previsto/realizado, capital de investidores, gráfico
  previsto x real por obra, evolução do custo real por mês, ranking das
  obras mais lucrativas, ranking das obras com maior desvio financeiro e
  alertas de não conformidades em aberto.
- **Obras** — cadastro com foto de capa, endereço, status, município e
  financiamento (MCMV por padrão). Dentro de cada obra:
  - **Resumo** — previsto x real por categoria de custo
  - **Avanço da obra** — etapas (limpeza, fundação, paredes, reboco,
    revestimento, etc.) que ficam verdes conforme você marca como concluídas
  - **Unidades** — próprias e de investidores, com estimativa de lucro
  - **Orçamento** — custos previstos por categoria
  - **Custos reais** — lançamentos com comprovante anexado
  - **KPIs** — financeiro, execução (manual + por etapas) e conformidade,
    tudo em uma página só
  - **Documentos** — arquivo técnico/financeiro/desenho/liberação
  - **Fotos** — galeria de evolução da obra
  - **Não conformidades** — abertura, tratativa e histórico de resolução
  - **Requisitos** — checklist regulatório (Paulista/PE + Caixa MCMV)
