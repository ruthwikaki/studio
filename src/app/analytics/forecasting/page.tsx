
"use client";

import { useState, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, BarChartBig, TrendingUp, Info, CalendarClock, BarChartHorizontalBig, Lightbulb, Zap, Layers, Brain, SlidersHorizontal, BarChart, ListFilter } from 'lucide-react';
import { useGenerateDemandForecast } from '@/hooks/useAnalytics';
import type { ForecastDemandOutput, ModelType } from '@/ai/flows/forecasting';
import ForecastChart from '@/components/analytics/forecasting/ForecastChart';
import ForecastMetricCard from '@/components/analytics/forecasting/ForecastMetricCard';
import ScenarioSimulator from '@/components/analytics/forecasting/ScenarioSimulator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import ConfidenceIndicator from '@/components/analytics/forecasting/ConfidenceIndicator';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const SAMPLE_HISTORICAL_DATA = JSON.stringify([
  {"date": "2023-01-01", "quantitySold": 10},
  {"date": "2023-01-08", "quantitySold": 12},
  {"date": "2023-01-15", "quantitySold": 15},
  {"date": "2023-01-22", "quantitySold": 13},
  {"date": "2023-01-29", "quantitySold": 18},
  {"date": "2023-02-05", "quantitySold": 20},
  {"date": "2023-02-12", "quantitySold": 22},
  {"date": "2023-02-19", "quantitySold": 19},
  {"date": "2023-02-26", "quantitySold": 25},
  {"date": "2023-03-05", "quantitySold": 28},
  {"date": "2023-03-12", "quantitySold": 30},
  {"date": "2023-03-19", "quantitySold": 27},
  {"date": "2023-03-26", "quantitySold": 33},
  {"date": "2023-04-02", "quantitySold": 35},
  {"date": "2023-04-09", "quantitySold": 38},
  {"date": "2023-04-16", "quantitySold": 36},
  {"date": "2023-04-23", "quantitySold": 32},
  {"date": "2023-04-30", "quantitySold": 40}
], null, 2);

const FORECAST_MODELS: { value: ModelType; label: string; description: string }[] = [
  { value: "AI_PATTERN_RECOGNITION", label: "AI Pattern Recognition", description: "Gemini analyzes multiple factors for complex patterns." },
  { value: "SIMPLE_MOVING_AVERAGE", label: "Simple Moving Average", description: "Averages last N periods. Best for stable demand." },
  { value: "EXPONENTIAL_SMOOTHING", label: "Exponential Smoothing", description: "Weights recent data more. Good for slight trends." },
  { value: "SEASONAL_DECOMPOSITION", label: "Seasonal Decomposition", description: "Identifies yearly patterns. Ideal for seasonal items." },
  { value: "REGRESSION_ANALYSIS", label: "Regression Analysis", description: "Correlates demand with factors like price, promotions." },
  { value: "ENSEMBLE_COMBINED", label: "Ensemble (Combined)", description: "Combines strengths of multiple models for max accuracy." },
];


