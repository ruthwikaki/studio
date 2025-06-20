
"use client";

import { useParams, useRouter } from 'next/navigation';
import { useSupplier } from '@/hooks/useSuppliers';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, ArrowLeft, Edit, DollarSign, Clock, CheckCircle, ShoppingCart, LineChart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

const getReliabilityColor = (score?: number): string => {
  if (score === undefined) return 'bg-muted text-muted-foreground';
  if (score >= 85) return 'bg-success/20 text-success-foreground border-success';
  if (score >= 65) return 'bg-warning/20 text-warning-foreground border-warning';
  return 'bg-destructive/20 text-destructive-foreground border-destructive';
};


export default function SupplierDetailPage() {
  const params = useParams();
  const router = useRouter();
  const supplierId = typeof params.id === 'string' ? params.id : null;
  const { data: supplier, isLoading, isError, error } = useSupplier(supplierId);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-1/4" />
        <Card>
          <CardHeader className="flex-row items-center gap-4"><Skeleton className="h-24 w-24 rounded-full" /><div className="space-y-2 flex-1"><Skeleton className="h-8 w-3/4" /><Skeleton className="h-6 w-1/2" /></div></CardHeader>
          <CardContent className="space-y-2"><Skeleton className="h-5 w-full" /><Skeleton className="h-5 w-5/6" /></CardContent>
        </Card>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">{Array.from({length: 4}).map((_,i) => <Skeleton key={i} className="h-32 rounded-lg" />)}</div>
        <Card><CardContent><Skeleton className="h-64 w-full" /></CardContent></Card>
      </div>
    );
  }

  if (isError || !supplier) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-4">
        <AlertTriangle className="w-16 h-16 text-destructive mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Supplier Not Found</h2>
        <p className="text-muted-foreground mb-4">{error?.message || "Could not load supplier details."}</p>
        <Button onClick={() => router.push('/suppliers')}>Back to Suppliers</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Button variant="outline" onClick={() => router.back()} className="self-start">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back
      </Button>

      <Card className="shadow-xl">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20 border-2 border-primary"><AvatarImage src={supplier.logoUrl || undefined} alt={supplier.name} data-ai-hint="company logo" /><AvatarFallback>{supplier.name.substring(0, 2).toUpperCase()}</AvatarFallback></Avatar>
            <div>
              <CardTitle className="text-3xl font-headline">{supplier.name}</CardTitle>
              <CardDescription className="text-sm">{supplier.email} {supplier.phone && `| ${supplier.phone}`}</CardDescription>
              {supplier.address && <p className="text-xs text-muted-foreground mt-1">{`${supplier.address.street || ''} ${supplier.address.city || ''}`.trim()}</p>}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
             <div className={cn("px-3 py-1.5 rounded-md text-sm font-semibold border", getReliabilityColor(supplier.reliabilityScore))}>Reliability: {supplier.reliabilityScore ?? 'N/A'} / 100</div>
             <Button variant="outline" size="sm" disabled> <Edit className="mr-2 h-4 w-4" /> Edit Supplier (Soon)</Button>
          </div>
        </CardHeader>
        <Separator className="my-2"/>
        <CardContent className="pt-6">
            <h3 className="text-lg font-semibold mb-4 text-foreground">Performance Metrics</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <Card className="bg-secondary/30"><CardHeader className="flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">On-Time Delivery</CardTitle><CheckCircle className="h-4 w-4 text-muted-foreground"/></CardHeader><CardContent><div className="text-2xl font-bold">{supplier.onTimeDeliveryRate !== undefined ? `${(supplier.onTimeDeliveryRate * 100).toFixed(0)}%` : 'N/A'}</div></CardContent></Card>
                <Card className="bg-secondary/30"><CardHeader className="flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Avg. Lead Time</CardTitle><Clock className="h-4 w-4 text-muted-foreground"/></CardHeader><CardContent><div className="text-2xl font-bold">{supplier.leadTimeDays ?? 'N/A'} days</div></CardContent></Card>
                <Card className="bg-secondary/30"><CardHeader className="flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Total Orders</CardTitle><ShoppingCart className="h-4 w-4 text-muted-foreground"/></CardHeader><CardContent><div className="text-2xl font-bold">_</div><p className="text-xs text-muted-foreground">Pending</p></CardContent></Card>
                <Card className="bg-secondary/30"><CardHeader className="flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Total Spend</CardTitle><DollarSign className="h-4 w-4 text-muted-foreground"/></CardHeader><CardContent><div className="text-2xl font-bold">${supplier.totalSpend?.toLocaleString() ?? '_'}</div><p className="text-xs text-muted-foreground">Pending</p></CardContent></Card>
            </div>

            <h3 className="text-lg font-semibold mb-4 text-foreground">Products Supplied</h3>
            {supplier.productsSupplied && supplier.productsSupplied.length > 0 ? (
            <Card><CardContent className="pt-4"><div className="overflow-x-auto rounded-md border"><Table><TableHeader><TableRow><TableHead>SKU</TableHead><TableHead>Product Name</TableHead><TableHead className="text-right">Last Price</TableHead><TableHead className="text-right">MOQ</TableHead></TableRow></TableHeader><TableBody>{supplier.productsSupplied.map((product) => (<TableRow key={product.productId}><TableCell className="font-medium">{product.sku}</TableCell><TableCell>{product.name}</TableCell><TableCell className="text-right">${product.lastPrice?.toFixed(2) ?? 'N/A'}</TableCell><TableCell className="text-right">{product.moqForItem ?? 'N/A'}</TableCell></TableRow>))}</TableBody></Table></div></CardContent></Card>
            ) : (<p className="text-muted-foreground">No specific products listed for this supplier.</p>)}
            
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                <div>
                    <h3 className="text-lg font-semibold mb-4 text-foreground">Performance Chart</h3>
                     <Card>
                        <CardContent className="pt-6 min-h-[250px] flex items-center justify-center">
                           <div className="text-center text-muted-foreground">
                                <LineChart className="h-12 w-12 mx-auto mb-2 text-primary/50"/>
                                <p className="font-semibold">Interactive Performance Chart (Soon)</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
                 <div className="mt-6 md:mt-0">
                    <h4 className="text-lg font-semibold mb-2">Notes:</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{supplier.notes || "No notes for this supplier."}</p>
                </div>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
