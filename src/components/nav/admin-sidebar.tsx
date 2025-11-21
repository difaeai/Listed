
"use client";

import Link from "next/link";
import { Home, Briefcase, Lightbulb, Users, BarChart3, MessageSquare, BookOpen, Settings, LogOut, ShieldCheck, FileEdit, DollarSign, Star, ShieldAlert as ShieldAlertIcon, MailQuestion, QrCode, Bell, Cpu, Trophy } from "lucide-react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import React from "react";

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

interface AdminSidebarProps {
  pendingPaymentRequests?: number;
  pendingFeatureRequests?: number;
  pendingComplaintsCount?: number;
  pendingInquiriesCount?: number;
  onLogout: () => void;
}

export function AdminSidebar({
  pendingPaymentRequests,
  pendingFeatureRequests,
  pendingComplaintsCount,
  pendingInquiriesCount,
  onLogout 
}: AdminSidebarProps) {
  const pathname = usePathname();

  const navLinksConfig = [
    { href: "/admin/dashboard", label: "Admin Dashboard", icon: <Home /> },
    { href: "/admin/notifications", label: "Notifications", icon: <Bell /> },
    { href: "/admin/manage-users", label: "Manage Users", icon: <Users /> },
    { href: "/admin/manage-offers", label: "Manage Offers", icon: <Briefcase /> },
    { href: "/admin/manage-funding-pitches", label: "Manage Pitches", icon: <Lightbulb /> },
    { href: "/admin/payment-requests", label: "Payment Requests", icon: <DollarSign />, badgeKey: "payments" },
    { href: "/admin/feature-requests", label: "Feature Requests", icon: <Star />, badgeKey: "features" },
    { href: "/admin/manage-complaints", label: "Manage Complaints", icon: <ShieldAlertIcon />, badgeKey: "complaints" },
    { href: "/admin/inquiries", label: "Manage Inquiries", icon: <MailQuestion />, badgeKey: "inquiries" },
    { href: "/admin/manage-leads", label: "Manage Leads", icon: <BarChart3 /> },
    { href: "/admin/manage-conversations", label: "Manage Conversations", icon: <MessageSquare /> },
    { href: "/admin/manage-directory", label: "Manage Directory", icon: <BookOpen /> },
    { href: "/admin/frontend-content", label: "Frontend Content", icon: <FileEdit /> },
    { href: "/admin/online-learning-content", label: "Online Learning Content", icon: <FileEdit /> },
    { href: "/admin/educational-partners", label: "Educational Partners", icon: <Users /> },
    { href: "/admin/manage-idea-competition", label: "Manage Idea Competition", icon: <Trophy /> },
    { href: "/admin/ambassadors", label: "Ambassadors", icon: <Users /> },
    { href: "/admin/qr-merchants", label: "QR for Merchants", icon: <QrCode /> },
    { href: "/admin/agent-magnus", label: "Agent Magnus", icon: <Cpu /> },
  ];

  const getBadgeCount = (badgeKey?: string) => {
    switch (badgeKey) {
      case "payments": return pendingPaymentRequests;
      case "features": return pendingFeatureRequests;
      case "complaints": return pendingComplaintsCount;
      case "inquiries": return pendingInquiriesCount;
      default: return undefined;
    }
  };

  return (
    <aside className="hidden md:flex fixed top-0 left-0 z-40 w-64 h-screen flex-col border-r bg-background shadow-lg">
      <div className="flex flex-col h-full">
        <div className="p-6 border-b">
          <Link href="/admin/dashboard" className="flex items-center gap-2 mb-1">
            <ShieldCheck className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold text-primary">LISTED Admin</h1>
          </Link>
          <p className="text-xs text-muted-foreground">Administration Panel</p>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
            {navLinksConfig.map((item) => (
              <SidebarLink
                key={item.label}
                href={item.href}
                icon={item.icon}
                label={item.label}
                isActive={pathname === item.href || (item.href !== "/admin/dashboard" && pathname.startsWith(item.href))}
                badgeCount={getBadgeCount(item.badgeKey)}
              />
            ))}
        </nav>

        <div className="mt-auto p-4 border-t">
           <p className="text-xs text-muted-foreground text-center">
            Access Settings &amp; Logout via the top-right user menu.
           </p>
        </div>
      </div>
    </aside>
  );
}

    