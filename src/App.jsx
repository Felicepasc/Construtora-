import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  Tooltip, BarChart, Bar, CartesianGrid, Legend
} from "recharts";
import {
  Wallet, TrendingUp, TrendingDown, Target, LayoutDashboard, PlusCircle,
  BarChart3, LogOut, Moon, Sun, Trash2, Building2, Lock, Mail, AlertTriangle,
  Landmark, Gauge, HardHat, Repeat, ArrowLeft, Users, Heart, ListOrdered,
  FileText, Settings, Camera, ShieldAlert, ClipboardList, Image as ImageIcon,
  Ruler, FileCheck2, CheckCircle2, Circle
} from "lucide-react";
import { supabase } from "./lib/supabaseClient";

async function uploadReceipt(userId, file) {
  if (!file) return null;
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from("receipts").upload(path, file, { upsert: false });
  if (error) { console.error(error); return null; }
  return path;
}

async function openReceipt(path) {
  if (!path) return;
  const { data, error } = await supabase.storage.from("receipts").createSignedUrl(path, 60);
  if (error || !data) { alert("Não foi possível abrir a foto."); return; }
  window.open(data.signedUrl, "_blank");
}

/* Bucket genérico da obra (documentos técnicos, financeiros, desenhos,
   liberações, fotos de evolução e evidências de não conformidade). */
async function uploadObraFile(userId, file) {
  if (!file) return null;
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from("obra-docs").upload(path, file, { upsert: false });
  if (error) { console.error(error); return null; }
  return path;
}

async function openObraFile(path) {
  if (!path) return;
  const { data, error } = await supabase.storage.from("obra-docs").createSignedUrl(path, 60);
  if (error || !data) { alert("Não foi possível abrir o arquivo."); return; }
  window.open(data.signedUrl, "_blank");
}

function ObraFileField({ theme, file, setFile, label, accept }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <label style={{ display: "flex", alignItems: "center", gap: 8, background: theme.surface2, border: `1px solid ${theme.border}`, borderRadius: 10, padding: "10px 12px", cursor: "pointer", fontSize: 13, color: theme.subtext }}>
        📎 {file ? file.name : (label || "Anexar arquivo")}
        <input type="file" accept={accept || "image/*,application/pdf"} onChange={(e) => setFile(e.target.files?.[0] || null)} style={{ display: "none" }} />
      </label>
    </div>
  );
}

function CapaThumb({ path, theme, height = 120 }) {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    let active = true;
    if (!path) { setUrl(null); return; }
    supabase.storage.from("obra-docs").createSignedUrl(path, 300).then(({ data }) => { if (active && data) setUrl(data.signedUrl); });
    return () => { active = false; };
  }, [path]);
  if (!url) {
    return (
      <div style={{ height, background: theme.surface2, display: "flex", alignItems: "center", justifyContent: "center", color: theme.subtext }}>
        <ImageIcon size={26} />
      </div>
    );
  }
  return <div style={{ height, backgroundImage: `url(${url})`, backgroundSize: "cover", backgroundPosition: "center" }} />;
}

function ObraFileLink({ theme, path, label }) {
  if (!path) return null;
  return <button onClick={() => openObraFile(path)} style={{ background: "none", border: "none", cursor: "pointer", color: theme.accent, fontSize: 11, textDecoration: "underline" }}>{label || "abrir"}</button>;
}

function ReceiptField({ theme, file, setFile }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <label style={{ display: "flex", alignItems: "center", gap: 8, background: theme.surface2, border: `1px solid ${theme.border}`, borderRadius: 10, padding: "10px 12px", cursor: "pointer", fontSize: 13, color: theme.subtext }}>
        📎 {file ? file.name : "Anexar foto da nota/comprovante (opcional)"}
        <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} style={{ display: "none" }} />
      </label>
    </div>
  );
}

function ReceiptLink({ theme, path }) {
  if (!path) return null;
  return <button onClick={() => openReceipt(path)} style={{ background: "none", border: "none", cursor: "pointer", color: theme.accent, fontSize: 11, textDecoration: "underline" }}>ver nota</button>;
}

/* ================= helpers ================= */

const CATEGORY_KEYWORDS = [
  { cat: "Alimentação", words: ["café", "cafe", "restaurante", "mercado", "lanche", "almoço", "almoco", "janta", "padaria", "ifood"] },
  { cat: "Transporte", words: ["gasolina", "combustível", "combustivel", "uber", "99", "onibus", "ônibus", "estacionamento", "pedagio", "pedágio"] },
  { cat: "Moradia", words: ["aluguel", "condominio", "condomínio", "luz", "energia", "agua", "água", "internet", "gas", "gás"] },
  { cat: "Saúde", words: ["farmacia", "farmácia", "remedio", "remédio", "plano de saude", "plano de saúde", "medico", "médico"] },
  { cat: "Lazer", words: ["cinema", "viagem", "bar", "show", "streaming", "netflix", "spotify"] },
  { cat: "Educação", words: ["curso", "faculdade", "escola", "livro"] },
  { cat: "Compras", words: ["roupa", "loja", "presente", "shopping"] },
];
function guessCategory(text) {
  const low = text.toLowerCase();
  for (const { cat, words } of CATEGORY_KEYWORDS) if (words.some((w) => low.includes(w))) return cat;
  return "Outros";
}
function parseQuickEntry(raw) {
  const trimmed = raw.trim();
  const match = trimmed.match(/(-?\d+(?:[.,]\d+)?)\s*$/);
  if (!match) return null;
  const value = parseFloat(match[1].replace(",", "."));
  if (isNaN(value)) return null;
  const desc = trimmed.slice(0, match.index).trim() || "Lançamento";
  return { desc, value: Math.abs(value) };
}
function fmtBRL(n) {
  return (Number(n) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function todayISO() { return new Date().toISOString().slice(0, 10); }
function monthKey(d) { return (d || todayISO()).slice(0, 7); }
function daysLeftInMonth() {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return Math.max(1, end.getDate() - now.getDate() + 1);
}
function thresholdMessage(type, value) {
  if (type !== "despesa") return null;
  if (value > 5000) return "pra que isso?";
  if (value > 1000) return "Felice vai reclamar";
  return null;
}

const CATS = ["Alimentação", "Transporte", "Moradia", "Saúde", "Lazer", "Educação", "Compras", "Outros"];
const INV_TYPES = ["Renda Fixa", "Fundos", "Ações", "FIIs", "Cripto", "Previdência", "Exterior"];
const COLORS = ["#1F8A70", "#C9A227", "#3E6B8A", "#E2574C", "#8A5CC9", "#4C8FE2", "#B0763C", "#6BA37A"];
const OBRA_CATS = ["Materiais", "Mão de obra", "Terceirizados", "Locação de equipamentos", "Projetos/Engenharia", "Taxas/Impostos", "Administrativo", "Outros"];

const FONT_DISPLAY = "'Inter', -apple-system, sans-serif";
const FONT_BODY = "'Inter', -apple-system, sans-serif";
const FONT_MONO = "'JetBrains Mono', 'Courier New', monospace";

/* Paleta "sistema de obras": navy + verde, no mesmo espírito visual do
   Cronograma e do Recebimento de Obra já usados internamente. */
const THEME = {
  dark: { bg: "#080F3D", surface: "#0E1750", surface2: "#0A1244", text: "#E8EAF6", subtext: "#8087C2", border: "#2A3380", accent: "#53D697", accentSoft: "#123B2E", gold: "#F59E0B", goldSoft: "#3A2C10", danger: "#E0414B", dangerSoft: "#3A1116", navy: "#00176D", navy2: "#5548EE" },
  light: { bg: "#EEF0F7", surface: "#FFFFFF", surface2: "#F2F3F9", text: "#1A1F3D", subtext: "#6B7290", border: "#D5D9E8", accent: "#1EA968", accentSoft: "#DFF5EA", gold: "#C9790A", goldSoft: "#FBEFDC", danger: "#D6303C", dangerSoft: "#FDECEC", navy: "#00176D", navy2: "#574AEE" },
};

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(() => typeof window !== "undefined" && window.matchMedia("(min-width: 900px)").matches);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 900px)");
    const handler = (e) => setIsDesktop(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return isDesktop;
}

/* ================= shared UI ================= */

function Card({ theme, children, style }) {
  return <div style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 12, padding: 16, marginBottom: 14, boxShadow: "0 1px 2px rgba(0,0,0,0.12)", ...style }}>{children}</div>;
}
function SectionLabel({ theme, children }) {
  return <div style={{ fontSize: 11, fontWeight: 800, color: theme.subtext, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8 }}>{children}</div>;
}
function StatusPill({ theme, tone, children }) {
  const map = {
    ok: { bg: theme.accentSoft, fg: theme.accent },
    warn: { bg: theme.goldSoft, fg: theme.gold },
    danger: { bg: theme.dangerSoft, fg: theme.danger },
    neutral: { bg: theme.surface2, fg: theme.subtext },
  };
  const c = map[tone] || map.neutral;
  return <span style={{ fontSize: 10, fontWeight: 800, color: c.fg, background: c.bg, padding: "3px 9px", borderRadius: 99, whiteSpace: "nowrap", letterSpacing: "0.02em" }}>{children}</span>;
}
function Toast({ toast, theme }) {
  return (
    <div style={{ position: "fixed", bottom: 84, left: "50%", transform: "translateX(-50%)", background: toast.kind === "err" ? theme.danger : theme.accent, color: "#fff", padding: "10px 18px", borderRadius: 999, fontSize: 13, fontWeight: 600, zIndex: 50, maxWidth: 400 }}>
      {toast.msg}
    </div>
  );
}
function inputStyle(theme) { return { flex: 1, background: theme.surface2, border: `1px solid ${theme.border}`, borderRadius: 8, padding: "10px 12px", color: theme.text, fontSize: 14, outline: "none", fontFamily: FONT_BODY }; }
function primaryBtn(theme) { return { background: theme.accent, color: "#04150D", border: "none", borderRadius: 8, padding: "10px 16px", fontWeight: 800, cursor: "pointer", fontSize: 14 }; }
function EmptyHint({ theme, text }) { return <div style={{ fontSize: 12, color: theme.subtext, textAlign: "center", padding: "16px 0" }}>{text}</div>; }
function MiniStat({ theme, label, value, color }) {
  return <div><div style={{ fontSize: 11, color: theme.subtext }}>{label}</div><div style={{ fontFamily: FONT_MONO, fontSize: 15, fontWeight: 700, color: color || theme.text }}>{value}</div></div>;
}
function IconBtn({ theme, onClick, children, title }) {
  return <button title={title} onClick={onClick} style={{ width: 36, height: 36, borderRadius: 10, border: `1px solid ${theme.border}`, background: theme.surface, color: theme.text, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>{children}</button>;
}
function Loading({ theme }) {
  return <div style={{ textAlign: "center", padding: 40, color: theme.subtext, fontSize: 13 }}>Carregando dados...</div>;
}

/* ================= app shell (responsive nav) ================= */

function TopBar({ theme, dark, setDark, email, onLogout, isDesktop }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: isDesktop ? "12px 20px" : "14px 16px",
      background: `linear-gradient(135deg, ${theme.navy} 0%, ${theme.navy2} 100%)`,
      borderBottom: `2px solid ${theme.accent}`, position: "sticky", top: 0, zIndex: 40,
    }}>
      {!isDesktop && (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: theme.accent, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <HardHat size={16} color="#04150D" />
          </div>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 14, fontWeight: 800, color: "#fff" }}>Construtora</div>
        </div>
      )}
      {isDesktop && (
        <div>
          <div style={{ fontSize: 11, color: "#B8C0F0" }}>Conectado como</div>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 14, fontWeight: 700, color: "#fff" }}>{email}</div>
        </div>
      )}
      <div style={{ display: "flex", gap: 8 }}>
        <button title={dark ? "Modo claro" : "Modo escuro"} onClick={() => setDark(!dark)} style={{ width: 34, height: 34, borderRadius: 8, border: "1px solid rgba(255,255,255,0.25)", background: "rgba(255,255,255,0.08)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>{dark ? <Sun size={16} /> : <Moon size={16} />}</button>
        <button title="Sair" onClick={onLogout} style={{ width: 34, height: 34, borderRadius: 8, border: "1px solid rgba(255,255,255,0.25)", background: "rgba(255,255,255,0.08)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><LogOut size={16} /></button>
      </div>
    </div>
  );
}

function BottomNav({ tab, setTab, theme, navItems }) {
  return (
    <div style={{ position: "sticky", bottom: 0, display: "flex", background: theme.surface, borderTop: `1px solid ${theme.border}`, padding: "8px 4px" }}>
      {navItems.map(({ key, label, icon: Icon }) => {
        const active = tab === key;
        return (
          <button key={key} onClick={() => setTab(key)} style={{ flex: 1, background: "transparent", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, color: active ? theme.accent : theme.subtext, padding: "4px 0" }}>
            <Icon size={19} strokeWidth={active ? 2.4 : 1.8} />
            <span style={{ fontSize: 10, fontWeight: active ? 700 : 500 }}>{label}</span>
          </button>
        );
      })}
    </div>
  );
}

function Sidebar({ tab, setTab, theme, navItems, title }) {
  return (
    <div style={{ width: 226, flexShrink: 0, background: theme.navy, display: "flex", flexDirection: "column", gap: 2, padding: "18px 10px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 8px 20px" }}>
        <div style={{ width: 30, height: 30, borderRadius: 8, background: theme.accent, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <HardHat size={16} color="#04150D" />
        </div>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 14.5, fontWeight: 800, color: "#fff", lineHeight: 1.2 }}>{title}</div>
      </div>
      {navItems.map(({ key, label, icon: Icon }) => {
        const active = tab === key;
        return (
          <button key={key} onClick={() => setTab(key)} style={{
            display: "flex", alignItems: "center", gap: 10, background: active ? "rgba(83,214,151,0.14)" : "transparent",
            border: "none", borderLeft: active ? `3px solid ${theme.accent}` : "3px solid transparent",
            borderRadius: 6, padding: "10px 11px", cursor: "pointer", textAlign: "left",
            color: active ? "#fff" : "#AEB6E8", fontWeight: active ? 700 : 500, fontSize: 13.5,
          }}>
            <Icon size={17} color={active ? theme.accent : "#8087C2"} />{label}
          </button>
        );
      })}
    </div>
  );
}

function AppShell({ theme, dark, setDark, email, onLogout, isDesktop, navItems, tab, setTab, sidebarTitle, children }) {
  return (
    <div style={{ display: "flex", flexDirection: isDesktop ? "row" : "column", flex: 1, width: "100%" }}>
      {isDesktop && <Sidebar tab={tab} setTab={setTab} theme={theme} navItems={navItems} title={sidebarTitle} />}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <TopBar theme={theme} dark={dark} setDark={setDark} email={email} onLogout={onLogout} isDesktop={isDesktop} />
        <div style={{ flex: 1, overflowY: "auto", background: theme.bg, padding: isDesktop ? "20px 28px 40px" : "14px 16px 90px" }}>{children}</div>
        {!isDesktop && <BottomNav tab={tab} setTab={setTab} theme={theme} navItems={navItems} />}
      </div>
    </div>
  );
}

const styles = {
  shell: { minHeight: "100vh", display: "flex", flexDirection: "column", fontFamily: FONT_BODY, margin: "0 auto", width: "100%", transition: "max-width 0.15s" },
};

/* ================= auth ================= */

function AuthScreen({ theme, showToast }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (mode === "forgot") {
      if (!email.trim()) return showToast("Digite seu e-mail.", "err");
      setBusy(true);
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin });
      setBusy(false);
      if (error) return showToast(error.message, "err");
      showToast("Link de redefinição enviado. Confira seu e-mail.");
      setMode("login");
      return;
    }
    if (!email.trim() || !password) return showToast("Preencha e-mail e senha.", "err");
    setBusy(true);
    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({ email: email.trim(), password });
      if (error) showToast(error.message, "err");
      else showToast("Conta criada! Verifique seu e-mail se a confirmação estiver ativada.");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) showToast(error.message, "err");
    }
    setBusy(false);
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: 28, maxWidth: 420, margin: "0 auto", width: "100%" }}>
      <div style={{ textAlign: "center", marginBottom: 36 }}>
        <div style={{ width: 56, height: 56, borderRadius: 14, background: theme.accentSoft, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
          <HardHat size={28} color={theme.gold} />
        </div>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 26, fontWeight: 700 }}>Pascaretta Construtora</div>
        <div style={{ color: theme.subtext, fontSize: 13, marginTop: 4 }}>Gestão de obras — financeiro, execução e conformidade</div>
      </div>
      <Card theme={theme}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: theme.surface2, border: `1px solid ${theme.border}`, borderRadius: 10, padding: "10px 12px", marginBottom: 10 }}>
          <Mail size={16} color={theme.subtext} />
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E-mail" style={{ background: "transparent", border: "none", outline: "none", color: theme.text, fontSize: 14, flex: 1 }} />
        </div>
        {mode !== "forgot" && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, background: theme.surface2, border: `1px solid ${theme.border}`, borderRadius: 10, padding: "10px 12px", marginBottom: 10 }}>
            <Lock size={16} color={theme.subtext} />
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Senha" style={{ background: "transparent", border: "none", outline: "none", color: theme.text, fontSize: 14, flex: 1 }} />
          </div>
        )}
        <button onClick={submit} disabled={busy} style={{ width: "100%", background: theme.accent, color: "#fff", border: "none", borderRadius: 12, padding: "13px 0", fontWeight: 700, fontSize: 15, cursor: "pointer", opacity: busy ? 0.7 : 1 }}>
          {mode === "login" ? "Entrar" : mode === "signup" ? "Criar conta" : "Enviar link de redefinição"}
        </button>
      </Card>
      <div style={{ textAlign: "center", fontSize: 13, color: theme.subtext, display: "flex", flexDirection: "column", gap: 8 }}>
        {mode === "login" && (
          <>
            <span>Não tem conta? <a onClick={() => setMode("signup")} style={{ color: theme.accent, cursor: "pointer", fontWeight: 600 }}>Criar agora</a></span>
            <span><a onClick={() => setMode("forgot")} style={{ color: theme.subtext, cursor: "pointer", textDecoration: "underline" }}>Esqueci minha senha</a></span>
          </>
        )}
        {mode === "signup" && <span>Já tem conta? <a onClick={() => setMode("login")} style={{ color: theme.accent, cursor: "pointer", fontWeight: 600 }}>Entrar</a></span>}
        {mode === "forgot" && <span><a onClick={() => setMode("login")} style={{ color: theme.accent, cursor: "pointer", fontWeight: 600 }}>Voltar ao login</a></span>}
      </div>
    </div>
  );
}

function ResetPasswordScreen({ theme, showToast, onDone }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (password.length < 6) return showToast("A senha precisa ter ao menos 6 caracteres.", "err");
    if (password !== confirm) return showToast("As senhas não coincidem.", "err");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) return showToast(error.message, "err");
    showToast("Senha atualizada com sucesso.");
    onDone();
  };
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: 28, maxWidth: 420, margin: "0 auto", width: "100%" }}>
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 700 }}>Definir nova senha</div>
      </div>
      <Card theme={theme}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: theme.surface2, border: `1px solid ${theme.border}`, borderRadius: 10, padding: "10px 12px", marginBottom: 10 }}>
          <Lock size={16} color={theme.subtext} />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Nova senha" style={{ background: "transparent", border: "none", outline: "none", color: theme.text, fontSize: 14, flex: 1 }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: theme.surface2, border: `1px solid ${theme.border}`, borderRadius: 10, padding: "10px 12px", marginBottom: 10 }}>
          <Lock size={16} color={theme.subtext} />
          <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Confirmar nova senha" style={{ background: "transparent", border: "none", outline: "none", color: theme.text, fontSize: 14, flex: 1 }} />
        </div>
        <button onClick={submit} disabled={busy} style={{ width: "100%", background: theme.accent, color: "#fff", border: "none", borderRadius: 12, padding: "13px 0", fontWeight: 700, fontSize: 15, cursor: "pointer", opacity: busy ? 0.7 : 1 }}>
          Salvar nova senha
        </button>
      </Card>
    </div>
  );
}

/* ================= CONSTRUTORA APP ================= */

