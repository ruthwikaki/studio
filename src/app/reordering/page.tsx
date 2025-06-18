import { ShoppingCart } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Image from 'next/image';

export default function ReorderingPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-headline font-semibold text-foreground">Automated Reordering</h1>
      
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline flex items-center">
            <ShoppingCart className="h-6 w-6 mr-2 text-primary" />
            Smart Reorder System
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center text-center min-h-[300px]">
          <Image 
            src="https://placehold.co/600x400.png" 
            alt="Reordering system placeholder" 
            width={600} 
            height={400}
            data-ai-hint="logistics supply"
            className="rounded-md shadow-md mb-4"
          />
          <p className="text-lg text-muted-foreground">
            Our smart reordering system with one-click purchase order generation is under development.
          </p>
          <p className="text-sm text-muted-foreground">
            Optimize your stock levels and never miss a sale.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
