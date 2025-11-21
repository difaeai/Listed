
"use client"; 

import Link from "next/link";
import { Settings, LogOut, Zap, Loader2 } from "lucide-react"; 
import { DashboardSidebar } from "@/components/nav/dashboard-sidebar";
import React, { ReactNode } from "react"; 
import { useRouter } from "next/navigation"; 
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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

export default function CorporationDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { currentUser: authUser, loading: authContextLoading, setCurrentAppUser } = useAuth();

  const handleLogout = async () => {
     if (auth) { 
      try { await auth.signOut(); } catch (e) { console.error("[CorpLayout] Firebase sign out error", e); }
    }
    setCurrentAppUser(null, null); 
    router.push('/auth?reason=logout_corp');
  };
  
  if (authContextLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary mr-2" />
        <p>Loading Corporation Dashboard...</p>
      </div>
    );
  }
  
  if (!authUser) {
    return null;
  }
  
  const corporationUserData = { 
    userName: authUser.corporationName || authUser.name || "Corporation",
    userEmail: authUser.email || "",
    avatarSeed: authUser.avatarSeed || authUser.corporationName?.replace(/[^a-zA-Z0-9]/g, '') || authUser.name?.replace(/[^a-zA-Z0-9]/g, '') || 'CorpDefaultSeed',
    avatarSrc: authUser.avatarDataUri || `https://picsum.photos/seed/${authUser.avatarSeed || authUser.corporationName?.replace(/[^a-zA-Z0-9]/g, '') || authUser.name?.replace(/[^a-zA-Z0-9]/g, '') || 'CorpDefaultSeed'}/80/80`,
    initials: (authUser.corporationName || authUser.name || "C").substring(0,1).toUpperCase()
  };
  
  return (
    <div className="flex min-h-screen bg-muted/40">
      <DashboardSidebar 
        onLogout={handleLogout}
      /> 
      <div className="flex-1 md:ml-64 flex flex-col min-w-0"> 
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur-md sm:px-6 print:hidden">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-foreground hidden sm:block">
              Corporation Dashboard
            </h2>
          </div>
          <div className="flex items-center gap-3">
             <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar className="h-10 w-10 border-2 border-primary">
                    <AvatarImage src={corporationUserData.avatarSrc} alt={corporationUserData.userName} data-ai-hint="profile person"/>
                    <AvatarFallback>{corporationUserData.initials}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{corporationUserData.userName}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      Corporation
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                    <Link href="/dashboard/settings"><Settings className="mr-2 h-4 w-4" /> Business Settings</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" /> Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="flex-1 p-6 md:p-10 overflow-auto">
          {children}
        </main>
         <footer className="text-center p-4 border-t text-sm text-muted-foreground bg-background">
          © {new Date().getFullYear()} LISTED Corporation Portal.
        </footer>
      </div>
    </div>
  );
}
