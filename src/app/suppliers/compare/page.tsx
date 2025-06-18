
"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, AlertTriangle, Users, Compare } from 'lucide-react';
import type { SupplierDocument } from '@/lib/types/firestore';
import { useSuppliers } from '@/hooks/useSuppliers'; // To get list of all suppliers for selection
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';

// Mock hook for fetching comparison data - replace with actual API call
const useCompareSuppliersData = (ids: string[]) => {
  const [data, setData] = useState<SupplierDocument[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (ids.length < 2) {
      setData(null);
      return;
    }
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/suppliers/compare?ids=${ids.join(',')}`);
        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || 'Failed to fetch comparison data');
        }
        const result = await response.json();
        setData(result.data);
      } catch (e: any) {
        setError(e);
        setData(null);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [ids.join(',')]); // Re-fetch if IDs string changes

  return { data, isLoading, error };
};


export default function SupplierComparisonPage() {
  const [selectedSupplierIds, setSelectedSupplierIds] = useState<string[]>([]);
  const { data: allSuppliersData, isLoading: isLoadingAllSuppliers } = useSuppliers();
  const allSuppliersList = useMemo(() => allSuppliersData?.pages.flatMap(page => page.data) ?? [], [allSuppliersData]);
  
  const { data: comparisonData, isLoading: isLoadingComparison, error: comparisonError } = useCompareSuppliersData(selectedSupplierIds);
  const { toast } = useToast();

  const handleSelectSupplier = (index: number, supplierId: string) => {
    const newSelection = [...selectedSupplierIds];
    if (supplierId === "none") { // "None" option to clear selection
      newSelection[index] = ""; // Use empty string or undefined to mark as unselected
    } else {
       newSelection[index] = supplierId;
    }
    // Filter out empty strings before setting state to ensure correct comparison logic
    setSelectedSupplierIds(newSelection.filter(id => id));
  };
  
  const renderComparisonValue = (value: any, isBest?: boolean, higherIsBetter: boolean = false) => {
    if (value === undefined || value === null) return <span className="text-muted-foreground">N/A</span>;
    let className = "";
    if (isBest) {
        className = higherIsBetter ? "text-success font-semibold" : "text-success font-semibold"; // Could adjust for lowerIsBetter
    }
    return <span className={className}>{typeof value === 'number' ? value.toLocaleString() : value}</span>;
  };

  // Simplified best value identification (assumes lower is better for cost/lead time, higher for score)
  const findBest = (key: keyof SupplierDocument, higherIsBetter: boolean = false) => {
    if (!comparisonData || comparisonData.length === 0) return null;
    let bestValue: number | undefined = higherIsBetter ? -Infinity : Infinity;
    let bestSupplierId: string | null = null;

    comparisonData.forEach(s => {
      const val = s[key] as number | undefined;
      if (val !== undefined) {
        if (higherIsBetter ? val > (bestValue as number) : val < (bestValue as number)) {
          bestValue = val;
          bestSupplierId = s.id;
        }
      }
    });
    return bestSupplierId;
  };
  
  const bestLeadTimeSupplierId = findBest('leadTimeDays', false);
  const bestReliabilityScoreSupplierId = findBest('reliabilityScore', true);
  // Add more for MOQ, specific product prices if available

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-headline font-semibold text-foreground">Compare Suppliers</h1>
      
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline flex items-center"><Users className="mr-2 h-5 w-5 text-primary"/>Select Suppliers to Compare</CardTitle>
          <CardDescription>Choose 2 or 3 suppliers from the list to see a side-by-side comparison.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingAllSuppliers ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[0, 1, 2].map(index => (
                <Select
                  key={index}
                  onValueChange={(value) => handleSelectSupplier(index, value)}
                  value={selectedSupplierIds[index] || "none"}
                  disabled={allSuppliersList.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={`Select Supplier ${index + 1}`} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {allSuppliersList.map(supplier => (
                      <SelectItem 
                        key={supplier.id} 
                        value={supplier.id}
                        disabled={selectedSupplierIds.includes(supplier.id) && selectedSupplierIds[index] !== supplier.id}
                      >
                        {supplier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ))}
            </div>
          )}
           {allSuppliersList.length === 0 && !isLoadingAllSuppliers && <p className="text-muted-foreground mt-2">No suppliers available to compare. Please add suppliers first.</p>}
        </CardContent>
      </Card>

      {isLoadingComparison && (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="ml-4 text-lg text-muted-foreground">Loading comparison data...</p>
        </div>
      )}

      {comparisonError && (
        <Card className="border-destructive bg-destructive/10">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center"><AlertTriangle className="mr-2"/>Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-destructive-foreground">{comparisonError.message}</p>
          </CardContent>
        </Card>
      )}

      {comparisonData && comparisonData.length > 0 && (
        <Card className="shadow-xl mt-6">
          <CardHeader>
            <CardTitle className="font-headline flex items-center"><Compare className="mr-2 h-5 w-5 text-primary"/>Comparison Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Metric</TableHead>
                  {comparisonData.map(supplier => (
                    <TableHead key={supplier.id} className="text-center">
                        <div className="flex flex-col items-center gap-1">
                            <Image 
                                src={supplier.logoUrl || "https://placehold.co/40x40.png"} 
                                alt={supplier.name}
                                width={32} height={32} className="rounded-full"
                                data-ai-hint="company logo"
                            />
                            {supplier.name}
                        </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">Lead Time (Days)</TableCell>
                  {comparisonData.map(s => <TableCell key={s.id} className="text-center">{renderComparisonValue(s.leadTimeDays, s.id === bestLeadTimeSupplierId, false)}</TableCell>)}
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Reliability Score</TableCell>
                  {comparisonData.map(s => <TableCell key={s.id} className="text-center">{renderComparisonValue(s.reliabilityScore, s.id === bestReliabilityScoreSupplierId, true)}</TableCell>)}
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Payment Terms</TableCell>
                  {comparisonData.map(s => <TableCell key={s.id} className="text-center">{renderComparisonValue(s.paymentTerms)}</TableCell>)}
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">MOQ (General)</TableCell>
                  {comparisonData.map(s => <TableCell key={s.id} className="text-center">{renderComparisonValue(s.moq)}</TableCell>)}
                </TableRow>
                {/* Add more rows for common products if applicable */}
                {/* Example for a common product price (requires productsSupplied to have SKU_COMMON) */}
                <TableRow>
                    <TableCell className="font-medium">Price (SKU_COMMON)</TableCell>
                    {comparisonData.map(s => {
                        const product = s.productsSupplied?.find(p => p.sku === "SKU_COMMON");
                        // This is a simplified best value check for price, assuming lower is better
                        const allPrices = comparisonData.map(sup => sup.productsSupplied?.find(p=>p.sku === "SKU_COMMON")?.lastPrice).filter(p => p !== undefined) as number[];
                        const bestPrice = allPrices.length > 0 ? Math.min(...allPrices) : undefined;
                        return <TableCell key={s.id} className="text-center">{renderComparisonValue(product?.lastPrice, product?.lastPrice === bestPrice, false)}</TableCell>
                    })}
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Actions</TableCell>
                  {comparisonData.map(supplier => (
                    <TableCell key={supplier.id} className="text-center">
                      <Button variant="outline" size="sm" onClick={() => toast({title: "Action: Switch Supplier", description:`Logic for switching to ${supplier.name} not yet implemented.`})}>
                        Switch to this Supplier
                      </Button>
                    </TableCell>
                  ))}
                </TableRow>
              </TableBody>
            </Table>
            </div>
            <p className="text-xs text-muted-foreground mt-4">* Highlighted values indicate potentially better options (green for best). This is a simplified representation.</p>
          </CardContent>
        </Card>
      )}
      {selectedSupplierIds.length >=2 && !isLoadingComparison && !comparisonData && !comparisonError && (
        <div className="text-center py-12 text-muted-foreground">
            <p>No comparison data loaded. This might happen if selected suppliers were not found.</p>
        </div>
      )}
    </div>
  );
}
