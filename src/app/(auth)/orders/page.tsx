
"use client";

import { ClipboardList, Loader2, FilePlus2, ShoppingCart, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { useReorderSuggestions, useCreatePurchaseOrder } from '@/hooks/useOrders';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import type { OptimizeReordersOutput } from '@/ai/flows/reorderOptimization'; 

export default function OrdersPage() {
  const { data: suggestionsData, isLoading: isLoadingSuggestions, isError: isErrorSuggestions, error: suggestionsError } = useReorderSuggestions();
  const createPoMutation = useCreatePurchaseOrder();
  const { toast } = useToast();

  const handleCreatePo = (recommendation: NonNullable<OptimizeReordersOutput>['recommendations'][number]) => {
    if (!recommendation.optimalReorderQuantity || recommendation.optimalReorderQuantity <=0 ) {
      toast({title: "Cannot Create PO", description: "Optimal reorder quantity is zero or invalid.", variant: "destructive"});
      return;
    }
    if (recommendation.estimatedCost <= 0 && recommendation.optimalReorderQuantity > 0) {
       toast({title: "Warning: Zero Cost PO", description: "Creating PO with zero estimated cost.", variant: "default"});
    }

    const poPayload = {
      items: [{ 
        sku: recommendation.sku, 
        name: recommendation.productName,
        productId: recommendation.sku, 
        quantity: recommendation.optimalReorderQuantity,
        unitPrice: recommendation.optimalReorderQuantity > 0 ? (recommendation.estimatedCost / recommendation.optimalReorderQuantity) : 0,
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
        <Button className="bg-accent hover:bg-accent/90 text-accent-foreground" onClick={() => toast({title: "Feature Coming Soon"})}>
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
                <Card key={`skeleton-${i}`}><CardHeader><Skeleton className="h-6 w-3/4" /></CardHeader><CardContent className="space-y-2"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-5/6" /></CardContent><CardFooter><Skeleton className="h-10 w-24" /></CardFooter></Card>
              ))}
            </div>
          )}
          {isErrorSuggestions && (
            <div className="flex flex-col items-center justify-center text-center py-8 text-destructive">
              <AlertCircle className="h-12 w-12 mb-3" />
              <p className="font-semibold">Error loading reorder suggestions:</p>
              <p className="text-sm">{suggestionsError?.message || "An unknown error occurred."}</p>
            </div>
          )}
          {!isLoadingSuggestions && !isErrorSuggestions && (!suggestionsData || suggestionsData.recommendations.length === 0) && (
            <p className="text-muted-foreground text-center py-8">No reorder suggestions available.</p>
          )}
          {suggestionsData && suggestionsData.recommendations.length > 0 && (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {suggestionsData.recommendations.map((rec, index) => (
                <Card key={rec.sku + index} className="flex flex-col">
                  <CardHeader><CardTitle className="text-lg font-headline">{rec.productName} <span className="text-sm text-muted-foreground">({rec.sku})</span></CardTitle><CardDescription>Current: {rec.currentQuantity} units.</CardDescription></CardHeader>
                  <CardContent className="flex-grow space-y-2 text-sm"><p><span className="font-semibold">Suggested Qty:</span> {rec.optimalReorderQuantity}</p><p><span className="font-semibold">Est. Cost:</span> ${rec.estimatedCost.toFixed(2)}</p>{rec.notes && <p className="text-xs text-muted-foreground italic">Note: {rec.notes}</p>}</CardContent>
                  <CardFooter>
                    <Button onClick={() => handleCreatePo(rec)} disabled={(createPoMutation.isPending && createPoMutation.variables?.items[0].sku === rec.sku) || rec.optimalReorderQuantity <= 0} className="w-full">
                      {createPoMutation.isPending && createPoMutation.variables?.items[0].sku === rec.sku ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FilePlus2 className="mr-2 h-4 w-4" />}
                      {rec.optimalReorderQuantity <= 0 ? "No Reorder Needed" : "Create PO"}
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-lg mt-8">
        <CardHeader><CardTitle className="font-headline flex items-center"><ClipboardList className="h-6 w-6 mr-2 text-primary" />Order History (Coming Soon)</CardTitle></CardHeader>
        <CardContent className="flex flex-col items-center justify-center text-center min-h-[200px]"><ClipboardList className="h-12 w-12 text-muted-foreground mb-4" /><p className="text-lg text-muted-foreground">Advanced order history table is planned.</p></CardContent>
      </Card>
    </div>
  );
}