function useConstrutoraStore(userId) {
  const [data, setData] = useState({ projects: [], units: [], investors: [], budgetItems: [], actualCosts: [], documentos: [], fotos: [], naoConformidades: [], requisitos: [], etapas: [], unidadeEtapas: [], cronograma: [], vistoria: [], pranchas: [], pins: [] });
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const [pj, un, iv, bi, ac, doc, ft, nc, rq, et, ue, cr, vi, pr, pn] = await Promise.all([
      supabase.from("projects").select("*").order("created_at", { ascending: true }),
      supabase.from("units").select("*").order("created_at", { ascending: true }),
      supabase.from("investors").select("*").order("created_at", { ascending: true }),
      supabase.from("budget_items").select("*").order("created_at", { ascending: true }),
      supabase.from("actual_costs").select("*").order("date", { ascending: false }),
      supabase.from("obra_documentos").select("*").order("data", { ascending: false }),
      supabase.from("obra_fotos").select("*").order("data", { ascending: false }),
      supabase.from("nao_conformidades").select("*").order("data_abertura", { ascending: false }),
      supabase.from("requisitos_checklist").select("*").order("categoria", { ascending: true }),
      supabase.from("obra_etapas").select("*").order("ordem", { ascending: true }),
      supabase.from("unidade_etapas").select("*").order("ordem", { ascending: true }),
      supabase.from("obra_cronograma").select("*").order("ordem", { ascending: true }),
      supabase.from("obra_vistoria_itens").select("*").order("data", { ascending: false }),
      supabase.from("obra_vistoria_pranchas").select("*").order("created_at", { ascending: true }),
      supabase.from("obra_vistoria_pins").select("*").order("created_at", { ascending: true }),
    ]);
    setData({
      projects: (pj.data || []).map((p) => ({ id: p.id, name: p.name, address: p.address, status: p.status, startDate: p.start_date, endDateEstimated: p.end_date_estimated, notes: p.notes, progressoPct: Number(p.progresso_pct || 0), municipio: p.municipio || "Paulista/PE", financiamento: p.financiamento || "MCMV", capaPath: p.capa_path || null })),
      units: (un.data || []).map((u) => ({ id: u.id, projectId: u.project_id, code: u.code, area: u.area_m2, type: u.type, salePriceEstimated: Number(u.sale_price_estimated), salePriceReal: u.sale_price_real == null ? null : Number(u.sale_price_real), status: u.status, custoDocumentacao: Number(u.custo_documentacao || 0), custoCorretagem: Number(u.custo_corretagem || 0) })),
      investors: (iv.data || []).map((i) => ({ id: i.id, unitId: i.unit_id, name: i.investor_name, amountInvested: Number(i.amount_invested), estimatedProfit: Number(i.estimated_profit), realProfit: i.real_profit == null ? null : Number(i.real_profit), notes: i.notes })),
      budgetItems: (bi.data || []).map((b) => ({ id: b.id, projectId: b.project_id, category: b.category, description: b.description, estimatedValue: Number(b.estimated_value) })),
      actualCosts: (ac.data || []).map((a) => ({ id: a.id, projectId: a.project_id, budgetItemId: a.budget_item_id, category: a.category, description: a.description, value: Number(a.value), date: a.date, supplier: a.supplier, receiptPath: a.receipt_path || null })),
      documentos: (doc.data || []).map((d) => ({ id: d.id, projectId: d.project_id, categoria: d.categoria, titulo: d.titulo, descricao: d.descricao, path: d.path, data: d.data, validade: d.validade })),
      fotos: (ft.data || []).map((f) => ({ id: f.id, projectId: f.project_id, path: f.path, legenda: f.legenda, etapa: f.etapa, data: f.data })),
      naoConformidades: (nc.data || []).map((n) => ({ id: n.id, projectId: n.project_id, titulo: n.titulo, descricao: n.descricao, categoria: n.categoria, gravidade: n.gravidade, responsavel: n.responsavel, dataAbertura: n.data_abertura, prazo: n.prazo, status: n.status, dataResolucao: n.data_resolucao, acaoCorretiva: n.acao_corretiva, pathFoto: n.path_foto })),
      requisitos: (rq.data || []).map((r) => ({ id: r.id, projectId: r.project_id, categoria: r.categoria, item: r.item, descricao: r.descricao, status: r.status, responsavel: r.responsavel, prazo: r.prazo, observacao: r.observacao, pathDoc: r.path_doc })),
      etapas: (et.data || []).map((e) => ({ id: e.id, projectId: e.project_id, ordem: e.ordem, nome: e.nome, status: e.status, dataConclusao: e.data_conclusao, fotoPath: e.foto_path || null })),
      unidadeEtapas: (ue.data || []).map((e) => ({ id: e.id, unitId: e.unit_id, ordem: e.ordem, nome: e.nome, status: e.status, dataConclusao: e.data_conclusao, fotoPath: e.foto_path || null })),
      cronograma: (cr.data || []).map((c) => ({ id: c.id, projectId: c.project_id, ordem: c.ordem, nome: c.nome, dataInicio: c.data_inicio, duracaoDias: c.duracao_dias, predecessoraId: c.predecessora_id, avancoPct: Number(c.avanco_pct || 0), responsavel: c.responsavel, critica: !!c.critica })),
      vistoria: (vi.data || []).map((v) => ({ id: v.id, projectId: v.project_id, ambiente: v.ambiente, item: v.item, status: v.status, observacao: v.observacao, responsavel: v.responsavel, prazo: v.prazo, pathFoto: v.path_foto, data: v.data })),
      pranchas: (pr.data || []).map((p) => ({ id: p.id, projectId: p.project_id, titulo: p.titulo, path: p.path, createdAt: p.created_at })),
      pins: (pn.data || []).map((x) => ({ id: x.id, pranchaId: x.prancha_id, xPct: Number(x.x_pct), yPct: Number(x.y_pct), item: x.item, status: x.status, observacao: x.observacao, responsavel: x.responsavel, prazo: x.prazo, pathFoto: x.path_foto, createdAt: x.created_at })),
    });
    setLoading(false);
  }, [userId]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const addProject = async (p) => {
    const { data: row, error } = await supabase.from("projects").insert({ user_id: userId, name: p.name, address: p.address || null, status: "em_andamento" }).select().single();
    if (!error) setData((d) => ({ ...d, projects: [...d.projects, { id: row.id, name: row.name, address: row.address, status: row.status, startDate: row.start_date, endDateEstimated: row.end_date_estimated, notes: row.notes }] }));
    return error;
  };
  const updateProject = async (id, updates) => {
    const payload = {};
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.address !== undefined) payload.address = updates.address;
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.progressoPct !== undefined) payload.progresso_pct = updates.progressoPct;
    if (updates.municipio !== undefined) payload.municipio = updates.municipio;
    if (updates.financiamento !== undefined) payload.financiamento = updates.financiamento;
    if (updates.capaPath !== undefined) payload.capa_path = updates.capaPath;
    await supabase.from("projects").update(payload).eq("id", id);
    setData((d) => ({ ...d, projects: d.projects.map((p) => p.id === id ? { ...p, ...updates } : p) }));
  };
  const deleteProject = async (id) => {
    await supabase.from("projects").delete().eq("id", id);
    setData((d) => ({ ...d, projects: d.projects.filter((p) => p.id !== id) }));
  };

  const addUnit = async (u) => {
    const { data: row, error } = await supabase.from("units").insert({ user_id: userId, project_id: u.projectId, code: u.code, area_m2: u.area || null, type: u.type, sale_price_estimated: u.salePriceEstimated || 0, status: "disponivel" }).select().single();
    if (!error) setData((d) => ({ ...d, units: [...d.units, { id: row.id, projectId: row.project_id, code: row.code, area: row.area_m2, type: row.type, salePriceEstimated: Number(row.sale_price_estimated), salePriceReal: null, status: row.status, custoDocumentacao: Number(row.custo_documentacao || 0), custoCorretagem: Number(row.custo_corretagem || 0) }] }));
    return { error, row };
  };
  const updateUnit = async (id, updates) => {
    const payload = {};
    if (updates.code !== undefined) payload.code = updates.code;
    if (updates.area !== undefined) payload.area_m2 = updates.area;
    if (updates.salePriceEstimated !== undefined) payload.sale_price_estimated = updates.salePriceEstimated;
    if (updates.salePriceReal !== undefined) payload.sale_price_real = updates.salePriceReal;
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.custoDocumentacao !== undefined) payload.custo_documentacao = updates.custoDocumentacao;
    if (updates.custoCorretagem !== undefined) payload.custo_corretagem = updates.custoCorretagem;
    await supabase.from("units").update(payload).eq("id", id);
    setData((d) => ({ ...d, units: d.units.map((u) => u.id === id ? { ...u, ...updates } : u) }));
  };
  const deleteUnit = async (id) => {
    await supabase.from("units").delete().eq("id", id);
    setData((d) => ({ ...d, units: d.units.filter((u) => u.id !== id), investors: d.investors.filter((i) => i.unitId !== id) }));
  };

  const addInvestor = async (inv) => {
    const { data: row, error } = await supabase.from("investors").insert({ user_id: userId, unit_id: inv.unitId, investor_name: inv.name, amount_invested: inv.amountInvested || 0, estimated_profit: inv.estimatedProfit || 0 }).select().single();
    if (!error) setData((d) => ({ ...d, investors: [...d.investors, { id: row.id, unitId: row.unit_id, name: row.investor_name, amountInvested: Number(row.amount_invested), estimatedProfit: Number(row.estimated_profit), realProfit: null, notes: row.notes }] }));
  };
  const updateInvestor = async (id, updates) => {
    const payload = {};
    if (updates.name !== undefined) payload.investor_name = updates.name;
    if (updates.amountInvested !== undefined) payload.amount_invested = updates.amountInvested;
    if (updates.estimatedProfit !== undefined) payload.estimated_profit = updates.estimatedProfit;
    if (updates.realProfit !== undefined) payload.real_profit = updates.realProfit;
    await supabase.from("investors").update(payload).eq("id", id);
    setData((d) => ({ ...d, investors: d.investors.map((i) => i.id === id ? { ...i, ...updates } : i) }));
  };
  const deleteInvestor = async (id) => {
    await supabase.from("investors").delete().eq("id", id);
    setData((d) => ({ ...d, investors: d.investors.filter((i) => i.id !== id) }));
  };

  const addBudgetItem = async (b) => {
    const { data: row, error } = await supabase.from("budget_items").insert({ user_id: userId, project_id: b.projectId, category: b.category, description: b.description || null, estimated_value: b.estimatedValue }).select().single();
    if (!error) setData((d) => ({ ...d, budgetItems: [...d.budgetItems, { id: row.id, projectId: row.project_id, category: row.category, description: row.description, estimatedValue: Number(row.estimated_value) }] }));
  };
  const updateBudgetItem = async (id, updates) => {
    const payload = {};
    if (updates.category !== undefined) payload.category = updates.category;
    if (updates.description !== undefined) payload.description = updates.description;
    if (updates.estimatedValue !== undefined) payload.estimated_value = updates.estimatedValue;
    await supabase.from("budget_items").update(payload).eq("id", id);
    setData((d) => ({ ...d, budgetItems: d.budgetItems.map((b) => b.id === id ? { ...b, ...updates } : b) }));
  };
  const deleteBudgetItem = async (id) => {
    await supabase.from("budget_items").delete().eq("id", id);
    setData((d) => ({ ...d, budgetItems: d.budgetItems.filter((b) => b.id !== id) }));
  };

  const addActualCost = async (a) => {
    const receiptPath = a.receiptFile ? await uploadReceipt(userId, a.receiptFile) : null;
    const { data: row, error } = await supabase.from("actual_costs").insert({ user_id: userId, project_id: a.projectId, budget_item_id: a.budgetItemId || null, category: a.category, description: a.description || null, value: a.value, date: a.date || todayISO(), supplier: a.supplier || null, receipt_path: receiptPath }).select().single();
    if (!error) setData((d) => ({ ...d, actualCosts: [{ id: row.id, projectId: row.project_id, budgetItemId: row.budget_item_id, category: row.category, description: row.description, value: Number(row.value), date: row.date, supplier: row.supplier, receiptPath: row.receipt_path || null }, ...d.actualCosts] }));
  };
  const updateActualCost = async (id, updates) => {
    const payload = {};
    if (updates.value !== undefined) payload.value = updates.value;
    if (updates.date !== undefined) payload.date = updates.date;
    if (updates.category !== undefined) payload.category = updates.category;
    if (updates.description !== undefined) payload.description = updates.description;
    if (updates.supplier !== undefined) payload.supplier = updates.supplier;
    await supabase.from("actual_costs").update(payload).eq("id", id);
    setData((d) => ({ ...d, actualCosts: d.actualCosts.map((a) => a.id === id ? { ...a, ...updates } : a) }));
  };
  const deleteActualCost = async (id) => {
    await supabase.from("actual_costs").delete().eq("id", id);
    setData((d) => ({ ...d, actualCosts: d.actualCosts.filter((a) => a.id !== id) }));
  };

  const addDocumento = async (doc) => {
    const path = doc.file ? await uploadObraFile(userId, doc.file) : null;
    if (doc.file && !path) return;
    const { data: row, error } = await supabase.from("obra_documentos").insert({ user_id: userId, project_id: doc.projectId, categoria: doc.categoria, titulo: doc.titulo, descricao: doc.descricao || null, path, data: doc.data || todayISO(), validade: doc.validade || null }).select().single();
    if (!error) setData((d) => ({ ...d, documentos: [{ id: row.id, projectId: row.project_id, categoria: row.categoria, titulo: row.titulo, descricao: row.descricao, path: row.path, data: row.data, validade: row.validade }, ...d.documentos] }));
  };
  const deleteDocumento = async (id) => {
    await supabase.from("obra_documentos").delete().eq("id", id);
    setData((d) => ({ ...d, documentos: d.documentos.filter((x) => x.id !== id) }));
  };

  const addFoto = async (f) => {
    const path = await uploadObraFile(userId, f.file);
    if (!path) return;
    const { data: row, error } = await supabase.from("obra_fotos").insert({ user_id: userId, project_id: f.projectId, path, legenda: f.legenda || null, etapa: f.etapa || null, data: f.data || todayISO() }).select().single();
    if (!error) setData((d) => ({ ...d, fotos: [{ id: row.id, projectId: row.project_id, path: row.path, legenda: row.legenda, etapa: row.etapa, data: row.data }, ...d.fotos] }));
  };
  const deleteFoto = async (id) => {
    await supabase.from("obra_fotos").delete().eq("id", id);
    setData((d) => ({ ...d, fotos: d.fotos.filter((x) => x.id !== id) }));
  };

  const addNaoConformidade = async (n) => {
    const pathFoto = n.file ? await uploadObraFile(userId, n.file) : null;
    const { data: row, error } = await supabase.from("nao_conformidades").insert({ user_id: userId, project_id: n.projectId, titulo: n.titulo, descricao: n.descricao || null, categoria: n.categoria || "execucao", gravidade: n.gravidade || "media", responsavel: n.responsavel || null, data_abertura: n.dataAbertura || todayISO(), prazo: n.prazo || null, status: "aberta", path_foto: pathFoto }).select().single();
    if (!error) setData((d) => ({ ...d, naoConformidades: [{ id: row.id, projectId: row.project_id, titulo: row.titulo, descricao: row.descricao, categoria: row.categoria, gravidade: row.gravidade, responsavel: row.responsavel, dataAbertura: row.data_abertura, prazo: row.prazo, status: row.status, dataResolucao: row.data_resolucao, acaoCorretiva: row.acao_corretiva, pathFoto: row.path_foto }, ...d.naoConformidades] }));
  };
  const updateNaoConformidade = async (id, updates) => {
    const payload = {};
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.acaoCorretiva !== undefined) payload.acao_corretiva = updates.acaoCorretiva;
    if (updates.dataResolucao !== undefined) payload.data_resolucao = updates.dataResolucao;
    if (updates.responsavel !== undefined) payload.responsavel = updates.responsavel;
    if (updates.prazo !== undefined) payload.prazo = updates.prazo;
    await supabase.from("nao_conformidades").update(payload).eq("id", id);
    setData((d) => ({ ...d, naoConformidades: d.naoConformidades.map((x) => x.id === id ? { ...x, ...updates } : x) }));
  };
  const deleteNaoConformidade = async (id) => {
    await supabase.from("nao_conformidades").delete().eq("id", id);
    setData((d) => ({ ...d, naoConformidades: d.naoConformidades.filter((x) => x.id !== id) }));
  };

  const addRequisito = async (r) => {
    const { data: row, error } = await supabase.from("requisitos_checklist").insert({ user_id: userId, project_id: r.projectId, categoria: r.categoria || "municipal", item: r.item, descricao: r.descricao || null, status: "pendente" }).select().single();
    if (!error) setData((d) => ({ ...d, requisitos: [...d.requisitos, { id: row.id, projectId: row.project_id, categoria: row.categoria, item: row.item, descricao: row.descricao, status: row.status, responsavel: row.responsavel, prazo: row.prazo, observacao: row.observacao, pathDoc: row.path_doc }] }));
  };
  const updateRequisito = async (id, updates) => {
    const payload = {};
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.responsavel !== undefined) payload.responsavel = updates.responsavel;
    if (updates.observacao !== undefined) payload.observacao = updates.observacao;
    if (updates.prazo !== undefined) payload.prazo = updates.prazo;
    if (updates.item !== undefined) payload.item = updates.item;
    if (updates.descricao !== undefined) payload.descricao = updates.descricao;
    if (updates.categoria !== undefined) payload.categoria = updates.categoria;
    await supabase.from("requisitos_checklist").update(payload).eq("id", id);
    setData((d) => ({ ...d, requisitos: d.requisitos.map((x) => x.id === id ? { ...x, ...updates } : x) }));
  };
  const deleteRequisito = async (id) => {
    await supabase.from("requisitos_checklist").delete().eq("id", id);
    setData((d) => ({ ...d, requisitos: d.requisitos.filter((x) => x.id !== id) }));
  };
  const seedRequisitos = async (projectId) => {
    await supabase.rpc("seed_requisitos_checklist", { p_project_id: projectId, p_user_id: userId });
    await loadAll();
  };

  const setCapa = async (projectId, file) => {
    const path = await uploadObraFile(userId, file);
    if (!path) return;
    await updateProject(projectId, { capaPath: path });
  };

  const seedEtapas = async (projectId) => {
    await supabase.rpc("seed_etapas_padrao", { p_project_id: projectId, p_user_id: userId });
    await loadAll();
  };
  const addEtapa = async (e) => {
    const existentes = data.etapas.filter((x) => x.projectId === e.projectId).map((x) => x.ordem || 0);
    const maxOrdem = existentes.length ? Math.max(...existentes) : 0;
    const { data: row, error } = await supabase.from("obra_etapas").insert({ user_id: userId, project_id: e.projectId, ordem: maxOrdem + 1, nome: e.nome, status: "pendente" }).select().single();
    if (!error) setData((d) => ({ ...d, etapas: [...d.etapas, { id: row.id, projectId: row.project_id, ordem: row.ordem, nome: row.nome, status: row.status, dataConclusao: row.data_conclusao }] }));
  };
  const updateEtapa = async (id, updates) => {
    const payload = {};
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.nome !== undefined) payload.nome = updates.nome;
    if (updates.dataConclusao !== undefined) payload.data_conclusao = updates.dataConclusao;
    if (updates.fotoPath !== undefined) payload.foto_path = updates.fotoPath;
    await supabase.from("obra_etapas").update(payload).eq("id", id);
    setData((d) => ({ ...d, etapas: d.etapas.map((x) => x.id === id ? { ...x, ...updates } : x) }));
  };
  const setEtapaFoto = async (id, file) => {
    const path = await uploadObraFile(userId, file);
    if (!path) return;
    await updateEtapa(id, { fotoPath: path });
  };
  const deleteEtapa = async (id) => {
    await supabase.from("obra_etapas").delete().eq("id", id);
    setData((d) => ({ ...d, etapas: d.etapas.filter((x) => x.id !== id) }));
  };

  const seedEtapasUnidade = async (unitId) => {
    await supabase.rpc("seed_etapas_unidade", { p_unit_id: unitId, p_user_id: userId });
    await loadAll();
  };
  const addEtapaUnidade = async (e) => {
    const existentes = data.unidadeEtapas.filter((x) => x.unitId === e.unitId).map((x) => x.ordem || 0);
    const maxOrdem = existentes.length ? Math.max(...existentes) : 0;
    const { data: row, error } = await supabase.from("unidade_etapas").insert({ user_id: userId, unit_id: e.unitId, ordem: maxOrdem + 1, nome: e.nome, status: "pendente" }).select().single();
    if (!error) setData((d) => ({ ...d, unidadeEtapas: [...d.unidadeEtapas, { id: row.id, unitId: row.unit_id, ordem: row.ordem, nome: row.nome, status: row.status, dataConclusao: row.data_conclusao }] }));
  };
  const updateEtapaUnidade = async (id, updates) => {
    const payload = {};
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.nome !== undefined) payload.nome = updates.nome;
    if (updates.dataConclusao !== undefined) payload.data_conclusao = updates.dataConclusao;
    if (updates.fotoPath !== undefined) payload.foto_path = updates.fotoPath;
    await supabase.from("unidade_etapas").update(payload).eq("id", id);
    setData((d) => ({ ...d, unidadeEtapas: d.unidadeEtapas.map((x) => x.id === id ? { ...x, ...updates } : x) }));
  };
  const setEtapaUnidadeFoto = async (id, file) => {
    const path = await uploadObraFile(userId, file);
    if (!path) return;
    await updateEtapaUnidade(id, { fotoPath: path });
  };
  const deleteEtapaUnidade = async (id) => {
    await supabase.from("unidade_etapas").delete().eq("id", id);
    setData((d) => ({ ...d, unidadeEtapas: d.unidadeEtapas.filter((x) => x.id !== id) }));
  };

  /* ---- Cronograma (atividades com data/duração/predecessora/avanço) ---- */
  const addAtividade = async (a) => {
    const existentes = data.cronograma.filter((x) => x.projectId === a.projectId).map((x) => x.ordem || 0);
    const maxOrdem = existentes.length ? Math.max(...existentes) : 0;
    const { data: row, error } = await supabase.from("obra_cronograma").insert({
      user_id: userId, project_id: a.projectId, ordem: maxOrdem + 1, nome: a.nome,
      data_inicio: a.dataInicio || todayISO(), duracao_dias: a.duracaoDias || 1,
      predecessora_id: a.predecessoraId || null, responsavel: a.responsavel || null,
    }).select().single();
    if (!error) setData((d) => ({ ...d, cronograma: [...d.cronograma, { id: row.id, projectId: row.project_id, ordem: row.ordem, nome: row.nome, dataInicio: row.data_inicio, duracaoDias: row.duracao_dias, predecessoraId: row.predecessora_id, avancoPct: Number(row.avanco_pct || 0), responsavel: row.responsavel, critica: !!row.critica }] }));
  };
  const updateAtividade = async (id, updates) => {
    const payload = {};
    if (updates.nome !== undefined) payload.nome = updates.nome;
    if (updates.dataInicio !== undefined) payload.data_inicio = updates.dataInicio;
    if (updates.duracaoDias !== undefined) payload.duracao_dias = updates.duracaoDias;
    if (updates.predecessoraId !== undefined) payload.predecessora_id = updates.predecessoraId;
    if (updates.avancoPct !== undefined) payload.avanco_pct = updates.avancoPct;
    if (updates.responsavel !== undefined) payload.responsavel = updates.responsavel;
    if (updates.critica !== undefined) payload.critica = updates.critica;
    await supabase.from("obra_cronograma").update(payload).eq("id", id);
    setData((d) => ({ ...d, cronograma: d.cronograma.map((x) => x.id === id ? { ...x, ...updates } : x) }));
  };
  const deleteAtividade = async (id) => {
    await supabase.from("obra_cronograma").delete().eq("id", id);
    setData((d) => ({ ...d, cronograma: d.cronograma.filter((x) => x.id !== id) }));
  };

  /* ---- Vistoria / apontamentos (punch list por ambiente) ---- */
  const addVistoriaItem = async (v) => {
    const pathFoto = v.file ? await uploadObraFile(userId, v.file) : null;
    const { data: row, error } = await supabase.from("obra_vistoria_itens").insert({
      user_id: userId, project_id: v.projectId, ambiente: v.ambiente, item: v.item,
      status: v.status || "pendente", observacao: v.observacao || null, responsavel: v.responsavel || null,
      prazo: v.prazo || null, path_foto: pathFoto, data: v.data || todayISO(),
    }).select().single();
    if (!error) setData((d) => ({ ...d, vistoria: [{ id: row.id, projectId: row.project_id, ambiente: row.ambiente, item: row.item, status: row.status, observacao: row.observacao, responsavel: row.responsavel, prazo: row.prazo, pathFoto: row.path_foto, data: row.data }, ...d.vistoria] }));
  };
  const updateVistoriaItem = async (id, updates) => {
    const payload = {};
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.observacao !== undefined) payload.observacao = updates.observacao;
    if (updates.responsavel !== undefined) payload.responsavel = updates.responsavel;
    if (updates.prazo !== undefined) payload.prazo = updates.prazo;
    await supabase.from("obra_vistoria_itens").update(payload).eq("id", id);
    setData((d) => ({ ...d, vistoria: d.vistoria.map((x) => x.id === id ? { ...x, ...updates } : x) }));
  };
  const deleteVistoriaItem = async (id) => {
    await supabase.from("obra_vistoria_itens").delete().eq("id", id);
    setData((d) => ({ ...d, vistoria: d.vistoria.filter((x) => x.id !== id) }));
  };

  /* ---- Vistoria em planta (pranchas/fotos-base + pins posicionados em %) ---- */
  const addPrancha = async (p) => {
    const path = await uploadObraFile(userId, p.file);
    if (!path) return;
    const { data: row, error } = await supabase.from("obra_vistoria_pranchas").insert({
      user_id: userId, project_id: p.projectId, titulo: p.titulo || "Planta", path,
    }).select().single();
    if (!error) setData((d) => ({ ...d, pranchas: [...d.pranchas, { id: row.id, projectId: row.project_id, titulo: row.titulo, path: row.path, createdAt: row.created_at }] }));
    return row;
  };
  const deletePrancha = async (id) => {
    await supabase.from("obra_vistoria_pranchas").delete().eq("id", id);
    setData((d) => ({ ...d, pranchas: d.pranchas.filter((x) => x.id !== id), pins: d.pins.filter((x) => x.pranchaId !== id) }));
  };

  const addPin = async (p) => {
    const pathFoto = p.file ? await uploadObraFile(userId, p.file) : null;
    const { data: row, error } = await supabase.from("obra_vistoria_pins").insert({
      user_id: userId, prancha_id: p.pranchaId, x_pct: p.xPct, y_pct: p.yPct, item: p.item,
      status: p.status || "pendente", observacao: p.observacao || null, responsavel: p.responsavel || null,
      prazo: p.prazo || null, path_foto: pathFoto,
    }).select().single();
    if (!error) setData((d) => ({ ...d, pins: [...d.pins, { id: row.id, pranchaId: row.prancha_id, xPct: Number(row.x_pct), yPct: Number(row.y_pct), item: row.item, status: row.status, observacao: row.observacao, responsavel: row.responsavel, prazo: row.prazo, pathFoto: row.path_foto, createdAt: row.created_at }] }));
    return { error, row };
  };
  const updatePin = async (id, updates) => {
    const payload = {};
    if (updates.item !== undefined) payload.item = updates.item;
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.observacao !== undefined) payload.observacao = updates.observacao;
    if (updates.responsavel !== undefined) payload.responsavel = updates.responsavel;
    if (updates.prazo !== undefined) payload.prazo = updates.prazo;
    if (updates.pathFoto !== undefined) payload.path_foto = updates.pathFoto;
    await supabase.from("obra_vistoria_pins").update(payload).eq("id", id);
    setData((d) => ({ ...d, pins: d.pins.map((x) => x.id === id ? { ...x, ...updates } : x) }));
  };
  const setPinFoto = async (id, file) => {
    const path = await uploadObraFile(userId, file);
    if (!path) return;
    await updatePin(id, { pathFoto: path });
  };
  const deletePin = async (id) => {
    await supabase.from("obra_vistoria_pins").delete().eq("id", id);
    setData((d) => ({ ...d, pins: d.pins.filter((x) => x.id !== id) }));
  };

  return {
    data, loading,
    addProject, updateProject, deleteProject,
    addUnit, updateUnit, deleteUnit,
    addInvestor, updateInvestor, deleteInvestor,
    addBudgetItem, updateBudgetItem, deleteBudgetItem,
    addActualCost, updateActualCost, deleteActualCost,
    addDocumento, deleteDocumento,
    addFoto, deleteFoto,
    addNaoConformidade, updateNaoConformidade, deleteNaoConformidade,
    addRequisito, updateRequisito, deleteRequisito, seedRequisitos,
    setCapa,
    addEtapa, updateEtapa, deleteEtapa, seedEtapas, setEtapaFoto,
    addEtapaUnidade, updateEtapaUnidade, deleteEtapaUnidade, seedEtapasUnidade, setEtapaUnidadeFoto,
    addAtividade, updateAtividade, deleteAtividade,
    addVistoriaItem, updateVistoriaItem, deleteVistoriaItem,
    addPrancha, deletePrancha, addPin, updatePin, deletePin, setPinFoto,
  };
}

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

  // Capital de investidores abate o valor que a construtora precisa aportar na obra —
  // esse dinheiro é do investidor e será devolvido a ele (+ lucro) na venda final.
  const builderNetCost = totalEstimatedCost - totalInvested;
  const builderNetActualCost = totalActualCost - totalInvested;
  const estimatedProfit = estimatedRevenue - builderNetCost;
  const realProfitSoFar = realRevenue - builderNetActualCost;

  const byCategory = {};
  budget.forEach((b) => { byCategory[b.category] = byCategory[b.category] || { previsto: 0, real: 0 }; byCategory[b.category].previsto += b.estimatedValue; });
  actual.forEach((a) => { byCategory[a.category] = byCategory[a.category] || { previsto: 0, real: 0 }; byCategory[a.category].real += a.value; });

  return { budget, actual, units, investors, propriaUnits, investorUnits, totalEstimatedCost, totalActualCost, variance, estimatedRevenue, realRevenue, builderNetCost, builderNetActualCost, estimatedProfit, realProfitSoFar, totalInvested, totalEstimatedInvestorProfit, byCategory };
}

