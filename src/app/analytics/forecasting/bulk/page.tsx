
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Layers, Table, BarChart } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function BulkForecastingPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-headline font-semibold text-foreground">Bulk Demand Forecasting</h1>
      
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline flex items-center">
            <Layers className="h-6 w-6 mr-2 text-primary" />
            Bulk Forecast Generation
          </CardTitle>
          <CardDescription>
            Forecast demand for multiple products or entire categories at once. Select SKUs, apply models, and generate consolidated reports.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center text-center min-h-[400px] p-6 bg-muted/30 rounded-b-lg">
          <div className="w-full max-w-2xl p-6 border rounded-lg bg-background shadow">
            <h3 className="text-xl font-semibold mb-4 text-primary">Interactive Bulk Forecasting Interface</h3>
            <p className="text-muted-foreground mb-3">
              This area will feature an interactive interface for bulk forecasting.
            </p>
            <ul className="list-disc list-inside text-left text-sm text-muted-foreground space-y-1 mb-4">
              <li>Select multiple SKUs, categories, or import a list.</li>
              <li>Apply different forecasting models to selected groups.</li>
              <li>Adjust parameters for scenarios (e.g., "New Product Launch", "Seasonal Peak").</li>
              <li>View results in a smart table with filtering and sorting.</li>
              <li>Visualize consolidated demand projections with D3.js powered charts.</li>
              <li>Export bulk forecast reports to CSV/PDF.</li>
            </ul>
            <div className="flex items-center justify-center h-32 bg-muted rounded-md mb-4">
              <BarChart className="h-16 w-16 text-primary/50" />
            </div>
            <p className="text-xs text-muted-foreground">
              (Feature in development: D3.js charts and smart tables for bulk forecasting.)
            </p>
          </div>
          <Link href="/analytics/forecasting" className="mt-6">
            <Button variant="outline">
              Back to Single Product Forecasting
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
