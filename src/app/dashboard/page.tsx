
import DashboardCard from "@/components/dashboard/DashboardCard";
import { 
  AlertTriangle, 
  Archive, 
  PackageX, 
  ListOrdered, 
  DollarSign,
  ClipboardList, // For Pending Orders
  UploadCloud, // For Upload Inventory
  FilePlus2, // For Create PO
  MessageCircle, // For Chat with AI
  ListChecks, // For Recent Activity
  TrendingUp, // For Inventory Turnover
  Award, // For Top Products
  Bell // For View Alerts (can also be AlertCircle)
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";

const lowStockItemsCount = 2; // Example data
const overStockItemsCount = 2; // Example data
const pendingOrdersCount = 5;
const todaysRevenue = "$1,250.00";

const recentActivities = [
  { id: 1, type: "Inventory Update", description: "SKU001 quantity changed to 145", time: "2m ago" },
  { id: 2, type: "New Order", description: "Order #1023 placed", time: "15m ago" },
  { id: 3, type: "Low Stock Alert", description: "SKU004 is low on stock", time: "1h ago" },
  { id: 4, type: "Supplier Update", description: "ApparelCo contact updated", time: "3h ago" },
];

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-headline font-semibold text-foreground">Dashboard Overview</h1>
      
      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <DashboardCard
          title="Total Inventory Value"
          icon={DollarSign}
          value="$125,430.50"
          description="+5.2% from last month"
        />
        <DashboardCard
          title="Low Stock Items"
          icon={AlertTriangle}
          value={lowStockItemsCount}
          description="Needs immediate attention"
          valueClassName="text-warning"
        />
        <DashboardCard
          title="Pending Orders"
          icon={ClipboardList}
          value={pendingOrdersCount}
          description="Awaiting fulfillment"
        />
        <DashboardCard
          title="Today's Revenue"
          icon={DollarSign}
          value={todaysRevenue}
          description="Track daily sales"
          valueClassName="text-success"
        />
      </div>

      {/* Quick Actions & Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1 shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <Button variant="outline" className="h-auto py-3 flex-col gap-1" asChild>
              <Link href="/data-import">
                <UploadCloud className="h-5 w-5 text-primary" />
                <span className="text-xs">Upload Inventory</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto py-3 flex-col gap-1" asChild>
              <Link href="/orders">
                <FilePlus2 className="h-5 w-5 text-primary" />
                <span className="text-xs">Create PO</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto py-3 flex-col gap-1">
              <Bell className="h-5 w-5 text-warning" />
              <span className="text-xs">View Alerts</span>
            </Button>
            <Button variant="outline" className="h-auto py-3 flex-col gap-1" asChild>
              <Link href="/ai-chat">
                <MessageCircle className="h-5 w-5 text-primary" />
                <span className="text-xs">Chat with AI</span>
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline text-lg flex items-center">
              <ListChecks className="h-5 w-5 mr-2 text-primary" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivities.length > 0 ? (
              <ul className="space-y-3">
                {recentActivities.map((activity) => (
                  <li key={activity.id} className="flex items-center justify-between text-sm">
                    <div>
                      <span className="font-medium">{activity.type}:</span> {activity.description}
                    </div>
                    <span className="text-xs text-muted-foreground">{activity.time}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No recent activity to display. System alerts and updates will appear here.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Mini Analytics Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline text-lg flex items-center">
              <TrendingUp className="h-5 w-5 mr-2 text-primary" />
              Inventory Turnover
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center text-center min-h-[200px]">
            <Image 
              src="https://placehold.co/300x150.png" 
              alt="Inventory turnover chart placeholder" 
              width={300} 
              height={150}
              data-ai-hint="line graph"
              className="rounded-md shadow-sm mb-3"
            />
            <p className="text-sm text-muted-foreground">Inventory turnover rate chart coming soon.</p>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline text-lg flex items-center">
              <Award className="h-5 w-5 mr-2 text-primary" />
              Top 5 Products by Value
            </CardTitle>
          </CardHeader>
          <CardContent className="min-h-[200px]">
            <p className="text-sm text-muted-foreground mb-2">Product value breakdown:</p>
            <ul className="space-y-2 text-sm">
              {["Product A - $15,000", "Product B - $12,500", "Product C - $9,800", "Product D - $7,200", "Product E - $5,500"].map(item => (
                 <li key={item} className="flex justify-between"><span>{item.split(" - ")[0]}</span> <Badge variant="secondary">{item.split(" - ")[1]}</Badge></li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground mt-2">Live chart displaying top products by value is under development.</p>
          </CardContent>
        </Card>
      </div>
      
    </div>
  );
}
