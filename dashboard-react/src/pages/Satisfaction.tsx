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

function formatDateLabel(d?: Date | null) {
  if (!d) return "-";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(d);
}

function getPercentMuitoSatisfeitos(k: SatisfactionKpis | null): number | undefined {
  if (!k) return undefined;
  // Backend pode enviar "%muito_satisfeitos" ou "%_muito_satisfeitos"
  // Tente ambas as chaves para compatibilidade.
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore - chave com símbolo %
  const v1 = k["%muito_satisfeitos"] as number | undefined;
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore - chave com símbolo % e underscore
  const v2 = k["%_muito_satisfeitos"] as number | undefined;
  return v1 ?? v2;
}

export default function Satisfaction() {
  const [kpis, setKpis] = useState<SatisfactionKpis | null>(null);
  const [byMacro, setByMacro] = useState<ByMacroItem[]>([]);
  const [scatter, setScatter] = useState<ScatterItem[]>([]);
  const [timeseries, setTimeseries] = useState<TimeseriesItem[]>([]);
  const [heatmap, setHeatmap] = useState<HeatmapItem[]>([]);
  const [datasetStart, setDatasetStart] = useState<Date | null>(null);
  const [datasetEnd, setDatasetEnd] = useState<Date | null>(null);
  const [metaPlatforms, setMetaPlatforms] = useState<string[]>([]);
  const [metaMacros, setMetaMacros] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros amigáveis (UI) - filtros aplicados no frontend
  const [selectedScore, setSelectedScore] = useState<number | "all">("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [selectedPlatform, setSelectedPlatform] = useState<string | "all">("all");
  const [deliveryStatus, setDeliveryStatus] = useState<"all" | "atrasado" | "no_prazo">("all");
  const [selectedMacro, setSelectedMacro] = useState<string | "all">("all");

  async function fetchAll() {
    try {
      setLoading(true);
      setError(null);

      const params: Record<string, any> = {};
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      if (selectedPlatform !== "all") params.platform = [selectedPlatform];
      if (selectedMacro !== "all") params.macro_bairro = [selectedMacro];
      if (selectedScore !== "all") {
        params.score_min = selectedScore;
        params.score_max = selectedScore;
      }
      if (deliveryStatus !== "all") params.delivery_status = deliveryStatus;

      // Escolha dinâmica de frequência da série temporal baseada no intervalo selecionado
      let freqParam: "D" | "W" | "M" = "M";
      if (startDate && endDate) {
        const msPerDay = 24 * 60 * 60 * 1000;
        const rangeDays = Math.max(1, Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / msPerDay));
        if (rangeDays <= 45) freqParam = "D"; else if (rangeDays <= 180) freqParam = "W"; else freqParam = "M";
      }

      const [kOverview, metaPlats, metaMacs, k, m, sc, ts, hm] = await Promise.all([
        getJson<{ total_pedidos: number; receita_total: number; ticket_medio: number; periodo: { min: string; max: string } | null }>(
          "/api/dashboard/overview/kpis"
        ),
        getJson<{ data: string[] }>("/api/dashboard/meta/platforms"),
        getJson<{ data: string[] }>("/api/dashboard/meta/macros"),
        getJson<SatisfactionKpis>("/api/dashboard/satisfaction/kpis", params),
        getJson<ByMacroResponse>("/api/dashboard/satisfaction/by_macro_bairro", params),
        getJson<ScatterResponse>("/api/dashboard/satisfaction/scatter_time_vs_score", params),
        getJson<TimeseriesResponse>("/api/dashboard/satisfaction/timeseries", { ...params, freq: freqParam }),
        getJson<HeatmapResponse>("/api/dashboard/satisfaction/heatmap_platform", params),
      ]);

      // Definir intervalo do dataset a partir do overview.kpis.periodo
      if (kOverview && (kOverview as any).periodo) {
        const p = (kOverview as any).periodo as { min: string; max: string };
        if (p?.min && p?.max) {
          setDatasetStart(new Date(p.min));
          setDatasetEnd(new Date(p.max));
          // Inicializar inputs se vazios
          if (!startDate) setStartDate(p.min.substring(0, 10));
          if (!endDate) setEndDate(p.max.substring(0, 10));
        }
      }

      setMetaPlatforms(metaPlats.data ?? []);
      setMetaMacros(metaMacs.data ?? []);
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

  const platformList = useMemo(() => metaPlatforms, [metaPlatforms]);
  const macroList = useMemo(() => metaMacros, [metaMacros]);

  const filteredTimeseries = useMemo(() => timeseries, [timeseries]);

  const filteredScatter = useMemo(() => scatter, [scatter]);

  const filteredByMacro = useMemo(() => byMacro, [byMacro]);

  const filteredHeatmap = useMemo(() => heatmap, [heatmap]);

  // Período absoluto via início/fim; dropdown de período removido conforme solicitação

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between">
        <h2 className="text-2xl font-semibold">Satisfação do Cliente</h2>
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
          <KpiCard title="Nível médio" value={formatScore(kpis.nivel_medio)} />
          <KpiCard title="% muito satisfeitos" value={formatPercent(getPercentMuitoSatisfeitos(kpis)) } />
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
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

          

          <div>
            <label className="block text-sm text-gray-600 mb-1">Início</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full border rounded px-2 py-2" />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Fim</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full border rounded px-2 py-2" />
          </div>

          {/* Status de entrega */}
          <div>
            <label className="block text-sm text-gray-600 mb-1">Entrega</label>
            <select value={deliveryStatus} onChange={(e) => setDeliveryStatus(e.target.value as any)} className="w-full border rounded px-2 py-2">
              <option value="all">Todas</option>
              <option value="atrasado">Atrasados</option>
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
        <div className="mt-3 flex gap-2">
          <button onClick={fetchAll} disabled={loading} className={`px-3 py-2 rounded border ${loading ? "bg-gray-300 text-gray-600" : "bg-gray-900 text-white"}`}>
            {loading ? "Aplicando…" : "Aplicar filtros"}
          </button>
          <button
            onClick={() => {
              setSelectedScore("all");
              setSelectedPlatform("all");
              setSelectedMacro("all");
              setDeliveryStatus("all");
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
            <LineChart data={filteredTimeseries.map((d) => ({ ...d, date: parseDateString(d.date) }))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tickFormatter={(v) => new Intl.DateTimeFormat("pt-BR").format(v)} />
              <YAxis domain={[0, 5]} />
              <Tooltip labelFormatter={(v) => new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(v as Date)} formatter={(v: any) => formatScore(Number(v))} />
              <Line type="monotone" dataKey="avg_satisfacao" stroke="#0ea5e9" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-semibold mb-3">Satisfação média por plataforma</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={[...filteredHeatmap].sort((a, b) => b.avg_satisfacao - a.avg_satisfacao)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="platform" interval={0} angle={-20} textAnchor="end" height={60} />
              <YAxis domain={[0, 5]} />
              <Tooltip formatter={(v: any) => formatScore(Number(v))} />
              <Bar dataKey="avg_satisfacao" fill="#16a34a" />
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

