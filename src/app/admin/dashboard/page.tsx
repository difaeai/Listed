
"use client";

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Briefcase, Lightbulb, BarChart3, Activity, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebaseConfig';
import { collection, query, where, onSnapshot, Unsubscribe, getDocs, Timestamp } from "firebase/firestore";
import type { RegisteredUserEntry } from '@/app/auth/components/auth-shared-types';

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  description?: string;
  link?: string;
  linkText?: string;
}

function StatCard({ title, value, icon, description, link, linkText }: StatCardProps) {
  return (
    <Card className="shadow-md hover:shadow-lg transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {React.cloneElement(icon as React.ReactElement, { className: "h-5 w-5 text-primary" })}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && <p className="text-xs text-muted-foreground pt-1">{description}</p>}
      </CardContent>
      {link && linkText && (
        <CardFooter>
            <Button variant="outline" size="sm" asChild>
                <Link href={link}>{linkText}</Link>
            </Button>
        </CardFooter>
      )}
    </Card>
  );
}

interface AdminStats {
  totalCorporations: number;
  totalStartups: number; // Renamed from totalSalesProfessionals
  totalInvestors: number;
  activeOffers: number; 
  totalFundingPitches: number; 
  totalLeadsGenerated: number; 
  pendingIssues: number; 
  pendingComplaints: number; // New field for pending complaints
}

