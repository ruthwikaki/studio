
"use client";

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { ForecastDemandOutput } from '@/ai/flows/forecasting';
import { TrendingUp, TrendingDown, Undo, Save, RotateCcw, Layers } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';

interface ScenarioSimulatorProps {
  baselineForecast: ForecastDemandOutput | null;
  onApplyScenario: (scenarioForecast: ForecastDemandOutput | null) => void;
}

interface ScenarioParameters {
  promotionImpact: number; // -50 to 50 %
  seasonalAdjustment: number; // -30 to 30 %
  marketGrowth: number; // -20 to 20 %
  supplyChainRisk: number; // 0 to -40 % (represented as 0 to 40 in UI for slider, then made negative)
}

const INITIAL_PARAMS: ScenarioParameters = {
  promotionImpact: 0,
  seasonalAdjustment: 0,
  marketGrowth: 0,
  supplyChainRisk: 0,
};

export default function ScenarioSimulator({ baselineForecast, onApplyScenario }: ScenarioSimulatorProps) {
  const [params, setParams] = useState<ScenarioParameters>(INITIAL_PARAMS);
  const [scenarioName, setScenarioName] = useState('');
  const [savedScenarios, setSavedScenarios] = useState<Record<string, ScenarioParameters>>({}); // Simple in-memory save

  const { toast } = useToast();

  useEffect(() => {
    // Reset params if baseline forecast changes or disappears
    if (!baselineForecast) {
      setParams(INITIAL_PARAMS);
      onApplyScenario(null); // Clear any applied scenario
    }
  }, [baselineForecast, onApplyScenario]);

  const handleSliderChange = (paramName: keyof ScenarioParameters, value: number[]) => {
    setParams(prev => ({ ...prev, [paramName]: value[0] }));
  };

  const calculateAdjustedDemand = (baseDemand: number): number => {
    let adjusted = baseDemand;
    adjusted *= (1 + params.promotionImpact / 100);
    adjusted *= (1 + params.seasonalAdjustment / 100);
    adjusted *= (1 + params.marketGrowth / 100);
    adjusted *= (1 - params.supplyChainRisk / 100); // Risk reduces demand
    return Math.max(0, Math.round(adjusted)); // Ensure non-negative and integer
  };

  const handleApplyScenario = () => {
    if (!baselineForecast) return;

    const scenarioPredictions: ForecastDemandOutput['predictions'] = {
      '30day': {
        ...baselineForecast.predictions['30day'],
        demand: calculateAdjustedDemand(baselineForecast.predictions['30day'].demand),
      },
      '60day': {
        ...baselineForecast.predictions['60day'],
        demand: calculateAdjustedDemand(baselineForecast.predictions['60day'].demand),
      },
      '90day': {
        ...baselineForecast.predictions['90day'],
        demand: calculateAdjustedDemand(baselineForecast.predictions['90day'].demand),
      },
    };
    onApplyScenario({ sku: baselineForecast.sku, predictions: scenarioPredictions });
    toast({ title: "Scenario Applied", description: "Forecast chart and metrics updated with scenario adjustments." });
  };

  const handleResetToBaseline = () => {
    setParams(INITIAL_PARAMS);
    onApplyScenario(null); // Passing null clears the scenario from the chart
    toast({ title: "Scenario Reset", description: "Displaying baseline forecast." });
  };

  const handleSaveScenario = () => {
    if (!scenarioName.trim()) {
      toast({ title: "Save Error", description: "Please enter a name for the scenario.", variant: "destructive" });
      return;
    }
    setSavedScenarios(prev => ({ ...prev, [scenarioName]: params }));
    toast({ title: "Scenario Saved", description: `Scenario "${scenarioName}" saved.` });
    setScenarioName('');
  };
  
  const handleLoadScenario = (name: string) => {
    const loadedParams = savedScenarios[name];
    if (loadedParams) {
      setParams(loadedParams);
      // Automatically apply when loading
      if (!baselineForecast) return;
        const scenarioPredictions: ForecastDemandOutput['predictions'] = {
        '30day': { ...baselineForecast.predictions['30day'], demand: calculateAdjustedDemand(baselineForecast.predictions['30day'].demand) },
        '60day': { ...baselineForecast.predictions['60day'], demand: calculateAdjustedDemand(baselineForecast.predictions['60day'].demand) },
        '90day': { ...baselineForecast.predictions['90day'], demand: calculateAdjustedDemand(baselineForecast.predictions['90day'].demand) },
        };
      // Need to re-calculate based on loaded params and current baseline
       const tempBaseline = baselineForecast; // Use a temp variable to ensure closure has the right baseline
       const reCalculatedPredictions: ForecastDemandOutput['predictions'] = {
         '30day': { ...tempBaseline.predictions['30day'], demand: applyAllParams(tempBaseline.predictions['30day'].demand, loadedParams) },
         '60day': { ...tempBaseline.predictions['60day'], demand: applyAllParams(tempBaseline.predictions['60day'].demand, loadedParams) },
         '90day': { ...tempBaseline.predictions['90day'], demand: applyAllParams(tempBaseline.predictions['90day'].demand, loadedParams) },
       };
      onApplyScenario({ sku: tempBaseline.sku, predictions: reCalculatedPredictions });
      toast({ title: "Scenario Loaded", description: `Scenario "${name}" applied.` });
    }
  };

  // Helper to apply a full set of parameters (used for loading)
  const applyAllParams = (baseDemand: number, scenarioParams: ScenarioParameters): number => {
    let adjusted = baseDemand;
    adjusted *= (1 + scenarioParams.promotionImpact / 100);
    adjusted *= (1 + scenarioParams.seasonalAdjustment / 100);
    adjusted *= (1 + scenarioParams.marketGrowth / 100);
    adjusted *= (1 - scenarioParams.supplyChainRisk / 100);
    return Math.max(0, Math.round(adjusted));
  };


  const totalImpactPercentage = useMemo(() => {
    if (!baselineForecast) return 0;
    // Simplified: Calculate impact on 90-day forecast for a summary
    const base = baselineForecast.predictions['90day'].demand;
    if (base === 0) return params.promotionImpact + params.seasonalAdjustment + params.marketGrowth - params.supplyChainRisk; // Avoid division by zero
    
    const adjusted = calculateAdjustedDemand(base);
    return base !== 0 ? ((adjusted - base) / base) * 100 : 0;
  }, [params, baselineForecast, calculateAdjustedDemand]);


  if (!baselineForecast) {
    return (
        <Card className="border-border mt-4">
            <CardHeader>
                <CardTitle className="font-headline text-2xl text-foreground flex items-center">
                    <Layers className="h-6 w-6 mr-2 text-primary" />
                    Scenario Analysis (What-If Simulator)
                </CardTitle>
                <CardDescription className="text-base">
                    Generate a baseline forecast first to enable scenario simulation.
                </CardDescription>
            </CardHeader>
             <CardContent className="min-h-[200px] flex items-center justify-center">
                <p className="text-muted-foreground">No baseline forecast data available.</p>
            </CardContent>
        </Card>
    );
  }
  
  const getImpactColor = (value: number) => {
    if (value > 0) return "text-success";
    if (value < 0) return "text-destructive";
    return "text-muted-foreground";
  };


  return (
    <Card className="border-border mt-4">
      <CardHeader>
        <CardTitle className="font-headline text-2xl text-foreground flex items-center">
            <Layers className="h-6 w-6 mr-2 text-primary" />
            Scenario Analysis (What-If Simulator)
        </CardTitle>
        <CardDescription className="text-base">
          Explore how different factors might impact your forecast for <span className="font-semibold text-primary">{baselineForecast.sku}</span>.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8 pt-2">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
          
          {/* Promotion Impact */}
          <div>
            <Label htmlFor="promotionImpact" className="flex justify-between items-center mb-1">
              <span>Promotion Impact</span>
              <span className={cn("font-semibold text-sm", getImpactColor(params.promotionImpact))}>
                {params.promotionImpact > 0 && '+'}{params.promotionImpact}%
              </span>
            </Label>
            <Slider
              id="promotionImpact"
              min={-50} max={50} step={5}
              defaultValue={[params.promotionImpact]}
              onValueChange={(value) => handleSliderChange('promotionImpact', value)}
              aria-label="Promotion Impact Slider"
            />
             <p className="text-xs text-muted-foreground mt-1">Adjust for promotions or discounts.</p>
          </div>

          {/* Seasonal Adjustment */}
          <div>
            <Label htmlFor="seasonalAdjustment" className="flex justify-between items-center mb-1">
              <span>Seasonal Adjustment</span>
               <span className={cn("font-semibold text-sm", getImpactColor(params.seasonalAdjustment))}>
                {params.seasonalAdjustment > 0 && '+'}{params.seasonalAdjustment}%
              </span>
            </Label>
            <Slider
              id="seasonalAdjustment"
              min={-30} max={30} step={5}
              defaultValue={[params.seasonalAdjustment]}
              onValueChange={(value) => handleSliderChange('seasonalAdjustment', value)}
               aria-label="Seasonal Adjustment Slider"
            />
             <p className="text-xs text-muted-foreground mt-1">Refine for seasonal demand shifts.</p>
          </div>

          {/* Market Growth Factor */}
          <div>
            <Label htmlFor="marketGrowth" className="flex justify-between items-center mb-1">
              <span>Market Growth Factor</span>
              <span className={cn("font-semibold text-sm", getImpactColor(params.marketGrowth))}>
                {params.marketGrowth > 0 && '+'}{params.marketGrowth}%
              </span>
            </Label>
            <Slider
              id="marketGrowth"
              min={-20} max={20} step={5}
              defaultValue={[params.marketGrowth]}
              onValueChange={(value) => handleSliderChange('marketGrowth', value)}
              aria-label="Market Growth Factor Slider"
            />
            <p className="text-xs text-muted-foreground mt-1">Account for market expansion/contraction.</p>
          </div>

          {/* Supply Chain Risk */}
          <div>
            <Label htmlFor="supplyChainRisk" className="flex justify-between items-center mb-1">
              <span>Supply Chain Disruption</span>
              <span className={cn("font-semibold text-sm", getImpactColor(-params.supplyChainRisk))}>
                -{params.supplyChainRisk}%
              </span>
            </Label>
            <Slider
              id="supplyChainRisk"
              min={0} max={40} step={5} // UI slider is positive, logic makes it negative
              defaultValue={[params.supplyChainRisk]}
              onValueChange={(value) => handleSliderChange('supplyChainRisk', value)}
              aria-label="Supply Chain Disruption Slider"
            />
            <p className="text-xs text-muted-foreground mt-1">Model potential negative supply impacts.</p>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t">
           <Card className="p-3 bg-muted/30 w-full sm:w-auto text-center sm:text-left">
                <CardTitle className="text-sm font-medium flex items-center gap-1">
                    {totalImpactPercentage >= 0 ? <TrendingUp className="h-4 w-4 text-success" /> : <TrendingDown className="h-4 w-4 text-destructive" />}
                    Total Scenario Impact
                </CardTitle>
                <p className={cn("text-xl font-bold", getImpactColor(totalImpactPercentage))}>
                    {totalImpactPercentage >= 0 && '+'}{totalImpactPercentage.toFixed(1)}%
                    <span className="text-xs font-normal text-muted-foreground ml-1">(on 90-day demand)</span>
                </p>
            </Card>
          <div className="flex gap-2 flex-wrap justify-center sm:justify-end">
            <Button onClick={handleApplyScenario} className="bg-primary hover:bg-primary/80 text-primary-foreground">
                <RotateCcw className="mr-2 h-4 w-4" /> Apply Scenario
            </Button>
            <Button variant="outline" onClick={handleResetToBaseline}>
                <Undo className="mr-2 h-4 w-4" /> Reset to Baseline
            </Button>
          </div>
        </div>

        <div className="pt-4 border-t space-y-3">
            <div className="flex flex-col sm:flex-row gap-2 items-center">
                 <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline"><Save className="mr-2 h-4 w-4" /> Save Current Scenario</Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80">
                        <div className="grid gap-4">
                        <div className="space-y-2">
                            <h4 className="font-medium leading-none">Save Scenario</h4>
                            <p className="text-sm text-muted-foreground">
                            Enter a name for the current parameter settings.
                            </p>
                        </div>
                        <Input
                            value={scenarioName}
                            onChange={(e) => setScenarioName(e.target.value)}
                            placeholder="e.g., Q4 High Promotion"
                        />
                        <Button onClick={handleSaveScenario}>Save</Button>
                        </div>
                    </PopoverContent>
                </Popover>
                {Object.keys(savedScenarios).length > 0 && (
                     <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline">Load Saved Scenario</Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                             <ul className="space-y-1 p-1">
                                {Object.keys(savedScenarios).map(name => (
                                    <li key={name}>
                                        <Button variant="ghost" className="w-full justify-start" onClick={() => handleLoadScenario(name)}>{name}</Button>
                                    </li>
                                ))}
                            </ul>
                        </PopoverContent>
                    </Popover>
                )}
            </div>
             <p className="text-xs text-muted-foreground">Saved scenarios are stored in this browser session only.</p>
        </div>

        {/* Placeholder for side-by-side metrics comparison */}
        <div className="pt-4 border-t">
            <h4 className="text-lg font-semibold mb-2 text-foreground">Scenario vs. Baseline Metrics (Placeholder)</h4>
            <p className="text-sm text-muted-foreground">
                A detailed table comparing key metrics (e.g., total predicted units, revenue impact, inventory requirements) 
                between the baseline forecast and the applied scenario will be displayed here.
            </p>
        </div>

      </CardContent>
    </Card>
  );
}

    
