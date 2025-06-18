
"use client";

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, BarChartBig, TrendingUp, Info, CalendarClock, BarChartHorizontalBig, Lightbulb, Zap } from 'lucide-react';
import { useGenerateDemandForecast } from '@/hooks/useAnalytics';
import type { ForecastDemandOutput } from '@/ai/flows/forecasting';
import ForecastChart from '@/components/analytics/forecasting/ForecastChart';
import ForecastMetricCard from '@/components/analytics/forecasting/ForecastMetricCard';
import ScenarioSimulator from '@/components/analytics/forecasting/ScenarioSimulator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import ConfidenceIndicator from '@/components/analytics/forecasting/ConfidenceIndicator';
import { Separator } from '@/components/ui/separator';

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
  {"date": "2023-03-19", "quantitySold": 30},
  {"date": "2023-03-26", "quantitySold": 28},
  {"date": "2023-04-02", "quantitySold": 32},
  {"date": "2023-04-09", "quantitySold": 35},
  {"date": "2023-04-16", "quantitySold": 33},
  {"date": "2023-04-23", "quantitySold": 37},
  {"date": "2023-04-30", "quantitySold": 40}
], null, 2);


export default function ForecastingPage() {
  const [sku, setSku] = useState('SKU001');
  const [historicalSalesData, setHistoricalSalesData] = useState(SAMPLE_HISTORICAL_DATA);
  const [seasonalityFactors, setSeasonalityFactors] = useState('Standard retail seasonality, minor bump in Q4 holidays.');
  
  const generateForecastMutation = useGenerateDemandForecast();
  const [forecastResult, setForecastResult] = useState<ForecastDemandOutput | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForecastResult(null); 
    try {
      JSON.parse(historicalSalesData);
    } catch (error) {
      generateForecastMutation.reset();
      // Consider using toast for this error
      alert("Historical sales data is not valid JSON."); 
      return;
    }

    const result = await generateForecastMutation.mutateAsync({
      sku,
      historicalSalesData,
      seasonalityFactors,
    });
    if (result) {
      setForecastResult(result);
    }
  };
  
  const isLoading = generateForecastMutation.isPending;

  const getAverageDemand = (period: '30day' | '60day' | '90day') => {
    if (!forecastResult) return "N/A";
    const demand = forecastResult.predictions[period].demand;
    const days = parseInt(period.replace('day', ''));
    return (demand / days).toFixed(1);
  };

  const getTotalPredictedUnits = (period: '30day' | '60day' | '90day') => {
    if (!forecastResult) return "N/A";
    return forecastResult.predictions[period].demand.toLocaleString();
  }

  return (
    <div className="flex flex-col gap-8 py-6">
      <Card className="shadow-xl border-border">
        <CardHeader>
          <CardTitle className="font-headline text-2xl flex items-center text-foreground">
            <Zap className="h-7 w-7 mr-3 text-primary" />
            Demand Forecasting Engine
          </CardTitle>
          <CardDescription className="text-base">
            Input product details and historical sales to generate future demand predictions using AI.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              <div>
                <Label htmlFor="sku" className="font-medium text-foreground">Product SKU</Label>
                <Input
                  id="sku"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  placeholder="Enter product SKU (e.g., TSHIRT-BLUE-L)"
                  required
                  className="mt-1 bg-background"
                />
                 <p className="text-xs text-muted-foreground mt-1.5">
                  Future: Searchable dropdown from your inventory.
                </p>
              </div>
               <div>
                <Label htmlFor="seasonalityFactors" className="font-medium text-foreground">Seasonality Factors & Market Conditions</Label>
                <Input
                  id="seasonalityFactors"
                  value={seasonalityFactors}
                  onChange={(e) => setSeasonalityFactors(e.target.value)}
                  placeholder="e.g., Summer peak, Q4 holiday promotion, new competitor"
                  className="mt-1 bg-background"
                />
                 <p className="text-xs text-muted-foreground mt-1.5">
                  Describe any known events or trends that might impact demand.
                </p>
              </div>
            </div>
            <div>
              <Label htmlFor="historicalSalesData" className="font-medium text-foreground">Historical Sales Data (JSON)</Label>
              <Textarea
                id="historicalSalesData"
                value={historicalSalesData}
                onChange={(e) => setHistoricalSalesData(e.target.value)}
                placeholder='[{"date": "YYYY-MM-DD", "quantitySold": number}, ...]'
                rows={10}
                className="font-mono text-xs mt-1 bg-background"
                required
              />
              <p className="text-xs text-muted-foreground mt-1.5">
                Provide historical sales as a JSON array. Each object needs a "date" (YYYY-MM-DD) and "quantitySold" (number).
                Future: Auto-fetch based on SKU, CSV upload, or manual table input.
              </p>
            </div>
          </CardContent>
          <CardFooter className="border-t pt-6 flex justify-between items-center bg-muted/30 rounded-b-lg">
            <Button type="submit" disabled={isLoading} className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 text-base">
              {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <BarChartBig className="mr-2 h-5 w-5" />}
              Generate Forecast
            </Button>
             <Link href="/analytics/forecasting/bulk" className="text-sm text-primary hover:underline">
                Go to Bulk Forecasting &raquo;
            </Link>
          </CardFooter>
        </form>
      </Card>

      {isLoading && (
        <Card className="shadow-md animate-pulse border-border">
            <CardHeader>
                <Skeleton className="h-8 w-3/4 rounded-md" />
                <Skeleton className="h-4 w-1/2 mt-2 rounded-md" />
            </CardHeader>
            <CardContent className="space-y-8 pt-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Skeleton className="h-28 w-full rounded-lg" />
                    <Skeleton className="h-28 w-full rounded-lg" />
                    <Skeleton className="h-28 w-full rounded-lg" />
                    <Skeleton className="h-28 w-full rounded-lg" />
                    <Skeleton className="h-28 w-full rounded-lg" />
                    <Skeleton className="h-28 w-full rounded-lg" />
                </div>
                <Separator />
                <Skeleton className="h-80 w-full rounded-lg" />
                 <Separator />
                 <Skeleton className="h-20 w-full rounded-lg" />
                 <Separator />
                 <Skeleton className="h-40 w-full rounded-lg" />
            </CardContent>
        </Card>
      )}
      
      {generateForecastMutation.isError && !isLoading && (
         <Alert variant="destructive" className="shadow-md border-destructive">
            <Info className="h-5 w-5" />
            <AlertTitle className="font-semibold text-lg">Error Generating Forecast</AlertTitle>
            <AlertDescription className="text-base">
              {generateForecastMutation.error?.message || "An unknown error occurred. Please check your inputs and try again."}
            </AlertDescription>
          </Alert>
      )}

      {forecastResult && !isLoading && (
        <Card className="shadow-xl border-border">
          <CardHeader className="pb-4">
            <CardTitle className="font-headline text-2xl text-foreground">Forecast Results for SKU: <span className="text-primary">{forecastResult.sku}</span></CardTitle>
            <CardDescription className="text-base">Predictions and insights based on the data provided.</CardDescription>
          </CardHeader>
          <Separator />
          <CardContent className="pt-6 space-y-8">
            
            <section>
              <h3 className="text-xl font-semibold mb-4 text-foreground flex items-center">
                <BarChartHorizontalBig className="h-6 w-6 mr-2 text-primary" />
                Key Metrics
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <ForecastMetricCard title="30-Day Forecast" value={getTotalPredictedUnits('30day')} description={<ConfidenceIndicator level={forecastResult.predictions['30day'].confidence} />} />
                <ForecastMetricCard title="60-Day Forecast" value={getTotalPredictedUnits('60day')} description={<ConfidenceIndicator level={forecastResult.predictions['60day'].confidence} />} />
                <ForecastMetricCard title="90-Day Forecast" value={getTotalPredictedUnits('90day')} description={<ConfidenceIndicator level={forecastResult.predictions['90day'].confidence} />} />
                <ForecastMetricCard title="Avg. Daily Demand (30d)" value={getAverageDemand('30day')} description="Approximate daily average" />
                <ForecastMetricCard title="Total Predicted (90d)" value={getTotalPredictedUnits('90day')} description="Total units for next 90 days" />
                <ForecastMetricCard title="Peak Demand Period" value={"N/A"} description="Analysis pending" />
              </div>
            </section>
            
            <Separator />

            <section>
              <h3 className="text-xl font-semibold mb-4 text-foreground flex items-center">
                <TrendingUp className="h-6 w-6 mr-2 text-primary" />
                Demand Projection Chart
                </h3>
              <ForecastChart historicalData={JSON.parse(historicalSalesData)} predictions={forecastResult.predictions} />
            </section>
            
            {forecastResult.predictions['30day'].explanation && (
              <>
                <Separator />
                <section>
                    <Alert className="bg-blue-50 border-blue-300 dark:bg-blue-900/30 dark:border-blue-700/50 shadow">
                        <Lightbulb className="h-5 w-5 text-primary" />
                        <AlertTitle className="font-semibold text-primary text-lg">AI Explanation (30-day Forecast)</AlertTitle>
                        <AlertDescription className="text-blue-700 dark:text-blue-300 text-base mt-1">{forecastResult.predictions['30day'].explanation}</AlertDescription>
                    </Alert>
                </section>
               </>
             )}
            
            <Separator />

            <section>
              <h3 className="text-xl font-semibold mb-4 text-foreground flex items-center">
                <CalendarClock className="h-6 w-6 mr-2 text-primary" />
                Forecast Details & Actions
              </h3>
               <div className="p-6 border rounded-lg bg-muted/30 text-center min-h-[150px] flex flex-col justify-center items-center">
                 <p className="text-muted-foreground text-base">A detailed table with daily/weekly breakdown, min-max range, confidence percentages, and recommended actions is a planned feature.</p>
                 <Button variant="outline" size="lg" className="mt-4 text-base" disabled>Export Details to CSV (Coming Soon)</Button>
               </div>
            </section>
          </CardContent>
        </Card>
      )}

      <Card className="shadow-lg border-border mt-4">
        <CardHeader>
          <CardTitle className="font-headline text-2xl text-foreground">Scenario Analysis (What-If Simulator)</CardTitle>
          <CardDescription className="text-base">Explore how different factors might impact your forecast. (Feature in development)</CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          <ScenarioSimulator />
        </CardContent>
      </Card>
    </div>
  );
}

    