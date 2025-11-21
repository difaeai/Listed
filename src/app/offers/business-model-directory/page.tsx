
"use client";
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, BookOpen, Briefcase, TrendingUp, Search, DollarSign, Loader2, Star } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import React, { useState, useEffect, useMemo } from 'react';
import { db } from '@/lib/firebaseConfig';
import { collection, query, where, onSnapshot, orderBy, Timestamp } from 'firebase/firestore';
import type { BusinessDirectoryEntry } from '@/app/admin/manage-directory/page';
import { useAuth } from '@/contexts/AuthContext';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from '@/lib/utils';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { isFuture } from 'date-fns';

export default function BusinessModelDirectoryPage() {
  const [directoryEntries, setDirectoryEntries] = useState<BusinessDirectoryEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const { currentUser: authUser, loading: authLoading } = useAuth();

  const isDemoUser = authUser?.email === 'demo@gmail.com';

  const hasAnnualSubscription = useMemo(() => {
    if (!authUser || authUser.type !== 'professional' || authUser.status !== 'active') return false;
    if (authUser.subscriptionType !== 'yearly') return false;
    if (!authUser.subscriptionExpiryDate) return false;
    const expiryDate = authUser.subscriptionExpiryDate instanceof Timestamp 
      ? authUser.subscriptionExpiryDate.toDate() 
      : new Date(authUser.subscriptionExpiryDate as string | Date);
    return isFuture(expiryDate);
  }, [authUser]);

  useEffect(() => {
    if (authLoading) return;
    if (!hasAnnualSubscription) {
      setIsLoading(false);
      return;
    }
    if (!db) {
        setIsLoading(false);
        return;
    }
    
    setIsLoading(true);
    const directoryRef = collection(db, "businessDirectory");
    const q = query(directoryRef, where("status", "==", "published"), orderBy("businessName", "asc"));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const entries: BusinessDirectoryEntry[] = [];
      querySnapshot.forEach((doc) => {
        entries.push({ id: doc.id, ...doc.data() } as BusinessDirectoryEntry);
      });
      setDirectoryEntries(entries);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching business models:", error);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [hasAnnualSubscription, authLoading]);

  const filteredBusinesses = useMemo(() => {
    return directoryEntries.filter(biz =>
      biz.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      biz.industry.toLowerCase().includes(searchTerm.toLowerCase()) ||
      biz.model.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [directoryEntries, searchTerm]);

  const BusinessCard = ({ biz }: { biz: BusinessDirectoryEntry }) => {
    const isLocked = isDemoUser;
    return (
      <Card className={cn(
          "flex flex-col shadow-md transition-all duration-300 rounded-xl overflow-hidden h-full",
          !isLocked && "hover:shadow-lg hover:border-primary/50 cursor-pointer",
          isLocked && "cursor-not-allowed opacity-80"
      )}>
        <CardHeader className="p-4">
          <CardTitle className="text-lg leading-tight">
            {biz.businessName}
          </CardTitle>
          <div className="flex flex-wrap gap-2 mt-1">
              <Badge variant="secondary" className="text-xs"><Briefcase className="mr-1 h-3 w-3"/>{biz.industry}</Badge>
              <Badge variant="outline" className="text-xs">{biz.model}</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-4 flex-grow space-y-2 text-sm">
          <p className="text-muted-foreground line-clamp-3">{biz.shortDescription}</p>
          {biz.requiredInvestment && (
              <p className="font-medium text-blue-600 flex items-center text-xs"><DollarSign className="mr-1 h-3.5 w-3.5"/> Investment: {biz.requiredInvestment}</p>
          )}
          <p className="font-medium text-accent flex items-center text-xs"><TrendingUp className="mr-1 h-3.5 w-3.5"/> Growth: {biz.expectedAnnualGrowth}</p>
        </CardContent>
        <CardFooter className="p-4 pt-2 border-t bg-muted/20 mt-auto">
            <p className="text-xs text-primary font-semibold">
                {isLocked ? "Details locked" : "View Details \u2192"}
            </p>
        </CardFooter>
      </Card>
    );
  };


  if (isLoading || authLoading) {
     return (
      <div className="container mx-auto py-8 px-4 md:px-6">
        <Button variant="outline" asChild className="mb-4">
          <Link href="/home"><ArrowLeft className="mr-2 h-4 w-4" /> Back to User Portal</Link>
        </Button>
        <div className="text-center flex flex-col items-center justify-center py-10">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
          <p>Loading Business Model Directory...</p>
        </div>
      </div>
    );
  }

  if (!hasAnnualSubscription) {
    return (
      <div className="container mx-auto py-8 px-4 md:px-6">
        <Button variant="outline" asChild className="mb-4">
            <Link href="/home"><ArrowLeft className="mr-2 h-4 w-4" /> Back to User Portal</Link>
        </Button>
        <Alert variant="default" className="border-yellow-500 bg-yellow-100/80 text-yellow-800">
            <Star className="h-5 w-5 text-yellow-600" />
            <AlertTitle className="font-bold">Premium Feature</AlertTitle>
            <AlertDescription>
                The Business Model Directory is an exclusive feature for Annual Subscribers. Upgrade your plan to unlock these valuable insights and kickstart your entrepreneurial journey.
                <Button asChild variant="link" className="p-0 h-auto ml-2 text-yellow-800 font-bold">
                    <Link href="/verify-payment">Upgrade Now</Link>
                </Button>
            </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
        <Button variant="outline" asChild className="mb-4">
        <Link href="/home"><ArrowLeft className="mr-2 h-4 w-4" /> Back to User Portal</Link>
        </Button>
      
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight flex items-center">
            <BookOpen className="mr-3 h-8 w-8 text-primary" /> Business Model Directory
        </h1>
        <p className="text-muted-foreground">Explore different business models relevant to the Pakistani market, their potential, and insights.</p>
      </div>

        <>
          <Card className="shadow-lg rounded-xl mb-6">
            <CardHeader>
              <CardTitle>Filter Directory</CardTitle>
                <div className="relative mt-2">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                    type="search"
                    placeholder="Search by business name, industry, model..."
                    className="pl-8 w-full md:w-1/2 lg:w-1/3"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </CardHeader>
          </Card>

          {filteredBusinesses.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredBusinesses.map((biz) => {
                const isLocked = isDemoUser;
                const card = <BusinessCard biz={biz} />;
                return isLocked ? (
                    <TooltipProvider key={biz.id}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div>{card}</div>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Viewing details is disabled for demo accounts.</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                ) : (
                    <Link key={biz.id} href={`/business-model-directory/${biz.id}`} passHref>
                        {card}
                    </Link>
                );
              })}
            </div>
          ) : (
            <Card className="col-span-full text-center py-16 shadow-lg rounded-xl">
              <CardContent className="flex flex-col items-center">
                <BookOpen className="mx-auto h-16 w-16 text-muted-foreground/50 mb-4" />
                <h3 className="text-xl font-semibold mb-2 text-foreground">No Business Models Found</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  {searchTerm ? "No published business models match your search criteria." : "No business models are currently published. Please check back later."}
                </p>
              </CardContent>
            </Card>
          )}
        </>
    </div>
  );
}
