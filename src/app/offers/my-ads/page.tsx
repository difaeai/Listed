
"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PlusCircle, Search, Lightbulb, Edit, Trash2, Eye, MoreHorizontal, Users as UsersIcon, CalendarDays, MessageSquare, Star, Info, FileText, AlertTriangle, XCircle, RotateCcw, ImageIcon } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { format, isFuture } from 'date-fns';
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebaseConfig';
import { collection, query, where, orderBy, onSnapshot, doc, deleteDoc, Timestamp, getDocs, writeBatch, updateDoc, serverTimestamp, deleteField, type FieldValue } from "firebase/firestore";
import NextImage from 'next/image';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Alert, AlertTitle as ShadAlertTitle, AlertDescription as ShadAlertDescription } from "@/components/ui/alert";


// Interface for Funding Pitch
export interface FundingPitch {
  id?: string; 
  creatorId: string;
  creatorName: string;
  creatorAvatarSeed?: string;
  projectTitle: string;
  projectSummary: string;
  fundingAmountSought: number;
  equityOffered: number;
  status: 'draft' | 'seeking_funding' | 'funded' | 'closed';
  industry: string;
  businessPlanLink?: string | null;
  contactEmail: string;
  pitchImageUrl?: string | null; 
  views?: number;
  interestedInvestorsCount?: number; 
  negativeResponseRate?: number;
  createdAt?: Timestamp | Date | FieldValue; 
  updatedAt?: Timestamp | Date | FieldValue; 
  postedDate?: string; 
  isDeletedByAdmin?: boolean;
  // Feature related fields
  featureRequestedAt?: Timestamp | Date | null | FieldValue;
  featurePaymentProofDataUri?: string | null; 
  featureStatus?: 'none' | 'pending_approval' | 'active' | 'rejected' | 'expired';
  featureEndsAt?: Timestamp | Date | null | FieldValue;
}

export type IndustryType = "Technology" | "Real Estate" | "Healthcare" | "Education" | "Manufacturing" | "Retail" | "Services" | "Agriculture" | "Fintech" | "E-commerce" | "Other";


