import { useState, useEffect, useMemo } from "react";
import {
  DollarSign,
  ShoppingCart,
  TrendingUp,
  Users,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import MetricCard from "@/components/dashboard/MetricCard";
import RevenueChart from "@/components/dashboard/RevenueChart";
import CountryRevenue from "@/components/dashboard/CountryRevenue";
import RecentOrders from "@/components/dashboard/RecentOrders";
import { useCurrency } from "@/contexts/CurrencyContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";
import { format } from "date-fns";

interface RawStats {
  revenueByCurrency: { currency: string; total: string }[];
  totalOrders: number;
  approvedOrders: number;
  platformFee?: number;
}

export default function Dashboard() {
  const { convertPrice, formatPrice, isLoading, rates } = useCurrency();
  const [rawStats, setRawStats] = useState<RawStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  const fetchStats = () => {
    setLoading(true);
    let url = `/api/orders/stats?filter=${dateFilter}`;
    if (dateFilter === "custom" && dateRange?.from && dateRange?.to) {
      url += `&startDate=${format(dateRange.from, "yyyy-MM-dd")}&endDate=${format(dateRange.to, "yyyy-MM-dd")}`;
    } else if (dateFilter === "custom") {
      setLoading(false);
      return; // Do not fetch if custom but dates are not fully selected
    }

    fetch(url)
      .then(res => res.json())
      .then(data => setRawStats(data.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchStats();
  }, [dateFilter, dateRange]); // refetch when dateFilter or dateRange changes

  // Recalculate revenue whenever rates or raw stats change
  const stats = useMemo(() => {
    if (!rawStats) return { totalOrders: 0, approvedOrders: 0, revenueZAR: 0, conversionRate: 0, averageTicketNet: 0, platformFee: 0 };

    let revenueInZAR = 0;
    if (rates && rawStats.revenueByCurrency) {
      rawStats.revenueByCurrency.forEach((r) => {
        // rates map: ZAR=1, KES=7.07... means 1 ZAR = 7.07 KES
        // so to convert from currency X to ZAR: amount_ZAR = amount_X / rates[X]
        const rate = rates[r.currency] ?? 1;
        revenueInZAR += parseFloat(r.total) / rate;
      });
    } else if (rawStats.revenueByCurrency) {
      // rates not yet loaded: assume ZAR = raw value (best fallback)
      rawStats.revenueByCurrency.forEach((r) => {
        if (r.currency === 'ZAR') revenueInZAR += parseFloat(r.total);
      });
    }

    const platformFee = rawStats.platformFee || 0;
    const netRevenueZAR = revenueInZAR * (1 - platformFee / 100);
    const averageTicketNet = rawStats.approvedOrders > 0 ? netRevenueZAR / rawStats.approvedOrders : 0;

    return {
      totalOrders: rawStats.totalOrders || 0,
      approvedOrders: rawStats.approvedOrders || 0,
      revenueZAR: revenueInZAR,
      conversionRate: rawStats.totalOrders > 0 ? (rawStats.approvedOrders / rawStats.totalOrders) * 100 : 0,
      averageTicketNet,
      platformFee
    };
  }, [rawStats, rates]);

  return (
    <div className={`space-y-6 transition-opacity duration-300 ${isLoading || loading ? "opacity-50" : "opacity-100"}`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Visão geral do seu negócio</p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-2">
          {dateFilter === "custom" && (
            <DatePickerWithRange date={dateRange} setDate={setDateRange} />
          )}
          <div className="w-[180px]">
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por data" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todo o Período</SelectItem>
                <SelectItem value="today">Hoje</SelectItem>
                <SelectItem value="yesterday">Ontem</SelectItem>
                <SelectItem value="7d">Últimos 7 dias</SelectItem>
                <SelectItem value="30d">Últimos 30 dias</SelectItem>
                <SelectItem value="month">Este Mês</SelectItem>
                <SelectItem value="custom">Personalizado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={fetchStats}
            disabled={loading}
            className="w-10 h-10 shrink-0"
            title="Atualizar dados"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-muted-foreground" : "text-foreground"}`} />
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <MetricCard
          title="Receita Total"
          value={formatPrice(convertPrice(stats.revenueZAR))}
          change="Soma bruta dos pedidos pagos"
          changeType="positive"
          icon={<DollarSign className="h-5 w-5" />}
        />
        <MetricCard
          title="Ticket Médio"
          value={formatPrice(convertPrice(stats.averageTicketNet))}
          change={`Líquido (Pós-taxa de ${stats.platformFee.toFixed(1)}%)`}
          changeType="neutral"
          icon={<DollarSign className="h-5 w-5" />}
        />
        <MetricCard
          title="Total de Pedidos"
          value={stats.totalOrders.toString()}
          change="Todos os checkouts criados"
          changeType="neutral"
          icon={<ShoppingCart className="h-5 w-5" />}
        />
        <MetricCard
          title="Pedidos Pagos"
          value={stats.approvedOrders.toString()}
          change="Pedidos aprovados com sucesso"
          changeType="positive"
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <MetricCard
          title="Conversão"
          value={`${stats.conversionRate.toFixed(1)}%`}
          change="De todos os checkouts"
          changeType={stats.conversionRate > 0 ? "positive" : "neutral"}
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <MetricCard
          title="Cancelados"
          value={(stats.totalOrders - stats.approvedOrders).toString()}
          change="Pedidos não processados"
          changeType="negative"
          icon={<Users className="h-5 w-5" />}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RevenueChart />
        </div>
        <CountryRevenue />
      </div>

      <RecentOrders dateFilter={dateFilter} dateRange={dateRange} />
    </div>
  );
}
