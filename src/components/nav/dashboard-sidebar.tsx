
"use client"; 

import Link from "next/link";
import { Home as HomeIcon, FileText, Users, BarChart3, MessageSquare, Bell, Briefcase, Lightbulb, Store, Landmark, DollarSign, TrendingUp } from "lucide-react"; 
import { usePathname } from "next/navigation"; 
import { cn } from "@/lib/utils";
import React from "react";

const companyName = "LISTED";

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

interface DashboardSidebarProps {
  onLogout: () => void; 
}

export function DashboardSidebar({ onLogout }: DashboardSidebarProps) {
  const pathname = usePathname();

  const navLinks = [
    { href: "/dashboard", label: "Dashboard", icon: <HomeIcon /> },
    { href: "/dashboard/ads", label: "Manage Offers", icon: <Briefcase /> },
    { href: "/dashboard/my-funding-pitches", label: "My Business Pitches", icon: <Lightbulb /> },
    { href: "/dashboard/scale-business", label: "Scale Business", icon: <TrendingUp /> },
    { href: "/dashboard/opportunities", label: "All Opportunities", icon: <Lightbulb /> },
    { href: "/dashboard/network", label: "Sales Network", icon: <Users /> },
    { href: "/dashboard/leads", label: "Business Leads", icon: <BarChart3 /> }, 
    { href: "/dashboard/find-investor", label: "Find Investors", icon: <Landmark /> },
    { href: "/dashboard/messages", label: "Messages", icon: <MessageSquare /> },
  ];

  return (
    <aside className="hidden md:flex w-64 bg-background text-foreground p-6 flex-col justify-between shadow-lg print:hidden fixed top-0 left-0 h-full">
      <div>
        <div className="mb-10 text-center">
            <Link href="/dashboard" className="flex items-center justify-center gap-2 mb-2">
            <Briefcase className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold text-primary">{companyName}</h1>
        </Link>
        <p className="text-xs text-muted-foreground">Corporation Portal</p>
        </div>
        <nav className="space-y-2">
          {navLinks.map(link => (
            <SidebarLink
              key={link.href}
              href={link.href}
              icon={link.icon}
              label={link.label}
              isActive={pathname === link.href || (link.href !== "/dashboard" && pathname.startsWith(link.href))}
            />
          ))}
        </nav>
      </div>
       <div className="mt-auto p-4 border-t">
           <p className="text-xs text-muted-foreground text-center">
            Access Settings &amp; Logout via the top-right user menu.
           </p>
        </div>
    </aside>
  );
}
