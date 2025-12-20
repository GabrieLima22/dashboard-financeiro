import React, { useMemo, useState, useEffect } from "react";
import {
  LogOut,
  ChevronRight,
  ChevronLeft,
  Edit3,
  Save,
  Eye,
  EyeOff,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  XCircle,
  Loader2
} from "lucide-react";

/**
 * =========================================
 * CONFIG & TYPES
 * =========================================
 */
const CATEGORY_PRESET = [
  { code: "IC", label: "IC" },
  { code: "ABERTO", label: "ABERTO" },
  { code: "FIXO", label: "FIXO" },
  { code: "EAD", label: "EAD" },
  { code: "PROJETOS", label: "PROJETOS CORP." },
  { code: "OUTROS", label: "OUTROS" },
  { code: "INVEST", label: "INVESTIMENTOS" },
] as const;

const MONTHS_PT = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
] as const;

type Role = "admin" | "user";

type CategoryLine = {
  code: string;
  label: string;
  revenue: number;
  revenueNote: string;
  expense: number;
  expenseNote: string;
  targetRevenue?: number;
};

type MonthData = {
  id: number;
  name: string;
  categories: CategoryLine[];
};

type DataStore = Record<number, MonthData[]>;

type ApiYearResponse = {
  months: MonthData[];
};

/**
 * =========================================
 * HELPERS
 * =========================================
 */
const API_BASE = import.meta.env.VITE_API_BASE || "/backend/api.php";

const apiUrl = (endpoint: string, params?: Record<string, string | number>) => {
  const search = new URLSearchParams({ endpoint });
  if (params) {
    Object.entries(params).forEach(([key, value]) => search.set(key, String(value)));
  }
  return `${API_BASE}?${search.toString()}`;
};

const apiRequest = async <T,>(endpoint: string, options?: RequestInit & { params?: Record<string, string | number> }) => {
  const res = await fetch(apiUrl(endpoint, options?.params), {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Erro na API (${res.status})`);
  }
  return res.json() as Promise<T>;
};

const money = (value: number) =>
  (value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const createMonthTemplate = (monthId: number): MonthData => ({
  id: monthId,
  name: MONTHS_PT[monthId - 1],
  categories: CATEGORY_PRESET.map((c) => ({
    code: c.code,
    label: c.label,
    revenue: 0,
    expense: 0,
    revenueNote: "",
    expenseNote: "",
    targetRevenue: 0,
  })),
});

const createYearTemplate = (year: number): MonthData[] => {
  const months: MonthData[] = [];
  for (let m = 1; m <= 12; m++) months.push(createMonthTemplate(m));
  return months;
};

/**
 * =========================================
 * UI COMPONENTS
 * =========================================
 */

const Card = ({ children, className = "", style = {} }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) => (
  <div 
    style={style}
    className={`bg-white/[0.07] backdrop-blur-xl border border-white/10 rounded-[2rem] p-6 transition-all duration-500 hover:bg-white/[0.12] hover:shadow-[0_20px_50px_rgba(79,70,229,0.15)] ${className}`}
  >
    {children}
  </div>
);

const Button = ({
  children,
  onClick,
  variant = "primary",
  className = "",
  icon: Icon,
  disabled = false,
  style = {}
}: {
  children?: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "danger" | "success";
  className?: string;
  icon?: any;
  disabled?: boolean;
  style?: React.CSSProperties;
}) => {
  const variants: Record<string, string> = {
    primary: "bg-gradient-to-br from-indigo-500 via-purple-600 to-fuchsia-600 hover:brightness-110 text-white shadow-lg shadow-indigo-500/25",
    secondary: "bg-white/5 hover:bg-white/10 text-white border border-white/10 backdrop-blur-sm",
    danger: "bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/20",
    success: "bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/20",
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={style}
      className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl font-bold transition-all active:scale-95 disabled:opacity-40 tracking-tight ${variants[variant]} ${className}`}
    >
      {Icon && <Icon size={18} />}
      {children}
    </button>
  );
};

