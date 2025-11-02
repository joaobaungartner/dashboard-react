import { useEffect, useState } from "react";
import { getJson } from "../utils/api";
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
};

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

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);

        const results = await Promise.allSettled([
          getJson<{ data: KPIOverview }>("/api/dashboard/overview/kpis"),
          getJson<{ data: { platform: string; orders: number }[] }>("/api/dashboard/overview/by_platform"),
          getJson<{ data: { status: string; count: number }[] }>("/api/dashboard/overview/status_distribution"),
          getJson<{ data: { macro_bairro: string; avg_receita: number }[] }>("/api/dashboard/overview/macro_bairro_avg_receita"),
          getJson<{ data: { date: string; receita_total: number; orders: number }[] }>("/api/dashboard/overview/timeseries_revenue_with_orders", { freq: "M" }),
          getJson<{ data: { macro_bairro: string; orders: number }[] }>("/api/dashboard/overview/top_macro_bairros_by_orders", { top_n: 5 }),
          getJson<{ data: { macro_bairro: string; value: number }[] }>("/api/dashboard/overview/macro_bairro_choropleth", { metric: "avg_receita" }),
          getJson<{ tempo_medio_preparo: number; tempo_medio_entrega: number; atraso_medio: number; distancia_media: number; on_time_rate_pct: number } | { data: { tempo_medio_preparo: number; tempo_medio_entrega: number; atraso_medio: number; distancia_media: number; on_time_rate_pct: number } }>("/api/dashboard/ops/kpis"),
        ]);

        const [k, p, st, m, mo, tm, ch, opsKpis] = results;
        
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
            console.log("[Overview] On-time rate recebido:", { raw: rateValue, final: finalValue });
            setOnTimeRate(finalValue);
          }
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erro ao carregar dados");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const colors = ["#2563eb", "#16a34a", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

  return (
    <div className="space-y-6">
      {loading && <p className="text-gray-600">Carregando…</p>}
      {error && <p className="text-red-600">{error}</p>}

      {kpis && (
        <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-${kpis.cancelados_pct !== undefined || kpis.pedidos_por_dia !== undefined ? 5 : 3} gap-4`}>
          <KpiCard title="Total de pedidos" value={kpis.total_pedidos.toLocaleString()} />
          <KpiCard title="Receita total" value={kpis.receita_total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} />
          <KpiCard title="Ticket médio" value={kpis.ticket_medio.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} />
          {kpis.cancelados_pct !== undefined && (
            <KpiCard title="Pedidos cancelados" value={`${(kpis.cancelados_pct > 1 ? kpis.cancelados_pct : kpis.cancelados_pct * 100).toFixed(1)}%`} />
          )}
          {kpis.pedidos_por_dia !== undefined && (
            <KpiCard title="Pedidos por dia (média)" value={kpis.pedidos_por_dia.toLocaleString(undefined, { maximumFractionDigits: 1 })} />
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-semibold mb-3">Receita total por mês (linha dupla)</h3>
          <ResponsiveContainer width="100%" height={260}>
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
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-semibold mb-3">Top 5 macro bairros por pedidos</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={topMacro}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="macro_bairro" interval={0} angle={-20} textAnchor="end" height={60} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="orders" fill="#0ea5e9" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-semibold mb-3">Pedidos por plataforma</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={byPlatform}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="platform" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="orders" fill="#16a34a" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-semibold mb-3">Status dos pedidos</h3>
          <ResponsiveContainer width="100%" height={260}>
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
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-semibold mb-3">Macro bairro × receita média</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={macroAvg}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="macro_bairro" interval={0} angle={-20} textAnchor="end" height={60} />
              <YAxis />
              <Tooltip formatter={(v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} />
              <Bar dataKey="avg_receita" fill="#f59e0b" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {onTimeRate !== null && onTimeRate !== undefined && (
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-semibold mb-3">% de entregas no prazo</h3>
            <div className="flex items-center justify-center h-64">
              <GaugeChart value={onTimeRate} />
            </div>
          </div>
        )}
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