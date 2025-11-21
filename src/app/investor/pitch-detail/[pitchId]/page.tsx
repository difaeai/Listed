
"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Eye, Users, DollarSign, Percent, Briefcase, FileText, Mail, CalendarDays, BarChartHorizontalBig, ImageIcon, ThumbsUp, ThumbsDown, MessageSquare, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type { FundingPitch } from '@/app/offers/my-ads/page'; 
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { db, auth } from '@/lib/firebaseConfig';
import { doc, getDoc, setDoc, updateDoc, increment, serverTimestamp, collection, addDoc, Timestamp, runTransaction } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';

interface InvestorLiker { 
  id: string; 
  name: string;
  avatarSeed: string;
}

interface DirectMessage {
  id?: string;
  docId?: string;
  timestamp: Timestamp | Date;
  senderId: string;
  senderName: string;
  senderEmail?: string;
  senderAvatarSeed?: string;
  receiverId: string;
  receiverName: string;
  receiverAvatarSeed?: string;
  subject: string;
  body: string;
  attachmentName?: string | null;
  isReadByReceiver: boolean;
  type: 'salespro_to_investor' | 'investor_to_salespro' | 'investor_to_corporation';
  conversationId: string;
  participantIds: string[];
}


export default function InvestorViewPitchPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const pitchId = params.pitchId as string;
  const { currentUser: authUser, loading: authLoading } = useAuth();

  const [pitch, setPitch] = useState<FundingPitch | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLiked, setHasLiked] = useState(false); 
  
  const [isMessageCreatorDialogOpen, setIsMessageCreatorDialogOpen] = useState(false);
  const [messageCreatorSubject, setMessageCreatorSubject] = useState("");
  const [messageCreatorBody, setMessageCreatorBody] = useState("");


  useEffect(() => {
    if (authLoading || !authUser || !pitchId || !db) {
      if (!authLoading && !authUser ) {
         router.push("/auth?reason=unauthorized_investor_pitch_detail");
      }
      setIsLoading(false); 
      return;
    }

    setIsLoading(true);
    const pitchDocRef = doc(db, "fundingPitches", pitchId);
    
    const fetchPitchData = async () => {
      try {
        const docSnap = await getDoc(pitchDocRef);
        if (docSnap.exists()) {
          const pitchData = { id: docSnap.id, ...docSnap.data() } as FundingPitch;
          
          if (pitchData.isDeletedByAdmin || pitchData.status === 'draft' || pitchData.status === 'closed') { 
            setPitch(null); 
            toast({title: "Pitch Not Available", description: "This pitch is not currently seeking funding or has been removed.", variant: "destructive"});
            router.push("/investor/opportunities"); 
          } else {
            setPitch(pitchData);

            const viewerDocRef = doc(db, "fundingPitches", pitchId, "viewers", authUser.uid);
            const viewerSnap = await getDoc(viewerDocRef);
            if (!viewerSnap.exists()) {
              await setDoc(viewerDocRef, {
                viewedAt: serverTimestamp(),
                userName: authUser.name || "Investor",
                userType: "investor",
                userAvatarSeed: authUser.avatarSeed || authUser.name?.replace(/[^a-zA-Z0-9]/g, '') || authUser.email?.replace(/[^a-zA-Z0-9]/g, '') || 'InvestorSeed',
                userId: authUser.uid,
              });
              await updateDoc(pitchDocRef, { views: increment(1) });
              setPitch(prev => prev ? { ...prev, views: (prev.views || 0) + 1 } : null);
            }


            const interestDocRef = doc(db, "fundingPitches", pitchId, "interests", authUser.uid);
            const interestSnap = await getDoc(interestDocRef);
            if (interestSnap.exists()) {
              setHasLiked(true);
            }
          }
        } else {
          toast({ title: "Not Found", description: "Funding pitch not found.", variant: "destructive" });
          setPitch(null);
          router.push("/investor/opportunities");
        }
      } catch (error) {
        console.error("Error fetching pitch details:", error);
        toast({ title: "Error", description: "Could not load pitch details. Please try again in few seconds.", variant: "destructive" });
        setPitch(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPitchData();

  }, [pitchId, authUser, authLoading, router, toast]);


  const handleLike = async () => {
    if (!pitch || !pitch.id || !authUser || !authUser.uid || hasLiked || !db) return;

    const pitchDocRef = doc(db, "fundingPitches", pitch.id);
    const interestDocRef = doc(db, "fundingPitches", pitch.id, "interests", authUser.uid);
    const userPortfolioDocRef = doc(db, "users", authUser.uid, "interestedPitches", pitch.id);

    try {
      await runTransaction(db, async (transaction) => {
        const pitchSnap = await transaction.get(pitchDocRef);
        if (!pitchSnap.exists()) {
          throw "Pitch does not exist!";
        }
        
        // Write to pitch's subcollection for the creator to see
        transaction.set(interestDocRef, {
          interestedAt: serverTimestamp(),
          userName: authUser.name || "Investor",
          userType: "investor", 
          userAvatarSeed: authUser.avatarSeed || authUser.name?.replace(/[^a-zA-Z0-9]/g, '') || authUser.email?.replace(/[^a-zA-Z0-9]/g, '') || 'InvestorSeed',
          userId: authUser.uid,
        });
        
        // Write to the investor's own portfolio subcollection
        transaction.set(userPortfolioDocRef, {
            pitchId: pitch.id,
            pitchTitle: pitch.projectTitle,
            interestedAt: serverTimestamp()
        });

        transaction.update(pitchDocRef, { interestedInvestorsCount: increment(1) });
      });

      setPitch(prev => prev ? { ...prev, interestedInvestorsCount: (prev.interestedInvestorsCount || 0) + 1 } : null);
      setHasLiked(true);
      toast({ title: "Pitch Liked!", description: "You've shown interest in this pitch. It's now in your portfolio." });
    } catch (error) {
      console.error("Error liking pitch:", error);
      toast({ title: "Error", description: "Could not record your interest. Please try again in few seconds.", variant: "destructive" });
    }
  };

  const handleDislike = () => { 
    if (!pitch || !authUser) return;
    toast({ title: "Feedback Noted", description: "Your feedback has been recorded." });
  };

  const handleMarkAsFunded = async () => {
    if (!pitch || !pitch.id || !authUser || !db || pitch.status === 'funded' || pitch.status === 'closed') {
      toast({ title: "Action Not Allowed", description: "This pitch cannot be marked as funded at this time.", variant: "destructive" });
      return;
    }

    const pitchDocRef = doc(db, "fundingPitches", pitch.id);
    try {
      await updateDoc(pitchDocRef, {
        status: 'funded',
        updatedAt: serverTimestamp()
      });
      setPitch(prev => prev ? { ...prev, status: 'funded' } : null);
      toast({ title: "Pitch Marked as Funded!", description: `"${pitch.projectTitle}" status has been updated to Funded.` });
    } catch (error) {
      console.error("Error marking pitch as funded:", error);
      toast({ title: "Error", description: "Could not update pitch status.", variant: "destructive" });
    }
  };

  const handleOpenMessageCreatorDialog = () => {
    if (!pitch) return;
    setMessageCreatorSubject(`Inquiry about your pitch: ${pitch.projectTitle}`);
    setMessageCreatorBody("");
    setIsMessageCreatorDialogOpen(true);
  };

  const handleSendMessageToCreator = async () => {
    if (!messageCreatorSubject.trim() || !messageCreatorBody.trim() || !pitch || !pitch.creatorId || !authUser || !db) {
      toast({ title: "Missing Information", description: "Cannot send message. Ensure you are logged in and all fields are filled.", variant: "destructive" });
      return;
    }

    const newMessageData: Omit<DirectMessage, 'id'| 'docId'> = {
      timestamp: serverTimestamp() as Timestamp,
      senderId: authUser.uid, 
      senderName: authUser.name || "Investor",
      senderEmail: authUser.email,
      senderAvatarSeed: authUser.avatarSeed,
      receiverId: pitch.creatorId, 
      receiverName: pitch.creatorName || "Pitch Creator",
      receiverAvatarSeed: pitch.creatorAvatarSeed,
      subject: messageCreatorSubject,
      body: messageCreatorBody,
      attachmentName: null, 
      isReadByReceiver: false,
      type: 'investor_to_salespro', // Investor sending to a salespro/fundraiser
      conversationId: [authUser.uid, pitch.creatorId].sort().join('_CONVO_'),
      participantIds: [authUser.uid, pitch.creatorId].sort(),
    };
    
    try {
      await addDoc(collection(db, "directMessages"), newMessageData);
      toast({
        title: "Message Sent!",
        description: `Your message "${messageCreatorSubject}" to ${pitch.creatorName || "Pitch Creator"} has been sent.`,
      });
      setIsMessageCreatorDialogOpen(false);
    } catch (error) {
      console.error("Failed to send message to Firestore:", error);
      toast({ title: "Message Sending Failed", description: "Could not save your message. Please try again in few seconds.", variant: "destructive" });
    }
  };

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

  if (authLoading || isLoading) {
    return <div className="container mx-auto py-8 px-4 md:px-6 text-center">Loading pitch details...</div>;
  }
  
  if (!authUser) { 
    return <div className="container mx-auto py-8 px-4 md:px-6 text-center">Please log in to view pitch details.</div>;
  }

  if (!pitch) { 
    return (
      <div className="container mx-auto py-8 px-4 md:px-6 text-center">
        <h2 className="text-2xl font-semibold mb-4">Pitch Not Found</h2>
        <p className="text-muted-foreground mb-4">The funding pitch you are looking for does not exist, may have been removed, or is not available.</p>
        <Button asChild>
          <Link href={"/investor/opportunities"}><ArrowLeft className="mr-2 h-4 w-4" /> Back to Opportunities</Link>
        </Button>
      </div>
    );
  }
  
  const StatCard = ({ title, value, icon, description }: { title: string; value: number; icon: React.ReactNode, description: string }) => (
    <Card className={`shadow-sm ${title.includes("Views") ? 'bg-blue-500/10 border-blue-500/30' : 'bg-green-500/10 border-green-500/30'}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center">{icon}{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold">{value.toLocaleString()}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
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
              <span className="text-muted-foreground">Pitch Contact Email:</span>
              <a href={`mailto:${pitch.contactEmail}`} className="text-primary hover:underline">
                  {pitch.contactEmail}
              </a>
          </p>
          <div className="text-sm flex items-center gap-2">
            <Users className="h-4 w-4 text-primary"/>
            <span className="text-muted-foreground">Pitch Creator:</span>
            {pitch.creatorId ? (
              <Link href={`/offers/sales-partners/${pitch.creatorId}`} className="text-primary hover:underline font-medium">
                {pitch.creatorName || "N/A"}
              </Link>
            ) : (
                <span className="font-medium">{pitch.creatorName || "N/A"}</span>
            )}
          </div>
      </div>
    </div>
  );

  const renderInteractionAndMessaging = () => (
    <>
      <Separator className="my-6"/>
      <div className="space-y-4">
        <h3 className="text-lg font-semibold mb-2">Your Interaction with this Pitch</h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button onClick={handleLike} variant="outline" className="border-green-500 text-green-600 hover:bg-green-50 hover:text-green-700 flex-1 disabled:opacity-70 disabled:cursor-not-allowed" disabled={hasLiked || pitch.status !== 'seeking_funding'}>
            <ThumbsUp className="mr-2 h-4 w-4" /> {hasLiked ? "Liked" : "Like Pitch / Show Interest"}
          </Button>
          <Button onClick={handleDislike} variant="outline" className="border-red-500 text-red-600 hover:bg-red-50 hover:text-red-700 flex-1" disabled={pitch.status !== 'seeking_funding'}>
            <ThumbsDown className="mr-2 h-4 w-4" /> Not Interested
          </Button>
        </div>
      </div>
      
      <Separator className="my-6"/>
      <div className="space-y-4">
        <h3 className="text-lg font-semibold mb-2">Contact Pitch Creator ({pitch.creatorName || "Fund Raiser"})</h3>
        <Button onClick={handleOpenMessageCreatorDialog} className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90">
          <MessageSquare className="mr-2 h-4 w-4" /> Message Pitch Creator
        </Button>
      </div>

      <Separator className="my-6"/>
      <div className="space-y-4">
        <h3 className="text-lg font-semibold mb-2">Mark Investment Status</h3>
        <Button 
            onClick={handleMarkAsFunded} 
            className="w-full sm:w-auto bg-accent text-accent-foreground hover:bg-accent/90"
            disabled={pitch.status === 'funded' || pitch.status === 'closed' || !hasLiked}
            title={!hasLiked ? "You must 'Like' the pitch first to mark it as funded." : ""}
        >
          <CheckCircle className="mr-2 h-4 w-4" /> 
          {pitch.status === 'funded' ? "Already Marked Funded" : "Mark as Funded"}
        </Button>
        {pitch.status === 'funded' && <p className="text-xs text-muted-foreground text-center sm:text-left mt-1">This pitch is marked as funded.</p>}
         {!hasLiked && pitch.status === 'seeking_funding' && <p className="text-xs text-muted-foreground text-center sm:text-left mt-1">Please "Like" the pitch before you can mark it as funded.</p>}
      </div>
    </>
  );

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <div className="mb-6 flex items-center justify-between">
        <Button variant="outline" size="icon" asChild className="mr-2">
          <Link href="/investor/opportunities">
            <ArrowLeft className="h-5 w-5" />
            <span className="sr-only">Back to Opportunities</span>
          </Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight line-clamp-1 flex-1">{pitch.projectTitle}</h1>
      </div>

      <Card className="shadow-xl rounded-xl overflow-hidden">
        <CardHeader className="bg-muted/30 p-6">
          <div className="flex flex-col md:flex-row justify-between items-start gap-4">
            <div>
              <CardTitle className="text-2xl mb-1">{pitch.projectTitle}</CardTitle>
              <Badge variant="outline" className={getStatusBadgeClasses(pitch.status) + " py-1 px-2.5 text-sm font-medium"}>
                {pitch.status.replace('_', ' ').split(' ').map(s => s.charAt(0).toUpperCase() + s.substring(1)).join(' ')}
              </Badge>
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
                        <img 
                            src={pitch.pitchImageUrl} 
                            alt={pitch.projectTitle} 
                            className="rounded-lg w-full h-auto md:max-h-[400px] mx-auto shadow-md border object-contain" data-ai-hint="project image"
                        />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 mb-6">
                        <StatCard 
                            title="Pitch Views" 
                            icon={<Eye className="mr-2 h-5 w-5 text-blue-700"/>} 
                            value={pitch.views || 0}
                            description="Total times this pitch was viewed by investors/corporations."
                        />
                        <StatCard 
                            title="Total Interest Shown" 
                            icon={<Users className="mr-2 h-5 w-5 text-green-700"/>} 
                            value={pitch.interestedInvestorsCount || 0}
                            description="Investors/Corporations who showed interest."
                        />
                    </div>
                    {renderMainPitchContent()}
                    {renderInteractionAndMessaging()}
                </div>
            ) : (
                <div className="grid md:grid-cols-3 gap-6"> 
                    <div className="md:col-span-2 space-y-6">
                        {renderMainPitchContent()}
                    </div>
                    <div className="md:col-span-1 space-y-4">
                         <div className="grid grid-cols-1 gap-4 mb-6"> 
                            <StatCard 
                                title="Pitch Views" 
                                icon={<Eye className="mr-2 h-5 w-5 text-blue-700"/>} 
                                value={pitch.views || 0}
                                description="Total times this pitch was viewed."
                            />
                            <StatCard 
                                title="Investors Interested" 
                                icon={<Users className="mr-2 h-5 w-5 text-green-700"/>} 
                                value={pitch.interestedInvestorsCount || 0}
                                description="Investors/Corporations who showed interest."
                            />
                        </div>
                        {renderInteractionAndMessaging()}
                    </div>
                </div>
            )}
        </CardContent>
        <CardFooter className="p-6 border-t bg-muted/30">
            <p className="text-xs text-muted-foreground">This pitch is currently {pitch.status.replace('_', ' ')}. 
            Use the buttons above to show your interest, message the pitch creator, or mark as funded if applicable.
            </p>
        </CardFooter>
      </Card>

      <Dialog open={isMessageCreatorDialogOpen} onOpenChange={setIsMessageCreatorDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Message {pitch.creatorName || "Pitch Creator"}</DialogTitle>
            <DialogDescription>
              Compose your message regarding the pitch: "{pitch.projectTitle}".
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-1.5">
              <Label htmlFor="investor_subject">Subject</Label>
              <Input id="investor_subject" value={messageCreatorSubject} onChange={(e) => setMessageCreatorSubject(e.target.value)} placeholder="Message subject"/>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="investor_message">Message</Label>
              <Textarea id="investor_message" value={messageCreatorBody} onChange={(e) => setMessageCreatorBody(e.target.value)} className="min-h-[120px]" placeholder="Type your message here..."/>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={handleSendMessageToCreator} disabled={!messageCreatorSubject.trim() || !messageCreatorBody.trim() || !authUser}>
              Send Message
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
