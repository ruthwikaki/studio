import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type DashboardCardProps = {
  title: string;
  description?: string;
  icon?: LucideIcon;
  value?: string | number;
  className?: string;
  children?: React.ReactNode;
  valueClassName?: string;
};

export default function DashboardCard({
  title,
  description,
  icon: Icon,
  value,
  className,
  children,
  valueClassName,
}: DashboardCardProps) {
  return (
    <Card className={cn("shadow-lg hover:shadow-xl transition-shadow duration-300", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium font-body">{title}</CardTitle>
        {Icon && <Icon className="h-5 w-5 text-muted-foreground" />}
      </CardHeader>
      <CardContent>
        {value !== undefined && (
          <div className={cn("text-2xl font-bold font-headline", valueClassName)}>{value}</div>
        )}
        {description && (
          <p className="text-xs text-muted-foreground pt-1">{description}</p>
        )}
        {children}
      </CardContent>
    </Card>
  );
}
