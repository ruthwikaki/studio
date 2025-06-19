
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip, Area, Legend } from 'recharts';
import type { ForecastDemandOutput } from '@/ai/flows/forecasting'; // Ensure this path is correct
import { BarChart } from 'lucide-react';

interface ForecastChartProps {
  historicalData: { date: string; quantitySold: number }[];
  baselinePredictions: ForecastDemandOutput['predictions'] | null;
  scenarioPredictions?: ForecastDemandOutput['predictions'] | null;
}

const getFutureDate = (baseDate: Date, daysToAdd: number): string => {
  const futureDate = new Date(baseDate);
  futureDate.setDate(futureDate.getDate() + daysToAdd);
  return futureDate.toISOString().split('T')[0];
};


export default function ForecastChart({ historicalData, baselinePredictions, scenarioPredictions }: ForecastChartProps) {
  if (!historicalData || historicalData.length === 0 || !baselinePredictions) {
    return (
        <div className="h-[350px] w-full flex flex-col items-center justify-center bg-muted/30 rounded-lg border p-4">
             <BarChart className="h-16 w-16 text-primary/40 mb-4" />
             <p className="text-md font-semibold text-muted-foreground">Demand Forecast Chart</p>
             <p className="text-sm text-muted-foreground text-center">No data available to display the chart.</p>
             <p className="text-xs text-muted-foreground text-center mt-1">Please generate a forecast to see the visualization.</p>
        </div>
    );
  }

  const chartConfig = {
    historical: { label: "Historical Sales", color: "hsl(var(--primary))" },
    baseline: { label: "Baseline Forecast", color: "hsl(var(--success))" },
    scenario: { label: "Scenario Forecast", color: "hsl(var(--warning))" }, // Orange
    baselineLower: { label: "Baseline Lower CI", color: "hsla(var(--success), 0.1)" },
    baselineUpper: { label: "Baseline Upper CI", color: "hsla(var(--success), 0.1)" },
    scenarioLower: { label: "Scenario Lower CI", color: "hsla(var(--warning), 0.1)" },
    scenarioUpper: { label: "Scenario Upper CI", color: "hsla(var(--warning), 0.1)" },
  };
  
  const lastHistoricalEntry = historicalData.length > 0 ? historicalData[historicalData.length - 1] : { date: new Date().toISOString().split('T')[0], quantitySold: 0 };
  const lastHistoricalDateObj = new Date(lastHistoricalEntry.date);

  const formattedHistoricalData = historicalData.map(item => ({
    date: item.date,
    historical: item.quantitySold,
    timestamp: new Date(item.date).getTime(),
  }));

  const createPredictionPoints = (predictions: ForecastDemandOutput['predictions'] | null, keyPrefix: string) => {
    if (!predictions) return [];
    return [
      // Start forecast line from last historical point for smooth transition
      { date: lastHistoricalEntry.date, value: keyPrefix === 'baseline' ? lastHistoricalEntry.quantitySold : undefined, confidence: undefined, interval: undefined, isBridge: true },
      { dateLabel: 'Next 30 Days', date: getFutureDate(lastHistoricalDateObj, 30), value: predictions['30day'].demand, confidence: predictions['30day'].confidence, interval: predictions['30day'].confidenceInterval },
      { dateLabel: 'Next 60 Days', date: getFutureDate(lastHistoricalDateObj, 60), value: predictions['60day'].demand, confidence: predictions['60day'].confidence, interval: predictions['60day'].confidenceInterval },
      { dateLabel: 'Next 90 Days', date: getFutureDate(lastHistoricalDateObj, 90), value: predictions['90day'].demand, confidence: predictions['90day'].confidence, interval: predictions['90day'].confidenceInterval },
    ].map(p => ({ 
        date: p.date, 
        [`${keyPrefix}`]: p.value, 
        [`${keyPrefix}Lower`]: p.interval?.lowerBound,
        [`${keyPrefix}Upper`]: p.interval?.upperBound,
        confidence: p.confidence, 
        timestamp: new Date(p.date).getTime(),
        isBridgePoint: p.isBridge,
    }));
  };
  
  const baselinePredictionPoints = createPredictionPoints(baselinePredictions, 'baseline');
  const scenarioPredictionPoints = scenarioPredictions ? createPredictionPoints(scenarioPredictions, 'scenario') : [];

  let combinedDataMap = new Map<string, any>();

  formattedHistoricalData.forEach(item => {
    combinedDataMap.set(item.date, { ...combinedDataMap.get(item.date), ...item });
  });
  
  baselinePredictionPoints.forEach(p => {
    combinedDataMap.set(p.date, { ...combinedDataMap.get(p.date), ...p });
  });

  scenarioPredictionPoints.forEach(p => {
    combinedDataMap.set(p.date, { ...combinedDataMap.get(p.date), ...p });
  });
  
  const combinedData = Array.from(combinedDataMap.values()).sort((a, b) => a.timestamp - b.timestamp);

  return (
    <Card className="bg-card border shadow-sm">
      <CardContent className="pt-6">
        <ChartContainer config={chartConfig} className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
            <RechartsLineChart data={combinedData} margin={{ top: 5, right: 30, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                    dataKey="date" 
                    tickFormatter={(tick) => new Date(tick).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    angle={-40}
                    textAnchor="end"
                    height={60}
                    stroke="hsl(var(--foreground))"
                    tick={{ fontSize: 10 }}
                />
                <YAxis 
                    stroke="hsl(var(--foreground))" 
                    tick={{ fontSize: 10 }}
                    label={{ value: 'Quantity', angle: -90, position: 'insideLeft', offset: 10, style: {fontSize: '12px', fill: 'hsl(var(--muted-foreground))'} }}
                />
                <RechartsTooltip
                    contentStyle={{ backgroundColor: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: "0.5rem", boxShadow: "var(--shadow-md)" }}
                    labelStyle={{ color: "hsl(var(--foreground))", fontWeight: "bold", marginBottom: "0.5rem" }}
                    itemStyle={{ color: "hsl(var(--foreground))" }}
                    formatter={(value: number, name: string, props: any) => {
                        const formattedValue = typeof value === 'number' ? value.toLocaleString() : value;
                        let label = name;
                        if (name === 'historical') label = chartConfig.historical.label as string;
                        else if (name === 'baseline') label = chartConfig.baseline.label as string;
                        else if (name === 'scenario') label = chartConfig.scenario.label as string;
                        
                        let tooltipText = `${formattedValue}`;
                         if ((name === 'baseline' || name === 'scenario') && props.payload.confidence) {
                           tooltipText += ` (Confidence: ${props.payload.confidence})`;
                        }
                         if (name === 'baseline' && props.payload.baselineLower !== undefined && props.payload.baselineUpper !== undefined) {
                             tooltipText += ` (CI: ${props.payload.baselineLower}-${props.payload.baselineUpper})`;
                         } else if (name === 'scenario' && props.payload.scenarioLower !== undefined && props.payload.scenarioUpper !== undefined) {
                             tooltipText += ` (CI: ${props.payload.scenarioLower}-${props.payload.scenarioUpper})`;
                         }
                        return [tooltipText, label];
                    }}
                 />
                <Legend wrapperStyle={{paddingTop: "10px"}} />
                <Line 
                    type="monotone" 
                    dataKey="historical" 
                    stroke={chartConfig.historical.color} 
                    strokeWidth={2} 
                    dot={{ r: 2, fill: chartConfig.historical.color }} 
                    activeDot={{ r: 4 }}
                    name={chartConfig.historical.label as string}
                    connectNulls={true}
                />
                <Area
                    type="monotone"
                    dataKey="baselineUpper"
                    stackId="baselineCI"
                    stroke={chartConfig.baselineUpper.color}
                    fill={chartConfig.baselineUpper.color}
                    name="" // Hide from legend directly
                    hide={!baselinePredictionPoints.some(p => p.baselineUpper !== undefined)} 
                    connectNulls={true}
                    legendType="none"
                 />
                 <Area
                    type="monotone"
                    dataKey="baselineLower" 
                    stackId="baselineCI" 
                    stroke={chartConfig.baselineLower.color}
                    fill={chartConfig.baselineLower.color}
                    name="" // Hide from legend
                    hide={!baselinePredictionPoints.some(p => p.baselineLower !== undefined)}
                    connectNulls={true}
                    legendType="none"
                 />
                <Line 
                    type="monotone" 
                    dataKey="baseline" 
                    stroke={chartConfig.baseline.color} 
                    strokeDasharray="5 5" 
                    strokeWidth={2} 
                    dot={{ r: 3, fill: chartConfig.baseline.color }} 
                    activeDot={{ r: 5 }}
                    name={chartConfig.baseline.label as string}
                    connectNulls={false} // Do not connect if points are missing
                />
                {scenarioPredictions && (
                    <>
                     <Area
                        type="monotone"
                        dataKey="scenarioUpper"
                        stackId="scenarioCI"
                        stroke={chartConfig.scenarioUpper.color}
                        fill={chartConfig.scenarioUpper.color}
                        name=""
                        hide={!scenarioPredictionPoints.some(p => p.scenarioUpper !== undefined)}
                        connectNulls={true}
                        legendType="none"
                    />
                     <Area
                        type="monotone"
                        dataKey="scenarioLower"
                        stackId="scenarioCI"
                        stroke={chartConfig.scenarioLower.color}
                        fill={chartConfig.scenarioLower.color}
                        name=""
                        hide={!scenarioPredictionPoints.some(p => p.scenarioLower !== undefined)}
                        connectNulls={true}
                        legendType="none"
                     />
                     <Line 
                        type="monotone" 
                        dataKey="scenario" 
                        stroke={chartConfig.scenario.color} 
                        strokeDasharray="2 2" 
                        strokeWidth={2} 
                        dot={{ r: 3, fill: chartConfig.scenario.color }} 
                        activeDot={{ r: 5 }}
                        name={chartConfig.scenario.label as string}
                        connectNulls={false}
                    />
                    </>
                )}
            </RechartsLineChart>
            </ResponsiveContainer>
        </ChartContainer>
         <p className="text-xs text-muted-foreground text-center pt-2">Note: Chart shows historical sales and AI-predicted demand points. Shaded confidence interval is illustrative.</p>
      </CardContent>
    </Card>
  );
}
