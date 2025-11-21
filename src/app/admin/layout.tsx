
"use client";

import Link from "next/link";
import { Settings, LogOut, ShieldCheck, Zap, User as UserIconStd, Menu as MenuIcon, Loader2, ShieldAlert } from "lucide-react"; 
import { AdminSidebar } from "@/components/nav/admin-sidebar";
import { AdminMobileNav } from "@/components/nav/admin-mobile-nav";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import React, { useEffect, useState, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from '@/contexts/AuthContext';
import { auth, db } from '@/lib/firebaseConfig';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { RegisteredUserEntry } from '@/app/auth/components/auth-shared-types';
import { collection, query, where, onSnapshot, Unsubscribe, orderBy, Timestamp } from "firebase/firestore"; 

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { currentUser: authUser, loading: authContextLoading, setCurrentAppUser } = useAuth();
  
  const [pendingPaymentRequestsCount, setPendingPaymentRequestsCount] = useState(0);
  const [pendingFeatureRequestsCount, setPendingFeatureRequestsCount] = useState(0);
  const [pendingComplaintsCount, setPendingComplaintsCount] = useState(0); 
  const [pendingInquiriesCount, setPendingInquiriesCount] = useState(0); 
  
  useEffect(() => {
    // This effect is for fetching badge counts and is safe.
    if (!authUser?.uid || authUser.type !== 'admin' || !db) {
      setPendingPaymentRequestsCount(0);
      setPendingFeatureRequestsCount(0);
      setPendingComplaintsCount(0);
      setPendingInquiriesCount(0);
      return;
    }
    
    const unsubs: Unsubscribe[] = [];

    const paymentQuery = query(collection(db, "users"), where("type", "==", "professional"), where("status", "==", "payment_proof_submitted"));
    const featureQuery = query(collection(db, "fundingPitches"), where("featureStatus", "==", "pending_approval"), where("isDeletedByAdmin", "==", false));
    const complaintsQuery = query(collection(db, "complaints"), where("status", "==", "Pending"));
    const inquiriesQuery = query(collection(db, "inquiries"), where("status", "==", "New"), where("isDeletedByAdmin", "==", false));

    unsubs.push(onSnapshot(paymentQuery, s => setPendingPaymentRequestsCount(s.size), e => console.error("Payment req count error:", e)));
    unsubs.push(onSnapshot(featureQuery, s => setPendingFeatureRequestsCount(s.size), e => console.error("Feature req count error:", e)));
    unsubs.push(onSnapshot(complaintsQuery, s => setPendingComplaintsCount(s.size), e => console.error("Complaints count error:", e)));
    unsubs.push(onSnapshot(inquiriesQuery, s => setPendingInquiriesCount(s.size), e => console.error("Inquiries count error:", e)));

    return () => unsubs.forEach(unsub => unsub());
  }, [authUser?.uid, authUser?.type]); 

  const handleLogout = async () => {
     if (auth) { await auth.signOut().catch(e => console.error("Firebase sign out error for admin path", e)); }
     setCurrentAppUser(null, null); 
     router.push('/auth?reason=logout_admin');
  };
  
  if (authContextLoading) {
      return (
          <div className="flex min-h-screen items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-2">Verifying Admin Access...</p>
          </div>
      );
  }

  // If loading is complete, but there's no user or the user is not an admin,
  // the AppContentClient component will handle the redirect.
  // This prevents this layout from rendering anything and avoids layout flashes.
  if (!authUser || authUser.type !== 'admin') {
      return null;
  }
  
  const adminUserData = { 
    name: authUser.name || (authUser.email === "hassan008khan@hotmail.com" ? "Super Admin" : "Admin User"), 
    email: authUser.email || "admin@listed.com.pk", 
    avatarSeed: authUser.avatarSeed || (authUser.name || authUser.email || "AdminAvatarListed"),
    avatarSrc: authUser.avatarDataUri || `https://picsum.photos/seed/${authUser.avatarSeed || authUser.name || authUser.email || "AdminAvatarListed"}/80/80`,
    initials: ((authUser.name || (authUser.email === "hassan008khan@hotmail.com" ? "SA" : "AU")).substring(0,2) || "A").toUpperCase()
  };
  
  return (
    <div className="flex min-h-screen bg-muted/40">
      <AdminSidebar
        pendingPaymentRequests={pendingPaymentRequestsCount}
        pendingFeatureRequests={pendingFeatureRequestsCount}
        pendingComplaintsCount={pendingComplaintsCount}
        pendingInquiriesCount={pendingInquiriesCount} 
        onLogout={handleLogout}
      />

      <div className="md:ml-64 flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur-md sm:px-6">
          <div className="flex items-center">
            <div className="md:hidden mr-2">
              <AdminMobileNav
                pendingPaymentRequests={pendingPaymentRequestsCount}
                pendingFeatureRequests={pendingFeatureRequestsCount}
                pendingComplaintsCount={pendingComplaintsCount}
                pendingInquiriesCount={pendingInquiriesCount} 
                onLogout={handleLogout}
              />
            </div>
            {/* The redundant header logo has been removed */}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                <Avatar className="h-10 w-10 border-2 border-primary">
                  <AvatarImage src={adminUserData.avatarSrc} alt={adminUserData.name} data-ai-hint="admin avatar"/>
                  <AvatarFallback>{adminUserData.initials}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{adminUserData.name}</p>
                  <p className="text-xs leading-none text-muted-foreground">{adminUserData.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/admin/settings"><Settings className="mr-2 h-4 w-4" /> Admin Settings</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" /> Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {children}
        </main>

        <footer className="text-center p-4 border-t text-sm text-muted-foreground bg-background">
          © {new Date().getFullYear()} LISTED Admin Portal.
        </footer>
      </div>
    </div>
  );
}
