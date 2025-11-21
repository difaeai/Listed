
"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Eye, Users, DollarSign, Percent, Briefcase, FileText, Mail, CalendarDays, BarChartHorizontalBig, Edit, ImageIcon, MessageSquare, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type { FundingPitch } from '@/app/offers/my-ads/page'; 
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
import { doc, getDoc, collection, query, where, onSnapshot, addDoc, serverTimestamp, Timestamp, updateDoc, increment, setDoc, runTransaction } from "firebase/firestore";
import type { DirectMessage } from '@/app/offers/conversations/page'; 

interface InvestorLiker {
  id: string; 
  userName: string; 
  userAvatarSeed?: string; 
  userType?: 'investor' | 'corporation'; // Added userType
}


export default function ViewPitchPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const pitchId = params.pitchId as string;
  const { currentUser: authUser, loading: authLoading } = useAuth();

  const [pitch, setPitch] = useState<FundingPitch | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [interestedParties, setInterestedParties] = useState<InvestorLiker[]>([]);
  const [viewers, setViewers] = useState<InvestorLiker[]>([]); // For storing viewers
  
  const [isMessageDialogOpen, setIsMessageDialogOpen] = useState(false);
  const [messagingParty, setMessagingParty] = useState<InvestorLiker | null>(null);
  const [messageSubject, setMessageSubject] = useState("");
  const [messageBody, setMessageBody] = useState("");


  useEffect(() => {
    if (authLoading || !pitchId || !db) {
      setIsLoading(false);
      return;
    }
    if (!authUser || authUser.type !== 'professional') {
      toast({ title: "Unauthorized", description: "Only the pitch creator can view this detailed engagement page.", variant: "destructive" });
      router.push("/offers/my-ads"); 
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const pitchDocRef = doc(db, "fundingPitches", pitchId);
    
    const unsubPitch = onSnapshot(pitchDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const pitchData = { id: docSnap.id, ...docSnap.data() } as FundingPitch;
        if (pitchData.creatorId !== authUser.uid) {
          toast({ title: "Access Denied", description: "You are not the creator of this pitch.", variant: "destructive"});
          router.push("/offers/my-ads");
          setPitch(null);
        } else if (pitchData.isDeletedByAdmin) {
          toast({ title: "Pitch Removed", description: "This pitch has been removed by an administrator.", variant: "destructive"});
          router.push("/offers/my-ads");
          setPitch(null);
        } else {
          setPitch(pitchData);
        }
      } else {
        toast({ title: "Not Found", description: "Funding pitch not found.", variant: "destructive" });
        setPitch(null);
        router.push("/offers/my-ads");
      }
      // Keep setIsLoading(false) outside or in a finally block if combining listeners
    }, (error) => {
      console.error("Error fetching pitch details:", error);
      toast({ title: "Error", description: "Could not load pitch details.", variant: "destructive" });
      setIsLoading(false);
    });

    // Fetch Interested Parties
    const interestsColRef = collection(db, "fundingPitches", pitchId, "interests");
    const unsubInterests = onSnapshot(interestsColRef, (snapshot) => {
      const likers: InvestorLiker[] = [];
      snapshot.forEach(docSnap => { 
        likers.push({ id: docSnap.id, ...docSnap.data() } as InvestorLiker);
      });
      setInterestedParties(likers);
      if(!snapshot.metadata.hasPendingWrites) setIsLoading(false); // Consider combined loading state
    }, (error) => {
      console.error("Error fetching interested parties:", error);
      toast({ title: "Error", description: "Could not load interest data.", variant: "destructive" });
      setIsLoading(false);
    });

    // Fetch Viewers
    const viewersColRef = collection(db, "fundingPitches", pitchId, "viewers");
    const unsubViewers = onSnapshot(viewersColRef, (snapshot) => {
        const fetchedViewers: InvestorLiker[] = [];
        snapshot.forEach(docSnap => {
            fetchedViewers.push({ id: docSnap.id, ...docSnap.data()} as InvestorLiker);
        });
        setViewers(fetchedViewers);
        if(!snapshot.metadata.hasPendingWrites) setIsLoading(false); // Consider combined loading state
    }, (error) => {
        console.error("Error fetching viewers:", error);
        toast({ title: "Error", description: "Could not load viewer data.", variant: "destructive" });
        setIsLoading(false);
    });


    return () => {
      unsubPitch();
      unsubInterests();
      unsubViewers();
    };
  }, [pitchId, authUser, authLoading, router, toast]); 

  const getStatusBadgeClasses = (status?: FundingPitch["status"]): string => {
    if (!status) return 'border-gray-300 text-gray-600';
    switch(status) {
      case 'seeking_funding': return 'bg-blue-500 text-white border-blue-500';
      case 'funded': return 'bg-accent text-accent-foreground border-accent';
      case 'closed': return 'bg-destructive/80 text-destructive-foreground border-destructive/80';
      case 'draft': return 'border-yellow-500 text-yellow-600 bg-yellow-500/10';
      default: return 'border-gray-300 text-gray-600';
    }
  }

  const handleOpenMessageDialog = (party: InvestorLiker) => {
    setMessagingParty(party);
    setMessageSubject(`Regarding your interest in my pitch: ${pitch?.projectTitle || 'my pitch'}`);
    setMessageBody("");
    setIsMessageDialogOpen(true);
  };

  const handleSendMessage = async () => {
    if (!messageSubject.trim() || !messageBody.trim() || !messagingParty || !pitch || !authUser || !db) {
      toast({ title: "Missing Information", description: "Cannot send message.", variant: "destructive" });
      return;
    }
    const conversationId = [authUser.uid, messagingParty.id].sort().join('_CONVO_');
    const newMessageData: Omit<DirectMessage, 'id'|'docId'> = { 
      senderId: authUser.uid, 
      senderName: authUser.name || "Pitch Creator",
      senderEmail: authUser.email,
      senderAvatarSeed: authUser.avatarSeed,
      receiverId: messagingParty.id, 
      receiverName: messagingParty.userName, 
      receiverAvatarSeed: messagingParty.userAvatarSeed,
      subject: messageSubject,
      body: messageBody,
      attachmentName: null, 
      isReadByReceiver: false,
      type: messagingParty.userType === 'corporation' ? 'salespro_to_corporation' : 'salespro_to_investor',
      timestamp: serverTimestamp() as Timestamp,
      conversationId: conversationId,
      participantIds: [authUser.uid, messagingParty.id].sort(),
    };
    
    try {
      await addDoc(collection(db, "directMessages"), newMessageData);
      toast({
        title: "Message Sent!",
        description: `Your message "${messageSubject}" to ${messagingParty.userName} has been sent.`,
      });
      setIsMessageDialogOpen(false);
    } catch (error) {
      console.error("Failed to send message to Firestore:", error);
      toast({ title: "Message Sending Failed", description: "Could not save your message.", variant: "destructive" });
    }
  };

  if (authLoading || isLoading) {
    return <div className="container mx-auto py-8 px-4 md:px-6 text-center">Loading pitch details...</div>;
  }

  if (!authUser || authUser.type !== 'professional') {
    return <div className="container mx-auto py-8 px-4 md:px-6 text-center">Access Denied. Please log in as the pitch creator.</div>;
  }

  if (!pitch) { 
    return (
      <div className="container mx-auto py-8 px-4 md:px-6 text-center">
        <h2 className="text-2xl font-semibold mb-4">Pitch Not Found</h2>
        <p className="text-muted-foreground mb-4">The funding pitch you are looking for does not exist or may have been removed.</p>
        <Button asChild><Link href="/offers/my-ads"><ArrowLeft className="mr-2 h-4 w-4" /> Back to My Pitches</Link></Button>
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


  const renderMainPitchContent = () => (
    <div className="space-y-6">
        <div>
            <h3 className="text-lg font-semibold mb-1 flex items-center"><BarChartHorizontalBig className="mr-2 h-5 w-5 text-primary"/>Project Summary</h3>
            <p className="text-muted-foreground whitespace-pre-line text-sm leading-relaxed">{pitch.projectSummary}</p>
        </div>
        <Separator/>
        <div>
            <h3 className="text-lg font-semibold mb-2">Financials</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-md">
                <DollarSign className="h-5 w-5 text-primary"/>
                <div>
                    <span className="text-muted-foreground">Funding Sought:</span>
                    <p className="font-semibold">PKR {pitch.fundingAmountSought.toLocaleString()}</p>
                </div>
                </div>
                <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-md">
                <Percent className="h-5 w-5 text-primary"/>
                <div>
                    <span className="text-muted-foreground">Equity Offered:</span>
                    <p className="font-semibold">{pitch.equityOffered}%</p>
                </div>
                </div>
            </div>
        </div>
        
        {(pitch.businessPlanLink || pitch.contactEmail) && <Separator/>}

        <div className="space-y-2">
            {pitch.businessPlanLink && (
                <p className="text-sm flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary"/>
                    <span className="text-muted-foreground">Business Plan/Deck:</span>
                    <a href={pitch.businessPlanLink} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate">
                        {pitch.businessPlanLink}
                    </a>
                </p>
            )}
            <p className="text-sm flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary"/>
                <span className="text-muted-foreground">Contact Email:</span>
                <a href={`mailto:${pitch.contactEmail}`} className="text-primary hover:underline">
                    {pitch.contactEmail}
                </a>
            </p>
        </div>
    </div>
  );

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <div className="mb-6 flex items-center justify-between">
        <Button variant="outline" size="icon" asChild className="mr-2">
          <Link href={"/offers/my-ads"}> 
            <ArrowLeft className="h-5 w-5" />
            <span className="sr-only">Back</span>
          </Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight line-clamp-1 flex-1">{pitch.projectTitle}</h1>
        <Button variant="outline" asChild>
            <Link href={`/offers/my-ads/edit/${pitch.id}`}><Edit className="mr-2 h-4 w-4"/>Edit Pitch</Link>
        </Button>
      </div>

      <Card className="shadow-xl rounded-xl overflow-hidden">
        <CardHeader className="bg-muted/30 p-6">
          <div className="flex flex-col md:flex-row justify-between items-start gap-4">
            <div>
              <CardTitle className="text-2xl mb-1">{pitch.projectTitle}</CardTitle>
              <Badge variant="outline" className={getStatusBadgeClasses(pitch.status) + " py-1 px-2.5 text-sm font-medium"}>
                {pitch.status.replace('_', ' ').split(' ').map(s => s.charAt(0).toUpperCase() + s.substring(1)).join(' ')}
              </Badge>
               {pitch.featureStatus === 'active' && (
                <Badge variant="default" className="bg-accent text-accent-foreground ml-2 text-xs">Featured!</Badge>
              )}
            </div>
            <div className="text-sm text-muted-foreground text-left md:text-right">
              <p className="flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4"/>
                 Posted: {pitch.createdAt instanceof Timestamp ? format(pitch.createdAt.toDate(), "dd MMM, yyyy") : (pitch.postedDate ? format(new Date(pitch.postedDate), "dd MMM, yyyy") : "N/A")}
              </p>
              <p className="flex items-center gap-1.5"><Briefcase className="h-4 w-4"/>Industry: {pitch.industry}</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6">
            {pitch.pitchImageUrl ? (
                <div className="space-y-6"> 
                    <div className="mb-6"> 
                        <h3 className="text-lg font-semibold mb-2 flex items-center">
                            <ImageIcon className="mr-2 h-5 w-5 text-primary"/> Pitch Image
                        </h3>
                        <img 
                            src={pitch.pitchImageUrl} 
                            alt={pitch.projectTitle} 
                            className="rounded-lg w-full h-auto md:max-h-[400px] mx-auto shadow-md border object-contain" data-ai-hint="project image"
                        />
                    </div>
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <StatCard title="Pitch Views" icon={<Eye className="mr-2 h-5 w-5 text-blue-700"/>} value={viewers.length || 0} description="Total unique users who viewed this pitch."/>
                      <Dialog>
                          <DialogTrigger asChild>
                              <StatCard title="Interested Parties" icon={<Users className="mr-2 h-5 w-5 text-purple-700"/>} value={interestedParties.length || 0} description="Investors/Corporations who showed interest." isClickable={true}/>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-md">
                            <DialogHeader><DialogTitle>Investors Interested In: "{pitch.projectTitle}"</DialogTitle><DialogDescription>Investors or Corporations who showed interest in this pitch.</DialogDescription></DialogHeader>
                            <ScrollArea className="h-[300px] w-full pr-4 mt-4">
                                {interestedParties.length > 0 ? (<div className="space-y-3">{interestedParties.map(party => (
                                    <div key={party.id} className="flex items-center justify-between gap-3 p-2 rounded-md hover:bg-muted">
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-9 w-9 border">
                                                <AvatarImage src={`https://picsum.photos/seed/${party.userAvatarSeed || party.userName}/40/40`} alt={party.userName} data-ai-hint="person avatar"/>
                                                <AvatarFallback>{party.userName.substring(0,1)}</AvatarFallback>
                                            </Avatar>
                                            <div><p className="text-sm font-medium">{party.userName}</p><p className="text-xs text-muted-foreground">{party.userType === 'corporation' ? 'Corporation' : 'Investor'}</p></div>
                                        </div>
                                        <Button variant="outline" size="sm" onClick={() => handleOpenMessageDialog(party)}><MessageSquare className="mr-1.5 h-3.5 w-3.5"/>Message</Button>
                                    </div>))}
                                </div>) : (<p className="text-sm text-muted-foreground text-center py-4">No interested parties yet.</p>)}
                            </ScrollArea>
                            <DialogFooter className="mt-4"><DialogClose asChild><Button variant="outline">Close</Button></DialogClose></DialogFooter>
                          </DialogContent>
                      </Dialog>
                    </div>
                    {renderMainPitchContent()}
                </div>
            ) : (
                <div className="grid md:grid-cols-3 gap-6"> 
                    <div className="md:col-span-2 space-y-6">
                        {renderMainPitchContent()}
                    </div>
                    <div className="md:col-span-1 space-y-4">
                        <StatCard title="Pitch Views" icon={<Eye className="mr-2 h-5 w-5 text-blue-700"/>} value={viewers.length || 0} description="Total unique users who viewed this pitch."/>
                        <Dialog>
                            <DialogTrigger asChild>
                                 <StatCard title="Interested Parties" icon={<Users className="mr-2 h-5 w-5 text-purple-700"/>} value={interestedParties.length || 0} description="Investors/Corporations who showed interest." isClickable={true}/>
                            </DialogTrigger>
                             <DialogContent className="sm:max-w-md">
                                <DialogHeader><DialogTitle>Investors Interested In: "{pitch.projectTitle}"</DialogTitle><DialogDescription>Investors or Corporations who showed interest in this pitch.</DialogDescription></DialogHeader>
                                <ScrollArea className="h-[300px] w-full pr-4 mt-4">
                                {interestedParties.length > 0 ? (<div className="space-y-3">{interestedParties.map(party => (
                                    <div key={party.id} className="flex items-center justify-between gap-3 p-2 rounded-md hover:bg-muted">
                                        <div className="flex items-center gap-3">
                                        <Avatar className="h-9 w-9 border"><AvatarImage src={`https://picsum.photos/seed/${party.userAvatarSeed || party.userName}/40/40`} alt={party.userName} data-ai-hint="person avatar"/><AvatarFallback>{party.userName.substring(0,1)}</AvatarFallback></Avatar>
                                        <div><p className="text-sm font-medium">{party.userName}</p><p className="text-xs text-muted-foreground">{party.userType === 'corporation' ? 'Corporation' : 'Investor'}</p></div>
                                        </div>
                                        <Button variant="outline" size="sm" onClick={() => handleOpenMessageDialog(party)}><MessageSquare className="mr-1.5 h-3.5 w-3.5"/>Message</Button>
                                    </div>))}
                                </div>) : (<p className="text-sm text-muted-foreground text-center py-4">No interested parties yet.</p>)}
                                </ScrollArea>
                                <DialogFooter className="mt-4"><DialogClose asChild><Button variant="outline">Close</Button></DialogClose></DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>
            )}
        </CardContent>
        <CardFooter className="p-6 border-t bg-muted/30">
            <p className="text-xs text-muted-foreground">This is your pitch. View engagement from investors and corporations.</p>
        </CardFooter>
      </Card>
      
       <Dialog open={isMessageDialogOpen} onOpenChange={setIsMessageDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Message {messagingParty?.userName}</DialogTitle>
            <DialogDescription>
              Compose your message to {messagingParty?.userName} regarding your offer.
            </DialogDescription>
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
            <Button onClick={handleSendMessage} disabled={!messageSubject.trim() || !messageBody.trim() || !authUser}>
              Send Message
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
