import { useEffect, useMemo, useState } from "react";
import { getJson, parseDateString } from "../utils/api";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ComposedChart,
  Legend,
} from "recharts";

type KPIFinance = Partial<{
  receita_total: number;
  receita_liquida: number;
  margem_total: number;
  ticket_medio: number;
  pedidos: number;
}>;

function unwrap<T>(payload: any): T {
  return (payload && (payload.data ?? payload)) as T;
}
function pickNumber(obj: any, keys: string[], fallback = 0): number {
  for (const k of keys) {
    if (obj && typeof obj[k] === "number" && !Number.isNaN(obj[k])) return obj[k];
  }
  return fallback;
}
function pickString(obj: any, keys: string[], fallback = ""): string {
  for (const k of keys) {
    const v = obj?.[k];
    if (typeof v === "string") return v;
  }
  return fallback;
}
function firstKeyExcept(obj: any, except: string[]): string | null {
  if (!obj) return null;
  const ex = new Set(except);
  for (const k of Object.keys(obj)) {
    if (!ex.has(k)) return k;
  }
  return null;
}

function formatDateLabel(d?: Date | null) {
  if (!d) return "-";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(d);
}

export default function Finance() {
  const [kpis, setKpis] = useState<KPIFinance | null>(null);
  const [timeseries, setTimeseries] = useState<{ date: string; receita_total: number }[]>([]);
  const [revenueByPlatform, setRevenueByPlatform] = useState<{ platform: string; total: number; pct?: number }[]>([]);
  const [revenueByClass, setRevenueByClass] = useState<{ classe: string; revenue: number }[]>([]);
  const [revenueByItemClass, setRevenueByItemClass] = useState<{ item_class: string; total_brl: number }[]>([]);
  const [revenueByMacroBairro, setRevenueByMacroBairro] = useState<{ macro_bairro: string; receita_bruta: number; receita_liquida: number }[]>([]);
  const [topClients, setTopClients] = useState<{ client: string; revenue: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estados para período do dataset
  const [datasetStart, setDatasetStart] = useState<Date | null>(null);
  const [datasetEnd, setDatasetEnd] = useState<Date | null>(null);
  
  // Estados para meta dados (listas de opções)
  const [metaPlatforms, setMetaPlatforms] = useState<string[]>([]);
  const [metaMacros, setMetaMacros] = useState<string[]>([]);

  // Filtros
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [selectedPlatform, setSelectedPlatform] = useState<string | "all">("all");
  const [selectedMacro, setSelectedMacro] = useState<string | "all">("all");

  async function fetchAll() {
    // Usar timestamp único para evitar conflitos de timer
    const timerId = `[Finance] ⏱️ Tempo total ${Date.now()}`;
    const reqTimerId = `[Finance] 🌐 Requisições paralelas ${Date.now()}`;
    
    try {
      console.group("[Finance] 🚀 Iniciando carregamento de dados");
      console.time(timerId);
      
      setLoading(true);
      setError(null);

      // Montar parâmetros de filtro
      const params: Record<string, any> = {};
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      if (selectedPlatform !== "all") params.platform = [selectedPlatform];
      if (selectedMacro !== "all") params.macro_bairro = [selectedMacro];

      if (Object.keys(params).length > 0) {
        console.log("[Finance] 📋 Parâmetros:", params);
      }

      // Escolha dinâmica de frequência da série temporal baseada no intervalo selecionado
      let freqParam: "D" | "W" | "M" = "M";
      if (startDate && endDate) {
        const msPerDay = 24 * 60 * 60 * 1000;
        const rangeDays = Math.max(1, Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / msPerDay));
        if (rangeDays <= 45) freqParam = "D"; else if (rangeDays <= 180) freqParam = "W"; else freqParam = "M";
      }

      console.time(reqTimerId);
      
      const results = await Promise.allSettled([
        // Meta dados (sem filtros)
        getJson<any>("/api/dashboard/overview/kpis"),
        getJson<{ data: string[] }>("/api/dashboard/meta/platforms"),
        getJson<{ data: string[] }>("/api/dashboard/meta/macros"),
        // Dados financeiros (com filtros)
        getJson<any>("/api/dashboard/finance/kpis", params),
        getJson<any>("/api/dashboard/finance/timeseries_revenue", { ...params, freq: freqParam }),
        getJson<any>("/api/dashboard/finance/revenue_by_platform", params),
        getJson<any>("/api/dashboard/finance/revenue_by_class", params),
        getJson<any>("/api/dashboard/finance/revenue_by_item_class_barplot", params),
        getJson<any>("/api/dashboard/finance/revenue_by_macro_bairro", { ...params, top_n: 10 }),
        getJson<any>("/api/dashboard/finance/top_clients", { ...params, top_n: 10 }),
      ]);
      console.timeEnd(reqTimerId);
      
      const [kOverview, metaPlats, metaMacs, k, ts, rp, rc, ric, rmb, tc] = results;

        // Definir intervalo do dataset a partir do overview.kpis.periodo
        if (kOverview.status === "fulfilled" && kOverview.value && (kOverview.value as any).periodo) {
          const p = (kOverview.value as any).periodo as { min: string; max: string };
          if (p?.min && p?.max) {
            setDatasetStart(new Date(p.min));
            setDatasetEnd(new Date(p.max));
            // Inicializar inputs se vazios
            if (!startDate) setStartDate(p.min.substring(0, 10));
            if (!endDate) setEndDate(p.max.substring(0, 10));
          }
        }

        // Meta dados
        if (metaPlats.status === "fulfilled") {
          setMetaPlatforms(metaPlats.value?.data ?? []);
        }
        if (metaMacs.status === "fulfilled") {
          setMetaMacros(metaMacs.value?.data ?? []);
        }

        if (k.status === "fulfilled") {
          const raw = unwrap<any>(k.value) ?? {};
          const normalized: KPIFinance = {
            receita_total: pickNumber(raw, ["receita_total"]),
            receita_liquida: pickNumber(raw, ["receita_liquida"]),
            margem_total: pickNumber(raw, ["margem_total", "receita_liquida"]),
            ticket_medio: pickNumber(raw, ["ticket_medio"]),
            pedidos: pickNumber(raw, ["pedidos"]),
          };
          console.log("[Finance] 📊 KPIs:", normalized);
          setKpis(normalized);
        } else {
          setKpis(null);
          console.warn("[Finance] ❌ KPIs falhou:", k.reason);
        }

        if (ts.status === "fulfilled") {
          const arr = unwrap<any[]>(ts.value) ?? [];
          const norm = arr.map((row) => ({
            date: row.date,
            receita_total: pickNumber(row, ["net", "gross"]),
          }));
          console.log("[Finance] 📈 Timeseries:", norm.length, "pontos");
          setTimeseries(norm);
        } else {
          setTimeseries([]);
          console.warn("[Finance] ❌ Timeseries falhou:", ts.reason);
        }

        if (rp.status === "fulfilled") {
          const arr = unwrap<any[]>(rp.value) ?? [];
          const norm = arr.map((row, idx) => {
            // Tenta encontrar a chave de plataforma (primeira chave que não é numérica conhecida)
            const excludedKeys = [
              "total", "total_brl", "revenue", "pct", "pct_col", "total_col", 
              "receita_total", "receita", "receita_bruta", "receita_liquida",
              "percentual", "percent"
            ];
            const platformKey = 
              (pickString(row, ["platform", "plataforma", "platform_col"]) && 
               (row.platform ? "platform" : row.plataforma ? "plataforma" : "platform_col")) ||
              firstKeyExcept(row, excludedKeys) ||
              null;
            
            const platformName = platformKey ? String(row[platformKey]) : `Plataforma ${idx + 1}`;
            
            // Busca o valor total em várias possibilidades (incluindo receita_bruta e receita_liquida)
            const totalValue = pickNumber(row, [
              "receita_bruta",  // prioridade para receita bruta
              "receita_liquida",
              "total", 
              "total_brl", 
              "revenue", 
              "total_col",
              "receita_total",
              "receita"
            ]);
            
            // Busca o percentual se disponível
            const pctValue = pickNumber(row, ["pct", "pct_col", "percentual", "percent"]);
            
            return {
              platform: platformName,
              total: totalValue,
              pct: pctValue > 0 ? pctValue : undefined,
            };
          });

          console.log("[Finance] 🏪 Revenue by platform:", norm.length, "plataformas");
          setRevenueByPlatform(norm);
        } else {
          setRevenueByPlatform([]);
          console.warn("[Finance] ❌ Revenue by platform falhou:", rp.reason);
        }

        if (rc.status === "fulfilled") {
          const arr = unwrap<any[]>(rc.value) ?? [];
          const norm = arr.map((row) => {
            const clsKey = firstKeyExcept(row, ["revenue"]);
            return {
              classe: String(clsKey ? row[clsKey] : ""),
              revenue: pickNumber(row, ["revenue"]),
            };
          });
          setRevenueByClass(norm);
        } else {
          setRevenueByClass([]);
          console.warn("[Finance] ❌ Revenue by class falhou:", rc.reason);
        }

        if (ric.status === "fulfilled") {
          const arr = unwrap<any[]>(ric.value) ?? [];
          const norm = arr.map((row) => {
            const itemClassKey = firstKeyExcept(row, ["total_brl", "revenue", "total"]);
            return {
              item_class: String(itemClassKey ? row[itemClassKey] : ""),
              total_brl: pickNumber(row, ["total_brl", "total", "revenue"]),
            };
          });
          setRevenueByItemClass(norm);
        } else {
          setRevenueByItemClass([]);
          console.warn("[Finance] ❌ Revenue by item class falhou:", ric.reason);
        }

        if (rmb.status === "fulfilled") {
          const arr = unwrap<any[]>(rmb.value) ?? [];
          const norm = arr.map((row) => {
            const macroBairroKey = firstKeyExcept(row, ["receita_bruta", "receita_liquida", "revenue", "total"]);
            return {
              macro_bairro: String(macroBairroKey ? row[macroBairroKey] : ""),
              receita_bruta: pickNumber(row, ["receita_bruta", "total", "revenue"]),
              receita_liquida: pickNumber(row, ["receita_liquida", "receita_bruta", "net"]),
            };
          });
          setRevenueByMacroBairro(norm);
        } else {
          setRevenueByMacroBairro([]);
          console.warn("[Finance] ❌ Revenue by macro_bairro falhou:", rmb.reason);
        }

        if (tc.status === "fulfilled") {
          const arr = unwrap<any[]>(tc.value) ?? [];
          const norm = arr.map((row) => {
            const clientKey = firstKeyExcept(row, ["spent", "revenue"]);
            return {
              client: String(clientKey ? row[clientKey] : ""),
              revenue: pickNumber(row, ["revenue", "spent"]),
            };
          });
          setTopClients(norm);
        } else {
          setTopClients([]);
          console.warn("[Finance] ❌ Top clients falhou:", tc.reason);
        }

        // Resumo final
        const successCount = results.slice(3).filter((r) => r.status === "fulfilled").length;
        const failCount = results.slice(3).filter((r) => r.status === "rejected").length;
        console.log(`[Finance] ✅ ${successCount} sucesso, ${failCount} falhas`);
        // Timer principal será finalizado no finally para garantir execução mesmo em caso de erro
      } catch (e) {
        console.error("[Finance] 💥 Erro:", e instanceof Error ? e.message : String(e));
        const msg = e instanceof Error ? e.message : "Erro ao carregar dados financeiros";
        setError(msg.includes("HTTP 400") ? "Alguma coluna informada não existe. Verifique os parâmetros." : msg);
      } finally {
        // Garantir que o timer principal e o grupo sejam sempre finalizados, mesmo em caso de erro
        try {
          if (timerId) console.timeEnd(timerId);
        } catch {}
        try {
          console.groupEnd();
        } catch {}
        setLoading(false);
      }
    }

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const platformList = useMemo(() => metaPlatforms, [metaPlatforms]);
  const macroList = useMemo(() => metaMacros, [metaMacros]);

  const pieColors = ["#2563eb", "#16a34a", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between">
        <h2 className="text-2xl font-semibold">Análise Financeira</h2>
        {loading && <span className="text-sm text-gray-500">Carregando…</span>}
      </div>

      {datasetStart && datasetEnd && (
        <div className="text-sm text-gray-600">
          Período dos dados: <span className="font-medium">{formatDateLabel(datasetStart)}</span> — <span className="font-medium">{formatDateLabel(datasetEnd)}</span>
        </div>
      )}

      {error && <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded">{error}</div>}

      {kpis && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard title="Receita total" value={formatCurrency(kpis.receita_total)} />
          <KpiCard title="Receita líquida" value={formatCurrency(kpis.receita_liquida ?? kpis.margem_total)} />
          <KpiCard title="Ticket médio" value={formatCurrency(kpis.ticket_medio)} />
          <KpiCard title="Pedidos" value={formatNumber(kpis.pedidos)} />
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Início</label>
            <input 
              type="date" 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)} 
              className="w-full border rounded px-2 py-2" 
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Fim</label>
            <input 
              type="date" 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)} 
              className="w-full border rounded px-2 py-2" 
            />
          </div>

          {/* Plataformas (dropdown) */}
          <div>
            <label className="block text-sm text-gray-600 mb-1">Plataforma</label>
            <select 
              value={selectedPlatform} 
              onChange={(e) => setSelectedPlatform(e.target.value)} 
              className="w-full border rounded px-2 py-2"
            >
              <option value="all">Todas</option>
              {platformList.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          {/* Macro-bairros (dropdown) */}
          <div>
            <label className="block text-sm text-gray-600 mb-1">Macro-bairro</label>
            <select 
              value={selectedMacro} 
              onChange={(e) => setSelectedMacro(e.target.value)} 
              className="w-full border rounded px-2 py-2"
            >
              <option value="all">Todos</option>
              {macroList.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <button 
            onClick={fetchAll} 
            disabled={loading} 
            className={`px-3 py-2 rounded border ${loading ? "bg-gray-300 text-gray-600" : "bg-gray-900 text-white"}`}
          >
            {loading ? "Aplicando…" : "Aplicar filtros"}
          </button>
          <button
            onClick={() => {
              setSelectedPlatform("all");
              setSelectedMacro("all");
              // Se temos período do dataset, inicializa datas com ele; senão limpa
              if (datasetStart && datasetEnd) {
                setStartDate(datasetStart.toISOString().substring(0, 10));
                setEndDate(datasetEnd.toISOString().substring(0, 10));
              } else {
                setStartDate("");
                setEndDate("");
              }
              fetchAll();
            }}
            className="px-3 py-2 rounded border bg-white text-gray-800"
          >
            Limpar tudo
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-semibold mb-3">Receita ao longo do tempo</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={timeseries.map(d => ({ ...d, date: parseDateString(d.date) }))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tickFormatter={(v) => new Intl.DateTimeFormat("pt-BR").format(v)} />
              <YAxis tickFormatter={(v) => shortCurrency(v)} />
              <Tooltip
                formatter={(v: number) => formatCurrency(v)}
                labelFormatter={(v) => new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(v as Date)}
              />
              <Line type="monotone" dataKey="receita_total" stroke="#2563eb" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-semibold mb-3">Receita por plataforma</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={revenueByPlatform}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="platform" interval={0} angle={-20} textAnchor="end" height={60} />
              <YAxis tickFormatter={(v) => shortCurrency(v)} />
              <Tooltip 
                formatter={(v: number, name: string, props: any) => {
                  const pct = props.payload?.pct;
                  if (pct !== undefined && !Number.isNaN(pct)) {
                    return [`${formatCurrency(v)} (${(pct * 100).toFixed(1)}%)`, "Receita"];
                  }
                  return formatCurrency(v);
                }}
              />
              <Bar dataKey="total" fill="#16a34a" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-semibold mb-3">Receita por modal</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={revenueByClass}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="classe" interval={0} angle={-20} textAnchor="end" height={60} />
              <YAxis tickFormatter={(v) => shortCurrency(v)} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Bar dataKey="revenue" fill="#f59e0b" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-semibold mb-3">Receita por classe</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={revenueByItemClass}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="item_class" 
                interval={0} 
                angle={-20} 
                textAnchor="end" 
                height={60}
              />
              <YAxis tickFormatter={(v) => shortCurrency(v)} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Bar dataKey="total_brl" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-semibold mb-3">Receita por macro bairro (Top 10)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={revenueByMacroBairro}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="macro_bairro" 
                interval={0} 
                angle={-45} 
                textAnchor="end" 
                height={80}
              />
              <YAxis tickFormatter={(v) => shortCurrency(v)} />
              <Tooltip 
                formatter={(v: number) => formatCurrency(v)}
                labelFormatter={(label) => `Bairro: ${label}`}
              />
              <Legend />
              <Bar dataKey="receita_bruta" name="Receita Bruta" fill="#8884d8" />
              <Bar dataKey="receita_liquida" name="Receita Líquida" fill="#82ca9d" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <p className="text-sm text-gray-500">{title}</p>
      <p className="text-2xl font-semibold">{value}</p>
    </div>
  );
}

function formatCurrency(v?: number) {
  if (v === undefined || v === null || Number.isNaN(v)) return "-";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatNumber(v?: number) {
  if (v === undefined || v === null || Number.isNaN(v)) return "-";
  return v.toLocaleString("pt-BR");
}

function shortCurrency(v?: number) {
  if (v === undefined || v === null || Number.isNaN(v)) return "";
  if (Math.abs(v) >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}k`;
  return `R$ ${v.toFixed(0)}`;
}
