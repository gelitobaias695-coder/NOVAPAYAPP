import { useState, useEffect } from "react";
import { DateRange } from "react-day-picker";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCurrency } from "@/contexts/CurrencyContext";

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  success: "default",
  pending: "secondary",
  failed: "destructive",
};

// Fallback rates for mock normalization before dynamic rates load
const MOCK_RATES: Record<string, number> = { ZAR: 1, KES: 7.5, TZS: 140, NGN: 85, GHS: 0.7 };

export default function RecentOrders({ dateFilter = "all", dateRange }: { dateFilter?: string, dateRange?: DateRange }) {
  const { convertPrice, formatPrice, rates } = useCurrency();
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    let url = `/api/orders?filter=${dateFilter}`;
    if (dateFilter === "custom" && dateRange?.from && dateRange?.to) {
      url += `&startDate=${format(dateRange.from, "yyyy-MM-dd")}&endDate=${format(dateRange.to, "yyyy-MM-dd")}`;
    } else if (dateFilter === "custom") {
      return;
    }

    fetch(url)
      .then(r => r.json())
      .then(data => setOrders(data.data || []))
      .catch(console.error);
  }, [dateFilter, dateRange]);

  return (
    <Card className="animate-slide-up">
      <CardHeader>
        <CardTitle className="text-base">Pedidos Recentes</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {orders.slice(0, 5).map((order) => {
            // First normalize the original order amount to ZAR
            const orderRate = rates && rates[order.currency] ? rates[order.currency] : (MOCK_RATES[order.currency] || 1);
            const amountInZAR = parseFloat(order.amount) / orderRate;

            // Then convert to the globally selected dashboard currency
            const convertedAmount = convertPrice(amountInZAR);

            return (
              <div
                key={order.id}
                className="flex items-center justify-between rounded-lg border border-border p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{order.customer_name}</p>
                  <p className="text-xs text-muted-foreground">{order.product_name}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium whitespace-nowrap">
                    {formatPrice(convertedAmount)}
                  </span>
                  <Badge variant={statusVariant[order.status] || "secondary"}>
                    {order.status === 'success' ? 'Aprovado' : order.status}
                  </Badge>
                </div>
              </div>
            );
          })}
          {orders.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum pedido encontrado.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
