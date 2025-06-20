
import { Settings as SettingsIcon, Users, Bell, CreditCard, KeyRound, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from '@/components/ui/button';

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-headline font-semibold text-foreground">Application Settings</h1>
      
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline flex items-center">
            <SettingsIcon className="h-6 w-6 mr-2 text-primary" />
            Configure Your Application
          </CardTitle>
          <CardDescription>
            Manage user profiles, team access, notifications, and more.
          </CardDescription>
        </CardHeader>
        <CardContent className="min-h-[400px] p-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader><CardTitle className="text-lg flex items-center"><Users className="h-5 w-5 mr-2 text-accent"/>User & Team</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-muted-foreground">Manage your profile and invite team members.</p><Button variant="outline" size="sm" className="mt-3" disabled>Manage (Soon)</Button></CardContent>
            </Card>
             <Card className="hover:shadow-md transition-shadow">
              <CardHeader><CardTitle className="text-lg flex items-center"><Bell className="h-5 w-5 mr-2 text-accent"/>Notifications</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-muted-foreground">Configure alerts for low stock and other events.</p><Button variant="outline" size="sm" className="mt-3" disabled>Configure (Soon)</Button></CardContent>
            </Card>
             <Card className="hover:shadow-md transition-shadow">
              <CardHeader><CardTitle className="text-lg flex items-center"><KeyRound className="h-5 w-5 mr-2 text-accent"/>API Integrations</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-muted-foreground">Connect with e-commerce platforms and carriers.</p><Button variant="outline" size="sm" className="mt-3" disabled>Manage (Soon)</Button></CardContent>
            </Card>
             <Card className="hover:shadow-md transition-shadow">
              <CardHeader><CardTitle className="text-lg flex items-center"><CreditCard className="h-5 w-5 mr-2 text-accent"/>Billing</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-muted-foreground">View your plan and manage payment methods.</p><Button variant="outline" size="sm" className="mt-3" disabled>View (Soon)</Button></CardContent>
            </Card>
            <Card className="hover:shadow-md transition-shadow md:col-span-2 lg:col-span-1">
              <CardHeader><CardTitle className="text-lg flex items-center"><Activity className="h-5 w-5 mr-2 text-accent"/>System</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-muted-foreground">Configure data retention and advanced settings.</p><Button variant="outline" size="sm" className="mt-3" disabled>Advanced (Soon)</Button></CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
