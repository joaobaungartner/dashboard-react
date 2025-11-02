import { useEffect, useMemo, useState } from "react";
import { getJson } from "../utils/api";
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
import {
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
  Line,
} from "recharts";

type KPIOverview = {
  total_pedidos: number;
  receita_total: number;
  ticket_medio: number;
  cancelados_pct?: number;
  pedidos_por_dia?: number;
  on_time_rate_pct?: number;
  periodo?: { min: string; max: string };
};

function formatDateLabel(d?: Date | null) {
  if (!d) return "-";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(d);
}

export default function Overview() {
  const [kpis, setKpis] = useState<KPIOverview | null>(null);
  const [byPlatform, setByPlatform] = useState<{ platform: string; orders: number }[]>([]);
  const [byStatus, setByStatus] = useState<{ status: string; count: number }[]>([]);
  const [macroAvg, setMacroAvg] = useState<{ macro_bairro: string; avg_receita: number }[]>([]);
  const [monthlyRevOrders, setMonthlyRevOrders] = useState<{ date: string; receita_total: number; orders: number }[]>([]);
  const [topMacro, setTopMacro] = useState<{ macro_bairro: string; orders: number }[]>([]);
  const [choropleth, setChoropleth] = useState<{ macro_bairro: string; value: number }[]>([]);
  const [onTimeRate, setOnTimeRate] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  async function fetchAll() {
    try {
      setLoading(true);
      setError(null);

      // Montar parâmetros de filtro
      const params: Record<string, any> = {};
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      if (selectedPlatform !== "all") params.platform = [selectedPlatform];
      if (selectedMacro !== "all") params.macro_bairro = [selectedMacro];

      // Escolha dinâmica de frequência da série temporal baseada no intervalo selecionado
      let freqParam: "D" | "W" | "M" = "M";
      if (startDate && endDate) {
        const msPerDay = 24 * 60 * 60 * 1000;
        const rangeDays = Math.max(1, Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / msPerDay));
        if (rangeDays <= 45) freqParam = "D"; else if (rangeDays <= 180) freqParam = "W"; else freqParam = "M";
      }

      const results = await Promise.allSettled([
        // Meta dados (sem filtros)
        getJson<{ data: KPIOverview }>("/api/dashboard/overview/kpis"),
        getJson<{ data: string[] }>("/api/dashboard/meta/platforms"),
        getJson<{ data: string[] }>("/api/dashboard/meta/macros"),
        // Dados overview (com filtros)
        getJson<{ data: KPIOverview }>("/api/dashboard/overview/kpis", params),
        getJson<{ data: { platform: string; orders: number }[] }>("/api/dashboard/overview/by_platform", params),
        getJson<{ data: { status: string; count: number }[] }>("/api/dashboard/overview/status_distribution", params),
        getJson<{ data: { macro_bairro: string; avg_receita: number }[] }>("/api/dashboard/overview/macro_bairro_avg_receita", params),
        getJson<{ data: { date: string; receita_total: number; orders: number }[] }>("/api/dashboard/overview/timeseries_revenue_with_orders", { ...params, freq: freqParam }),
        getJson<{ data: { macro_bairro: string; orders: number }[] }>("/api/dashboard/overview/top_macro_bairros_by_orders", { ...params, top_n: 5 }),
        getJson<{ data: { macro_bairro: string; value: number }[] }>("/api/dashboard/overview/macro_bairro_choropleth", { ...params, metric: "avg_receita" }),
        getJson<{ tempo_medio_preparo: number; tempo_medio_entrega: number; atraso_medio: number; distancia_media: number; on_time_rate_pct: number } | { data: { tempo_medio_preparo: number; tempo_medio_entrega: number; atraso_medio: number; distancia_media: number; on_time_rate_pct: number } }>("/api/dashboard/ops/kpis"),
      ]);

      const [kOverview, metaPlats, metaMacs, k, p, st, m, mo, tm, ch, opsKpis] = results;
      
      // Definir intervalo do dataset a partir do overview.kpis.periodo
      if (kOverview.status === "fulfilled" && kOverview.value && kOverview.value.data.periodo) {
        const p = kOverview.value.data.periodo;
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
      
      if (k.status === "fulfilled") {
        setKpis(k.value.data);
        // Também tenta pegar on_time_rate_pct do kpis se disponível
        if (k.value.data.on_time_rate_pct !== undefined) {
          setOnTimeRate(k.value.data.on_time_rate_pct);
        }
      }
      if (p.status === "fulfilled") setByPlatform(p.value.data ?? []);
      if (st.status === "fulfilled") setByStatus(st.value.data ?? []);
      if (m.status === "fulfilled") setMacroAvg(m.value.data ?? []);
      if (mo.status === "fulfilled") setMonthlyRevOrders(mo.value.data ?? []);
      if (tm.status === "fulfilled") setTopMacro((tm.value.data ?? []).slice(0, 5));
      if (ch.status === "fulfilled") setChoropleth(ch.value.data ?? []);
      if (opsKpis.status === "fulfilled") {
        // O endpoint ops/kpis pode retornar direto ou dentro de data
        const opsData = (opsKpis.value as any).data ?? opsKpis.value;
        if (opsData?.on_time_rate_pct !== undefined && opsData.on_time_rate_pct !== null) {
          // Se o valor vier como decimal (0.814), converte para porcentagem (81.4)
          const rateValue = opsData.on_time_rate_pct;
          const finalValue = rateValue > 1 ? rateValue : rateValue * 100;
          setOnTimeRate(finalValue);
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar dados");
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

  const colors = ["#2563eb", "#16a34a", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

  const kpiCols = kpis?.cancelados_pct !== undefined || kpis?.pedidos_por_dia !== undefined ? 5 : 3;

  return (
    <PageContainer>
      <HeaderContainer>
        <Title>Visão Geral</Title>
        {loading && <LoadingText>Carregando…</LoadingText>}
      </HeaderContainer>

      {datasetStart && datasetEnd && (
        <DateRangeText>
          Período dos dados: <span style={{ fontWeight: 500 }}>{formatDateLabel(datasetStart)}</span> — <span style={{ fontWeight: 500 }}>{formatDateLabel(datasetEnd)}</span>
        </DateRangeText>
      )}

      {error && <Alert type="error">{error}</Alert>}

      {kpis && (
        <GridContainer $cols={kpiCols}>
          <StyledKpiCard>
            <p>Total de pedidos</p>
            <p>{kpis.total_pedidos.toLocaleString()}</p>
          </StyledKpiCard>
          <StyledKpiCard>
            <p>Receita total</p>
            <p>{kpis.receita_total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p>
          </StyledKpiCard>
          <StyledKpiCard>
            <p>Ticket médio</p>
            <p>{kpis.ticket_medio.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p>
          </StyledKpiCard>
          {kpis.cancelados_pct !== undefined && (
            <StyledKpiCard>
              <p>Pedidos cancelados</p>
              <p>{`${(kpis.cancelados_pct > 1 ? kpis.cancelados_pct : kpis.cancelados_pct * 100).toFixed(1)}%`}</p>
            </StyledKpiCard>
          )}
          {kpis.pedidos_por_dia !== undefined && (
            <StyledKpiCard>
              <p>Pedidos por dia (média)</p>
              <p>{kpis.pedidos_por_dia.toLocaleString(undefined, { maximumFractionDigits: 1 })}</p>
            </StyledKpiCard>
          )}
        </GridContainer>
      )}

      {/* Filtros */}
      <FilterContainer>
        <FilterGrid>
          <FormGroup>
            <Label>Início</Label>
            <Input 
              type="date" 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)} 
            />
          </FormGroup>
          <FormGroup>
            <Label>Fim</Label>
            <Input 
              type="date" 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)} 
            />
          </FormGroup>
          <FormGroup>
            <Label>Plataforma</Label>
            <Select 
              value={selectedPlatform} 
              onChange={(e) => setSelectedPlatform(e.target.value)}
            >
              <option value="all">Todas</option>
              {platformList.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </Select>
          </FormGroup>
          <FormGroup>
            <Label>Macro-bairro</Label>
            <Select 
              value={selectedMacro} 
              onChange={(e) => setSelectedMacro(e.target.value)}
            >
              <option value="all">Todos</option>
              {macroList.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </Select>
          </FormGroup>
        </FilterGrid>
        <ButtonGroup>
          <Button 
            onClick={fetchAll} 
            disabled={loading} 
            variant="primary"
          >
            {loading ? "Aplicando…" : "Aplicar filtros"}
          </Button>
          <Button
            onClick={() => {
              setSelectedPlatform("all");
              setSelectedMacro("all");
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
          <Subtitle>Receita total por mês (linha dupla)</Subtitle>
          <ResponsiveContainer width="100%" height={240}>
            <ComposedChart data={monthlyRevOrders}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" hide />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Bar yAxisId="left" dataKey="orders" name="Pedidos" fill="#3b82f6" />
              <Line yAxisId="right" dataKey="receita_total" name="Receita" stroke="#16a34a" />
            </ComposedChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <Subtitle>Top 5 macro bairros por pedidos</Subtitle>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={topMacro}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="macro_bairro" interval={0} angle={-20} textAnchor="end" height={60} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="orders" fill="#0ea5e9" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <Subtitle>Pedidos por plataforma</Subtitle>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={byPlatform}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="platform" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="orders" fill="#16a34a" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <Subtitle>Status dos pedidos</Subtitle>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie dataKey="count" nameKey="status" data={byStatus} outerRadius={90}>
                {byStatus.map((_, i) => (
                  <Cell key={i} fill={colors[i % colors.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <Subtitle>Macro bairro × receita média</Subtitle>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={macroAvg}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="macro_bairro" interval={0} angle={-20} textAnchor="end" height={60} />
              <YAxis />
              <Tooltip formatter={(v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} />
              <Bar dataKey="avg_receita" fill="#f59e0b" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {onTimeRate !== null && onTimeRate !== undefined && (
          <Card>
            <Subtitle>% de entregas no prazo</Subtitle>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '16rem' }}>
              <GaugeChart value={onTimeRate} />
            </div>
          </Card>
        )}
      </TwoColumnGrid>
    </PageContainer>
  );
}

function GaugeChart({ value }: { value: number }) {
  // Garantir que o valor está entre 0 e 100
  const normalizedValue = Math.max(0, Math.min(100, value));
  const percentage = normalizedValue / 100;
  
  // Calcular ângulos para o arco (180 graus = semicírculo, de 0° a 180°)
  // Começamos em 0° (esquerda) e vamos até 180° (direita) baseado na porcentagem
  const startAngle = 0;
  const endAngle = 180 * percentage;
  
  // Cor baseada no valor
  const getColor = () => {
    if (percentage >= 0.8) return "#16a34a"; // Verde para >= 80%
    if (percentage >= 0.6) return "#f59e0b"; // Amarelo para >= 60%
    return "#ef4444"; // Vermelho para < 60%
  };
  
  const color = getColor();
  const size = 200;
  const radius = 80;
  const centerX = size / 2;
  const centerY = size / 2;
  
  // Converter ângulos para radianos (SVG usa sistema onde 0° é à direita, precisamos ajustar)
  const toRadians = (angle: number) => (angle * Math.PI) / 180;
  
  // Calcular pontos do arco (ajustar para que 0° fique à esquerda em vez de à direita)
  const getX = (angle: number) => centerX + radius * Math.cos(toRadians(angle - 90));
  const getY = (angle: number) => centerY + radius * Math.sin(toRadians(angle - 90));
  
  const startX = getX(startAngle);
  const startY = getY(startAngle);
  const endX = getX(endAngle);
  const endY = getY(endAngle);
  
  // Flag para arco grande (mais de 180 graus) - não aplicável aqui já que max é 180°
  const largeArcFlag = 0;
  
  const pathData = `M ${startX} ${startY} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY}`;
  
  return (
    <div className="relative">
      <svg width={size} height={size / 2 + 20} className="overflow-visible">
        {/* Arco de fundo (cinza) */}
        <path
          d={`M ${getX(0)} ${getY(0)} A ${radius} ${radius} 0 0 1 ${getX(180)} ${getY(180)}`}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="20"
          strokeLinecap="round"
        />
        {/* Arco do valor */}
        <path
          d={pathData}
          fill="none"
          stroke={color}
          strokeWidth="20"
          strokeLinecap="round"
        />
        {/* Texto do valor */}
        <text
          x={centerX}
          y={centerY - 10}
          textAnchor="middle"
          fontSize="48"
          fontWeight="bold"
          fill={color}
        >
          {normalizedValue.toFixed(1)}%
        </text>
        {/* Label */}
        <text
          x={centerX}
          y={centerY + 30}
          textAnchor="middle"
          fontSize="14"
          fill="#6b7280"
        >
          Entregas no prazo
        </text>
      </svg>
    </div>
  );
}