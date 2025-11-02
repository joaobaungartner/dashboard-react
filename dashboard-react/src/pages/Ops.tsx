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
import {
  PageContainer,
  HeaderContainer,
  Title,
  LoadingText,
  DateRangeText,
  Alert,
  GridContainer,
  KpiCard as StyledKpiCard,
  FilterContainer,
  FilterGrid,
  FormGroup,
  Label,
  Input,
  Select,
  ButtonGroup,
  Button,
  TwoColumnGrid,
  Card,
  Subtitle,
} from "../styles/styled-components";

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

function formatDateLabel(d?: Date | null) {
  if (!d) return "-";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(d);
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
  const [deliveryStatus, setDeliveryStatus] = useState<"all" | "atrasado" | "no_prazo">("all");
  const [thresholdMin, setThresholdMin] = useState<string>("");

  async function fetchAll() {
    let isMounted = true;
    setLoading(true);
    setError(null);

    try {
      // Montar parâmetros de filtro
      const params: Record<string, any> = {};
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      if (selectedPlatform !== "all") params.platform = [selectedPlatform];
      if (selectedMacro !== "all") params.macro_bairro = [selectedMacro];
      if (deliveryStatus !== "all") params.delivery_status = deliveryStatus;
      if (thresholdMin) {
        const threshold = parseFloat(thresholdMin);
        if (!Number.isNaN(threshold)) params.threshold_min = threshold;
      }

      // Buscar meta dados primeiro (sem filtros)
      const [kOverview, metaPlats, metaMacs, ...opsResults] = await Promise.allSettled([
        getJson<any>("/api/dashboard/overview/kpis"),
        getJson<{ data: string[] }>("/api/dashboard/meta/platforms"),
        getJson<{ data: string[] }>("/api/dashboard/meta/macros"),
        getJson<KpisResponse>("/api/dashboard/ops/kpis", params),
        getJson<OrdersByHourResponse>("/api/dashboard/ops/orders_by_hour", params),
        getJson<PercentisResponse>("/api/dashboard/ops/percentis_by_macro", params),
        getJson<LateRateResponse>("/api/dashboard/ops/late_rate_by_macro", params),
        getJson<DeliveryByWeekdayResponse>("/api/dashboard/ops/delivery_by_weekday", params),
        getJson<AvgDeliveryByHourResponse>("/api/dashboard/ops/avg_delivery_by_hour", params),
        getJson<HeatmapHourWeekdayResponse>("/api/dashboard/ops/heatmap_hour_weekday", params),
        getJson<LateRateByPlatformResponse>("/api/dashboard/ops/late_rate_by_platform", params),
      ]);

      if (!isMounted) return;

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

      // Processar resultados operacionais
      const [k, orders, perc, late, weekday, hour, heatmap, platform] = opsResults;
      if (k.status === "fulfilled") setKpis(k.value);
      if (orders.status === "fulfilled") setOrdersByHour(orders.value.data ?? []);
      if (perc.status === "fulfilled") setPercentis(perc.value.data ?? []);
      if (late.status === "fulfilled") setLateRate(late.value.data ?? []);
      if (weekday.status === "fulfilled") setDeliveryByWeekday(weekday.value.data ?? []);
      if (hour.status === "fulfilled") setAvgDeliveryByHour(hour.value.data ?? []);
      if (heatmap.status === "fulfilled") setHeatmapHourWeekday(heatmap.value.data ?? []);
      if (platform.status === "fulfilled") setLateRateByPlatform(platform.value.data ?? []);

      const firstRejection = opsResults.find((r) => r.status === "rejected") as PromiseRejectedResult | undefined;
      if (firstRejection) {
        setError(
          "Não foi possível carregar todos os dados (verifique colunas/servidor)."
        );
      }
    } catch (e) {
      if (!isMounted) return;
      console.error("[Ops] Erro geral:", e);
      setError("Erro ao carregar dados do backend.");
    } finally {
      if (!isMounted) return;
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const percentisSorted = useMemo(() => {
    return (percentis ?? []).slice().sort((a, b) => b.p90 - a.p90);
  }, [percentis]);

  return (
    <PageContainer>
      <HeaderContainer>
        <Title>Desempenho Operacional</Title>
        {loading && <LoadingText>Carregando…</LoadingText>}
      </HeaderContainer>

      {datasetStart && datasetEnd && (
        <DateRangeText>
          Período dos dados: <span style={{ fontWeight: 500 }}>{formatDateLabel(datasetStart)}</span> — <span style={{ fontWeight: 500 }}>{formatDateLabel(datasetEnd)}</span>
        </DateRangeText>
      )}

      {error && <Alert type="error">{error}</Alert>}

      <GridContainer $cols={5}>
        <StyledKpiCard>
          <p>Tempo médio de preparo</p>
          <p>{formatMinutes(kpis?.tempo_medio_preparo)}</p>
        </StyledKpiCard>
        <StyledKpiCard>
          <p>Tempo médio de entrega</p>
          <p>{formatMinutes(kpis?.tempo_medio_entrega)}</p>
        </StyledKpiCard>
        <StyledKpiCard>
          <p>Atraso médio</p>
          <p>{formatMinutes(kpis?.atraso_medio)}</p>
        </StyledKpiCard>
        <StyledKpiCard>
          <p>Distância média</p>
          <p>{kpis ? `${kpis.distancia_media.toFixed(1)} km` : "-"}</p>
        </StyledKpiCard>
        <StyledKpiCard>
          <p>Entregas no prazo</p>
          <p>
            {kpis?.on_time_rate_pct !== undefined && !Number.isNaN(kpis?.on_time_rate_pct)
              ? `${kpis.on_time_rate_pct.toFixed(1)}%`
              : "-"}
          </p>
        </StyledKpiCard>
      </GridContainer>

      {/* Filtros */}
      <FilterContainer>
        <FilterGrid>
          <FormGroup>
            <Label>Início</Label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </FormGroup>

          <FormGroup>
            <Label>Fim</Label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </FormGroup>

          <FormGroup>
            <Label>Plataforma</Label>
            <Select value={selectedPlatform} onChange={(e) => setSelectedPlatform(e.target.value)}>
              <option value="all">Todas</option>
              {metaPlatforms.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </Select>
          </FormGroup>

          <FormGroup>
            <Label>Macro-bairro</Label>
            <Select value={selectedMacro} onChange={(e) => setSelectedMacro(e.target.value)}>
              <option value="all">Todos</option>
              {metaMacros.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </Select>
          </FormGroup>

          <FormGroup>
            <Label>Status de entrega</Label>
            <Select value={deliveryStatus} onChange={(e) => setDeliveryStatus(e.target.value as any)}>
              <option value="all">Todas</option>
              <option value="atrasado">Atrasados</option>
              <option value="no_prazo">No prazo</option>
            </Select>
          </FormGroup>

          <FormGroup>
            <Label>Tolerância mínima (min)</Label>
            <Input 
              type="number" 
              step="0.1"
              min="0"
              placeholder="Ex: 30"
              value={thresholdMin} 
              onChange={(e) => setThresholdMin(e.target.value)} 
            />
          </FormGroup>
        </FilterGrid>
        <ButtonGroup>
          <Button onClick={fetchAll} disabled={loading} variant="primary">
            {loading ? "Aplicando…" : "Aplicar filtros"}
          </Button>
          <Button
            onClick={() => {
              setSelectedPlatform("all");
              setSelectedMacro("all");
              setDeliveryStatus("all");
              setThresholdMin("");
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
            variant="secondary"
          >
            Limpar tudo
          </Button>
        </ButtonGroup>
      </FilterContainer>

      <TwoColumnGrid>
        <Card>
          <Subtitle>Pedidos por hora do dia</Subtitle>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={ordersByHour ?? []} margin={{ left: 12, right: 12, top: 12, bottom: 12 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" tick={{ fontSize: 12 }} label={{ value: "Hora", position: "insideBottom", dy: 6 }} />
              <YAxis tick={{ fontSize: 12 }} label={{ value: "Pedidos", angle: -90, position: "insideLeft" }} />
              <Tooltip formatter={(v: any) => Number(v)} />
              <Line type="monotone" dataKey="orders" stroke="#7f1d1d" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <Subtitle>Tempo de entrega por macro_bairro (p90)</Subtitle>
          <ResponsiveContainer width="100%" height={240}>
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
          <div style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "0.25rem" }}>
            Tooltip inclui média, p50, p75, p90 e total (quando disponível).
          </div>
        </Card>

        <Card>
          <Subtitle>% de atrasos por macro_bairro</Subtitle>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={(lateRate ?? []).slice().sort((a,b)=> b.late_rate - a.late_rate)} layout="vertical" margin={{ left: 24, right: 16, top: 12, bottom: 12 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tickFormatter={(v) => pct(Number(v))} />
              <YAxis type="category" dataKey="macro_bairro" width={140} interval={0} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: any) => pct(Number(v))} labelFormatter={(l) => `Macro: ${l}`} />
              <Bar dataKey="late_rate" fill="#ef4444" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <Subtitle>Tempo de entrega por dia da semana</Subtitle>
          <ResponsiveContainer width="100%" height={240}>
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
        </Card>
      </TwoColumnGrid>

      {/* Seção adicional: gráficos de análise temporal */}
      <TwoColumnGrid>
        <Card>
          <Subtitle>Tempo médio de entrega por hora</Subtitle>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={avgDeliveryByHour ?? []} margin={{ left: 12, right: 12, top: 12, bottom: 12 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" tick={{ fontSize: 12 }} label={{ value: "Hora", position: "insideBottom", dy: 6 }} />
              <YAxis tick={{ fontSize: 12 }} label={{ value: "Tempo (min)", angle: -90, position: "insideLeft" }} />
              <Tooltip formatter={(v: any) => formatMinutes(Number(v))} />
              <Line type="monotone" dataKey="avg_delivery_minutes" stroke="#2563eb" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <Subtitle>Ranking: % de atrasos por plataforma</Subtitle>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={[...(lateRateByPlatform ?? [])].sort((a, b) => b.late_rate - a.late_rate)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="platform" interval={0} angle={-20} textAnchor="end" height={60} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => pct(Number(v))} label={{ value: "% de atrasos", angle: -90, position: "insideLeft" }} />
              <Tooltip formatter={(v: any) => pct(Number(v))} />
              <Bar dataKey="late_rate" fill="#ef4444" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </TwoColumnGrid>
    </PageContainer>
  );
}