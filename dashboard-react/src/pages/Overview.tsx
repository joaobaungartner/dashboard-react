import { useEffect, useState } from "react";
import { getJson, parseDateString } from "../utils/api";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ComposedChart,
  Legend,
} from "recharts";

type KPIOverview = {
  total_pedidos: number;
  receita_total: number;
  ticket_medio: number;
  cancelados_pct?: number;
  pedidos_por_dia?: number;
};

export default function Overview() {
  const [kpis, setKpis] = useState<KPIOverview | null>(null);
  const [series, setSeries] = useState<{ date: string; orders: number }[]>([]);
  const [byPlatform, setByPlatform] = useState<{ platform: string; orders: number }[]>([]);
  const [byStatus, setByStatus] = useState<{ status: string; count: number }[]>([]);
  const [macroAvg, setMacroAvg] = useState<{ macro_bairro: string; avg_receita: number }[]>([]);
  const [monthlyRevOrders, setMonthlyRevOrders] = useState<{ date: string; receita_total: number; orders: number }[]>([]);
  const [topMacro, setTopMacro] = useState<{ macro_bairro: string; orders: number }[]>([]);
  const [ticketHist, setTicketHist] = useState<{ bin_start: number; bin_end: number; count: number }[]>([]);
  const [choropleth, setChoropleth] = useState<{ macro_bairro: string; value: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);

        const results = await Promise.allSettled([
          getJson<{ data: KPIOverview }>("/api/dashboard/overview/kpis"),
          getJson<{ data: { date: string; orders: number }[] }>("/api/dashboard/overview/timeseries_orders", { freq: "D" }),
          getJson<{ data: { platform: string; orders: number }[] }>("/api/dashboard/overview/by_platform"),
          getJson<{ data: { status: string; count: number }[] }>("/api/dashboard/overview/status_distribution"),
          getJson<{ data: { macro_bairro: string; avg_receita: number }[] }>("/api/dashboard/overview/macro_bairro_avg_receita"),
          getJson<{ data: { date: string; receita_total: number; orders: number }[] }>("/api/dashboard/overview/timeseries_revenue_with_orders", { freq: "M" }),
          getJson<{ data: { macro_bairro: string; orders: number }[] }>("/api/dashboard/overview/top_macro_bairros_by_orders", { top_n: 5 }),
          getJson<{ data: { bin_start: number; bin_end: number; count: number }[] }>("/api/dashboard/overview/ticket_histogram", { bins: 15 }),
          getJson<{ data: { macro_bairro: string; value: number }[] }>("/api/dashboard/overview/macro_bairro_choropleth", { metric: "avg_receita" }),
        ]);

        const [k, s, p, st, m, mo, tm, th, ch] = results;
        
        if (k.status === "fulfilled") setKpis(k.value.data);
        if (s.status === "fulfilled") setSeries(s.value.data ?? []);
        if (p.status === "fulfilled") setByPlatform(p.value.data ?? []);
        if (st.status === "fulfilled") setByStatus(st.value.data ?? []);
        if (m.status === "fulfilled") setMacroAvg(m.value.data ?? []);
        if (mo.status === "fulfilled") setMonthlyRevOrders(mo.value.data ?? []);
        if (tm.status === "fulfilled") setTopMacro((tm.value.data ?? []).slice(0, 5));
        if (th.status === "fulfilled") setTicketHist(th.value.data ?? []);
        if (ch.status === "fulfilled") setChoropleth(ch.value.data ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erro ao carregar dados");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const colors = ["#2563eb", "#16a34a", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

  return (
    <div className="space-y-6">
      {loading && <p className="text-gray-600">Carregando…</p>}
      {error && <p className="text-red-600">{error}</p>}

      {kpis && (
        <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-${kpis.cancelados_pct !== undefined || kpis.pedidos_por_dia !== undefined ? 5 : 3} gap-4`}>
          <KpiCard title="Total de pedidos" value={kpis.total_pedidos.toLocaleString()} />
          <KpiCard title="Receita total" value={kpis.receita_total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} />
          <KpiCard title="Ticket médio" value={kpis.ticket_medio.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} />
          {kpis.cancelados_pct !== undefined && (
            <KpiCard title="Pedidos cancelados" value={`${(kpis.cancelados_pct > 1 ? kpis.cancelados_pct : kpis.cancelados_pct * 100).toFixed(1)}%`} />
          )}
          {kpis.pedidos_por_dia !== undefined && (
            <KpiCard title="Pedidos por dia (média)" value={kpis.pedidos_por_dia.toLocaleString(undefined, { maximumFractionDigits: 1 })} />
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-semibold mb-3">Receita total por mês (linha dupla)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={monthlyRevOrders}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Bar yAxisId="left" dataKey="orders" name="Pedidos" fill="#3b82f6" />
              <Line yAxisId="right" dataKey="receita_total" name="Receita" stroke="#16a34a" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-semibold mb-3">Top 5 macro bairros por pedidos</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={topMacro}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="macro_bairro" interval={0} angle={-20} textAnchor="end" height={60} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="orders" fill="#0ea5e9" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-semibold mb-3">Distribuição do ticket médio</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={ticketHist.map((h) => ({ ...h, bin_label: `${h.bin_start.toFixed(1)}-${h.bin_end.toFixed(1)}` }))}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="bin_label" interval={0} angle={-20} textAnchor="end" height={60} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#8b5cf6" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-semibold mb-3">Pedidos por data</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={series.map((d) => ({ ...d, date: parseDateString(d.date) }))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tickFormatter={(v) => new Intl.DateTimeFormat("pt-BR").format(v)} />
              <YAxis />
              <Tooltip labelFormatter={(v) => new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(v as Date)} />
              <Line type="monotone" dataKey="orders" stroke="#2563eb" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>


        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-semibold mb-3">Pedidos por plataforma</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={byPlatform}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="platform" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="orders" fill="#16a34a" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-semibold mb-3">Status dos pedidos</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie dataKey="count" nameKey="status" data={byStatus} outerRadius={90}>
                {byStatus.map((_, i) => (
                  <Cell key={i} fill={colors[i % colors.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-semibold mb-3">Macro bairro × receita média</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={macroAvg}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="macro_bairro" interval={0} angle={-20} textAnchor="end" height={60} />
              <YAxis />
              <Tooltip formatter={(v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} />
              <Bar dataKey="avg_receita" fill="#f59e0b" />
            </BarChart>
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