const CircularProgress = ({ value, size = 64, strokeWidth = 5, color = "indigo" }: { value: number, size?: number, strokeWidth?: number, color?: string }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (Math.min(Math.max(value, 0), 1)) * circumference;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="rotate-[-90deg]">
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke="currentColor" strokeWidth={strokeWidth} fill="transparent"
          className="text-white/5"
        />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke="currentColor" strokeWidth={strokeWidth} fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={`transition-all duration-1000 ${color === 'indigo' ? 'text-indigo-400' : 'text-emerald-400'}`}
        />
      </svg>
      <div className="absolute text-[10px] font-black text-white/80">
        {Math.round(value * 100)}%
      </div>
    </div>
  );
};

type LoginViewProps = {
  loginStep: "idle" | "verifying" | "success" | "error";
  loginUser: string;
  loginPass: string;
  setLoginUser: (value: string) => void;
  setLoginPass: (value: string) => void;
  handleLogin: () => void;
};

const LoginView = ({
  loginStep,
  loginUser,
  loginPass,
  setLoginUser,
  setLoginPass,
  handleLogin,
}: LoginViewProps) => (
  <div className="min-h-screen flex items-center justify-center p-6 overflow-hidden">
    <div className={`w-full max-w-md space-y-10 transition-all duration-700 ${loginStep !== "idle" ? "scale-95 opacity-0 blur-lg" : "scale-100 opacity-100 blur-0"}`}>
      <div className="text-center animate-in fade-in slide-in-from-top-12 duration-1000 ease-out">
        <div className="relative inline-block group">
          <div className="absolute -inset-4 bg-indigo-500/20 rounded-full blur-2xl animate-pulse group-hover:bg-indigo-500/40 transition-all duration-1000"></div>
          <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 via-purple-600 to-fuchsia-600 rounded-3xl blur opacity-30 group-hover:opacity-60 transition duration-1000 animate-tilt"></div>
          <div className="relative w-28 h-28 bg-[#0a0c10] rounded-3xl flex items-center justify-center shadow-2xl mb-8 border border-white/10 transform transition-all duration-700 hover:scale-110 hover:-rotate-3">
            <span className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white via-white to-indigo-400 tracking-tighter">JML</span>
            <div className="absolute bottom-3 right-3 w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.8)] animate-pulse"></div>
          </div>
        </div>
        
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300 fill-mode-both">
          <h1 className="text-6xl font-black text-white tracking-tighter mb-2 italic">JML Financeiro</h1>
          <p className="text-indigo-300/40 font-bold uppercase tracking-[0.4em] text-[10px]">Portal de Inteligência de Dados</p>
        </div>
      </div>

      <Card className="p-10 space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-500 fill-mode-both relative overflow-hidden">
        <div className="absolute -inset-full top-0 h-full w-1/2 bg-gradient-to-r from-transparent via-white/[0.03] to-transparent -skew-x-12 animate-shimmer pointer-events-none"></div>
        <div className="space-y-5 relative z-10">
          <label className="block">
            <span className="block mb-2 text-[10px] font-black text-white/40 uppercase tracking-[0.3em]">User</span>
            <input
              type="text"
              placeholder="Digite seu usuário"
              value={loginUser}
              onChange={(e) => setLoginUser(e.target.value)}
              style={{ transition: "none", animation: "none" }}
              className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-4 text-white placeholder:text-white/10 focus:ring-2 focus:ring-indigo-500/50 outline-none transition-none"
            />
          </label>
          <label className="block">
            <span className="block mb-2 text-[10px] font-black text-white/40 uppercase tracking-[0.3em]">Senha</span>
            <input
              type="password"
              placeholder="Digite sua senha"
              value={loginPass}
              onChange={(e) => setLoginPass(e.target.value)}
              style={{ transition: "none", animation: "none" }}
              className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-4 text-white placeholder:text-white/10 focus:ring-2 focus:ring-indigo-500/50 outline-none transition-none"
            />
          </label>
        </div>
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-1000 fill-mode-both">
          <Button onClick={handleLogin} className="w-full" variant="primary">Entrar</Button>
        </div>
      </Card>
    </div>

    {loginStep !== "idle" && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#02040a]/80 backdrop-blur-md animate-in fade-in duration-500">
        <div className="text-center">
          {loginStep === "verifying" ? (
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="text-indigo-500 animate-spin" size={48} />
              <p className="text-indigo-400 font-black uppercase tracking-[0.3em] text-xs">Validando Credenciais...</p>
            </div>
          ) : loginStep === "success" ? (
            <div className="flex flex-col items-center gap-4 animate-in zoom-in duration-500">
              <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(16,185,129,0.4)]">
                <CheckCircle2 className="text-white" size={48} />
              </div>
              <p className="text-emerald-400 font-black uppercase tracking-[0.3em] text-xs">Sessão Iniciada</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 animate-in zoom-in duration-500">
              <div className="w-20 h-20 bg-rose-500 rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(244,63,94,0.4)]">
                <XCircle className="text-white" size={48} />
              </div>
              <p className="text-rose-400 font-black uppercase tracking-[0.3em] text-xs">Credenciais Inválidas</p>
            </div>
          )}
        </div>
        {(loginStep === "success" || loginStep === "error") && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-0 h-0 bg-white rounded-full animate-expand-view"></div>
          </div>
        )}
      </div>
    )}
  </div>
);

