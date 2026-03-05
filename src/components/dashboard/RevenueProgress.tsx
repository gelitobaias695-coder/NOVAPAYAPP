import { useState, useEffect } from "react";
import { Progress } from "@/components/ui/progress";
import { useCurrency } from "@/contexts/CurrencyContext";

export default function RevenueProgress() {
    const { convertPrice, formatPrice, rates, currency } = useCurrency();
    const [revenueZAR, setRevenueZAR] = useState(0);

    useEffect(() => {
        const fetchStats = () => {
            fetch('/api/orders/stats')
                .then(res => res.json())
                .then(data => {
                    const s = data.data;
                    let rev = 0;
                    if (rates && s.revenueByCurrency) {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        s.revenueByCurrency.forEach((r: any) => {
                            const rate = rates[r.currency] || 1;
                            rev += parseFloat(r.total) / rate;
                        });
                    }
                    setRevenueZAR(rev);
                })
                .catch(console.error);
        };

        fetchStats();
        const interval = setInterval(fetchStats, 5000); // 5 seconds polling to show it's updating
        return () => clearInterval(interval);
    }, [rates]);

    const convertedValue = convertPrice(revenueZAR);

    // Calculate dynamic infinite goal
    let goal = 100;
    while (goal <= convertedValue) {
        if (goal.toString().startsWith('1')) goal *= 5; // e.g. 100 -> 500
        else goal *= 2; // e.g. 500 -> 1000
    }

    const progress = Math.min((convertedValue / goal) * 100, 100);

    return (
        <div className="flex flex-col items-end gap-1.5 w-40 sm:w-56 ml-2 mr-2">
            <div className="flex justify-between w-full text-xs font-semibold">
                <span className="text-muted-foreground whitespace-nowrap hidden sm:inline">Faturamento Total:</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold tracking-tight">
                    {formatPrice(convertedValue)}
                </span>
            </div>
            <Progress value={progress} className="h-2.5 w-full bg-muted shadow-inner" />
            <span className="text-[9px] text-muted-foreground self-start hidden sm:inline">
                Meta Atual: {formatPrice(goal)}
            </span>
        </div>
    );
}
