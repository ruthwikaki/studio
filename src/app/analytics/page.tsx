import { BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Image from 'next/image';

export default function AnalyticsPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-headline font-semibold text-foreground">Inventory Analytics</h1>
      
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline flex items-center">
            <BarChart3 className="h-6 w-6 mr-2 text-primary" />
            Detailed Analytics
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center text-center min-h-[300px]">
          <Image 
            src="https://placehold.co/600x400.png" 
            alt="Analytics placeholder chart" 
            width={600} 
            height={400}
            data-ai-hint="data charts"
            className="rounded-md shadow-md mb-4"
          />
          <p className="text-lg text-muted-foreground">
            Advanced analytics and reporting features are coming soon.
          </p>
          <p className="text-sm text-muted-foreground">
            Gain deeper insights into your inventory performance, trends, and forecasts.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