type EditViewProps = {
  selectedMonth?: MonthData;
  editForm: CategoryLine[];
  setEditForm: React.Dispatch<React.SetStateAction<CategoryLine[]>>;
  saveChanges: () => void;
  setView: React.Dispatch<React.SetStateAction<"login" | "dashboard" | "detail" | "edit">>;
};

const EditView = ({
  selectedMonth,
  editForm,
  setEditForm,
  saveChanges,
  setView,
}: EditViewProps) => {
  if (!selectedMonth) return null;
  return (
    <div className="max-w-5xl mx-auto py-12 px-6">
      <div className="flex justify-between items-center mb-12">
        <h2 className="text-4xl font-black text-white tracking-tighter">Gestão <span className="text-indigo-500">JML</span></h2>
        <div className="flex gap-3">
          <Button onClick={() => setView("dashboard")} variant="secondary">Descartar</Button>
          <Button onClick={saveChanges} icon={Save}>Publicar</Button>
        </div>
      </div>
      <div className="space-y-4">
        {editForm.map((cat, i) => (
          <Card key={cat.code} className="p-8 border-white/5 bg-black/40">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 items-end">
              <div className="text-sm font-black text-white uppercase">{cat.label}</div>
              <input
                type="number"
                value={cat.revenue}
                onChange={e => { const n = [...editForm]; n[i].revenue = Number(e.target.value); setEditForm(n); }}
                style={{ transition: "none", animation: "none" }}
                className="bg-white/[0.03] border border-white/10 rounded-2xl px-5 py-4 text-white outline-none focus:border-indigo-500"
                placeholder="Receita"
              />
              <input
                type="number"
                value={cat.expense}
                onChange={e => { const n = [...editForm]; n[i].expense = Number(e.target.value); setEditForm(n); }}
                style={{ transition: "none", animation: "none" }}
                className="bg-white/[0.03] border border-white/10 rounded-2xl px-5 py-4 text-rose-400 outline-none focus:border-rose-500"
                placeholder="Despesa"
              />
              <input
                type="number"
                value={cat.targetRevenue}
                onChange={e => { const n = [...editForm]; n[i].targetRevenue = Number(e.target.value); setEditForm(n); }}
                style={{ transition: "none", animation: "none" }}
                className="bg-white/[0.03] border border-white/10 rounded-2xl px-5 py-4 text-emerald-400 outline-none focus:border-emerald-500"
                placeholder="Meta"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <input
                type="text"
                value={cat.revenueNote}
                onChange={e => { const n = [...editForm]; n[i].revenueNote = e.target.value; setEditForm(n); }}
                style={{ transition: "none", animation: "none" }}
                className="bg-white/[0.03] border border-white/10 rounded-2xl px-5 py-4 text-white/80 outline-none focus:border-indigo-500"
                placeholder="Nota de receita"
              />
              <input
                type="text"
                value={cat.expenseNote}
                onChange={e => { const n = [...editForm]; n[i].expenseNote = e.target.value; setEditForm(n); }}
                style={{ transition: "none", animation: "none" }}
                className="bg-white/[0.03] border border-white/10 rounded-2xl px-5 py-4 text-rose-300 outline-none focus:border-rose-500"
                placeholder="Nota de despesa"
              />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

/**
 * =========================================
 * MAIN APP
 * =========================================
 */
export default function App() {
  const [view, setView] = useState<"login" | "dashboard" | "detail" | "edit">("login");
  const [loginStep, setLoginStep] = useState<"idle" | "verifying" | "success" | "error">("idle");
  const [user, setUser] = useState<{ name: string; role: Role } | null>(null);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [data, setData] = useState<DataStore>({});
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonthId, setSelectedMonthId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<CategoryLine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loginUser, setLoginUser] = useState("");
  const [loginPass, setLoginPass] = useState("");

  const availableYears = useMemo(() => Object.keys(data).map(Number).sort((a, b) => b - a), [data]);
  const monthsOfYear = data[selectedYear] || [];
  const selectedMonth = useMemo(() => monthsOfYear.find(m => m.id === selectedMonthId), [monthsOfYear, selectedMonthId]);

  const monthTotals = (m: MonthData) => {
    const revenue = m.categories.reduce((acc, c) => acc + (c.revenue || 0), 0);
    const expense = m.categories.reduce((acc, c) => acc + (c.expense || 0), 0);
    const target = m.categories.reduce((acc, c) => acc + (c.targetRevenue || 0), 0);
    return { revenue, expense, result: revenue - expense, target };
  };

  const loadYear = async (year: number) => {
    try {
      const yearData = await apiRequest<ApiYearResponse>("year", { params: { year } });
      setData(prev => ({ ...prev, [year]: yearData.months }));
    } catch (err) {
      console.error(err);
    }
  };

  const loadInitialData = async () => {
    try {
      setIsLoading(true);
      const yearsRes = await apiRequest<{ years: number[] }>("years");
      let years = yearsRes.years;

      if (!years.length) {
        const defaultYear = new Date().getFullYear();
        await apiRequest("years", { method: "POST", body: JSON.stringify({ year: defaultYear }) });
        years = [defaultYear];
      }

      const store: DataStore = {};
      for (const year of years) {
        const yearData = await apiRequest<ApiYearResponse>("year", { params: { year } });
        store[year] = yearData.months;
      }

      const latestYear = years.sort((a, b) => b - a)[0];
      setSelectedYear(latestYear);
      setData(store);
    } catch (err) {
      console.error(err);
      setData({ [selectedYear]: createYearTemplate(selectedYear) });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const handleLogin = () => {
    const normalizedUser = loginUser.trim().toLowerCase();
    let role: Role | null = null;

    if (normalizedUser === "diretoria" && loginPass === "14133*") {
      role = "user";
    } else if (normalizedUser === "financeiro" && loginPass === "JMLmaisforte26") {
      role = "admin";
    }

    setLoginStep("verifying");
    setTimeout(() => {
      if (!role) {
        setLoginStep("error");
        setTimeout(() => {
          setLoginStep("idle");
        }, 1500);
        return;
      }

      setLoginStep("success");
      setTimeout(() => {
        setUser({ name: role === "admin" ? "JML Admin" : "JML User", role });
        setView("dashboard");
        setIsAdminMode(role === "admin");
        setLoginStep("idle");
      }, 1200);
    }, 1500);
  };

  const addNewYear = async () => {
    const nextYear = (availableYears.length ? Math.max(...availableYears) : selectedYear) + 1;
    await apiRequest("years", { method: "POST", body: JSON.stringify({ year: nextYear }) });
    await loadYear(nextYear);
    setSelectedYear(nextYear);
  };

  const saveChanges = async () => {
    if (!selectedMonthId) return;
    await apiRequest("month", {
      method: "PUT",
      body: JSON.stringify({
        year: selectedYear,
        month: selectedMonthId,
        categories: editForm,
      }),
    });
    setData(prev => {
      const copy = { ...prev };
      const list = [...(copy[selectedYear] || [])];
      const idx = list.findIndex(m => m.id === selectedMonthId);
      if (idx !== -1) {
        list[idx] = { ...list[idx], categories: editForm };
      }
      copy[selectedYear] = list;
      return copy;
    });
    setView("detail");
  };

  const DashboardView = () => (
    <div className="max-w-7xl mx-auto py-12 px-6 overflow-hidden">
      <header className="flex flex-col lg:flex-row justify-between items-end lg:items-center mb-16 gap-8">
        <div className="relative">
          <h2 className="text-6xl font-black text-white tracking-tighter animate-in fade-in duration-1000 ease-out fill-mode-both">
            Dashboard Financeiro
          </h2>
          
          <div className="mt-3 flex items-center animate-dashboard-pill">
            <div className="relative overflow-hidden px-4 py-1.5 bg-indigo-500/20 border border-indigo-500/30 rounded-full">
              <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em]">
                Plataforma JML
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full animate-pill-shine"></div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 bg-white/[0.03] p-2 rounded-[2.5rem] border border-white/5 backdrop-blur-md animate-in fade-in slide-in-from-right-12 duration-1000 delay-[1200ms] cubic-bezier(0.34, 1.56, 0.64, 1) fill-mode-both">
          <div className="flex items-center gap-1 px-2">
            {availableYears.map(y => (
              <button key={y} onClick={() => setSelectedYear(y)} className={`px-6 py-2.5 rounded-2xl text-xs font-black transition-all ${selectedYear === y ? 'bg-white text-black shadow-xl scale-105' : 'text-white/30 hover:text-white'}`}>
                {y}
              </button>
            ))}
            {user?.role === "admin" && (
              <button
                onClick={addNewYear}
                className="ml-2 px-4 py-2.5 rounded-2xl text-xs font-black text-white/40 hover:text-white border border-white/10 hover:border-white/30 transition-all"
              >
                + Ano
              </button>
            )}
          </div>
          <div className="w-px h-8 bg-white/10 mx-1" />
          <Button
            onClick={() => setView("login")}
            variant="danger"
            className="w-10 h-10 rounded-2xl text-white !px-0 !py-0"
            aria-label="Sair"
          >
            <LogOut size={18} />
          </Button>
        </div>
      </header>

      {isLoading ? (
        <div className="flex items-center justify-center py-24 text-white/40">
          <Loader2 className="animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
          {monthsOfYear.map((m, idx) => {
            const t = monthTotals(m);
            const isPos = t.result >= 0;
            const totalProgress = t.target > 0 ? t.revenue / t.target : 0;

            return (
              <Card 
                key={m.id} 
                className="relative group overflow-hidden border-white/5 animate-in fade-in slide-in-from-bottom-16 fill-mode-both"
                style={{ 
                  animationDuration: '1000ms',
                  animationDelay: `${1500 + (idx * 100)}ms`,
                  animationTimingFunction: 'cubic-bezier(0.23, 1, 0.32, 1)' 
                }}
              >
                <div className="absolute -top-20 -right-20 w-40 h-40 bg-indigo-600/10 blur-[60px] group-hover:bg-indigo-600/20 transition-all duration-700 rounded-full" />
                
                <div className="flex justify-between items-start mb-8 relative z-10">
                  <div className="flex gap-4 items-center">
                    <CircularProgress value={totalProgress} size={64} color={isPos ? 'indigo' : 'rose'} />
                    <div>
                      <h3 className="text-2xl font-black text-white leading-tight tracking-tight">{m.name}</h3>
                      <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">{selectedYear}</p>
                    </div>
                  </div>
                  <div className={`p-3 rounded-2xl ${isPos ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                    {isPos ? <TrendingUp size={22} /> : <TrendingDown size={22} />}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-8 relative z-10">
                  {m.categories.map(cat => {
                    const catProg = cat.targetRevenue ? (cat.revenue / cat.targetRevenue) : 0;
                    return (
                      <div key={cat.code} className="bg-white/[0.03] border border-white/5 rounded-2xl p-3 hover:bg-white/[0.06] transition-all group/item">
                        <div className="flex justify-between items-center mb-1 text-[9px] font-black text-white/30 uppercase">
                          <span>{cat.label}</span>
                          <span className={cat.revenue >= cat.expense ? 'text-emerald-400' : 'text-rose-400'}>{Math.round(catProg * 100)}%</span>
                        </div>
                        <div className="text-xs font-black text-white/90 truncate">{money(cat.revenue)}</div>
                        <div className="mt-2 h-1 bg-white/5 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full bg-indigo-500`} style={{ width: `${Math.min(catProg * 100, 100)}%` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className="bg-black/30 backdrop-blur-md rounded-3xl p-6 border border-white/5 relative z-10">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-black text-white uppercase tracking-tighter">Lucro Líquido</span>
                    <span className={`text-2xl font-black tracking-tighter ${isPos ? 'text-emerald-400' : 'text-rose-400'}`}>{money(t.result)}</span>
                  </div>
                </div>

                <div className="flex gap-3 mt-6 relative z-10">
                  <Button onClick={() => { setSelectedMonthId(m.id); setView('detail'); }} variant="secondary" className="flex-1 py-3.5" icon={ChevronRight}>Análise</Button>
                  {isAdminMode && (
                    <Button onClick={() => { setSelectedMonthId(m.id); setEditForm(m.categories); setView('edit'); }} variant="primary" icon={Edit3} />
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );

  const MonthDetailView = () => {
    if (!selectedMonth) return null;
    const t = monthTotals(selectedMonth);
    return (
      <div className="max-w-6xl mx-auto py-12 px-6 animate-in fade-in zoom-in-95 duration-500">
        <button onClick={() => setView('dashboard')} className="flex items-center gap-2 text-white/30 hover:text-white transition-all mb-10 font-black uppercase text-[10px] tracking-[0.3em]">
          <ChevronLeft size={16} /> Voltar ao Dashboard
        </button>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6">
          <div>
            <div className="text-indigo-400 font-black text-xs uppercase tracking-[0.4em] mb-2">{selectedYear}</div>
            <h2 className="text-7xl font-black text-white tracking-tighter italic leading-none">{selectedMonth.name}</h2>
          </div>
          <div className="bg-white/[0.03] p-6 rounded-3xl border border-white/5 text-right">
            <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">Resultado Final</span>
            <div className={`text-4xl font-black tracking-tighter ${t.result >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{money(t.result)}</div>
          </div>
        </div>
        <Card className="p-0 overflow-hidden border-none shadow-2xl bg-black/40 hidden md:block">
          <table className="w-full text-left">
            <thead className="bg-white/[0.02]">
              <tr className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">
                <th className="px-8 py-7">Unidade</th>
                <th className="px-8 py-7">Receita</th>
                <th className="px-8 py-7">Despesa</th>
                <th className="px-8 py-7">Diferença</th>
                <th className="px-8 py-7">Notas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {selectedMonth.categories.map(c => (
                <tr key={c.code} className="hover:bg-white/[0.04] transition-colors">
                  <td className="px-8 py-7 font-black text-white text-xl">{c.label}</td>
                  <td className="px-8 py-7 font-bold text-indigo-300">{money(c.revenue)}</td>
                  <td className="px-8 py-7 font-bold text-rose-400">{money(c.expense)}</td>
                  <td className={`px-8 py-7 font-black text-xl ${c.revenue >= c.expense ? 'text-emerald-400' : 'text-rose-400'}`}>{money(c.revenue - c.expense)}</td>
                  <td className="px-8 py-7 text-[11px] text-white/30 italic">{c.revenueNote || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <div className="space-y-4 md:hidden">
          {selectedMonth.categories.map(c => (
            <Card key={c.code} className="p-6 border-white/5 bg-black/40">
              <div className="flex items-center justify-between">
                <div className="text-lg font-black text-white">{c.label}</div>
                <div className={`text-lg font-black ${c.revenue >= c.expense ? "text-emerald-400" : "text-rose-400"}`}>
                  {money(c.revenue - c.expense)}
                </div>
              </div>
              <div className="mt-2 text-[10px] font-black uppercase tracking-[0.2em] text-white/30">
                Diferença
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-3">
                  <div className="text-[10px] font-black uppercase text-white/30 tracking-[0.2em]">Receita</div>
                  <div className="font-bold text-indigo-300 mt-1">{money(c.revenue)}</div>
                </div>
                <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-3">
                  <div className="text-[10px] font-black uppercase text-white/30 tracking-[0.2em]">Despesa</div>
                  <div className="font-bold text-rose-400 mt-1">{money(c.expense)}</div>
                </div>
              </div>
              <div className="mt-4 text-[10px] font-black uppercase tracking-[0.2em] text-white/30">
                Notas
              </div>
              <div className="mt-2 space-y-2 text-[11px]">
                <div className="text-white/40 italic">
                  <span className="font-black uppercase tracking-[0.2em] text-white/30 mr-2">Receita</span>
                  {c.revenueNote || "-"}
                </div>
                <div className="text-white/40 italic">
                  <span className="font-black uppercase tracking-[0.2em] text-white/30 mr-2">Despesa</span>
                  {c.expenseNote || "-"}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#02040a] text-slate-100 selection:bg-indigo-500/30 font-sans overflow-x-hidden">
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[80%] h-[80%] bg-indigo-900/20 blur-[150px] rounded-full animate-pulse-slow" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[70%] h-[70%] bg-purple-900/20 blur-[150px] rounded-full animate-float" />
        <div className="absolute top-[20%] right-[5%] w-[40%] h-[40%] bg-blue-900/10 blur-[120px] rounded-full animate-pulse-slow delay-700" />
      </div>

      <style>{`
        @keyframes pulse-slow { 0%, 100% { opacity: 0.4; transform: scale(1); } 50% { opacity: 0.7; transform: scale(1.1); } }
        @keyframes float { 0%, 100% { transform: translate(0, 0); } 50% { transform: translate(-30px, -50px); } }
        @keyframes shimmer { 100% { left: 150%; } }
        @keyframes tilt { 0%, 50%, 100% { transform: rotate(0deg); } 25% { transform: rotate(1.5deg); } 75% { transform: rotate(-1.5deg); } }
        @keyframes expand-view { 0% { width: 0; height: 0; opacity: 1; } 100% { width: 400vw; height: 400vw; opacity: 0; } }
        
        @keyframes dash-pill-in {
          0% { opacity: 0; transform: translateX(-40px); }
          100% { opacity: 1; transform: translateX(0); }
        }
        @keyframes pill-shine {
          0% { transform: translateX(-100%) skewX(-15deg); }
          100% { transform: translateX(200%) skewX(-15deg); }
        }

        .animate-pulse-slow { animation: pulse-slow 12s ease-in-out infinite; }
        .animate-float { animation: float 18s ease-in-out infinite; }
        .animate-shimmer { animation: shimmer 3s infinite linear; }
        .animate-tilt { animation: tilt 10s infinite linear; }
        .animate-expand-view { animation: expand-view 1.5s cubic-bezier(0.19, 1, 0.22, 1) forwards; }
        
        .animate-dashboard-pill { 
          animation: dash-pill-in 1000ms cubic-bezier(0.34, 1.56, 0.64, 1) 1000ms both; 
        }
        .animate-pill-shine {
          animation: pill-shine 1500ms ease-in-out 2000ms both;
        }
      `}</style>

      {user?.role === "admin" && (
        <div className="fixed bottom-10 right-10 z-50">
          <button onClick={() => setIsAdminMode(!isAdminMode)} className={`flex items-center gap-3 px-8 py-4 rounded-full font-black shadow-2xl transition-all duration-700 ${isAdminMode ? 'bg-indigo-600' : 'bg-white/5 backdrop-blur-3xl text-white/40 border border-white/10'}`}>
            {isAdminMode ? <Eye size={20} /> : <EyeOff size={20} />}
            {isAdminMode ? "MODO ADMIN ATIVO" : "VISÃO USUÁRIO"}
          </button>
        </div>
      )}

      <main className="relative z-10">
        {view === "login" && (
          <LoginView
            loginStep={loginStep}
            loginUser={loginUser}
            loginPass={loginPass}
            setLoginUser={setLoginUser}
            setLoginPass={setLoginPass}
            handleLogin={handleLogin}
          />
        )}
        {view === "dashboard" && <DashboardView />}
        {view === "detail" && <MonthDetailView />}
        {view === "edit" && (
          <EditView
            selectedMonth={selectedMonth}
            editForm={editForm}
            setEditForm={setEditForm}
            saveChanges={saveChanges}
            setView={setView}
          />
        )}
      </main>
    </div>
  );
}






