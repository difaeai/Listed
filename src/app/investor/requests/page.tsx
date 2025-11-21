
"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, UserPlus, Search, MessageSquare, ExternalLink, Clock, Edit3, Loader2, Star, Briefcase, Landmark, ShieldAlert, Users, Send } from 'lucide-react'; 
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useRouter, usePathname } from 'next/navigation';
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
import type { RegisteredUserEntry, AuthPageUserType } from '@/app/auth/components/auth-shared-types';
import { db, auth } from '@/lib/firebaseConfig';
import { collection, addDoc, serverTimestamp, query, where, getDocs, orderBy, doc, getDoc, Timestamp, updateDoc, onSnapshot, FieldValue } from 'firebase/firestore'; 
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { isFuture } from 'date-fns';
import { cn } from "@/lib/utils";
import { format, formatDistanceToNowStrict } from 'date-fns';


interface Partner extends RegisteredUserEntry { 
  // All necessary fields (uid, name, avatarSeed, type) are inherited from RegisteredUserEntry
}

interface Conversation {
  id: string; 
  partner: Partner; 
  lastMessageSnippet: string;
  lastMessageTimestamp: Date; 
  unreadCount: number;
  isBlockedByCurrentUser?: boolean; 
}

const getTimeFromTimestamp = (ts: Date | Timestamp | FieldValue): number => {
    if (ts instanceof Date) {
        return ts.getTime();
    }
    if (ts instanceof Timestamp) {
        return ts.toDate().getTime();
    }
    // For serverTimestamp(), we can't get a time, so return a future date to sort appropriately
    return Date.now(); 
};

const generateConversationId = (uid1: string, uid2: string): string => {
  return [uid1, uid2].sort().join('_CONVO_');
};


