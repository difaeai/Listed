
"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Zap, Search, DollarSign, TrendingUp, ThumbsUp, ThumbsDown, Timer, MessageSquare, Users as UsersIcon, Share2 as Share2Icon, Percent, Briefcase as BriefcaseIcon, Package as PackageIcon, FileText as FileTextIcon, Tag as TagIcon, CalendarDays, Handshake, ImageIcon, Heart, XCircle, Loader2, Eye, Info, X, Laptop, Megaphone, Star, ArrowLeft } from "lucide-react";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { format, isFuture } from 'date-fns';
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebaseConfig';
import { collection, query, where, orderBy, getDocs, doc, updateDoc, runTransaction, Timestamp, setDoc, serverTimestamp, getDoc, deleteDoc } from "firebase/firestore";
import NextImage from 'next/image';
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { TooltipContent as RadixTooltipContent } from "@radix-ui/react-tooltip";
import { PlatformOffer, UserSalesOffer, UserSalesOfferCommissionType } from "@/types/platform-offer";


interface DisplayableOffer {
  id: string;
  type: 'corporation_offer' | 'user_sales_offer';
  title: string;
  creatorName: string;
  creatorAvatarSeed?: string;
  creatorId: string;
  description: string;
  category?: PlatformOffer['offerCategory'] | UserSalesOffer['offerCategory'];
  commissionRate?: string; 
  commissionType?: PlatformOffer['commissionType'];
  userSalesOffer_commissionRateInput?: string;
  userSalesOffer_commissionType?: UserSalesOffer['commissionType'];
  terms?: string; 
  postedDate: string; 
  expiresInDays?: number;
  detailPageLink: string;
  mediaUrl?: string; 
  views: number;
  positiveResponseRate: number;
  negativeResponseRate: number;
  peerInterestCount?: number; 
  hasGivenFeedback?: boolean;
  isSubscribedByCurrentUser: boolean;
}

const getOfferTypeIcon = (category: PlatformOffer['offerCategory'] | UserSalesOffer['offerCategory'] | undefined, type: 'corporation_offer' | 'user_sales_offer') => {
    const iconProps = { className: "h-8 w-8 text-primary-foreground/90" }; // Adjusted size for placeholder
    if (!category) return type === 'corporation_offer' ? <BriefcaseIcon {...iconProps} /> : <Share2Icon {...iconProps} />;
    
    if (type === 'corporation_offer') {
        switch(category as PlatformOffer['offerCategory']) {
            case "Product": return <PackageIcon {...iconProps} />;
            case "Service": return <BriefcaseIcon {...iconProps} />;
            case "Subscription": return <Zap {...iconProps} />;
            case "Digital Product": return <FileTextIcon {...iconProps} />;
            case "Event": return <CalendarDays {...iconProps} />;
            default: return <TagIcon {...iconProps} />;
        }
    } else { 
         switch(category as UserSalesOffer['offerCategory']) {
            case "Collaboration": return <UsersIcon {...iconProps} />;
            case "Lead Sharing": return <Share2Icon {...iconProps} />;
            case "Joint Venture": return <Handshake {...iconProps} />;
            case "Service Exchange": return <TrendingUp {...iconProps} />;
            case "Referral Program": return <DollarSign {...iconProps} />;
            default: return <TagIcon {...iconProps} />;
        }
    }
};


