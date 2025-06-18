
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import type { ForecastDemandOutput } from '@/ai/flows/forecasting';
import Image from "next/image";

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
        <div className="h-[350px] w-full flex items-center justify-center bg-muted/30 rounded-lg border">
             <Image 
                src="https://placehold.co/450x250.png?text=Demand+Forecast+Chart" 
                alt="Forecasting chart placeholder"
                width={450}
                height={250}
                data-ai-hint="line graph data"
                className="rounded-md shadow-sm opacity-50"
            />
        </div>
    );
  }

  const chartConfig = {
    historical: {
      label: "Historical Sales",
      color: "hsl(var(--primary))", // Blue
    },
    baseline: {
      label: "Baseline Forecast",
      color: "hsl(var(--success))", // Green
    },
    scenario: {
        label: "Scenario Forecast",
        color: "hsl(var(--warning))", // Orange/Yellow for scenario
    },
    confidenceUpper: { label: "Upper Confidence", color: "hsla(var(--primary), 0.1)" }, 
    confidenceLower: { label: "Lower Confidence", color: "hsla(var(--primary), 0.1)" }, 
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
      { dateLabel: 'Next 30 Days', date: getFutureDate(lastHistoricalDateObj, 30), value: predictions['30day'].demand, confidence: predictions['30day'].confidence },
      { dateLabel: 'Next 60 Days', date: getFutureDate(lastHistoricalDateObj, 60), value: predictions['60day'].demand, confidence: predictions['60day'].confidence },
      { dateLabel: 'Next 90 Days', date: getFutureDate(lastHistoricalDateObj, 90), value: predictions['90day'].demand, confidence: predictions['90day'].confidence },
    ].map(p => ({ date: p.date, [`${keyPrefix}`]: p.value, confidence: p.confidence, timestamp: new Date(p.date).getTime() }));
  };
  
  const baselinePredictionPoints = createPredictionPoints(baselinePredictions, 'baseline');
  const scenarioPredictionPoints = createPredictionPoints(scenarioPredictions, 'scenario');

  const bridgePointHistoricalToBaseline = formattedHistoricalData.length > 0 && baselinePredictionPoints.length > 0 ? {
    date: baselinePredictionPoints[0].date, 
    historical: formattedHistoricalData[formattedHistoricalData.length - 1].historical, // Use last historical value
    timestamp: new Date(baselinePredictionPoints[0].date).getTime() -1, // Ensure it's just before the first prediction
  } : null;

  // Combine all data points and sort by date (timestamp)
  let combinedData = [...formattedHistoricalData];
  if (bridgePointHistoricalToBaseline) combinedData.push(bridgePointHistoricalToBaseline);
  
  // Merge baseline and scenario points by date
  const allPredictionPoints = new Map<string, any>();

  baselinePredictionPoints.forEach(p => {
    allPredictionPoints.set(p.date, { ...allPredictionPoints.get(p.date), ...p });
  });
  scenarioPredictionPoints.forEach(p => {
    allPredictionPoints.set(p.date, { ...allPredictionPoints.get(p.date), ...p });
  });

  combinedData = [...combinedData, ...Array.from(allPredictionPoints.values())]
    .sort((a, b) => a.timestamp - b.timestamp)
    .filter((item, index, self) => index === self.findIndex((t) => t.date === item.date && t.historical === item.historical && t.baseline === item.baseline && t.scenario === item.scenario)); // Remove duplicates if any


  return (
    <Card className="bg-card border shadow-sm">
      <CardContent className="pt-6">
        <ChartContainer config={chartConfig} className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
            <LineChart data={combinedData} margin={{ top: 5, right: 30, left: 0, bottom: 20 }}>
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
                        if (name === 'baseline') label = chartConfig.baseline.label as string;
                        if (name === 'scenario') label = chartConfig.scenario.label as string;
                        
                        if ((name === 'baseline' || name === 'scenario') && props.payload.confidence) {
                            return [`${formattedValue} (Confidence: ${props.payload.confidence})`, label];
                        }
                        return [formattedValue, label];
                    }}
                 />
                <ChartLegend content={<ChartLegendContent />} wrapperStyle={{paddingTop: "10px"}} />
                <Line 
                    type="monotone" 
                    dataKey="historical" 
                    stroke={chartConfig.historical.color} 
                    strokeWidth={2} 
                    dot={{ r: 3, fill: chartConfig.historical.color }} 
                    activeDot={{ r: 5 }}
                    name={chartConfig.historical.label as string}
                    connectNulls={true}
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
                    connectNulls={true}
                />
                {scenarioPredictions && (
                     <Line 
                        type="monotone" 
                        dataKey="scenario" 
                        stroke={chartConfig.scenario.color} 
                        strokeDasharray="2 2" // Different dash for scenario
                        strokeWidth={2} 
                        dot={{ r: 3, fill: chartConfig.scenario.color }} 
                        activeDot={{ r: 5 }}
                        name={chartConfig.scenario.label as string}
                        connectNulls={true}
                    />
                )}
            </LineChart>
            </ResponsiveContainer>
        </ChartContainer>
         <p className="text-xs text-muted-foreground text-center pt-2">Note: Chart shows historical sales and AI-predicted demand points. Shaded confidence interval is illustrative.</p>
      </CardContent>
    </Card>
  );
}

