

"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { PaymentVerificationCard } from '@/components/auth/payment-verification';
import { Loader2 } from 'lucide-react';
import type { RegisteredUserEntry, UserStatus } from '@/app/auth/components/auth-shared-types';
import { auth, db } from '@/lib/firebaseConfig';
import { Dialog, DialogContent as MotivationDialogContent, DialogDescription as MotivationDialogDescription, DialogHeader as MotivationDialogHeader, DialogTitle as MotivationDialogTitle, DialogFooter as MotivationDialogFooter, DialogClose, DialogPortal, DialogOverlay } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Zap, X } from 'lucide-react';
import Link from 'next/link';
import { ScrollArea } from '@/components/ui/scroll-area';
import { doc, getDoc } from "firebase/firestore";

interface LaunchpadPricing {
  silver: number;
  gold: number;
  platinum: number;
  royal: number;
  dollarRate: number;
  currencySymbol: string;
}

export default function VerifyPaymentPageContainer() {
  const { currentUser, setCurrentAppUser, loading } = useAuth();
  const router = useRouter();
  const [pricing, setPricing] = useState<LaunchpadPricing | null>(null);

  const handleVerificationStatusChange = (newStatus: UserStatus, updatedUserDetails?: Partial<RegisteredUserEntry>) => {
    if (currentUser && auth.currentUser) {
      const updatedUser = { ...currentUser, status: newStatus, ...updatedUserDetails };
      setCurrentAppUser(updatedUser, auth.currentUser);
    }
  };

  const [isMonthlyWarningDialogOpen, setIsMonthlyWarningDialogOpen] = useState(false);

  useEffect(() => {
    const fetchPricing = async () => {
      if (!db) return;
      const pricingDocRef = doc(db, "siteContent", "launchpadPricing");
      const docSnap = await getDoc(pricingDocRef);
      if (docSnap.exists()) {
        setPricing(docSnap.data() as LaunchpadPricing);
      } else {
        // Fallback to some default if not found
        setPricing({ silver: 10, gold: 13, platinum: 16, royal: 18, dollarRate: 283, currencySymbol: '$' });
      }
    };
    fetchPricing();
  }, []);

  if (loading || !pricing) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary mr-2" />
        <p>Loading Your Subscription Status...</p>
      </div>
    );
  }

  if (!currentUser || currentUser.type !== 'professional') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Access Denied. This page is for professional users.</p>
      </div>
    );
  }

  return (
    <>
      <PaymentVerificationCard
        currentUser={currentUser}
        onVerificationStatusChange={handleVerificationStatusChange}
        onMonthlyPlanSelect={() => setIsMonthlyWarningDialogOpen(true)}
        pricing={pricing}
      />
      <MonthlyWarningDialog open={isMonthlyWarningDialogOpen} onOpenChange={setIsMonthlyWarningDialogOpen} />
    </>
  );
}


const MonthlyWarningDialog = ({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) => (
    <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogPortal>
            <DialogOverlay />
            <MotivationDialogContent className="sm:max-w-md max-h-[80vh] w-[90vw] p-0 flex flex-col border-primary shadow-2xl">
                <MotivationDialogHeader className="p-4 pb-0 text-center">
                    <div className="flex justify-center mb-2">
                        <Zap className="h-10 w-10 text-primary" />
                    </div>
                    <MotivationDialogTitle className="text-2xl font-bold text-center text-red-600">Important Announcement</MotivationDialogTitle>
                </MotivationDialogHeader>
                <div className="relative p-6 pt-2 flex-grow overflow-hidden">
                     <DialogClose className="absolute top-2 right-2 rounded-sm p-1 opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
                        <X className="h-5 w-5" />
                        <span className="sr-only">Close</span>
                    </DialogClose>
                    <ScrollArea className="h-full">
                        <div className="space-y-4 text-center text-muted-foreground pr-4">
                           <p>Angels and Institutional Investors don’t just look at your idea—they look at your commitment. Being on a Monthly plan signals that you’re still not sure enough about your future, while a Yearly subscription instantly sets you apart as a serious, investment-ready founder.</p>
                           <p>On LISTED, we’ve intentionally kept <strong className="text-red-600">Yearly slots limited</strong> to maintain a high-quality network of startups that investors can trust and fund.</p>
                           <p>The risk is on the investors, not on you—your only challenge is to trust your dream and execute it with conviction.</p>
                           <p>Every successful founder knows that one decisive step can change everything—and this is yours. Upgrading to Yearly is not just an upgrade; it’s a declaration that you’re here to build, scale, and secure investor attention. Don’t let hesitation or a short-term mindset hold you back. The opportunity is limited, the investors are watching, and your next big move starts with a single click. Upgrade to Yearly now and step into the circle of founders who get funded!</p>
                        </div>
                    </ScrollArea>
                </div>
                <MotivationDialogFooter className="flex flex-col gap-2 p-6 pt-4 border-t sm:flex-row">
                    <Button asChild className="w-full sm:w-auto bg-primary hover:bg-primary/90" onClick={() => onOpenChange(false)}>
                       <Link href="/offers/verify-payment">Upgrade to Yearly Now</Link>
                    </Button>
                    <DialogClose asChild>
                       <Button variant="outline" className="w-full sm:w-auto">Close</Button>
                    </DialogClose>
                </MotivationDialogFooter>
            </MotivationDialogContent>
        </DialogPortal>
    </Dialog>
);
