/* Pascaretta Construtora — arquivo gerado a partir de src/parts (node tools/bundle.mjs).
   Para alterar, edite as partes e rode o bundle; ou edite este arquivo direto se preferir. */
import React, { useState, useEffect, useMemo, useCallback, useRef, useLayoutEffect, Fragment } from "react";
import {
  AlertTriangle, ArrowLeft, ArrowRight, ArrowUpRight, Building2, Calculator, CalendarClock, Camera, Check, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, ClipboardCheck, Crosshair, Download, ExternalLink, Eye, EyeOff, File, FileImage, FileText, FileX2, FolderOpen, Gauge, HandCoins, HardHat, Home, ImagePlus, Images, Info, Layers, LayoutGrid, LifeBuoy, ListPlus, Loader2, Lock, LogOut, Mail, MapPin, Moon, Paperclip, Pencil, Plus, Printer, Receipt, ShieldAlert, Sun, Trash2, User, Users, Wallet, X, ZoomIn, ZoomOut
} from "lucide-react";
import { createPortal } from "react-dom";
import { supabase } from "./lib/supabaseClient";

/* ======================= 00-core.jsx ======================= */
/* Núcleo: utilitários, listas padrão, cálculos e o store (Supabase). */

/* ---------- formatação e datas ---------- */
const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const BRL0 = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
function fmtBRL(n) { return BRL.format(Number(n) || 0); }
function fmtBRL0(n) { return BRL0.format(Number(n) || 0); }
function fmtBRLshort(n) {
  const v = Number(n) || 0; const a = Math.abs(v);
  if (a >= 1e6) return `R$ ${(v / 1e6).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mi`;
  if (a >= 1e4) return `R$ ${(v / 1e3).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} mil`;
  return fmtBRL0(v);
}
function fmtPct(n) { return `${Math.round(Number(n) || 0)}%`; }
function parseNum(v) {
  if (v === null || v === undefined || v === "") return NaN;
  if (typeof v === "number") return v;
  let s = String(v).replace(/[R$\s]/g, "");
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  return parseFloat(s);
}
function todayISO() {
  const d = new Date(); const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}
function addDaysISO(iso, n) {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + Number(n || 0));
  return d.toISOString().slice(0, 10);
}
function diffDaysISO(a, b) { return Math.round((new Date(b + "T12:00:00") - new Date(a + "T12:00:00")) / 86400000); }
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const MESES_LONGOS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
/* 2026-10-04 -> 04/10/2026 */
function fmtData(iso) { if (!iso) return "—"; const [y, m, d] = iso.slice(0, 10).split("-"); return `${d}/${m}/${y}`; }
/* 2026-10-04 -> 4 out */
function fmtDataCurta(iso) { if (!iso) return "—"; const [, m, d] = iso.slice(0, 10).split("-"); return `${Number(d)} ${MESES[Number(m) - 1]}`; }
/* 2026-10 -> out/26 */
function fmtMes(ym) { const [y, m] = ym.split("-"); return `${MESES[Number(m) - 1]}/${y.slice(2)}`; }
function fmtDataLonga(iso) { const [y, m, d] = iso.slice(0, 10).split("-"); return `${Number(d)} de ${MESES_LONGOS[Number(m) - 1]} de ${y}`; }
function plural(n, um, varios) { return `${n} ${n === 1 ? um : varios}`; }

/* ---------- arquivos (bucket obra-docs) ---------- */
async function uploadToBucket(bucket, userId, file) {
  if (!file) return null;
  const ext = (file.name?.split(".").pop() || "jpg").toLowerCase();
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: false });
  if (error) { console.error(error); return null; }
  return path;
}
const uploadObraFile = (userId, file) => uploadToBucket("obra-docs", userId, file);
const uploadReceipt = (userId, file) => uploadToBucket("receipts", userId, file);

const signedCache = new Map(); // `${bucket}:${path}` -> { url, exp }
async function getSignedUrl(path, bucket = "obra-docs") {
  if (!path) return null;
  const key = `${bucket}:${path}`;
  const hit = signedCache.get(key);
  if (hit && hit.exp > Date.now()) return hit.url;
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 3600);
  if (error || !data) return null;
  signedCache.set(key, { url: data.signedUrl, exp: Date.now() + 50 * 60 * 1000 });
  return data.signedUrl;
}
function useSignedUrl(path, bucket = "obra-docs") {
  const [url, setUrl] = useState(() => {
    const hit = path && signedCache.get(`${bucket}:${path}`);
    return hit && hit.exp > Date.now() ? hit.url : null;
  });
  useEffect(() => {
    let alive = true;
    if (!path) { setUrl(null); return; }
    getSignedUrl(path, bucket).then((u) => { if (alive) setUrl(u); });
    return () => { alive = false; };
  }, [path, bucket]);
  return url;
}
async function openFile(path, bucket = "obra-docs") {
  if (!path) return;
  const w = window.open("", "_blank");
  const url = await getSignedUrl(path, bucket);
  if (!url) { if (w) w.close(); return; }
  if (w) w.location.href = url; else window.location.href = url;
}

/* ---------- listas padrão ---------- */
const OBRA_CATS = ["Materiais", "Mão de obra", "Terceirizados", "Locação de equipamentos", "Projetos/Engenharia", "Taxas/Impostos", "Administrativo", "Outros"];
const PROJECT_STATUS = { planejamento: "Planejamento", em_andamento: "Em execução", pausada: "Pausada", concluida: "Concluída" };
const UNIT_STATUS = { disponivel: "Disponível", reservada: "Reservada", vendida: "Vendida" };
const DOC_CATEGORIAS = { tecnico: "Técnico", financeiro: "Financeiro", desenho: "Desenho técnico", liberacao: "Liberação", outro: "Outro" };
const NC_CATEGORIAS = { execucao: "Execução", seguranca: "Segurança", qualidade: "Qualidade", documental: "Documental", outro: "Outro" };
const NC_STATUS = { aberta: "Aberta", em_tratativa: "Em tratativa", resolvida: "Resolvida" };
const NC_GRAVIDADE = { baixa: "Baixa", media: "Média", alta: "Alta" };
const REQ_CATEGORIAS = { municipal: "Prefeitura", caixa_mcmv: "Caixa · MCMV", ambiental: "Ambiental", outro: "Outros" };
const REQ_STATUS = { pendente: "Pendente", em_andamento: "Em andamento", concluido: "Concluído", nao_aplicavel: "Não se aplica" };
const ETAPA_STATUS = { pendente: "A iniciar", andamento: "Em execução", concluida: "Concluída" };
const ETAPA_NEXT = { pendente: "andamento", andamento: "concluida", concluida: "pendente" };
const PIN_STATUS = { pendente: "Pendente", atraso: "Atrasada", ok: "Resolvida" };

const ETAPAS_SUGERIDAS = [
  "Limpeza e preparo do terreno", "Locação da obra", "Fundação", "Impermeabilização da fundação",
  "Estrutura (pilares, vigas e lajes)", "Alvenaria", "Instalações elétricas (tubulação)",
  "Instalações hidrossanitárias (tubulação)", "Cobertura", "Reboco interno e externo", "Contrapiso",
  "Esquadrias", "Revestimento cerâmico", "Instalações (acabamento)", "Pintura", "Louças e metais",
  "Limpeza final", "Vistoria e entrega",
];

/* Atividades padrão do cronograma: nome + duração típica (dias corridos) de uma casa MCMV. */
const CRONOGRAMA_SUGERIDO = [
  ["Mobilização e instalação do canteiro", 5],
  ["Limpeza e terraplenagem", 4],
  ["Locação da obra (gabarito)", 2],
  ["Escavação e fundação (sapatas/radier)", 12],
  ["Impermeabilização da fundação", 3],
  ["Estrutura: pilares e vigas baldrame", 8],
  ["Alvenaria de vedação", 15],
  ["Vergas, contravergas e cintas", 4],
  ["Laje / estrutura de cobertura", 8],
  ["Instalações elétricas (tubulação e caixas)", 6],
  ["Instalações hidrossanitárias (tubulação)", 6],
  ["Telhado e calhas", 7],
  ["Chapisco e reboco interno", 12],
  ["Reboco externo", 8],
  ["Contrapiso", 5],
  ["Impermeabilização de áreas molhadas", 3],
  ["Revestimento cerâmico (piso e parede)", 12],
  ["Esquadrias (portas e janelas)", 5],
  ["Instalação elétrica (fiação e acabamento)", 6],
  ["Louças, metais e acabamento hidráulico", 4],
  ["Pintura interna e externa", 10],
  ["Muro, calçada e área externa", 6],
  ["Ligações definitivas (Compesa e Neoenergia)", 10],
  ["Limpeza pós-obra", 3],
  ["Vistoria final e entrega", 3],
];

const REQUISITOS_SUGERIDOS = [
  ["municipal", "Alvará de construção", "Projeto arquitetônico aprovado na Prefeitura do Paulista"],
  ["municipal", "ART/RRT de execução", "Responsabilidade técnica do engenheiro ou arquiteto da obra (CREA/CAU)"],
  ["municipal", "Matrícula atualizada do terreno", "Certidão do Cartório de Registro de Imóveis"],
  ["municipal", "IPTU quitado / CND municipal", "Certidão negativa de débitos do imóvel"],
  ["municipal", "Projeto de implantação e topográfico", "Implantação no lote e levantamento planialtimétrico"],
  ["municipal", "Habite-se", "Certificado de conclusão emitido pela Prefeitura"],
  ["municipal", "Averbação da construção", "Averbar a edificação na matrícula após o Habite-se"],
  ["caixa_mcmv", "Enquadramento no Minha Casa Minha Vida", "Proposta protocolada na Caixa"],
  ["caixa_mcmv", "PCI — Proposta de Construção Individual", "Validada pela engenharia da Caixa contra o SINAPI"],
  ["caixa_mcmv", "ARTs dos projetos complementares", "Estrutural, elétrico e hidrossanitário"],
  ["caixa_mcmv", "Cronograma físico-financeiro aprovado", "Etapas vinculadas às medições da Caixa"],
  ["caixa_mcmv", "Medições da Caixa por etapa", "Cada parcela depende da vistoria do percentual executado"],
  ["caixa_mcmv", "Matrícula individualizada das unidades", "Condição para o contrato com o comprador"],
  ["caixa_mcmv", "Certidões da construtora (CND, FGTS, trabalhista)", "Regularidade fiscal exigida a cada liberação"],
  ["outro", "CNO na Receita Federal", "Cadastro da obra aberto no início e baixado ao final"],
  ["outro", "Ligação definitiva de água (Compesa)", "Pedido de ligação após conclusão das instalações"],
  ["outro", "Ligação definitiva de energia (Neoenergia)", "Padrão de entrada vistoriado"],
  ["outro", "As-built e manual do proprietário", "Entregues junto com as chaves"],
  ["outro", "Termo de garantia da obra", "Prazos de garantia por sistema construtivo"],
  ["ambiental", "Licença ambiental (se aplicável)", "Conforme porte e localização do empreendimento"],
];

/* ---------- cálculos ---------- */
function projectTotals(data, projectId) {
  const budget = data.budgetItems.filter((b) => b.projectId === projectId);
  const actual = data.actualCosts.filter((a) => a.projectId === projectId);
  const units = data.units.filter((u) => u.projectId === projectId);
  const investors = data.investors.filter((i) => units.some((u) => u.id === i.unitId));
  const totalEstimatedCost = budget.reduce((s, b) => s + b.estimatedValue, 0);
  const totalActualCost = actual.reduce((s, a) => s + a.value, 0);
  const variance = totalEstimatedCost - totalActualCost;
  const propriaUnits = units.filter((u) => u.type === "propria");
  const investorUnits = units.filter((u) => u.type === "investidor");
  const estimatedRevenue = propriaUnits.reduce((s, u) => s + u.salePriceEstimated, 0);
  const realRevenue = propriaUnits.reduce((s, u) => s + (u.salePriceReal || 0), 0);
  const totalInvested = investors.reduce((s, i) => s + i.amountInvested, 0);
  const totalEstimatedInvestorProfit = investors.reduce((s, i) => s + i.estimatedProfit, 0);
  const custosVenda = units.reduce((s, u) => s + (u.custoDocumentacao || 0) + (u.custoCorretagem || 0), 0);
  // Capital de investidores reduz o que a construtora aporta — volta ao investidor (+ lucro) na venda.
  const builderNetCost = totalEstimatedCost - totalInvested;
  const builderNetActualCost = totalActualCost - totalInvested;
  const estimatedProfit = estimatedRevenue - builderNetCost - custosVenda;
  const realProfitSoFar = realRevenue - builderNetActualCost - custosVenda;
  const byCategory = {};
  budget.forEach((b) => { byCategory[b.category] = byCategory[b.category] || { previsto: 0, real: 0 }; byCategory[b.category].previsto += b.estimatedValue; });
  actual.forEach((a) => { byCategory[a.category] = byCategory[a.category] || { previsto: 0, real: 0 }; byCategory[a.category].real += a.value; });
  const desvioPct = totalEstimatedCost > 0 ? ((totalActualCost - totalEstimatedCost) / totalEstimatedCost) * 100 : 0;
  const margemPct = estimatedRevenue > 0 ? (estimatedProfit / estimatedRevenue) * 100 : 0;
  return { budget, actual, units, investors, propriaUnits, investorUnits, totalEstimatedCost, totalActualCost, variance, estimatedRevenue, realRevenue, builderNetCost, builderNetActualCost, estimatedProfit, realProfitSoFar, totalInvested, totalEstimatedInvestorProfit, custosVenda, byCategory, desvioPct, margemPct };
}

/* Custo por unidade: rateio do orçamento e do gasto real da obra pela área (m²)
   de cada unidade — ou divisão igual quando faltar área — mais documentação e corretagem. */
function unitCostBreakdown(data, projectId) {
  const t = projectTotals(data, projectId);
  const units = t.units;
  const comArea = units.every((u) => Number(u.area) > 0);
  const totalArea = units.reduce((s, u) => s + (Number(u.area) || 0), 0);
  const rows = units.map((u) => {
    const peso = units.length === 0 ? 0 : comArea && totalArea > 0 ? Number(u.area) / totalArea : 1 / units.length;
    const doc = u.custoDocumentacao || 0; const corr = u.custoCorretagem || 0;
    const obraEst = t.totalEstimatedCost * peso; const obraReal = t.totalActualCost * peso;
    const custoEstimado = obraEst + doc + corr; const custoReal = obraReal + doc + corr;
    const venda = u.salePriceReal ?? u.salePriceEstimated ?? 0;
    return { unit: u, peso, obraEst, obraReal, doc, corr, custoEstimado, custoReal, diferenca: custoReal - custoEstimado, venda, margem: venda - custoEstimado };
  });
  return { rows, criterio: comArea && totalArea > 0 ? "area" : "igual", totalArea };
}

/* Cronograma: projeta onde cada atividade realmente termina, propagando atrasos pela predecessora.
   - Concluída: termina no fim planejado.
   - Em atraso (fim planejado já passou): termina hoje + trabalho restante.
   - Não iniciada com início vencido: começa hoje.
   - Sucessora: começa depois do fim projetado da predecessora. */
function cronogramaProjecao(atividades, hoje = todayISO()) {
  const byId = new Map(atividades.map((a) => [a.id, a]));
  const memo = new Map(); const visiting = new Set();
  const calc = (a) => {
    if (memo.has(a.id)) return memo.get(a.id);
    if (visiting.has(a.id)) return { inicio: a.dataInicio, fim: addDaysISO(a.dataInicio, a.duracaoDias) };
    visiting.add(a.id);
    const dur = Math.max(1, Number(a.duracaoDias) || 1);
    const fimPlanejado = addDaysISO(a.dataInicio, dur);
    let inicio = a.dataInicio;
    const pred = a.predecessoraId ? byId.get(a.predecessoraId) : null;
    if (pred) { const p = calc(pred); if (p.fim > inicio) inicio = p.fim; }
    let fim = addDaysISO(inicio, dur);
    if (a.avancoPct >= 100) { inicio = a.dataInicio; fim = fimPlanejado; }
    else {
      const restante = Math.max(1, Math.ceil(dur * (1 - (a.avancoPct || 0) / 100)));
      if (a.avancoPct > 0 && fim < hoje) fim = addDaysISO(hoje, restante);
      else if (!a.avancoPct && inicio < hoje) { inicio = hoje; fim = addDaysISO(hoje, dur); }
      else if (a.avancoPct > 0 && hoje > inicio && addDaysISO(hoje, restante) > fim) fim = addDaysISO(hoje, restante);
    }
    const r = { inicio, fim, fimPlanejado, atrasoDias: Math.max(0, diffDaysISO(fimPlanejado, fim)), atrasada: a.avancoPct < 100 && hoje > fimPlanejado };
    visiting.delete(a.id); memo.set(a.id, r); return r;
  };
  atividades.forEach(calc);
  const fimOriginal = atividades.reduce((m, a) => { const f = addDaysISO(a.dataInicio, a.duracaoDias); return !m || f > m ? f : m; }, null);
  const fimProjetado = atividades.reduce((m, a) => { const f = memo.get(a.id).fim; return !m || f > m ? f : m; }, null);
  const inicioObra = atividades.reduce((m, a) => (!m || a.dataInicio < m ? a.dataInicio : m), null);
  const totalDur = atividades.reduce((s, a) => s + Number(a.duracaoDias || 0), 0);
  const avanco = totalDur ? atividades.reduce((s, a) => s + a.avancoPct * a.duracaoDias, 0) / totalDur : 0;
  const decorrido = atividades.reduce((s, a) => s + Math.min(a.duracaoDias, Math.max(0, diffDaysISO(a.dataInicio, hoje))), 0);
  const esperado = totalDur ? (decorrido / totalDur) * 100 : 0;
  // quem empurra a data final: a(s) atividade(s) com maior atraso no caminho até o fim projetado
  const culpadas = atividades.filter((a) => memo.get(a.id).atrasada).sort((x, y) => memo.get(y.id).atrasoDias - memo.get(x.id).atrasoDias);
  return {
    porId: memo, fimOriginal, fimProjetado, inicioObra,
    deltaDias: fimOriginal && fimProjetado ? diffDaysISO(fimOriginal, fimProjetado) : 0,
    avanco, esperado, atrasadas: culpadas.length, culpadas,
  };
}

/* evita ciclos ao escolher predecessora: ids que já dependem (direta ou indiretamente) de `id` */
function dependentesDe(id, atividades) {
  const out = new Set([id]); let mudou = true;
  while (mudou) { mudou = false; for (const a of atividades) if (a.predecessoraId && out.has(a.predecessoraId) && !out.has(a.id)) { out.add(a.id); mudou = true; } }
  return out;
}

/* Alertas consolidados por obra (usado no Painel e na obra). */
function obraAlertas(data, projectId, hoje = todayISO()) {
  const out = [];
  const ativ = data.cronograma.filter((a) => a.projectId === projectId);
  if (ativ.length) {
    const pj = cronogramaProjecao(ativ, hoje);
    if (pj.deltaDias > 0) out.push({ tipo: "prazo", tom: "danger", titulo: `Entrega projetada ${plural(pj.deltaDias, "dia", "dias")} depois do previsto`, detalhe: `Nova previsão: ${fmtData(pj.fimProjetado)}`, aba: "cronograma" });
    else if (pj.atrasadas) out.push({ tipo: "prazo", tom: "warn", titulo: `${plural(pj.atrasadas, "atividade atrasada", "atividades atrasadas")}`, detalhe: pj.culpadas[0]?.nome, aba: "cronograma" });
  }
  const ncAlta = data.naoConformidades.filter((n) => n.projectId === projectId && n.status !== "resolvida");
  if (ncAlta.length) out.push({ tipo: "nc", tom: ncAlta.some((n) => n.gravidade === "alta") ? "danger" : "warn", titulo: `${plural(ncAlta.length, "não conformidade aberta", "não conformidades abertas")}`, detalhe: ncAlta[0].titulo, aba: "naoconf" });
  const pranchaIds = new Set(data.pranchas.filter((p) => p.projectId === projectId).map((p) => p.id));
  const pins = data.pins.filter((p) => pranchaIds.has(p.pranchaId) && p.status !== "ok");
  const pinsVencidos = pins.filter((p) => p.status === "atraso" || (p.prazo && p.prazo < hoje));
  if (pins.length) out.push({ tipo: "vistoria", tom: pinsVencidos.length ? "danger" : "warn", titulo: `${plural(pins.length, "pendência", "pendências")} de vistoria`, detalhe: pinsVencidos.length ? `${pinsVencidos.length} com prazo vencido` : pins[0].item, aba: "vistoria" });
  const docsVencendo = data.documentos.filter((d) => d.projectId === projectId && d.validade && diffDaysISO(hoje, d.validade) <= 30);
  if (docsVencendo.length) out.push({ tipo: "doc", tom: docsVencendo.some((d) => d.validade < hoje) ? "danger" : "warn", titulo: `${plural(docsVencendo.length, "documento vencendo", "documentos vencendo")}`, detalhe: docsVencendo[0].titulo, aba: "docs" });
  const t = projectTotals(data, projectId);
  if (t.totalEstimatedCost > 0 && t.desvioPct > 5) out.push({ tipo: "custo", tom: "danger", titulo: `Gasto ${fmtPct(t.desvioPct)} acima do orçamento`, detalhe: `${fmtBRL0(t.totalActualCost)} de ${fmtBRL0(t.totalEstimatedCost)}`, aba: "custos" });
  return out;
}

/* ---------- store (Supabase) ---------- */
const mapProject = (p) => ({ id: p.id, name: p.name, address: p.address, status: p.status, startDate: p.start_date, endDateEstimated: p.end_date_estimated, notes: p.notes, progressoPct: Number(p.progresso_pct || 0), municipio: p.municipio || "Paulista/PE", financiamento: p.financiamento || "MCMV", capaPath: p.capa_path || null, createdAt: p.created_at });
const mapUnit = (u) => ({ id: u.id, projectId: u.project_id, code: u.code, area: u.area_m2 == null ? null : Number(u.area_m2), type: u.type, salePriceEstimated: Number(u.sale_price_estimated || 0), salePriceReal: u.sale_price_real == null ? null : Number(u.sale_price_real), status: u.status, custoDocumentacao: Number(u.custo_documentacao || 0), custoCorretagem: Number(u.custo_corretagem || 0) });
const mapInvestor = (i) => ({ id: i.id, unitId: i.unit_id, name: i.investor_name, amountInvested: Number(i.amount_invested || 0), estimatedProfit: Number(i.estimated_profit || 0), realProfit: i.real_profit == null ? null : Number(i.real_profit), notes: i.notes });
const mapBudget = (b) => ({ id: b.id, projectId: b.project_id, category: b.category, description: b.description, estimatedValue: Number(b.estimated_value || 0) });
const mapCost = (a) => ({ id: a.id, projectId: a.project_id, budgetItemId: a.budget_item_id, category: a.category, description: a.description, value: Number(a.value || 0), date: a.date, supplier: a.supplier, receiptPath: a.receipt_path || null });
const mapDoc = (d) => ({ id: d.id, projectId: d.project_id, categoria: d.categoria, titulo: d.titulo, descricao: d.descricao, path: d.path, data: d.data, validade: d.validade });
const mapFoto = (f) => ({ id: f.id, projectId: f.project_id, path: f.path, legenda: f.legenda, etapa: f.etapa, data: f.data });
const mapNC = (n) => ({ id: n.id, projectId: n.project_id, titulo: n.titulo, descricao: n.descricao, categoria: n.categoria, gravidade: n.gravidade, responsavel: n.responsavel, dataAbertura: n.data_abertura, prazo: n.prazo, status: n.status, dataResolucao: n.data_resolucao, acaoCorretiva: n.acao_corretiva, pathFoto: n.path_foto });
const mapReq = (r) => ({ id: r.id, projectId: r.project_id, categoria: r.categoria, item: r.item, descricao: r.descricao, status: r.status, responsavel: r.responsavel, prazo: r.prazo, observacao: r.observacao, pathDoc: r.path_doc });
const mapEtapa = (e) => ({ id: e.id, projectId: e.project_id, ordem: e.ordem, nome: e.nome, status: e.status, dataConclusao: e.data_conclusao, fotoPath: e.foto_path || null });
const mapUEtapa = (e) => ({ id: e.id, unitId: e.unit_id, ordem: e.ordem, nome: e.nome, status: e.status, dataConclusao: e.data_conclusao, fotoPath: e.foto_path || null });
const mapAtiv = (c) => ({ id: c.id, projectId: c.project_id, ordem: c.ordem, nome: c.nome, dataInicio: c.data_inicio, duracaoDias: Number(c.duracao_dias || 1), predecessoraId: c.predecessora_id, avancoPct: Number(c.avanco_pct || 0), responsavel: c.responsavel, critica: !!c.critica });
const mapVist = (v) => ({ id: v.id, projectId: v.project_id, ambiente: v.ambiente, item: v.item, status: v.status, observacao: v.observacao, responsavel: v.responsavel, prazo: v.prazo, pathFoto: v.path_foto, data: v.data });
const mapPrancha = (p) => ({ id: p.id, projectId: p.project_id, titulo: p.titulo, path: p.path, createdAt: p.created_at });
const mapPin = (p) => ({ id: p.id, pranchaId: p.prancha_id, xPct: Number(p.x_pct), yPct: Number(p.y_pct), item: p.item, status: p.status, observacao: p.observacao, responsavel: p.responsavel, prazo: p.prazo, pathFoto: p.path_foto, createdAt: p.created_at });

/* camelCase -> coluna */
const COLS = {
  project: { name: "name", address: "address", status: "status", progressoPct: "progresso_pct", municipio: "municipio", financiamento: "financiamento", capaPath: "capa_path", startDate: "start_date", endDateEstimated: "end_date_estimated", notes: "notes" },
  unit: { code: "code", area: "area_m2", type: "type", salePriceEstimated: "sale_price_estimated", salePriceReal: "sale_price_real", status: "status", custoDocumentacao: "custo_documentacao", custoCorretagem: "custo_corretagem" },
  investor: { name: "investor_name", amountInvested: "amount_invested", estimatedProfit: "estimated_profit", realProfit: "real_profit", notes: "notes" },
  budget: { category: "category", description: "description", estimatedValue: "estimated_value" },
  cost: { value: "value", date: "date", category: "category", description: "description", supplier: "supplier", budgetItemId: "budget_item_id", receiptPath: "receipt_path" },
  doc: { categoria: "categoria", titulo: "titulo", descricao: "descricao", data: "data", validade: "validade" },
  foto: { legenda: "legenda", etapa: "etapa", data: "data" },
  nc: { titulo: "titulo", descricao: "descricao", categoria: "categoria", gravidade: "gravidade", responsavel: "responsavel", prazo: "prazo", status: "status", dataResolucao: "data_resolucao", acaoCorretiva: "acao_corretiva", pathFoto: "path_foto" },
  req: { categoria: "categoria", item: "item", descricao: "descricao", status: "status", responsavel: "responsavel", prazo: "prazo", observacao: "observacao" },
  etapa: { nome: "nome", status: "status", dataConclusao: "data_conclusao", fotoPath: "foto_path", ordem: "ordem" },
  ativ: { nome: "nome", dataInicio: "data_inicio", duracaoDias: "duracao_dias", predecessoraId: "predecessora_id", avancoPct: "avanco_pct", responsavel: "responsavel", critica: "critica", ordem: "ordem" },
  vist: { status: "status", observacao: "observacao", responsavel: "responsavel", prazo: "prazo", item: "item", ambiente: "ambiente" },
  prancha: { titulo: "titulo" },
  pin: { xPct: "x_pct", yPct: "y_pct", item: "item", status: "status", observacao: "observacao", responsavel: "responsavel", prazo: "prazo", pathFoto: "path_foto" },
};
function toRow(kind, updates) {
  const map = COLS[kind]; const out = {};
  Object.entries(updates).forEach(([k, v]) => { if (map[k] && v !== undefined) out[map[k]] = v === "" ? null : v; });
  return out;
}

const EMPTY_DATA = { projects: [], units: [], investors: [], budgetItems: [], actualCosts: [], documentos: [], fotos: [], naoConformidades: [], requisitos: [], etapas: [], unidadeEtapas: [], cronograma: [], vistoria: [], pranchas: [], pins: [] };

/* notify(msg, kind) é chamado em sucesso/erro para o toast. */
function useConstrutoraStore(userId, notify = () => {}) {
  const [data, setData] = useState(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const dataRef = useRef(data); dataRef.current = data;

  const fail = (error, msg) => { if (error) { console.error(error); notify(msg || "Não foi possível salvar. Verifique a conexão e tente de novo.", "err"); return true; } return false; };

  const loadAll = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const q = (t, col, asc = true) => supabase.from(t).select("*").order(col, { ascending: asc });
    const r = await Promise.all([
      q("projects", "created_at"), q("units", "created_at"), q("investors", "created_at"), q("budget_items", "created_at"),
      q("actual_costs", "date", false), q("obra_documentos", "data", false), q("obra_fotos", "data", false),
      q("nao_conformidades", "data_abertura", false), q("requisitos_checklist", "categoria"), q("obra_etapas", "ordem"),
      q("unidade_etapas", "ordem"), q("obra_cronograma", "ordem"), q("obra_vistoria_itens", "data", false),
      q("obra_vistoria_pranchas", "created_at"), q("obra_vistoria_pins", "created_at"),
    ]);
    const rows = (i) => r[i].data || [];
    setData({
      projects: rows(0).map(mapProject), units: rows(1).map(mapUnit), investors: rows(2).map(mapInvestor),
      budgetItems: rows(3).map(mapBudget), actualCosts: rows(4).map(mapCost), documentos: rows(5).map(mapDoc),
      fotos: rows(6).map(mapFoto), naoConformidades: rows(7).map(mapNC), requisitos: rows(8).map(mapReq),
      etapas: rows(9).map(mapEtapa), unidadeEtapas: rows(10).map(mapUEtapa), cronograma: rows(11).map(mapAtiv),
      vistoria: rows(12).map(mapVist), pranchas: rows(13).map(mapPrancha), pins: rows(14).map(mapPin),
    });
    setLoading(false);
  }, [userId]);
  useEffect(() => { loadAll(); }, [loadAll]);

  /* genéricos */
  const insert = async (table, key, mapper, payload, { prepend = false } = {}) => {
    const { data: row, error } = await supabase.from(table).insert({ user_id: userId, ...payload }).select().single();
    if (fail(error)) return null;
    const item = mapper(row);
    setData((d) => ({ ...d, [key]: prepend ? [item, ...d[key]] : [...d[key], item] }));
    return item;
  };
  const update = async (table, key, kind, id, updates) => {
    const payload = toRow(kind, updates);
    setData((d) => ({ ...d, [key]: d[key].map((x) => (x.id === id ? { ...x, ...updates } : x)) }));
    if (!Object.keys(payload).length) return;
    const { error } = await supabase.from(table).update(payload).eq("id", id);
    if (fail(error)) loadAll();
  };
  const remove = async (table, key, id, extra) => {
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (fail(error, "Não foi possível excluir.")) return;
    setData((d) => ({ ...d, [key]: d[key].filter((x) => x.id !== id), ...(extra ? extra(d) : {}) }));
  };
  const nextOrdem = (list) => (list.length ? Math.max(...list.map((x) => x.ordem || 0)) : 0) + 1;
  const withFile = async (file) => {
    if (!file) return null;
    const path = await uploadObraFile(userId, file);
    if (!path) notify("Não foi possível enviar o arquivo.", "err");
    return path;
  };

  /* obras */
  const addProject = (p) => insert("projects", "projects", mapProject, { name: p.name, address: p.address || null, status: p.status || "em_andamento", municipio: p.municipio || "Paulista/PE" });
  const updateProject = (id, u) => update("projects", "projects", "project", id, u);
  const deleteProject = (id) => remove("projects", "projects", id);
  const setCapa = async (projectId, file) => { const path = await withFile(file); if (path) { await updateProject(projectId, { capaPath: path }); notify("Capa atualizada"); } };

  /* unidades e investidores */
  const addUnit = (u) => insert("units", "units", mapUnit, { project_id: u.projectId, code: u.code, area_m2: u.area || null, type: u.type || "propria", sale_price_estimated: u.salePriceEstimated || 0, status: "disponivel" });
  const updateUnit = (id, u) => update("units", "units", "unit", id, u);
  const deleteUnit = (id) => remove("units", "units", id, (d) => ({ investors: d.investors.filter((i) => i.unitId !== id), unidadeEtapas: d.unidadeEtapas.filter((e) => e.unitId !== id) }));
  const addInvestor = (i) => insert("investors", "investors", mapInvestor, { unit_id: i.unitId, investor_name: i.name, amount_invested: i.amountInvested || 0, estimated_profit: i.estimatedProfit || 0 });
  const updateInvestor = (id, u) => update("investors", "investors", "investor", id, u);
  const deleteInvestor = (id) => remove("investors", "investors", id);

  /* orçamento e custos */
  const addBudgetItem = (b) => insert("budget_items", "budgetItems", mapBudget, { project_id: b.projectId, category: b.category, description: b.description || null, estimated_value: b.estimatedValue });
  const updateBudgetItem = (id, u) => update("budget_items", "budgetItems", "budget", id, u);
  const deleteBudgetItem = (id) => remove("budget_items", "budgetItems", id);
  const addActualCost = async (a) => {
    const receiptPath = a.receiptFile ? await uploadReceipt(userId, a.receiptFile) : null;
    return insert("actual_costs", "actualCosts", mapCost, { project_id: a.projectId, budget_item_id: a.budgetItemId || null, category: a.category, description: a.description || null, value: a.value, date: a.date || todayISO(), supplier: a.supplier || null, receipt_path: receiptPath }, { prepend: true });
  };
  const updateActualCost = (id, u) => update("actual_costs", "actualCosts", "cost", id, u);
  const setCostReceipt = async (id, file) => { const p = await uploadReceipt(userId, file); if (!p) { notify("Não foi possível enviar o comprovante.", "err"); return; } await updateActualCost(id, { receiptPath: p }); };
  const deleteActualCost = (id) => remove("actual_costs", "actualCosts", id);

  /* documentos e fotos */
  const addDocumento = async (doc) => {
    const path = await withFile(doc.file); if (doc.file && !path) return null;
    return insert("obra_documentos", "documentos", mapDoc, { project_id: doc.projectId, categoria: doc.categoria, titulo: doc.titulo, descricao: doc.descricao || null, path, data: doc.data || todayISO(), validade: doc.validade || null }, { prepend: true });
  };
  const updateDocumento = (id, u) => update("obra_documentos", "documentos", "doc", id, u);
  const deleteDocumento = (id) => remove("obra_documentos", "documentos", id);
  const addFoto = async (f) => {
    const path = await withFile(f.file); if (!path) return null;
    return insert("obra_fotos", "fotos", mapFoto, { project_id: f.projectId, path, legenda: f.legenda || null, etapa: f.etapa || null, data: f.data || todayISO() }, { prepend: true });
  };
  const updateFoto = (id, u) => update("obra_fotos", "fotos", "foto", id, u);
  const deleteFoto = (id) => remove("obra_fotos", "fotos", id);

  /* não conformidades */
  const addNaoConformidade = async (n) => {
    const pathFoto = await withFile(n.file);
    return insert("nao_conformidades", "naoConformidades", mapNC, { project_id: n.projectId, titulo: n.titulo, descricao: n.descricao || null, categoria: n.categoria || "execucao", gravidade: n.gravidade || "media", responsavel: n.responsavel || null, data_abertura: n.dataAbertura || todayISO(), prazo: n.prazo || null, status: "aberta", path_foto: pathFoto }, { prepend: true });
  };
  const updateNaoConformidade = (id, u) => update("nao_conformidades", "naoConformidades", "nc", id, u);
  const setNcFoto = async (id, file) => { const p = await withFile(file); if (p) await updateNaoConformidade(id, { pathFoto: p }); };
  const deleteNaoConformidade = (id) => remove("nao_conformidades", "naoConformidades", id);

  /* requisitos */
  const addRequisito = (r) => insert("requisitos_checklist", "requisitos", mapReq, { project_id: r.projectId, categoria: r.categoria || "municipal", item: r.item, descricao: r.descricao || null, status: r.status || "pendente" });
  const addRequisitosSugeridos = async (projectId) => {
    const existentes = new Set(dataRef.current.requisitos.filter((r) => r.projectId === projectId).map((r) => r.item.trim().toLowerCase()));
    const novos = REQUISITOS_SUGERIDOS.filter(([, item]) => !existentes.has(item.toLowerCase())).map(([categoria, item, descricao]) => ({ user_id: userId, project_id: projectId, categoria, item, descricao, status: "pendente" }));
    if (!novos.length) return 0;
    const { data: rows, error } = await supabase.from("requisitos_checklist").insert(novos).select();
    if (fail(error)) return 0;
    setData((d) => ({ ...d, requisitos: [...d.requisitos, ...rows.map(mapReq)] }));
    return rows.length;
  };
  const updateRequisito = (id, u) => update("requisitos_checklist", "requisitos", "req", id, u);
  const deleteRequisito = (id) => remove("requisitos_checklist", "requisitos", id);

  /* etapas (obra e unidade) */
  const addEtapa = (e) => insert("obra_etapas", "etapas", mapEtapa, { project_id: e.projectId, ordem: nextOrdem(dataRef.current.etapas.filter((x) => x.projectId === e.projectId)), nome: e.nome, status: "pendente" });
  const addEtapasPadrao = async (projectId) => {
    const atuais = dataRef.current.etapas.filter((x) => x.projectId === projectId);
    const nomes = new Set(atuais.map((e) => e.nome.toLowerCase()));
    let ordem = nextOrdem(atuais);
    const novos = ETAPAS_SUGERIDAS.filter((n) => !nomes.has(n.toLowerCase())).map((nome) => ({ user_id: userId, project_id: projectId, ordem: ordem++, nome, status: "pendente" }));
    if (!novos.length) return 0;
    const { data: rows, error } = await supabase.from("obra_etapas").insert(novos).select();
    if (fail(error)) return 0;
    setData((d) => ({ ...d, etapas: [...d.etapas, ...rows.map(mapEtapa)] })); return rows.length;
  };
  const updateEtapa = (id, u) => update("obra_etapas", "etapas", "etapa", id, u);
  const deleteEtapa = (id) => remove("obra_etapas", "etapas", id);
  const setEtapaFoto = async (id, file) => { const p = await withFile(file); if (p) { await updateEtapa(id, { fotoPath: p }); notify("Foto adicionada à etapa"); } };

  const addEtapaUnidade = (e) => insert("unidade_etapas", "unidadeEtapas", mapUEtapa, { unit_id: e.unitId, ordem: nextOrdem(dataRef.current.unidadeEtapas.filter((x) => x.unitId === e.unitId)), nome: e.nome, status: "pendente" });
  const addEtapasPadraoUnidade = async (unitId) => {
    const atuais = dataRef.current.unidadeEtapas.filter((x) => x.unitId === unitId);
    const nomes = new Set(atuais.map((e) => e.nome.toLowerCase()));
    let ordem = nextOrdem(atuais);
    const novos = ETAPAS_SUGERIDAS.filter((n) => !nomes.has(n.toLowerCase())).map((nome) => ({ user_id: userId, unit_id: unitId, ordem: ordem++, nome, status: "pendente" }));
    if (!novos.length) return 0;
    const { data: rows, error } = await supabase.from("unidade_etapas").insert(novos).select();
    if (fail(error)) return 0;
    setData((d) => ({ ...d, unidadeEtapas: [...d.unidadeEtapas, ...rows.map(mapUEtapa)] })); return rows.length;
  };
  const updateEtapaUnidade = (id, u) => update("unidade_etapas", "unidadeEtapas", "etapa", id, u);
  const deleteEtapaUnidade = (id) => remove("unidade_etapas", "unidadeEtapas", id);
  const setEtapaUnidadeFoto = async (id, file) => { const p = await withFile(file); if (p) { await updateEtapaUnidade(id, { fotoPath: p }); notify("Foto adicionada à etapa"); } };

  /* cronograma */
  const addAtividade = (a) => insert("obra_cronograma", "cronograma", mapAtiv, {
    project_id: a.projectId, ordem: nextOrdem(dataRef.current.cronograma.filter((x) => x.projectId === a.projectId)), nome: a.nome,
    data_inicio: a.dataInicio || todayISO(), duracao_dias: a.duracaoDias || 1, predecessora_id: a.predecessoraId || null, responsavel: a.responsavel || null, avanco_pct: a.avancoPct || 0,
  });
  /* insere em sequência, cada uma tendo a anterior como predecessora (a cascata de atraso funciona entre elas) */
  const addAtividadesEncadeadas = async (projectId, itens, dataInicial) => {
    const atuais = dataRef.current.cronograma.filter((x) => x.projectId === projectId).sort((a, b) => a.ordem - b.ordem);
    const nomes = new Set(atuais.map((a) => a.nome.toLowerCase()));
    let ordem = nextOrdem(atuais);
    let anterior = atuais[atuais.length - 1] || null;
    let cursor = anterior ? addDaysISO(anterior.dataInicio, anterior.duracaoDias) : (dataInicial || todayISO());
    let n = 0;
    for (const [nome, dur] of itens) {
      if (nomes.has(nome.toLowerCase())) continue;
      // eslint-disable-next-line no-await-in-loop
      const { data: row, error } = await supabase.from("obra_cronograma").insert({ user_id: userId, project_id: projectId, ordem: ordem++, nome, data_inicio: cursor, duracao_dias: dur, predecessora_id: anterior?.id || null }).select().single();
      if (fail(error)) break;
      const item = mapAtiv(row);
      setData((d) => ({ ...d, cronograma: [...d.cronograma, item] }));
      anterior = item; cursor = addDaysISO(cursor, dur); n++;
    }
    return n;
  };
  const updateAtividade = (id, u) => update("obra_cronograma", "cronograma", "ativ", id, u);
  const deleteAtividade = (id) => remove("obra_cronograma", "cronograma", id, (d) => ({ cronograma: d.cronograma.filter((x) => x.id !== id).map((x) => (x.predecessoraId === id ? { ...x, predecessoraId: null } : x)) }));

  /* vistoria antiga (lista por ambiente) — mantida para não perder dados */
  const updateVistoriaItem = (id, u) => update("obra_vistoria_itens", "vistoria", "vist", id, u);
  const deleteVistoriaItem = (id) => remove("obra_vistoria_itens", "vistoria", id);

  /* vistoria em planta */
  const addPrancha = async ({ projectId, titulo, file }) => {
    const path = await withFile(file); if (!path) return null;
    return insert("obra_vistoria_pranchas", "pranchas", mapPrancha, { project_id: projectId, titulo, path });
  };
  const updatePrancha = (id, u) => update("obra_vistoria_pranchas", "pranchas", "prancha", id, u);
  const deletePrancha = (id) => remove("obra_vistoria_pranchas", "pranchas", id, (d) => ({ pins: d.pins.filter((p) => p.pranchaId !== id) }));
  const addPin = async (p) => {
    const pathFoto = await withFile(p.file);
    return insert("obra_vistoria_pins", "pins", mapPin, { prancha_id: p.pranchaId, x_pct: p.xPct, y_pct: p.yPct, item: p.item, status: p.status || "pendente", observacao: p.observacao || null, responsavel: p.responsavel || null, prazo: p.prazo || null, path_foto: pathFoto });
  };
  const updatePin = (id, u) => update("obra_vistoria_pins", "pins", "pin", id, u);
  const setPinFoto = async (id, file) => { const p = await withFile(file); if (p) await updatePin(id, { pathFoto: p }); };
  const deletePin = (id) => remove("obra_vistoria_pins", "pins", id);

  return {
    data, loading, reload: loadAll, userId,
    addProject, updateProject, deleteProject, setCapa,
    addUnit, updateUnit, deleteUnit, addInvestor, updateInvestor, deleteInvestor,
    addBudgetItem, updateBudgetItem, deleteBudgetItem, addActualCost, updateActualCost, deleteActualCost, setCostReceipt,
    addDocumento, updateDocumento, deleteDocumento, addFoto, updateFoto, deleteFoto,
    addNaoConformidade, updateNaoConformidade, deleteNaoConformidade, setNcFoto,
    addRequisito, addRequisitosSugeridos, updateRequisito, deleteRequisito,
    addEtapa, addEtapasPadrao, updateEtapa, deleteEtapa, setEtapaFoto,
    addEtapaUnidade, addEtapasPadraoUnidade, updateEtapaUnidade, deleteEtapaUnidade, setEtapaUnidadeFoto,
    addAtividade, addAtividadesEncadeadas, updateAtividade, deleteAtividade,
    updateVistoriaItem, deleteVistoriaItem,
    addPrancha, updatePrancha, deletePrancha, addPin, updatePin, setPinFoto, deletePin,
  };
}

/* ======================= 05-ui.jsx ======================= */
/* Sistema visual "Prancheta": papel milimetrado, grafite, azul de prancha.
   Tudo via classes + variáveis CSS (tema claro/escuro em :root[data-theme]). */
/* @icons Check X AlertTriangle Camera ImagePlus Trash2 ChevronLeft ChevronRight Paperclip Loader2 Info */

const FONTS_HREF = "https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,100..900&family=Hanken+Grotesk:wght@400;500;600;700&display=swap";

const CSS = `
:root, :root[data-theme="light"] {
  --paper:#ECEDE8; --sheet:#FBFBF9; --sheet-2:#F4F5F1; --sunken:#E5E7E0;
  --line:#DADCD4; --line-strong:#C3C7BC;
  --ink:#1C2127; --ink-2:#4E5761; --ink-3:#7A828B;
  --blue:#2348E8; --blue-soft:#E2E7FD; --blue-ink:#1A36B5;
  --ok:#13805A; --ok-soft:#DBF0E5; --warn:#B87908; --warn-soft:#FBEFD1; --danger:#CC3426; --danger-soft:#FAE2DE;
  --grid:rgba(28,33,39,.055); --btn-ink:#1C2127; --btn-ink-text:#FBFBF9;
  --shadow-1:0 1px 0 rgba(28,33,39,.03),0 1px 3px rgba(28,33,39,.07);
  --shadow-2:0 2px 6px rgba(28,33,39,.06),0 18px 40px -16px rgba(28,33,39,.28);
  --overlay:rgba(18,22,27,.46);
  color-scheme: light;
}
:root[data-theme="dark"] {
  --paper:#111519; --sheet:#181D22; --sheet-2:#1D2329; --sunken:#0D1013;
  --line:#2A3138; --line-strong:#3A434C;
  --ink:#E7EAED; --ink-2:#AAB2BA; --ink-3:#76808A;
  --blue:#7D94FF; --blue-soft:#1F2846; --blue-ink:#AFBDFF;
  --ok:#40C98B; --ok-soft:#13302A; --warn:#EDB13E; --warn-soft:#33290F; --danger:#FF6E61; --danger-soft:#3A1916;
  --grid:rgba(255,255,255,.028); --btn-ink:#E7EAED; --btn-ink-text:#111519;
  --shadow-1:0 1px 0 rgba(0,0,0,.25); --shadow-2:0 20px 50px -18px rgba(0,0,0,.7);
  --overlay:rgba(0,0,0,.6);
  color-scheme: dark;
}
* { box-sizing: border-box; }
html, body { margin:0; }
body {
  background-color: var(--paper);
  background-image: linear-gradient(var(--grid) 1px, transparent 1px), linear-gradient(90deg, var(--grid) 1px, transparent 1px);
  background-size: 24px 24px; background-attachment: fixed;
  color: var(--ink); font-family: 'Hanken Grotesk', system-ui, sans-serif; font-size: 15px; line-height: 1.5;
  -webkit-font-smoothing: antialiased; -webkit-tap-highlight-color: transparent;
}
button, input, select, textarea { font: inherit; color: inherit; }
button { cursor: pointer; }
:focus-visible { outline: 2px solid var(--blue); outline-offset: 2px; border-radius: 6px; }
::selection { background: var(--blue-soft); }

.t-display { font-family: 'Archivo', sans-serif; font-stretch: 72%; font-weight: 800; letter-spacing: -0.005em; line-height: 1.02; }
.t-num { font-family: 'Archivo', sans-serif; font-stretch: 86%; font-variant-numeric: tabular-nums; font-weight: 700; letter-spacing: -0.01em; }
.t-title { font-family: 'Archivo', sans-serif; font-stretch: 82%; font-weight: 750; font-size: 20px; line-height: 1.15; margin: 0; }
.t-h2 { font-family: 'Archivo', sans-serif; font-stretch: 90%; font-weight: 700; font-size: 16px; line-height: 1.25; margin: 0; }
.t-sm { font-size: 13px; } .t-xs { font-size: 12px; }
.t-muted { color: var(--ink-3); } .t-soft { color: var(--ink-2); }
.t-ok { color: var(--ok); } .t-warn { color: var(--warn); } .t-danger { color: var(--danger); } .t-blue { color: var(--blue); }
.clip { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }

.sheet { background: var(--sheet); border: 1px solid var(--line); border-radius: 16px; box-shadow: var(--shadow-1); }
.pad { padding: 20px; } .pad-sm { padding: 14px 16px; }
@media (max-width: 640px) { .pad { padding: 16px; } }
.stack { display: flex; flex-direction: column; } .gap-4{gap:4px}.gap-6{gap:6px}.gap-8{gap:8px}.gap-12{gap:12px}.gap-16{gap:16px}.gap-20{gap:20px}.gap-24{gap:24px}
.row { display: flex; align-items: center; } .wrap { flex-wrap: wrap; } .between { justify-content: space-between; } .grow { flex: 1; min-width: 0; }
.mb-8{margin-bottom:8px}.mb-12{margin-bottom:12px}.mb-16{margin-bottom:16px}.mb-24{margin-bottom:24px}.mt-8{margin-top:8px}.mt-16{margin-top:16px}
.grid { display: grid; gap: 16px; }
.cols-2 { grid-template-columns: repeat(2, minmax(0,1fr)); } .cols-3 { grid-template-columns: repeat(3, minmax(0,1fr)); } .cols-4 { grid-template-columns: repeat(4, minmax(0,1fr)); }
@media (max-width: 900px) { .cols-3, .cols-4 { grid-template-columns: repeat(2, minmax(0,1fr)); } }
@media (max-width: 560px) { .cols-2.sm-1, .cols-3.sm-1, .cols-4.sm-1 { grid-template-columns: 1fr; } }
.divide > * + * { border-top: 1px solid var(--line); }
.hr { height: 1px; background: var(--line); border: 0; margin: 0; }

/* botões */
.btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; height: 40px; padding: 0 16px; border-radius: 10px; border: 1px solid transparent; font-weight: 600; font-size: 14px; white-space: nowrap; background: transparent; transition: transform .12s ease, background-color .15s ease, border-color .15s ease, opacity .15s; user-select: none; }
.btn:active:not(:disabled) { transform: scale(.97); }
.btn:disabled { opacity: .5; cursor: not-allowed; }
.btn-ink { background: var(--btn-ink); color: var(--btn-ink-text); }
.btn-ink:hover:not(:disabled) { opacity: .9; }
.btn-blue { background: var(--blue); color: #fff; }
.btn-line { border-color: var(--line-strong); background: var(--sheet); }
.btn-line:hover:not(:disabled) { border-color: var(--ink-3); }
.btn-quiet { color: var(--ink-2); }
.btn-quiet:hover:not(:disabled) { background: var(--sunken); color: var(--ink); }
.btn-danger { background: var(--danger); color: #fff; }
.btn-sm { height: 32px; padding: 0 12px; font-size: 13px; border-radius: 8px; gap: 6px; }
.btn-block { width: 100%; }
.icon-btn { width: 36px; height: 36px; padding: 0; border-radius: 10px; display: inline-flex; align-items: center; justify-content: center; border: 1px solid transparent; background: transparent; color: var(--ink-2); flex-shrink: 0; transition: background-color .15s, color .15s; position: relative; }
.icon-btn:hover { background: var(--sunken); color: var(--ink); }
.icon-btn.sm { width: 30px; height: 30px; border-radius: 8px; }
.icon-btn.danger:hover { background: var(--danger-soft); color: var(--danger); }
[data-tip] { position: relative; }
@media (hover: hover) {
  [data-tip]:hover::after, [data-tip]:focus-visible::after { content: attr(data-tip); position: absolute; bottom: calc(100% + 6px); left: 50%; transform: translateX(-50%); background: #14181C; color: #F2F3F4; font-size: 12px; font-weight: 500; padding: 5px 8px; border-radius: 6px; white-space: nowrap; pointer-events: none; z-index: 60; }
}
.link { background: none; border: 0; padding: 0; color: var(--blue); font-weight: 600; font-size: 13px; }
.link:hover { text-decoration: underline; }

/* campos */
.field { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.field > label, .label { font-size: 13px; font-weight: 600; color: var(--ink-2); }
.field .hint { font-size: 12px; color: var(--ink-3); }
.input, .select, .textarea { width: 100%; height: 42px; background: var(--sheet); border: 1px solid var(--line-strong); border-radius: 10px; padding: 0 12px; font-size: 15px; outline: none; transition: border-color .15s, box-shadow .15s; min-width: 0; }
.textarea { height: auto; padding: 10px 12px; resize: vertical; min-height: 72px; }
.input:focus, .select:focus, .textarea:focus { border-color: var(--blue); box-shadow: 0 0 0 3px var(--blue-soft); }
.input.sm, .select.sm { height: 34px; font-size: 14px; border-radius: 8px; padding: 0 10px; }
@media (max-width: 640px) { .input, .select, .textarea { font-size: 16px; } }
.select { appearance: none; background-image: linear-gradient(45deg, transparent 50%, var(--ink-3) 50%), linear-gradient(135deg, var(--ink-3) 50%, transparent 50%); background-position: calc(100% - 17px) 18px, calc(100% - 12px) 18px; background-size: 5px 5px; background-repeat: no-repeat; padding-right: 32px; }
.select.sm { background-position: calc(100% - 15px) 14px, calc(100% - 10px) 14px; }
input[type=range] { accent-color: var(--blue); }
.file-drop { display: flex; align-items: center; gap: 10px; border: 1px dashed var(--line-strong); border-radius: 10px; padding: 12px 14px; color: var(--ink-2); font-size: 14px; cursor: pointer; transition: border-color .15s, background-color .15s; }
.file-drop:hover { border-color: var(--blue); background: var(--blue-soft); color: var(--blue-ink); }
.file-drop input { display: none; }

/* pills de status */
.pill { display: inline-flex; align-items: center; gap: 6px; height: 24px; padding: 0 10px; border-radius: 999px; font-size: 12px; font-weight: 600; white-space: nowrap; background: var(--sunken); color: var(--ink-2); }
.pill::before { content: ""; width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
.pill.nodot::before { display: none; }
.pill.ok { background: var(--ok-soft); color: var(--ok); } .pill.warn { background: var(--warn-soft); color: var(--warn); }
.pill.danger { background: var(--danger-soft); color: var(--danger); } .pill.blue { background: var(--blue-soft); color: var(--blue-ink); }

/* segmented control com pílula deslizante (mola) */
.seg { position: relative; display: inline-flex; background: var(--sunken); border-radius: 12px; padding: 3px; gap: 2px; max-width: 100%; overflow-x: auto; scrollbar-width: none; }
.seg::-webkit-scrollbar { display: none; }
.seg-thumb { position: absolute; top: 3px; bottom: 3px; left: 0; border-radius: 9px; background: var(--sheet); box-shadow: 0 1px 2px rgba(0,0,0,.08), 0 2px 8px -2px rgba(0,0,0,.12); transition: transform .42s cubic-bezier(.34,1.45,.64,1), width .42s cubic-bezier(.34,1.45,.64,1); z-index: 0; }
.seg-btn { position: relative; z-index: 1; border: 0; background: transparent; height: 34px; padding: 0 14px; border-radius: 9px; font-size: 14px; font-weight: 600; color: var(--ink-3); white-space: nowrap; transition: color .2s; display: inline-flex; align-items: center; gap: 6px; }
.seg-btn[aria-selected="true"] { color: var(--ink); }
.seg.sm .seg-btn { height: 28px; padding: 0 10px; font-size: 13px; }
.seg .count { font-size: 11px; font-weight: 700; background: var(--danger); color: #fff; border-radius: 99px; min-width: 18px; height: 18px; padding: 0 5px; display: inline-flex; align-items: center; justify-content: center; }

/* abas sublinhadas */
.utabs { position: relative; display: flex; gap: 22px; border-bottom: 1px solid var(--line); overflow-x: auto; scrollbar-width: none; }
.utabs::-webkit-scrollbar { display: none; }
.utab { border: 0; background: none; padding: 12px 0 11px; font-size: 14px; font-weight: 600; color: var(--ink-3); white-space: nowrap; transition: color .15s; }
.utab[aria-selected="true"] { color: var(--ink); }
.utab:hover { color: var(--ink); }
.utabs-bar { position: absolute; bottom: -1px; left: 0; height: 2px; background: var(--ink); border-radius: 2px; transition: transform .35s cubic-bezier(.2,.8,.2,1), width .35s cubic-bezier(.2,.8,.2,1); }

/* régua de progresso (mira) */
.ruler { position: relative; height: 10px; background: var(--sunken); border-radius: 3px; overflow: hidden; }
.ruler-fill { position: absolute; inset: 0 auto 0 0; background: var(--blue); border-radius: 3px; transition: width 1s cubic-bezier(.2,.8,.2,1); }
.ruler-ticks { position: absolute; inset: 0; background-image: repeating-linear-gradient(90deg, transparent 0 calc(10% - 1px), rgba(255,255,255,.75) calc(10% - 1px) 10%); pointer-events: none; }
:root[data-theme="dark"] .ruler-ticks { background-image: repeating-linear-gradient(90deg, transparent 0 calc(10% - 1px), rgba(0,0,0,.55) calc(10% - 1px) 10%); }
.ruler.ok .ruler-fill { background: var(--ok); } .ruler.warn .ruler-fill { background: var(--warn); } .ruler.danger .ruler-fill { background: var(--danger); }
.ruler.thin { height: 6px; }

/* skeleton */
.skel { background: linear-gradient(90deg, var(--sunken) 0%, var(--sheet-2) 50%, var(--sunken) 100%); background-size: 200% 100%; animation: skel 1.3s ease-in-out infinite; border-radius: 8px; }
@keyframes skel { from { background-position: 200% 0; } to { background-position: -200% 0; } }

/* odômetro */
.odo { display: inline-flex; overflow: hidden; line-height: 1; vertical-align: bottom; }
.odo-col { display: inline-block; height: 1em; overflow: hidden; position: relative; }
.odo-strip { display: flex; flex-direction: column; transition: transform 1.25s cubic-bezier(.16,1,.3,1); }
.odo-strip > span { height: 1em; display: block; text-align: center; }
.odo.rolling .odo-strip { animation: odoBlur 1.25s cubic-bezier(.16,1,.3,1); }
@keyframes odoBlur { 0% { filter: blur(0); } 25% { filter: blur(1.2px); } 100% { filter: blur(0); } }

/* clique → feito */
.done { position: relative; width: 30px; height: 30px; border-radius: 50%; border: 2px solid var(--line-strong); background: var(--sheet); display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; padding: 0; transition: transform .18s cubic-bezier(.34,1.56,.64,1), background-color .2s, border-color .2s; }
.done:hover { border-color: var(--ink-3); }
.done:active { transform: scale(.82); }
.done svg.arc { position: absolute; inset: -2px; transform: rotate(-90deg); }
.done.andamento { border-color: var(--warn-soft); }
.done.concluida { background: var(--ok); border-color: var(--ok); }
.done .tick { stroke: #fff; stroke-width: 3; fill: none; stroke-linecap: round; stroke-linejoin: round; stroke-dasharray: 22; stroke-dashoffset: 0; }
.done.pop .tick { animation: tickDraw .45s .08s cubic-bezier(.65,0,.35,1) both; }
.done.pop { animation: donePop .5s cubic-bezier(.34,1.56,.64,1); }
.done.pop::after { content: ""; position: absolute; inset: -2px; border-radius: 50%; border: 2px solid var(--ok); animation: ripple .7s ease-out forwards; }
@keyframes tickDraw { from { stroke-dashoffset: 22; } to { stroke-dashoffset: 0; } }
@keyframes donePop { 0% { transform: scale(.7); } 60% { transform: scale(1.12); } 100% { transform: scale(1); } }
@keyframes ripple { from { transform: scale(1); opacity: .9; } to { transform: scale(2.1); opacity: 0; } }
.done.sm { width: 24px; height: 24px; }

/* gaveta / bottom sheet */
.drawer-wrap { position: fixed; inset: 0; z-index: 70; display: flex; justify-content: flex-end; }
.drawer-bg { position: absolute; inset: 0; background: var(--overlay); animation: fadeIn .25s ease both; }
.drawer { position: relative; width: min(480px, 100%); height: 100%; background: var(--sheet); border-left: 1px solid var(--line); display: flex; flex-direction: column; animation: slideIn .34s cubic-bezier(.2,.85,.2,1) both; box-shadow: var(--shadow-2); }
.drawer-head { display: flex; align-items: flex-start; gap: 12px; padding: 18px 20px 14px; border-bottom: 1px solid var(--line); }
.drawer-body { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 16px; }
.drawer-foot { padding: 14px 20px calc(14px + env(safe-area-inset-bottom)); border-top: 1px solid var(--line); display: flex; gap: 10px; justify-content: flex-end; }
.drawer-wrap.closing .drawer-bg { animation: fadeOut .2s ease both; }
.drawer-wrap.closing .drawer { animation: slideOut .22s ease-in both; }
@media (max-width: 720px) {
  .drawer-wrap { align-items: flex-end; }
  .drawer { width: 100%; height: auto; max-height: 92vh; border-left: 0; border-top: 1px solid var(--line); border-radius: 20px 20px 0 0; animation-name: sheetUp; }
  .drawer-wrap.closing .drawer { animation-name: sheetDown; }
  .drawer-head::before { content: ""; position: absolute; top: 7px; left: 50%; width: 38px; height: 4px; border-radius: 4px; background: var(--line-strong); transform: translateX(-50%); }
  .drawer-foot .btn { flex: 1; }
}
@keyframes fadeIn { from { opacity: 0; } } @keyframes fadeOut { to { opacity: 0; } }
@keyframes slideIn { from { transform: translateX(40px); opacity: 0; } } @keyframes slideOut { to { transform: translateX(40px); opacity: 0; } }
@keyframes sheetUp { from { transform: translateY(100%); } } @keyframes sheetDown { to { transform: translateY(100%); } }

/* ilha de notificação (toast) */
.island { position: fixed; top: calc(12px + env(safe-area-inset-top)); left: 50%; transform: translateX(-50%); z-index: 100; background: #101316; color: #F3F4F5; border-radius: 999px; height: 40px; display: flex; align-items: center; gap: 10px; padding: 0 16px 0 10px; box-shadow: 0 12px 30px -10px rgba(0,0,0,.5); animation: islandIn .55s cubic-bezier(.34,1.4,.64,1) both; max-width: calc(100vw - 24px); font-size: 14px; font-weight: 600; overflow: hidden; }
.island .dot { width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.island .msg { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; animation: fadeIn .3s .18s both; }
.island.out { animation: islandOut .35s cubic-bezier(.6,0,.8,.4) both; }
@keyframes islandIn { from { max-width: 40px; opacity: 0; transform: translate(-50%, -14px); } to { max-width: 560px; opacity: 1; transform: translate(-50%, 0); } }
@keyframes islandOut { to { max-width: 40px; opacity: 0; transform: translate(-50%, -14px); } }

/* listas */
.list-row { display: flex; align-items: center; gap: 12px; padding: 12px 16px; min-height: 56px; }
.list-row.top { align-items: flex-start; }
.list-row:hover .reveal { opacity: 1; }
.reveal { opacity: .55; transition: opacity .15s; }
@media (hover: none) { .reveal { opacity: 1; } }

/* kpi */
.kpi-label { font-size: 13px; color: var(--ink-2); font-weight: 600; }
.kpi-value { font-family: 'Archivo', sans-serif; font-stretch: 78%; font-weight: 800; font-size: 34px; line-height: 1.05; font-variant-numeric: tabular-nums; letter-spacing: -0.01em; }
.kpi-value.lg { font-size: 46px; }
.kpi-sub { font-size: 13px; color: var(--ink-3); }
@media (max-width: 640px) { .kpi-value { font-size: 28px; } .kpi-value.lg { font-size: 36px; } }

/* vazio */
.empty { display: flex; flex-direction: column; align-items: flex-start; gap: 10px; padding: 28px 24px; border: 1px dashed var(--line-strong); border-radius: 14px; background: repeating-linear-gradient(135deg, transparent 0 10px, var(--grid) 10px 11px); }
.empty .ico { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; background: var(--sheet); border: 1px solid var(--line); color: var(--ink-2); }

/* thumbs */
.thumb { position: relative; border-radius: 10px; overflow: hidden; background: var(--sunken); flex-shrink: 0; border: 1px solid var(--line); padding: 0; display: block; }
.thumb img { width: 100%; height: 100%; object-fit: cover; display: block; animation: fadeIn .3s ease both; }

/* gráficos */
.chart-bar { transform-box: fill-box; transform-origin: 50% 100%; animation: barUp .7s cubic-bezier(.34,1.5,.64,1) both; }
@keyframes barUp { 0% { transform: scaleY(0); } 70% { transform: scaleY(1.06); } 100% { transform: scaleY(1); } }
.chart-line { stroke-dasharray: var(--len); stroke-dashoffset: var(--len); animation: lineDraw 1.1s cubic-bezier(.65,0,.35,1) forwards; }
@keyframes lineDraw { to { stroke-dashoffset: 0; } }
.chart-dot { animation: dotPop .5s cubic-bezier(.34,1.6,.64,1) both; transform-box: fill-box; transform-origin: center; }
@keyframes dotPop { from { transform: scale(0); } }
.ring-arc { transition: stroke-dashoffset 1.1s cubic-bezier(.2,.8,.2,1); }

/* pins da vistoria */
@keyframes pulso { 0% { transform: translate(-50%,-50%) scale(1); opacity: .75; } 100% { transform: translate(-50%,-50%) scale(2.6); opacity: 0; } }
@keyframes pinDrop { 0% { transform: translate(-50%, -160%) scale(.6); opacity: 0; } 60% { transform: translate(-50%, -40%) scale(1.08); opacity: 1; } 100% { transform: translate(-50%,-50%) scale(1); } }

.spin { animation: spin 1s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: .001ms !important; animation-iteration-count: 1 !important; transition-duration: .001ms !important; }
}
`;

function useGlobalStyles() {
  useLayoutEffect(() => {
    if (!document.getElementById("pc-fonts")) {
      const l1 = document.createElement("link"); l1.rel = "preconnect"; l1.href = "https://fonts.gstatic.com"; l1.crossOrigin = "";
      const l2 = document.createElement("link"); l2.id = "pc-fonts"; l2.rel = "stylesheet"; l2.href = FONTS_HREF;
      document.head.append(l1, l2);
    }
    let s = document.getElementById("pc-css");
    if (!s) { s = document.createElement("style"); s.id = "pc-css"; document.head.appendChild(s); }
    s.textContent = CSS;
  }, []);
}

function cx(...a) { return a.filter(Boolean).join(" "); }

function useInView(opts = { threshold: 0.25 }) {
  const ref = useRef(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    if (seen || !ref.current) return;
    if (typeof IntersectionObserver === "undefined") { setSeen(true); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect(); } }, opts);
    io.observe(ref.current);
    return () => io.disconnect();
  }, [seen]); // eslint-disable-line
  return [ref, seen];
}

/* ---------- toast "ilha" ---------- */
const ToastCtx = React.createContext(() => {});
function useToast() { return React.useContext(ToastCtx); }
function ToastHost({ children }) {
  const [t, setT] = useState(null);
  const timers = useRef([]);
  const notify = useCallback((msg, kind = "ok") => {
    timers.current.forEach(clearTimeout);
    setT({ msg, kind, id: Date.now(), out: false });
    timers.current = [setTimeout(() => setT((x) => (x ? { ...x, out: true } : x)), 2600), setTimeout(() => setT(null), 3000)];
  }, []);
  return (
    <ToastCtx.Provider value={notify}>
      {children}
      {t && (
        <div key={t.id} className={cx("island", t.out && "out")} role="status" aria-live="polite">
          <span className="dot" style={{ background: t.kind === "err" ? "#E5483B" : "#1E9B66" }}>
            {t.kind === "err" ? <X size={13} strokeWidth={3} /> : <Check size={13} strokeWidth={3} />}
          </span>
          <span className="msg">{t.msg}</span>
        </div>
      )}
    </ToastCtx.Provider>
  );
}

/* ---------- primitivos ---------- */
function Sheet({ className, children, style, ...rest }) { return <section className={cx("sheet", className)} style={style} {...rest}>{children}</section>; }
function Pill({ tone, children, nodot, title }) { return <span className={cx("pill", tone, nodot && "nodot")} title={title}>{children}</span>; }
function Field({ label, hint, children, style }) {
  return <div className="field" style={style}>{label && <label>{label}</label>}{children}{hint && <span className="hint">{hint}</span>}</div>;
}
function IconBtn({ tip, onClick, children, danger, sm, ...rest }) {
  return <button type="button" className={cx("icon-btn", danger && "danger", sm && "sm")} data-tip={tip} aria-label={tip} onClick={onClick} {...rest}>{children}</button>;
}
function PageHeader({ title, sub, actions, children }) {
  return (
    <div className="row between wrap gap-12 mb-24">
      <div className="stack gap-4 grow">
        <h1 className="t-display" style={{ fontSize: "clamp(30px, 4.4vw, 44px)", margin: 0 }}>{title}</h1>
        {sub && <div className="t-soft">{sub}</div>}
        {children}
      </div>
      {actions && <div className="row gap-8 wrap">{actions}</div>}
    </div>
  );
}
function SectionHead({ title, sub, actions }) {
  return (
    <div className="row between gap-12 wrap" style={{ marginBottom: 12 }}>
      <div className="stack"><h2 className="t-h2">{title}</h2>{sub && <span className="t-sm t-muted">{sub}</span>}</div>
      {actions && <div className="row gap-8">{actions}</div>}
    </div>
  );
}
function EmptyState({ icon: Icon = Info, title, text, action }) {
  return (
    <div className="empty">
      <div className="ico"><Icon size={20} /></div>
      <div className="t-h2">{title}</div>
      {text && <div className="t-sm t-soft" style={{ maxWidth: 480 }}>{text}</div>}
      {action && <div className="mt-8 row gap-8 wrap">{action}</div>}
    </div>
  );
}
function Skeleton({ h = 16, w = "100%", r = 8, style }) { return <div className="skel" style={{ height: h, width: w, borderRadius: r, ...style }} />; }
function LoadingPage() {
  return (
    <div className="stack gap-16" aria-busy="true">
      <Skeleton h={44} w="45%" />
      <div className="grid cols-3 sm-1">{[0, 1, 2].map((i) => <Skeleton key={i} h={118} r={16} />)}</div>
      <Skeleton h={260} r={16} />
    </div>
  );
}

/* Régua de progresso estilo mira de topografia */
function Ruler({ pct, tone, thin, label }) {
  const v = Math.max(0, Math.min(100, Number(pct) || 0));
  const [w, setW] = useState(0);
  useEffect(() => { const r = requestAnimationFrame(() => setW(v)); return () => cancelAnimationFrame(r); }, [v]);
  return (
    <div className={cx("ruler", tone, thin && "thin")} role="progressbar" aria-valuenow={Math.round(v)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <div className="ruler-fill" style={{ width: `${w}%` }} />
      <div className="ruler-ticks" />
    </div>
  );
}

/* Segmented control com pílula que desliza com mola */
function Segmented({ options, value, onChange, size, ariaLabel, ...rest }) {
  const wrap = useRef(null);
  const [thumb, setThumb] = useState(null);
  const measure = useCallback(() => {
    const el = wrap.current?.querySelector(`[data-k="${CSS_ESC(value)}"]`);
    if (el) setThumb({ x: el.offsetLeft, w: el.offsetWidth });
  }, [value]);
  useLayoutEffect(() => { measure(); }, [measure, options.length]);
  useEffect(() => { window.addEventListener("resize", measure); document.fonts?.ready?.then(measure); return () => window.removeEventListener("resize", measure); }, [measure]);
  useEffect(() => {
    const w = wrap.current; const el = w?.querySelector(`[data-k="${CSS_ESC(value)}"]`);
    if (!w || !el || w.scrollWidth <= w.clientWidth) return;
    const l = el.offsetLeft - 12, r = el.offsetLeft + el.offsetWidth + 12;
    if (l < w.scrollLeft) w.scrollLeft = l; else if (r > w.scrollLeft + w.clientWidth) w.scrollLeft = r - w.clientWidth;
  }, [value]);
  return (
    <div ref={wrap} className={cx("seg", size)} role="tablist" aria-label={ariaLabel} {...rest}>
      {thumb && <span className="seg-thumb" style={{ transform: `translateX(${thumb.x - 3}px)`, width: thumb.w, left: 3 }} />}
      {options.map((o) => (
        <button key={o.value} type="button" role="tab" data-k={o.value} aria-selected={o.value === value} className="seg-btn" onClick={() => onChange(o.value)} data-tour={o.tour}>
          {o.icon && <o.icon size={15} />}{o.label}{o.count ? <span className="count">{o.count}</span> : null}
        </button>
      ))}
    </div>
  );
}
function CSS_ESC(v) { return String(v).replace(/"/g, '\\"'); }

/* Abas sublinhadas com barra deslizante */
function UTabs({ options, value, onChange }) {
  const wrap = useRef(null);
  const [bar, setBar] = useState(null);
  const measure = useCallback(() => {
    const el = wrap.current?.querySelector(`[data-k="${CSS_ESC(value)}"]`);
    if (el) setBar({ x: el.offsetLeft, w: el.offsetWidth });
  }, [value]);
  useLayoutEffect(() => { measure(); }, [measure, options]);
  useEffect(() => { window.addEventListener("resize", measure); document.fonts?.ready?.then(measure); return () => window.removeEventListener("resize", measure); }, [measure]);
  return (
    <div ref={wrap} className="utabs" role="tablist">
      {options.map((o) => (
        <button key={o.value} type="button" role="tab" data-k={o.value} aria-selected={o.value === value} className="utab" onClick={() => onChange(o.value)}>
          {o.label}{o.badge ? <span className="t-danger" style={{ marginLeft: 6, fontSize: 12 }}>{o.badge}</span> : null}
        </button>
      ))}
      {bar && <span className="utabs-bar" style={{ transform: `translateX(${bar.x}px)`, width: bar.w }} />}
    </div>
  );
}

/* Odômetro: cada dígito rola de forma independente até o valor */
function Odometer({ value, className, style }) {
  const str = String(value);
  const [shown, setShown] = useState(() => str.replace(/\d/g, "0"));
  const [rolling, setRolling] = useState(false);
  useEffect(() => {
    const r = requestAnimationFrame(() => { setShown(str); setRolling(true); });
    const t = setTimeout(() => setRolling(false), 1300);
    return () => { cancelAnimationFrame(r); clearTimeout(t); };
  }, [str]);
  return (
    <span className={cx("odo", rolling && "rolling", className)} style={style} aria-label={str}>
      {str.split("").map((ch, i) => {
        if (!/\d/.test(ch)) return <span key={i} aria-hidden="true" style={{ whiteSpace: "pre" }}>{ch}</span>;
        const d = Number(shown[i] && /\d/.test(shown[i]) ? shown[i] : 0);
        return (
          <span key={i} className="odo-col" aria-hidden="true">
            <span className="odo-strip" style={{ transform: `translateY(-${d}em)`, transitionDelay: `${(str.length - i) * 35}ms` }}>
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => <span key={n}>{n}</span>)}
            </span>
          </span>
        );
      })}
    </span>
  );
}

/* Clique → feito: círculo que vira check verde com ondulação */
function DoneCheck({ status = "pendente", onClick, size, tip }) {
  const [pop, setPop] = useState(false);
  const prev = useRef(status);
  useEffect(() => {
    if (status === "concluida" && prev.current !== "concluida") { setPop(true); const t = setTimeout(() => setPop(false), 750); prev.current = status; return () => clearTimeout(t); }
    prev.current = status;
  }, [status]);
  const s = size === "sm" ? 24 : 30;
  return (
    <button type="button" className={cx("done", status, pop && "pop", size)} onClick={onClick} aria-label={tip || ETAPA_STATUS[status]} data-tip={tip}>
      {status === "andamento" && (
        <svg className="arc" width={s} height={s} viewBox="0 0 30 30" aria-hidden="true"><circle cx="15" cy="15" r="14" fill="none" stroke="var(--warn)" strokeWidth="2.5" strokeDasharray="88" strokeDashoffset="44" strokeLinecap="round" /></svg>
      )}
      {status === "concluida" && <svg width={s * 0.5} height={s * 0.5} viewBox="0 0 16 16" aria-hidden="true"><path className="tick" d="M3 8.5l3.2 3.2L13 4.8" /></svg>}
    </button>
  );
}

/* Exclusão nomeada em dois toques */
function ConfirmDelete({ onConfirm, what = "este item", sm = true }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => { if (!armed) return; const t = setTimeout(() => setArmed(false), 3500); return () => clearTimeout(t); }, [armed]);
  if (armed) return <button type="button" className="btn btn-danger btn-sm" onClick={(e) => { e.stopPropagation(); setArmed(false); onConfirm(); }}>Excluir {what}</button>;
  return <IconBtn tip={`Excluir ${what}`} danger sm={sm} onClick={(e) => { e.stopPropagation(); setArmed(true); }}><Trash2 size={16} /></IconBtn>;
}

/* Gaveta lateral (desktop) / folha inferior (celular) */
function Drawer({ open, onClose, title, sub, children, footer, width }) {
  const [render, setRender] = useState(open);
  const [closing, setClosing] = useState(false);
  const panel = useRef(null);
  useEffect(() => {
    if (open) { setRender(true); setClosing(false); }
    else if (render) { setClosing(true); const t = setTimeout(() => { setRender(false); setClosing(false); }, 220); return () => clearTimeout(t); }
  }, [open]); // eslint-disable-line
  useEffect(() => {
    if (!open) return;
    const prevFocus = document.activeElement;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow; document.body.style.overflow = "hidden";
    const fino = window.matchMedia?.("(pointer: fine)").matches; // no celular não abre o teclado sozinho
    setTimeout(() => (fino ? panel.current?.querySelector("input:not([type=file]),select,textarea") : panel.current?.querySelector(".drawer-head button"))?.focus?.({ preventScroll: true }), 60);
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prevOverflow; prevFocus?.focus?.(); };
  }, [open]); // eslint-disable-line
  if (!render) return null;
  return createPortal(
    <div className={cx("drawer-wrap", closing && "closing")} role="dialog" aria-modal="true" aria-label={title}>
      <div className="drawer-bg" onClick={onClose} />
      <div ref={panel} className="drawer" style={width ? { width: `min(${width}px, 100%)` } : undefined}>
        <div className="drawer-head">
          <div className="grow stack gap-4"><div className="t-title">{title}</div>{sub && <div className="t-sm t-soft">{sub}</div>}</div>
          <IconBtn tip="Fechar" onClick={onClose}><X size={18} /></IconBtn>
        </div>
        <div className="drawer-body">{children}</div>
        {footer && <div className="drawer-foot">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}

/* Botão de arquivo — sem "capture": no celular o sistema pergunta câmera ou galeria. */
function FilePick({ onFile, accept = "image/*", children, className = "btn btn-line btn-sm", tip, disabled }) {
  return (
    <label className={className} data-tip={tip} aria-label={tip} style={disabled ? { opacity: .5, pointerEvents: "none" } : undefined}>
      {children}
      <input type="file" accept={accept} style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }} />
    </label>
  );
}
function FileField({ file, setFile, label = "Anexar foto ou PDF", accept = "image/*,application/pdf" }) {
  return (
    <label className="file-drop">
      {accept.startsWith("image") ? <Camera size={18} /> : <Paperclip size={18} />}
      <span className="clip grow">{file ? file.name : label}</span>
      {file && <button type="button" className="icon-btn sm" aria-label="Remover arquivo" onClick={(e) => { e.preventDefault(); setFile(null); }}><X size={14} /></button>}
      <input type="file" accept={accept} onChange={(e) => setFile(e.target.files?.[0] || null)} />
    </label>
  );
}

/* Miniatura de foto do bucket (URL assinada em cache) */
function Thumb({ path, w = 56, h = 56, onClick, alt = "", radius, style }) {
  const url = useSignedUrl(path);
  return (
    <button type="button" className="thumb" onClick={onClick || (() => openFile(path))} style={{ width: w, height: h, borderRadius: radius, ...style }} aria-label={alt || "Abrir foto"}>
      {url ? <img src={url} alt={alt} loading="lazy" /> : <div className="skel" style={{ width: "100%", height: "100%", borderRadius: 0 }} />}
    </button>
  );
}

/* Visualizador de fotos em tela cheia */
function Lightbox({ items, index, onClose, onIndex }) {
  const it = items[index];
  const url = useSignedUrl(it?.path);
  useEffect(() => {
    const k = (e) => { if (e.key === "Escape") onClose(); if (e.key === "ArrowRight") onIndex((index + 1) % items.length); if (e.key === "ArrowLeft") onIndex((index - 1 + items.length) % items.length); };
    document.addEventListener("keydown", k); return () => document.removeEventListener("keydown", k);
  }, [index, items.length]); // eslint-disable-line
  if (!it) return null;
  return createPortal(
    <div role="dialog" aria-modal="true" style={{ position: "fixed", inset: 0, zIndex: 90, background: "rgba(8,10,12,.92)", display: "flex", flexDirection: "column", animation: "fadeIn .2s both" }}>
      <div className="row between" style={{ padding: "12px 16px", color: "#fff" }}>
        <div className="stack"><strong>{it.title || ""}</strong><span style={{ opacity: .7, fontSize: 13 }}>{it.sub || ""}</span></div>
        <button className="icon-btn" style={{ color: "#fff" }} onClick={onClose} aria-label="Fechar"><X size={20} /></button>
      </div>
      <div className="grow row" style={{ justifyContent: "center", position: "relative", padding: 12 }}>
        {url ? <img src={url} alt={it.title || ""} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", borderRadius: 8 }} /> : <Loader2 className="spin" color="#fff" />}
        {items.length > 1 && <>
          <button className="icon-btn" style={{ position: "absolute", left: 12, color: "#fff", background: "rgba(255,255,255,.08)" }} onClick={() => onIndex((index - 1 + items.length) % items.length)} aria-label="Anterior"><ChevronLeft /></button>
          <button className="icon-btn" style={{ position: "absolute", right: 12, color: "#fff", background: "rgba(255,255,255,.08)" }} onClick={() => onIndex((index + 1) % items.length)} aria-label="Próxima"><ChevronRight /></button>
        </>}
      </div>
    </div>,
    document.body
  );
}

/* Anel de progresso */
function Ring({ pct, size = 64, stroke = 7, tone = "blue", children }) {
  const r = (size - stroke) / 2; const c = 2 * Math.PI * r;
  const [v, setV] = useState(0);
  useEffect(() => { const t = requestAnimationFrame(() => setV(Math.max(0, Math.min(100, pct || 0)))); return () => cancelAnimationFrame(t); }, [pct]);
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--sunken)" strokeWidth={stroke} />
        <circle className="ring-arc" cx={size / 2} cy={size / 2} r={r} fill="none" style={{ stroke: `var(--${tone})` }} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - v / 100)} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>{children}</div>
    </div>
  );
}

/* Barras que viram tendência: barras sobem com mola, uma linha passa pelos topos e um ponto pousa no fim. */
function useWidth() {
  const ref = useRef(null);
  const [w, setW] = useState(0);
  useLayoutEffect(() => {
    if (!ref.current) return;
    setW(ref.current.clientWidth);
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([e]) => setW(Math.round(e.contentRect.width)));
    ro.observe(ref.current); return () => ro.disconnect();
  }, []);
  return [ref, w];
}
function BarsTrend({ data, height = 200, format = fmtBRLshort, tone = "blue" }) {
  const [vref, seen] = useInView();
  const [wref, width] = useWidth();
  const [hover, setHover] = useState(null);
  const hasLabels = data.some((d) => d.label);
  const W = Math.max(200, width || 600), H = height, padT = 26, padB = hasLabels ? 26 : 6;
  const max = Math.max(1, ...data.map((d) => d.value));
  const n = data.length; const slot = W / Math.max(1, n); const bw = Math.min(46, slot * 0.56);
  const pts = data.map((d, i) => [slot * i + slot / 2, padT + (H - padT - padB) * (1 - d.value / max)]);
  const path = pts.reduce((acc, [x, y], i) => {
    if (i === 0) return `M${x},${y}`;
    const [px, py] = pts[i - 1]; const mx = (px + x) / 2;
    return `${acc} C${mx},${py} ${mx},${y} ${x},${y}`;
  }, "");
  const last = pts[pts.length - 1];
  const setRefs = (el) => { vref.current = el; wref.current = el; };
  return (
    <div ref={setRefs} style={{ position: "relative", width: "100%" }}>
      {width > 0 && (
        <svg width={W} height={H} role="img" aria-label="Gráfico de barras com linha de tendência" style={{ overflow: "visible", display: "block" }}>
          {[0.25, 0.5, 0.75].map((g) => <line key={g} x1={0} x2={W} y1={padT + (H - padT - padB) * g} y2={padT + (H - padT - padB) * g} style={{ stroke: "var(--line)" }} strokeDasharray="3 5" />)}
          {seen && data.map((d, i) => {
            const [x, y] = pts[i]; const h = H - padB - y;
            return (
              <g key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onClick={() => setHover(hover === i ? null : i)}>
                <rect x={x - slot / 2} y={0} width={slot} height={H} fill="transparent" />
                <rect className="chart-bar" x={x - bw / 2} y={y} width={bw} height={Math.max(2, h)} rx={Math.min(8, bw / 3)} style={{ fill: hover === i ? `var(--${tone})` : `color-mix(in srgb, var(--${tone}) 78%, var(--sheet))`, animationDelay: `${i * 70}ms` }} />
                {d.label && <text x={x} y={H - 8} textAnchor="middle" style={{ fill: "var(--ink-3)", fontSize: 12, fontWeight: 600 }}>{d.label}</text>}
              </g>
            );
          })}
          {seen && n > 1 && <path className="chart-line" d={path} fill="none" style={{ stroke: "var(--ok)", "--len": W * 2, animationDelay: `${n * 70 + 250}ms` }} strokeWidth={3} strokeLinecap="round" />}
          {seen && n > 0 && <circle className="chart-dot" cx={last[0]} cy={last[1]} r={6} style={{ fill: "var(--sheet)", stroke: "var(--ok)", animationDelay: `${n * 70 + 1250}ms` }} strokeWidth={3} />}
        </svg>
      )}
      {width === 0 && <div style={{ height: H }} />}
      {hover !== null && data[hover] && (
        <div style={{ position: "absolute", left: Math.min(Math.max(pts[hover][0], 60), W - 60), top: Math.max(0, pts[hover][1] - 34), transform: "translateX(-50%)", background: "#14181C", color: "#F2F3F4", fontSize: 12, fontWeight: 600, padding: "4px 8px", borderRadius: 6, pointerEvents: "none", whiteSpace: "nowrap" }}>
          {data[hover].full || data[hover].label}: {format(data[hover].value)}
        </div>
      )}
    </div>
  );
}

/* Previsto x real em barras horizontais */
function CompareBars({ rows, format = fmtBRLshort }) {
  const [ref, seen] = useInView();
  const max = Math.max(1, ...rows.flatMap((r) => [r.previsto, r.real]));
  return (
    <div ref={ref} className="stack gap-12">
      {rows.map((r, i) => {
        const over = r.real > r.previsto && r.previsto > 0;
        return (
          <div key={r.label} className="stack gap-4">
            <div className="row between gap-8 t-sm"><span className="clip" style={{ fontWeight: 600 }}>{r.label}</span><span className="t-num" style={{ color: over ? "var(--danger)" : "var(--ink-2)", fontSize: 14 }}>{format(r.real)} <span className="t-muted" style={{ fontWeight: 500 }}>de {format(r.previsto)}</span></span></div>
            <div style={{ position: "relative", height: 12, background: "var(--sunken)", borderRadius: 4, overflow: "hidden" }}>
              <div style={{ position: "absolute", inset: "0 auto 0 0", width: seen ? `${(r.previsto / max) * 100}%` : 0, background: "repeating-linear-gradient(135deg, var(--line-strong) 0 3px, transparent 3px 6px)", transition: `width .9s ${i * 60}ms cubic-bezier(.2,.8,.2,1)` }} />
              <div style={{ position: "absolute", top: 3, bottom: 3, left: 0, width: seen ? `${(r.real / max) * 100}%` : 0, background: over ? "var(--danger)" : "var(--blue)", borderRadius: 3, transition: `width 1s ${i * 60 + 150}ms cubic-bezier(.2,.8,.2,1)` }} />
            </div>
          </div>
        );
      })}
      <div className="row gap-16 t-xs t-muted">
        <span className="row gap-6"><span style={{ width: 14, height: 8, background: "repeating-linear-gradient(135deg, var(--line-strong) 0 3px, transparent 3px 6px)", borderRadius: 2 }} />Previsto</span>
        <span className="row gap-6"><span style={{ width: 14, height: 6, background: "var(--blue)", borderRadius: 2 }} />Gasto</span>
        <span className="row gap-6"><span style={{ width: 14, height: 6, background: "var(--danger)", borderRadius: 2 }} />Acima do previsto</span>
      </div>
    </div>
  );
}

/* Número grande com rótulo — o valor rola como odômetro */
function Kpi({ label, value, sub, tone, lg, roll = true }) {
  return (
    <div className="stack gap-4" style={{ minWidth: 0 }}>
      <span className="kpi-label">{label}</span>
      <span className={cx("kpi-value", lg && "lg")} style={tone ? { color: `var(--${tone})` } : undefined}>{roll ? <Odometer value={value} /> : value}</span>
      {sub && <span className="kpi-sub">{sub}</span>}
    </div>
  );
}

/* Valor monetário: aceita "1.234,56" ou "1234.56" */
function MoneyInput({ value, onChange, placeholder = "0,00", ...rest }) {
  return (
    <div style={{ position: "relative" }}>
      <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--ink-3)", fontSize: 14, pointerEvents: "none" }}>R$</span>
      <input className="input" inputMode="decimal" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} style={{ paddingLeft: 38 }}
        onBlur={(e) => { const n = parseNum(e.target.value); if (!isNaN(n)) onChange(n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })); }} {...rest} />
    </div>
  );
}
function moneyStr(n) { return n === null || n === undefined || n === "" ? "" : Number(n).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

/* Marca Pascaretta: monograma "P" desenhado como perfil de viga com prumo */
function BrandMark({ size = 32, inverted }) {
  const ink = inverted ? "#fff" : "var(--ink)";
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect x="1" y="1" width="30" height="30" rx="8" style={{ fill: inverted ? "rgba(255,255,255,.08)" : "var(--ink)" }} />
      <path d="M10 25V7h7.5a5.5 5.5 0 010 11H10" fill="none" stroke={inverted ? "#fff" : "var(--sheet)"} strokeWidth="2.6" strokeLinejoin="round" />
      <path d="M22.5 18v5.2" stroke="#5B7BFF" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M21 24.3l1.5 1.8 1.5-1.8z" fill="#5B7BFF" />
      {ink && null}
    </svg>
  );
}

/* ======================= 08-shell.jsx ======================= */
/* Estrutura da aplicação (menu lateral / barra inferior), rotas por hash e o tour guiado. */
/* @icons LayoutGrid Building2 LifeBuoy Moon Sun LogOut ArrowLeft ArrowRight Plus */

/* ---------- rotas: #/painel  #/obras  #/obra/12/cronograma ---------- */
function parseHash() {
  const h = (window.location.hash || "").replace(/^#\/?/, "");
  const [a, b, c] = h.split("/");
  if (a === "obra" && b) return { page: "obra", id: Number(b), aba: c || "resumo" };
  if (a === "obras") return { page: "obras" };
  return { page: "painel" };
}
function useHashRoute() {
  const [route, setRoute] = useState(parseHash);
  useEffect(() => { const on = () => setRoute(parseHash()); window.addEventListener("hashchange", on); return () => window.removeEventListener("hashchange", on); }, []);
  const go = useCallback((r, { replace } = {}) => {
    const hash = r.page === "obra" ? `#/obra/${r.id}/${r.aba || "resumo"}` : `#/${r.page}`;
    if (replace) { window.history.replaceState(null, "", hash); setRoute(parseHash()); }
    else if (window.location.hash !== hash) window.location.hash = hash;
    else setRoute(parseHash());
    if (!replace) window.scrollTo({ top: 0 });
  }, []);
  return [route, go];
}

function useIsDesktop(min = 980) {
  const q = `(min-width: ${min}px)`;
  const [v, setV] = useState(() => typeof window !== "undefined" && window.matchMedia(q).matches);
  useEffect(() => { const mq = window.matchMedia(q); const h = (e) => setV(e.matches); mq.addEventListener("change", h); return () => mq.removeEventListener("change", h); }, [q]);
  return v;
}

const SHELL_CSS = `
.app { min-height: 100vh; display: flex; }
.side { position: sticky; top: 0; height: 100vh; width: 252px; flex-shrink: 0; border-right: 1px solid var(--line); display: flex; flex-direction: column; padding: 22px 14px 16px; gap: 4px; background: color-mix(in srgb, var(--paper) 70%, transparent); backdrop-filter: blur(6px); }
.side-brand { display: flex; align-items: center; gap: 10px; padding: 0 8px 22px; }
.side-brand b { font-family: 'Archivo', sans-serif; font-stretch: 75%; font-weight: 800; font-size: 20px; letter-spacing: .005em; line-height: 1; display: block; }
.side-brand span { font-size: 12px; color: var(--ink-3); font-weight: 600; }
.nav-item { display: flex; align-items: center; gap: 10px; height: 40px; padding: 0 10px; border-radius: 10px; border: 0; background: transparent; color: var(--ink-2); font-weight: 600; font-size: 14px; text-align: left; width: 100%; transition: background-color .15s, color .15s; }
.nav-item:hover { background: var(--sunken); color: var(--ink); }
.nav-item[aria-current="page"] { background: var(--sheet); color: var(--ink); box-shadow: var(--shadow-1); border: 1px solid var(--line); }
.nav-sub { display: flex; flex-direction: column; gap: 2px; margin: 4px 0 8px 20px; padding-left: 10px; border-left: 1px solid var(--line); max-height: 40vh; overflow-y: auto; }
.nav-sub button { display: flex; align-items: center; gap: 8px; border: 0; background: none; padding: 6px 8px; border-radius: 8px; font-size: 13px; color: var(--ink-2); text-align: left; min-width: 0; }
.nav-sub button:hover { background: var(--sunken); color: var(--ink); }
.nav-sub button[aria-current="page"] { color: var(--ink); font-weight: 700; }
.nav-sub i { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
.side-foot { margin-top: auto; display: flex; flex-direction: column; gap: 2px; border-top: 1px solid var(--line); padding-top: 12px; }
.side-user { display: flex; align-items: center; gap: 10px; padding: 8px 10px 0; }
.avatar { width: 30px; height: 30px; border-radius: 50%; background: var(--ink); color: var(--sheet); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 12px; flex-shrink: 0; }
.main { flex: 1; min-width: 0; }
.main-in { max-width: 1180px; margin: 0 auto; padding: 36px 40px 64px; }
.topbar { position: sticky; top: 0; z-index: 30; display: flex; align-items: center; gap: 10px; padding: calc(10px + env(safe-area-inset-top)) 12px 10px 16px; background: color-mix(in srgb, var(--paper) 86%, transparent); backdrop-filter: blur(10px); border-bottom: 1px solid var(--line); }
.topbar b { font-family: 'Archivo', sans-serif; font-stretch: 75%; font-weight: 800; font-size: 19px; }
.bottombar { position: fixed; left: 0; right: 0; bottom: 0; z-index: 30; display: flex; background: var(--sheet); border-top: 1px solid var(--line); padding: 6px 8px calc(6px + env(safe-area-inset-bottom)); }
.bottombar button { flex: 1; border: 0; background: none; display: flex; flex-direction: column; align-items: center; gap: 2px; font-size: 12px; font-weight: 600; color: var(--ink-3); padding: 6px 0; border-radius: 10px; }
.bottombar button[aria-current="page"] { color: var(--ink); }
.bottombar button[aria-current="page"] svg { color: var(--blue); }
@media (max-width: 979px) { .app { flex-direction: column; } .main-in { padding: 20px 16px 100px; } }

/* tour */
.tour-veil { position: fixed; z-index: 95; background: rgba(12,15,19,.64); transition: all .45s cubic-bezier(.2,.8,.2,1); }
.tour-spot { position: fixed; z-index: 95; border-radius: 12px; box-shadow: 0 0 0 2px rgba(255,255,255,.95), 0 0 0 7px rgba(255,255,255,.18); transition: all .45s cubic-bezier(.2,.8,.2,1); pointer-events: none; }
.tour-card { position: fixed; z-index: 96; width: 340px; background: var(--sheet); border: 1px solid var(--line); border-radius: 16px; box-shadow: var(--shadow-2); padding: 18px; animation: tourIn .35s cubic-bezier(.2,.85,.2,1) both; }
.tour-card.center { left: 50% !important; top: 50% !important; transform: translate(-50%,-50%); width: min(420px, calc(100vw - 32px)); animation: tourInC .4s cubic-bezier(.2,.85,.2,1) both; }
@keyframes tourIn { from { opacity: 0; transform: translateY(8px); } }
@keyframes tourInC { from { opacity: 0; transform: translate(-50%,-46%); } }
.tour-dots { display: flex; gap: 5px; }
.tour-dots i { width: 6px; height: 6px; border-radius: 50%; background: var(--line-strong); transition: all .3s; }
.tour-dots i.on { background: var(--ink); width: 16px; border-radius: 4px; }
@media (max-width: 640px) { .tour-card:not(.center) { left: 12px !important; right: 12px; width: auto; top: auto !important; bottom: calc(12px + env(safe-area-inset-bottom)) !important; } }
`;

function initials(email = "") { const n = email.split("@")[0].split(/[._-]/).filter(Boolean); return ((n[0]?.[0] || "") + (n[1]?.[0] || "")).toUpperCase() || "P"; }

function AppShell({ route, go, projects, data, email, dark, setDark, onLogout, onTour, children }) {
  const isDesktop = useIsDesktop();
  useLayoutEffect(() => {
    let s = document.getElementById("pc-shell-css");
    if (!s) { s = document.createElement("style"); s.id = "pc-shell-css"; document.head.appendChild(s); }
    s.textContent = SHELL_CSS;
  }, []);
  const section = route.page === "painel" ? "painel" : "obras";
  const dotColor = (p) => {
    const al = obraAlertas(data, p.id);
    return al.some((a) => a.tom === "danger") ? "var(--danger)" : al.length ? "var(--warn)" : "var(--ok)";
  };

  if (isDesktop) {
    return (
      <div className="app">
        <aside className="side" aria-label="Menu principal">
          <div className="side-brand"><BrandMark size={34} /><div><b>Pascaretta</b><span>Construtora</span></div></div>
          <button className="nav-item" aria-current={section === "painel" ? "page" : undefined} onClick={() => go({ page: "painel" })} data-tour="nav-painel"><LayoutGrid size={18} />Painel</button>
          <button className="nav-item" aria-current={section === "obras" && route.page === "obras" ? "page" : undefined} onClick={() => go({ page: "obras" })} data-tour="nav-obras"><Building2 size={18} />Obras</button>
          {projects.length > 0 && (
            <div className="nav-sub" data-tour="nav-lista">
              {projects.map((p) => (
                <button key={p.id} aria-current={route.page === "obra" && route.id === p.id ? "page" : undefined} onClick={() => go({ page: "obra", id: p.id, aba: "resumo" })} title={p.name}>
                  <i style={{ background: dotColor(p) }} /><span className="clip">{p.name}</span>
                </button>
              ))}
            </div>
          )}
          <div className="side-foot">
            <button className="nav-item" onClick={onTour} data-tour="ajuda"><LifeBuoy size={18} />Como usar</button>
            <button className="nav-item" onClick={() => setDark(!dark)}>{dark ? <Sun size={18} /> : <Moon size={18} />}{dark ? "Tema claro" : "Tema escuro"}</button>
            <div className="side-user">
              <div className="avatar">{initials(email)}</div>
              <div className="grow clip t-sm t-soft" title={email}>{email}</div>
              <IconBtn tip="Sair" sm onClick={onLogout}><LogOut size={16} /></IconBtn>
            </div>
          </div>
        </aside>
        <main className="main"><div className="main-in">{children}</div></main>
      </div>
    );
  }
  return (
    <div className="app">
      <header className="topbar">
        <BrandMark size={28} /><b className="grow">Pascaretta</b>
        <IconBtn tip="Como usar" onClick={onTour} data-tour="ajuda"><LifeBuoy size={19} /></IconBtn>
        <IconBtn tip={dark ? "Tema claro" : "Tema escuro"} onClick={() => setDark(!dark)}>{dark ? <Sun size={19} /> : <Moon size={19} />}</IconBtn>
        <IconBtn tip="Sair" onClick={onLogout}><LogOut size={19} /></IconBtn>
      </header>
      <main className="main"><div className="main-in">{children}</div></main>
      <nav className="bottombar" aria-label="Menu principal">
        <button aria-current={section === "painel" ? "page" : undefined} onClick={() => go({ page: "painel" })} data-tour="nav-painel"><LayoutGrid size={21} />Painel</button>
        <button aria-current={section === "obras" ? "page" : undefined} onClick={() => go({ page: "obras" })} data-tour="nav-obras"><Building2 size={21} />Obras</button>
      </nav>
    </div>
  );
}

/* ---------- Tour guiado com holofote que se move entre os elementos ---------- */
function Tour({ steps, onClose }) {
  const [i, setI] = useState(0);
  const [rect, setRect] = useState(null);
  const step = steps[i];
  const findTarget = useCallback(() => {
    if (!step?.target) return null;
    const els = [...document.querySelectorAll(step.target)].filter((el) => el.offsetParent !== null || el.getClientRects().length);
    return els[0] || null;
  }, [step]);

  useLayoutEffect(() => {
    if (step?.before) step.before();
    let alive = true;
    const place = () => {
      const el = findTarget();
      if (!el) { setRect(null); return; }
      const r = el.getBoundingClientRect();
      const pad = step.pad ?? 6;
      setRect({ top: r.top - pad, left: r.left - pad, width: r.width + pad * 2, height: r.height + pad * 2 });
    };
    const t = setTimeout(() => {
      if (!alive) return;
      const el = findTarget();
      if (el) { el.scrollIntoView({ block: "center", behavior: "smooth" }); setTimeout(() => alive && place(), 380); }
      else place();
    }, step?.before ? 260 : 30);
    window.addEventListener("resize", place); window.addEventListener("scroll", place, true);
    return () => { alive = false; clearTimeout(t); window.removeEventListener("resize", place); window.removeEventListener("scroll", place, true); };
  }, [i]); // eslint-disable-line

  useEffect(() => {
    const k = (e) => { if (e.key === "Escape") onClose(); if (e.key === "ArrowRight") next(); if (e.key === "ArrowLeft") setI((x) => Math.max(0, x - 1)); };
    document.addEventListener("keydown", k); return () => document.removeEventListener("keydown", k);
  }); // eslint-disable-line
  const next = () => (i < steps.length - 1 ? setI(i + 1) : onClose());
  if (!step) return null;

  const centered = !rect;
  let pos = {};
  if (rect) {
    const below = rect.top + rect.height + 12; const cardH = 210;
    const top = below + cardH < window.innerHeight ? below : Math.max(12, rect.top - cardH - 12);
    const left = Math.min(Math.max(12, rect.left), window.innerWidth - 352);
    pos = { top, left };
  }
  return (
    <>
      {rect ? (
        <>
          {[
            { top: 0, left: 0, right: 0, height: Math.max(0, rect.top) },
            { top: rect.top + rect.height, left: 0, right: 0, bottom: 0 },
            { top: rect.top, left: 0, width: Math.max(0, rect.left), height: rect.height },
            { top: rect.top, left: rect.left + rect.width, right: 0, height: rect.height },
          ].map((st, k) => <div key={k} className="tour-veil" style={st} />)}
          <div className="tour-spot" style={rect} />
        </>
      ) : <div className="tour-veil" style={{ inset: 0 }} />}
      <div key={i} className={cx("tour-card", centered && "center")} style={pos} role="dialog" aria-label={step.title}>
        {step.hero && <div className="mb-12">{step.hero}</div>}
        <div className="t-title mb-8">{step.title}</div>
        <div className="t-soft" style={{ fontSize: 14.5 }}>{step.body}</div>
        <div className="row between mt-16">
          <div className="tour-dots" aria-label={`Passo ${i + 1} de ${steps.length}`}>{steps.map((_, k) => <i key={k} className={k === i ? "on" : ""} />)}</div>
          <div className="row gap-8">
            {i === 0 ? <button className="btn btn-quiet btn-sm" onClick={onClose}>Pular</button> : <button className="btn btn-quiet btn-sm" onClick={() => setI(i - 1)}>Voltar</button>}
            <button className="btn btn-ink btn-sm" onClick={next}>{i === steps.length - 1 ? "Concluir" : "Próximo"}</button>
          </div>
        </div>
      </div>
    </>
  );
}

const tourKey = (userId, name) => `pc-tour-${name}-v1-${userId}`;
function tourSeen(userId, name) { try { return localStorage.getItem(tourKey(userId, name)) === "1"; } catch { return true; } }
function markTour(userId, name) { try { localStorage.setItem(tourKey(userId, name), "1"); } catch { /* sem storage */ } }

/* ======================= 09-login.jsx ======================= */
/* Tela de entrada: fundo escuro de seda, cartões de vidro e apresentação animada do sistema. */
/* @icons Mail Lock Eye EyeOff ArrowUpRight CheckCircle2 */

const LOGIN_CSS = `
.lg { position: relative; min-height: 100vh; min-height: 100dvh; background: #0A0D11; color: #E9ECEF; overflow: hidden; isolation: isolate; }
.lg-silk { position: absolute; inset: -10% -10% -10% -10%; z-index: -2; pointer-events: none; }
.lg-silk g { transform-box: view-box; transform-origin: 50% 50%; will-change: transform; }
.lg-silk .s1 { animation: silk1 26s ease-in-out infinite alternate; }
.lg-silk .s2 { animation: silk2 32s ease-in-out infinite alternate; }
.lg-silk .s3 { animation: silk3 22s ease-in-out infinite alternate; }
@keyframes silk1 { from { transform: translate(-2%, 0) rotate(-2deg); } to { transform: translate(3%, -3%) rotate(2deg); } }
@keyframes silk2 { from { transform: translate(2%, 2%) rotate(1deg); } to { transform: translate(-3%, -1%) rotate(-3deg); } }
@keyframes silk3 { from { transform: translate(0, -2%) scale(1); } to { transform: translate(-2%, 2%) scale(1.04); } }
.lg-grain { position: absolute; inset: 0; z-index: -1; opacity: .07; pointer-events: none; background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>"); }
.lg-in { position: relative; max-width: 1320px; margin: 0 auto; min-height: 100vh; min-height: 100dvh; display: grid; grid-template-columns: minmax(0, 1.35fr) minmax(360px, 0.8fr); gap: 56px; align-items: center; padding: 40px 48px; }
.lg-brand { display: flex; align-items: center; gap: 12px; }
.lg-brand b { font-family: 'Archivo', sans-serif; font-stretch: 75%; font-weight: 800; font-size: 22px; letter-spacing: .01em; }
.lg-brand span { font-size: 13px; color: #8E97A3; display: block; margin-top: -2px; }
.lg-h { font-family: 'Archivo', sans-serif; font-stretch: 70%; font-weight: 800; font-size: clamp(44px, 6.2vw, 92px); line-height: .9; letter-spacing: -.01em; margin: 34px 0 18px; text-transform: uppercase; color: #F4F6F8; }
.lg-h .w { display: inline-block; white-space: nowrap; }
.lg-h .l { display: inline-block; animation: lgWeight 1.4s cubic-bezier(.3,0,.2,1) both; }
@keyframes lgWeight { 0% { font-weight: 150; opacity: 0; transform: translateY(14px); filter: blur(6px); } 45% { opacity: 1; filter: blur(0); } 100% { font-weight: 800; transform: none; } }
.lg-p { color: #A3ACB8; font-size: 17px; line-height: 1.55; max-width: 560px; margin: 0; animation: lgFade .9s 1s both; }
@keyframes lgFade { from { opacity: 0; transform: translateY(8px); } }
.glass { background: linear-gradient(180deg, rgba(255,255,255,.075), rgba(255,255,255,.03)); border: 1px solid rgba(255,255,255,.11); backdrop-filter: blur(18px) saturate(140%); -webkit-backdrop-filter: blur(18px) saturate(140%); border-radius: 20px; box-shadow: 0 30px 60px -30px rgba(0,0,0,.8), inset 0 1px 0 rgba(255,255,255,.08); }
.lg-show { position: relative; margin-top: 36px; animation: lgFade .9s 1.25s both; }
.lg-device { position: relative; height: 300px; padding: 0; overflow: hidden; }
.lg-bar { display: flex; align-items: center; gap: 10px; height: 40px; padding: 0 16px; border-bottom: 1px solid rgba(255,255,255,.08); font-size: 13px; color: #9AA3AE; }
.lg-bar i { width: 8px; height: 8px; border-radius: 50%; background: #3DD68C; box-shadow: 0 0 0 3px rgba(61,214,140,.15); }
.lg-scene { position: absolute; inset: 40px 0 0 0; padding: 22px 24px; transition: opacity .6s ease, filter .6s ease, transform .6s cubic-bezier(.2,.8,.2,1); }
.lg-scene.off { opacity: 0; filter: blur(14px); transform: scale(.98); pointer-events: none; }
.lg-cap { display: flex; align-items: center; justify-content: space-between; margin-top: 14px; gap: 12px; }
.lg-cap strong { font-family: 'Archivo', sans-serif; font-stretch: 85%; font-size: 18px; font-weight: 700; color: #F1F3F5; }
.lg-cap span { color: #8E97A3; font-size: 14px; }
.lg-dots { display: flex; gap: 6px; flex-shrink: 0; }
.lg-dots button { width: 8px; height: 8px; padding: 0; border: 0; border-radius: 8px; background: rgba(255,255,255,.22); transition: all .35s; }
.lg-dots button.on { width: 26px; background: #E9ECEF; }
.lg-float { position: absolute; padding: 14px 16px; min-width: 176px; transition: transform .35s cubic-bezier(.34,1.56,.64,1); animation: lgFloat 6s ease-in-out infinite alternate; }
.lg-float:hover { transform: translateY(-6px); }
.lg-float small { display: block; font-size: 12px; color: #9AA3AE; }
.lg-float b { display: block; font-family: 'Archivo', sans-serif; font-stretch: 80%; font-size: 30px; font-weight: 800; color: #fff; line-height: 1.1; font-variant-numeric: tabular-nums; }
.lg-float em { font-style: normal; font-size: 12.5px; font-weight: 600; color: #3DD68C; display: inline-flex; align-items: center; gap: 3px; }
@keyframes lgFloat { from { translate: 0 0; } to { translate: 0 -8px; } }
.lg-card { padding: 30px 28px 26px; animation: lgCard .9s .3s cubic-bezier(.2,.85,.2,1) both; }
@keyframes lgCard { from { opacity: 0; transform: translateY(18px); filter: blur(8px); } }
.lg-card h2 { font-family: 'Archivo', sans-serif; font-stretch: 80%; font-weight: 800; font-size: 30px; margin: 0 0 4px; color: #fff; }
.lg-card .sub { color: #9AA3AE; font-size: 14.5px; margin: 0 0 22px; }
.lg-field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
.lg-field label { font-size: 13px; font-weight: 600; color: #B9C1CA; }
.lg-input { position: relative; display: flex; align-items: center; }
.lg-input svg.lead { position: absolute; left: 13px; color: #7F8893; pointer-events: none; }
.lg-input input { width: 100%; height: 48px; border-radius: 12px; border: 1px solid rgba(255,255,255,.14); background: rgba(255,255,255,.05); color: #fff; padding: 0 44px 0 40px; font-size: 16px; outline: none; transition: border-color .15s, box-shadow .15s, background-color .15s; }
.lg-input input::placeholder { color: #6E7782; }
.lg-input input:focus { border-color: #7D94FF; box-shadow: 0 0 0 3px rgba(125,148,255,.22); background: rgba(255,255,255,.07); }
.lg-input .eye { position: absolute; right: 6px; width: 36px; height: 36px; border: 0; background: none; color: #8E97A3; border-radius: 8px; display: flex; align-items: center; justify-content: center; }
.lg-input .eye:hover { color: #fff; }
.lg-go { width: 100%; height: 50px; border: 0; border-radius: 12px; background: #F2F4F6; color: #0E1216; font-weight: 700; font-size: 16px; margin-top: 6px; display: flex; align-items: center; justify-content: center; gap: 8px; transition: transform .12s, background-color .15s; }
.lg-go:hover { background: #fff; } .lg-go:active { transform: scale(.98); } .lg-go:disabled { opacity: .6; }
.lg-links { display: flex; justify-content: space-between; gap: 12px; margin-top: 18px; font-size: 14px; flex-wrap: wrap; }
.lg-links button { border: 0; background: none; padding: 0; color: #AEB9FF; font-weight: 600; }
.lg-links button.muted { color: #9AA3AE; font-weight: 500; }
.lg-links button:hover { text-decoration: underline; }
.lg-msg { border-radius: 10px; padding: 10px 12px; font-size: 14px; margin-bottom: 14px; display: flex; gap: 8px; align-items: flex-start; }
.lg-msg.err { background: rgba(255,110,97,.12); color: #FFB3AA; border: 1px solid rgba(255,110,97,.25); }
.lg-msg.ok { background: rgba(61,214,140,.1); color: #9CEBC5; border: 1px solid rgba(61,214,140,.22); }
.lg-foot { margin-top: 18px; font-size: 12.5px; color: #6E7782; text-align: center; }
/* cenas */
.sc-gantt .r { display: grid; grid-template-columns: 150px 1fr; align-items: center; gap: 12px; height: 34px; font-size: 13px; color: #B9C1CA; }
.sc-gantt .t { position: relative; height: 14px; }
.sc-gantt .b { position: absolute; top: 0; height: 14px; border-radius: 4px; background: #5B7BFF; transform-origin: left; animation: scGrow .8s cubic-bezier(.2,.8,.2,1) both; }
.sc-gantt .b.done { background: #3DD68C; }
.sc-gantt .x { position: absolute; top: 0; height: 14px; border-radius: 0 4px 4px 0; background: repeating-linear-gradient(135deg, #FF6E61 0 4px, rgba(255,110,97,.55) 4px 8px); transform-origin: left; animation: scGrow .7s cubic-bezier(.2,.8,.2,1) both; }
.sc-gantt .hoje { position: absolute; top: -10px; bottom: -10px; width: 2px; background: #F2C14E; left: 52%; opacity: .9; }
.sc-gantt .hoje-l { position: absolute; top: -26px; left: 52%; transform: translateX(-50%); font-size: 11px; font-weight: 700; color: #F2C14E; }
@keyframes scGrow { from { transform: scaleX(0); } }
.sc-tag { display: inline-flex; align-items: center; gap: 6px; height: 28px; padding: 0 12px; border-radius: 99px; font-size: 13px; font-weight: 700; background: rgba(255,110,97,.14); color: #FF9F94; animation: dotPop .5s 1.4s cubic-bezier(.34,1.6,.64,1) both; }
.sc-plan { position: relative; height: 210px; border-radius: 10px; background: #F4F4EF; overflow: hidden; }
.sc-pin { position: absolute; width: 24px; height: 24px; border-radius: 50%; color: #fff; font-size: 12px; font-weight: 800; display: flex; align-items: center; justify-content: center; transform: translate(-50%,-50%); animation: pinDrop .6s cubic-bezier(.34,1.5,.64,1) both; box-shadow: 0 4px 10px rgba(0,0,0,.3); }
.sc-pin.red::after { content: ""; position: absolute; left: 50%; top: 50%; width: 24px; height: 24px; border-radius: 50%; border: 2px solid #E5483B; animation: pulso 1.6s ease-out infinite; }
.sc-money b { font-family: 'Archivo', sans-serif; font-stretch: 78%; font-weight: 800; font-size: 46px; color: #fff; line-height: 1; }
.sc-check { display: flex; align-items: center; gap: 12px; height: 46px; border-bottom: 1px solid rgba(255,255,255,.07); font-size: 14.5px; color: #D5DAE0; }
.sc-check .c { width: 24px; height: 24px; border-radius: 50%; border: 2px solid rgba(255,255,255,.25); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.sc-check .c.on { background: #3DD68C; border-color: #3DD68C; animation: donePop .5s cubic-bezier(.34,1.56,.64,1) both; }
.sc-check .c.on path { stroke-dasharray: 22; animation: tickDraw .4s .1s both; }
@media (max-width: 1060px) {
  .lg-in { grid-template-columns: 1fr; gap: 28px; padding: 28px 20px 36px; align-items: start; }
  .lg-h { font-size: clamp(42px, 12vw, 64px); margin: 26px 0 14px; }
  .lg-p { font-size: 16px; }
  .lg-left { display: contents; }
  .lg-top { order: 1; } .lg-card { order: 2; } .lg-show { order: 3; margin-top: 8px; }
  .lg-float { display: none; }
  .lg-device { height: 270px; }
  .sc-gantt .r { grid-template-columns: 110px 1fr; font-size: 12px; }
}
@media (prefers-reduced-motion: reduce) { .lg-silk g { animation: none !important; } }
`;

const LOGIN_CENAS = [
  { t: "O cronograma avisa o atraso", d: "Veja para onde cada etapa atrasada empurra a entrega." },
  { t: "Vistoria direto na planta", d: "Toque no ponto da foto e registre a pendência com foto." },
  { t: "Gasto sob controle", d: "Orçamento, gasto real e custo de cada unidade." },
  { t: "Exigências da Caixa e da Prefeitura", d: "Checklist com os itens do MCMV já sugeridos." },
];

function LoginSilk() {
  return (
    <svg className="lg-silk" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="sk1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#0B0E13" /><stop offset=".45" stopColor="#262D38" /><stop offset=".55" stopColor="#4A5566" /><stop offset=".62" stopColor="#1D232C" /><stop offset="1" stopColor="#0A0D11" /></linearGradient>
        <linearGradient id="sk2" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stopColor="#0A0D11" /><stop offset=".5" stopColor="#1A2130" /><stop offset=".58" stopColor="#2E3B5C" /><stop offset="1" stopColor="#0A0D11" /></linearGradient>
        <linearGradient id="sk3" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#4C6BFF" stopOpacity="0" /><stop offset=".5" stopColor="#8FA5FF" stopOpacity=".9" /><stop offset="1" stopColor="#4C6BFF" stopOpacity="0" /></linearGradient>
        <filter id="skb"><feGaussianBlur stdDeviation="6" /></filter>
        <radialGradient id="skg" cx=".72" cy=".2" r=".6"><stop offset="0" stopColor="#2A3B8F" stopOpacity=".35" /><stop offset="1" stopColor="#0A0D11" stopOpacity="0" /></radialGradient>
      </defs>
      <rect width="1600" height="1000" fill="url(#skg)" />
      <g className="s1" filter="url(#skb)"><path d="M-200 780 C 200 520, 560 980, 980 700 S 1580 380, 1900 600" stroke="url(#sk1)" strokeWidth="260" fill="none" /></g>
      <g className="s2" filter="url(#skb)"><path d="M-200 300 C 300 80, 620 520, 1060 300 S 1600 60, 1900 220" stroke="url(#sk2)" strokeWidth="200" fill="none" opacity=".9" /></g>
      <g className="s3"><path d="M-100 690 C 260 470, 600 900, 1000 640 S 1560 360, 1800 560" stroke="url(#sk3)" strokeWidth="2.2" fill="none" /><path d="M-100 250 C 320 70, 640 470, 1080 270 S 1600 70, 1800 200" stroke="url(#sk3)" strokeWidth="1.4" fill="none" opacity=".6" /></g>
    </svg>
  );
}

/* Pontos que se juntam e formam a marca */
function DotsToMark({ size = 40 }) {
  const [pts, setPts] = useState([]);
  const [go, setGo] = useState(false);
  const [done, setDone] = useState(false);
  useEffect(() => {
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg"); const p = document.createElementNS(ns, "path");
    p.setAttribute("d", "M10 25V7h7.5a5.5 5.5 0 010 11H10"); svg.appendChild(p);
    svg.style.position = "absolute"; svg.style.visibility = "hidden"; document.body.appendChild(svg);
    const L = p.getTotalLength(); const N = 26; const out = [];
    for (let i = 0; i < N; i++) { const q = p.getPointAtLength((L * i) / (N - 1)); out.push({ x: q.x, y: q.y, sx: (Math.random() - 0.5) * 140, sy: (Math.random() - 0.5) * 90, d: Math.random() * 300 }); }
    for (let i = 0; i < 4; i++) out.push({ x: 22.5, y: 18 + i * 2, sx: (Math.random() - 0.5) * 140, sy: (Math.random() - 0.5) * 90, d: 300 + i * 60, blue: true });
    svg.remove(); setPts(out);
    const a = requestAnimationFrame(() => requestAnimationFrame(() => setGo(true)));
    const t = setTimeout(() => setDone(true), 1500);
    return () => { cancelAnimationFrame(a); clearTimeout(t); };
  }, []);
  const k = size / 32;
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <div style={{ position: "absolute", inset: 0, opacity: done ? 1 : 0, transition: "opacity .5s" }}><BrandMark size={size} inverted /></div>
      {!done && pts.map((d, i) => (
        <span key={i} style={{ position: "absolute", left: d.x * k - 2, top: d.y * k - 2, width: 4, height: 4, borderRadius: 4, background: d.blue ? "#7D94FF" : "#E9ECEF",
          transform: go ? "translate(0,0)" : `translate(${d.sx}px, ${d.sy}px)`, opacity: go ? 1 : 0, transition: `transform 1s ${d.d}ms cubic-bezier(.2,.9,.2,1.05), opacity .4s ${d.d}ms` }} />
      ))}
    </div>
  );
}

function WeightHeadline({ lines }) {
  let n = 0;
  return (
    <h1 className="lg-h" aria-label={lines.join(" ")}>
      {lines.map((line, li) => (
        <div key={li} aria-hidden="true">
          {line.split(" ").map((w, wi) => (
            <span key={wi} className="w">
              {w.split("").map((ch, ci) => <span key={ci} className="l" style={{ animationDelay: `${150 + (n++) * 28}ms` }}>{ch}</span>)}
              {wi < line.split(" ").length - 1 && <span className="l">&nbsp;</span>}
            </span>
          ))}
        </div>
      ))}
    </h1>
  );
}

function CenaGantt() {
  const rows = [["Fundação", 0, 18, true], ["Alvenaria", 18, 22, true], ["Cobertura", 40, 16, false, 9], ["Reboco", 56, 18, false, 9], ["Pintura", 74, 14, false, 9]];
  return (
    <div className="sc-gantt" style={{ paddingTop: 10 }}>
      {rows.map(([n, s, w, done, x], i) => (
        <div className="r" key={n}><span>{n}</span>
          <div className="t">
            <div className={cx("b", done && "done")} style={{ left: `${s}%`, width: `${w}%`, animationDelay: `${i * 120}ms` }} />
            {x && <div className="x" style={{ left: `${s + w}%`, width: `${x}%`, animationDelay: `${700 + i * 120}ms` }} />}
            <div className="hoje" />{i === 0 && <span className="hoje-l">hoje</span>}
          </div>
        </div>
      ))}
      <div className="row between mt-16"><span style={{ fontSize: 13, color: "#9AA3AE" }}>Entrega prevista 18/01 → 27/01</span><span className="sc-tag">+9 dias</span></div>
    </div>
  );
}
function CenaPlanta() {
  const pins = [[31, 46, "#E8A317", 1], [67, 19, "#E5483B", 2, true], [13, 64, "#2DBE7E", 3], [86, 58, "#E8A317", 4]];
  const rotulos = [["Sala", 22, 30], ["Quarto 1", 60, 34], ["Quarto 2", 87, 34], ["Cozinha", 24, 76], ["WC", 52, 80], ["Serviço", 78, 78]];
  return (
    <div className="sc-plan">
      <svg viewBox="0 0 400 210" width="100%" height="100%" preserveAspectRatio="none" aria-hidden="true" style={{ position: "absolute", inset: 0 }}>
        <g stroke="#2B3240" strokeWidth="5" fill="none" vectorEffect="non-scaling-stroke"><rect x="14" y="12" width="372" height="186" vectorEffect="non-scaling-stroke" /><path d="M170 12v96M14 108h236M250 108v90M170 150v48M310 12v96" vectorEffect="non-scaling-stroke" /></g>
      </svg>
      {rotulos.map(([t, x, y]) => <span key={t} style={{ position: "absolute", left: `${x}%`, top: `${y}%`, transform: "translate(-50%,-50%)", fontSize: 12, color: "#5D6573", fontWeight: 600 }}>{t}</span>)}
      {pins.map(([x, y, c, n, red], i) => <span key={n} className={cx("sc-pin", red && "red")} style={{ left: `${x}%`, top: `${y}%`, background: c, animationDelay: `${300 + i * 380}ms` }}>{n}</span>)}
    </div>
  );
}
function CenaGasto() {
  const vals = [32, 46, 41, 58, 63, 71, 88];
  return (
    <div className="sc-money row gap-24" style={{ alignItems: "flex-end" }}>
      <div className="stack gap-6" style={{ minWidth: 0 }}>
        <span style={{ fontSize: 13, color: "#9AA3AE" }}>Gasto até hoje</span>
        <b><Odometer value="R$ 412.380" /></b>
        <span style={{ fontSize: 13, color: "#3DD68C", fontWeight: 600 }}>4% abaixo do orçamento</span>
      </div>
      <svg viewBox="0 0 220 150" style={{ flex: 1, height: 170, overflow: "visible" }} aria-hidden="true">
        {vals.map((v, i) => <rect key={i} className="chart-bar" x={8 + i * 30} y={140 - v * 1.4} width={18} height={v * 1.4} rx={5} fill="#5B7BFF" style={{ animationDelay: `${i * 80}ms`, opacity: .85 }} />)}
        <path className="chart-line" d={`M17 ${140 - 32 * 1.4} ${vals.map((v, i) => `L${17 + i * 30} ${140 - v * 1.4 - 6}`).join(" ")}`} fill="none" stroke="#3DD68C" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ "--len": 400, animationDelay: "700ms" }} />
      </svg>
    </div>
  );
}
function CenaChecklist() {
  const itens = ["Alvará de construção", "PCI aprovada pela Caixa", "Medição da 3ª etapa", "Habite-se"];
  const [n, setN] = useState(0);
  useEffect(() => { const ts = [1, 2, 3].map((k) => setTimeout(() => setN(k), 400 + k * 550)); return () => ts.forEach(clearTimeout); }, []);
  return (
    <div>
      {itens.map((t, i) => (
        <div className="sc-check" key={t}>
          <span className={cx("c", i < n && "on")}>{i < n && <svg width="12" height="12" viewBox="0 0 16 16"><path d="M3 8.5l3.2 3.2L13 4.8" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>}</span>
          <span style={{ opacity: i < n ? 0.65 : 1 }}>{t}</span>
        </div>
      ))}
    </div>
  );
}

function LoginShowcase() {
  const [i, setI] = useState(0);
  const [tick, setTick] = useState(0);
  const reduced = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  useEffect(() => { if (reduced) return; const t = setTimeout(() => { setI((x) => (x + 1) % LOGIN_CENAS.length); setTick((k) => k + 1); }, 5200); return () => clearTimeout(t); }, [i, reduced]);
  const Cenas = [CenaGantt, CenaPlanta, CenaGasto, CenaChecklist];
  return (
    <div className="lg-show">
      <div className="glass lg-device">
        <div className="lg-bar"><i />Obra Praia, Pau Amarelo</div>
        {Cenas.map((C, k) => <div key={k} className={cx("lg-scene", k !== i && "off")} aria-hidden={k !== i}>{k === i && <C key={tick} />}</div>)}
      </div>
      <div className="lg-cap">
        <div className="stack" style={{ minWidth: 0 }}><strong>{LOGIN_CENAS[i].t}</strong><span>{LOGIN_CENAS[i].d}</span></div>
        <div className="lg-dots" role="tablist" aria-label="Recursos do sistema">
          {LOGIN_CENAS.map((c, k) => <button key={k} type="button" className={k === i ? "on" : ""} aria-label={c.t} aria-selected={k === i} onClick={() => { setI(k); setTick((t) => t + 1); }} />)}
        </div>
      </div>
      <div className="glass lg-float" style={{ right: -34, top: -46 }}><small>Avanço físico</small><b>42%</b><em><ArrowUpRight size={13} />6 pontos no mês</em></div>
    </div>
  );
}

function traduzErro(msg = "") {
  const m = msg.toLowerCase();
  if (m.includes("invalid login")) return "E-mail ou senha incorretos.";
  if (m.includes("email not confirmed")) return "Confirme seu e-mail pelo link que enviamos antes de entrar.";
  if (m.includes("already registered")) return "Já existe uma conta com este e-mail. Use Entrar.";
  if (m.includes("password should be")) return "A senha precisa ter pelo menos 6 caracteres.";
  if (m.includes("rate limit")) return "Muitas tentativas seguidas. Aguarde um minuto e tente de novo.";
  if (m.includes("network") || m.includes("fetch")) return "Sem conexão com o servidor. Verifique a internet.";
  return msg || "Não foi possível concluir. Tente de novo.";
}

function useLoginCss() {
  useLayoutEffect(() => {
    let s = document.getElementById("pc-login-css");
    if (!s) { s = document.createElement("style"); s.id = "pc-login-css"; document.head.appendChild(s); }
    s.textContent = LOGIN_CSS;
    const meta = document.querySelector('meta[name="theme-color"]'); const prev = meta?.getAttribute("content");
    meta?.setAttribute("content", "#0A0D11");
    return () => { if (prev) meta?.setAttribute("content", prev); };
  }, []);
}

function LoginScreen() {
  useLoginCss();
  const [mode, setMode] = useState("login"); // login | signup | forgot
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const submit = async (e) => {
    e.preventDefault(); setMsg(null);
    if (!email.trim()) return setMsg({ k: "err", t: "Digite seu e-mail." });
    if (mode !== "forgot" && !password) return setMsg({ k: "err", t: "Digite sua senha." });
    setBusy(true);
    try {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin });
        if (error) setMsg({ k: "err", t: traduzErro(error.message) });
        else { setMsg({ k: "ok", t: "Enviamos um link para redefinir a senha. Confira seu e-mail." }); setMode("login"); }
      } else if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email: email.trim(), password });
        if (error) setMsg({ k: "err", t: traduzErro(error.message) });
        else setMsg({ k: "ok", t: "Conta criada. Se pedirmos confirmação, abra o link no seu e-mail e depois entre." });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) setMsg({ k: "err", t: traduzErro(error.message) });
      }
    } catch (err) { setMsg({ k: "err", t: traduzErro(err?.message) }); }
    setBusy(false);
  };
  const titulo = mode === "login" ? "Entrar" : mode === "signup" ? "Criar conta" : "Redefinir senha";
  const sub = mode === "login" ? "Acesse suas obras." : mode === "signup" ? "Use o e-mail da construtora." : "Informe o e-mail da conta e enviaremos um link.";

  return (
    <div className="lg">
      <LoginSilk /><div className="lg-grain" />
      <div className="lg-in">
        <div className="lg-left">
          <div className="lg-top">
            <div className="lg-brand"><DotsToMark size={40} /><div><b>Pascaretta</b><span>Construtora</span></div></div>
            <WeightHeadline lines={["Cada obra", "no prazo e", "no custo."]} />
            <p className="lg-p">Cronograma, vistoria na planta, gastos e documentação das suas obras. No canteiro pelo celular, no escritório pelo computador.</p>
          </div>
          <LoginShowcase />
        </div>
        <form className="glass lg-card" onSubmit={submit} noValidate>
          <h2>{titulo}</h2>
          <p className="sub">{sub}</p>
          {msg && <div className={cx("lg-msg", msg.k)} role={msg.k === "err" ? "alert" : "status"}>{msg.k === "ok" && <CheckCircle2 size={17} style={{ flexShrink: 0, marginTop: 1 }} />}{msg.t}</div>}
          <div className="lg-field">
            <label htmlFor="lg-email">E-mail</label>
            <div className="lg-input"><Mail size={17} className="lead" /><input id="lg-email" type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@empresa.com.br" /></div>
          </div>
          {mode !== "forgot" && (
            <div className="lg-field">
              <label htmlFor="lg-senha">Senha</label>
              <div className="lg-input">
                <Lock size={17} className="lead" />
                <input id="lg-senha" type={show ? "text" : "password"} autoComplete={mode === "signup" ? "new-password" : "current-password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={mode === "signup" ? "Mínimo de 6 caracteres" : "Sua senha"} />
                <button type="button" className="eye" onClick={() => setShow(!show)} aria-label={show ? "Ocultar senha" : "Mostrar senha"}>{show ? <EyeOff size={17} /> : <Eye size={17} />}</button>
              </div>
            </div>
          )}
          <button className="lg-go" type="submit" disabled={busy}>{busy ? <Loader2 size={18} className="spin" /> : null}{mode === "login" ? "Entrar" : mode === "signup" ? "Criar conta" : "Enviar link"}</button>
          <div className="lg-links">
            {mode === "login" && <><button type="button" onClick={() => { setMode("signup"); setMsg(null); }}>Criar conta</button><button type="button" className="muted" onClick={() => { setMode("forgot"); setMsg(null); }}>Esqueci minha senha</button></>}
            {mode !== "login" && <button type="button" onClick={() => { setMode("login"); setMsg(null); }}>Voltar para entrar</button>}
          </div>
          <div className="lg-foot">Seus dados ficam protegidos e visíveis só para a sua conta.</div>
        </form>
      </div>
    </div>
  );
}

function ResetPasswordScreen({ onDone }) {
  useLoginCss();
  const notify = useToast();
  const [p1, setP1] = useState(""); const [p2, setP2] = useState("");
  const [busy, setBusy] = useState(false); const [msg, setMsg] = useState(null);
  const submit = async (e) => {
    e.preventDefault();
    if (p1.length < 6) return setMsg("A senha precisa ter pelo menos 6 caracteres.");
    if (p1 !== p2) return setMsg("As duas senhas não são iguais.");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: p1 });
    setBusy(false);
    if (error) return setMsg(traduzErro(error.message));
    notify("Senha atualizada"); onDone();
  };
  return (
    <div className="lg">
      <LoginSilk /><div className="lg-grain" />
      <div className="lg-in" style={{ gridTemplateColumns: "minmax(0, 440px)", justifyContent: "center" }}>
        <form className="glass lg-card" onSubmit={submit}>
          <div className="lg-brand mb-16"><BrandMark size={36} inverted /><div><b>Pascaretta</b><span>Construtora</span></div></div>
          <h2>Nova senha</h2>
          <p className="sub">Escolha uma senha com pelo menos 6 caracteres.</p>
          {msg && <div className="lg-msg err" role="alert">{msg}</div>}
          <div className="lg-field"><label htmlFor="np1">Nova senha</label><div className="lg-input"><Lock size={17} className="lead" /><input id="np1" type="password" autoComplete="new-password" value={p1} onChange={(e) => setP1(e.target.value)} /></div></div>
          <div className="lg-field"><label htmlFor="np2">Repita a senha</label><div className="lg-input"><Lock size={17} className="lead" /><input id="np2" type="password" autoComplete="new-password" value={p2} onChange={(e) => setP2(e.target.value)} /></div></div>
          <button className="lg-go" type="submit" disabled={busy}>{busy && <Loader2 size={18} className="spin" />}Salvar nova senha</button>
        </form>
      </div>
    </div>
  );
}

/* ======================= 10-execucao.jsx ======================= */
/* Execução da obra: cronograma (Gantt com arrastar), avanço por etapas, vistoria na planta e fotos. */
/* @icons Plus Pencil CalendarClock ListPlus Camera ImagePlus Check ZoomIn ZoomOut MapPin Images ChevronDown Loader2 Crosshair Layers HardHat */

const EXEC_CSS = `
/* ---------- cronograma: previsão ---------- */
.cr-top { display:flex; align-items:flex-end; justify-content:space-between; gap:12px; flex-wrap:wrap; margin-bottom:16px; }
.cr-prev { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1fr) minmax(0,1.2fr); overflow:hidden; margin-bottom:16px; }
.cr-cell { padding:20px 22px; min-width:0; display:flex; flex-direction:column; }
.cr-cell + .cr-cell { border-left:1px solid var(--line); }
.cr-strip { grid-column:1 / -1; border-top:1px solid var(--line); padding:4px 22px 6px; }
.cr-lbl { font-size:13px; font-weight:600; color:var(--ink-2); }
.cr-delta { font-family:'Archivo',sans-serif; font-stretch:70%; font-weight:800; font-size:68px; line-height:.92; letter-spacing:-.01em; font-variant-numeric:tabular-nums; display:flex; align-items:baseline; gap:8px; margin:10px 0 4px; }
.cr-delta small { font-size:22px; font-stretch:82%; font-weight:700; letter-spacing:0; }
.cr-datas { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-top:auto; padding-top:16px; }
.cr-datas > div { display:flex; flex-direction:column; gap:2px; min-width:0; }
.cr-datas small { font-size:12px; font-weight:600; color:var(--ink-3); }
.cr-datas strong { font-family:'Archivo',sans-serif; font-stretch:85%; font-weight:750; font-size:18px; font-variant-numeric:tabular-nums; }
.cr-meter + .cr-meter { margin-top:16px; }
.cr-meter-top { display:flex; justify-content:space-between; align-items:baseline; gap:8px; margin-bottom:7px; font-size:13px; font-weight:600; color:var(--ink-2); }
.cr-meter-top .t-num { font-size:20px; color:var(--ink); }
.cr-esp .ruler-fill { background:var(--ink-3); }
.cr-culp { display:flex; flex-direction:column; margin-top:8px; }
.cr-culp button { display:flex; align-items:center; gap:10px; width:100%; min-height:40px; padding:6px 0; border:0; background:none; text-align:left; font-size:14px; font-weight:600; color:var(--ink); }
.cr-culp button + button { border-top:1px solid var(--line); }
.cr-culp button:hover .clip { text-decoration:underline; text-decoration-color:var(--line-strong); text-underline-offset:3px; }
.cr-ord { font-family:'Archivo',sans-serif; font-stretch:86%; font-weight:700; font-size:12px; color:var(--ink-3); font-variant-numeric:tabular-nums; min-width:18px; flex-shrink:0; }
.cr-late { font-family:'Archivo',sans-serif; font-stretch:86%; font-weight:750; font-size:14px; color:var(--danger); white-space:nowrap; font-variant-numeric:tabular-nums; }
@media (max-width:900px) { .cr-prev { grid-template-columns:1fr 1fr; } .cr-prev .cr-cell:nth-child(3) { grid-column:1 / -1; border-left:0; border-top:1px solid var(--line); } }
@media (max-width:560px) { .cr-prev { grid-template-columns:1fr; } .cr-cell { padding:16px; } .cr-prev .cr-cell + .cr-cell { border-left:0; border-top:1px solid var(--line); } .cr-strip { padding:4px 16px 6px; } .cr-delta { font-size:56px; } }

.cr-faixa { position:relative; height:64px; }
.cr-faixa-track { position:absolute; left:0; right:0; top:29px; height:6px; border-radius:3px; background:var(--sunken); }
.cr-faixa-plan { position:absolute; left:0; top:0; bottom:0; border-radius:3px; background:var(--line-strong); }
.cr-faixa-atraso { position:absolute; top:-2px; bottom:-2px; border-radius:0 4px 4px 0; background:repeating-linear-gradient(135deg, var(--danger) 0 3px, color-mix(in srgb, var(--danger) 35%, transparent) 3px 6px); }
.cr-faixa-mk { position:absolute; top:23px; height:18px; width:2px; margin-left:-1px; border-radius:1px; background:var(--ink-2); }
.cr-faixa-mk.hoje { background:var(--blue); } .cr-faixa-mk.proj { background:var(--danger); } .cr-faixa-mk.ok { background:var(--ok); }
.cr-faixa-lbl { position:absolute; font-size:12px; font-weight:600; color:var(--ink-3); white-space:nowrap; line-height:16px; }
.cr-faixa-lbl b { color:var(--ink); font-weight:700; }
.cr-faixa-lbl.up { top:3px; } .cr-faixa-lbl.down { top:45px; }

/* ---------- cronograma: Gantt ---------- */
.cr-gsheet { overflow:hidden; margin-bottom:16px; }
.cr-ghead { display:flex; align-items:center; justify-content:space-between; gap:10px 16px; flex-wrap:wrap; padding:14px 16px; border-bottom:1px solid var(--line); }
.cr-legend { display:flex; gap:6px 14px; flex-wrap:wrap; font-size:12px; color:var(--ink-3); font-weight:600; }
.cr-legend span { display:inline-flex; align-items:center; gap:6px; }
.cr-legend i { display:inline-block; width:14px; height:8px; border-radius:2px; }
.cr-gantt { position:relative; overflow-x:auto; overflow-y:hidden; overscroll-behavior-x:contain; }
.cr-gin { position:relative; }
.cr-grow { display:flex; height:42px; }
.cr-grow + .cr-grow { border-top:1px solid color-mix(in srgb, var(--line) 65%, transparent); }
.cr-gname { position:sticky; left:0; z-index:4; flex-shrink:0; display:flex; align-items:center; gap:8px; padding:0 12px 0 16px; background:var(--sheet); border:0; border-right:1px solid var(--line); text-align:left; font-size:13px; font-weight:600; color:var(--ink); min-width:0; }
button.cr-gname:hover { background:var(--sheet-2); }
.cr-gname .clip { flex:1; }
.cr-ghd { display:flex; position:relative; border-bottom:1px solid var(--line); }
.cr-ghd .cr-gname { font-size:12px; color:var(--ink-3); height:52px; }
.cr-scale { position:relative; height:52px; flex-shrink:0; }
.cr-tick { position:absolute; top:0; height:24px; border-left:1px solid var(--line); padding:6px 0 0 6px; font-size:12px; font-weight:600; color:var(--ink-2); white-space:nowrap; font-variant-numeric:tabular-nums; }
.cr-flag { position:absolute; bottom:6px; font-size:11px; font-weight:700; padding:2px 6px; border-radius:5px; white-space:nowrap; line-height:14px; }
.cr-flag.hoje { background:var(--blue-soft); color:var(--blue-ink); transform:translateX(-50%); }
.cr-flag.prev { background:var(--sunken); color:var(--ink-2); transform:translateX(-100%); border-radius:5px 0 5px 5px; }
.cr-flag.proj { background:var(--danger-soft); color:var(--danger); border-radius:0 5px 5px 5px; }
.cr-flag.ok { background:var(--ok-soft); color:var(--ok); transform:translateX(-50%); }
.cr-gbody { position:relative; }
.cr-grid { position:absolute; top:0; bottom:0; z-index:0; pointer-events:none; }
.cr-grid i { position:absolute; top:0; bottom:0; width:1px; background:var(--line); opacity:.7; }
.cr-grid .hoje { position:absolute; top:0; bottom:0; width:2px; margin-left:-1px; background:var(--blue); opacity:.85; }
.cr-grid .prev { position:absolute; top:0; bottom:0; width:0; border-left:1.5px dashed var(--ink-3); }
.cr-grid .proj { position:absolute; top:0; bottom:0; width:2px; margin-left:-1px; background:var(--danger); opacity:.8; }
.cr-track { position:relative; flex-shrink:0; }
.cr-grow:hover .cr-track { background:color-mix(in srgb, var(--ink) 3%, transparent); }
.cr-bar { position:absolute; top:10px; height:22px; border-radius:6px; background:var(--blue-soft); box-shadow:inset 0 0 0 1px color-mix(in srgb, var(--blue) 32%, transparent); touch-action:none; cursor:grab; z-index:1; user-select:none; -webkit-user-select:none; transition:left .38s cubic-bezier(.34,1.56,.64,1), width .38s cubic-bezier(.34,1.56,.64,1), box-shadow .15s; }
.cr-bar:focus-visible { outline:2px solid var(--blue); outline-offset:2px; }
.cr-bar-fill { position:absolute; left:0; top:0; bottom:0; border-radius:6px 0 0 6px; background:var(--blue); pointer-events:none; }
.cr-bar-fill.full { border-radius:6px; }
.cr-bar.done { background:var(--ok); box-shadow:none; }
.cr-bar.dragging { transition:none; cursor:grabbing; z-index:6; box-shadow:inset 0 0 0 1px color-mix(in srgb, var(--blue) 50%, transparent), var(--shadow-2); }
.cr-bar.dim { opacity:.35; }
.cr-handle { position:absolute; right:-8px; top:-5px; bottom:-5px; width:18px; cursor:ew-resize; touch-action:none; display:flex; align-items:center; justify-content:center; z-index:2; }
.cr-handle::after { content:""; width:4px; height:14px; border-radius:2px; background:var(--sheet); box-shadow:0 0 0 1px var(--ink-3); opacity:0; transition:opacity .15s; }
.cr-bar:hover .cr-handle::after, .cr-bar.dragging .cr-handle::after, .cr-bar:focus-visible .cr-handle::after { opacity:1; }
@media (hover:none) { .cr-handle::after { opacity:.9; } }
@media (pointer:coarse) { .cr-handle { width:26px; right:-13px; } }
.cr-ext { position:absolute; top:15px; height:12px; border-radius:0 4px 4px 0; background:repeating-linear-gradient(135deg, var(--danger) 0 3px, color-mix(in srgb, var(--danger) 30%, transparent) 3px 6px); z-index:1; pointer-events:none; transition:left .38s cubic-bezier(.34,1.56,.64,1), width .38s cubic-bezier(.34,1.56,.64,1), opacity .15s; }
.cr-ext-lbl { position:absolute; top:12px; padding-left:6px; font-family:'Archivo',sans-serif; font-stretch:86%; font-size:12px; font-weight:750; color:var(--danger); white-space:nowrap; pointer-events:none; line-height:18px; transition:left .38s cubic-bezier(.34,1.56,.64,1), opacity .15s; }
.cr-drag-lbl { position:absolute; top:-15px; z-index:8; background:var(--ink); color:var(--sheet); font-size:12px; font-weight:700; padding:3px 8px; border-radius:6px; white-space:nowrap; pointer-events:none; box-shadow:var(--shadow-2); font-variant-numeric:tabular-nums; }

/* ---------- cronograma: lista ---------- */
.cr-row, .cr-lhead { display:grid; grid-template-columns:24px minmax(0,1fr) 118px 58px 132px 156px 72px; grid-template-areas:"ord nome per dur st av act"; align-items:center; column-gap:14px; padding:10px 12px 10px 16px; }
.cr-row { min-height:60px; }
.cr-lhead { font-size:12px; font-weight:600; color:var(--ink-3); padding-top:12px; padding-bottom:10px; }
.cr-row > .a-ord, .cr-lhead > .a-ord { grid-area:ord; } .cr-row > .a-nome, .cr-lhead > .a-nome { grid-area:nome; min-width:0; }
.cr-row > .a-per, .cr-lhead > .a-per { grid-area:per; } .cr-row > .a-dur, .cr-lhead > .a-dur { grid-area:dur; }
.cr-row > .a-st, .cr-lhead > .a-st { grid-area:st; } .cr-row > .a-av, .cr-lhead > .a-av { grid-area:av; } .cr-row > .a-act { grid-area:act; display:flex; justify-content:flex-end; gap:2px; position:relative; z-index:1; }
.cr-row .a-per, .cr-row .a-dur { font-size:13px; color:var(--ink-2); font-variant-numeric:tabular-nums; white-space:nowrap; }
.cr-nome { font-weight:600; font-size:14.5px; }
.cr-sub { display:flex; gap:4px 12px; flex-wrap:wrap; font-size:12px; color:var(--ink-3); margin-top:1px; min-width:0; }
.cr-sub span { display:inline-flex; align-items:center; gap:4px; min-width:0; }
.cr-av { display:flex; align-items:center; gap:10px; }
.cr-av input { flex:1; min-width:70px; height:24px; margin:0; }
.cr-av .t-num { width:38px; text-align:right; font-size:14px; }
.cr-only-m { display:none; }
@media (max-width:860px) {
  .cr-lhead { display:none; }
  .cr-row { grid-template-columns:22px auto minmax(0,1fr) auto; grid-template-areas:"ord nome nome act" "ord per per per" "ord st av av"; row-gap:6px; column-gap:12px; padding:12px 8px 12px 14px; }
  .cr-row > .a-dur { display:none; } .cr-only-m { display:inline; }
  .cr-row > .a-st { justify-self:start; }
  .cr-row > .a-ord { align-self:start; padding-top:2px; }
}
.cr-sug { display:flex; align-items:center; gap:12px; padding:12px 14px; border-radius:12px; background:var(--blue-soft); color:var(--blue-ink); font-size:13px; }
.cr-sug .btn { margin-left:auto; flex-shrink:0; }
.cr-pad-list { max-height:280px; overflow-y:auto; border:1px solid var(--line); border-radius:12px; }
.cr-pad-list > div { display:flex; align-items:center; gap:10px; padding:8px 12px; font-size:13px; }
.cr-pad-list > div + div { border-top:1px solid var(--line); }

/* ---------- etapas (linha do tempo) ---------- */
.et-head { display:grid; grid-template-columns:auto minmax(0,1fr); gap:10px 28px; align-items:end; margin-bottom:16px; }
.et-head .ruler { grid-column:1 / -1; }
.et-counts { display:flex; gap:8px 20px; flex-wrap:wrap; justify-content:flex-end; font-size:13px; color:var(--ink-2); padding-bottom:6px; }
.et-counts span { display:inline-flex; align-items:center; gap:7px; white-space:nowrap; }
.et-counts i { width:8px; height:8px; border-radius:50%; }
.et-counts b { font-family:'Archivo',sans-serif; font-stretch:86%; font-size:16px; color:var(--ink); font-variant-numeric:tabular-nums; }
@media (max-width:560px) { .et-head { grid-template-columns:1fr; } .et-counts { justify-content:flex-start; padding-bottom:0; } }
.et-sheet { padding:4px 16px 4px 18px; }
.et-list { list-style:none; margin:0; padding:0; }
.et-item { position:relative; display:flex; gap:14px; }
.et-rail { position:relative; width:30px; flex-shrink:0; display:flex; align-items:center; justify-content:center; }
.et-rail::before, .et-rail::after { content:""; position:absolute; left:50%; width:2px; margin-left:-1px; background:var(--line-strong); }
.et-rail::before { top:0; bottom:50%; } .et-rail::after { top:50%; bottom:0; }
.et-item:first-child .et-rail::before, .et-item:last-child .et-rail::after { display:none; }
.et-item.up-ok .et-rail::before, .et-item.down-ok .et-rail::after { background:var(--ok); }
.et-rail > * { position:relative; z-index:1; }
.et-main { flex:1; min-width:0; display:flex; align-items:center; gap:10px; padding:11px 0; min-height:66px; }
.et-item + .et-item .et-main { border-top:1px solid var(--line); }
.et-nome { font-weight:600; font-size:15px; line-height:1.3; }
.et-st { font-size:12.5px; font-weight:600; margin-top:2px; }
.et-acts { display:flex; align-items:center; gap:4px; flex-shrink:0; }
.et-dot { width:30px; height:30px; border-radius:50%; border:2px dashed var(--line-strong); background:var(--sheet); display:flex; align-items:center; justify-content:center; color:var(--ink-3); }
.et-add .et-main { gap:8px; }
.et-list.compact .et-rail { width:24px; }
.et-list.compact .et-main { min-height:50px; padding:7px 0; }
.et-list.compact .et-nome { font-size:14px; }
.et-list.compact .et-st { font-size:12px; margin-top:0; }
.et-list.compact .et-dot { width:24px; height:24px; }
.et-box { border:1px solid var(--line); border-radius:14px; background:var(--sheet); padding:2px 10px 2px 12px; }

/* ---------- vistoria na planta ---------- */
.vp-bar { display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin-bottom:14px; }
.vp-kpis { display:grid; grid-template-columns:repeat(4, minmax(0,1fr)); margin-bottom:16px; }
.vp-kpis > div { padding:16px 20px; min-width:0; }
.vp-kpis > div + div { border-left:1px solid var(--line); }
@media (max-width:640px) { .vp-kpis { grid-template-columns:1fr 1fr; } .vp-kpis > div { padding:14px 16px; } .vp-kpis > div:nth-child(3) { border-left:0; } .vp-kpis > div:nth-child(n+3) { border-top:1px solid var(--line); } }
.vp-layout { display:grid; gap:16px; align-items:start; grid-template-columns:minmax(0,1fr); }
@media (min-width:1200px) { .vp-layout { grid-template-columns:minmax(0,1fr) 384px; } }
.vp-lhead .seg-btn { padding:0 7px; gap:5px; }
.vp-lhead .seg { align-self:flex-start; }
.vp-hint .m { display:none; }
@media (max-width:640px) { .vp-hint .d { display:none; } .vp-hint .m { display:inline; } }
.vp-plan { overflow:hidden; }
.vp-phead { display:flex; align-items:center; gap:8px 12px; flex-wrap:wrap; padding:10px 12px 10px 16px; border-bottom:1px solid var(--line); }
.vp-hint { display:inline-flex; align-items:center; gap:8px; font-size:13px; color:var(--ink-2); font-weight:600; }
.vp-zoom { display:inline-flex; align-items:center; border:1px solid var(--line-strong); border-radius:10px; background:var(--sheet); }
.vp-zoom .icon-btn { border-radius:9px; }
.vp-zoom .vp-zlbl { min-width:52px; height:30px; border:0; background:none; font-size:13px; font-weight:700; color:var(--ink-2); font-variant-numeric:tabular-nums; border-left:1px solid var(--line); border-right:1px solid var(--line); }
.vp-scroll { overflow:auto; max-height:72vh; background:var(--sunken); overscroll-behavior:contain; }
.vp-canvas { position:relative; cursor:crosshair; }
.vp-canvas img { display:block; width:100%; height:auto; user-select:none; -webkit-user-select:none; -webkit-user-drag:none; -webkit-touch-callout:none; }
.vp-pin { position:absolute; width:40px; height:40px; padding:0; border:0; background:none; transform:translate(-50%,-50%); display:flex; align-items:center; justify-content:center; touch-action:none; cursor:pointer; z-index:2; }
.vp-pin:focus-visible { outline:none; }
.vp-pin:focus-visible > i { box-shadow:0 0 0 3px var(--sheet), 0 0 0 5px var(--blue); }
.vp-pin > i, .vp-badge { position:relative; width:28px; height:28px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-style:normal; font-family:'Archivo',sans-serif; font-stretch:86%; font-weight:800; font-size:13px; color:var(--btn-ink-text); background:var(--warn); flex-shrink:0; font-variant-numeric:tabular-nums; }
.vp-pin > i { border:2px solid var(--sheet); box-shadow:var(--shadow-2); transition:transform .2s cubic-bezier(.34,1.56,.64,1), box-shadow .15s; }
.vp-pin.atraso > i, .vp-badge.atraso { background:var(--danger); }
.vp-pin.ok > i, .vp-badge.ok { background:var(--ok); }
.vp-pin.temp > i { background:var(--blue); }
.vp-pin.atraso > i::after { content:""; position:absolute; left:50%; top:50%; width:100%; height:100%; border-radius:50%; border:2px solid var(--danger); animation:pulso 1.6s ease-out infinite; pointer-events:none; }
.vp-pin:hover > i { transform:scale(1.1); }
.vp-pin.sel { z-index:4; }
.vp-pin.sel > i { transform:scale(1.18); box-shadow:0 0 0 4px color-mix(in srgb, var(--blue) 45%, transparent), var(--shadow-2); }
.vp-pin.drop { animation:pinDrop .55s cubic-bezier(.34,1.3,.64,1) both; }
.vp-pin.drop.late { animation-delay:.2s; }
.vp-pin.dragging { z-index:6; cursor:grabbing; }
.vp-pin.dragging > i { transform:scale(1.25); }
.vp-badge { width:26px; height:26px; font-size:12px; }
.vp-row { display:flex; align-items:center; gap:12px; width:100%; padding:10px 14px 10px 16px; min-height:60px; border:0; background:none; text-align:left; transition:background-color .15s; }
.vp-row:hover { background:var(--sheet-2); }
.vp-row.sel { background:var(--blue-soft); }
.vp-row .vp-item { font-weight:600; font-size:14px; }
.vp-row .vp-meta { display:flex; gap:2px 10px; flex-wrap:wrap; font-size:12px; color:var(--ink-3); }
.vp-lhead { display:flex; flex-direction:column; gap:10px; padding:14px 16px 12px; border-bottom:1px solid var(--line); }
.vp-legado-btn { display:flex; align-items:center; gap:8px; width:100%; border:0; background:none; padding:4px 0; font-weight:700; font-size:15px; color:var(--ink); text-align:left; }
.vp-legado-btn svg { transition:transform .2s; }
.vp-legado-btn[aria-expanded="true"] svg { transform:rotate(180deg); }
.vp-preview { width:100%; max-height:220px; object-fit:cover; border-radius:12px; border:1px solid var(--line); display:block; }

/* ---------- fotos ---------- */
.fg-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(196px, 1fr)); gap:16px 14px; }
@media (max-width:560px) { .fg-grid { grid-template-columns:1fr 1fr; gap:14px 10px; } }
.fg-tile { position:relative; margin:0; min-width:0; }
.fg-tile .thumb { width:100%; aspect-ratio:4 / 3; border-radius:12px; }
.fg-tile .thumb img { transition:transform .35s cubic-bezier(.2,.8,.2,1); }
.fg-tile .thumb:hover img { transform:scale(1.03); }
.fg-tile figcaption { padding:8px 2px 0; display:flex; flex-direction:column; gap:1px; min-width:0; }
.fg-tile figcaption strong { font-size:14px; font-weight:600; }
.fg-del { position:absolute; top:8px; right:8px; z-index:2; opacity:0; transition:opacity .15s; }
.fg-del .icon-btn { background:var(--sheet); box-shadow:var(--shadow-1); }
.fg-tile:hover .fg-del, .fg-del:focus-within { opacity:1; }
@media (hover:none) { .fg-del { opacity:1; } }
.fg-mes { display:flex; align-items:baseline; gap:10px; margin:0 0 12px; }
.fg-mes h3 { font-family:'Archivo',sans-serif; font-stretch:82%; font-weight:750; font-size:18px; margin:0; }
`;

function useExecCss() {
  useLayoutEffect(() => {
    let s = document.getElementById("pc-exec-css");
    if (!s) { s = document.createElement("style"); s.id = "pc-exec-css"; document.head.appendChild(s); }
    s.textContent = EXEC_CSS;
  }, []);
}

/* guarda o último valor não nulo (para a gaveta continuar desenhada enquanto fecha) */
function useExecLast(v) { const r = useRef(v); if (v) r.current = v; return v || r.current; }

function useExecObjUrl(file) {
  const [u, setU] = useState(null);
  useEffect(() => {
    if (!file || !String(file.type || "").startsWith("image")) { setU(null); return; }
    const x = URL.createObjectURL(file); setU(x);
    return () => URL.revokeObjectURL(x);
  }, [file]);
  return u;
}

/* ---------- cronograma: utilitários ---------- */
function cronDM(iso) { if (!iso) return "—"; const [, m, d] = iso.split("-"); return `${d}/${m}`; }
function cronOrd(n) { return String(n ?? "").padStart(2, "0"); }
function cronDur(a) { return Math.max(1, Math.round(Number(a.duracaoDias) || 1)); }
function cronFim(a) { return addDaysISO(a.dataInicio, cronDur(a)); }
function cronSegunda(iso) { const d = new Date(iso + "T12:00:00"); return addDaysISO(iso, -((d.getDay() + 6) % 7)); }
function cronIniMes(iso) { return iso.slice(0, 8) + "01"; }
function cronProxMes(iso) { let [y, m] = iso.split("-").map(Number); m += 1; if (m > 12) { m = 1; y += 1; } return `${y}-${String(m).padStart(2, "0")}-01`; }
function cronMax(...l) { return l.filter(Boolean).sort().pop(); }
function cronMin(...l) { return l.filter(Boolean).sort()[0]; }
function cronStatus(a, p, hoje) {
  if (a.avancoPct >= 100) return { tone: "ok", label: "Concluída" };
  if (p?.atrasada) return { tone: "danger", label: `Atrasada ${plural(p.atrasoDias, "dia", "dias")}` };
  if (p?.atrasoDias > 0) return { tone: "warn", label: `Adiada ${plural(p.atrasoDias, "dia", "dias")}`, title: "Começa depois do planejado porque a predecessora atrasou" };
  if (a.avancoPct > 0 || a.dataInicio <= hoje) return { tone: "blue", label: "Em dia" };
  return { tone: undefined, label: "A iniciar" };
}

/* ---------- cronograma ---------- */
function ObraCronograma({ store, project }) {
  useExecCss();
  const notify = useToast();
  const hoje = todayISO();
  const ativ = useMemo(() => store.data.cronograma.filter((a) => a.projectId === project.id).sort((a, b) => (a.ordem || 0) - (b.ordem || 0)), [store.data.cronograma, project.id]);
  const pj = useMemo(() => (ativ.length ? cronogramaProjecao(ativ, hoje) : null), [ativ, hoje]);
  const [edit, setEdit] = useState(null); // { id } | { nova: true }
  const [padrao, setPadrao] = useState(false);
  const faltam = useMemo(() => { const n = new Set(ativ.map((a) => a.nome.trim().toLowerCase())); return CRONOGRAMA_SUGERIDO.filter(([nome]) => !n.has(nome.toLowerCase())); }, [ativ]);
  const abrir = (a) => setEdit({ id: a.id });

  const mover = (a, dias) => {
    const ni = addDaysISO(a.dataInicio, dias);
    store.updateAtividade(a.id, { dataInicio: ni });
    notify(`Remarcada para ${cronDM(ni)}: ${a.nome}`);
  };
  const redimensionar = (a, dias) => {
    const nd = Math.max(1, cronDur(a) + dias);
    if (nd === cronDur(a)) return;
    store.updateAtividade(a.id, { duracaoDias: nd });
    notify(`${plural(nd, "dia", "dias")} até ${cronDM(addDaysISO(a.dataInicio, nd))}: ${a.nome}`);
  };
  const salvarAvanco = (a, v) => {
    store.updateAtividade(a.id, { avancoPct: v });
    notify(v >= 100 ? `Concluída: ${a.nome}` : `Avanço de ${v}%: ${a.nome}`);
  };

  const drawers = (
    <>
      <CronAtividadeDrawer store={store} project={project} ativ={ativ} pj={pj} edit={edit} onClose={() => setEdit(null)} />
      <CronPadraoDrawer store={store} project={project} ativ={ativ} faltam={faltam} open={padrao} onClose={() => setPadrao(false)} />
    </>
  );

  if (!ativ.length) {
    return (
      <div>
        <EmptyState icon={CalendarClock} title="Monte o cronograma da obra"
          text={`Comece pelo cronograma padrão de uma casa MCMV, com ${CRONOGRAMA_SUGERIDO.length} atividades encadeadas, e depois ajuste datas e durações. Um atraso em qualquer atividade empurra as seguintes e a data de entrega.`}
          action={<>
            <button className="btn btn-ink" onClick={() => setPadrao(true)}><ListPlus size={17} />Usar cronograma padrão</button>
            <button className="btn btn-line" onClick={() => setEdit({ nova: true })}><Plus size={17} />Adicionar atividade</button>
          </>} />
        {drawers}
      </div>
    );
  }

  return (
    <div>
      <div className="cr-top">
        <div className="stack">
          <span className="t-h2">{plural(ativ.length, "atividade", "atividades")}</span>
          <span className="t-sm t-muted">De {fmtData(pj.inicioObra)} a {fmtData(pj.fimProjetado)}, em sequência</span>
        </div>
        <div className="row gap-8 wrap">
          {faltam.length > 0 && <button className="btn btn-line" onClick={() => setPadrao(true)}><ListPlus size={16} />Completar com padrão</button>}
          <button className="btn btn-ink" onClick={() => setEdit({ nova: true })}><Plus size={17} />Adicionar atividade</button>
        </div>
      </div>

      <CronPrevisao pj={pj} hoje={hoje} onOpen={abrir} />

      <Sheet className="cr-gsheet" data-tour="cron-gantt">
        <CronGantt ativ={ativ} pj={pj} hoje={hoje} onOpen={abrir} onMove={mover} onResize={redimensionar} />
      </Sheet>

      <Sheet className="divide">
        <div className="cr-lhead" aria-hidden="true">
          <span className="a-ord">#</span><span className="a-nome">Atividade</span><span className="a-per">Período</span><span className="a-dur">Duração</span><span className="a-st">Situação</span><span className="a-av">Avanço</span>
        </div>
        {ativ.map((a) => {
          const p = pj.porId.get(a.id);
          const st = cronStatus(a, p, hoje);
          const pred = a.predecessoraId ? ativ.find((x) => x.id === a.predecessoraId) : null;
          return (
            <div key={a.id} className="cr-row">
              <span className="a-ord cr-ord">{cronOrd(a.ordem)}</span>
              <div className="a-nome">
                <div className="cr-nome clip" title={a.nome}>{a.nome}</div>
                {(pred || a.responsavel) && (
                  <div className="cr-sub">
                    {pred && <span className="clip" title={`Depois de ${pred.nome}`}>Depois de {cronOrd(pred.ordem)} {pred.nome}</span>}
                    {a.responsavel && <span><HardHat size={12} />{a.responsavel}</span>}
                  </div>
                )}
              </div>
              <span className="a-per">{fmtDataCurta(a.dataInicio)} – {fmtDataCurta(cronFim(a))}<span className="cr-only-m">, {plural(cronDur(a), "dia", "dias")}</span></span>
              <span className="a-dur">{plural(cronDur(a), "dia", "dias")}</span>
              <span className="a-st"><Pill tone={st.tone} title={st.title}>{st.label}</Pill></span>
              <div className="a-av"><CronAvanco value={a.avancoPct} onCommit={(v) => salvarAvanco(a, v)} /></div>
              <div className="a-act">
                <IconBtn tip="Editar atividade" sm onClick={() => abrir(a)}><Pencil size={15} /></IconBtn>
                <ConfirmDelete what="atividade" onConfirm={async () => { await store.deleteAtividade(a.id); notify("Atividade excluída"); }} />
              </div>
            </div>
          );
        })}
      </Sheet>
      {drawers}
    </div>
  );
}

/* Avanço: estado local enquanto arrasta, grava só ao soltar */
function CronAvanco({ value, onCommit }) {
  const [v, setV] = useState(value);
  const vRef = useRef(value); const dirty = useRef(false);
  useEffect(() => { if (!dirty.current) { setV(value); vRef.current = value; } }, [value]);
  const commit = () => { if (!dirty.current) return; dirty.current = false; if (vRef.current !== value) onCommit(vRef.current); };
  return (
    <div className="cr-av">
      <input type="range" min={0} max={100} step={5} value={v} aria-label="Avanço da atividade"
        onChange={(e) => { dirty.current = true; vRef.current = Number(e.target.value); setV(vRef.current); }}
        onPointerUp={commit} onKeyUp={commit} onBlur={commit} onTouchEnd={commit} />
      <span className="t-num">{v}%</span>
    </div>
  );
}

function CronPrevisao({ pj, hoje, onOpen }) {
  const d = pj.deltaDias;
  const top = pj.culpadas.slice(0, 3);
  const gap = Math.round(pj.avanco - pj.esperado);
  return (
    <Sheet className="cr-prev" data-tour="cron-previsao">
      <div className="cr-cell">
        <span className="cr-lbl">Previsão de entrega</span>
        {d > 0 ? (
          <><div className="cr-delta t-danger"><Odometer value={`+${d}`} /><small>{d === 1 ? "dia" : "dias"}</small></div><span className="t-sm t-soft">de atraso na entrega, pelo ritmo atual</span></>
        ) : d < 0 ? (
          <><div className="cr-delta t-ok"><Odometer value={String(-d)} /><small>{d === -1 ? "dia" : "dias"}</small></div><span className="t-sm t-soft">antes do planejado</span></>
        ) : (
          <><div className="cr-delta t-ok">No prazo</div><span className="t-sm t-soft">A entrega segue na data planejada</span></>
        )}
        <div className="cr-datas">
          <div><small>Planejada</small><strong>{fmtData(pj.fimOriginal)}</strong></div>
          <div><small>Projetada</small><strong className={d > 0 ? "t-danger" : "t-ok"}>{fmtData(pj.fimProjetado)}</strong></div>
        </div>
      </div>
      <div className="cr-cell">
        <span className="cr-lbl" style={{ marginBottom: 14 }}>Avanço físico</span>
        <div className="cr-meter">
          <div className="cr-meter-top"><span>Real</span><span className="t-num">{fmtPct(pj.avanco)}</span></div>
          <Ruler pct={pj.avanco} tone={gap < -5 ? "warn" : undefined} label="Avanço real" />
        </div>
        <div className="cr-meter cr-esp">
          <div className="cr-meter-top"><span>Esperado para hoje</span><span className="t-num">{fmtPct(pj.esperado)}</span></div>
          <Ruler pct={pj.esperado} label="Avanço esperado para hoje" />
        </div>
        <div className={cx("t-sm mt-16", gap < 0 ? "t-danger" : "t-ok")} style={{ fontWeight: 600 }}>
          {gap < 0 ? `${plural(-gap, "ponto", "pontos")} abaixo do esperado` : gap > 0 ? `${plural(gap, "ponto", "pontos")} acima do esperado` : "Exatamente no esperado"}
        </div>
      </div>
      <div className="cr-cell">
        <span className="cr-lbl">O que está empurrando a entrega</span>
        {top.length ? (
          <div className="cr-culp">
            {top.map((a) => (
              <button key={a.id} type="button" onClick={() => onOpen(a)} title="Editar atividade">
                <span className="cr-ord">{cronOrd(a.ordem)}</span>
                <span className="clip grow">{a.nome}</span>
                <span className="cr-late">+{plural(pj.porId.get(a.id).atrasoDias, "dia", "dias")}</span>
              </button>
            ))}
            {pj.culpadas.length > 3 && <span className="t-xs t-muted mt-8">e mais {plural(pj.culpadas.length - 3, "atividade atrasada", "atividades atrasadas")}</span>}
          </div>
        ) : (
          <div className="row gap-8 t-sm t-soft mt-8"><Check size={16} className="t-ok" />Nenhuma atividade atrasada.</div>
        )}
      </div>
      <div className="cr-strip"><CronFaixa pj={pj} hoje={hoje} /></div>
    </Sheet>
  );
}

/* faixa: do início da obra até a entrega projetada, com o trecho de atraso em vermelho */
function CronFaixa({ pj, hoje }) {
  const ref = useRef(null);
  const [w, setW] = useState(600);
  useLayoutEffect(() => {
    const el = ref.current; if (!el) return;
    setW(el.clientWidth);
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width)); ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const ini = pj.inicioObra; const fim = cronMax(pj.fimProjetado, pj.fimOriginal);
  const total = Math.max(1, diffDaysISO(ini, fim));
  const pc = (iso) => Math.max(0, Math.min(100, (diffDaysISO(ini, iso) / total) * 100));
  const pPrev = pc(pj.fimOriginal), pProj = pc(pj.fimProjetado), pHoje = pc(hoje);
  const atraso = pj.deltaDias > 0;
  const gapPx = ((pProj - pPrev) / 100) * w;
  const prevUp = atraso && gapPx < 150;
  const hojeVisivel = hoje >= ini && hoje <= fim && (!prevUp || Math.abs(pHoje - pPrev) / 100 * w > 110);
  const hojeLbl = pHoje < 8 ? { left: 0 } : pHoje > 92 ? { right: 0 } : { left: `${pHoje}%`, transform: "translateX(-50%)" };
  return (
    <div className="cr-faixa" ref={ref} aria-label={`Início em ${fmtData(ini)}, entrega planejada em ${fmtData(pj.fimOriginal)}, projetada em ${fmtData(pj.fimProjetado)}`}>
      <div className="cr-faixa-track">
        <span className="cr-faixa-plan" style={{ width: `${pPrev}%` }} />
        {atraso && <span className="cr-faixa-atraso" style={{ left: `${pPrev}%`, width: `${pProj - pPrev}%` }} />}
      </div>
      {hoje >= ini && hoje <= fim && <span className="cr-faixa-mk hoje" style={{ left: `${pHoje}%` }} />}
      <span className={cx("cr-faixa-mk", !atraso && "ok")} style={{ left: `${pPrev}%` }} />
      {atraso && <span className="cr-faixa-mk proj" style={{ left: `${pProj}%` }} />}
      <span className="cr-faixa-lbl down" style={{ left: 0 }}>Início <b>{fmtDataCurta(ini)}</b></span>
      {hojeVisivel && <span className="cr-faixa-lbl up t-blue" style={{ ...hojeLbl, color: "var(--blue)" }}>Hoje</span>}
      {atraso ? (
        <>
          <span className={cx("cr-faixa-lbl", prevUp ? "up" : "down")} style={{ left: `${pPrev}%`, transform: "translateX(-100%)", paddingRight: 6 }}>Planejada <b>{fmtDataCurta(pj.fimOriginal)}</b></span>
          <span className="cr-faixa-lbl down" style={{ right: 0, color: "var(--danger)" }}>Projetada <b style={{ color: "var(--danger)" }}>{fmtDataCurta(pj.fimProjetado)}</b></span>
        </>
      ) : (
        <span className="cr-faixa-lbl down" style={{ right: 0 }}>Entrega <b style={{ color: "var(--ok)" }}>{fmtDataCurta(pj.fimProjetado)}</b></span>
      )}
    </div>
  );
}

function CronGantt({ ativ, pj, hoje, onOpen, onMove, onResize }) {
  const wrapRef = useRef(null);
  const [cw, setCw] = useState(0);
  useLayoutEffect(() => {
    const el = wrapRef.current; if (!el) return;
    setCw(el.clientWidth);
    const ro = new ResizeObserver(([e]) => setCw(e.contentRect.width)); ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const lo0 = cronMin(pj.inicioObra, hoje);
  const hi0 = cronMax(pj.fimProjetado, pj.fimOriginal, hoje);
  const [escalaUser, setEscala] = useState(null);
  const escala = escalaUser || (diffDaysISO(lo0, hi0) > 90 ? "meses" : "semanas");
  const mobile = cw > 0 && cw < 600;
  const nameW = mobile ? 132 : 248;
  let start; let end;
  if (escala === "meses") { start = cronIniMes(addDaysISO(lo0, -3)); end = cronProxMes(addDaysISO(hi0, 6)); }
  else { start = cronSegunda(addDaysISO(lo0, -3)); end = addDaysISO(cronSegunda(addDaysISO(hi0, 8)), 7); }
  const dias = Math.max(7, diffDaysISO(start, end));
  const avail = Math.max(160, (cw || 900) - nameW);
  const ppd = escala === "meses" ? Math.max(3.2, avail / dias) : Math.max(mobile ? 15 : 20, avail / dias);
  const W = Math.round(dias * ppd);
  const X = (iso) => diffDaysISO(start, iso) * ppd;

  const ticks = [];
  if (escala === "meses") for (let d = start; d < end; d = cronProxMes(d)) ticks.push({ d, x: X(d), label: fmtMes(d.slice(0, 7)) });
  else for (let d = start; d < end; d = addDaysISO(d, 7)) ticks.push({ d, x: X(d), label: fmtDataCurta(d) });

  // rola até perto de hoje quando a linha do tempo não cabe
  useEffect(() => {
    const el = wrapRef.current; if (!el || !cw) return;
    if (el.scrollWidth > el.clientWidth + 4) el.scrollLeft = Math.max(0, X(hoje) - (el.clientWidth - nameW) * 0.3);
    else el.scrollLeft = 0;
  }, [escala, cw > 0]); // eslint-disable-line

  /* arrastar: mover (barra) ou mudar duração (ponta direita) */
  const [drag, setDrag] = useState(null);
  const dRef = useRef(null);
  const begin = (e, a, mode) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.stopPropagation();
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* */ }
    dRef.current = { a, mode, x0: e.clientX, dx: 0, moved: false, pid: e.pointerId };
  };
  const onMoveP = (e) => {
    const d = dRef.current; if (!d || d.pid !== e.pointerId) return;
    d.dx = e.clientX - d.x0;
    if (!d.moved && Math.abs(d.dx) > 4) d.moved = true;
    if (d.moved) setDrag({ id: d.a.id, mode: d.mode, dx: d.dx });
  };
  const onUpP = (e) => {
    const d = dRef.current; if (!d || d.pid !== e.pointerId) return;
    dRef.current = null; setDrag(null);
    if (!d.moved) { onOpen(d.a); return; }
    const n = Math.round(d.dx / ppd);
    if (!n) return;
    if (d.mode === "move") onMove(d.a, n); else onResize(d.a, n);
  };
  const onCancelP = () => { dRef.current = null; setDrag(null); };
  const onKey = (e, a) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(a); }
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") { e.preventDefault(); const n = e.key === "ArrowRight" ? 1 : -1; if (e.shiftKey) onResize(a, n); else onMove(a, n); }
  };

  const xHoje = X(hoje), xPrev = X(pj.fimOriginal), xProj = X(pj.fimProjetado);
  const atraso = pj.deltaDias > 0;
  const showHojeFlag = hoje >= start && hoje < end && Math.abs(xHoje - xPrev) > 74 && (!atraso || Math.abs(xHoje - xProj) > 74);

  return (
    <>
      <div className="cr-ghead">
        <div className="stack gap-4" style={{ minWidth: 0 }}>
          <h2 className="t-h2">Linha do tempo</h2>
          <span className="t-xs t-muted">{mobile ? "Arraste a barra para remarcar e a ponta para mudar a duração" : "Arraste uma barra para remarcar a atividade; puxe a ponta direita para mudar a duração"}</span>
        </div>
        <Segmented size="sm" ariaLabel="Escala da linha do tempo" value={escala} onChange={setEscala}
          options={[{ value: "semanas", label: "Semanas" }, { value: "meses", label: "Meses" }]} />
        <div className="cr-legend" style={{ flexBasis: "100%" }}>
          <span><i style={{ background: "var(--blue)" }} />Executado</span>
          <span><i style={{ background: "var(--blue-soft)", boxShadow: "inset 0 0 0 1px color-mix(in srgb, var(--blue) 32%, transparent)" }} />A executar</span>
          <span><i style={{ background: "repeating-linear-gradient(135deg, var(--danger) 0 3px, color-mix(in srgb, var(--danger) 30%, transparent) 3px 6px)" }} />Atraso projetado</span>
          <span><i style={{ background: "var(--ok)" }} />Concluída</span>
        </div>
      </div>
      <div className="cr-gantt" ref={wrapRef}>
        <div className="cr-gin" style={{ width: nameW + W }}>
          <div className="cr-ghd">
            <div className="cr-gname" style={{ width: nameW }}>Atividade</div>
            <div className="cr-scale" style={{ width: W }}>
              {ticks.map((t) => <span key={t.d} className="cr-tick" style={{ left: t.x }}>{t.label}</span>)}
              {showHojeFlag && <span className="cr-flag hoje" style={{ left: xHoje }}>Hoje</span>}
              {atraso ? (
                <>
                  <span className="cr-flag prev" style={{ left: xPrev }}>Planejada</span>
                  <span className="cr-flag proj" style={{ left: xProj }}>Projetada</span>
                </>
              ) : <span className="cr-flag ok" style={{ left: xPrev }}>Entrega</span>}
            </div>
          </div>
          <div className="cr-gbody">
            <div className="cr-grid" style={{ left: nameW, width: W }} aria-hidden="true">
              {ticks.map((t) => <i key={t.d} style={{ left: t.x }} />)}
              {hoje >= start && hoje < end && <b className="hoje" style={{ left: xHoje }} />}
              <b className="prev" style={{ left: xPrev }} />
              {atraso && <b className="proj" style={{ left: xProj }} />}
            </div>
            {ativ.map((a) => {
              const p = pj.porId.get(a.id);
              const dur = cronDur(a);
              const done = a.avancoPct >= 100;
              const baseL = X(a.dataInicio); const baseW = dur * ppd;
              const isD = drag && drag.id === a.id;
              let L = baseL; let BW = baseW;
              if (isD && drag.mode === "move") L = baseL + drag.dx;
              if (isD && drag.mode === "resize") BW = Math.max(ppd, baseW + drag.dx);
              const n = isD ? Math.round(drag.dx / ppd) : 0;
              const extL = baseL + baseW; const extW = !done && p && p.fim > p.fimPlanejado ? X(p.fim) - extL : 0;
              let lbl = null;
              if (isD && drag.mode === "move") lbl = { left: L, text: `Início ${fmtDataCurta(addDaysISO(a.dataInicio, n))}` };
              if (isD && drag.mode === "resize") { const nd = Math.max(1, dur + n); lbl = { left: L + BW, right: true, text: `${plural(nd, "dia", "dias")}, até ${fmtDataCurta(addDaysISO(a.dataInicio, nd))}` }; }
              const tip = `${a.nome}\n${fmtData(a.dataInicio)} a ${fmtData(cronFim(a))} (${plural(dur, "dia", "dias")}), ${a.avancoPct}% executado` + (p && p.atrasoDias > 0 && !done ? `\nTérmino projetado: ${fmtData(p.fim)} (+${plural(p.atrasoDias, "dia", "dias")})` : "");
              return (
                <div key={a.id} className="cr-grow">
                  <button type="button" className="cr-gname" style={{ width: nameW }} onClick={() => onOpen(a)} title={a.nome}>
                    <span className="cr-ord">{cronOrd(a.ordem)}</span><span className="clip">{a.nome}</span>
                  </button>
                  <div className="cr-track" style={{ width: W }}>
                    {extW > 0 && <>
                      <span className="cr-ext" style={{ left: extL, width: extW, opacity: isD ? 0 : 1 }} />
                      <span className="cr-ext-lbl" style={{ left: extL + extW, opacity: isD ? 0 : 1 }}>+{p.atrasoDias}d</span>
                    </>}
                    <div role="button" tabIndex={0} aria-label={`${a.nome}: ${fmtData(a.dataInicio)} a ${fmtData(cronFim(a))}. Enter para editar, setas para remarcar.`}
                      title={isD ? undefined : tip}
                      className={cx("cr-bar", done && "done", isD && "dragging")} style={{ left: L, width: BW }}
                      onPointerDown={(e) => begin(e, a, "move")} onPointerMove={onMoveP} onPointerUp={onUpP} onPointerCancel={onCancelP} onKeyDown={(e) => onKey(e, a)}>
                      {!done && a.avancoPct > 0 && <span className={cx("cr-bar-fill", a.avancoPct >= 100 && "full")} style={{ width: `${a.avancoPct}%` }} />}
                      <span className="cr-handle" onPointerDown={(e) => begin(e, a, "resize")} aria-hidden="true" />
                    </div>
                    {lbl && <span className="cr-drag-lbl" style={lbl.right ? { left: lbl.left, transform: "translateX(-100%)" } : { left: lbl.left }}>{lbl.text}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}

/* gaveta de nova atividade / edição completa */
function CronAtividadeDrawer({ store, project, ativ, pj, edit, onClose }) {
  const notify = useToast();
  const e = useExecLast(edit);
  const atual = e && e.id ? ativ.find((a) => a.id === e.id) : null;
  const [f, setF] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!edit) return;
    setErr("");
    if (edit.id) {
      const a = ativ.find((x) => x.id === edit.id);
      if (a) setF({ nome: a.nome, dataInicio: a.dataInicio, duracaoDias: String(cronDur(a)), predecessoraId: a.predecessoraId ? String(a.predecessoraId) : "", responsavel: a.responsavel || "", avancoPct: a.avancoPct || 0 });
    } else {
      const ult = ativ[ativ.length - 1];
      const ini = ult && pj ? pj.porId.get(ult.id).fim : todayISO();
      setF({ nome: "", dataInicio: ini, duracaoDias: "5", predecessoraId: ult ? String(ult.id) : "", responsavel: "", avancoPct: 0 });
    }
  }, [edit]); // eslint-disable-line
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const excl = atual ? dependentesDe(atual.id, ativ) : new Set();
  const opcoes = ativ.filter((a) => !excl.has(a.id));
  const pred = f && f.predecessoraId ? ativ.find((a) => String(a.id) === f.predecessoraId) : null;
  const predFim = pred && pj ? pj.porId.get(pred.id)?.fim : null;
  const dur = f ? Math.max(1, Math.round(Number(f.duracaoDias) || 0)) : 1;

  const salvar = async () => {
    if (!f.nome.trim()) { setErr("Dê um nome à atividade."); return; }
    if (!f.dataInicio) { setErr("Informe a data de início."); return; }
    setBusy(true);
    const payload = { nome: f.nome.trim(), dataInicio: f.dataInicio, duracaoDias: dur, predecessoraId: f.predecessoraId ? (pred ? pred.id : null) : null, responsavel: f.responsavel.trim() || null, avancoPct: Number(f.avancoPct) || 0 };
    if (atual) { await store.updateAtividade(atual.id, payload); notify("Atividade salva"); }
    else {
      const it = await store.addAtividade({ projectId: project.id, ...payload });
      if (it && payload.avancoPct) await store.updateAtividade(it.id, { avancoPct: payload.avancoPct });
      if (it) notify("Atividade adicionada");
    }
    setBusy(false); onClose();
  };

  return (
    <Drawer open={!!edit} onClose={onClose} title={atual ? "Editar atividade" : "Nova atividade"} sub={atual ? `Atividade ${cronOrd(atual.ordem)} do cronograma` : "Entra no fim do cronograma"}
      footer={f && <>
        {atual && <div className="grow"><ConfirmDelete what="atividade" onConfirm={async () => { await store.deleteAtividade(atual.id); notify("Atividade excluída"); onClose(); }} /></div>}
        <button className="btn btn-quiet" onClick={onClose}>Cancelar</button>
        <button className="btn btn-ink" onClick={salvar} disabled={busy}>{busy && <Loader2 size={16} className="spin" />}{atual ? "Salvar atividade" : "Adicionar atividade"}</button>
      </>}>
      {f && <>
        <Field label="Nome da atividade">
          <input className="input" value={f.nome} onChange={(ev) => { set("nome", ev.target.value); if (err) setErr(""); }} placeholder="Ex.: Reboco externo" />
          {err && <span className="t-xs t-danger" style={{ fontWeight: 600 }}>{err}</span>}
        </Field>
        <Field label="Predecessora" hint="A atividade só começa depois que a predecessora termina. Atrasos nela empurram esta.">
          <select className="select" value={f.predecessoraId} onChange={(ev) => set("predecessoraId", ev.target.value)}>
            <option value="">Nenhuma (início livre)</option>
            {opcoes.map((a) => <option key={a.id} value={String(a.id)}>{cronOrd(a.ordem)} {a.nome}</option>)}
          </select>
        </Field>
        {pred && predFim && predFim !== f.dataInicio && (
          <div className="cr-sug">
            <span>{pred.nome} termina em <b>{fmtData(predFim)}</b>{predFim !== cronFim(pred) ? " pelo ritmo atual" : ""}.</span>
            <button type="button" className="btn btn-line btn-sm" onClick={() => set("dataInicio", predFim)}>Começar em {cronDM(predFim)}</button>
          </div>
        )}
        <div className="grid cols-2">
          <Field label="Início"><input className="input" type="date" value={f.dataInicio} onChange={(ev) => set("dataInicio", ev.target.value)} /></Field>
          <Field label="Duração (dias)" hint={f.dataInicio ? `Termina em ${fmtData(addDaysISO(f.dataInicio, dur))}` : undefined}>
            <input className="input" type="number" min={1} inputMode="numeric" value={f.duracaoDias} onChange={(ev) => set("duracaoDias", ev.target.value)} />
          </Field>
        </div>
        <Field label="Responsável"><input className="input" value={f.responsavel} onChange={(ev) => set("responsavel", ev.target.value)} placeholder="Ex.: Zé (mestre de obras)" /></Field>
        <Field label="Avanço">
          <div className="cr-av"><input type="range" min={0} max={100} step={5} value={f.avancoPct} onChange={(ev) => set("avancoPct", Number(ev.target.value))} aria-label="Avanço da atividade" /><span className="t-num">{f.avancoPct}%</span></div>
        </Field>
      </>}
    </Drawer>
  );
}

function CronPadraoDrawer({ store, project, ativ, faltam, open, onClose }) {
  const notify = useToast();
  const [data, setData] = useState(todayISO());
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) setData(project.startDate || todayISO()); }, [open]); // eslint-disable-line
  const ult = ativ[ativ.length - 1];
  const iniLista = ult ? cronFim(ult) : data;
  const vazio = !ativ.length;
  const totalDias = faltam.reduce((s, [, d]) => s + d, 0);
  const add = async () => {
    setBusy(true);
    const n = await store.addAtividadesEncadeadas(project.id, faltam, data);
    setBusy(false);
    if (n) { notify(plural(n, "atividade adicionada", "atividades adicionadas")); onClose(); }
  };
  return (
    <Drawer open={open} onClose={onClose} title={vazio ? "Usar cronograma padrão" : "Completar com atividades padrão"}
      sub={vazio ? "Atividades típicas de uma casa MCMV, uma depois da outra" : "Só entram as atividades padrão que ainda não estão no cronograma"}
      footer={<>
        <button className="btn btn-quiet" onClick={onClose}>Cancelar</button>
        <button className="btn btn-ink" onClick={add} disabled={busy || !faltam.length || (vazio && !data)}>{busy && <Loader2 size={16} className="spin" />}{busy ? "Adicionando…" : faltam.length ? `Adicionar ${plural(faltam.length, "atividade", "atividades")}` : "Nada a adicionar"}</button>
      </>}>
      {vazio ? (
        <Field label="Data de início da obra" hint={data ? `Com as durações padrão, a entrega fica em ${fmtData(addDaysISO(data, totalDias))}.` : undefined}>
          <input className="input" type="date" value={data} onChange={(e) => setData(e.target.value)} />
        </Field>
      ) : faltam.length ? (
        <div className="t-sm t-soft">Entram em sequência depois de <b>{cronOrd(ult.ordem)} {ult.nome}</b>, a partir de {fmtData(iniLista)}. Você pode mudar a ordem das predecessoras depois.</div>
      ) : (
        <div className="t-sm t-soft">Todas as atividades padrão já estão no cronograma.</div>
      )}
      {faltam.length > 0 && (
        <div className="stack gap-8">
          <span className="label">{plural(faltam.length, "atividade", "atividades")}, {plural(totalDias, "dia", "dias")} no total</span>
          <div className="cr-pad-list">
            {faltam.map(([nome, d], i) => (
              <div key={nome}><span className="cr-ord">{cronOrd((ult?.ordem || 0) + i + 1)}</span><span className="grow clip">{nome}</span><span className="t-muted t-num" style={{ fontSize: 13 }}>{d}d</span></div>
            ))}
          </div>
        </div>
      )}
    </Drawer>
  );
}

/* ---------- etapas ---------- */
function execEtapaTxt(e) {
  if (e.status === "concluida") return e.dataConclusao ? `Concluída em ${fmtDataCurta(e.dataConclusao)}` : "Concluída";
  return e.status === "andamento" ? "Em execução" : "A iniciar";
}
const EXEC_ETAPA_TIP = { pendente: "Marcar em execução", andamento: "Marcar como concluída", concluida: "Voltar para a iniciar" };

function ExecEtapaLista({ itens, compact, onCycle, onFoto, onDelete, children }) {
  const [lb, setLb] = useState(null);
  const comFoto = itens.filter((e) => e.fotoPath);
  const tw = compact ? 36 : 44;
  return (
    <>
      <ol className={cx("et-list", compact && "compact")}>
        {itens.map((e, i) => {
          const prev = itens[i - 1]; const next = itens[i + 1];
          const feita = e.status === "concluida";
          return (
            <li key={e.id} className={cx("et-item", feita && prev?.status === "concluida" && "up-ok", feita && next?.status === "concluida" && "down-ok")}>
              <div className="et-rail"><DoneCheck status={e.status} size={compact ? "sm" : undefined} tip={EXEC_ETAPA_TIP[e.status]} onClick={() => onCycle(e)} /></div>
              <div className="et-main">
                <div className="grow" style={{ minWidth: 0 }}>
                  <div className="et-nome">{e.nome}</div>
                  <div className={cx("et-st", feita ? "t-ok" : e.status === "andamento" ? "t-warn" : "t-muted")}>{execEtapaTxt(e)}</div>
                </div>
                <div className="et-acts">
                  {e.fotoPath && <Thumb path={e.fotoPath} w={tw} h={tw} radius={8} alt={`Foto da etapa ${e.nome}`} onClick={() => setLb(comFoto.findIndex((x) => x.id === e.id))} />}
                  <FilePick className="icon-btn sm" tip={e.fotoPath ? "Trocar foto" : "Adicionar foto"} onFile={(f) => onFoto(e, f)}>{e.fotoPath ? <Camera size={16} /> : <ImagePlus size={16} />}</FilePick>
                  <ConfirmDelete what="etapa" onConfirm={() => onDelete(e)} />
                </div>
              </div>
            </li>
          );
        })}
        {children}
      </ol>
      {lb !== null && comFoto[lb] && (
        <Lightbox items={comFoto.map((e) => ({ path: e.fotoPath, title: e.nome, sub: execEtapaTxt(e) }))} index={lb} onIndex={setLb} onClose={() => setLb(null)} />
      )}
    </>
  );
}

function ExecEtapaAdd({ onAdd, first }) {
  const [nome, setNome] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (ev) => {
    ev.preventDefault();
    const n = nome.trim(); if (!n) return;
    setBusy(true); const ok = await onAdd(n); setBusy(false);
    if (ok) setNome("");
  };
  return (
    <li className="et-item et-add">
      <div className="et-rail"><span className="et-dot"><Plus size={14} /></span></div>
      <form className="et-main" onSubmit={submit}>
        <input className="input sm grow" value={nome} onChange={(e) => setNome(e.target.value)} placeholder={first ? "Nome da primeira etapa" : "Nova etapa, ex.: Muro e calçada"} aria-label="Nome da nova etapa" />
        <button type="submit" className="btn btn-line btn-sm" disabled={!nome.trim() || busy}>Adicionar</button>
      </form>
    </li>
  );
}

function ObraEtapas({ store, project }) {
  useExecCss();
  const notify = useToast();
  const etapas = useMemo(() => store.data.etapas.filter((e) => e.projectId === project.id).sort((a, b) => (a.ordem || 0) - (b.ordem || 0)), [store.data.etapas, project.id]);
  const n = etapas.length;
  const feitas = etapas.filter((e) => e.status === "concluida").length;
  const andam = etapas.filter((e) => e.status === "andamento").length;
  const pct = n ? (feitas / n) * 100 : 0;
  const faltam = ETAPAS_SUGERIDAS.filter((s) => !etapas.some((e) => e.nome.trim().toLowerCase() === s.toLowerCase())).length;
  const [busy, setBusy] = useState(false);

  const cycle = (e) => {
    const next = ETAPA_NEXT[e.status] || "andamento";
    store.updateEtapa(e.id, { status: next, dataConclusao: next === "concluida" ? todayISO() : null });
    if (next === "concluida") notify(`Concluída: ${e.nome}`);
  };
  const padrao = async () => { setBusy(true); const k = await store.addEtapasPadrao(project.id); setBusy(false); if (k) notify(plural(k, "etapa adicionada", "etapas adicionadas")); };
  const add = async (nome) => { const it = await store.addEtapa({ projectId: project.id, nome }); if (it) notify("Etapa adicionada"); return !!it; };
  const foto = (e, f) => store.setEtapaFoto(e.id, f);
  const del = async (e) => { await store.deleteEtapa(e.id); notify("Etapa excluída"); };

  if (!n) {
    return (
      <div className="stack gap-16">
        <EmptyState icon={Layers} title="Defina as etapas da obra"
          text={`Use a lista padrão de ${ETAPAS_SUGERIDAS.length} etapas de uma casa MCMV ou crie as suas. Cada etapa concluída pode levar uma foto como registro.`}
          action={<button className="btn btn-ink" onClick={padrao} disabled={busy}>{busy ? <Loader2 size={16} className="spin" /> : <ListPlus size={17} />}Usar etapas padrão</button>} />
        <Sheet className="et-sheet"><ol className="et-list"><ExecEtapaAdd onAdd={add} first /></ol></Sheet>
      </div>
    );
  }

  return (
    <div>
      <Sheet className="pad et-head">
        <div className="stack gap-4">
          <span className="kpi-label">Avanço da obra</span>
          <span className="kpi-value lg" style={pct >= 100 ? { color: "var(--ok)" } : undefined}><Odometer value={`${Math.round(pct)}%`} /></span>
        </div>
        <div className="et-counts">
          <span><i style={{ background: "var(--ok)" }} /><b>{feitas}</b>{feitas === 1 ? "concluída" : "concluídas"}</span>
          <span><i style={{ background: "var(--warn)" }} /><b>{andam}</b>em execução</span>
          <span><i style={{ background: "var(--line-strong)" }} /><b>{n - feitas - andam}</b>a iniciar</span>
        </div>
        <Ruler pct={pct} tone={pct >= 100 ? "ok" : undefined} label="Etapas concluídas" />
      </Sheet>
      <SectionHead title="Etapas" sub="Toque no círculo para avançar: a iniciar, em execução, concluída."
        actions={faltam > 0 && <button className="btn btn-line btn-sm" onClick={padrao} disabled={busy}>{busy ? <Loader2 size={15} className="spin" /> : <ListPlus size={15} />}Completar com padrão</button>} />
      <Sheet className="et-sheet">
        <ExecEtapaLista itens={etapas} onCycle={cycle} onFoto={foto} onDelete={del}>
          <ExecEtapaAdd onAdd={add} />
        </ExecEtapaLista>
      </Sheet>
    </div>
  );
}

/* versão compacta para os detalhes de uma unidade */
function UnidadeEtapas({ store, unitId }) {
  useExecCss();
  const notify = useToast();
  const itens = useMemo(() => store.data.unidadeEtapas.filter((e) => e.unitId === unitId).sort((a, b) => (a.ordem || 0) - (b.ordem || 0)), [store.data.unidadeEtapas, unitId]);
  const n = itens.length; const feitas = itens.filter((e) => e.status === "concluida").length;
  const pct = n ? (feitas / n) * 100 : 0;
  const faltam = ETAPAS_SUGERIDAS.filter((s) => !itens.some((e) => e.nome.trim().toLowerCase() === s.toLowerCase())).length;
  const [busy, setBusy] = useState(false);
  const cycle = (e) => {
    const next = ETAPA_NEXT[e.status] || "andamento";
    store.updateEtapaUnidade(e.id, { status: next, dataConclusao: next === "concluida" ? todayISO() : null });
    if (next === "concluida") notify(`Concluída: ${e.nome}`);
  };
  const padrao = async () => { setBusy(true); const k = await store.addEtapasPadraoUnidade(unitId); setBusy(false); if (k) notify(plural(k, "etapa adicionada", "etapas adicionadas")); };
  const add = async (nome) => { const it = await store.addEtapaUnidade({ unitId, nome }); if (it) notify("Etapa adicionada"); return !!it; };
  return (
    <div className="stack gap-12">
      {n > 0 ? (
        <div className="stack gap-6">
          <div className="row between gap-8 t-sm"><span style={{ fontWeight: 600 }}>{feitas} de {plural(n, "etapa concluída", "etapas concluídas")}</span><span className="t-num" style={{ fontSize: 16 }}>{fmtPct(pct)}</span></div>
          <Ruler pct={pct} thin tone={pct >= 100 ? "ok" : undefined} label="Etapas da unidade" />
        </div>
      ) : (
        <div className="row between gap-12 wrap">
          <span className="t-sm t-soft">Nenhuma etapa nesta unidade ainda.</span>
          <button className="btn btn-line btn-sm" onClick={padrao} disabled={busy}>{busy ? <Loader2 size={15} className="spin" /> : <ListPlus size={15} />}Usar etapas padrão</button>
        </div>
      )}
      <div className="et-box">
        <ExecEtapaList0 itens={itens} cycle={cycle} store={store} notify={notify} add={add} />
      </div>
      {n > 0 && faltam > 0 && <button className="btn btn-quiet btn-sm" style={{ alignSelf: "flex-start" }} onClick={padrao} disabled={busy}>{busy ? <Loader2 size={15} className="spin" /> : <ListPlus size={15} />}Completar com etapas padrão</button>}
    </div>
  );
}
function ExecEtapaList0({ itens, cycle, store, notify, add }) {
  return (
    <ExecEtapaLista compact itens={itens} onCycle={cycle} onFoto={(e, f) => store.setEtapaUnidadeFoto(e.id, f)}
      onDelete={async (e) => { await store.deleteEtapaUnidade(e.id); notify("Etapa excluída"); }}>
      <ExecEtapaAdd onAdd={add} first={!itens.length} />
    </ExecEtapaLista>
  );
}

/* ---------- vistoria na planta ---------- */
function vistEfetivo(p, hoje) { return p.status === "pendente" && p.prazo && p.prazo < hoje ? "atraso" : p.status; }
const VIST_STATUS_OPTS = [{ value: "pendente", label: "Pendente" }, { value: "atraso", label: "Atrasada" }, { value: "ok", label: "Resolvida" }];

function ObraVistoria({ store, project }) {
  useExecCss();
  const notify = useToast();
  const hoje = todayISO();
  const pranchas = useMemo(() => store.data.pranchas.filter((p) => p.projectId === project.id).sort((a, b) => String(a.createdAt || "").localeCompare(String(b.createdAt || "")) || a.id - b.id), [store.data.pranchas, project.id]);
  const [selId, setSelId] = useState(null);
  const prancha = pranchas.find((p) => p.id === selId) || pranchas[0] || null;
  const pins = useMemo(() => (prancha ? store.data.pins.filter((p) => p.pranchaId === prancha.id).sort((a, b) => String(a.createdAt || "").localeCompare(String(b.createdAt || "")) || a.id - b.id) : []), [store.data.pins, prancha]);
  const numero = useMemo(() => new Map(pins.map((p, i) => [p.id, i + 1])), [pins]);
  const [zoom, setZoom] = useState(1);
  const [temp, setTemp] = useState(null);
  const [abertoId, setAbertoId] = useState(null);
  const [hl, setHl] = useState(null);
  const [filtro, setFiltro] = useState("todas");
  const [novaPrancha, setNovaPrancha] = useState(false);
  const [dropped, setDropped] = useState(() => new Set());
  useEffect(() => { setZoom(1); setTemp(null); setHl(null); setFiltro("todas"); }, [prancha?.id]);

  const legado = store.data.vistoria.filter((v) => v.projectId === project.id);
  const cont = { pendente: 0, atraso: 0, ok: 0 };
  pins.forEach((p) => { const s = vistEfetivo(p, hoje); cont[s] = (cont[s] || 0) + 1; });
  const pctOk = pins.length ? (cont.ok / pins.length) * 100 : 0;
  const lista = filtro === "todas" ? pins : pins.filter((p) => vistEfetivo(p, hoje) === filtro);
  const aberto = pins.find((p) => p.id === abertoId) || null;

  const abrirPin = (p) => { setHl(p.id); setAbertoId(p.id); };
  const salvarNovo = async (f) => {
    const p = await store.addPin({ pranchaId: prancha.id, xPct: temp.x, yPct: temp.y, ...f });
    if (p) { setDropped((s) => new Set(s).add(p.id)); setTemp(null); notify("Pendência marcada na planta"); }
    return p;
  };
  const moverPin = (p, x, y) => { store.updatePin(p.id, { xPct: x, yPct: y }); notify(`Pendência ${numero.get(p.id)} reposicionada`); };

  const lbl = (txt, n) => <>{txt}<span className="t-muted" style={{ fontWeight: 700 }}>{n}</span></>;

  if (!prancha) {
    return (
      <div>
        <EmptyState icon={MapPin} title="Vistoria na planta"
          text="Envie a planta baixa ou uma foto do ambiente e toque no ponto exato para marcar cada pendência."
          action={<button className="btn btn-ink" onClick={() => setNovaPrancha(true)}><ImagePlus size={17} />Enviar planta ou foto</button>} />
        {legado.length > 0 && <VistLegado store={store} itens={legado} />}
        <VistPranchaDrawer store={store} project={project} open={novaPrancha} onClose={() => setNovaPrancha(false)} onCreated={(p) => setSelId(p.id)} />
      </div>
    );
  }

  return (
    <div>
      <div className="vp-bar">
        {pranchas.length > 1 ? (
          <Segmented ariaLabel="Pranchas" value={prancha.id} onChange={setSelId} options={pranchas.map((p) => ({ value: p.id, label: p.titulo }))} />
        ) : (
          <h2 className="t-h2 clip" style={{ minWidth: 0 }}>{prancha.titulo}</h2>
        )}
        <div className="grow" />
        <button className="btn btn-line btn-sm" onClick={() => setNovaPrancha(true)}><Plus size={15} />Nova prancha</button>
      </div>

      <Sheet className="vp-kpis">
        <div><Kpi label="Pendentes" value={cont.pendente} tone={cont.pendente ? "warn" : undefined} /></div>
        <div><Kpi label="Atrasadas" value={cont.atraso} tone={cont.atraso ? "danger" : undefined} /></div>
        <div><Kpi label="Resolvidas" value={cont.ok} tone={cont.ok ? "ok" : undefined} /></div>
        <div className="stack gap-8">
          <Kpi label="Resolvido" value={fmtPct(pctOk)} />
          <Ruler pct={pctOk} thin tone="ok" label="Pendências resolvidas" />
        </div>
      </Sheet>

      <div className="vp-layout">
        <Sheet className="vp-plan">
          <div className="vp-phead">
            <span className="vp-hint grow"><Crosshair size={16} /><span className="d">Toque no ponto exato da planta para marcar uma pendência</span><span className="m">Toque na planta para marcar</span></span>
            <div className="vp-zoom" role="group" aria-label="Zoom da planta">
              <IconBtn tip="Diminuir" sm onClick={() => setZoom((z) => Math.max(1, z - 0.5))} disabled={zoom <= 1}><ZoomOut size={16} /></IconBtn>
              <button type="button" className="vp-zlbl" onClick={() => setZoom(1)} title="Voltar para 100%">{Math.round(zoom * 100)}%</button>
              <IconBtn tip="Ampliar" sm onClick={() => setZoom((z) => Math.min(3, z + 0.5))} disabled={zoom >= 3}><ZoomIn size={16} /></IconBtn>
            </div>
            <ConfirmDelete what="prancha" onConfirm={async () => { await store.deletePrancha(prancha.id); setSelId(null); notify("Prancha excluída"); }} />
          </div>
          <VistPlanta prancha={prancha} pins={pins} numero={numero} hoje={hoje} zoom={zoom} temp={temp} hl={hl} dropped={dropped}
            onTap={(pt) => { setHl(null); setTemp(pt); }} onOpen={abrirPin} onMovePin={moverPin} />
        </Sheet>

        <Sheet>
          <div className="vp-lhead">
            <div className="row between gap-8"><h2 className="t-h2">Pendências</h2><span className="t-sm t-muted">{plural(pins.length, "marcada", "marcadas")}</span></div>
            {pins.length > 0 && (
              <Segmented size="sm" ariaLabel="Filtrar pendências" value={filtro} onChange={setFiltro} options={[
                { value: "todas", label: lbl("Todas", pins.length) },
                { value: "pendente", label: lbl("Pendentes", cont.pendente) },
                { value: "atraso", label: lbl("Atrasadas", cont.atraso) },
                { value: "ok", label: lbl("Resolvidas", cont.ok) },
              ]} />
            )}
          </div>
          {!pins.length ? (
            <div className="pad t-sm t-soft">Nenhuma pendência nesta prancha. Toque na planta para marcar a primeira.</div>
          ) : !lista.length ? (
            <div className="pad t-sm t-soft">Nenhuma pendência {filtro === "ok" ? "resolvida" : filtro === "atraso" ? "atrasada" : "pendente"} nesta prancha.</div>
          ) : (
            <div className="divide">
              {lista.map((p) => {
                const s = vistEfetivo(p, hoje);
                const venc = p.prazo && p.prazo < hoje && p.status !== "ok";
                return (
                  <button key={p.id} type="button" className={cx("vp-row", hl === p.id && "sel")} onClick={() => abrirPin(p)}>
                    <span className={cx("vp-badge", s)}>{s === "ok" ? <Check size={13} strokeWidth={3} /> : numero.get(p.id)}</span>
                    <div className="grow" style={{ minWidth: 0 }}>
                      <div className="vp-item clip">{p.item}</div>
                      <div className="vp-meta">
                        {p.responsavel && <span>{p.responsavel}</span>}
                        {p.status === "ok" ? <span className="t-ok">Resolvida</span> : p.prazo ? <span className={venc ? "t-danger" : undefined} style={venc ? { fontWeight: 700 } : undefined}>{venc ? `Venceu em ${fmtDataCurta(p.prazo)}` : `Prazo ${fmtDataCurta(p.prazo)}`}</span> : <span>Sem prazo</span>}
                      </div>
                    </div>
                    {p.pathFoto && <Thumb path={p.pathFoto} w={40} h={40} radius={8} alt="" onClick={(e) => { e.stopPropagation(); abrirPin(p); }} />}
                  </button>
                );
              })}
            </div>
          )}
        </Sheet>
      </div>

      {legado.length > 0 && <VistLegado store={store} itens={legado} />}

      <VistNovoPin open={!!temp} prancha={prancha} numero={pins.length + 1} onClose={() => setTemp(null)} onSave={salvarNovo} />
      <VistPinDrawer store={store} pin={aberto} n={aberto ? numero.get(aberto.id) : null} hoje={hoje} onClose={() => { setAbertoId(null); setHl(null); }} />
      <VistPranchaDrawer store={store} project={project} open={novaPrancha} onClose={() => setNovaPrancha(false)} onCreated={(p) => setSelId(p.id)} />
    </div>
  );
}

function VistPlanta({ prancha, pins, numero, hoje, zoom, temp, hl, dropped, onTap, onOpen, onMovePin }) {
  const url = useSignedUrl(prancha.path);
  const scRef = useRef(null); const imgRef = useRef(null); const canvasRef = useRef(null);
  const [pd, setPd] = useState(null);
  const dRef = useRef(null); const justDragged = useRef(false);
  const prevZoom = useRef(zoom);
  // mantém o centro da vista ao ampliar/reduzir
  useLayoutEffect(() => {
    const el = scRef.current; const z0 = prevZoom.current; prevZoom.current = zoom;
    if (!el || z0 === zoom) return;
    const k = zoom / z0;
    el.scrollLeft = (el.scrollLeft + el.clientWidth / 2) * k - el.clientWidth / 2;
    el.scrollTop = (el.scrollTop + el.clientHeight / 2) * k - el.clientHeight / 2;
  }, [zoom]);
  // ao escolher na lista, centraliza o pin na área visível da planta
  useEffect(() => {
    const el = scRef.current; const cv = canvasRef.current; if (!el || !cv || !hl) return;
    const p = pins.find((x) => x.id === hl); if (!p) return;
    const x = (p.xPct / 100) * cv.offsetWidth; const y = (p.yPct / 100) * cv.offsetHeight;
    el.scrollTo({ left: x - el.clientWidth / 2, top: y - el.clientHeight / 2, behavior: "smooth" });
  }, [hl]); // eslint-disable-line

  const ponto = (e) => {
    const r = imgRef.current.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 };
  };
  const clamp = (v) => Math.round(Math.max(0, Math.min(100, v)) * 100) / 100;
  const tap = (e) => {
    if (!imgRef.current || justDragged.current) return;
    const q = ponto(e);
    if (q.x < 0 || q.x > 100 || q.y < 0 || q.y > 100) return;
    onTap({ x: clamp(q.x), y: clamp(q.y) });
  };
  const pDown = (e, p) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.stopPropagation();
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* */ }
    dRef.current = { p, x0: e.clientX, y0: e.clientY, moved: false, pid: e.pointerId };
  };
  const pMove = (e) => {
    const d = dRef.current; if (!d || d.pid !== e.pointerId || !imgRef.current) return;
    if (!d.moved && Math.hypot(e.clientX - d.x0, e.clientY - d.y0) < 6) return;
    d.moved = true; const q = ponto(e); d.x = clamp(q.x); d.y = clamp(q.y);
    setPd({ id: d.p.id, x: d.x, y: d.y });
  };
  const pUp = (e) => {
    const d = dRef.current; if (!d || d.pid !== e.pointerId) return;
    dRef.current = null;
    if (d.moved) {
      setPd(null); justDragged.current = true; setTimeout(() => { justDragged.current = false; }, 60);
      onMovePin(d.p, d.x, d.y);
    }
  };

  return (
    <div className="vp-scroll" ref={scRef} data-tour="vistoria-planta">
      <div className="vp-canvas" ref={canvasRef} style={{ width: `${zoom * 100}%` }} onClick={tap}>
        {url ? <img ref={imgRef} src={url} alt={prancha.titulo} draggable={false} /> : <div className="skel" style={{ width: "100%", aspectRatio: "4 / 3", borderRadius: 0 }} />}
        {url && pins.map((p) => {
          const s = vistEfetivo(p, hoje);
          const pos = pd && pd.id === p.id ? pd : { x: p.xPct, y: p.yPct };
          return (
            <button key={p.id} type="button" data-pin={p.id} className={cx("vp-pin", s, hl === p.id && "sel", dropped.has(p.id) && "drop late", pd && pd.id === p.id && "dragging")}
              style={{ left: `${pos.x}%`, top: `${pos.y}%` }} title={`${numero.get(p.id)}. ${p.item}`} aria-label={`Pendência ${numero.get(p.id)}: ${p.item}, ${PIN_STATUS[s]}`}
              onPointerDown={(e) => pDown(e, p)} onPointerMove={pMove} onPointerUp={pUp} onPointerCancel={() => { dRef.current = null; setPd(null); }}
              onClick={(e) => { e.stopPropagation(); if (justDragged.current) return; onOpen(p); }}>
              <i>{s === "ok" ? <Check size={14} strokeWidth={3} /> : numero.get(p.id)}</i>
            </button>
          );
        })}
        {url && temp && <span className="vp-pin temp drop" style={{ left: `${temp.x}%`, top: `${temp.y}%` }} aria-hidden="true"><i>{pins.length + 1}</i></span>}
      </div>
    </div>
  );
}

function VistNovoPin({ open, prancha, numero, onClose, onSave }) {
  const vazio = { item: "", status: "pendente", responsavel: "", prazo: "", observacao: "" };
  const [f, setF] = useState(vazio);
  const [file, setFile] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const prev = useExecObjUrl(file);
  useEffect(() => { if (open) { setF(vazio); setFile(null); setErr(""); } }, [open]); // eslint-disable-line
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const salvar = async () => {
    if (!f.item.trim()) { setErr("Descreva a pendência."); return; }
    setBusy(true);
    const p = await onSave({ ...f, item: f.item.trim(), file });
    setBusy(false);
    if (!p) setErr("Não foi possível salvar. Verifique a conexão e tente de novo.");
  };
  return (
    <Drawer open={open} onClose={onClose} title={`Nova pendência ${numero}`} sub={`Ponto marcado em ${prancha.titulo}`}
      footer={<>
        <button className="btn btn-quiet" onClick={onClose}>Cancelar</button>
        <button className="btn btn-ink" onClick={salvar} disabled={busy}>{busy && <Loader2 size={16} className="spin" />}Salvar pendência</button>
      </>}>
      <Field label="O que precisa ser corrigido">
        <input className="input" value={f.item} onChange={(e) => { set("item", e.target.value); if (err) setErr(""); }} placeholder="Ex.: Fissura acima da janela" onKeyDown={(e) => { if (e.key === "Enter") salvar(); }} />
        {err && <span className="t-xs t-danger" style={{ fontWeight: 600 }}>{err}</span>}
      </Field>
      <Field label="Situação"><Segmented ariaLabel="Situação" value={f.status} onChange={(v) => set("status", v)} options={VIST_STATUS_OPTS} /></Field>
      <div className="grid cols-2 sm-1">
        <Field label="Responsável"><input className="input" value={f.responsavel} onChange={(e) => set("responsavel", e.target.value)} placeholder="Quem corrige" /></Field>
        <Field label="Prazo"><input className="input" type="date" value={f.prazo} onChange={(e) => set("prazo", e.target.value)} /></Field>
      </div>
      <Field label="Observação"><textarea className="textarea" rows={3} value={f.observacao} onChange={(e) => set("observacao", e.target.value)} placeholder="Detalhes para quem vai corrigir" /></Field>
      <Field label="Foto">
        {prev && <img src={prev} alt="" className="vp-preview" />}
        <FileField file={file} setFile={setFile} accept="image/*" label="Tirar ou escolher foto do problema" />
      </Field>
    </Drawer>
  );
}

function VistPinDrawer({ store, pin, n, hoje, onClose }) {
  const notify = useToast();
  const p = useExecLast(pin);
  const [f, setF] = useState(null);
  const [busyFoto, setBusyFoto] = useState(false);
  const [lb, setLb] = useState(false);
  useEffect(() => { if (pin) setF({ item: pin.item || "", responsavel: pin.responsavel || "", prazo: pin.prazo || "", observacao: pin.observacao || "" }); }, [pin?.id]); // eslint-disable-line
  if (!p) return <Drawer open={false} onClose={onClose} />;
  const dirty = f && (f.item !== (p.item || "") || f.responsavel !== (p.responsavel || "") || f.prazo !== (p.prazo || "") || f.observacao !== (p.observacao || ""));
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const status = (v) => {
    if (v === p.status) return;
    store.updatePin(p.id, { status: v });
    notify(v === "ok" ? `Pendência ${n} resolvida` : v === "atraso" ? `Pendência ${n} marcada como atrasada` : `Pendência ${n} reaberta`);
  };
  const salvar = async () => {
    if (!f.item.trim()) return;
    await store.updatePin(p.id, { item: f.item.trim(), responsavel: f.responsavel.trim(), prazo: f.prazo, observacao: f.observacao.trim() });
    notify("Pendência salva"); onClose();
  };
  const foto = async (file) => { setBusyFoto(true); await store.setPinFoto(p.id, file); setBusyFoto(false); notify("Foto adicionada"); };
  const venc = p.status === "pendente" && p.prazo && p.prazo < hoje;
  return (
    <Drawer open={!!pin} onClose={onClose} title={`Pendência ${n || ""}`} sub={p.item}
      footer={<>
        <div className="grow"><ConfirmDelete what="pendência" onConfirm={async () => { await store.deletePin(p.id); notify("Pendência excluída"); onClose(); }} /></div>
        <button className="btn btn-ink" onClick={salvar} disabled={!dirty || !f?.item.trim()}>Salvar alterações</button>
      </>}>
      <Field label="Situação" hint={venc ? `O prazo venceu em ${fmtData(p.prazo)}; por isso ela aparece como atrasada na planta.` : undefined}>
        <Segmented ariaLabel="Situação" value={p.status} onChange={status} options={VIST_STATUS_OPTS} />
      </Field>
      {f && <>
        <Field label="O que precisa ser corrigido"><input className="input" value={f.item} onChange={(e) => set("item", e.target.value)} /></Field>
        <div className="grid cols-2 sm-1">
          <Field label="Responsável"><input className="input" value={f.responsavel} onChange={(e) => set("responsavel", e.target.value)} placeholder="Quem corrige" /></Field>
          <Field label="Prazo"><input className="input" type="date" value={f.prazo} onChange={(e) => set("prazo", e.target.value)} /></Field>
        </div>
        <Field label="Observação"><textarea className="textarea" rows={3} value={f.observacao} onChange={(e) => set("observacao", e.target.value)} /></Field>
      </>}
      <Field label="Foto">
        <div className="row gap-12 wrap">
          {p.pathFoto && <Thumb path={p.pathFoto} w={120} h={90} radius={10} alt={`Foto da pendência ${n}`} onClick={() => setLb(true)} />}
          <FilePick className="btn btn-line btn-sm" onFile={foto} disabled={busyFoto}>{busyFoto ? <Loader2 size={15} className="spin" /> : <Camera size={15} />}{p.pathFoto ? "Trocar foto" : "Adicionar foto"}</FilePick>
        </div>
      </Field>
      {p.createdAt && <div className="t-xs t-muted">Marcada em {fmtData(String(p.createdAt).slice(0, 10))}</div>}
      {lb && p.pathFoto && <Lightbox items={[{ path: p.pathFoto, title: `${n}. ${p.item}`, sub: p.responsavel || "" }]} index={0} onIndex={() => {}} onClose={() => setLb(false)} />}
    </Drawer>
  );
}

function VistPranchaDrawer({ store, project, open, onClose, onCreated }) {
  const notify = useToast();
  const [titulo, setTitulo] = useState("");
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const prev = useExecObjUrl(file);
  useEffect(() => { if (open) { setTitulo(""); setFile(null); setErr(""); } }, [open]);
  const salvar = async () => {
    if (!file) { setErr("Escolha a imagem da planta ou a foto do ambiente."); return; }
    setBusy(true);
    const p = await store.addPrancha({ projectId: project.id, titulo: titulo.trim() || "Planta baixa", file });
    setBusy(false);
    if (p) { notify("Prancha adicionada"); onCreated?.(p); onClose(); }
  };
  return (
    <Drawer open={open} onClose={onClose} title="Nova prancha" sub="Planta baixa, fachada ou foto do ambiente"
      footer={<>
        <button className="btn btn-quiet" onClick={onClose}>Cancelar</button>
        <button className="btn btn-ink" onClick={salvar} disabled={busy}>{busy && <Loader2 size={16} className="spin" />}{busy ? "Enviando…" : "Adicionar prancha"}</button>
      </>}>
      <Field label="Título"><input className="input" value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex.: Planta baixa, casa 02" /></Field>
      <Field label="Imagem" hint="Se a planta estiver em PDF, exporte uma página como imagem ou tire uma foto dela.">
        {prev && <img src={prev} alt="" className="vp-preview" style={{ objectFit: "contain", background: "var(--sunken)" }} />}
        <FileField file={file} setFile={(x) => { setFile(x); if (err) setErr(""); }} accept="image/*" label="Escolher imagem ou tirar foto" />
        {err && <span className="t-xs t-danger" style={{ fontWeight: 600 }}>{err}</span>}
      </Field>
    </Drawer>
  );
}

function VistLegado({ store, itens }) {
  const notify = useToast();
  const [open, setOpen] = useState(false);
  const abertos = itens.filter((v) => v.status !== "ok").length;
  return (
    <div className="mt-16" style={{ marginTop: 24 }}>
      <button type="button" className="vp-legado-btn" aria-expanded={open} onClick={() => setOpen(!open)}>
        <ChevronDown size={18} />Apontamentos antigos<span className="t-sm t-muted" style={{ fontWeight: 600 }}>{plural(itens.length, "item", "itens")}{abertos ? `, ${abertos} em aberto` : ""}</span>
      </button>
      {open && (
        <Sheet className="divide mt-8">
          {itens.map((v) => (
            <div key={v.id} className="list-row">
              <div className="grow" style={{ minWidth: 0 }}>
                <div className="clip" style={{ fontWeight: 600 }}>{v.item}</div>
                <div className="t-xs t-muted clip">{[v.ambiente, v.responsavel, v.data && fmtDataCurta(v.data)].filter(Boolean).join(", ")}</div>
              </div>
              <Pill tone={v.status === "ok" ? "ok" : "warn"}>{v.status === "ok" ? "OK" : PIN_STATUS[v.status] || "Pendente"}</Pill>
              {v.pathFoto && <button type="button" className="link" onClick={() => openFile(v.pathFoto)}>Foto</button>}
              {v.status !== "ok" && <IconBtn tip="Marcar como OK" sm onClick={() => { store.updateVistoriaItem(v.id, { status: "ok" }); notify("Apontamento marcado como OK"); }}><Check size={16} /></IconBtn>}
              <ConfirmDelete what="apontamento" onConfirm={async () => { await store.deleteVistoriaItem(v.id); notify("Apontamento excluído"); }} />
            </div>
          ))}
        </Sheet>
      )}
    </div>
  );
}

/* ---------- fotos ---------- */
function ObraFotos({ store, project }) {
  useExecCss();
  const notify = useToast();
  const fotos = useMemo(() => store.data.fotos.filter((f) => f.projectId === project.id).sort((a, b) => String(b.data || "").localeCompare(String(a.data || "")) || b.id - a.id), [store.data.fotos, project.id]);
  const etapas = useMemo(() => store.data.etapas.filter((e) => e.projectId === project.id).sort((a, b) => (a.ordem || 0) - (b.ordem || 0)), [store.data.etapas, project.id]);
  const etapaFotos = etapas.filter((e) => e.fotoPath);
  const [lb, setLb] = useState(null); // { items, i }
  const [novo, setNovo] = useState(false);
  const grupos = useMemo(() => {
    const m = new Map();
    fotos.forEach((f) => { const k = (f.data || todayISO()).slice(0, 7); if (!m.has(k)) m.set(k, []); m.get(k).push(f); });
    return [...m.entries()];
  }, [fotos]);
  const itemFoto = (f) => ({ path: f.path, title: f.legenda || f.etapa || "Foto da obra", sub: [f.etapa && f.legenda ? f.etapa : null, f.data && fmtData(f.data)].filter(Boolean).join(", ") });
  const todos = fotos.map(itemFoto);
  const itensEtapa = etapaFotos.map((e) => ({ path: e.fotoPath, title: e.nome, sub: execEtapaTxt(e) }));

  const total = fotos.length + etapaFotos.length;
  return (
    <div>
      {total > 0 && (
        <div className="row between wrap gap-12 mb-16">
          <div className="stack">
            <span className="t-h2">{plural(total, "foto", "fotos")}</span>
            <span className="t-sm t-muted">{fotos.length && etapaFotos.length ? "Agrupadas por mês; as das etapas aparecem no fim" : fotos.length ? "Agrupadas por mês" : "Registradas nas etapas"}</span>
          </div>
          <button className="btn btn-ink" onClick={() => setNovo(true)}><ImagePlus size={17} />Adicionar foto</button>
        </div>
      )}

      {!fotos.length && (
        <div className="mb-24">
          <EmptyState icon={Images} title={etapaFotos.length ? "Nenhuma foto avulsa ainda" : "Nenhuma foto ainda"}
            text="Registre o andamento da obra. Cada foto fica agrupada pelo mês e ligada à etapa, para comparar depois."
            action={!etapaFotos.length && <button className="btn btn-ink" onClick={() => setNovo(true)}><ImagePlus size={17} />Adicionar foto</button>} />
        </div>
      )}

      {grupos.map(([mes, lista]) => (
        <section key={mes} className="mb-24">
          <div className="fg-mes"><h3>{fmtMes(mes)}</h3><span className="t-sm t-muted">{plural(lista.length, "foto", "fotos")}</span></div>
          <div className="fg-grid">
            {lista.map((f) => (
              <figure key={f.id} className="fg-tile">
                <Thumb path={f.path} w="100%" h="auto" radius={12} alt={f.legenda || f.etapa || "Foto da obra"} onClick={() => setLb({ items: todos, i: fotos.indexOf(f) })} />
                <div className="fg-del"><ConfirmDelete what="foto" onConfirm={async () => { await store.deleteFoto(f.id); notify("Foto excluída"); }} /></div>
                <figcaption>
                  <strong className="clip">{f.legenda || f.etapa || "Foto da obra"}</strong>
                  <span className="t-xs t-muted clip">{[f.legenda && f.etapa, f.data && fmtDataCurta(f.data)].filter(Boolean).join(", ")}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      ))}

      {etapaFotos.length > 0 && (
        <section className="mb-24">
          <div className="fg-mes"><h3>Fotos das etapas</h3><span className="t-sm t-muted">registradas na aba Avanço</span></div>
          <div className="fg-grid">
            {etapaFotos.map((e, i) => (
              <figure key={e.id} className="fg-tile">
                <Thumb path={e.fotoPath} w="100%" h="auto" radius={12} alt={`Foto da etapa ${e.nome}`} onClick={() => setLb({ items: itensEtapa, i })} />
                <figcaption>
                  <strong className="clip">{e.nome}</strong>
                  <span className={cx("t-xs clip", e.status === "concluida" ? "t-ok" : e.status === "andamento" ? "t-warn" : "t-muted")}>{execEtapaTxt(e)}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}

      {lb && lb.items[lb.i] && <Lightbox items={lb.items} index={lb.i} onIndex={(i) => setLb((x) => ({ ...x, i }))} onClose={() => setLb(null)} />}
      <FotoNovaDrawer store={store} project={project} etapas={etapas} open={novo} onClose={() => setNovo(false)} />
    </div>
  );
}

function FotoNovaDrawer({ store, project, etapas, open, onClose }) {
  const notify = useToast();
  const [file, setFile] = useState(null);
  const [etapa, setEtapa] = useState("");
  const [legenda, setLegenda] = useState("");
  const [data, setData] = useState(todayISO());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const prev = useExecObjUrl(file);
  useEffect(() => {
    if (!open) return;
    setFile(null); setLegenda(""); setData(todayISO()); setErr("");
    const atual = etapas.find((e) => e.status === "andamento") || etapas.find((e) => e.status === "pendente");
    setEtapa(atual ? atual.nome : "");
  }, [open]); // eslint-disable-line
  const salvar = async () => {
    if (!file) { setErr("Escolha a foto."); return; }
    setBusy(true);
    const f = await store.addFoto({ projectId: project.id, file, etapa: etapa.trim(), legenda: legenda.trim(), data });
    setBusy(false);
    if (f) { notify("Foto adicionada"); onClose(); }
  };
  return (
    <Drawer open={open} onClose={onClose} title="Adicionar foto" sub="Fica no mês da data escolhida"
      footer={<>
        <button className="btn btn-quiet" onClick={onClose}>Cancelar</button>
        <button className="btn btn-ink" onClick={salvar} disabled={busy}>{busy && <Loader2 size={16} className="spin" />}{busy ? "Enviando…" : "Adicionar foto"}</button>
      </>}>
      <Field label="Foto">
        {prev && <img src={prev} alt="" className="vp-preview" />}
        <FileField file={file} setFile={(x) => { setFile(x); if (err) setErr(""); }} accept="image/*" label="Tirar ou escolher foto" />
        {err && <span className="t-xs t-danger" style={{ fontWeight: 600 }}>{err}</span>}
      </Field>
      <Field label="Etapa" hint="Escolha da lista ou escreva outra.">
        <input className="input" list="fg-etapas" value={etapa} onChange={(e) => setEtapa(e.target.value)} placeholder="Ex.: Alvenaria" />
        <datalist id="fg-etapas">{etapas.map((e) => <option key={e.id} value={e.nome} />)}</datalist>
      </Field>
      <Field label="Legenda"><input className="input" value={legenda} onChange={(e) => setLegenda(e.target.value)} placeholder="Ex.: Laje da casa 02 concretada" /></Field>
      <Field label="Data"><input className="input" type="date" value={data} onChange={(e) => setData(e.target.value)} /></Field>
    </Drawer>
  );
}

/* ======================= 20-financeiro.jsx ======================= */
/* Visão geral e financeiro da obra: Resumo, Indicadores, Orçamento, Gastos, Unidades e o relatório executivo (HTML/PDF). */
/* @icons Plus Paperclip Receipt Info CheckCircle2 Calculator Wallet Users HandCoins Printer Download ChevronRight */

const FIN_CSS = `
.fin-att { display: grid; grid-template-columns: 112px minmax(0,1fr) auto; align-items: center; gap: 14px; padding: 12px 16px; min-height: 60px; }
.fin-att .pill { justify-self: start; }
@media (max-width: 560px) { .fin-att { grid-template-columns: minmax(0,1fr) auto; gap: 6px 12px; } .fin-att .pill { grid-column: 1; } .fin-att > div { grid-column: 1; } .fin-att > button { grid-column: 2; grid-row: 1 / span 2; } }
.fin-calm { display: flex; align-items: center; gap: 12px; padding: 14px 16px; }
.fin-ledger { display: flex; flex-direction: column; }
.fin-lrow { display: grid; grid-template-columns: 16px minmax(0,1fr) auto; gap: 4px 10px; padding: 11px 0; border-top: 1px dashed var(--line-strong); align-items: baseline; }
.fin-lrow .sg { font-family: 'Archivo', sans-serif; font-weight: 700; color: var(--ink-3); font-size: 15px; }
.fin-lrow .v { font-family: 'Archivo', sans-serif; font-stretch: 86%; font-weight: 700; font-size: 16px; font-variant-numeric: tabular-nums; text-align: right; white-space: nowrap; }
.fin-lrow .d { grid-column: 2 / span 2; font-size: 12.5px; color: var(--ink-3); line-height: 1.4; }
.fin-lrow.total { border-top: 2px solid var(--ink); padding-top: 12px; }
.fin-lrow.total .v { font-size: 19px; }
.fin-regua { position: relative; padding-bottom: 24px; }
.fin-mark { position: absolute; top: -4px; width: 2px; height: 18px; background: var(--ink); border-radius: 1px; transform: translateX(-1px); }
.fin-mark em { position: absolute; top: 21px; left: 0; font-style: normal; font-size: 12px; font-weight: 600; color: var(--ink-2); white-space: nowrap; transform: translateX(-50%); }
.fin-mark.l em { transform: translateX(-4px); } .fin-mark.r em { transform: translateX(calc(-100% + 4px)); }
.fin-campos { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); }
.fin-campos > div { padding: 12px 14px; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.fin-campos > div:first-child { padding-left: 0; }
.fin-campos > div + div { border-left: 1px solid var(--line); }
.fin-campos small { font-size: 12px; color: var(--ink-3); font-weight: 600; }
.fin-campos strong { font-family: 'Archivo', sans-serif; font-stretch: 85%; font-size: 20px; font-weight: 750; font-variant-numeric: tabular-nums; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
@media (max-width: 640px) {
  .fin-campos { grid-template-columns: repeat(2, minmax(0,1fr)); }
  .fin-campos > div:nth-child(3) { padding-left: 0; border-left: 0; }
  .fin-campos > div:nth-child(n+3) { border-top: 1px solid var(--line); }
}
.fin-grp { overflow: hidden; }
.fin-grp-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 16px 20px; border-bottom: 1px solid var(--line); flex-wrap: wrap; }
.fin-kwrap { overflow: hidden; }
.fin-kgrid { display: grid; grid-template-columns: repeat(var(--n, 4), minmax(0,1fr)); margin: 0 0 -1px -1px; }
.fin-kcell { border-left: 1px solid var(--line); border-bottom: 1px solid var(--line); padding: 18px 20px 20px; display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.fin-kcell .kpi-value { font-size: 36px; }
.fin-kcell p { margin: 2px 0 0; font-size: 13px; line-height: 1.45; color: var(--ink-2); }
.fin-kcell p.hint { color: var(--ink-3); }
@media (max-width: 900px) { .fin-kgrid { grid-template-columns: repeat(2, minmax(0,1fr)); } }
@media (max-width: 560px) { .fin-kgrid { grid-template-columns: 1fr; } .fin-kcell { padding: 16px; } .fin-kcell .kpi-value { font-size: 32px; } .fin-grp-head { padding: 14px 16px; } }
.fin-st { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; color: var(--ink-3); white-space: nowrap; }
.fin-st i { width: 8px; height: 8px; border-radius: 50%; background: var(--line-strong); }
.fin-st.ok { color: var(--ok); } .fin-st.ok i { background: var(--ok); }
.fin-st.warn { color: var(--warn); } .fin-st.warn i { background: var(--warn); }
.fin-st.danger { color: var(--danger); } .fin-st.danger i { background: var(--danger); }
.fin-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px 28px; flex-wrap: wrap; margin-bottom: 20px; }
.fin-head-kpis { display: flex; gap: 16px 40px; flex-wrap: wrap; align-items: flex-end; }
@media (max-width: 640px) { .fin-head-kpis { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 16px; width: 100%; align-items: start; } .fin-head > .btn { width: 100%; } }
.fin-cat { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 16px; background: var(--sheet-2); flex-wrap: wrap; }
.fin-sheet-clip { overflow: hidden; }
.fin-oitem { display: grid; grid-template-columns: minmax(0,1fr) 170px 120px 76px; align-items: center; gap: 16px; padding: 10px 16px; min-height: 52px; cursor: pointer; }
.fin-oitem:hover { background: var(--sheet-2); }
.fin-oitem:hover .reveal { opacity: 1; }
.fin-oitem .acts { display: flex; justify-content: flex-end; gap: 2px; }
.fin-bar { position: relative; height: 4px; background: var(--sunken); border-radius: 2px; overflow: hidden; flex: 1; }
.fin-bar > i { position: absolute; inset: 0 auto 0 0; background: var(--blue); border-radius: 2px; }
@media (max-width: 640px) {
  .fin-oitem { grid-template-columns: minmax(0,1fr) auto; gap: 6px 12px; padding: 10px 12px 10px 16px; }
  .fin-oitem .bar { grid-column: 1; grid-row: 2; }
  .fin-oitem .val { grid-column: 2; grid-row: 1; }
  .fin-oitem .acts { grid-column: 2; grid-row: 2; }
}
.fin-gasto { display: flex; align-items: center; gap: 14px; padding: 10px 12px 10px 16px; min-height: 60px; cursor: pointer; }
.fin-gasto:hover { background: var(--sheet-2); }
.fin-gasto:hover .reveal { opacity: 1; }
.fin-dia { width: 44px; flex-shrink: 0; display: flex; flex-direction: column; align-items: center; line-height: 1; }
.fin-dia b { font-family: 'Archivo', sans-serif; font-stretch: 80%; font-weight: 800; font-size: 22px; font-variant-numeric: tabular-nums; }
.fin-dia span { font-size: 11px; color: var(--ink-3); font-weight: 600; margin-top: 3px; }
@media (max-width: 560px) { .fin-gasto { gap: 10px; padding-left: 10px; } .fin-dia { width: 36px; } }
.fin-split { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.7fr); gap: 16px; }
@media (max-width: 860px) { .fin-split { grid-template-columns: 1fr; } }
.fin-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; }
.fin-table { width: 100%; border-collapse: collapse; font-size: 14px; }
.fin-table th { text-align: left; font-size: 12px; font-weight: 600; color: var(--ink-3); padding: 12px 14px; border-bottom: 1px solid var(--line); white-space: nowrap; background: var(--sheet-2); }
.fin-table td { padding: 12px 14px; border-bottom: 1px solid var(--line); white-space: nowrap; vertical-align: middle; }
.fin-table .num { text-align: right; font-family: 'Archivo', sans-serif; font-stretch: 88%; font-weight: 650; font-variant-numeric: tabular-nums; font-size: 15px; }
.fin-table th.num { font-family: inherit; font-size: 12px; font-weight: 600; }
.fin-table tbody tr { cursor: pointer; transition: background-color .12s; }
.fin-table tbody tr:hover td { background: var(--sheet-2); }
.fin-table tfoot td { border-bottom: 0; border-top: 2px solid var(--ink); font-weight: 700; }
.fin-table tfoot .num { font-weight: 800; }
.fin-table td:first-child, .fin-table th:first-child { padding-left: 20px; }
.fin-table td:last-child, .fin-table th:last-child { padding-right: 20px; }
.fin-ucard { display: flex; flex-direction: column; gap: 10px; width: 100%; text-align: left; background: none; border: 0; padding: 14px 16px; color: inherit; }
.fin-ucard:active { background: var(--sheet-2); }
.fin-ugrid { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 8px 16px; }
.fin-ugrid small { display: block; font-size: 12px; color: var(--ink-3); font-weight: 600; }
.fin-ugrid b { font-family: 'Archivo', sans-serif; font-stretch: 86%; font-weight: 700; font-size: 16px; font-variant-numeric: tabular-nums; }
.fin-note { display: flex; gap: 10px; align-items: flex-start; font-size: 13px; color: var(--ink-2); padding: 12px 14px; border-radius: 12px; background: var(--sheet-2); border: 1px solid var(--line); }
.fin-note svg { flex-shrink: 0; margin-top: 1px; color: var(--ink-3); }
.fin-bk { width: 100%; border-collapse: collapse; font-size: 14px; }
.fin-bk th { text-align: right; font-size: 12px; font-weight: 600; color: var(--ink-3); padding: 0 0 8px; }
.fin-bk th:first-child { text-align: left; }
.fin-bk td { padding: 8px 0; border-top: 1px solid var(--line); }
.fin-bk td + td { text-align: right; font-family: 'Archivo', sans-serif; font-stretch: 88%; font-weight: 650; font-variant-numeric: tabular-nums; padding-left: 12px; white-space: nowrap; }
.fin-bk tr.tot td { border-top: 2px solid var(--ink); font-weight: 700; }
.fin-bk tr.tot td + td { font-weight: 800; font-size: 15px; }
.fin-dsec { display: flex; flex-direction: column; gap: 12px; padding-top: 18px; border-top: 1px solid var(--line); }
.fin-inv { display: flex; align-items: center; gap: 12px; padding: 10px 12px; cursor: pointer; }
.fin-inv:hover { background: var(--sheet-2); }
.fin-inv:hover .reveal { opacity: 1; }
.fin-subform { display: flex; flex-direction: column; gap: 12px; padding: 14px; border: 1px solid var(--line-strong); border-radius: 12px; background: var(--sheet-2); }
.fin-err { font-size: 13px; color: var(--danger); font-weight: 600; }
`;

function useFinCss() {
  useLayoutEffect(() => {
    let s = document.getElementById("pc-fin-css");
    if (!s) { s = document.createElement("style"); s.id = "pc-fin-css"; document.head.appendChild(s); }
    s.textContent = FIN_CSS;
  }, []);
}

/* ---------- formatação local ---------- */
function finDec(n, d = 2) { return (Number(n) || 0).toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d }); }
function finPctS(n, d = 0) { const v = Number(n) || 0; const s = Math.abs(v).toLocaleString("pt-BR", { maximumFractionDigits: d }); return v > 0.0001 ? `+${s}%` : v < -0.0001 ? `−${s}%` : `${s}%`; }
function finPct1(n) { return `${(Number(n) || 0).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`; }
function finM2(n) { return `${fmtBRL0(n)}/m²`; }
function finArea(n) { return n ? `${(Number(n) || 0).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} m²` : "—"; }
function finCap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
function finMesLongo(ym) { const [y, m] = ym.split("-"); return `${MESES_LONGOS[Number(m) - 1]} de ${y}`; }
function finSlug(s) { return String(s || "obra").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "obra"; }
function finCatsOrdenadas(cats) {
  const set = new Set(cats.filter(Boolean));
  return [...OBRA_CATS.filter((c) => set.has(c)), ...[...set].filter((c) => !OBRA_CATS.includes(c)).sort()];
}
function finNumOrNull(v) { const n = parseNum(v); return isNaN(n) ? null : n; }
function finToneLabel(tone) { return tone === "ok" ? "No alvo" : tone === "warn" ? "Atenção" : tone === "danger" ? "Crítico" : "Referência"; }

/* ---------- métricas consolidadas da obra (telas e relatório) ---------- */
function finMetricas(data, project, hoje = todayISO()) {
  const pid = project.id;
  const t = projectTotals(data, pid);
  const ativ = data.cronograma.filter((a) => a.projectId === pid).sort((a, b) => a.ordem - b.ordem);
  const pj = ativ.length ? cronogramaProjecao(ativ, hoje) : null;
  const av = avancoFisico(data, pid, project);
  const avanco = av.pct;
  const esperado = pj ? pj.esperado : null;
  const spi = pj && pj.esperado > 0.5 ? avanco / pj.esperado : null;
  const orc = t.totalEstimatedCost; const gasto = t.totalActualCost;
  const consumo = orc > 0 ? (gasto / orc) * 100 : null;
  const ev = orc * (avanco / 100);
  const cpi = gasto > 0 && ev > 0 ? ev / gasto : null;
  const eac = cpi ? orc / cpi : null;
  const desvioProj = eac && orc > 0 ? (eac / orc - 1) * 100 : null;
  const area = t.units.reduce((s, u) => s + (Number(u.area) || 0), 0);
  const areaCompleta = t.units.length > 0 && t.units.every((u) => Number(u.area) > 0);
  const ncs = data.naoConformidades.filter((n) => n.projectId === pid);
  const ncAbertas = ncs.filter((n) => n.status !== "resolvida");
  const ncAlta = ncAbertas.filter((n) => n.gravidade === "alta");
  const ncVencidas = ncAbertas.filter((n) => n.prazo && n.prazo < hoje);
  const pranchaIds = new Set(data.pranchas.filter((p) => p.projectId === pid).map((p) => p.id));
  const pins = data.pins.filter((p) => pranchaIds.has(p.pranchaId));
  const pinsOk = pins.filter((p) => p.status === "ok");
  const pinsAtraso = pins.filter((p) => p.status !== "ok" && (p.status === "atraso" || (p.prazo && p.prazo < hoje)));
  const pinsPend = pins.length - pinsOk.length - pinsAtraso.length;
  const reqs = data.requisitos.filter((r) => r.projectId === pid && r.status !== "nao_aplicavel");
  const reqOk = reqs.filter((r) => r.status === "concluido");
  const reqPct = reqs.length ? (reqOk.length / reqs.length) * 100 : null;
  const docsVencendo = data.documentos.filter((d) => d.projectId === pid && d.validade && diffDaysISO(hoje, d.validade) <= 30).sort((a, b) => (a.validade < b.validade ? -1 : 1));
  const docsVencidos = docsVencendo.filter((d) => d.validade < hoje);
  const vendidas = t.units.filter((u) => u.status === "vendida");
  const reservadas = t.units.filter((u) => u.status === "reservada");
  const disponiveis = t.units.filter((u) => u.status !== "vendida" && u.status !== "reservada");
  const vendidasComPreco = t.propriaUnits.filter((u) => u.salePriceReal != null && u.salePriceReal > 0);
  const precoReal = vendidasComPreco.reduce((s, u) => s + u.salePriceReal, 0);
  const precoEst = vendidasComPreco.reduce((s, u) => s + u.salePriceEstimated, 0);
  const docTotal = t.units.reduce((s, u) => s + (u.custoDocumentacao || 0), 0);
  const corrTotal = t.units.reduce((s, u) => s + (u.custoCorretagem || 0), 0);
  return {
    t, ativ, pj, avanco, avFonte: av.fonte, esperado, spi, orc, gasto, consumo, ev, cpi, eac, desvioProj, area, areaCompleta,
    ncs, ncAbertas, ncAlta, ncVencidas, pins, pinsOk, pinsAtraso, pinsPend, reqs, reqOk, reqPct, docsVencendo, docsVencidos,
    vendidas, reservadas, disponiveis, vendidasComPreco, precoReal, precoEst, docTotal, corrTotal, hoje,
  };
}

/* ---------- pequenos componentes ---------- */
function FinStatus({ tone }) { return <span className={cx("fin-st", tone)}><i />{finToneLabel(tone)}</span>; }

/* Régua com um marcador de referência (ex.: avanço físico sobre o orçamento consumido) */
function FinRegua({ pct, tone, marker, markerLabel, label }) {
  const mk = marker == null ? null : Math.max(0, Math.min(100, marker));
  return (
    <div className="fin-regua">
      <Ruler pct={pct} tone={tone} label={label} />
      {mk != null && <span className={cx("fin-mark", mk < 18 && "l", mk > 82 && "r")} style={{ left: `${mk}%` }}><em>{markerLabel}</em></span>}
    </div>
  );
}

/* ======================================================================
   RESUMO
   ====================================================================== */
const FIN_ALERTA_TIPO = { prazo: "Prazo", nc: "Qualidade", vistoria: "Vistoria", doc: "Documentos", custo: "Custo" };

function ObraResumo({ store, project, setAba, alertas = [] }) {
  useFinCss();
  const m = useMemo(() => finMetricas(store.data, project), [store.data, project]);
  const { t, pj } = m;
  const lucro = t.estimatedProfit;
  const proprias = t.propriaUnits.length;
  const cats = finCatsOrdenadas(Object.keys(t.byCategory));
  const consumo = m.consumo ?? 0;
  const tomGasto = consumo > 100 ? "danger" : m.consumo != null && consumo > m.avanco + 10 ? "warn" : undefined;
  const saldo = m.orc - m.gasto;

  return (
    <div className="stack gap-24">
      <section>
        <SectionHead title="Precisa de atenção" sub={alertas.length ? plural(alertas.length, "ponto em aberto", "pontos em aberto") : null} />
        {alertas.length ? (
          <Sheet className="divide fin-sheet-clip">
            {alertas.map((a, i) => (
              <div key={i} className="fin-att">
                <Pill tone={a.tom}>{FIN_ALERTA_TIPO[a.tipo] || "Aviso"}</Pill>
                <div className="stack" style={{ minWidth: 0 }}>
                  <span style={{ fontWeight: 650 }}>{a.titulo}</span>
                  {a.detalhe && <span className="t-sm t-muted clip">{a.detalhe}</span>}
                </div>
                <button className="btn btn-line btn-sm" onClick={() => setAba(a.aba)}>Ver</button>
              </div>
            ))}
          </Sheet>
        ) : (
          <Sheet className="fin-calm">
            <CheckCircle2 size={20} style={{ color: "var(--ok)", flexShrink: 0 }} />
            <span className="t-soft">Nada pendente. Prazo, qualidade, vistoria, documentos e custos estão dentro do esperado.</span>
          </Sheet>
        )}
      </section>

      <section>
        <SectionHead title="Dinheiro da obra" sub="Quanto entra, quanto sai e o que sobra" />
        <div className="grid cols-2 sm-1" style={{ alignItems: "start" }}>
          <Sheet className="pad stack gap-4">
            <div className="row between gap-8 wrap">
              <span className="kpi-label">Lucro previsto</span>
              {t.estimatedRevenue > 0 && <Pill tone={lucro > 0 ? "ok" : "danger"} nodot>Margem {finPct1(t.margemPct)}</Pill>}
            </div>
            <span className="kpi-value lg" style={lucro < 0 ? { color: "var(--danger)" } : undefined}><Odometer value={fmtBRL0(lucro)} /></span>
            <span className="kpi-sub">{t.estimatedRevenue > 0 ? (lucro > 0 ? `De cada R$ 100 vendidos, sobram R$ ${finDec(t.margemPct, 0)} depois de pagar a obra e as vendas.` : "A receita prevista não cobre a obra e os custos de venda.") : "Cadastre as unidades e o preço de venda para calcular o lucro."}</span>
            <div className="fin-ledger mt-16">
              <div className="fin-lrow">
                <span className="sg">+</span><span style={{ fontWeight: 600 }}>Receita prevista</span><span className="v">{fmtBRL0(t.estimatedRevenue)}</span>
                <span className="d">{proprias ? `Venda das ${plural(proprias, "unidade própria", "unidades próprias")} pelo preço estimado (VGV).` : <>Nenhuma unidade própria. <button className="link" onClick={() => setAba("unidades")}>Cadastrar unidades</button></>}</span>
              </div>
              <div className="fin-lrow">
                <span className="sg">−</span><span style={{ fontWeight: 600 }}>Custo da obra</span><span className="v">{fmtBRL0(m.orc)}</span>
                <span className="d">{t.budget.length ? `Orçamento total, ${plural(t.budget.length, "item", "itens")}.` : <>Sem orçamento. <button className="link" onClick={() => setAba("orcamento")}>Lançar orçamento</button></>}</span>
              </div>
              <div className="fin-lrow">
                <span className="sg">+</span><span style={{ fontWeight: 600 }}>Capital de investidores</span><span className="v">{fmtBRL0(t.totalInvested)}</span>
                <span className="d">{t.totalInvested > 0
                  ? `Reduz o que a construtora precisa colocar na obra; volta ao investidor, com ${fmtBRL0(t.totalEstimatedInvestorProfit)} de lucro combinado, na venda da unidade.`
                  : "Nenhum investidor nesta obra. Quando houver, o aporte reduz o que a construtora precisa colocar e é devolvido com lucro na venda."}</span>
              </div>
              <div className="fin-lrow">
                <span className="sg">−</span><span style={{ fontWeight: 600 }}>Custos de venda</span><span className="v">{fmtBRL0(t.custosVenda)}</span>
                <span className="d">{t.custosVenda > 0 ? `Documentação ${fmtBRL0(m.docTotal)} e corretagem ${fmtBRL0(m.corrTotal)}, somadas das unidades.` : "Documentação e corretagem de cada unidade (preencha em Unidades)."}</span>
              </div>
              <div className="fin-lrow total">
                <span className="sg" style={{ color: "var(--ink)" }}>=</span><span style={{ fontWeight: 700 }}>Lucro previsto</span><span className="v" style={lucro < 0 ? { color: "var(--danger)" } : undefined}>{fmtBRL0(lucro)}</span>
              </div>
            </div>
          </Sheet>

          <Sheet className="pad stack gap-4">
            <div className="row between gap-12 wrap" style={{ alignItems: "flex-end" }}>
              <Kpi label="Gasto até agora" value={fmtBRL0(m.gasto)} sub={m.orc > 0 ? `de ${fmtBRL0(m.orc)} orçados` : "sem orçamento lançado"} tone={consumo > 100 ? "danger" : undefined} />
              {m.consumo != null && <span className="t-num" style={{ fontSize: 26, color: tomGasto ? `var(--${tomGasto})` : "var(--ink-2)" }}>{fmtPct(consumo)}</span>}
            </div>
            {m.orc > 0 && (
              <div className="mt-8">
                <FinRegua pct={consumo} tone={tomGasto} marker={m.avanco} markerLabel={`Avanço físico ${fmtPct(m.avanco)}`} label="Orçamento consumido" />
                <p className="t-sm t-soft" style={{ margin: "2px 0 0" }}>
                  {saldo >= 0 ? `Restam ${fmtBRL0(saldo)} do orçamento.` : `O orçamento estourou em ${fmtBRL0(-saldo)}.`}{" "}
                  {m.gasto > 0 && (consumo > m.avanco + 10 ? `O gasto (${fmtPct(consumo)}) está à frente do avanço físico (${fmtPct(m.avanco)}): o dinheiro está saindo mais rápido que a obra anda.` : consumo < m.avanco - 10 ? "O gasto está atrás do avanço físico: confira se há notas a lançar." : "Gasto acompanhando o avanço físico.")}
                </p>
              </div>
            )}
            <div className="hr" style={{ margin: "18px 0 16px" }} />
            <div className="kpi-label mb-12">Previsto x gasto por categoria</div>
            {cats.length ? (
              <CompareBars rows={cats.map((c) => ({ label: c, previsto: t.byCategory[c].previsto, real: t.byCategory[c].real }))} />
            ) : (
              <span className="t-sm t-muted">Lance o orçamento e os gastos para comparar por categoria.</span>
            )}
          </Sheet>
        </div>
      </section>

      <section>
        <SectionHead title="Prazo" actions={<button className="btn btn-quiet btn-sm" onClick={() => setAba("cronograma")}>Abrir cronograma<ChevronRight size={16} /></button>} />
        <Sheet className="pad">
          {pj ? (
            <div className="stack gap-16">
              <div className="fin-campos">
                <div><small>Entrega original</small><strong>{fmtData(pj.fimOriginal)}</strong></div>
                <div>
                  <small>Entrega projetada</small>
                  <strong style={pj.deltaDias > 0 ? { color: "var(--danger)" } : undefined}>{fmtData(pj.fimProjetado)}</strong>
                  <span className={cx("t-xs", pj.deltaDias > 0 ? "t-danger" : "t-ok")} style={{ fontWeight: 600 }}>{pj.deltaDias > 0 ? `${plural(pj.deltaDias, "dia", "dias")} de atraso` : "no prazo"}</span>
                </div>
                <div><small>Avanço físico</small><strong>{fmtPct(m.avanco)}</strong><span className="t-xs t-muted">esperado hoje {fmtPct(pj.esperado)}</span></div>
                <div><small>Atividades atrasadas</small><strong style={pj.atrasadas ? { color: "var(--warn)" } : undefined}>{pj.atrasadas}</strong><span className="t-xs t-muted clip">{pj.culpadas[0]?.nome || "nenhuma"}</span></div>
              </div>
              <FinRegua pct={m.avanco} tone={m.avanco >= pj.esperado - 5 ? "ok" : undefined} marker={pj.esperado} markerLabel={`Esperado hoje ${fmtPct(pj.esperado)}`} label="Avanço físico" />
            </div>
          ) : (
            <div className="row between gap-12 wrap">
              <span className="t-soft">Monte o cronograma para projetar a data de entrega e medir atrasos.</span>
              <button className="btn btn-line btn-sm" onClick={() => setAba("cronograma")}>Montar cronograma</button>
            </div>
          )}
        </Sheet>
      </section>
    </div>
  );
}

/* ======================================================================
   INDICADORES
   ====================================================================== */
function finIndicadores(m) {
  const { t, pj } = m;
  const tone3 = (v, ok, warn, higherBetter = true) => (v == null ? null : higherBetter ? (v >= ok ? "ok" : v >= warn ? "warn" : "danger") : (v <= ok ? "ok" : v <= warn ? "warn" : "danger"));
  const prazo = [
    pj ? {
      label: "Avanço real x esperado", value: fmtPct(m.avanco), sub: `esperado hoje ${fmtPct(m.esperado)}`,
      tone: tone3(m.avanco - m.esperado, -5, -15),
      line: m.avanco >= m.esperado - 1 ? "A obra executou o que o cronograma pedia até hoje." : `Pelo cronograma a obra já deveria estar em ${fmtPct(m.esperado)}; faltam ${fmtPct(m.esperado - m.avanco)} de serviço para alcançar o plano.`,
    } : { label: "Avanço real x esperado", value: null, hint: "Monte o cronograma com início e duração das atividades." },
    m.spi != null ? {
      label: "SPI (desempenho de prazo)", value: finDec(m.spi), tone: tone3(m.spi, 0.95, 0.85),
      line: m.spi >= 0.995 ? "A obra entrega pelo menos o que foi planejado para o período." : `A cada 10 dias de serviço planejados, a obra entregou ${finDec(m.spi * 10, 1)}.`,
    } : { label: "SPI (desempenho de prazo)", value: null, hint: pj ? "Ainda não há atividades com início vencido." : "Precisa do cronograma com avanço das atividades." },
    pj ? {
      label: "Atividades atrasadas", value: String(pj.atrasadas), tone: pj.atrasadas === 0 ? "ok" : pj.atrasadas <= 2 ? "warn" : "danger",
      line: pj.atrasadas ? `Passaram do fim planejado sem concluir. A que mais atrasa: ${pj.culpadas[0].nome}.` : "Nenhuma atividade passou do fim planejado.",
    } : { label: "Atividades atrasadas", value: null, hint: "Cadastre as atividades no cronograma." },
    pj ? {
      label: "Atraso projetado na entrega", value: plural(Math.max(0, pj.deltaDias), "dia", "dias"), tone: pj.deltaDias <= 0 ? "ok" : pj.deltaDias <= 15 ? "warn" : "danger",
      line: pj.deltaDias > 0 ? `Entrega projetada para ${fmtData(pj.fimProjetado)}, contra ${fmtData(pj.fimOriginal)} no plano original.` : `Entrega mantida em ${fmtData(pj.fimProjetado)}.`,
    } : { label: "Atraso projetado na entrega", value: null, hint: "Precisa do cronograma para projetar a entrega." },
  ];

  const semOrc = { hint: "Lance o orçamento da obra." };
  const custo = [
    m.desvioProj != null ? {
      label: "Desvio orçamentário", value: finPctS(m.desvioProj), sub: "projetado no fim da obra", tone: tone3(m.desvioProj, 5, 10, false),
      line: m.desvioProj > 0.5 ? `No ritmo atual de gasto, a obra fecha em ${fmtBRL0(m.eac)}, ${fmtBRL0(m.eac - m.orc)} acima do orçado.` : `No ritmo atual, a obra fecha em ${fmtBRL0(m.eac)}, dentro do orçamento de ${fmtBRL0(m.orc)}.`,
    } : { label: "Desvio orçamentário", value: null, ...(m.orc ? { hint: "Precisa de gastos lançados e de avanço físico maior que zero." } : semOrc) },
    m.cpi != null ? {
      label: "CPI (desempenho de custo)", value: finDec(m.cpi), sub: "valor agregado ÷ gasto real", tone: tone3(m.cpi, 0.95, 0.85),
      line: m.cpi >= 0.995 ? "Cada R$ 1,00 gasto rendeu pelo menos R$ 1,00 de obra executada." : `Cada R$ 1,00 gasto rendeu R$ ${finDec(m.cpi)} de obra executada (avanço x orçamento).`,
    } : { label: "CPI (desempenho de custo)", value: null, ...(m.orc ? { hint: "Precisa de gastos lançados e de avanço físico maior que zero." } : semOrc) },
    m.orc > 0 && m.areaCompleta ? {
      label: "Custo por m² previsto", value: finM2(m.orc / m.area), sub: `${finArea(m.area)} de área das unidades`, tone: null,
      line: "Orçamento dividido pela área construída; compare com o CUB e com outras obras.",
    } : { label: "Custo por m² previsto", value: null, hint: m.orc > 0 ? "Preencha a área (m²) de todas as unidades." : "Lance o orçamento e a área das unidades." },
    m.gasto > 0 && m.areaCompleta ? {
      label: "Custo por m² real", value: finM2(m.gasto / m.area), sub: `gasto até agora, com ${fmtPct(m.avanco)} executado`, tone: m.cpi != null ? tone3(m.cpi, 0.95, 0.85) : null,
      line: m.eac ? `No ritmo atual, a obra termina custando ${finM2(m.eac / m.area)}.` : "Gasto lançado até hoje dividido pela área construída.",
    } : { label: "Custo por m² real", value: null, hint: m.gasto > 0 ? "Preencha a área (m²) de todas as unidades." : "Lance os gastos e a área das unidades." },
  ];

  const ncMaisAntiga = m.ncAbertas.reduce((a, n) => (!a || (n.dataAbertura && n.dataAbertura < a.dataAbertura) ? n : a), null);
  const qualidade = [
    {
      label: "Não conformidades abertas", value: String(m.ncAbertas.length), tone: m.ncAbertas.length === 0 ? "ok" : m.ncAbertas.length <= 2 ? "warn" : "danger",
      line: m.ncAbertas.length ? `A mais antiga está aberta há ${plural(Math.max(0, diffDaysISO(ncMaisAntiga.dataAbertura || m.hoje, m.hoje)), "dia", "dias")}: ${ncMaisAntiga.titulo}.` : m.ncs.length ? `Todas as ${m.ncs.length} registradas foram resolvidas.` : "Nenhuma registrada.",
    },
    {
      label: "De gravidade alta", value: String(m.ncAlta.length), tone: m.ncAlta.length ? "danger" : "ok",
      line: m.ncAlta.length ? `Resolver antes da próxima medição: ${m.ncAlta[0].titulo}.` : "Nenhum problema grave em aberto.",
    },
    {
      label: "Com prazo vencido", value: String(m.ncVencidas.length), tone: m.ncVencidas.length ? "danger" : "ok",
      line: m.ncVencidas.length ? `Prazo combinado já passou; cobre o responsável${m.ncVencidas[0].responsavel ? ` (${m.ncVencidas[0].responsavel})` : ""}.` : "Todas as abertas estão dentro do prazo.",
    },
    m.pins.length ? {
      label: "Pendências de vistoria resolvidas", value: fmtPct((m.pinsOk.length / m.pins.length) * 100), sub: `${m.pinsOk.length} de ${m.pins.length} marcadas na planta`,
      tone: tone3((m.pinsOk.length / m.pins.length) * 100, 90, 60),
      line: m.pins.length === m.pinsOk.length ? "Todas as pendências marcadas na planta foram resolvidas." : `Faltam ${m.pins.length - m.pinsOk.length}${m.pinsAtraso.length ? `, ${m.pinsAtraso.length} com prazo vencido` : ""}. Precisam estar zeradas para a entrega.`,
    } : { label: "Pendências de vistoria resolvidas", value: null, hint: "Envie a planta em Vistoria e marque as pendências nela." },
  ];

  const prox = m.reqs.filter((r) => r.status !== "concluido").slice(0, 2).map((r) => r.item);
  const dv = m.docsVencendo[0];
  const documentacao = [
    m.reqs.length ? {
      label: "Checklist de requisitos", value: fmtPct(m.reqPct), sub: `${m.reqOk.length} de ${m.reqs.length} concluídos`,
      tone: m.reqPct >= m.avanco ? "ok" : m.reqPct >= m.avanco - 20 ? "warn" : "danger",
      line: prox.length ? `Comparado ao avanço físico (${fmtPct(m.avanco)}). Próximos: ${prox.join(", ")}.` : "Todos os requisitos aplicáveis estão concluídos.",
    } : { label: "Checklist de requisitos", value: null, hint: "Carregue a lista padrão em Requisitos (Prefeitura e Caixa)." },
    {
      label: "Documentos vencendo em 30 dias", value: String(m.docsVencendo.length), tone: m.docsVencidos.length ? "danger" : m.docsVencendo.length ? "warn" : "ok",
      line: dv ? (dv.validade < m.hoje ? `${dv.titulo} venceu em ${fmtData(dv.validade)}. Renove antes de fiscalização ou medição.` : `${dv.titulo} vence em ${plural(diffDaysISO(m.hoje, dv.validade), "dia", "dias")} (${fmtData(dv.validade)}).`) : "Nenhum documento com validade nos próximos 30 dias.",
    },
  ];

  const nU = t.units.length;
  const comercPct = nU ? ((m.vendidas.length + m.reservadas.length) / nU) * 100 : null;
  const precoRatio = m.precoEst > 0 ? m.precoReal / m.precoEst : null;
  const vendas = [
    nU ? {
      label: "Unidades vendidas", value: `${m.vendidas.length} de ${nU}`, sub: `${plural(m.reservadas.length, "reservada", "reservadas")}, ${plural(m.disponiveis.length, "disponível", "disponíveis")}`,
      tone: comercPct >= m.avanco - 10 ? "ok" : comercPct >= m.avanco - 30 ? "warn" : "danger",
      line: `${fmtPct(comercPct)} comercializado (vendidas e reservadas) com a obra em ${fmtPct(m.avanco)}. Unidade parada na entrega vira custo.`,
    } : { label: "Unidades vendidas", value: null, hint: "Cadastre as unidades da obra." },
    t.estimatedRevenue > 0 && m.vendidasComPreco.length ? {
      label: "VGV realizado", value: fmtBRLshort(t.realRevenue), sub: `de ${fmtBRLshort(t.estimatedRevenue)} previstos (${fmtPct((t.realRevenue / t.estimatedRevenue) * 100)})`,
      tone: precoRatio >= 0.98 ? "ok" : precoRatio >= 0.93 ? "warn" : "danger",
      line: `${m.vendidasComPreco.length === 1 ? "A venda fechada saiu" : `As ${m.vendidasComPreco.length} vendas fechadas saíram`} ${Math.abs(precoRatio - 1) < 0.005 ? "no preço estimado" : `${fmtPct(Math.abs(precoRatio - 1) * 100)} ${precoRatio > 1 ? "acima" : "abaixo"} do preço estimado`}.`,
    } : { label: "VGV realizado", value: null, sub: t.estimatedRevenue > 0 ? `de ${fmtBRLshort(t.estimatedRevenue)} previstos` : null, hint: t.estimatedRevenue > 0 ? "Informe o valor de venda real das unidades vendidas." : "Cadastre as unidades próprias com o preço estimado." },
  ];

  return [
    { k: "prazo", titulo: "Prazo", itens: prazo },
    { k: "custo", titulo: "Custo", itens: custo },
    { k: "qualidade", titulo: "Qualidade", itens: qualidade },
    { k: "documentacao", titulo: "Documentação", itens: documentacao },
    { k: "vendas", titulo: "Vendas", itens: vendas },
  ];
}

function ObraKPIs({ store, project }) {
  useFinCss();
  const m = useMemo(() => finMetricas(store.data, project), [store.data, project]);
  const grupos = useMemo(() => finIndicadores(m), [m]);
  const todos = grupos.flatMap((g) => g.itens);
  const nCrit = todos.filter((i) => i.value != null && i.tone === "danger").length;
  const nAten = todos.filter((i) => i.value != null && i.tone === "warn").length;
  const nOk = todos.filter((i) => i.value != null && i.tone === "ok").length;
  return (
    <div className="stack gap-20">
      <div className="row between wrap gap-12">
        <span className="t-sm t-soft">Medidos hoje, {fmtDataLonga(m.hoje)}, com os dados lançados nas outras abas.</span>
        <div className="row gap-8 wrap">
          {nCrit > 0 && <Pill tone="danger">{plural(nCrit, "crítico", "críticos")}</Pill>}
          {nAten > 0 && <Pill tone="warn">{nAten} em atenção</Pill>}
          {nOk > 0 && <Pill tone="ok">{nOk} no alvo</Pill>}
        </div>
      </div>
      {grupos.map((g) => {
        const crit = g.itens.filter((i) => i.value != null && i.tone === "danger").length;
        const aten = g.itens.filter((i) => i.value != null && i.tone === "warn").length;
        const semDado = !g.itens.some((i) => i.value != null && i.tone);
        return (
          <Sheet key={g.k} className="fin-grp">
            <div className="fin-grp-head">
              <h2 className="t-title">{g.titulo}</h2>
              {semDado ? <span className="t-sm t-muted">Sem dados ainda</span> : crit ? <Pill tone="danger">{plural(crit, "indicador crítico", "indicadores críticos")}</Pill> : aten ? <Pill tone="warn">{plural(aten, "indicador em atenção", "indicadores em atenção")}</Pill> : <Pill tone="ok">Tudo no alvo</Pill>}
            </div>
            <div className="fin-kwrap">
              <div className="fin-kgrid" style={{ "--n": Math.min(4, g.itens.length) }}>
                {g.itens.map((it) => (
                  <div key={it.label} className="fin-kcell">
                    <div className="row between gap-8" style={{ alignItems: "flex-start" }}>
                      <span className="kpi-label">{it.label}</span>
                      {it.value != null && <FinStatus tone={it.tone} />}
                    </div>
                    <span className="kpi-value" style={it.value != null && (it.tone === "danger" || it.tone === "warn") ? { color: `var(--${it.tone})` } : it.value == null ? { color: "var(--ink-3)" } : undefined}>
                      {it.value != null ? <Odometer value={it.value} /> : "—"}
                    </span>
                    {it.sub && <span className="kpi-sub">{it.sub}</span>}
                    {it.value != null ? <p>{it.line}</p> : <p className="hint">{it.hint}</p>}
                  </div>
                ))}
              </div>
            </div>
          </Sheet>
        );
      })}
    </div>
  );
}

/* ======================================================================
   ORÇAMENTO
   ====================================================================== */
function ObraOrcamento({ store, project }) {
  useFinCss();
  const notify = useToast();
  const t = useMemo(() => projectTotals(store.data, project.id), [store.data, project.id]);
  const [dw, setDw] = useState({ open: false, item: null });
  const total = t.totalEstimatedCost;
  const cats = finCatsOrdenadas([...t.budget.map((b) => b.category), ...t.actual.map((a) => a.category)]);
  const area = t.units.every((u) => Number(u.area) > 0) ? t.units.reduce((s, u) => s + Number(u.area), 0) : 0;
  const nCatsOrc = new Set(t.budget.map((b) => b.category)).size;
  const abrirNovo = () => setDw({ open: true, item: null });
  const remover = async (b) => { await store.deleteBudgetItem(b.id); notify("Item excluído"); };

  if (!t.budget.length) {
    return (
      <div className="stack gap-16">
        <EmptyState icon={Calculator} title="Nenhum item no orçamento"
          text="Lance o previsto por categoria (materiais, mão de obra, terceirizados...). É a base para comparar com os gastos, medir o desvio e estimar o custo de cada unidade."
          action={<button className="btn btn-ink" onClick={abrirNovo}><Plus size={17} />Adicionar item</button>} />
        <FinOrcDrawer store={store} project={project} state={dw} onClose={() => setDw((d) => ({ ...d, open: false }))} />
      </div>
    );
  }

  return (
    <div>
      <div className="fin-head">
        <div className="fin-head-kpis">
          <Kpi lg label="Orçamento total" value={fmtBRL0(total)} sub={`${plural(t.budget.length, "item", "itens")} em ${plural(nCatsOrc, "categoria", "categorias")}${area ? `, ${finM2(total / area)}` : ""}`} />
          <Kpi label="Gasto até agora" value={fmtBRL0(t.totalActualCost)} tone={t.totalActualCost > total ? "danger" : undefined} sub={total > 0 ? `${fmtPct((t.totalActualCost / total) * 100)} do orçamento` : null} />
        </div>
        <button className="btn btn-ink" onClick={abrirNovo}><Plus size={17} />Adicionar item</button>
      </div>

      <Sheet className="fin-sheet-clip divide">
        {cats.map((cat) => {
          const itens = t.budget.filter((b) => b.category === cat);
          const prev = t.byCategory[cat]?.previsto || 0; const real = t.byCategory[cat]?.real || 0;
          const over = real > prev;
          return (
            <div key={cat}>
              <div className="fin-cat">
                <div className="stack">
                  <span className="t-h2">{cat}</span>
                  <span className="t-xs" style={{ color: over ? "var(--danger)" : "var(--ink-3)", fontWeight: 600 }}>
                    {real > 0 ? `Gasto ${fmtBRL0(real)}${prev > 0 ? ` de ${fmtBRL0(prev)} (${fmtPct((real / prev) * 100)})` : ", sem nada orçado"}` : "Nenhum gasto lançado"}
                  </span>
                </div>
                <span className="t-num" style={{ fontSize: 18 }}>{fmtBRL0(prev)}</span>
              </div>
              {itens.length === 0 && (
                <div className="list-row t-sm t-muted" style={{ minHeight: 48, borderTop: "1px solid var(--line)" }}>
                  Há gastos nesta categoria mas nada orçado.
                  <button className="link" onClick={() => setDw({ open: true, item: { category: cat, novo: true } })}>Orçar categoria</button>
                </div>
              )}
              {itens.map((b) => {
                const pct = total > 0 ? (b.estimatedValue / total) * 100 : 0;
                return (
                  <div key={b.id} className="fin-oitem" style={{ borderTop: "1px solid var(--line)" }} onClick={() => setDw({ open: true, item: b })} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter") setDw({ open: true, item: b }); }}>
                    <span className="clip" style={{ fontWeight: 550 }}>{b.description || <span className="t-muted">Sem descrição</span>}</span>
                    <div className="row gap-8 bar">
                      <div className="fin-bar"><i style={{ width: `${Math.min(100, pct)}%` }} /></div>
                      <span className="t-xs t-muted t-num" style={{ width: 40, textAlign: "right" }}>{finPct1(pct)}</span>
                    </div>
                    <span className="t-num val" style={{ textAlign: "right", fontSize: 16 }}>{fmtBRL0(b.estimatedValue)}</span>
                    <div className="acts reveal" onClick={(e) => e.stopPropagation()}>
                      <ConfirmDelete what="item" onConfirm={() => remover(b)} />
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </Sheet>
      <FinOrcDrawer store={store} project={project} state={dw} onClose={() => setDw((d) => ({ ...d, open: false }))} />
    </div>
  );
}

function FinOrcDrawer({ store, project, state, onClose }) {
  const notify = useToast();
  const item = state.item && !state.item.novo ? state.item : null;
  const [f, setF] = useState({ category: OBRA_CATS[0], description: "", valor: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!state.open) return;
    setErr(""); setBusy(false);
    setF(item ? { category: item.category, description: item.description || "", valor: moneyStr(item.estimatedValue) } : { category: state.item?.category || OBRA_CATS[0], description: "", valor: "" });
  }, [state.open, state.item]); // eslint-disable-line
  const cats = OBRA_CATS.includes(f.category) ? OBRA_CATS : [...OBRA_CATS, f.category];
  const salvar = async (e) => {
    e?.preventDefault();
    const v = parseNum(f.valor);
    if (!(v > 0)) { setErr("Informe um valor maior que zero, por exemplo 12.500,00."); return; }
    setBusy(true);
    if (item) { await store.updateBudgetItem(item.id, { category: f.category, description: f.description.trim(), estimatedValue: v }); notify("Item atualizado"); }
    else { const r = await store.addBudgetItem({ projectId: project.id, category: f.category, description: f.description.trim(), estimatedValue: v }); if (!r) { setBusy(false); return; } notify("Item adicionado"); }
    setBusy(false); onClose();
  };
  return (
    <Drawer open={state.open} onClose={onClose} title={item ? "Editar item do orçamento" : "Adicionar item ao orçamento"} sub={project.name}
      footer={<>
        {item && <div style={{ marginRight: "auto" }}><ConfirmDelete what="item" onConfirm={async () => { await store.deleteBudgetItem(item.id); notify("Item excluído"); onClose(); }} /></div>}
        <button className="btn btn-line" onClick={onClose}>Cancelar</button>
        <button className="btn btn-ink" type="submit" form="fin-orc-form" disabled={busy}>{item ? "Salvar alterações" : "Adicionar item"}</button>
      </>}>
      <form id="fin-orc-form" className="stack gap-16" onSubmit={salvar}>
        <Field label="Categoria">
          <select className="select" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>
            {cats.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Descrição" hint="Opcional. Ex.: blocos, cimento e aço da estrutura">
          <input className="input" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
        </Field>
        <Field label="Valor previsto">
          <MoneyInput value={f.valor} onChange={(v) => { setF({ ...f, valor: v }); if (err) setErr(""); }} aria-invalid={!!err} />
          {err && <span className="fin-err">{err}</span>}
        </Field>
      </form>
    </Drawer>
  );
}

/* ======================================================================
   GASTOS
   ====================================================================== */
function ObraCustos({ store, project }) {
  useFinCss();
  const notify = useToast();
  const narrow = !useIsDesktop(641);
  const t = useMemo(() => projectTotals(store.data, project.id), [store.data, project.id]);
  const [cat, setCat] = useState("todas");
  const [dw, setDw] = useState({ open: false, item: null });
  const gastos = t.actual;
  const cats = finCatsOrdenadas(gastos.map((g) => g.category));
  useEffect(() => { if (cat !== "todas" && !cats.includes(cat)) setCat("todas"); }, [cats.join("|")]); // eslint-disable-line
  const lista = useMemo(() => (cat === "todas" ? gastos : gastos.filter((g) => g.category === cat)).slice().sort((a, b) => (a.date === b.date ? b.id - a.id : a.date < b.date ? 1 : -1)), [gastos, cat]);
  const total = lista.reduce((s, g) => s + g.value, 0);
  const orcado = cat === "todas" ? t.totalEstimatedCost : t.byCategory[cat]?.previsto || 0;
  const pct = orcado > 0 ? (total / orcado) * 100 : null;

  const nMeses = narrow ? 6 : 12;
  const serie = useMemo(() => {
    const hoje = todayISO(); const [y, mo] = hoje.split("-").map(Number);
    const out = [];
    for (let i = nMeses - 1; i >= 0; i--) {
      const d = new Date(y, mo - 1 - i, 1);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      out.push({ ym, label: narrow ? MESES[d.getMonth()] : fmtMes(ym), full: finCap(finMesLongo(ym)), value: lista.filter((g) => g.date && g.date.slice(0, 7) === ym).reduce((s, g) => s + g.value, 0) });
    }
    return out;
  }, [lista, nMeses, narrow]);
  const media = serie.filter((s) => s.value > 0);
  const mediaMensal = media.length ? media.reduce((s, x) => s + x.value, 0) / media.length : 0;

  const meses = useMemo(() => {
    const map = new Map();
    lista.forEach((g) => { const k = (g.date || "").slice(0, 7) || "sem-data"; if (!map.has(k)) map.set(k, []); map.get(k).push(g); });
    return [...map.entries()];
  }, [lista]);

  const remover = async (g) => { await store.deleteActualCost(g.id); notify("Gasto excluído"); };
  const abrirNovo = () => setDw({ open: true, item: null });

  if (!gastos.length) {
    return (
      <div>
        <EmptyState icon={Wallet} title="Nenhum gasto lançado"
          text="Lance cada compra, empreitada ou taxa com o comprovante. O app compara com o orçamento, mostra o ritmo de gasto por mês e calcula o custo real de cada unidade."
          action={<button className="btn btn-ink" onClick={abrirNovo}><Plus size={17} />Adicionar gasto</button>} />
        <FinGastoDrawer store={store} project={project} state={dw} onClose={() => setDw((d) => ({ ...d, open: false }))} />
      </div>
    );
  }

  return (
    <div className="stack gap-20">
      <div className="fin-split">
        <Sheet className="pad stack gap-12">
          <Kpi lg label={cat === "todas" ? "Gasto até agora" : `Gasto em ${cat}`} value={fmtBRL0(total)} tone={pct != null && pct > 100 ? "danger" : undefined}
            sub={orcado > 0 ? `de ${fmtBRL0(orcado)} orçados` : "nada orçado nesta categoria"} />
          {pct != null && (
            <div className="stack gap-6">
              <div className="row between t-sm"><span className="t-soft">Orçamento consumido</span><span className="t-num" style={{ fontSize: 16, color: pct > 100 ? "var(--danger)" : undefined }}>{fmtPct(pct)}</span></div>
              <Ruler pct={pct} tone={pct > 100 ? "danger" : undefined} label="Orçamento consumido" />
              <span className="t-sm t-muted">{pct > 100 ? `${fmtBRL0(total - orcado)} acima do orçado.` : `Restam ${fmtBRL0(orcado - total)}.`}</span>
            </div>
          )}
          <button className="btn btn-ink" style={{ marginTop: "auto", alignSelf: "flex-start" }} onClick={abrirNovo}><Plus size={17} />Adicionar gasto</button>
        </Sheet>
        <Sheet className="pad stack gap-8">
          <div className="row between gap-12 wrap">
            <span className="kpi-label">Gastos por mês, últimos {nMeses} meses</span>
            {mediaMensal > 0 && <span className="t-sm t-muted">Média {fmtBRLshort(mediaMensal)} nos meses com gasto</span>}
          </div>
          <BarsTrend data={serie} height={narrow ? 170 : 210} />
        </Sheet>
      </div>

      <div className="stack gap-12">
        <Segmented size="sm" ariaLabel="Filtrar por categoria" value={cat} onChange={setCat}
          options={[{ value: "todas", label: "Todas" }, ...cats.map((c) => ({ value: c, label: c }))]} />
        <Sheet className="fin-sheet-clip">
          {meses.map(([ym, gs], gi) => (
            <div key={ym}>
              <div className="fin-cat" style={gi ? { borderTop: "1px solid var(--line)" } : undefined}>
                <span className="t-h2">{ym === "sem-data" ? "Sem data" : finCap(finMesLongo(ym))}</span>
                <span className="t-num" style={{ fontSize: 16 }}>{fmtBRL0(gs.reduce((s, g) => s + g.value, 0))}</span>
              </div>
              {gs.map((g) => (
                <div key={g.id} className="fin-gasto" style={{ borderTop: "1px solid var(--line)" }} onClick={() => setDw({ open: true, item: g })} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter") setDw({ open: true, item: g }); }}>
                  <div className="fin-dia" aria-label={fmtDataCurta(g.date)}><b>{g.date ? Number(g.date.slice(8, 10)) : "—"}</b><span>{g.date ? MESES[Number(g.date.slice(5, 7)) - 1] : ""}</span></div>
                  <div className="grow stack" style={{ gap: 1 }}>
                    <span className="clip" style={{ fontWeight: 600 }}>{g.description || g.category}</span>
                    <span className="t-sm t-muted clip">{[g.supplier, g.description && g.description !== g.category ? g.category : null].filter(Boolean).join(", ") || g.category}</span>
                  </div>
                  <span className="t-num" style={{ fontSize: 16, whiteSpace: "nowrap" }}>{fmtBRL(g.value)}</span>
                  <div className="row reveal" onClick={(e) => e.stopPropagation()}>
                    {g.receiptPath ? <IconBtn tip="Ver comprovante" sm onClick={() => openFile(g.receiptPath, "receipts")}><Paperclip size={16} /></IconBtn> : <span style={{ width: 30 }} aria-hidden="true" />}
                    <ConfirmDelete what="gasto" onConfirm={() => remover(g)} />
                  </div>
                </div>
              ))}
            </div>
          ))}
        </Sheet>
      </div>
      <FinGastoDrawer store={store} project={project} state={dw} onClose={() => setDw((d) => ({ ...d, open: false }))} />
    </div>
  );
}

function FinGastoDrawer({ store, project, state, onClose }) {
  const notify = useToast();
  const item = state.item;
  const vazio = () => ({ category: OBRA_CATS[0], description: "", valor: "", date: todayISO(), supplier: "", file: null });
  const [f, setF] = useState(vazio);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!state.open) return;
    setErr(""); setBusy(false);
    setF(item ? { category: item.category, description: item.description || "", valor: moneyStr(item.value), date: item.date || todayISO(), supplier: item.supplier || "", file: null } : vazio());
  }, [state.open, state.item]); // eslint-disable-line
  const cats = OBRA_CATS.includes(f.category) ? OBRA_CATS : [...OBRA_CATS, f.category];
  const salvar = async (e) => {
    e?.preventDefault();
    const v = parseNum(f.valor);
    if (!(v > 0)) { setErr("Informe um valor maior que zero, por exemplo 1.250,00."); return; }
    setBusy(true);
    const base = { category: f.category, description: f.description.trim(), value: v, date: f.date || todayISO(), supplier: f.supplier.trim() };
    if (item) { await store.updateActualCost(item.id, base); if (f.file) await store.setCostReceipt(item.id, f.file); notify("Gasto atualizado"); }
    else { const r = await store.addActualCost({ projectId: project.id, ...base, receiptFile: f.file }); if (!r) { setBusy(false); return; } notify("Gasto adicionado"); }
    setBusy(false); onClose();
  };
  return (
    <Drawer open={state.open} onClose={onClose} title={item ? "Editar gasto" : "Adicionar gasto"} sub={project.name}
      footer={<>
        {item && <div style={{ marginRight: "auto" }}><ConfirmDelete what="gasto" onConfirm={async () => { await store.deleteActualCost(item.id); notify("Gasto excluído"); onClose(); }} /></div>}
        <button className="btn btn-line" onClick={onClose}>Cancelar</button>
        <button className="btn btn-ink" type="submit" form="fin-gasto-form" disabled={busy}>{busy ? <Loader2 size={16} className="spin" /> : null}{item ? "Salvar alterações" : "Adicionar gasto"}</button>
      </>}>
      <form id="fin-gasto-form" className="stack gap-16" onSubmit={salvar}>
        <Field label="Valor">
          <MoneyInput value={f.valor} onChange={(v) => { setF({ ...f, valor: v }); if (err) setErr(""); }} aria-invalid={!!err} />
          {err && <span className="fin-err">{err}</span>}
        </Field>
        <div className="grid cols-2" style={{ gap: 12 }}>
          <Field label="Categoria">
            <select className="select" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>
              {cats.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Data">
            <input className="input" type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
          </Field>
        </div>
        <Field label="Descrição" hint="Ex.: cimento e areia para o reboco">
          <input className="input" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
        </Field>
        <Field label="Fornecedor">
          <input className="input" value={f.supplier} onChange={(e) => setF({ ...f, supplier: e.target.value })} />
        </Field>
        <Field label="Comprovante" hint={item?.receiptPath ? "Anexe outro arquivo para substituir o atual." : "Foto da nota ou PDF. Opcional."}>
          {item?.receiptPath && <button type="button" className="btn btn-line btn-sm mb-8" style={{ alignSelf: "flex-start" }} onClick={() => openFile(item.receiptPath, "receipts")}><Receipt size={15} />Abrir comprovante atual</button>}
          <FileField file={f.file} setFile={(file) => setF((x) => ({ ...x, file }))} label={item?.receiptPath ? "Substituir comprovante" : "Anexar comprovante"} accept="image/*,application/pdf" />
        </Field>
      </form>
    </Drawer>
  );
}

/* ======================================================================
   UNIDADES
   ====================================================================== */
const FIN_TIPO = { propria: "Própria", investidor: "Investidor" };
const finUnitTone = (s) => (s === "vendida" ? "ok" : s === "reservada" ? "warn" : undefined);

function ObraUnidades({ store, project }) {
  useFinCss();
  const wide = useIsDesktop(761);
  const bk = useMemo(() => unitCostBreakdown(store.data, project.id), [store.data, project.id]);
  const m = useMemo(() => finMetricas(store.data, project), [store.data, project]);
  const [sel, setSel] = useState({ open: false, id: null });
  const [novo, setNovo] = useState(false);
  const rows = bk.rows;
  const tot = rows.reduce((a, r) => ({ area: a.area + (Number(r.unit.area) || 0), venda: a.venda + r.venda, est: a.est + r.custoEstimado, real: a.real + r.custoReal, dif: a.dif + r.diferenca, margem: a.margem + r.margem }), { area: 0, venda: 0, est: 0, real: 0, dif: 0, margem: 0 });
  const abrir = (u) => setSel({ open: true, id: u.id });

  if (!rows.length) {
    return (
      <div>
        <EmptyState icon={HandCoins} title="Nenhuma unidade cadastrada"
          text="Cadastre as casas da obra para estimar o custo de cada uma (rateio do orçamento, documentação e corretagem), comparar com o gasto real e acompanhar vendas e margem."
          action={<button className="btn btn-ink" onClick={() => setNovo(true)}><Plus size={17} />Adicionar unidade</button>} />
        <FinUnidadeNovaDrawer store={store} project={project} open={novo} onClose={() => setNovo(false)} />
      </div>
    );
  }

  const nota = bk.criterio === "area"
    ? `Custo da obra rateado pela área: cada unidade recebe a fração da sua área sobre os ${finArea(bk.totalArea)} da obra. Documentação e corretagem entram direto na unidade.`
    : `Custo da obra dividido igualmente entre as ${rows.length} unidades porque falta a área de ${rows.length - rows.filter((r) => Number(r.unit.area) > 0).length > 1 ? "algumas delas" : "uma delas"}. Preencha a área (m²) de todas para ratear pelo tamanho.`;
  const margemPct = tot.venda > 0 ? (tot.margem / tot.venda) * 100 : 0;

  return (
    <div className="stack gap-16">
      <div className="fin-head" style={{ marginBottom: 0 }}>
        <div className="fin-head-kpis">
          <Kpi label="Unidades" value={String(rows.length)} sub={`${plural(m.vendidas.length, "vendida", "vendidas")}, ${plural(m.reservadas.length, "reservada", "reservadas")}`} />
          <Kpi label="Custo médio estimado" value={fmtBRL0(tot.est / rows.length)} sub="por unidade, com documentação e corretagem" />
          <Kpi label="Custo real até agora" value={fmtBRL0(tot.real)} sub={`de ${fmtBRL0(tot.est)} estimados`} />
          <Kpi label="Margem das unidades" value={fmtBRL0(tot.margem)} tone={tot.margem < 0 ? "danger" : undefined} sub={`venda menos custo, ${finPct1(margemPct)}`} />
        </div>
        <button className="btn btn-ink" onClick={() => setNovo(true)}><Plus size={17} />Adicionar unidade</button>
      </div>
      <div className="fin-note"><Info size={16} /><span>{nota} O custo real usa o gasto lançado até hoje, por isso fica abaixo do estimado enquanto a obra não termina.</span></div>

      {wide ? (
        <Sheet className="fin-sheet-clip">
          <div className="fin-scroll">
            <table className="fin-table">
              <thead>
                <tr>
                  <th>Unidade</th><th className="num">Área</th><th>Tipo</th><th>Situação</th><th className="num">Venda</th>
                  <th className="num">Custo estimado</th><th className="num">Custo real</th><th className="num">Diferença</th><th className="num">Margem</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const u = r.unit; const mp = r.venda > 0 ? (r.margem / r.venda) * 100 : null;
                  return (
                    <tr key={u.id} onClick={() => abrir(u)} tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter") abrir(u); }}>
                      <td style={{ fontWeight: 700 }}>{u.code}</td>
                      <td className="num">{u.area ? `${finDec(u.area, 0)} m²` : <span className="t-muted">—</span>}</td>
                      <td className="t-soft">{FIN_TIPO[u.type] || u.type}</td>
                      <td><Pill tone={finUnitTone(u.status)}>{UNIT_STATUS[u.status] || u.status}</Pill></td>
                      <td className="num">{fmtBRL0(r.venda)}<div className="t-xs t-muted" style={{ fontFamily: "Hanken Grotesk", fontWeight: 500 }}>{u.salePriceReal != null ? "real" : "estimada"}</div></td>
                      <td className="num">{fmtBRL0(r.custoEstimado)}</td>
                      <td className="num">{fmtBRL0(r.custoReal)}</td>
                      <td className="num" style={{ color: r.diferenca > 0 ? "var(--danger)" : "var(--ink-3)" }}>{finSigned(r.diferenca)}</td>
                      <td className="num" style={{ color: r.margem < 0 ? "var(--danger)" : undefined }}>{fmtBRL0(r.margem)}{mp != null && <div className="t-xs t-muted" style={{ fontFamily: "Hanken Grotesk", fontWeight: 500 }}>{finPct1(mp)}</div>}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td>Total</td><td className="num">{tot.area ? `${finDec(tot.area, 0)} m²` : "—"}</td><td /><td />
                  <td className="num">{fmtBRL0(tot.venda)}</td><td className="num">{fmtBRL0(tot.est)}</td><td className="num">{fmtBRL0(tot.real)}</td>
                  <td className="num" style={{ color: tot.dif > 0 ? "var(--danger)" : "var(--ink-3)" }}>{finSigned(tot.dif)}</td>
                  <td className="num" style={{ color: tot.margem < 0 ? "var(--danger)" : undefined }}>{fmtBRL0(tot.margem)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Sheet>
      ) : (
        <Sheet className="divide fin-sheet-clip">
          {rows.map((r) => {
            const u = r.unit;
            return (
              <button key={u.id} className="fin-ucard" onClick={() => abrir(u)}>
                <div className="row between gap-8" style={{ width: "100%" }}>
                  <div className="stack"><strong style={{ fontSize: 16 }}>{u.code}</strong><span className="t-xs t-muted">{[u.area ? `${finDec(u.area, 0)} m²` : "sem área", (FIN_TIPO[u.type] || u.type).toLowerCase()].join(", ")}</span></div>
                  <div className="row gap-6"><Pill tone={finUnitTone(u.status)}>{UNIT_STATUS[u.status] || u.status}</Pill><ChevronRight size={18} style={{ color: "var(--ink-3)" }} /></div>
                </div>
                <div className="fin-ugrid">
                  <div><small>Venda {u.salePriceReal != null ? "real" : "estimada"}</small><b>{fmtBRL0(r.venda)}</b></div>
                  <div><small>Margem</small><b style={r.margem < 0 ? { color: "var(--danger)" } : undefined}>{fmtBRL0(r.margem)}</b></div>
                  <div><small>Custo estimado</small><b>{fmtBRL0(r.custoEstimado)}</b></div>
                  <div><small>Custo real</small><b style={r.diferenca > 0 ? { color: "var(--danger)" } : undefined}>{fmtBRL0(r.custoReal)}</b></div>
                </div>
              </button>
            );
          })}
        </Sheet>
      )}

      <FinUnidadeDrawer store={store} project={project} bk={bk} m={m} state={sel} onClose={() => setSel((s) => ({ ...s, open: false }))} />
      <FinUnidadeNovaDrawer store={store} project={project} open={novo} onClose={() => setNovo(false)} />
    </div>
  );
}
function finSigned(n) { const v = Math.round(Number(n) || 0); return v > 0 ? `+${fmtBRL0(v)}` : v < 0 ? `−${fmtBRL0(-v)}` : fmtBRL0(0); }

function FinUnidadeNovaDrawer({ store, project, open, onClose }) {
  const notify = useToast();
  const vazio = { code: "", area: "", type: "propria", venda: "", doc: "", corr: "" };
  const [f, setF] = useState(vazio);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!open) return;
    const n = store.data.units.filter((u) => u.projectId === project.id).length + 1;
    setF({ ...vazio, code: `Casa ${String(n).padStart(2, "0")}` }); setErr(""); setBusy(false);
  }, [open]); // eslint-disable-line
  const salvar = async (e) => {
    e?.preventDefault();
    if (!f.code.trim()) { setErr("Dê um nome à unidade, por exemplo Casa 05."); return; }
    setBusy(true);
    const r = await store.addUnit({ projectId: project.id, code: f.code.trim(), area: finNumOrNull(f.area), type: f.type, salePriceEstimated: finNumOrNull(f.venda) || 0 });
    if (!r) { setBusy(false); return; }
    const doc = finNumOrNull(f.doc) || 0; const corr = finNumOrNull(f.corr) || 0;
    if (doc || corr) await store.updateUnit(r.id, { custoDocumentacao: doc, custoCorretagem: corr });
    notify("Unidade adicionada"); setBusy(false); onClose();
  };
  return (
    <Drawer open={open} onClose={onClose} title="Adicionar unidade" sub={project.name}
      footer={<><button className="btn btn-line" onClick={onClose}>Cancelar</button><button className="btn btn-ink" type="submit" form="fin-unova-form" disabled={busy}>Adicionar unidade</button></>}>
      <form id="fin-unova-form" className="stack gap-16" onSubmit={salvar}>
        <div className="grid cols-2" style={{ gap: 12 }}>
          <Field label="Nome ou código">
            <input className="input" value={f.code} onChange={(e) => { setF({ ...f, code: e.target.value }); setErr(""); }} />
          </Field>
          <Field label="Área (m²)">
            <input className="input" inputMode="decimal" value={f.area} placeholder="48" onChange={(e) => setF({ ...f, area: e.target.value })} />
          </Field>
        </div>
        {err && <span className="fin-err">{err}</span>}
        <Field label="Tipo" hint={f.type === "investidor" ? "Um investidor aporta dinheiro nesta unidade e recebe de volta com lucro na venda." : "A construtora vende a unidade e fica com a receita."}>
          <Segmented size="sm" style={{ alignSelf: "flex-start" }} ariaLabel="Tipo da unidade" value={f.type} onChange={(v) => setF({ ...f, type: v })} options={[{ value: "propria", label: "Própria" }, { value: "investidor", label: "Investidor" }]} />
        </Field>
        <Field label="Venda estimada"><MoneyInput value={f.venda} onChange={(v) => setF({ ...f, venda: v })} /></Field>
        <div className="grid cols-2" style={{ gap: 12 }}>
          <Field label="Documentação"><MoneyInput value={f.doc} onChange={(v) => setF({ ...f, doc: v })} /></Field>
          <Field label="Corretagem"><MoneyInput value={f.corr} onChange={(v) => setF({ ...f, corr: v })} /></Field>
        </div>
        <span className="t-xs t-muted" style={{ marginTop: -6 }}>Documentação (ITBI, cartório, registro) e corretagem entram no custo da unidade. Pode deixar em branco e preencher depois.</span>
      </form>
    </Drawer>
  );
}

function FinUnidadeDrawer({ store, project, bk, m, state, onClose }) {
  const notify = useToast();
  const row = bk.rows.find((r) => r.unit.id === state.id) || null;
  const lastRow = useRef(row); if (row) lastRow.current = row;
  const r = row || lastRow.current;
  const u = r?.unit;
  const [f, setF] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!state.open || !u) return;
    setErr(""); setBusy(false);
    setF({ code: u.code || "", area: u.area != null ? String(u.area).replace(".", ",") : "", type: u.type || "propria", status: u.status || "disponivel", venda: moneyStr(u.salePriceEstimated), vendaReal: moneyStr(u.salePriceReal), doc: moneyStr(u.custoDocumentacao), corr: moneyStr(u.custoCorretagem) });
  }, [state.open, state.id]); // eslint-disable-line
  if (!r || !f) return <Drawer open={false} onClose={onClose} title="" />;

  const investidores = store.data.investors.filter((i) => i.unitId === u.id);
  const salvar = async (e) => {
    e?.preventDefault();
    if (!f.code.trim()) { setErr("Dê um nome à unidade."); return; }
    setBusy(true);
    await store.updateUnit(u.id, {
      code: f.code.trim(), area: finNumOrNull(f.area), type: f.type, status: f.status,
      salePriceEstimated: finNumOrNull(f.venda) || 0, salePriceReal: finNumOrNull(f.vendaReal), custoDocumentacao: finNumOrNull(f.doc) || 0, custoCorretagem: finNumOrNull(f.corr) || 0,
    });
    notify("Unidade atualizada"); setBusy(false); onClose();
  };
  const mp = r.venda > 0 ? (r.margem / r.venda) * 100 : null;
  const projObra = m.cpi ? r.obraEst / m.cpi : null;

  return (
    <Drawer open={state.open} onClose={onClose} width={560} title={u.code} sub={`${FIN_TIPO[u.type] || u.type}, ${(UNIT_STATUS[u.status] || u.status).toLowerCase()}${u.area ? `, ${finArea(u.area)}` : ""}`}
      footer={<>
        <div style={{ marginRight: "auto" }}><ConfirmDelete what="unidade" onConfirm={async () => { await store.deleteUnit(u.id); notify("Unidade excluída"); onClose(); }} /></div>
        <button className="btn btn-line" onClick={onClose}>Cancelar</button>
        <button className="btn btn-ink" type="submit" form="fin-unit-form" disabled={busy}>Salvar alterações</button>
      </>}>
      <div className="stack gap-12">
        <div className="row between gap-12" style={{ alignItems: "flex-end" }}>
          <Kpi label="Custo estimado da unidade" value={fmtBRL0(r.custoEstimado)} sub="obra + documentação + corretagem" />
          <div className="stack" style={{ alignItems: "flex-end" }}>
            <span className="kpi-label">Margem</span>
            <span className="t-num" style={{ fontSize: 24, color: r.margem < 0 ? "var(--danger)" : "var(--ok)" }}>{fmtBRL0(r.margem)}</span>
            {mp != null && <span className="t-xs t-muted">{finPct1(mp)} sobre a venda</span>}
          </div>
        </div>
        <table className="fin-bk">
          <thead><tr><th>Composição</th><th>Estimado</th><th>Real até agora</th></tr></thead>
          <tbody>
            <tr><td>Obra (rateio {bk.criterio === "area" ? `de ${finPct1(r.peso * 100)}, pela área` : "igual"})</td><td>{fmtBRL0(r.obraEst)}</td><td>{fmtBRL0(r.obraReal)}</td></tr>
            <tr><td>Documentação</td><td>{fmtBRL0(r.doc)}</td><td>{fmtBRL0(r.doc)}</td></tr>
            <tr><td>Corretagem</td><td>{fmtBRL0(r.corr)}</td><td>{fmtBRL0(r.corr)}</td></tr>
            <tr className="tot"><td>Custo da unidade</td><td>{fmtBRL0(r.custoEstimado)}</td><td style={{ color: r.diferenca > 0 ? "var(--danger)" : undefined }}>{fmtBRL0(r.custoReal)}</td></tr>
            <tr><td>Venda {u.salePriceReal != null ? "real" : "estimada"}</td><td>{fmtBRL0(r.venda)}</td><td /></tr>
          </tbody>
        </table>
        {projObra && <span className="t-sm t-soft">No ritmo atual de gasto da obra (CPI {finDec(m.cpi)}), a parte da obra desta unidade fecharia em {fmtBRL0(projObra)}{projObra > r.obraEst ? `, ${fmtBRL0(projObra - r.obraEst)} acima do estimado` : ""}.</span>}
      </div>

      <form id="fin-unit-form" className="fin-dsec" onSubmit={salvar}>
        <h3 className="t-h2">Dados da unidade</h3>
        <div className="grid cols-2" style={{ gap: 12 }}>
          <Field label="Nome ou código"><input className="input" value={f.code} onChange={(e) => { setF({ ...f, code: e.target.value }); setErr(""); }} /></Field>
          <Field label="Área (m²)"><input className="input" inputMode="decimal" value={f.area} onChange={(e) => setF({ ...f, area: e.target.value })} /></Field>
        </div>
        {err && <span className="fin-err">{err}</span>}
        <Field label="Tipo">
          <Segmented size="sm" style={{ alignSelf: "flex-start" }} ariaLabel="Tipo da unidade" value={f.type} onChange={(v) => setF({ ...f, type: v })} options={[{ value: "propria", label: "Própria" }, { value: "investidor", label: "Investidor" }]} />
        </Field>
        <Field label="Situação">
          <Segmented size="sm" style={{ alignSelf: "flex-start" }} ariaLabel="Situação da unidade" value={f.status} onChange={(v) => setF({ ...f, status: v })} options={Object.entries(UNIT_STATUS).map(([value, label]) => ({ value, label }))} />
        </Field>
        <div className="grid cols-2" style={{ gap: 12 }}>
          <Field label="Venda estimada"><MoneyInput value={f.venda} onChange={(v) => setF({ ...f, venda: v })} /></Field>
          <Field label="Venda real" hint="Quando fechar a venda"><MoneyInput value={f.vendaReal} onChange={(v) => setF({ ...f, vendaReal: v })} placeholder="" /></Field>
          <Field label="Documentação" hint="ITBI, cartório, registro"><MoneyInput value={f.doc} onChange={(v) => setF({ ...f, doc: v })} /></Field>
          <Field label="Corretagem"><MoneyInput value={f.corr} onChange={(v) => setF({ ...f, corr: v })} /></Field>
        </div>
      </form>

      {(f.type === "investidor" || investidores.length > 0) && <FinInvestidores store={store} unit={u} investidores={investidores} />}

      <div className="fin-dsec">
        <h3 className="t-h2">Avanço da unidade</h3>
        <UnidadeEtapas store={store} unitId={u.id} />
      </div>
    </Drawer>
  );
}

function FinInvestidores({ store, unit, investidores }) {
  const notify = useToast();
  const [ed, setEd] = useState(null); // null | "novo" | investor
  const [f, setF] = useState({ name: "", inv: "", lucroEst: "", lucroReal: "" });
  const [err, setErr] = useState("");
  useEffect(() => { setEd(null); }, [unit.id]);
  const abrir = (i) => {
    setErr(""); setEd(i || "novo");
    setF(i ? { name: i.name || "", inv: moneyStr(i.amountInvested), lucroEst: moneyStr(i.estimatedProfit), lucroReal: moneyStr(i.realProfit) } : { name: "", inv: "", lucroEst: "", lucroReal: "" });
  };
  const salvar = async () => {
    if (!f.name.trim()) { setErr("Informe o nome do investidor."); return; }
    const amountInvested = finNumOrNull(f.inv) || 0; const estimatedProfit = finNumOrNull(f.lucroEst) || 0; const realProfit = finNumOrNull(f.lucroReal);
    if (ed === "novo") {
      const r = await store.addInvestor({ unitId: unit.id, name: f.name.trim(), amountInvested, estimatedProfit });
      if (!r) return;
      if (realProfit != null) await store.updateInvestor(r.id, { realProfit });
      notify("Investidor adicionado");
    } else {
      await store.updateInvestor(ed.id, { name: f.name.trim(), amountInvested, estimatedProfit, realProfit });
      notify("Investidor atualizado");
    }
    setEd(null);
  };
  const total = investidores.reduce((s, i) => s + i.amountInvested, 0);
  const form = (
    <div className="fin-subform">
      <Field label="Nome do investidor"><input className="input" value={f.name} onChange={(e) => { setF({ ...f, name: e.target.value }); setErr(""); }} autoFocus /></Field>
      {err && <span className="fin-err">{err}</span>}
      <div className="grid cols-2" style={{ gap: 12 }}>
        <Field label="Valor investido"><MoneyInput value={f.inv} onChange={(v) => setF({ ...f, inv: v })} /></Field>
        <Field label="Lucro estimado"><MoneyInput value={f.lucroEst} onChange={(v) => setF({ ...f, lucroEst: v })} /></Field>
        <Field label="Lucro real" hint="Na venda"><MoneyInput value={f.lucroReal} onChange={(v) => setF({ ...f, lucroReal: v })} placeholder="" /></Field>
      </div>
      <div className="row gap-8" style={{ justifyContent: "flex-end" }}>
        <button type="button" className="btn btn-quiet btn-sm" onClick={() => setEd(null)}>Cancelar</button>
        <button type="button" className="btn btn-ink btn-sm" onClick={salvar}>{ed === "novo" ? "Adicionar investidor" : "Salvar investidor"}</button>
      </div>
    </div>
  );
  return (
    <div className="fin-dsec">
      <div className="row between gap-8">
        <div className="stack"><h3 className="t-h2">Investidores</h3>{investidores.length > 0 && <span className="t-xs t-muted">{fmtBRL0(total)} aportados nesta unidade</span>}</div>
        {ed !== "novo" && <button type="button" className="btn btn-line btn-sm" onClick={() => abrir(null)}><Plus size={15} />Adicionar investidor</button>}
      </div>
      {investidores.length === 0 && ed !== "novo" && <span className="t-sm t-muted">Cadastre quem investiu nesta unidade. O aporte reduz o que a construtora precisa colocar na obra.</span>}
      {investidores.length > 0 && (
        <div className="sheet divide fin-sheet-clip" style={{ boxShadow: "none" }}>
          {investidores.map((i) => (ed && ed !== "novo" && ed.id === i.id ? <div key={i.id} style={{ padding: 8 }}>{form}</div> : (
            <div key={i.id} className="fin-inv" onClick={() => abrir(i)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter") abrir(i); }}>
              <div className="ico" style={{ width: 32, height: 32, borderRadius: 8, background: "var(--sunken)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Users size={16} /></div>
              <div className="grow stack" style={{ gap: 1 }}>
                <span className="clip" style={{ fontWeight: 600 }}>{i.name}</span>
                <span className="t-xs t-muted">Lucro {i.realProfit != null ? `real ${fmtBRL0(i.realProfit)}` : `estimado ${fmtBRL0(i.estimatedProfit)}`}</span>
              </div>
              <span className="t-num" style={{ fontSize: 15 }}>{fmtBRL0(i.amountInvested)}</span>
              <div className="reveal" onClick={(e) => e.stopPropagation()}><ConfirmDelete what="investidor" onConfirm={async () => { await store.deleteInvestor(i.id); notify("Investidor excluído"); }} /></div>
            </div>
          )))}
        </div>
      )}
      {ed === "novo" && form}
    </div>
  );
}

/* ======================================================================
   RELATÓRIO EXECUTIVO (HTML standalone, pronto para imprimir/salvar em PDF)
   ====================================================================== */
function escHTML(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function finGanttSVG(ativ, pj, hoje) {
  if (!ativ.length) return "";
  const W = 720, labelW = 214, padR = 10, top = 30, rowH = 18;
  const datas = [];
  ativ.forEach((a) => { const p = pj.porId.get(a.id); datas.push(a.dataInicio, p.inicio, p.fim, p.fimPlanejado); });
  datas.push(hoje);
  const ini = datas.reduce((m, d) => (d < m ? d : m)); const fim = datas.reduce((m, d) => (d > m ? d : m));
  const span = Math.max(1, diffDaysISO(ini, fim));
  const x = (iso) => labelW + (diffDaysISO(ini, iso) / span) * (W - labelW - padR);
  const H = top + ativ.length * rowH + 6;
  let s = `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Gantt planejado x projetado" style="display:block">`;
  // meses
  const d0 = new Date(ini + "T12:00:00"); let cur = new Date(d0.getFullYear(), d0.getMonth() + 1, 1, 12);
  const marks = [];
  while (true) { const iso = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}-01`; if (iso > fim) break; marks.push(iso); cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1, 12); }
  const step = marks.length > 8 ? 2 : 1;
  marks.forEach((iso, i) => {
    const xx = x(iso).toFixed(1);
    s += `<line x1="${xx}" x2="${xx}" y1="${top - 8}" y2="${H}" stroke="#E5E7E0" stroke-width="1"/>`;
    if (i % step === 0) s += `<text x="${xx}" y="${top - 13}" font-size="9.5" fill="#7A828B" text-anchor="middle" font-weight="600">${fmtMes(iso.slice(0, 7))}</text>`;
  });
  ativ.forEach((a, i) => {
    const p = pj.porId.get(a.id);
    const y = top + i * rowH;
    if (i % 2 === 1) s += `<rect x="0" y="${y}" width="${W}" height="${rowH}" fill="#F4F5F1"/>`;
    const nome = a.nome.length > 36 ? a.nome.slice(0, 35) + "…" : a.nome;
    s += `<text x="4" y="${y + 12.5}" font-size="9.5" fill="#1C2127">${escHTML(String(a.ordem).padStart(2, "0"))}  ${escHTML(nome)}</text>`;
    const px1 = x(a.dataInicio), px2 = Math.max(px1 + 2, x(p.fimPlanejado));
    s += `<rect x="${px1.toFixed(1)}" y="${y + 3.5}" width="${(px2 - px1).toFixed(1)}" height="4.5" rx="1.5" fill="#C3C7BC"/>`;
    const qx1 = x(p.inicio), qx2 = Math.max(qx1 + 2, x(p.fim));
    const cor = a.avancoPct >= 100 ? "#13805A" : p.atrasoDias > 0 || p.atrasada ? "#CC3426" : "#2348E8";
    s += `<rect x="${qx1.toFixed(1)}" y="${y + 9.5}" width="${(qx2 - qx1).toFixed(1)}" height="5.5" rx="1.5" fill="${cor}"/>`;
    if (a.avancoPct > 0 && a.avancoPct < 100) s += `<rect x="${qx1.toFixed(1)}" y="${y + 9.5}" width="${((qx2 - qx1) * a.avancoPct / 100).toFixed(1)}" height="5.5" rx="1.5" fill="#1C2127" opacity=".28"/>`;
  });
  const hx = x(hoje).toFixed(1);
  s += `<line x1="${hx}" x2="${hx}" y1="${top - 6}" y2="${H}" stroke="#CC3426" stroke-width="1.2" stroke-dasharray="3 2"/>`;
  s += `<rect x="${(Number(hx) - 15).toFixed(1)}" y="${top - 7}" width="30" height="12" rx="3" fill="#CC3426"/><text x="${hx}" y="${top + 2}" font-size="8.5" font-weight="700" fill="#fff" text-anchor="middle">Hoje</text>`;
  s += `</svg>`;
  return s;
}

const FIN_REL_CSS = `
:root { --ink:#1C2127; --ink-2:#4E5761; --ink-3:#7A828B; --line:#DADCD4; --line-strong:#C3C7BC; --sheet-2:#F4F5F1; --sunken:#E5E7E0; --blue:#2348E8; --blue-soft:#E2E7FD; --ok:#13805A; --ok-soft:#DBF0E5; --warn:#B87908; --warn-soft:#FBEFD1; --danger:#CC3426; --danger-soft:#FAE2DE; }
* { box-sizing: border-box; }
html, body { margin: 0; }
body { background: #ECEDE8; background-image: linear-gradient(rgba(28,33,39,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(28,33,39,.05) 1px, transparent 1px); background-size: 24px 24px; color: var(--ink); font-family: 'Hanken Grotesk', system-ui, sans-serif; font-size: 9.6pt; line-height: 1.45; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.toolbar { position: sticky; top: 0; z-index: 5; background: #1C2127; color: #F2F3F4; }
.tb-in { max-width: 210mm; margin: 0 auto; display: flex; align-items: center; gap: 10px; padding: 10px 16px; flex-wrap: wrap; }
.tb-in span { flex: 1; min-width: 160px; font-weight: 600; font-size: 13px; opacity: .85; }
.tb-in button { font: 600 13px 'Hanken Grotesk', sans-serif; height: 34px; padding: 0 14px; border-radius: 8px; border: 1px solid rgba(255,255,255,.22); background: transparent; color: #fff; cursor: pointer; }
.tb-in button.pri { background: #fff; color: #1C2127; border-color: #fff; }
.doc { width: 210mm; max-width: 100%; margin: 24px auto 48px; background: #fff; padding: 14mm; box-shadow: 0 2px 6px rgba(28,33,39,.06), 0 18px 40px -16px rgba(28,33,39,.28); }
@media (max-width: 800px) { .doc { margin: 0; padding: 18px 16px; box-shadow: none; } }
.num, td.num { font-family: 'Archivo', sans-serif; font-stretch: 88%; font-variant-numeric: tabular-nums; font-weight: 650; text-align: right; white-space: nowrap; }
.placa { position: relative; border: 2px solid var(--ink); border-radius: 12px; padding: 16px 20px 0; margin-bottom: 18px; break-inside: avoid; }
.pf { position: absolute; width: 7px; height: 7px; border-radius: 50%; background: radial-gradient(circle at 35% 35%, #fff 0 18%, var(--line-strong) 20% 100%); box-shadow: inset 0 0 0 1px var(--ink-3); }
.pf.a { top: 7px; left: 7px; } .pf.b { top: 7px; right: 7px; } .pf.c { bottom: 7px; left: 7px; } .pf.d { bottom: 7px; right: 7px; }
.brand { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; font-size: 8.5pt; color: var(--ink-3); font-weight: 600; }
.brand b { font-family: 'Archivo', sans-serif; font-stretch: 75%; font-weight: 800; font-size: 11pt; color: var(--ink); }
h1 { font-family: 'Archivo', sans-serif; font-stretch: 68%; font-weight: 850; font-size: 34pt; line-height: .95; text-transform: uppercase; margin: 10px 0 4px; letter-spacing: -.005em; }
.addr { color: var(--ink-2); margin: 0 0 12px; }
.campos { display: grid; grid-template-columns: repeat(4, 1fr); border-top: 1px solid var(--line); margin: 0 -20px; }
.campos > div { padding: 8px 12px 10px 20px; }
.campos > div + div { border-left: 1px solid var(--line); padding-left: 12px; }
.campos small { display: block; font-size: 7.5pt; color: var(--ink-3); font-weight: 600; }
.campos strong { font-family: 'Archivo', sans-serif; font-stretch: 85%; font-weight: 750; font-size: 11.5pt; }
h2 { font-family: 'Archivo', sans-serif; font-stretch: 82%; font-weight: 800; font-size: 14pt; margin: 22px 0 8px; padding-bottom: 6px; border-bottom: 2px solid var(--ink); display: flex; align-items: baseline; gap: 10px; break-after: avoid; page-break-after: avoid; }
h2 .n { font-size: 9pt; color: var(--ink-3); font-weight: 700; font-stretch: 100%; }
h3 { font-family: 'Archivo', sans-serif; font-stretch: 90%; font-weight: 700; font-size: 10.5pt; margin: 14px 0 6px; break-after: avoid; page-break-after: avoid; }
p { margin: 0 0 8px; }
.lead { font-size: 10.2pt; color: var(--ink); margin-bottom: 12px; }
.tiles { display: grid; grid-template-columns: repeat(5, 1fr); border: 1px solid var(--line); border-radius: 10px; overflow: hidden; break-inside: avoid; }
.tiles.t3 { grid-template-columns: repeat(3, 1fr); }
.tiles.t4 { grid-template-columns: repeat(4, 1fr); }
.tile { padding: 10px 12px; min-width: 0; }
.tile + .tile { border-left: 1px solid var(--line); }
.tile small { display: block; font-size: 7.8pt; color: var(--ink-2); font-weight: 600; }
.tile .v { display: block; font-family: 'Archivo', sans-serif; font-stretch: 78%; font-weight: 800; font-size: 19pt; line-height: 1.1; font-variant-numeric: tabular-nums; margin: 2px 0; white-space: nowrap; }
.tile .s { display: block; font-size: 7.8pt; color: var(--ink-3); line-height: 1.35; }
.ok { color: var(--ok); } .warn { color: var(--warn); } .danger { color: var(--danger); } .muted { color: var(--ink-3); }
.bar { height: 4px; background: var(--sunken); border-radius: 2px; overflow: hidden; margin-top: 6px; }
.bar i { display: block; height: 100%; background: var(--blue); }
.bar.danger i { background: var(--danger); }
.tw { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; font-size: 8.4pt; }
thead { display: table-header-group; }
th { text-align: left; font-weight: 600; color: var(--ink-3); font-size: 7.6pt; padding: 5px 6px; border-bottom: 1px solid var(--line-strong); white-space: nowrap; background: var(--sheet-2); }
th.num { text-align: right; font-family: inherit; font-weight: 600; }
td { padding: 5px 6px; border-bottom: 1px solid var(--line); vertical-align: top; }
tr { break-inside: avoid; page-break-inside: avoid; }
tfoot td { border-top: 1.5px solid var(--ink); border-bottom: 0; font-weight: 700; }
td .sub { display: block; font-size: 7.3pt; color: var(--ink-3); font-weight: 500; font-family: 'Hanken Grotesk', sans-serif; }
.tag { display: inline-block; font-size: 7.3pt; font-weight: 700; padding: 1px 6px; border-radius: 99px; background: var(--sunken); color: var(--ink-2); white-space: nowrap; }
.tag.ok { background: var(--ok-soft); color: var(--ok); } .tag.warn { background: var(--warn-soft); color: var(--warn); } .tag.danger { background: var(--danger-soft); color: var(--danger); } .tag.blue { background: var(--blue-soft); color: #1A36B5; }
.keep { break-inside: avoid; page-break-inside: avoid; }
.gantt { border: 1px solid var(--line); border-radius: 8px; padding: 8px 8px 4px; margin-top: 10px; break-inside: avoid; }
.legend { display: flex; gap: 14px; font-size: 7.5pt; color: var(--ink-3); margin: 6px 4px 2px; flex-wrap: wrap; }
.legend i { display: inline-block; width: 14px; height: 5px; border-radius: 2px; margin-right: 5px; vertical-align: middle; }
.kv { display: flex; flex-wrap: wrap; gap: 4px 18px; font-size: 8.2pt; color: var(--ink-2); margin-top: 8px; }
.kv b { font-family: 'Archivo', sans-serif; font-stretch: 88%; color: var(--ink); font-variant-numeric: tabular-nums; }
.note { font-size: 8pt; color: var(--ink-3); margin-top: 6px; }
.empty { color: var(--ink-3); font-style: italic; padding: 6px 0; }
.foot { margin-top: 26px; padding-top: 8px; border-top: 1px solid var(--line); font-size: 7.6pt; color: var(--ink-3); display: flex; justify-content: space-between; gap: 12px; }
@page { size: A4; margin: 14mm; }
@media print {
  body { background: #fff; }
  .toolbar { display: none !important; }
  .doc { width: auto; margin: 0; padding: 0; box-shadow: none; }
  .tw { overflow: visible; }
  section { break-inside: auto; }
}
`;

function relatorioHTML(data, projectId) {
  const project = data.projects.find((p) => p.id === projectId);
  if (!project) return "";
  const hoje = todayISO();
  const m = finMetricas(data, project, hoje);
  const { t, pj } = m;
  const e = escHTML;
  const tom3 = (v, ok, warn) => (v >= ok ? "ok" : v >= warn ? "warn" : "danger");

  /* resumo em texto */
  const frases = [];
  if (pj) {
    const dif = m.avanco - pj.esperado;
    frases.push(`A obra está com <b>${fmtPct(m.avanco)}</b> de avanço físico${Math.abs(dif) < 2 ? ", em linha com o cronograma" : `, ${dif < 0 ? "abaixo" : "acima"} dos ${fmtPct(pj.esperado)} esperados para hoje`}.`);
    frases.push(pj.deltaDias > 0 ? `A entrega projetada é <b>${fmtData(pj.fimProjetado)}</b>, ${plural(pj.deltaDias, "dia", "dias")} depois da data original (${fmtData(pj.fimOriginal)}).` : `A entrega projetada mantém a data original, <b>${fmtData(pj.fimProjetado)}</b>.`);
  } else frases.push(`A obra está com <b>${fmtPct(m.avanco)}</b> de avanço físico; o cronograma ainda não foi montado.`);
  if (m.orc > 0) frases.push(`Foram gastos <b>${fmtBRL0(m.gasto)}</b>, ${fmtPct(m.consumo)} do orçamento de ${fmtBRL0(m.orc)}${m.eac ? `; no ritmo atual, a obra fecha em ${fmtBRL0(m.eac)} (${finPctS(m.desvioProj)} sobre o orçado)` : ""}.`);
  if (t.estimatedRevenue > 0) frases.push(`O lucro previsto é de <b>${fmtBRL0(t.estimatedProfit)}</b>, margem de ${finPct1(t.margemPct)} sobre a receita prevista de ${fmtBRL0(t.estimatedRevenue)}.`);
  const qual = [];
  if (m.ncAbertas.length) qual.push(`${plural(m.ncAbertas.length, "não conformidade aberta", "não conformidades abertas")}${m.ncAlta.length ? ` (${m.ncAlta.length} de gravidade alta)` : ""}`);
  if (m.pins.length - m.pinsOk.length) qual.push(plural(m.pins.length - m.pinsOk.length, "pendência de vistoria", "pendências de vistoria"));
  if (m.docsVencendo.length) qual.push(plural(m.docsVencendo.length, "documento vencendo", "documentos vencendo"));
  if (qual.length) frases.push(`Em aberto: ${qual.length > 1 ? qual.slice(0, -1).join(", ") + " e " + qual[qual.length - 1] : qual[0]}.`);

  const tile = (label, v, sub, cls = "", bar = null) => `<div class="tile"><small>${label}</small><span class="v ${cls}">${v}</span>${sub ? `<span class="s">${sub}</span>` : ""}${bar != null ? `<div class="bar ${bar > 100 ? "danger" : ""}"><i style="width:${Math.min(100, Math.max(0, bar)).toFixed(1)}%"></i></div>` : ""}</div>`;
  const tilesResumo = [
    tile("Avanço físico", fmtPct(m.avanco), pj ? `esperado ${fmtPct(pj.esperado)}${m.spi != null ? `, SPI ${finDec(m.spi)}` : ""}` : "sem cronograma", m.spi != null ? tom3(m.spi, 0.95, 0.85) : "", m.avanco),
    tile("Entrega projetada", pj ? fmtData(pj.fimProjetado) : "—", pj ? (pj.deltaDias > 0 ? `<span class="danger">${plural(pj.deltaDias, "dia", "dias")} de atraso</span>; original ${fmtData(pj.fimOriginal)}` : `no prazo; original ${fmtData(pj.fimOriginal)}`) : "", pj && pj.deltaDias > 0 ? "danger" : ""),
    tile("Gasto x orçamento", m.consumo != null ? fmtPct(m.consumo) : "—", m.orc > 0 ? `${fmtBRLshort(m.gasto)} de ${fmtBRLshort(m.orc)}${m.cpi != null ? `, CPI ${finDec(m.cpi)}` : ""}` : "sem orçamento", m.consumo > 100 ? "danger" : "", m.consumo),
    tile("Lucro previsto", fmtBRLshort(t.estimatedProfit), `receita ${fmtBRLshort(t.estimatedRevenue)}`, t.estimatedProfit < 0 ? "danger" : ""),
    tile("Margem prevista", t.estimatedRevenue > 0 ? finPct1(t.margemPct) : "—", "sobre a receita prevista", t.estimatedProfit < 0 ? "danger" : ""),
  ].join("");

  /* prazo */
  let prazoHTML = `<p class="empty">Cronograma ainda não cadastrado.</p>`;
  if (pj) {
    const linhas = m.ativ.map((a) => {
      const p = pj.porId.get(a.id);
      const sit = a.avancoPct >= 100 ? `<span class="tag ok">Concluída</span>` : p.atrasada ? `<span class="tag danger">Atrasada</span>` : p.atrasoDias > 0 ? `<span class="tag warn">Empurrada</span>` : a.avancoPct > 0 ? `<span class="tag blue">Em andamento</span>` : `<span class="tag">A iniciar</span>`;
      return `<tr><td class="num" style="text-align:left">${String(a.ordem).padStart(2, "0")}</td><td>${e(a.nome)}${a.responsavel ? `<span class="sub">${e(a.responsavel)}</span>` : ""}</td><td class="num">${fmtData(a.dataInicio)}</td><td class="num">${fmtData(p.fimPlanejado)}</td><td class="num ${p.atrasoDias > 0 ? "danger" : ""}">${fmtData(p.fim)}${p.atrasoDias > 0 ? `<span class="sub" style="text-align:right">+${p.atrasoDias} d</span>` : ""}</td><td class="num">${fmtPct(a.avancoPct)}</td><td>${sit}</td></tr>`;
    }).join("");
    prazoHTML = `
      <div class="tiles t4">
        ${tile("Entrega original", fmtData(pj.fimOriginal), `início ${fmtData(pj.inicioObra)}`)}
        ${tile("Entrega projetada", fmtData(pj.fimProjetado), pj.deltaDias > 0 ? `${plural(pj.deltaDias, "dia", "dias")} depois do previsto` : "dentro do prazo", pj.deltaDias > 0 ? "danger" : "ok")}
        ${tile("Atividades atrasadas", String(pj.atrasadas), pj.culpadas[0] ? `maior atraso: ${e(pj.culpadas[0].nome)}` : "nenhuma", pj.atrasadas ? "warn" : "ok")}
        ${tile("SPI", m.spi != null ? finDec(m.spi) : "—", m.spi != null ? `${finDec(m.spi * 10, 1)} de cada 10 dias planejados entregues` : "", m.spi != null ? tom3(m.spi, 0.95, 0.85) : "")}
      </div>
      <h3>Planejado x projetado</h3>
      <div class="gantt">${finGanttSVG(m.ativ, pj, hoje)}
        <div class="legend"><span><i style="background:#C3C7BC"></i>Planejado</span><span><i style="background:#2348E8"></i>Projetado</span><span><i style="background:#CC3426"></i>Com atraso</span><span><i style="background:#13805A"></i>Concluída</span><span><i style="background:#CC3426;height:1px;border-top:1px dashed #CC3426"></i>Hoje, ${fmtData(hoje)}</span></div>
      </div>
      <h3>Atividades</h3>
      <div class="tw"><table>
        <thead><tr><th>Nº</th><th>Atividade</th><th class="num">Início</th><th class="num">Fim planejado</th><th class="num">Fim projetado</th><th class="num">Avanço</th><th>Situação</th></tr></thead>
        <tbody>${linhas}</tbody>
      </table></div>`;
  }

  /* custos */
  const cats = finCatsOrdenadas(Object.keys(t.byCategory));
  let custosHTML = `<p class="empty">Sem orçamento nem gastos lançados.</p>`;
  if (cats.length) {
    const linhas = cats.map((c) => {
      const { previsto, real } = t.byCategory[c]; const dif = real - previsto; const pc = previsto > 0 ? (real / previsto) * 100 : null;
      return `<tr><td>${e(c)}</td><td class="num">${fmtBRL0(previsto)}</td><td class="num">${fmtBRL0(real)}</td><td class="num ${dif > 0 ? "danger" : "muted"}">${finSigned(dif)}</td><td class="num ${pc > 100 ? "danger" : ""}">${pc != null ? fmtPct(pc) : "—"}<div class="bar ${pc > 100 ? "danger" : ""}"><i style="width:${Math.min(100, pc || 0).toFixed(1)}%"></i></div></td></tr>`;
    }).join("");
    const dif = m.gasto - m.orc;
    custosHTML = `
      <div class="tw"><table>
        <thead><tr><th>Categoria</th><th class="num">Previsto</th><th class="num">Gasto</th><th class="num">Diferença</th><th class="num" style="width:80px">Consumido</th></tr></thead>
        <tbody>${linhas}</tbody>
        <tfoot><tr><td>Total</td><td class="num">${fmtBRL0(m.orc)}</td><td class="num">${fmtBRL0(m.gasto)}</td><td class="num ${dif > 0 ? "danger" : ""}">${finSigned(dif)}</td><td class="num">${m.consumo != null ? fmtPct(m.consumo) : "—"}</td></tr></tfoot>
      </table></div>
      <div class="keep" style="break-before:avoid;page-break-before:avoid"><div class="kv">
        <span>Valor agregado (avanço x orçamento) <b>${fmtBRL0(m.ev)}</b></span>
        <span>CPI <b>${m.cpi != null ? finDec(m.cpi) : "—"}</b></span>
        <span>Estimativa no término <b>${m.eac ? fmtBRL0(m.eac) : "—"}</b></span>
        <span>Capital de investidores <b>${fmtBRL0(t.totalInvested)}</b></span>
        <span>Aporte líquido da construtora (orçado) <b>${fmtBRL0(t.builderNetCost)}</b></span>
      </div>
      <p class="note">Diferença negativa é saldo ainda disponível na categoria. CPI abaixo de 1 indica que cada real gasto rendeu menos que um real de obra executada.</p></div>`;
  }

  /* unidades */
  const bk = unitCostBreakdown(data, projectId);
  let unidadesHTML = `<p class="empty">Nenhuma unidade cadastrada.</p>`;
  if (bk.rows.length) {
    const tot = bk.rows.reduce((a, r) => ({ area: a.area + (Number(r.unit.area) || 0), obra: a.obra + r.obraEst, doc: a.doc + r.doc, corr: a.corr + r.corr, est: a.est + r.custoEstimado, real: a.real + r.custoReal, venda: a.venda + r.venda, margem: a.margem + r.margem }), { area: 0, obra: 0, doc: 0, corr: 0, est: 0, real: 0, venda: 0, margem: 0 });
    const linhas = bk.rows.map((r) => {
      const u = r.unit; const mp = r.venda > 0 ? (r.margem / r.venda) * 100 : null;
      return `<tr><td><b>${e(u.code)}</b><span class="sub">${e(FIN_TIPO[u.type] || u.type)}, ${e((UNIT_STATUS[u.status] || u.status).toLowerCase())}</span></td><td class="num">${u.area ? `${finDec(u.area, 0)} m²` : "—"}</td><td class="num">${fmtBRL0(r.obraEst)}</td><td class="num">${fmtBRL0(r.doc)}</td><td class="num">${fmtBRL0(r.corr)}</td><td class="num">${fmtBRL0(r.custoEstimado)}</td><td class="num">${fmtBRL0(r.custoReal)}</td><td class="num">${fmtBRL0(r.venda)}<span class="sub" style="text-align:right">${u.salePriceReal != null ? "real" : "estimada"}</span></td><td class="num ${r.margem < 0 ? "danger" : ""}">${fmtBRL0(r.margem)}${mp != null ? `<span class="sub" style="text-align:right">${finPct1(mp)}</span>` : ""}</td></tr>`;
    }).join("");
    unidadesHTML = `
      <div class="tw"><table>
        <thead><tr><th>Unidade</th><th class="num">Área</th><th class="num">Obra (rateio)</th><th class="num">Documentação</th><th class="num">Corretagem</th><th class="num">Custo estimado</th><th class="num">Custo real</th><th class="num">Venda</th><th class="num">Margem</th></tr></thead>
        <tbody>${linhas}</tbody>
        <tfoot><tr><td>Total</td><td class="num">${tot.area ? `${finDec(tot.area, 0)} m²` : "—"}</td><td class="num">${fmtBRL0(tot.obra)}</td><td class="num">${fmtBRL0(tot.doc)}</td><td class="num">${fmtBRL0(tot.corr)}</td><td class="num">${fmtBRL0(tot.est)}</td><td class="num">${fmtBRL0(tot.real)}</td><td class="num">${fmtBRL0(tot.venda)}</td><td class="num ${tot.margem < 0 ? "danger" : ""}">${fmtBRL0(tot.margem)}</td></tr></tfoot>
      </table></div>
      <p class="note">${bk.criterio === "area" ? `Custo da obra rateado pela área de cada unidade (total de ${finArea(bk.totalArea)}).` : "Custo da obra dividido igualmente entre as unidades (falta a área de alguma delas)."} Custo real considera o gasto lançado até ${fmtData(hoje)}. Margem = venda menos custo estimado.</p>`;
  }

  /* qualidade */
  const ncLinhas = m.ncAbertas.map((n) => `<tr><td>${e(n.titulo)}<span class="sub">${e(NC_CATEGORIAS[n.categoria] || n.categoria || "")}</span></td><td><span class="tag ${n.gravidade === "alta" ? "danger" : n.gravidade === "media" ? "warn" : ""}">${e(NC_GRAVIDADE[n.gravidade] || n.gravidade || "—")}</span></td><td>${e(n.responsavel || "—")}</td><td class="num ${n.prazo && n.prazo < hoje ? "danger" : ""}">${fmtData(n.prazo)}</td><td>${e(NC_STATUS[n.status] || n.status)}</td></tr>`).join("");
  const pinsAbertos = m.pins.filter((p) => p.status !== "ok");
  const pinLinhas = pinsAbertos.map((p) => { const venc = p.status === "atraso" || (p.prazo && p.prazo < hoje); return `<tr><td>${e(p.item)}</td><td>${e(p.responsavel || "—")}</td><td class="num ${venc ? "danger" : ""}">${fmtData(p.prazo)}</td><td><span class="tag ${venc ? "danger" : "warn"}">${venc ? "Atrasada" : "Pendente"}</span></td></tr>`; }).join("");
  const reqPend = m.reqs.filter((r) => r.status !== "concluido");
  const qualidadeHTML = `
    <div class="tiles t3">
      ${tile("Não conformidades abertas", String(m.ncAbertas.length), `${m.ncAlta.length} de gravidade alta, ${m.ncVencidas.length} com prazo vencido`, m.ncAlta.length || m.ncVencidas.length ? "danger" : m.ncAbertas.length ? "warn" : "ok")}
      ${tile("Pendências de vistoria", m.pins.length ? fmtPct((m.pinsOk.length / m.pins.length) * 100) : "—", m.pins.length ? `resolvidas: ${m.pinsOk.length} de ${m.pins.length}; ${m.pinsPend} pendentes, ${m.pinsAtraso.length} atrasadas` : "nenhuma marcada", m.pins.length ? tom3((m.pinsOk.length / m.pins.length) * 100, 90, 60) : "")}
      ${tile("Checklist de requisitos", m.reqPct != null ? fmtPct(m.reqPct) : "—", m.reqs.length ? `${m.reqOk.length} de ${m.reqs.length} concluídos` : "checklist não carregado", "", m.reqPct)}
    </div>
    ${m.ncAbertas.length ? `<h3>Não conformidades abertas</h3><div class="tw"><table><thead><tr><th>Não conformidade</th><th>Gravidade</th><th>Responsável</th><th class="num">Prazo</th><th>Situação</th></tr></thead><tbody>${ncLinhas}</tbody></table></div>` : ""}
    ${pinsAbertos.length ? `<h3>Pendências de vistoria em aberto</h3><div class="tw"><table><thead><tr><th>Pendência</th><th>Responsável</th><th class="num">Prazo</th><th>Situação</th></tr></thead><tbody>${pinLinhas}</tbody></table></div>` : ""}
    ${reqPend.length ? `<h3>Requisitos pendentes</h3><div class="tw"><table><thead><tr><th>Requisito</th><th>Órgão</th><th>Situação</th><th class="num">Prazo</th></tr></thead><tbody>${reqPend.map((r) => `<tr><td>${e(r.item)}</td><td>${e(REQ_CATEGORIAS[r.categoria] || r.categoria || "")}</td><td>${e(REQ_STATUS[r.status] || r.status)}</td><td class="num">${fmtData(r.prazo)}</td></tr>`).join("")}</tbody></table></div>` : ""}`;

  /* documentos */
  const docsHTML = m.docsVencendo.length
    ? `<div class="tw"><table><thead><tr><th>Documento</th><th>Categoria</th><th class="num">Validade</th><th>Situação</th></tr></thead><tbody>${m.docsVencendo.map((d) => { const dd = diffDaysISO(hoje, d.validade); return `<tr><td>${e(d.titulo)}${d.descricao ? `<span class="sub">${e(d.descricao)}</span>` : ""}</td><td>${e(DOC_CATEGORIAS[d.categoria] || d.categoria || "")}</td><td class="num">${fmtData(d.validade)}</td><td><span class="tag ${dd < 0 ? "danger" : "warn"}">${dd < 0 ? `Vencido há ${plural(-dd, "dia", "dias")}` : dd === 0 ? "Vence hoje" : `Vence em ${plural(dd, "dia", "dias")}`}</span></td></tr>`; }).join("")}</tbody></table></div>`
    : `<p class="empty">Nenhum documento vence nos próximos 30 dias.</p>`;

  const nomeArq = `relatorio-${finSlug(project.name)}-${hoje}.html`;
  const titulo = `Relatório executivo, ${project.name}, ${fmtData(hoje)}`;
  const js = `document.getElementById("pc-dl").addEventListener("click",function(){var h="<!doctype html>\\n"+document.documentElement.outerHTML;var b=new Blob([h],{type:"text/html;charset=utf-8"});var a=document.createElement("a");a.href=URL.createObjectURL(b);a.download=${JSON.stringify(nomeArq).replace(/</g, "\\u003c")};document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);a.remove();},1500);});`;

  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${e(titulo)}</title>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="${e(FONTS_HREF)}">
<style>${FIN_REL_CSS}</style></head>
<body>
<div class="toolbar"><div class="tb-in"><span>Relatório executivo, ${e(project.name)}</span><button type="button" class="pri" onclick="window.print()">Imprimir ou salvar em PDF</button><button type="button" id="pc-dl">Baixar HTML</button></div></div>
<main class="doc">
  <header class="placa">
    <i class="pf a"></i><i class="pf b"></i><i class="pf c"></i><i class="pf d"></i>
    <div class="brand"><b>Pascaretta Construtora</b><span>Relatório executivo da obra</span></div>
    <h1>${e(project.name)}</h1>
    ${project.address ? `<p class="addr">${e(project.address)}</p>` : `<p class="addr"></p>`}
    <div class="campos">
      <div><small>Município</small><strong>${e(project.municipio || "Paulista/PE")}</strong></div>
      <div><small>Financiamento</small><strong>${e(project.financiamento || "MCMV")}</strong></div>
      <div><small>Situação</small><strong>${e(PROJECT_STATUS[project.status] || project.status || "—")}</strong></div>
      <div><small>Emitido em</small><strong>${fmtDataLonga(hoje)}</strong></div>
    </div>
  </header>

  <section><h2><span class="n">01</span>Resumo executivo</h2>
    <p class="lead">${frases.join(" ")}</p>
    <div class="tiles">${tilesResumo}</div>
  </section>

  <section><h2><span class="n">02</span>Prazo</h2>${prazoHTML}</section>
  <section><h2><span class="n">03</span>Custos: previsto x gasto</h2>${custosHTML}</section>
  <section><h2><span class="n">04</span>Custo por unidade</h2>${unidadesHTML}</section>
  <section><h2><span class="n">05</span>Qualidade</h2>${qualidadeHTML}</section>
  <section><h2><span class="n">06</span>Documentos vencendo em 30 dias</h2>${docsHTML}</section>

  <div class="foot"><span>Pascaretta Construtora, ${e(project.name)}</span><span>Gerado em ${fmtDataLonga(hoje)} com os dados do app. Valores em reais.</span></div>
</main>
<script>${js}</script>
</body></html>`;
}

function abrirRelatorio(data, projectId) {
  const html = relatorioHTML(data, projectId);
  if (!html) return;
  const url = URL.createObjectURL(new Blob([html], { type: "text/html;charset=utf-8" }));
  const w = window.open(url, "_blank");
  if (!w) {
    const a = document.createElement("a");
    a.href = url; a.target = "_blank"; a.rel = "noopener";
    document.body.appendChild(a); a.click(); a.remove();
  }
  setTimeout(() => URL.revokeObjectURL(url), 5 * 60 * 1000);
}

/* ======================= 30-obra.jsx ======================= */
/* Página da obra: "placa da obra" + navegação em quatro áreas. */
/* @icons FileText Pencil ImagePlus MapPin CalendarClock Home Gauge */

const OBRA_GRUPOS = [
  { k: "visao", l: "Visão geral", abas: [["resumo", "Resumo"], ["kpis", "Indicadores"]] },
  { k: "execucao", l: "Execução", abas: [["cronograma", "Cronograma"], ["etapas", "Avanço"], ["vistoria", "Vistoria"], ["fotos", "Fotos"]] },
  { k: "financeiro", l: "Financeiro", abas: [["orcamento", "Orçamento"], ["custos", "Gastos"], ["unidades", "Unidades"]] },
  { k: "qualidade", l: "Qualidade", abas: [["naoconf", "Não conformidades"], ["requisitos", "Requisitos"], ["docs", "Documentos"]] },
];
const grupoDaAba = (aba) => OBRA_GRUPOS.find((g) => g.abas.some(([k]) => k === aba)) || OBRA_GRUPOS[0];

const OBRA_CSS = `
.placa { position: relative; display: grid; grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.25fr); border: 2px solid var(--ink); border-radius: 18px; background: var(--sheet); overflow: hidden; box-shadow: var(--shadow-2); }
.placa-foto { position: relative; min-height: 300px; background: var(--sunken); }
.placa-foto img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.placa-foto .troca { position: absolute; left: 12px; bottom: 12px; background: rgba(16,19,22,.72); color: #fff; border: 0; backdrop-filter: blur(6px); }
.placa-body { padding: 26px 28px 24px; display: flex; flex-direction: column; gap: 16px; border-left: 2px solid var(--ink); }
.placa-nome { font-family: 'Archivo', sans-serif; font-stretch: 68%; font-weight: 850; font-size: clamp(38px, 5.2vw, 66px); line-height: .92; letter-spacing: -.005em; margin: 0; text-transform: uppercase; }
.placa-campos { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); }
.placa-campos > div { padding: 12px 14px 12px 0; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.placa-campos > div + div { padding-left: 14px; border-left: 1px solid var(--line); }
.placa-campos small { font-size: 12px; color: var(--ink-3); font-weight: 600; }
.placa-campos strong { font-family: 'Archivo', sans-serif; font-stretch: 85%; font-size: 18px; font-weight: 750; font-variant-numeric: tabular-nums; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
:root[data-theme="dark"] .placa, :root[data-theme="dark"] .placa-body { border-color: #46505B; }
.parafuso { position: absolute; width: 9px; height: 9px; border-radius: 50%; background: radial-gradient(circle at 35% 35%, #fff 0 18%, var(--line-strong) 20% 100%); box-shadow: inset 0 0 0 1px var(--ink-3); z-index: 2; }
.parafuso::after { content: ""; position: absolute; left: 1px; right: 1px; top: 4px; height: 1px; background: var(--ink-3); transform: rotate(35deg); }
@media (max-width: 860px) {
  .placa { grid-template-columns: 1fr; }
  .placa-foto { min-height: 0; aspect-ratio: 16 / 9; }
  .placa-body { border-left: 0; border-top: 2px solid var(--ink); padding: 18px 16px; }
  .placa-campos { grid-template-columns: repeat(2, minmax(0,1fr)); }
  .placa-campos > div:nth-child(3) { padding-left: 0; border-left: 0; }
  .placa-campos > div:nth-child(n+3) { border-top: 1px solid var(--line); }
}
.obra-nav { position: sticky; top: 0; z-index: 20; padding: 14px 0 0; margin: 20px 0 22px; background: linear-gradient(var(--paper) 78%, transparent); }
@media (max-width: 979px) { .obra-nav { top: 57px; } }
`;

function avancoFisico(data, projectId, project) {
  const ativ = data.cronograma.filter((a) => a.projectId === projectId);
  if (ativ.length) return { pct: cronogramaProjecao(ativ).avanco, fonte: "cronograma" };
  const et = data.etapas.filter((e) => e.projectId === projectId);
  if (et.length) return { pct: (et.filter((e) => e.status === "concluida").length / et.length) * 100, fonte: "etapas" };
  return { pct: project.progressoPct || 0, fonte: "manual" };
}

function ObraPage({ store, route, go, onEditar, onTourObra }) {
  useLayoutEffect(() => {
    let s = document.getElementById("pc-obra-css");
    if (!s) { s = document.createElement("style"); s.id = "pc-obra-css"; document.head.appendChild(s); }
    s.textContent = OBRA_CSS;
  }, []);
  const project = store.data.projects.find((p) => p.id === route.id);
  const capaUrl = useSignedUrl(project?.capaPath);
  const alertas = useMemo(() => (project ? obraAlertas(store.data, project.id) : []), [store.data, project]);
  const ativ = useMemo(() => store.data.cronograma.filter((a) => a.projectId === route.id), [store.data.cronograma, route.id]);
  const proj = useMemo(() => (ativ.length ? cronogramaProjecao(ativ) : null), [ativ]);
  useEffect(() => { if (project) onTourObra?.(); }, [project?.id]); // eslint-disable-line

  if (!project) {
    return <EmptyState icon={Building2} title="Obra não encontrada" text="Ela pode ter sido excluída." action={<button className="btn btn-ink" onClick={() => go({ page: "obras" })}>Ver obras</button>} />;
  }
  const aba = route.aba || "resumo";
  const grupo = grupoDaAba(aba);
  const setAba = (k) => go({ page: "obra", id: project.id, aba: k }, { replace: true });
  const contAlertas = (g) => alertas.filter((a) => g.abas.some(([k]) => k === a.aba) && a.tom === "danger").length;
  const av = avancoFisico(store.data, project.id, project);
  const unidades = store.data.units.filter((u) => u.projectId === project.id);
  const props = { store, project, go, setAba };

  return (
    <div>
      <button className="btn btn-quiet btn-sm mb-12" style={{ marginLeft: -10 }} onClick={() => go({ page: "obras" })}><ArrowLeft size={16} />Obras</button>

      <div className="placa" data-tour="obra-placa">
        <span className="parafuso" style={{ top: 10, left: 10 }} /><span className="parafuso" style={{ top: 10, right: 10 }} />
        <span className="parafuso" style={{ bottom: 10, left: 10 }} /><span className="parafuso" style={{ bottom: 10, right: 10 }} />
        <div className="placa-foto">
          {capaUrl ? <img src={capaUrl} alt={`Foto da obra ${project.name}`} /> : (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink-3)", flexDirection: "column", gap: 8 }}>
              <ImagePlus size={28} /><span className="t-sm">Adicione uma foto da obra</span>
            </div>
          )}
          <FilePick className="btn btn-sm troca" onFile={(f) => store.setCapa(project.id, f)}><Camera size={15} />{project.capaPath ? "Trocar foto" : "Adicionar foto"}</FilePick>
        </div>
        <div className="placa-body">
          <div className="row gap-8 wrap">
            <Pill tone={project.status === "concluida" ? "ok" : project.status === "pausada" ? "warn" : project.status === "planejamento" ? undefined : "blue"}>{PROJECT_STATUS[project.status] || project.status}</Pill>
            <span className="t-sm t-soft row gap-4"><MapPin size={14} />{project.municipio || "Paulista/PE"}</span>
          </div>
          <div>
            <h1 className="placa-nome">{project.name}</h1>
            {project.address && <div className="t-soft mt-8">{project.address}</div>}
          </div>
          <div className="placa-campos">
            <div><small>Financiamento</small><strong>{project.financiamento || "MCMV"}</strong></div>
            <div><small>Início</small><strong>{proj?.inicioObra ? fmtData(proj.inicioObra) : project.startDate ? fmtData(project.startDate) : "—"}</strong></div>
            <div>
              <small>Entrega prevista</small>
              <strong style={proj && proj.deltaDias > 0 ? { color: "var(--danger)" } : undefined}>{proj ? fmtData(proj.fimProjetado) : project.endDateEstimated ? fmtData(project.endDateEstimated) : "—"}</strong>
              {proj && proj.deltaDias > 0 && <span className="t-xs t-danger" style={{ fontWeight: 600 }}>{plural(proj.deltaDias, "dia", "dias")} de atraso</span>}
            </div>
            <div><small>Unidades</small><strong>{unidades.length}</strong></div>
          </div>
          <div className="stack gap-6">
            <div className="row between t-sm"><span style={{ fontWeight: 600 }}>Avanço físico</span><span className="t-num" style={{ fontSize: 18 }}>{fmtPct(av.pct)}</span></div>
            <Ruler pct={av.pct} label="Avanço físico da obra" />
          </div>
          <div className="row gap-8 wrap" style={{ marginTop: "auto" }}>
            <button className="btn btn-ink" onClick={() => abrirRelatorio(store.data, project.id)} data-tour="obra-relatorio"><FileText size={17} />Relatório executivo</button>
            <button className="btn btn-line" onClick={() => onEditar(project)}><Pencil size={16} />Editar obra</button>
          </div>
        </div>
      </div>

      <div className="obra-nav" data-tour="obra-grupos">
        <Segmented ariaLabel="Áreas da obra" value={grupo.k} onChange={(k) => setAba(OBRA_GRUPOS.find((g) => g.k === k).abas[0][0])}
          options={OBRA_GRUPOS.map((g) => ({ value: g.k, label: g.l, count: contAlertas(g), tour: `grupo-${g.k}` }))} />
        <div className="mt-8"><UTabs value={aba} onChange={setAba} options={grupo.abas.map(([k, l]) => ({ value: k, label: l }))} /></div>
      </div>

      <div key={aba} style={{ animation: "fadeIn .25s ease backwards" }}>
        {aba === "resumo" && <ObraResumo {...props} alertas={alertas} />}
        {aba === "kpis" && <ObraKPIs {...props} />}
        {aba === "cronograma" && <ObraCronograma {...props} />}
        {aba === "etapas" && <ObraEtapas {...props} />}
        {aba === "vistoria" && <ObraVistoria {...props} />}
        {aba === "fotos" && <ObraFotos {...props} />}
        {aba === "orcamento" && <ObraOrcamento {...props} />}
        {aba === "custos" && <ObraCustos {...props} />}
        {aba === "unidades" && <ObraUnidades {...props} />}
        {aba === "naoconf" && <ObraNaoConformidades {...props} />}
        {aba === "requisitos" && <ObraRequisitos {...props} />}
        {aba === "docs" && <ObraDocumentos {...props} />}
      </div>
    </div>
  );
}

/* ======================= 40-painel-qualidade.jsx ======================= */
/* Painel da construtora, lista de obras, cadastro de obra e a área Qualidade
   (não conformidades, requisitos e documentos). */
/* @icons Plus Pencil ChevronRight MapPin ImagePlus AlertTriangle CheckCircle2 Building2 User CalendarClock ClipboardCheck ListPlus FileText FileImage File FileX2 ExternalLink FolderOpen ShieldAlert Loader2 Camera */

const PQ_CSS = `
.pq-n { font-size: 12px; font-weight: 600; color: var(--ink-3); font-variant-numeric: tabular-nums; }
.seg-btn[aria-selected="true"] .pq-n { color: var(--ink-2); }
.pq-err { font-size: 12px; color: var(--danger); font-weight: 600; }

/* faixa de indicadores numa folha só */
.pq-kpis { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); }
.pq-kpis > div { padding: 18px 20px 20px; min-width: 0; }
.pq-kpis > div + div { border-left: 1px solid var(--line); }
.pq-kpis.c3 { grid-template-columns: repeat(3, minmax(0,1fr)); }
@media (max-width: 900px) {
  .pq-kpis, .pq-kpis.c3 { grid-template-columns: repeat(2, minmax(0,1fr)); }
  .pq-kpis > div:nth-child(odd) { border-left: 0; }
  .pq-kpis > div:nth-child(n+3) { border-top: 1px solid var(--line); }
}
@media (max-width: 560px) { .pq-kpis > div { padding: 14px 14px 16px; } }

/* painel */
.pq-duo { display: grid; grid-template-columns: minmax(0, 5fr) minmax(0, 7fr); gap: 16px; align-items: stretch; }
.pq-duo > div { display: flex; flex-direction: column; min-width: 0; }
.pq-duo .sheet { flex: 1; }
@media (max-width: 900px) { .pq-duo { grid-template-columns: 1fr; } }
.pq-alert { position: relative; display: flex; align-items: center; gap: 12px; width: 100%; text-align: left; border: 0; background: transparent; padding: 12px 14px 12px 20px; min-height: 64px; transition: background-color .15s; }
.pq-alert:hover { background: var(--sheet-2); }
.pq-alert:first-child { border-radius: 16px 16px 0 0; } .pq-alert:last-child { border-radius: 0 0 16px 16px; } .pq-alert:only-child { border-radius: 16px; }
.pq-rail { position: absolute; left: 0; top: 12px; bottom: 12px; width: 3px; border-radius: 0 3px 3px 0; background: var(--line-strong); }
.pq-rail.danger { background: var(--danger); } .pq-rail.warn { background: var(--warn); } .pq-rail.ok { background: var(--ok); }
.pq-alert-obra { font-size: 12px; font-weight: 600; color: var(--ink-3); }
.pq-chart-labels { display: grid; padding: 0 0.625%; margin-top: -20px; position: relative; }
.pq-chart-labels span { text-align: center; font-size: 12px; font-weight: 600; color: var(--ink-3); white-space: nowrap; }
.pq-chart-labels span.cur { color: var(--ink); }

/* linhas de obra no painel */
.pq-orow { display: grid; grid-template-columns: 64px minmax(0,1.5fr) 116px minmax(0,1.1fr) 112px 140px 16px; grid-template-areas: "img name st av ent gasto chev"; align-items: center; column-gap: 18px; width: 100%; border: 0; background: transparent; text-align: left; padding: 12px 16px; transition: background-color .15s; }
.pq-orow:hover { background: var(--sheet-2); }
.pq-orow.head { padding-top: 10px; padding-bottom: 8px; font-size: 12px; font-weight: 600; color: var(--ink-3); }
.pq-orow.head:hover { background: transparent; }
.pq-orows > .pq-orow:last-child { border-radius: 0 0 16px 16px; }
.pq-orow .img { grid-area: img; width: 64px; height: 48px; border-radius: 8px; overflow: hidden; background: var(--sunken); border: 1px solid var(--line); display: flex; align-items: center; justify-content: center; color: var(--ink-3); }
.pq-orow .img img { width: 100%; height: 100%; object-fit: cover; display: block; }
.pq-orow .nm { grid-area: name; min-width: 0; } .pq-orow .st { grid-area: st; } .pq-orow .av { grid-area: av; min-width: 0; }
.pq-orow .ent { grid-area: ent; min-width: 0; } .pq-orow .gs { grid-area: gasto; min-width: 0; } .pq-orow .chev { grid-area: chev; color: var(--ink-3); }
.pq-orow .v { font-family: 'Archivo', sans-serif; font-stretch: 86%; font-weight: 700; font-size: 15px; font-variant-numeric: tabular-nums; white-space: nowrap; }
.pq-lbl { display: none; font-size: 12px; font-weight: 600; color: var(--ink-3); }
@media (max-width: 760px) {
  .pq-orow { grid-template-columns: 56px minmax(0,1fr) minmax(0,1fr) minmax(0,1fr); grid-template-areas: "img name name st" "av av ent gasto"; row-gap: 12px; column-gap: 12px; padding: 14px; }
  .pq-orow.head, .pq-orow .chev { display: none; }
  .pq-orow .img { width: 56px; height: 42px; }
  .pq-orow .st { justify-self: end; }
  .pq-lbl { display: block; }
}

/* cartões de obra */
.pq-cards { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 16px; }
@media (max-width: 760px) { .pq-cards { grid-template-columns: 1fr; } }
.pq-card { display: flex; flex-direction: column; overflow: hidden; cursor: pointer; transition: border-color .15s, box-shadow .2s; text-align: left; }
.pq-card:hover { border-color: var(--line-strong); box-shadow: var(--shadow-2); }
.pq-card-foto { position: relative; aspect-ratio: 2.35 / 1; background: var(--sunken); border-bottom: 1px solid var(--line); }
.pq-card-foto img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.pq-card-foto .vazio { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; color: var(--ink-3); font-size: 13px; background: repeating-linear-gradient(135deg, transparent 0 10px, var(--grid) 10px 11px); }
.pq-card-body { padding: 16px 20px 18px; display: flex; flex-direction: column; gap: 14px; flex: 1; }
.pq-placa { font-family: 'Archivo', sans-serif; font-stretch: 68%; font-weight: 850; font-size: 36px; line-height: .92; letter-spacing: -.005em; text-transform: uppercase; margin: 0; overflow-wrap: anywhere; }
.pq-facts { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); }
.pq-facts > div { padding: 10px 12px 10px 0; display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.pq-facts > div + div { padding-left: 12px; border-left: 1px solid var(--line); }
.pq-facts small { font-size: 12px; color: var(--ink-3); font-weight: 600; }
.pq-facts strong { font-family: 'Archivo', sans-serif; font-stretch: 85%; font-size: 18px; font-weight: 750; font-variant-numeric: tabular-nums; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pq-facts span { font-size: 12px; color: var(--ink-3); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
@media (max-width: 440px) {
  .pq-card-body { padding: 14px 16px 16px; }
  .pq-facts > div { padding-right: 8px; } .pq-facts > div + div { padding-left: 10px; }
  .pq-facts strong { font-size: 16px; }
}

/* linhas da qualidade */
.pq-row { position: relative; display: grid; grid-template-columns: minmax(0,1fr) auto auto; grid-template-areas: "main thumb act"; align-items: start; gap: 8px 16px; padding: 14px 16px 14px 20px; }
.pq-row .main { grid-area: main; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
.pq-row .thumbc { grid-area: thumb; }
.pq-row .act { grid-area: act; display: flex; align-items: center; gap: 4px; justify-content: flex-end; flex-wrap: wrap; }
.pq-row .ttl { font-weight: 650; font-size: 15px; line-height: 1.35; }
.pq-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 16px; font-size: 13px; color: var(--ink-2); }
.pq-meta > span { display: inline-flex; align-items: center; gap: 5px; min-width: 0; }
.pq-meta svg { color: var(--ink-3); flex-shrink: 0; }
.pq-note { margin-top: 6px; padding: 8px 12px; border-radius: 10px; background: var(--sheet-2); border: 1px solid var(--line); font-size: 13px; color: var(--ink-2); }
.pq-note b { display: block; font-size: 12px; color: var(--ink-3); font-weight: 600; margin-bottom: 1px; }
@media (max-width: 720px) {
  .pq-row { grid-template-columns: minmax(0,1fr) auto; grid-template-areas: "main thumb" "act act"; }
  .pq-row .act { justify-content: flex-start; }
}

/* requisitos */
.pq-req { display: grid; grid-template-columns: auto minmax(0,1fr) 156px auto; grid-template-areas: "chk main sel act"; align-items: start; gap: 6px 14px; padding: 12px 12px 12px 16px; }
.pq-req .chk { grid-area: chk; padding-top: 1px; } .pq-req .main { grid-area: main; min-width: 0; display: flex; flex-direction: column; gap: 2px; padding-top: 5px; }
.pq-req .sel { grid-area: sel; } .pq-req .act { grid-area: act; display: flex; align-items: center; gap: 2px; }
.pq-req .ttl { font-weight: 600; font-size: 15px; line-height: 1.35; }
.pq-req.na .ttl { color: var(--ink-3); text-decoration: line-through; text-decoration-color: var(--line-strong); }
@media (max-width: 720px) {
  .pq-req { grid-template-columns: auto minmax(0,1fr) auto; grid-template-areas: "chk main act" ". sel sel"; }
  .pq-req .sel { max-width: 200px; }
}
.pq-conf { display: grid; grid-template-columns: minmax(0,1fr) auto; gap: 16px 32px; align-items: end; }
@media (max-width: 720px) { .pq-conf { grid-template-columns: 1fr; } }
.pq-legend { display: flex; flex-wrap: wrap; gap: 4px 18px; font-size: 13px; color: var(--ink-2); }
.pq-legend i { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 6px; vertical-align: 1px; }

/* documentos */
.pq-doc { display: grid; grid-template-columns: 40px minmax(0,1fr) auto auto; grid-template-areas: "ico main val act"; align-items: center; gap: 6px 14px; padding: 12px 12px 12px 16px; min-height: 64px; }
.pq-doc .ico { grid-area: ico; width: 40px; height: 40px; border-radius: 10px; background: var(--sheet-2); border: 1px solid var(--line); display: flex; align-items: center; justify-content: center; color: var(--ink-2); }
.pq-doc .ico.none { color: var(--ink-3); border-style: dashed; background: transparent; }
.pq-doc .main { grid-area: main; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.pq-doc .val { grid-area: val; } .pq-doc .act { grid-area: act; display: flex; align-items: center; gap: 2px; }
@media (max-width: 720px) {
  .pq-doc { grid-template-columns: 40px minmax(0,1fr) auto; grid-template-areas: "ico main act" ". val val"; align-items: start; }
  .pq-doc .val:empty { display: none; }
}
.pq-danger-zone { margin-top: 8px; padding-top: 16px; border-top: 1px solid var(--line); display: flex; align-items: center; justify-content: space-between; gap: 12px; }
`;

function pqUseCss() {
  useLayoutEffect(() => {
    let s = document.getElementById("pc-qual-css");
    if (!s) { s = document.createElement("style"); s.id = "pc-qual-css"; document.head.appendChild(s); }
    s.textContent = PQ_CSS;
  }, []);
}

/* ---------- helpers ---------- */
const PQ_STATUS_ORDEM = { em_andamento: 0, planejamento: 1, pausada: 2, concluida: 3 };
function pqStatusTone(s) { return s === "concluida" ? "ok" : s === "pausada" ? "warn" : s === "planejamento" ? undefined : "blue"; }
function pqSegLabel(label, n) { return <>{label}<span className="pq-n">{n}</span></>; }
function pqObraInfo(data, p) {
  const t = projectTotals(data, p.id);
  const av = avancoFisico(data, p.id, p);
  const ativ = data.cronograma.filter((a) => a.projectId === p.id);
  const pj = ativ.length ? cronogramaProjecao(ativ) : null;
  const entrega = pj ? pj.fimProjetado : p.endDateEstimated || null;
  const atraso = pj && pj.deltaDias > 0 ? pj.deltaDias : 0;
  const alertas = obraAlertas(data, p.id);
  const gastoPct = t.totalEstimatedCost > 0 ? (t.totalActualCost / t.totalEstimatedCost) * 100 : null;
  return { t, av, entrega, atraso, alertas, serios: alertas.filter((a) => a.tom === "danger").length, gastoPct };
}
function pqUseFormFor(item, init) {
  const last = useRef(item);
  if (item) last.current = item;
  const [f, setF] = useState(() => (item ? init(item) : {}));
  const [tried, setTried] = useState(false);
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (item) { setF(init(item)); setTried(false); setSaving(false); } }, [item]); // eslint-disable-line
  const set = (k) => (e) => { const v = e && e.target ? e.target.value : e; setF((x) => ({ ...x, [k]: v })); };
  return { cur: item || last.current, f, setF, set, tried, setTried, saving, setSaving };
}
function PqSave({ saving, children, onClick }) {
  return <button type="button" className="btn btn-ink" disabled={saving} onClick={onClick}>{saving && <Loader2 size={16} className="spin" />}{children}</button>;
}

/* ============================================================
   Painel
   ============================================================ */
function Painel({ store, go, onNovaObra }) {
  pqUseCss();
  const data = store.data;
  const hoje = todayISO();
  const wide = useIsDesktop(700);
  const projects = useMemo(() => [...data.projects].sort((a, b) => (PQ_STATUS_ORDEM[a.status] ?? 9) - (PQ_STATUS_ORDEM[b.status] ?? 9)), [data.projects]);
  const infos = useMemo(() => new Map(projects.map((p) => [p.id, pqObraInfo(data, p)])), [data, projects]);

  const tot = useMemo(() => {
    let gasto = 0, orc = 0, lucro = 0, vgv = 0;
    infos.forEach(({ t }) => { gasto += t.totalActualCost; orc += t.totalEstimatedCost; lucro += t.estimatedProfit; vgv += t.estimatedRevenue; });
    return { gasto, orc, lucro, vgv, exec: projects.filter((p) => p.status === "em_andamento").length };
  }, [infos, projects]);

  const alertas = useMemo(() => {
    const out = [];
    projects.forEach((p) => infos.get(p.id).alertas.forEach((a, i) => out.push({ ...a, obra: p, k: `${p.id}-${i}` })));
    return out.sort((a, b) => (a.tom === "danger" ? 0 : 1) - (b.tom === "danger" ? 0 : 1));
  }, [projects, infos]);

  const nMeses = wide ? 12 : 6;
  const meses = useMemo(() => {
    const d = new Date(hoje + "T12:00:00"); const out = [];
    for (let i = nMeses - 1; i >= 0; i--) { const x = new Date(d.getFullYear(), d.getMonth() - i, 1); out.push(`${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}`); }
    const soma = Object.fromEntries(out.map((m) => [m, 0]));
    data.actualCosts.forEach((c) => { const m = (c.date || "").slice(0, 7); if (m in soma) soma[m] += c.value; });
    return out.map((m) => ({ ym: m, label: fmtMes(m), full: fmtMes(m), value: soma[m] }));
  }, [data.actualCosts, hoje, nMeses]);
  const totalMeses = meses.reduce((s, m) => s + m.value, 0);

  const header = <PageHeader title="Painel" sub={fmtDataLonga(hoje)} />;
  if (!projects.length) {
    return (
      <div>
        {header}
        <EmptyState icon={Building2} title="Nenhuma obra cadastrada" text="Cadastre a primeira obra para acompanhar gastos, prazos e pendências de todas em um só lugar."
          action={<button className="btn btn-ink" onClick={onNovaObra}><Plus size={17} />Cadastrar primeira obra</button>} />
      </div>
    );
  }
  const obrasComAlerta = new Set(alertas.map((a) => a.obra.id)).size;
  const gastoPct = tot.orc > 0 ? (tot.gasto / tot.orc) * 100 : null;

  return (
    <div>
      {header}

      <Sheet className="pq-kpis mb-24" data-tour="painel-kpis">
        <div><Kpi label="Obras em execução" value={String(tot.exec)} sub={`de ${plural(projects.length, "obra cadastrada", "obras cadastradas")}`} /></div>
        <div><Kpi label="Gasto total" value={fmtBRLshort(tot.gasto)} sub={tot.orc > 0 ? `${fmtPct(gastoPct)} de ${fmtBRLshort(tot.orc)} orçados` : "Sem orçamento lançado"} tone={gastoPct > 100 ? "danger" : undefined} /></div>
        <div><Kpi label="Lucro previsto" value={fmtBRLshort(tot.lucro)} sub={tot.vgv > 0 ? `Margem de ${fmtPct((tot.lucro / tot.vgv) * 100)}` : "Cadastre as unidades à venda"} tone={tot.lucro < 0 ? "danger" : undefined} /></div>
        <div><Kpi label="VGV previsto" value={fmtBRLshort(tot.vgv)} sub="Unidades próprias à venda" /></div>
      </Sheet>

      <div className="pq-duo mb-24">
        <div data-tour="painel-alertas">
          <SectionHead title="Precisa de atenção" sub={alertas.length ? `${plural(alertas.length, "alerta", "alertas")} em ${plural(obrasComAlerta, "obra", "obras")}` : "Tudo em dia"} />
          {alertas.length ? (
            <Sheet className="divide">
              {alertas.map((a) => (
                <button key={a.k} type="button" className="pq-alert" onClick={() => go({ page: "obra", id: a.obra.id, aba: a.aba })}>
                  <span className={cx("pq-rail", a.tom)} />
                  <span className="grow stack" style={{ gap: 1 }}>
                    <span className="pq-alert-obra clip">{a.obra.name}</span>
                    <span style={{ fontWeight: 650, fontSize: 14.5, lineHeight: 1.3 }}>{a.titulo}</span>
                    {a.detalhe && <span className="t-sm t-soft clip">{a.detalhe}</span>}
                  </span>
                  <ChevronRight size={16} style={{ color: "var(--ink-3)", flexShrink: 0 }} />
                </button>
              ))}
            </Sheet>
          ) : (
            <Sheet className="pad row gap-12" style={{ alignItems: "flex-start" }}>
              <CheckCircle2 size={20} style={{ color: "var(--ok)", flexShrink: 0, marginTop: 1 }} />
              <span className="t-soft t-sm">Nada pede atenção agora. Cronogramas, vistorias, documentos e gastos estão em dia.</span>
            </Sheet>
          )}
        </div>

        <div>
          <SectionHead title="Gastos por mês" sub={`${fmtBRLshort(totalMeses)} nos últimos ${nMeses} meses, todas as obras`} />
          <Sheet className="pad" style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
            {totalMeses > 0 ? (
              <>
                <BarsTrend data={meses} height={230} />
              </>
            ) : (
              <div className="t-sm t-muted" style={{ padding: "40px 0", textAlign: "center" }}>Os gastos lançados nas obras aparecem aqui, mês a mês.</div>
            )}
          </Sheet>
        </div>
      </div>

      <SectionHead title="Suas obras" sub={plural(projects.length, "obra", "obras")} actions={<button className="btn btn-quiet btn-sm" onClick={() => go({ page: "obras" })}>Ver todas</button>} />
      <Sheet className="divide pq-orows">
        <div className="pq-orow head" aria-hidden="true">
          <span style={{ gridArea: "name" }}>Obra</span><span style={{ gridArea: "st" }}>Situação</span><span style={{ gridArea: "av" }}>Avanço físico</span>
          <span style={{ gridArea: "ent" }}>Entrega</span><span style={{ gridArea: "gasto" }}>Gasto</span>
        </div>
        {projects.map((p) => <PqObraLinha key={p.id} p={p} info={infos.get(p.id)} onOpen={() => go({ page: "obra", id: p.id, aba: "resumo" })} />)}
      </Sheet>
    </div>
  );
}

function PqObraLinha({ p, info, onOpen }) {
  const url = useSignedUrl(p.capaPath);
  const { av, entrega, atraso, t } = info;
  return (
    <button type="button" className="pq-orow" onClick={onOpen} aria-label={`Abrir ${p.name}`}>
      <span className="img">{url ? <img src={url} alt="" /> : <Building2 size={18} />}</span>
      <span className="nm stack" style={{ gap: 1 }}>
        <span className="clip" style={{ fontWeight: 650 }}>{p.name}</span>
        <span className="t-xs t-muted clip">{p.address || p.municipio}</span>
      </span>
      <span className="st"><Pill tone={pqStatusTone(p.status)}>{PROJECT_STATUS[p.status] || p.status}</Pill></span>
      <span className="av stack gap-4">
        <span className="pq-lbl">Avanço</span>
        <span className="row gap-8"><span className="grow"><Ruler pct={av.pct} thin label={`Avanço de ${p.name}`} /></span><span className="v" style={{ minWidth: 34, textAlign: "right" }}>{fmtPct(av.pct)}</span></span>
      </span>
      <span className="ent stack" style={{ gap: 0 }}>
        <span className="pq-lbl">Entrega</span>
        <span className="v" style={atraso ? { color: "var(--danger)" } : undefined}>{entrega ? fmtData(entrega) : "—"}</span>
        {atraso > 0 && <span className="t-xs t-danger" style={{ fontWeight: 600 }}>+{plural(atraso, "dia", "dias")}</span>}
      </span>
      <span className="gs stack" style={{ gap: 0 }}>
        <span className="pq-lbl">Gasto</span>
        <span className="v" style={t.desvioPct > 0 && t.totalEstimatedCost > 0 ? { color: "var(--danger)" } : undefined}>{fmtBRLshort(t.totalActualCost)}</span>
        <span className="t-xs t-muted clip">{t.totalEstimatedCost > 0 ? `de ${fmtBRLshort(t.totalEstimatedCost)}` : "sem orçamento"}</span>
      </span>
      <ChevronRight size={16} className="chev" />
    </button>
  );
}

/* ============================================================
   Lista de obras
   ============================================================ */
const PQ_FILTRO_VAZIO = { em_andamento: "Nenhuma obra em execução", planejamento: "Nenhuma obra em planejamento", pausada: "Nenhuma obra pausada", concluida: "Nenhuma obra concluída" };
const PQ_FILTROS = [["todas", "Todas"], ["em_andamento", "Em execução"], ["planejamento", "Planejamento"], ["pausada", "Pausadas"], ["concluida", "Concluídas"]];

function ObrasLista({ store, go, onNovaObra, onEditar }) {
  pqUseCss();
  const data = store.data;
  const [filtro, setFiltro] = useState("todas");
  const projects = useMemo(() => [...data.projects].sort((a, b) => (PQ_STATUS_ORDEM[a.status] ?? 9) - (PQ_STATUS_ORDEM[b.status] ?? 9)), [data.projects]);
  const cont = (k) => (k === "todas" ? projects.length : projects.filter((p) => p.status === k).length);
  const lista = filtro === "todas" ? projects : projects.filter((p) => p.status === filtro);

  return (
    <div>
      <PageHeader title="Obras" sub={projects.length ? plural(projects.length, "obra cadastrada", "obras cadastradas") : null}
        actions={<button className="btn btn-ink" onClick={onNovaObra} data-tour="nova-obra"><Plus size={17} />Nova obra</button>} />
      {!projects.length ? (
        <EmptyState icon={Building2} title="Nenhuma obra ainda" text="Comece pelo nome e pelo endereço. Cronograma, gastos, unidades e documentos você preenche aos poucos, dentro da obra."
          action={<button className="btn btn-ink" onClick={onNovaObra}><Plus size={17} />Cadastrar primeira obra</button>} />
      ) : (
        <>
          <div className="mb-16">
            <Segmented ariaLabel="Filtrar por situação" value={filtro} onChange={setFiltro}
              options={PQ_FILTROS.map(([k, l]) => ({ value: k, label: pqSegLabel(l, cont(k)) }))} />
          </div>
          {lista.length ? (
            <div className="pq-cards">
              {lista.map((p, i) => <PqObraCard key={p.id} p={p} info={pqObraInfo(data, p)} tour={i === 0 ? "obra-card" : undefined}
                onOpen={() => go({ page: "obra", id: p.id, aba: "resumo" })} onEditar={() => onEditar(p)} />)}
            </div>
          ) : (
            <EmptyState icon={Building2} title={PQ_FILTRO_VAZIO[filtro]}
              text="Quando uma obra mudar de situação, ela aparece aqui." action={<button className="btn btn-line" onClick={() => setFiltro("todas")}>Ver todas as obras</button>} />
          )}
        </>
      )}
    </div>
  );
}

function PqObraCard({ p, info, tour, onOpen, onEditar }) {
  const url = useSignedUrl(p.capaPath);
  const { av, entrega, atraso, t, serios, gastoPct } = info;
  return (
    <Sheet className="pq-card" data-tour={tour} role="link" tabIndex={0} aria-label={`Abrir ${p.name}`} onClick={onOpen}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(); } }}>
      <div className="pq-card-foto">
        {url ? <img src={url} alt="" /> : <div className="vazio"><ImagePlus size={22} /><span>Sem foto de capa</span></div>}
      </div>
      <div className="pq-card-body">
        <div className="row between gap-8">
          <div className="row gap-8 wrap" style={{ minWidth: 0 }}>
            <Pill tone={pqStatusTone(p.status)}>{PROJECT_STATUS[p.status] || p.status}</Pill>
            <span className="t-sm t-soft row gap-4"><MapPin size={14} />{p.municipio || "Paulista/PE"}</span>
          </div>
          <IconBtn tip="Editar obra" sm onClick={(e) => { e.stopPropagation(); onEditar(); }} onKeyDown={(e) => e.stopPropagation()}><Pencil size={15} /></IconBtn>
        </div>
        <div className="stack gap-6">
          <h3 className="pq-placa">{p.name}</h3>
          {p.address && <div className="t-sm t-soft clip">{p.address}</div>}
        </div>
        <div className="stack gap-6">
          <div className="row between t-sm"><span style={{ fontWeight: 600 }}>Avanço físico</span><span className="t-num" style={{ fontSize: 16 }}>{fmtPct(av.pct)}</span></div>
          <Ruler pct={av.pct} label={`Avanço físico de ${p.name}`} />
        </div>
        <div className="pq-facts">
          <div>
            <small>Gasto</small>
            <strong style={gastoPct > 100 ? { color: "var(--danger)" } : undefined}>{gastoPct === null ? fmtBRLshort(t.totalActualCost) : fmtPct(gastoPct)}</strong>
            <span title={gastoPct === null ? undefined : `${fmtBRL0(t.totalActualCost)} de ${fmtBRL0(t.totalEstimatedCost)} orçados`}>{gastoPct === null ? "sem orçamento" : `de ${fmtBRLshort(t.totalEstimatedCost)}`}</span>
          </div>
          <div>
            <small>Lucro previsto</small>
            <strong style={t.estimatedProfit < 0 ? { color: "var(--danger)" } : undefined}>{t.estimatedRevenue > 0 ? fmtBRLshort(t.estimatedProfit) : "—"}</strong>
            <span>{t.estimatedRevenue > 0 ? `margem ${fmtPct(t.margemPct)}` : "sem unidades à venda"}</span>
          </div>
          <div>
            <small>Entrega</small>
            <strong style={atraso ? { color: "var(--danger)" } : undefined}>{entrega ? fmtData(entrega) : "—"}</strong>
            <span style={atraso ? { color: "var(--danger)", fontWeight: 600 } : undefined}>{atraso ? `+${plural(atraso, "dia", "dias")}` : entrega ? "no prazo" : "sem data"}</span>
          </div>
        </div>
        <div className="row between t-sm" style={{ marginTop: "auto" }}>
          {serios ? (
            <span className="row gap-6 t-danger" style={{ fontWeight: 600 }}><AlertTriangle size={15} />{plural(serios, "alerta sério", "alertas sérios")}</span>
          ) : (
            <span className="row gap-6 t-muted"><CheckCircle2 size={15} style={{ color: "var(--ok)" }} />Sem alertas sérios</span>
          )}
          <span className="row gap-4 t-soft" style={{ fontWeight: 600 }}>Abrir obra<ChevronRight size={15} /></span>
        </div>
      </div>
    </Sheet>
  );
}

/* ============================================================
   Cadastro / edição da obra
   ============================================================ */
const PQ_FINANC = ["MCMV", "Recursos próprios", "Outro"];

function ObraFormDrawer({ store, obra, onClose, go }) {
  pqUseCss();
  const notify = useToast();
  const nomeRef = useRef(null);
  const { cur, f, set, setF, tried, setTried, saving, setSaving } = pqUseFormFor(obra, (o) => (o === "nova"
    ? { name: "", address: "", municipio: "Paulista/PE", status: "planejamento", financiamento: "MCMV", startDate: "", endDateEstimated: "", file: null, progressoPct: "" }
    : { name: o.name || "", address: o.address || "", municipio: o.municipio || "Paulista/PE", status: o.status || "em_andamento", financiamento: o.financiamento || "MCMV", startDate: o.startDate || "", endDateEstimated: o.endDateEstimated || "", file: null, progressoPct: String(o.progressoPct ?? "") }));
  const isNew = cur === "nova";
  const fonte = cur && !isNew ? avancoFisico(store.data, cur.id, cur).fonte : "manual";
  const financOutro = f.financiamento && !PQ_FINANC.slice(0, 2).includes(f.financiamento);

  const salvar = async () => {
    if (!f.name?.trim()) { setTried(true); nomeRef.current?.focus(); return; }
    setSaving(true);
    if (isNew) {
      const p = await store.addProject({ name: f.name.trim(), address: f.address.trim(), municipio: f.municipio.trim() || "Paulista/PE", status: f.status });
      if (!p) { setSaving(false); return; }
      const extra = {};
      if (f.financiamento && f.financiamento !== "MCMV") extra.financiamento = f.financiamento;
      if (f.startDate) extra.startDate = f.startDate;
      if (f.endDateEstimated) extra.endDateEstimated = f.endDateEstimated;
      if (Object.keys(extra).length) await store.updateProject(p.id, extra);
      if (f.file) await store.setCapa(p.id, f.file);
      notify("Obra criada");
      onClose();
      go({ page: "obra", id: p.id, aba: "resumo" });
    } else {
      const pct = parseNum(f.progressoPct);
      await store.updateProject(cur.id, {
        name: f.name.trim(), address: f.address.trim(), municipio: f.municipio.trim() || "Paulista/PE", status: f.status,
        financiamento: f.financiamento, startDate: f.startDate, endDateEstimated: f.endDateEstimated,
        progressoPct: isNaN(pct) ? 0 : Math.max(0, Math.min(100, Math.round(pct))),
      });
      if (f.file) await store.setCapa(cur.id, f.file);
      notify("Obra atualizada");
      onClose();
    }
  };
  const excluir = async () => { const id = cur.id; await store.deleteProject(id); notify("Obra excluída"); onClose(); go({ page: "obras" }); };

  return (
    <Drawer open={!!obra} onClose={onClose} title={isNew ? "Nova obra" : "Editar obra"} sub={isNew ? "O resto você preenche aos poucos, dentro da obra." : cur?.name}
      footer={<>
        <button type="button" className="btn btn-quiet" onClick={onClose}>Cancelar</button>
        <PqSave saving={saving} onClick={salvar}>{isNew ? "Cadastrar obra" : "Salvar alterações"}</PqSave>
      </>}>
      <Field label="Nome da obra">
        <input ref={nomeRef} className="input" value={f.name || ""} onChange={set("name")} placeholder="Ex.: Residencial Pau Amarelo" aria-invalid={tried && !f.name?.trim()} />
        {tried && !f.name?.trim() && <span className="pq-err">Dê um nome para a obra.</span>}
      </Field>
      <Field label="Endereço"><input className="input" value={f.address || ""} onChange={set("address")} placeholder="Rua, número e bairro" /></Field>
      <div className="grid cols-2 sm-1" style={{ gap: 12 }}>
        <Field label="Município"><input className="input" value={f.municipio || ""} onChange={set("municipio")} /></Field>
        <Field label="Situação">
          <select className="select" value={f.status || "planejamento"} onChange={set("status")}>
            {Object.entries(PROJECT_STATUS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Financiamento">
        <Segmented ariaLabel="Financiamento" value={financOutro ? "Outro" : f.financiamento || "MCMV"} onChange={(v) => setF((x) => ({ ...x, financiamento: v }))}
          options={PQ_FINANC.map((v) => ({ value: v, label: v }))} />
      </Field>
      <div className="grid cols-2" style={{ gap: 12 }}>
        <Field label="Início previsto"><input type="date" className="input" value={f.startDate || ""} onChange={set("startDate")} /></Field>
        <Field label="Entrega prevista"><input type="date" className="input" value={f.endDateEstimated || ""} onChange={set("endDateEstimated")} min={f.startDate || undefined} /></Field>
      </div>
      <Field label="Foto de capa" hint={!isNew && cur?.capaPath ? "A obra já tem capa. Escolha outra foto só se quiser trocar." : "Aparece na placa da obra e na lista de obras."}>
        <div className="row gap-12">
          {!isNew && cur?.capaPath && !f.file && <Thumb path={cur.capaPath} w={64} h={48} alt="Capa atual" />}
          <div className="grow"><FileField file={f.file} setFile={(x) => setF((o) => ({ ...o, file: x }))} accept="image/*" label={!isNew && cur?.capaPath ? "Trocar foto de capa" : "Escolher foto de capa"} /></div>
        </div>
      </Field>
      {!isNew && (
        <Field label="Avanço manual (%)" hint={fonte === "manual"
          ? "Usado só enquanto a obra não tem cronograma nem etapas."
          : `Usado só quando a obra não tem cronograma nem etapas. Hoje o avanço vem ${fonte === "cronograma" ? "do cronograma" : "das etapas"}.`}>
          <input className="input" type="number" min={0} max={100} step={1} inputMode="numeric" value={f.progressoPct} onChange={set("progressoPct")} style={{ maxWidth: 140 }} />
        </Field>
      )}
      {!isNew && cur && (
        <div className="pq-danger-zone">
          <div className="stack" style={{ gap: 1 }}>
            <span style={{ fontWeight: 600, fontSize: 14 }}>Excluir obra</span>
            <span className="t-xs t-muted">Apaga a obra e tudo o que foi lançado nela.</span>
          </div>
          <ConfirmDelete what="a obra" onConfirm={excluir} />
        </div>
      )}
    </Drawer>
  );
}

/* ============================================================
   Não conformidades
   ============================================================ */
const PQ_GRAV_TONE = { alta: "danger", media: "warn", baixa: undefined };

function ObraNaoConformidades({ store, project }) {
  pqUseCss();
  const notify = useToast();
  const hoje = todayISO();
  const ncs = useMemo(() => store.data.naoConformidades.filter((n) => n.projectId === project.id), [store.data.naoConformidades, project.id]);
  const por = (s) => ncs.filter((n) => n.status === s);
  const [filtro, setFiltro] = useState(() => (ncs.some((n) => n.status === "aberta") ? "aberta" : ncs.some((n) => n.status === "em_tratativa") ? "em_tratativa" : ncs.length ? "resolvida" : "aberta"));
  const [editando, setEditando] = useState(null);
  const [resolvendo, setResolvendo] = useState(null);

  const abertas = ncs.filter((n) => n.status !== "resolvida");
  const altas = abertas.filter((n) => n.gravidade === "alta").length;
  const vencidas = abertas.filter((n) => n.prazo && n.prazo < hoje).length;
  const tempos = ncs.filter((n) => n.status === "resolvida" && n.dataAbertura && n.dataResolucao).map((n) => Math.max(0, diffDaysISO(n.dataAbertura, n.dataResolucao)));
  const media = tempos.length ? Math.round(tempos.reduce((s, x) => s + x, 0) / tempos.length) : null;
  const ordem = { alta: 0, media: 1, baixa: 2 };
  const lista = por(filtro).sort((a, b) => filtro === "resolvida" ? (b.dataResolucao || "").localeCompare(a.dataResolucao || "") : (ordem[a.gravidade] ?? 3) - (ordem[b.gravidade] ?? 3) || (a.prazo || "9").localeCompare(b.prazo || "9"));
  const vazioTxt = { aberta: "Nenhuma não conformidade aberta.", em_tratativa: "Nenhuma em tratativa no momento.", resolvida: "Nenhuma resolvida ainda." };

  const novaBtn = <button className="btn btn-ink" onClick={() => setEditando("nova")}><Plus size={17} />Abrir não conformidade</button>;

  return (
    <div>
      {!ncs.length ? (
        <EmptyState icon={ShieldAlert} title="Nenhuma não conformidade registrada" text="Registre desvios de execução, segurança ou documentação com foto, responsável e prazo. A tratativa fica registrada até a resolução." action={novaBtn} />
      ) : (
        <>
          <Sheet className="pq-kpis mb-24">
            <div><Kpi label="Em aberto" value={String(abertas.length)} sub={por("em_tratativa").length ? `${por("em_tratativa").length} em tratativa` : "Nenhuma em tratativa"} /></div>
            <div><Kpi label="Gravidade alta" value={String(altas)} tone={altas ? "danger" : undefined} sub={altas ? "Resolver primeiro" : "Nenhuma em aberto"} /></div>
            <div><Kpi label="Prazo vencido" value={String(vencidas)} tone={vencidas ? "danger" : undefined} sub={vencidas ? "Cobrar os responsáveis" : "Prazos em dia"} /></div>
            <div><Kpi label="Tempo médio de resolução" value={media === null ? "—" : plural(media, "dia", "dias")} roll={media !== null} sub={tempos.length ? `Em ${plural(tempos.length, "resolvida", "resolvidas")}` : "Sem resolvidas ainda"} /></div>
          </Sheet>
          <div className="row between wrap gap-12 mb-16">
            <Segmented ariaLabel="Filtrar não conformidades" value={filtro} onChange={setFiltro}
              options={[["aberta", "Abertas"], ["em_tratativa", "Em tratativa"], ["resolvida", "Resolvidas"]].map(([k, l]) => ({ value: k, label: pqSegLabel(l, por(k).length) }))} />
            {novaBtn}
          </div>
          {lista.length ? (
            <Sheet className="divide">
              {lista.map((n) => {
                const vencida = n.status !== "resolvida" && n.prazo && n.prazo < hoje;
                return (
                  <div key={n.id} className="pq-row">
                    <span className={cx("pq-rail", n.status === "resolvida" ? "ok" : PQ_GRAV_TONE[n.gravidade])} />
                    <div className="main">
                      <div className="ttl">{n.titulo}</div>
                      <div className="pq-meta">
                        <span>{NC_CATEGORIAS[n.categoria] || n.categoria}</span>
                        <span style={{ color: n.status === "resolvida" ? undefined : `var(--${PQ_GRAV_TONE[n.gravidade] || "ink-2"})`, fontWeight: 600 }}>Gravidade {(NC_GRAVIDADE[n.gravidade] || "").toLowerCase()}</span>
                        {n.responsavel && <span><User size={14} />{n.responsavel}</span>}
                        {n.status !== "resolvida" && n.prazo && (
                          <span style={vencida ? { color: "var(--danger)", fontWeight: 600 } : undefined}><CalendarClock size={14} style={vencida ? { color: "var(--danger)" } : undefined} />Prazo {fmtDataCurta(n.prazo)}{vencida ? ", vencida" : ""}</span>
                        )}
                        {n.status !== "resolvida" && !n.prazo && <span className="t-muted">Sem prazo</span>}
                      </div>
                      {n.descricao && <div className="t-sm t-muted">{n.descricao}</div>}
                      {n.status === "resolvida" && (
                        <div className="pq-note">
                          <b>Ação corretiva{n.dataResolucao ? `, resolvida em ${fmtData(n.dataResolucao)}` : ""}{n.dataResolucao && n.dataAbertura ? ` (${plural(Math.max(0, diffDaysISO(n.dataAbertura, n.dataResolucao)), "dia", "dias")})` : ""}</b>
                          {n.acaoCorretiva || "Não informada."}
                        </div>
                      )}
                    </div>
                    {n.pathFoto ? <div className="thumbc"><Thumb path={n.pathFoto} w={52} h={52} alt={`Evidência: ${n.titulo}`} /></div> : <span />}
                    <div className="act">
                      {n.status === "aberta" && <button className="btn btn-line btn-sm" onClick={async () => { await store.updateNaoConformidade(n.id, { status: "em_tratativa" }); notify("Tratativa iniciada"); }}>Iniciar tratativa</button>}
                      {n.status !== "resolvida" && <button className="btn btn-ink btn-sm" onClick={() => setResolvendo(n)}>Resolver</button>}
                      <IconBtn tip="Editar" sm onClick={() => setEditando(n)}><Pencil size={15} /></IconBtn>
                      <ConfirmDelete what="a não conformidade" onConfirm={async () => { await store.deleteNaoConformidade(n.id); notify("Não conformidade excluída"); }} />
                    </div>
                  </div>
                );
              })}
            </Sheet>
          ) : (
            <Sheet className="pad t-sm t-muted">{vazioTxt[filtro]}</Sheet>
          )}
        </>
      )}
      <PqNcDrawer store={store} project={project} nc={editando} onClose={() => setEditando(null)} />
      <PqResolverDrawer store={store} nc={resolvendo} onClose={() => setResolvendo(null)} onDone={() => setFiltro("resolvida")} />
    </div>
  );
}

function PqNcDrawer({ store, project, nc, onClose }) {
  const notify = useToast();
  const ref = useRef(null);
  const { cur, f, set, setF, tried, setTried, saving, setSaving } = pqUseFormFor(nc, (n) => (n === "nova"
    ? { titulo: "", descricao: "", categoria: "execucao", gravidade: "media", responsavel: "", prazo: "", file: null }
    : { titulo: n.titulo || "", descricao: n.descricao || "", categoria: n.categoria || "execucao", gravidade: n.gravidade || "media", responsavel: n.responsavel || "", prazo: n.prazo || "", status: n.status }));
  const isNew = cur === "nova";
  const salvar = async () => {
    if (!f.titulo?.trim()) { setTried(true); ref.current?.focus(); return; }
    setSaving(true);
    if (isNew) {
      const r = await store.addNaoConformidade({ projectId: project.id, titulo: f.titulo.trim(), descricao: f.descricao.trim(), categoria: f.categoria, gravidade: f.gravidade, responsavel: f.responsavel.trim(), prazo: f.prazo, file: f.file });
      if (!r) { setSaving(false); return; }
      notify("Não conformidade aberta");
    } else {
      const u = { titulo: f.titulo.trim(), descricao: f.descricao.trim(), categoria: f.categoria, gravidade: f.gravidade, responsavel: f.responsavel.trim(), prazo: f.prazo, status: f.status };
      if (f.status !== "resolvida" && cur.status === "resolvida") { u.dataResolucao = null; }
      await store.updateNaoConformidade(cur.id, u);
      notify("Não conformidade atualizada");
    }
    onClose();
  };
  return (
    <Drawer open={!!nc} onClose={onClose} title={isNew ? "Abrir não conformidade" : "Editar não conformidade"} sub={isNew ? project.name : cur?.titulo}
      footer={<><button type="button" className="btn btn-quiet" onClick={onClose}>Cancelar</button><PqSave saving={saving} onClick={salvar}>{isNew ? "Abrir não conformidade" : "Salvar alterações"}</PqSave></>}>
      <Field label="Título">
        <input ref={ref} className="input" value={f.titulo || ""} onChange={set("titulo")} placeholder="Ex.: Prumo fora do padrão na casa 03" />
        {tried && !f.titulo?.trim() && <span className="pq-err">Descreva o problema em poucas palavras.</span>}
      </Field>
      <Field label="Descrição"><textarea className="textarea" rows={3} value={f.descricao || ""} onChange={set("descricao")} placeholder="Onde está e o que foi observado" /></Field>
      <Field label="Gravidade">
        <Segmented ariaLabel="Gravidade" value={f.gravidade || "media"} onChange={(v) => setF((x) => ({ ...x, gravidade: v }))} options={Object.entries(NC_GRAVIDADE).map(([k, l]) => ({ value: k, label: l }))} />
      </Field>
      <div className="grid cols-2 sm-1" style={{ gap: 12 }}>
        <Field label="Categoria">
          <select className="select" value={f.categoria || "execucao"} onChange={set("categoria")}>{Object.entries(NC_CATEGORIAS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
        </Field>
        {!isNew && (
          <Field label="Situação">
            <select className="select" value={f.status || "aberta"} onChange={set("status")}>{Object.entries(NC_STATUS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
          </Field>
        )}
      </div>
      <div className="grid cols-2" style={{ gap: 12 }}>
        <Field label="Responsável"><input className="input" value={f.responsavel || ""} onChange={set("responsavel")} placeholder="Quem vai corrigir" /></Field>
        <Field label="Prazo"><input type="date" className="input" value={f.prazo || ""} onChange={set("prazo")} /></Field>
      </div>
      {isNew && <Field label="Foto da evidência"><FileField file={f.file} setFile={(x) => setF((o) => ({ ...o, file: x }))} accept="image/*" label="Tirar ou escolher foto" /></Field>}
    </Drawer>
  );
}

function PqResolverDrawer({ store, nc, onClose, onDone }) {
  const notify = useToast();
  const ref = useRef(null);
  const { cur, f, set, tried, setTried, saving, setSaving } = pqUseFormFor(nc, (n) => ({ acao: n.acaoCorretiva || "", data: todayISO() }));
  const salvar = async () => {
    if (!f.acao?.trim()) { setTried(true); ref.current?.focus(); return; }
    setSaving(true);
    await store.updateNaoConformidade(cur.id, { status: "resolvida", acaoCorretiva: f.acao.trim(), dataResolucao: f.data || todayISO() });
    notify("Não conformidade resolvida");
    onClose(); onDone?.();
  };
  return (
    <Drawer open={!!nc} onClose={onClose} title="Resolver não conformidade" sub={cur?.titulo}
      footer={<><button type="button" className="btn btn-quiet" onClick={onClose}>Cancelar</button><PqSave saving={saving} onClick={salvar}>Marcar como resolvida</PqSave></>}>
      <Field label="Ação corretiva" hint="O que foi feito para corrigir. Fica registrado no histórico da obra.">
        <textarea ref={ref} className="textarea" rows={4} value={f.acao || ""} onChange={set("acao")} placeholder="Ex.: Parede demolida e refeita no prumo, conferida com nível a laser" />
        {tried && !f.acao?.trim() && <span className="pq-err">Descreva a ação corretiva para concluir.</span>}
      </Field>
      <Field label="Data da resolução"><input type="date" className="input" value={f.data || ""} onChange={set("data")} max={todayISO()} style={{ maxWidth: 200 }} /></Field>
    </Drawer>
  );
}

/* ============================================================
   Requisitos legais e da Caixa
   ============================================================ */
const PQ_REQ_DONE = { concluido: "concluida", em_andamento: "andamento" };
const PQ_REQ_NEXT = { pendente: "em_andamento", em_andamento: "concluido", concluido: "pendente", nao_aplicavel: "em_andamento" };
const PQ_REQ_COR = { concluido: "var(--ok)", em_andamento: "var(--warn)", pendente: "var(--line-strong)", nao_aplicavel: "var(--ink-3)" };

function ObraRequisitos({ store, project }) {
  pqUseCss();
  const notify = useToast();
  const hoje = todayISO();
  const reqs = useMemo(() => store.data.requisitos.filter((r) => r.projectId === project.id), [store.data.requisitos, project.id]);
  const [editando, setEditando] = useState(null);
  const [sugerindo, setSugerindo] = useState(false);
  const cont = (s) => reqs.filter((r) => r.status === s).length;
  const ok = cont("concluido") + cont("nao_aplicavel");
  const pct = reqs.length ? (ok / reqs.length) * 100 : 0;
  const faltamSugeridos = useMemo(() => {
    const ex = new Set(reqs.map((r) => r.item.trim().toLowerCase()));
    return REQUISITOS_SUGERIDOS.filter(([, it]) => !ex.has(it.toLowerCase())).length;
  }, [reqs]);

  const sugerir = async () => {
    setSugerindo(true);
    const n = await store.addRequisitosSugeridos(project.id);
    setSugerindo(false);
    notify(n ? `${plural(n, "item adicionado", "itens adicionados")}` : "Todos os itens sugeridos já estão na lista");
  };
  const ciclar = async (r) => {
    const prox = PQ_REQ_NEXT[r.status] || "em_andamento";
    await store.updateRequisito(r.id, { status: prox });
    if (prox === "concluido") notify("Requisito concluído");
  };

  const sugBtn = (cls = "btn btn-line") => (
    <button className={cls} onClick={sugerir} disabled={sugerindo}>{sugerindo ? <Loader2 size={16} className="spin" /> : <ListPlus size={16} />}{reqs.length ? "Adicionar itens sugeridos" : "Usar lista sugerida"}</button>
  );
  const addBtn = (cls = "btn btn-ink") => <button className={cls} onClick={() => setEditando("novo")}><Plus size={17} />Adicionar item</button>;

  const grupos = Object.keys(REQ_CATEGORIAS).map((k) => [k, reqs.filter((r) => r.categoria === k)])
    .concat([["__outros", reqs.filter((r) => !REQ_CATEGORIAS[r.categoria])]]).filter(([, l]) => l.length);

  return (
    <div>
      {!reqs.length ? (
        <EmptyState icon={ClipboardCheck} title="Checklist de requisitos vazio"
          text={`Comece pela lista sugerida com ${REQUISITOS_SUGERIDOS.length} itens: alvará, ART, habite-se, documentos da Caixa, ligações definitivas e mais. Depois é só ajustar, ou monte a sua item a item.`}
          action={<>{sugBtn("btn btn-ink")}{addBtn("btn btn-line")}</>} />
      ) : (
        <>
          <Sheet className="pad mb-24">
            <div className="pq-conf">
              <div className="stack gap-12" style={{ minWidth: 0 }}>
                <div className="row gap-16 wrap" style={{ alignItems: "flex-end" }}>
                  <div className="stack gap-4">
                    <span className="kpi-label">Conformidade</span>
                    <span className="kpi-value lg" style={pct >= 100 ? { color: "var(--ok)" } : undefined}><Odometer value={fmtPct(pct)} /></span>
                  </div>
                  <span className="t-sm t-soft" style={{ paddingBottom: 6 }}>{ok} de {plural(reqs.length, "item", "itens")} concluídos ou fora de escopo</span>
                </div>
                <Ruler pct={pct} tone={pct >= 100 ? "ok" : undefined} label="Conformidade dos requisitos" />
                <div className="pq-legend">
                  {["concluido", "em_andamento", "pendente", "nao_aplicavel"].filter((s) => cont(s) > 0).map((s) => <span key={s}><i style={{ background: PQ_REQ_COR[s] }} />{REQ_STATUS[s]} {cont(s)}</span>)}
                </div>
              </div>
              <div className="row gap-8 wrap">
                {faltamSugeridos > 0 && sugBtn()}
                {addBtn()}
              </div>
            </div>
          </Sheet>

          <div className="stack gap-24">
            {grupos.map(([k, lista]) => {
              const feitos = lista.filter((r) => r.status === "concluido" || r.status === "nao_aplicavel").length;
              return (
                <div key={k}>
                  <SectionHead title={REQ_CATEGORIAS[k] || "Sem categoria"} sub={`${feitos} de ${lista.length} resolvidos`} />
                  <Sheet className="divide">
                    {lista.map((r) => {
                      const vencido = r.prazo && r.prazo < hoje && r.status !== "concluido" && r.status !== "nao_aplicavel";
                      return (
                        <div key={r.id} className={cx("pq-req", r.status === "nao_aplicavel" && "na")}>
                          <div className="chk">
                            <DoneCheck status={PQ_REQ_DONE[r.status] || "pendente"} onClick={() => ciclar(r)} tip={`Marcar como ${REQ_STATUS[PQ_REQ_NEXT[r.status] || "em_andamento"].toLowerCase()}`} />
                          </div>
                          <div className="main">
                            <span className="ttl">{r.item}</span>
                            {r.descricao && <span className="t-sm t-muted">{r.descricao}</span>}
                            {(r.responsavel || r.prazo) && (
                              <span className="pq-meta" style={{ marginTop: 4 }}>
                                {r.responsavel && <span><User size={14} />{r.responsavel}</span>}
                                {r.prazo && <span style={vencido ? { color: "var(--danger)", fontWeight: 600 } : undefined}><CalendarClock size={14} style={vencido ? { color: "var(--danger)" } : undefined} />Prazo {fmtDataCurta(r.prazo)}{vencido ? ", vencido" : ""}</span>}
                              </span>
                            )}
                            {r.observacao && <span className="t-sm t-soft" style={{ marginTop: 2 }}>{r.observacao}</span>}
                          </div>
                          <div className="sel">
                            <select className="select sm" aria-label={`Situação de ${r.item}`} value={r.status} onChange={(e) => store.updateRequisito(r.id, { status: e.target.value })}
                              style={{ color: r.status === "concluido" ? "var(--ok)" : r.status === "em_andamento" ? "var(--warn)" : undefined, fontWeight: 600 }}>
                              {Object.entries(REQ_STATUS).map(([s, l]) => <option key={s} value={s}>{l}</option>)}
                            </select>
                          </div>
                          <div className="act">
                            <IconBtn tip="Editar" sm onClick={() => setEditando(r)}><Pencil size={15} /></IconBtn>
                            <ConfirmDelete what="o item" onConfirm={async () => { await store.deleteRequisito(r.id); notify("Item excluído"); }} />
                          </div>
                        </div>
                      );
                    })}
                  </Sheet>
                </div>
              );
            })}
          </div>
        </>
      )}
      <PqReqDrawer store={store} project={project} req={editando} onClose={() => setEditando(null)} />
    </div>
  );
}

function PqReqDrawer({ store, project, req, onClose }) {
  const notify = useToast();
  const ref = useRef(null);
  const { cur, f, set, tried, setTried, saving, setSaving } = pqUseFormFor(req, (r) => (r === "novo"
    ? { categoria: "municipal", item: "", descricao: "", status: "pendente", responsavel: "", prazo: "", observacao: "" }
    : { categoria: r.categoria || "municipal", item: r.item || "", descricao: r.descricao || "", status: r.status || "pendente", responsavel: r.responsavel || "", prazo: r.prazo || "", observacao: r.observacao || "" }));
  const isNew = cur === "novo";
  const salvar = async () => {
    if (!f.item?.trim()) { setTried(true); ref.current?.focus(); return; }
    setSaving(true);
    const campos = { categoria: f.categoria, item: f.item.trim(), descricao: f.descricao.trim(), status: f.status, responsavel: f.responsavel.trim(), prazo: f.prazo, observacao: f.observacao.trim() };
    if (isNew) {
      const r = await store.addRequisito({ projectId: project.id, categoria: f.categoria, item: campos.item, descricao: campos.descricao, status: f.status });
      if (!r) { setSaving(false); return; }
      const extra = {};
      if (campos.responsavel) extra.responsavel = campos.responsavel;
      if (campos.prazo) extra.prazo = campos.prazo;
      if (campos.observacao) extra.observacao = campos.observacao;
      if (Object.keys(extra).length) await store.updateRequisito(r.id, extra);
      notify("Item adicionado");
    } else {
      await store.updateRequisito(cur.id, campos);
      notify("Item atualizado");
    }
    onClose();
  };
  return (
    <Drawer open={!!req} onClose={onClose} title={isNew ? "Adicionar item" : "Editar item"} sub={isNew ? "Requisito legal, da Caixa ou interno" : cur?.item}
      footer={<><button type="button" className="btn btn-quiet" onClick={onClose}>Cancelar</button><PqSave saving={saving} onClick={salvar}>{isNew ? "Adicionar item" : "Salvar alterações"}</PqSave></>}>
      <Field label="Item">
        <input ref={ref} className="input" value={f.item || ""} onChange={set("item")} placeholder="Ex.: Licença de supressão vegetal" />
        {tried && !f.item?.trim() && <span className="pq-err">Dê um nome para o item.</span>}
      </Field>
      <Field label="Descrição"><textarea className="textarea" rows={2} value={f.descricao || ""} onChange={set("descricao")} placeholder="O que é exigido e por quem" /></Field>
      <div className="grid cols-2 sm-1" style={{ gap: 12 }}>
        <Field label="Categoria">
          <select className="select" value={f.categoria} onChange={set("categoria")}>{Object.entries(REQ_CATEGORIAS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
        </Field>
        <Field label="Situação">
          <select className="select" value={f.status} onChange={set("status")}>{Object.entries(REQ_STATUS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
        </Field>
      </div>
      <div className="grid cols-2" style={{ gap: 12 }}>
        <Field label="Responsável"><input className="input" value={f.responsavel || ""} onChange={set("responsavel")} placeholder="Quem cuida" /></Field>
        <Field label="Prazo"><input type="date" className="input" value={f.prazo || ""} onChange={set("prazo")} /></Field>
      </div>
      <Field label="Observação"><textarea className="textarea" rows={3} value={f.observacao || ""} onChange={set("observacao")} placeholder="Protocolo, contato, pendências" /></Field>
    </Drawer>
  );
}

/* ============================================================
   Documentos
   ============================================================ */
function pqDocIcon(path) {
  if (!path) return FileX2;
  const ext = (path.split(".").pop() || "").toLowerCase();
  if (["jpg", "jpeg", "png", "webp", "heic", "gif"].includes(ext)) return FileImage;
  if (ext === "pdf") return FileText;
  return File;
}
function pqValidade(validade, hoje) {
  if (!validade) return null;
  const d = diffDaysISO(hoje, validade);
  if (d < 0) return { tone: "danger", txt: "Vencido", title: `Venceu em ${fmtData(validade)}` };
  if (d <= 30) return { tone: "warn", txt: d === 0 ? "Vence hoje" : `Vence em ${plural(d, "dia", "dias")}`, title: `Validade ${fmtData(validade)}` };
  return { tone: null, txt: `Válido até ${fmtData(validade)}` };
}

function ObraDocumentos({ store, project }) {
  pqUseCss();
  const notify = useToast();
  const hoje = todayISO();
  const docs = useMemo(() => store.data.documentos.filter((d) => d.projectId === project.id), [store.data.documentos, project.id]);
  const [filtro, setFiltro] = useState("todos");
  const [editando, setEditando] = useState(null);
  const lista = (filtro === "todos" ? docs : docs.filter((d) => d.categoria === filtro)).slice().sort((a, b) => (b.data || "").localeCompare(a.data || ""));
  const vencidos = docs.filter((d) => d.validade && d.validade < hoje).length;
  const vencendo = docs.filter((d) => d.validade && d.validade >= hoje && diffDaysISO(hoje, d.validade) <= 30).length;
  const avisoValidade = [vencidos && plural(vencidos, "documento vencido", "documentos vencidos"), vencendo && `${plural(vencendo, "documento vence", "documentos vencem")} nos próximos 30 dias`].filter(Boolean).join(" e ");
  const novoBtn = <button className="btn btn-ink" onClick={() => setEditando("novo")}><Plus size={17} />Arquivar documento</button>;

  return (
    <div>
      {!docs.length ? (
        <EmptyState icon={FolderOpen} title="Nenhum documento arquivado" text="Guarde alvará, ARTs, projetos, notas e liberações da obra. Informe a validade e o painel avisa 30 dias antes de vencer." action={novoBtn} />
      ) : (
        <>
          <div className="row between wrap gap-12 mb-16">
            <Segmented ariaLabel="Filtrar por categoria" value={filtro} onChange={setFiltro}
              options={[{ value: "todos", label: pqSegLabel("Todos", docs.length) }].concat(Object.entries(DOC_CATEGORIAS).map(([k, l]) => ({ value: k, label: pqSegLabel(l, docs.filter((d) => d.categoria === k).length) })))} />
            {novoBtn}
          </div>
          {avisoValidade && filtro === "todos" && (
            <div className="row gap-8 t-sm mb-12" style={{ color: vencidos ? "var(--danger)" : "var(--warn)", fontWeight: 600 }}><AlertTriangle size={15} style={{ flexShrink: 0 }} />{avisoValidade.charAt(0).toUpperCase() + avisoValidade.slice(1)}</div>
          )}
          {lista.length ? (
            <Sheet className="divide">
              {lista.map((d) => {
                const Ico = pqDocIcon(d.path); const v = pqValidade(d.validade, hoje);
                return (
                  <div key={d.id} className="pq-doc">
                    <div className={cx("ico", !d.path && "none")} title={d.path ? undefined : "Sem arquivo anexado"}><Ico size={19} /></div>
                    <div className="main">
                      <span className="clip" style={{ fontWeight: 650, fontSize: 15 }}>{d.titulo}</span>
                      <span className="pq-meta">
                        <span>{DOC_CATEGORIAS[d.categoria] || d.categoria}</span>
                        {d.data && <span className="t-muted">{fmtData(d.data)}</span>}
                        {d.descricao && <span className="t-muted clip" style={{ maxWidth: 280 }}>{d.descricao}</span>}
                        {!d.path && <span className="t-muted">Sem arquivo</span>}
                      </span>
                    </div>
                    <div className="val">{v && (v.tone ? <Pill tone={v.tone} title={v.title}>{v.txt}</Pill> : <span className="t-xs t-muted">{v.txt}</span>)}</div>
                    <div className="act">
                      {d.path && <IconBtn tip="Abrir arquivo" sm onClick={() => openFile(d.path)}><ExternalLink size={15} /></IconBtn>}
                      <IconBtn tip="Editar" sm onClick={() => setEditando(d)}><Pencil size={15} /></IconBtn>
                      <ConfirmDelete what="o documento" onConfirm={async () => { await store.deleteDocumento(d.id); notify("Documento excluído"); }} />
                    </div>
                  </div>
                );
              })}
            </Sheet>
          ) : (
            <Sheet className="pad row between wrap gap-12">
              <span className="t-sm t-muted">Nenhum documento em {DOC_CATEGORIAS[filtro]}.</span>
              <button className="btn btn-line btn-sm" onClick={() => setEditando({ __novoCat: filtro })}><Plus size={15} />Arquivar em {DOC_CATEGORIAS[filtro]}</button>
            </Sheet>
          )}
        </>
      )}
      <PqDocDrawer store={store} project={project} doc={editando} onClose={() => setEditando(null)} />
    </div>
  );
}

function PqDocDrawer({ store, project, doc, onClose }) {
  const notify = useToast();
  const ref = useRef(null);
  const novo = (d) => d === "novo" || !!d?.__novoCat;
  const { cur, f, set, setF, tried, setTried, saving, setSaving } = pqUseFormFor(doc, (d) => (novo(d)
    ? { categoria: d.__novoCat || "tecnico", titulo: "", descricao: "", data: todayISO(), validade: "", file: null }
    : { categoria: d.categoria || "outro", titulo: d.titulo || "", descricao: d.descricao || "", data: d.data || "", validade: d.validade || "" }));
  const isNew = novo(cur);
  const salvar = async () => {
    if (!f.titulo?.trim()) { setTried(true); ref.current?.focus(); return; }
    setSaving(true);
    if (isNew) {
      const r = await store.addDocumento({ projectId: project.id, categoria: f.categoria, titulo: f.titulo.trim(), descricao: f.descricao.trim(), data: f.data, validade: f.validade, file: f.file });
      if (!r) { setSaving(false); return; }
      notify("Documento arquivado");
    } else {
      await store.updateDocumento(cur.id, { categoria: f.categoria, titulo: f.titulo.trim(), descricao: f.descricao.trim(), data: f.data, validade: f.validade });
      notify("Documento atualizado");
    }
    onClose();
  };
  return (
    <Drawer open={!!doc} onClose={onClose} title={isNew ? "Arquivar documento" : "Editar documento"} sub={isNew ? project.name : cur?.titulo}
      footer={<><button type="button" className="btn btn-quiet" onClick={onClose}>Cancelar</button><PqSave saving={saving} onClick={salvar}>{isNew ? "Arquivar documento" : "Salvar alterações"}</PqSave></>}>
      <Field label="Título">
        <input ref={ref} className="input" value={f.titulo || ""} onChange={set("titulo")} placeholder="Ex.: Alvará de construção" />
        {tried && !f.titulo?.trim() && <span className="pq-err">Dê um título para o documento.</span>}
      </Field>
      <Field label="Categoria">
        <select className="select" value={f.categoria} onChange={set("categoria")}>{Object.entries(DOC_CATEGORIAS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
      </Field>
      <Field label="Descrição"><input className="input" value={f.descricao || ""} onChange={set("descricao")} placeholder="Órgão emissor, revisão, número" /></Field>
      <div className="grid cols-2" style={{ gap: 12 }}>
        <Field label="Data do documento"><input type="date" className="input" value={f.data || ""} onChange={set("data")} /></Field>
        <Field label="Validade"><input type="date" className="input" value={f.validade || ""} onChange={set("validade")} /></Field>
      </div>
      <span className="t-xs t-muted" style={{ marginTop: -8 }}>Com validade, o painel avisa 30 dias antes de vencer.</span>
      {isNew && <Field label="Arquivo"><FileField file={f.file} setFile={(x) => setF((o) => ({ ...o, file: x }))} accept="image/*,application/pdf" label="Anexar PDF ou foto" /></Field>}
    </Drawer>
  );
}

/* ======================= 99-app.jsx ======================= */
/* Raiz: tema, sessão, rotas e tours. */

function useTheme() {
  const [dark, setDark] = useState(() => {
    try { const s = localStorage.getItem("pc-theme"); if (s) return s === "dark"; } catch { /* */ }
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches || false;
  });
  useLayoutEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? "#111519" : "#ECEDE8");
    try { localStorage.setItem("pc-theme", dark ? "dark" : "light"); } catch { /* */ }
  }, [dark]);
  return [dark, setDark];
}

function tourPrincipal(go) {
  return [
    { title: "Tudo da obra em um lugar só", body: "Em um minuto você vê onde fica cada coisa. Dá para rever este tour quando quiser, em Como usar.", hero: <BrandMark size={48} /> },
    { target: '[data-tour="nav-painel"]', title: "Painel", body: "A visão de todas as obras: quanto já foi gasto, o que está atrasado e quanto você deve lucrar.", before: () => go({ page: "painel" }) },
    { target: '[data-tour="painel-alertas"]', title: "O que precisa de atenção", body: "Atrasos no cronograma, pendências de vistoria, documentos vencendo e gastos acima do orçamento. Toque em um alerta para ir direto ao ponto." },
    { target: '[data-tour="nav-obras"]', title: "Suas obras", body: "Aqui ficam todas as obras. Cada uma tem cronograma, vistoria na planta, gastos, unidades e documentos.", before: () => go({ page: "obras" }) },
    { target: '[data-tour="nova-obra"]', title: "Cadastre uma obra", body: "Comece pelo nome e pelo endereço. O resto você preenche aos poucos, dentro da obra." },
    { target: '[data-tour="obra-card"]', title: "Abra a obra", body: "Toque no cartão para ver a placa da obra, o cronograma e tudo o mais." },
    { target: '[data-tour="ajuda"]', title: "Rever o tour", body: "Sempre que precisar, use Como usar para ver este passo a passo de novo." },
  ];
}
function tourObra(go, id) {
  return [
    { target: '[data-tour="obra-placa"]', title: "A placa da obra", body: "Entrega prevista, avanço físico e unidades. Se o cronograma atrasar, a data de entrega fica vermelha com os dias de atraso." },
    { target: '[data-tour="obra-grupos"]', title: "Quatro áreas", body: "Visão geral, Execução, Financeiro e Qualidade. O número vermelho mostra quantos alertas sérios existem na área." },
    { target: '[data-tour="cron-gantt"]', title: "Cronograma", body: "Arraste uma barra para remarcar a atividade, ou puxe a ponta direita para mudar a duração. O atraso de uma etapa empurra as seguintes.", before: () => go({ page: "obra", id, aba: "cronograma" }, { replace: true }) },
    { target: '[data-tour="vistoria-planta"]', title: "Vistoria na planta", body: "Envie a foto da planta ou do ambiente e toque no ponto exato para marcar uma pendência.", before: () => go({ page: "obra", id, aba: "vistoria" }, { replace: true }) },
    { target: '[data-tour="obra-relatorio"]', title: "Relatório executivo", body: "Gera um relatório pronto para imprimir ou salvar em PDF, com cronograma, custos, vistoria e documentação.", before: () => go({ page: "obra", id, aba: "resumo" }, { replace: true }) },
  ];
}

function ConstrutoraApp({ session, dark, setDark }) {
  const notify = useToast();
  const store = useConstrutoraStore(session.user.id, notify);
  const [route, go] = useHashRoute();
  const [tour, setTour] = useState(null);
  const [editando, setEditando] = useState(null); // obra em edição (ou "nova")
  const uid = session.user.id;
  const skipAll = (() => { try { return localStorage.getItem("pc-skip-tours") === "1"; } catch { return false; } })();

  useEffect(() => {
    if (!store.loading && !skipAll && !tourSeen(uid, "principal")) setTimeout(() => setTour("principal"), 500);
  }, [store.loading]); // eslint-disable-line
  const closeTour = () => { markTour(uid, tour); setTour(null); };
  const onTourObra = () => { if (!skipAll && !tour && tourSeen(uid, "principal") && !tourSeen(uid, "obra")) setTimeout(() => setTour("obra"), 700); };

  const projects = store.data.projects;
  return (
    <AppShell route={route} go={go} projects={projects} data={store.data} email={session.user.email} dark={dark} setDark={setDark}
      onLogout={() => supabase.auth.signOut()} onTour={() => setTour(route.page === "obra" ? "obra" : "principal")}>
      {store.loading ? <LoadingPage /> : (
        <>
          {route.page === "painel" && <Painel store={store} go={go} onNovaObra={() => setEditando("nova")} />}
          {route.page === "obras" && <ObrasLista store={store} go={go} onNovaObra={() => setEditando("nova")} onEditar={setEditando} />}
          {route.page === "obra" && <ObraPage store={store} route={route} go={go} onEditar={setEditando} onTourObra={onTourObra} />}
        </>
      )}
      <ObraFormDrawer store={store} obra={editando} onClose={() => setEditando(null)} go={go} />
      {tour === "principal" && <Tour steps={tourPrincipal(go)} onClose={closeTour} />}
      {tour === "obra" && route.page === "obra" && <Tour steps={tourObra(go, route.id)} onClose={closeTour} />}
    </AppShell>
  );
}

function Root() {
  useGlobalStyles();
  const [dark, setDark] = useTheme();
  const [session, setSession] = useState(null);
  const [booting, setBooting] = useState(true);
  const [recovery, setRecovery] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setBooting(false); });
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => { setSession(s); if (event === "PASSWORD_RECOVERY") setRecovery(true); });
    return () => sub.subscription.unsubscribe();
  }, []);
  if (booting) return null;
  if (recovery) return <ResetPasswordScreen onDone={() => setRecovery(false)} />;
  if (!session) return <LoginScreen />;
  return <ConstrutoraApp session={session} dark={dark} setDark={setDark} />;
}

export default function App() {
  return <ToastHost><Root /></ToastHost>;
}
