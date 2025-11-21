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
import { collection, addDoc, query, where, onSnapshot, orderBy, serverTimestamp, doc, updateDoc, Timestamp, writeBatch, getDocs, FieldValue } from 'firebase/firestore';
import { useToast } from "@/hooks/use-toast";
import type { RegisteredUserEntry, AuthPageUserType } from '@/app/auth/components/auth-shared-types';
import type { DirectMessage } from '@/app/offers/conversations/page'; 

interface Partner {
  id: string; 
  name: string;
  avatarSeed: string;
  type: 'investor' | 'sales_partner' | 'corporation';
}

interface Conversation {
  id: string; 
  participants: Partner[];
  lastMessageSnippet: string;
  lastMessageTimestamp: Date; 
  unreadCount: number;
}

const generateConversationId = (uid1: string, uid2: string): string => {
  return [uid1, uid2].sort().join('_CONVO_');
};

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


export default function CorporationMessagesPage() {
  const { currentUser: corporationUser, loading: authLoading } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [allMessages, setAllMessages] = useState<DirectMessage[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!corporationUser || !corporationUser.uid || !db || authLoading || corporationUser.type !== 'company') {
      setAllMessages([]); 
      setConversations([]); 
      return;
    }

    console.log("[CorpMessagesPage] Subscribing to messages for corporation UID:", corporationUser.uid);

    const messagesRef = collection(db, "directMessages");
    const q = query(messagesRef, 
      where("participantIds", "array-contains", corporationUser.uid),
      orderBy("timestamp", "desc")
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetchedMessages: DirectMessage[] = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if ( (data.senderId === corporationUser.uid && (data.type === 'corporation_to_salespro' || data.type === 'corporation_to_investor')) ||
             (data.receiverId === corporationUser.uid && (data.type === 'salespro_to_corporation' || data.type === 'investor_to_corporation')) ) {
            fetchedMessages.push({ 
                ...data, 
                docId: docSnap.id, 
                timestamp: (data.timestamp as Timestamp)?.toDate ? (data.timestamp as Timestamp).toDate() : new Date() 
            } as DirectMessage);
        }
      });
      console.log("[CorpMessagesPage] Fetched relevant messages from Firestore:", fetchedMessages.length);
      setAllMessages(fetchedMessages);
      processMessagesIntoConversations(fetchedMessages, corporationUser.uid);
    }, (error) => {
      console.error("[CorpMessagesPage] Error fetching corporation messages from Firestore: ", error);
      toast({
        title: "Failed to Fetch Messages",
        description: "Could not load your conversations. Please try again.",
        variant: "destructive",
      });
    });

    return () => {
      console.log("[CorpMessagesPage] Unsubscribing from Firestore messages.");
      unsubscribe();
    };
  }, [corporationUser, authLoading, toast]);


  const processMessagesIntoConversations = (messages: DirectMessage[], currentUserId: string) => {
    const conversationMap = new Map<string, Conversation>();
    const sortedMessages = [...messages].sort((a, b) => getTimeFromTimestamp(a.timestamp) - getTimeFromTimestamp(b.timestamp));

    sortedMessages.forEach(msg => {
      const conversationId = msg.conversationId || generateConversationId(msg.senderId, msg.receiverId);
      
      let conversation = conversationMap.get(conversationId);

      if (!conversation) {
        const participants: Partner[] = [];
        const participantIds = new Set<string>();

        const addParticipant = (id: string, name: string, avatarSeed: string, type: Partner['type']) => {
            if (!participantIds.has(id)) {
                participants.push({ id, name, avatarSeed, type });
                participantIds.add(id);
            }
        };

        const senderType = msg.senderId === currentUserId ? 'corporation' : (msg.type === 'investor_to_corporation' ? 'investor' : 'sales_partner');
        const receiverType = msg.receiverId === currentUserId ? 'corporation' : (msg.type === 'corporation_to_investor' ? 'investor' : 'sales_partner');

        addParticipant(msg.senderId, msg.senderName, msg.senderAvatarSeed || msg.senderId.substring(0, 10), senderType);
        addParticipant(msg.receiverId, msg.receiverName, msg.receiverAvatarSeed || msg.receiverId.substring(0, 10), receiverType);

        conversation = {
          id: conversationId,
          participants: participants,
          lastMessageSnippet: msg.body.substring(0, 30) + (msg.body.length > 30 ? "..." : ""),
          lastMessageTimestamp: msg.timestamp as Date,
          unreadCount: 0,
        };
      } else {
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
    if (!activeConversationId || !corporationUser) return [];
    return allMessages
      .filter(msg => msg.conversationId === activeConversationId)
      .sort((a,b) => getTimeFromTimestamp(a.timestamp) - getTimeFromTimestamp(b.timestamp));
  }, [activeConversationId, allMessages, corporationUser]);

  useEffect(() => {
    if (activeConversationId && corporationUser && db && allMessages.length > 0) {
      const messagesToUpdate = allMessages.filter(msg => 
        msg.conversationId === activeConversationId && 
        msg.receiverId === corporationUser.uid && 
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
              console.error(`[CorpMessagesPage] Error marking message ${msg.docId} as read:`, error);
            }
          }
        });
      }
    }
  }, [activeConversationId, corporationUser, allMessages, db]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentMessages]);

  const handleSelectConversation = (conversationId: string) => {
    setActiveConversationId(conversationId);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !activeConversationId || !corporationUser) return;
    const activeThread = conversations.find(t => t.id === activeConversationId);
    if (!activeThread || activeThread.participants.length < 2) {
        toast({ title: "Error", description: "Cannot identify recipient.", variant: "destructive"});
        return;
    }

    const recipient = activeThread.participants.find(p => p.id !== corporationUser.uid);
    if (!recipient) {
        toast({ title: "Error", description: "Cannot find a recipient.", variant: "destructive"});
        return;
    }

    let replyType: DirectMessage['type'] = 'corporation_to_salespro'; // Default fallback
    if (recipient.type === 'investor') replyType = 'corporation_to_investor';
    else if (recipient.type === 'sales_partner') replyType = 'corporation_to_salespro';

    const newMsgData: Omit<DirectMessage, 'docId' | 'id'> = {
      senderId: corporationUser.uid, 
      senderName: corporationUser.corporationName || corporationUser.name || "Corporation",
      senderAvatarSeed: corporationUser.avatarSeed,
      receiverId: recipient.id, 
      receiverName: recipient.name,
      receiverAvatarSeed: recipient.avatarSeed,
      subject: `Re: Conversation with ${recipient.name}`, 
      body: newMessage,
      timestamp: serverTimestamp(),
      isReadByReceiver: false, 
      type: replyType,
      conversationId: activeConversationId,
      participantIds: [corporationUser.uid, recipient.id].sort(),
      attachmentName: null,
    };
    
    try {
        await addDoc(collection(db, "directMessages"), newMsgData as DirectMessage);
        setNewMessage("");
        toast({ title: "Message Sent!", description: "Your message has been sent successfully."});
    } catch (error) {
        console.error("Error sending message to Firestore:", error);
        toast({ title: "Message Failed", variant: "destructive"});
    }
  };

  const activeConversationDetails = useMemo(() => {
    return conversations.find(c => c.id === activeConversationId);
  }, [conversations, activeConversationId]);
  
  const filteredConversations = useMemo(() => {
    return conversations.filter(thread => 
        thread.participants.some(p => p.id !== corporationUser?.uid && p.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        thread.lastMessageSnippet.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [conversations, searchTerm, corporationUser]);
  
  const getParticipantTypeIcon = (participantType?: Partner['type']): React.ReactNode => {
    if (participantType === 'investor') return <Landmark className="h-3.5 w-3.5 text-blue-500" />;
    if (participantType === 'corporation') return <Briefcase className="h-3.5 w-3.5 text-purple-500" />;
    if (participantType === 'sales_partner') return <Users className="h-3.5 w-3.5 text-green-500" />;
    return <Users className="h-3.5 w-3.5" />; 
  };


  if (authLoading) {
    return <div className="flex h-screen items-center justify-center bg-muted/40"><p>Loading Messages...</p></div>;
  }
  if (!corporationUser || corporationUser.type !== 'company') {
      return <div className="container mx-auto py-8 px-4 md:px-6 text-center">Access Denied. Corporation privileges required.</div>;
  }


  return (
    <div className="container mx-auto py-8 px-4 md:px-6 h-[calc(100vh-6rem)] flex flex-col">
        <div className="mb-6">
            <h1 className="text-3xl font-bold tracking-tight flex items-center">
                <MessageSquare className="mr-3 h-8 w-8 text-primary" /> Messages
            </h1>
            <p className="text-muted-foreground">Chat with Sales Professionals and Investors.</p>
        </div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 min-h-0">
        <Card className="md:col-span-1 lg:col-span-1 flex flex-col shadow-lg rounded-xl">
          <CardHeader className="p-4 border-b">
            <CardTitle className="text-lg">My Chats ({filteredConversations.length})</CardTitle>
            <div className="relative mt-2">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                type="search"
                placeholder="Search by name or message..."
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
                  currentUserId={corporationUser!.uid}
                  getParticipantTypeIcon={getParticipantTypeIcon}
                />
              )) : (
                <p className="p-4 text-sm text-muted-foreground text-center">No conversations found.</p>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 lg:col-span-3 flex flex-col shadow-lg rounded-xl">
          {activeConversationDetails ? (
            <>
              <CardHeader className="p-4 border-b flex flex-row items-center gap-3">
                <Avatar className="h-10 w-10 border">
                    <AvatarImage src={`https://picsum.photos/seed/${activeConversationDetails.participants.find(p => p.id !== corporationUser!.uid)?.avatarSeed}/40/40`} alt={activeConversationDetails.participants.find(p => p.id !== corporationUser!.uid)?.name || 'Partner'} data-ai-hint="person avatar"/>
                    <AvatarFallback>{activeConversationDetails.participants.find(p => p.id !== corporationUser!.uid)?.name.substring(0,1) || 'P'}</AvatarFallback>
                </Avatar>
                 <div>
                    <CardTitle className="text-lg">{activeConversationDetails.participants.find(p => p.id !== corporationUser!.uid)?.name || 'Partner'}</CardTitle>
                 </div>
              </CardHeader>
              <CardContent className="p-0 flex-1 min-h-0">
                <ScrollArea className="h-full p-4 space-y-4 custom-scrollbar">
                  {currentMessages.map((msg) => (
                    <MessageBubble key={msg.docId || msg.id?.toString()} message={msg} currentUserId={corporationUser!.uid} corporationAvatarSeed={corporationUser!.avatarSeed || corporationUser!.uid.substring(0,10)} />
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
  currentUserId: string;
  getParticipantTypeIcon: (participantType?: Partner['type']) => React.ReactNode;
}

function ConversationListItem({ conversation, isSelected, onSelect, currentUserId, getParticipantTypeIcon }: ConversationListItemProps) {
  const partner = conversation.participants.find(p => p.id !== currentUserId);
  if (!partner) return null;

  return (
    <div className={cn("rounded-lg hover:bg-muted", isSelected && "bg-muted")}>
        <button
        onClick={() => onSelect(conversation.id)}
        className={cn( "w-full flex items-center gap-3 p-3 text-left transition-colors" )}
        >
        <Avatar className="h-9 w-9 border-2 border-background">
            <AvatarImage src={`https://picsum.photos/seed/${partner.avatarSeed}/36/36`} alt={partner.name} data-ai-hint="person avatar small"/>
            <AvatarFallback>{partner.name.substring(0,1)}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
            <div className="flex justify-between items-center">
                <h3 className="font-semibold text-sm truncate" title={partner.name}>{partner.name}</h3>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDistanceToNowStrict(conversation.lastMessageTimestamp, { addSuffix: true })}
                </span>
            </div>
            <p className="text-xs text-muted-foreground truncate">{conversation.lastMessageSnippet}</p>
             <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Badge variant="secondary" className="text-xs py-0.5 px-1.5">
                   {getParticipantTypeIcon(partner.type)} {partner.type === 'sales_partner' ? 'Sales Pro' : (partner.type.charAt(0).toUpperCase() + partner.type.slice(1))}
                </Badge>
            </div>
        </div>
        </button>
    </div>
  );
}

interface MessageBubbleProps {
  message: DirectMessage;
  currentUserId: string; 
  corporationAvatarSeed: string;
}

function MessageBubble({ message, currentUserId, corporationAvatarSeed }: MessageBubbleProps) {
  const isOwnMessage = message.senderId === currentUserId; 
  
  let senderAvatarActualSeed = message.senderAvatarSeed || message.senderId.substring(0,10); 
  if (isOwnMessage && corporationAvatarSeed) {
    senderAvatarActualSeed = corporationAvatarSeed;
  }

  return (
    <div className={cn("flex items-end gap-2", isOwnMessage ? "justify-end" : "justify-start")}>
      {!isOwnMessage && (
        <Avatar className="h-8 w-8 border">
          <AvatarImage src={`https://picsum.photos/seed/${senderAvatarActualSeed}/32/32`} alt={message.senderName} data-ai-hint="person avatar small"/>
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
            <Link href={`/profile/${message.senderId}`} target="_blank" className="hover:underline text-primary font-semibold text-xs mb-0.5 block">
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
           <AvatarImage src={`https://picsum.photos/seed/${senderAvatarActualSeed}/32/32`} alt={message.senderName} data-ai-hint="company logo small"/>
           <AvatarFallback>{message.senderName.substring(0,1)}</AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}

