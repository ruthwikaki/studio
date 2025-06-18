
"use client";

import { useState, useMemo, FormEvent } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, BarChartBig, TrendingUp, Info, CalendarClock, BarChartHorizontalBig, Lightbulb, Zap, Layers, Brain, SlidersHorizontal, BarChart, ListFilter, CheckCircle, ShoppingCart, AlertTriangleIcon, Target, Settings2, Cpu, ThumbsUp, ThumbsDown, Maximize2 } from 'lucide-react';
import { useGenerateDemandForecast } from '@/hooks/useAnalytics';
import type { ForecastDemandOutput, ModelType } from '@/ai/flows/forecasting';
import ForecastChart from '@/components/analytics/forecasting/ForecastChart';
import ScenarioSimulator from '@/components/analytics/forecasting/ScenarioSimulator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress'; // For summary bar
import { cn } from '@/lib/utils';

const SAMPLE_HISTORICAL_DATA = JSON.stringify([
  {"date": "2023-01-01", "quantitySold": 10}, {"date": "2023-01-08", "quantitySold": 12},
  {"date": "2023-01-15", "quantitySold": 15}, {"date": "2023-01-22", "quantitySold": 13},
  {"date": "2023-01-29", "quantitySold": 18}, {"date": "2023-02-05", "quantitySold": 20},
  {"date": "2023-02-12", "quantitySold": 22}, {"date": "2023-02-19", "quantitySold": 19},
  {"date": "2023-02-26", "quantitySold": 25}, {"date": "2023-03-05", "quantitySold": 28},
  {"date": "2023-03-12", "quantitySold": 30}, {"date": "2023-03-19", "quantitySold": 27},
  {"date": "2023-03-26", "quantitySold": 33}, {"date": "2023-04-02", "quantitySold": 35},
  {"date": "2023-04-09", "quantitySold": 38}, {"date": "2023-04-16", "quantitySold": 36},
  {"date": "2023-04-23", "quantitySold": 32}, {"date": "2023-04-30", "quantitySold": 40}
], null, 2);

const VISUAL_MODELS: {
  id: ModelType;
  category: 'Quick & Simple' | 'Advanced Analytics' | 'AI Powered';
  title: string;
  description: string;
  icon: React.ElementType;
}[] = [
  { id: "SIMPLE_MOVING_AVERAGE", category: 'Quick & Simple', title: "Moving Average", description: "Smooths out fluctuations. Good for stable demand.", icon: TrendingUp },
  { id: "SEASONAL_DECOMPOSITION", category: 'Advanced Analytics', title: "Seasonal Trends", description: "Identifies & projects yearly patterns. Ideal for seasonal items.", icon: CalendarClock },
  { id: "AI_PATTERN_RECOGNITION", category: 'AI Powered', title: "AI SmartForecast", description: "Gemini analyzes complex patterns for nuanced predictions.", icon: Cpu },
];


