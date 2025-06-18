
"use client";

import { Card, CardContent } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { ForecastDemandOutput } from '@/ai/flows/forecasting';
import Image from "next/image";

interface ForecastChartProps {
  historicalData: { date: string; quantitySold: number }[];
  predictions: ForecastDemandOutput['predictions'];
}

// Helper function to generate future dates for predictions
const getFutureDate = (startDate: string, daysToAdd: number, intervalDays: number): string => {
  const date = new Date(startDate);
  date.setDate(date.getDate() + (daysToAdd * intervalDays));
  return date.toISOString().split('T')[0];
};


export default function ForecastChart({ historicalData, predictions }: ForecastChartProps) {
  if (!historicalData || historicalData.length === 0 || !predictions) {
    return (
        <div className="h-[300px] w-full flex items-center justify-center bg-muted/50 rounded-lg">
             <Image 
                src="https://placehold.co/400x200.png?text=Forecasting+Chart" 
                alt="Forecasting chart placeholder"
                width={400}
                height={200}
                data-ai-hint="line graph"
                className="rounded-md shadow-sm opacity-50"
            />
        </div>
    );
  }

  const lastHistoricalDate = historicalData.length > 0 ? historicalData[historicalData.length - 1].date : new Date().toISOString().split('T')[0];

  const chartData = historicalData.map(item => ({
    date: item.date,
    historical: item.quantitySold,
  }));
  
  // Simple way to append predictions. Assumes weekly data points for historical, and ~monthly for predictions.
  // A more robust solution would align dates properly or use a continuous date axis.
  // For this placeholder, we'll just append them at nominal future points.
  // This is a simplified visualization.
  
  const predictionPoints = [
    { date: getFutureDate(lastHistoricalDate, 1, 30), predicted: predictions['30day'].demand, confidence: predictions['30day'].confidence }, // ~30 days later
    { date: getFutureDate(lastHistoricalDate, 2, 30), predicted: predictions['60day'].demand, confidence: predictions['60day'].confidence }, // ~60 days later
    { date: getFutureDate(lastHistoricalDate, 3, 30), predicted: predictions['90day'].demand, confidence: predictions['90day'].confidence }, // ~90 days later
  ];

  // Combine historical data points with prediction points for the chart.
  // Ensure dates are somewhat sequential for the line chart.
  const combinedData = [
    ...chartData,
    // Create a "bridge" point from last historical to first prediction for line continuity
    { date: predictionPoints[0].date, historical: chartData[chartData.length-1]?.historical }, 
    ...predictionPoints.map(p => ({ date: p.date, predicted: p.predicted }))
  ].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());


  return (
    <Card className="bg-card">
      <CardContent className="pt-6">
        <ChartContainer config={{}} className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
            <LineChart data={combinedData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                    dataKey="date" 
                    tickFormatter={(tick) => new Date(tick).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    angle={-30}
                    textAnchor="end"
                    height={50}
                    stroke="hsl(var(--foreground))"
                    tick={{ fontSize: 10 }}
                />
                <YAxis stroke="hsl(var(--foreground))" tick={{ fontSize: 10 }} />
                <Tooltip
                    contentStyle={{ backgroundColor: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }}
                    labelStyle={{ color: "hsl(var(--foreground))" }}
                    itemStyle={{ color: "hsl(var(--foreground))" }}
                 />
                <Legend />
                <Line type="monotone" dataKey="historical" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} name="Historical Sales" />
                <Line type="monotone" dataKey="predicted" stroke="hsl(var(--accent))" strokeDasharray="5 5" strokeWidth={2} dot={{ r: 3 }} name="Predicted Demand" />
                {/* Confidence interval would require upper/lower bound data, not directly in current predictions output */}
            </LineChart>
            </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