/* Rateio do custo de construção da obra entre as unidades, ponderado por
   área (m²) quando disponível — senão, divisão igual entre as unidades —
   somado a documentação e corretagem específicas de cada unidade.
   O orçamento/custo real da obra não é rastreado por unidade, então o
   "custo real por unidade" usa o mesmo rateio aplicado sobre o total
   real gasto na obra (mesma lógica do previsto). */
function unitCostBreakdown(data, projectId) {
  const units = data.units.filter((u) => u.projectId === projectId);
  const t = projectTotals(data, projectId);
  const totalArea = units.reduce((s, u) => s + (Number(u.area) || 0), 0);
  const n = units.length || 1;

  return units.map((u) => {
    const peso = totalArea > 0 ? (Number(u.area) || 0) / totalArea : 1 / n;
    const construcaoEstimada = t.totalEstimatedCost * peso;
    const construcaoReal = t.totalActualCost * peso;
    const documentacao = Number(u.custoDocumentacao || 0);
    const corretagem = Number(u.custoCorretagem || 0);
    const custoEstimado = construcaoEstimada + documentacao + corretagem;
    // documentação/corretagem são lançadas quando pagas — tratamos como já
    // realizadas nos dois lados (não há rastreio de "previsto x realizado"
    // separado para elas ainda).
    const custoReal = construcaoReal + documentacao + corretagem;
    return {
      unit: u,
      pesoPct: Math.round(peso * 1000) / 10,
      construcaoEstimada, construcaoReal, documentacao, corretagem,
      custoEstimado, custoReal, diferenca: custoReal - custoEstimado,
    };
  });
}

function ObrasList({ store, theme, onOpen }) {
  const [name, setName] = useState(""); const [address, setAddress] = useState("");
  const add = async () => {
    if (!name.trim()) return;
    await store.addProject({ name: name.trim(), address: address.trim() });
    setName(""); setAddress("");
  };
  return (
    <div>
      <Card theme={theme}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Nova obra</div>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome da obra (ex: Residencial Aurora)" style={{ ...inputStyle(theme), width: "100%", marginBottom: 8 }} />
        <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Endereço (opcional)" style={{ ...inputStyle(theme), width: "100%", marginBottom: 8 }} />
        <button onClick={add} style={{ ...primaryBtn(theme), width: "100%" }}>Criar obra</button>
      </Card>
      {store.data.projects.length === 0 && <Card theme={theme}><EmptyHint theme={theme} text="Nenhuma obra cadastrada ainda." /></Card>}
      {store.data.projects.map((p) => <ProjectCard key={p.id} p={p} store={store} theme={theme} onOpen={onOpen} />)}
    </div>
  );
}

function ProjectCard({ p, store, theme, onOpen }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(p.name);
  const [address, setAddress] = useState(p.address || "");
  const [status, setStatus] = useState(p.status);
  const [progressoPct, setProgressoPct] = useState(p.progressoPct || 0);
  const [municipio, setMunicipio] = useState(p.municipio || "Paulista/PE");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const t = projectTotals(store.data, p.id);

  const save = async () => {
    await store.updateProject(p.id, { name, address, status, progressoPct, municipio });
    setEditing(false);
  };

  if (editing) {
    return (
      <Card theme={theme}>
        <input value={name} onChange={(e) => setName(e.target.value)} style={{ ...inputStyle(theme), width: "100%", marginBottom: 8 }} placeholder="Nome da obra" />
        <input value={address} onChange={(e) => setAddress(e.target.value)} style={{ ...inputStyle(theme), width: "100%", marginBottom: 8 }} placeholder="Endereço" />
        <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ ...inputStyle(theme), width: "100%", marginBottom: 8 }}>
          <option value="planejamento">Planejamento</option>
          <option value="em_andamento">Em andamento</option>
          <option value="concluida">Concluída</option>
          <option value="pausada">Pausada</option>
        </select>
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 11, color: theme.subtext, marginBottom: 4 }}>Percentual executado: {progressoPct}%</div>
          <input type="range" min={0} max={100} value={progressoPct} onChange={(e) => setProgressoPct(Number(e.target.value))} style={{ width: "100%" }} />
        </div>
        <input value={municipio} onChange={(e) => setMunicipio(e.target.value)} style={{ ...inputStyle(theme), width: "100%", marginBottom: 8 }} placeholder="Município (ex: Paulista/PE)" />
        <ObraFileField theme={theme} file={null} setFile={(f) => f && store.setCapa(p.id, f)} label="Trocar foto de capa da obra" accept="image/*" />
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={save} style={{ ...primaryBtn(theme), flex: 1 }}>Salvar</button>
          <button onClick={() => setEditing(false)} style={{ flex: 1, background: theme.surface2, color: theme.text, border: `1px solid ${theme.border}`, borderRadius: 10, fontWeight: 700, cursor: "pointer" }}>Cancelar</button>
        </div>
      </Card>
    );
  }

  return (
    <Card theme={theme} style={{ padding: 0, overflow: "hidden" }}>
      <div onClick={() => onOpen(p.id)} style={{ cursor: "pointer" }}>
        <CapaThumb path={p.capaPath} theme={theme} />
        <div style={{ padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 16 }}>{p.name}</div>
            {p.address && <div style={{ fontSize: 11, color: theme.subtext }}>{p.address}</div>}
          </div>
          <span style={{ fontSize: 10, fontWeight: 700, color: theme.gold, background: theme.accentSoft, padding: "3px 8px", borderRadius: 99, whiteSpace: "nowrap" }}>{p.status.replace("_", " ")}</span>
        </div>
        <div style={{ display: "flex", gap: 16, marginTop: 12, flexWrap: "wrap" }}>
          <MiniStat theme={theme} label="Custo previsto" value={fmtBRL(t.totalEstimatedCost)} />
          <MiniStat theme={theme} label="Custo real" value={fmtBRL(t.totalActualCost)} color={t.variance < 0 ? theme.danger : theme.accent} />
          <MiniStat theme={theme} label="Lucro estimado" value={fmtBRL(t.estimatedProfit)} color={theme.gold} />
          <MiniStat theme={theme} label="Execução" value={`${p.progressoPct || 0}%`} />
        </div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 12, padding: "10px 16px 16px", borderTop: `1px solid ${theme.border}` }}>
        <button onClick={() => setEditing(true)} style={{ background: "none", border: "none", cursor: "pointer", color: theme.subtext, fontSize: 12, textDecoration: "underline" }}>editar obra</button>
        {!confirmDelete ? (
          <button onClick={() => setConfirmDelete(true)} style={{ background: "none", border: "none", cursor: "pointer", color: theme.danger, fontSize: 12, textDecoration: "underline" }}>excluir obra</button>
        ) : (
          <>
            <span style={{ fontSize: 12, color: theme.danger }}>Excluir a obra e todos os dados dela?</span>
            <button onClick={() => store.deleteProject(p.id)} style={{ background: "none", border: "none", cursor: "pointer", color: theme.danger, fontSize: 12, fontWeight: 700 }}>Sim, excluir</button>
            <button onClick={() => setConfirmDelete(false)} style={{ background: "none", border: "none", cursor: "pointer", color: theme.subtext, fontSize: 12 }}>Cancelar</button>
          </>
        )}
      </div>
    </Card>
  );
}

