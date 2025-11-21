
"use client";

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { ConditionalPublicNavbarWrapper, ConditionalPublicFooterWrapper } from '@/components/nav/conditional-public-nav-wrapper';
import { Toaster } from '@/components/ui/toaster';
import { useAuth } from '@/contexts/AuthContext';
import type { RegisteredUserEntry } from "@/app/auth/components/auth-shared-types"; 
import { Loader2 } from 'lucide-react';
import { auth } from '@/lib/firebaseConfig';
import { useToast } from '@/hooks/use-toast';
import { isFuture } from 'date-fns';

const ADMIN_EMAIL_ADDRESS = "hassan008khan@hotmail.com";

export function AppContentClient({ children }: { children: React.ReactNode }) {
  const { currentUser, loading: authContextLoading, firebaseUserInternal, setCurrentAppUser } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  
  useEffect(() => {
    if (authContextLoading) {
      return;
    }

    if (currentUser?.status === 'locked') {
      toast({
        title: "Account Locked",
        description: "Your account is locked. Please contact the LISTED team for assistance.",
        variant: "destructive",
        duration: 10000,
      });
      auth.signOut();
      setCurrentAppUser(null, null);
      router.replace('/auth?reason=account_locked');
      return;
    }

    const isOnAuthPage = pathname.startsWith('/auth');
    const isAdminArea = pathname.startsWith('/admin');

    if (currentUser) {
      if (currentUser.type === 'admin' && isAdminArea) {
        return;
      }
      
      let userDashboardPath = '/';
      
      if (currentUser.type === 'admin') {
        userDashboardPath = '/admin/dashboard';
      } else if (currentUser.type === 'company') {
        userDashboardPath = '/dashboard';
      } else if (currentUser.type === 'investor') {
        userDashboardPath = '/investor/dashboard';
      } else if (currentUser.type === 'professional') {
        const expiryDate = currentUser.subscriptionExpiryDate ? new Date(currentUser.subscriptionExpiryDate as string | Date) : null;
        const isSubscriptionActive = expiryDate && isFuture(expiryDate);

        const isPaymentVerificationNeeded =
          currentUser.status === 'pending_payment_verification' ||
          currentUser.status === 'payment_proof_submitted' ||
          (currentUser.status === 'active' && !isSubscriptionActive);
        
        userDashboardPath = isPaymentVerificationNeeded ? "/offers/verify-payment" : "/home";
      }

      if (isOnAuthPage) {
        router.replace(userDashboardPath);
        return; 
      }
      
      const professionalAllowedPaths = ['/home', '/offers', '/learn', '/profile', '/complaints', '/settings', '/auth'];
      const companyAllowedPaths = ['/dashboard', '/profile', '/settings', '/auth'];
      const investorAllowedPaths = ['/investor', '/profile', '/settings', '/auth'];

      let isCorrectArea = false;
      switch(currentUser.type) {
          case 'professional':
              isCorrectArea = professionalAllowedPaths.some(p => pathname.startsWith(p));
              break;
          case 'company':
              isCorrectArea = companyAllowedPaths.some(p => pathname.startsWith(p));
              break;
          case 'investor':
              isCorrectArea = investorAllowedPaths.some(p => pathname.startsWith(p));
              break;
          case 'admin':
              isCorrectArea = pathname.startsWith('/admin');
              break;
      }

      if (!isCorrectArea) {
         router.replace(userDashboardPath);
         return;
      }

    } 
    else {
      // User is NOT logged in
      const isProtectedRoute =
        pathname.startsWith('/dashboard') ||
        pathname.startsWith('/home') ||
        pathname.startsWith('/offers') ||
        pathname.startsWith('/learn') ||
        pathname.startsWith('/investor') ||
        pathname.startsWith('/admin') ||
        pathname.startsWith('/profile') ||
        pathname.startsWith('/complaints') ||
        pathname.startsWith('/settings');

      if (isProtectedRoute) { 
        router.replace(`/auth?reason=unauthorized_access_to_${pathname.split('/')[1] || 'portal'}`);
        return;
      }
    }
  }, [currentUser, authContextLoading, pathname, router, toast, setCurrentAppUser]);

  if (authContextLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">
          Initializing LISTED...
        </p>
      </div>
    );
  }
  
  return (
    <>
      <ConditionalPublicNavbarWrapper />
      <main className="flex-grow">
        {children}
      </main>
      <ConditionalPublicFooterWrapper />
      <Toaster />
    </>
  );
}
