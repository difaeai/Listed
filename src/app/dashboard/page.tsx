
"use client";

import React, {useEffect, useState} from "react";
import Link from "next/link";
import {
  TrendingUp, CheckCircle, Users, Briefcase, Lightbulb, Eye, DollarSign, Percent, CalendarDays, ImageIcon, Star, ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
// import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'; // Removed PieChart related imports
import { ResponsiveContainer } from 'recharts'; // Keep ResponsiveContainer if other charts might use it
import { format, subMonths, isFuture } from 'date-fns';
import type { PlatformOffer } from '@/types/platform-offer';
import { db } from '@/lib/firebaseConfig'; 
import { collection, query, where, onSnapshot, getDocs, Timestamp, orderBy } from "firebase/firestore"; 
import type { FundingPitch } from '@/app/offers/my-ads/page';
import NextImage from 'next/image';
import { Badge } from '@/components/ui/badge';


interface Stats {
  totalOffers: number;
  activeOffers: number;
  totalStartupsInNetwork: number;
  pendingRequests: number; 
  leadsGeneratedThisMonth: number;
  dealsClosedThisMonth: number;
  averageCommissionOffered: string; 
}

interface HighlightedStartup extends FundingPitch {
  // Inherits all from FundingPitch
}

interface SalesNetworkActivityData {
  month: string;
  activeStartups: number; 
  newSignUps: number;
}


const initialSalesNetworkActivityData: SalesNetworkActivityData[] = Array.from({length: 6}, (_, i) => {
    const month = format(subMonths(new Date(), 5-i), 'MMM');
    return { month, activeStartups: 200 + i*15 + Math.floor(Math.random()*20), newSignUps: 40 + i*5 + Math.floor(Math.random()*10) };
});

const chartConfig = {
  activeStartups: { label: "Active Startups", color: "hsl(var(--primary))" },
  newSignUps: { label: "New Startup Sign-ups", color: "hsl(var(--accent))" },
  // Removed pitchViews, pitchInterests, corporateLeads, dealsClosed from chartConfig
} satisfies React.ComponentProps<typeof ChartContainer>["config"];


export default function CorporationDashboardPage() {
  const [stats, setStats] = useState<Stats>({
    totalOffers: 0,
    activeOffers: 0,
    totalStartupsInNetwork: 0,
    pendingRequests: 25, 
    leadsGeneratedThisMonth: 0, 
    dealsClosedThisMonth: 0,
    averageCommissionOffered: "N/A",
  });
  const [highlightedStartups, setHighlightedStartups] = useState<HighlightedStartup[]>([]);
  const [isLoadingHighlightedStartups, setIsLoadingHighlightedStartups] = useState(true);

  const [mounted, setMounted] = useState(false);
  const [currentCorporationId, setCurrentCorporationId] = useState<string | null>(null);
  const [currentCorporationName, setCurrentCorporationName] = useState<string>("Your Corporation");


  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
        const storedUser = localStorage.getItem("currentUser");
        if (storedUser) {
            try {
                const parsedUser = JSON.parse(storedUser);
                if (parsedUser.type === 'company' && parsedUser.uid) { 
                    setCurrentCorporationId(parsedUser.uid);
                    setCurrentCorporationName(parsedUser.name || parsedUser.corporationName || "Your Corporation");
                }
            } catch (e) {
                console.error("Error parsing currentUser for dashboard:", e);
            }
        }
    }
  }, []);

  useEffect(() => {
    if (mounted && db) {
      let unsubPlatformOffers: (() => void) | undefined;
      let unsubStartups: (() => void) | undefined;
      let unsubHighlightedPitches: (() => void) | undefined;

      if (currentCorporationId) {
        const platformOffersRef = collection(db, "platformOffers");
        const platformQuery = query(
          platformOffersRef, 
          where("corporationId", "==", currentCorporationId),
          where("isDeletedByAdmin", "==", false)
        );
        unsubPlatformOffers = onSnapshot(platformQuery, (snapshot) => {
          const corporationPlatformOffers: PlatformOffer[] = [];
          snapshot.forEach(doc => corporationPlatformOffers.push({id: doc.id, ...doc.data()} as PlatformOffer));
          const activeCorpOffersForStat = corporationPlatformOffers.filter(offer => offer.status === 'active');
          
          let totalCommissionValue = 0;
          let percentageCommissionCount = 0;
          let fixedCommissionTotal = 0;
          let fixedCommissionCount = 0;

          activeCorpOffersForStat.forEach(offer => {
              if (offer.commissionType === 'percentage') {
                  const rate = parseFloat(offer.commissionRate.replace('%', ''));
                  if (!isNaN(rate)) { totalCommissionValue += rate; percentageCommissionCount++; }
              } else if (offer.commissionType === 'fixed_amount') {
                  const amount = parseFloat(offer.commissionRate.replace('PKR ', '').replace(/,/g, ''));
                  if (!isNaN(amount)) { fixedCommissionTotal += amount; fixedCommissionCount++; }
              }
          });
          
          let avgCommissionStr = "N/A";
          if (percentageCommissionCount > 0) avgCommissionStr = `${(totalCommissionValue / percentageCommissionCount).toFixed(1)}% (Avg. %)`;
          else if (fixedCommissionCount > 0) avgCommissionStr = `PKR ${(fixedCommissionTotal / fixedCommissionCount).toLocaleString()} (Avg. Fixed)`;

          setStats(prevStats => ({
            ...prevStats,
            totalOffers: corporationPlatformOffers.length,
            activeOffers: activeCorpOffersForStat.length,
            averageCommissionOffered: avgCommissionStr,
          }));
        });
      } else {
         setStats(prevStats => ({ ...prevStats, totalOffers: 0, activeOffers: 0, averageCommissionOffered: "N/A" }));
      }
      
      const usersRef = collection(db, "users");
      const startupsQuery = query(usersRef, where("type", "==", "professional"), where("status", "==", "active"));
      unsubStartups = onSnapshot(startupsQuery, (snapshot) => {
        setStats(prevStats => ({ ...prevStats, totalStartupsInNetwork: snapshot.size }));
      });

      setIsLoadingHighlightedStartups(true);
      const pitchesRef = collection(db, "fundingPitches");
      const highlightedQuery = query(
        pitchesRef,
        where("featureStatus", "in", ["active", "pending_approval"]),
        where("isDeletedByAdmin", "==", false),
        where("status", "==", "seeking_funding"),
        where("contactEmail", "!=", "demo@gmail.com"), // Exclude demo user's pitches
        orderBy("featureStatus", "asc"),
        orderBy("featureRequestedAt", "desc")
      );
      unsubHighlightedPitches = onSnapshot(highlightedQuery, (snapshot) => {
        const fetchedPitches: HighlightedStartup[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          const featureEndsAtDate = data.featureEndsAt instanceof Timestamp ? data.featureEndsAt.toDate() : (data.featureEndsAt ? new Date(data.featureEndsAt as string | Date) : null);
          if (data.featureStatus === 'pending_approval' || (data.featureStatus === 'active' && featureEndsAtDate && isFuture(featureEndsAtDate))) {
            fetchedPitches.push({
              id: doc.id, ...data,
              postedDate: data.postedDate || (data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : new Date().toISOString()),
              createdAt: data.createdAt, updatedAt: data.updatedAt,
              pitchImageUrl: data.pitchImageUrl || null,
            } as HighlightedStartup);
          }
        });
        setHighlightedStartups(fetchedPitches.slice(0, 6));
        setIsLoadingHighlightedStartups(false);
      }, (error) => {
        console.error("Error fetching highlighted startups:", error);
        setIsLoadingHighlightedStartups(false);
      });
      
      setStats(prevStats => ({ ...prevStats, leadsGeneratedThisMonth: 0, dealsClosedThisMonth: 0 }));

      return () => {
        if (unsubPlatformOffers) unsubPlatformOffers();
        if (unsubStartups) unsubStartups();
        if (unsubHighlightedPitches) unsubHighlightedPitches();
      };

    } else if (mounted && !currentCorporationId) {
        setStats({
            totalOffers: 0, activeOffers: 0, totalStartupsInNetwork: 0,
            pendingRequests: 0, leadsGeneratedThisMonth: 0, dealsClosedThisMonth: 0,
            averageCommissionOffered: "N/A",
        });
        setHighlightedStartups([]);
        setIsLoadingHighlightedStartups(false);
    }
  }, [mounted, currentCorporationId]);

  if (!mounted) {
     return <div className="flex min-h-screen items-center justify-center"><p>Loading Corporation Dashboard Content...</p></div>;
  }

  return (
    <>
        <div className="mb-4">
            <h2 className="text-2xl font-semibold text-foreground">Dashboard Overview for {currentCorporationName}</h2>
            <p className="text-sm text-muted-foreground">Key metrics and activities for your corporation on the LISTED platform.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4 mb-8">
          <StatCard title="Total Offers Created" value={stats.totalOffers.toString()} trendInfo={`${stats.activeOffers} Active on Platform`} icon={<Briefcase />} />
          <StatCard title="Sales Professional Network Size" value={stats.totalStartupsInNetwork.toLocaleString()} trendInfo={`${stats.pendingRequests} Pending Invites`} icon={<Users />} />
          <StatCard title="Deals Closed (Month)" value={stats.dealsClosedThisMonth.toLocaleString()} trendInfo={`Avg. Commission: ${stats.averageCommissionOffered}`} icon={<CheckCircle />} />
        </div>

        <div className="grid grid-cols-1 gap-6 mb-8">
          {/* Highlighted Startups Section */}
          <Card className="lg:col-span-full shadow-md rounded-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Star className="h-6 w-6 text-yellow-500"/>Highlighted Startups</CardTitle>
              <CardDescription>Featured funding pitches from promising startups.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {isLoadingHighlightedStartups ? (
                <div className="flex items-center justify-center h-[350px]"><p>Loading highlighted startups...</p></div>
              ) : highlightedStartups.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4 overflow-y-auto max-h-[400px]">
                  {highlightedStartups.map((pitch) => {
                    const isDataUri = pitch.pitchImageUrl && pitch.pitchImageUrl.startsWith('data:image');
                    const isCurrentlyFeatured = pitch.featureStatus === 'active' && pitch.featureEndsAt && isFuture(pitch.featureEndsAt instanceof Timestamp ? pitch.featureEndsAt.toDate() : new Date(pitch.featureEndsAt as string | Date));
                    return (
                      <Card key={pitch.id} className="flex flex-col overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                        {pitch.pitchImageUrl && isDataUri ? (
                          <div className="relative h-32 w-full">
                            <NextImage src={pitch.pitchImageUrl} alt={pitch.projectTitle} layout="fill" objectFit="cover" className="rounded-t-md" data-ai-hint="startup pitch"/>
                          </div>
                        ) : (
                          <div className="h-32 w-full bg-muted flex items-center justify-center rounded-t-md">
                            <Lightbulb className="h-12 w-12 text-primary/30"/>
                          </div>
                        )}
                        <CardHeader className="p-3">
                          <CardTitle className="text-sm font-semibold leading-tight line-clamp-2">
                            <Link href={`/dashboard/pitch-detail/${pitch.id}`} className="hover:text-primary">{pitch.projectTitle}</Link>
                          </CardTitle>
                          {isCurrentlyFeatured && <Badge variant="default" className="bg-yellow-500 text-white text-xs mt-1">Featured</Badge>}
                           {pitch.featureStatus === 'pending_approval' && <Badge variant="outline" className="text-xs mt-1 border-yellow-400 text-yellow-600">Feature Pending</Badge>}
                        </CardHeader>
                        <CardContent className="p-3 pt-0 text-xs space-y-1">
                          <p className="text-muted-foreground">By: {pitch.creatorName}</p>
                          <p className="text-muted-foreground">Seeking: PKR {pitch.fundingAmountSought.toLocaleString()}</p>
                        </CardContent>
                        <CardFooter className="p-3 pt-1 mt-auto">
                           <Button asChild variant="link" size="sm" className="p-0 h-auto text-xs">
                            <Link href={`/dashboard/pitch-detail/${pitch.id}`}>View Pitch <ArrowRight className="ml-1 h-3 w-3"/></Link>
                          </Button>
                        </CardFooter>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-[350px] text-muted-foreground p-8 text-center">
                  <Lightbulb className="w-12 h-12 mb-4 text-primary/50" />
                  <p className="font-semibold">No highlighted startups at the moment.</p>
                  <p className="text-sm">Check back later for featured investment opportunities.</p>
                </div>
              )}
            </CardContent>
             <CardFooter className="border-t pt-4 flex justify-end">
                  <Button asChild variant="outline" size="sm">
                    <Link href="/dashboard/opportunities">View All Investment Opportunities</Link>
                  </Button>
              </CardFooter>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <Card className="lg:col-span-full shadow-md rounded-xl">
            <CardHeader>
              <CardTitle>Sales Network Growth</CardTitle>
              <CardDescription>Monthly active sales professionals and new sign-ups in your network.</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px] pr-2">
               <p className="text-center text-muted-foreground pt-10">Sales Network Growth Chart (Placeholder)</p>
            </CardContent>
             <CardFooter className="border-t pt-4 flex justify-end">
                <Button asChild variant="outline" size="sm">
                  <Link href="/dashboard/network">Manage Sales Network</Link>
                </Button>
            </CardFooter>
          </Card>
        </div>
    </>
  );
}


interface StatCardProps {
  title: string;
  value: string;
  trendInfo: string;
  icon: React.ReactNode;
}

function StatCard({ title, value, trendInfo, icon }: StatCardProps) {
  return (
    <Card className="shadow-md rounded-xl">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {React.cloneElement(icon as React.ReactElement, { className: "h-5 w-5 text-primary/70" })}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-foreground">{value}</div>
        <p className="text-xs text-muted-foreground pt-1">
          {trendInfo}
        </p>
      </CardContent>
    </Card>
  );
}
    

    