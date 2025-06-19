
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
import type { ForecastDemandOutput, SalesHistoryDocument, ModelType } from '@/lib/types/firestore';
import { Loader2, TrendingUp, Zap, Wand2, SlidersHorizontal, BarChartBig, HelpCircle, PackageSearch } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
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

// Mock function to get historical sales for a SKU - in a real app, this would be an API call
// For the chart, this data ideally should be fetched alongside or after the forecast is ready.
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
      setHistoricalSales(getMockHistoricalSales(sku)); // Still using mock historical for chart for now
    } else {
      setHistoricalSales([]);
    }
    // Clear forecast displays when SKU changes, as the forecast is now job-based
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
    
    // Clear previous forecast results when a new job is submitted
    setGeneratedForecast(null);
    setScenarioForecast(null);
    setLastJobId(null);

    forecastMutation.mutate(
      { sku, seasonalityFactors, modelType },
      {
        onSuccess: (data) => { // Data here is { message: string, jobId: string }
          setLastJobId(data.jobId);
          // Note: Forecast data (ForecastDemandOutput) is no longer returned directly.
          // The UI needs a mechanism to fetch the forecast result once the job is complete.
          // For now, we just display the job ID and a message.
        },
      }
    );
  };
  
  // displayForecast will remain null until a separate mechanism fetches the completed forecast
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
                placeholder="e.g., Upcoming holiday sale, competitor promotion, new market trend..."
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
          <CardHeader><CardTitle>Queueing Forecast...</CardTitle></CardHeader>
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
              <br />
              You will be notified, or you can check the 'Forecasts' section/notifications later for the results.
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

      {/* The displayForecast section will now only show if a forecast is manually loaded or fetched later */}
      {displayForecast ? (
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
      ) : (
        !lastJobId && !forecastMutation.isPending && ( // Only show "generate first" if no job has been submitted yet
            <Card className="border-border mt-4">
                <CardContent className="p-6 text-center text-muted-foreground">
                    <HelpCircle className="h-10 w-10 mx-auto mb-3 text-primary/60" />
                    <p>Generate a forecast for an SKU to see detailed predictions and charts here.</p>
                    <p className="text-xs mt-1">Historical sales data (mocked) will be shown once an SKU is entered.</p>
                </CardContent>
            </Card>
        )
      )}
    </div>
  );
}