export default function InvestorRequestsPage() {
  const { currentUser: investorUser, loading: authLoading } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [allMessages, setAllMessages] = useState<DirectMessage[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [detailedActivePartner, setDetailedActivePartner] = useState<Partner | null>(null);
  const [isMessagingBlocked, setIsMessagingBlocked] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();


  useEffect(() => {
    if (!investorUser || !investorUser.uid || !db || authLoading || investorUser.type !== 'investor') {
      setAllMessages([]); 
      setConversations([]); 
      return;
    }

    console.log("[InvestorRequestsPage] Subscribing to messages for investor UID:", investorUser.uid);

    const messagesRef = collection(db, "directMessages");
    const q = query(messagesRef, 
      where("participantIds", "array-contains", investorUser.uid),
      orderBy("timestamp", "desc")
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetchedMessages: DirectMessage[] = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if ( (data.senderId === investorUser.uid && (data.type === 'investor_to_salespro' || data.type === 'investor_to_corporation')) ||
             (data.receiverId === investorUser.uid && (data.type === 'salespro_to_investor' || data.type === 'corporation_to_investor')) ) {
            fetchedMessages.push({ 
                ...data, 
                docId: docSnap.id, 
                timestamp: (data.timestamp as Timestamp)?.toDate ? (data.timestamp as Timestamp).toDate() : new Date() 
            } as DirectMessage);
        }
      });
      console.log("[InvestorRequestsPage] Fetched relevant messages from Firestore:", fetchedMessages.length);
      setAllMessages(fetchedMessages);
      processMessagesIntoConversations(fetchedMessages, investorUser);
    }, (error) => {
      console.error("[InvestorRequestsPage] Error fetching investor messages from Firestore: ", error);
      toast({
        title: "Failed to Fetch Messages",
        description: "Could not load your conversations. Please try again.",
        variant: "destructive",
      });
    });

    return () => {
      console.log("[InvestorRequestsPage] Unsubscribing from Firestore messages.");
      unsubscribe();
    };
  }, [investorUser, authLoading, toast]);

  const processMessagesIntoConversations = async (messages: DirectMessage[], currentInvestor: RegisteredUserEntry) => {
    const conversationMap = new Map<string, Conversation>();
    const sortedMessages = [...messages].sort((a, b) => getTimeFromTimestamp(a.timestamp) - getTimeFromTimestamp(b.timestamp));
    
    const partnerIds = new Set<string>();
    sortedMessages.forEach(msg => {
        const partnerId = msg.senderId === currentInvestor.uid ? msg.receiverId : msg.senderId;
        partnerIds.add(partnerId);
    });

    const partnerDetailsMap = new Map<string, RegisteredUserEntry>();
    if (partnerIds.size > 0 && db) {
        const partnerDocsPromises = Array.from(partnerIds).map(id => getDoc(doc(db, "users", id)));
        const partnerDocsSnaps = await Promise.all(partnerDocsPromises);
        partnerDocsSnaps.forEach(snap => {
            if (snap.exists()) {
                partnerDetailsMap.set(snap.id, { uid: snap.id, ...snap.data() } as RegisteredUserEntry);
            }
        });
    }

    sortedMessages.forEach(msg => {
      const conversationId = msg.conversationId || generateConversationId(msg.senderId, msg.receiverId);
      const partnerId = msg.senderId === currentInvestor.uid ? msg.receiverId : msg.senderId;
      const partnerFirestoreData = partnerDetailsMap.get(partnerId);

      if (!partnerFirestoreData) {
        console.warn(`[InvestorRequestsPage] Partner data not found for ID: ${partnerId} for message ${msg.docId}`);
        return;
      }
      
      const partner: Partner = {
        ...partnerFirestoreData, 
        name: partnerFirestoreData.name || (msg.senderId === currentInvestor.uid ? msg.receiverName : msg.senderName),
        avatarSeed: partnerFirestoreData.avatarSeed || (msg.senderId === currentInvestor.uid ? msg.receiverAvatarSeed : msg.senderAvatarSeed) || partnerId.substring(0,10),
      };
      
      let conversation = conversationMap.get(conversationId);
      if (!conversation) {
        conversation = {
          id: conversationId,
          partner: partner,
          lastMessageSnippet: msg.body.substring(0, 30) + (msg.body.length > 30 ? "..." : ""),
          lastMessageTimestamp: new Date(msg.timestamp as Date),
          unreadCount: 0,
          isBlockedByCurrentUser: currentInvestor.blockedUsers?.includes(partner.uid) || false,
        };
      } else {
        
        if (conversation.partner.type === 'professional' && (partner.type === 'investor' || partner.type === 'company')) {
            conversation.partner.type = partner.type;
        }
        conversation.lastMessageSnippet = msg.body.substring(0, 30) + (msg.body.length > 30 ? "..." : "");
        conversation.lastMessageTimestamp = new Date(msg.timestamp as Date);
        conversation.isBlockedByCurrentUser = currentInvestor.blockedUsers?.includes(partner.uid) || false;
      }

      if (msg.receiverId === currentInvestor.uid && !msg.isReadByReceiver) {
        conversation.unreadCount += 1;
      }
      conversationMap.set(conversationId, conversation);
    });
    const newConversations = Array.from(conversationMap.values())
      .sort((a, b) => b.lastMessageTimestamp.getTime() - a.lastMessageTimestamp.getTime()); 
    setConversations(newConversations);
  };


  const currentMessages = useMemo(() => {
    if (!activeConversationId || !investorUser) return [];
    return allMessages
      .filter(msg => msg.conversationId === activeConversationId)
      .sort((a,b) => getTimeFromTimestamp(a.timestamp) - getTimeFromTimestamp(b.timestamp));
  }, [activeConversationId, allMessages, investorUser]);


  useEffect(() => {
    if (activeConversationId && investorUser && db && allMessages.length > 0) {
      const messagesToUpdate = allMessages.filter(msg => 
        msg.conversationId === activeConversationId && 
        msg.receiverId === investorUser.uid && 
        !msg.isReadByReceiver &&
        msg.docId 
      );

      if (messagesToUpdate.length > 0) {
        messagesToUpdate.forEach(async (msg) => {
          if (msg.docId) {
            const messageDocRef = doc(db, "directMessages", msg.docId);
            try {
              await updateDoc(messageDocRef, { isReadByReceiver: true });
            } catch (error) {
              console.error(`[InvestorRequestsPage] Error marking message ${msg.docId} as read:`, error);
            }
          }
        });
      }
    }
  }, [activeConversationId, investorUser, allMessages, db]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentMessages]);

  const handleSelectConversation = async (conversationId: string) => {
    setActiveConversationId(conversationId);
    const conversation = conversations.find(c => c.id === conversationId);
    if (!conversation || !investorUser || !db) {
      setDetailedActivePartner(null);
      setIsMessagingBlocked(false);
      return;
    }

    setIsMessagingBlocked(false); 
    setDetailedActivePartner(null);

    try {
      const partnerDocRef = doc(db, "users", conversation.partner.uid); 
      const partnerSnap = await getDoc(partnerDocRef);
      if (partnerSnap.exists()) {
        const partnerData = { uid: partnerSnap.id, ...partnerSnap.data() } as Partner;
        setDetailedActivePartner(partnerData);

        const senderBlockedRecipient = investorUser.blockedUsers?.includes(partnerData.uid) || false;
        const recipientBlockedSender = partnerData.blockedUsers?.includes(investorUser.uid) || false;
        
        if (senderBlockedRecipient || recipientBlockedSender) {
          setIsMessagingBlocked(true);
          const blocker = senderBlockedRecipient ? "You have" : `${partnerData.name} has`;
          toast({
            title: "Messaging Blocked",
            description: `${blocker} blocked communication with this user.`,
            variant: "destructive",
          });
        }
      } else {
        toast({ title: "Error", description: "Could not load partner details.", variant: "destructive" });
      }
    } catch (error) {
      console.error("[InvestorRequestsPage] Error fetching partner details:", error);
      toast({ title: "Error", description: "Failed to fetch partner information.", variant: "destructive" });
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !activeConversationId || !investorUser || !db || !detailedActivePartner) {
      toast({ title: "Cannot Send", description: "Message is empty or session is invalid.", variant: "destructive" });
      return;
    }
    if (isMessagingBlocked) {
      toast({ title: "Messaging Blocked", description: "Cannot send message as communication is blocked.", variant: "destructive" });
      return;
    }
    
    let messageType: DirectMessage['type'] = 'investor_to_salespro'; 
    if (detailedActivePartner.type === 'company') messageType = 'investor_to_corporation';
    else if (detailedActivePartner.type === 'professional') messageType = 'investor_to_salespro';
    
    const newMsgData: Omit<DirectMessage, 'id' | 'docId'> = {
      senderId: investorUser.uid,
      senderName: investorUser.name || "Investor",
      senderEmail: investorUser.email, 
      senderAvatarSeed: investorUser.avatarSeed || investorUser.uid.substring(0,10),
      receiverId: detailedActivePartner.uid, 
      receiverName: detailedActivePartner.name || "Partner",
      receiverAvatarSeed: detailedActivePartner.avatarSeed,
      subject: `Re: Conversation with ${detailedActivePartner.name || "Partner"}`, 
      body: newMessage,
      timestamp: serverTimestamp(),
      isReadByReceiver: false, 
      type: messageType,
      conversationId: activeConversationId,
      participantIds: [investorUser.uid, detailedActivePartner.uid].sort(),
      attachmentName: null,
    };

    try {
      await addDoc(collection(db, "directMessages"), newMsgData as DirectMessage);
      setNewMessage("");
    } catch (error) {
      console.error("[InvestorRequestsPage] Error sending message to Firestore:", error);
      toast({
        title: "Message Not Sent",
        description: "Could not send your message. Please try again.",
        variant: "destructive",
      });
    }
  };

  const activeConversationDetails = useMemo(() => {
    return conversations.find(c => c.id === activeConversationId);
  }, [conversations, activeConversationId]);
  
  const filteredConversations = useMemo(() => {
    return conversations.filter(convo => 
      convo.partner.name && convo.partner.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [conversations, searchTerm]);

  const getParticipantTypeIcon = (participantType?: AuthPageUserType): React.ReactNode => {
    if (participantType === 'investor') return <Landmark className="h-3.5 w-3.5 text-blue-500" />;
    if (participantType === 'company') return <Briefcase className="h-3.5 w-3.5 text-purple-500" />;
    if (participantType === 'professional') return <Users className="h-3.5 w-3.5 text-green-500" />;
    if (participantType === 'admin') return <ShieldAlert className="h-3.5 w-3.5 text-red-500" />;
    return <Users className="h-3.5 w-3.5" />; 
  };


  if (authLoading) { 
    return <div className="flex h-screen items-center justify-center bg-muted/40"><p>Loading Investor Messages...</p></div>;
  }
  if (!investorUser || investorUser.type !== 'investor') {
     return <div className="flex h-screen items-center justify-center bg-muted/40"><p>Access Denied. Please log in as an Investor.</p></div>;
  }

  return (
    <div className="container mx-auto py-8 px-4 md:px-6 h-[calc(100vh-6rem)] flex flex-col">
        <div className="flex items-center justify-between mb-6">
            <div>
                 <h1 className="text-3xl font-bold tracking-tight flex items-center">
                    <MessageSquare className="mr-3 h-8 w-8 text-primary" /> Messages
                </h1>
                <p className="text-muted-foreground">Chat with Fund Raisers / Startups and Corporations.</p>
            </div>
             <Button variant="outline" asChild>
                <Link href="/investor/dashboard"><ArrowLeft className="mr-2 h-4 w-4"/>Back to Investor Home</Link>
            </Button>
        </div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 min-h-0">
        <Card className="md:col-span-1 lg:col-span-1 flex flex-col shadow-lg rounded-xl">
          <CardHeader className="p-4 border-b">
            <CardTitle className="text-lg">My Chats ({filteredConversations.length})</CardTitle>
            <div className="relative mt-2">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                type="search"
                placeholder="Search chats..."
                className="pl-8 w-full h-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-1 min-h-0">
            <ScrollArea className="h-full p-2 custom-scrollbar">
              {filteredConversations.length > 0 ? filteredConversations.map((convo) => (
                <ConversationListItem
                  key={convo.id}
                  conversation={convo}
                  isSelected={activeConversationId === convo.id}
                  onSelect={handleSelectConversation}
                />
              )) : (
                <p className="p-4 text-sm text-muted-foreground text-center">No conversations found.</p>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 lg:col-span-3 flex flex-col shadow-lg rounded-xl">
          {detailedActivePartner && activeConversationDetails ? (
            <>
              <CardHeader className="p-4 border-b flex flex-row items-center gap-3">
                <Avatar className="h-10 w-10 border">
                  <AvatarImage src={`https://picsum.photos/seed/${detailedActivePartner.avatarSeed || detailedActivePartner.uid}/40/40`} alt={detailedActivePartner.name || 'Partner'} data-ai-hint={detailedActivePartner.type === 'company' ? 'company logo' : 'person sales professional'}/>
                  <AvatarFallback>{(detailedActivePartner.name || "P").substring(0, 1)}</AvatarFallback>
                </Avatar>
                <div>
                    <Link href={`/profile/${detailedActivePartner.uid}`} className="hover:underline text-primary">
                        <CardTitle className="text-lg">{detailedActivePartner.name || (detailedActivePartner.type === 'professional' ? "Startup" : "Partner")}</CardTitle>
                    </Link>
                    <div className="flex items-center text-xs">
                        {getParticipantTypeIcon(detailedActivePartner.type)}
                        <span className={cn(
                            "font-medium",
                            detailedActivePartner.type === 'professional' ? "text-green-600" :
                            detailedActivePartner.type === 'company' ? "text-purple-600" :
                            "text-blue-600"
                        )}>
                           {detailedActivePartner.type === 'professional' ? 'Startup / Fund Raiser' :
                            detailedActivePartner.type === 'company' ? 'Corporation Contact' :
                            'User'}
                        </span>
                    </div>
                </div>
              </CardHeader>
              <CardContent className="p-0 flex-1 min-h-0">
                <ScrollArea className="h-full p-4 space-y-4 custom-scrollbar">
                  {isMessagingBlocked && (
                      <div className="text-center py-4">
                          <ShieldAlert className="h-8 w-8 text-destructive mx-auto mb-2" />
                          <p className="text-sm font-medium text-destructive">
                              Messaging with this user is currently blocked.
                          </p>
                      </div>
                  )}
                  {currentMessages.map((msg) => (
                    <MessageBubble key={msg.docId || msg.id?.toString()} message={msg} currentUserId={investorUser!.uid} investorAvatarSeed={investorUser!.avatarSeed || investorUser!.uid.substring(0,10)} />
                  ))}
                  <div ref={messagesEndRef} />
                </ScrollArea>
              </CardContent>
              <CardFooter className="p-4 border-t">
                <div className="flex w-full items-center gap-2">
                  <Textarea
                    placeholder={isMessagingBlocked ? "Messaging blocked" : "Type your message..."}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey && !isMessagingBlocked) {
                            e.preventDefault();
                            handleSendMessage();
                        }
                    }}
                    className="min-h-[60px] max-h-[120px] resize-none flex-1 rounded-lg"
                    disabled={isMessagingBlocked}
                  />
                  <Button onClick={handleSendMessage} disabled={!newMessage.trim() || isMessagingBlocked} className="h-full bg-primary hover:bg-primary/90">
                    <Send className="h-5 w-5" />
                    <span className="sr-only">Send</span>
                  </Button>
                </div>
              </CardFooter>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-muted-foreground">
              <MessageSquare className="h-20 w-20 mb-4 text-primary/30" />
              <p className="text-lg font-medium">Select a conversation to start messaging.</p>
              <p className="text-sm">Choose a Startup or Corporation from the list on the left.</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

interface ConversationListItemProps {
  conversation: Conversation;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

function ConversationListItem({ conversation, isSelected, onSelect }: ConversationListItemProps) {
    const partnerType = conversation.partner.type;
  return (
    <button
      onClick={() => onSelect(conversation.id)}
      className={cn(
        "w-full flex items-center gap-3 p-3 rounded-lg text-left hover:bg-muted transition-colors",
        isSelected && "bg-muted"
      )}
    >
      <Avatar className="h-10 w-10 border">
        <AvatarImage src={`https://picsum.photos/seed/${conversation.partner.avatarSeed}/40/40`} alt={conversation.partner.name || ""} data-ai-hint="person avatar"/>
        <AvatarFallback>{(conversation.partner.name || "P").substring(0, 1)}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center">
            <Link href={`/profile/${conversation.partner.uid}`} className="font-semibold text-sm truncate hover:underline" onClick={(e) => e.stopPropagation()}>
                {conversation.partner.name}
            </Link>
            <span className="text-xs text-muted-foreground">
                {conversation.lastMessageTimestamp.getTime() === new Date(0).getTime() ? "No messages" : formatDistanceToNowStrict(conversation.lastMessageTimestamp, { addSuffix: true })}
            </span>
        </div>
        <div className="flex justify-between items-start mt-0.5">
            <p className="text-xs text-muted-foreground truncate mr-2">{conversation.lastMessageSnippet}</p>
            {conversation.unreadCount > 0 && (
                 <Badge className="bg-accent text-accent-foreground h-5 px-1.5 text-xs font-semibold shrink-0">{conversation.unreadCount}</Badge>
            )}
        </div>
         <div className="flex items-center text-xs mt-1">
            {partnerType === 'investor' ? <Landmark className="h-3 w-3 mr-1 text-blue-500" /> :
             partnerType === 'company' ? <Briefcase className="h-3 w-3 mr-1 text-purple-500" /> :
             <Users className="h-3 w-3 mr-1 text-green-500" />
            }
            <span className={cn(
                "font-normal text-xs",
                partnerType === 'investor' ? "text-blue-600" :
                partnerType === 'company' ? "text-purple-600" :
                "text-green-600"
            )}>
                {partnerType === 'investor' ? 'Angel Investor' :
                 partnerType === 'company' ? 'Corporation' :
                 'Startup'}
            </span>
            {conversation.isBlockedByCurrentUser && (
                 <Badge variant="destructive" className="ml-2 text-xs py-0.5 px-1.5"><ShieldAlert className="h-3 w-3 mr-1"/>You Blocked</Badge>
            )}
        </div>
      </div>
    </button>
  );
}

interface MessageBubbleProps {
  message: DirectMessage;
  currentUserId: string;
  investorAvatarSeed: string; 
}

function MessageBubble({ message, currentUserId, investorAvatarSeed }: MessageBubbleProps) {
  const isOwnMessage = message.senderId === currentUserId;
  
  let senderAvatarActualSeed = message.senderAvatarSeed || message.senderId.substring(0,10); 
  if (isOwnMessage && investorAvatarSeed) {
    senderAvatarActualSeed = investorAvatarSeed;
  }
  const avatarHint = isOwnMessage ? "profile person investor" : "person avatar small";


  return (
    <div className={cn("flex items-end gap-2", isOwnMessage ? "justify-end" : "justify-start")}>
      {!isOwnMessage && (
        <Avatar className="h-8 w-8 border">
          <AvatarImage src={`https://picsum.photos/seed/${senderAvatarActualSeed}/32/32`} alt={message.senderName} data-ai-hint={avatarHint}/>
          <AvatarFallback>{message.senderName.substring(0, 1)}</AvatarFallback>
        </Avatar>
      )}
      <div
        className={cn(
          "max-w-[70%] rounded-lg p-3 text-sm shadow",
          isOwnMessage ? "bg-primary text-primary-foreground rounded-br-none" : "bg-card text-card-foreground rounded-bl-none border"
        )}
      >
        {!isOwnMessage && (
            <Link href={`/profile/${message.senderId}`} className="text-xs font-semibold mb-0.5 hover:underline text-primary">
                {message.senderName}
            </Link>
        )}
        <p className="whitespace-pre-wrap">{message.body}</p>
        <p className={cn("text-xs mt-1", isOwnMessage ? "text-primary-foreground/70 text-right" : "text-muted-foreground text-right")}>
            {message.timestamp instanceof Date ? format(message.timestamp, "p") : "Sending..."}
        </p>
      </div>
      {isOwnMessage && (
        <Avatar className="h-8 w-8 border">
           <AvatarImage src={`https://picsum.photos/seed/${senderAvatarActualSeed}/32/32`} alt={message.senderName} data-ai-hint={avatarHint}/>
           <AvatarFallback>{message.senderName.substring(0,1)}</AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}