export default function ForecastingPage() {
  const [sku, setSku] = useState('SKU001');
  const [historicalSalesData, setHistoricalSalesData] = useState(SAMPLE_HISTORICAL_DATA);
  const [seasonalityFactors, setSeasonalityFactors] = useState('Standard retail seasonality, minor bump in Q4 holidays.');
  const [selectedModelType, setSelectedModelType] = useState<ModelType>("AI_PATTERN_RECOGNITION");
  
  const generateForecastMutation = useGenerateDemandForecast();
  const [forecastResult, setForecastResult] = useState<ForecastDemandOutput | null>(null);
  const [scenarioForecastResult, setScenarioForecastResult] = useState<ForecastDemandOutput | null>(null);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForecastResult(null); 
    setScenarioForecastResult(null);
    try {
      JSON.parse(historicalSalesData); // Basic validation
    } catch (error) {
      generateForecastMutation.reset(); // Clear any previous error state from mutation hook
      alert("Historical sales data is not valid JSON."); 
      return;
    }

    const result = await generateForecastMutation.mutateAsync({
      sku,
      historicalSalesData,
      seasonalityFactors,
      modelType: selectedModelType,
    });
    if (result) {
      setForecastResult(result);
    }
  };
  
  const isLoading = generateForecastMutation.isPending;

  const getAverageDemand = (period: '30day' | '60day' | '90day', sourceForecast: ForecastDemandOutput | null) => {
    if (!sourceForecast) return "N/A";
    const demand = sourceForecast.predictions[period].demand;
    const days = parseInt(period.replace('day', ''));
    return (demand / days).toFixed(1);
  };

  const getTotalPredictedUnits = (period: '30day' | '60day' | '90day', sourceForecast: ForecastDemandOutput | null) => {
    if (!sourceForecast) return "N/A";
    return sourceForecast.predictions[period].demand.toLocaleString();
  }

  const displayForecast = scenarioForecastResult || forecastResult;
  const currentModelDescription = FORECAST_MODELS.find(m => m.value === (displayForecast?.modelUsed || selectedModelType))?.description;

  return (
    <div className="flex flex-col gap-8 py-6">
      <Card className="shadow-xl border-border">
        <CardHeader>
          <CardTitle className="font-headline text-2xl flex items-center text-foreground">
            <Zap className="h-7 w-7 mr-3 text-primary" />
            Demand Forecasting Engine
          </CardTitle>
          <CardDescription className="text-base">
            Input product details, historical sales, and select a model to generate future demand predictions using AI.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
              <div>
                <Label htmlFor="sku" className="font-medium text-foreground">Product SKU</Label>
                <Input
                  id="sku"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  placeholder="Enter product SKU"
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
                  placeholder="e.g., Summer peak, Q4 holiday promotion"
                  className="mt-1 bg-background"
                />
                 <p className="text-xs text-muted-foreground mt-1.5">
                  Describe known events or trends.
                </p>
              </div>
              <div>
                <Label htmlFor="modelType" className="font-medium text-foreground">Forecasting Model</Label>
                <Select value={selectedModelType} onValueChange={(value: ModelType) => setSelectedModelType(value)}>
                  <SelectTrigger id="modelType" className="mt-1 bg-background">
                    <SelectValue placeholder="Select a model" />
                  </SelectTrigger>
                  <SelectContent>
                    {FORECAST_MODELS.map(model => (
                      <SelectItem key={model.value} value={model.value}>
                        {model.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                 <p className="text-xs text-muted-foreground mt-1.5">
                   {FORECAST_MODELS.find(m => m.value === selectedModelType)?.description || "Choose a forecasting approach."}
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
                rows={8}
                className="font-mono text-xs mt-1 bg-background"
                required
              />
              <p className="text-xs text-muted-foreground mt-1.5">
                Provide historical sales as a JSON array. Each object needs a "date" (YYYY-MM-DD) and "quantitySold" (number).
                Future: Auto-fetch, CSV upload, or manual table input.
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

      {displayForecast && !isLoading && (
        <Card className="shadow-xl border-border">
          <CardHeader className="pb-4">
            <CardTitle className="font-headline text-2xl text-foreground">
              Forecast Results for SKU: <span className="text-primary">{displayForecast.sku}</span>
              {scenarioForecastResult && <span className="text-orange-500 font-normal text-xl ml-2">(Scenario Applied)</span>}
            </CardTitle>
            <CardDescription className="text-base">
                Using model: <span className="font-semibold text-accent">{FORECAST_MODELS.find(m=>m.value === displayForecast.modelUsed)?.label || displayForecast.modelUsed}</span>.
                {displayForecast.accuracyScore && ` Illustrative Accuracy: ${displayForecast.accuracyScore.toFixed(0)}%.`}
            </CardDescription>
            {currentModelDescription && <p className="text-sm text-muted-foreground mt-1">{currentModelDescription}</p>}
          </CardHeader>
          <Separator />
          <CardContent className="pt-6 space-y-8">
            
            <section>
              <h3 className="text-xl font-semibold mb-4 text-foreground flex items-center">
                <BarChartHorizontalBig className="h-6 w-6 mr-2 text-primary" />
                Key Metrics
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <ForecastMetricCard title="30-Day Forecast" value={getTotalPredictedUnits('30day', displayForecast)} description={<ConfidenceIndicator level={displayForecast.predictions['30day'].confidence} />} />
                <ForecastMetricCard title="60-Day Forecast" value={getTotalPredictedUnits('60day', displayForecast)} description={<ConfidenceIndicator level={displayForecast.predictions['60day'].confidence} />} />
                <ForecastMetricCard title="90-Day Forecast" value={getTotalPredictedUnits('90day', displayForecast)} description={<ConfidenceIndicator level={displayForecast.predictions['90day'].confidence} />} />
                <ForecastMetricCard title="Avg. Daily Demand (30d)" value={getAverageDemand('30day', displayForecast)} description="Approximate daily average" />
                <ForecastMetricCard title="Total Predicted (90d)" value={getTotalPredictedUnits('90day', displayForecast)} description="Total units for next 90 days" />
                <ForecastMetricCard title="Peak Demand Period" value={"N/A"} description="Analysis pending" />
              </div>
            </section>
            
            <Separator />

            <section>
              <h3 className="text-xl font-semibold mb-4 text-foreground flex items-center">
                <TrendingUp className="h-6 w-6 mr-2 text-primary" />
                Demand Projection Chart
                </h3>
              <ForecastChart 
                historicalData={JSON.parse(historicalSalesData)} 
                baselinePredictions={forecastResult?.predictions ?? null}
                scenarioPredictions={scenarioForecastResult?.predictions ?? null}
              />
            </section>
            
            {(displayForecast.modelExplanation || displayForecast.predictions['30day'].explanation) && (
              <>
                <Separator />
                <section>
                    <Alert className="bg-blue-50 border-blue-300 dark:bg-blue-900/30 dark:border-blue-700/50 shadow">
                        <Lightbulb className="h-5 w-5 text-primary" />
                        <AlertTitle className="font-semibold text-primary text-lg">AI Explanation ({displayForecast.modelUsed.replace(/_/g, ' ')})</AlertTitle>
                        {displayForecast.modelExplanation && <AlertDescription className="text-blue-700 dark:text-blue-300 text-base mt-1">{displayForecast.modelExplanation}</AlertDescription>}
                        {displayForecast.predictions['30day'].explanation && !displayForecast.modelExplanation && <AlertDescription className="text-blue-700 dark:text-blue-300 text-base mt-1">{displayForecast.predictions['30day'].explanation}</AlertDescription>}
                         {displayForecast.predictions['30day'].explanation && displayForecast.modelExplanation && <p className="text-sm text-blue-600 dark:text-blue-400 mt-2"><strong>30-day Specific:</strong> {displayForecast.predictions['30day'].explanation}</p>}
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

      <ScenarioSimulator 
        baselineForecast={forecastResult} 
        onApplyScenario={setScenarioForecastResult} 
      />

      {/* Placeholders for future Model Comparison and Explorer */}
      {forecastResult && (
        <>
        <Card className="shadow-md border-border mt-4">
            <CardHeader>
                <CardTitle className="font-headline text-xl text-foreground flex items-center">
                    <BarChart className="h-5 w-5 mr-2 text-primary"/>Model Comparison
                </CardTitle>
                <CardDescription>Compare performance of different forecasting models for this SKU. (Feature in development)</CardDescription>
            </CardHeader>
            <CardContent className="text-center text-muted-foreground py-8">
                <pre className="text-xs text-left bg-muted p-2 rounded overflow-x-auto inline-block">
{`
MODEL COMPARISON for ${forecastResult.sku}
┌─────────────────────────────────────┐
│ Model            │ 30-Day │ Accuracy│
├─────────────────────────────────────┤
│ Moving Average   │ ...    │ ...%   │
│ Exponential      │ ...    │ ...%   │
│ Seasonal         │ ...    │ ...%   │
│ AI Pattern       │ ...    │ ...%   │
│ Regression       │ ...    │ ...%   │
│ ⭐ Ensemble      │ ...    │ ...%   │
└─────────────────────────────────────┘
`}
                </pre>
            </CardContent>
        </Card>

        <Card className="shadow-md border-border mt-4">
            <CardHeader>
                <CardTitle className="font-headline text-xl text-foreground flex items-center">
                    <Brain className="h-5 w-5 mr-2 text-primary"/>AI Model Recommendation
                </CardTitle>
                <CardDescription>Get AI suggestions on the best model for this SKU. (Feature in development)</CardDescription>
            </CardHeader>
            <CardContent className="text-center text-muted-foreground py-8">
                <p>AI will analyze product characteristics and suggest the optimal model here.</p>
            </CardContent>
        </Card>

        <Card className="shadow-md border-border mt-4">
            <CardHeader>
                <CardTitle className="font-headline text-xl text-foreground flex items-center">
                    <SlidersHorizontal className="h-5 w-5 mr-2 text-primary"/>Interactive Model Explorer
                </CardTitle>
                <CardDescription>Understand how each model works and tune parameters. (Feature in development)</CardDescription>
            </CardHeader>
            <CardContent className="text-center text-muted-foreground py-8">
                <p>Explore model details, strengths, weaknesses, and adjust parameters here.</p>
            </CardContent>
        </Card>
        </>
      )}

    </div>
  );
}

    