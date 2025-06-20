
"use client";

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, AlertTriangle, Users, Compare } from 'lucide-react';
import type { SupplierDocument } from '@/lib/types/firestore';
import { useSuppliers } from '@/hooks/useSuppliers';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { useAuth } from '@/hooks/useAuth';

const useCompareSuppliersData = (ids: string[], token: string | null) => {
  const [data, setData] = useState<SupplierDocument[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (ids.length < 2 || !token) {
      setData(null);
      return;
    }
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/suppliers/compare?ids=${ids.join(',')}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
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
  }, [ids.join(','), token]);

  return { data, isLoading, error };
};


export default function SupplierComparisonPage() {
  const [selectedSupplierIds, setSelectedSupplierIds] = useState<string[]>([]);
  const { data: allSuppliersData, isLoading: isLoadingAllSuppliers } = useSuppliers();
  const { token } = useAuth();
  const allSuppliersList = useMemo(() => allSuppliersData?.pages.flatMap(page => page.data) ?? [], [allSuppliersData]);
  
  const { data: comparisonData, isLoading: isLoadingComparison, error: comparisonError } = useCompareSuppliersData(selectedSupplierIds, token);
  const { toast } = useToast();

  const handleSelectSupplier = (index: number, supplierId: string) => {
    const newSelection = [...selectedSupplierIds];
    if (supplierId === "none") {
      newSelection[index] = "";
    } else {
       newSelection[index] = supplierId;
    }
    setSelectedSupplierIds(newSelection.filter(id => id));
  };
  
  const renderComparisonValue = (value: any, isBest?: boolean) => {
    if (value === undefined || value === null) return <span className="text-muted-foreground">N/A</span>;
    let className = "";
    if (isBest) {
        className = "text-success font-semibold";
    }
    return <span className={className}>{typeof value === 'number' ? value.toLocaleString() : value}</span>;
  };

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

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-headline font-semibold text-foreground">Compare Suppliers</h1>
      
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline flex items-center"><Users className="mr-2 h-5 w-5 text-primary"/>Select Suppliers to Compare</CardTitle>
          <CardDescription>Choose up to 3 suppliers to see a side-by-side comparison.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingAllSuppliers ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[0, 1, 2].map(index => (
                <Select key={index} onValueChange={(value) => handleSelectSupplier(index, value)} value={selectedSupplierIds[index] || "none"} disabled={allSuppliersList.length === 0}>
                  <SelectTrigger><SelectValue placeholder={`Select Supplier ${index + 1}`} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {allSuppliersList.map(supplier => (
                      <SelectItem key={supplier.id} value={supplier.id} disabled={selectedSupplierIds.includes(supplier.id) && selectedSupplierIds[index] !== supplier.id}>{supplier.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ))}
            </div>
          )}
           {allSuppliersList.length === 0 && !isLoadingAllSuppliers && <p className="text-muted-foreground mt-2">No suppliers available to compare. Please add suppliers first.</p>}
        </CardContent>
      </Card>

      {isLoadingComparison && (<div className="flex justify-center items-center py-12"><Loader2 className="h-12 w-12 animate-spin text-primary" /><p className="ml-4 text-lg text-muted-foreground">Loading comparison data...</p></div>)}
      {comparisonError && (<Card className="border-destructive bg-destructive/10"><CardHeader><CardTitle className="text-destructive flex items-center"><AlertTriangle className="mr-2"/>Error</CardTitle></CardHeader><CardContent><p className="text-destructive-foreground">{comparisonError.message}</p></CardContent></Card>)}

      {comparisonData && comparisonData.length > 0 && (
        <Card className="shadow-xl mt-6">
          <CardHeader><CardTitle className="font-headline flex items-center"><Compare className="mr-2 h-5 w-5 text-primary"/>Comparison Results</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead className="w-[200px]">Metric</TableHead>{comparisonData.map(supplier => (<TableHead key={supplier.id} className="text-center"><div className="flex flex-col items-center gap-1"><Image src={supplier.logoUrl || "https://placehold.co/40x40.png"} alt={supplier.name} width={32} height={32} className="rounded-full" data-ai-hint="company logo"/>{supplier.name}</div></TableHead>))}</TableRow></TableHeader><TableBody><TableRow><TableCell className="font-medium">Lead Time (Days)</TableCell>{comparisonData.map(s => <TableCell key={s.id} className="text-center">{renderComparisonValue(s.leadTimeDays, s.id === bestLeadTimeSupplierId)}</TableCell>)}</TableRow><TableRow><TableCell className="font-medium">Reliability Score</TableCell>{comparisonData.map(s => <TableCell key={s.id} className="text-center">{renderComparisonValue(s.reliabilityScore, s.id === bestReliabilityScoreSupplierId)}</TableCell>)}</TableRow><TableRow><TableCell className="font-medium">Payment Terms</TableCell>{comparisonData.map(s => <TableCell key={s.id} className="text-center">{renderComparisonValue(s.paymentTerms)}</TableCell>)}</TableRow><TableRow><TableCell className="font-medium">MOQ (General)</TableCell>{comparisonData.map(s => <TableCell key={s.id} className="text-center">{renderComparisonValue(s.moq)}</TableCell>)}</TableRow></TableBody></Table></div>
            <p className="text-xs text-muted-foreground mt-4">* Highlighted values indicate potentially better options.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
