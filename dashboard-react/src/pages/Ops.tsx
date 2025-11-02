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

type DeliveryByWeekdayItem = { weekday: string | number; values: number[] };
type DeliveryByWeekdayResponse = { data: DeliveryByWeekdayItem[] };

type AvgDeliveryByHourItem = { hour: number; avg_delivery_minutes: number };
type AvgDeliveryByHourResponse = { data: AvgDeliveryByHourItem[] };

type HeatmapHourWeekdayItem = { hour: number; weekday: string | number; value: number };
type HeatmapHourWeekdayResponse = { data: HeatmapHourWeekdayItem[] };

type LateRateByPlatformItem = { platform: string; late_count: number; on_time_count: number; late_rate: number };
type LateRateByPlatformResponse = { data: LateRateByPlatformItem[] };

type ScatterItem = { distance_km: number; delivery_minutes: number };
type ScatterResponse = { data: ScatterItem[] };

function formatMinutes(value?: number) {
  if (value === undefined || Number.isNaN(value)) return "-";
  return `${value.toFixed(1)} min`;
}

function pct(n: number) { return `${(n * 100).toFixed(1)}%`; }

function quantiles(values: number[]) {
  if (!values.length) return { min: 0, q1: 0, median: 0, q3: 0, max: 0 };
  const sorted = [...values].sort((a, b) => a - b);
  const q = (p: number) => {
    const idx = (sorted.length - 1) * p;
    const lo = Math.floor(idx);
    const hi = Math.ceil(idx);
    if (lo === hi) return sorted[lo];
    return sorted[lo] * (hi - idx) + sorted[hi] * (idx - lo);
  };
  return { min: sorted[0], q1: q(0.25), median: q(0.5), q3: q(0.75), max: sorted[sorted.length - 1] };
}

function formatWeekday(wd: string | number): string {
  if (typeof wd === "number") {
    const dias = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    return dias[wd] ?? String(wd);
  }
  const lower = wd.toLowerCase();
  if (lower.startsWith("dom")) return "Dom";
  if (lower.startsWith("seg")) return "Seg";
  if (lower.startsWith("ter")) return "Ter";
  if (lower.startsWith("qua")) return "Qua";
  if (lower.startsWith("qui")) return "Qui";
  if (lower.startsWith("sex")) return "Sex";
  if (lower.startsWith("sab") || lower.startsWith("sáb")) return "Sáb";
  return wd;
}

function heatmapColor(value: number, min: number, max: number) {
  const t = (value - min) / (max - min || 1);
  const r = Math.round(255 * (1 - t * 0.5));
  const g = Math.round(200 + 55 * t);
  return `rgb(${r}, ${g}, 80)`;
}

export default function Ops() {
  const [kpis, setKpis] = useState<KpisResponse | null>(null);
  const [ordersByHour, setOrdersByHour] = useState<OrdersByHourItem[] | null>(null);
  const [percentis, setPercentis] = useState<PercentisItem[] | null>(null);
  const [lateRate, setLateRate] = useState<LateRateItem[] | null>(null);
  const [deliveryByWeekday, setDeliveryByWeekday] = useState<DeliveryByWeekdayItem[] | null>(null);
  const [avgDeliveryByHour, setAvgDeliveryByHour] = useState<AvgDeliveryByHourItem[] | null>(null);
  const [heatmapHourWeekday, setHeatmapHourWeekday] = useState<HeatmapHourWeekdayItem[] | null>(null);
  const [lateRateByPlatform, setLateRateByPlatform] = useState<LateRateByPlatformItem[] | null>(null);
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
      getJson<DeliveryByWeekdayResponse>("/api/dashboard/ops/delivery_by_weekday"),
      getJson<AvgDeliveryByHourResponse>("/api/dashboard/ops/avg_delivery_by_hour"),
      getJson<HeatmapHourWeekdayResponse>("/api/dashboard/ops/heatmap_hour_weekday"),
      getJson<LateRateByPlatformResponse>("/api/dashboard/ops/late_rate_by_platform"),
    ])
      .then((res) => {
        if (!isMounted) return;
        const [k, orders, perc, late, weekday, hour, heatmap, platform] = res;
        if (k.status === "fulfilled") setKpis(k.value);
        if (orders.status === "fulfilled") setOrdersByHour(orders.value.data ?? []);
        if (perc.status === "fulfilled") setPercentis(perc.value.data ?? []);
        if (late.status === "fulfilled") setLateRate(late.value.data ?? []);
        if (weekday.status === "fulfilled") setDeliveryByWeekday(weekday.value.data ?? []);
        if (hour.status === "fulfilled") setAvgDeliveryByHour(hour.value.data ?? []);
        if (heatmap.status === "fulfilled") setHeatmapHourWeekday(heatmap.value.data ?? []);
        if (platform.status === "fulfilled") setLateRateByPlatform(platform.value.data ?? []);

        const firstRejection = res.find((r) => r.status === "rejected") as PromiseRejectedResult | undefined;
        if (firstRejection) {
          setError(
            "Não foi possível carregar todos os dados (verifique colunas/servidor)."
          );
        }
      })
      .catch((e) => {
        if (!isMounted) return;
        console.error("[Ops] Erro geral:", e);
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
          <h3 className="font-semibold mb-3">Tempo de entrega por dia da semana</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={useMemo(() => {
              if (!deliveryByWeekday) return [];
              return deliveryByWeekday.map((d) => ({
                weekday: formatWeekday(d.weekday),
                ...quantiles(d.values),
              }));
            }, [deliveryByWeekday])}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="weekday" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} label={{ value: "Tempo (min)", angle: -90, position: "insideLeft" }} />
              <Tooltip formatter={(v: any) => formatMinutes(Number(v))} />
              <Bar dataKey="median" name="Mediana" fill="#8b5cf6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Seção adicional: gráficos de análise temporal */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-semibold mb-3">Tempo médio de entrega por hora</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={avgDeliveryByHour ?? []} margin={{ left: 12, right: 12, top: 12, bottom: 12 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" tick={{ fontSize: 12 }} label={{ value: "Hora", position: "insideBottom", dy: 6 }} />
              <YAxis tick={{ fontSize: 12 }} label={{ value: "Tempo (min)", angle: -90, position: "insideLeft" }} />
              <Tooltip formatter={(v: any) => formatMinutes(Number(v))} />
              <Line type="monotone" dataKey="avg_delivery_minutes" stroke="#2563eb" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-semibold mb-3">Ranking: % de atrasos por plataforma</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={[...(lateRateByPlatform ?? [])].sort((a, b) => b.late_rate - a.late_rate)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="platform" interval={0} angle={-20} textAnchor="end" height={60} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => pct(Number(v))} label={{ value: "% de atrasos", angle: -90, position: "insideLeft" }} />
              <Tooltip formatter={(v: any) => pct(Number(v))} />
              <Bar dataKey="late_rate" fill="#ef4444" />
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
      <div className="text-sm text-gray-500">{title}</div>
      <div className="text-2xl font-semibold text-gray-900 mt-1">{value}</div>
    </div>
  );
}