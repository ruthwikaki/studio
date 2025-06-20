
"use client";

import DashboardCard from "@/components/dashboard/DashboardCard";
import { 
  AlertTriangle, 
  DollarSign,
  ClipboardList,
  UploadCloud,
  FilePlus2,
  MessageCircle,
  ListChecks,
  TrendingUp,
  Award,
  Bell,
  Loader2,
  BarChart,
  PackageCheck, // For Pending Orders if count is 0
  Activity, // For Turnover Rate
  Archive // For Out of Stock Items
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useAnalyticsDashboard } from '@/hooks/useAnalytics';
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";


const recentActivities = [
  { id: 1, type: "Inventory Update", description: "SKU001 quantity changed to 145", time: "2m ago" },
  { id: 2, type: "New Order", description: "Order #1023 placed", time: "15m ago" },
  { id:3, type: "Forecast Generated", description: "Demand forecast for SKU002 updated", time: "45m ago" },
  { id: 4, type: "Supplier Update", description: "ApparelCo contact updated", time: "3h ago" },
];

export default function DashboardPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { data: kpiData, isLoading: kpisLoading, isError: kpisError, error: kpisFetchError } = useAnalyticsDashboard({ refetchInterval: 60000 }); // Refetch every 60 seconds

  const handleViewAlerts = async () => {
    toast({ title: "Fetching Alerts...", description: "This may take a moment." });
    router.push('/inventory?lowStockOnly=true'); // Navigate to inventory page with filter
  };

  const kpis = kpiData?.data;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-headline font-semibold text-foreground">Dashboard Overview</h1>
      
      {kpisError && (
        <Card className="bg-destructive/10 border-destructive">
          <CardContent className="p-4 text-destructive-foreground">
            <p className="font-semibold">Failed to fetch dashboard KPIs</p>
            <p className="text-sm">{kpisFetchError?.message || "An unknown error occurred while fetching dashboard data."}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpisLoading ? (
          <>
            <DashboardCard title="Total Inventory Value"><Skeleton className="h-8 w-3/4 mt-1" /><Skeleton className="h-4 w-1/2 mt-1" /></DashboardCard>
            <DashboardCard title="Low Stock Items"><Skeleton className="h-8 w-1/2 mt-1" /><Skeleton className="h-4 w-3/4 mt-1" /></DashboardCard>
            <DashboardCard title="Out of Stock Items"><Skeleton className="h-8 w-1/2 mt-1" /><Skeleton className="h-4 w-3/4 mt-1" /></DashboardCard>
            <DashboardCard title="Pending Orders"><Skeleton className="h-8 w-1/2 mt-1" /><Skeleton className="h-4 w-1/2 mt-1" /></DashboardCard>
          </>
        ) : kpis ? ( // Only render if kpis exist (and no error)
          <>
            <DashboardCard
              title="Total Inventory Value"
              icon={DollarSign}
              value={kpis?.totalInventoryValue !== undefined ? `$${kpis.totalInventoryValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}` : "N/A"}
              description={kpis?.turnoverRate !== undefined ? `Turnover: ${kpis.turnoverRate.toFixed(1)}x` : "Valuation of current stock."}
            />
            <DashboardCard
              title="Low Stock Items"
              icon={AlertTriangle}
              value={kpis?.lowStockItemsCount ?? "N/A"}
              description={`${kpis?.lowStockItemsCount || 0} items below reorder point`}
              valueClassName={kpis && kpis.lowStockItemsCount > 0 ? "text-warning" : "text-success"}
            />
             <DashboardCard
              title="Out of Stock Items"
              icon={Archive}
              value={kpis?.outOfStockItemsCount ?? "N/A"}
              description={`${kpis?.outOfStockItemsCount || 0} items completely out`}
              valueClassName={kpis && kpis.outOfStockItemsCount > 0 ? "text-destructive" : "text-success"}
            />
            <DashboardCard
              title="Pending Orders"
              icon={kpis?.pendingOrdersCount === 0 ? PackageCheck : ClipboardList}
              value={kpis?.pendingOrdersCount ?? "N/A"}
              description={kpis?.pendingOrdersCount === 1 ? "Order awaiting action" : "Orders awaiting action"}
              valueClassName={kpis && kpis.pendingOrdersCount > 0 ? "text-blue-500" : "text-muted-foreground"}
            />
          </>
        ) : !kpisError ? ( // If not loading, no kpis, and no error, show general message
            <Card className="md:col-span-4">
                <CardContent className="p-4 text-center text-muted-foreground">
                    No dashboard data available at the moment. Try seeding data or check API logs.
                </CardContent>
            </Card>
        ) : null /* Error is handled above */ }
      </div>

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
            <Button variant="outline" className="h-auto py-3 flex-col gap-1" onClick={handleViewAlerts}>
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
             <p className="text-xs text-muted-foreground mt-4">Real-time activity feed using Firestore listeners is a planned feature.</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline text-lg flex items-center">
              <Activity className="h-5 w-5 mr-2 text-primary" /> {/* Changed icon */}
              Inventory Turnover Rate
            </CardTitle>
             <CardDescription>Efficiency of stock management over time.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center text-center min-h-[200px] p-4">
            {kpisLoading ? <Loader2 className="h-8 w-8 animate-spin text-primary" /> : 
            kpis?.turnoverRate !== undefined ? 
            (
              <div className="text-center">
                <p className="text-4xl font-bold text-primary">{kpis.turnoverRate.toFixed(1)}x</p>
                <p className="text-sm text-muted-foreground mt-1">Calculated based on last 90 days</p>
              </div>
            ) :
            (
              <div className="w-full h-full flex flex-col items-center justify-center bg-muted/30 rounded-md p-4">
                <BarChart className="h-16 w-16 text-primary/50 mb-3" />
                <p className="text-sm text-muted-foreground">Turnover Chart (Soon)</p>
                <p className="text-xs text-muted-foreground">Displays trends and allows timeframe selection.</p>
              </div>
            )
            }
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline text-lg flex items-center">
              <Award className="h-5 w-5 mr-2 text-primary" />
              Top Performing SKUs
            </CardTitle>
            <CardDescription>Based on sales velocity or revenue (Coming Soon).</CardDescription>
          </CardHeader>
          <CardContent className="min-h-[200px] p-4">
            <div className="w-full h-full flex flex-col items-center justify-center bg-muted/30 rounded-md p-4">
              <ListChecks className="h-16 w-16 text-primary/50 mb-3" />
              <p className="text-sm text-muted-foreground">Top SKUs Table</p>
              <p className="text-xs text-muted-foreground text-center">Dynamic table with sortable columns (e.g., sales, margin).</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

