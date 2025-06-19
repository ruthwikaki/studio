
"use client";

import { useState, useEffect, FormEvent } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from '@/components/ui/textarea';
import { useGenerateDemandForecast } from '@/hooks/useAnalytics';
import ForecastChart from '@/components/analytics/forecasting/ForecastChart';
import ForecastMetricCard from '@/components/analytics/forecasting/ForecastMetricCard';
import ConfidenceIndicator from '@/components/analytics/forecasting/ConfidenceIndicator';
import ScenarioSimulator from '@/components/analytics/forecasting/ScenarioSimulator';
import type { ForecastDemandOutput, SalesHistoryDocument, ModelType } from '@/lib/types/firestore'; // Assuming SalesHistoryDocument is also in firestore types
import { Loader2, TrendingUp, Zap, Wand2, SlidersHorizontal, BarChartBig } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { AdminTimestamp } from '@/lib/firebase/admin'; // Only for type checking, not used in client component directly
import { useToast } from '@/hooks/use-toast';


const modelTypes: ModelType[] = [
  "AI_PATTERN_RECOGNITION",
  "EXPONENTIAL_SMOOTHING",
  "SEASONAL_DECOMPOSITION",
  "SIMPLE_MOVING_AVERAGE",
  "REGRESSION_ANALYSIS",
  "ENSEMBLE_COMBINED"
];

// Mock function to get historical sales for a SKU - in a real app, this would be an API call
const getMockHistoricalSales = (sku: string): { date: string; quantitySold: number }[] => {
  if (!sku) return [];
  const baseQty = sku === 'SKU001' ? 50 : sku === 'SKU002' ? 30 : 20;
  return Array.from({ length: 90 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (90 - i));
    return {
      date: date.toISOString().split('T')[0],
      quantitySold: Math.max(0, Math.round(baseQty + (Math.random() - 0.5) * 20 + Math.sin(i / 10) * 10)),
    };
  });
};


