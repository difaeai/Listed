
"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { format } from 'date-fns';
import { ArrowLeft, DollarSign, Users, MessageSquare, ThumbsUp, ThumbsDown, Send, CalendarDays, ExternalLink, Info, Phone, Timer, CheckCircle, XCircle, Heart, Loader2 } from "lucide-react";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { offerTypeIcons } from '@/components/common/icons';
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { PlatformOffer } from '@/types/platform-offer'; 
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebaseConfig';
import { doc, getDoc, updateDoc, setDoc, addDoc, collection, serverTimestamp, runTransaction, Timestamp, onSnapshot, deleteDoc } from "firebase/firestore"; 
import type { DirectMessage } from '@/app/offers/conversations/page';

export default function OfferDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const messageInputRef = useRef<HTMLTextAreaElement>(null);
  const { currentUser: authUser, loading: authLoading } = useAuth();

  const [offer, setOffer] = useState<PlatformOffer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [hasGivenFeedback, setHasGivenFeedback] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSubscriptionProcessing, setIsSubscriptionProcessing] = useState(false);
  const [processingSubscriptionOfferId, setProcessingSubscriptionOfferId] = useState<string | null>(null);

  const offerId = params.offerId as string;

  useEffect(() => {
    if (!offerId || authLoading || !db) {
      setIsLoading(false);
      return;
    }
    if (!authUser) { 
        toast({ title: "Login Required", description: "Please log in to view offer details.", variant: "destructive"});
        router.push(`/auth?redirect=/offers/${offerId}`);
        setIsLoading(false);
        return;
    }

    setIsLoading(true);
    const offerDocRef = doc(db, "platformOffers", offerId);

    const unsubscribeOffer = onSnapshot(offerDocRef, async (docSnap) => {
        if (docSnap.exists()) {
            const offerData = { id: docSnap.id, ...docSnap.data() } as PlatformOffer;
            if (offerData.isDeletedByAdmin || offerData.status !== 'active') {
                setOffer(null);
                toast({ title: "Offer Not Available", description: "This offer is not currently active or has been removed.", variant: "destructive"});
                router.push("/offers");
            } else {
                setOffer(offerData);
                
                const viewerDocRef = doc(db, "platformOffers", offerId, "viewers", authUser.uid);
                const viewerSnap = await getDoc(viewerDocRef);
                if(!viewerSnap.exists()){
                    await setDoc(viewerDocRef, { viewedAt: serverTimestamp(), userId: authUser.uid });
                    await updateDoc(offerDocRef, { views: (offerData.views || 0) + 1 });
                    setOffer(prev => prev ? {...prev, views: (prev.views || 0) + 1} : null);
                }

                const feedbackDocRef = doc(db, "platformOffers", offerId, "feedback", authUser.uid);
                const feedbackSnap = await getDoc(feedbackDocRef);
                setHasGivenFeedback(feedbackSnap.exists());

                // Check subscription status
                const subscriptionDocRef = doc(db, "users", authUser.uid, "subscribedCorporationOffers", offerId);
                const subscriptionSnap = await getDoc(subscriptionDocRef);
                setIsSubscribed(subscriptionSnap.exists());
            }
        } else {
            setOffer(null);
            toast({ title: "Not Found", description: "Offer not found.", variant: "destructive"});
            router.push("/offers");
        }
        setIsLoading(false);
    }, (error) => {
        console.error("Error fetching offer details from Firestore:", error);
        toast({ title: "Error", description: "Could not load offer details.", variant: "destructive" });
        setIsLoading(false);
    });

    return () => unsubscribeOffer();
  }, [offerId, authUser, authLoading, router, toast]);

  useEffect(() => {
    if (!isLoading && !authLoading) { 
      const action = searchParams.get('action');
      if (action === 'respond' && messageInputRef.current) {
        messageInputRef.current.focus();
        const messageSection = document.getElementById('message-section');
        messageSection?.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [isLoading, authLoading, searchParams]);


  const handleFeedback = async (type: 'positive' | 'negative') => {
    if (!offer || !offer.id || !authUser || !authUser.uid || hasGivenFeedback || !db) {
      if (hasGivenFeedback) toast({ title: "Feedback Submitted", description: "You've already given feedback for this offer.", variant: "default" });
      else toast({ title: "Error", description: "User or offer not identified, or feedback already given.", variant: "destructive" });
      return;
    }

    const offerDocRef = doc(db, "platformOffers", offer.id);
    const feedbackDocRef = doc(db, "platformOffers", offer.id, "feedback", authUser.uid);

    try {
        await runTransaction(db, async (transaction) => {
            const currentOfferSnap = await transaction.get(offerDocRef);
            if (!currentOfferSnap.exists()) throw "Offer not found!";
            
            const currentOfferData = currentOfferSnap.data();
            let newPositiveRate = currentOfferData.positiveResponseRate || 0;
            let newNegativeRate = currentOfferData.negativeResponseRate || 0;

            if (type === 'positive') newPositiveRate++;
            else newNegativeRate++;
            
            transaction.update(offerDocRef, { 
                positiveResponseRate: newPositiveRate, 
                negativeResponseRate: newNegativeRate 
            });
            transaction.set(feedbackDocRef, { type: type, timestamp: serverTimestamp(), userId: authUser.uid });
        });

        setOffer(prev => {
            if (!prev) return null;
            return {
                ...prev,
                positiveResponseRate: type === 'positive' ? (prev.positiveResponseRate || 0) + 1 : (prev.positiveResponseRate || 0),
                negativeResponseRate: type === 'negative' ? (prev.negativeResponseRate || 0) + 1 : (prev.negativeResponseRate || 0),
            };
        });
        setHasGivenFeedback(true);
        toast({
          title: `${type === 'positive' ? 'Positive' : 'Negative'} Feedback Submitted`,
          description: `Thank you for your feedback on "${offer?.title}".`,
        });
    } catch (error) {
      console.error("Error saving feedback to Firestore:", error);
      toast({ title: "Error", description: "Could not save feedback.", variant: "destructive" });
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim() || !offer || !authUser || !db) {
      toast({ title: "Error", description: "Cannot send message. Ensure you are logged in and message is not empty.", variant: "destructive" });
      return;
    }
    
    const newMessageData: Omit<DirectMessage, 'id' | 'docId'> = {
      senderId: authUser.uid,
      senderName: authUser.name || "User",
      senderEmail: authUser.email,
      senderAvatarSeed: authUser.avatarSeed,
      receiverId: offer.corporationId, 
      receiverName: offer.corporationName,
      receiverAvatarSeed: offer.corporationLogoSeed,
      subject: `Inquiry about Offer: ${offer.title}`,
      body: message,
      timestamp: serverTimestamp(),
      isReadByReceiver: false,
      type: 'salespro_to_corporation', 
      conversationId: [authUser.uid, offer.corporationId].sort().join('_CONVO_'),
      participantIds: [authUser.uid, offer.corporationId].sort(),
      attachmentName: null,
    };

    try {
      await addDoc(collection(db, "directMessages"), newMessageData);
      toast({
        title: "Message Sent!",
        description: `Your message regarding "${offer?.title}" has been sent to ${offer?.corporationName}.`,
      });
      setMessage("");
    } catch (error) {
      console.error("Error sending message to Firestore:", error);
      toast({ title: "Message Sending Failed", description: "Could not send your message.", variant: "destructive" });
    }
  };

  const handleToggleSubscription = async () => {
    if (!offer || !offer.id || !authUser || !authUser.uid || !db || authUser.uid === offer.corporationId) {
      toast({ title: "Action Not Allowed", description: "Cannot subscribe to your own offer or session invalid.", variant: "destructive"});
      return;
    }
    const currentOfferId = offer.id;
    setProcessingSubscriptionOfferId(currentOfferId);
    setIsSubscriptionProcessing(true);

    const subCollectionName = "subscribedCorporationOffers";
    const subscriptionDocRef = doc(db, "users", authUser.uid, subCollectionName, currentOfferId);

    try {
      if (isSubscribed) { // Unsubscribe
        await deleteDoc(subscriptionDocRef);
        setIsSubscribed(false);
        toast({ title: "Unsubscribed", description: `You have unsubscribed from "${offer.title}".`});
      } else { // Subscribe
        await setDoc(subscriptionDocRef, {
          offerId: currentOfferId,
          offerTitle: offer.title,
          corporationName: offer.corporationName,
          corporationId: offer.corporationId,
          subscribedAt: serverTimestamp()
        });
        setIsSubscribed(true);
        toast({ title: "Subscribed!", description: `You are now subscribed to "${offer.title}". It will appear in your sales dashboard.`});
      }
    } catch (error) {
      console.error("Error toggling subscription:", error);
      toast({ title: "Subscription Error", description: "Could not update your subscription status.", variant: "destructive"});
    } finally {
      setProcessingSubscriptionOfferId(null);
      setIsSubscriptionProcessing(false);
    }
  };


  if (authLoading || isLoading) { 
    return <div className="flex min-h-screen flex-col items-center justify-center"><p>Loading Offer Details...</p></div>;
  }

  if (!offer) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <Info className="h-16 w-16 text-destructive mb-4" />
        <h2 className="text-2xl font-semibold mb-2 text-center">Offer Not Found</h2>
        <p className="text-muted-foreground mb-4 text-center">The offer you are looking for does not exist, may have been removed, or is not currently active.</p>
        <Button onClick={() => router.push('/offers')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to All Offers
        </Button>
      </div>
    );
  }

  const getOfferCategoryIcon = (category: PlatformOffer["offerCategory"]) => {
    switch(category) {
        case "Product": return offerTypeIcons.Product;
        case "Service": return offerTypeIcons.Service;
        case "Subscription": return offerTypeIcons.Subscription;
        case "Digital Product": return offerTypeIcons.Digital;
        case "Event": return <CalendarDays className="h-4 w-4 text-muted-foreground" />;
        default: return offerTypeIcons.Default;
    }
  };


  return (
    <>
        <div className="container mx-auto py-8 px-4 md:px-6">
            <Button variant="outline" onClick={() => router.push('/offers')} className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to All Offers
            </Button>

            <Card className="shadow-xl rounded-xl overflow-hidden">
            <div className="relative h-64 md:h-80 w-full bg-muted flex items-center justify-center p-4 rounded-t-xl">
                {offer.mediaUrl && offer.mediaUrl.startsWith('data:image') ? (
                <img src={offer.mediaUrl} alt={offer.title} className="max-h-full max-w-full object-contain rounded-md" data-ai-hint="offer image large"/>
                ) : offer.mediaUrl && offer.mediaUrl.startsWith('data:video') ? (
                <video src={offer.mediaUrl} controls className="max-h-full max-w-full object-contain rounded-md" data-ai-hint="offer video large"/>
                ) : (
                <div className="text-center">
                    <h3 className="text-2xl md:text-3xl font-semibold text-foreground">Offer:</h3>
                    <p className="text-3xl md:text-4xl font-bold text-primary mt-2">{offer.commissionRate}</p>
                    <p className="text-md md:text-lg text-muted-foreground mt-1">
                    ({offer.commissionType === 'fixed_amount' ? 'Fixed Amount' : offer.commissionType.charAt(0).toUpperCase() + offer.commissionType.slice(1)})
                    </p>
                </div>
                )}
            </div>

            <CardHeader className="p-6">
                <div className="flex flex-col md:flex-row items-start justify-between gap-4">
                <div className="flex-1">
                    <CardTitle className="text-3xl font-bold leading-tight mb-2">{offer.title}</CardTitle>
                    <div className="flex items-center gap-2 mb-2">
                    <Avatar className="h-8 w-8 border">
                        <AvatarImage
                        src={`https://placehold.co/40x40.png?text=${offer.corporationName.substring(0,1)}`} 
                        alt={offer.corporationName}
                        data-ai-hint={offer.corporationLogoSeed ? `logo ${offer.corporationLogoSeed}`: "abstract logo"}
                        />
                        <AvatarFallback>{offer.corporationName.substring(0,1)}</AvatarFallback>
                    </Avatar>
                    <Link href={`/profile/${offer.corporationId}`} className="text-lg font-semibold text-primary hover:underline">{offer.corporationName}</Link>
                    </div>
                    <Badge variant="secondary" className="flex items-center gap-1.5 py-1 px-2 text-xs w-fit">
                        {getOfferCategoryIcon(offer.offerCategory)}
                        {offer.offerCategory}
                    </Badge>
                </div>
                <div className="flex flex-col items-start md:items-end gap-2 whitespace-nowrap">
                    <div className="flex items-center text-2xl font-bold text-accent">
                        <DollarSign className="h-7 w-7 mr-1" /> {offer.commissionRate}
                    </div>
                    <p className="text-sm text-muted-foreground">Posted: {format(new Date(offer.postedDate), "dd MMM, yyyy")}</p>
                    {offer.expiresInDays !== undefined && (
                        <p className="text-sm text-muted-foreground flex items-center">
                            <Timer className="h-4 w-4 mr-1 text-red-500" /> Expires in: {offer.expiresInDays} days
                        </p>
                    )}
                </div>
                </div>
            </CardHeader>

            <CardContent className="p-6 space-y-6">
                <Separator />
                <div>
                <h3 className="text-xl font-semibold mb-2">Offer Description</h3>
                <ScrollArea className="h-auto max-h-60 pr-3">
                    <p className="text-muted-foreground whitespace-pre-line">{offer.description}</p>
                </ScrollArea>
                </div>

                {offer.offerValueDetails && (
                <div>
                    <h3 className="text-xl font-semibold mb-1">Offer Value / Price</h3>
                    <p className="text-muted-foreground">{offer.offerValueDetails} {offer.price ? `(Approx. PKR ${offer.price.toLocaleString()})` : ''}</p>
                </div>
                )}

                {offer.keySellingPoints && (
                <div>
                    <h3 className="text-xl font-semibold mb-2">Key Selling Points</h3>
                    <ul className="list-disc list-inside text-muted-foreground space-y-1">
                    {offer.keySellingPoints.split(',').map(feature => <li key={feature.trim()}>{feature.trim()}</li>)}
                    </ul>
                </div>
                )}

                <Separator />

                <div id="interaction-section" className="space-y-4">
                    <h3 className="text-xl font-semibold">Engage with this Offer</h3>
                    <div className="flex flex-col sm:flex-row gap-3">
                        <Button onClick={() => handleFeedback('positive')} variant="outline" className="flex-1 border-green-500 text-green-600 hover:bg-green-50 hover:text-green-700 disabled:opacity-70 disabled:cursor-not-allowed" disabled={hasGivenFeedback || authUser?.uid === offer.corporationId}>
                            <ThumbsUp className="mr-2 h-5 w-5" /> Positive Feedback ({offer.positiveResponseRate || 0})
                        </Button>
                        <Button onClick={() => handleFeedback('negative')} variant="outline" className="flex-1 border-red-500 text-red-600 hover:bg-red-50 hover:text-red-700 disabled:opacity-70 disabled:cursor-not-allowed" disabled={hasGivenFeedback || authUser?.uid === offer.corporationId}>
                            <ThumbsDown className="mr-2 h-5 w-5" /> Negative Feedback ({offer.negativeResponseRate || 0})
                        </Button>
                    </div>
                    {hasGivenFeedback && <p className="text-xs text-muted-foreground text-center">You have already provided feedback for this offer.</p>}
                </div>


                <div id="message-section" className="space-y-4">
                    <h3 className="text-xl font-semibold">Send a Message to {offer.corporationName}</h3>
                    <Textarea
                        ref={messageInputRef}
                        placeholder={`Type your message regarding "${offer.title}"...`}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        className="min-h-[120px] text-base"
                        disabled={authUser?.uid === offer.corporationId}
                    />
                     <div className="flex flex-col sm:flex-row gap-3">
                        <Button onClick={handleSendMessage} disabled={!message.trim() || authUser?.uid === offer.corporationId} className="w-full sm:w-auto flex-1">
                            <Send className="mr-2 h-4 w-4" /> Send Message
                        </Button>
                         <Button 
                            onClick={handleToggleSubscription} 
                            variant={isSubscribed ? "secondary" : "default"} 
                            className="w-full sm:w-auto flex-1"
                            disabled={isSubscriptionProcessing || (authUser ? offer.corporationId === authUser.uid : true)}
                        >
                            {isSubscriptionProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 
                            isSubscribed ? <XCircle className="mr-2 h-4 w-4" /> : <Heart className="mr-2 h-4 w-4" />}
                            {isSubscriptionProcessing ? (isSubscribed ? "Unsubscribing..." : "Subscribing...") : 
                            isSubscribed ? "Unsubscribe from Offer" : "Subscribe to Offer"}
                        </Button>
                    </div>
                </div>

                <Separator />

                <div className="space-y-2">
                    <h3 className="text-xl font-semibold">Contact & Offer Link</h3>
                    {offer.contactNumber && (
                        <p className="text-muted-foreground flex items-center">
                            <Phone className="mr-2 h-4 w-4 text-primary"/> Direct Contact: <a href={`tel:${offer.contactNumber}`} className="text-primary hover:underline ml-1">{offer.contactNumber}</a>
                        </p>
                    )}
                    {offer.offerLink && offer.offerLink !== '#' && (
                        <p className="text-muted-foreground flex items-center">
                            <ExternalLink className="mr-2 h-4 w-4 text-primary"/> External Offer Page: <Link href={offer.offerLink} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline ml-1">Visit Link</Link>
                        </p>
                    )}
                    {!offer.contactNumber && (!offer.offerLink || offer.offerLink === '#') && (
                        <p className="text-muted-foreground">No direct contact or external link provided for this offer. Please use the messaging feature.</p>
                    )}
                </div>

            </CardContent>
            <CardFooter className="p-6 border-t bg-muted/30">
                <p className="text-xs text-muted-foreground">
                    Interested in this offer? Use the options above to provide feedback, subscribe, or send a message directly to {offer.corporationName}.
                    {offer.expiresInDays !== undefined && ` This offer expires in ${offer.expiresInDays} days.`}
                </p>
            </CardFooter>
            </Card>
        </div>
    </>
  );
}
