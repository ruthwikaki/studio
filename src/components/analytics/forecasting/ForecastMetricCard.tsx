
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";

interface ForecastMetricCardProps {
  title: string;
  value: string | number | React.ReactNode;
  description?: string | React.ReactNode;
  icon?: LucideIcon;
  className?: string;
}

export default function ForecastMetricCard({ title, value, description, icon: Icon, className }: ForecastMetricCardProps) {
  return (
    <Card className={`shadow-md hover:shadow-lg transition-shadow bg-card border ${className}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium font-body text-muted-foreground">{title}</CardTitle>
        {Icon && <Icon className="h-4 w-4 text-primary" />}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold font-headline text-foreground">{value}</div>
        {description && <div className="text-xs text-muted-foreground pt-1">{description}</div>}
      </CardContent>
    </Card>
  );
}
