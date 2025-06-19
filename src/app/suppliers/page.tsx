
"use client";

import { useState, useMemo, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PlusCircle, Search, Filter, MoreHorizontal, Edit, FileText, Eye, Loader2, AlertTriangle, Users, Link as LinkIcon } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useSuppliers } from '@/hooks/useSuppliers';
import type { SupplierDocument } from '@/lib/types/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { SupplierFormModal } from '@/components/suppliers/SupplierFormModal';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const getReliabilityColor = (score?: number): string => {
  if (score === undefined) return 'text-muted-foreground';
  if (score >= 85) return 'text-success';
  if (score >= 65) return 'text-warning';
  return 'text-destructive';
};

const ReliabilityDisplay = ({ score }: { score?: number }) => {
  if (score === undefined) return <span className="text-sm text-muted-foreground">N/A</span>;
  return (
    <span className={cn("font-semibold", getReliabilityColor(score))}>
      {score}/100
    </span>
  );
};

const debounce = <F extends (...args: any[]) => any>(func: F, waitFor: number) => {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<F>): Promise<ReturnType<F>> =>
    new Promise(resolve => {
      if (timeout) {
        clearTimeout(timeout);
      }
      timeout = setTimeout(() => resolve(func(...args)), waitFor);
    });
};

export default function SuppliersPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [filterReliability, setFilterReliability] = useState('all');
  const [filterLeadTime, setFilterLeadTime] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<SupplierDocument | null>(null);

  const { toast } = useToast();

  const debouncedSetSearchTerm = useCallback(debounce(setDebouncedSearchTerm, 500), []);

  useEffect(() => {
    debouncedSetSearchTerm(searchTerm);
  }, [searchTerm, debouncedSetSearchTerm]);

  const supplierFilters = useMemo(() => ({
    searchTerm: debouncedSearchTerm,
    reliability: filterReliability !== 'all' ? filterReliability : undefined,
    leadTime: filterLeadTime !== 'all' ? filterLeadTime : undefined,
  }), [debouncedSearchTerm, filterReliability, filterLeadTime]);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
  } = useSuppliers(supplierFilters);

  const allSuppliers = useMemo(() => data?.pages.flatMap(page => page.data) ?? [], [data]);

  const handleOpenModal = (supplier: SupplierDocument | null = null) => {
    setEditingSupplier(supplier);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingSupplier(null);
  };

  if (isError && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <AlertTriangle className="w-16 h-16 text-destructive mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Error Loading Suppliers</h2>
        <p className="text-muted-foreground mb-4">{error?.message || "An unexpected error occurred."}</p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-headline font-semibold text-foreground">Supplier Management</h1>
          <p className="text-muted-foreground">Browse, add, and manage your suppliers.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
              <Link href="/suppliers/compare"><LinkIcon className="mr-2 h-4 w-4" /> Compare Suppliers</Link>
          </Button>
          <Button onClick={() => handleOpenModal()} className="bg-accent hover:bg-accent/90 text-accent-foreground">
            <PlusCircle className="mr-2 h-4 w-4" /> Add Supplier
          </Button>
        </div>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle className="font-headline text-xl flex items-center"><Users className="mr-2 h-5 w-5 text-primary" />Supplier List</CardTitle>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <div className="relative w-full sm:w-auto">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search by name..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 max-w-xs w-full sm:w-auto"
                />
              </div>
              <Select value={filterReliability} onValueChange={setFilterReliability}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Reliability" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Reliability</SelectItem>
                  <SelectItem value="85-100">High (85+)</SelectItem>
                  <SelectItem value="65-84">Medium (65-84)</SelectItem>
                  <SelectItem value="0-64">Low (0-64)</SelectItem>
                </SelectContent>
              </Select>
               <Select value={filterLeadTime} onValueChange={setFilterLeadTime}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Lead Time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Lead Times</SelectItem>
                  <SelectItem value="0-7">Short (0-7 days)</SelectItem>
                  <SelectItem value="8-14">Medium (8-14 days)</SelectItem>
                  <SelectItem value="15+">Long (15+ days)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading && !data?.pages.length ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={`skeleton-${i}`} className="flex flex-col">
                  <CardHeader className="flex-row gap-4 items-center">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm flex-grow">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                    <Skeleton className="h-4 w-full" />
                  </CardContent>
                  <CardFooter className="gap-2">
                    <Skeleton className="h-9 w-1/2" />
                    <Skeleton className="h-9 w-1/2" />
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : allSuppliers.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {allSuppliers.map((supplier) => (
                <Card key={supplier.id} className="flex flex-col shadow-md hover:shadow-xl transition-shadow duration-200">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                     <div className="flex items-center gap-3">
                        <Image 
                            src={supplier.logoUrl || `https://placehold.co/60x60.png?text=${supplier.name.substring(0,2)}`} 
                            alt={`${supplier.name} logo`}
                            width={48} 
                            height={48} 
                            className="rounded-full border bg-muted object-cover"
                            data-ai-hint="company logo"
                            onError={(e) => { e.currentTarget.src = `https://placehold.co/60x60.png?text=${supplier.name.substring(0,2)}`; }}
                        />
                        <CardTitle className="font-headline text-lg line-clamp-2">{supplier.name}</CardTitle>
                     </div>
                     <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild><Link href={`/suppliers/${supplier.id}`}>View Details</Link></DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleOpenModal(supplier)}>Edit Supplier</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => toast({title: "Create PO Clicked", description: `Creating PO for ${supplier.name}`})}>Create PO</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                  </CardHeader>
                  <CardContent className="flex-grow space-y-1.5 text-sm">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Reliability:</span>
                        <ReliabilityDisplay score={supplier.reliabilityScore} />
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Lead Time:</span>
                        <span>{supplier.leadTimeDays ?? 'N/A'} days</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Products:</span>
                        <span>{supplier.productsSupplied?.length || 0}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Last Order:</span>
                        <span>{supplier.lastOrderDate ? new Date(supplier.lastOrderDate as any).toLocaleDateString() : 'N/A'}</span>
                    </div>
                    {supplier.email && <p className="text-xs text-muted-foreground truncate pt-1">Email: {supplier.email}</p>}
                  </CardContent>
                  <CardFooter className="gap-2 pt-4">
                    <Button variant="outline" size="sm" className="w-full" asChild><Link href={`/suppliers/${supplier.id}`}><Eye className="mr-2 h-4 w-4"/>View</Link></Button>
                    <Button variant="secondary" size="sm" className="w-full" onClick={() => handleOpenModal(supplier)}><Edit className="mr-2 h-4 w-4"/>Edit</Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Suppliers Found</h3>
              <p className="text-muted-foreground mb-4">Try adjusting your search or filters, or add a new supplier.</p>
              <Button onClick={() => handleOpenModal()} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                <PlusCircle className="mr-2 h-4 w-4" /> Add Your First Supplier
              </Button>
            </div>
          )}
          {hasNextPage && (
            <div className="mt-8 flex justify-center">
              <Button
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage || !hasNextPage}
                variant="outline"
              >
                {isFetchingNextPage ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Load More Suppliers
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {isModalOpen && (
        <SupplierFormModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          supplier={editingSupplier}
        />
      )}
    </div>
  );
}
