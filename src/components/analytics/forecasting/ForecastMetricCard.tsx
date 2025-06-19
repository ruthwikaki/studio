
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ForecastMetricCardProps {
  title: string;
  value: string | number | React.ReactNode;
  description?: string | React.ReactNode;
  icon?: LucideIcon;
  className?: string;
  valueClassName?: string;
}

export default function ForecastMetricCard({ title, value, description, icon: Icon, className, valueClassName }: ForecastMetricCardProps) {
  return (
    <Card className={cn("shadow-md hover:shadow-lg transition-shadow bg-card border", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-semibold font-body text-card-foreground">
          {title}
        </CardTitle>
        {Icon && <Icon className="h-4 w-4 text-primary" />}
      </CardHeader>
      <CardContent>
        <div className={cn("text-2xl font-bold font-headline text-foreground", valueClassName)}>{value}</div>
        {description && <div className="text-xs text-muted-foreground pt-1">{description}</div>}
      </CardContent>
    </Card>
  );
}
