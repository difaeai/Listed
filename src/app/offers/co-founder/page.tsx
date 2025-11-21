
"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, UserPlus, Search, MessageSquare, ExternalLink, Clock, Edit3, Loader2, Star } from 'lucide-react'; 
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { DirectMessage } from '@/app/offers/conversations/page';
import { CountdownTimer } from '@/components/common/countdown-timer';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import type { RegisteredUserEntry } from '@/app/auth/components/auth-shared-types';
import { db, auth } from '@/lib/firebaseConfig';
import { collection, addDoc, serverTimestamp, query, where, getDocs, orderBy, doc, getDoc, Timestamp, updateDoc, onSnapshot } from 'firebase/firestore'; 
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { isFuture } from 'date-fns';

type EnrichedCoFounderEntry = RegisteredUserEntry; 
type OptInChoiceType = 'yes' | 'no' | 'remove';

const generateConversationId = (uid1: string, uid2: string): string => {
  return [uid1, uid2].sort().join('_CONVO_');
};

export default function CoFounderPage() {
  const { currentUser: authUser, loading: authLoading, setCurrentAppUser } = useAuth();
  
  const [enrichedCoFoundersList, setEnrichedCoFoundersList] = useState<EnrichedCoFounderEntry[]>([]);
  const [myCoFounderListing, setMyCoFounderListing] = useState<EnrichedCoFounderEntry | null>(null);
  const [isUserOptedIn, setIsUserOptedIn] = useState(false);
  const [isOptInDialogOpen, setIsOptInDialogOpen] = useState(false);
  const [optInChoice, setOptInChoice] = useState<OptInChoiceType | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');
  const [pageIsLoading, setPageIsLoading] = useState(true);
  
  const { toast } = useToast();
  const router = useRouter();

  const [isMessageDialogOpen, setIsMessageDialogOpen] = useState(false);
  const [messagingCoFounder, setMessagingCoFounder] = useState<EnrichedCoFounderEntry | null>(null);
  const [messageSubject, setMessageSubject] = useState("");
  const [messageBody, setMessageBody] = useState("");

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

    if (!authUser || authUser.type !== 'professional' || !authUser.uid || !authUser.email) {
      toast({ title: "Access Denied", description: "You must be logged in as a User to access the Co-Founder Network.", variant: "destructive"});
      router.push("/auth?reason=unauthorized_cofounder");
      setPageIsLoading(false);
      return;
    }
    const userDocRef = doc(db, "users", authUser.uid);
    getDoc(userDocRef).then(docSnap => {
      if (docSnap.exists()) {
        const userData = { uid: docSnap.id, ...docSnap.data() } as EnrichedCoFounderEntry;
        setMyCoFounderListing(userData.isOptedInCoFounder ? userData : null);
        setIsUserOptedIn(!!userData.isOptedInCoFounder);
      }
    }).catch(error => console.error("Error fetching current user's co-founder status:", error));
  }, [authLoading, authUser, router, toast]);

  useEffect(() => {
    const loadCoFounders = async () => {
      if (!db || !authUser || !hasAnnualSubscription) {
        setPageIsLoading(false); 
        return;
      }
      setPageIsLoading(true);
      
      const usersRef = collection(db, "users");
      const q = query(usersRef, 
                      where("type", "==", "professional"), 
                      where("status", "==", "active"),
                      where("isOptedInCoFounder", "==", true),
                      where("email", "!=", "demo@gmail.com"));
      
      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const coFounders: EnrichedCoFounderEntry[] = [];
        querySnapshot.forEach((docSnap) => {
          coFounders.push({ uid: docSnap.id, ...docSnap.data() } as EnrichedCoFounderEntry);
        });
        setEnrichedCoFoundersList(coFounders);

        const currentUserInList = coFounders.find(cf => cf.uid === authUser.uid);
        if (currentUserInList) {
          setMyCoFounderListing(currentUserInList);
          setIsUserOptedIn(true);
        } else if (myCoFounderListing && !currentUserInList){ 
          setMyCoFounderListing(null);
          setIsUserOptedIn(false);
        }
        setPageIsLoading(false);
      }, (error) => {
        console.error("Error fetching co-founders:", error);
        toast({ title: "Error", description: "Could not load co-founder network.", variant: "destructive"});
        setPageIsLoading(false);
      });
      return () => unsubscribe();
    };

    if (!authLoading) {
      loadCoFounders();
    }
  }, [authUser, authLoading, hasAnnualSubscription, myCoFounderListing, toast]);

  const handleOptInSubmit = async () => {
    if (!authUser || !authUser.uid || !db) {
      toast({ title: "User Error", description: "User information not available.", variant: "destructive" });
      return;
    }
    if (optInChoice === undefined) {
      toast({ title: "Selection Required", description: "Please make a selection from the dropdown.", variant: "destructive" });
      return;
    }

    const userDocRef = doc(db, "users", authUser.uid);
    let newOptInStatus = isUserOptedIn;
    let newOptInTimestamp: Timestamp | null = myCoFounderListing?.optedInCoFounderAt instanceof Timestamp ? myCoFounderListing.optedInCoFounderAt : (myCoFounderListing?.optedInCoFounderAt ? Timestamp.fromDate(new Date(myCoFounderListing.optedInCoFounderAt as string | Date)) : null);


    if (optInChoice === 'yes') {
      newOptInStatus = true;
      newOptInTimestamp = serverTimestamp() as Timestamp;
      toast({ title: "Successfully Listed!", description: "You are now listed as a potential co-founder." });
    } else if (optInChoice === 'remove' || optInChoice === 'no') {
      newOptInStatus = false;
      newOptInTimestamp = null; 
      toast({ title: optInChoice === 'remove' ? "Successfully De-listed" : "Opt-out Noted", description: optInChoice === 'remove' ? "You have been removed from the co-founder list." : "You have chosen not to be listed." });
    }
    
    try {
      await updateDoc(userDocRef, {
        isOptedInCoFounder: newOptInStatus,
        optedInCoFounderAt: newOptInTimestamp,
        updatedAt: serverTimestamp()
      });
      
      const updatedAuthData = { ...authUser, isOptedInCoFounder: newOptInStatus, optedInCoFounderAt: newOptInTimestamp || undefined } as RegisteredUserEntry;
      setCurrentAppUser(updatedAuthData, auth.currentUser);

      setIsUserOptedIn(newOptInStatus);
      setMyCoFounderListing(newOptInStatus ? { ...authUser, ...updatedAuthData } as EnrichedCoFounderEntry : null);

    } catch (error) {
      console.error("Error updating co-founder opt-in status:", error);
      toast({ title: "Update Failed", description: "Could not update your listing status.", variant: "destructive"});
    }

    setIsOptInDialogOpen(false);
    setOptInChoice(undefined);
  };

  const handleOpenMessageDialog = (coFounder: EnrichedCoFounderEntry) => {
    if (!authUser) {
        toast({ title: "Login Required", description: "Please log in to send a message.", variant: "destructive" });
        return;
    }
    if (coFounder.uid === authUser?.uid) {
      toast({ title: "Cannot Message Yourself", description: "You cannot send a message to your own co-founder profile.", variant: "default"});
      return;
    }
    setMessagingCoFounder(coFounder);
    setMessageSubject(`Co-founder Inquiry: Regarding your listing on LISTED`);
    setMessageBody("");
    setIsMessageDialogOpen(true);
  };

  const handleSendMessageToCoFounder = async () => {
    if (!messageSubject.trim() || !messageBody.trim() || !messagingCoFounder || !authUser || !db) {
      toast({ title: "Missing Information", description: "Cannot send message. Ensure you are logged in and all fields are filled.", variant: "destructive" }); return;
    }

    const conversationId = generateConversationId(authUser.uid, messagingCoFounder.uid);

    const newMessageData: Partial<DirectMessage> = {
        senderId: authUser.uid,
        senderName: authUser.name,
        senderEmail: authUser.email, 
        senderAvatarSeed: authUser.avatarSeed,
        receiverId: messagingCoFounder.uid, 
        receiverName: messagingCoFounder.name,
        receiverAvatarSeed: messagingCoFounder.avatarSeed,
        subject: messageSubject,
        body: messageBody,
        timestamp: serverTimestamp(),
        isReadByReceiver: false,
        type: 'salespro_to_salespro',
        conversationId: conversationId,
        participantIds: [authUser.uid, messagingCoFounder.uid].sort(),
        attachmentName: null, 
    };
    
    try {
        await addDoc(collection(db, "directMessages"), newMessageData as DirectMessage);
        toast({ title: "Message Sent!", description: `Your message to ${messagingCoFounder.name} has been sent successfully.`});
        setIsMessageDialogOpen(false);
    } catch (error) {
        console.error("Error sending message to Firestore:", error);
        toast({ title: "Message Sending Failed", description: "Could not send your message. Please try again.", variant: "destructive" });
    }
  };

  const filteredDisplayCoFounders = useMemo(() => {
    if (!authUser?.uid) return [];
    return enrichedCoFoundersList.filter(cf => 
      cf.uid !== authUser.uid && 
      ((cf.name && cf.name.toLowerCase().includes(searchTerm.toLowerCase())) || 
       (cf.email && cf.email.toLowerCase().includes(searchTerm.toLowerCase())))
    );
  }, [enrichedCoFoundersList, searchTerm, authUser?.uid]);


  if (authLoading || pageIsLoading) {
    return <div className="container mx-auto py-8 px-4 md:px-6 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />Loading Co-Founder Network...</div>;
  }
  
  if (!authUser && !authLoading) { 
     return (
      <div className="container mx-auto py-8 px-4 md:px-6 text-center">
        <p className="text-lg text-muted-foreground">Please log in to access the Co-Founder Network.</p>
        <Button asChild className="mt-4">
            <Link href="/auth">Login</Link>
        </Button>
      </div>
    );
  }
  
  if (!hasAnnualSubscription) {
    return (
      <div className="container mx-auto py-8 px-4 md:px-6">
        <Button variant="outline" asChild className="mb-4">
            <Link href="/offers"><ArrowLeft className="mr-2 h-4 w-4" /> Back to User Portal</Link>
        </Button>
        <Alert variant="default" className="border-yellow-500 bg-yellow-100/80 text-yellow-800">
            <Star className="h-5 w-5 text-yellow-600" />
            <AlertTitle className="font-bold">Premium Feature</AlertTitle>
            <AlertDescription>
                The Co-Founder Network is an exclusive feature for Annual Subscribers, connecting you with other serious entrepreneurs. Upgrade your plan to unlock this valuable networking tool.
                <Button asChild variant="link" className="p-0 h-auto ml-2 text-yellow-800 font-bold">
                    <Link href="/offers/verify-payment">Upgrade Now</Link>
                </Button>
            </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <Button variant="outline" asChild className="mb-4 print:hidden">
        <Link href="/offers"><ArrowLeft className="mr-2 h-4 w-4" /> Back to User Portal</Link>
      </Button>
      
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight flex items-center">
          <UserPlus className="mr-3 h-8 w-8 text-primary" /> Co-Founder Network
        </h1>
        <p className="text-muted-foreground">Connect with potential co-founders for your next venture or offer your skills. Opt-in to be discoverable.</p>
      </div>

      <Dialog open={isOptInDialogOpen} onOpenChange={setIsOptInDialogOpen}>
        {myCoFounderListing ? (
          <Card className="shadow-lg rounded-xl mb-6 border-primary">
            <CardHeader>
              <CardTitle className="text-xl flex items-center justify-between">
                <span>Your Co-Founder Listing</span>
                <DialogTrigger asChild>
                    <Button 
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setOptInChoice(isUserOptedIn ? 'yes' : undefined); 
                      }}
                    >
                      <Edit3 className="mr-2 h-4 w-4" /> Manage Listing
                    </Button>
                  </DialogTrigger>
              </CardTitle>
              <CardDescription>You are currently listed as a potential co-founder.</CardDescription>
            </CardHeader>
            <CardContent className="flex items-start gap-4">
              <Avatar className="h-16 w-16 border-2 border-primary">
                <AvatarImage src={myCoFounderListing.avatarDataUri || `https://picsum.photos/seed/${myCoFounderListing.avatarSeed || myCoFounderListing.uid}/64/64`} alt={myCoFounderListing.name || ""} data-ai-hint="profile person"/>
                <AvatarFallback>{(myCoFounderListing.name || "U").substring(0, 1)}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold text-lg">{myCoFounderListing.name}</p>
                <p className="text-sm text-muted-foreground">{myCoFounderListing.email}</p>
                <p className="text-xs text-muted-foreground mt-1">Listed Since: {myCoFounderListing.optedInCoFounderAt instanceof Timestamp ? myCoFounderListing.optedInCoFounderAt.toDate().toLocaleDateString() : (myCoFounderListing.optedInCoFounderAt ? new Date(myCoFounderListing.optedInCoFounderAt as any).toLocaleDateString() : "N/A")}</p>
                {myCoFounderListing.subscriptionType === 'yearly' && myCoFounderListing.status === 'active' && (
                    <Badge variant="default" className="mt-1 text-xs bg-green-500 hover:bg-green-600 py-0.5 px-1.5">Yearly</Badge>
                )}
                {myCoFounderListing.subscriptionType === 'monthly' && myCoFounderListing.status === 'active' && myCoFounderListing.subscriptionExpiryDate && new Date(myCoFounderListing.subscriptionExpiryDate as any) > new Date() && (
                  <div className="text-xs text-muted-foreground flex items-center mt-0.5">
                    <Clock className="h-3 w-3 mr-1 text-orange-500" />
                    <CountdownTimer
                      expiryDate={myCoFounderListing.subscriptionExpiryDate}
                      prefix=""
                      displayMode="daysOnly"
                      className="text-xs"
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
            authUser && ( 
                <DialogTrigger asChild>
                    <Button 
                    className="bg-accent hover:bg-accent/90 text-accent-foreground mb-6 w-full md:w-auto"
                    onClick={() => {
                        setOptInChoice(undefined); 
                    }}
                    >
                    <UserPlus className="mr-2 h-4 w-4" /> 
                    Be a Co-founder
                    </Button>
                </DialogTrigger>
            )
        )}
        
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{isUserOptedIn ? "Manage Your Co-founder Listing" : "Become a Co-founder?"}</DialogTitle>
            <DialogDescription>
              {isUserOptedIn 
                ? "You are currently listed as a potential co-founder. Would you like to remain listed or be removed?"
                : "Are you willing to be listed publicly as a potential co-founder? Others on LISTED can then find and message you."
              }
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="optInChoiceSelect">Your Choice</Label>
            <Select 
                onValueChange={(value) => {
                    setOptInChoice(value as OptInChoiceType);
                }} 
                value={optInChoice}
            >
              <SelectTrigger id="optInChoiceSelect">
                <SelectValue placeholder="Select your choice" />
              </SelectTrigger>
              <SelectContent>
                {isUserOptedIn ? (
                  <>
                    <SelectItem value="yes">Keep me listed as a Co-founder</SelectItem>
                    <SelectItem value="remove">Remove me from the Co-founder list</SelectItem>
                  </>
                ) : (
                  <>
                    <SelectItem value="yes">Yes, list me as a Co-founder</SelectItem>
                    <SelectItem value="no">No, not at this time</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={handleOptInSubmit} disabled={!authUser || optInChoice === undefined}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card className="shadow-lg rounded-xl">
        <CardHeader>
          <CardTitle>Find Potential Co-founders ({filteredDisplayCoFounders.length})</CardTitle>
          <CardDescription>Browse other professionals open to co-founding opportunities.</CardDescription>
          <div className="relative mt-4">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by name or email..."
              className="pl-8 w-full md:w-1/2 lg:w-1/3 h-10 rounded-md"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px] border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name & Subscription</TableHead>
                  <TableHead className="hidden md:table-cell">Email</TableHead>
                  <TableHead className="hidden lg:table-cell">Listed Since</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDisplayCoFounders.length > 0 ? (
                  filteredDisplayCoFounders.map((cf) => (
                    <TableRow key={cf.uid}>
                      <TableCell className="whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 border">
                            <AvatarImage src={cf.avatarDataUri || `https://picsum.photos/seed/${cf.avatarSeed || cf.uid}/40/40`} alt={cf.name || ""} data-ai-hint="profile person"/>
                            <AvatarFallback>{(cf.name || "U").substring(0, 1)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <span className="font-medium">{cf.name || 'N/A'}</span>
                            {cf.subscriptionType === 'yearly' && cf.status === 'active' &&(
                              <Badge variant="default" className="ml-2 text-xs bg-green-500 hover:bg-green-600 py-0.5 px-1.5">Yearly</Badge>
                            )}
                            {cf.subscriptionType === 'monthly' && cf.status === 'active' && cf.subscriptionExpiryDate && new Date(cf.subscriptionExpiryDate as any) > new Date() && (
                              <div className="text-xs text-muted-foreground flex items-center mt-0.5">
                                <Clock className="h-3 w-3 mr-1 text-orange-500" />
                                <CountdownTimer
                                  expiryDate={cf.subscriptionExpiryDate}
                                  prefix=""
                                  displayMode="daysOnly"
                                  className="text-xs"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{cf.email}</TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                        {cf.optedInCoFounderAt instanceof Timestamp ? cf.optedInCoFounderAt.toDate().toLocaleDateString() : (cf.optedInCoFounderAt ? new Date(cf.optedInCoFounderAt as any).toLocaleDateString() : "N/A")}
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenMessageDialog(cf)}
                          className="border-primary text-primary hover:bg-primary/10 hover:text-primary"
                          disabled={!authUser || cf.uid === authUser?.uid}
                        >
                          <MessageSquare className="mr-1.5 h-3.5 w-3.5" /> 
                          <span className="hidden sm:inline">Message</span>
                        </Button>
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/profile/${encodeURIComponent(cf.uid)}`}>
                            <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> 
                            <span className="hidden sm:inline">Profile</span>
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                      {searchTerm ? "No co-founders match your search." : 
                       enrichedCoFoundersList.length > 0 && enrichedCoFoundersList.every(cf => cf.uid === authUser?.uid) ? "You are currently the only one listed. Invite others!" :
                       "No one else is currently listed as a co-founder. Be the first!"}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
         <CardFooter className="pt-4 border-t">
            <p className="text-xs text-muted-foreground">
                This network connects individuals interested in co-founding new ventures or joining existing projects as a core team member.
            </p>
        </CardFooter>
      </Card>

      <Dialog open={isMessageDialogOpen} onOpenChange={setIsMessageDialogOpen}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>Message {messagingCoFounder?.name}</DialogTitle>
            <DialogDescription>
              Compose your message to {messagingCoFounder?.name} ({messagingCoFounder?.email}).
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-1">
              <Label htmlFor="cofounder_subject">Subject</Label>
              <Input
                id="cofounder_subject"
                value={messageSubject}
                onChange={(e) => setMessageSubject(e.target.value)}
                placeholder="Message subject"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="cofounder_message">Message</Label>
              <Textarea
                id="cofounder_message"
                value={messageBody}
                onChange={(e) => setMessageBody(e.target.value)}
                className="min-h-[120px]"
                placeholder="Type your message here..."
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button type="button" onClick={handleSendMessageToCoFounder} disabled={!messageSubject.trim() || !messageBody.trim() || !authUser}>
              <MessageSquare className="mr-2 h-4 w-4" /> Send Message
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
