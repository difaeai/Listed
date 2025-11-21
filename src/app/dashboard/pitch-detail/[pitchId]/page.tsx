
"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Eye, Users, DollarSign, Briefcase, FileText, Mail, CalendarDays, BarChartHorizontalBig, ImageIcon, ThumbsUp, ThumbsDown, MessageSquare, User as UserIcon, Star, Package, Zap as ZapIcon, Info as InfoIcon, Percent, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type { FundingPitch } from '@/app/offers/my-ads/page';
import { format, isFuture } from 'date-fns';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebaseConfig';
import { doc, getDoc, collection, query, where, onSnapshot, addDoc, serverTimestamp, Timestamp, updateDoc, increment, setDoc, runTransaction } from "firebase/firestore";
import type { DirectMessage } from '@/app/offers/conversations/page'; 
import NextImage from 'next/image';

interface InvestorLiker {
  id: string; 
  userName: string; 
  userAvatarSeed?: string; 
  userType?: 'investor' | 'corporation'; // Added userType
}


export default function CorporationViewPitchDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const offerId = params.pitchId as string;
  const { currentUser: authUser, loading: authLoading } = useAuth();

  const [offer, setOffer] = useState<FundingPitch | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [salesProFeedback, setSalesProFeedback] = useState<{ positive: number, negative: number }>({ positive: 0, negative: 0 });
  const [interestedProfessionals, setInterestedProfessionals] = useState<InvestorLiker[]>([]);

  useEffect(() => {
    if (authLoading || !authUser || authUser.type !== 'company' || !offerId || !db) {
      if (!authLoading && (!authUser || authUser.type !== 'company')) {
         router.push("/auth/corporation-login?reason=unauthorized_corp_offer_detail");
      }
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const offerDocRef = doc(db, "fundingPitches", offerId);
    
    const unsubOffer = onSnapshot(offerDocRef, (docSnap) => {
        if (docSnap.exists()) {
            const offerData = { id: docSnap.id, ...docSnap.data() } as FundingPitch;
            if (offerData.creatorId !== authUser.uid) {
                toast({ title: "Unauthorized", description: "You can only view details of your own pitches here.", variant: "destructive" });
                router.push("/dashboard/my-funding-pitches");
                setOffer(null);
            } else if (offerData.isDeletedByAdmin) {
                 toast({ title: "Pitch Removed", description: "This pitch has been removed by an administrator.", variant: "destructive"});
                 router.push("/dashboard/my-funding-pitches");
                 setOffer(null);
            }
             else {
                setOffer(offerData);
                setSalesProFeedback({
                    positive: offerData.interestedInvestorsCount || 0,
                    negative: offerData.negativeResponseRate || 0,
                });
            }
        } else {
            toast({ title: "Not Found", description: "Pitch not found.", variant: "destructive" });
            setOffer(null);
            router.push("/dashboard/my-funding-pitches");
        }
        setIsLoading(false); // Set loading false after initial offer fetch
    }, (error) => {
        console.error("Error fetching pitch details for corporation:", error);
        toast({ title: "Error", description: "Could not load pitch details.", variant: "destructive" });
        setIsLoading(false);
    });

    // Fetch interested sales professionals (from feedback subcollection)
    const feedbackColRef = collection(db, "fundingPitches", offerId, "interests");
    const qFeedback = query(feedbackColRef); 
    const unsubFeedback = onSnapshot(qFeedback, async (feedbackSnapshot) => {
        const professionals: InvestorLiker[] = [];
        for (const feedbackDoc of feedbackSnapshot.docs) {
            const feedbackData = feedbackDoc.data();
            if (feedbackData.userId) {
                const userDocRef = doc(db, "users", feedbackData.userId);
                const userSnap = await getDoc(userDocRef);
                if (userSnap.exists()) {
                    const userData = userSnap.data();
                    professionals.push({
                        id: userSnap.id,
                        userName: userData.name || "User",
                        userAvatarSeed: userData.avatarSeed || userData.name?.replace(/[^a-zA-Z0-9]/g, '') || userSnap.id,
                        userType: userData.type
                    });
                }
            }
        }
        setInterestedProfessionals(professionals);
    }, (error) => {
        console.error("Error fetching interested parties:", error);
    });


    return () => {
        unsubOffer();
        unsubFeedback();
    };
  }, [offerId, authUser, authLoading, router, toast]);


  const getOfferCategoryIcon = (category?: FundingPitch["industry"]) => {
    if(!category) return <Briefcase className="h-5 w-5 text-primary"/>;
    switch(category) {
        case "Product": return <Package className="h-5 w-5 text-primary" />;
        case "Service": return <Briefcase className="h-5 w-5 text-primary" />;
        case "Subscription": return <ZapIcon className="h-5 w-5 text-primary" />;
        case "Digital Product": return <FileText className="h-5 w-5 text-primary" />;
        case "Event": return <CalendarDays className="h-5 w-5 text-primary" />;
        default: return <InfoIcon className="h-5 w-5 text-primary"/>;
    }
  };
  
  const getStatusBadgeClasses = (status?: FundingPitch["status"]): string => {
    if (!status) return 'border-gray-300 text-gray-600';
    switch(status) {
      case 'seeking_funding': return 'bg-accent text-accent-foreground border-accent';
      case 'funded': return 'bg-blue-500 text-white border-blue-500';
      case 'closed': return 'bg-destructive/80 text-destructive-foreground border-destructive/80';
      case 'draft': return 'border-yellow-500 text-yellow-600 bg-yellow-100';
      default: return 'border-gray-300 text-gray-600';
    }
  }

  if (authLoading || isLoading) {
    return <div className="container mx-auto py-8 px-4 md:px-6 text-center">Loading pitch details...</div>;
  }

  if (!authUser || authUser.type !== 'company') {
    return <div className="container mx-auto py-8 px-4 md:px-6 text-center">Access Denied. Please log in as a Corporation.</div>;
  }

  if (!offer) {
    return (
      <div className="container mx-auto py-8 px-4 md:px-6 text-center">
        <h2 className="text-2xl font-semibold mb-4">Pitch Not Found or Access Denied</h2>
        <Button asChild><Link href="/dashboard/my-funding-pitches"><ArrowLeft className="mr-2 h-4 w-4" /> Back to My Pitches</Link></Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <div className="mb-6 flex items-center justify-between">
        <Button variant="outline" size="icon" asChild className="mr-2">
          <Link href="/dashboard/my-funding-pitches"><ArrowLeft className="h-5 w-5" /><span className="sr-only">Back</span></Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight line-clamp-1 flex-1">{offer.projectTitle}</h1>
        <Button variant="outline" asChild>
            <Link href={`/dashboard/my-funding-pitches/edit/${offer.id}`}><Edit className="mr-2 h-4 w-4"/>Edit Pitch</Link>
        </Button>
      </div>

      <Card className="shadow-xl rounded-xl overflow-hidden">
        <CardHeader className="bg-muted/30 p-6">
          <div className="flex flex-col md:flex-row justify-between items-start gap-4">
            <div>
              <CardTitle className="text-2xl mb-1">{offer.projectTitle}</CardTitle>
              <Badge variant="outline" className={getStatusBadgeClasses(offer.status) + " py-1 px-2.5 text-sm font-medium"}>
                {offer.status.charAt(0).toUpperCase() + offer.status.slice(1)}
              </Badge>
            </div>
            <div className="text-sm text-muted-foreground text-left md:text-right">
              <p className="flex items-center gap-1.5"><CalendarDays className="h-4 w-4"/>Posted: {format(new Date(offer.postedDate!), "dd MMM, yyyy")}</p>
              <p className="flex items-center gap-1.5"><Briefcase className="h-4 w-4"/>Industry: {offer.industry}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {offer.pitchImageUrl && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2 flex items-center">
                <ImageIcon className="mr-2 h-5 w-5 text-primary"/> Offer Media
              </h3>
               <NextImage src={offer.pitchImageUrl} alt={offer.projectTitle} width={800} height={450} className="rounded-md object-contain mx-auto border" data-ai-hint="offer image large"/>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <Dialog>
              <DialogTrigger asChild>
                <Card className="shadow-sm cursor-pointer hover:shadow-md transition-shadow bg-blue-500/10 border-blue-500/30">
                  <CardHeader className="pb-2"><CardTitle className="text-base flex items-center"><Eye className="mr-2 h-5 w-5 text-blue-700"/>Views</CardTitle></CardHeader>
                  <CardContent><p className="text-3xl font-bold">{offer.views || 0}</p><p className="text-xs text-muted-foreground">Total times this offer was viewed by sales professionals.</p></CardContent>
                </Card>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Offer Viewers (Mock)</DialogTitle><DialogDescription>List of sales professionals who viewed this offer.</DialogDescription></DialogHeader>
                <p className="text-muted-foreground text-center py-4">Detailed viewer list coming soon.</p>
                <DialogFooter><DialogClose asChild><Button variant="outline">Close</Button></DialogClose></DialogFooter>
              </DialogContent>
            </Dialog>
             <Dialog>
                <DialogTrigger asChild>
                    <Card className="shadow-sm cursor-pointer hover:shadow-md transition-shadow bg-green-500/10 border-green-500/30">
                    <CardHeader className="pb-2"><CardTitle className="text-base flex items-center"><ThumbsUp className="mr-2 h-5 w-5 text-green-700"/>Interested Parties</CardTitle></CardHeader>
                    <CardContent><p className="text-3xl font-bold">{interestedProfessionals.length}</p><p className="text-xs text-muted-foreground">Investors/Corporations who showed positive interest.</p></CardContent>
                    </Card>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Professionals Interested in "{offer.projectTitle}"</DialogTitle>
                        <DialogDescription>Sales Professionals who showed positive interest in this offer.</DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="h-[300px] w-full pr-4 mt-4">
                    {interestedProfessionals.length > 0 ? (
                        <div className="space-y-3">
                        {interestedProfessionals.map(pro => (
                            <div key={pro.id} className="flex items-center justify-between gap-3 p-2 rounded-md hover:bg-muted">
                            <Link href={`/profile/${pro.id}`} target="_blank" className="flex items-center gap-3">
                                <Avatar className="h-9 w-9 border">
                                <AvatarImage src={`https://picsum.photos/seed/${pro.userAvatarSeed || pro.id}/40/40`} alt={pro.userName} data-ai-hint="person avatar"/>
                                <AvatarFallback>{pro.userName.substring(0,1)}</AvatarFallback>
                                </Avatar>
                                <p className="text-sm font-medium hover:underline">{pro.userName}</p>
                            </Link>
                            {/* Optional: Button to message directly if needed */}
                            </div>
                        ))}
                        </div>
                    ) : ( <p className="text-sm text-muted-foreground text-center py-4">No sales professionals have shown positive interest yet.</p> )}
                    </ScrollArea>
                    <DialogFooter className="mt-4">
                    <DialogClose asChild><Button variant="outline">Close</Button></DialogClose>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <Card className="shadow-sm bg-red-500/10 border-red-500/30">
              <CardHeader className="pb-2"><CardTitle className="text-base flex items-center"><ThumbsDown className="mr-2 h-5 w-5 text-red-700"/>Negative Feedback</CardTitle></CardHeader>
              <CardContent><p className="text-3xl font-bold">{salesProFeedback.negative}</p><p className="text-xs text-muted-foreground">Investors/Corporations who were not interested.</p></CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <div><h3 className="text-lg font-semibold mb-1 flex items-center"><InfoIcon className="mr-2 h-5 w-5 text-primary"/>Project Summary</h3><p className="text-muted-foreground whitespace-pre-line text-sm leading-relaxed">{offer.projectSummary}</p></div>
            <Separator/>
            <div><h3 className="text-lg font-semibold mb-2">Financials</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-md"><DollarSign className="h-5 w-5 text-primary"/><div><span className="text-muted-foreground">Funding Sought:</span><p className="font-semibold">PKR {offer.fundingAmountSought.toLocaleString()}</p></div></div>
                    <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-md"><Percent className="h-5 w-5 text-primary"/><div><span className="text-muted-foreground">Equity Offered:</span><p className="font-semibold">{offer.equityOffered}%</p></div></div>
                </div>
            </div>
            {offer.businessPlanLink && (<><Separator/><div className="space-y-2"><h3 className="text-lg font-semibold">More Information</h3><p className="text-sm"><a href={offer.businessPlanLink} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1"><FileText className="h-4 w-4"/>View Business Plan/Deck</a></p></div></>)}
          </div>
        </CardContent>
        <CardFooter className="p-6 border-t bg-muted/30"><p className="text-xs text-muted-foreground">This is the detailed view of your pitch as it appears to your sales network. You can edit it or monitor its engagement here.</p></CardFooter>
      </Card>
    </div>
  );
}

  