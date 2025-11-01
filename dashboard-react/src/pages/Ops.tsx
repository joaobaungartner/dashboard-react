import { useEffect, useMemo, useState } from "react";
import { getJson } from "../utils/api";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ScatterChart,
  Scatter,
  ZAxis,
  Legend,
  BarChart,
  Bar,
} from "recharts";

type KpisResponse = {
  tempo_medio_preparo: number;
  tempo_medio_entrega: number;
  atraso_medio: number;
  distancia_media: number;
  on_time_rate_pct: number;
};

type OrdersByHourItem = { hour: number; orders: number };
type OrdersByHourResponse = { data: OrdersByHourItem[] };

type PercentisItem = { macro_bairro: string; mean: number; p50: number; p75: number; p90: number; count: number };
type PercentisResponse = { data: PercentisItem[] };

type LateRateItem = { macro_bairro: string; late_count: number; on_time_count: number; late_rate: number };
type LateRateResponse = { data: LateRateItem[] };

type ScatterItem = { distance_km: number; delivery_minutes: number };
type ScatterResponse = { data: ScatterItem[] };

function formatMinutes(value?: number) {
  if (value === undefined || Number.isNaN(value)) return "-";
  return `${value.toFixed(1)} min`;
}

function pct(n: number) { return `${(n * 100).toFixed(1)}%`; }

export default function Ops() {
  const [kpis, setKpis] = useState<KpisResponse | null>(null);
  const [ordersByHour, setOrdersByHour] = useState<OrdersByHourItem[] | null>(null);
  const [percentis, setPercentis] = useState<PercentisItem[] | null>(null);
  const [lateRate, setLateRate] = useState<LateRateItem[] | null>(null);
  const [scatter, setScatter] = useState<ScatterItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    Promise.allSettled([
      getJson<KpisResponse>("/api/dashboard/ops/kpis"),
      getJson<OrdersByHourResponse>("/api/dashboard/ops/orders_by_hour"),
      getJson<PercentisResponse>("/api/dashboard/ops/percentis_by_macro"),
      getJson<LateRateResponse>("/api/dashboard/ops/late_rate_by_macro"),
      getJson<ScatterResponse>("/api/dashboard/ops/scatter_distance_vs_delivery"),
    ])
      .then((res) => {
        if (!isMounted) return;
        const [k, orders, perc, late, sc] = res;
        if (k.status === "fulfilled") setKpis(k.value);
        if (orders.status === "fulfilled") setOrdersByHour(orders.value.data ?? []);
        if (perc.status === "fulfilled") setPercentis(perc.value.data ?? []);
        if (late.status === "fulfilled") setLateRate(late.value.data ?? []);
        if (sc.status === "fulfilled") setScatter(sc.value.data ?? []);

        const firstRejection = res.find((r) => r.status === "rejected") as PromiseRejectedResult | undefined;
        if (firstRejection) {
          setError(
            "Não foi possível carregar todos os dados (verifique colunas/servidor)."
          );
        }
      })
      .catch(() => {
        if (!isMounted) return;
        setError("Erro ao carregar dados do backend.");
      })
      .finally(() => {
        if (!isMounted) return;
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const percentisSorted = useMemo(() => {
    return (percentis ?? []).slice().sort((a, b) => b.p90 - a.p90);
  }, [percentis]);

  return (
    <div className="text-gray-700 space-y-6">
      <div className="flex items-baseline justify-between">
        <h2 className="text-2xl font-semibold">Desempenho Operacional</h2>
        {loading && <span className="text-sm text-gray-500">Carregando…</span>}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard title="Tempo médio de preparo" value={formatMinutes(kpis?.tempo_medio_preparo)} />
        <KpiCard title="Tempo médio de entrega" value={formatMinutes(kpis?.tempo_medio_entrega)} />
        <KpiCard title="Atraso médio" value={formatMinutes(kpis?.atraso_medio)} />
        <KpiCard title="Distância média" value={kpis ? `${kpis.distancia_media.toFixed(1)} km` : "-"} />
        <KpiCard
          title="Entregas no prazo"
          value={kpis?.on_time_rate_pct !== undefined && !Number.isNaN(kpis?.on_time_rate_pct)
            ? `${kpis.on_time_rate_pct.toFixed(1)}%`
            : "-"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-semibold mb-3">Pedidos por hora do dia</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={ordersByHour ?? []} margin={{ left: 12, right: 12, top: 12, bottom: 12 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" tick={{ fontSize: 12 }} label={{ value: "Hora", position: "insideBottom", dy: 6 }} />
              <YAxis tick={{ fontSize: 12 }} label={{ value: "Pedidos", angle: -90, position: "insideLeft" }} />
              <Tooltip formatter={(v: any) => Number(v)} />
              <Line type="monotone" dataKey="orders" stroke="#7f1d1d" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-semibold mb-3">Tempo de entrega por macro_bairro (p90)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={percentisSorted} margin={{ left: 16, right: 16, top: 12, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="macro_bairro" tick={{ fontSize: 12 }} interval={0} angle={-20} height={50} dy={10} />
              <YAxis tick={{ fontSize: 12 }} label={{ value: "Tempo (min)", angle: -90, position: "insideLeft" }} />
              <Tooltip formatter={(v: any, _n, p: any) => {
                const item = p?.payload as PercentisItem | undefined;
                const parts = [
                  `p90: ${formatMinutes(Number(v))}`,
                  item ? `p75: ${formatMinutes(item.p75)}` : undefined,
                  item ? `p50: ${formatMinutes(item.p50)}` : undefined,
                  item ? `média: ${formatMinutes(item.mean)}` : undefined,
                  item ? `n: ${item.count}` : undefined,
                ].filter(Boolean);
                return [parts.join(" | "), "Detalhes"];
              }} labelFormatter={(l) => `Macro: ${l}`} />
              <Bar dataKey="p90" fill="#0ea5e9" />
            </BarChart>
          </ResponsiveContainer>
          <div className="text-xs text-gray-500 mt-1">Tooltip inclui média, p50, p75, p90 e total (quando disponível).</div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-semibold mb-3">% de atrasos por macro_bairro</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={(lateRate ?? []).slice().sort((a,b)=> b.late_rate - a.late_rate)} layout="vertical" margin={{ left: 24, right: 16, top: 12, bottom: 12 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tickFormatter={(v) => pct(Number(v))} />
              <YAxis type="category" dataKey="macro_bairro" width={140} interval={0} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: any) => pct(Number(v))} labelFormatter={(l) => `Macro: ${l}`} />
              <Bar dataKey="late_rate" fill="#ef4444" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-semibold mb-3">Dispersão: distância x entrega</h3>
          <ResponsiveContainer width="100%" height={260}>
            <ScatterChart margin={{ left: 12, right: 12, top: 12, bottom: 12 }}>
              <CartesianGrid />
              <XAxis type="number" dataKey="distance_km" name="Distância" unit=" km" />
              <YAxis type="number" dataKey="delivery_minutes" name="Entrega" unit=" min" />
              <ZAxis range={[60, 60]} />
              <Tooltip cursor={{ strokeDasharray: "3 3" }} />
              <Legend />
              <Scatter name="Pedidos" data={scatter ?? []} fill="#16a34a" />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="text-sm text-gray-500">{title}</div>
      <div className="text-2xl font-semibold text-gray-900 mt-1">{value}</div>
    </div>
  );
}