export default function MyPitchesPage() {
  const [allUserPitches, setAllUserPitches] = useState<FundingPitch[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const { currentUser: authUser, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [activePitchesCount, setActivePitchesCount] = useState(0);
  const [maxPitchesAllowed, setMaxPitchesAllowed] = useState(0);

  useEffect(() => {
    if (authLoading || !authUser || !authUser.uid || !db) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    if (authUser.type === 'professional') {
        
        let currentMaxAllowed = 0;
        if (authUser.status === 'active') {
            if (authUser.subscriptionType === 'yearly' && authUser.subscriptionExpiryDate && isFuture(authUser.subscriptionExpiryDate instanceof Timestamp ? authUser.subscriptionExpiryDate.toDate() : new Date(authUser.subscriptionExpiryDate as string | Date))) {
                currentMaxAllowed = 3;
            } else if (authUser.subscriptionType === 'monthly' && authUser.subscriptionExpiryDate && isFuture(authUser.subscriptionExpiryDate instanceof Timestamp ? authUser.subscriptionExpiryDate.toDate() : new Date(authUser.subscriptionExpiryDate as string | Date))) {
                currentMaxAllowed = 1;
            }
        }
        setMaxPitchesAllowed(currentMaxAllowed);

        const pitchesRef = collection(db, "fundingPitches");
        const q = query(
          pitchesRef,
          where("creatorId", "==", authUser.uid),
          where("isDeletedByAdmin", "==", false),
          orderBy("createdAt", "desc")
        );

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
          const fetchedPitches: FundingPitch[] = [];
          let currentActiveCount = 0;
          querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const pitch = {
              id: docSnap.id,
              ...data,
              createdAt: data.createdAt,
              updatedAt: data.updatedAt,
              featureRequestedAt: data.featureRequestedAt || null,
              featurePaymentProofDataUri: data.featurePaymentProofDataUri || null,
              featureStatus: data.featureStatus || 'none',
              featureEndsAt: data.featureEndsAt || null,
              pitchImageUrl: data.pitchImageUrl || null,
            } as FundingPitch;
            fetchedPitches.push(pitch);
            if (pitch.status === 'seeking_funding') {
              currentActiveCount++;
            }
          });
          setAllUserPitches(fetchedPitches);
          setActivePitchesCount(currentActiveCount);
          setIsLoading(false);
        }, (error) => {
          console.error("Error fetching funding pitches: ", error);
          toast({ title: "Error", description: "Could not fetch your funding pitches.", variant: "destructive" });
          setIsLoading(false);
        });

        return () => unsubscribe();
    } else {
        setIsLoading(false);
    }
  }, [authUser, authLoading, toast]);

  const liveFeaturedPitches = useMemo(() => {
    return allUserPitches.filter(p =>
      p.featureStatus === 'active' &&
      p.status === 'seeking_funding' &&
      p.featureEndsAt &&
      isFuture(p.featureEndsAt instanceof Timestamp ? p.featureEndsAt.toDate() : new Date(p.featureEndsAt as any))
    );
  }, [allUserPitches]);

  const pendingOrRejectedFeaturePitches = useMemo(() => {
    return allUserPitches.filter(p =>
      (p.featureStatus === 'pending_approval' || p.featureStatus === 'rejected') &&
      p.status === 'seeking_funding'
    );
  }, [allUserPitches]);

  const regularPitches = useMemo(() => {
    return allUserPitches.filter(p =>
      !liveFeaturedPitches.some(f => f.id === p.id) &&
      !pendingOrRejectedFeaturePitches.some(pend => pend.id === p.id) &&
      (p.featureStatus === 'none' || 
       p.featureStatus === 'expired' ||
       (p.featureStatus === 'active' && p.featureEndsAt && !(isFuture(p.featureEndsAt instanceof Timestamp ? p.featureEndsAt.toDate() : new Date(p.featureEndsAt as any))))
      )
    );
  }, [allUserPitches, liveFeaturedPitches, pendingOrRejectedFeaturePitches]);


  const applySearchFilter = useCallback((pitches: FundingPitch[]) => {
    if (!searchTerm.trim()) return pitches;
    return pitches.filter(p =>
      p.projectTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.industry && p.industry.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [searchTerm]);

  const filteredActiveFeaturedPitches = useMemo(() => applySearchFilter(liveFeaturedPitches), [liveFeaturedPitches, applySearchFilter]);
  const filteredPendingOrRejectedFeaturePitches = useMemo(() => applySearchFilter(pendingOrRejectedFeaturePitches), [pendingOrRejectedFeaturePitches, applySearchFilter]);
  const filteredRegularPitches = useMemo(() => applySearchFilter(regularPitches), [regularPitches, applySearchFilter]);

  const handleDeletePitch = async (pitchId: string, pitchTitle: string) => {
    if (!db || !pitchId) return;
    setIsLoading(true);
    try {
      const pitchDocRef = doc(db, "fundingPitches", pitchId);
      const interestsColRef = collection(db, "fundingPitches", pitchId, "interests");
      const viewersColRef = collection(db, "fundingPitches", pitchId, "viewers");

      const batch = writeBatch(db);

      const interestsSnapshot = await getDocs(interestsColRef);
      interestsSnapshot.docs.forEach(docSnap => batch.delete(docSnap.ref));

      const viewersSnapshot = await getDocs(viewersColRef);
      viewersSnapshot.docs.forEach(docSnap => batch.delete(docSnap.ref));
      
      batch.delete(pitchDocRef);
      await batch.commit();

      toast({
        title: "Pitch Deleted",
        description: `The funding pitch "${pitchTitle}" has been successfully deleted from LISTED.`,
      });
    } catch (error) {
      console.error("Error deleting pitch from Firestore: ", error);
      toast({ title: "Deletion Failed", description: "Could not delete the pitch.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleFeatureRequestAction = async (pitchId: string, action: 'request' | 'cancel' | 'unfeature') => {
    if (!db || !pitchId) return;
    const pitchDocRef = doc(db, "fundingPitches", pitchId);
    let updateData: Partial<FundingPitch> = { updatedAt: serverTimestamp() as Timestamp };
    let toastTitle = "";
    let toastDescription = "";

    if (action === 'request') {
      updateData.featureStatus = 'pending_approval';
      updateData.featureRequestedAt = serverTimestamp() as Timestamp;
      updateData.featurePaymentProofDataUri = deleteField() as any; 
      updateData.featureEndsAt = deleteField() as any; 
      toastTitle = "Feature Request Submitted";
      toastDescription = "Your request to feature this pitch has been submitted. Please upload payment proof via the Subscription page if required.";
    } else if (action === 'cancel') {
      updateData.featureStatus = 'none';
      updateData.featureRequestedAt = deleteField() as any;
      updateData.featurePaymentProofDataUri = deleteField() as any;
      toastTitle = "Feature Request Cancelled";
      toastDescription = "Your request to feature this pitch has been cancelled.";
    } else if (action === 'unfeature') {
      updateData.featureStatus = 'expired'; // Mark as expired if unfeatured manually
      updateData.featureEndsAt = serverTimestamp() as Timestamp; // Set endsAt to now
      toastTitle = "Pitch Unfeatured";
      toastDescription = "Your pitch is no longer actively featured.";
    }

    try {
      await updateDoc(pitchDocRef, updateData as any); 
      toast({ title: toastTitle, description: toastDescription });
    } catch (error) {
      console.error(`Error ${action} feature for pitch:`, error);
      toast({ title: "Error", description: `Could not ${action} feature for the pitch.`, variant: "destructive" });
    }
  };

  const getStatusBadgeClasses = (status: FundingPitch["status"]): string => {
    switch (status) {
      case 'seeking_funding': return 'bg-blue-500 text-white border-blue-500';
      case 'funded': return 'bg-accent text-accent-foreground border-accent';
      case 'closed': return 'bg-destructive/80 text-destructive-foreground border-destructive/80';
      case 'draft': return 'border-yellow-500 text-yellow-600 bg-yellow-500/10';
      default: return 'border-gray-300 text-gray-600';
    }
  };

  const getFeatureStatusDisplay = (pitch: FundingPitch) => {
    if (!pitch.featureStatus || pitch.featureStatus === 'none') return null;
    let variant: "default" | "secondary" | "destructive" | "outline" = "outline";
    let text = "";
    let actionRequiredMessage: string | null = null;

    const featureEndsAtDate = pitch.featureEndsAt instanceof Timestamp ? pitch.featureEndsAt.toDate() : pitch.featureEndsAt ? new Date(pitch.featureEndsAt as any) : null;

    switch (pitch.featureStatus) {
      case 'pending_approval':
        variant = 'secondary';
        if (pitch.featurePaymentProofDataUri) {
          text = 'Feature: Under Admin Review';
        } else {
          text = 'Feature: Awaiting Payment Proof';
          actionRequiredMessage = "Upload Proof via Subscription Page";
        }
        break;
      case 'active':
        variant = 'default'; 
        text = 'Live Featured Pitch!';
        if (featureEndsAtDate) {
          if (isFuture(featureEndsAtDate)) {
            text += ` (Ends ${format(featureEndsAtDate, "dd MMM")})`;
          } else {
            text = 'Feature: Expired'; 
            variant = 'outline';
          }
        }
        break;
      case 'rejected':
        variant = 'destructive';
        text = 'Feature Request: Rejected';
        break;
      case 'expired':
        variant = 'outline';
        text = 'Feature: Expired';
        break;
    }
    return { text, variant, actionRequiredMessage };
  };

  const canRequestFeature = (pitch: FundingPitch): boolean => {
    const featureEndsAtDate = pitch.featureEndsAt instanceof Timestamp ? pitch.featureEndsAt.toDate() : pitch.featureEndsAt ? new Date(pitch.featureEndsAt as any) : null;
    return !!(pitch.status === 'seeking_funding' &&
      (!pitch.featureStatus || pitch.featureStatus === 'none' || pitch.featureStatus === 'rejected' || pitch.featureStatus === 'expired' ||
        (pitch.featureStatus === 'active' && featureEndsAtDate && !(isFuture(featureEndsAtDate)))));
  };

  const renderPitchCard = (pitch: FundingPitch) => {
    const featureStatusDisplay = getFeatureStatusDisplay(pitch);
    const featureEndsAtDate = pitch.featureEndsAt instanceof Timestamp ? pitch.featureEndsAt.toDate() : pitch.featureEndsAt ? new Date(pitch.featureEndsAt as any) : null;
    const isCurrentlyFeatured = pitch.featureStatus === 'active' && featureEndsAtDate && isFuture(featureEndsAtDate);
    const pitchCreatedAtDate = pitch.createdAt instanceof Timestamp ? pitch.createdAt.toDate() : pitch.createdAt ? new Date(pitch.createdAt as any) : null;
    
    const isDataUri = pitch.pitchImageUrl && pitch.pitchImageUrl.startsWith('data:image');
    const isLikelyFilename = pitch.pitchImageUrl && !isDataUri;

    return (
      <Card key={pitch.id} className="flex flex-col shadow-md hover:shadow-lg transition-shadow duration-300 rounded-xl overflow-hidden">
        {pitch.pitchImageUrl && isDataUri ? (
          <div className="relative h-40 w-full">
            <NextImage src={pitch.pitchImageUrl} alt={pitch.projectTitle} layout="fill" objectFit="cover" className="rounded-t-md" data-ai-hint="pitch preview"/>
          </div>
        ) : pitch.pitchImageUrl && isLikelyFilename ? (
          <div className="h-40 w-full bg-muted flex flex-col items-center justify-center rounded-t-md p-2 text-center">
            <ImageIcon className="h-12 w-12 text-muted-foreground/50 mb-2" />
            <p className="text-xs text-muted-foreground truncate">Image: {pitch.pitchImageUrl.length > 30 ? pitch.pitchImageUrl.substring(0,27) + '...' : pitch.pitchImageUrl}</p>
          </div>
        ) : (
          <div className="h-40 w-full bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center rounded-t-md">
            <Lightbulb className="h-16 w-16 text-primary/30" />
          </div>
        )}
        <CardHeader className="p-4 pt-2">
          <div className="flex justify-between items-start">
            <CardTitle className="text-lg leading-tight line-clamp-2 hover:text-primary">
              <Link href={`/offers/my-ads/view/${pitch.id}`}>{pitch.projectTitle}</Link>
            </CardTitle>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href={`/offers/my-ads/view/${pitch.id}`}><Eye className="mr-2 h-4 w-4" />View & Engagement</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`/offers/my-ads/edit/${pitch.id}`}><Edit className="mr-2 h-4 w-4" />Edit Pitch</Link>
                </DropdownMenuItem>
                
                {canRequestFeature(pitch) && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <DropdownMenuItem onClick={() => handleFeatureRequestAction(pitch.id!, 'request')}>
                          <Star className="mr-2 h-4 w-4" /> Request to Feature
                        </DropdownMenuItem>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Boost visibility & reach all investors by featuring your pitch!</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                {pitch.featureStatus === 'pending_approval' && (
                  <DropdownMenuItem onClick={() => handleFeatureRequestAction(pitch.id!, 'cancel')} className="text-orange-600 focus:text-orange-700">
                    <XCircle className="mr-2 h-4 w-4" /> Cancel Feature Request
                  </DropdownMenuItem>
                )}
                {isCurrentlyFeatured && (
                  <DropdownMenuItem 
                    onClick={() => handleFeatureRequestAction(pitch.id!, 'unfeature')} 
                    className="text-red-600 focus:text-red-700"
                    disabled={true} // Always disable if currently featured for 7 days
                  >
                    <RotateCcw className="mr-2 h-4 w-4" /> Unfeature Pitch Now
                  </DropdownMenuItem>
                )}

                <DropdownMenuSeparator />
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                      <Trash2 className="mr-2 h-4 w-4" />Delete Pitch
                    </DropdownMenuItem>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle><AlertDialogDescription>This action will permanently delete this funding pitch.</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDeletePitch(pitch.id!, pitch.projectTitle)} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">Delete</AlertDialogAction></AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="flex flex-col items-start mt-1 space-y-1">
            <Badge variant="outline" className={`${getStatusBadgeClasses(pitch.status)} py-1 px-2 text-xs w-fit`}>
              {pitch.status.replace('_', ' ').split(' ').map(s => s.charAt(0).toUpperCase() + s.substring(1)).join(' ')}
            </Badge>
            {featureStatusDisplay && (
              <Badge variant={featureStatusDisplay.variant} className={`text-xs ${featureStatusDisplay.variant === 'default' ? 'bg-accent text-accent-foreground' : ''}`}>
                {featureStatusDisplay.text}
              </Badge>
            )}
            {featureStatusDisplay?.actionRequiredMessage && (
              <Link href="/offers/verify-payment" className="text-xs text-primary hover:underline mt-1">
                {featureStatusDisplay.actionRequiredMessage} &rarr;
              </Link>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0 flex-grow space-y-2 text-sm">
          <p className="text-muted-foreground line-clamp-3 text-xs">{pitch.projectSummary}</p>
        </CardContent>
        <CardFooter className="p-4 border-t bg-muted/20">
          <div className="flex justify-between w-full text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5"/> {pitch.views || 0} views</span>
              <span className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5"/>
                 {pitchCreatedAtDate ? format(pitchCreatedAtDate, "dd MMM, yyyy") : (pitch.postedDate ? format(new Date(pitch.postedDate), "dd MMM, yyyy") : "N/A")}
              </span>
          </div>
        </CardFooter>
      </Card>
    );
  };

  if (authLoading || isLoading) {
    return <div className="container mx-auto py-8 px-4 md:px-6 text-center">Loading your funding pitches...</div>;
  }
  
  if (!authUser) {
    return <div className="container mx-auto py-8 px-4 md:px-6 text-center">Please log in to view your pitches.</div>;
  }

  const noPitchesAtAll = allUserPitches.length === 0;
  const noPitchesFoundForSearch = searchTerm && filteredActiveFeaturedPitches.length === 0 && filteredPendingOrRejectedFeaturePitches.length === 0 && filteredRegularPitches.length === 0;

  const canCreateNewPitch = activePitchesCount < maxPitchesAllowed;
  let createPitchButtonTooltipContent = "";
  if (!canCreateNewPitch && authUser.status === 'active') {
    if (authUser.subscriptionType === 'monthly') {
      createPitchButtonTooltipContent = `You have reached your limit of ${maxPitchesAllowed} active pitch for your Monthly plan.`;
    } else if (authUser.subscriptionType === 'yearly') {
      createPitchButtonTooltipContent = `You have reached your limit of ${maxPitchesAllowed} active pitches for your Yearly plan.`;
    } else {
      createPitchButtonTooltipContent = "Activate a subscription to post pitches.";
    }
  } else if (authUser.status !== 'active') {
     createPitchButtonTooltipContent = "Your account needs to be active to post pitches. Please check your subscription.";
  }

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center">
              <Lightbulb className="mr-3 h-8 w-8 text-primary" /> My Funding Pitches
            </h1>
            <p className="text-muted-foreground">Manage your investment proposals and feature requests. Active pitches: {activePitchesCount}/{maxPitchesAllowed}</p>
          </div>
        </div>
        <TooltipProvider>
          <Tooltip delayDuration={100}>
            <TooltipTrigger asChild>
              <div className={!canCreateNewPitch ? "cursor-not-allowed inline-block" : "inline-block"}> {/* Wrap for tooltip on disabled */}
                <Button 
                  asChild={canCreateNewPitch} 
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  disabled={!canCreateNewPitch}
                  onClick={!canCreateNewPitch ? (e) => e.preventDefault() : undefined}
                >
                  {canCreateNewPitch ? (
                    <Link href="/offers/my-ads/create-pitch">
                      <PlusCircle className="mr-2 h-4 w-4" /> Create New Pitch
                    </Link>
                  ) : (
                    <span className="flex items-center">
                      <PlusCircle className="mr-2 h-4 w-4" /> Create New Pitch
                    </span>
                  )}
                </Button>
              </div>
            </TooltipTrigger>
            {!canCreateNewPitch && (
              <TooltipContent>
                <p>{createPitchButtonTooltipContent}</p>
                {authUser && authUser.status === 'active' && (
                    <Link href="/offers/verify-payment" className="text-xs text-primary hover:underline mt-1 block">
                        Manage Subscription
                    </Link>
                )}
                 {authUser && authUser.status !== 'active' && (
                    <Link href="/offers/verify-payment" className="text-xs text-primary hover:underline mt-1 block">
                        Verify Account
                    </Link>
                )}
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      </div>
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search your pitches by title or industry..."
          className="pl-10 w-full md:w-1/2 lg:w-1/3 h-11 rounded-lg"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      
      <Card className="shadow-lg rounded-xl mb-8 border-2 border-accent">
        <CardHeader>
          <CardTitle className="text-xl flex items-center text-accent">
            <Star className="mr-2 h-6 w-6" /> My Live Featured Pitches ({filteredActiveFeaturedPitches.length})
          </CardTitle>
          <CardDescription>These pitches are currently active and highlighted to investors.</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredActiveFeaturedPitches.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredActiveFeaturedPitches.map(pitch => renderPitchCard(pitch))}
            </div>
          ) : (
             <p className="text-muted-foreground py-4 px-6">{searchTerm ? "No live featured pitches match your search." : "You have no pitches currently live featured."}</p>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-lg rounded-xl mb-8 border-2 border-yellow-500">
        <CardHeader>
          <CardTitle className="text-xl flex items-center text-yellow-600">
            <Info className="mr-2 h-6 w-6" /> My Pitches Awaiting Feature Approval / Action ({filteredPendingOrRejectedFeaturePitches.length})
          </CardTitle>
          <CardDescription>These pitches have a feature request pending or require your action (e.g., upload payment proof or re-request if rejected).</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredPendingOrRejectedFeaturePitches.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredPendingOrRejectedFeaturePitches.map(pitch => renderPitchCard(pitch))}
            </div>
          ) : (
            <p className="text-muted-foreground py-4 px-6">{searchTerm ? "No pitches awaiting action match your search." : "No pitches are currently awaiting feature approval or require your action."}</p>
          )}
        </CardContent>
      </Card>
      
      <Card className="shadow-lg rounded-xl">
        <CardHeader>
          <CardTitle className="text-xl">My Pitches ({filteredRegularPitches.length})</CardTitle>
          <CardDescription>
            Your standard funding proposals. To feature a pitch and significantly increase its visibility to all investors: click the menu (•••) on a pitch card below and select 'Request to Feature'. Then, visit the <Link href="/offers/verify-payment" className="text-primary hover:underline font-medium">Subscription page</Link> to complete the payment proof submission if required. Featuring helps you reach a wider investor audience and improves your chances of securing funding.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredRegularPitches.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredRegularPitches.map(pitch => renderPitchCard(pitch))}
            </div>
          ) : (
             (!noPitchesAtAll && !searchTerm) ? 
                <p className="text-muted-foreground py-4 px-6">No other pitches match your current view. Check other categories or clear search.</p> 
             : (noPitchesAtAll && !searchTerm) ? 
                null 
             : (searchTerm && noPitchesFoundForSearch) ? 
                null 
             : <p className="text-muted-foreground py-4 px-6">You have not created any pitches yet, or all your pitches are in other categories.</p>
          )}
        </CardContent>
      </Card>

      {noPitchesAtAll && !searchTerm && (
        <div className="text-center py-10 mt-8">
          <Lightbulb className="mx-auto h-16 w-16 text-muted-foreground/50 mb-4" />
          <h3 className="text-xl font-semibold mb-2">No Funding Pitches Yet</h3>
          <p className="text-muted-foreground mb-4">
            Get started by creating your first pitch to attract investors.
          </p>
          <TooltipProvider>
            <Tooltip delayDuration={100}>
              <TooltipTrigger asChild>
                <div className={!canCreateNewPitch ? "cursor-not-allowed inline-block" : "inline-block"}> {/* Wrap for tooltip on disabled */}
                  <Button 
                    asChild={canCreateNewPitch} 
                    disabled={!canCreateNewPitch}
                    onClick={!canCreateNewPitch ? (e) => e.preventDefault() : undefined}
                  >
                    {canCreateNewPitch ? (
                      <Link href="/offers/my-ads/create-pitch">
                        <PlusCircle className="mr-2 h-4 w-4" /> Create New Pitch
                      </Link>
                    ) : (
                      <span className="flex items-center">
                        <PlusCircle className="mr-2 h-4 w-4" /> Create New Pitch
                      </span>
                    )}
                  </Button>
                </div>
              </TooltipTrigger>
              {!canCreateNewPitch && (
                <TooltipContent>
                  <p>{createPitchButtonTooltipContent}</p>
                    {authUser && authUser.status === 'active' && (
                    <Link href="/offers/verify-payment" className="text-xs text-primary hover:underline mt-1 block">
                        Manage Subscription
                    </Link>
                )}
                 {authUser && authUser.status !== 'active' && (
                    <Link href="/offers/verify-payment" className="text-xs text-primary hover:underline mt-1 block">
                        Verify Account
                    </Link>
                )}
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </div>
      )}

      {noPitchesFoundForSearch && (
        <div className="text-center py-10 mt-8">
             <AlertTriangle className="mx-auto h-16 w-16 text-yellow-500/70 mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Pitches Found for Your Search</h3>
            <p className="text-muted-foreground">Try different keywords or check back later.</p>
        </div>
      )}
    </div>
  );
}

    