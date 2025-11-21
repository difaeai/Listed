
"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Send, MessageSquare, Users, Landmark, Search, ArrowLeft, Briefcase, ShieldAlert } from "lucide-react"; 
import { cn } from "@/lib/utils";
import { format, formatDistanceToNowStrict } from 'date-fns';
import Link from "next/link";
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebaseConfig';
import { collection, addDoc, query, where, onSnapshot, orderBy, serverTimestamp, doc, updateDoc, Timestamp, FieldValue } from 'firebase/firestore';
import { useToast } from "@/hooks/use-toast";
import type { RegisteredUserEntry, AuthPageUserType } from '@/app/auth/components/auth-shared-types';

export interface DirectMessage {
  id?: string; 
  docId?: string; 
  timestamp: Timestamp | Date | FieldValue; 
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
  type: 'salespro_to_investor' | 'investor_to_salespro' | 'salespro_to_salespro' | 'corporation_to_salespro' | 'salespro_to_corporation' | 'investor_to_corporation' | 'corporation_to_investor'; 
  conversationId: string; 
  participantIds: string[];
  isDeletedByAdmin?: boolean;
}

interface Partner {
  id: string; 
  name: string;
  avatarSeed: string;
  type: 'investor' | 'sales_partner' | 'corporation';
}

interface Conversation {
  id: string; 
  partner: Partner;
  lastMessageSnippet: string;
  lastMessageTimestamp: Date; 
  unreadCount: number;
}

const generateConversationId = (uid1: string, uid2: string): string => {
  return [uid1, uid2].sort().join('_CONVO_');
};

