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
  BarChart,
  Bar,
  ScatterChart,
  Scatter,
  ZAxis,
  Legend,
} from "recharts";

export type SatisfactionKpis = {
  nivel_medio: number;
  "%_muito_satisfeitos": number;
};

export type ByMacroItem = { macro_bairro: string; avg_satisfacao: number };
export type ByMacroResponse = { data: ByMacroItem[] };

export type ScatterItem = { delivery_minutes: number; satisfacao: number };
export type ScatterResponse = { data: ScatterItem[] };

export type TimeseriesItem = { date: string; avg_satisfacao: number };
export type TimeseriesResponse = { data: TimeseriesItem[] };

export type HeatmapItem = { platform: string; avg_satisfacao: number };
export type HeatmapResponse = { data: HeatmapItem[] };

function formatScore(n?: number) {
  if (n === undefined || Number.isNaN(n)) return "-";
  return n.toFixed(2);
}

function formatPercent(n?: number) {
  if (n === undefined || Number.isNaN(n)) return "-";
  return `${n.toFixed(1)}%`;
}

function platformColor(value: number) {
  // 3 (baixo) -> 5 (alto)
  const clamped = Math.max(3, Math.min(5, value));
  const t = (clamped - 3) / 2; // 0..1
  const r = Math.round(240 - 120 * t);
  const g = Math.round(70 + 150 * t);
  const b = Math.round(90 + 40 * t);
  return `rgb(${r}, ${g}, ${b})`;
}

