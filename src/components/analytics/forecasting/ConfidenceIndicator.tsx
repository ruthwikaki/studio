
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, ShieldAlert, ShieldQuestion } from "lucide-react";

interface ConfidenceIndicatorProps {
  level: 'High' | 'Medium' | 'Low' | string; 
  showText?: boolean;
}

export default function ConfidenceIndicator({ level, showText = true }: ConfidenceIndicatorProps) {
  let variant: "default" | "secondary" | "destructive" | "outline" = "outline"; // Default to outline for unknown
  let Icon = ShieldQuestion;
  let iconColor = "text-muted-foreground";
  let badgeClasses = "bg-muted/50 border-muted-foreground/30 hover:bg-muted/70";

  if (level === 'High') {
    variant = "default"; // Shadcn 'default' can be styled as success
    Icon = ShieldCheck;
    iconColor = "text-success";
    badgeClasses = "bg-success/10 text-success border-success/30 hover:bg-success/20";
  } else if (level === 'Medium') {
    variant = "secondary"; // Shadcn 'secondary' can be styled as warning
    Icon = ShieldAlert;
    iconColor = "text-orange-500"; // More distinct orange
    badgeClasses = "bg-warning/10 text-orange-500 dark:text-orange-400 border-warning/30 hover:bg-warning/20";
  } else if (level === 'Low') {
    variant = "destructive";
    Icon = ShieldAlert; // Or a different icon if desired for low, e.g. ShieldX
    iconColor = "text-destructive";
    badgeClasses = "bg-destructive/10 text-destructive border-destructive/30 hover:bg-destructive/20";
  }
  
  return (
    <Badge 
        variant={variant} 
        className={cn(
            "flex items-center gap-1.5 text-xs font-medium",
            badgeClasses,
            !showText && "px-1.5 py-1" // Compact padding if only icon
        )}
    >
      <Icon className={cn(
          "h-3.5 w-3.5", 
          iconColor,
          !showText && "h-4 w-4" // Slightly larger icon if no text
        )} />
      {showText && <span>{level} Confidence</span>}
    </Badge>
  );
}
