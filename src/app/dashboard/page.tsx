
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
  Loader2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import { useAnalyticsDashboard } from "@/hooks/useAnalytics";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";


const recentActivities = [
  { id: 1, type: "Inventory Update", description: "SKU001 quantity changed to 145", time: "2m ago" },
  { id: 2, type: "New Order", description: "Order #1023 placed", time: "15m ago" },
  { id: 3, type: "Low Stock Alert", description: "SKU004 is low on stock", time: "1h ago" },
  { id: 4, type: "Supplier Update", description: "ApparelCo contact updated", time: "3h ago" },
];

export default function DashboardPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { data: kpiData, isLoading: kpisLoading, isError: kpisError, error: kpisFetchError } = useAnalyticsDashboard({ refetchInterval: 30000 });

  const handleViewAlerts = async () => {
    toast({ title: "Fetching Alerts...", description: "This may take a moment." });
    try {
      const response = await fetch('/api/inventory/alerts');
      if (!response.ok) throw new Error('Failed to fetch alerts');
      const result = await response.json();
      // For now, just toast the number of alerts. A modal/dedicated page would show details.
      const alertCount = result.data?.length || 0;
      toast({ title: "Inventory Alerts", description: `Found ${alertCount} item(s) needing attention.` });
    } catch (err: any) {
      toast({ title: "Error Fetching Alerts", description: err.message, variant: "destructive" });
    }
  };

  const kpis = kpiData?.data;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-headline font-semibold text-foreground">Dashboard Overview</h1>
      
      {kpisError && <p className="text-destructive">Error loading KPIs: {kpisFetchError?.message}</p>}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpisLoading ? (
          <>
            <DashboardCard title="Total Inventory Value"><Skeleton className="h-8 w-3/4 mt-1" /><Skeleton className="h-4 w-1/2 mt-1" /></DashboardCard>
            <DashboardCard title="Low Stock Items"><Skeleton className="h-8 w-1/2 mt-1" /><Skeleton className="h-4 w-3/4 mt-1" /></DashboardCard>
            <DashboardCard title="Pending Orders"><Skeleton className="h-8 w-1/2 mt-1" /><Skeleton className="h-4 w-1/2 mt-1" /></DashboardCard>
            <DashboardCard title="Today's Revenue"><Skeleton className="h-8 w-3/4 mt-1" /><Skeleton className="h-4 w-1/2 mt-1" /></DashboardCard>
          </>
        ) : (
          <>
            <DashboardCard
              title="Total Inventory Value"
              icon={DollarSign}
              value={kpis?.totalInventoryValue ? `$${kpis.totalInventoryValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}` : "N/A"}
              description={kpis?.turnoverRate ? `Turnover: ${kpis.turnoverRate}` : "Calculating..."}
            />
            <DashboardCard
              title="Low Stock Items"
              icon={AlertTriangle}
              value={kpis?.lowStockItemsCount ?? "N/A"}
              description="Needs immediate attention"
              valueClassName="text-warning"
            />
             <DashboardCard
              title="Out of Stock Items"
              icon={AlertTriangle}
              value={kpis?.outOfStockItemsCount ?? "N/A"}
              description="Critical - restock now"
              valueClassName="text-destructive"
            />
            <DashboardCard
              title="Pending Orders" /* Placeholder */
              icon={ClipboardList}
              value={5}
              description="Awaiting fulfillment"
            />
          </>
        )}
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
            {/* Placeholder for Firestore real-time listener feed */}
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
              <TrendingUp className="h-5 w-5 mr-2 text-primary" />
              Inventory Turnover
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center text-center min-h-[200px]">
            {kpisLoading ? <Loader2 className="h-8 w-8 animate-spin text-primary" /> : 
            kpis?.turnoverRate ? <p className="text-4xl font-bold text-primary">{kpis.turnoverRate.toFixed(1)}x</p> :
            <Image 
              src="https://placehold.co/300x150.png" 
              alt="Inventory turnover chart placeholder" 
              width={300} 
              height={150}
              data-ai-hint="line graph"
              className="rounded-md shadow-sm mb-3"
            />
            }
            <p className="text-sm text-muted-foreground mt-2">{kpisLoading ? "Loading..." : kpis?.turnoverRate ? "Calculated turnover rate" : "Inventory turnover rate chart coming soon."}</p>
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
             {/* Placeholder - this would ideally come from API/analytics hook */}
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
