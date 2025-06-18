
"use client";

import { ClipboardList, Loader2, FilePlus2, ShoppingCart } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { useReorderSuggestions, useCreatePurchaseOrder } from '@/hooks/useOrders';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import type { OptimizeReordersInput } from '@/ai/flows/reorderOptimization'; // For item structure if needed


export default function OrdersPage() {
  const { data: suggestionsData, isLoading: isLoadingSuggestions, isError: isErrorSuggestions, error: suggestionsError } = useReorderSuggestions();
  const createPoMutation = useCreatePurchaseOrder();
  const { toast } = useToast();

  const handleCreatePo = (recommendation: NonNullable<typeof suggestionsData>['recommendations'][number]) => {
    const poPayload = {
      items: [{ 
        sku: recommendation.sku, 
        name: recommendation.productName,
        productId: recommendation.sku, // Assuming SKU is product ID for simplicity
        quantity: recommendation.optimalReorderQuantity,
        unitCost: recommendation.estimatedCost / recommendation.optimalReorderQuantity // Estimate unit cost
      }],
      supplierId: recommendation.selectedSupplierId,
      notes: `Automated PO based on reorder suggestion. ${recommendation.notes || ''}`,
    };
    createPoMutation.mutate(poPayload);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-headline font-semibold text-foreground">Order Management</h1>
        <Button className="bg-accent hover:bg-accent/90 text-accent-foreground" onClick={() => toast({title: "Feature Coming Soon", description:"Manual PO creation form will be available here."})}>
          <FilePlus2 className="mr-2 h-4 w-4" /> Create New PO
        </Button>
      </div>
      
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline flex items-center">
            <ShoppingCart className="h-6 w-6 mr-2 text-primary" />
            AI Reorder Suggestions
          </CardTitle>
          <CardDescription>
            Intelligent recommendations for items to reorder based on current stock, demand, and lead times.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingSuggestions && (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={`skeleton-${i}`}>
                  <CardHeader><Skeleton className="h-6 w-3/4" /></CardHeader>
                  <CardContent className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                    <Skeleton className="h-4 w-1/2" />
                  </CardContent>
                  <CardFooter><Skeleton className="h-10 w-24" /></CardFooter>
                </Card>
              ))}
            </div>
          )}
          {isErrorSuggestions && (
            <p className="text-destructive">Error loading suggestions: {suggestionsError?.message}</p>
          )}
          {!isLoadingSuggestions && !isErrorSuggestions && (!suggestionsData || suggestionsData.recommendations.length === 0) && (
            <p className="text-muted-foreground text-center py-8">No reorder suggestions at the moment. All stock levels are optimal or data is insufficient.</p>
          )}
          {suggestionsData && suggestionsData.recommendations.length > 0 && (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {suggestionsData.recommendations.map((rec, index) => (
                <Card key={rec.sku + index} className="flex flex-col">
                  <CardHeader>
                    <CardTitle className="text-lg font-headline">{rec.productName} <span className="text-sm text-muted-foreground">({rec.sku})</span></CardTitle>
                    <CardDescription>Current: {rec.currentQuantity} units. Reorder Point: {rec.optimizedReorderPoint} units.</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-grow space-y-2">
                    <p className="text-sm"><span className="font-semibold">Suggested Quantity:</span> {rec.optimalReorderQuantity}</p>
                    <p className="text-sm"><span className="font-semibold">Est. Cost:</span> ${rec.estimatedCost.toFixed(2)}</p>
                    {rec.selectedSupplierId && <p className="text-sm"><span className="font-semibold">Supplier:</span> {rec.selectedSupplierId}</p>}
                    {rec.notes && <p className="text-xs text-muted-foreground italic">Note: {rec.notes}</p>}
                  </CardContent>
                  <CardFooter>
                    <Button 
                      onClick={() => handleCreatePo(rec)} 
                      disabled={createPoMutation.isPending && createPoMutation.variables?.items[0].sku === rec.sku}
                      className="w-full"
                    >
                      {createPoMutation.isPending && createPoMutation.variables?.items[0].sku === rec.sku 
                        ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
                        : <FilePlus2 className="mr-2 h-4 w-4" />}
                      Create PO for this Item
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-lg mt-8">
        <CardHeader>
          <CardTitle className="font-headline flex items-center">
            <ClipboardList className="h-6 w-6 mr-2 text-primary" />
            Order History
          </CardTitle>
           <CardDescription>
            A list of your past purchase and sales orders will appear here. (Feature in development)
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center text-center min-h-[200px]">
          <ClipboardList className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg text-muted-foreground">
            Order history tracking is coming soon.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
