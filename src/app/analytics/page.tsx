
import { BarChart3, TrendingUp, Lightbulb, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import Image from 'next/image';

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
              <p className="text-xs text-warning mt-2">⚠️ 3 products need forecast update (mock data)</p>
            </div>
            <Button className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" asChild>
              <Link href="/analytics/forecasting">
                Go to Detailed Forecasting Tools
              </Link>
            </Button>
             <Button variant="outline" className="w-full" disabled>
              Quick Forecast Top 5 (Coming Soon)
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
                Dive deeper into your inventory performance with interactive reports and AI-driven insights.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              This section will provide a suite of tools for comprehensive data analysis:
            </p>
            <ul className="list-disc list-inside text-sm space-y-1.5 pl-2 text-muted-foreground">
              <li><span className="text-foreground font-medium">Interactive Dashboards:</span> Explore key metrics with drill-down capabilities and customizable views.</li>
              <li><span className="text-foreground font-medium">Custom Report Generation:</span> Export data to PDF, CSV for presentations and further analysis.</li>
              <li><span className="text-foreground font-medium">In-Depth Analysis:</span> Perform ABC analysis, identify dead stock, track turnover rates, and more.</li>
              <li><span className="text-foreground font-medium">AI-Powered Insights:</span> Discover hidden trends, anomalies, and opportunities identified by our AI engine. (e.g., "Save $X by reordering Y items", "Supplier Z has delays").</li>
            </ul>
             <div className="h-32 bg-muted/30 rounded-lg flex items-center justify-center text-center p-4 mt-4">
                <div>
                    <Activity className="h-8 w-8 text-primary mx-auto mb-2" />
                    <p className="text-sm font-semibold text-foreground">Live Metrics & Visualizations</p>
                    <p className="text-xs text-muted-foreground">Real-time updates and interactive charts are planned for this area.</p>
                </div>
            </div>
            <Button variant="outline" className="w-full mt-4" disabled>
              Explore Advanced Analytics (Coming Soon)
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
            <CardTitle className="font-headline flex items-center">
                <Lightbulb className="h-6 w-6 mr-2 text-primary" />
                Actionable Insights Engine (Conceptual)
            </CardTitle>
            <CardDescription>
                Examples of AI-generated insights that will drive decision-making.
            </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="p-3 border rounded-lg bg-success/10 border-success/30">
                <p className="text-sm font-medium text-success-foreground">💡 Cost Saving: "You could save an estimated $2,400 by reordering these 3 critically low items today before prices increase next week."</p>
            </div>
            <div className="p-3 border rounded-lg bg-blue-500/10 border-blue-500/30">
                <p className="text-sm font-medium text-blue-700 dark:text-blue-300">📈 Performance: "Inventory turnover rate has improved by 15% this month compared to last month. Keep up the good work!"</p>
            </div>
             <div className="p-3 border rounded-lg bg-warning/10 border-warning/30">
                <p className="text-sm font-medium text-orange-600 dark:text-orange-400">⚠️ Supplier Alert: "Supplier 'Global Electronics Ltd.' is experiencing average delays of 3 days. Consider diversifying orders for critical components like SKU002."</p>
            </div>
            <p className="text-xs text-muted-foreground text-center">These insights will be dynamically generated based on your data and market conditions.</p>
        </CardContent>
      </Card>

    </div>
  );
}
