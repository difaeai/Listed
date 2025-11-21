
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
import { LogOut, Settings, Home, FileText, Users, BarChart3, MessageSquare, BookOpen, Menu, Zap, Handshake, Lightbulb, Share2, Award, UserPlus, ShieldAlert, DollarSign, Star } from "lucide-react"; 
import React from "react"; 
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { UserStatus } from "@/app/auth/components/auth-shared-types";
import { Timestamp } from "firebase/firestore";
import { cn } from "@/lib/utils";

interface SalesProfessionalMobileNavProps {
  onLogout: () => void;
  subscriptionType?: 'monthly' | 'yearly' | null;
  subscriptionStatus?: UserStatus;
  subscriptionExpiryDate?: string | Date | Timestamp | null;
  isAccessRestricted?: boolean;
  hasAnnualSubscription?: boolean;
}

interface MobileNavLinkProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  badgeCount?: number;
  disabled?: boolean;
  isAccessRestricted?: boolean;
  isPremium?: boolean;
  hasAnnualSubscription?: boolean;
}

function MobileNavLink({ href, icon, label, badgeCount, disabled = false, isAccessRestricted = false, isPremium = false, hasAnnualSubscription = false }: MobileNavLinkProps) { 
  const content = (
    <>
      {React.cloneElement(icon as React.ReactElement, { className: "h-5 w-5 text-muted-foreground" })}
      <span>{label}</span>
      {isPremium && !hasAnnualSubscription && <Star className="h-4 w-4 text-yellow-500 ml-auto" />}
      {badgeCount && badgeCount > 0 && (
        <span className="ml-auto inline-flex items-center justify-center px-2 h-5 text-xs font-semibold leading-none text-red-100 bg-red-600 rounded-full">
          {badgeCount}
        </span>
      )}
    </>
  );
  
  let tooltipMessage = "This feature is currently unavailable.";
  if (isPremium && !hasAnnualSubscription) {
    tooltipMessage = "This is a premium feature available only to Annual subscribers.";
  } else if (isAccessRestricted) {
    tooltipMessage = "Your subscription is not active. Please resolve it on the Subscription page.";
  }

  if (disabled) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground/50 cursor-not-allowed">
              {React.cloneElement(icon as React.ReactElement, { className: "h-5 w-5" })}
              <span>{label}</span>
              {isPremium && !hasAnnualSubscription && <Star className="h-4 w-4 text-yellow-500 ml-auto" />}
            </div>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p className="text-sm">{tooltipMessage}</p>
            <Link href="/offers/verify-payment" className="text-primary hover:underline text-xs block mt-1 text-center">
              Go to Subscription
            </Link>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
    >
      {content}
    </Link>
  );
}

const navLinksConfig = [
  { href: "/offers", label: "Home", icon: Home },
  { href: "/offers/my-ads", label: "My Funding Pitches", icon: Lightbulb },
  { href: "/offers/find-investor", label: "Find Investor", icon: Users },
  { href: "/offers/my-sales", label: "Generate Revenue", icon: DollarSign },
  { href: "/offers/sales-partners", label: "Sales Partners", icon: Handshake },
  { href: "/offers/conversations", label: "Conversation", icon: MessageSquare },
  { href: "/offers/co-founder", label: "Co-Founder Network", icon: UserPlus, isPremium: true },
  { href: "/offers/business-leads", label: "Premium Business Leads", icon: BarChart3, isPremium: true },
  { href: "/offers/business-model-directory", label: "Business Model Directory", icon: BookOpen, isPremium: true },
  { href: "/offers/verify-payment", label: "Subscription", icon: Award },
  { href: "/offers/complaints", label: "My Complaints", icon: ShieldAlert },
];

export function SalesProfessionalMobileNav({ onLogout, subscriptionStatus, isAccessRestricted, hasAnnualSubscription = false }: SalesProfessionalMobileNavProps) {
  
  const standardLinks = navLinksConfig.filter(link => !link.isPremium);
  const premiumLinks = navLinksConfig.filter(link => link.isPremium);
  const finalNavLinks = hasAnnualSubscription ? navLinksConfig : [...standardLinks, ...premiumLinks];

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
           <Link href="/offers" className="flex items-center gap-2 mb-1">
            <Zap className="h-7 w-7 text-primary" />
            <SheetTitle className="text-xl font-bold text-primary">LISTED</SheetTitle>
          </Link>
        </SheetHeader>
        <ScrollArea className="flex-1">
          <nav className="py-4 px-2 space-y-1">
            {finalNavLinks.map((item) => {
              const isSubscriptionPage = item.href === '/offers/verify-payment';
              const isDisabledByRestriction = isAccessRestricted ? !isSubscriptionPage : (item.isPremium && !hasAnnualSubscription);
              return (
                <SheetClose asChild key={item.label}>
                  <MobileNavLink
                    href={item.href}
                    icon={<item.icon />}
                    label={item.label}
                    disabled={isDisabledByRestriction}
                    isAccessRestricted={isAccessRestricted}
                    isPremium={item.isPremium}
                    hasAnnualSubscription={hasAnnualSubscription}
                  />
                </SheetClose>
              );
            })}
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
