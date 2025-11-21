
"use client"; 

import Link from "next/link";
import { Settings, LogOut, Zap, Loader2 } from "lucide-react"; 
import { InvestorSidebar } from "@/components/nav/investor-sidebar";
import { InvestorMobileNav } from "@/components/nav/investor-mobile-nav";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import React, { ReactNode } from "react"; 
import { useRouter } from "next/navigation"; 
import { useAuth } from '@/contexts/AuthContext';
import { auth } from '@/lib/firebaseConfig'; 
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function InvestorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { currentUser: authUser, loading: authContextLoading, setCurrentAppUser } = useAuth();

  const handleLogout = async () => {
     if (auth) { 
      try {
        await auth.signOut();
      } catch (e) {
        console.error("[InvestorLayout] Firebase sign out error", e);
      }
    }
    setCurrentAppUser(null, null); 
    router.push('/auth?reason=logout_investor');
  };
  
  if (authContextLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary mr-2" />
        <p>Loading Investor Portal...</p>
      </div>
    );
  }
  
  if (!authUser) {
    return null;
  }
  
  const investorUserData = { 
    userName: authUser.name || "Investor",
    userEmail: authUser.email || "",
    avatarSeed: authUser.avatarSeed || authUser.name?.replace(/[^a-zA-Z0-9]/g, '') || authUser.email?.replace(/[^a-zA-Z0-9]/g, '') || 'InvestorDefaultSeed',
    avatarSrc: authUser.avatarDataUri || `https://picsum.photos/seed/${authUser.avatarSeed || authUser.name?.replace(/[^a-zA-Z0-9]/g, '') || authUser.email?.replace(/[^a-zA-Z0-9]/g, '') || 'InvestorDefaultSeed'}/80/80`,
    initials: (authUser.name || "I").substring(0,1).toUpperCase()
  };
  
  return (
    <div className="flex min-h-screen bg-muted/40">
      <InvestorSidebar 
        {...investorUserData} 
        onLogout={handleLogout}
      />
      
      <div className="flex-1 md:ml-64 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur-md sm:px-6">
          <div className="flex items-center">
            <div className="md:hidden mr-2">
              <InvestorMobileNav onLogout={handleLogout} />
            </div>
            {/* Redundant Logo Removed */}
          </div>

          {authUser && (
            <div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                    <Avatar className="h-10 w-10 border-2 border-primary">
                      <AvatarImage src={investorUserData.avatarSrc} alt={investorUserData.userName} data-ai-hint="profile person"/>
                      <AvatarFallback>{investorUserData.initials}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{investorUserData.userName}</p>
                      <p className="text-xs leading-none text-muted-foreground">{investorUserData.userEmail}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/investor/settings"><Settings className="mr-2 h-4 w-4" /> Account Settings</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                    <LogOut className="mr-2 h-4 w-4" /> Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </header>
        
        <main className="flex-1 p-6 md:p-10 overflow-y-auto">
          {children}
        </main>
        
        <footer className="text-center p-4 border-t text-sm text-muted-foreground bg-background">
          © {new Date().getFullYear()} LISTED. All rights reserved.
        </footer>
      </div>
    </div>
  );
}