export default function AdminDashboardPage() {
  const { currentUser: adminUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const [adminStats, setAdminStats] = useState<AdminStats>({
    totalCorporations: 0,
    totalStartups: 0, // Renamed
    totalInvestors: 0,
    activeOffers: 0,
    totalFundingPitches: 0,
    totalLeadsGenerated: 0,
    pendingIssues: 1, 
    pendingComplaints: 0, // Initialize new field
  });
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    if (!adminUser || adminUser.type !== 'admin') {
      console.log("[AdminDashboard] Not an admin or user not loaded. Redirecting.");
      router.push("/auth");
      return;
    }
    
    if (!db) {
        console.error("[AdminDashboard] Firestore (db) is not available.");
        setIsLoadingStats(false);
        return;
    }

    console.log("[AdminDashboard] Admin user confirmed. Setting up Firestore listeners for stats.");
    const unsubs: Unsubscribe[] = [];

    // Fetch User Counts from Firestore "users" collection
    const usersRef = collection(db, "users");
    unsubs.push(onSnapshot(query(usersRef, where("type", "==", "company")), 
      (snap) => setAdminStats(prev => ({ ...prev, totalCorporations: snap.size })),
      (err) => console.error("Error fetching corporations count:", err)
    ));
    // For Startups (formerly Sales Professionals), count active ones
    unsubs.push(onSnapshot(query(usersRef, where("type", "==", "professional"), where("status", "==", "active")), 
      (snap) => setAdminStats(prev => ({ ...prev, totalStartups: snap.size })), // Renamed state field
      (err) => console.error("Error fetching active startups count:", err)
    ));
    unsubs.push(onSnapshot(query(usersRef, where("type", "==", "investor")), 
      (snap) => setAdminStats(prev => ({ ...prev, totalInvestors: snap.size })),
      (err) => console.error("Error fetching investors count:", err)
    ));

    // Fetch Active Offers (Platform + User Sales) from Firestore
    const platformOffersRef = collection(db, "platformOffers");
    const userSalesOffersRef = collection(db, "userSalesOffers");

    let platformActiveCount = 0;
    let userSalesActiveCount = 0;
    const updateActiveOffersStat = () => {
      setAdminStats(prev => ({ ...prev, activeOffers: platformActiveCount + userSalesActiveCount }));
    };

    unsubs.push(onSnapshot(query(platformOffersRef, where("status", "==", "active"), where("isDeletedByAdmin", "==", false)), 
      (snap) => { platformActiveCount = snap.size; updateActiveOffersStat(); },
      (err) => console.error("Error fetching active platform offers count:", err)
    ));
    unsubs.push(onSnapshot(query(userSalesOffersRef, where("status", "==", "active"), where("isDeletedByAdmin", "==", false)), 
      (snap) => { userSalesActiveCount = snap.size; updateActiveOffersStat(); },
      (err) => console.error("Error fetching active user sales offers count:", err)
    ));
    
    // Fetch Total Funding Pitches (not admin deleted) from Firestore
    const fundingPitchesRef = collection(db, "fundingPitches");
    unsubs.push(onSnapshot(query(fundingPitchesRef, where("isDeletedByAdmin", "==", false)), 
      (snap) => setAdminStats(prev => ({ ...prev, totalFundingPitches: snap.size })),
      (err) => console.error("Error fetching funding pitches count:", err)
    ));

    // Fetch Total Leads (not admin deleted) from Firestore "leads" collection
    const leadsRef = collection(db, "leads"); 
    unsubs.push(onSnapshot(query(leadsRef, where("isDeletedByAdmin", "==", false)), 
      (snap) => setAdminStats(prev => ({ ...prev, totalLeadsGenerated: snap.size })),
      (err) => console.error("Error fetching leads count:", err)
    ));

    // Fetch Pending Complaints
    const complaintsRef = collection(db, "complaints");
    unsubs.push(onSnapshot(query(complaintsRef, where("status", "==", "Pending")),
      (snap) => setAdminStats(prev => ({ ...prev, pendingComplaints: snap.size })),
      (err) => console.error("Error fetching pending complaints count:", err)
    ));
    
    setIsLoadingStats(false); 

    return () => {
      console.log("[AdminDashboard] Unsubscribing from Firestore stat listeners.");
      unsubs.forEach(unsub => unsub());
    };
  }, [adminUser, authLoading, router]);


  if (authLoading || isLoadingStats) {
    return <div className="flex min-h-screen items-center justify-center"><p>Loading Admin Dashboard...</p></div>;
  }
  if (!adminUser || adminUser.type !== 'admin') {
    return <div className="flex min-h-screen items-center justify-center"><p>Access Denied. Admin privileges required.</p></div>;
  }


  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Overview and management of the LISTED platform.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <StatCard title="Total Corporations" value={adminStats.totalCorporations.toLocaleString()} icon={<Briefcase />} description="Registered company accounts" link="/admin/manage-users?type=company" linkText="Manage Corporations"/>
        <StatCard title="Active Startups" value={adminStats.totalStartups.toLocaleString()} icon={<Users />} description="Active startup members" link="/admin/manage-users?type=professional" linkText="Manage Startups" />
        <StatCard title="Total Investors" value={adminStats.totalInvestors.toLocaleString()} icon={<Users />} description="Registered investor accounts" link="/admin/manage-users?type=investor" linkText="Manage Investors"/>
        <StatCard title="Active Offers" value={adminStats.activeOffers.toLocaleString()} icon={<Briefcase />} description="Commission offers by corporations & users" link="/admin/manage-offers" linkText="Manage Offers"/>
        <StatCard title="Funding Pitches" value={adminStats.totalFundingPitches.toLocaleString()} icon={<Lightbulb />} description="Pitches seeking investment" link="/admin/manage-funding-pitches" linkText="Manage Pitches"/>
        <StatCard title="Leads Generated" value={adminStats.totalLeadsGenerated.toLocaleString()} icon={<BarChart3 />} description="Across all offers (all time)" link="/admin/manage-leads" linkText="Manage Leads"/>
        <StatCard title="Pending Complaints" value={adminStats.pendingComplaints.toLocaleString()} icon={<ShieldAlert className="text-destructive" />} description="User-submitted complaints" link="/admin/manage-complaints" linkText="Manage Complaints" />
        <StatCard title="Pending Issues" value={adminStats.pendingIssues.toLocaleString()} icon={<ShieldAlert className="text-orange-500" />} description="Reported problems or flags (manual)" />
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common administrative tasks.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <Button variant="outline" asChild><Link href="/admin/manage-offers">View All Offers</Link></Button>
            <Button variant="outline" asChild><Link href="/admin/manage-users">Manage All Users</Link></Button>
            <Button variant="outline" asChild><Link href="/admin/manage-complaints">Review Complaints</Link></Button>
            <Button variant="outline" asChild><Link href="/admin/frontend-content">Edit Frontend Content</Link></Button>
            <Button variant="outline" asChild><Link href="/admin/manage-directory">Update Business Directory</Link></Button>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Platform Health Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Detailed analytics and reporting features coming soon.</p>
        </CardContent>
      </Card>
    </div>
  );
}