/* ================= RELATÓRIO EXECUTIVO (HTML autônomo, aberto em nova
   aba — usa "Salvar como PDF" do navegador; sem dependência nova) ======= */

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function buildRelatorioExecutivoHTML(store, project, t) {
  const atividades = store.data.cronograma.filter((a) => a.projectId === project.id).sort((x, y) => x.ordem - y.ordem);
  const requisitos = store.data.requisitos.filter((r) => r.projectId === project.id);
  const etapas = store.data.etapas.filter((e) => e.projectId === project.id).sort((x, y) => x.ordem - y.ordem);
  const pranchaIds = store.data.pranchas.filter((p) => p.projectId === project.id).map((p) => p.id);
  const pins = store.data.pins.filter((p) => pranchaIds.includes(p.pranchaId));
  const vistoriaLista = store.data.vistoria.filter((v) => v.projectId === project.id);
  const breakdown = unitCostBreakdown(store.data, project.id);

  const today = todayISO();
  const previsaoOriginal = atividades.length ? atividades.reduce((max, a) => { const e = addDaysISO(a.dataInicio, a.duracaoDias); return e > max ? e : max; }, addDaysISO(atividades[0].dataInicio, atividades[0].duracaoDias)) : null;
  const byId = {}; atividades.forEach((a) => { byId[a.id] = a; });
  const effEnd = {};
  const resolveEnd = (a, seen) => {
    if (effEnd[a.id] !== undefined) return effEnd[a.id];
    if (seen.has(a.id)) return addDaysISO(a.dataInicio, a.duracaoDias);
    seen.add(a.id);
    let effStart = a.dataInicio;
    const pred = a.predecessoraId ? byId[a.predecessoraId] : null;
    if (pred) { const predEnd = resolveEnd(pred, seen); if (predEnd > effStart) effStart = predEnd; }
    const end = addDaysISO(effStart, a.duracaoDias);
    effEnd[a.id] = end;
    return end;
  };
  atividades.forEach((a) => resolveEnd(a, new Set()));
  const previsaoAtual = atividades.length ? atividades.reduce((max, a) => effEnd[a.id] > max ? effEnd[a.id] : max, effEnd[atividades[0].id]) : null;
  const deltaDias = previsaoOriginal && previsaoAtual ? diffDaysISO(previsaoOriginal, previsaoAtual) : 0;

  const totalDuracao = atividades.reduce((s, a) => s + a.duracaoDias, 0);
  const avancoPonderado = totalDuracao ? Math.round(atividades.reduce((s, a) => s + a.avancoPct * a.duracaoDias, 0) / totalDuracao) : 0;

  const vistoriaTotal = vistoriaLista.length + pins.length;
  const vistoriaOk = vistoriaLista.filter((v) => v.status === "ok").length + pins.filter((p) => p.status === "ok").length;
  const vistoriaPend = vistoriaTotal - vistoriaOk;

  const etapasConcluidas = etapas.filter((e) => e.status === "concluida").length;
  const etapasPct = etapas.length ? Math.round((etapasConcluidas / etapas.length) * 100) : null;

  const reqConcluidos = requisitos.filter((r) => r.status === "concluido" || r.status === "nao_aplicavel").length;
  const reqPct = requisitos.length ? Math.round((reqConcluidos / requisitos.length) * 100) : null;

  const atividadesRows = atividades.map((a) => {
    const end = addDaysISO(a.dataInicio, a.duracaoDias);
    const atrasada = a.avancoPct < 100 && today > end;
    const statusLabel = a.avancoPct >= 100 ? "Concluída" : atrasada ? "Atrasada" : "No prazo";
    return `<tr><td>${escapeHtml(a.nome)}</td><td>${a.dataInicio}</td><td>${end}</td><td>${a.duracaoDias}d</td><td>${a.avancoPct}%</td><td class="s-${atrasada ? "danger" : a.avancoPct >= 100 ? "ok" : "neutral"}">${statusLabel}</td></tr>`;
  }).join("");

  const requisitosRows = requisitos.map((r) => {
    const done = r.status === "concluido" || r.status === "nao_aplicavel";
    return `<tr><td>${escapeHtml(REQ_CATEGORIAS[r.categoria] || r.categoria)}</td><td>${escapeHtml(r.item)}</td><td class="s-${done ? "ok" : "neutral"}">${escapeHtml(REQ_STATUS[r.status] || r.status)}</td></tr>`;
  }).join("");

  const unidadesRows = breakdown.map(({ unit: u, custoEstimado, custoReal, diferenca }) => {
    return `<tr><td>${escapeHtml(u.code)}</td><td>${u.area ? `${u.area} m²` : "—"}</td><td>${fmtBRL(u.salePriceEstimated)}</td><td>${fmtBRL(custoEstimado)}</td><td>${fmtBRL(custoReal)}</td><td class="s-${diferenca > 0 ? "danger" : "ok"}">${fmtBRL(diferenca)}</td></tr>`;
  }).join("");

  const geradoEm = new Date().toLocaleString("pt-BR");

  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8" />
<title>Relatório executivo — ${escapeHtml(project.name)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1A1F3D; margin: 0; padding: 32px; background: #fff; }
  h1 { font-size: 20px; margin: 0 0 2px; }
  h2 { font-size: 14px; margin: 26px 0 8px; padding-bottom: 4px; border-bottom: 2px solid #1EA968; text-transform: uppercase; letter-spacing: 0.04em; }
  .header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 3px solid #00176D; padding-bottom: 10px; margin-bottom: 18px; }
  .brand { font-size: 11px; color: #6B7290; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; }
  .meta { font-size: 11px; color: #6B7290; text-align: right; }
  .cards { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 6px; }
  .card { flex: 1; min-width: 140px; border: 1px solid #D5D9E8; border-radius: 8px; padding: 10px 12px; }
  .card .l { font-size: 10px; color: #6B7290; }
  .card .v { font-size: 16px; font-weight: 700; font-family: 'Consolas', monospace; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 4px; }
  th, td { text-align: left; padding: 5px 8px; border-bottom: 1px solid #E4E7F2; }
  th { background: #F2F3F9; font-size: 10px; text-transform: uppercase; color: #6B7290; }
  .s-ok { color: #1EA968; font-weight: 700; }
  .s-danger { color: #D6303C; font-weight: 700; }
  .s-neutral { color: #6B7290; }
  .bar { height: 7px; background: #F2F3F9; border-radius: 99px; overflow: hidden; margin-top: 4px; }
  .bar > div { height: 100%; background: #1EA968; }
  .footer { margin-top: 30px; font-size: 10px; color: #6B7290; text-align: center; }
  @media print {
    body { padding: 12mm; }
    .card, table { break-inside: avoid; }
    h2 { break-after: avoid; }
  }
</style>
</head><body>
  <div class="header">
    <div>
      <div class="brand">Pascaretta Construtora</div>
      <h1>Relatório executivo — ${escapeHtml(project.name)}</h1>
      ${project.address ? `<div style="font-size:12px;color:#6B7290">${escapeHtml(project.address)}</div>` : ""}
    </div>
    <div class="meta">Gerado em ${geradoEm}<br/>Município: ${escapeHtml(project.municipio || "—")} · ${escapeHtml(project.financiamento || "—")}</div>
  </div>

  <h2>Resumo financeiro</h2>
  <div class="cards">
    <div class="card"><div class="l">Custo previsto</div><div class="v">${fmtBRL(t.totalEstimatedCost)}</div></div>
    <div class="card"><div class="l">Custo real</div><div class="v">${fmtBRL(t.totalActualCost)}</div></div>
    <div class="card"><div class="l">${t.variance >= 0 ? "Economia" : "Estouro"}</div><div class="v">${fmtBRL(Math.abs(t.variance))}</div></div>
    <div class="card"><div class="l">Lucro estimado</div><div class="v">${fmtBRL(t.estimatedProfit)}</div></div>
  </div>

  <h2>Cronograma</h2>
  <div class="cards">
    <div class="card"><div class="l">Avanço ponderado</div><div class="v">${avancoPonderado}%</div></div>
    <div class="card"><div class="l">Previsão original</div><div class="v">${previsaoOriginal || "—"}</div></div>
    <div class="card"><div class="l">Previsão atual</div><div class="v" style="color:${deltaDias > 0 ? "#D6303C" : "#1EA968"}">${previsaoAtual || "—"}</div></div>
    <div class="card"><div class="l">Desvio</div><div class="v" style="color:${deltaDias > 0 ? "#D6303C" : "#1EA968"}">${deltaDias > 0 ? `+${deltaDias}d` : deltaDias < 0 ? `${deltaDias}d` : "0d"}</div></div>
  </div>
  ${atividades.length ? `<table><thead><tr><th>Atividade</th><th>Início</th><th>Fim previsto</th><th>Duração</th><th>Avanço</th><th>Status</th></tr></thead><tbody>${atividadesRows}</tbody></table>` : "<p style='font-size:11px;color:#6B7290'>Nenhuma atividade cadastrada.</p>"}

  <h2>Avanço da obra (etapas)</h2>
  <div class="cards">
    <div class="card"><div class="l">Etapas concluídas</div><div class="v">${etapasPct !== null ? `${etapasPct}%` : "—"}</div><div class="bar"><div style="width:${etapasPct || 0}%"></div></div></div>
    <div class="card"><div class="l">Etapas totais</div><div class="v">${etapas.length}</div></div>
  </div>

  <h2>Vistoria / punch list</h2>
  <div class="cards">
    <div class="card"><div class="l">Total de apontamentos</div><div class="v">${vistoriaTotal}</div></div>
    <div class="card"><div class="l">Resolvidos (OK)</div><div class="v" style="color:#1EA968">${vistoriaOk}</div></div>
    <div class="card"><div class="l">Pendentes</div><div class="v" style="color:${vistoriaPend > 0 ? "#D6303C" : "#1EA968"}">${vistoriaPend}</div></div>
  </div>

  <h2>Requisitos / checklist documental</h2>
  <div class="cards">
    <div class="card"><div class="l">Conformidade</div><div class="v">${reqPct !== null ? `${reqPct}%` : "—"}</div><div class="bar"><div style="width:${reqPct || 0}%"></div></div></div>
    <div class="card"><div class="l">Itens totais</div><div class="v">${requisitos.length}</div></div>
  </div>
  ${requisitos.length ? `<table><thead><tr><th>Categoria</th><th>Item</th><th>Status</th></tr></thead><tbody>${requisitosRows}</tbody></table>` : "<p style='font-size:11px;color:#6B7290'>Nenhum item de checklist cadastrado.</p>"}

  <h2>Unidades — custo estimado x real</h2>
  ${breakdown.length ? `<table><thead><tr><th>Unidade</th><th>Área</th><th>Venda estimada</th><th>Custo estimado</th><th>Custo real</th><th>Diferença</th></tr></thead><tbody>${unidadesRows}</tbody></table>` : "<p style='font-size:11px;color:#6B7290'>Nenhuma unidade cadastrada.</p>"}

  <div class="footer">Pascaretta Construtora · relatório gerado automaticamente pelo sistema de gestão de obras em ${geradoEm}</div>
</body></html>`;
}

function GerarRelatorioBtn({ theme, store, project, t }) {
  const gerar = () => {
    const html = buildRelatorioExecutivoHTML(store, project, t);
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const w = window.open(url, "_blank");
    if (!w) { alert("Não foi possível abrir o relatório. Verifique o bloqueador de pop-ups."); return; }
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  };
  return (
    <button onClick={gerar} style={{ position: "absolute", top: 8, left: 8, background: "rgba(0,0,0,0.55)", color: "#fff", fontSize: 11, fontWeight: 700, padding: "6px 10px", borderRadius: 8, cursor: "pointer", border: "none", display: "flex", alignItems: "center", gap: 4 }}>
      <FileText size={13} /> Gerar relatório executivo
    </button>
  );
}

function ObraDetail({ store, projectId, theme, onBack }) {
  const [subTab, setSubTab] = useState("resumo");
  const project = store.data.projects.find((p) => p.id === projectId);
  const t = useMemo(() => projectTotals(store.data, projectId), [store.data, projectId]);
  if (!project) return null;

  return (
    <div>
      <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: theme.subtext, cursor: "pointer", fontSize: 13, marginBottom: 10, padding: 0 }}>
        <ArrowLeft size={15} /> Obras
      </button>
      <Card theme={theme} style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ position: "relative" }}>
          <CapaThumb path={project.capaPath} theme={theme} height={160} />
          <GerarRelatorioBtn theme={theme} store={store} project={project} t={t} />
          <label style={{ position: "absolute", bottom: 8, right: 8, background: "rgba(0,0,0,0.55)", color: "#fff", fontSize: 11, fontWeight: 700, padding: "6px 10px", borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
            <Camera size={13} /> {project.capaPath ? "Trocar capa" : "Adicionar capa"}
            <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) store.setCapa(project.id, f); }} />
          </label>
        </div>
        <div style={{ padding: "14px 16px" }}>
          <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 19 }}>{project.name}</div>
          {project.address && <div style={{ fontSize: 12, color: theme.subtext, marginTop: 2 }}>{project.address}</div>}
        </div>
      </Card>
      <div style={{ display: "flex", gap: 6, background: theme.surface2, borderRadius: 10, padding: 3, marginBottom: 14, overflowX: "auto" }}>
        {[
          { k: "resumo", l: "Resumo" }, { k: "cronograma", l: "Cronograma" }, { k: "vistoria", l: "Vistoria" },
          { k: "etapas", l: "Avanço da obra" }, { k: "unidades", l: "Unidades" }, { k: "orcamento", l: "Orçamento" },
          { k: "custos", l: "Custos reais" }, { k: "kpis", l: "KPIs" }, { k: "docs", l: "Documentos" },
          { k: "fotos", l: "Fotos" }, { k: "naoconf", l: "Não conformidades" }, { k: "requisitos", l: "Requisitos" },
        ].map((s) => (
          <button key={s.k} onClick={() => setSubTab(s.k)} style={{ flex: "0 0 auto", padding: "8px 10px", borderRadius: 6, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 12, whiteSpace: "nowrap", background: subTab === s.k ? theme.accent : "transparent", color: subTab === s.k ? "#04150D" : theme.subtext }}>
            {s.l}
          </button>
        ))}
      </div>
      {subTab === "resumo" && <ObraResumo t={t} theme={theme} />}
      {subTab === "cronograma" && <ObraCronograma store={store} projectId={projectId} theme={theme} />}
      {subTab === "vistoria" && (
        <div>
          <ObraVistoriaPlanta store={store} projectId={projectId} theme={theme} />
          <div style={{ margin: "22px 0 10px", paddingTop: 18, borderTop: `1px solid ${theme.border}` }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: theme.subtext, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Vistoria por ambiente (lista, modo antigo)</div>
            <div style={{ fontSize: 11, color: theme.subtext, marginBottom: 10 }}>Mantido como visão alternativa — a vistoria em planta acima é o fluxo principal.</div>
          </div>
          <ObraVistoria store={store} projectId={projectId} theme={theme} />
        </div>
      )}
      {subTab === "etapas" && <ObraEtapas store={store} projectId={projectId} theme={theme} />}
      {subTab === "unidades" && <ObraUnidades store={store} projectId={projectId} theme={theme} />}
      {subTab === "orcamento" && <ObraOrcamento store={store} projectId={projectId} theme={theme} />}
      {subTab === "custos" && <ObraCustos store={store} projectId={projectId} theme={theme} />}
      {subTab === "kpis" && <ObraKPIs store={store} project={project} t={t} theme={theme} />}
      {subTab === "docs" && <ObraDocumentos store={store} projectId={projectId} theme={theme} />}
      {subTab === "fotos" && <ObraFotos store={store} projectId={projectId} theme={theme} />}
      {subTab === "naoconf" && <ObraNaoConformidades store={store} projectId={projectId} theme={theme} />}
      {subTab === "requisitos" && <ObraRequisitos store={store} projectId={projectId} theme={theme} />}
    </div>
  );
}

function ObraResumo({ t, theme }) {
  const catData = Object.entries(t.byCategory).map(([cat, v]) => ({ categoria: cat, Previsto: v.previsto, Real: v.real }));
  return (
    <div>
      <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
        <Card theme={theme} style={{ flex: 1, marginBottom: 0 }}>
          <div style={{ fontSize: 11, color: theme.subtext }}>Custo previsto (obra)</div>
          <div style={{ fontFamily: FONT_MONO, fontSize: 17, fontWeight: 700 }}>{fmtBRL(t.totalEstimatedCost)}</div>
        </Card>
        <Card theme={theme} style={{ flex: 1, marginBottom: 0 }}>
          <div style={{ fontSize: 11, color: theme.subtext }}>Custo real (obra)</div>
          <div style={{ fontFamily: FONT_MONO, fontSize: 17, fontWeight: 700 }}>{fmtBRL(t.totalActualCost)}</div>
        </Card>
      </div>
      <Card theme={theme}>
        <div style={{ fontSize: 12, color: theme.subtext }}>{t.variance >= 0 ? "Saving (economia)" : "Estouro de orçamento"}</div>
        <div style={{ fontFamily: FONT_MONO, fontSize: 22, fontWeight: 700, color: t.variance >= 0 ? theme.accent : theme.danger }}>{fmtBRL(Math.abs(t.variance))}</div>
      </Card>
      <Card theme={theme} style={{ background: theme.accentSoft }}>
        <div style={{ fontSize: 11, color: theme.subtext }}>Capital de investidores (abate o que a construtora precisa aportar)</div>
        <div style={{ fontFamily: FONT_MONO, fontSize: 18, fontWeight: 700, color: theme.gold }}>{fmtBRL(t.totalInvested)}</div>
        <div style={{ display: "flex", gap: 16, marginTop: 10 }}>
          <MiniStat theme={theme} label="Custo líquido previsto" value={fmtBRL(t.builderNetCost)} />
          <MiniStat theme={theme} label="Custo líquido real" value={fmtBRL(t.builderNetActualCost)} />
        </div>
        <div style={{ fontSize: 10.5, color: theme.subtext, marginTop: 8 }}>Esse capital é do investidor — ele volta pra ele (+ lucro) na venda final, mas reduz o quanto a construtora precisa desembolsar durante a obra.</div>
      </Card>
      <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
        <Card theme={theme} style={{ flex: 1, marginBottom: 0 }}>
          <div style={{ fontSize: 11, color: theme.subtext }}>Receita estimada (unid. próprias)</div>
          <div style={{ fontFamily: FONT_MONO, fontSize: 16, fontWeight: 700 }}>{fmtBRL(t.estimatedRevenue)}</div>
        </Card>
        <Card theme={theme} style={{ flex: 1, marginBottom: 0 }}>
          <div style={{ fontSize: 11, color: theme.subtext }}>Lucro estimado (construtora)</div>
          <div style={{ fontFamily: FONT_MONO, fontSize: 16, fontWeight: 700, color: theme.gold }}>{fmtBRL(t.estimatedProfit)}</div>
        </Card>
      </div>
      {t.realRevenue > 0 && (
        <Card theme={theme}>
          <div style={{ fontSize: 11, color: theme.subtext }}>Lucro real (parcial, com o já vendido/gasto)</div>
          <div style={{ fontFamily: FONT_MONO, fontSize: 18, fontWeight: 700, color: t.realProfitSoFar >= 0 ? theme.accent : theme.danger }}>{fmtBRL(t.realProfitSoFar)}</div>
        </Card>
      )}
      <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
        <Card theme={theme} style={{ flex: 1, marginBottom: 0 }}>
          <div style={{ fontSize: 11, color: theme.subtext }}>Total investido por terceiros</div>
          <div style={{ fontFamily: FONT_MONO, fontSize: 16, fontWeight: 700 }}>{fmtBRL(t.totalInvested)}</div>
        </Card>
        <Card theme={theme} style={{ flex: 1, marginBottom: 0 }}>
          <div style={{ fontSize: 11, color: theme.subtext }}>Lucro estimado dos investidores</div>
          <div style={{ fontFamily: FONT_MONO, fontSize: 16, fontWeight: 700 }}>{fmtBRL(t.totalEstimatedInvestorProfit)}</div>
        </Card>
      </div>
      {catData.length > 0 && (
        <Card theme={theme}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Previsto x Real por categoria</div>
          <div style={{ height: 200 }}>
            <ResponsiveContainer><BarChart data={catData}>
              <CartesianGrid stroke={theme.border} strokeDasharray="3 3" />
              <XAxis dataKey="categoria" tick={{ fill: theme.subtext, fontSize: 9 }} interval={0} angle={-20} textAnchor="end" height={60} />
              <YAxis tick={{ fill: theme.subtext, fontSize: 10 }} width={44} />
              <Tooltip contentStyle={{ background: theme.surface2, border: `1px solid ${theme.border}`, fontSize: 12 }} formatter={(v) => fmtBRL(v)} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Previsto" fill={theme.gold} radius={[4, 4, 0, 0]} />
              <Bar dataKey="Real" fill={theme.danger} radius={[4, 4, 0, 0]} />
            </BarChart></ResponsiveContainer>
          </div>
        </Card>
      )}
    </div>
  );
}

function ObraUnidades({ store, projectId, theme }) {
  const [code, setCode] = useState(""); const [area, setArea] = useState(""); const [type, setType] = useState("propria"); const [salePrice, setSalePrice] = useState("");
  const units = store.data.units.filter((u) => u.projectId === projectId);
  const breakdown = useMemo(() => unitCostBreakdown(store.data, projectId), [store.data, projectId]);
  const breakdownByUnit = {}; breakdown.forEach((b) => { breakdownByUnit[b.unit.id] = b; });

  const add = async () => {
    if (!code.trim()) return;
    const price = parseFloat(salePrice.replace(",", ".")) || 0;
    await store.addUnit({ projectId, code: code.trim(), area: parseFloat(area.replace(",", ".")) || null, type, salePriceEstimated: price });
    setCode(""); setArea(""); setSalePrice("");
  };

  return (
    <div>
      <Card theme={theme}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Nova unidade</div>
        <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Código (ex: Apto 101)" style={{ ...inputStyle(theme), width: "100%", marginBottom: 8 }} />
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <input value={area} onChange={(e) => setArea(e.target.value)} placeholder="Área (m²)" style={inputStyle(theme)} />
          <select value={type} onChange={(e) => setType(e.target.value)} style={inputStyle(theme)}>
            <option value="propria">Própria</option>
            <option value="investidor">Investidor</option>
          </select>
        </div>
        <input value={salePrice} onChange={(e) => setSalePrice(e.target.value)} placeholder="Valor de venda estimado (R$)" style={{ ...inputStyle(theme), width: "100%", marginBottom: 8 }} />
        <button onClick={add} style={{ ...primaryBtn(theme), width: "100%" }}>Adicionar unidade</button>
      </Card>
      {units.length === 0 && <Card theme={theme}><EmptyHint theme={theme} text="Nenhuma unidade cadastrada ainda." /></Card>}
      {units.map((u) => <UnitRow key={u.id} u={u} store={store} theme={theme} cost={breakdownByUnit[u.id]} />)}
    </div>
  );
}

function UnitRow({ u, store, theme, cost }) {
  const [editing, setEditing] = useState(false);
  const [code, setCode] = useState(u.code);
  const [area, setArea] = useState(u.area || "");
  const [salePriceEstimated, setSalePriceEstimated] = useState(u.salePriceEstimated);
  const [salePriceReal, setSalePriceReal] = useState(u.salePriceReal ?? "");
  const [status, setStatus] = useState(u.status);
  const [custoDocumentacao, setCustoDocumentacao] = useState(u.custoDocumentacao || 0);
  const [custoCorretagem, setCustoCorretagem] = useState(u.custoCorretagem || 0);
  const investor = store.data.investors.find((i) => i.unitId === u.id);
  const [showInvestorForm, setShowInvestorForm] = useState(false);
  const [showEtapas, setShowEtapas] = useState(false);
  const unitEtapas = store.data.unidadeEtapas.filter((e) => e.unitId === u.id);
  const unitEtapasPct = unitEtapas.length ? Math.round((unitEtapas.filter((e) => e.status === "concluida").length / unitEtapas.length) * 100) : null;

  const save = async () => {
    await store.updateUnit(u.id, {
      code, area: parseFloat(String(area).replace(",", ".")) || null,
      salePriceEstimated: parseFloat(String(salePriceEstimated).replace(",", ".")) || 0,
      salePriceReal: salePriceReal === "" ? null : parseFloat(String(salePriceReal).replace(",", ".")),
      status,
      custoDocumentacao: parseFloat(String(custoDocumentacao).replace(",", ".")) || 0,
      custoCorretagem: parseFloat(String(custoCorretagem).replace(",", ".")) || 0,
    });
    setEditing(false);
  };

  return (
    <Card theme={theme}>
      {!editing ? (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{u.code} {u.type === "investidor" && <Users size={12} style={{ marginLeft: 4, display: "inline", verticalAlign: "middle" }} color={theme.gold} />}</div>
              <div style={{ fontSize: 11, color: theme.subtext }}>{u.area ? `${u.area} m² · ` : ""}{u.type === "propria" ? "Própria" : "Investidor"} · {u.status}</div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setEditing(true)} style={{ background: "none", border: "none", cursor: "pointer", color: theme.subtext, fontSize: 11, textDecoration: "underline" }}>editar</button>
              <button onClick={() => store.deleteUnit(u.id)} style={{ background: "none", border: "none", cursor: "pointer", color: theme.subtext }}><Trash2 size={14} /></button>
            </div>
          </div>
          <div style={{ display: "flex", gap: 16, marginTop: 10, flexWrap: "wrap" }}>
            <MiniStat theme={theme} label="Venda estimada" value={fmtBRL(u.salePriceEstimated)} />
            <MiniStat theme={theme} label="Venda real" value={u.salePriceReal != null ? fmtBRL(u.salePriceReal) : "—"} />
            <MiniStat theme={theme} label="Avanço" value={unitEtapasPct !== null ? `${unitEtapasPct}%` : "—"} color={theme.gold} />
          </div>
          {cost && (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${theme.border}` }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: theme.subtext, marginBottom: 6 }}>Custo da unidade (rateio {cost.pesoPct}% da obra{u.area ? " por área" : " — divisão igual"} + documentação + corretagem)</div>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                <MiniStat theme={theme} label="Custo estimado" value={fmtBRL(cost.custoEstimado)} />
                <MiniStat theme={theme} label="Custo real" value={fmtBRL(cost.custoReal)} color={cost.diferenca > 0 ? theme.danger : theme.accent} />
                <MiniStat theme={theme} label="Diferença (real - estimado)" value={fmtBRL(cost.diferenca)} color={cost.diferenca > 0 ? theme.danger : theme.accent} />
              </div>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 8 }}>
                <MiniStat theme={theme} label="Documentação" value={fmtBRL(cost.documentacao)} />
                <MiniStat theme={theme} label="Corretagem" value={fmtBRL(cost.corretagem)} />
              </div>
            </div>
          )}
          <button onClick={() => setShowEtapas((v) => !v)} style={{ background: "none", border: "none", cursor: "pointer", color: theme.accent, fontSize: 11, textDecoration: "underline", padding: 0, marginTop: 8 }}>
            {showEtapas ? "ocultar etapas da unidade" : "ver/editar etapas da unidade"}
          </button>
          {showEtapas && <UnidadeEtapas store={store} unitId={u.id} theme={theme} />}
        </>
      ) : (
        <>
          <input value={code} onChange={(e) => setCode(e.target.value)} style={{ ...inputStyle(theme), width: "100%", marginBottom: 8 }} placeholder="Código" />
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <input value={area} onChange={(e) => setArea(e.target.value)} placeholder="Área (m²)" style={inputStyle(theme)} />
            <select value={status} onChange={(e) => setStatus(e.target.value)} style={inputStyle(theme)}>
              <option value="disponivel">Disponível</option>
              <option value="reservada">Reservada</option>
              <option value="vendida">Vendida</option>
            </select>
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <input value={salePriceEstimated} onChange={(e) => setSalePriceEstimated(e.target.value)} placeholder="Venda estimada" style={inputStyle(theme)} />
            <input value={salePriceReal} onChange={(e) => setSalePriceReal(e.target.value)} placeholder="Venda real" style={inputStyle(theme)} />
          </div>
          <div style={{ fontSize: 11, color: theme.subtext, marginBottom: 4 }}>Custos específicos da unidade (além do rateio do custo geral da obra)</div>
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <input value={custoDocumentacao} onChange={(e) => setCustoDocumentacao(e.target.value)} placeholder="Documentação (R$)" style={inputStyle(theme)} />
            <input value={custoCorretagem} onChange={(e) => setCustoCorretagem(e.target.value)} placeholder="Corretagem (R$)" style={inputStyle(theme)} />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={save} style={{ ...primaryBtn(theme), flex: 1 }}>Salvar</button>
            <button onClick={() => setEditing(false)} style={{ flex: 1, background: theme.surface2, color: theme.text, border: `1px solid ${theme.border}`, borderRadius: 10, fontWeight: 700, cursor: "pointer" }}>Cancelar</button>
          </div>
        </>
      )}

      {u.type === "investidor" && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${theme.border}` }}>
          {investor ? (
            <InvestorFields investor={investor} store={store} theme={theme} />
          ) : showInvestorForm ? (
            <NewInvestorForm unitId={u.id} store={store} theme={theme} onDone={() => setShowInvestorForm(false)} />
          ) : (
            <button onClick={() => setShowInvestorForm(true)} style={{ background: theme.accentSoft, color: theme.accent, border: "none", borderRadius: 8, padding: "6px 12px", fontWeight: 700, cursor: "pointer", fontSize: 12 }}>+ Cadastrar investidor</button>
          )}
        </div>
      )}
    </Card>
  );
}

function NewInvestorForm({ unitId, store, theme, onDone }) {
  const [name, setName] = useState(""); const [amount, setAmount] = useState(""); const [profit, setProfit] = useState("");
  const save = async () => {
    if (!name.trim()) return;
    await store.addInvestor({ unitId, name: name.trim(), amountInvested: parseFloat(amount.replace(",", ".")) || 0, estimatedProfit: parseFloat(profit.replace(",", ".")) || 0 });
    onDone();
  };
  return (
    <div>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do investidor" style={{ ...inputStyle(theme), width: "100%", marginBottom: 8 }} />
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Valor investido (R$)" style={inputStyle(theme)} />
        <input value={profit} onChange={(e) => setProfit(e.target.value)} placeholder="Lucro estimado (R$)" style={inputStyle(theme)} />
      </div>
      <button onClick={save} style={{ ...primaryBtn(theme), width: "100%" }}>Salvar investidor</button>
    </div>
  );
}

function InvestorFields({ investor, store, theme }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(investor.name);
  const [amount, setAmount] = useState(investor.amountInvested);
  const [profit, setProfit] = useState(investor.estimatedProfit);
  const [realProfit, setRealProfit] = useState(investor.realProfit ?? "");

  const save = async () => {
    await store.updateInvestor(investor.id, {
      name, amountInvested: parseFloat(String(amount).replace(",", ".")) || 0,
      estimatedProfit: parseFloat(String(profit).replace(",", ".")) || 0,
      realProfit: realProfit === "" ? null : parseFloat(String(realProfit).replace(",", ".")),
    });
    setEditing(false);
  };

  if (!editing) {
    return (
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}><Users size={13} color={theme.gold} /> {investor.name}</div>
        <div style={{ display: "flex", gap: 16 }}>
          <MiniStat theme={theme} label="Investido" value={fmtBRL(investor.amountInvested)} />
          <MiniStat theme={theme} label="Lucro estimado" value={fmtBRL(investor.estimatedProfit)} />
          <MiniStat theme={theme} label="Lucro real" value={investor.realProfit != null ? fmtBRL(investor.realProfit) : "—"} />
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <button onClick={() => setEditing(true)} style={{ background: "none", border: "none", cursor: "pointer", color: theme.subtext, fontSize: 11, textDecoration: "underline" }}>editar investidor</button>
          <button onClick={() => store.deleteInvestor(investor.id)} style={{ background: "none", border: "none", cursor: "pointer", color: theme.subtext }}><Trash2 size={13} /></button>
        </div>
      </div>
    );
  }
  return (
    <div>
      <input value={name} onChange={(e) => setName(e.target.value)} style={{ ...inputStyle(theme), width: "100%", marginBottom: 8 }} />
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Investido" style={inputStyle(theme)} />
        <input value={profit} onChange={(e) => setProfit(e.target.value)} placeholder="Lucro estimado" style={inputStyle(theme)} />
      </div>
      <input value={realProfit} onChange={(e) => setRealProfit(e.target.value)} placeholder="Lucro real (ao final da obra)" style={{ ...inputStyle(theme), width: "100%", marginBottom: 8 }} />
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={save} style={{ ...primaryBtn(theme), flex: 1 }}>Salvar</button>
        <button onClick={() => setEditing(false)} style={{ flex: 1, background: theme.surface2, color: theme.text, border: `1px solid ${theme.border}`, borderRadius: 10, fontWeight: 700, cursor: "pointer" }}>Cancelar</button>
      </div>
    </div>
  );
}

function ObraOrcamento({ store, projectId, theme }) {
  const [category, setCategory] = useState(OBRA_CATS[0]); const [description, setDescription] = useState(""); const [value, setValue] = useState("");
  const items = store.data.budgetItems.filter((b) => b.projectId === projectId);
  const total = items.reduce((s, b) => s + b.estimatedValue, 0);

  const add = async () => {
    const v = parseFloat(value.replace(",", "."));
    if (isNaN(v)) return;
    await store.addBudgetItem({ projectId, category, description: description.trim(), estimatedValue: v });
    setDescription(""); setValue("");
  };

  return (
    <div>
      <Card theme={theme}>
        <div style={{ fontSize: 12, color: theme.subtext }}>Total previsto</div>
        <div style={{ fontFamily: FONT_MONO, fontSize: 22, fontWeight: 700 }}>{fmtBRL(total)}</div>
      </Card>
      <Card theme={theme}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Novo item de orçamento</div>
        <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ ...inputStyle(theme), width: "100%", marginBottom: 8 }}>
          {OBRA_CATS.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descrição (opcional)" style={{ ...inputStyle(theme), width: "100%", marginBottom: 8 }} />
        <input value={value} onChange={(e) => setValue(e.target.value)} placeholder="Valor previsto (R$)" style={{ ...inputStyle(theme), width: "100%", marginBottom: 8 }} />
        <button onClick={add} style={{ ...primaryBtn(theme), width: "100%" }}>Adicionar</button>
      </Card>
      {items.length === 0 && <Card theme={theme}><EmptyHint theme={theme} text="Nenhum item de orçamento ainda." /></Card>}
      {items.map((b) => <BudgetItemRow key={b.id} b={b} store={store} theme={theme} />)}
    </div>
  );
}

function BudgetItemRow({ b, store, theme }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(b.estimatedValue);
  const [description, setDescription] = useState(b.description || "");
  const save = async () => {
    await store.updateBudgetItem(b.id, { estimatedValue: parseFloat(String(value).replace(",", ".")) || 0, description });
    setEditing(false);
  };
  return (
    <Card theme={theme}>
      {!editing ? (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 13 }}>{b.category}</div>
            {b.description && <div style={{ fontSize: 11, color: theme.subtext }}>{b.description}</div>}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontFamily: FONT_MONO, fontWeight: 700 }}>{fmtBRL(b.estimatedValue)}</span>
            <button onClick={() => setEditing(true)} style={{ background: "none", border: "none", cursor: "pointer", color: theme.subtext, fontSize: 11, textDecoration: "underline" }}>editar</button>
            <button onClick={() => store.deleteBudgetItem(b.id)} style={{ background: "none", border: "none", cursor: "pointer", color: theme.subtext }}><Trash2 size={14} /></button>
          </div>
        </div>
      ) : (
        <>
          <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descrição" style={{ ...inputStyle(theme), width: "100%", marginBottom: 8 }} />
          <input value={value} onChange={(e) => setValue(e.target.value)} placeholder="Valor previsto" style={{ ...inputStyle(theme), width: "100%", marginBottom: 8 }} />
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={save} style={{ ...primaryBtn(theme), flex: 1 }}>Salvar</button>
            <button onClick={() => setEditing(false)} style={{ flex: 1, background: theme.surface2, color: theme.text, border: `1px solid ${theme.border}`, borderRadius: 10, fontWeight: 700, cursor: "pointer" }}>Cancelar</button>
          </div>
        </>
      )}
    </Card>
  );
}

function ObraCustos({ store, projectId, theme }) {
  const [category, setCategory] = useState(OBRA_CATS[0]); const [description, setDescription] = useState("");
  const [value, setValue] = useState(""); const [supplier, setSupplier] = useState("");
  const [receiptFile, setReceiptFile] = useState(null);
  const costs = store.data.actualCosts.filter((a) => a.projectId === projectId);
  const total = costs.reduce((s, a) => s + a.value, 0);

  const add = async () => {
    const v = parseFloat(value.replace(",", "."));
    if (isNaN(v)) return;
    await store.addActualCost({ projectId, category, description: description.trim(), value: v, supplier: supplier.trim(), receiptFile });
    setDescription(""); setValue(""); setSupplier(""); setReceiptFile(null);
  };

  return (
    <div>
      <Card theme={theme}>
        <div style={{ fontSize: 12, color: theme.subtext }}>Total real gasto</div>
        <div style={{ fontFamily: FONT_MONO, fontSize: 22, fontWeight: 700 }}>{fmtBRL(total)}</div>
      </Card>
      <Card theme={theme}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Novo custo real</div>
        <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ ...inputStyle(theme), width: "100%", marginBottom: 8 }}>
          {OBRA_CATS.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descrição" style={{ ...inputStyle(theme), width: "100%", marginBottom: 8 }} />
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <input value={value} onChange={(e) => setValue(e.target.value)} placeholder="Valor (R$)" style={inputStyle(theme)} />
          <input value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="Fornecedor" style={inputStyle(theme)} />
        </div>
        <ReceiptField theme={theme} file={receiptFile} setFile={setReceiptFile} />
        <button onClick={add} style={{ ...primaryBtn(theme), width: "100%" }}>Adicionar</button>
      </Card>
      {costs.length === 0 && <Card theme={theme}><EmptyHint theme={theme} text="Nenhum custo real lançado ainda." /></Card>}
      {costs.map((a) => <ActualCostRow key={a.id} a={a} store={store} theme={theme} />)}
    </div>
  );
}

function ActualCostRow({ a, store, theme }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(a.value);
  const [date, setDate] = useState(a.date);
  const save = async () => {
    await store.updateActualCost(a.id, { value: parseFloat(String(value).replace(",", ".")) || 0, date });
    setEditing(false);
  };
  return (
    <Card theme={theme}>
      {!editing ? (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 13 }}>{a.description || a.category}</div>
            <div style={{ fontSize: 11, color: theme.subtext }}>{a.category} · {a.date}{a.supplier ? ` · ${a.supplier}` : ""}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontFamily: FONT_MONO, fontWeight: 700, color: theme.danger }}>{fmtBRL(a.value)}</span>
            <ReceiptLink theme={theme} path={a.receiptPath} />
            <button onClick={() => setEditing(true)} style={{ background: "none", border: "none", cursor: "pointer", color: theme.subtext, fontSize: 11, textDecoration: "underline" }}>editar</button>
            <button onClick={() => store.deleteActualCost(a.id)} style={{ background: "none", border: "none", cursor: "pointer", color: theme.subtext }}><Trash2 size={14} /></button>
          </div>
        </div>
      ) : (
        <>
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ ...inputStyle(theme), fontSize: 12 }} />
            <input value={value} onChange={(e) => setValue(e.target.value)} placeholder="Valor" style={{ ...inputStyle(theme), fontSize: 12 }} />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={save} style={{ ...primaryBtn(theme), flex: 1 }}>Salvar</button>
            <button onClick={() => setEditing(false)} style={{ flex: 1, background: theme.surface2, color: theme.text, border: `1px solid ${theme.border}`, borderRadius: 10, fontWeight: 700, cursor: "pointer" }}>Cancelar</button>
          </div>
        </>
      )}
    </Card>
  );
}

const DOC_CATEGORIAS = { tecnico: "Técnico", financeiro: "Financeiro", desenho: "Desenho técnico", liberacao: "Liberação/Autorização", outro: "Outro" };

function ObraDocumentos({ store, projectId, theme }) {
  const [categoria, setCategoria] = useState("tecnico");
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [file, setFile] = useState(null);
  const [filtro, setFiltro] = useState("todos");
  const docs = store.data.documentos.filter((d) => d.projectId === projectId && (filtro === "todos" || d.categoria === filtro));

  const add = async () => {
    if (!titulo.trim()) return;
    await store.addDocumento({ projectId, categoria, titulo: titulo.trim(), descricao: descricao.trim(), file });
    setTitulo(""); setDescricao(""); setFile(null);
  };

  return (
    <div>
      <Card theme={theme}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Novo documento</div>
        <select value={categoria} onChange={(e) => setCategoria(e.target.value)} style={{ ...inputStyle(theme), width: "100%", marginBottom: 8 }}>
          {Object.entries(DOC_CATEGORIAS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Título (ex: ART de execução, Projeto elétrico...)" style={{ ...inputStyle(theme), width: "100%", marginBottom: 8 }} />
        <input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Observação (opcional)" style={{ ...inputStyle(theme), width: "100%", marginBottom: 8 }} />
        <ObraFileField theme={theme} file={file} setFile={setFile} label="Anexar arquivo (PDF ou foto)" />
        <button onClick={add} style={{ ...primaryBtn(theme), width: "100%" }}>Arquivar documento</button>
      </Card>

      <div style={{ display: "flex", gap: 6, marginBottom: 12, overflowX: "auto" }}>
        {["todos", ...Object.keys(DOC_CATEGORIAS)].map((k) => (
          <button key={k} onClick={() => setFiltro(k)} style={{ flex: "0 0 auto", padding: "6px 10px", borderRadius: 99, border: `1px solid ${theme.border}`, cursor: "pointer", fontSize: 11, fontWeight: 700, background: filtro === k ? theme.accent : "transparent", color: filtro === k ? "#fff" : theme.subtext }}>
            {k === "todos" ? "Todos" : DOC_CATEGORIAS[k]}
          </button>
        ))}
      </div>

      {docs.length === 0 && <Card theme={theme}><EmptyHint theme={theme} text="Nenhum documento arquivado nessa categoria." /></Card>}
      {docs.map((d) => (
        <Card key={d.id} theme={theme} style={{ marginBottom: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13 }}>{d.titulo}</div>
              <div style={{ fontSize: 11, color: theme.subtext }}>{DOC_CATEGORIAS[d.categoria]} · {d.data}{d.validade ? ` · válido até ${d.validade}` : ""}</div>
              {d.descricao && <div style={{ fontSize: 11, color: theme.subtext, marginTop: 2 }}>{d.descricao}</div>}
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <ObraFileLink theme={theme} path={d.path} label="abrir" />
              <button onClick={() => store.deleteDocumento(d.id)} style={{ background: "none", border: "none", cursor: "pointer", color: theme.danger }}><Trash2 size={14} /></button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

function ObraFotos({ store, projectId, theme }) {
  const [legenda, setLegenda] = useState("");
  const [etapa, setEtapa] = useState("");
  const [file, setFile] = useState(null);
  const fotos = store.data.fotos.filter((f) => f.projectId === projectId);

  const add = async () => {
    if (!file) return;
    await store.addFoto({ projectId, legenda: legenda.trim(), etapa: etapa.trim(), file });
    setLegenda(""); setEtapa(""); setFile(null);
  };

  return (
    <div>
      <Card theme={theme}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Nova foto de evolução</div>
        <input value={etapa} onChange={(e) => setEtapa(e.target.value)} placeholder="Etapa (ex: Fundação, Alvenaria, Acabamento)" style={{ ...inputStyle(theme), width: "100%", marginBottom: 8 }} />
        <input value={legenda} onChange={(e) => setLegenda(e.target.value)} placeholder="Legenda (opcional)" style={{ ...inputStyle(theme), width: "100%", marginBottom: 8 }} />
        <ObraFileField theme={theme} file={file} setFile={setFile} label="Tirar foto / escolher foto" accept="image/*" />
        <button onClick={add} style={{ ...primaryBtn(theme), width: "100%" }}>Salvar foto</button>
      </Card>
      {fotos.length === 0 && <Card theme={theme}><EmptyHint theme={theme} text="Nenhuma foto de evolução registrada ainda." /></Card>}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {fotos.map((f) => (
          <Card key={f.id} theme={theme} style={{ marginBottom: 0, cursor: "pointer" }}>
            <div onClick={() => openObraFile(f.path)} style={{ display: "flex", alignItems: "center", gap: 6, color: theme.accent, fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
              <ImageIcon size={14} /> ver foto
            </div>
            <div style={{ fontSize: 11, fontWeight: 700 }}>{f.etapa || "—"}</div>
            {f.legenda && <div style={{ fontSize: 11, color: theme.subtext }}>{f.legenda}</div>}
            <div style={{ fontSize: 10, color: theme.subtext, marginTop: 4 }}>{f.data}</div>
            <button onClick={() => store.deleteFoto(f.id)} style={{ background: "none", border: "none", cursor: "pointer", color: theme.danger, fontSize: 11, marginTop: 4, padding: 0 }}>excluir</button>
          </Card>
        ))}
      </div>
    </div>
  );
}

const NC_CATEGORIAS = { execucao: "Execução", seguranca: "Segurança", qualidade: "Qualidade", documental: "Documental", outro: "Outro" };
const NC_STATUS = { aberta: "Aberta", em_tratativa: "Em tratativa", resolvida: "Resolvida" };

function ObraNaoConformidades({ store, projectId, theme }) {
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [categoria, setCategoria] = useState("execucao");
  const [gravidade, setGravidade] = useState("media");
  const [responsavel, setResponsavel] = useState("");
  const [prazo, setPrazo] = useState("");
  const [file, setFile] = useState(null);
  const items = store.data.naoConformidades.filter((n) => n.projectId === projectId);
  const abertas = items.filter((n) => n.status !== "resolvida");
  const resolvidas = items.filter((n) => n.status === "resolvida");

  const add = async () => {
    if (!titulo.trim()) return;
    await store.addNaoConformidade({ projectId, titulo: titulo.trim(), descricao: descricao.trim(), categoria, gravidade, responsavel: responsavel.trim(), prazo: prazo || null, file });
    setTitulo(""); setDescricao(""); setResponsavel(""); setPrazo(""); setFile(null);
  };

  return (
    <div>
      <Card theme={theme}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Abrir não conformidade</div>
        <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Título (ex: Prumo fora do padrão - bloco 2)" style={{ ...inputStyle(theme), width: "100%", marginBottom: 8 }} />
        <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Descrição" rows={2} style={{ ...inputStyle(theme), width: "100%", marginBottom: 8, resize: "vertical" }} />
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <select value={categoria} onChange={(e) => setCategoria(e.target.value)} style={{ ...inputStyle(theme), flex: 1 }}>
            {Object.entries(NC_CATEGORIAS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
          <select value={gravidade} onChange={(e) => setGravidade(e.target.value)} style={{ ...inputStyle(theme), flex: 1 }}>
            <option value="baixa">Baixa</option><option value="media">Média</option><option value="alta">Alta</option>
          </select>
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <input value={responsavel} onChange={(e) => setResponsavel(e.target.value)} placeholder="Responsável" style={{ ...inputStyle(theme), flex: 1 }} />
          <input type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} style={{ ...inputStyle(theme), flex: 1 }} />
        </div>
        <ObraFileField theme={theme} file={file} setFile={setFile} label="Anexar foto da evidência (opcional)" accept="image/*" />
        <button onClick={add} style={{ ...primaryBtn(theme), width: "100%" }}>Abrir não conformidade</button>
      </Card>

      <div style={{ fontSize: 12, fontWeight: 700, color: theme.subtext, margin: "6px 0" }}>Abertas / em tratativa ({abertas.length})</div>
      {abertas.length === 0 && <Card theme={theme}><EmptyHint theme={theme} text="Nenhuma não conformidade em aberto." /></Card>}
      {abertas.map((n) => <NaoConformidadeRow key={n.id} n={n} store={store} theme={theme} />)}

      {resolvidas.length > 0 && <>
        <div style={{ fontSize: 12, fontWeight: 700, color: theme.subtext, margin: "14px 0 6px" }}>Histórico resolvidas ({resolvidas.length})</div>
        {resolvidas.map((n) => <NaoConformidadeRow key={n.id} n={n} store={store} theme={theme} />)}
      </>}
    </div>
  );
}

function NaoConformidadeRow({ n, store, theme }) {
  const gravColor = n.gravidade === "alta" ? theme.danger : n.gravidade === "media" ? theme.gold : theme.subtext;
  const resolve = async () => {
    const acao = prompt("Ação corretiva aplicada:", n.acaoCorretiva || "");
    if (acao === null) return;
    await store.updateNaoConformidade(n.id, { status: "resolvida", acaoCorretiva: acao, dataResolucao: todayISO() });
  };
  return (
    <Card theme={theme} style={{ marginBottom: 8, borderLeft: `3px solid ${gravColor}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 13 }}>{n.titulo}</div>
          <div style={{ fontSize: 11, color: theme.subtext }}>{NC_CATEGORIAS[n.categoria]} · gravidade {n.gravidade} · aberta em {n.dataAbertura}{n.prazo ? ` · prazo ${n.prazo}` : ""}{n.responsavel ? ` · ${n.responsavel}` : ""}</div>
          {n.descricao && <div style={{ fontSize: 12, marginTop: 4 }}>{n.descricao}</div>}
          {n.status === "resolvida" && <div style={{ fontSize: 11, color: theme.accent, marginTop: 4 }}>✓ Resolvida em {n.dataResolucao}{n.acaoCorretiva ? ` — ${n.acaoCorretiva}` : ""}</div>}
        </div>
        <span style={{ fontSize: 10, fontWeight: 700, color: theme.gold, background: theme.accentSoft, padding: "3px 8px", borderRadius: 99, whiteSpace: "nowrap" }}>{NC_STATUS[n.status]}</span>
      </div>
      <div style={{ display: "flex", gap: 12, marginTop: 8, paddingTop: 8, borderTop: `1px solid ${theme.border}` }}>
        {n.pathFoto && <ObraFileLink theme={theme} path={n.pathFoto} label="ver evidência" />}
        {n.status !== "resolvida" && n.status !== "em_tratativa" && (
          <button onClick={() => store.updateNaoConformidade(n.id, { status: "em_tratativa" })} style={{ background: "none", border: "none", cursor: "pointer", color: theme.subtext, fontSize: 11, textDecoration: "underline" }}>marcar em tratativa</button>
        )}
        {n.status !== "resolvida" && (
          <button onClick={resolve} style={{ background: "none", border: "none", cursor: "pointer", color: theme.accent, fontSize: 11, textDecoration: "underline" }}>resolver</button>
        )}
        <button onClick={() => store.deleteNaoConformidade(n.id)} style={{ background: "none", border: "none", cursor: "pointer", color: theme.danger, fontSize: 11, textDecoration: "underline" }}>excluir</button>
      </div>
    </Card>
  );
}

const REQ_CATEGORIAS = { municipal: "Municipal (Paulista/PE)", caixa_mcmv: "Caixa · MCMV", ambiental: "Ambiental", outro: "Outro" };
const REQ_STATUS = { pendente: "Pendente", em_andamento: "Em andamento", concluido: "Concluído", nao_aplicavel: "Não aplicável" };

/* Checklist sugerido para obras MCMV em Paulista/PE — itens municipais,
   da Caixa e concessionárias, usados para popular automaticamente o
   checklist de requisitos de uma obra nova. */
const REQUISITOS_SUGERIDOS = [
  { categoria: "municipal", item: "Alvará de construção", descricao: "Prefeitura de Paulista/PE" },
  { categoria: "municipal", item: "ART/RRT de execução", descricao: "Registro no CREA/CAU do responsável técnico" },
  { categoria: "municipal", item: "Habite-se", descricao: "Prefeitura de Paulista/PE" },
  { categoria: "municipal", item: "Auto de conclusão de obra", descricao: "" },
  { categoria: "municipal", item: "CND — Certidão Negativa de Débitos", descricao: "Municipal e/ou federal (obra)" },
  { categoria: "municipal", item: "Averbação da construção", descricao: "Cartório de Registro de Imóveis" },
  { categoria: "municipal", item: "Matrícula individualizada das unidades", descricao: "Após averbação/incorporação" },
  { categoria: "municipal", item: "Ligação definitiva de água/esgoto", descricao: "Compesa" },
  { categoria: "municipal", item: "Ligação definitiva de energia", descricao: "Neoenergia/Celpe" },
  { categoria: "caixa_mcmv", item: "Laudo de vistoria da Caixa (medição)", descricao: "Acompanhamento de obra MCMV" },
  { categoria: "caixa_mcmv", item: "Liberação de parcelas MCMV", descricao: "Conforme cronograma físico-financeiro aprovado" },
  { categoria: "caixa_mcmv", item: "CNO — baixa junto à Receita Federal", descricao: "Ao final da obra" },
  { categoria: "outro", item: "Entrega de as-built", descricao: "Projetos conforme executado" },
  { categoria: "outro", item: "Termo de garantia da obra", descricao: "" },
];

function ObraRequisitos({ store, projectId, theme }) {
  const [item, setItem] = useState("");
  const [categoria, setCategoria] = useState("municipal");
  const [descricao, setDescricao] = useState("");
  const items = store.data.requisitos.filter((r) => r.projectId === projectId);
  const concluidos = items.filter((r) => r.status === "concluido" || r.status === "nao_aplicavel").length;
  const pct = items.length ? Math.round((concluidos / items.length) * 100) : 0;

  const add = async () => {
    if (!item.trim()) return;
    await store.addRequisito({ projectId, categoria, item: item.trim(), descricao: descricao.trim() });
    setItem(""); setDescricao("");
  };

  const completarComSugeridos = async () => {
    const existentesKey = new Set(items.map((r) => `${r.categoria}::${r.item.trim().toLowerCase()}`));
    for (const s of REQUISITOS_SUGERIDOS) {
      const key = `${s.categoria}::${s.item.trim().toLowerCase()}`;
      if (existentesKey.has(key)) continue;
      // eslint-disable-next-line no-await-in-loop
      await store.addRequisito({ projectId, categoria: s.categoria, item: s.item, descricao: s.descricao });
      existentesKey.add(key);
    }
  };

  return (
    <div>
      {items.length === 0 ? (
        <Card theme={theme}>
          <EmptyHint theme={theme} text="Nenhum item de checklist ainda para esta obra." />
          <button onClick={completarComSugeridos} style={{ ...primaryBtn(theme), width: "100%", marginTop: 8 }}>Completar com itens sugeridos (Paulista/PE · Caixa/MCMV)</button>
        </Card>
      ) : (
        <Card theme={theme}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>Conformidade documental</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: theme.accent }}>{pct}%</div>
          </div>
          <div style={{ height: 8, background: theme.surface2, borderRadius: 99, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${pct}%`, background: theme.accent }} />
          </div>
        </Card>
      )}

      <Card theme={theme}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Novo item de requisito</div>
        <select value={categoria} onChange={(e) => setCategoria(e.target.value)} style={{ ...inputStyle(theme), width: "100%", marginBottom: 8 }}>
          {Object.entries(REQ_CATEGORIAS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        <input value={item} onChange={(e) => setItem(e.target.value)} placeholder="Item (ex: Habite-se)" style={{ ...inputStyle(theme), width: "100%", marginBottom: 8 }} />
        <input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Descrição (opcional)" style={{ ...inputStyle(theme), width: "100%", marginBottom: 8 }} />
        <button onClick={add} style={{ ...primaryBtn(theme), width: "100%" }}>Adicionar ao checklist</button>
        {items.length > 0 && (
          <button onClick={completarComSugeridos} style={{ background: "none", border: "none", cursor: "pointer", color: theme.accent, fontSize: 12, textDecoration: "underline", padding: 0, marginTop: 8 }}>completar com itens sugeridos (Paulista/PE · Caixa/MCMV)</button>
        )}
      </Card>

      {Object.entries(REQ_CATEGORIAS).map(([catKey, catLabel]) => {
        const catItems = items.filter((r) => r.categoria === catKey);
        if (catItems.length === 0) return null;
        return (
          <div key={catKey} style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: theme.subtext, marginBottom: 6 }}>{catLabel}</div>
            {catItems.map((r) => <RequisitoRow key={r.id} r={r} store={store} theme={theme} />)}
          </div>
        );
      })}
    </div>
  );
}

function RequisitoRow({ r, store, theme }) {
  const done = r.status === "concluido" || r.status === "nao_aplicavel";
  const toggle = () => store.updateRequisito(r.id, { status: done ? "pendente" : "concluido" });
  const [editing, setEditing] = useState(false);
  const [item, setItem] = useState(r.item);
  const [descricao, setDescricao] = useState(r.descricao || "");
  const [categoria, setCategoria] = useState(r.categoria);

  const save = async () => {
    if (!item.trim()) return;
    await store.updateRequisito(r.id, { item: item.trim(), descricao: descricao.trim(), categoria });
    setEditing(false);
  };

  if (editing) {
    return (
      <Card theme={theme} style={{ marginBottom: 6, padding: "10px 14px" }}>
        <select value={categoria} onChange={(e) => setCategoria(e.target.value)} style={{ ...inputStyle(theme), width: "100%", marginBottom: 6 }}>
          {Object.entries(REQ_CATEGORIAS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        <input value={item} onChange={(e) => setItem(e.target.value)} style={{ ...inputStyle(theme), width: "100%", marginBottom: 6 }} placeholder="Item" />
        <input value={descricao} onChange={(e) => setDescricao(e.target.value)} style={{ ...inputStyle(theme), width: "100%", marginBottom: 8 }} placeholder="Descrição (opcional)" />
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={save} style={{ ...primaryBtn(theme), flex: 1 }}>Salvar</button>
          <button onClick={() => setEditing(false)} style={{ flex: 1, background: theme.surface2, color: theme.text, border: `1px solid ${theme.border}`, borderRadius: 10, fontWeight: 700, cursor: "pointer" }}>Cancelar</button>
        </div>
      </Card>
    );
  }

  return (
    <Card theme={theme} style={{ marginBottom: 6, padding: "10px 14px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <button onClick={toggle} style={{ background: "none", border: "none", cursor: "pointer", color: done ? theme.accent : theme.subtext, padding: 0, marginTop: 1 }}>
          {done ? <CheckCircle2 size={18} /> : <Circle size={18} />}
        </button>
        <div style={{ flex: 1, cursor: "pointer" }} onClick={() => setEditing(true)}>
          <div style={{ fontSize: 13, fontWeight: 600, textDecoration: done ? "line-through" : "none", color: done ? theme.subtext : theme.text }}>{r.item}</div>
          {r.descricao && <div style={{ fontSize: 11, color: theme.subtext }}>{r.descricao}</div>}
        </div>
        <select value={r.status} onChange={(e) => store.updateRequisito(r.id, { status: e.target.value })} style={{ ...inputStyle(theme), fontSize: 11, padding: "4px 6px" }}>
          {Object.entries(REQ_STATUS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        <button title="Editar" onClick={() => setEditing(true)} style={{ background: "none", border: "none", cursor: "pointer", color: theme.subtext, fontSize: 11, textDecoration: "underline" }}>editar</button>
        <button onClick={() => store.deleteRequisito(r.id)} style={{ background: "none", border: "none", cursor: "pointer", color: theme.danger }}><Trash2 size={14} /></button>
      </div>
    </Card>
  );
}

const ETAPAS_SUGERIDAS = [
  "Limpeza e preparo do terreno",
  "Terraplenagem/locação da obra",
  "Fundação",
  "Estrutura (pilares, vigas, lajes)",
  "Alvenaria/Paredes",
  "Cobertura",
  "Instalações elétricas",
  "Instalações hidrossanitárias",
  "Reboco/Emboço",
  "Contrapiso",
  "Revestimento (piso e parede)",
  "Esquadrias (portas e janelas)",
  "Pintura",
  "Acabamento e limpeza final",
  "Entrega/Habite-se",
];

const ETAPA_STATUS_CYCLE = { pendente: "andamento", andamento: "concluida", concluida: "pendente" };
const ETAPA_STATUS_LABEL = { pendente: "Pendente", andamento: "Em andamento", concluida: "Concluída" };

const CRONOGRAMA_SUGERIDO = [
  { nome: "Mobilização e instalação do canteiro", dias: 5 },
  { nome: "Locação da obra", dias: 3 },
  { nome: "Escavação e fundação", dias: 12 },
  { nome: "Impermeabilização da fundação", dias: 4 },
  { nome: "Estrutura de concreto armado (pilares, vigas, lajes)", dias: 20 },
  { nome: "Alvenaria de vedação", dias: 15 },
  { nome: "Instalações elétricas (infraestrutura)", dias: 10 },
  { nome: "Instalações hidrossanitárias (infraestrutura)", dias: 10 },
  { nome: "Cobertura/telhado", dias: 10 },
  { nome: "Impermeabilização de lajes e áreas molhadas", dias: 5 },
  { nome: "Reboco interno e externo", dias: 15 },
  { nome: "Contrapiso", dias: 6 },
  { nome: "Instalação de esquadrias", dias: 8 },
  { nome: "Revestimento cerâmico/porcelanato", dias: 12 },
  { nome: "Instalação elétrica (acabamento)", dias: 6 },
  { nome: "Instalação hidrossanitária (acabamento)", dias: 6 },
  { nome: "Pintura interna e externa", dias: 10 },
  { nome: "Louças e metais", dias: 4 },
  { nome: "Limpeza pós-obra", dias: 3 },
  { nome: "Vistoria final e entrega", dias: 3 },
];

/* Thumbnail pequeno pra foto anexada a uma etapa (Avanço da obra / da unidade) */
function EtapaFotoThumb({ path, theme, size = 40 }) {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    let active = true;
    if (!path) { setUrl(null); return; }
    supabase.storage.from("obra-docs").createSignedUrl(path, 300).then(({ data }) => { if (active && data) setUrl(data.signedUrl); });
    return () => { active = false; };
  }, [path]);
  if (!url) return null;
  return (
    <img
      src={url}
      alt="foto da etapa"
      onClick={(e) => { e.stopPropagation(); openObraFile(path); }}
      style={{ width: size, height: size, borderRadius: 8, objectFit: "cover", cursor: "pointer", border: `1px solid ${theme.border}`, flexShrink: 0 }}
    />
  );
}

/* Botão discreto de "anexar foto" reaproveitando o input de arquivo, sem preview
   de nome (usado inline nas linhas de etapa). */
function EtapaFotoBtn({ theme, onPick, hasFoto }) {
  return (
    <label style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, borderRadius: 8, border: `1px dashed ${theme.border}`, cursor: "pointer", color: theme.subtext, flexShrink: 0 }} title={hasFoto ? "Trocar foto" : "Adicionar foto"}>
      <Camera size={14} />
      <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) onPick(f); }} />
    </label>
  );
}

/* ================= CRONOGRAMA (Gantt simplificado, mesmo espírito do
   sistema Cronograma já usado — atividades com predecessora, duração,
   % de avanço, e barra visual com destaque de atraso) ================= */

function addDaysISO(iso, n) {
  const d = new Date(iso + "T12:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}
function diffDaysISO(a, b) {
  return Math.round((new Date(b + "T12:00") - new Date(a + "T12:00")) / 86400000);
}

function ganttTicks(rangeStart, rangeEnd, totalDays, granularity) {
  const ticks = [];
  if (granularity === "semanas") {
    // começa na segunda-feira da semana de rangeStart (ou no próprio início)
    let d = new Date(rangeStart + "T12:00");
    const dow = d.getDay(); // 0=domingo
    const backToMonday = dow === 0 ? 6 : dow - 1;
    d.setDate(d.getDate() - backToMonday);
    let iso = d.toISOString().slice(0, 10);
    if (iso < rangeStart) iso = addDaysISO(iso, 7);
    while (iso <= rangeEnd) {
      const offsetPct = (diffDaysISO(rangeStart, iso) / totalDays) * 100;
      if (offsetPct >= 0 && offsetPct <= 100) {
        const label = new Date(iso + "T12:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
        ticks.push({ iso, offsetPct, label });
      }
      iso = addDaysISO(iso, 7);
    }
  } else {
    // início de cada mês dentro do range
    let d = new Date(rangeStart + "T12:00");
    d.setDate(1);
    let iso = d.toISOString().slice(0, 10);
    if (iso < rangeStart) { d.setMonth(d.getMonth() + 1); iso = d.toISOString().slice(0, 10); }
    while (iso <= rangeEnd) {
      const offsetPct = (diffDaysISO(rangeStart, iso) / totalDays) * 100;
      if (offsetPct >= 0 && offsetPct <= 100) {
        const label = new Date(iso + "T12:00").toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }).replace(".", "");
        ticks.push({ iso, offsetPct, label });
      }
      const nd = new Date(iso + "T12:00");
      nd.setMonth(nd.getMonth() + 1);
      iso = nd.toISOString().slice(0, 10);
    }
  }
  return ticks;
}

function ObraCronograma({ store, projectId, theme }) {
  const [nome, setNome] = useState("");
  const [dataInicio, setDataInicio] = useState(todayISO());
  const [duracaoDias, setDuracaoDias] = useState(5);
  const [predecessoraId, setPredecessoraId] = useState("");
  const [responsavel, setResponsavel] = useState("");
  const [ganttView, setGanttView] = useState(null); // null = ainda não decidido (default automático)

  const atividades = store.data.cronograma.filter((a) => a.projectId === projectId).sort((a, b) => a.ordem - b.ordem);

  const add = async () => {
    if (!nome.trim()) return;
    let inicio = dataInicio;
    if (predecessoraId) {
      const pred = atividades.find((a) => a.id === Number(predecessoraId));
      if (pred) inicio = addDaysISO(pred.dataInicio, pred.duracaoDias);
    }
    await store.addAtividade({ projectId, nome: nome.trim(), dataInicio: inicio, duracaoDias: Number(duracaoDias) || 1, predecessoraId: predecessoraId ? Number(predecessoraId) : null, responsavel: responsavel.trim() });
    setNome(""); setResponsavel(""); setPredecessoraId("");
  };

  const addPadrao = async () => {
    // encadeia sequencialmente a partir do fim da última atividade já cadastrada
    // (sem usar predecessora real entre elas, pra não depender do id retornado em cada insert)
    let cursorDate = atividades.length
      ? atividades.reduce((max, a) => { const e = addDaysISO(a.dataInicio, a.duracaoDias); return e > max ? e : max; }, addDaysISO(atividades[0].dataInicio, atividades[0].duracaoDias))
      : todayISO();
    for (const item of CRONOGRAMA_SUGERIDO) {
      if (atividades.some((a) => a.nome === item.nome)) continue;
      // eslint-disable-next-line no-await-in-loop
      await store.addAtividade({ projectId, nome: item.nome, dataInicio: cursorDate, duracaoDias: item.dias, predecessoraId: null, responsavel: "" });
      cursorDate = addDaysISO(cursorDate, item.dias);
    }
  };

  // Previsão original x previsão com atrasos (cascata simples via predecessora)
  const projecao = useMemo(() => {
    const byId = {}; atividades.forEach((a) => { byId[a.id] = a; });
    const effEnd = {}; const plannedEnd = {};
    const resolve = (a, seen) => {
      if (effEnd[a.id] !== undefined) return effEnd[a.id];
      if (seen.has(a.id)) return addDaysISO(a.dataInicio, a.duracaoDias); // guarda contra ciclo
      seen.add(a.id);
      plannedEnd[a.id] = addDaysISO(a.dataInicio, a.duracaoDias);
      let effStart = a.dataInicio;
      const pred = a.predecessoraId ? byId[a.predecessoraId] : null;
      if (pred) {
        const predEnd = resolve(pred, seen);
        if (predEnd > effStart) effStart = predEnd;
      }
      const end = addDaysISO(effStart, a.duracaoDias);
      effEnd[a.id] = end;
      return end;
    };
    atividades.forEach((a) => resolve(a, new Set()));
    const previsaoOriginal = atividades.length ? atividades.reduce((max, a) => { const e = addDaysISO(a.dataInicio, a.duracaoDias); return e > max ? e : max; }, atividades[0] ? addDaysISO(atividades[0].dataInicio, atividades[0].duracaoDias) : todayISO()) : null;
    const previsaoAtual = atividades.length ? atividades.reduce((max, a) => effEnd[a.id] > max ? effEnd[a.id] : max, effEnd[atividades[0].id]) : null;
    const deltaDias = previsaoOriginal && previsaoAtual ? diffDaysISO(previsaoOriginal, previsaoAtual) : 0;
    return { previsaoOriginal, previsaoAtual, deltaDias };
  }, [atividades]);

  if (atividades.length === 0) {
    return (
      <div>
        <Card theme={theme}>
          <SectionLabel theme={theme}>Nova atividade</SectionLabel>
          <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome (ex: Fundação - Bloco A)" style={{ ...inputStyle(theme), width: "100%", marginBottom: 8 }} />
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} style={inputStyle(theme)} />
            <input type="number" min={1} value={duracaoDias} onChange={(e) => setDuracaoDias(e.target.value)} placeholder="Duração (dias)" style={{ ...inputStyle(theme), maxWidth: 130 }} />
          </div>
          <button onClick={add} style={{ ...primaryBtn(theme), width: "100%" }}>Criar cronograma</button>
          <button onClick={addPadrao} style={{ background: "none", border: "none", cursor: "pointer", color: theme.accent, fontSize: 12, textDecoration: "underline", padding: 0, marginTop: 8 }}>ou completar com atividades padrão de uma obra residencial</button>
        </Card>
        <Card theme={theme}><EmptyHint theme={theme} text="Nenhuma atividade cadastrada ainda para esta obra." /></Card>
      </div>
    );
  }

  const starts = atividades.map((a) => a.dataInicio);
  const ends = atividades.map((a) => addDaysISO(a.dataInicio, a.duracaoDias));
  const rangeStart = starts.reduce((min, d) => d < min ? d : min, starts[0]);
  const rangeEndRaw = ends.reduce((max, d) => d > max ? d : max, ends[0]);
  const rangeEnd = addDaysISO(rangeEndRaw, 2);
  const totalDays = Math.max(1, diffDaysISO(rangeStart, rangeEnd));
  const today = todayISO();
  const todayOffsetPct = Math.min(100, Math.max(0, (diffDaysISO(rangeStart, today) / totalDays) * 100));
  const ganttViewResolved = ganttView || (totalDays > 90 ? "meses" : "semanas");
  const ticks = ganttTicks(rangeStart, rangeEnd, totalDays, ganttViewResolved);

  const totalDuracao = atividades.reduce((s, a) => s + a.duracaoDias, 0);
  const avancoPonderado = totalDuracao ? Math.round(atividades.reduce((s, a) => s + a.avancoPct * a.duracaoDias, 0) / totalDuracao) : 0;
  const diasDecorridos = atividades.reduce((s, a) => s + Math.min(a.duracaoDias, Math.max(0, diffDaysISO(a.dataInicio, today))), 0);
  const esperadoPonderado = totalDuracao ? Math.round((diasDecorridos / totalDuracao) * 100) : 0;
  const atrasadas = atividades.filter((a) => a.avancoPct < 100 && today > addDaysISO(a.dataInicio, a.duracaoDias)).length;

  return (
    <div>
      <div style={{ display: "flex", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
        <Card theme={theme} style={{ flex: 1, minWidth: 130, marginBottom: 0 }}><MiniStat theme={theme} label="Avanço real (ponderado)" value={`${avancoPonderado}%`} color={theme.accent} /></Card>
        <Card theme={theme} style={{ flex: 1, minWidth: 130, marginBottom: 0 }}><MiniStat theme={theme} label="Avanço esperado (hoje)" value={`${esperadoPonderado}%`} color={theme.gold} /></Card>
        <Card theme={theme} style={{ flex: 1, minWidth: 130, marginBottom: 0 }}><MiniStat theme={theme} label="Atividades atrasadas" value={atrasadas} color={atrasadas > 0 ? theme.danger : theme.accent} /></Card>
      </div>

      <Card theme={theme} style={{ borderLeft: `3px solid ${projecao.deltaDias > 0 ? theme.danger : theme.accent}` }}>
        <SectionLabel theme={theme}>Data final prevista do projeto</SectionLabel>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
          <MiniStat theme={theme} label="Previsão original" value={projecao.previsaoOriginal || "—"} />
          <MiniStat theme={theme} label="Previsão atual (com atrasos)" value={projecao.previsaoAtual || "—"} color={projecao.deltaDias > 0 ? theme.danger : theme.accent} />
          {projecao.deltaDias !== 0 && (
            <StatusPill theme={theme} tone={projecao.deltaDias > 0 ? "danger" : "ok"}>
              {projecao.deltaDias > 0 ? `+${projecao.deltaDias} dias de atraso projetado` : `${Math.abs(projecao.deltaDias)} dias adiantado`}
            </StatusPill>
          )}
        </div>
        <div style={{ fontSize: 10.5, color: theme.subtext, marginTop: 8 }}>Considera o encadeamento por predecessora: atraso em uma atividade empurra a data das que dependem dela.</div>
      </Card>

      <Card theme={theme}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <SectionLabel theme={theme}>Gantt</SectionLabel>
          <div style={{ display: "flex", gap: 4, background: theme.surface2, borderRadius: 8, padding: 2 }}>
            {["semanas", "meses"].map((v) => (
              <button key={v} onClick={() => setGanttView(v)} style={{ padding: "4px 10px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 700, textTransform: "capitalize", background: ganttViewResolved === v ? theme.accent : "transparent", color: ganttViewResolved === v ? "#04150D" : theme.subtext }}>
                {v}
              </button>
            ))}
          </div>
        </div>
        <div style={{ overflowX: "auto" }}>
          <div style={{ minWidth: 560, position: "relative" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 0 4px" }}>
              <div style={{ width: 150, minWidth: 150 }} />
              <div style={{ flex: 1, position: "relative", height: 16 }}>
                {ticks.map((tk) => (
                  <div key={tk.iso} style={{ position: "absolute", left: `${tk.offsetPct}%`, top: 0, transform: "translateX(-2px)", fontSize: 9.5, color: theme.subtext, whiteSpace: "nowrap" }}>{tk.label}</div>
                ))}
              </div>
              <div style={{ width: 40 }} />
            </div>
            <div style={{ position: "relative" }}>
              <div style={{ position: "absolute", left: 158, right: 40, top: 0, bottom: 0, pointerEvents: "none" }}>
                {ticks.map((tk) => (
                  <div key={tk.iso} style={{ position: "absolute", left: `${tk.offsetPct}%`, top: 0, bottom: 0, width: 1, background: theme.border }} />
                ))}
              </div>
            {atividades.map((a) => {
              const startOffset = (diffDaysISO(rangeStart, a.dataInicio) / totalDays) * 100;
              const width = Math.max(1.5, (a.duracaoDias / totalDays) * 100);
              const end = addDaysISO(a.dataInicio, a.duracaoDias);
              const atrasada = a.avancoPct < 100 && today > end;
              const barColor = a.avancoPct >= 100 ? theme.accent : atrasada ? theme.danger : theme.navy2;
              return (
                <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0" }}>
                  <div style={{ width: 150, minWidth: 150, fontSize: 11.5, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={a.nome}>{a.nome}</div>
                  <div style={{ flex: 1, position: "relative", height: 22, background: theme.surface2, borderRadius: 5 }}>
                    <div style={{ position: "absolute", left: `${startOffset}%`, width: `${width}%`, height: "100%", borderRadius: 5, background: barColor, display: "flex", alignItems: "center", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${Math.min(100, a.avancoPct)}%`, background: "rgba(255,255,255,0.35)" }} />
                    </div>
                    <div style={{ position: "absolute", left: `${todayOffsetPct}%`, top: -2, bottom: -2, width: 2, background: theme.gold }} />
                  </div>
                  <div style={{ width: 40, textAlign: "right", fontSize: 11, fontWeight: 700, color: atrasada ? theme.danger : theme.subtext }}>{a.avancoPct}%</div>
                </div>
              );
            })}
            </div>
          </div>
        </div>
        <div style={{ fontSize: 10.5, color: theme.subtext, marginTop: 8, display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 2, height: 12, background: theme.gold }} /> linha = hoje · barra vermelha = atrasada
        </div>
      </Card>

      <Card theme={theme}>
        <SectionLabel theme={theme}>Atividades</SectionLabel>
        {atividades.map((a) => <AtividadeRow key={a.id} a={a} atividades={atividades} store={store} theme={theme} />)}
      </Card>

      <Card theme={theme}>
        <SectionLabel theme={theme}>Nova atividade</SectionLabel>
        <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome (ex: Reboco - Bloco B)" style={{ ...inputStyle(theme), width: "100%", marginBottom: 8 }} />
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} style={inputStyle(theme)} />
          <input type="number" min={1} value={duracaoDias} onChange={(e) => setDuracaoDias(e.target.value)} placeholder="Dias" style={{ ...inputStyle(theme), maxWidth: 90 }} />
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <select value={predecessoraId} onChange={(e) => setPredecessoraId(e.target.value)} style={{ ...inputStyle(theme), flex: 1 }}>
            <option value="">Sem predecessora</option>
            {atividades.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
          </select>
          <input value={responsavel} onChange={(e) => setResponsavel(e.target.value)} placeholder="Responsável" style={{ ...inputStyle(theme), flex: 1 }} />
        </div>
        <button onClick={add} style={{ ...primaryBtn(theme), width: "100%" }}>Adicionar atividade</button>
        <button onClick={addPadrao} style={{ background: "none", border: "none", cursor: "pointer", color: theme.accent, fontSize: 12, textDecoration: "underline", padding: 0, marginTop: 8 }}>completar com atividades padrão que faltam</button>
      </Card>
    </div>
  );
}

