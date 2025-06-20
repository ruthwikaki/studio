
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_ITEMS, APP_NAME, APP_LOGO_ICON as AppLogoIcon } from "@/lib/constants";
import type { NavItem } from "@/lib/constants";
import Header from "./Header";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  useSidebar,
} from "@/components/ui/sidebar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

function MainSidebar() {
  const pathname = usePathname();
  const { state, isMobile, setOpenMobile } = useSidebar();
  const { logout } = useAuth();

  const isActive = (item: NavItem) => {
    if (item.href === "/dashboard" && pathname === "/dashboard") return true;
    if (item.href !== "/dashboard" && pathname.startsWith(item.href)) return true;
    return false;
  };
  
  const handleLinkClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4">
        <Link href="/dashboard" className="flex items-center gap-2" onClick={handleLinkClick}>
          <AppLogoIcon className={cn(
            "h-8 w-8 text-primary transition-all duration-300",
            state === "collapsed" && !isMobile && "rotate-[360deg]"
          )} />
          <span
            className={cn(
              "font-headline text-2xl font-semibold text-primary transition-opacity duration-200 ease-in-out",
              (state === "collapsed" && !isMobile) && "opacity-0 w-0 pointer-events-none" 
            )}
          >
            {APP_NAME}
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent className="p-2 pr-0 flex-grow">
        <ScrollArea className="h-full pr-2">
          <SidebarMenu>
            {NAV_ITEMS.map((item) => (
              <SidebarMenuItem key={item.label}>
                <SidebarMenuButton
                  asChild
                  isActive={isActive(item)}
                  tooltip={item.label}
                  className="justify-start"
                >
                  <Link href={item.href} onClick={handleLinkClick}>
                    <item.icon className="mr-2 h-5 w-5 flex-shrink-0" />
                    <span className={cn(
                       "truncate transition-opacity duration-200 ease-in-out",
                       (state === "collapsed" && !isMobile) && "opacity-0 pointer-events-none"
                    )}>{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </ScrollArea>
      </SidebarContent>
      <SidebarFooter className="p-2">
         <SidebarMenu>
            <SidebarMenuItem>
                 <SidebarMenuButton
                    onClick={logout}
                    tooltip="Logout"
                    className="justify-start text-muted-foreground hover:text-destructive-foreground hover:bg-destructive/80"
                >
                    <LogOut className="mr-2 h-5 w-5 flex-shrink-0" />
                    <span className={cn(
                       "truncate transition-opacity duration-200 ease-in-out",
                       (state === "collapsed" && !isMobile) && "opacity-0 pointer-events-none"
                    )}>Logout</span>
                </SidebarMenuButton>
            </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
        <SidebarProvider defaultOpen={true}>
        <MainSidebar />
        <SidebarInset>
            <Header />
            <main className="flex-1 p-4 sm:p-6 overflow-auto bg-blue-500/5">
            {children}
            </main>
        </SidebarInset>
        </SidebarProvider>
    </ProtectedRoute>
  );
}
