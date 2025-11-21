"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, Activity, DollarSign, Users, BarChart2, Zap, Eye, Briefcase, Percent, CalendarDays, Lightbulb, ImageIcon, Star, ArrowRight, Trophy } from "lucide-react"; 
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebaseConfig';
import { collection, query, where, onSnapshot, Timestamp, orderBy, limit } from "firebase/firestore";
import type { FundingPitch } from '@/app/offers/my-ads/page';
import NextImage from 'next/image';
import { format, isFuture } from 'date-fns'; 
import { Badge } from '@/components/ui/badge';

interface Stats {
  totalPitches: number;
  activePitches: number;
  totalViews: number;
  totalInterest: number;
}

interface Competition {
  id: string;
  title: string;
  prizeDescription: string;
}

export default function HomePage() {
  const { currentUser: authUser, loading: authLoading } = useAuth();
  const [stats, setStats] = useState<Stats>({
    totalPitches: 0,
    activePitches: 0,
    totalViews: 0,
    totalInterest: 0,
  });
  const [recentPitches, setRecentPitches] = useState<FundingPitch[]>([]);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [latestCompetition, setLatestCompetition] = useState<Competition | null>(null);
  const [isLoadingCompetition, setIsLoadingCompetition] = useState(true);

  useEffect(() => {
    if (authLoading || !db || !authUser || authUser.type !== 'professional') {
      setIsLoadingStats(false);
      setIsLoadingCompetition(false);
      return;
    }

    const pitchesRef = collection(db, "fundingPitches");
    const q = query(
      pitchesRef,
      where("creatorId", "==", authUser.uid),
      where("isDeletedByAdmin", "==", false)
    );

    const unsubscribePitches = onSnapshot(q, (snapshot) => {
      let totalPitches = 0;
      let activePitches = 0;
      let totalViews = 0;
      let totalInterest = 0;
      const pitchesData: FundingPitch[] = [];

      snapshot.forEach(doc => {
        const data = doc.data() as FundingPitch;
        totalPitches++;
        if (data.status === 'seeking_funding') {
          activePitches++;
        }
        totalViews += data.views || 0;
        totalInterest += data.interestedInvestorsCount || 0;
        pitchesData.push({ id: doc.id, ...data });
      });

      setStats({ totalPitches, activePitches, totalViews, totalInterest });
      
      const sortedPitches = pitchesData
        .filter(p => p.status === 'seeking_funding')
        .sort((a, b) => (b.createdAt as Timestamp).toMillis() - (a.createdAt as Timestamp).toMillis());
        
      setRecentPitches(sortedPitches.slice(0, 3));
      setIsLoadingStats(false);
    }, (error) => {
      console.error("Error fetching user pitch stats:", error);
      setIsLoadingStats(false);
    });

    const competitionQuery = query(
      collection(db, "ideaCompetitions"),
      where("status", "==", "published"),
      orderBy("endDate", "desc"),
      limit(1)
    );
    const unsubscribeCompetition = onSnapshot(competitionQuery, (snapshot) => {
      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        setLatestCompetition({ id: doc.id, ...doc.data() } as Competition);
      } else {
        setLatestCompetition(null);
      }
      setIsLoadingCompetition(false);
    }, (error) => {
      console.error("Error fetching latest competition:", error);
      setIsLoadingCompetition(false);
    });

    return () => {
      unsubscribePitches();
      unsubscribeCompetition();
    };
  }, [authUser, authLoading]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center">
          <Activity className="mr-3 h-8 w-8 text-primary" />
          User Dashboard
        </h1>
        <p className="text-muted-foreground">
          Welcome back, {authUser?.name || 'User'}! Here's an overview of your funding activities.
        </p>
      </div>

      <section>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Total Pitches Created" value={stats.totalPitches.toString()} icon={<Lightbulb />} />
          <StatCard title="Active Pitches" value={stats.activePitches.toString()} icon={<TrendingUp />} />
          <StatCard title="Total Views on Pitches" value={stats.totalViews.toLocaleString()} icon={<Eye />} />
          <StatCard title="Total Investor Interests" value={stats.totalInterest.toLocaleString()} icon={<Users />} />
        </div>
      </section>

      {latestCompetition && (
        <section>
          <Card className="shadow-lg rounded-xl bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-500 text-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Trophy className="h-8 w-8" /> What an "IDEA" Sir Jee!!!
              </CardTitle>
              <CardDescription className="text-yellow-100">A new competition is live! Don't miss your chance.</CardDescription>
            </CardHeader>
            <CardContent>
              <h3 className="text-lg font-semibold">{latestCompetition.title}</h3>
              <p className="mt-1 opacity-90"><strong>Prize:</strong> {latestCompetition.prizeDescription}</p>
            </CardContent>
            <CardFooter>
              <Button asChild variant="secondary" className="bg-white text-primary hover:bg-white/90">
                <Link href="/offers/idea-competition">View Competitions <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
            </CardFooter>
          </Card>
        </section>
      )}

      <section>
        <Card className="shadow-lg rounded-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Lightbulb className="h-6 w-6 text-primary"/>My Active Pitches</CardTitle>
            <CardDescription>
              A quick look at your pitches that are currently seeking funding.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingStats ? (
              <p className="text-muted-foreground text-center py-10">Loading your pitches...</p>
            ) : recentPitches.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {recentPitches.map((pitch) => {
                  const isDataUri = pitch.pitchImageUrl && pitch.pitchImageUrl.startsWith('data:image');
                  return (
                    <Card key={pitch.id} className="flex flex-col shadow-md hover:shadow-lg transition-shadow duration-300 rounded-xl overflow-hidden">
                      {pitch.pitchImageUrl && isDataUri ? (
                        <div className="relative h-40 w-full">
                          <NextImage src={pitch.pitchImageUrl} alt={pitch.projectTitle} fill className="object-cover rounded-t-xl" data-ai-hint="project image"/>
                        </div>
                      ) : (
                        <div className="h-40 w-full bg-muted flex items-center justify-center rounded-t-xl">
                            <ImageIcon className="h-16 w-16 text-primary/30"/>
                        </div>
                      )}
                      <CardHeader className="p-4">
                        <CardTitle className="text-md leading-tight line-clamp-2 hover:text-primary">
                          <Link href={`/offers/my-ads/view/${pitch.id}`}>{pitch.projectTitle}</Link>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 pt-0 flex-grow space-y-1.5 text-xs">
                        <p className="text-muted-foreground line-clamp-2">{pitch.projectSummary}</p>
                        <div className="flex items-center gap-1.5 pt-2"><DollarSign className="h-4 w-4 text-green-600"/>Seeking: PKR {pitch.fundingAmountSought.toLocaleString()}</div>
                        <div className="flex items-center gap-1.5"><Percent className="h-4 w-4 text-blue-600"/>Equity: {pitch.equityOffered}%</div>
                      </CardContent>
                       <CardFooter className="p-4 border-t bg-muted/20">
                        <Button asChild className="w-full" variant="outline" size="sm">
                          <Link href={`/offers/my-ads/view/${pitch.id}`}> 
                            View & Manage <ArrowRight className="ml-2 h-4 w-4"/>
                          </Link>
                        </Button>
                      </CardFooter>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-10 text-muted-foreground">
                <Lightbulb className="mx-auto h-12 w-12 text-primary/50 mb-4" />
                <p className="text-lg">You have no active funding pitches.</p>
                <p className="text-sm max-w-sm mx-auto mt-2">
                  Create a pitch to showcase your idea to our network of investors and start your funding journey.
                </p>
                 <Button asChild className="mt-4">
                    <Link href="/offers/my-ads/create-pitch">Create Your First Pitch</Link>
                </Button>
              </div>
            )}
          </CardContent>
           {stats.totalPitches > 0 && (
             <CardFooter className="border-t pt-4 flex justify-end">
                  <Button asChild variant="default" size="sm">
                    <Link href="/offers/my-ads">View All My Pitches</Link>
                  </Button>
              </CardFooter>
           )}
        </Card>
      </section>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
}

function StatCard({ title, value, icon }: StatCardProps) {
  return (
    <Card className="shadow-md rounded-xl">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {React.cloneElement(icon as React.ReactElement, { className: "h-5 w-5 text-primary/70" })}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-foreground">{value}</div>
      </CardContent>
    </Card>
  );
}
