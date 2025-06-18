
import { Settings as SettingsIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Image from 'next/image';

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
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center text-center min-h-[300px]">
          <Image 
            src="https://placehold.co/600x400.png" 
            alt="Application settings placeholder" 
            width={600} 
            height={400}
            data-ai-hint="gears interface"
            className="rounded-md shadow-md mb-4"
          />
          <p className="text-lg text-muted-foreground">
            User profile management, team invitations, notification preferences, and other application settings will be available here soon.
          </p>
          <p className="text-sm text-muted-foreground">
            Customize SupplyChainAI to fit your team's workflow.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
