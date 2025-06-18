
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
      color: "hsl(var(--primary))",
    },
    predicted: {
      label: "Predicted Demand",
      color: "hsl(var(--accent))",
    },
    // Add confidence interval colors if you had the data
    // confidenceUpper: { label: "Upper Confidence", color: "hsla(var(--accent), 0.2)" },
    // confidenceLower: { label: "Lower Confidence", color: "hsla(var(--accent), 0.2)" },
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

  // Create a bridge point for a continuous line
   const bridgePoint = {
    date: predictionPoints[0].date, // Use the date of the first prediction
    historical: formattedHistoricalData.length > 0 ? formattedHistoricalData[formattedHistoricalData.length - 1].historical : undefined, // Value of the last historical point
    timestamp: new Date(predictionPoints[0].date).getTime() -1, // Ensure it sorts just before the first prediction
  };


  const combinedData = [
    ...formattedHistoricalData,
    ...(formattedHistoricalData.length > 0 && predictionPoints.length > 0 ? [bridgePoint] : []), // Add bridge if both exist
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
                    formatter={(value, name, props) => {
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
                    strokeDasharray="5 5" 
                    strokeWidth={2} 
                    dot={{ r: 3, fill: chartConfig.predicted.color }} 
                    activeDot={{ r: 5 }}
                    name={chartConfig.predicted.label as string}
                />
                 {/* Illustrative confidence interval - requires actual min/max data from API for real shading
                 <Area type="monotone" dataKey="confidenceUpper" stroke="transparent" fill="hsla(var(--primary-hsl), 0.1)" name="Upper Bound" />
                 <Area type="monotone" dataKey="confidenceLower" stroke="transparent" fill="hsla(var(--primary-hsl), 0.1)" name="Lower Bound" />
                 */}
            </LineChart>
            </ResponsiveContainer>
        </ChartContainer>
         <p className="text-xs text-muted-foreground text-center pt-2">Note: Chart shows historical sales and AI-predicted demand points. Confidence intervals are illustrative.</p>
      </CardContent>
    </Card>
  );
}
