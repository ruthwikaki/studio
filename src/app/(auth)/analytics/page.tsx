
import { BarChart3, TrendingUp, Lightbulb, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function AnalyticsPage() {
  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-3xl font-headline font-semibold text-foreground">Analytics Command Center</h1>
      
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader>
            <CardTitle className="font-headline flex items-center">
              <TrendingUp className="h-6 w-6 mr-2 text-primary" />
              Demand Forecasting Hub
            </CardTitle>
            <CardDescription>
              Access forecasting tools, quick insights, and alerts.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-start space-y-4">
            <div className="w-full p-4 border rounded-lg bg-muted/30">
              <h4 className="font-semibold text-sm mb-2">Quick Overview (Mock)</h4>
              <div className="flex items-center justify-between text-xs mb-2">
                <span>Overall Trend:</span>
                <span className="flex items-center text-success font-medium">
                  <TrendingUp className="h-3 w-3 mr-1" /> +15%
                </span>
              </div>
              <div className="h-20 bg-background rounded flex items-center justify-center text-muted-foreground text-xs">
                [Mini Trend Chart Placeholder]
              </div>
            </div>
            <Button className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" asChild>
              <Link href="/analytics/forecasting">
                Go to Detailed Forecasting Tools
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader>
            <CardTitle className="font-headline flex items-center">
              <BarChart3 className="h-6 w-6 mr-2 text-primary" />
              Advanced Analytics & Reporting
            </CardTitle>
             <CardDescription>
                Dive deeper into your inventory performance with interactive reports.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              This section will provide a suite of tools for comprehensive data analysis.
            </p>
            <ul className="list-disc list-inside text-sm space-y-1.5 pl-2 text-muted-foreground">
              <li><span className="text-foreground font-medium">Interactive Dashboards</span></li>
              <li><span className="text-foreground font-medium">Custom Report Generation</span></li>
              <li><span className="text-foreground font-medium">In-Depth Analysis (ABC, Dead Stock)</span></li>
            </ul>
             <div className="h-32 bg-muted/30 rounded-lg flex items-center justify-center text-center p-4 mt-4">
                <div>
                    <Activity className="h-8 w-8 text-primary mx-auto mb-2" />
                    <p className="text-sm font-semibold text-foreground">Live Metrics & Visualizations (Soon)</p>
                </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
