
"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UserProfileDialog } from '@/components/common/user-profile-dialog';
import { useAuth } from '@/contexts/AuthContext';

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const userId = decodeURIComponent(params.userId as string); 
  const { currentUser: authUser, loading: authLoading } = useAuth();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    // Open the dialog as soon as the component mounts and we have a userId
    if (userId) {
      setIsDialogOpen(true);
    }
  }, [userId]);

  const handleDialogChange = (open: boolean) => {
    setIsDialogOpen(open);
    // If the dialog is closed, navigate back
    if (!open) {
      router.back();
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary mr-2" />
        <p>Loading profile...</p>
      </div>
    );
  }

  // The dialog will handle its own loading and data fetching.
  // This page component's main job is to trigger the dialog.
  return (
    <>
      <div className="container mx-auto py-8 px-4 md:px-6">
         {/* Fallback content in case the dialog logic needs a background */}
         <Button variant="outline" onClick={() => router.back()} className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
         </Button>
         <p>Loading user profile...</p>
      </div>
      
      {/* The main functionality is now handled by the self-contained dialog */}
      {userId && (
        <UserProfileDialog
          userId={userId}
          isOpen={isDialogOpen}
          onOpenChange={handleDialogChange}
          currentLoggedInUser={authUser}
        />
      )}
    </>
  );
}