export default function SingleSKUForecastingPage() {
  const [sku, setSku] = useState('');
  const [seasonalityFactors, setSeasonalityFactors] = useState('');
  const [modelType, setModelType] = useState<ModelType>("AI_PATTERN_RECOGNITION");
  const [generatedForecast, setGeneratedForecast] = useState<ForecastDemandOutput | null>(null);
  const [historicalSales, setHistoricalSales] = useState<{ date: string; quantitySold: number }[]>([]);
  const [scenarioForecast, setScenarioForecast] = useState<ForecastDemandOutput | null>(null);


  const { toast } = useToast();
  const forecastMutation = useGenerateDemandForecast();

  useEffect(() => {
    // Simulate fetching historical sales when SKU changes
    if (sku) {
      setHistoricalSales(getMockHistoricalSales(sku));
    } else {
      setHistoricalSales([]);
    }
    setGeneratedForecast(null); // Clear previous forecast when SKU changes
    setScenarioForecast(null);
  }, [sku]);

  const handleSubmitForecast = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!sku) {
      toast({ title: "SKU Required", description: "Please enter a SKU to generate a forecast.", variant: "destructive" });
      return;
    }
    
    // The API route /api/analytics/forecast will fetch actual historical data.
    // The 'historicalSalesData' field in ForecastDemandInput for the API is handled server-side.
    // We only need to send SKU, seasonality, and modelType from client.
    forecastMutation.mutate(
      { sku, seasonalityFactors, modelType },
      {
        onSuccess: (data) => {
          setGeneratedForecast(data);
          setScenarioForecast(null); // Reset scenario when new baseline is generated
          // Historical sales for the chart will be passed from state (mocked for now)
          // In a real app, you might fetch and pass the same historical data used by the backend.
        },
      }
    );
  };
  
  const displayForecast = scenarioForecast || generatedForecast;

  return (
    <div className="flex flex-col gap-6 p-1 md:p-2">
      <Card className="shadow-xl border-border">
        <CardHeader>
          <CardTitle className="font-headline text-2xl text-foreground flex items-center">
            <Zap className="h-6 w-6 mr-2 text-primary" />
            Generate Demand Forecast
          </CardTitle>
          <CardDescription className="text-base">
            Input product details and select a model to predict future demand.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmitForecast}>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
              <div className="space-y-1">
                <Label htmlFor="sku" className="font-medium">Product SKU</Label>
                <Input id="sku" placeholder="e.g., SKU001" value={sku} onChange={(e) => setSku(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="modelType" className="font-medium">Forecasting Model</Label>
                <Select value={modelType} onValueChange={(value) => setModelType(value as ModelType)}>
                  <SelectTrigger id="modelType">
                    <Wand2 className="h-4 w-4 mr-2 opacity-70" />
                    <SelectValue placeholder="Select Model" />
                  </SelectTrigger>
                  <SelectContent>
                    {modelTypes.map(mt => <SelectItem key={mt} value={mt}>{mt.replace(/_/g, ' ')}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" disabled={forecastMutation.isPending || !sku} className="w-full md:w-auto bg-primary hover:bg-primary/80 text-primary-foreground">
                {forecastMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <TrendingUp className="mr-2 h-4 w-4" />}
                Generate Forecast
              </Button>
            </div>
            <div className="space-y-1">
              <Label htmlFor="seasonalityFactors" className="font-medium">Seasonality & Market Factors (Optional)</Label>
              <Textarea
                id="seasonalityFactors"
                placeholder="e.g., Upcoming holiday sale, competitor promotion, new market trend..."
                value={seasonalityFactors}
                onChange={(e) => setSeasonalityFactors(e.target.value)}
                rows={3}
              />
            </div>
          </CardContent>
        </form>
      </Card>

      {forecastMutation.isPending && !generatedForecast && (
        <Card className="shadow-lg border-border">
          <CardHeader><CardTitle>Generating Forecast...</CardTitle></CardHeader>
          <CardContent className="h-[350px] flex items-center justify-center">
            <div className="space-y-3 text-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
                <p className="text-muted-foreground">Analyzing data and predicting demand for {sku}...</p>
                <Skeleton className="h-4 w-3/4 mx-auto" />
                <Skeleton className="h-4 w-1/2 mx-auto" />
            </div>
          </CardContent>
        </Card>
      )}

      {forecastMutation.isError && (
        <Card className="shadow-lg border-destructive bg-destructive/10">
          <CardHeader><CardTitle className="text-destructive">Error Generating Forecast</CardTitle></CardHeader>
          <CardContent>
            <p className="text-destructive-foreground">{forecastMutation.error.message}</p>
          </CardContent>
        </Card>
      )}

      {displayForecast && (
        <>
        <Card className="shadow-xl border-border">
            <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div>
                        <CardTitle className="font-headline text-2xl text-foreground flex items-center">
                           <BarChartBig className="h-6 w-6 mr-2 text-primary"/> Forecast for {displayForecast.sku}
                        </CardTitle>
                        <CardDescription className="text-base">
                            Model Used: <span className="font-semibold text-primary">{displayForecast.modelUsed?.replace(/_/g, ' ') || 'N/A'}</span>
                            {scenarioForecast && <span className="ml-2 text-orange-500 font-semibold">(Scenario Applied)</span>}
                        </CardDescription>
                    </div>
                    {displayForecast.accuracyScore !== undefined && (
                        <div className="flex items-center gap-2 text-sm">
                           <span className="text-muted-foreground">Illustrative Accuracy:</span> 
                           <ConfidenceIndicator level={
                               displayForecast.accuracyScore >= 90 ? 'High' : 
                               displayForecast.accuracyScore >= 75 ? 'Medium' : 'Low'
                           } showText={false}/>
                           <span className="font-semibold">{displayForecast.accuracyScore}%</span>
                        </div>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <ForecastMetricCard 
                        title="30-Day Demand" 
                        value={displayForecast.predictions['30day'].demand.toLocaleString()} 
                        description={<ConfidenceIndicator level={displayForecast.predictions['30day'].confidence || 'N/A'} />}
                        icon={TrendingUp}
                    />
                    <ForecastMetricCard 
                        title="60-Day Demand" 
                        value={displayForecast.predictions['60day'].demand.toLocaleString()} 
                        description={<ConfidenceIndicator level={displayForecast.predictions['60day'].confidence || 'N/A'} />}
                        icon={TrendingUp}
                    />
                    <ForecastMetricCard 
                        title="90-Day Demand" 
                        value={displayForecast.predictions['90day'].demand.toLocaleString()} 
                        description={<ConfidenceIndicator level={displayForecast.predictions['90day'].confidence || 'N/A'} />}
                        icon={TrendingUp}
                    />
                </div>
                <ForecastChart 
                    historicalData={historicalSales} 
                    baselinePredictions={generatedForecast?.predictions || null}
                    scenarioPredictions={scenarioForecast?.predictions}
                />
                {displayForecast.modelExplanation && <p className="text-xs text-muted-foreground mt-4">Model Note: {displayForecast.modelExplanation}</p>}
            </CardContent>
        </Card>
        
        {generatedForecast && (
             <ScenarioSimulator 
                baselineForecast={generatedForecast}
                onApplyScenario={(newScenario) => setScenarioForecast(newScenario)}
             />
        )}
        </>
      )}
       {/* Original Professional Excel-like Grid Section (can be re-enabled or moved if needed) */}
      {/* 
        <div className="flex flex-1 gap-4 overflow-hidden mt-8">
          <Card className="shadow-lg border-border flex-1 flex flex-col overflow-hidden">
             ... existing excel-like table ...
          </Card>
          <Card className="shadow-md border-border w-full md:w-64 lg:w-72 flex-shrink-0 h-fit md:sticky md:top-20">
             ... existing quick stats sidebar ...
          </Card>
        </div>
      */}
    </div>
  );
}
