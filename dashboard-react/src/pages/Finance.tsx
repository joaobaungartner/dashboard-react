import { useEffect, useState } from "react";
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

export default function Finance() {
  const [kpis, setKpis] = useState<KPIFinance | null>(null);
  const [timeseries, setTimeseries] = useState<{ date: string; receita_total: number }[]>([]);
  const [marginByPlatform, setMarginByPlatform] = useState<{ platform: string; margin: number }[]>([]);
  const [revenueByClass, setRevenueByClass] = useState<{ classe: string; revenue: number }[]>([]);
  const [topClients, setTopClients] = useState<{ client: string; revenue: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        setError(null);

        const results = await Promise.allSettled([
          getJson<any>("/api/dashboard/finance/kpis"),
          getJson<any>("/api/dashboard/finance/timeseries_revenue", { freq: "M" }),
          getJson<any>("/api/dashboard/finance/margin_by_platform"),
          getJson<any>("/api/dashboard/finance/revenue_by_class"),
          getJson<any>("/api/dashboard/finance/top_clients", { top_n: 10 }),
        ]);

        if (cancelled) return;

        const [k, ts, mp, rc, tc] = results;

        if (k.status === "fulfilled") {
          const raw = unwrap<any>(k.value) ?? {};
          const normalized: KPIFinance = {
            receita_total: pickNumber(raw, ["receita_total"]),
            receita_liquida: pickNumber(raw, ["receita_liquida"]),
            margem_total: pickNumber(raw, ["margem_total", "receita_liquida"]),
            ticket_medio: pickNumber(raw, ["ticket_medio"]),
            pedidos: pickNumber(raw, ["pedidos"]),
          };
          setKpis(normalized);
        } else {
          setKpis(null);
          console.warn("[Finance] KPIs falhou:", k.reason);
        }

        if (ts.status === "fulfilled") {
          const arr = unwrap<any[]>(ts.value) ?? [];
          const norm = arr.map((row) => ({
            date: row.date,
            receita_total: pickNumber(row, ["net", "gross"]),
          }));
          setTimeseries(norm);
        } else {
          setTimeseries([]);
          console.warn("[Finance] Timeseries falhou:", ts.reason);
        }

        if (mp.status === "fulfilled") {
          const arr = unwrap<any[]>(mp.value) ?? [];
          const norm = arr.map((row) => {
            const platformName = pickString(row, ["platform", "plataforma"]) || firstKeyExcept(row, ["gross", "net", "margin", "margin_pct", "receita", "revenue"]) || "";
            return {
              platform: (row[platformName] ?? "") as string,
              margin: pickNumber(row, ["margin", "margin_pct"]),
            };
          });
          setMarginByPlatform(norm);
        } else {
          setMarginByPlatform([]);
          console.warn("[Finance] Margin by platform falhou:", mp.reason);
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
          console.warn("[Finance] Revenue by class falhou:", rc.reason);
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
          console.warn("[Finance] Top clients falhou:", tc.reason);
        }
      } catch (e) {
        console.error("[Finance] Erro geral:", e);
        setError(e instanceof Error ? e.message : "Erro ao carregar dados financeiros");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const pieColors = ["#2563eb", "#16a34a", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

  return (
    <div className="space-y-6">
      {loading && <p className="text-gray-600">Carregando…</p>}
      {error && <p className="text-red-600">{error}</p>}

      {kpis && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard title="Receita total" value={formatCurrency(kpis.receita_total)} />
          <KpiCard title="Receita líquida" value={formatCurrency(kpis.receita_liquida ?? kpis.margem_total)} />
          <KpiCard title="Ticket médio" value={formatCurrency(kpis.ticket_medio)} />
          <KpiCard title="Pedidos" value={formatNumber(kpis.pedidos)} />
        </div>
      )}

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
          <h3 className="font-semibold mb-3">Margem por plataforma</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={marginByPlatform}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="platform" interval={0} />
              <YAxis tickFormatter={(v) => shortCurrency(v)} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Bar dataKey="margin" fill="#16a34a" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-semibold mb-3">Receita por classe</h3>
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
          <h3 className="font-semibold mb-3">Top clientes por receita</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie dataKey="revenue" nameKey="client" data={topClients} outerRadius={90}>
                {topClients.map((_, i) => (
                  <Cell key={i} fill={pieColors[i % pieColors.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
            </PieChart>
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