export default function SalesProfessionalConversationsPage() {
  const { currentUser: salesProUser, loading: authLoading } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [allMessages, setAllMessages] = useState<DirectMessage[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!salesProUser || !salesProUser.uid || !db || authLoading || salesProUser.type !== 'professional') {
      if (!authLoading && !salesProUser) {
        console.log("[ConversationsPage] No salesProUser or DB not ready, or auth still loading.");
      }
      setAllMessages([]); 
      setConversations([]); 
      return;
    }

    console.log("[ConversationsPage] Subscribing to messages for user UID:", salesProUser.uid);

    const messagesRef = collection(db, "directMessages");
    const q = query(messagesRef, 
      where("participantIds", "array-contains", salesProUser.uid),
      orderBy("timestamp", "desc")
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetchedMessages: DirectMessage[] = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        fetchedMessages.push({ 
            ...data, 
            docId: docSnap.id, 
            timestamp: (data.timestamp as Timestamp)?.toDate ? (data.timestamp as Timestamp).toDate() : new Date() 
        } as DirectMessage);
      });
      console.log("[ConversationsPage] Fetched messages from Firestore:", fetchedMessages.length);
      setAllMessages(fetchedMessages);
      processMessagesIntoConversations(fetchedMessages, salesProUser.uid);
    }, (error) => {
      console.error("[ConversationsPage] Error fetching messages from Firestore: ", error);
      toast({
        title: "Failed to Fetch Messages",
        description: "Could not load your conversations. Please try again in a few seconds.",
        variant: "destructive",
      });
    });

    return () => {
      console.log("[ConversationsPage] Unsubscribing from Firestore messages.");
      unsubscribe();
    };
  }, [salesProUser, authLoading, toast]);

  const processMessagesIntoConversations = (messages: DirectMessage[], currentUserId: string) => {
    const conversationMap = new Map<string, Conversation>();
    const sortedMessages = [...messages].sort((a, b) => (a.timestamp as Date).getTime() - (b.timestamp as Date).getTime());

    sortedMessages.forEach(msg => {
      const conversationId = msg.conversationId || generateConversationId(msg.senderId, msg.receiverId);
      let partner: Partner;
      let partnerType: Partner['type'] = 'sales_partner'; // Default

      if (msg.senderId === currentUserId) { // Current user is sender
        if (msg.type === 'salespro_to_investor') partnerType = 'investor';
        else if (msg.type === 'salespro_to_corporation') partnerType = 'corporation';
        
        partner = {
          id: msg.receiverId,
          name: msg.receiverName,
          avatarSeed: msg.receiverAvatarSeed || msg.receiverId.substring(0,10),
          type: partnerType
        };
      } else { // Current user is receiver
        if (msg.type === 'investor_to_salespro') partnerType = 'investor';
        else if (msg.type === 'corporation_to_salespro') partnerType = 'corporation';

        partner = {
          id: msg.senderId,
          name: msg.senderName,
          avatarSeed: msg.senderAvatarSeed || msg.senderId.substring(0,10),
          type: partnerType
        };
      }
            
      let conversation = conversationMap.get(conversationId);
      if (!conversation) {
        conversation = {
          id: conversationId,
          partner: partner,
          lastMessageSnippet: msg.body.substring(0, 30) + (msg.body.length > 30 ? "..." : ""),
          lastMessageTimestamp: msg.timestamp as Date,
          unreadCount: 0,
        };
      } else {
        
        if (conversation.partner.type === 'sales_partner' && partner.type !== 'sales_partner') {
            conversation.partner.type = partner.type;
        }
        conversation.lastMessageSnippet = msg.body.substring(0, 30) + (msg.body.length > 30 ? "..." : "");
        conversation.lastMessageTimestamp = msg.timestamp as Date;
      }

      if (msg.receiverId === currentUserId && !msg.isReadByReceiver) {
        conversation.unreadCount += 1;
      }
      conversationMap.set(conversationId, conversation);
    });
    const newConversations = Array.from(conversationMap.values())
      .sort((a, b) => b.lastMessageTimestamp.getTime() - a.lastMessageTimestamp.getTime()); 
    setConversations(newConversations);
  };

  const currentMessages = useMemo(() => {
    if (!activeConversationId || !salesProUser) return [];
    return allMessages
      .filter(msg => msg.conversationId === activeConversationId)
      .sort((a, b) => (a.timestamp as Date).getTime() - (b.timestamp as Date).getTime());
  }, [activeConversationId, allMessages, salesProUser]);

  useEffect(() => {
    if (activeConversationId && salesProUser && db && allMessages.length > 0) {
      const messagesToUpdate = allMessages.filter(msg => 
        msg.conversationId === activeConversationId && 
        msg.receiverId === salesProUser.uid && 
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
              console.error(`[ConversationsPage] Error marking message ${msg.docId} as read:`, error);
            }
          }
        });
      }
    }
  }, [activeConversationId, salesProUser, allMessages, db]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentMessages]);

  const handleSelectConversation = (conversationId: string) => {
    setActiveConversationId(conversationId);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !activeConversationId || !salesProUser || !db) {
      toast({ title: "Cannot Send", description: "Message is empty or session is invalid.", variant: "destructive" });
      return;
    }

    const activePartnerDetails = conversations.find(c => c.id === activeConversationId)?.partner;
    if (!activePartnerDetails) {
        console.error("[ConversationsPage] Could not find active partner details for conversation:", activeConversationId);
        toast({ title: "Send Error", description: "Recipient not found.", variant: "destructive" });
        return;
    }
    
    let messageType: DirectMessage['type'] = 'salespro_to_salespro'; 
    if (activePartnerDetails.type === 'investor') messageType = 'salespro_to_investor';
    else if (activePartnerDetails.type === 'corporation') messageType = 'salespro_to_corporation';

    const newMsgData: Omit<DirectMessage, 'id' | 'docId'> = {
      senderId: salesProUser.uid,
      senderName: salesProUser.name || "User",
      senderEmail: salesProUser.email, 
      senderAvatarSeed: salesProUser.avatarSeed || salesProUser.uid.substring(0,10),
      receiverId: activePartnerDetails.id, 
      receiverName: activePartnerDetails.name,
      receiverAvatarSeed: activePartnerDetails.avatarSeed,
      subject: `Re: Conversation with ${activePartnerDetails.name}`, 
      body: newMessage,
      timestamp: serverTimestamp(),
      isReadByReceiver: false, 
      type: messageType,
      conversationId: activeConversationId,
      participantIds: [salesProUser.uid, activePartnerDetails.id].sort(),
      attachmentName: null,
    };

    try {
      await addDoc(collection(db, "directMessages"), newMsgData as DirectMessage);
      setNewMessage("");
    } catch (error) {
      console.error("[ConversationsPage] Error sending message to Firestore:", error);
      toast({
        title: "Message Not Sent",
        description: "Could not send your message. Please try again in a few seconds.",
        variant: "destructive",
      });
    }
  };

  const activeConversationDetails = useMemo(() => {
    return conversations.find(c => c.id === activeConversationId);
  }, [conversations, activeConversationId]);
  
  const filteredConversations = useMemo(() => {
    return conversations.filter(convo => 
      convo.partner.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [conversations, searchTerm]);

  if (authLoading) { 
    return <div className="flex h-screen items-center justify-center bg-muted/40"><p>Loading Conversations...</p></div>;
  }
  if (!salesProUser) {
     return <div className="flex h-screen items-center justify-center bg-muted/40"><p>Please log in to view conversations.</p></div>;
  }

  return (
    <div className="container mx-auto py-8 px-4 md:px-6 h-[calc(100vh-6rem)] flex flex-col">
        <div className="flex items-center justify-between mb-6">
            <div>
                 <h1 className="text-3xl font-bold tracking-tight flex items-center">
                    <MessageSquare className="mr-3 h-8 w-8 text-primary" /> Conversation
                </h1>
                <p className="text-muted-foreground">Chat with Angel Investors, Corporations and Startups.</p>
            </div>
             <Button variant="outline" asChild>
                <Link href="/offers"><ArrowLeft className="mr-2 h-4 w-4"/>Back to User Portal</Link>
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
                <p className="p-4 text-sm text-muted-foreground text-center">No conversations found. Start a new chat by messaging an investor or partner.</p>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 lg:col-span-3 flex flex-col shadow-lg rounded-xl">
          {activeConversationDetails ? (
            <>
              <CardHeader className="p-4 border-b flex flex-row items-center gap-3">
                <Avatar className="h-10 w-10 border">
                  <AvatarImage src={`https://picsum.photos/seed/${activeConversationDetails.partner.avatarSeed}/40/40`} alt={activeConversationDetails.partner.name} data-ai-hint="person avatar"/>
                  <AvatarFallback>{activeConversationDetails.partner.name.substring(0, 1)}</AvatarFallback>
                </Avatar>
                <div>
                    {activeConversationDetails.partner.type === 'sales_partner' ? (
                        <Link href={`/offers/sales-partners/${activeConversationDetails.partner.id}`} className="hover:underline text-primary">
                            <CardTitle className="text-lg">{activeConversationDetails.partner.name}</CardTitle>
                        </Link>
                    ) : (
                        <CardTitle className="text-lg">{activeConversationDetails.partner.name}</CardTitle>
                    )}
                    <div className="flex items-center text-xs">
                        {activeConversationDetails.partner.type === 'investor' ? <Landmark className="h-3.5 w-3.5 mr-1 text-blue-500" /> :
                         activeConversationDetails.partner.type === 'corporation' ? <Briefcase className="h-3.5 w-3.5 mr-1 text-purple-500" /> :
                         <Users className="h-3.5 w-3.5 mr-1 text-green-500" />
                        }
                        <span className={cn(
                            "font-medium",
                            activeConversationDetails.partner.type === 'investor' ? "text-blue-600" :
                            activeConversationDetails.partner.type === 'corporation' ? "text-purple-600" :
                            "text-green-600"
                        )}>
                           {activeConversationDetails.partner.type === 'investor' ? 'Angel Investor' :
                            activeConversationDetails.partner.type === 'corporation' ? 'Corporation' :
                            'Startup'}
                        </span>
                    </div>
                </div>
              </CardHeader>
              <CardContent className="p-0 flex-1 min-h-0">
                <ScrollArea className="h-full p-4 space-y-4 custom-scrollbar">
                  {currentMessages.map((msg) => (
                    <MessageBubble key={msg.docId || msg.id?.toString()} message={msg} currentUserId={salesProUser!.uid} salesProAvatarSeed={salesProUser!.avatarSeed || salesProUser!.uid.substring(0,10)} />
                  ))}
                  <div ref={messagesEndRef} />
                </ScrollArea>
              </CardContent>
              <CardFooter className="p-4 border-t">
                <div className="flex w-full items-center gap-2">
                  <Textarea
                    placeholder="Type your message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                        }
                    }}
                    className="min-h-[60px] max-h-[120px] resize-none flex-1 rounded-lg"
                  />
                  <Button onClick={handleSendMessage} disabled={!newMessage.trim()} className="h-full bg-primary hover:bg-primary/90">
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
              <p className="text-sm">Choose an investor, corporation, or startup from the list on the left.</p>
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
  onSelect: (conversationId: string) => void;
}

function ConversationListItem({ conversation, isSelected, onSelect }: ConversationListItemProps) {
  return (
    <button
      onClick={() => onSelect(conversation.id)}
      className={cn(
        "w-full flex items-center gap-3 p-3 rounded-lg text-left hover:bg-muted transition-colors",
        isSelected && "bg-muted"
      )}
    >
      <Avatar className="h-10 w-10 border">
        <AvatarImage src={`https://picsum.photos/seed/${conversation.partner.avatarSeed}/40/40`} alt={conversation.partner.name} data-ai-hint="person avatar"/>
        <AvatarFallback>{conversation.partner.name.substring(0, 1)}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center">
            <h3 className="font-semibold text-sm truncate">{conversation.partner.name}</h3>
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
            {conversation.partner.type === 'investor' ? <Landmark className="h-3 w-3 mr-1 text-blue-500" /> :
             conversation.partner.type === 'corporation' ? <Briefcase className="h-3 w-3 mr-1 text-purple-500" /> :
             <Users className="h-3 w-3 mr-1 text-green-500" />
            }
            <span className={cn(
                "font-normal text-xs",
                conversation.partner.type === 'investor' ? "text-blue-600" :
                conversation.partner.type === 'corporation' ? "text-purple-600" :
                "text-green-600"
            )}>
                {conversation.partner.type === 'investor' ? 'Angel Investor' :
                 conversation.partner.type === 'corporation' ? 'Corporation' :
                 'Startup'}
            </span>
        </div>
      </div>
    </button>
  );
}

interface MessageBubbleProps {
  message: DirectMessage;
  currentUserId: string;
  salesProAvatarSeed: string; 
}

function MessageBubble({ message, currentUserId, salesProAvatarSeed }: MessageBubbleProps) {
  const isOwnMessage = message.senderId === currentUserId;
  
  let senderAvatarActualSeed = message.senderAvatarSeed || message.senderId.substring(0,10); 
  if (isOwnMessage && salesProAvatarSeed) {
    senderAvatarActualSeed = salesProAvatarSeed;
  }
  const avatarHint = isOwnMessage ? "profile person small" : "person avatar small";


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
             <p className="text-xs font-semibold mb-0.5">{message.senderName}</p>
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

    