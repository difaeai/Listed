
"use client";
import React from 'react'; 
import { useAuth } from '@/contexts/AuthContext'; 
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { currentUser: authUser, loading: authContextLoading } = useAuth();
  const router = useRouter();

  if (authContextLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary mr-2" />
        <p>Loading profile...</p>
      </div>
    );
  }

  // If loading is finished and there's still no user, AppContentClient handles redirecting from protected routes.
  // This layout simply needs to pass children through if a user *is* present,
  // because the parent layout (e.g., /offers/layout) will handle the navbar and footer.
  // This layout becomes a simple pass-through to avoid duplicating navbars.
  return <>{children}</>;
}
