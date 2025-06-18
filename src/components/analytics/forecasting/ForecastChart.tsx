
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import type { ForecastDemandOutput } from '@/ai/flows/forecasting';
import Image from "next/image";

interface ForecastChartProps {
  historicalData: { date: string; quantitySold: number }[];
  predictions: ForecastDemandOutput['predictions'];
}

const getFutureDate = (baseDate: Date, daysToAdd: number): string => {
  const futureDate = new Date(baseDate);
  futureDate.setDate(futureDate.getDate() + daysToAdd);
  return futureDate.toISOString().split('T')[0];
};


export default function ForecastChart({ historicalData, predictions }: ForecastChartProps) {
  if (!historicalData || historicalData.length === 0 || !predictions) {
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
    predicted: {
      label: "Predicted Demand",
      color: "hsl(var(--success))", // Green (using success color from theme)
    },
    confidenceUpper: { label: "Upper Confidence", color: "hsla(var(--primary), 0.1)" }, // Light blue for confidence
    confidenceLower: { label: "Lower Confidence", color: "hsla(var(--primary), 0.1)" }, // Light blue for confidence
  };
  
  const lastHistoricalEntry = historicalData.length > 0 ? historicalData[historicalData.length - 1] : { date: new Date().toISOString().split('T')[0], quantitySold: 0 };
  const lastHistoricalDateObj = new Date(lastHistoricalEntry.date);

  const formattedHistoricalData = historicalData.map(item => ({
    date: item.date,
    historical: item.quantitySold,
    timestamp: new Date(item.date).getTime(),
  }));

  const predictionPoints = [
    { dateLabel: 'Next 30 Days', date: getFutureDate(lastHistoricalDateObj, 30), predicted: predictions['30day'].demand, confidence: predictions['30day'].confidence },
    { dateLabel: 'Next 60 Days', date: getFutureDate(lastHistoricalDateObj, 60), predicted: predictions['60day'].demand, confidence: predictions['60day'].confidence },
    { dateLabel: 'Next 90 Days', date: getFutureDate(lastHistoricalDateObj, 90), predicted: predictions['90day'].demand, confidence: predictions['90day'].confidence },
  ].map(p => ({ ...p, timestamp: new Date(p.date).getTime() }));

  // Create a bridge point for a continuous line if there's historical data
   const bridgePoint = formattedHistoricalData.length > 0 && predictionPoints.length > 0 ? {
    date: predictionPoints[0].date, 
    historical: formattedHistoricalData[formattedHistoricalData.length - 1].historical,
    timestamp: new Date(predictionPoints[0].date).getTime() -1, 
  } : null;


  const combinedData = [
    ...formattedHistoricalData,
    ...(bridgePoint ? [bridgePoint] : []), 
    ...predictionPoints.map(p => ({ date: p.date, predicted: p.predicted, confidence: p.confidence, timestamp: p.timestamp }))
  ].sort((a,b) => a.timestamp - b.timestamp);


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
                        if (name === 'predicted' && props.payload.confidence) {
                            return [`${formattedValue} (Confidence: ${props.payload.confidence})`, chartConfig.predicted.label];
                        }
                        return [formattedValue, name === 'historical' ? chartConfig.historical.label : chartConfig.predicted.label];
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
                />
                <Line 
                    type="monotone" 
                    dataKey="predicted" 
                    stroke={chartConfig.predicted.color} 
                    strokeDasharray="5 5" // Dashed line for predictions
                    strokeWidth={2} 
                    dot={{ r: 3, fill: chartConfig.predicted.color }} 
                    activeDot={{ r: 5 }}
                    name={chartConfig.predicted.label as string}
                />
                 {/* 
                 Illustrative confidence interval - requires actual min/max data from API for real shading.
                 If you had `predictedMin` and `predictedMax` in your data:
                 <Area 
                    type="monotone" 
                    dataKey="predictedMax" 
                    stackId="confidence" 
                    stroke="transparent" 
                    fill={chartConfig.confidenceUpper.color}
                    name={chartConfig.confidenceUpper.label as string} 
                 />
                 <Area 
                    type="monotone" 
                    dataKey="predictedMin" 
                    stackId="confidence"  // Use same stackId if you want it to "fill up" from min to max
                    stroke="transparent" 
                    fill={chartConfig.confidenceLower.color} // This might be better as the same color with opacity
                    name={chartConfig.confidenceLower.label as string}
                  />
                  Or for a single shaded area based on a +- range around 'predicted':
                  const dataWithConfidence = combinedData.map(d => ({
                    ...d,
                    confidenceRange: d.predicted ? [d.predicted - (d.predicted * 0.1), d.predicted + (d.predicted * 0.1)] : undefined
                  }));
                  <Line type="monotone" dataKey="confidenceRange" stroke="transparent" activeDot={false} name="Confidence Interval" />
                 */}
            </LineChart>
            </ResponsiveContainer>
        </ChartContainer>
         <p className="text-xs text-muted-foreground text-center pt-2">Note: Chart shows historical sales and AI-predicted demand points. Shaded confidence interval is illustrative.</p>
      </CardContent>
    </Card>
  );
}