export default function Satisfaction() {
  const [kpis, setKpis] = useState<SatisfactionKpis | null>(null);
  const [byMacro, setByMacro] = useState<ByMacroItem[]>([]);
  const [scatter, setScatter] = useState<ScatterItem[]>([]);
  const [timeseries, setTimeseries] = useState<TimeseriesItem[]>([]);
  const [heatmap, setHeatmap] = useState<HeatmapItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros amigáveis (UI) - filtros aplicados no frontend
  const [selectedScore, setSelectedScore] = useState<number | "all">("all");
  const [dateRangeDays, setDateRangeDays] = useState<number | "all">(30); // 3, 7, 14, 30, 90 ou "all"
  const [selectedPlatform, setSelectedPlatform] = useState<string | "all">("all");
  const [deliveryStatus, setDeliveryStatus] = useState<"all" | "atrasados" | "no_prazo">("all");
  const [selectedMacro, setSelectedMacro] = useState<string | "all">("all");

  async function fetchAll() {
    try {
      setLoading(true);
      setError(null);

      const [k, m, sc, ts, hm] = await Promise.all([
        getJson<SatisfactionKpis>("/api/dashboard/satisfaction/kpis"),
        getJson<ByMacroResponse>("/api/dashboard/satisfaction/by_macro_bairro", {
          macro_col: "macro_bairro",
          score_col: "satisfacao_nivel",
        }),
        getJson<ScatterResponse>("/api/dashboard/satisfaction/scatter_time_vs_score", {
          delivery_col: "actual_delivery_minutes",
          score_col: "satisfacao_nivel",
        }),
        getJson<TimeseriesResponse>("/api/dashboard/satisfaction/timeseries", {
          date_col: "order_date",
          score_col: "satisfacao_nivel",
          freq: "M",
        }),
        getJson<HeatmapResponse>("/api/dashboard/satisfaction/heatmap_platform", {
          platform_col: "platform",
          score_col: "satisfacao_nivel",
        }),
      ]);

      setKpis(k);
      setByMacro(m.data ?? []);
      setScatter(sc.data ?? []);
      setTimeseries(ts.data ?? []);
      setHeatmap(hm.data ?? []);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao carregar dados";
      setError(msg.includes("HTTP 400") ? "Alguma coluna informada não existe. Verifique os parâmetros." : msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Listas dinâmicas para filtros (plataformas e macrobairros)
  const platformList = useMemo(() => Array.from(new Set(heatmap.map((p) => p.platform))), [heatmap]);
  const macroList = useMemo(() => Array.from(new Set(byMacro.map((m) => m.macro_bairro))), [byMacro]);

  // Dados filtrados no frontend
  const filteredTimeseries = useMemo(() => {
    if (dateRangeDays === "all") return timeseries;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - dateRangeDays);
    return timeseries.filter((t) => new Date(t.date) >= cutoff);
  }, [timeseries, dateRangeDays]);

  const filteredScatter = useMemo(() => {
    const threshold = 30; // min para considerar atrasado (ajustável)
    return scatter.filter((s) => {
      const byScore = selectedScore === "all" ? true : Math.round(s.satisfacao) === selectedScore;
      const byStatus =
        deliveryStatus === "all"
          ? true
          : deliveryStatus === "atrasados"
          ? s.delivery_minutes > threshold
          : s.delivery_minutes <= threshold;
      return byScore && byStatus;
    });
  }, [scatter, selectedScore, deliveryStatus]);

  const filteredByMacro = useMemo(() => {
    if (selectedMacro === "all") return byMacro;
    return byMacro.filter((m) => m.macro_bairro === selectedMacro);
  }, [byMacro, selectedMacro]);

  const filteredHeatmap = useMemo(() => {
    if (selectedPlatform === "all") return heatmap;
    return heatmap.filter((p) => p.platform === selectedPlatform);
  }, [heatmap, selectedPlatform]);

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between">
        <h2 className="text-2xl font-semibold">Satisfação do Cliente</h2>
        {loading && <span className="text-sm text-gray-500">Carregando…</span>}
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded">{error}</div>}

      {kpis && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard title="Nível médio" value={formatScore(kpis.nivel_medio)} />
          <KpiCard title="% muito satisfeitos" value={formatPercent(kpis["%_muito_satisfeitos"]) } />
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Nota de satisfação */}
          <div>
            <label className="block text-sm text-gray-600 mb-1">Nota de satisfação</label>
            <select value={String(selectedScore)} onChange={(e) => setSelectedScore(e.target.value === "all" ? "all" : Number(e.target.value))} className="w-full border rounded px-2 py-2">
              <option value="all">Todas</option>
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
              <option value="5">5</option>
            </select>
          </div>

          {/* Intervalo de datas */}
          <div>
            <label className="block text-sm text-gray-600 mb-1">Período</label>
            <select
              value={String(dateRangeDays)}
              onChange={(e) => setDateRangeDays(e.target.value === "all" ? "all" : Number(e.target.value))}
              className="w-full border rounded px-2 py-2"
            >
              <option value="all">Todos</option>
              <option value="3">Últimos 3 dias</option>
              <option value="7">Última semana</option>
              <option value="14">Últimas 2 semanas</option>
              <option value="30">Último mês</option>
              <option value="90">Últimos 3 meses</option>
            </select>
          </div>

          {/* Status de entrega */}
          <div>
            <label className="block text-sm text-gray-600 mb-1">Entrega</label>
            <select value={deliveryStatus} onChange={(e) => setDeliveryStatus(e.target.value as any)} className="w-full border rounded px-2 py-2">
              <option value="all">Todas</option>
              <option value="atrasados">Atrasados</option>
              <option value="no_prazo">No prazo</option>
            </select>
          </div>

          {/* Plataformas (dropdown) */}
          <div>
            <label className="block text-sm text-gray-600 mb-1">Plataforma</label>
            <select value={selectedPlatform} onChange={(e) => setSelectedPlatform(e.target.value)} className="w-full border rounded px-2 py-2">
              <option value="all">Todas</option>
              {platformList.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          {/* Macro-bairros (dropdown) */}
          <div>
            <label className="block text-sm text-gray-600 mb-1">Macro-bairro</label>
            <select value={selectedMacro} onChange={(e) => setSelectedMacro(e.target.value)} className="w-full border rounded px-2 py-2">
              <option value="all">Todos</option>
              {macroList.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-semibold mb-3">Satisfação média por macro_bairro</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={filteredByMacro}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="macro_bairro" interval={0} angle={-20} textAnchor="end" height={60} />
              <YAxis domain={[0, 5]} />
              <Tooltip formatter={(v: any) => formatScore(Number(v))} />
              <Bar dataKey="avg_satisfacao" fill="#16a34a" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-semibold mb-3">Tempo de entrega × satisfação</h3>
          <ResponsiveContainer width="100%" height={260}>
            <ScatterChart margin={{ left: 12, right: 12, top: 12, bottom: 12 }}>
              <CartesianGrid />
              <XAxis type="number" dataKey="delivery_minutes" name="Entrega" unit=" min" />
              <YAxis type="number" dataKey="satisfacao" name="Satisfação" domain={[0, 5]} />
              <ZAxis range={[60, 60]} />
              <Tooltip cursor={{ strokeDasharray: "3 3" }} />
              <Legend />
              <Scatter name="Pedidos" data={filteredScatter} fill="#2563eb" />
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-semibold mb-3">Série temporal da satisfação</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={filteredTimeseries}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis domain={[0, 5]} />
              <Tooltip formatter={(v: any) => formatScore(Number(v))} />
              <Line type="monotone" dataKey="avg_satisfacao" stroke="#0ea5e9" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-semibold mb-3">Satisfação média por plataforma</h3>
          {filteredHeatmap && filteredHeatmap.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {filteredHeatmap.map((p) => (
                <div key={p.platform} className="rounded p-3 text-white text-sm" style={{ backgroundColor: platformColor(p.avg_satisfacao) }}>
                  <div className="font-medium">{p.platform}</div>
                  <div className="opacity-90">{formatScore(p.avg_satisfacao)}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-gray-500">Sem dados.</div>
          )}
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

