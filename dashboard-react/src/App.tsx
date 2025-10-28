import React, { useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Filter, RefreshCcw, Upload } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
} from "recharts";
import * as XLSX from "xlsx";

// === Types ===
interface DataRow {
  order_datetime: Date | null;
  macro_bairro: string | null;
  nome_cliente: string | null;
  bairro_destino: string | null;
  platform: string | null;
  order_mode: string | null;
  status: string | null;
  classe_pedido: string | null;
  distance_km: number | null;
  tempo_preparo_minutos: number | null;
  eta_minutes_quote: number | null;
  actual_delivery_minutes: number | null;
  total_brl: number | null;
  platform_commission_pct: number | null;
  num_itens: number | null;
  satisfacao_nivel: number | null;
  [key: string]: any;
}

interface Selects {
  macro_bairro: string[];
  platform: string[];
  order_mode: string[];
  status: string[];
  classe_pedido: string[];
}

interface KPIs {
  n: number;
  receita: number;
  tempoMedio: number;
  satisfMed: number;
}

interface ByDayData {
  day: string;
  pedidos: number;
  receita: number;
}

interface TempoPorMacroData {
  macro_bairro: string;
  media_tempo: number;
  [key: string]: any;
}

interface PlataformaData {
  name: string;
  value: number;
  [key: string]: any;
}

interface SatisfPorPlataformaData {
  platform: string;
  satisf_media: number;
  [key: string]: any;
}

interface ScatterData {
  x: number;
  y: number;
  [key: string]: any;
}

interface EtaVsActualData {
  platform: string;
  eta: number;
  actual: number;
  [key: string]: any;
}

interface FeatureCard {
  key: string;
  min?: number;
  p50?: number;
  p90?: number;
  max?: number;
  mean?: number;
  spark?: { day: string; v: number }[];
  top?: { name: string; count: number }[];
}

// === Helper utils ===
const parseDate = (v: any): Date | null => {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
};

const number = (v: any): number | null => {
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(",", "."));
  return isNaN(n) ? null : n;
};

const fmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

const NUMERIC_KEYS = [
  "distance_km",
  "tempo_preparo_minutos",
  "eta_minutes_quote",
  "actual_delivery_minutes",
  "total_brl",
  "platform_commission_pct",
  "num_itens",
  "satisfacao_nivel",
];

const CATEG_KEYS = [
  "macro_bairro",
  "nome_cliente",
  "bairro_destino",
  "platform",
  "order_mode",
  "status",
  "classe_pedido",
];

const DATE_KEYS = ["order_datetime"]; // esperado na base

// Palette – neutra; você pode adaptar para a paleta vermelha que você curte
const COLORS = [
  "#8B0000",
  "#A52A2A",
  "#B22222",
  "#DC143C",
  "#FF4500",
  "#CD5C5C",
  "#F08080",
  "#FF7F50",
  "#FF6347",
  "#FFA07A",
];

