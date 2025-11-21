
"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Eye, Users, Edit, Image as ImageIcon, MessageSquare, CalendarDays, Share2, Info, Percent, FileText, ThumbsUp, ThumbsDown, DollarSign } from 'lucide-react';
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
import { doc, getDoc, collection, query, where, getDocs, addDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import type { DirectMessage } from '@/app/offers/conversations/page'; 

interface PeerLiker {
  id: string; 
  name: string;
  avatarSeed?: string;
  userType?: 'investor' | 'corporation'; // Added userType
}


export default function ViewUserSalesOfferPage() {
  const params = useParams();
  const router = useRouter();
  const offerId = params.offerId as string;
  const { toast } = useToast();
  const { currentUser: authUser, loading: authLoading } = useAuth();

  const [offer, setOffer] = useState<UserSalesOffer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [peerInteractors, setPeerInteractors] = useState<PeerLiker[]>([]);
  
  const [isMessageDialogOpen, setIsMessageDialogOpen] = useState(false);
  const [messagingPeer, setMessagingPeer] = useState<PeerLiker | null>(null);
  const [messageSubject, setMessageSubject] = useState("");
  const [messageBody, setMessageBody] = useState("");


  useEffect(() => {
    if (authLoading) return;
    if (!authUser || authUser.type !== 'professional' || !db) {
      toast({ title: "Unauthorized", description: "Please log in as a User.", variant: "destructive" });
      router.push("/auth");
      return;
    }

    if (offerId && db) {
      setIsLoading(true);
      const offerDocRef = doc(db, "userSalesOffers", offerId);
      getDoc(offerDocRef).then(async (docSnap) => {
        if (docSnap.exists()) {
          const offerData = { id: docSnap.id, ...docSnap.data() } as UserSalesOffer;
          if (offerData.creatorId !== authUser.uid) {
             toast({ title: "Access Denied", description: "You are not authorized to view this offer's details.", variant: "destructive"});
             router.push("/offers/my-sales");
             return;
          }
          setOffer(offerData);

          // Fetch peer interests from subcollection
          const interestsRef = collection(db, "userSalesOffers", offerId, "peerInterests");
          const interestsSnap = await getDocs(interestsRef);
          const likers: PeerLiker[] = [];
          interestsSnap.forEach(doc => {
            likers.push({ id: doc.id, ...doc.data() } as PeerLiker);
          });
          setPeerInteractors(likers);

        } else {
          toast({ title: "Not Found", description: "Sales offer not found.", variant: "destructive" });
          setOffer(null);
          router.push("/offers/my-sales");
        }
      }).catch(error => {
        console.error("Error fetching sales offer details:", error);
        toast({ title: "Error", description: "Could not load offer details.", variant: "destructive" });
      }).finally(() => {
        setIsLoading(false);
      });
    } else {
      setIsLoading(false);
    }
  }, [offerId, authUser, authLoading, router, toast]);

  const handleOpenMessageDialog = (peer: PeerLiker) => {
    setMessagingPeer(peer);
    setMessageSubject(`Regarding your interest in my offer: ${offer?.title || 'my sales offer'}`);
    setMessageBody("");
    setIsMessageDialogOpen(true);
  };

  const handleSendMessageToPeer = async () => {
    if (!messageSubject.trim() || !messageBody.trim() || !messagingPeer || !offer || !authUser || !db) {
      toast({ title: "Missing Information", description: "Cannot send message.", variant: "destructive" });
      return;
    }
    const newMessageData: Omit<DirectMessage, 'id' | 'docId'> = {
      senderId: authUser.uid,
      senderName: authUser.name || "User",
      senderEmail: authUser.email,
      senderAvatarSeed: authUser.avatarSeed,
      receiverId: messagingPeer.id,
      receiverName: messagingPeer.name,
      receiverAvatarSeed: messagingPeer.avatarSeed,
      subject: messageSubject,
      body: messageBody,
      attachmentName: null,
      isReadByReceiver: false,
      type: 'salespro_to_salespro',
      timestamp: serverTimestamp() as Timestamp,
      conversationId: [authUser.uid, messagingPeer.id].sort().join('_CONVO_'),
      participantIds: [authUser.uid, messagingPeer.id].sort(),
    };

    try {
      await addDoc(collection(db, "directMessages"), newMessageData);
      toast({ title: "Message Sent!", description: `Your message to ${messagingPeer.name} has been sent.`});
      setIsMessageDialogOpen(false);
    } catch (error) {
      console.error("Error sending message to Firestore:", error);
      toast({ title: "Message Sending Failed", variant: "destructive" });
    }
  };

  const getStatusBadgeClasses = (status?: UserSalesOffer["status"]): string => {
    if (!status) return 'border-gray-300 text-gray-600';
    switch(status) {
      case 'active': return 'bg-accent text-accent-foreground border-accent';
      case 'paused': return 'border-yellow-500 text-yellow-600 bg-yellow-100';
      case 'completed': return 'bg-blue-500 text-white border-blue-500';
      case 'draft': return 'border-gray-400 text-gray-500 bg-gray-100';
      default: return 'border-gray-300 text-gray-600';
    }
  };

  if (authLoading || isLoading) {
    return <div className="container mx-auto py-8 px-4 md:px-6 text-center">Loading sales offer details...</div>;
  }

  if (!authUser || !offer) {
    return (
      <div className="container mx-auto py-8 px-4 md:px-6 text-center">
        <h2 className="text-2xl font-semibold mb-4">Sales Offer Not Found or Access Denied</h2>
        <Button asChild><Link href="/offers/my-sales"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Generate Revenue</Link></Button>
      </div>
    );
  }
  
  const StatCard = ({ title, value, icon, description, onClick, isClickable }: { title: string; value: number; icon: React.ReactNode, description: string, onClick?: () => void, isClickable?: boolean }) => (
    <Card 
        className={`shadow-sm ${isClickable ? 'cursor-pointer hover:shadow-md transition-shadow' : ''} 
        ${title.includes("Views") ? 'bg-blue-500/10 border-blue-500/30' : title.includes("Interest") ? 'bg-purple-500/10 border-purple-500/30' : title.includes("Positive") ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}
        onClick={isClickable ? onClick : undefined}>
      <CardHeader className="pb-2"><CardTitle className="text-base flex items-center">{icon}{title}</CardTitle></CardHeader>
      <CardContent><p className="text-3xl font-bold">{value.toLocaleString()}</p><p className="text-xs text-muted-foreground">{description}</p></CardContent>
    </Card>
  );


  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <div className="mb-6 flex items-center justify-between">
        <Button variant="outline" size="icon" asChild className="mr-2">
          <Link href="/offers/my-sales"><ArrowLeft className="h-5 w-5" /></Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight line-clamp-1 flex-1">{offer.title}</h1>
        <Button variant="outline" asChild><Link href={`/offers/my-sales/edit/${offer.id}`}><Edit className="mr-2 h-4 w-4"/>Edit Offer</Link></Button>
      </div>

      <Card className="shadow-xl rounded-xl overflow-hidden">
        <CardHeader className="bg-muted/30 p-6">
          <div className="flex flex-col md:flex-row justify-between items-start gap-4">
            <div>
              <CardTitle className="text-2xl mb-1">{offer.title}</CardTitle>
              <Badge variant="outline" className={getStatusBadgeClasses(offer.status) + " py-1 px-2.5 text-sm font-medium"}>
                {offer.status.charAt(0).toUpperCase() + offer.status.slice(1)}
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
                <div className="mb-6"><h3 className="text-lg font-semibold mb-2 flex items-center"><ImageIcon className="mr-2 h-5 w-5 text-primary"/> Offer Media</h3><img src={offer.mediaUrl} alt={offer.title} className="rounded-lg max-w-full h-auto md:max-w-md mx-auto shadow-md border object-contain" data-ai-hint="offer image"/></div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <StatCard title="Views by Peers" icon={<Eye className="mr-2 h-5 w-5 text-blue-700"/>} value={offer.views || 0} description="How many sales pros viewed this." isClickable={false} />
                <StatCard title="Positive Feedback" icon={<ThumbsUp className="mr-2 h-5 w-5 text-green-700"/>} value={offer.positiveResponseRate || 0} description="Positive responses from peers." isClickable={false} />
                <StatCard title="Negative Feedback" icon={<ThumbsDown className="mr-2 h-5 w-5 text-red-700"/>} value={offer.negativeResponseRate || 0} description="Negative responses from peers." isClickable={false} />
                <Dialog>
                    <DialogTrigger asChild>
                         <StatCard title="Peer Interest" icon={<Users className="mr-2 h-5 w-5 text-purple-700"/>} value={offer.peerInterestCount || 0} description="Peers who showed interest." isClickable={true}/>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader><DialogTitle>Peers Interested In: "{offer.title}"</DialogTitle><DialogDescription>Sales professionals who expressed interest in this offer.</DialogDescription></DialogHeader>
                        <ScrollArea className="h-[300px] w-full pr-4 mt-4">
                            {peerInteractors.length > 0 ? (<div className="space-y-3">{peerInteractors.map(pro => (
                                <div key={pro.id} className="flex items-center justify-between gap-3 p-2 rounded-md hover:bg-muted">
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-9 w-9 border">
                                            <AvatarImage src={`https://picsum.photos/seed/${pro.avatarSeed || pro.name}/40/40`} alt={pro.name} data-ai-hint="person avatar"/>
                                            <AvatarFallback>{pro.name.substring(0,1)}</AvatarFallback>
                                        </Avatar>
                                        <p className="text-sm font-medium">{pro.name}</p>
                                    </div>
                                    <Button variant="outline" size="sm" onClick={() => handleOpenMessageDialog(pro)}><MessageSquare className="mr-1.5 h-3.5 w-3.5"/>Message</Button>
                                </div>))}
                            </div>
                            ) : (<p className="text-sm text-muted-foreground text-center py-4">No peers have shown interest yet.</p>)}
                        </ScrollArea>
                        <DialogFooter className="mt-4"><DialogClose asChild><Button variant="outline">Close</Button></DialogClose></DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="space-y-6">
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
                  ) : (
                    <p className="text-muted-foreground text-sm italic">No specific commission details provided. Refer to terms or contact creator.</p>
                  )}
                </div>

                <Separator/>
                <div><h3 className="text-lg font-semibold mb-1 flex items-center"><FileText className="mr-2 h-5 w-5 text-primary"/>General Terms & Collaboration Details</h3><p className="text-muted-foreground whitespace-pre-line text-sm leading-relaxed">{offer.terms}</p></div>
                <Separator/>
                 <div><h3 className="text-lg font-semibold mb-1 flex items-center"><MessageSquare className="mr-2 h-5 w-5 text-primary"/>Contact</h3><p className="text-muted-foreground text-sm">Number: {offer.contactNumber}</p></div>
            </div>
        </CardContent>
        <CardFooter className="p-6 border-t bg-muted/30"><p className="text-xs text-muted-foreground">This is your sales offer. You can view engagement from other sales professionals here. </p></CardFooter>
      </Card>

       <Dialog open={isMessageDialogOpen} onOpenChange={setIsMessageDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Message {messagingPeer?.name}</DialogTitle>
            <DialogDescription>Compose your message to {messagingPeer?.name} regarding your offer.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-1">
              <Label htmlFor="creator_subject">Subject</Label>
              <Input id="creator_subject" value={messageSubject} onChange={(e) => setMessageSubject(e.target.value)} placeholder="Message subject"/>
            </div>
            <div className="space-y-1">
              <Label htmlFor="creator_message">Message</Label>
              <Textarea id="creator_message" value={messageBody} onChange={(e) => setMessageBody(e.target.value)} className="min-h-[120px]" placeholder="Type your message here..."/>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={handleSendMessageToPeer} disabled={!messageSubject.trim() || !messageBody.trim() || !authUser}>
              Send Message
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
