
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip, Area } from 'recharts';
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
        color: "hsl(var(--warning))", // Orange for scenario
    },
    confidenceArea: {
      label: "Confidence Interval",
      color: "hsla(var(--success), 0.2)", // Light green semi-transparent for baseline
    },
     scenarioConfidenceArea: {
      label: "Scenario Interval",
      color: "hsla(var(--warning), 0.2)", // Light orange semi-transparent for scenario
    },
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
      { dateLabel: 'Next 30 Days', date: getFutureDate(lastHistoricalDateObj, 30), value: predictions['30day'].demand, confidence: predictions['30day'].confidence, interval: predictions['30day'].confidenceInterval },
      { dateLabel: 'Next 60 Days', date: getFutureDate(lastHistoricalDateObj, 60), value: predictions['60day'].demand, confidence: predictions['60day'].confidence, interval: predictions['60day'].confidenceInterval },
      { dateLabel: 'Next 90 Days', date: getFutureDate(lastHistoricalDateObj, 90), value: predictions['90day'].demand, confidence: predictions['90day'].confidence, interval: predictions['90day'].confidenceInterval },
    ].map(p => ({ 
        date: p.date, 
        [`${keyPrefix}`]: p.value, 
        [`${keyPrefix}Lower`]: p.interval?.lowerBound,
        [`${keyPrefix}Upper`]: p.interval?.upperBound,
        confidence: p.confidence, 
        timestamp: new Date(p.date).getTime() 
    }));
  };
  
  const baselinePredictionPoints = createPredictionPoints(baselinePredictions, 'baseline');
  const scenarioPredictionPoints = createPredictionPoints(scenarioPredictions, 'scenario');

  // Create a point to bridge historical to the first baseline prediction for continuous line
  const bridgePointHistoricalToBaseline = formattedHistoricalData.length > 0 && baselinePredictionPoints.length > 0 ? {
    date: baselinePredictionPoints[0].date, 
    historical: formattedHistoricalData[formattedHistoricalData.length - 1].historical,
    timestamp: new Date(baselinePredictionPoints[0].date).getTime() -1, // Ensure it's just before
  } : null;

  // Combine all data points: historical, bridge, and all prediction points from baseline and scenario
  let combinedDataMap = new Map<string, any>();

  // Add historical data
  formattedHistoricalData.forEach(item => {
    combinedDataMap.set(item.date, { ...combinedDataMap.get(item.date), ...item });
  });
  
  // Add bridge point if it exists
  if (bridgePointHistoricalToBaseline) {
    combinedDataMap.set(bridgePointHistoricalToBaseline.date, { ...combinedDataMap.get(bridgePointHistoricalToBaseline.date), ...bridgePointHistoricalToBaseline });
  }

  // Add baseline prediction points
  baselinePredictionPoints.forEach(p => {
    combinedDataMap.set(p.date, { ...combinedDataMap.get(p.date), ...p });
  });

  // Add scenario prediction points
  scenarioPredictionPoints.forEach(p => {
    combinedDataMap.set(p.date, { ...combinedDataMap.get(p.date), ...p });
  });
  
  const combinedData = Array.from(combinedDataMap.values()).sort((a, b) => a.timestamp - b.timestamp);


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
                        
                        let tooltipText = `${formattedValue}`;
                        if (name === 'baseline' && props.payload.baselineLower !== undefined && props.payload.baselineUpper !== undefined) {
                            tooltipText += ` (CI: ${props.payload.baselineLower}-${props.payload.baselineUpper})`;
                        } else if (name === 'scenario' && props.payload.scenarioLower !== undefined && props.payload.scenarioUpper !== undefined) {
                            tooltipText += ` (CI: ${props.payload.scenarioLower}-${props.payload.scenarioUpper})`;
                        } else if ((name === 'baseline' || name === 'scenario') && props.payload.confidence) {
                           tooltipText += ` (Confidence: ${props.payload.confidence})`;
                        }
                        return [tooltipText, label];
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
                {/* Baseline Confidence Area */}
                <Area
                    type="monotone"
                    dataKey="baselineUpper"
                    stackId="baselineCI"
                    stroke={chartConfig.confidenceArea.color}
                    fill={chartConfig.confidenceArea.color}
                    name={chartConfig.confidenceArea.label as string}
                    hide={!baselinePredictionPoints.some(p => p.baselineUpper !== undefined)} // Hide if no data
                    connectNulls={true}
                 />
                 <Area
                    type="monotone"
                    dataKey="baselineLower" 
                    stackId="baselineCI" 
                    stroke={chartConfig.confidenceArea.color}
                    fill={chartConfig.confidenceArea.color}
                    name="" // No separate legend item for lower bound
                    hide={!baselinePredictionPoints.some(p => p.baselineLower !== undefined)}
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
                    <>
                    {/* Scenario Confidence Area */}
                    <Area
                        type="monotone"
                        dataKey="scenarioUpper"
                        stackId="scenarioCI"
                        stroke={chartConfig.scenarioConfidenceArea.color}
                        fill={chartConfig.scenarioConfidenceArea.color}
                        name={chartConfig.scenarioConfidenceArea.label as string}
                        hide={!scenarioPredictionPoints.some(p => p.scenarioUpper !== undefined)}
                        connectNulls={true}
                    />
                     <Area
                        type="monotone"
                        dataKey="scenarioLower"
                        stackId="scenarioCI"
                        stroke={chartConfig.scenarioConfidenceArea.color}
                        fill={chartConfig.scenarioConfidenceArea.color}
                        name=""
                        hide={!scenarioPredictionPoints.some(p => p.scenarioLower !== undefined)}
                        connectNulls={true}
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
                        connectNulls={true}
                    />
                    </>
                )}
            </LineChart>
            </ResponsiveContainer>
        </ChartContainer>
         <p className="text-xs text-muted-foreground text-center pt-2">Note: Chart shows historical sales and AI-predicted demand points. Shaded confidence interval is illustrative.</p>
      </CardContent>
    </Card>
  );
}
