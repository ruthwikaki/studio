
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, ShieldAlert, ShieldQuestion } from "lucide-react";

interface ConfidenceIndicatorProps {
  level: 'High' | 'Medium' | 'Low' | string; 
  showText?: boolean;
}

export default function ConfidenceIndicator({ level, showText = true }: ConfidenceIndicatorProps) {
  let variant: "default" | "secondary" | "destructive" = "secondary";
  let Icon = ShieldQuestion;

  if (level === 'High') {
    variant = "default"; // Greenish
    Icon = ShieldCheck;
  } else if (level === 'Medium') {
    variant = "secondary"; // Yellowish/Orangish
    Icon = ShieldAlert;
  } else if (level === 'Low') {
    variant = "destructive"; // Reddish
    Icon = ShieldAlert; // Could be a different icon for low
  }
  
  return (
    <Badge variant={variant} className={cn(
        "flex items-center gap-1.5 text-xs",
        level === 'High' && "bg-success/10 text-success border-success/30 hover:bg-success/20",
        level === 'Medium' && "bg-warning/10 text-orange-600 dark:text-orange-400 border-warning/30 hover:bg-warning/20", // Custom styling for warning to be more orange
        level === 'Low' && "bg-destructive/10 text-destructive border-destructive/30 hover:bg-destructive/20",
        !showText && "px-1.5 py-1"
    )}>
      <Icon className={cn("h-3.5 w-3.5", !showText && "h-4 w-4")} />
      {showText && `${level} Confidence`}
    </Badge>
  );
}