/* Retorna o conjunto de ids que dependem (direta ou indiretamente) de baseId,
   pra impedir escolher uma predecessora que criaria um ciclo. */
function downstreamIds(baseId, atividades) {
  const result = new Set();
  let changed = true;
  while (changed) {
    changed = false;
    atividades.forEach((a) => {
      if (a.predecessoraId != null && (a.predecessoraId === baseId || result.has(a.predecessoraId)) && !result.has(a.id)) {
        result.add(a.id);
        changed = true;
      }
    });
  }
  return result;
}

function AtividadeRow({ a, atividades, store, theme }) {
  const end = addDaysISO(a.dataInicio, a.duracaoDias);
  const atrasada = a.avancoPct < 100 && todayISO() > end;
  const pred = atividades.find((x) => x.id === a.predecessoraId);
  const [editing, setEditing] = useState(false);
  const [nome, setNome] = useState(a.nome);
  const [dataInicio, setDataInicio] = useState(a.dataInicio);
  const [duracaoDias, setDuracaoDias] = useState(a.duracaoDias);
  const [predecessoraId, setPredecessoraId] = useState(a.predecessoraId || "");
  const [responsavel, setResponsavel] = useState(a.responsavel || "");

  const startEdit = () => {
    setNome(a.nome); setDataInicio(a.dataInicio); setDuracaoDias(a.duracaoDias);
    setPredecessoraId(a.predecessoraId || ""); setResponsavel(a.responsavel || "");
    setEditing(true);
  };

  const save = async () => {
    if (!nome.trim()) return;
    await store.updateAtividade(a.id, {
      nome: nome.trim(),
      dataInicio,
      duracaoDias: Number(duracaoDias) || 1,
      predecessoraId: predecessoraId ? Number(predecessoraId) : null,
      responsavel: responsavel.trim(),
    });
    setEditing(false);
  };

  // não pode virar sua própria predecessora nem escolher algo que já depende dela (ciclo)
  const blocked = downstreamIds(a.id, atividades);
  const opcoesPredecessora = atividades.filter((x) => x.id !== a.id && !blocked.has(x.id));

  if (editing) {
    return (
      <div style={{ padding: "10px 0", borderBottom: `1px solid ${theme.border}` }}>
        <input value={nome} onChange={(e) => setNome(e.target.value)} style={{ ...inputStyle(theme), width: "100%", marginBottom: 6 }} placeholder="Nome da atividade" />
        <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
          <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} style={inputStyle(theme)} />
          <input type="number" min={1} value={duracaoDias} onChange={(e) => setDuracaoDias(e.target.value)} placeholder="Dias" style={{ ...inputStyle(theme), maxWidth: 90 }} />
        </div>
        <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
          <select value={predecessoraId} onChange={(e) => setPredecessoraId(e.target.value)} style={{ ...inputStyle(theme), flex: 1 }}>
            <option value="">Sem predecessora</option>
            {opcoesPredecessora.map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}
          </select>
          <input value={responsavel} onChange={(e) => setResponsavel(e.target.value)} placeholder="Responsável" style={{ ...inputStyle(theme), flex: 1 }} />
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={save} style={{ ...primaryBtn(theme), flex: 1 }}>Salvar</button>
          <button onClick={() => setEditing(false)} style={{ flex: 1, background: theme.surface2, color: theme.text, border: `1px solid ${theme.border}`, borderRadius: 10, fontWeight: 700, cursor: "pointer" }}>Cancelar</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: `1px solid ${theme.border}` }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700 }}>{a.nome}</div>
        <div style={{ fontSize: 10.5, color: theme.subtext }}>
          {a.dataInicio} → {end} ({a.duracaoDias}d){a.responsavel ? ` · ${a.responsavel}` : ""}{pred ? ` · após "${pred.nome}"` : ""}
        </div>
      </div>
      <StatusPill theme={theme} tone={a.avancoPct >= 100 ? "ok" : atrasada ? "danger" : "neutral"}>{a.avancoPct >= 100 ? "Concluída" : atrasada ? "Atrasada" : "No prazo"}</StatusPill>
      <input type="range" min={0} max={100} value={a.avancoPct} onChange={(e) => store.updateAtividade(a.id, { avancoPct: Number(e.target.value) })} style={{ width: 90 }} />
      <div style={{ width: 32, fontSize: 11, fontWeight: 700, textAlign: "right" }}>{a.avancoPct}%</div>
      <button title="Editar" onClick={startEdit} style={{ background: "none", border: "none", cursor: "pointer", color: theme.subtext, fontSize: 11, textDecoration: "underline" }}>editar</button>
      <button onClick={() => store.deleteAtividade(a.id)} style={{ background: "none", border: "none", cursor: "pointer", color: theme.danger }}><Trash2 size={14} /></button>
    </div>
  );
}