export default function DashboardKaiserhaus() {
  const [rawRows, setRawRows] = useState<DataRow[]>([]);
  const [filtered, setFiltered] = useState<DataRow[]>([]);

  // Filters state
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [macroBairro, setMacroBairro] = useState("ALL");
  const [platform, setPlatform] = useState("ALL");
  const [orderMode, setOrderMode] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [classePedido, setClassePedido] = useState("ALL");

  const fileRef = useRef<HTMLInputElement>(null);

  // Parse file
  const onFile = async (file: File | undefined) => {
    if (!file) return;
    const data = await file.arrayBuffer();
    const wb = XLSX.read(data, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { defval: null });

    // Normalize keys (strip spaces, lower)
    const normalized: DataRow[] = rows.map((r: any) => {
      const o: any = {};
      Object.keys(r).forEach((k) => {
        const key = String(k).trim();
        o[key] = r[k];
      });
      // Cast types
      if (o.order_datetime) o.order_datetime = parseDate(o.order_datetime);
      NUMERIC_KEYS.forEach((k) => {
        if (k in o) o[k] = number(o[k]);
      });
      return o as DataRow;
    });
    setRawRows(normalized);
  };

  const resetFilters = () => {
    setDateFrom("");
    setDateTo("");
    setMacroBairro("ALL");
    setPlatform("ALL");
    setOrderMode("ALL");
    setStatus("ALL");
    setClassePedido("ALL");
  };

  // Apply filters
  useEffect(() => {
    let data = [...rawRows];
    if (dateFrom) {
      const d0 = new Date(dateFrom);
      data = data.filter((r) => r.order_datetime && r.order_datetime >= d0);
    }
    if (dateTo) {
      const d1 = new Date(dateTo);
      data = data.filter((r) => r.order_datetime && r.order_datetime <= d1);
    }
    if (macroBairro !== "ALL") data = data.filter((r) => r.macro_bairro === macroBairro);
    if (platform !== "ALL") data = data.filter((r) => r.platform === platform);
    if (orderMode !== "ALL") data = data.filter((r) => r.order_mode === orderMode);
    if (status !== "ALL") data = data.filter((r) => r.status === status);
    if (classePedido !== "ALL") data = data.filter((r) => r.classe_pedido === classePedido);
    setFiltered(data);
  }, [rawRows, dateFrom, dateTo, macroBairro, platform, orderMode, status, classePedido]);

  // Distinct lists for dropdowns
  const selects = useMemo((): Selects => {
    const uniq = (arr: DataRow[], key: string) => Array.from(new Set(arr.map((r) => r[key]).filter(Boolean))) as string[];
    return {
      macro_bairro: uniq(rawRows, "macro_bairro").sort(),
      platform: uniq(rawRows, "platform").sort(),
      order_mode: uniq(rawRows, "order_mode").sort(),
      status: uniq(rawRows, "status").sort(),
      classe_pedido: uniq(rawRows, "classe_pedido").sort(),
    };
  }, [rawRows]);

  // KPIs
  const kpis = useMemo((): KPIs => {
    const n = filtered.length;
    const receita = filtered.reduce((s, r) => s + (r.total_brl || 0), 0);
    const tempoMedio = filtered.reduce((s, r) => s + (r.actual_delivery_minutes || 0), 0) / (n || 1);
    const satisfMed = filtered.reduce((s, r) => s + (r.satisfacao_nivel || 0), 0) / (n || 1);
    return { n, receita, tempoMedio, satisfMed };
  }, [filtered]);

  // Timeseries: pedidos por dia + receita
  const byDay = useMemo((): ByDayData[] => {
    const map = new Map<string, ByDayData>();
    filtered.forEach((r) => {
      if (!r.order_datetime) return;
      const key = r.order_datetime.toISOString().slice(0, 10);
      const cur = map.get(key) || { day: key, pedidos: 0, receita: 0 };
      cur.pedidos += 1;
      cur.receita += r.total_brl || 0;
      map.set(key, cur);
    });
    return Array.from(map.values()).sort((a, b) => (a.day < b.day ? -1 : 1));
  }, [filtered]);

  // Barras: Tempo de entrega médio por macro_bairro (top 12)
  const tempoPorMacro = useMemo((): TempoPorMacroData[] => {
    const map = new Map<string, { macro_bairro: string; media_tempo: number; n: number }>();
    filtered.forEach((r) => {
      const k = r.macro_bairro || "—";
      const cur = map.get(k) || { macro_bairro: k, media_tempo: 0, n: 0 };
      if (r.actual_delivery_minutes != null) {
        cur.media_tempo += r.actual_delivery_minutes;
        cur.n += 1;
      }
      map.set(k, cur);
    });
    const arr = Array.from(map.values()).map((o) => ({
      macro_bairro: o.macro_bairro,
      media_tempo: o.n ? o.media_tempo / o.n : 0,
    }));
    return arr.sort((a, b) => b.media_tempo - a.media_tempo).slice(0, 12);
  }, [filtered]);

  // Pie: participação por plataforma
  const plataformas = useMemo((): PlataformaData[] => {
    const map = new Map<string, number>();
    filtered.forEach((r) => {
      const k = r.platform || "—";
      map.set(k, (map.get(k) || 0) + 1);
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [filtered]);

  // Bars: satisfação média por plataforma
  const satisfPorPlataforma = useMemo((): SatisfPorPlataformaData[] => {
    const map = new Map<string, { platform: string; soma: number; n: number }>();
    filtered.forEach((r) => {
      const k = r.platform || "—";
      const cur = map.get(k) || { platform: k, soma: 0, n: 0 };
      if (r.satisfacao_nivel != null) {
        cur.soma += r.satisfacao_nivel;
        cur.n += 1;
      }
      map.set(k, cur);
    });
    return Array.from(map.values()).map((o) => ({ platform: o.platform, satisf_media: o.n ? o.soma / o.n : 0 }));
  }, [filtered]);

  // Scatter: distance vs tempo de entrega
  const scatterDistTempo = useMemo((): ScatterData[] => {
    return filtered
      .filter((r) => r.distance_km != null && r.actual_delivery_minutes != null)
      .map((r) => ({ x: r.distance_km!, y: r.actual_delivery_minutes! }));
  }, [filtered]);

  // Composed: ETA vs Actual (média por plataforma)
  const etaVsActual = useMemo((): EtaVsActualData[] => {
    const map = new Map<string, { platform: string; eta: number; actual: number; n: number }>();
    filtered.forEach((r) => {
      const k = r.platform || "—";
      const cur = map.get(k) || { platform: k, eta: 0, actual: 0, n: 0 };
      if (r.eta_minutes_quote != null) cur.eta += r.eta_minutes_quote;
      if (r.actual_delivery_minutes != null) cur.actual += r.actual_delivery_minutes;
      cur.n += 1;
      map.set(k, cur);
    });
    return Array.from(map.values()).map((o) => ({ platform: o.platform, eta: o.n ? o.eta / o.n : 0, actual: o.n ? o.actual / o.n : 0 }));
  }, [filtered]);

  // === Feature analysis cards (auto) ===
  const featureCards = useMemo((): FeatureCard[] => {
    const cards: FeatureCard[] = [];

    // Numeric features: resumo + mini sparkline
    NUMERIC_KEYS.forEach((key) => {
      const vals = filtered.map((r) => r[key]).filter((v) => v != null);
      if (vals.length === 0) return;
      const sum = vals.reduce((s, v) => s + v, 0);
      const mean = sum / vals.length;
      const sorted = [...vals].sort((a, b) => a - b);
      const p50 = sorted[Math.floor(0.5 * (sorted.length - 1))];
      const p90 = sorted[Math.floor(0.9 * (sorted.length - 1))];
      const min = sorted[0];
      const max = sorted[sorted.length - 1];

      // small timeseries by day for that metric (mean)
      const byD = new Map();
      filtered.forEach((r) => {
        if (!r.order_datetime || r[key] == null) return;
        const d = r.order_datetime.toISOString().slice(0, 10);
        const cur = byD.get(d) || { day: d, sum: 0, n: 0 };
        cur.sum += r[key];
        cur.n += 1;
        byD.set(d, cur);
      });
      const spark = Array.from(byD.values())
        .map((o) => ({ day: o.day, v: o.n ? o.sum / o.n : 0 }))
        .sort((a, b) => (a.day < b.day ? -1 : 1));

      cards.push({ key, min, p50, p90, max, mean, spark });
    });

    // Categorical features: top categorias
    CATEG_KEYS.forEach((key) => {
      const map = new Map();
      filtered.forEach((r) => {
        const k = r[key];
        if (!k) return;
        map.set(k, (map.get(k) || 0) + 1);
      });
      const arr = Array.from(map.entries()).map(([name, count]) => ({ name, count }));
      const top = arr.sort((a, b) => b.count - a.count).slice(0, 5);
      if (arr.length) cards.push({ key, top });
    });

    return cards;
  }, [filtered]);

  const downloadFilteredCSV = () => {
    const ws = XLSX.utils.json_to_sheet(filtered);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "filtered");
    const blob = new Blob([XLSX.write(wb, { type: "array", bookType: "xlsx" })], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "kaiserhaus_filtrado.xlsx";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen p-6 bg-white">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard — Kaiserhaus</h1>
            <p className="text-sm text-gray-600">Carregue o arquivo Excel (.xlsx) da base e utilize os filtros para explorar métricas de satisfação, entrega, receita e mais.</p>
          </div>
          <div className="flex items-center gap-2">
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
            <Button onClick={() => fileRef.current?.click()} className="gap-2"><Upload className="w-4 h-4"/> Carregar base</Button>
            <Button variant="outline" onClick={resetFilters} className="gap-2"><RefreshCcw className="w-4 h-4"/> Limpar filtros</Button>
            <Button variant="secondary" onClick={downloadFilteredCSV} className="gap-2"><Download className="w-4 h-4"/> Exportar filtro</Button>
          </div>
        </div>

        {/* Filtros */}
        <Card className="p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3 text-gray-700"><Filter className="w-4 h-4"/> <span className="font-medium">Filtros</span></div>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div>
              <label className="text-xs text-gray-500">Data inicial</label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-gray-500">Data final</label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-gray-500">Macro-bairro</label>
              <select className="w-full border rounded-md h-10 px-2" value={macroBairro} onChange={(e) => setMacroBairro(e.target.value)}>
                <option value="ALL">Todos</option>
                {selects.macro_bairro?.map((v: string) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500">Plataforma</label>
              <select className="w-full border rounded-md h-10 px-2" value={platform} onChange={(e) => setPlatform(e.target.value)}>
                <option value="ALL">Todas</option>
                {selects.platform?.map((v: string) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500">Modo do pedido</label>
              <select className="w-full border rounded-md h-10 px-2" value={orderMode} onChange={(e) => setOrderMode(e.target.value)}>
                <option value="ALL">Todos</option>
                {selects.order_mode?.map((v: string) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500">Status</label>
              <select className="w-full border rounded-md h-10 px-2" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="ALL">Todos</option>
                {selects.status?.map((v: string) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500">Classe do pedido</label>
              <select className="w-full border rounded-md h-10 px-2" value={classePedido} onChange={(e) => setClassePedido(e.target.value)}>
                <option value="ALL">Todas</option>
                {selects.classe_pedido?.map((v: string) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>
          </div>
        </Card>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="text-xs text-gray-500">Pedidos</div>
            <div className="text-2xl font-semibold">{kpis.n.toLocaleString("pt-BR")}</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-gray-500">Receita</div>
            <div className="text-2xl font-semibold">{fmt.format(kpis.receita)}</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-gray-500">Tempo médio de entrega (min)</div>
            <div className="text-2xl font-semibold">{(kpis.tempoMedio || 0).toFixed(1)}</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-gray-500">Satisfação média (1–5)</div>
            <div className="text-2xl font-semibold">{(kpis.satisfMed || 0).toFixed(2)}</div>
          </Card>
        </div>

        {/* Row 1 Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="p-4">
            <div className="text-sm font-medium mb-2">Pedidos e Receita por dia</div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={byDay}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Bar yAxisId="left" dataKey="pedidos" name="Pedidos" />
                  <Line yAxisId="right" type="monotone" dataKey="receita" name="Receita (R$)" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="p-4">
            <div className="text-sm font-medium mb-2">Tempo médio de entrega por Macro-bairro (Top 12)</div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={tempoPorMacro}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="macro_bairro" interval={0} angle={-25} textAnchor="end" height={60} tick={{ fontSize: 11 }} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="media_tempo" name="Minutos">
                    {tempoPorMacro.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* Row 2 Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="p-4">
            <div className="text-sm font-medium mb-2">Participação por Plataforma</div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={plataformas} dataKey="value" nameKey="name" outerRadius={100} label>
                    {plataformas.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="p-4">
            <div className="text-sm font-medium mb-2">Satisfação média por Plataforma</div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={satisfPorPlataforma}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="platform" />
                  <YAxis domain={[0, 5]} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="satisf_media" name="Satisfação">
                    {satisfPorPlataforma.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* Row 3 Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="p-4">
            <div className="text-sm font-medium mb-2">Distância (km) vs Tempo de Entrega (min)</div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" dataKey="x" name="Distância (km)" />
                  <YAxis type="number" dataKey="y" name="Tempo (min)" />
                  <Tooltip cursor={{ strokeDasharray: "3 3" }} />
                  <Legend />
                  <Scatter name="Pedidos" data={scatterDistTempo} />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="p-4">
            <div className="text-sm font-medium mb-2">ETA vs Tempo Real (médias por plataforma)</div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={etaVsActual}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="platform" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="eta" name="ETA médio" />
                  <Line type="monotone" dataKey="actual" name="Real médio" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* Auto Feature Analysis */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {featureCards.map((c, idx) => (
            <Card key={idx} className="p-4">
              {c.spark ? (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium">{c.key}</div>
                    <div className="text-xs text-gray-500">min {c.min?.toFixed?.(2)} • p50 {c.p50?.toFixed?.(2)} • p90 {c.p90?.toFixed?.(2)} • max {c.max?.toFixed?.(2)}</div>
                  </div>
                  <div className="h-28">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={c.spark}>
                        <XAxis dataKey="day" hide />
                        <YAxis hide />
                        <Tooltip />
                        <Area type="monotone" dataKey="v" name="média diária" fillOpacity={0.25} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </>
              ) : (
                <>
                  <div className="font-medium mb-2">{c.key}</div>
                  <div className="h-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={c.top}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" interval={0} angle={-25} textAnchor="end" height={60} />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="count" name="Contagem">
                          {c.top?.map((_, i: number) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </>
              )}
            </Card>
          ))}
        </div>

        {/* Tabela de dados (amostra) */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium">Amostra dos dados filtrados</div>
            <Badge variant="secondary">{filtered.length.toLocaleString("pt-BR")} linhas</Badge>
          </div>
          <div className="overflow-auto border rounded-lg">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  {Object.keys(filtered[0] || { macro_bairro: 1, order_datetime: 1, platform: 1, total_brl: 1 }).slice(0, 12).map((k) => (
                    <th key={k} className="px-3 py-2 text-left font-medium text-gray-600 border-b">{k}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 30).map((r, i) => (
                  <tr key={i} className="even:bg-gray-50/40">
                    {Object.keys(filtered[0] || r).slice(0, 12).map((k) => (
                      <td key={k} className="px-3 py-2 border-b whitespace-nowrap">
                        {r[k] instanceof Date
                          ? (r[k] as Date).toISOString().slice(0, 19).replace("T", " ")
                          : typeof r[k] === "number"
                          ? (Math.abs(r[k] as number) > 1000000 && k.includes("total"))
                            ? fmt.format(r[k] as number)
                            : r[k]
                          : String(r[k] ?? "")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Dicas de uso */}
        <Card className="p-4">
          <div className="text-sm font-medium mb-1">Como usar</div>
          <ul className="list-disc ml-5 text-sm text-gray-700 space-y-1">
            <li>Clique em <strong>Carregar base</strong> e selecione <em>Base_Kaiserhaus.xlsx</em>.</li>
            <li>Filtre por <em>datas, macro-bairro, plataforma, modo, status</em> ou <em>classe do pedido</em>.</li>
            <li>Use os gráficos para identificar gargalos (ex.: macro-bairros com maior <em>tempo médio</em>, divergência <em>ETA vs Real</em>, etc.).</li>
            <li>Baixe os dados filtrados com <strong>Exportar filtro</strong> (gera um .xlsx).</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
