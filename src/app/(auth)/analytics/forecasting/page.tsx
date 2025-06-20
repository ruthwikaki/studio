
"use client";

import { useState, useEffect, FormEvent } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from '@/components/ui/textarea';
import { useGenerateDemandForecast } from '@/hooks/useAnalytics';
import ForecastChart from '@/components/analytics/forecasting/ForecastChart';
import ForecastMetricCard from '@/components/analytics/forecasting/ForecastMetricCard';
import ConfidenceIndicator from '@/components/analytics/forecasting/ConfidenceIndicator';
import ScenarioSimulator from '@/components/analytics/forecasting/ScenarioSimulator';
import type { ForecastDemandOutput, ModelType } from '@/lib/types/firestore';
import { Loader2, TrendingUp, Zap, Wand2, BarChartBig, HelpCircle, PackageSearch } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";


const modelTypes: ModelType[] = [
  "AI_PATTERN_RECOGNITION",
  "EXPONENTIAL_SMOOTHING",
  "SEASONAL_DECOMPOSITION",
  "SIMPLE_MOVING_AVERAGE",
  "REGRESSION_ANALYSIS",
  "ENSEMBLE_COMBINED"
];

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
  const [lastJobId, setLastJobId] = useState<string | null>(null);


  const { toast } = useToast();
  const forecastMutation = useGenerateDemandForecast();

  useEffect(() => {
    if (sku) {
      setHistoricalSales(getMockHistoricalSales(sku));
    } else {
      setHistoricalSales([]);
    }
    setGeneratedForecast(null);
    setScenarioForecast(null);
    setLastJobId(null);
  }, [sku]);

  const handleSubmitForecast = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!sku) {
      toast({ title: "SKU Required", description: "Please enter a SKU to generate a forecast.", variant: "destructive" });
      return;
    }
    
    setGeneratedForecast(null);
    setScenarioForecast(null);
    setLastJobId(null);

    forecastMutation.mutate(
      { sku, seasonalityFactors, modelType },
      {
        onSuccess: (data) => {
          setLastJobId(data.jobId);
          // In a real app, you would poll a job status endpoint or listen to a websocket for completion.
          // For this example, we will not automatically fetch the forecast result.
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
            Input product details and select a model. Forecast generation will be queued.
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
                Queue Forecast Job
              </Button>
            </div>
            <div className="space-y-1">
              <Label htmlFor="seasonalityFactors" className="font-medium">Seasonality & Market Factors (Optional)</Label>
              <Textarea
                id="seasonalityFactors"
                placeholder="e.g., Upcoming holiday sale, competitor promotion..."
                value={seasonalityFactors}
                onChange={(e) => setSeasonalityFactors(e.target.value)}
                rows={3}
              />
            </div>
          </CardContent>
        </form>
      </Card>

      {forecastMutation.isPending && (
        <Card className="shadow-lg border-border">
          <CardContent className="h-[50px] flex items-center justify-center">
            <div className="space-y-3 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                <p className="text-muted-foreground text-sm">Submitting forecast request for {sku}...</p>
            </div>
          </CardContent>
        </Card>
      )}
      
      {lastJobId && !forecastMutation.isPending && !forecastMutation.isError && (
         <Alert variant="default" className="bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-300">
            <PackageSearch className="h-5 w-5 !text-blue-600 dark:!text-blue-400" />
            <AlertTitle className="font-semibold">Forecast Job Queued Successfully!</AlertTitle>
            <AlertDescription>
              The forecast for SKU {sku} is being generated. Job ID: <span className="font-mono bg-blue-200 dark:bg-blue-800 px-1 rounded">{lastJobId}</span>.
            </AlertDescription>
          </Alert>
      )}


      {forecastMutation.isError && (
        <Card className="shadow-lg border-destructive bg-destructive/10">
          <CardHeader><CardTitle className="text-destructive">Error Queuing Forecast</CardTitle></CardHeader>
          <CardContent>
            <p className="text-destructive-foreground">{forecastMutation.error.message}</p>
          </CardContent>
        </Card>
      )}
      
        {!lastJobId && !forecastMutation.isPending && (
            <Card className="border-border mt-4">
                <CardContent className="p-6 text-center text-muted-foreground">
                    <HelpCircle className="h-10 w-10 mx-auto mb-3 text-primary/60" />
                    <p>Generate a forecast for an SKU to see detailed predictions and charts here.</p>
                </CardContent>
            </Card>
        )
      }
    </div>
  );
}
