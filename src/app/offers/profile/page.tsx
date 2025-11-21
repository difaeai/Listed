
"use client";
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

// This data would typically come from a context or a hook fetching user data
const salesProfessionalUserData = {
  userName: "Aisha Khan", 
  userEmail: "aisha.k@salestars.pk", 
  avatarSrc: `https://picsum.photos/seed/AishaKhan/40/40`, // Not used directly here but good for consistency
  initials: "AK", // Not used directly here but good for consistency
};

export default function ProfilePage() {
  return (
    <>
      <Button variant="outline" asChild className="mb-4">
        <Link href="/offers"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Offers</Link>
      </Button>
      <h1 className="text-2xl font-bold">Profile</h1>
      <p className="text-muted-foreground">View and edit your profile information.</p>
      <div className="mt-8 text-center text-muted-foreground">
          <p>User profile page coming soon.</p>
          <p className="mt-2">Name: {salesProfessionalUserData.userName}</p>
          <p>Email: {salesProfessionalUserData.userEmail}</p>
      </div>
    </>
  );
}

