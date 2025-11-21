
"use client";

import Link from "next/link";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LogOut, Home, Briefcase, Lightbulb, Users, BarChart3, MessageSquare, BookOpen, Settings, Menu, ShieldCheck, FileEdit, DollarSign, Star, ShieldAlert as ShieldAlertIcon, MailQuestion, QrCode, Bell, Cpu, Trophy } from "lucide-react";
import React from "react";

interface AdminMobileNavProps {
  pendingPaymentRequests?: number;
  pendingFeatureRequests?: number;
  pendingComplaintsCount?: number;
  pendingInquiriesCount?: number;
  onLogout: () => void;
}

interface MobileNavLinkProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  badgeCount?: number;
}

function MobileNavLink({ href, icon, label, badgeCount }: MobileNavLinkProps) {
  const content = (
    <>
      {React.cloneElement(icon as React.ReactElement, { className: "h-5 w-5 text-muted-foreground" })}
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
      className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors w-full"
    >
      {content}
    </Link>
  );
}

export function AdminMobileNav({
  pendingPaymentRequests,
  pendingFeatureRequests,
  pendingComplaintsCount,
  pendingInquiriesCount,
  onLogout
}: AdminMobileNavProps) {

  const navLinks = [
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
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Open admin navigation menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[300px] sm:w-[350px] p-0 flex flex-col">
        <SheetHeader className="p-4 border-b">
           <Link href="/admin/dashboard" className="flex items-center gap-2 mb-1">
            <ShieldCheck className="h-7 w-7 text-primary" />
            <SheetTitle className="text-xl font-bold text-primary">LISTED Admin</SheetTitle>
          </Link>
          <p className="text-xs text-muted-foreground text-left pl-1">Administration Panel</p>
        </SheetHeader>
        <ScrollArea className="flex-1">
          <nav className="py-4 px-2 space-y-1">
            {navLinks.map((item) => (
              <SheetClose asChild key={item.label}>
                 <MobileNavLink
                  href={item.href}
                  icon={item.icon}
                  label={item.label}
                  badgeCount={getBadgeCount(item.badgeKey)}
                />
              </SheetClose>
            ))}
          </nav>
        </ScrollArea>
         <div className="mt-auto p-4 border-t">
           <p className="text-xs text-muted-foreground text-center">
            Access Settings &amp; Logout via the top-right user menu.
           </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}

    