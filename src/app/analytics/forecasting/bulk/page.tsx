
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Layers } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function BulkForecastingPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-headline font-semibold text-foreground">Bulk Demand Forecasting</h1>
      
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline flex items-center">
            <Layers className="h-6 w-6 mr-2 text-primary" />
            Bulk Forecast Generation
          </CardTitle>
          <CardDescription>
            Forecast demand for multiple products or entire categories at once.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center text-center min-h-[300px]">
          <Image 
            src="https://placehold.co/600x400.png" 
            alt="Bulk forecasting placeholder" 
            width={600} 
            height={400}
            data-ai-hint="multiple charts data"
            className="rounded-md shadow-md mb-4"
          />
          <p className="text-lg text-muted-foreground">
            Bulk forecasting features are under development.
          </p>
          <p className="text-sm text-muted-foreground">
            Soon you'll be able to generate reports for multiple SKUs, integrate ABC analysis, and more.
          </p>
           <Link href="/analytics/forecasting" className="mt-4 text-primary hover:underline">
            Back to Single Product Forecasting
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