/* ================= VISTORIA / APONTAMENTOS (punch list por ambiente,
   mesma lógica do sistema de Recebimento de Obra, usado ao longo da obra) */

const VISTORIA_STATUS = { pendente: { l: "Pendente", tone: "warn" }, ok: { l: "OK", tone: "ok" }, atraso: { l: "Atrasado", tone: "danger" } };

function ObraVistoria({ store, projectId, theme }) {
  const [ambiente, setAmbiente] = useState("");
  const [item, setItem] = useState("");
  const [status, setStatus] = useState("pendente");
  const [observacao, setObservacao] = useState("");
  const [responsavel, setResponsavel] = useState("");
  const [prazo, setPrazo] = useState("");
  const [file, setFile] = useState(null);
  const [filtroAmbiente, setFiltroAmbiente] = useState("todos");
  const [filtroStatus, setFiltroStatus] = useState("todos");

  const itens = store.data.vistoria.filter((v) => v.projectId === projectId);
  const ambientes = [...new Set(itens.map((v) => v.ambiente))].sort();
  const visiveis = itens.filter((v) => (filtroAmbiente === "todos" || v.ambiente === filtroAmbiente) && (filtroStatus === "todos" || v.status === filtroStatus));
  const okCount = itens.filter((v) => v.status === "ok").length;
  const atrasoCount = itens.filter((v) => v.status === "atraso").length;
  const pct = itens.length ? Math.round((okCount / itens.length) * 100) : 0;

  const add = async () => {
    if (!ambiente.trim() || !item.trim()) return;
    await store.addVistoriaItem({ projectId, ambiente: ambiente.trim(), item: item.trim(), status, observacao: observacao.trim(), responsavel: responsavel.trim(), prazo: prazo || null, file });
    setItem(""); setObservacao(""); setResponsavel(""); setPrazo(""); setFile(null);
  };

  const porAmbiente = {};
  visiveis.forEach((v) => { (porAmbiente[v.ambiente] = porAmbiente[v.ambiente] || []).push(v); });

  return (
    <div>
      <div style={{ display: "flex", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
        <Card theme={theme} style={{ flex: 1, minWidth: 120, marginBottom: 0 }}><MiniStat theme={theme} label="Itens vistoriados" value={itens.length} /></Card>
        <Card theme={theme} style={{ flex: 1, minWidth: 120, marginBottom: 0 }}><MiniStat theme={theme} label="OK" value={okCount} color={theme.accent} /></Card>
        <Card theme={theme} style={{ flex: 1, minWidth: 120, marginBottom: 0 }}><MiniStat theme={theme} label="Atrasados" value={atrasoCount} color={theme.danger} /></Card>
        <Card theme={theme} style={{ flex: 1, minWidth: 120, marginBottom: 0 }}><MiniStat theme={theme} label="% conforme" value={`${pct}%`} color={theme.gold} /></Card>
      </div>

      <Card theme={theme}>
        <SectionLabel theme={theme}>Novo apontamento</SectionLabel>
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <input value={ambiente} onChange={(e) => setAmbiente(e.target.value)} placeholder="Ambiente/local (ex: Casa 04 - Cozinha)" style={{ ...inputStyle(theme), flex: 1 }} list="ambientes-existentes" />
          <datalist id="ambientes-existentes">{ambientes.map((a) => <option key={a} value={a} />)}</datalist>
        </div>
        <input value={item} onChange={(e) => setItem(e.target.value)} placeholder="Item vistoriado (ex: Revestimento de piso solto)" style={{ ...inputStyle(theme), width: "100%", marginBottom: 8 }} />
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ ...inputStyle(theme), flex: 1 }}>
            <option value="pendente">Pendente</option>
            <option value="ok">OK</option>
            <option value="atraso">Atrasado</option>
          </select>
          <input value={responsavel} onChange={(e) => setResponsavel(e.target.value)} placeholder="Responsável" style={{ ...inputStyle(theme), flex: 1 }} />
          <input type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} style={{ ...inputStyle(theme), flex: 1 }} />
        </div>
        <textarea value={observacao} onChange={(e) => setObservacao(e.target.value)} placeholder="Observação (opcional)" rows={2} style={{ ...inputStyle(theme), width: "100%", marginBottom: 8, resize: "vertical" }} />
        <ObraFileField theme={theme} file={file} setFile={setFile} label="Anexar foto (opcional)" accept="image/*" />
        <button onClick={add} style={{ ...primaryBtn(theme), width: "100%" }}>Registrar apontamento</button>
      </Card>

      <div style={{ display: "flex", gap: 6, marginBottom: 12, overflowX: "auto" }}>
        <select value={filtroAmbiente} onChange={(e) => setFiltroAmbiente(e.target.value)} style={{ ...inputStyle(theme), maxWidth: 200 }}>
          <option value="todos">Todos os ambientes</option>
          {ambientes.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        {["todos", "pendente", "ok", "atraso"].map((s) => (
          <button key={s} onClick={() => setFiltroStatus(s)} style={{ flex: "0 0 auto", padding: "6px 10px", borderRadius: 99, border: `1px solid ${theme.border}`, cursor: "pointer", fontSize: 11, fontWeight: 700, background: filtroStatus === s ? theme.accent : "transparent", color: filtroStatus === s ? "#04150D" : theme.subtext }}>
            {s === "todos" ? "Todos" : VISTORIA_STATUS[s].l}
          </button>
        ))}
      </div>

      {visiveis.length === 0 && <Card theme={theme}><EmptyHint theme={theme} text="Nenhum apontamento nessa categoria." /></Card>}
      {Object.entries(porAmbiente).map(([amb, list]) => (
        <div key={amb} style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: theme.subtext, marginBottom: 6 }}>{amb}</div>
          {list.map((v) => <VistoriaItemRow key={v.id} v={v} store={store} theme={theme} />)}
        </div>
      ))}
    </div>
  );
}

