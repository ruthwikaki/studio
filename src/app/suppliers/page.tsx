
import { Truck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Image from 'next/image';

export default function SuppliersPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-headline font-semibold text-foreground">Suppliers Management</h1>
      
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline flex items-center">
            <Truck className="h-6 w-6 mr-2 text-primary" />
            Manage Your Suppliers
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center text-center min-h-[300px]">
          <Image 
            src="https://placehold.co/600x400.png" 
            alt="Suppliers management placeholder" 
            width={600} 
            height={400}
            data-ai-hint="logistics delivery"
            className="rounded-md shadow-md mb-4"
          />
          <p className="text-lg text-muted-foreground">
            Supplier database, contact management, and performance tracking features are coming soon.
          </p>
          <p className="text-sm text-muted-foreground">
            Streamline your procurement process by keeping all supplier information in one place.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
