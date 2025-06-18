import DashboardCard from "@/components/dashboard/DashboardCard";
import { AlertTriangle, Archive, PackageX, ListOrdered, RefreshCw, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const lowStockItems = [
  { id: "SKU005", name: "Laptop Stand", quantity: 5, reorderPoint: 10 },
  { id: "SKU007", name: "Premium Mousepad", quantity: 12, reorderPoint: 15 },
];

const overStockItems = [
 { id: "SKU001", name: "Blue T-Shirt", quantity: 150, idealMax: 100 },
 { id: "SKU009", name: "Winter Scarf", quantity: 250, idealMax: 50 },
];

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-headline font-semibold text-foreground">Inventory Overview</h1>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <DashboardCard
          title="Total Inventory Value"
          icon={DollarSign}
          value="$125,430.50"
          description="+5.2% from last month"
        />
        <DashboardCard
          title="Items Low on Stock"
          icon={AlertTriangle}
          value={lowStockItems.length}
          description="Needs immediate attention"
          valueClassName="text-warning"
        />
        <DashboardCard
          title="Overstocked Items"
          icon={Archive}
          value={overStockItems.length}
          description="Potential dead stock risk"
        />
        <DashboardCard
          title="Turnover Rate"
          icon={RefreshCw}
          value="4.2"
          description="Average times stock sold"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2 text-warning" /> Low Stock Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Reorder Point</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lowStockItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{item.id}</TableCell>
                    <TableCell className="text-right text-warning font-semibold">{item.quantity}</TableCell>
                    <TableCell className="text-right">{item.reorderPoint}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline flex items-center">
             <Archive className="h-5 w-5 mr-2 text-blue-500" /> Overstock Identification
            </CardTitle>
          </CardHeader>
          <CardContent>
             <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Ideal Max</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overStockItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{item.id}</TableCell>
                    <TableCell className="text-right text-blue-500 font-semibold">{item.quantity}</TableCell>
                    <TableCell className="text-right">{item.idealMax}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <DashboardCard title="Dead Stock Analysis" icon={PackageX} description="Identifying non-moving items">
          <p className="text-lg font-semibold">$5,800 value in dead stock</p>
          <p className="text-xs text-muted-foreground">Consider promotions or liquidation.</p>
        </DashboardCard>
        <DashboardCard title="ABC Categorization" icon={ListOrdered} description="Prioritizing inventory items">
          <div className="space-y-2 mt-2">
            <div className="flex justify-between items-center"><span>Category A (High Value):</span> <Badge variant="default">20% items, 70% value</Badge></div>
            <div className="flex justify-between items-center"><span>Category B (Medium Value):</span> <Badge variant="secondary">30% items, 20% value</Badge></div>
            <div className="flex justify-between items-center"><span>Category C (Low Value):</span> <Badge variant="outline">50% items, 10% value</Badge></div>
          </div>
        </DashboardCard>
      </div>
      
    </div>
  );
}
