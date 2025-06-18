
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface ConfidenceIndicatorProps {
  level: 'High' | 'Medium' | 'Low' | string; // Allow string for flexibility
}

export default function ConfidenceIndicator({ level }: ConfidenceIndicatorProps) {
  let variant: "default" | "secondary" | "destructive" = "secondary";
  if (level === 'High') variant = "default"; // Assuming default is good (like primary/success)
  if (level === 'Low') variant = "destructive";
  
  return (
    <Badge variant={variant} className={cn(
        level === 'High' && "bg-success/80 text-success-foreground",
        level === 'Medium' && "bg-warning/80 text-warning-foreground",
        level === 'Low' && "bg-destructive/80 text-destructive-foreground"
    )}>
      {level} Confidence
    </Badge>
  );
}
