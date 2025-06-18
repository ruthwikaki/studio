
"use client";

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, BarChartBig, TrendingUp, Info } from 'lucide-react';
import { useGenerateDemandForecast } from '@/hooks/useAnalytics';
import type { ForecastDemandOutput } from '@/ai/flows/forecasting';
import ForecastChart from '@/components/analytics/forecasting/ForecastChart';
import ForecastMetricCard from '@/components/analytics/forecasting/ForecastMetricCard';
import ScenarioSimulator from '@/components/analytics/forecasting/ScenarioSimulator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';

// Sample historical data for placeholder
const SAMPLE_HISTORICAL_DATA = JSON.stringify([
  {"date": "2023-01-01", "quantitySold": 10},
  {"date": "2023-01-08", "quantitySold": 12},
  {"date": "2023-01-15", "quantitySold": 15},
  {"date": "2023-01-22", "quantitySold": 13},
  {"date": "2023-01-29", "quantitySold": 17},
  {"date": "2023-02-05", "quantitySold": 20},
  {"date": "2023-02-12", "quantitySold": 18},
  {"date": "2023-02-19", "quantitySold": 22},
  {"date": "2023-02-26", "quantitySold": 25},
  {"date": "2023-03-05", "quantitySold": 23},
  {"date": "2023-03-12", "quantitySold": 27},
  {"date": "2023-03-19", "quantitySold": 30}
], null, 2);


export default function ForecastingPage() {
  const [sku, setSku] = useState('SKU001');
  const [historicalSalesData, setHistoricalSalesData] = useState(SAMPLE_HISTORICAL_DATA);
  const [seasonalityFactors, setSeasonalityFactors] = useState('Standard retail seasonality, minor bump in Q4.');
  
  const generateForecastMutation = useGenerateDemandForecast();
  const [forecastResult, setForecastResult] = useState<ForecastDemandOutput | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForecastResult(null); // Clear previous results
    try {
      // Basic validation for historicalSalesData
      JSON.parse(historicalSalesData);
    } catch (error) {
      generateForecastMutation.reset(); // Ensure an error in the mutation state is cleared if this is a pre-flight client error
       alert("Historical sales data is not valid JSON."); // Simple alert, use toast for better UX
      return;
    }

    const result = await generateForecastMutation.mutateAsync({
      sku,
      historicalSalesData,
      seasonalityFactors,
    });
    if (result) { // mutateAsync will throw on error, so if we get here, it's a success from the hook's perspective
      setForecastResult(result);
    }
    // Errors are handled by the useMutation hook's onError callback (toast)
  };
  
  const isLoading = generateForecastMutation.isPending;

  return (
    <div className="flex flex-col gap-8">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-2xl flex items-center">
            <TrendingUp className="h-6 w-6 mr-2 text-primary" />
            Demand Forecasting
          </CardTitle>
          <CardDescription>
            Input product details and historical data to generate future demand predictions.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="sku">Product SKU</Label>
                <Input
                  id="sku"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  placeholder="Enter product SKU (e.g., TSHIRT-BLUE-L)"
                  required
                />
              </div>
               <div>
                <Label htmlFor="seasonalityFactors">Seasonality Factors & Market Conditions</Label>
                <Input
                  id="seasonalityFactors"
                  value={seasonalityFactors}
                  onChange={(e) => setSeasonalityFactors(e.target.value)}
                  placeholder="e.g., Summer peak, Christmas promotion"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="historicalSalesData">Historical Sales Data (JSON)</Label>
              <Textarea
                id="historicalSalesData"
                value={historicalSalesData}
                onChange={(e) => setHistoricalSalesData(e.target.value)}
                placeholder='[{"date": "YYYY-MM-DD", "quantitySold": number}, ...]'
                rows={8}
                className="font-mono text-xs"
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                Provide historical sales as a JSON array of objects. Each object needs a "date" (YYYY-MM-DD) and "quantitySold" (number).
              </p>
            </div>
          </CardContent>
          <CardFooter className="border-t pt-6">
            <Button type="submit" disabled={isLoading} className="bg-accent hover:bg-accent/90 text-accent-foreground">
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BarChartBig className="mr-2 h-4 w-4" />}
              Generate Forecast
            </Button>
          </CardFooter>
        </form>
      </Card>

      {isLoading && (
        <Card className="shadow-md">
            <CardHeader><CardTitle>Generating Forecast...</CardTitle></CardHeader>
            <CardContent className="space-y-4">
                <Skeleton className="h-64 w-full" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-24 w-full" />
                </div>
            </CardContent>
        </Card>
      )}
      
      {generateForecastMutation.isError && (
         <Alert variant="destructive">
            <Info className="h-4 w-4" />
            <AlertTitle>Error Generating Forecast</AlertTitle>
            <AlertDescription>
              {generateForecastMutation.error?.message || "An unknown error occurred. Please try again."}
            </AlertDescription>
          </Alert>
      )}

      {forecastResult && !isLoading && (
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="font-headline text-xl">Forecast Results for SKU: {forecastResult.sku}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">Demand Projection Chart</h3>
              <ForecastChart historicalData={JSON.parse(historicalSalesData)} predictions={forecastResult.predictions} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <ForecastMetricCard title="30-Day Forecast" value={forecastResult.predictions['30day'].demand.toLocaleString()} description={`Confidence: ${forecastResult.predictions['30day'].confidence}`} />
              <ForecastMetricCard title="60-Day Forecast" value={forecastResult.predictions['60day'].demand.toLocaleString()} description={`Confidence: ${forecastResult.predictions['60day'].confidence}`} />
              <ForecastMetricCard title="90-Day Forecast" value={forecastResult.predictions['90day'].demand.toLocaleString()} description={`Confidence: ${forecastResult.predictions['90day'].confidence}`} />
              <ForecastMetricCard title="Average Demand (Next 90 Days)" value={
                  ((forecastResult.predictions['30day'].demand + forecastResult.predictions['60day'].demand + forecastResult.predictions['90day'].demand) / 3).toLocaleString(undefined, {maximumFractionDigits:0}) + " /period"
              } description="Average predicted demand" />
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">Forecast Details</h3>
               <p className="text-sm text-muted-foreground mb-4">Detailed breakdown and recommended actions are planned features.</p>
              {/* Placeholder for Forecast Details Table */}
              {/* <Button variant="outline" size="sm">Export Details to CSV</Button> */}
            </div>
             {forecastResult.predictions['30day'].explanation && (
                <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>AI Explanation (30-day)</AlertTitle>
                    <AlertDescription>{forecastResult.predictions['30day'].explanation}</AlertDescription>
                </Alert>
             )}
          </CardContent>
        </Card>
      )}

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-xl">Scenario Analysis (What-If Simulator)</CardTitle>
          <CardDescription>Explore how different factors might impact your forecast. (Feature in development)</CardDescription>
        </CardHeader>
        <CardContent>
          <ScenarioSimulator />
        </CardContent>
      </Card>
       <Button variant="link" onClick={() => window.location.href='/analytics/forecasting/bulk'}>Go to Bulk Forecasting (Placeholder)</Button>
    </div>
  );
}

