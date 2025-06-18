
"use client";

import { useState, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuCheckboxItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import {
  ChevronDown,
  Filter,
  Download,
  BarChart2,
  Settings2,
  Save,
  Mail,
  RefreshCw,
  Edit2,
  GripVertical,
  EyeOff,
  Columns,
  ArrowDownWideNarrow,
  ArrowUpWideNarrow,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  PlusCircle,
  UploadCloud,
  BarChartHorizontalBig,
  ShoppingCart,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
// import ForecastChart from '@/components/analytics/forecasting/ForecastChart'; // Keep if used for new chart, or remove

const mockProducts = [
  { id: "SKU001", sku: "SKU001", name: "Premium T-Shirt", category: "Apparel", currentStock: 100, imageUrl: "https://placehold.co/40x40.png?text=TS", dataAiHint: "tshirt" },
  { id: "SKU002", sku: "SKU002", name: "Wireless Headphones", category: "Electronics", currentStock: 50, imageUrl: "https://placehold.co/40x40.png?text=HP", dataAiHint: "headphones" },
  { id: "SKU003", sku: "SKU003", name: "Running Shoes", category: "Footwear", currentStock: 75, imageUrl: "https://placehold.co/40x40.png?text=RS", dataAiHint: "shoes" },
  { id: "SKU004", sku: "SKU004", name: "Coffee Maker", category: "Home Goods", currentStock: 30, imageUrl: "https://placehold.co/40x40.png?text=CM", dataAiHint: "coffee maker" },
  { id: "SKU005", sku: "SKU005", name: "Yoga Mat", category: "Sports", currentStock: 120, imageUrl: "https://placehold.co/40x40.png?text=YM", dataAiHint: "yoga mat" },
];

const mockForecastData = (base: number) => ({
  movingAverage: { forecast: Math.round(base * 1.1), accuracy: 85 },
  expSmoothing: { forecast: Math.round(base * 1.15), accuracy: 87 },
  seasonal: { forecast: Math.round(base * 1.3), accuracy: 92 },
  aiModel: { forecast: Math.round(base * 1.25), accuracy: 90 },
  ensemble: { forecast: Math.round(base * 1.28), accuracy: 94 },
});

const getAccuracyColor = (accuracy: number) => {
  if (accuracy >= 90) return 'text-success';
  if (accuracy >= 80) return 'text-yellow-500'; // Using a generic yellow
  return 'text-destructive';
};

const initialVisibleColumns = {
  sku: true,
  productName: true,
  currentStock: true,
  movingAverage: true,
  expSmoothing: true,
  seasonal: true,
  aiModel: true,
  ensemble: true,
  bestModel: true,
};


export default function ProfessionalForecastingPage() {
  const [selectedTimePeriod, setSelectedTimePeriod] = useState("last_90_days");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedWarehouse, setSelectedWarehouse] = useState("all");
  const [selectedSupplier, setSelectedSupplier] = useState("all");
  const [selectedModelType, setSelectedModelType] = useState("all_models");

  const [selectedProducts, setSelectedProducts] = useState<Record<string, boolean>>({});
  const [visibleColumns, setVisibleColumns] = useState(initialVisibleColumns);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'ascending' | 'descending' } | null>(null);

  const handleSelectAll = (checked: boolean) => {
    const newSelectedProducts: Record<string, boolean> = {};
    if (checked) {
      mockProducts.forEach(p => newSelectedProducts[p.id] = true);
    }
    setSelectedProducts(newSelectedProducts);
  };

  const handleSelectProduct = (productId: string, checked: boolean) => {
    setSelectedProducts(prev => ({ ...prev, [productId]: checked }));
  };
  
  const numSelected = Object.values(selectedProducts).filter(Boolean).length;

  const getSelectAllCheckedState = (): boolean | 'indeterminate' => {
    if (numSelected === 0) return false;
    if (numSelected === mockProducts.length) return true;
    return 'indeterminate';
  };

  // Mock quick stats - in reality, this would be calculated
  const quickStats = useMemo(() => {
    if (numSelected === 0) return { products: 0, avgAccuracy: 0, totalUnits: 0, totalValue: 0 };
    return {
        products: numSelected,
        avgAccuracy: 89, // Mock
        totalUnits: numSelected * 150, // Mock
        totalValue: numSelected * 150 * 25, // Mock
    }
  }, [numSelected]);


  const ColumnToggleDropdown = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm"><Columns className="mr-2 h-4 w-4" /> View Columns</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {Object.entries(initialVisibleColumns).map(([key, _]) => (
          <DropdownMenuCheckboxItem
            key={key}
            checked={visibleColumns[key as keyof typeof initialVisibleColumns]}
            onCheckedChange={(checked) =>
              setVisibleColumns(prev => ({ ...prev, [key]: !!checked }))
            }
          >
            {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
  
  // Placeholder for sorting
  const requestSort = (key: string) => {
    // Sorting logic would go here
    console.log("Request sort by:", key);
  };


  return (
    <div className="flex flex-col gap-4 h-full p-2 sm:p-4 bg-background">
      {/* Top Filter Bar */}
      <Card className="shadow-sm border-border">
        <CardContent className="p-3">
          <div className="flex flex-wrap items-center gap-2">
            <Select value={selectedTimePeriod} onValueChange={setSelectedTimePeriod}>
              <SelectTrigger className="w-auto min-w-[150px] h-9 text-xs">
                <SelectValue placeholder="Time Period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="last_30_days">Last 30 Days</SelectItem>
                <SelectItem value="last_90_days">Last 90 Days</SelectItem>
                <SelectItem value="custom_range">Custom Range</SelectItem>
              </SelectContent>
            </Select>
             <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-auto min-w-[150px] h-9 text-xs">
                <SelectValue placeholder="Product Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="electronics">Electronics</SelectItem>
                <SelectItem value="apparel">Apparel</SelectItem>
                <SelectItem value="accessories">Accessories</SelectItem>
                <SelectItem value="home_goods">Home Goods</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
              <SelectTrigger className="w-auto min-w-[150px] h-9 text-xs">
                <SelectValue placeholder="Warehouse" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Warehouses</SelectItem>
                <SelectItem value="west_coast">West Coast</SelectItem>
                <SelectItem value="east_coast">East Coast</SelectItem>
                <SelectItem value="central">Central</SelectItem>
              </SelectContent>
            </Select>
             <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
              <SelectTrigger className="w-auto min-w-[150px] h-9 text-xs">
                <SelectValue placeholder="Supplier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Suppliers</SelectItem>
                <SelectItem value="supplier_a">Supplier A</SelectItem>
                <SelectItem value="supplier_b">Supplier B</SelectItem>
                <SelectItem value="top_5">Top 5 Suppliers</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedModelType} onValueChange={setSelectedModelType}>
              <SelectTrigger className="w-auto min-w-[150px] h-9 text-xs">
                <SelectValue placeholder="Model Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all_models">All Models</SelectItem>
                <SelectItem value="ai_models">AI Models</SelectItem>
                <SelectItem value="statistical_models">Statistical Models</SelectItem>
                <SelectItem value="ensemble_models">Ensemble Models</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="ghost" size="sm" className="h-9 text-xs"><Filter className="mr-1 h-3 w-3"/> More Filters</Button>
          </div>
        </CardContent>
      </Card>

    <div className="flex flex-1 gap-4 overflow-hidden">
      {/* Main Content: Excel-Style Grid and Chart */}
      <div className="flex-1 flex flex-col gap-4 overflow-hidden">
        {/* Excel-Style Data Grid */}
        <Card className="shadow-lg border-border flex-1 flex flex-col overflow-hidden">
          <CardHeader className="p-3 border-b">
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg font-semibold">Demand Forecast Analysis</CardTitle>
              <div className="flex items-center gap-2">
                <ColumnToggleDropdown />
                <Button variant="outline" size="sm"><Download className="mr-2 h-4 w-4" /> Export to Excel</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-auto relative">
            {/* Placeholder for Formula Bar */}
            <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b p-2 flex items-center gap-2">
                <span className="text-xs font-mono text-muted-foreground">fx</span>
                <Input readOnly placeholder="Selected cell formula/value (placeholder)" className="h-7 text-xs flex-1" />
            </div>
            <Table className="min-w-full whitespace-nowrap">
              <TableHeader className="sticky top-0 bg-background/90 backdrop-blur-sm z-10">
                <TableRow>
                  <TableHead className="w-[50px] p-2 sticky left-0 bg-background/90 z-20">
                    <Checkbox 
                        onCheckedChange={(isChecked) => {
                            // Radix onCheckedChange for indeterminate can pass string 'indeterminate' or boolean
                            // We want to treat click on indeterminate as 'select all'
                            handleSelectAll(isChecked === 'indeterminate' ? true : !!isChecked);
                        }}
                        checked={getSelectAllCheckedState()}
                        aria-label="Select all rows"
                    />
                  </TableHead>
                  {visibleColumns.sku && <TableHead className="w-[120px] p-2 sticky left-[50px] bg-background/90 z-20 cursor-pointer" onClick={() => requestSort('sku')}>SKU <ArrowDownWideNarrow className="inline h-3 w-3 ml-1 opacity-50" /></TableHead>}
                  {visibleColumns.productName && <TableHead className="min-w-[200px] p-2 sticky left-[170px] bg-background/90 z-20 cursor-pointer" onClick={() => requestSort('name')}>Product Name</TableHead>}
                  {visibleColumns.currentStock && <TableHead className="w-[100px] p-2 text-right cursor-pointer" onClick={() => requestSort('currentStock')}>Current Stock</TableHead>}
                  
                  {/* Forecast Model Columns */}
                  {visibleColumns.movingAverage && <TableHead className="w-[120px] p-2 text-right cursor-pointer" onClick={() => requestSort('movingAverage')}>Moving Avg.</TableHead>}
                  {visibleColumns.expSmoothing && <TableHead className="w-[120px] p-2 text-right cursor-pointer" onClick={() => requestSort('expSmoothing')}>Exp. Smooth</TableHead>}
                  {visibleColumns.seasonal && <TableHead className="w-[120px] p-2 text-right cursor-pointer" onClick={() => requestSort('seasonal')}>Seasonal</TableHead>}
                  {visibleColumns.aiModel && <TableHead className="w-[120px] p-2 text-right cursor-pointer" onClick={() => requestSort('aiModel')}>AI Model</TableHead>}
                  {visibleColumns.ensemble && <TableHead className="w-[120px] p-2 text-right cursor-pointer" onClick={() => requestSort('ensemble')}>Ensemble</TableHead>}
                  {visibleColumns.bestModel && <TableHead className="w-[120px] p-2 text-center cursor-pointer" onClick={() => requestSort('bestModel')}>Best Model</TableHead>}
                   <TableHead className="w-[50px] p-2 text-center">Edit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockProducts.map((product) => {
                  const forecasts = mockForecastData(product.currentStock);
                  // Mock: Randomly pick a best model for visual
                  const models = ["AI", "Seasonal", "Ensemble"];
                  const bestModelName = models[Math.floor(Math.random() * models.length)];
                  return (
                    <TableRow key={product.id} data-state={selectedProducts[product.id] ? "selected" : ""}>
                      <TableCell className="p-2 sticky left-0 bg-background z-10">
                        <Checkbox 
                            checked={selectedProducts[product.id] || false}
                            onCheckedChange={(checked) => handleSelectProduct(product.id, !!checked)}
                            aria-label={`Select row for ${product.name}`}
                        />
                      </TableCell>
                      {visibleColumns.sku && <TableCell className="p-2 font-medium sticky left-[50px] bg-background z-10">{product.sku}</TableCell>}
                      {visibleColumns.productName && <TableCell className="p-2 sticky left-[170px] bg-background z-10">{product.name}</TableCell>}
                      {visibleColumns.currentStock && <TableCell className="p-2 text-right">{product.currentStock}</TableCell>}

                      {visibleColumns.movingAverage && 
                        <TableCell className="p-2 text-right">
                          {forecasts.movingAverage.forecast}
                          <span className={cn("text-xs ml-1", getAccuracyColor(forecasts.movingAverage.accuracy))}>({forecasts.movingAverage.accuracy}%)</span>
                        </TableCell>
                      }
                      {visibleColumns.expSmoothing &&
                        <TableCell className="p-2 text-right">
                          {forecasts.expSmoothing.forecast}
                          <span className={cn("text-xs ml-1", getAccuracyColor(forecasts.expSmoothing.accuracy))}>({forecasts.expSmoothing.accuracy}%)</span>
                        </TableCell>
                      }
                       {visibleColumns.seasonal &&
                        <TableCell className="p-2 text-right">
                          {forecasts.seasonal.forecast}
                          <span className={cn("text-xs ml-1", getAccuracyColor(forecasts.seasonal.accuracy))}>({forecasts.seasonal.accuracy}%)</span>
                        </TableCell>
                       }
                       {visibleColumns.aiModel &&
                        <TableCell className="p-2 text-right">
                          {forecasts.aiModel.forecast}
                          <span className={cn("text-xs ml-1", getAccuracyColor(forecasts.aiModel.accuracy))}>({forecasts.aiModel.accuracy}%)</span>
                        </TableCell>
                       }
                       {visibleColumns.ensemble &&
                        <TableCell className="p-2 text-right">
                          {forecasts.ensemble.forecast}
                          <span className={cn("text-xs ml-1", getAccuracyColor(forecasts.ensemble.accuracy))}>({forecasts.ensemble.accuracy}%)</span>
                        </TableCell>
                       }
                       {visibleColumns.bestModel &&
                        <TableCell className="p-2 text-center">
                            <span className="inline-flex items-center"><CheckCircle2 className="h-4 w-4 mr-1 text-success" /> {bestModelName}</span>
                        </TableCell>
                       }
                       <TableCell className="p-2 text-center">
                         <Button variant="ghost" size="icon" className="h-7 w-7">
                            <Edit2 className="h-3.5 w-3.5" />
                         </Button>
                       </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
          <CardFooter className="p-3 border-t text-xs text-muted-foreground">
            {numSelected} of {mockProducts.length} products selected. (Excel-like status bar placeholder)
          </CardFooter>
        </Card>

        {/* Interactive Comparison Chart Placeholder */}
        <Card className="shadow-md border-border">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Forecast Comparison - Selected Products</CardTitle>
            <CardDescription>Interactive chart to compare models for selected products. (Placeholder)</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] flex flex-col items-center justify-center bg-muted/30 rounded-md">
            <BarChart2 className="h-16 w-16 text-primary/50 mb-4" />
            <p className="text-muted-foreground">Interactive D3.js/Recharts chart will appear here.</p>
            <p className="text-xs text-muted-foreground">Features: Multi-select products, toggle models, zoom/pan, hover values, download.</p>
            <div className="mt-4 space-x-2">
                <Label className="text-xs">Toggle Models:</Label>
                <Checkbox id="toggle_ma" disabled className="mr-1"/><Label htmlFor="toggle_ma" className="text-xs mr-2">MA</Label>
                <Checkbox id="toggle_s" defaultChecked disabled className="mr-1"/><Label htmlFor="toggle_s" className="text-xs mr-2">Seasonal</Label>
                <Checkbox id="toggle_ai" defaultChecked disabled className="mr-1"/><Label htmlFor="toggle_ai" className="text-xs">AI</Label>
            </div>
          </CardContent>
        </Card>
        </div>

        {/* Quick Stats Sidebar */}
        <Card className="shadow-md border-border w-full md:w-64 lg:w-72 flex-shrink-0 h-fit md:sticky md:top-20">
            <CardHeader>
                <CardTitle className="text-md font-semibold">Selection Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between"><span>Products Selected:</span> <span className="font-medium">{quickStats.products}</span></div>
                <div className="flex justify-between"><span>Avg. Accuracy (Est.):</span> <span className="font-medium">{quickStats.avgAccuracy}%</span></div>
                <div className="flex justify-between"><span>Total Units Forecasted:</span> <span className="font-medium">{quickStats.totalUnits.toLocaleString()}</span></div>
                <div className="flex justify-between"><span>Total Forecast Value:</span> <span className="font-medium">${quickStats.totalValue.toLocaleString()}</span></div>
                <Button className="w-full mt-3" size="sm" disabled={numSelected === 0}>
                    <PlusCircle className="mr-2 h-4 w-4"/> Add to Report
                </Button>
            </CardContent>
        </Card>
    </div>


      {/* Bottom Action Bar */}
      <Card className="shadow-sm border-border mt-auto">
        <CardContent className="p-2">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button variant="outline" size="sm"><Download className="mr-1.5 h-3.5 w-3.5" /> Export All</Button>
            <Button variant="outline" size="sm"><BarChart2 className="mr-1.5 h-3.5 w-3.5" /> Run Bulk Analysis</Button>
            <Button variant="outline" size="sm"><Settings2 className="mr-1.5 h-3.5 w-3.5" /> Model Settings</Button>
            <Button variant="outline" size="sm"><Save className="mr-1.5 h-3.5 w-3.5" /> Save View</Button>
            <Button variant="outline" size="sm"><Mail className="mr-1.5 h-3.5 w-3.5" /> Schedule Report</Button>
            <Button variant="default" size="sm" className="bg-primary hover:bg-primary/90"><RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Refresh Data</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