export default function ForecastingPage() {
  const [currentStep, setCurrentStep] = useState('step1');
  const [sku, setSku] = useState('SKU001');
  const [historicalSalesData, setHistoricalSalesData] = useState(SAMPLE_HISTORICAL_DATA); // To be removed later
  const [seasonalityFactors, setSeasonalityFactors] = useState('Standard retail seasonality, minor bump in Q4 holidays.');
  const [selectedModelType, setSelectedModelType] = useState<ModelType>("AI_PATTERN_RECOGNITION");
  
  const generateForecastMutation = useGenerateDemandForecast();
  const [forecastResult, setForecastResult] = useState<ForecastDemandOutput | null>(null);
  const [scenarioForecastResult, setScenarioForecastResult] = useState<ForecastDemandOutput | null>(null);

  const handleSubmit = async (e?: FormEvent) => {
    e?.preventDefault();
    setForecastResult(null); 
    setScenarioForecastResult(null);
    try {
      JSON.parse(historicalSalesData); // Basic validation
    } catch (error) {
      generateForecastMutation.reset(); 
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
  const displayForecast = scenarioForecastResult || forecastResult;

  const summaryMetrics = useMemo(() => {
    if (!displayForecast) return { next30DaysUnits: "N/A", trend: "N/A", orderDate: "N/A" };
    return {
      next30DaysUnits: displayForecast.predictions['30day'].demand.toLocaleString() || "N/A",
      trend: "+25%", // Placeholder
      orderDate: "March 15", // Placeholder
    };
  }, [displayForecast]);


  return (
    <div className="flex flex-col gap-8 py-6">
      <header className="mb-4">
        <h1 className="text-4xl font-headline font-bold text-foreground tracking-tight">Demand Forecasting</h1>
        <p className="text-lg text-muted-foreground">Predict future demand with powerful AI and statistical models.</p>
      </header>

      <Tabs value={currentStep} onValueChange={setCurrentStep} className="w-full">
        <TabsList className="grid w-full grid-cols-3 md:max-w-2xl mx-auto mb-8">
          <TabsTrigger value="step1">1. Select Product</TabsTrigger>
          <TabsTrigger value="step2">2. Time & Context</TabsTrigger>
          <TabsTrigger value="step3">3. Choose Model</TabsTrigger>
        </TabsList>

        <TabsContent value="step1" className="space-y-6 animate-fadeIn">
          <Card className="shadow-lg border-border">
            <CardHeader>
              <CardTitle className="font-headline text-2xl flex items-center">
                <ShoppingCart className="h-6 w-6 mr-3 text-primary"/> Select Product
              </CardTitle>
              <CardDescription>Choose the product you want to forecast.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="sku" className="font-medium text-foreground">Product SKU</Label>
                <Input
                  id="sku"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  placeholder="Enter or search product SKU"
                  className="mt-1 bg-background text-lg p-3"
                />
                <p className="text-xs text-muted-foreground mt-1.5">
                  Current stock: 120 units. Last forecasted: 2 days ago. (Placeholders)
                </p>
              </div>
               {/* TODO: Replace with large searchable dropdown with images */}
            </CardContent>
            <CardFooter className="border-t pt-6 flex justify-end bg-muted/30 rounded-b-lg">
              <Button onClick={() => setCurrentStep('step2')} className="px-6 py-3 text-base">Next: Time & Context &raquo;</Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="step2" className="space-y-6 animate-fadeIn">
          <Card className="shadow-lg border-border">
            <CardHeader>
              <CardTitle className="font-headline text-2xl flex items-center">
                <CalendarClock className="h-6 w-6 mr-3 text-primary"/> Set Time Period & Context
              </CardTitle>
              <CardDescription>Define the forecast horizon and relevant market conditions.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Placeholder for visual timeline selector */}
              <div className="p-4 border rounded-md bg-muted/50 text-center">
                <p className="text-muted-foreground">Visual timeline selector and date range picker (Coming Soon)</p>
                <div className="flex gap-2 mt-2 justify-center">
                    <Button variant="outline" size="sm" disabled>Next Week</Button>
                    <Button variant="outline" size="sm" disabled>Next Month</Button>
                    <Button variant="outline" size="sm" disabled>Next Quarter</Button>
                </div>
              </div>
              <div>
                <Label htmlFor="seasonalityFactors" className="font-medium text-foreground">Additional Context (Seasonality, Promotions, Market Events)</Label>
                <Textarea
                  id="seasonalityFactors"
                  value={seasonalityFactors}
                  onChange={(e) => setSeasonalityFactors(e.target.value)}
                  placeholder="e.g., Summer peak, Q4 holiday promotion, new competitor launch"
                  rows={3}
                  className="mt-1 bg-background text-base p-3"
                />
              </div>
               <div>
                <Label htmlFor="historicalSalesData" className="font-medium text-foreground">Historical Sales Data (JSON - Temporary)</Label>
                <Textarea
                  id="historicalSalesData"
                  value={historicalSalesData}
                  onChange={(e) => setHistoricalSalesData(e.target.value)}
                  placeholder='[{"date": "YYYY-MM-DD", "quantitySold": number}, ...]'
                  rows={6}
                  className="font-mono text-xs mt-1 bg-background p-2"
                />
                 <p className="text-xs text-muted-foreground mt-1.5">
                   This manual JSON input will be replaced by automatic data fetching.
                </p>
              </div>
            </CardContent>
            <CardFooter className="border-t pt-6 flex justify-between bg-muted/30 rounded-b-lg">
              <Button variant="outline" onClick={() => setCurrentStep('step1')} className="px-6 py-3 text-base">&laquo; Back: Product</Button>
              <Button onClick={() => setCurrentStep('step3')} className="px-6 py-3 text-base">Next: Choose Model &raquo;</Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="step3" className="space-y-6 animate-fadeIn">
          <Card className="shadow-lg border-border">
            <CardHeader>
              <CardTitle className="font-headline text-2xl flex items-center">
                <Target className="h-6 w-6 mr-3 text-primary"/> Select Forecasting Model
              </CardTitle>
              <CardDescription>Choose a model that best fits your product and data characteristics.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {VISUAL_MODELS.map(model => (
                  <Card 
                    key={model.id} 
                    className={cn(
                        "cursor-pointer hover:shadow-xl transition-shadow border-2",
                        selectedModelType === model.id ? "border-primary ring-2 ring-primary shadow-xl" : "border-border"
                    )}
                    onClick={() => setSelectedModelType(model.id)}
                  >
                    <CardHeader className="items-center text-center pb-2">
                      <model.icon className={cn("h-10 w-10 mb-2", selectedModelType === model.id ? "text-primary" : "text-muted-foreground")} />
                      <CardTitle className="font-headline text-lg">{model.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center text-xs text-muted-foreground min-h-[60px]">
                      {model.description}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
            <CardFooter className="border-t pt-6 flex justify-between items-center bg-muted/30 rounded-b-lg">
              <Button variant="outline" onClick={() => setCurrentStep('step2')} className="px-6 py-3 text-base">&laquo; Back: Time & Context</Button>
              <Button onClick={handleSubmit} disabled={isLoading} className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-3 text-lg">
                {isLoading ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : <BarChartBig className="mr-2 h-6 w-6" />}
                Generate Forecast
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>

      {isLoading && (
        <Card className="shadow-md animate-pulse border-border mt-8">
            <CardHeader>
                <Skeleton className="h-8 w-3/4 rounded-md" />
                <Skeleton className="h-4 w-1/2 mt-2 rounded-md" />
            </CardHeader>
            <CardContent className="space-y-8 pt-6">
                <Skeleton className="h-32 w-full rounded-lg" /> {/* Summary placeholder */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Skeleton className="h-28 w-full rounded-lg" />
                    <Skeleton className="h-28 w-full rounded-lg" />
                    <Skeleton className="h-28 w-full rounded-lg" />
                </div>
                <Separator />
                <Skeleton className="h-80 w-full rounded-lg" />
            </CardContent>
        </Card>
      )}
      
      {generateForecastMutation.isError && !isLoading && (
         <Alert variant="destructive" className="shadow-md border-destructive mt-8">
            <Info className="h-5 w-5" />
            <AlertTitle className="font-semibold text-lg">Error Generating Forecast</AlertTitle>
            <AlertDescription className="text-base">
              {generateForecastMutation.error?.message || "An unknown error occurred. Please check your inputs and try again."}
            </AlertDescription>
          </Alert>
      )}

      {displayForecast && !isLoading && (
        <div className="space-y-8 mt-12 animate-fadeIn">
          <Card className="shadow-xl border-primary bg-gradient-to-br from-primary/5 via-background to-background">
            <CardHeader className="pb-2">
              <CardTitle className="font-headline text-2xl text-foreground text-center">
                Demand Forecast Summary for <span className="text-primary">{displayForecast.sku}</span>
                 {scenarioForecastResult && <span className="text-orange-500 font-normal text-lg ml-2">(Scenario Applied)</span>}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-3">
              <div className="text-5xl font-bold text-primary">{summaryMetrics.next30DaysUnits} units</div>
              <p className="text-muted-foreground text-lg">Forecasted for the Next 30 Days</p>
              <div className="w-3/4 mx-auto pt-2">
                 <Progress value={75} aria-label="75% of forecast period visualizer" className="h-3"/> {/* Placeholder value */}
              </div>
              <div className="flex justify-around items-center text-sm text-muted-foreground pt-2">
                <span>📈 Trend: <span className="font-semibold text-foreground">{summaryMetrics.trend}</span> vs last month</span>
                <span>⚡ Recommended Order By: <span className="font-semibold text-foreground">{summaryMetrics.orderDate}</span></span>
              </div>
            </CardContent>
          </Card>

          <section id="action-metrics" className="pt-4">
            <h2 className="text-2xl font-headline font-semibold text-foreground mb-4 flex items-center">
                <ThumbsUp className="h-6 w-6 mr-3 text-primary" /> Actionable Metrics
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="shadow-lg hover:shadow-xl transition-shadow">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg font-semibold text-accent">Order Now</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold">450 units</p> {/* Placeholder */}
                        <p className="text-sm text-muted-foreground">To meet 30-day demand.</p>
                    </CardContent>
                    <CardFooter>
                        <Button className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
                            <ShoppingCart className="mr-2 h-4 w-4"/> Create Purchase Order
                        </Button>
                    </CardFooter>
                </Card>
                 <Card className="shadow-lg hover:shadow-xl transition-shadow">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg font-semibold">Peak Demand Day</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold">March 22</p> {/* Placeholder */}
                        <p className="text-sm text-muted-foreground">Prepare staffing & stock.</p>
                    </CardContent>
                     <CardFooter>
                        <Button variant="outline" className="w-full">View Daily Breakdown</Button>
                    </CardFooter>
                </Card>
                 <Card className="shadow-lg hover:shadow-xl transition-shadow">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg font-semibold text-warning">Risk Alert</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold flex items-center"><AlertTriangleIcon className="h-7 w-7 mr-2 text-warning"/>Low Stock</p> {/* Placeholder */}
                        <p className="text-sm text-muted-foreground">Potential stockout: April 5-7.</p>
                    </CardContent>
                     <CardFooter>
                        <Button variant="outline" className="w-full border-warning text-warning hover:bg-warning/10">Review Inventory Levels</Button>
                    </CardFooter>
                </Card>
            </div>
          </section>
            
          <section id="forecast-chart" className="pt-4">
             <h2 className="text-2xl font-headline font-semibold text-foreground mb-4 flex items-center">
                <BarChart className="h-6 w-6 mr-3 text-primary" /> Detailed Forecast Chart
            </h2>
            <Card className="shadow-xl border-border">
                <CardHeader className="pb-2">
                    <CardTitle className="font-headline text-xl text-foreground">
                    Demand Projection for SKU: <span className="text-primary">{displayForecast.sku}</span>
                    </CardTitle>
                    <CardDescription className="text-sm">
                        Model: <span className="font-semibold text-accent">{VISUAL_MODELS.find(m=>m.id === displayForecast.modelUsed)?.title || displayForecast.modelUsed}</span>.
                        {displayForecast.accuracyScore && ` Illustrative Accuracy: ${displayForecast.accuracyScore.toFixed(0)}%.`}
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-2 h-[450px] relative"> {/* Ensure enough height for chart */}
                     <Button variant="ghost" size="icon" className="absolute top-4 right-4 z-10" title="Expand Chart">
                        <Maximize2 className="h-5 w-5" />
                    </Button>
                    <ForecastChart 
                        historicalData={JSON.parse(historicalSalesData)} 
                        baselinePredictions={forecastResult?.predictions ?? null}
                        scenarioPredictions={scenarioForecastResult?.predictions ?? null}
                    />
                </CardContent>
                 {(displayForecast.modelExplanation || displayForecast.predictions['30day'].explanation) && (
                    <CardFooter className="pt-4 border-t">
                         <Alert className="bg-blue-50 border-blue-300 dark:bg-blue-900/30 dark:border-blue-700/50 shadow w-full">
                            <Lightbulb className="h-5 w-5 text-primary" />
                            <AlertTitle className="font-semibold text-primary text-lg">AI Model Insights ({displayForecast.modelUsed.replace(/_/g, ' ')})</AlertTitle>
                            {displayForecast.modelExplanation && <AlertDescription className="text-blue-700 dark:text-blue-300 text-base mt-1">{displayForecast.modelExplanation}</AlertDescription>}
                        </Alert>
                    </CardFooter>
                 )}
            </Card>
          </section>

          <ScenarioSimulator 
            baselineForecast={forecastResult} 
            onApplyScenario={setScenarioForecastResult} 
          />
          
          <section id="model-comparison" className="pt-4">
             <h2 className="text-2xl font-headline font-semibold text-foreground mb-4 flex items-center">
                <SlidersHorizontal className="h-6 w-6 mr-3 text-primary" /> Model Comparison
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="shadow-md border-success/50 bg-success/5">
                    <CardHeader><CardTitle className="text-lg font-semibold text-success flex items-center"><CheckCircle className="mr-2"/>Recommended: AI Model</CardTitle></CardHeader>
                    <CardContent><p className="text-4xl font-bold">1,250 <span className="text-lg font-normal">units</span></p><p className="text-sm text-muted-foreground">92% accuracy (illustrative)</p></CardContent>
                    <CardFooter><Button className="w-full bg-success hover:bg-success/90 text-success-foreground">Use This Model</Button></CardFooter>
                </Card>
                <Card className="shadow-md">
                    <CardHeader><CardTitle className="text-lg font-semibold flex items-center"><Target className="mr-2 text-muted-foreground"/>Conservative: Historical</CardTitle></CardHeader>
                    <CardContent><p className="text-4xl font-bold">1,100 <span className="text-lg font-normal">units</span></p><p className="text-sm text-muted-foreground">88% accuracy (illustrative)</p></CardContent>
                    <CardFooter><Button variant="outline" className="w-full">Compare Details</Button></CardFooter>
                </Card>
                <Card className="shadow-md">
                    <CardHeader><CardTitle className="text-lg font-semibold flex items-center"><TrendingUp className="mr-2 text-muted-foreground"/>Aggressive: Growth Model</CardTitle></CardHeader>
                    <CardContent><p className="text-4xl font-bold">1,400 <span className="text-lg font-normal">units</span></p><p className="text-sm text-muted-foreground">85% accuracy (illustrative)</p></CardContent>
                    <CardFooter><Button variant="outline" className="w-full">Compare Details</Button></CardFooter>
                </Card>
            </div>
             <p className="text-xs text-muted-foreground mt-2 text-center">Full model comparison table and explorer coming soon.</p>
          </section>

          <section id="key-insights" className="pt-4">
            <h2 className="text-2xl font-headline font-semibold text-foreground mb-4 flex items-center">
                <Lightbulb className="h-6 w-6 mr-3 text-primary" /> Key Insights & Recommendations
            </h2>
            <Card className="shadow-lg">
                <CardContent className="pt-6 text-base space-y-2">
                    <ul className="list-disc list-inside space-y-1.5">
                        <li>Demand is trending up <span className="font-semibold text-success">15% month-over-month</span> (Placeholder).</li>
                        <li>Historical data shows <span className="font-semibold">Thursday & Friday</span> are peak sales days for this product.</li>
                        <li>Consider a <span className="font-semibold">20% safety stock</span> increase for the upcoming Q4 holiday period due to observed seasonality.</li>
                        <li>The <span className="font-semibold text-accent">{VISUAL_MODELS.find(m=>m.id === displayForecast.modelUsed)?.title || displayForecast.modelUsed}</span> model was selected for its ability to handle {displayForecast.modelUsed === "SEASONAL_DECOMPOSITION" ? "seasonal patterns." : displayForecast.modelUsed === "AI_PATTERN_RECOGNITION" ? "complex data signals." : "the data characteristics."}</li>
                    </ul>
                </CardContent>
            </Card>
          </section>

          <section id="actions-footer" className="py-8 border-t mt-8">
            <h2 className="text-2xl font-headline font-semibold text-foreground mb-6 text-center">Next Steps</h2>
            <div className="flex flex-wrap justify-center gap-4">
                <Button size="lg" variant="outline" className="text-base px-6 py-3"><UploadCloud className="mr-2"/> Save Forecast</Button>
                <Button size="lg" variant="outline" className="text-base px-6 py-3"><BarChartHorizontalBig className="mr-2"/> Export Data</Button>
                <Button size="lg" className="bg-accent hover:bg-accent/80 text-accent-foreground text-base px-6 py-3"><ShoppingCart className="mr-2"/> Create Purchase Order</Button>
                <Button size="lg" variant="secondary" className="text-base px-6 py-3"><Zap className="mr-2"/> Email Report</Button>
            </div>
          </section>

        </div>
      )}
        <Link href="/analytics/forecasting/bulk" className="block text-center mt-8 text-primary hover:underline">
            Go to Bulk Forecasting &raquo;
        </Link>
    </div>
  );
}
    
