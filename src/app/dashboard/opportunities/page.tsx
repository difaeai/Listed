
"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Search, Lightbulb, Eye, DollarSign, Percent, Briefcase, CalendarDays, ImageIcon, Star } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { format, isFuture } from 'date-fns';
import type { FundingPitch } from '@/app/offers/my-ads/page'; 
import NextImage from 'next/image'; // Use next/image
import { useAuth } from '@/contexts/AuthContext'; // To ensure user context if needed for any future filtering
import { db } from '@/lib/firebaseConfig';
import { collection, query, where, orderBy, onSnapshot, Timestamp } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";

export default function CorporationOpportunitiesPage() {
  const [allPitches, setAllPitches] = useState<FundingPitch[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const { currentUser: authUser, loading: authLoading } = useAuth(); // authUser might be needed for future specific logic
  const { toast } = useToast();

  useEffect(() => {
    if (authLoading || !db) { // Wait for auth context and ensure db is available
        setIsLoading(false);
        return;
    }
    setIsLoading(true);
    const pitchesRef = collection(db, "fundingPitches");
    const q = query(
      pitchesRef,
      where("status", "==", "seeking_funding"),
      where("isDeletedByAdmin", "==", false),
      where("contactEmail", "!=", "demo@gmail.com"), 
      orderBy("createdAt", "desc") // Or postedDate, depending on preference
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetchedPitches: FundingPitch[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        fetchedPitches.push({
          id: doc.id,
          ...data,
          // Ensure dates are handled correctly if they are Timestamps
          postedDate: data.postedDate ? (data.postedDate instanceof Timestamp ? data.postedDate.toDate().toISOString() : new Date(data.postedDate).toISOString()) 
                      : (data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : new Date(data.createdAt as any).toISOString()),
          createdAt: data.createdAt, 
          updatedAt: data.updatedAt,
          pitchImageUrl: data.pitchImageUrl || null, // Ensure pitchImageUrl exists
        } as FundingPitch);
      });
      setAllPitches(fetchedPitches);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching funding pitches for corporation view:", error);
      toast({ title: "Error Loading Opportunities", description: "Could not load funding opportunities.", variant: "destructive" });
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [authLoading, toast]); // Removed db from dependency as it's stable

  const filteredPitches = useMemo(() => {
    return allPitches.filter(pitch =>
      pitch.projectTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (pitch.industry && pitch.industry.toLowerCase().includes(searchTerm.toLowerCase())) || // Check if industry exists
      (pitch.projectSummary && pitch.projectSummary.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [allPitches, searchTerm]);
  
  const getStatusBadgeClasses = (status: FundingPitch["status"]): string => {
    switch(status) {
      case 'seeking_funding': return 'bg-blue-500 text-white border-blue-500';
      default: return 'border-gray-300 text-gray-600';
    }
  }

  if (isLoading || authLoading) { // Check authLoading as well
    return <div className="container mx-auto py-8 px-4 md:px-6 text-center">Loading opportunities...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center">
            <Lightbulb className="mr-3 h-8 w-8 text-primary" />
            Funding Opportunities
          </h1>
          <p className="text-muted-foreground">
            Browse funding pitches from fund raisers and entrepreneurs relevant to corporations.
          </p>
        </div>
      </div>

      <Card className="shadow-lg rounded-xl">
        <CardHeader>
          <CardTitle>Pitches Seeking Investment ({filteredPitches.length})</CardTitle>
          <CardDescription>
            Explore projects looking for angel investment or corporate partnership.
          </CardDescription>
           <div className="relative mt-4">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by project title, industry, summary..."
              className="pl-8 w-full md:w-1/2 lg:w-1/3"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          {filteredPitches.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredPitches.map((pitch) => {
                const isDataUri = pitch.pitchImageUrl && pitch.pitchImageUrl.startsWith('data:image');
                const isLikelyFilename = pitch.pitchImageUrl && !isDataUri;
                return (
                  <Card key={pitch.id} className="flex flex-col shadow-md hover:shadow-lg transition-shadow duration-300 rounded-xl overflow-hidden">
                    {pitch.pitchImageUrl && isDataUri ? (
                       <div className="relative h-48 w-full">
                          <NextImage 
                              src={pitch.pitchImageUrl} 
                              alt={pitch.projectTitle} 
                              layout="fill" 
                              objectFit="cover" 
                              className="rounded-t-xl"
                              data-ai-hint="project image"
                          />
                      </div>
                     ) : pitch.pitchImageUrl && isLikelyFilename ? (
                        <div className="h-48 w-full bg-muted flex flex-col items-center justify-center rounded-t-xl p-4 text-center">
                            <ImageIcon className="h-16 w-16 text-primary/30 mb-2"/>
                            <p className="text-xs text-muted-foreground truncate">Image: {pitch.pitchImageUrl}</p>
                        </div>
                    ) : (
                      <div className="h-48 w-full bg-muted flex items-center justify-center rounded-t-xl">
                          <Lightbulb className="h-16 w-16 text-primary/30"/>
                      </div>
                    )}
                    <CardHeader className="p-4">
                      <CardTitle className="text-lg leading-tight line-clamp-2 hover:text-primary">
                         <Link href={`/dashboard/pitch-detail/${pitch.id}`}>{pitch.projectTitle}</Link>
                      </CardTitle>
                      <Badge variant="outline" className={getStatusBadgeClasses(pitch.status) + " py-1 px-2 text-xs mt-1 w-fit"}>
                        Seeking Funding
                      </Badge>
                       {pitch.featureStatus === 'active' && pitch.featureEndsAt && 
                        (pitch.featureEndsAt instanceof Timestamp ? pitch.featureEndsAt.toDate() : new Date(pitch.featureEndsAt as any)) > new Date() && (
                        <Badge variant="default" className="bg-accent text-accent-foreground ml-1 text-xs">Featured!</Badge>
                      )}
                    </CardHeader>
                    <CardContent className="p-4 flex-grow space-y-2 text-sm">
                      <p className="text-muted-foreground line-clamp-3 text-xs">{pitch.projectSummary}</p>
                      <div className="flex items-center gap-1.5"><Briefcase className="h-4 w-4 text-primary/70"/>Industry: {pitch.industry}</div>
                      <div className="flex items-center gap-1.5"><DollarSign className="h-4 w-4 text-green-600"/>Seeking: PKR {pitch.fundingAmountSought.toLocaleString()}</div>
                      <div className="flex items-center gap-1.5"><Percent className="h-4 w-4 text-blue-600"/>Equity: {pitch.equityOffered}%</div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <CalendarDays className="h-3.5 w-3.5"/>
                        Posted: {pitch.createdAt instanceof Timestamp ? format(pitch.createdAt.toDate(), "dd MMM, yyyy") : (pitch.postedDate ? format(new Date(pitch.postedDate), "dd MMM, yyyy") : "N/A")}
                      </div>
                    </CardContent>
                     <CardFooter className="p-4 border-t bg-muted/20">
                      <Button asChild className="w-full" variant="default">
                        <Link href={`/dashboard/pitch-detail/${pitch.id}`}> 
                          <Eye className="mr-2 h-4 w-4"/> View Full Pitch
                        </Link>
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-10 text-muted-foreground">
              <Lightbulb className="mx-auto h-16 w-16 text-primary/20 mb-4" />
              <p className="text-lg font-medium">No Active Funding Pitches Found</p>
              <p className="text-sm">
                {searchTerm ? "No pitches match your current search." : "There are currently no active funding pitches from users."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
