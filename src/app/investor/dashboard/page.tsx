
"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, Activity, DollarSign, BarChart2, Zap, Eye, Briefcase, Percent, CalendarDays, Lightbulb, ImageIcon, Bitcoin, Star, ArrowRight } from "lucide-react"; 
import {
  ChartContainer,
} from "@/components/ui/chart";
import type { ChartConfig } from "@/components/ui/chart";
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebaseConfig';
import { collection, query, where, orderBy, onSnapshot, Timestamp } from "firebase/firestore";
import type { FundingPitch } from '@/app/offers/my-ads/page';
import NextImage from 'next/image';
import { format, isFuture } from 'date-fns'; 
import { Badge } from '@/components/ui/badge';

const marketStatsData = {
  marketIndexName: "KSE 100",
  indexValue: "75,230.50",
  indexChange: "+150.20 (+0.20%)",
  indexChangeType: "positive" as "positive" | "negative",
  marketVolume: "250M Shares",
  marketCap: "PKR 15.2T",
};

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  change?: string;
  changeType?: "positive" | "negative";
}

function MarketStatCard({ title, value, icon, change, changeType }: StatCardProps) {
  return (
    <Card className="shadow-md hover:shadow-lg transition-shadow rounded-xl">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {React.cloneElement(icon as React.ReactElement, { className: "h-5 w-5 text-primary" })}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {change && (
          <p className={`text-xs ${changeType === "positive" ? "text-green-600" : "text-red-600"}`}>
            {change}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default function InvestorHomePage() {
  const { currentUser: authUser, loading: authLoading } = useAuth();
  const [featuredPitches, setFeaturedPitches] = useState<FundingPitch[]>([]);
  const [isLoadingFeatured, setIsLoadingFeatured] = useState(true);

  const [cryptoPrices, setCryptoPrices] = useState({
    bitcoin: { price: "PKR 17,543,210", change: "+1.5%", type: "positive" as "positive" | "negative" },
    usdt: { price: "PKR 278.50", change: "-0.05%", type: "negative" as "positive" | "negative" },
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setCryptoPrices(prev => ({
        bitcoin: {
          price: `PKR ${(parseFloat(prev.bitcoin.price.replace(/PKR |,|-/g, '')) * (1 + (Math.random() - 0.49) * 0.01)).toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0})}`,
          change: `${((Math.random() - 0.49) * 2).toFixed(2)}%`,
          type: Math.random() > 0.5 ? "positive" : "negative",
        },
        usdt: {
          price: `PKR ${(parseFloat(prev.usdt.price.replace(/PKR |,|-/g, '')) * (1 + (Math.random() - 0.49) * 0.001)).toFixed(2)}`,
          change: `${((Math.random() - 0.49) * 0.1).toFixed(2)}%`,
          type: Math.random() > 0.5 ? "positive" : "negative",
        }
      }));
    }, 5000); 
    return () => clearInterval(interval);
  }, []);


  useEffect(() => {
    if (authLoading || !db) {
      setIsLoadingFeatured(false);
      return;
    }
    setIsLoadingFeatured(true);
    const pitchesRef = collection(db, "fundingPitches");
    const q = query(
      pitchesRef,
      where("featureStatus", "in", ["active", "pending_approval"]),
      where("isDeletedByAdmin", "==", false),
      where("status", "==", "seeking_funding"), 
      where("contactEmail", "!=", "demo@gmail.com"),
      orderBy("featureStatus", "asc"),
      orderBy("featureRequestedAt", "desc") 
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetchedPitches: FundingPitch[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const featureEndsAtDate = data.featureEndsAt instanceof Timestamp ? data.featureEndsAt.toDate() : (data.featureEndsAt ? new Date(data.featureEndsAt as string | Date) : null);
        
        if (data.featureStatus === 'pending_approval' || (data.featureStatus === 'active' && featureEndsAtDate && isFuture(featureEndsAtDate))) {
          fetchedPitches.push({
            id: doc.id,
            ...data,
            postedDate: data.postedDate || (data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : new Date().toISOString()),
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
            featureStatus: data.featureStatus,
            featureEndsAt: featureEndsAtDate ? featureEndsAtDate.toISOString() : null,
            pitchImageUrl: data.pitchImageUrl || null,
          } as FundingPitch);
        }
      });
      setFeaturedPitches(fetchedPitches.slice(0, 6)); 
      setIsLoadingFeatured(false);
    }, (error) => {
      console.error("Error fetching featured pitches: ", error);
      setIsLoadingFeatured(false);
    });

    return () => unsubscribe();
  }, [authLoading]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center">
          <Activity className="mr-3 h-8 w-8 text-primary" />
          Market &amp; Investment Dashboard
        </h1>
        <p className="text-muted-foreground">
          Overview of market trends, crypto prices, and investment opportunities.
        </p>
      </div>

      <section>
        <h2 className="text-2xl font-semibold tracking-tight mb-4 text-foreground">Market Overview</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3"> 
          <MarketStatCard
            title={marketStatsData.marketIndexName}
            value={marketStatsData.indexValue}
            icon={<TrendingUp />}
            change={marketStatsData.indexChange}
            changeType={marketStatsData.indexChangeType}
          />
          <MarketStatCard
            title="Market Volume"
            value={marketStatsData.marketVolume}
            icon={<BarChart2 />}
          />
          <MarketStatCard
            title="Total Market Cap"
            value={marketStatsData.marketCap}
            icon={<DollarSign />}
          />
           <MarketStatCard
            title="Bitcoin (BTC) Price"
            value={cryptoPrices.bitcoin.price}
            icon={<Bitcoin />}
            change={cryptoPrices.bitcoin.change}
            changeType={cryptoPrices.bitcoin.type}
          />
          <MarketStatCard
            title="USDT Price (PKR)"
            value={cryptoPrices.usdt.price}
            icon={<DollarSign />}
            change={cryptoPrices.usdt.change}
            changeType={cryptoPrices.usdt.type}
          />
           <MarketStatCard
            title="Investor Sentiment"
            value="Neutral"
            icon={<Zap />}
            change="Slightly Bullish"
            changeType="positive"
          />
        </div>
      </section>

      <section>
        <Card className="shadow-lg rounded-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Star className="h-6 w-6 text-yellow-500"/>Highlighted Startups</CardTitle>
            <CardDescription>
              Actively featured pitches and those pending feature approval.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingFeatured ? (
              <p className="text-muted-foreground text-center py-10">Loading highlighted startups...</p>
            ) : featuredPitches.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {featuredPitches.map((pitch) => {
                  const isDataUri = pitch.pitchImageUrl && pitch.pitchImageUrl.startsWith('data:image');
                  const isLikelyFilename = pitch.pitchImageUrl && !isDataUri;
                  const featureEndsAtDate = pitch.featureEndsAt ? new Date(pitch.featureEndsAt as string | Date) : null;
                  const isCurrentlyFeatured = pitch.featureStatus === 'active' && featureEndsAtDate && isFuture(featureEndsAtDate);

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
                              data-ai-hint="startup project"
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
                          <Link href={`/investor/pitch-detail/${pitch.id}`}>{pitch.projectTitle}</Link>
                        </CardTitle>
                        {isCurrentlyFeatured ? (
                           <Badge variant="default" className="bg-accent text-accent-foreground py-1 px-2 text-xs mt-1 w-fit">
                             <Star className="mr-1 h-3 w-3" /> Featured!
                           </Badge>
                        ) : pitch.featureStatus === 'pending_approval' ? (
                          <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-600 bg-yellow-500/10 py-1 px-2 mt-1 w-fit">
                            <Star className="mr-1 h-3 w-3" /> Feature Pending Approval
                          </Badge>
                        ) : null}
                      </CardHeader>
                      <CardContent className="p-4 pt-0 flex-grow space-y-1.5 text-sm">
                        <p className="text-muted-foreground line-clamp-3 text-xs">{pitch.projectSummary}</p>
                        <div className="flex items-center gap-1.5 text-xs"><Briefcase className="h-4 w-4 text-primary/70"/>Industry: {pitch.industry}</div>
                        <div className="flex items-center gap-1.5 text-xs"><DollarSign className="h-4 w-4 text-green-600"/>Seeking: PKR {pitch.fundingAmountSought.toLocaleString()}</div>
                        <div className="flex items-center gap-1.5 text-xs"><Percent className="h-4 w-4 text-blue-600"/>Equity: {pitch.equityOffered}%</div>
                        {isCurrentlyFeatured && featureEndsAtDate && (
                            <p className="text-xs text-accent font-medium">Featured until: {format(featureEndsAtDate, "dd MMM, yyyy")}</p>
                        )}
                      </CardContent>
                       <CardFooter className="p-4 border-t bg-muted/20">
                        <Button asChild className="w-full" variant="default">
                          <Link href={`/investor/pitch-detail/${pitch.id}`}> 
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
                <Zap className="mx-auto h-12 w-12 text-primary/50 mb-4" />
                <p className="text-lg">No highlighted startups at the moment.</p>
                <p>Check <Link href="/investor/opportunities" className="text-primary hover:underline">All Opportunities</Link> for more investment prospects.</p>
              </div>
            )}
          </CardContent>
           <CardFooter className="border-t pt-4 flex justify-end">
              <Button asChild variant="outline" size="sm">
                <Link href="/investor/opportunities">View All Opportunities <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
            </CardFooter>
        </Card>
      </section>
    </div>
  );
}
