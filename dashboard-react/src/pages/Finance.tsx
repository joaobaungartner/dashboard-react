import { useEffect, useMemo, useState } from "react";
import { getJson, parseDateString } from "../utils/api";
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
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ComposedChart,
  Legend,
} from "recharts";

type KPIFinance = Partial<{
  receita_total: number;
  receita_liquida: number;
  margem_total: number;
  ticket_medio: number;
  pedidos: number;
}>;

function unwrap<T>(payload: any): T {
  return (payload && (payload.data ?? payload)) as T;
}
function pickNumber(obj: any, keys: string[], fallback = 0): number {
  for (const k of keys) {
    if (obj && typeof obj[k] === "number" && !Number.isNaN(obj[k])) return obj[k];
  }
  return fallback;
}
function pickString(obj: any, keys: string[], fallback = ""): string {
  for (const k of keys) {
    const v = obj?.[k];
    if (typeof v === "string") return v;
  }
  return fallback;
}
function firstKeyExcept(obj: any, except: string[]): string | null {
  if (!obj) return null;
  const ex = new Set(except);
  for (const k of Object.keys(obj)) {
    if (!ex.has(k)) return k;
  }
  return null;
}

function formatDateLabel(d?: Date | null) {
  if (!d) return "-";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(d);
}

export default function Finance() {
  const [kpis, setKpis] = useState<KPIFinance | null>(null);
  const [timeseries, setTimeseries] = useState<{ date: string; receita_total: number }[]>([]);
  const [revenueByPlatform, setRevenueByPlatform] = useState<{ platform: string; total: number; pct?: number }[]>([]);
  const [revenueByClass, setRevenueByClass] = useState<{ classe: string; revenue: number }[]>([]);
  const [revenueByItemClass, setRevenueByItemClass] = useState<{ item_class: string; total_brl: number }[]>([]);
  const [revenueByMacroBairro, setRevenueByMacroBairro] = useState<{ macro_bairro: string; receita_bruta: number; receita_liquida: number }[]>([]);
  const [topClients, setTopClients] = useState<{ client: string; revenue: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [datasetStart, setDatasetStart] = useState<Date | null>(null);
  const [datasetEnd, setDatasetEnd] = useState<Date | null>(null);
  const [metaPlatforms, setMetaPlatforms] = useState<string[]>([]);
  const [metaMacros, setMetaMacros] = useState<string[]>([]);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [selectedPlatform, setSelectedPlatform] = useState<string | "all">("all");
  const [selectedMacro, setSelectedMacro] = useState<string | "all">("all");
  const [selectedScore, setSelectedScore] = useState<number | "all">("all");

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
        const scoreNum = Number(selectedScore);
        if (!Number.isNaN(scoreNum)) {
          params.score_min = scoreNum;
          params.score_max = scoreNum;
        }
      }

      let freqParam: "D" | "W" | "M" = "M";
      if (startDate && endDate) {
        const msPerDay = 24 * 60 * 60 * 1000;
        const rangeDays = Math.max(1, Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / msPerDay));
        if (rangeDays <= 45) freqParam = "D"; else if (rangeDays <= 180) freqParam = "W"; else freqParam = "M";
      }

      const results = await Promise.allSettled([
        getJson<any>("/api/dashboard/overview/kpis"),
        getJson<{ data: string[] }>("/api/dashboard/meta/platforms"),
        getJson<{ data: string[] }>("/api/dashboard/meta/macros"),
        getJson<any>("/api/dashboard/finance/kpis", params),
        getJson<any>("/api/dashboard/finance/timeseries_revenue", { ...params, freq: freqParam }),
        getJson<any>("/api/dashboard/finance/revenue_by_platform", params),
        getJson<any>("/api/dashboard/finance/revenue_by_class", params),
        getJson<any>("/api/dashboard/finance/revenue_by_item_class_barplot", params),
        getJson<any>("/api/dashboard/finance/revenue_by_macro_bairro", { ...params, top_n: 10 }),
        getJson<any>("/api/dashboard/finance/top_clients", { ...params, top_n: 10 }),
      ]);

      const [kOverview, metaPlats, metaMacs, k, ts, rp, rc, ric, rmb, tc] = results;

        if (kOverview.status === "fulfilled" && kOverview.value && (kOverview.value as any).periodo) {
          const p = (kOverview.value as any).periodo as { min: string; max: string };
          if (p?.min && p?.max) {
            setDatasetStart(new Date(p.min));
            setDatasetEnd(new Date(p.max));
            if (!startDate) setStartDate(p.min.substring(0, 10));
            if (!endDate) setEndDate(p.max.substring(0, 10));
          }
        }

        if (metaPlats.status === "fulfilled") {
          setMetaPlatforms(metaPlats.value?.data ?? []);
        }
        if (metaMacs.status === "fulfilled") {
          setMetaMacros(metaMacs.value?.data ?? []);
        }

        if (k.status === "fulfilled") {
          const raw = unwrap<any>(k.value) ?? {};
          const normalized: KPIFinance = {
            receita_total: pickNumber(raw, ["receita_total"]),
            receita_liquida: pickNumber(raw, ["receita_liquida"]),
            margem_total: pickNumber(raw, ["margem_total", "receita_liquida"]),
            ticket_medio: pickNumber(raw, ["ticket_medio"]),
            pedidos: pickNumber(raw, ["total_pedidos", "pedidos"]),
          };
          setKpis(normalized);
        } else {
          setKpis(null);
        }

        if (ts.status === "fulfilled") {
          const arr = unwrap<any[]>(ts.value) ?? [];
          const norm = arr.map((row) => ({
            date: row.date,
            receita_total: pickNumber(row, ["net", "gross"]),
          }));
          setTimeseries(norm);
        } else {
          setTimeseries([]);
        }

        if (rp.status === "fulfilled") {
          const arr = unwrap<any[]>(rp.value) ?? [];
          const norm = arr.map((row, idx) => {
            const excludedKeys = [
              "total", "total_brl", "revenue", "pct", "pct_col", "total_col", 
              "receita_total", "receita", "receita_bruta", "receita_liquida",
              "percentual", "percent"
            ];
            const platformKey = 
              (pickString(row, ["platform", "plataforma", "platform_col"]) && 
               (row.platform ? "platform" : row.plataforma ? "plataforma" : "platform_col")) ||
              firstKeyExcept(row, excludedKeys) ||
              null;
            
            const platformName = platformKey ? String(row[platformKey]) : `Plataforma ${idx + 1}`;
            
            const totalValue = pickNumber(row, [
              "receita_bruta",
              "receita_liquida",
              "total", 
              "total_brl", 
              "revenue", 
              "total_col",
              "receita_total",
              "receita"
            ]);
            
            const pctValue = pickNumber(row, ["pct", "pct_col", "percentual", "percent"]);
            
            return {
              platform: platformName,
              total: totalValue,
              pct: pctValue > 0 ? pctValue : undefined,
            };
          });

          setRevenueByPlatform(norm);
        } else {
          setRevenueByPlatform([]);
        }

        if (rc.status === "fulfilled") {
          const arr = unwrap<any[]>(rc.value) ?? [];
          const norm = arr.map((row) => {
            const clsKey = firstKeyExcept(row, ["revenue"]);
            return {
              classe: String(clsKey ? row[clsKey] : ""),
              revenue: pickNumber(row, ["revenue"]),
            };
          });
          setRevenueByClass(norm);
        } else {
          setRevenueByClass([]);
        }

        if (ric.status === "fulfilled") {
          const arr = unwrap<any[]>(ric.value) ?? [];
          const norm = arr.map((row) => {
            const itemClassKey = firstKeyExcept(row, ["total_brl", "revenue", "total"]);
            return {
              item_class: String(itemClassKey ? row[itemClassKey] : ""),
              total_brl: pickNumber(row, ["total_brl", "total", "revenue"]),
            };
          });
          setRevenueByItemClass(norm);
        } else {
          setRevenueByItemClass([]);
        }

        if (rmb.status === "fulfilled") {
          const arr = unwrap<any[]>(rmb.value) ?? [];
          const norm = arr.map((row) => {
            const macroBairroKey = firstKeyExcept(row, ["receita_bruta", "receita_liquida", "revenue", "total"]);
            return {
              macro_bairro: String(macroBairroKey ? row[macroBairroKey] : ""),
              receita_bruta: pickNumber(row, ["receita_bruta", "total", "revenue"]),
              receita_liquida: pickNumber(row, ["receita_liquida", "receita_bruta", "net"]),
            };
          });
          setRevenueByMacroBairro(norm);
        } else {
          setRevenueByMacroBairro([]);
        }

        if (tc.status === "fulfilled") {
          const arr = unwrap<any[]>(tc.value) ?? [];
          const norm = arr.map((row) => {
            const clientKey = firstKeyExcept(row, ["spent", "revenue"]);
            return {
              client: String(clientKey ? row[clientKey] : ""),
              revenue: pickNumber(row, ["revenue", "spent"]),
            };
          });
          setTopClients(norm);
        } else {
          setTopClients([]);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Erro ao carregar dados financeiros";
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

  const pieColors = ["#2563eb", "#16a34a", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

  return (
    <PageContainer>
      <HeaderContainer>
        <Title>Análise Financeira</Title>
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
            <p>Receita total</p>
            <p>{formatCurrency(kpis.receita_total)}</p>
          </StyledKpiCard>
          <StyledKpiCard>
            <p>Receita líquida</p>
            <p>{formatCurrency(kpis.receita_liquida ?? kpis.margem_total)}</p>
          </StyledKpiCard>
          <StyledKpiCard>
            <p>Ticket médio</p>
            <p>{formatCurrency(kpis.ticket_medio)}</p>
          </StyledKpiCard>
          <StyledKpiCard>
            <p>Pedidos</p>
            <p>{formatNumber(kpis.pedidos)}</p>
          </StyledKpiCard>
        </GridContainer>
      )}

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
              setSelectedScore("all");
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
          <Subtitle>Receita ao longo do tempo</Subtitle>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={timeseries.map(d => ({ ...d, date: parseDateString(d.date) }))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tickFormatter={(v) => new Intl.DateTimeFormat("pt-BR").format(v)} />
              <YAxis tickFormatter={(v) => shortCurrency(v)} />
              <Tooltip
                formatter={(v: number) => formatCurrency(v)}
                labelFormatter={(v) => new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(v as Date)}
              />
              <Line type="monotone" dataKey="receita_total" stroke="#2563eb" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <Subtitle>Receita por plataforma</Subtitle>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={revenueByPlatform}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="platform" interval={0} angle={-20} textAnchor="end" height={60} />
              <YAxis tickFormatter={(v) => shortCurrency(v)} />
              <Tooltip 
                formatter={(v: number, name: string, props: any) => {
                  const pct = props.payload?.pct;
                  if (pct !== undefined && !Number.isNaN(pct)) {
                    return [`${formatCurrency(v)} (${(pct * 100).toFixed(1)}%)`, "Receita"];
                  }
                  return formatCurrency(v);
                }}
              />
              <Bar dataKey="total" fill="#16a34a" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <Subtitle>Receita por modal</Subtitle>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={revenueByClass}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="classe" interval={0} angle={-20} textAnchor="end" height={60} />
              <YAxis tickFormatter={(v) => shortCurrency(v)} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Bar dataKey="revenue" fill="#f59e0b" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <Subtitle>Receita por classe</Subtitle>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={revenueByItemClass}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="item_class" 
                interval={0} 
                angle={-20} 
                textAnchor="end" 
                height={60}
              />
              <YAxis tickFormatter={(v) => shortCurrency(v)} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Bar dataKey="total_brl" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <Subtitle>Receita por macro bairro (Top 10)</Subtitle>
          <ResponsiveContainer width="100%" height={240}>
            <ComposedChart data={revenueByMacroBairro}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="macro_bairro" 
                interval={0} 
                angle={-45} 
                textAnchor="end" 
                height={80}
              />
              <YAxis tickFormatter={(v) => shortCurrency(v)} />
              <Tooltip 
                formatter={(v: number) => formatCurrency(v)}
                labelFormatter={(label) => `Bairro: ${label}`}
              />
              <Legend />
              <Bar dataKey="receita_bruta" name="Receita Bruta" fill="#8884d8" />
              <Bar dataKey="receita_liquida" name="Receita Líquida" fill="#82ca9d" />
            </ComposedChart>
          </ResponsiveContainer>
        </Card>
      </TwoColumnGrid>
    </PageContainer>
  );
}

function formatCurrency(v?: number) {
  if (v === undefined || v === null || Number.isNaN(v)) return "-";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatNumber(v?: number) {
  if (v === undefined || v === null || Number.isNaN(v)) return "-";
  return v.toLocaleString("pt-BR");
}

function shortCurrency(v?: number) {
  if (v === undefined || v === null || Number.isNaN(v)) return "";
  if (Math.abs(v) >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}k`;
  return `R$ ${v.toFixed(0)}`;
}
