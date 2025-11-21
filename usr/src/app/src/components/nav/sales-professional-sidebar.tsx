
"use client";

import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Home, FileText, Users, BarChart3, MessageSquare, BookOpen, Settings, LogOut, Briefcase, Zap, Handshake, Lightbulb, Share2, Award, UserPlus, ShieldAlert, DollarSign, Clock, Star } from "lucide-react"; 
import { usePathname } from "next/navigation"; 
import { cn } from "@/lib/utils";
import React from "react"; 
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { RegisteredUserEntry, UserStatus } from "@/app/auth/components/auth-shared-types";
import { Timestamp } from "firebase/firestore";
import { CountdownTimer } from '@/components/common/countdown-timer';

interface SalesProfessionalSidebarProps extends React.HTMLAttributes<HTMLElement> {
  userName: string;
  userEmail: string;
  avatarSrc: string;
  initials: string;
  onLogout: () => void;
  subscriptionType: 'monthly' | 'yearly' | null | undefined;
  subscriptionStatus: UserStatus | undefined;
  subscriptionExpiryDate: string | Date | Timestamp | null | undefined;
  isAccessRestricted?: boolean;
  hasAnnualSubscription?: boolean;
}

interface SidebarLinkProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  isActive?: boolean;
  badgeCount?: number; 
  disabled?: boolean;
  isAccessRestricted?: boolean;
  isPremium?: boolean;
  hasAnnualSubscription?: boolean;
}

function SidebarLink({ href, icon, label, isActive = false, badgeCount, disabled = false, isAccessRestricted = false, isPremium = false, hasAnnualSubscription = false }: SidebarLinkProps) {
  const content = (
    <>
      {React.cloneElement(icon as React.ReactElement, { className: "h-5 w-5" })}
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
            <div className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground/50 cursor-not-allowed">
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

const navLinksConfig = [
  { href: "/offers", label: "Home", icon: <Home /> },
  { href: "/offers/my-ads", label: "My Funding Pitches", icon: <Lightbulb /> },
  { href: "/offers/find-investor", label: "Find Investor", icon: <Users /> },
  { href: "/offers/my-sales", label: "Generate Revenue", icon: <DollarSign /> },
  { href: "/offers/sales-partners", label: "Sales Partners", icon: <Handshake /> },
  { href: "/offers/conversations", label: "Conversation", icon: <MessageSquare /> },
  { href: "/offers/co-founder", label: "Co-Founder Network", icon: <UserPlus />, isPremium: true },
  { href: "/offers/business-leads", label: "Premium Business Leads", icon: <BarChart3 />, isPremium: true },
  { href: "/offers/business-model-directory", label: "Business Model Directory", icon: <BookOpen />, isPremium: true },
  { href: "/offers/verify-payment", label: "Subscription", icon: <Award /> },
  { href: "/offers/complaints", label: "My Complaints", icon: <ShieldAlert /> },
];

export function SalesProfessionalSidebar({
  userName, 
  userEmail, 
  avatarSrc, 
  initials, 
  onLogout, 
  className,
  subscriptionType,
  subscriptionStatus,
  subscriptionExpiryDate,
  isAccessRestricted,
  hasAnnualSubscription = false,
  ...props
}: SalesProfessionalSidebarProps) {
  const pathname = usePathname();
  
  const isAnyActiveSubscription = subscriptionStatus === 'active' &&
      subscriptionExpiryDate &&
      (new Date(subscriptionExpiryDate as string | Date) > new Date());
      
  const standardLinks = navLinksConfig.filter(link => !link.isPremium);
  const premiumLinks = navLinksConfig.filter(link => link.isPremium);

  const finalNavLinks = hasAnnualSubscription ? navLinksConfig : [...standardLinks, ...premiumLinks];

  return (
    <aside 
      className={cn("hidden md:flex fixed top-0 left-0 z-40 w-64 h-screen flex-col border-r bg-background shadow-lg", className)}
      {...props}
    >
      <div className="flex flex-col h-full">
        <div className="p-6 border-b">
          <Link href="/offers" className="flex items-center gap-2 mb-1">
            <Zap className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold text-primary">LISTED</h1>
          </Link>
          <p className="text-xs text-muted-foreground">User Portal</p>
        </div>

        <ScrollArea className="flex-1 py-4">
          <nav className="px-4 space-y-1">
            {finalNavLinks.map((item) => {
              const isSubscriptionPage = item.href === '/offers/verify-payment';
              const isDisabledByRestriction = isAccessRestricted ? !isSubscriptionPage : (item.isPremium && !hasAnnualSubscription);

              return (
                <SidebarLink
                  key={item.label}
                  href={item.href}
                  icon={item.icon}
                  label={item.label}
                  isActive={pathname === item.href || (item.href !== "/offers" && pathname.startsWith(item.href))}
                  disabled={isDisabledByRestriction}
                  isAccessRestricted={isAccessRestricted}
                  isPremium={item.isPremium}
                  hasAnnualSubscription={hasAnnualSubscription}
                />
              );
            })}
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
