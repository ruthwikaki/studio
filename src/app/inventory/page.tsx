
"use client";
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { FileDown, Filter, MoreHorizontal, PlusCircle, Trash2, Edit3, UploadCloud } from 'lucide-react';
import type { InventoryItem } from '@/lib/types';
import { MOCK_INVENTORY_DATA } from '@/lib/constants'; // Using mock data
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';

const calculateStockValue = (item: InventoryItem) => item.quantity * item.unitCost;

const getStatusBadgeVariant = (status: InventoryItem['status']) => {
  switch (status) {
    case 'In Stock': return 'bg-success/20 text-success-foreground border-success/30';
    case 'Low Stock': return 'bg-warning/20 text-warning-foreground border-warning/30';
    case 'Out of Stock': return 'bg-destructive/20 text-destructive-foreground border-destructive/30';
    default: return 'bg-muted text-muted-foreground';
  }
};


export default function InventoryPage() {
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>(MOCK_INVENTORY_DATA.map(item => ({
    ...item,
    status: item.quantity <= item.reorderPoint ? (item.quantity === 0 ? 'Out of Stock' : 'Low Stock') : 'In Stock'
  })));
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const { toast } = useToast();


  const filteredItems = inventoryItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || item.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || item.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const handleInlineEdit = (itemId: string, field: keyof InventoryItem, value: string | number) => {
    // Placeholder for actual update logic
    toast({
        title: "Inline Edit",
        description: `Field ${String(field)} for item ${itemId} would be updated to ${value}. (Demo only)`,
    });
  };
  
  const categories = Array.from(new Set(MOCK_INVENTORY_DATA.map(item => item.category || "Uncategorized")));


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
            Sortable columns and inline editing for quantity/reorder points are mock implementations.
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
                {filteredItems.length > 0 ? filteredItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.id}</TableCell>
                    <TableCell>{item.name}</TableCell>
                    <TableCell className="text-muted-foreground">{item.category || 'N/A'}</TableCell>
                    <TableCell className="text-right hover:bg-muted/50 cursor-pointer" onClick={() => handleInlineEdit(item.id, 'quantity', item.quantity)}>
                        {item.quantity}
                    </TableCell>
                    <TableCell className="text-right">${item.unitCost.toFixed(2)}</TableCell>
                    <TableCell className="text-right">${calculateStockValue(item).toFixed(2)}</TableCell>
                     <TableCell className="text-right hover:bg-muted/50 cursor-pointer" onClick={() => handleInlineEdit(item.id, 'reorderPoint', item.reorderPoint)}>
                        {item.reorderPoint}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={cn("px-2 py-0.5 text-xs rounded-full border font-medium", getStatusBadgeVariant(item.status))}>
                        {item.status}
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
                )) : (
                  <TableRow>
                    <TableCell colSpan={9} className="h-24 text-center">
                      No inventory items found. Try adjusting your search or filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
