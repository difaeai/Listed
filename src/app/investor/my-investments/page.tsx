
"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { DollarSign, Activity, Briefcase, Percent, CalendarDays, Eye, CheckCircle, RotateCcw } from "lucide-react";
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebaseConfig';
import { collection, getDocs, doc, query, where, Timestamp, onSnapshot, updateDoc, serverTimestamp, documentId, orderBy } from 'firebase/firestore';
import type { FundingPitch } from '@/app/offers/my-ads/page';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import {
  ChartContainer,
  ChartTooltip as ShadChartTooltip,
  ChartTooltipContent as ShadChartTooltipContent,
} from "@/components/ui/chart"
import { useToast } from '@/hooks/use-toast';

interface PortfolioPitch extends FundingPitch {
  dateInvested: string; 
  hasLikedByCurrentUser?: boolean; 
}

const chartConfig = {
  value: { label: "Performance", color: "hsl(var(--chart-1))" },
} satisfies React.ComponentProps<typeof ChartContainer>["config"];

export default function MyInvestmentsPage() {
  const { currentUser: authUser, loading: authLoading } = useAuth();
  const [portfolioPitches, setPortfolioPitches] = useState<PortfolioPitch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (authLoading || !authUser || !authUser.uid || !db) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const userInterestsQuery = query(
      collection(db, "users", authUser.uid, "interestedPitches"),
      orderBy("interestedAt", "desc")
    );
    
    const unsubscribeInterests = onSnapshot(userInterestsQuery, async (interestsSnapshot) => {
      const pitchIdToInterestDate: Map<string, string> = new Map();
      interestsSnapshot.docs.forEach(doc => {
          const interestData = doc.data();
          const pitchId = doc.id; // The document ID is the pitchId
          const interestedAtTimestamp = interestData.interestedAt as Timestamp;
          pitchIdToInterestDate.set(pitchId, interestedAtTimestamp ? interestedAtTimestamp.toDate().toISOString() : new Date().toISOString());
      });

      const pitchIds = Array.from(pitchIdToInterestDate.keys());

      if (pitchIds.length === 0) {
        setPortfolioPitches([]);
        setIsLoading(false);
        return;
      }
      
      const CHUNK_SIZE = 30;
      const pitchChunks: string[][] = [];
      for (let i = 0; i < pitchIds.length; i += CHUNK_SIZE) {
        pitchChunks.push(pitchIds.slice(i, i + CHUNK_SIZE));
      }
      
      const allPitches: PortfolioPitch[] = [];
      
      try {
        for (const chunk of pitchChunks) {
          if (chunk.length > 0) {
            const pitchesQuery = query(collection(db, 'fundingPitches'), where(documentId(), 'in', chunk));
            const pitchesSnapshot = await getDocs(pitchesQuery);
            
            for (const pitchDoc of pitchesSnapshot.docs) {
              const pitchData = { id: pitchDoc.id, ...pitchDoc.data() } as FundingPitch;
              if ((pitchData.status === 'funded' || pitchData.status === 'seeking_funding') && !pitchData.isDeletedByAdmin) {
                 allPitches.push({
                   ...pitchData,
                   dateInvested: pitchIdToInterestDate.get(pitchDoc.id)!,
                   hasLikedByCurrentUser: true,
                 });
              }
            }
          }
        }

        allPitches.sort((a, b) => new Date(b.dateInvested).getTime() - new Date(a.dateInvested).getTime());
        setPortfolioPitches(allPitches);

      } catch(error) {
         console.error("Error fetching portfolio pitch documents:", error);
         toast({ title: "Error", description: "Could not load your portfolio of pitches.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }

    }, (error) => {
      console.error("Error fetching portfolio interests:", error);
      toast({title: "Error", description: "Could not load your investment portfolio interests.", variant: "destructive"});
      setIsLoading(false);
    });

    return () => {
      unsubscribeInterests();
    };

  }, [authUser, authLoading, toast]);


  const handleUpdatePitchStatus = async (pitchId: string, currentStatus: FundingPitch['status'], newStatus: FundingPitch['status'], pitchTitle: string) => {
    if (!db || !pitchId) return;
    const pitchDocRef = doc(db, "fundingPitches", pitchId);
    try {
      await updateDoc(pitchDocRef, {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
      setPortfolioPitches(prevPitches => 
        prevPitches.map(p => p.id === pitchId ? { ...p, status: newStatus } : p)
      );
      toast({
        title: `Pitch Status Updated`,
        description: `"${pitchTitle}" status changed to ${newStatus.replace('_', ' ').split(' ').map(s => s.charAt(0).toUpperCase() + s.substring(1)).join(' ')}.`,
      });
    } catch (error) {
      console.error(`Error updating pitch ${pitchId} status to ${newStatus}:`, error);
      toast({ title: "Error", description: "Could not update pitch status.", variant: "destructive"});
    }
  };

  const generateMockPerformanceData = (pitchId: string) => {
    const seed = pitchId ? pitchId.charCodeAt(0) + pitchId.charCodeAt(pitchId.length -1) : Math.random() * 100;
    return [
      { month: 'Jan', value: (seed % 500) + 500 + Math.floor(Math.random() * 200) },
      { month: 'Feb', value: (seed % 600) + 600 + Math.floor(Math.random() * 250) },
      { month: 'Mar', value: (seed % 700) + 700 + Math.floor(Math.random() * 300) },
      { month: 'Apr', value: (seed % 800) + 800 + Math.floor(Math.random() * 350) },
    ];
  };

  if (authLoading || isLoading) {
    return (
      <div className="space-y-6 text-center py-10">
        <p>Loading your investment portfolio...</p>
      </div>
    );
  }

  if (!authUser || authUser.type !== 'investor') {
     return (
      <div className="space-y-6 text-center py-10">
        <p>Please log in as an investor to view your portfolio.</p>
      </div>
    );
  }
  
  const pitchesInvestorShowedInterestIn = portfolioPitches.filter(p => p.hasLikedByCurrentUser);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center">
          <DollarSign className="mr-3 h-8 w-8 text-primary" />
          My Portfolio
        </h1>
        <p className="text-muted-foreground">
          Track pitches you've shown interest in and manage their funding status.
        </p>
      </div>

      <Card className="shadow-lg rounded-xl">
        <CardHeader>
          <CardTitle>Pitches You're Following / Funded ({pitchesInvestorShowedInterestIn.length})</CardTitle>
          <CardDescription>
            These are pitches where you've expressed interest or marked as funded.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pitchesInvestorShowedInterestIn.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2">
              {pitchesInvestorShowedInterestIn.map((pitch) => (
                <Card key={pitch.id} className="shadow-md hover:shadow-lg transition-shadow rounded-lg">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                        <CardTitle className="text-lg text-primary hover:underline">
                            <Link href={`/investor/pitch-detail/${pitch.id}`}>{pitch.projectTitle}</Link>
                        </CardTitle>
                        <Badge variant={pitch.status === 'funded' ? 'default' : 'secondary'} className={`text-xs ${pitch.status === 'funded' ? 'bg-accent text-accent-foreground' : ''}`}>
                            {pitch.status.replace('_', ' ').split(' ').map(s => s.charAt(0).toUpperCase() + s.substring(1)).join(' ')}
                        </Badge>
                    </div>
                    <CardDescription className="text-xs text-muted-foreground pt-1">
                        <span className="flex items-center"><Briefcase className="h-3.5 w-3.5 mr-1.5"/>{pitch.industry}</span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex items-center"><DollarSign className="h-4 w-4 mr-1.5 text-green-600"/>Originally Sought: PKR {pitch.fundingAmountSought.toLocaleString()}</div>
                    <div className="flex items-center"><Percent className="h-4 w-4 mr-1.5 text-blue-600"/>Equity Offered: {pitch.equityOffered}%</div>
                    <div className="flex items-center"><CalendarDays className="h-4 w-4 mr-1.5 text-muted-foreground"/>Interest Shown By You: {format(new Date(pitch.dateInvested), "dd MMM, yyyy")}</div>
                  </CardContent>
                  <CardFooter className="pt-3 border-t flex flex-col sm:flex-row gap-2 justify-between">
                     <Button variant="outline" size="sm" asChild>
                        <Link href={`/investor/pitch-detail/${pitch.id}`}><Eye className="mr-2 h-4 w-4"/>View Details</Link>
                    </Button>
                    {pitch.status === 'seeking_funding' && pitch.hasLikedByCurrentUser && (
                      <Button 
                        size="sm" 
                        className="bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => handleUpdatePitchStatus(pitch.id!, pitch.status, 'funded', pitch.projectTitle)}
                      >
                        <CheckCircle className="mr-2 h-4 w-4"/>Mark as Funded
                      </Button>
                    )}
                    {pitch.status === 'funded' && pitch.hasLikedByCurrentUser && (
                       <Button 
                        size="sm" 
                        variant="destructive"
                        className="bg-orange-500 hover:bg-orange-600 text-white"
                        onClick={() => handleUpdatePitchStatus(pitch.id!, pitch.status, 'seeking_funding', pitch.projectTitle)}
                       >
                        <RotateCcw className="mr-2 h-4 w-4"/>Mark as Seeking Funding
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 text-muted-foreground">
              <p className="text-lg">Your portfolio of followed/funded ventures is currently empty.</p>
              <p>Explore <Link href="/investor/opportunities" className="text-primary hover:underline">All Opportunities</Link> and "Like" pitches to add them here.</p>
            </div>
          )}
        </CardContent>
      </Card>
      
      <Card className="shadow-lg rounded-xl">
        <CardHeader>
          <CardTitle>Investment Performance Reports</CardTitle>
          <CardDescription>
            (Illustrative) Updates and reports from the businesses you have invested in.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {portfolioPitches.filter(p => p.status === 'funded').length > 0 ? (
            <div className="space-y-8">
              {portfolioPitches.filter(p => p.status === 'funded').map((pitch) => (
                <Card key={`report-${pitch.id}`} className="shadow-sm border p-4 rounded-md">
                  <CardTitle className="text-md font-semibold mb-3 text-primary">{pitch.projectTitle} - Performance</CardTitle>
                  <div className="h-[250px] w-full">
                    <ChartContainer config={chartConfig} className="w-full h-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={generateMockPerformanceData(pitch.id!)} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                          <XAxis dataKey="month" fontSize={12} tickLine={false} axisLine={false} />
                          <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `Rs ${value/1000}k`} />
                          <ShadChartTooltip
                            cursor={false}
                            content={<ShadChartTooltipContent indicator="dot" hideLabel />}
                          />
                          <Bar dataKey="value" radius={[4, 4, 0, 0]} name="Performance Metric (e.g. Revenue)" />
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 text-center">Illustrative performance data.</p>
                </Card>
              ))}
            </div>
          ) : (
          <div className="text-center py-10 text-muted-foreground">
            <Activity className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3"/>
            <p className="text-lg">No performance reports available.</p>
            <p>Invest in pitches that get funded to see their performance updates here.</p>
          </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
