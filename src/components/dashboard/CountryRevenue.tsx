import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { revenueByCountry } from "@/lib/mock-data";
import { useCurrency } from "@/contexts/CurrencyContext";

export default function CountryRevenue() {
  const { convertPrice, formatPrice } = useCurrency();
  const total = revenueByCountry.reduce((sum, c) => sum + c.value, 0);

  return (
    <Card className="animate-slide-up">
      <CardHeader>
        <CardTitle className="text-base">Receita por País</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {revenueByCountry.map((item) => {
          const percentage = Math.round((item.value / total) * 100);
          const convertedValue = convertPrice(item.value);

          return (
            <div key={item.country} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span>{item.flag}</span>
                  <span>{item.country}</span>
                </span>
                <span className="font-medium">{formatPrice(convertedValue)}</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-1000 ease-out"
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
