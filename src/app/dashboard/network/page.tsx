
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Users, Search, MessageSquare, ExternalLink, Clock, User as UserIconStd, Share2, Handshake } from 'lucide-react'; 
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CountdownTimer } from '@/components/common/countdown-timer';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebaseConfig';
import { collection, addDoc, serverTimestamp, Timestamp, query, where, getDocs, orderBy, onSnapshot } from 'firebase/firestore';
import type { DirectMessage } from '@/app/offers/conversations/page'; 
import type { RegisteredUserEntry } from '@/app/auth/components/auth-shared-types'; 
import { UserProfileDialog } from '@/components/common/user-profile-dialog'; // Import the dialog

export interface SalesPro extends RegisteredUserEntry {
  // uid, name, email, profileDescription, yearsExperience, workingLeads,
  // subscriptionType, subscriptionExpiryDate are inherited from RegisteredUserEntry
}


export default function SalesNetworkPage() {
  const { currentUser: authUser, loading: authLoading } = useAuth();
  const [corporationInfo, setCorporationInfo] = useState<{uid: string, id: string, name: string, email: string, avatarSeed: string} | null>(null);
  
  const [salesPros, setSalesPros] = useState<SalesPro[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  const [isMessageDialogOpen, setIsMessageDialogOpen] = useState(false);
  const [messagingSalesPro, setMessagingSalesPro] = useState<SalesPro | null>(null);
  const [messageSubject, setMessageSubject] = useState("");
  const [messageBody, setMessageBody] = useState("");
  const [allDirectMessages, setAllDirectMessages] = useState<DirectMessage[]>([]);

  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
  const [selectedUserIdForDialog, setSelectedUserIdForDialog] = useState<string | null>(null);


  useEffect(() => {
    if (!authLoading) {
      if (authUser && authUser.uid && authUser.email && authUser.type === 'company') {
        setCorporationInfo({
          uid: authUser.uid,
          id: authUser.email, 
          name: authUser.corporationName || authUser.name || "Corporation",
          email: authUser.email,
          avatarSeed: authUser.avatarSeed || authUser.corporationName?.replace(/[^a-zA-Z0-9]/g, '') || authUser.name?.replace(/[^a-zA-Z0-9]/g, '') || 'CorpDefaultSeed'
        });
      } else {
        setCorporationInfo(null);
      }
    }
  }, [authUser, authLoading]);

  useEffect(() => {
    if (!db) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const usersRef = collection(db, "users");
    const q = query(usersRef, 
                    where("type", "==", "professional"), 
                    where("status", "==", "active"),
                    where("email", "!=", "demo@gmail.com"),
                    orderBy("name", "asc") 
                  );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetchedSalesPros: SalesPro[] = [];
      querySnapshot.forEach((doc) => {
        fetchedSalesPros.push({ uid: doc.id, ...doc.data() } as SalesPro);
      });
      setSalesPros(fetchedSalesPros);
      setIsLoading(false);
      console.log(`[SalesNetworkPage] Fetched ${fetchedSalesPros.length} active professional users from Firestore.`);
    }, (error) => {
      console.error("Error fetching sales pros from Firestore: ", error);
      toast({ title: "Error", description: "Could not load sales network.", variant: "destructive"});
      setIsLoading(false);
    });

    if (authUser?.uid) {
        const messagesRef = collection(db, "directMessages");
        const msgQuery = query(messagesRef, 
            where("participantIds", "array-contains", authUser.uid),
            orderBy("timestamp", "desc")
        );
        const unsubMessages = onSnapshot(msgQuery, (querySnapshot) => {
            const fetchedMessages: DirectMessage[] = [];
            querySnapshot.forEach((doc) => {
                 fetchedMessages.push({ 
                    ...doc.data(), 
                    docId: doc.id, 
                    timestamp: (doc.data().timestamp as Timestamp)?.toDate ? (doc.data().timestamp as Timestamp).toDate() : new Date() 
                } as DirectMessage);
            });
            setAllDirectMessages(fetchedMessages);
        });
        return () => { unsubscribe(); unsubMessages(); };
    }

    return () => unsubscribe();
  }, [authUser, db, toast]); 

  const filteredSalesPros = useMemo(() => {
    return salesPros.filter(pro =>
      (pro.name && pro.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (pro.email && pro.email.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [salesPros, searchTerm]);

  const checkForExistingConversation = (targetUserUid: string): boolean => {
    if (!corporationInfo || !allDirectMessages.length) return false;
    return allDirectMessages.some(msg =>
      (msg.senderId === corporationInfo.uid && msg.receiverId === targetUserUid) ||
      (msg.senderId === targetUserUid && msg.receiverId === corporationInfo.uid)
    );
  };

  const handleInitiateMessage = async (salesPro: SalesPro) => {
    if (!corporationInfo) {
        toast({ title: "Login Required", description: "Please log in as a Corporation to send a message.", variant: "destructive"});
        return;
    }

    if (checkForExistingConversation(salesPro.uid)) {
      router.push('/dashboard/messages');
      toast({
        title: "Conversation Exists",
        description: `You already have a conversation with ${salesPro.name}. Redirecting to messages.`,
      });
    } else {
      setMessagingSalesPro(salesPro);
      setMessageSubject(`Opportunity from ${corporationInfo.name}`);
      setMessageBody("");
      setIsMessageDialogOpen(true);
    }
  };

  const handleSendMessageToSalesPro = async () => {
    if (!messageSubject.trim() || !messageBody.trim() || !messagingSalesPro || !corporationInfo || !db) {
      toast({ title: "Missing Information", description: "Cannot send message.", variant: "destructive" }); return;
    }

    const newMessageData: Omit<DirectMessage, 'id' | 'docId'> = {
        senderId: corporationInfo.uid,
        senderName: corporationInfo.name,
        senderEmail: corporationInfo.email,
        senderAvatarSeed: corporationInfo.avatarSeed,
        receiverId: messagingSalesPro.uid,
        receiverName: messagingSalesPro.name || "Sales Pro",
        receiverAvatarSeed: messagingSalesPro.avatarSeed || messagingSalesPro.uid.substring(0,10),
        subject: messageSubject,
        body: messageBody,
        timestamp: serverTimestamp() as Timestamp,
        isReadByReceiver: false,
        type: 'corporation_to_salespro',
        conversationId: [corporationInfo.uid, messagingSalesPro.uid].sort().join('_CONVO_'),
        participantIds: [corporationInfo.uid, messagingSalesPro.uid].sort(),
        attachmentName: null,
    };
    
    try {
        await addDoc(collection(db, "directMessages"), newMessageData);
        toast({ title: "Message Sent!", description: `Your message to ${messagingSalesPro.name} has been sent via Firestore.`});
        setIsMessageDialogOpen(false);
    } catch (error) {
        console.error("Error sending message to Firestore:", error);
        toast({ title: "Message Sending Failed", description: "Could not send your message.", variant: "destructive" });
    }
  };

  const handleViewProfile = (salesProId: string) => {
    setSelectedUserIdForDialog(salesProId);
    setIsProfileDialogOpen(true);
  };

  if (isLoading || authLoading) {
    return <div className="container mx-auto py-8 px-4 md:px-6 text-center">Loading sales network...</div>;
  }
  if (!corporationInfo && !authLoading) {
    return <div className="container mx-auto py-8 px-4 md:px-6 text-center">Corporation information not available. Please log in.</div>;
  }

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Sales Network</h1>
        <p className="text-muted-foreground">Manage and view professionals in your sales network.</p>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Sales Network Professionals ({salesPros.length})</CardTitle>
          <CardDescription>
            A list of active sales professionals who can promote and sell your offers.
          </CardDescription>
          <div className="flex flex-col md:flex-row gap-4 mt-4">
            <div className="relative flex-grow">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search by name or email..."
                className="pl-8 w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="max-h-[600px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="max-w-[200px] px-2">Name & Subscription</TableHead>
                  <TableHead className="hidden md:table-cell max-w-[180px] px-2">Email</TableHead>
                  <TableHead className="hidden sm:table-cell px-2">Working Leads</TableHead>
                  <TableHead className="hidden lg:table-cell px-2">Experience</TableHead>
                  <TableHead className="text-right px-2">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSalesPros.length > 0 ? (
                  filteredSalesPros.map((pro) => (
                    <TableRow key={pro.uid}>
                      <TableCell className="max-w-[200px] px-2 py-3 whitespace-nowrap"> 
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8 flex-shrink-0">
                            <AvatarImage src={pro.avatarDataUri || `https://picsum.photos/seed/${pro.avatarSeed || pro.uid}/40/40`} alt={pro.name || "User"} data-ai-hint="profile person" />
                            <AvatarFallback>{(pro.name || "U").substring(0, 1)}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <Button
                              variant="link"
                              className="font-medium truncate block p-0 h-auto text-left"
                              onClick={() => handleViewProfile(pro.uid)}
                            >
                              {pro.name || "Unnamed User"}
                            </Button>
                            {pro.subscriptionType === 'yearly' && (
                              <Badge variant="default" className="mt-1 text-xs bg-green-500 hover:bg-green-600 py-0.5 px-1.5">Yearly</Badge>
                            )}
                            {pro.subscriptionType === 'monthly' && pro.subscriptionExpiryDate && new Date(pro.subscriptionExpiryDate instanceof Timestamp ? pro.subscriptionExpiryDate.toDate() : pro.subscriptionExpiryDate) > new Date() && (
                              <div className="text-xs text-muted-foreground flex items-center mt-0.5">
                                <Clock className="h-3 w-3 mr-1 text-orange-500" />
                                <CountdownTimer
                                  expiryDate={pro.subscriptionExpiryDate}
                                  prefix=""
                                  displayMode="daysOnly"
                                  className="text-xs"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell max-w-[180px] px-2 py-3 truncate whitespace-nowrap">
                        {pro.email}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell px-2 py-3"> 
                        {pro.workingLeads || 0}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell px-2 py-3">{pro.yearsExperience || 0} yrs</TableCell>
                      <TableCell className="text-right px-2 py-3">
                        <Button variant="ghost" size="sm" className="mr-1 px-2 h-8" onClick={() => handleInitiateMessage(pro)}>
                          <MessageSquare className="h-4 w-4 md:mr-1" /> <span className="hidden md:inline">Message</span>
                        </Button>
                         <Button 
                            variant="outline" 
                            size="sm" 
                            className="px-2 h-8"
                            onClick={() => handleViewProfile(pro.uid)}
                         >
                            <ExternalLink className="h-4 w-4 md:mr-1" /> <span className="hidden md:inline">Profile</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground px-2 py-3">
                      No active sales professionals found in the network.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
        </CardContent>
      </Card>

      <Dialog open={isMessageDialogOpen} onOpenChange={setIsMessageDialogOpen}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>Message {messagingSalesPro?.name}</DialogTitle>
            <DialogDescription>
              Compose your message to {messagingSalesPro?.name} ({messagingSalesPro?.email}).
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-1">
              <Label htmlFor="corp_subject">Subject</Label>
              <Input
                id="corp_subject"
                value={messageSubject}
                onChange={(e) => setMessageSubject(e.target.value)}
                placeholder="Your message subject"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="corp_message">Message</Label>
              <Textarea
                id="corp_message"
                value={messageBody}
                onChange={(e) => setMessageBody(e.target.value)}
                className="min-h-[120px]"
                placeholder="Type your message here..."
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button type="button" onClick={handleSendMessageToSalesPro} disabled={!messageSubject.trim() || !messageBody.trim() || !corporationInfo || !messagingSalesPro}>
              <MessageSquare className="mr-2 h-4 w-4" /> Send Message
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {selectedUserIdForDialog && authUser && (
        <UserProfileDialog
            userId={selectedUserIdForDialog}
            isOpen={isProfileDialogOpen}
            onOpenChange={setIsProfileDialogOpen}
            currentLoggedInUser={authUser}
        />
      )}
    </div>
  );
}
