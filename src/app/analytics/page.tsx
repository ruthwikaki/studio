
import { BarChart3, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function AnalyticsPage() {
  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-3xl font-headline font-semibold text-foreground">Inventory Analytics</h1>
      
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader>
            <CardTitle className="font-headline flex items-center">
              <TrendingUp className="h-6 w-6 mr-2 text-primary" />
              Demand Forecasting
            </CardTitle>
            <CardDescription>
              Predict future demand for your products using AI-powered analysis.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-start">
            <Image 
              src="https://placehold.co/600x300.png" 
              alt="Demand forecasting visual" 
              width={600} 
              height={300}
              data-ai-hint="graph forecast data"
              className="rounded-md shadow-sm mb-4 w-full object-cover"
            />
            <p className="text-sm text-muted-foreground mb-4">
              Analyze historical sales data, seasonality, and market trends to get accurate 30, 60, and 90-day demand predictions.
            </p>
            <Button asChild className="bg-accent hover:bg-accent/90 text-accent-foreground">
              <Link href="/analytics/forecasting">
                Go to Forecasting Tools
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline flex items-center">
              <BarChart3 className="h-6 w-6 mr-2 text-primary" />
              Detailed Analytics & Reporting
            </CardTitle>
             <CardDescription>
                More advanced analytics and custom reporting features are coming soon.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center text-center min-h-[300px]">
            <Image 
              src="https://placehold.co/600x300.png" 
              alt="Analytics placeholder chart" 
              width={600} 
              height={300}
              data-ai-hint="data charts"
              className="rounded-md shadow-md mb-4"
            />
            <p className="text-lg text-muted-foreground">
              Gain deeper insights into your inventory performance, trends, and overall health.
            </p>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}

