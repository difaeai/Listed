
"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Eye, Users, DollarSign, Edit, Image as ImageIcon, MessageSquare, CalendarDays, Share2, Info, Percent, FileText, ThumbsUp, ThumbsDown, Heart, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type { UserSalesOffer } from '@/types/platform-offer';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebaseConfig';
import { doc, getDoc, collection, query, where, onSnapshot, addDoc, serverTimestamp, Timestamp, updateDoc, increment, setDoc, runTransaction, deleteDoc } from "firebase/firestore";
import type { DirectMessage } from '@/app/offers/conversations/page'; 
import NextImage from 'next/image';

interface PeerLiker {
  id: string; 
  name: string;
  avatarSeed?: string;
  userType?: 'investor' | 'corporation'; // Added userType
}


export default function ViewPeerSalesOfferPage() {
  const params = useParams();
  const router = useRouter();
  const offerId = params.offerId as string;
  const { toast } = useToast();
  const { currentUser: authUser, loading: authLoading } = useAuth();

  const [offer, setOffer] = useState<UserSalesOffer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasGivenFeedback, setHasGivenFeedback] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSubscriptionProcessing, setIsSubscriptionProcessing] = useState(false);
  const [processingSubscriptionOfferId, setProcessingSubscriptionOfferId] = useState<string | null>(null);


  const [isMessageDialogOpen, setIsMessageDialogOpen] = useState(false);
  const [messageSubject, setMessageSubject] = useState("");
  const [messageBody, setMessageBody] = useState("");
  const [peerInteractors, setPeerInteractors] = useState<PeerLiker[]>([]);
  const [messagingPeer, setMessagingPeer] = useState<PeerLiker | null>(null);


  useEffect(() => {
    if (authLoading || !db) return;
    if (!authUser || authUser.type !== 'professional') {
      toast({ title: "Unauthorized", description: "Please log in as a User.", variant: "destructive" });
      router.push("/auth");
      setIsLoading(false);
      return;
    }

    if (offerId) {
      setIsLoading(true);
      const offerDocRef = doc(db, "userSalesOffers", offerId);
      const unsubscribeOffer = onSnapshot(offerDocRef, async (docSnap) => {
        if (docSnap.exists()) {
          const offerData = { id: docSnap.id, ...docSnap.data() } as UserSalesOffer;
          if (offerData.creatorId === authUser.uid) { 
             router.push(`/offers/my-sales/view/${offerId}`);
             return;
          }
          if (offerData.isDeletedByAdmin || offerData.status !== 'active') {
            setOffer(null);
            toast({ title: "Offer Not Available", description: "This offer is not currently active or has been removed.", variant: "destructive" });
            router.push("/offers/my-sales");
          } else {
            setOffer(offerData);
             const viewerDocRef = doc(db, "userSalesOffers", offerId, "viewers", authUser.uid);
             const viewerSnap = await getDoc(viewerDocRef);
             if(!viewerSnap.exists()){
                 await setDoc(viewerDocRef, { viewedAt: serverTimestamp(), userId: authUser.uid, userName: authUser.name, userAvatarSeed: authUser.avatarSeed });
                 await updateDoc(offerDocRef, { views: (offerData.views || 0) + 1 });
                 setOffer(prev => prev ? {...prev, views: (prev.views || 0) + 1} : null);
             }
            const feedbackDocRef = doc(db, "userSalesOffers", offerId, "feedback", authUser.uid);
            const feedbackSnap = await getDoc(feedbackDocRef);
            setHasGivenFeedback(feedbackSnap.exists());

            // Check subscription status
            const subscriptionDocRef = doc(db, "users", authUser.uid, "subscribedPeerOffers", offerId);
            const subscriptionSnap = await getDoc(subscriptionDocRef);
            setIsSubscribed(subscriptionSnap.exists());
          }
        } else {
          toast({ title: "Not Found", description: "Sales offer not found.", variant: "destructive" });
          setOffer(null);
          router.push("/offers/my-sales");
        }
        setIsLoading(false);
      }, (error) => {
        console.error("Error fetching peer sales offer:", error);
        toast({ title: "Error", description: "Could not load offer details.", variant: "destructive" });
        setIsLoading(false);
      });
      return () => unsubscribeOffer();
    } else {
      setIsLoading(false);
    }
  }, [offerId, authUser, authLoading, router, toast]);

  const handleFeedback = async (type: 'positive' | 'negative') => {
    if (!offer || !offer.id || !authUser || !authUser.uid || hasGivenFeedback || !db) {
        if(hasGivenFeedback) toast({title: "Feedback Done", description: "You have already provided feedback for this offer.", variant: "default"});
        return;
    }

    const offerDocRef = doc(db, "userSalesOffers", offer.id);
    const feedbackDocRef = doc(db, "userSalesOffers", offer.id, "feedback", authUser.uid);

    try {
        await runTransaction(db, async (transaction) => {
            const offerSnap = await transaction.get(offerDocRef);
            if (!offerSnap.exists()) throw "Offer not found!";
            
            const currentOfferData = offerSnap.data();
            let newPositiveRate = currentOfferData.positiveResponseRate || 0;
            let newNegativeRate = currentOfferData.negativeResponseRate || 0;
            let newPeerInterestCount = currentOfferData.peerInterestCount || 0;

            if (type === 'positive') {
                newPositiveRate++;
                newPeerInterestCount++; // Still increment peer interest count on positive feedback
                const interestDocRef = doc(db, "userSalesOffers", offerId, "peerInterests", authUser.uid);
                transaction.set(interestDocRef, {
                    userName: authUser.name || "User", 
                    userAvatarSeed: authUser.avatarSeed, 
                    interestedAt: serverTimestamp()
                });
            } else {
                newNegativeRate++;
            }
            
            transaction.update(offerDocRef, { 
                positiveResponseRate: newPositiveRate, 
                negativeResponseRate: newNegativeRate,
                peerInterestCount: newPeerInterestCount 
            });
            transaction.set(feedbackDocRef, { type: type, timestamp: serverTimestamp(), userId: authUser.uid });
        });

        setOffer(prev => {
            if (!prev) return null;
            return {
                ...prev,
                positiveResponseRate: type === 'positive' ? (prev.positiveResponseRate || 0) + 1 : (prev.positiveResponseRate || 0),
                negativeResponseRate: type === 'negative' ? (prev.negativeResponseRate || 0) + 1 : (prev.negativeResponseRate || 0),
                peerInterestCount: type === 'positive' ? (prev.peerInterestCount || 0) + 1 : (prev.peerInterestCount || 0),
            };
        });
        setHasGivenFeedback(true);
        toast({ title: type === 'positive' ? "Interest Shown!" : "Feedback Noted", description: `Your feedback on "${offer.title}" has been recorded.` });
    } catch (error) {
        console.error("Error updating feedback on Firestore:", error);
        toast({ title: "Error", description: "Could not save feedback.", variant: "destructive"});
        setHasGivenFeedback(false);
    }
  };
  
  const handleToggleSubscription = async () => {
    if (!offer || !offer.id || !authUser || !authUser.uid || !db || authUser.uid === offer.creatorId) {
      toast({ title: "Action Not Allowed", description: "Cannot subscribe to your own offer or session invalid.", variant: "destructive"});
      return;
    }
    const currentOfferId = offer.id;
    setProcessingSubscriptionOfferId(currentOfferId);
    setIsSubscriptionProcessing(true);

    const subCollectionName = "subscribedPeerOffers";
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
          creatorName: offer.creatorName,
          creatorId: offer.creatorId,
          subscribedAt: serverTimestamp()
        });
        setIsSubscribed(true);
        toast({ title: "Subscribed!", description: `You are now subscribed to "${offer.title}". It will appear in 'Generate Revenue'.`});
      }
    } catch (error) {
      console.error("Error toggling peer offer subscription:", error);
      toast({ title: "Subscription Error", description: "Could not update your subscription status.", variant: "destructive"});
    } finally {
      setProcessingSubscriptionOfferId(null);
      setIsSubscriptionProcessing(false);
    }
  };

  const handleOpenMessageDialog = () => {
    if (!offer) return;
    setMessageSubject(`Regarding your sales offer: ${offer.title}`);
    setMessageBody("");
    setIsMessageDialogOpen(true);
  };

  const handleSendMessage = async () => {
    if (!messageSubject.trim() || !messageBody.trim() || !offer || !authUser || !db) {
      toast({ title: "Missing Information", description: "Cannot send message.", variant: "destructive" });
      return;
    }
    const newMessageData: Omit<DirectMessage, 'id' | 'docId'> = {
      senderId: authUser.uid,
      senderName: authUser.name || "User",
      senderEmail: authUser.email,
      senderAvatarSeed: authUser.avatarSeed,
      receiverId: offer.creatorId,
      receiverName: offer.creatorName,
      receiverAvatarSeed: offer.creatorAvatarSeed,
      subject: messageSubject,
      body: messageBody,
      attachmentName: null,
      isReadByReceiver: false,
      type: 'salespro_to_salespro',
      timestamp: serverTimestamp() as Timestamp, 
      conversationId: [authUser.uid, offer.creatorId].sort().join('_CONVO_'),
      participantIds: [authUser.uid, offer.creatorId].sort(),
    };

    try {
      await addDoc(collection(db, "directMessages"), newMessageData);
      toast({ title: "Message Sent!", description: `Your message to ${offer.creatorName} has been sent.`});
      setIsMessageDialogOpen(false);
    } catch (error) {
      console.error("Error sending message to Firestore:", error);
      toast({ title: "Message Sending Failed", variant: "destructive" });
    }
  };

  if (authLoading || isLoading) {
    return <div className="container mx-auto py-8 px-4 md:px-6 text-center">Loading offer details...</div>;
  }

  if (!authUser) {
     return (
      <div className="container mx-auto py-8 px-4 md:px-6 text-center">
        <h2 className="text-2xl font-semibold mb-4">Access Denied</h2>
        <Button asChild><Link href="/auth">Go to Login</Link></Button>
      </div>
    );
  }

  if (!offer) {
    return (
      <div className="container mx-auto py-8 px-4 md:px-6 text-center">
        <h2 className="text-2xl font-semibold mb-4">Sales Offer Not Found</h2>
        <Button asChild><Link href="/offers/my-sales"><ArrowLeft className="mr-2 h-4 w-4" /> Back to My Sales</Link></Button>
      </div>
    );
  }
  
  const StatCard = ({ title, value, icon, description}: { title: string; value: number; icon: React.ReactNode, description: string}) => (
    <Card className={`shadow-sm ${title.includes("Views") ? 'bg-blue-500/10 border-blue-500/30' : title.includes("Positive") ? 'bg-green-500/10 border-green-500/30' : title.includes("Interest") ? 'bg-purple-500/10 border-purple-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
      <CardHeader className="pb-2"><CardTitle className="text-base flex items-center">{icon}{title}</CardTitle></CardHeader>
      <CardContent><p className="text-3xl font-bold">{value.toLocaleString()}</p><p className="text-xs text-muted-foreground">{description}</p></CardContent>
    </Card>
  );


  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <Button variant="outline" onClick={() => router.back()} className="mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Offers
      </Button>

      <Card className="shadow-xl rounded-xl overflow-hidden">
        <CardHeader className="bg-muted/30 p-6">
          <div className="flex flex-col md:flex-row justify-between items-start gap-4">
            <div>
              <CardTitle className="text-2xl mb-1">{offer.title}</CardTitle>
              <Badge variant="secondary" className="py-1 px-2.5 text-sm font-medium">
                {offer.offerCategory} by <Link href={`/profile/${offer.creatorId}`} className="hover:underline text-primary">{offer.creatorName}</Link>
              </Badge>
            </div>
            <div className="text-sm text-muted-foreground text-left md:text-right">
              <p className="flex items-center gap-1.5"><CalendarDays className="h-4 w-4"/>Posted: {format(new Date(offer.postedDate), "dd MMM, yyyy")}</p>
              <p className="flex items-center gap-1.5"><Users className="h-4 w-4"/>Targeting: {offer.targetAudience}</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {offer.mediaUrl && (
            <div className="mb-6"><h3 className="text-lg font-semibold mb-2 flex items-center"><ImageIcon className="mr-2 h-5 w-5 text-primary"/> Offer Media</h3><NextImage src={offer.mediaUrl} alt={offer.title} width={800} height={450} className="rounded-lg w-full h-auto md:max-w-md mx-auto shadow-md border object-contain" data-ai-hint="offer image"/></div>
          )}
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6"> 
            <StatCard title="Views by Peers" icon={<Eye className="mr-2 h-5 w-5 text-blue-700"/>} value={offer.views || 0} description="How many sales pros viewed this." />
            <StatCard title="Positive Feedback" icon={<ThumbsUp className="mr-2 h-5 w-5 text-green-700"/>} value={offer.positiveResponseRate || 0} description="Positive responses from peers." />
            <StatCard title="Negative Feedback" icon={<ThumbsDown className="mr-2 h-5 w-5 text-red-700"/>} value={offer.negativeResponseRate || 0} description="Negative responses from peers." />
            <StatCard title="Peer Interest" icon={<Users className="mr-2 h-5 w-5 text-purple-700"/>} value={offer.peerInterestCount || 0} description="Peers who showed interest." />
          </div>

          <div><h3 className="text-lg font-semibold mb-1 flex items-center"><Info className="mr-2 h-5 w-5 text-primary"/>Offer Description</h3><p className="text-muted-foreground whitespace-pre-line text-sm leading-relaxed">{offer.description}</p></div>
          <Separator/>
          
          <div>
            <h3 className="text-lg font-semibold mb-1 flex items-center"><Percent className="mr-2 h-5 w-5 text-primary"/>Commission / Value Exchange</h3>
            {offer.commissionType && offer.commissionRateInput ? (
              <>
                <p className="text-muted-foreground text-sm">
                  Type: {offer.commissionType.replace('_', ' ').split(' ').map(s=>s.charAt(0).toUpperCase()+s.substring(1)).join(' ')}
                </p>
                <p className="text-muted-foreground text-sm">Details: {offer.commissionRateInput}</p>
              </>
            ) : (<p className="text-muted-foreground text-sm italic">No specific commission details provided. Refer to terms or contact creator.</p>)}
          </div>
          <Separator/>

          <div><h3 className="text-lg font-semibold mb-1 flex items-center"><FileText className="mr-2 h-5 w-5 text-primary"/>General Terms & Collaboration Details</h3><p className="text-muted-foreground whitespace-pre-line text-sm leading-relaxed">{offer.terms}</p></div>
          <Separator/>
          
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Your Interaction</h3>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button onClick={() => handleFeedback('positive')} variant="outline" className="flex-1 border-green-500 text-green-600 hover:bg-green-50 hover:text-green-700 disabled:opacity-70 disabled:cursor-not-allowed" disabled={hasGivenFeedback}>
                <ThumbsUp className="mr-2 h-4 w-4" /> Show Interest
              </Button>
              <Button onClick={() => handleFeedback('negative')} variant="outline" className="flex-1 border-red-500 text-red-600 hover:bg-red-50 hover:text-red-700 disabled:opacity-70 disabled:cursor-not-allowed" disabled={hasGivenFeedback}>
                <ThumbsDown className="mr-2 h-4 w-4" /> Not Interested
              </Button>
            </div>
            {hasGivenFeedback && <p className="text-xs text-muted-foreground text-center">Your feedback has been recorded for this offer.</p>}
          </div>
          <Separator/>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button onClick={handleOpenMessageDialog} className="w-full sm:w-auto flex-1 bg-primary text-primary-foreground hover:bg-primary/90">
              <MessageSquare className="mr-2 h-4 w-4" /> Message {offer.creatorName}
            </Button>
            <Button 
                onClick={handleToggleSubscription} 
                variant={isSubscribed ? "secondary" : "default"} 
                className="w-full sm:w-auto flex-1"
                disabled={isSubscriptionProcessing}
            >
                {isSubscriptionProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 
                isSubscribed ? <XCircle className="mr-2 h-4 w-4" /> : <Heart className="mr-2 h-4 w-4" />}
                {isSubscriptionProcessing ? (isSubscribed ? "Unsubscribing..." : "Subscribing...") : (isSubscribed ? "Unsubscribe from Offer" : "Subscribe to Offer")}
            </Button>
            <Button variant="outline" asChild className="w-full sm:w-auto flex-1">
                <Link href={`/profile/${offer.creatorId}`}>
                    <Users className="mr-2 h-4 w-4"/> View {offer.creatorName.split(' ')[0]}'s Profile
                </Link>
            </Button>
          </div>
        </CardContent>
        <CardFooter className="p-6 border-t bg-muted/30"><p className="text-xs text-muted-foreground">Contact {offer.creatorName} via {offer.contactNumber} or through the messaging feature. Interact with this offer using the buttons above.</p></CardFooter>
      </Card>

      <Dialog open={isMessageDialogOpen} onOpenChange={setIsMessageDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Message {offer.creatorName}</DialogTitle><DialogDescription>Compose your message regarding the sales offer: "{offer.title}".</DialogDescription></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-1.5"><Label htmlFor="peer_subject">Subject</Label><Input id="peer_subject" value={messageSubject} onChange={(e) => setMessageSubject(e.target.value)} placeholder="Message subject"/></div>
            <div className="space-y-1.5"><Label htmlFor="peer_message">Message</Label><Textarea id="peer_message" value={messageBody} onChange={(e) => setMessageBody(e.target.value)} className="min-h-[120px]" placeholder="Type your message here..."/></div>
          </div>
          <DialogFooter><DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose><Button onClick={handleSendMessage} disabled={!messageSubject.trim() || !messageBody.trim() || !authUser}>Send Message</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
