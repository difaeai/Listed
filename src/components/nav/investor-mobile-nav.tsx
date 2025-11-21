
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
import { TrendingUp, LayoutList, MessageSquare, DollarSign, Menu, Briefcase, Store, ShieldAlert } from "lucide-react"; 
import React from "react"; 

interface InvestorMobileNavProps {
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
      className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
    >
      {content}
    </Link>
  );
}

export function InvestorMobileNav({ onLogout }: InvestorMobileNavProps) {

  const navLinks = [
    { href: "/investor/dashboard", label: "Home (Trending Startups)", icon: TrendingUp },
    { href: "/investor/opportunities", label: "Investment Opportunities", icon: LayoutList }, 
    { href: "/investor/my-investments", label: "My Portfolio", icon: DollarSign }, 
    { href: "/investor/franchise-opportunities", label: "Franchise Opportunities", icon: Store }, 
    { href: "/investor/requests", label: "Messages", icon: MessageSquare },
    { href: "/investor/complaints", label: "My Complaints", icon: ShieldAlert },
  ];

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Open navigation menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[300px] sm:w-[350px] p-0 flex flex-col">
        <SheetHeader className="p-4 border-b">
           <Link href="/investor/dashboard" className="flex items-center gap-2 mb-1">
            <Briefcase className="h-7 w-7 text-primary" />
            <SheetTitle className="text-xl font-bold text-primary">LISTED</SheetTitle>
          </Link>
          <p className="text-xs text-muted-foreground text-left pl-1">Investor Portal</p>
        </SheetHeader>
        <ScrollArea className="flex-1">
          <nav className="py-4 px-2 space-y-1">
            {navLinks.map((item) => (
              <SheetClose asChild key={item.label}>
                 <MobileNavLink
                  href={item.href}
                  icon={<item.icon />}
                  label={item.label}
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