export default function MySalesOffersPage() {
  const [allDisplayableOffers, setAllDisplayableOffers] = useState<DisplayableOffer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const { currentUser: authUser, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [processingSubscriptionOfferId, setProcessingSubscriptionOfferId] = useState<string | null>(null);

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
    // Robust guard against running queries before auth is fully ready
    if (authLoading || !db) {
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    const fetchOffersAndFeedback = async () => {
      try {
        const platformOffersRef = collection(db, "platformOffers");
        const platformQuery = query(platformOffersRef, where("status", "==", "active"), where("isDeletedByAdmin", "==", false), orderBy("postedDate", "desc"));
        const platformSnapshot = await getDocs(platformQuery);
        const fetchedPlatformOffers: DisplayableOffer[] = await Promise.all(platformSnapshot.docs.map(async (docSnap) => {
          const data = docSnap.data() as PlatformOffer;
          let feedbackGiven = false;
          let subscribed = false;
          if (authUser?.uid) {
            const feedbackDocRef = doc(db, "platformOffers", docSnap.id, "feedback", authUser.uid);
            const feedbackSnap = await getDoc(feedbackDocRef);
            feedbackGiven = feedbackSnap.exists();

            const subDocRef = doc(db, "users", authUser.uid, "subscribedCorporationOffers", docSnap.id);
            const subSnap = await getDoc(subDocRef);
            subscribed = subSnap.exists();
          }
          return {
            id: docSnap.id,
            type: 'corporation_offer',
            title: data.title,
            creatorName: data.corporationName,
            creatorAvatarSeed: data.corporationLogoSeed || data.corporationName.substring(0,1),
            creatorId: data.corporationId,
            description: data.description,
            category: data.offerCategory,
            commissionRate: data.commissionRate,
            commissionType: data.commissionType,
            postedDate: data.postedDate, 
            expiresInDays: data.expiresInDays,
            detailPageLink: `/offers/${docSnap.id}`,
            mediaUrl: data.mediaUrl,
            views: data.views || 0,
            positiveResponseRate: data.positiveResponseRate || 0,
            negativeResponseRate: data.negativeResponseRate || 0,
            hasGivenFeedback: feedbackGiven,
            isSubscribedByCurrentUser: subscribed,
          };
        }));

        const userSalesOffersRef = collection(db, "userSalesOffers");
        const userSalesQuery = query(userSalesOffersRef, 
            where("status", "==", "active"), 
            where("isDeletedByAdmin", "==", false), 
            orderBy("postedDate", "desc")
        );
        const userSalesSnapshot = await getDocs(userSalesQuery);
        const fetchedUserSalesOffers: DisplayableOffer[] = await Promise.all(userSalesSnapshot.docs
          .filter(docSnap => {
            const data = docSnap.data();
            return data.creatorEmail !== "demo@gmail.com" && (authUser ? data.creatorId !== authUser.uid : true);
          }) 
          .map(async (docSnap) => {
            const data = docSnap.data() as UserSalesOffer;
            let feedbackGiven = false;
            let subscribed = false;
            if (authUser?.uid) {
              const feedbackDocRef = doc(db, "userSalesOffers", docSnap.id, "feedback", authUser.uid);
              const feedbackSnap = await getDoc(feedbackDocRef);
              feedbackGiven = feedbackSnap.exists();
              
              const subDocRef = doc(db, "users", authUser.uid, "subscribedPeerOffers", docSnap.id);
              const subSnap = await getDoc(subDocRef);
              subscribed = subSnap.exists();
            }
            return {
              id: docSnap.id,
              type: 'user_sales_offer',
              title: data.title,
              creatorName: data.creatorName,
              creatorAvatarSeed: data.creatorAvatarSeed || data.creatorName.substring(0,1),
              creatorId: data.creatorId,
              description: data.description,
              category: data.offerCategory,
              userSalesOffer_commissionRateInput: data.commissionRateInput,
              userSalesOffer_commissionType: data.commissionType,
              terms: data.terms,
              postedDate: data.postedDate, 
              detailPageLink: `/offers/peer-sales-offer/${docSnap.id}`,
              mediaUrl: data.mediaUrl,
              views: data.views || 0,
              positiveResponseRate: data.positiveResponseRate || 0,
              negativeResponseRate: data.negativeResponseRate || 0,
              peerInterestCount: data.peerInterestCount || 0,
              hasGivenFeedback: feedbackGiven,
              isSubscribedByCurrentUser: subscribed,
            };
          }));

        const combined = [...fetchedPlatformOffers, ...fetchedUserSalesOffers];
        combined.sort((a, b) => new Date(b.postedDate).getTime() - new Date(a.postedDate).getTime());
        
        setAllDisplayableOffers(combined);
      } catch (error) {
        console.error("Error fetching offers from Firestore:", error);
        toast({ title: "Error", description: "Could not load offers.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };

    fetchOffersAndFeedback();
  }, [authUser, authLoading, toast]);

  const handleFeedback = async (offerId: string, offerType: 'corporation_offer' | 'user_sales_offer', feedbackType: 'positive' | 'negative') => {
    if (!authUser || !db) {
      toast({ title: "Login Required", description: "Please log in to give feedback.", variant: "destructive" });
      return;
    }

    const currentOfferIndex = allDisplayableOffers.findIndex(o => o.id === offerId && o.type === offerType);
    if (currentOfferIndex === -1 || allDisplayableOffers[currentOfferIndex].hasGivenFeedback) {
      toast({ title: "Feedback Submitted", description: "You've already given feedback for this offer.", variant: "default" });
      return;
    }
    
    const collectionName = offerType === 'corporation_offer' ? "platformOffers" : "userSalesOffers";
    const offerDocRef = doc(db, collectionName, offerId);
    const feedbackDocRef = doc(db, collectionName, offerId, "feedback", authUser.uid);

    try {
        await runTransaction(db, async (transaction) => {
            const offerSnap = await transaction.get(offerDocRef);
            if (!offerSnap.exists()) throw "Offer not found!";
            
            const currentOfferData = offerSnap.data();
            let newPositiveRate = currentOfferData.positiveResponseRate || 0;
            let newNegativeRate = currentOfferData.negativeResponseRate || 0;
            
            if (feedbackType === 'positive') newPositiveRate++;
            else newNegativeRate++;
            
            transaction.update(offerDocRef, { 
                positiveResponseRate: newPositiveRate, 
                negativeResponseRate: newNegativeRate,
            });
            transaction.set(feedbackDocRef, { type: feedbackType, timestamp: serverTimestamp(), userId: authUser.uid });
        });

        setAllDisplayableOffers(prevOffers =>
            prevOffers.map(offer => {
                if (offer.id === offerId && offer.type === offerType) {
                    return { 
                        ...offer, 
                        hasGivenFeedback: true,
                        positiveResponseRate: feedbackType === 'positive' ? (offer.positiveResponseRate || 0) + 1 : (offer.positiveResponseRate || 0),
                        negativeResponseRate: feedbackType === 'negative' ? (offer.negativeResponseRate || 0) + 1 : (offer.negativeResponseRate || 0),
                    };
                }
                return offer;
            })
        );
        toast({
            title: feedbackType === 'positive' ? "Positive Feedback Submitted!" : "Feedback Noted",
            description: `Your feedback for "${allDisplayableOffers[currentOfferIndex]?.title}" has been recorded.`,
        });

    } catch (error) {
        console.error("Error submitting feedback to Firestore:", error);
        toast({ title: "Error", description: "Could not save feedback.", variant: "destructive"});
    }
  };
  
  const handleToggleSubscription = async (offerId: string, offerType: 'corporation_offer' | 'user_sales_offer', currentSubStatus: boolean) => {
    if (!authUser || !authUser.uid || !db) {
      toast({ title: "Login Required", description: "Please log in to subscribe.", variant: "destructive" });
      return;
    }
    setProcessingSubscriptionOfferId(offerId);

    const subCollectionName = offerType === 'corporation_offer' ? "subscribedCorporationOffers" : "subscribedPeerOffers";
    const subscriptionDocRef = doc(db, "users", authUser.uid, subCollectionName, offerId);
    const offerData = allDisplayableOffers.find(o => o.id === offerId && o.type === offerType);

    try {
      if (currentSubStatus) { // Unsubscribe
        await deleteDoc(subscriptionDocRef);
        toast({ title: "Unsubscribed", description: `You have unsubscribed from "${offerData?.title}".`});
      } else { // Subscribe
        await setDoc(subscriptionDocRef, {
          offerId: offerId,
          offerTitle: offerData?.title,
          creatorName: offerData?.creatorName,
          creatorId: offerData?.creatorId,
          subscribedAt: serverTimestamp()
        });
        toast({ title: "Subscribed!", description: `You are now subscribed to "${offerData?.title}". It will appear in 'Generate Revenue'.`});
      }
      setAllDisplayableOffers(prev => prev.map(o => 
        o.id === offerId && o.type === offerType ? { ...o, isSubscribedByCurrentUser: !currentSubStatus } : o
      ));
    } catch (error) {
      console.error("Error toggling subscription:", error);
      toast({ title: "Subscription Error", description: "Could not update your subscription status.", variant: "destructive"});
    } finally {
      setProcessingSubscriptionOfferId(null);
    }
  };


  const filteredOffers = useMemo(() => {
    return allDisplayableOffers.filter(offer => {
      const matchesSearch =
        offer.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        offer.creatorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        offer.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (offer.type === 'corporation_offer' && offer.commissionRate?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (offer.type === 'user_sales_offer' && offer.userSalesOffer_commissionRateInput?.toLowerCase().includes(searchTerm.toLowerCase()));
      
      return matchesSearch;
    });
  }, [allDisplayableOffers, searchTerm]);

  if (isLoading || authLoading) {
    return <div className="container mx-auto py-8 px-4 md:px-6 text-center">Loading Offers...</div>;
  }

  const OfferCard = ({ offer }: { offer: DisplayableOffer }) => {
    const feedbackAlreadyGiven = offer.hasGivenFeedback;
    const isCorpOffer = offer.type === 'corporation_offer';
    
    let incentiveText: string | undefined;
    let incentiveIcon: React.ReactNode;

    if (isCorpOffer) {
        incentiveText = offer.commissionRate;
        incentiveIcon = <DollarSign className="h-5 w-5" />; 
    } else { 
        incentiveText = offer.userSalesOffer_commissionRateInput || "View Terms";
        switch(offer.userSalesOffer_commissionType) {
            case 'percentage_split': incentiveIcon = <Percent className="h-5 w-5" />; break;
            case 'fixed_fee': incentiveIcon = <DollarSign className="h-5 w-5" />; break;
            case 'lead_exchange': incentiveIcon = <Share2Icon className="h-5 w-5" />; break;
            case 'service_swap': incentiveIcon = <TrendingUp className="h-5 w-5" />; break;
            default: incentiveIcon = <TagIcon className="h-5 w-5" />;
        }
    }
    
    const offerIsLocked = isCorpOffer && !hasAnnualSubscription;

    const renderCardContent = () => (
      <Card
        className={cn(
          "flex flex-col min-h-[480px] overflow-hidden shadow-lg transition-all duration-300 rounded-xl bg-card border border-border",
          offerIsLocked
            ? "cursor-not-allowed group"
            : "hover:shadow-2xl hover:border-primary/50"
        )}
      >
        <div className="relative">
          {offer.mediaUrl && offer.mediaUrl.startsWith('data:image') ? (
            <div className="relative h-48 w-full">
              <NextImage src={offer.mediaUrl} alt={offer.title} layout="fill" objectFit="cover" className="rounded-t-xl" data-ai-hint="offer preview"/>
            </div>
          ) : (
            <div className={cn("h-48 rounded-t-xl flex flex-col items-center justify-center p-4 text-center text-white", isCorpOffer ? "bg-gradient-to-br from-primary to-blue-700" : "bg-gradient-to-br from-purple-600 to-indigo-700")}>
              <div className="mb-1 text-primary-foreground/80">{getOfferTypeIcon(offer.category, offer.type)}</div>
              <h3 className="text-sm font-medium uppercase tracking-wider text-primary-foreground/80 mb-1">{isCorpOffer ? (offer.category || "Commission Offer") : (offer.category || "Sales Collaboration")}</h3>
              <p className="text-2xl font-bold flex items-center justify-center">{incentiveIcon}<span className="ml-1.5">{incentiveText}</span></p>
            </div>
          )}
          {offerIsLocked && (
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex flex-col items-center justify-center text-center p-4">
              <Star className="h-10 w-10 text-yellow-400 mb-2" />
              <p className="text-lg font-bold text-white">Annual Plan Required</p>
              <p className="text-xs text-yellow-200">Upgrade to access premium corporation offers.</p>
            </div>
          )}
        </div>
        
        <CardHeader className="p-4">
          <CardTitle className="text-md font-semibold leading-snug hover:text-primary transition-colors line-clamp-2">
             <Link href={offerIsLocked ? '#' : offer.detailPageLink} className={cn(offerIsLocked && "pointer-events-none")}>{offer.title}</Link>
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground mt-0.5">
            By{' '}
            {offerIsLocked ? (
              <span className="font-medium text-primary/90">{offer.creatorName}</span>
            ) : (
              <Link href={`/profile/${offer.creatorId}`} className="font-medium text-primary/90 hover:underline">
                {offer.creatorName}
              </Link>
            )}
            {offer.type === 'user_sales_offer' && <Share2Icon className="inline-block ml-1.5 h-3 w-3 text-purple-500" />}
            {offer.type === 'corporation_offer' && <BriefcaseIcon className="inline-block ml-1.5 h-3 w-3 text-blue-500" />}
          </CardDescription>
          {offer.category && <Badge variant="outline" className="text-xs py-0.5 px-1.5 mt-1.5 w-fit">{offer.category}</Badge>}
        </CardHeader>
        
        <CardContent className="p-4 pt-0 flex-grow space-y-1.5 text-sm">
          <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">{offer.description}</p>
          {!isCorpOffer && offer.terms && <p className="text-xs text-muted-foreground line-clamp-2"><strong className="text-foreground/80">Terms:</strong> {offer.terms}</p>}
          <div className="text-xs text-muted-foreground pt-1"><span className="flex items-center"><CalendarDays className="h-3.5 w-3.5 mr-1" /> Posted: {format(new Date(offer.postedDate), "dd MMM yyyy")}</span></div>
        </CardContent>

        <CardFooter className="p-3 border-t bg-card flex flex-col items-stretch space-y-2">
          <div className="flex gap-2 w-full">
              <Button variant="outline" size="sm" className="flex-1 text-xs" asChild={!offerIsLocked} disabled={offerIsLocked}>
                  <Link href={offer.detailPageLink}><Eye className="mr-1.5 h-3.5 w-3.5"/>Details</Link>
              </Button>
              <Button variant="default" size="sm" className="flex-1 text-xs" asChild={!offerIsLocked} disabled={offerIsLocked}>
                  <Link href={`${offer.detailPageLink}?action=respond`}><MessageSquare className="mr-1.5 h-3.5 w-3.5"/>Message</Link>
              </Button>
          </div>
          <Button 
              variant={offer.isSubscribedByCurrentUser ? "secondary" : "outline"} 
              size="sm" 
              className="w-full text-xs border-primary/50"
              onClick={() => handleToggleSubscription(offer.id, offer.type, !!offer.isSubscribedByCurrentUser)}
              disabled={processingSubscriptionOfferId === offer.id || (authUser ? offer.creatorId === authUser.uid : true) || offerIsLocked}
          >
              {processingSubscriptionOfferId === offer.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 
              offer.isSubscribedByCurrentUser ? <XCircle className="mr-2 h-4 w-4" /> : <Heart className="mr-2 h-4 w-4" />}
              {processingSubscriptionOfferId === offer.id ? (offer.isSubscribedByCurrentUser ? "Unsubscribing..." : "Subscribing...") : (offer.isSubscribedByCurrentUser ? "Unsubscribe" : "Subscribe")}
          </Button>
          <div className="flex items-center justify-center space-x-2 pt-1 w-full">
              <Button variant="ghost" size="sm" className={`py-1 px-2 h-auto border text-xs rounded-full ${feedbackAlreadyGiven ? 'border-green-300 bg-green-50 text-green-600 cursor-not-allowed opacity-70' : 'border-green-500 text-green-600 hover:bg-green-500/10'}`} onClick={() => handleFeedback(offer.id, offer.type, 'positive')} disabled={feedbackAlreadyGiven || !authUser || offer.creatorId === authUser.uid || offerIsLocked} title="Positive Feedback">
                  <ThumbsUp className="mr-1 h-3.5 w-3.5" />{offer.positiveResponseRate || 0}
              </Button>
              <Button variant="ghost" size="sm" className={`py-1 px-2 h-auto border text-xs rounded-full ${feedbackAlreadyGiven ? 'border-red-300 bg-red-50 text-red-600 cursor-not-allowed opacity-70' : 'border-red-500 text-red-600 hover:bg-red-500/10'}`} onClick={() => handleFeedback(offer.id, offer.type, 'negative')} disabled={feedbackAlreadyGiven || !authUser || offer.creatorId === authUser.uid || offerIsLocked} title="Negative Feedback">
                  <ThumbsDown className="mr-1 h-3.5 w-3.5" />{offer.negativeResponseRate || 0}
              </Button>
          </div>
        </CardFooter>
      </Card>
    );

    return offerIsLocked ? (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div>{renderCardContent()}</div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Upgrade to an Annual Plan to access this offer.</p>
             <Link href="/offers/verify-payment" className="font-semibold text-primary hover:underline">
              Upgrade Now
            </Link>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    ) : renderCardContent();
  };

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
       <Button variant="outline" asChild className="mb-4">
        <Link href="/home"><ArrowLeft className="mr-2 h-4 w-4" /> Back to User Portal</Link>
      </Button>

      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight flex items-center">
            <DollarSign className="mr-3 h-8 w-8 text-primary" /> Generate Revenue
        </h1>
        <p className="text-muted-foreground">Browse exclusive offers from Businesses and Sales Professionals to earn commissions or collaborate.</p>
      </div>

        <Card className="shadow-lg rounded-xl mb-6">
            <CardHeader className="pb-4">
                <CardTitle className="text-2xl">Find Your Next Opportunity</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder="Search by title, creator, description, commission..."
                    className="pl-10 w-full h-11 rounded-lg"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                </div>
            </CardContent>
        </Card>

        {filteredOffers.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredOffers.map((offer) => <OfferCard key={`${offer.id}-${offer.type}`} offer={offer} />)}
          </div>
        ) : (
          <Card className="col-span-full text-center py-16 shadow-lg rounded-xl">
            <CardContent className="flex flex-col items-center">
              <Search className="mx-auto h-16 w-16 text-muted-foreground/70 mb-6" />
              <h3 className="text-2xl font-semibold mb-2 text-foreground">No Offers Found</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                No active offers match your current search or filter criteria. Check back later for new opportunities.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
  );
}
