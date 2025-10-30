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
  ComposedChart,
  Bar,
  ErrorBar,
} from "recharts";

type KpisResponse = {
  tempo_medio_preparo: number;
  tempo_medio_entrega: number;
  atraso_medio: number;
  distancia_media: number;
};

type TimeSeriesItem = { date: string; avg_delivery_minutes: number };
type TimeSeriesResponse = { data: TimeSeriesItem[] };

type BoxplotItem = { macro_bairro: string; values: number[] };
type BoxplotResponse = { data: BoxplotItem[] };

type HeatmapItem = { macro_bairro: string; avg_delay: number };
type HeatmapResponse = { data: HeatmapItem[] };

type ScatterItem = { distance_km: number; delivery_minutes: number };
type ScatterResponse = { data: ScatterItem[] };

function formatMinutes(value?: number) {
  if (value === undefined || Number.isNaN(value)) return "-";
  return `${value.toFixed(1)} min`;
}

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
  return {
    min: sorted[0],
    q1: q(0.25),
    median: q(0.5),
    q3: q(0.75),
    max: sorted[sorted.length - 1],
  };
}

function delayColorScale(value: number) {
  // 0 (verde) -> 10+ (vermelho)
  const v = Math.max(0, Math.min(10, value)) / 10;
  const r = Math.round(255 * v);
  const g = Math.round(200 * (1 - v));
  return `rgb(${r}, ${g}, 80)`;
}

export default function Ops() {
  const [kpis, setKpis] = useState<KpisResponse | null>(null);
  const [series, setSeries] = useState<TimeSeriesItem[] | null>(null);
  const [boxplot, setBoxplot] = useState<BoxplotItem[] | null>(null);
  const [heatmap, setHeatmap] = useState<HeatmapItem[] | null>(null);
  const [scatter, setScatter] = useState<ScatterItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    Promise.allSettled([
      getJson<KpisResponse>("/api/dashboard/ops/kpis"),
      getJson<TimeSeriesResponse>("/api/dashboard/ops/timeseries_delivery"),
      getJson<BoxplotResponse>("/api/dashboard/ops/boxplot_delivery_by_macro"),
      getJson<HeatmapResponse>("/api/dashboard/ops/heatmap_delay_by_macro"),
      getJson<ScatterResponse>("/api/dashboard/ops/scatter_distance_vs_delivery"),
    ])
      .then((res) => {
        if (!isMounted) return;
        const [k, s, b, h, sc] = res;
        if (k.status === "fulfilled") setKpis(k.value);
        if (s.status === "fulfilled") setSeries(s.value.data ?? []);
        if (b.status === "fulfilled") setBoxplot(b.value.data ?? []);
        if (h.status === "fulfilled") setHeatmap(h.value.data ?? []);
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

  const boxplotData = useMemo(() => {
    if (!boxplot) return [] as Array<{
      macro_bairro: string;
      min: number; q1: number; median: number; q3: number; max: number;
    }>;
    return boxplot.map((d) => ({ macro_bairro: d.macro_bairro, ...quantiles(d.values) }));
  }, [boxplot]);

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

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Tempo médio de preparo" value={formatMinutes(kpis?.tempo_medio_preparo)} />
        <KpiCard title="Tempo médio de entrega" value={formatMinutes(kpis?.tempo_medio_entrega)} />
        <KpiCard title="Atraso médio" value={formatMinutes(kpis?.atraso_medio)} />
        <KpiCard title="Distância média" value={kpis ? `${kpis.distancia_media.toFixed(1)} km` : "-"} />
      </div>

      {/* Charts em grade 2x2 como Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-semibold mb-3">Série temporal de entrega</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={series ?? []} margin={{ left: 12, right: 12, top: 12, bottom: 12 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} label={{ value: "Min", angle: -90, position: "insideLeft" }} />
              <Tooltip formatter={(v: any) => formatMinutes(Number(v).valueOf())} />
              <Line type="monotone" dataKey="avg_delivery_minutes" stroke="#2563eb" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-semibold mb-3">Boxplot por macro_bairro</h3>
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={boxplotData} margin={{ left: 16, right: 16, top: 12, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="macro_bairro" tick={{ fontSize: 12 }} interval={0} angle={-20} height={50} dy={10} />
              <YAxis tick={{ fontSize: 12 }} label={{ value: "Min", angle: -90, position: "insideLeft" }} />
              <Tooltip
                formatter={(v: any, name) => [formatMinutes(Number(v).valueOf()), name]}
                labelFormatter={(l) => `Macro: ${l}`}
              />
              <Bar dataKey="median" name="Mediana" fill="#0ea5e9" barSize={18}>
                <ErrorBar
                  dataKey={(d: any) => [Math.max(0, d.median - d.q1), Math.max(0, d.q3 - d.median)]}
                  width={6}
                  stroke="#1f2937"
                  direction="y"
                />
              </Bar>
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-semibold mb-3">Heatmap de atraso por macro_bairro</h3>
          {heatmap && heatmap.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {heatmap.map((h) => (
                <div
                  key={h.macro_bairro}
                  className="rounded p-3 text-white text-sm flex flex-col"
                  style={{ backgroundColor: delayColorScale(h.avg_delay) }}
                >
                  <span className="font-medium">{h.macro_bairro}</span>
                  <span className="opacity-90">{formatMinutes(h.avg_delay)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-gray-500">Sem dados.</div>
          )}
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

// Boxplot completo exigiria desenho customizado. Aqui usamos mediana + IQR via ErrorBar.

