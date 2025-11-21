
"use client"; 

import Link from "next/link";
import { LogOut, Zap, Loader2, Megaphone } from "lucide-react"; 
import { SalesProfessionalSidebar } from "@/components/nav/sales-professional-sidebar";
import { SalesProfessionalMobileNav } from "@/components/nav/sales-professional-mobile-nav";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import React, { ReactNode, useState, useEffect, useMemo } from "react"; 
import { useRouter, usePathname } from "next/navigation"; 
import { cn } from "@/lib/utils";
import { CountdownTimer } from '@/components/common/countdown-timer'; 
import { useAuth } from "@/contexts/AuthContext"; 
import { auth } from '@/lib/firebaseConfig'; 
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Settings } from 'lucide-react';
import { isFuture } from 'date-fns';
import { MonthlyMotivationModal } from '@/components/common/monthly-motivation-modal';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { Timestamp } from "firebase/firestore";


export default function SalesProfessionalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { currentUser: authUser, loading: authContextLoading, setCurrentAppUser } = useAuth(); 

  const handleLogout = async () => {
    if (auth) { 
      try { await auth.signOut(); } catch (e) { console.error("[OffersLayout] Firebase sign out error", e); }
    }
    setCurrentAppUser(null, null); 
    router.push('/auth?reason=logout_successful'); 
  };
  
  const hasAnnualSubscription = useMemo(() => {
    if (!authUser || authUser.type !== 'professional' || authUser.status !== 'active') return false;
    if (authUser.subscriptionType !== 'yearly') return false;
    if (!authUser.subscriptionExpiryDate) return false;
    const expiryDate = authUser.subscriptionExpiryDate instanceof Timestamp 
      ? authUser.subscriptionExpiryDate.toDate() 
      : new Date(authUser.subscriptionExpiryDate as string | Date);
    return isFuture(expiryDate);
  }, [authUser]);

  if (authContextLoading) { 
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary mr-2" />
        <p>Loading User Portal...</p>
      </div>
    );
  }

  if (!authUser) {
    return null;
  }
  
  const salesProfessionalUserData = {
    userName: authUser.name || "User",
    userEmail: authUser.email || "",
    avatarSeed: authUser.avatarSeed || authUser.name?.replace(/[^a-zA-Z0-9]/g, '') || authUser.email?.replace(/[^a-zA-Z0-9]/g, '') || 'UserDefaultSeed',
    avatarSrc: authUser.avatarDataUri || `https://picsum.photos/seed/${authUser.avatarSeed || authUser.name?.replace(/[^a-zA-Z0-9]/g, '') || authUser.email?.replace(/[^a-zA-Z0-9]/g, '') || 'UserDefaultSeed'}/80/80`,
    initials: (authUser.name || "U").substring(0,1).toUpperCase()
  };

  const isSubscriptionActive = authUser.status === 'active' && authUser.subscriptionExpiryDate && isFuture(new Date(authUser.subscriptionExpiryDate as string | Date));
  
  const isAccessRestricted = 
    authUser.status === 'pending_payment_verification' || 
    authUser.status === 'payment_proof_submitted' || 
    (authUser.status === 'active' && !isSubscriptionActive);
  
  const shouldBlurContent = isAccessRestricted && pathname !== '/offers/verify-payment';

  let alertMessage = null;
  if (isAccessRestricted && pathname !== '/offers/verify-payment') {
      if(authUser.status === 'active' && !isSubscriptionActive) {
          alertMessage = "Your subscription has expired. Please renew your plan to regain access to all features.";
      } else {
          alertMessage = "Your account requires payment verification to access premium features.";
      }
  }


  return (
    <>
      <div className="flex min-h-screen bg-muted/40">
        <SalesProfessionalSidebar 
          {...salesProfessionalUserData} 
          onLogout={handleLogout}
          className={cn(shouldBlurContent && "blur-sm pointer-events-none")}
          subscriptionType={authUser.subscriptionType}
          subscriptionStatus={authUser.status}
          subscriptionExpiryDate={authUser.subscriptionExpiryDate}
          isAccessRestricted={isAccessRestricted}
          hasAnnualSubscription={hasAnnualSubscription}
        />
        
        <div className={cn("flex-1 md:ml-64 flex flex-col min-w-0")}>
          <header className={cn("sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur-md sm:px-6", shouldBlurContent && "blur-sm pointer-events-none")}>
            <div className="flex items-center">
              <div className="md:hidden mr-2">
                <SalesProfessionalMobileNav 
                  onLogout={handleLogout}
                  subscriptionType={authUser.subscriptionType}
                  subscriptionStatus={authUser.status}
                  subscriptionExpiryDate={authUser.subscriptionExpiryDate}
                  isAccessRestricted={isAccessRestricted}
                  hasAnnualSubscription={hasAnnualSubscription}
                />
              </div>
              <Link href="/offers" className="flex items-center gap-2">
                <Zap className="h-7 w-7 text-primary" />
                <h1 className="text-xl font-semibold text-foreground hidden sm:block">LISTED</h1>
              </Link>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar className="h-10 w-10 border-2 border-primary">
                    <AvatarImage src={salesProfessionalUserData.avatarSrc} alt={salesProfessionalUserData.userName} data-ai-hint="profile person"/>
                    <AvatarFallback>{salesProfessionalUserData.initials}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-64" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{salesProfessionalUserData.userName}</p>
                    <p className="text-xs leading-none text-muted-foreground">{salesProfessionalUserData.userEmail}</p>
                    {authUser.status === 'active' && authUser.subscriptionType === 'monthly' && authUser.subscriptionExpiryDate && new Date(authUser.subscriptionExpiryDate as string | Date) > new Date() && (
                        <div className="text-xs text-primary mt-1">
                            <CountdownTimer expiryDate={authUser.subscriptionExpiryDate as string} prefix="Renews in: " className="font-medium" displayMode="daysOnly"/>
                        </div>
                    )}
                    {authUser.status === 'active' && authUser.subscriptionType === 'yearly' && (
                        <div className="text-xs text-accent mt-1 font-medium">Yearly Plan Active</div>
                    )}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild disabled={isAccessRestricted}>
                  <Link href="/offers/settings" className={cn(isAccessRestricted && "pointer-events-none text-muted-foreground")}>
                      <Settings className="mr-2 h-4 w-4" /> Account Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" /> Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </header>
          
          <main className={cn("flex-1 p-6 md:p-10 overflow-y-auto relative")}>
             {shouldBlurContent && (
                <div className="absolute inset-0 z-20 backdrop-blur-sm flex items-center justify-center p-4">
                     <Alert variant="destructive" className="max-w-md mx-auto shadow-lg">
                        <AlertTriangle className="h-5 w-5" />
                        <AlertTitle>Action Required</AlertTitle>
                        <AlertDescription>
                            {alertMessage}
                             <Button asChild variant="link" className="p-0 h-auto ml-1 text-destructive font-bold">
                                <Link href="/offers/verify-payment">Go to Subscription Page</Link>
                            </Button>
                        </AlertDescription>
                    </Alert>
                </div>
            )}
            <div className={cn(shouldBlurContent && "pointer-events-none")}>
                {children}
            </div>
          </main>
          
          <footer className={cn("text-center p-4 border-t text-sm text-muted-foreground bg-background", shouldBlurContent && "blur-sm pointer-events-none")}>
            © {new Date().getFullYear()} LISTED. All rights reserved.
          </footer>
        </div>
      </div>
      
      <MonthlyMotivationModal />
    </>
  );
}
