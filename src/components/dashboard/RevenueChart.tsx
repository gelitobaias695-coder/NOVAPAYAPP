import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { revenueByDay } from "@/lib/mock-data";
import { useCurrency } from "@/contexts/CurrencyContext";

export default function RevenueChart() {
  const { convertPrice, formatPrice } = useCurrency();

  const formattedData = revenueByDay.map(day => ({
    ...day,
    revenue: convertPrice(day.revenue)
  }));

  return (
    <Card className="animate-slide-up">
      <CardHeader>
        <CardTitle className="text-base">Receita (últimos 7 dias)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={formattedData}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 90%)" strokeOpacity={0.3} />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="hsl(220, 10%, 46%)" />
              <YAxis
                tick={{ fontSize: 12 }}
                stroke="hsl(220, 10%, 46%)"
                tickFormatter={(value) => formatPrice(value)}
              />
              <Tooltip
                formatter={(value: number) => [formatPrice(value), "Receita"]}
                contentStyle={{
                  backgroundColor: "hsl(220, 25%, 9%)",
                  border: "1px solid hsl(220, 20%, 16%)",
                  borderRadius: "8px",
                  color: "hsl(220, 10%, 92%)",
                }}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="hsl(160, 84%, 39%)"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorRevenue)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
