
"use client";

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

export default function MyProfileRedirectPage() {
  const { currentUser, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (currentUser && currentUser.uid) {
        // We have a logged-in user, redirect to their dynamic profile page
        router.replace(`/profile/${currentUser.uid}`);
      } else {
        // No user is logged in, redirect to the auth page
        router.replace('/auth?reason=unauthorized_profile');
      }
    }
  }, [currentUser, loading, router]);

  // Display a loading state while we wait for the redirect to happen
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary mr-2" />
      <p>Loading your profile...</p>
    </div>
  );
}
