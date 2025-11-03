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
  const clamped = Math.max(3, Math.min(5, value));
  const t = (clamped - 3) / 2;
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
  const v1 = k["%muito_satisfeitos"] as number | undefined;
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

      if (kOverview && (kOverview as any).periodo) {
        const p = (kOverview as any).periodo as { min: string; max: string };
        if (p?.min && p?.max) {
          setDatasetStart(new Date(p.min));
          setDatasetEnd(new Date(p.max));
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
  }, []);

  const platformList = useMemo(() => metaPlatforms, [metaPlatforms]);
  const macroList = useMemo(() => metaMacros, [metaMacros]);

  const filteredTimeseries = useMemo(() => timeseries, [timeseries]);

  const filteredScatter = useMemo(() => scatter, [scatter]);

  const filteredByMacro = useMemo(() => byMacro, [byMacro]);

  const filteredHeatmap = useMemo(() => heatmap, [heatmap]);

  return (
    <PageContainer>
      <HeaderContainer>
        <Title>Satisfação do Cliente</Title>
        {loading && <LoadingText>Carregando…</LoadingText>}
      </HeaderContainer>

      {datasetStart && datasetEnd && (
        <DateRangeText>
          Período dos dados: <span style={{ fontWeight: 500 }}>{formatDateLabel(datasetStart)}</span> — <span style={{ fontWeight: 500 }}>{formatDateLabel(datasetEnd)}</span>
        </DateRangeText>
      )}

      {error && <Alert type="error">{error}</Alert>}

      {kpis && (
        <GridContainer $cols={4}>
          <StyledKpiCard>
            <p>Nível médio</p>
            <p>{formatScore(kpis.nivel_medio)}</p>
          </StyledKpiCard>
          <StyledKpiCard>
            <p>% muito satisfeitos</p>
            <p>{formatPercent(getPercentMuitoSatisfeitos(kpis))}</p>
          </StyledKpiCard>
        </GridContainer>
      )}

      <FilterContainer>
        <FilterGrid>
          <FormGroup>
            <Label>Nota de satisfação</Label>
            <Select value={String(selectedScore)} onChange={(e) => setSelectedScore(e.target.value === "all" ? "all" : Number(e.target.value))}>
              <option value="all">Todas</option>
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
              <option value="5">5</option>
            </Select>
          </FormGroup>

          <FormGroup>
            <Label>Início</Label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </FormGroup>

          <FormGroup>
            <Label>Fim</Label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </FormGroup>

          <FormGroup>
            <Label>Entrega</Label>
            <Select value={deliveryStatus} onChange={(e) => setDeliveryStatus(e.target.value as any)}>
              <option value="all">Todas</option>
              <option value="atrasado">Atrasados</option>
              <option value="no_prazo">No prazo</option>
            </Select>
          </FormGroup>

          <FormGroup>
            <Label>Plataforma</Label>
            <Select value={selectedPlatform} onChange={(e) => setSelectedPlatform(e.target.value)}>
              <option value="all">Todas</option>
              {platformList.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </Select>
          </FormGroup>

          <FormGroup>
            <Label>Macro-bairro</Label>
            <Select value={selectedMacro} onChange={(e) => setSelectedMacro(e.target.value)}>
              <option value="all">Todos</option>
              {macroList.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </Select>
          </FormGroup>
        </FilterGrid>
        <ButtonGroup>
          <Button onClick={fetchAll} disabled={loading} variant="primary">
            {loading ? "Aplicando…" : "Aplicar filtros"}
          </Button>
          <Button
            onClick={() => {
              setSelectedScore("all");
              setSelectedPlatform("all");
              setSelectedMacro("all");
              setDeliveryStatus("all");
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
          <Subtitle>Satisfação média por macro_bairro</Subtitle>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={filteredByMacro}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="macro_bairro" interval={0} angle={-20} textAnchor="end" height={60} />
              <YAxis domain={[0, 5]} />
              <Tooltip formatter={(v: any) => formatScore(Number(v))} />
              <Bar dataKey="avg_satisfacao" fill="#16a34a" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <Subtitle>Tempo de entrega × satisfação</Subtitle>
          <ResponsiveContainer width="100%" height={240}>
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
        </Card>

        <Card>
          <Subtitle>Série temporal da satisfação</Subtitle>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={filteredTimeseries.map((d) => ({ ...d, date: parseDateString(d.date) }))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tickFormatter={(v) => new Intl.DateTimeFormat("pt-BR").format(v)} />
              <YAxis domain={[0, 5]} />
              <Tooltip labelFormatter={(v) => new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(v as Date)} formatter={(v: any) => formatScore(Number(v))} />
              <Line type="monotone" dataKey="avg_satisfacao" stroke="#0ea5e9" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <Subtitle>Satisfação média por plataforma</Subtitle>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={[...filteredHeatmap].sort((a, b) => b.avg_satisfacao - a.avg_satisfacao)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="platform" interval={0} angle={-20} textAnchor="end" height={60} />
              <YAxis domain={[0, 5]} />
              <Tooltip formatter={(v: any) => formatScore(Number(v))} />
              <Bar dataKey="avg_satisfacao" fill="#16a34a" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </TwoColumnGrid>
    </PageContainer>
  );
}