/* ================= VISTORIA EM PLANTA (pin-on-photo) =================
   Sobe uma prancha (planta baixa / foto do pavimento) e marca pontos de
   pendência direto em cima da imagem, posicionados em % pra funcionar em
   qualquer tela — mesma lógica do sistema de Recebimento de Obra. */

let __pinPulseInjected = false;
function ensurePinPulseStyle() {
  if (__pinPulseInjected || typeof document === "undefined") return;
  __pinPulseInjected = true;
  const style = document.createElement("style");
  style.textContent = `
    @keyframes pinPulso { 0% { box-shadow: 0 0 0 0 rgba(224,65,75,0.55); } 70% { box-shadow: 0 0 0 12px rgba(224,65,75,0); } 100% { box-shadow: 0 0 0 0 rgba(224,65,75,0); } }
    @keyframes pinPulsoGold { 0% { box-shadow: 0 0 0 0 rgba(245,158,11,0.45); } 70% { box-shadow: 0 0 0 10px rgba(245,158,11,0); } 100% { box-shadow: 0 0 0 0 rgba(245,158,11,0); } }
    .pin-atraso { animation: pinPulso 1.6s infinite; }
    .pin-pendente { animation: pinPulsoGold 1.9s infinite; }
  `;
  document.head.appendChild(style);
}

const PIN_STATUS_META = {
  pendente: { l: "Pendente", tone: "warn" },
  ok: { l: "OK", tone: "ok" },
  atraso: { l: "Atrasado", tone: "danger" },
};
function pinColor(theme, status) {
  if (status === "ok") return theme.accent;
  if (status === "atraso") return theme.danger;
  return theme.gold;
}

/* Imagem da prancha resolvida via signed URL (não dá pra colocar um path
   direto num <img src>, então resolvemos uma vez e guardamos em estado). */
function usePranchaUrl(path) {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    let active = true;
    if (!path) { setUrl(null); return; }
    supabase.storage.from("obra-docs").createSignedUrl(path, 600).then(({ data }) => { if (active && data) setUrl(data.signedUrl); });
    return () => { active = false; };
  }, [path]);
  return url;
}

function ObraVistoriaPlanta({ store, projectId, theme }) {
  useEffect(() => { ensurePinPulseStyle(); }, []);
  const pranchas = store.data.pranchas.filter((p) => p.projectId === projectId);
  const [selectedId, setSelectedId] = useState(null);
  useEffect(() => {
    if (!pranchas.some((p) => p.id === selectedId)) setSelectedId(pranchas[0]?.id ?? null);
  }, [pranchas, selectedId]);
  const [showAddPrancha, setShowAddPrancha] = useState(false);
  const [novoTitulo, setNovoTitulo] = useState("");
  const [novoFile, setNovoFile] = useState(null);

  const prancha = pranchas.find((p) => p.id === selectedId) || null;
  const imgUrl = usePranchaUrl(prancha?.path);
  const pins = store.data.pins.filter((pn) => pn.pranchaId === prancha?.id);
  const okCount = pins.filter((p) => p.status === "ok").length;
  const pendCount = pins.filter((p) => p.status === "pendente").length;
  const atrasoCount = pins.filter((p) => p.status === "atraso").length;

  const [novoPin, setNovoPin] = useState(null); // { xPct, yPct }
  const [selectedPinId, setSelectedPinId] = useState(null);
  const selectedPin = pins.find((p) => p.id === selectedPinId) || null;

  const addPrancha = async () => {
    if (!novoFile) return;
    const row = await store.addPrancha({ projectId, titulo: novoTitulo.trim() || "Planta", file: novoFile });
    setNovoTitulo(""); setNovoFile(null); setShowAddPrancha(false);
    if (row) setSelectedId(row.id);
  };

  const onImgClick = (e) => {
    if (!prancha) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const xPct = Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100));
    const yPct = Math.min(100, Math.max(0, ((e.clientY - rect.top) / rect.height) * 100));
    setSelectedPinId(null);
    setNovoPin({ xPct, yPct });
  };

  if (pranchas.length === 0) {
    return (
      <div>
        <Card theme={theme}>
          <SectionLabel theme={theme}>Vistoria em planta</SectionLabel>
          <div style={{ fontSize: 12, color: theme.subtext, marginBottom: 10 }}>
            Suba uma planta baixa ou foto do pavimento/fachada. Depois é só tocar em qualquer ponto da imagem pra marcar uma pendência.
          </div>
          <input value={novoTitulo} onChange={(e) => setNovoTitulo(e.target.value)} placeholder="Título (ex: Planta baixa térreo, Foto fachada)" style={{ ...inputStyle(theme), width: "100%", marginBottom: 8 }} />
          <ObraFileField theme={theme} file={novoFile} setFile={setNovoFile} label="Escolher imagem da planta/foto" accept="image/*" />
          <button onClick={addPrancha} disabled={!novoFile} style={{ ...primaryBtn(theme), width: "100%", opacity: novoFile ? 1 : 0.5 }}>Adicionar prancha</button>
        </Card>
        <Card theme={theme}><EmptyHint theme={theme} text="Nenhuma prancha/foto cadastrada ainda para vistoria." /></Card>
      </div>
    );
  }

  return (
    <div>
      {pranchas.length > 1 && (
        <div style={{ display: "flex", gap: 6, marginBottom: 10, overflowX: "auto" }}>
          {pranchas.map((p) => (
            <button key={p.id} onClick={() => setSelectedId(p.id)} style={{ flex: "0 0 auto", padding: "7px 12px", borderRadius: 99, border: `1px solid ${theme.border}`, cursor: "pointer", fontSize: 11.5, fontWeight: 700, background: selectedId === p.id ? theme.accent : "transparent", color: selectedId === p.id ? "#04150D" : theme.subtext }}>
              {p.titulo}
            </button>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
        <Card theme={theme} style={{ flex: 1, minWidth: 100, marginBottom: 0 }}><MiniStat theme={theme} label="Pendentes" value={pendCount} color={theme.gold} /></Card>
        <Card theme={theme} style={{ flex: 1, minWidth: 100, marginBottom: 0 }}><MiniStat theme={theme} label="OK" value={okCount} color={theme.accent} /></Card>
        <Card theme={theme} style={{ flex: 1, minWidth: 100, marginBottom: 0 }}><MiniStat theme={theme} label="Atrasados" value={atrasoCount} color={theme.danger} /></Card>
      </div>

      <Card theme={theme} style={{ padding: 8 }}>
        {!imgUrl ? (
          <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: theme.subtext, fontSize: 12 }}>Carregando imagem...</div>
        ) : (
          <div style={{ position: "relative", width: "100%", lineHeight: 0, borderRadius: 8, overflow: "hidden" }}>
            <img src={imgUrl} alt={prancha?.titulo} onClick={onImgClick} style={{ width: "100%", display: "block", cursor: "crosshair" }} draggable={false} />
            {pins.map((p) => (
              <button
                key={p.id}
                onClick={(e) => { e.stopPropagation(); setNovoPin(null); setSelectedPinId(p.id); }}
                className={p.status === "atraso" ? "pin-atraso" : p.status === "pendente" ? "pin-pendente" : ""}
                title={p.item}
                style={{
                  position: "absolute", left: `${p.xPct}%`, top: `${p.yPct}%`, transform: "translate(-50%,-50%)",
                  width: 20, height: 20, borderRadius: "50%", background: pinColor(theme, p.status),
                  border: "2px solid #fff", cursor: "pointer", padding: 0, zIndex: selectedPinId === p.id ? 3 : 2,
                  boxShadow: "0 1px 4px rgba(0,0,0,0.4)",
                }}
              />
            ))}
            {novoPin && (
              <div style={{ position: "absolute", left: `${novoPin.xPct}%`, top: `${novoPin.yPct}%`, transform: "translate(-50%,-50%)", width: 20, height: 20, borderRadius: "50%", background: theme.navy2, border: "2px dashed #fff", zIndex: 4 }} />
            )}
          </div>
        )}
      </Card>
      <div style={{ fontSize: 10.5, color: theme.subtext, margin: "6px 0 14px" }}>Toque em qualquer ponto da imagem para marcar uma pendência. Toque num pin existente para ver/editar.</div>

      {novoPin && (
        <PinForm
          theme={theme}
          title="Nova marcação"
          initial={{ item: "", status: "pendente", observacao: "", responsavel: "", prazo: "" }}
          onCancel={() => setNovoPin(null)}
          onSave={async (vals, file) => {
            const { error } = await store.addPin({ pranchaId: prancha.id, xPct: novoPin.xPct, yPct: novoPin.yPct, ...vals, file });
            if (!error) setNovoPin(null);
          }}
        />
      )}

      {selectedPin && (
        <PinForm
          theme={theme}
          title="Editar marcação"
          initial={{ item: selectedPin.item, status: selectedPin.status, observacao: selectedPin.observacao || "", responsavel: selectedPin.responsavel || "", prazo: selectedPin.prazo || "" }}
          pathFoto={selectedPin.pathFoto}
          onCancel={() => setSelectedPinId(null)}
          onSave={async (vals, file) => {
            await store.updatePin(selectedPin.id, vals);
            if (file) await store.setPinFoto(selectedPin.id, file);
          }}
          onDelete={async () => { await store.deletePin(selectedPin.id); setSelectedPinId(null); }}
        />
      )}

      {showAddPrancha ? (
        <Card theme={theme}>
          <SectionLabel theme={theme}>Nova prancha/foto</SectionLabel>
          <input value={novoTitulo} onChange={(e) => setNovoTitulo(e.target.value)} placeholder="Título (ex: Planta baixa 1º pavimento)" style={{ ...inputStyle(theme), width: "100%", marginBottom: 8 }} />
          <ObraFileField theme={theme} file={novoFile} setFile={setNovoFile} label="Escolher imagem" accept="image/*" />
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={addPrancha} disabled={!novoFile} style={{ ...primaryBtn(theme), flex: 1, opacity: novoFile ? 1 : 0.5 }}>Adicionar</button>
            <button onClick={() => { setShowAddPrancha(false); setNovoFile(null); setNovoTitulo(""); }} style={{ flex: 1, background: theme.surface2, color: theme.text, border: `1px solid ${theme.border}`, borderRadius: 10, fontWeight: 700, cursor: "pointer" }}>Cancelar</button>
          </div>
        </Card>
      ) : (
        <button onClick={() => setShowAddPrancha(true)} style={{ background: "none", border: "none", cursor: "pointer", color: theme.accent, fontSize: 12, textDecoration: "underline", padding: 0 }}>+ adicionar outra prancha/foto (ex: outro pavimento)</button>
      )}
    </div>
  );
}

function PinForm({ theme, title, initial, pathFoto, onCancel, onSave, onDelete }) {
  const [item, setItem] = useState(initial.item);
  const [status, setStatus] = useState(initial.status);
  const [observacao, setObservacao] = useState(initial.observacao);
  const [responsavel, setResponsavel] = useState(initial.responsavel);
  const [prazo, setPrazo] = useState(initial.prazo);
  const [file, setFile] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const save = async () => {
    if (!item.trim()) return;
    await onSave({ item: item.trim(), status, observacao: observacao.trim(), responsavel: responsavel.trim(), prazo: prazo || null }, file);
  };

  return (
    <Card theme={theme} style={{ borderLeft: `3px solid ${pinColor(theme, status)}` }}>
      <SectionLabel theme={theme}>{title}</SectionLabel>
      <input value={item} onChange={(e) => setItem(e.target.value)} placeholder="Item (ex: Fissura na parede, Piso solto...)" style={{ ...inputStyle(theme), width: "100%", marginBottom: 8 }} />
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ ...inputStyle(theme), flex: 1 }}>
          <option value="pendente">Pendente</option>
          <option value="ok">OK</option>
          <option value="atraso">Atrasado</option>
        </select>
        <input type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} style={{ ...inputStyle(theme), flex: 1 }} />
      </div>
      <input value={responsavel} onChange={(e) => setResponsavel(e.target.value)} placeholder="Responsável" style={{ ...inputStyle(theme), width: "100%", marginBottom: 8 }} />
      <textarea value={observacao} onChange={(e) => setObservacao(e.target.value)} placeholder="Observação" rows={2} style={{ ...inputStyle(theme), width: "100%", marginBottom: 8, resize: "vertical" }} />
      {pathFoto && <div style={{ marginBottom: 8 }}><ObraFileLink theme={theme} path={pathFoto} label="ver foto atual" /></div>}
      <ObraFileField theme={theme} file={file} setFile={setFile} label={pathFoto ? "Trocar foto (opcional)" : "Anexar foto (opcional)"} accept="image/*" />
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={save} style={{ ...primaryBtn(theme), flex: 1 }}>Salvar</button>
        <button onClick={onCancel} style={{ flex: 1, background: theme.surface2, color: theme.text, border: `1px solid ${theme.border}`, borderRadius: 10, fontWeight: 700, cursor: "pointer" }}>Fechar</button>
      </div>
      {onDelete && (
        !confirmDelete ? (
          <button onClick={() => setConfirmDelete(true)} style={{ background: "none", border: "none", cursor: "pointer", color: theme.danger, fontSize: 11, textDecoration: "underline", padding: 0, marginTop: 10 }}>excluir marcação</button>
        ) : (
          <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontSize: 11, color: theme.danger }}>Excluir esta marcação?</span>
            <button onClick={onDelete} style={{ background: "none", border: "none", cursor: "pointer", color: theme.danger, fontSize: 11, fontWeight: 700 }}>Sim</button>
            <button onClick={() => setConfirmDelete(false)} style={{ background: "none", border: "none", cursor: "pointer", color: theme.subtext, fontSize: 11 }}>Cancelar</button>
          </div>
        )
      )}
    </Card>
  );
}

function VistoriaItemRow({ v, store, theme }) {
  return (
    <Card theme={theme} style={{ marginBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700 }}>{v.item}</div>
          <div style={{ fontSize: 11, color: theme.subtext }}>{v.data}{v.responsavel ? ` · ${v.responsavel}` : ""}{v.prazo ? ` · prazo ${v.prazo}` : ""}</div>
          {v.observacao && <div style={{ fontSize: 12, marginTop: 4 }}>{v.observacao}</div>}
        </div>
        <StatusPill theme={theme} tone={VISTORIA_STATUS[v.status].tone}>{VISTORIA_STATUS[v.status].l}</StatusPill>
      </div>
      <div style={{ display: "flex", gap: 12, marginTop: 8, paddingTop: 8, borderTop: `1px solid ${theme.border}` }}>
        {v.pathFoto && <ObraFileLink theme={theme} path={v.pathFoto} label="ver foto" />}
        {v.status !== "ok" && <button onClick={() => store.updateVistoriaItem(v.id, { status: "ok" })} style={{ background: "none", border: "none", cursor: "pointer", color: theme.accent, fontSize: 11, textDecoration: "underline" }}>marcar OK</button>}
        {v.status !== "atraso" && <button onClick={() => store.updateVistoriaItem(v.id, { status: "atraso" })} style={{ background: "none", border: "none", cursor: "pointer", color: theme.danger, fontSize: 11, textDecoration: "underline" }}>marcar atrasado</button>}
        <button onClick={() => store.deleteVistoriaItem(v.id)} style={{ background: "none", border: "none", cursor: "pointer", color: theme.subtext, fontSize: 11, textDecoration: "underline" }}>excluir</button>
      </div>
    </Card>
  );
}

function ObraEtapas({ store, projectId, theme }) {
  const [novaEtapa, setNovaEtapa] = useState("");
  const etapas = store.data.etapas.filter((e) => e.projectId === projectId).sort((a, b) => a.ordem - b.ordem);
  const concluidas = etapas.filter((e) => e.status === "concluida").length;
  const pct = etapas.length ? Math.round((concluidas / etapas.length) * 100) : 0;

  const addPadrao = async () => {
    for (const nome of ETAPAS_SUGERIDAS) {
      if (!etapas.some((e) => e.nome === nome)) {
        // eslint-disable-next-line no-await-in-loop
        await store.addEtapa({ projectId, nome });
      }
    }
  };
  const addCustom = async () => {
    if (!novaEtapa.trim()) return;
    await store.addEtapa({ projectId, nome: novaEtapa.trim() });
    setNovaEtapa("");
  };
  const toggle = (e) => store.updateEtapa(e.id, { status: ETAPA_STATUS_CYCLE[e.status], dataConclusao: ETAPA_STATUS_CYCLE[e.status] === "concluida" ? todayISO() : null });

  return (
    <div>
      <Card theme={theme}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <div style={{ fontSize: 13, fontWeight: 700 }}>Avanço físico da obra</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: theme.accent }}>{pct}%</div>
        </div>
        <div style={{ height: 10, background: theme.surface2, borderRadius: 99, overflow: "hidden", display: "flex" }}>
          {etapas.map((e) => (
            <div key={e.id} style={{ flex: 1, background: e.status === "concluida" ? theme.accent : e.status === "andamento" ? theme.gold : "transparent", borderRight: `1px solid ${theme.bg}` }} />
          ))}
        </div>
        <div style={{ fontSize: 11, color: theme.subtext, marginTop: 6 }}>Toque em uma etapa para avançar: pendente → em andamento → concluída (fica verde).</div>
      </Card>

      {etapas.length === 0 && (
        <Card theme={theme}>
          <EmptyHint theme={theme} text="Nenhuma etapa cadastrada ainda para esta obra." />
          <button onClick={addPadrao} style={{ ...primaryBtn(theme), width: "100%" }}>Usar etapas padrão (limpeza, fundação, paredes, reboco, revestimento...)</button>
        </Card>
      )}

      {etapas.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          {etapas.map((e, i) => {
            const color = e.status === "concluida" ? theme.accent : e.status === "andamento" ? theme.gold : theme.subtext;
            const bg = e.status === "concluida" ? theme.accentSoft : "transparent";
            return (
              <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 4px", borderBottom: i < etapas.length - 1 ? `1px solid ${theme.border}` : "none" }}>
                <button onClick={() => toggle(e)} title="Avançar status" style={{ width: 28, height: 28, borderRadius: "50%", border: `2px solid ${color}`, background: bg, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {e.status === "concluida" && <CheckCircle2 size={16} color={theme.accent} />}
                </button>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: e.status === "concluida" ? theme.accent : theme.text }}>{e.nome}</div>
                  <div style={{ fontSize: 10.5, color: theme.subtext }}>{ETAPA_STATUS_LABEL[e.status]}{e.dataConclusao ? ` · concluída em ${e.dataConclusao}` : ""}</div>
                </div>
                {e.fotoPath && <EtapaFotoThumb path={e.fotoPath} theme={theme} />}
                <EtapaFotoBtn theme={theme} hasFoto={!!e.fotoPath} onPick={(f) => store.setEtapaFoto(e.id, f)} />
                <button onClick={() => store.deleteEtapa(e.id)} style={{ background: "none", border: "none", cursor: "pointer", color: theme.danger }}><Trash2 size={14} /></button>
              </div>
            );
          })}
        </div>
      )}

      <Card theme={theme}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Adicionar etapa</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <input value={novaEtapa} onChange={(e) => setNovaEtapa(e.target.value)} placeholder="Nome da etapa (ex: Impermeabilização da laje)" style={{ ...inputStyle(theme), flex: 1 }} />
          <button onClick={addCustom} style={primaryBtn(theme)}>Adicionar</button>
        </div>
        {etapas.length > 0 && <button onClick={addPadrao} style={{ background: "none", border: "none", cursor: "pointer", color: theme.accent, fontSize: 12, textDecoration: "underline", padding: 0 }}>completar com as etapas padrão que faltam</button>}
      </Card>
    </div>
  );
}

