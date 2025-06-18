
"use client";
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { FileDown, Filter, MoreHorizontal, PlusCircle, Trash2, Edit3, UploadCloud, Loader2 } from 'lucide-react';
import type { InventoryItemDocument } from '@/lib/types/firestore';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useInventory, useUpdateInventoryItem } from '@/hooks/useInventory';
import { Skeleton } from '@/components/ui/skeleton';

const calculateStockValue = (item: InventoryItemDocument) => item.quantity * item.unitCost;

const getStatus = (item: InventoryItemDocument): 'In Stock' | 'Low Stock' | 'Out of Stock' => {
  if (item.quantity <= 0) return 'Out of Stock';
  if (item.quantity <= item.reorderPoint) return 'Low Stock';
  return 'In Stock';
};

const getStatusBadgeVariant = (status: 'In Stock' | 'Low Stock' | 'Out of Stock') => {
  switch (status) {
    case 'In Stock': return 'bg-success/20 text-success-foreground border-success/30';
    case 'Low Stock': return 'bg-warning/20 text-warning-foreground border-warning/30';
    case 'Out of Stock': return 'bg-destructive/20 text-destructive-foreground border-destructive/30';
    default: return 'bg-muted text-muted-foreground';
  }
};

// Debounce function
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


export default function InventoryPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [editingCell, setEditingCell] = useState<{ sku: string; field: 'quantity' | 'reorderPoint' } | null>(null);
  const [editValue, setEditValue] = useState<string | number>('');

  const { toast } = useToast();

  const inventoryFilters = useMemo(() => ({
    searchTerm: debouncedSearchTerm,
    category: filterCategory,
    lowStockOnly: false, // Add UI for this if needed
  }), [debouncedSearchTerm, filterCategory]);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
  } = useInventory(inventoryFilters);

  const updateItemMutation = useUpdateInventoryItem();

  const debouncedSetSearchTerm = useCallback(debounce(setDebouncedSearchTerm, 300), []);

  useEffect(() => {
    debouncedSetSearchTerm(searchTerm);
  }, [searchTerm, debouncedSetSearchTerm]);

  const allItems = useMemo(() => data?.pages.flatMap(page => page.data) ?? [], [data]);
  
  // Assuming categories are dynamic and can be extracted from items or a separate API call
  // For now, this is simplified. In a real app, fetch categories separately.
  const categories = useMemo(() => {
    const uniqueCategories = new Set(allItems.map(item => item.category).filter(Boolean) as string[]);
    return Array.from(uniqueCategories);
  }, [allItems]);


  const handleInlineEditStart = (item: InventoryItemDocument, field: 'quantity' | 'reorderPoint') => {
    setEditingCell({ sku: item.sku, field });
    setEditValue(item[field] ?? '');
  };

  const handleInlineEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditValue(e.target.value);
  };

  const handleInlineEditSubmit = async () => {
    if (!editingCell) return;
    const numericValue = parseInt(String(editValue), 10);
    if (isNaN(numericValue) || numericValue < 0) {
      toast({ title: "Invalid Input", description: `${editingCell.field} must be a non-negative number.`, variant: "destructive"});
      return;
    }
    
    try {
      await updateItemMutation.mutateAsync({ sku: editingCell.sku, data: { [editingCell.field]: numericValue } });
      setEditingCell(null);
    } catch (e) {
      // Error is handled by useMutation's onError
    }
  };
  
  if (isError) {
    return <div className="text-destructive-foreground bg-destructive p-4 rounded-md">Error loading inventory: {error?.message}</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-headline font-semibold text-foreground">Inventory Management</h1>
          <p className="text-muted-foreground">View, manage, and track your product stock.</p>
        </div>
        <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/data-import"><UploadCloud className="mr-2 h-4 w-4" /> Upload Data</Link>
            </Button>
            <Button className="bg-accent hover:bg-accent/90 text-accent-foreground" onClick={() => toast({ title: "Add Product Clicked", description: "Product creation form would appear here."})}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add Product
            </Button>
        </div>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle className="font-headline text-xl">Product List</CardTitle>
            <div className="flex gap-2 w-full sm:w-auto">
              <Input 
                placeholder="Search by SKU or Name..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-xs w-full sm:w-auto"
              />
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
           <CardDescription>
            Click on Quantity or Reorder Point cells to edit. Bulk actions are placeholders.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex gap-2">
            <Button variant="outline" size="sm" onClick={() => toast({ title: "Export Clicked", description: "Selected items would be exported."})}>
              <FileDown className="mr-2 h-4 w-4" /> Export Selected
            </Button>
            <Button variant="outline" size="sm" className="text-destructive hover:text-destructive-foreground hover:bg-destructive/90 border-destructive/50 hover:border-destructive" onClick={() => toast({ title: "Delete Clicked", description: "Selected items would be deleted."})}>
              <Trash2 className="mr-2 h-4 w-4" /> Delete Selected
            </Button>
             <Button variant="outline" size="sm" onClick={() => toast({ title: "Bulk Edit Clicked", description: "Bulk edit modal would appear."})}>
                <Edit3 className="mr-2 h-4 w-4" /> Bulk Edit
            </Button>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">SKU</TableHead>
                  <TableHead>Product Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Unit Cost</TableHead>
                  <TableHead className="text-right">Stock Value</TableHead>
                  <TableHead className="text-right">Reorder Point</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && !data ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={`skeleton-${i}`}>
                      <TableCell><Skeleton className="h-5 w-[80px]" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-[150px]" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-[100px]" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-5 w-[50px] ml-auto" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-5 w-[60px] ml-auto" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-5 w-[70px] ml-auto" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-5 w-[50px] ml-auto" /></TableCell>
                      <TableCell className="text-center"><Skeleton className="h-5 w-[80px] mx-auto" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : allItems.length > 0 ? allItems.map((item) => {
                  const status = getStatus(item);
                  return (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.sku}</TableCell>
                    <TableCell>{item.name}</TableCell>
                    <TableCell className="text-muted-foreground">{item.category || 'N/A'}</TableCell>
                    <TableCell 
                      className="text-right hover:bg-muted/50 cursor-pointer" 
                      onClick={() => handleInlineEditStart(item, 'quantity')}
                    >
                      {editingCell?.sku === item.sku && editingCell?.field === 'quantity' ? (
                        <Input
                          type="number"
                          value={editValue}
                          onChange={handleInlineEditChange}
                          onBlur={handleInlineEditSubmit}
                          onKeyDown={(e) => e.key === 'Enter' && handleInlineEditSubmit()}
                          autoFocus
                          className="w-20 text-right h-8"
                          disabled={updateItemMutation.isPending}
                        />
                      ) : (
                        item.quantity
                      )}
                    </TableCell>
                    <TableCell className="text-right">${item.unitCost.toFixed(2)}</TableCell>
                    <TableCell className="text-right">${calculateStockValue(item).toFixed(2)}</TableCell>
                    <TableCell 
                      className="text-right hover:bg-muted/50 cursor-pointer"
                      onClick={() => handleInlineEditStart(item, 'reorderPoint')}
                    >
                       {editingCell?.sku === item.sku && editingCell?.field === 'reorderPoint' ? (
                        <Input
                          type="number"
                          value={editValue}
                          onChange={handleInlineEditChange}
                          onBlur={handleInlineEditSubmit}
                          onKeyDown={(e) => e.key === 'Enter' && handleInlineEditSubmit()}
                          autoFocus
                          className="w-20 text-right h-8"
                           disabled={updateItemMutation.isPending}
                        />
                      ) : (
                        item.reorderPoint
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={cn("px-2 py-0.5 text-xs rounded-full border font-medium", getStatusBadgeVariant(status))}>
                        {status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                    <span className="sr-only">Open menu</span>
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => toast({ title: "Edit Clicked", description: `Editing ${item.name}`})}>Edit Product</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => toast({ title: "View Details Clicked", description: `Viewing details for ${item.name}`})}>View Details</DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive focus:text-destructive-foreground focus:bg-destructive/90" onClick={() => toast({ title: "Delete Clicked", description: `Deleting ${item.name}`})}>Delete Product</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )}) : (
                  <TableRow>
                    <TableCell colSpan={9} className="h-24 text-center">
                      No inventory items found. Try adjusting your search or filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          {hasNextPage && (
            <div className="mt-6 flex justify-center">
              <Button
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage || !hasNextPage}
                variant="outline"
              >
                {isFetchingNextPage ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Load More
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
