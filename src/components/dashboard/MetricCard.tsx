import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: ReactNode;
  isPrimary?: boolean;
}

export default function MetricCard({ title, value, change, changeType = "neutral", icon }: MetricCardProps) {
  return (
    <Card className="animate-fade-in glass-card group hover:border-primary/50 transition-all duration-300 shadow-xl shadow-black/5 hover:shadow-primary/5">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground/70 group-hover:text-primary transition-colors">{title}</p>
            <div className="space-y-1">
              <p className="text-2xl font-black tracking-tight animate-count-up">{value}</p>
              {change && (
                <div
                  className={cn(
                    "text-[10px] font-bold px-2 py-0.5 rounded-md inline-flex items-center gap-1 uppercase tracking-tighter",
                    changeType === "positive" && "bg-success/10 text-success border border-success/20",
                    changeType === "negative" && "bg-destructive/10 text-destructive border border-destructive/20",
                    changeType === "neutral" && "bg-muted text-muted-foreground border border-muted-foreground/10"
                  )}
                >
                  <span className="h-1 w-1 rounded-full bg-current" />
                  {change}
                </div>
              )}
            </div>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary/50 text-primary border border-primary/20 shadow-inner group-hover:bg-primary group-hover:text-white transition-all duration-300">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