/* Avanço físico por unidade (casa/apto) — mesmo padrão do avanço da obra,
   só que aplicado a cada unidade individualmente. Usado dentro do UnitRow. */
function UnidadeEtapas({ store, unitId, theme }) {
  const [novaEtapa, setNovaEtapa] = useState("");
  const etapas = store.data.unidadeEtapas.filter((e) => e.unitId === unitId).sort((a, b) => a.ordem - b.ordem);
  const concluidas = etapas.filter((e) => e.status === "concluida").length;
  const pct = etapas.length ? Math.round((concluidas / etapas.length) * 100) : 0;

  const addPadrao = async () => {
    for (const nome of ETAPAS_SUGERIDAS) {
      if (!etapas.some((e) => e.nome === nome)) {
        // eslint-disable-next-line no-await-in-loop
        await store.addEtapaUnidade({ unitId, nome });
      }
    }
  };
  const addCustom = async () => {
    if (!novaEtapa.trim()) return;
    await store.addEtapaUnidade({ unitId, nome: novaEtapa.trim() });
    setNovaEtapa("");
  };
  const toggle = (e) => store.updateEtapaUnidade(e.id, { status: ETAPA_STATUS_CYCLE[e.status], dataConclusao: ETAPA_STATUS_CYCLE[e.status] === "concluida" ? todayISO() : null });

  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: theme.subtext }}>Avanço da unidade</div>
        <div style={{ fontSize: 12, fontWeight: 700, color: theme.accent }}>{pct}%</div>
      </div>
      <div style={{ height: 8, background: theme.surface2, borderRadius: 99, overflow: "hidden", display: "flex", marginBottom: 8 }}>
        {etapas.map((e) => (
          <div key={e.id} style={{ flex: 1, background: e.status === "concluida" ? theme.accent : e.status === "andamento" ? theme.gold : "transparent", borderRight: `1px solid ${theme.bg}` }} />
        ))}
      </div>

      {etapas.length === 0 ? (
        <button onClick={addPadrao} style={{ background: theme.accentSoft, color: theme.accent, border: "none", borderRadius: 8, padding: "6px 12px", fontWeight: 700, cursor: "pointer", fontSize: 11.5 }}>Usar etapas padrão</button>
      ) : (
        <div style={{ marginBottom: 8 }}>
          {etapas.map((e, i) => {
            const color = e.status === "concluida" ? theme.accent : e.status === "andamento" ? theme.gold : theme.subtext;
            const bg = e.status === "concluida" ? theme.accentSoft : "transparent";
            return (
              <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", borderBottom: i < etapas.length - 1 ? `1px solid ${theme.border}` : "none" }}>
                <button onClick={() => toggle(e)} title="Avançar status" style={{ width: 20, height: 20, borderRadius: "50%", border: `2px solid ${color}`, background: bg, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {e.status === "concluida" && <CheckCircle2 size={12} color={theme.accent} />}
                </button>
                <div style={{ flex: 1, fontSize: 11.5, fontWeight: 600, color: e.status === "concluida" ? theme.accent : theme.text }}>{e.nome}</div>
                {e.fotoPath && <EtapaFotoThumb path={e.fotoPath} theme={theme} size={30} />}
                <EtapaFotoBtn theme={theme} hasFoto={!!e.fotoPath} onPick={(f) => store.setEtapaUnidadeFoto(e.id, f)} />
                <button onClick={() => store.deleteEtapaUnidade(e.id)} style={{ background: "none", border: "none", cursor: "pointer", color: theme.danger }}><Trash2 size={12} /></button>
              </div>
            );
          })}
        </div>
      )}
      <div style={{ display: "flex", gap: 6 }}>
        <input value={novaEtapa} onChange={(e) => setNovaEtapa(e.target.value)} placeholder="Nova etapa da unidade" style={{ ...inputStyle(theme), flex: 1, fontSize: 12, padding: "6px 10px" }} />
        <button onClick={addCustom} style={{ ...primaryBtn(theme), fontSize: 11.5, padding: "6px 10px" }}>+</button>
      </div>
      {etapas.length > 0 && <button onClick={addPadrao} style={{ background: "none", border: "none", cursor: "pointer", color: theme.accent, fontSize: 10.5, textDecoration: "underline", padding: 0, marginTop: 6 }}>completar com etapas padrão que faltam</button>}
    </div>
  );
}

function ObraKPIs({ store, project, t, theme }) {
  const nc = store.data.naoConformidades.filter((n) => n.projectId === project.id);
  const ncAbertas = nc.filter((n) => n.status !== "resolvida").length;
  const req = store.data.requisitos.filter((r) => r.projectId === project.id);
  const reqConcluidos = req.filter((r) => r.status === "concluido" || r.status === "nao_aplicavel").length;
  const reqPct = req.length ? Math.round((reqConcluidos / req.length) * 100) : 0;
  const docs = store.data.documentos.filter((d) => d.projectId === project.id).length;
  const fotos = store.data.fotos.filter((f) => f.projectId === project.id).length;
  const etapas = store.data.etapas.filter((e) => e.projectId === project.id);
  const etapasConcluidas = etapas.filter((e) => e.status === "concluida").length;
  const etapasPct = etapas.length ? Math.round((etapasConcluidas / etapas.length) * 100) : null;
  const margemPct = t.estimatedRevenue > 0 ? Math.round((t.estimatedProfit / t.estimatedRevenue) * 100) : 0;
  const desvioPct = t.totalEstimatedCost > 0 ? Math.round(((t.totalActualCost - t.totalEstimatedCost) / t.totalEstimatedCost) * 100) : 0;

  const atividades = store.data.cronograma.filter((a) => a.projectId === project.id);
  const totalDuracao = atividades.reduce((s, a) => s + a.duracaoDias, 0);
  const avancoCronograma = totalDuracao ? Math.round(atividades.reduce((s, a) => s + a.avancoPct * a.duracaoDias, 0) / totalDuracao) : null;
  const atividadesAtrasadas = atividades.filter((a) => a.avancoPct < 100 && todayISO() > addDaysISO(a.dataInicio, a.duracaoDias)).length;
  const vistoria = store.data.vistoria.filter((v) => v.projectId === project.id);
  const pranchaIds = store.data.pranchas.filter((p) => p.projectId === project.id).map((p) => p.id);
  const pins = store.data.pins.filter((p) => pranchaIds.includes(p.pranchaId));
  // KPI de vistoria combina os apontamentos antigos (por ambiente) com os
  // novos pins em planta, pra não perder histórico de obras que já usavam a lista.
  const vistoriaTotal = vistoria.length + pins.length;
  const vistoriaOk = vistoria.filter((v) => v.status === "ok").length + pins.filter((p) => p.status === "ok").length;
  const vistoriaAtraso = vistoria.filter((v) => v.status === "atraso").length + pins.filter((p) => p.status === "atraso").length;
  const vistoriaPct = vistoriaTotal ? Math.round((vistoriaOk / vistoriaTotal) * 100) : null;

  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, color: theme.subtext, marginBottom: 8 }}>Financeiro</div>
      <div style={{ display: "flex", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
        <Card theme={theme} style={{ flex: 1, minWidth: 140, marginBottom: 0 }}><MiniStat theme={theme} label="Custo previsto" value={fmtBRL(t.totalEstimatedCost)} /></Card>
        <Card theme={theme} style={{ flex: 1, minWidth: 140, marginBottom: 0 }}><MiniStat theme={theme} label="Custo real" value={fmtBRL(t.totalActualCost)} color={t.variance < 0 ? theme.danger : theme.accent} /></Card>
        <Card theme={theme} style={{ flex: 1, minWidth: 140, marginBottom: 0 }}><MiniStat theme={theme} label="Desvio orçamentário" value={`${desvioPct > 0 ? "+" : ""}${desvioPct}%`} color={desvioPct > 5 ? theme.danger : theme.accent} /></Card>
        <Card theme={theme} style={{ flex: 1, minWidth: 140, marginBottom: 0 }}><MiniStat theme={theme} label="Margem estimada" value={`${margemPct}%`} color={theme.gold} /></Card>
        <Card theme={theme} style={{ flex: 1, minWidth: 140, marginBottom: 0 }}><MiniStat theme={theme} label="Lucro estimado" value={fmtBRL(t.estimatedProfit)} color={theme.gold} /></Card>
        <Card theme={theme} style={{ flex: 1, minWidth: 140, marginBottom: 0 }}><MiniStat theme={theme} label="Capital de investidores" value={fmtBRL(t.totalInvested)} /></Card>
      </div>

      <div style={{ fontSize: 12, fontWeight: 700, color: theme.subtext, marginBottom: 8 }}>Execução</div>
      <Card theme={theme}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <div style={{ fontSize: 13, fontWeight: 700 }}>Percentual executado (manual)</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: theme.accent }}>{project.progressoPct || 0}%</div>
        </div>
        <div style={{ height: 8, background: theme.surface2, borderRadius: 99, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${project.progressoPct || 0}%`, background: theme.accent }} />
        </div>
        {etapasPct !== null && <>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14, marginBottom: 6 }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>Avanço por etapas ({etapasConcluidas}/{etapas.length})</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: theme.gold }}>{etapasPct}%</div>
          </div>
          <div style={{ height: 8, background: theme.surface2, borderRadius: 99, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${etapasPct}%`, background: theme.gold }} />
          </div>
        </>}
      </Card>
      <div style={{ display: "flex", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
        <Card theme={theme} style={{ flex: 1, minWidth: 140, marginBottom: 0 }}><MiniStat theme={theme} label="Documentos arquivados" value={docs} /></Card>
        <Card theme={theme} style={{ flex: 1, minWidth: 140, marginBottom: 0 }}><MiniStat theme={theme} label="Fotos de evolução" value={fotos} /></Card>
      </div>

      <div style={{ fontSize: 12, fontWeight: 700, color: theme.subtext, marginBottom: 8 }}>Cronograma e vistoria</div>
      <div style={{ display: "flex", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
        <Card theme={theme} style={{ flex: 1, minWidth: 140, marginBottom: 0 }}><MiniStat theme={theme} label="Avanço do cronograma" value={avancoCronograma !== null ? `${avancoCronograma}%` : "—"} color={theme.accent} /></Card>
        <Card theme={theme} style={{ flex: 1, minWidth: 140, marginBottom: 0 }}><MiniStat theme={theme} label="Atividades atrasadas" value={atividadesAtrasadas} color={atividadesAtrasadas > 0 ? theme.danger : theme.accent} /></Card>
        <Card theme={theme} style={{ flex: 1, minWidth: 140, marginBottom: 0 }}><MiniStat theme={theme} label="Vistoria conforme" value={vistoriaPct !== null ? `${vistoriaPct}%` : "—"} color={theme.gold} /></Card>
        <Card theme={theme} style={{ flex: 1, minWidth: 140, marginBottom: 0 }}><MiniStat theme={theme} label="Apontamentos atrasados" value={vistoriaAtraso} color={vistoriaAtraso > 0 ? theme.danger : theme.accent} /></Card>
      </div>

      <div style={{ fontSize: 12, fontWeight: 700, color: theme.subtext, marginBottom: 8 }}>Conformidade</div>
      <div style={{ display: "flex", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
        <Card theme={theme} style={{ flex: 1, minWidth: 140, marginBottom: 0 }}><MiniStat theme={theme} label="Não conformidades em aberto" value={ncAbertas} color={ncAbertas > 0 ? theme.danger : theme.accent} /></Card>
        <Card theme={theme} style={{ flex: 1, minWidth: 140, marginBottom: 0 }}><MiniStat theme={theme} label="Checklist regulatório" value={`${reqPct}%`} color={reqPct === 100 ? theme.accent : theme.gold} /></Card>
      </div>
      <div style={{ fontSize: 11, color: theme.subtext }}>Município: {project.municipio || "—"} · Financiamento: {project.financiamento || "—"}</div>
    </div>
  );
}

function VisaoGeral({ store, theme }) {
  const projects = store.data.projects;
  const totals = projects.map((p) => ({ project: p, name: p.name, ...projectTotals(store.data, p.id) }));
  const grandEstCost = totals.reduce((s, t) => s + t.totalEstimatedCost, 0);
  const grandRealCost = totals.reduce((s, t) => s + t.totalActualCost, 0);
  const grandProfit = totals.reduce((s, t) => s + t.estimatedProfit, 0);
  const grandRealProfit = totals.reduce((s, t) => s + t.realProfitSoFar, 0);
  const grandInvested = totals.reduce((s, t) => s + t.totalInvested, 0);
  const grandContratado = totals.reduce((s, t) => s + t.estimatedRevenue, 0);
  const grandRecebido = totals.reduce((s, t) => s + t.realRevenue, 0);
  const chartData = totals.map((t) => ({ obra: t.name, Previsto: t.totalEstimatedCost, Real: t.totalActualCost }));

  const emAndamento = projects.filter((p) => p.status === "em_andamento").length;
  const concluidas = projects.filter((p) => p.status === "concluida").length;
  const planejamento = projects.filter((p) => p.status === "planejamento").length;

  const ncAbertasTotal = store.data.naoConformidades.filter((n) => n.status !== "resolvida").length;
  const obrasComNc = totals.filter((t) => store.data.naoConformidades.some((n) => n.projectId === t.project.id && n.status !== "resolvida"));

  const rankLucro = [...totals].sort((a, b) => b.estimatedProfit - a.estimatedProfit).slice(0, 5);
  const rankDesvio = [...totals]
    .map((t) => ({ ...t, desvioPct: t.totalEstimatedCost > 0 ? ((t.totalActualCost - t.totalEstimatedCost) / t.totalEstimatedCost) * 100 : 0 }))
    .sort((a, b) => b.desvioPct - a.desvioPct)
    .filter((t) => t.totalActualCost > 0)
    .slice(0, 5);

  const evolChartData = useMemo(() => {
    const byMonth = {};
    store.data.actualCosts.forEach((a) => {
      const mk = (a.date || "").slice(0, 7);
      if (!mk) return;
      byMonth[mk] = (byMonth[mk] || 0) + a.value;
    });
    return Object.entries(byMonth).sort(([a], [b]) => a.localeCompare(b)).slice(-12).map(([mes, valor]) => ({ mes, "Custo real": valor }));
  }, [store.data.actualCosts]);

  return (
    <div>
      <div style={{ fontFamily: FONT_DISPLAY, fontSize: 19, fontWeight: 700, marginBottom: 4 }}>Relatório de desempenho das obras</div>
      <div style={{ fontSize: 12, color: theme.subtext, marginBottom: 14 }}>Visão consolidada de todas as obras cadastradas.</div>

      <div style={{ display: "flex", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
        <Card theme={theme} style={{ flex: 1, minWidth: 130, marginBottom: 0 }}><MiniStat theme={theme} label="Obras em andamento" value={emAndamento} /></Card>
        <Card theme={theme} style={{ flex: 1, minWidth: 130, marginBottom: 0 }}><MiniStat theme={theme} label="Obras concluídas" value={concluidas} color={theme.accent} /></Card>
        <Card theme={theme} style={{ flex: 1, minWidth: 130, marginBottom: 0 }}><MiniStat theme={theme} label="Em planejamento" value={planejamento} /></Card>
        <Card theme={theme} style={{ flex: 1, minWidth: 130, marginBottom: 0 }}><MiniStat theme={theme} label="Não conformidades abertas" value={ncAbertasTotal} color={ncAbertasTotal > 0 ? theme.danger : theme.accent} /></Card>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
        <Card theme={theme} style={{ flex: 1, minWidth: 140, marginBottom: 0 }}><MiniStat theme={theme} label="Valor contratado" value={fmtBRL(grandContratado)} /></Card>
        <Card theme={theme} style={{ flex: 1, minWidth: 140, marginBottom: 0 }}><MiniStat theme={theme} label="Valor recebido" value={fmtBRL(grandRecebido)} /></Card>
        <Card theme={theme} style={{ flex: 1, minWidth: 140, marginBottom: 0 }}><MiniStat theme={theme} label="Custo previsto total" value={fmtBRL(grandEstCost)} /></Card>
        <Card theme={theme} style={{ flex: 1, minWidth: 140, marginBottom: 0 }}><MiniStat theme={theme} label="Custo real total" value={fmtBRL(grandRealCost)} color={grandRealCost > grandEstCost ? theme.danger : theme.accent} /></Card>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
        <Card theme={theme} style={{ flex: 1, minWidth: 140, marginBottom: 0 }}><MiniStat theme={theme} label="Lucro previsto (todas obras)" value={fmtBRL(grandProfit)} color={theme.gold} /></Card>
        <Card theme={theme} style={{ flex: 1, minWidth: 140, marginBottom: 0 }}><MiniStat theme={theme} label="Lucro realizado até agora" value={fmtBRL(grandRealProfit)} color={theme.gold} /></Card>
        <Card theme={theme} style={{ flex: 1, minWidth: 140, marginBottom: 0 }}><MiniStat theme={theme} label="Capital de investidores" value={fmtBRL(grandInvested)} /></Card>
      </div>

      {chartData.length > 0 && (
        <Card theme={theme}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Previsto x Real por obra</div>
          <div style={{ height: 200 }}>
            <ResponsiveContainer><BarChart data={chartData}>
              <CartesianGrid stroke={theme.border} strokeDasharray="3 3" />
              <XAxis dataKey="obra" tick={{ fill: theme.subtext, fontSize: 10 }} />
              <YAxis tick={{ fill: theme.subtext, fontSize: 10 }} width={44} />
              <Tooltip contentStyle={{ background: theme.surface2, border: `1px solid ${theme.border}`, fontSize: 12 }} formatter={(v) => fmtBRL(v)} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Previsto" fill={theme.gold} radius={[4, 4, 0, 0]} />
              <Bar dataKey="Real" fill={theme.danger} radius={[4, 4, 0, 0]} />
            </BarChart></ResponsiveContainer>
          </div>
        </Card>
      )}

      {evolChartData.length > 1 && (
        <Card theme={theme}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Evolução do custo real (últimos meses, todas as obras)</div>
          <div style={{ height: 180 }}>
            <ResponsiveContainer><LineChart data={evolChartData}>
              <CartesianGrid stroke={theme.border} strokeDasharray="3 3" />
              <XAxis dataKey="mes" tick={{ fill: theme.subtext, fontSize: 10 }} />
              <YAxis tick={{ fill: theme.subtext, fontSize: 10 }} width={44} />
              <Tooltip contentStyle={{ background: theme.surface2, border: `1px solid ${theme.border}`, fontSize: 12 }} formatter={(v) => fmtBRL(v)} />
              <Line type="monotone" dataKey="Custo real" stroke={theme.gold} strokeWidth={2} dot={{ r: 3 }} />
            </LineChart></ResponsiveContainer>
          </div>
        </Card>
      )}

      <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
        <Card theme={theme} style={{ flex: 1, minWidth: 260 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>🏆 Ranking — obras mais lucrativas</div>
          {rankLucro.length === 0 && <EmptyHint theme={theme} text="Sem dados suficientes ainda." />}
          {rankLucro.map((t, i) => (
            <div key={t.project.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: i < rankLucro.length - 1 ? `1px solid ${theme.border}` : "none" }}>
              <span style={{ fontSize: 12.5 }}>{i + 1}. {t.name}</span>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: theme.gold, fontFamily: FONT_MONO }}>{fmtBRL(t.estimatedProfit)}</span>
            </div>
          ))}
        </Card>
        <Card theme={theme} style={{ flex: 1, minWidth: 260 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>⚠️ Ranking — maior desvio financeiro</div>
          {rankDesvio.length === 0 && <EmptyHint theme={theme} text="Sem custos reais lançados ainda." />}
          {rankDesvio.map((t, i) => (
            <div key={t.project.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: i < rankDesvio.length - 1 ? `1px solid ${theme.border}` : "none" }}>
              <span style={{ fontSize: 12.5 }}>{i + 1}. {t.name}</span>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: t.desvioPct > 0 ? theme.danger : theme.accent, fontFamily: FONT_MONO }}>{t.desvioPct > 0 ? "+" : ""}{t.desvioPct.toFixed(1)}%</span>
            </div>
          ))}
        </Card>
      </div>

      {obrasComNc.length > 0 && (
        <Card theme={theme} style={{ borderLeft: `3px solid ${theme.danger}` }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}><AlertTriangle size={15} color={theme.danger} /> Alertas — obras com não conformidade em aberto</div>
          {obrasComNc.map((t) => (
            <div key={t.project.id} style={{ fontSize: 12.5, padding: "4px 0" }}>{t.name} — {store.data.naoConformidades.filter((n) => n.projectId === t.project.id && n.status !== "resolvida").length} pendente(s)</div>
          ))}
        </Card>
      )}

      {projects.length === 0 && <Card theme={theme}><EmptyHint theme={theme} text="Cadastre uma obra na aba Obras para ver os números aqui." /></Card>}
    </div>
  );
}

const CONSTRUTORA_NAV = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "obras", label: "Obras", icon: HardHat },
];

function ConstrutoraApp({ theme, dark, setDark, session, isDesktop }) {
  const [tab, setTab] = useState("dashboard");
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const store = useConstrutoraStore(session.user.id);

  return (
    <AppShell theme={theme} dark={dark} setDark={setDark} email={session.user.email} onLogout={() => supabase.auth.signOut()} isDesktop={isDesktop} navItems={CONSTRUTORA_NAV} tab={tab} setTab={(k) => { setTab(k); setSelectedProjectId(null); }} sidebarTitle="Pascaretta Construtora">
      {store.loading ? <Loading theme={theme} /> : (
        <>
          {tab === "dashboard" && <VisaoGeral store={store} theme={theme} />}
          {tab === "obras" && (
            selectedProjectId
              ? <ObraDetail store={store} projectId={selectedProjectId} theme={theme} onBack={() => setSelectedProjectId(null)} />
              : <ObrasList store={store} theme={theme} onOpen={setSelectedProjectId} />
          )}
        </>
      )}
    </AppShell>
  );
}


/* ================= ROOT APP ================= */

export default function App() {
  const [dark, setDark] = useState(false);
  const [session, setSession] = useState(null);
  const [booting, setBooting] = useState(true);
  const [toast, setToast] = useState(null);
  const [recoveryMode, setRecoveryMode] = useState(false);
  const isDesktop = useIsDesktop();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setBooting(false); });
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (event === "PASSWORD_RECOVERY") setRecoveryMode(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const showToast = useCallback((msg, kind = "ok") => { setToast({ msg, kind }); setTimeout(() => setToast(null), 2600); }, []);

  const theme = dark ? THEME.dark : THEME.light;

  let content = null;
  if (!booting) {
    if (recoveryMode) content = <ResetPasswordScreen theme={theme} showToast={showToast} onDone={() => setRecoveryMode(false)} />;
    else if (!session) content = <AuthScreen theme={theme} showToast={showToast} />;
    else content = <ConstrutoraApp theme={theme} dark={dark} setDark={setDark} session={session} isDesktop={isDesktop} showToast={showToast} />;
  }

  return (
    <div style={{ ...styles.shell, background: theme.bg, color: theme.text, maxWidth: !session ? 420 : (isDesktop ? 1280 : 480) }}>
      {content}
      {toast && <Toast toast={toast} theme={theme} />}
    </div>
  );
}
