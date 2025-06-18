"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NAV_ITEMS, APP_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Menu } from "lucide-react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import Link from "next/link";
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";

export default function Header() {
  const pathname = usePathname();
  const { toggleSidebar, isMobile } = useSidebar();

  const getCurrentPageLabel = () => {
    // Match based on the longest path prefix
    let currentLabel = "Dashboard"; // Default label
    let longestMatchLength = 0;

    for (const item of NAV_ITEMS) {
      if (pathname.startsWith(item.href) && item.href.length > longestMatchLength) {
        currentLabel = item.label;
        longestMatchLength = item.href.length;
        if (pathname === item.href) break; // Exact match is best
      }
    }
    // Handle root path explicitly if necessary
    if (pathname === "/") currentLabel = "Dashboard";
    return currentLabel;
  };

  const pageTitle = getCurrentPageLabel();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-md sm:px-6">
      {isMobile ? (
         <Button variant="ghost" size="icon" onClick={toggleSidebar} aria-label="Open sidebar" className="md:hidden">
            <Menu className="h-6 w-6" />
         </Button>
      ) : (
        <SidebarTrigger className="hidden md:flex" />
      )}
      <h1 className="text-xl font-semibold font-headline md:text-2xl">
        {pageTitle}
      </h1>
      <div className="ml-auto flex items-center gap-4">
        {/* Placeholder for future elements like search or notifications */}
        <Avatar>
          <AvatarImage src="https://placehold.co/40x40.png" alt="User Avatar" />
          <AvatarFallback>U</AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
