
"use client";

import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TrendingUp, LayoutList, MessageSquare, DollarSign, Briefcase, Store, ShieldAlert } from "lucide-react"; 
import { usePathname } from "next/navigation"; 
import { cn } from "@/lib/utils";
import React from "react"; 

interface InvestorSidebarProps {
  userName: string;
  userEmail: string;
  avatarSrc: string;
  initials: string;
  onLogout: () => void; 
}

interface SidebarLinkProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  isActive?: boolean;
  badgeCount?: number;
}

function SidebarLink({ href, icon, label, isActive = false, badgeCount }: SidebarLinkProps) {
  const content = (
    <>
      {React.cloneElement(icon as React.ReactElement, { className: "h-5 w-5" })}
      <span>{label}</span>
      {badgeCount && badgeCount > 0 && (
        <span className="ml-auto inline-flex items-center justify-center px-2 h-5 text-xs font-semibold leading-none text-red-100 bg-red-600 rounded-full">
          {badgeCount}
        </span>
      )}
    </>
  );

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
        isActive
          ? "bg-primary/10 text-primary hover:bg-primary/20"
          : "hover:bg-muted text-muted-foreground hover:text-foreground"
      )}
    >
      {content}
    </Link>
  );
}

export function InvestorSidebar({
  userName, 
  userEmail, 
  avatarSrc, 
  initials, 
  onLogout,
}: InvestorSidebarProps) {
  const pathname = usePathname();

  const navLinksConfig = [
    { href: "/investor/dashboard", label: "Home (Trending Startups)", icon: <TrendingUp /> },
    { href: "/investor/opportunities", label: "Investment Opportunities", icon: <LayoutList /> }, 
    { href: "/investor/my-investments", label: "My Portfolio", icon: <DollarSign /> }, 
    { href: "/investor/franchise-opportunities", label: "Franchise Opportunities", icon: <Store /> }, 
    { href: "/investor/requests", label: "Messages", icon: <MessageSquare /> },
    { href: "/investor/complaints", label: "My Complaints", icon: <ShieldAlert /> },
  ];

  return (
    <aside className="hidden md:flex fixed top-0 left-0 z-40 w-64 h-screen flex-col border-r bg-background shadow-lg">
      <div className="flex flex-col h-full">
        <div className="p-6 border-b">
          <Link href="/investor/dashboard" className="flex items-center gap-2 mb-1">
            <Briefcase className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold text-primary">LISTED</h1>
          </Link>
          <p className="text-xs text-muted-foreground">Investor Portal</p>
        </div>

        <ScrollArea className="flex-1 py-4">
          <nav className="px-4 space-y-1">
            {navLinksConfig.map((item) => (
              <SidebarLink
                key={item.label}
                href={item.href}
                icon={item.icon}
                label={item.label}
                isActive={pathname === item.href || (pathname.startsWith(item.href) && item.href !== "/investor/dashboard")}
              />
            ))}
          </nav>
        </ScrollArea>
        
        <div className="mt-auto p-4 border-t">
           <p className="text-xs text-muted-foreground text-center">
            Access Settings &amp; Logout via the top-right user menu.
           </p>
        </div>

      </div>
    </aside>
  );
}
