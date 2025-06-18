
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
            Manage user profiles, team access, notifications, integrations, and billing.
          </CardDescription>
        </CardHeader>
        <CardContent className="min-h-[400px] p-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="text-lg flex items-center"><Users className="h-5 w-5 mr-2 text-accent"/>User & Team Management</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Manage your profile, invite team members, and set roles/permissions.</p>
                <Button variant="outline" size="sm" className="mt-3" disabled>Manage Users (Soon)</Button>
              </CardContent>
            </Card>
             <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="text-lg flex items-center"><Bell className="h-5 w-5 mr-2 text-accent"/>Notification Preferences</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Configure alerts for low stock, supplier delays, and market intelligence updates.</p>
                <Button variant="outline" size="sm" className="mt-3" disabled>Configure Alerts (Soon)</Button>
              </CardContent>
            </Card>
             <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="text-lg flex items-center"><KeyRound className="h-5 w-5 mr-2 text-accent"/>API Integrations</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Connect with e-commerce platforms, shipping carriers, and other external services.</p>
                 <Button variant="outline" size="sm" className="mt-3" disabled>Manage Integrations (Soon)</Button>
              </CardContent>
            </Card>
             <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="text-lg flex items-center"><CreditCard className="h-5 w-5 mr-2 text-accent"/>Billing & Subscription</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">View your current plan, manage payment methods, and access invoices.</p>
                <Button variant="outline" size="sm" className="mt-3" disabled>View Billing (Soon)</Button>
              </CardContent>
            </Card>
            <Card className="hover:shadow-md transition-shadow md:col-span-2 lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-lg flex items-center"><Activity className="h-5 w-5 mr-2 text-accent"/>System & Data Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Configure data retention policies, export all data, or manage advanced system settings.</p>
                <Button variant="outline" size="sm" className="mt-3" disabled>Advanced Settings (Soon)</Button>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
