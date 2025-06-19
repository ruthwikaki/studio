
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, ShieldAlert, ShieldX, ShieldQuestion } from "lucide-react"; // Added ShieldX

interface ConfidenceIndicatorProps {
  level: 'High' | 'Medium' | 'Low' | string | undefined; 
  showText?: boolean;
  className?: string;
}

export default function ConfidenceIndicator({ level, showText = true, className }: ConfidenceIndicatorProps) {
  let variant: "default" | "secondary" | "destructive" | "outline" = "outline"; 
  let Icon = ShieldQuestion;
  let iconColor = "text-muted-foreground";
  let badgeClasses = "bg-muted/50 border-muted-foreground/30 hover:bg-muted/70";
  let text = level || "N/A";

  if (level === 'High') {
    variant = "default"; 
    Icon = ShieldCheck;
    iconColor = "text-success"; // Use CSS variable for success color
    badgeClasses = "bg-success/10 text-success border-success/30 hover:bg-success/20";
  } else if (level === 'Medium') {
    variant = "secondary";
    Icon = ShieldAlert;
    iconColor = "text-orange-500"; // Using specific orange for medium
    badgeClasses = "bg-orange-500/10 text-orange-500 dark:text-orange-400 border-orange-500/30 hover:bg-orange-500/20";
  } else if (level === 'Low') {
    variant = "destructive";
    Icon = ShieldX; // Using ShieldX for Low confidence
    iconColor = "text-destructive"; // Use CSS variable for destructive color
    badgeClasses = "bg-destructive/10 text-destructive border-destructive/30 hover:bg-destructive/20";
  }
  
  return (
    <Badge 
        variant={variant} 
        className={cn(
            "flex items-center gap-1 text-xs font-medium",
            badgeClasses,
            !showText && "px-1 py-0.5", // Compact padding if only icon
            className
        )}
    >
      <Icon className={cn(
          "h-3.5 w-3.5", 
          iconColor,
          !showText && "h-3.5 w-3.5" 
        )} />
      {showText && <span className="truncate max-w-[100px]">{text} Confidence</span>}
    </Badge>
  );
}
