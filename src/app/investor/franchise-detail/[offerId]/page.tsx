
"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Users, DollarSign, Briefcase, FileText, Mail, CalendarDays, MessageSquare, Info, Percent, Package, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebaseConfig';
import { doc, getDoc, addDoc, collection, serverTimestamp, Timestamp, updateDoc } from "firebase/firestore";
import type { PlatformOffer } from '@/types/platform-offer';
import type { DirectMessage } from '@/app/offers/conversations/page';
import NextImage from 'next/image';

export default function InvestorFranchiseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const offerId = params.offerId as string;
  const { currentUser: authUser, loading: authLoading } = useAuth();

  const [offer, setOffer] = useState<PlatformOffer | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [isMessageDialogOpen, setIsMessageDialogOpen] = useState(false);
  const [messageSubject, setMessageSubject] = useState("");
  const [messageBody, setMessageBody] = useState("");

  useEffect(() => {
    if (authLoading || !authUser || !db) {
      if (!authLoading && !authUser) {
        router.push("/auth?reason=unauthorized_franchise_detail");
      }
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const offerDocRef = doc(db, "platformOffers", offerId);

    getDoc(offerDocRef).then((docSnap) => {
      if (docSnap.exists()) {
        const offerData = { id: docSnap.id, ...docSnap.data() } as PlatformOffer;
        if (offerData.isDeletedByAdmin || offerData.status !== 'active') {
          setOffer(null);
          toast({ title: "Opportunity Not Available", description: "This opportunity is not currently active or has been removed.", variant: "destructive" });
          router.push("/investor/franchise-opportunities");
        } else {
          setOffer(offerData);
          // Increment view count if not already viewed by this user (session-based tracking)
          const viewKey = `platform_offer_viewed_${authUser.uid}_${offerId}`;
          if (typeof window !== "undefined" && !sessionStorage.getItem(viewKey)) {
             updateDoc(offerDocRef, { views: (offerData.views || 0) + 1 })
                .then(() => sessionStorage.setItem(viewKey, 'true'))
                .catch(e => console.error("Error updating view count for franchise detail:", e));
          }
        }
      } else {
        setOffer(null);
        toast({ title: "Not Found", description: "Franchise opportunity not found.", variant: "destructive" });
        router.push("/investor/franchise-opportunities");
      }
    }).catch(error => {
      console.error("Error fetching franchise details for investor:", error);
      toast({ title: "Error", description: "Could not load franchise opportunity details.", variant: "destructive" });
      setOffer(null);
    }).finally(() => {
      setIsLoading(false);
    });

  }, [offerId, authUser, authLoading, router, toast]);

  const handleOpenMessageDialog = () => {
    if (!offer) return;
    setMessageSubject(`Inquiry about Franchise Opportunity: ${offer.title}`);
    setMessageBody("");
    setIsMessageDialogOpen(true);
  };

  const handleSendMessageToCorporation = async () => {
    if (!messageSubject.trim() || !messageBody.trim() || !offer || !offer.corporationId || !authUser || !db) {
      toast({ title: "Missing Information", description: "Cannot send message.", variant: "destructive" });
      return;
    }

    const newMessageData: Omit<DirectMessage, 'id' | 'docId'> = {
      timestamp: serverTimestamp() as Timestamp,
      senderId: authUser.uid,
      senderName: authUser.name || "Investor",
      senderEmail: authUser.email,
      senderAvatarSeed: authUser.avatarSeed,
      receiverId: offer.corporationId,
      receiverName: offer.corporationName,
      receiverAvatarSeed: offer.corporationLogoSeed,
      subject: messageSubject,
      body: messageBody,
      attachmentName: null,
      isReadByReceiver: false,
      type: 'investor_to_corporation', 
      conversationId: [authUser.uid, offer.corporationId].sort().join('_CONVO_'),
      participantIds: [authUser.uid, offer.corporationId].sort(),
    };

    try {
      await addDoc(collection(db, "directMessages"), newMessageData);
      toast({ title: "Message Sent!", description: `Your message to ${offer.corporationName} has been sent.` });
      setIsMessageDialogOpen(false);
    } catch (error) {
      console.error("Error sending message to Firestore:", error);
      toast({ title: "Message Sending Failed", variant: "destructive" });
    }
  };

  const getCategoryIcon = (category: PlatformOffer['offerCategory'] | undefined) => {
    if (!category) return <Briefcase className="h-5 w-5 text-primary"/>;
    switch(category) {
        case "Product": return <Package className="h-5 w-5 text-primary" />;
        case "Service": return <Briefcase className="h-5 w-5 text-primary" />;
        case "Subscription": return <Zap className="h-5 w-5 text-primary" />;
        case "Digital Product": return <FileText className="h-5 w-5 text-primary" />;
        case "Event": return <CalendarDays className="h-5 w-5 text-primary" />;
        default: return <Info className="h-5 w-5 text-primary"/>;
    }
  };

  if (authLoading || isLoading) {
    return <div className="container mx-auto py-8 px-4 md:px-6 text-center">Loading franchise opportunity details...</div>;
  }

  if (!authUser || authUser.type !== 'investor') {
    return <div className="container mx-auto py-8 px-4 md:px-6 text-center">Please log in as an Investor to view this page.</div>;
  }

  if (!offer) {
    return (
      <div className="container mx-auto py-8 px-4 md:px-6 text-center">
        <h2 className="text-2xl font-semibold mb-4">Opportunity Not Found or Unavailable</h2>
        <Button asChild><Link href="/investor/franchise-opportunities"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Franchise Opportunities</Link></Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <div className="mb-6 flex items-center justify-between">
        <Button variant="outline" size="icon" asChild className="mr-2">
          <Link href="/investor/franchise-opportunities"><ArrowLeft className="h-5 w-5" /><span className="sr-only">Back</span></Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight line-clamp-1 flex-1">{offer.title}</h1>
      </div>
      <Card className="shadow-xl rounded-xl overflow-hidden">
        <CardHeader className="bg-muted/30 p-6">
          <div className="flex flex-col md:flex-row justify-between items-start gap-4">
            <div>
              <CardTitle className="text-2xl mb-1">{offer.title}</CardTitle>
              <Badge variant="secondary" className="py-1 px-2.5 text-sm font-medium">
                From: {offer.corporationName}
              </Badge>
            </div>
            <div className="text-sm text-muted-foreground text-left md:text-right">
              <p className="flex items-center gap-1.5"><CalendarDays className="h-4 w-4"/>Posted: {format(new Date(offer.postedDate), "dd MMM, yyyy")}</p>
              <p className="flex items-center gap-1.5">{getCategoryIcon(offer.offerCategory)}Category: {offer.offerCategory}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {offer.mediaUrl && offer.mediaUrl.startsWith('data:image') ? (
            <div className="mb-6">
                <NextImage src={offer.mediaUrl} alt={offer.title} width={800} height={450} className="rounded-lg w-full h-auto md:max-h-[400px] mx-auto shadow-md border object-contain" data-ai-hint="business opportunity large"/>
            </div>
          ) : (
            <div className="mb-6 h-64 w-full bg-muted flex items-center justify-center rounded-lg">
                <Briefcase className="h-24 w-24 text-primary/30"/>
            </div>
          )}

          <div className="space-y-6">
            <div><h3 className="text-lg font-semibold mb-1 flex items-center"><Info className="mr-2 h-5 w-5 text-primary"/>Offer Description</h3><p className="text-muted-foreground whitespace-pre-line text-sm leading-relaxed">{offer.description}</p></div>
            <Separator/>
            <div><h3 className="text-lg font-semibold mb-2">Key Details</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-md"><DollarSign className="h-5 w-5 text-primary"/><div><span className="text-muted-foreground">Value/Commission:</span><p className="font-semibold">{offer.commissionRate} ({offer.commissionType})</p></div></div>
                    <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-md"><Users className="h-5 w-5 text-primary"/><div><span className="text-muted-foreground">Target Audience:</span><p className="font-semibold">{offer.targetAudience}</p></div></div>
                    {offer.price && <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-md"><Percent className="h-5 w-5 text-primary"/><div><span className="text-muted-foreground">Product/Service Price:</span><p className="font-semibold">PKR {offer.price.toLocaleString()}</p></div></div>}
                    <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-md"><Mail className="h-5 w-5 text-primary"/><div><span className="text-muted-foreground">Contact Person:</span><p className="font-semibold">{offer.contactPerson}</p></div></div>
                </div>
            </div>
            {offer.keySellingPoints && (<><Separator/><div className="space-y-2"><h3 className="text-lg font-semibold">Key Selling Points</h3><ul className="list-disc list-inside text-muted-foreground text-sm space-y-1 pl-4">{offer.keySellingPoints.split(',').map(point => <li key={point.trim()}>{point.trim()}</li>)}</ul></div></>)}
            {offer.offerLink && (<><Separator/><div className="space-y-2"><h3 className="text-lg font-semibold">More Information</h3><p className="text-sm"><a href={offer.offerLink} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1"><FileText className="h-4 w-4"/>View Offer Details/Website</a></p></div></>)}
            <Separator/>
             <div className="space-y-4">
                <h3 className="text-lg font-semibold mb-2">Connect with {offer.corporationName}</h3>
                <Button onClick={handleOpenMessageDialog} className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90">
                    <MessageSquare className="mr-2 h-4 w-4" /> Message {offer.corporationName}
                </Button>
            </div>
          </div>
        </CardContent>
        <CardFooter className="p-6 border-t bg-muted/30"><p className="text-xs text-muted-foreground">Interested in this opportunity? Contact the corporation directly via the messaging feature or the provided contact details for more information.</p></CardFooter>
      </Card>

      <Dialog open={isMessageDialogOpen} onOpenChange={setIsMessageDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Message {offer.corporationName}</DialogTitle><DialogDescription>Compose your message regarding the franchise opportunity: "{offer.title}".</DialogDescription></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-1.5"><Label htmlFor="investor_subject">Subject</Label><Input id="investor_subject" value={messageSubject} onChange={(e) => setMessageSubject(e.target.value)} placeholder="Message subject"/></div>
            <div className="space-y-1.5"><Label htmlFor="investor_message">Message</Label><Textarea id="investor_message" value={messageBody} onChange={(e) => setMessageBody(e.target.value)} className="min-h-[120px]" placeholder="Type your message here..."/></div>
          </div>
          <DialogFooter><DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose><Button onClick={handleSendMessageToCorporation} disabled={!messageSubject.trim() || !messageBody.trim() || !authUser}>Send Message</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

    