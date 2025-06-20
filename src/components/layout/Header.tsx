
"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { APP_NAME, NOTIFICATION_ICON as NotificationIcon, GLOBAL_SEARCH_ICON as SearchIcon, NAV_ITEMS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Menu, LogOut, UserCircle, Settings as SettingsIcon } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";


export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { toggleSidebar, isMobile } = useSidebar();
  const { toast } = useToast();
  const { user, logout } = useAuth();

  const getCurrentPageLabel = () => {
    let currentLabel = "Dashboard"; 
    let longestMatchLength = 0;

    for (const item of NAV_ITEMS) {
      if (pathname.startsWith(item.href) && item.href.length > longestMatchLength) {
        currentLabel = item.label;
        longestMatchLength = item.href.length;
        if (pathname === item.href) break; 
      }
    }
    if (pathname === "/") currentLabel = "Dashboard";
    return currentLabel;
  };

  const pageTitle = getCurrentPageLabel();

  const handleSearchClick = () => {
    toast({
      title: "Global Search",
      description: "Search functionality (Cmd+K) is coming soon!",
    });
  };
  
  const handleNotificationsClick = () => {
    toast({
      title: "Notifications",
      description: "Notification panel is coming soon!",
    });
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-md sm:px-6">
      {isMobile ? (
         <Button variant="ghost" size="icon" onClick={toggleSidebar} aria-label="Open sidebar" className="md:hidden">
            <Menu className="h-6 w-6" />
         </Button>
      ) : (
        <SidebarTrigger className="hidden md:flex" />
      )}
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-semibold font-headline md:text-2xl hidden sm:block">
          {APP_NAME}
        </h1>
         <span className="text-xl font-semibold font-headline text-muted-foreground hidden sm:block">/</span>
        <h1 className="text-xl font-semibold font-headline md:text-2xl">
          {pageTitle}
        </h1>
      </div>
      
      <div className="ml-auto flex items-center gap-2 md:gap-4">
        <Button 
          variant="outline" 
          className="relative hidden md:flex items-center text-sm text-muted-foreground w-full justify-start gap-2 px-3 h-9"
          onClick={handleSearchClick}
        >
          <SearchIcon className="h-4 w-4" />
          Search...
          <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
            ⌘K
          </kbd>
        </Button>
        <Button variant="ghost" size="icon" className="md:hidden" onClick={handleSearchClick} aria-label="Search">
          <SearchIcon className="h-5 w-5" />
        </Button>

        <Button variant="ghost" size="icon" onClick={handleNotificationsClick} aria-label="Notifications">
          <NotificationIcon className="h-5 w-5" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.photoURL || undefined} alt={user?.displayName || 'User Avatar'} data-ai-hint="person portrait" />
                <AvatarFallback>{user?.email?.[0].toUpperCase() || 'U'}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>{user?.displayName || user?.email}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push('/settings')}>
              <SettingsIcon className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
