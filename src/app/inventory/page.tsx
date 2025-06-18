
"use client";
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label"; // Added missing import
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { FileDown, Filter, MoreHorizontal, PlusCircle, Trash2, Edit3, UploadCloud, Loader2, Search, Package, TrendingDown, BarChartHorizontal, AlertCircle, Palette } from 'lucide-react';
import type { InventoryItemDocument } from '@/lib/types/firestore';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useInventory, useUpdateInventoryItem } from '@/hooks/useInventory';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';
import { Progress } from '@/components/ui/progress';

const calculateStockValue = (item: InventoryItemDocument) => item.quantity * item.unitCost;

const getStatus = (item: InventoryItemDocument): 'In Stock' | 'Low Stock' | 'Out of Stock' | 'Overstocked' => {
  // Assuming 'overstocked' means quantity > reorderPoint * 2 (example threshold)
  if (item.quantity > item.reorderPoint * 2.5 && item.reorderPoint > 0) return 'Overstocked';
  if (item.quantity <= 0) return 'Out of Stock';
  if (item.quantity <= item.reorderPoint) return 'Low Stock';
  return 'In Stock';
};

const getStatusColor = (status: 'In Stock' | 'Low Stock' | 'Out of Stock' | 'Overstocked') => {
  switch (status) {
    case 'In Stock': return 'bg-success';
    case 'Low Stock': return 'bg-warning';
    case 'Out of Stock': return 'bg-destructive';
    case 'Overstocked': return 'bg-sky-500'; // A blue for overstocked
    default: return 'bg-muted';
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
  const [filterStockHealth, setFilterStockHealth] = useState('all');

  const { toast } = useToast();

  const inventoryFilters = useMemo(() => ({
    searchTerm: debouncedSearchTerm,
    category: filterCategory,
    // Note: stock health filter would need to be applied client-side or API needs to support it
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

  const updateItemMutation = useUpdateInventoryItem(); // Kept for potential future use (e.g. quick edit on card)

  const debouncedSetSearchTerm = useCallback(debounce(setDebouncedSearchTerm, 300), []);

  useEffect(() => {
    debouncedSetSearchTerm(searchTerm);
  }, [searchTerm, debouncedSetSearchTerm]);

  const allItems = useMemo(() => {
    let items = data?.pages.flatMap(page => page.data) ?? [];
    if (filterStockHealth !== 'all') {
      items = items.filter(item => {
        const status = getStatus(item);
        if (filterStockHealth === 'critical' && (status === 'Out of Stock' || status === 'Low Stock')) return true;
        if (filterStockHealth === 'healthy' && status === 'In Stock') return true;
        if (filterStockHealth === 'overstocked' && status === 'Overstocked') return true;
        return false;
      });
    }
    return items;
  }, [data, filterStockHealth]);
  
  const categories = useMemo(() => {
    const uniqueCategories = new Set(data?.pages.flatMap(page => page.data).map(item => item.category).filter(Boolean) as string[]);
    return Array.from(uniqueCategories);
  }, [data]);

  if (isError && !isLoading) { // Ensure error is shown only if not initially loading
    return <div className="text-destructive-foreground bg-destructive p-4 rounded-md">Error loading inventory: {error?.message}</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-headline font-semibold text-foreground">Inventory Management</h1>
          <p className="text-muted-foreground">Visually manage and track your product stock.</p>
        </div>
        <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/data-import"><UploadCloud className="mr-2 h-4 w-4" /> Upload Data</Link>
            </Button>
            <Button className="bg-accent hover:bg-accent/90 text-accent-foreground" onClick={() => toast({ title: "Add Product Clicked", description: "Product creation wizard would appear here."})}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add Product
            </Button>
        </div>
      </div>

    <div className="flex flex-col md:flex-row gap-6">
        {/* Filters Sidebar Placeholder */}
        <Card className="w-full md:w-1/4 lg:w-1/5 shadow-lg md:sticky md:top-20 md:self-start h-fit">
            <CardHeader>
                <CardTitle className="font-headline text-lg flex items-center"><Filter className="mr-2 h-5 w-5 text-primary"/>Filters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div>
                    <Label htmlFor="search-inventory" className="text-sm font-medium">Search</Label>
                    <div className="relative mt-1">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input 
                        id="search-inventory"
                        placeholder="SKU or Name..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8"
                        />
                    </div>
                </div>
                 <div>
                    <Label htmlFor="filter-category" className="text-sm font-medium">Category</Label>
                    <Select value={filterCategory} onValueChange={setFilterCategory}>
                        <SelectTrigger id="filter-category" className="mt-1">
                            <Palette className="mr-2 h-4 w-4 text-muted-foreground" />
                            <SelectValue placeholder="All Categories" />
                        </SelectTrigger>
                        <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {categories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                 <div>
                    <Label htmlFor="filter-stock-health" className="text-sm font-medium">Stock Health</Label>
                    <Select value={filterStockHealth} onValueChange={setFilterStockHealth}>
                        <SelectTrigger id="filter-stock-health" className="mt-1">
                            <AlertCircle className="mr-2 h-4 w-4 text-muted-foreground" />
                            <SelectValue placeholder="All Stock Health" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Stock Health</SelectItem>
                            <SelectItem value="critical">Needs Attention (Low/Out)</SelectItem>
                            <SelectItem value="healthy">Healthy Stock</SelectItem>
                            <SelectItem value="overstocked">Overstocked</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div>
                    <Label className="text-sm font-medium">Smart Filters (Soon)</Label>
                    <div className="space-y-1 mt-1">
                        <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground" disabled>Best Sellers</Button>
                        <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground" disabled>Dead Stock</Button>
                    </div>
                </div>
                <div>
                    <Label className="text-sm font-medium">Price Range (Soon)</Label>
                    <div className="h-10 mt-1 bg-muted rounded-md flex items-center justify-center text-xs text-muted-foreground">Slider Placeholder</div>
                </div>
            </CardContent>
        </Card>

        {/* Main Content Area */}
        <div className="flex-1 space-y-6">
            {/* Bulk Actions Toolbar Placeholder */}
            <Card className="shadow-md">
                <CardHeader>
                    <CardTitle className="font-headline text-lg">Bulk Actions</CardTitle>
                    <CardDescription>Smart suggestions and batch operations (coming soon).</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2 items-center">
                    <Button variant="outline" size="sm" onClick={() => toast({ title: "Export Clicked", description: "Selected items would be exported."})}>
                        <FileDown className="mr-2 h-4 w-4" /> Export Selected
                    </Button>
                    <Button variant="outline" size="sm" className="text-destructive hover:text-destructive-foreground hover:bg-destructive/90 border-destructive/50 hover:border-destructive" onClick={() => toast({ title: "Delete Clicked", description: "Selected items would be deleted."})}>
                        <Trash2 className="mr-2 h-4 w-4" /> Delete Selected
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => toast({ title: "Bulk Edit Clicked", description: "Bulk edit modal would appear."})}>
                        <Edit3 className="mr-2 h-4 w-4" /> Bulk Edit
                    </Button>
                    <p className="text-sm text-primary ml-auto">✨ Smart Suggestion: 5 items need reordering (Placeholder)</p>
                </CardContent>
            </Card>

            {/* Smart Inventory Cards View */}
            {isLoading && !data ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <Card key={`skeleton-card-${i}`} className="shadow-md">
                            <CardHeader className="p-4">
                                <Skeleton className="h-32 w-full rounded-md" />
                                <Skeleton className="h-6 w-3/4 mt-3" />
                                <Skeleton className="h-4 w-1/2 mt-1" />
                            </CardHeader>
                            <CardContent className="p-4 space-y-2">
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-5/6" />
                                <Skeleton className="h-8 w-full mt-2" />
                            </CardContent>
                            <CardFooter className="p-4">
                                <Skeleton className="h-9 w-full" />
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            ) : allItems.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {allItems.map((item) => {
                        const status = getStatus(item);
                        const stockPercentage = item.reorderPoint > 0 ? Math.min((item.quantity / (item.reorderPoint * 1.5)) * 100, 100) : item.quantity > 0 ? 100 : 0; // Example percentage, max 100
                        return (
                            <Card key={item.id} className="flex flex-col shadow-lg hover:shadow-xl transition-shadow duration-200 border relative overflow-hidden">
                                <div className={cn("absolute top-0 left-0 h-1.5 w-full", getStatusColor(status))}></div>
                                <CardHeader className="p-4 pt-6"> {/* Added pt-6 for space from status bar */}
                                    <div className="aspect-square w-full bg-muted rounded-md flex items-center justify-center mb-3">
                                        <Image 
                                            src={item.imageUrl || `https://placehold.co/300x300.png?text=${item.name.substring(0,10)}`} 
                                            alt={item.name}
                                            width={150} 
                                            height={150}
                                            data-ai-hint="product photo" // Generalized hint
                                            className="object-contain h-32 w-32 rounded" // Ensure image fits
                                        />
                                    </div>
                                    <CardTitle className="font-headline text-base line-clamp-2 h-[2.5em]">{item.name}</CardTitle>
                                    <CardDescription className="text-xs">{item.sku} {item.category && `| ${item.category}`}</CardDescription>
                                </CardHeader>
                                <CardContent className="p-4 space-y-3 flex-grow">
                                    <div>
                                        <div className="flex justify-between text-xs mb-1">
                                            <span className="text-muted-foreground">Stock Level:</span>
                                            <span className="font-medium">{item.quantity} units</span>
                                        </div>
                                        <Progress value={stockPercentage} className="h-2" />
                                        {status !== "In Stock" && <p className={cn("text-xs font-medium mt-1", getStatusColor(status).replace("bg-","text-"))}>{status}</p>}
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Days to Stockout: <span className="font-medium text-foreground">~N/A days</span> (AI Prediction)
                                    </p>
                                    <div className="h-10 bg-muted/50 rounded flex items-center justify-center text-xs text-muted-foreground">
                                        7-Day Sales Sparkline (Placeholder)
                                    </div>
                                </CardContent>
                                <CardFooter className="p-4 border-t mt-auto">
                                    <Button size="sm" className="w-full bg-primary hover:bg-primary/90" onClick={() => toast({title: "Reorder Clicked", description: `Reordering ${item.name}`})}>
                                        <Package className="mr-2 h-4 w-4" /> Reorder
                                    </Button>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="sm" className="ml-2 px-2">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => toast({ title: "View Details", description: `Viewing ${item.name}`})}>View Details</DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => toast({ title: "Edit Product", description: `Editing ${item.name}`})}>Edit Product</DropdownMenuItem>
                                            <DropdownMenuItem className="text-destructive focus:text-destructive-foreground focus:bg-destructive/90" onClick={() => toast({ title: "Delete Product", description: `Deleting ${item.name}`})}>Delete Product</DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </CardFooter>
                            </Card>
                        );
                    })}
                </div>
            ) : (
                <Card className="col-span-full">
                    <CardContent className="h-60 text-center flex flex-col justify-center items-center">
                         <BarChartHorizontal className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-xl font-semibold mb-2">No Inventory Items Found</h3>
                        <p className="text-muted-foreground">Try adjusting your search or filters, or upload new inventory data.</p>
                    </CardContent>
                </Card>
            )}
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
        </div>
    </div>
    </div>
  );
}


    
