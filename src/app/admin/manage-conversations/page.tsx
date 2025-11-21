
"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Send, MessageSquare, Users, Briefcase, Landmark, Search, ShieldAlert, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNowStrict } from 'date-fns';
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebaseConfig';
import { collection, addDoc, query, onSnapshot, orderBy, serverTimestamp, doc, updateDoc, Timestamp, deleteDoc, writeBatch, getDocs, where, FieldValue } from 'firebase/firestore';
import type { DirectMessage } from '@/app/offers/conversations/page';
import Link from "next/link";
import type { RegisteredUserEntry } from "@/app/auth/components/auth-shared-types";


interface Participant {
  id: string; 
  name: string;
  avatarSeed?: string;
  type?: 'investor' | 'professional' | 'company' | 'admin';
}

interface ConversationThread {
  id: string; 
  participants: Participant[];
  messages: DirectMessage[];
  lastMessageSnippet: string;
  lastMessageTimestamp: Date;
  isFlaggedByThisAdminSession: boolean; 
  isDeletedByAdmin?: boolean; 
}

const getTimeFromTimestamp = (ts: Date | Timestamp | FieldValue): number => {
    if (ts instanceof Date) {
        return ts.getTime();
    }
    if (ts instanceof Timestamp) {
        return ts.toDate().getTime();
    }
    // For serverTimestamp(), we can't get a time, so return 0 or a future date to sort appropriately
    return Date.now(); 
};

const generateConversationThreadsFromPlatformMessages = (
  allMessages: DirectMessage[],
  ephemeralFlaggedIds: string[], 
  usersMap: Map<string, RegisteredUserEntry>
): ConversationThread[] => {
  const threadsMap = new Map<string, ConversationThread>();
  const sortedMessages = [...allMessages].sort((a, b) => getTimeFromTimestamp(a.timestamp) - getTimeFromTimestamp(b.timestamp));

  for (const msg of sortedMessages) {
    const conversationId = msg.conversationId || [msg.senderId, msg.receiverId].sort().join('_CONVO_');
    
    if (!threadsMap.has(conversationId)) {
      const participants: Participant[] = [];
      const participantIds = new Set<string>();

      const addParticipant = (id: string, name: string, avatarSeed?: string, userType?: RegisteredUserEntry['type']) => {
        if (!participantIds.has(id)) {
            let type: Participant['type'] = 'professional';
            if (id === "admin_user") type = 'admin';
            else if (userType) type = userType;
            
            participants.push({ id, name, avatarSeed: avatarSeed || id.substring(0,10), type });
            participantIds.add(id);
        }
      };

      const senderUser = usersMap.get(msg.senderId);
      const receiverUser = usersMap.get(msg.receiverId);

      addParticipant(msg.senderId, msg.senderName, msg.senderAvatarSeed, senderUser?.type);
      addParticipant(msg.receiverId, msg.receiverName, msg.receiverAvatarSeed, receiverUser?.type);
      
      threadsMap.set(conversationId, {
        id: conversationId,
        participants: participants,
        messages: [],
        lastMessageSnippet: '',
        lastMessageTimestamp: new Date(0), 
        isFlaggedByThisAdminSession: ephemeralFlaggedIds.includes(conversationId),
        isDeletedByAdmin: msg.isDeletedByAdmin || false, 
      });
    }

    const thread = threadsMap.get(conversationId)!;
    thread.messages.push(msg); 
    thread.lastMessageSnippet = msg.body.length > 30 ? msg.body.substring(0, 27) + "..." : msg.body;
    
    if (msg.timestamp instanceof Date) {
        thread.lastMessageTimestamp = msg.timestamp;
    } else if (msg.timestamp instanceof Timestamp) {
        thread.lastMessageTimestamp = msg.timestamp.toDate();
    }

    if (msg.isDeletedByAdmin) thread.isDeletedByAdmin = true;
  }
  
  return Array.from(threadsMap.values())
    .filter(thread => !thread.isDeletedByAdmin) 
    .sort((a, b) => b.lastMessageTimestamp.getTime() - a.lastMessageTimestamp.getTime());
};


export default function AdminManageConversationsPage() {
  const { currentUser: adminUser, loading: authLoading } = useAuth();
  const [allPlatformMessages, setAllPlatformMessages] = useState<DirectMessage[]>([]);
  const [allUsersMap, setAllUsersMap] = useState<Map<string, RegisteredUserEntry>>(new Map());
  const [conversationThreads, setConversationThreads] = useState<ConversationThread[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [adminReply, setAdminReply] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const ADMIN_ID = "admin_user"; 

  const [ephemeralAdminFlaggedIds, setEphemeralAdminFlaggedIds] = useState<string[]>([]);

  useEffect(() => {
    if (!adminUser || !db || authLoading || adminUser.type !== 'admin') {
      return;
    }
    
    // Fetch all users once to create a map for enrichment
    const usersRef = collection(db, "users");
    const unsubUsers = onSnapshot(usersRef, (snapshot) => {
        const usersMap = new Map<string, RegisteredUserEntry>();
        snapshot.forEach(doc => {
            usersMap.set(doc.id, { uid: doc.id, ...doc.data()} as RegisteredUserEntry);
        });
        setAllUsersMap(usersMap);
    });

    const messagesRef = collection(db, "directMessages");
    const q = query(messagesRef, orderBy("timestamp", "desc")); 

    const unsubMessages = onSnapshot(q, (querySnapshot) => {
      const fetchedMessages: DirectMessage[] = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        fetchedMessages.push({ 
            ...data, 
            docId: docSnap.id, 
            timestamp: (data.timestamp as Timestamp)?.toDate ? (data.timestamp as Timestamp).toDate() : new Date() 
        } as DirectMessage);
      });
      setAllPlatformMessages(fetchedMessages);
    });

    return () => { unsubUsers(); unsubMessages(); };
  }, [adminUser, authLoading, toast]);
  
  useEffect(() => {
    if (allPlatformMessages.length > 0 && allUsersMap.size > 0) {
        setConversationThreads(generateConversationThreadsFromPlatformMessages(allPlatformMessages, ephemeralAdminFlaggedIds, allUsersMap));
    }
  }, [allPlatformMessages, allUsersMap, ephemeralAdminFlaggedIds]);


  const currentMessagesForActiveThread = useMemo(() => {
    if (!activeConversationId) return [];
    return allPlatformMessages
      .filter(msg => msg.conversationId === activeConversationId)
      .sort((a,b) => getTimeFromTimestamp(a.timestamp) - getTimeFromTimestamp(b.timestamp));
  }, [activeConversationId, allPlatformMessages]);

  useEffect(() => {
    if (activeConversationId && adminUser && db && allPlatformMessages.length > 0) {
      const messagesToUpdate = allPlatformMessages.filter(msg => 
        msg.conversationId === activeConversationId && 
        msg.receiverId === ADMIN_ID && 
        !msg.isReadByReceiver &&
        msg.docId 
      );

      if (messagesToUpdate.length > 0) {
        const batch = writeBatch(db);
        messagesToUpdate.forEach(msg => {
          if (msg.docId) {
            const messageDocRef = doc(db, "directMessages", msg.docId);
            batch.update(messageDocRef, { isReadByReceiver: true });
          }
        });
        batch.commit().catch(error => {
          console.error(`Error batch marking admin messages as read:`, error);
        });
      }
    }
  }, [activeConversationId, adminUser, allPlatformMessages, db]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentMessagesForActiveThread]);

  const handleSelectConversation = (conversationId: string) => {
    setActiveConversationId(conversationId);
  };

  const handleAdminReply = async () => {
    if (!adminReply.trim() || !activeConversationId || !adminUser) return;
    const activeThread = conversationThreads.find(t => t.id === activeConversationId);
    if (!activeThread || activeThread.participants.length === 0) {
        toast({ title: "Error", description: "Cannot identify recipient.", variant: "destructive"});
        return;
    }

    const recipient = activeThread.participants.find(p => p.id !== ADMIN_ID);
    if (!recipient) {
        toast({ title: "Error", description: "Cannot find a non-admin recipient.", variant: "destructive"});
        return;
    }

    let replyType: DirectMessage['type'] = 'salespro_to_salespro'; // Default fallback
    if (recipient.type === 'investor') replyType = 'investor_to_salespro'; // This is incorrect, should be admin to...
    else if (recipient.type === 'company') replyType = 'corporation_to_salespro'; // Incorrect
    else if (recipient.type === 'professional') replyType = 'salespro_to_salespro'; // Incorrect

    const newAdminMsg: Omit<DirectMessage, 'docId' | 'id'> = {
      senderId: ADMIN_ID, 
      senderName: "LISTED Admin Support",
      senderAvatarSeed: "AdminAvatarListed",
      receiverId: recipient.id, 
      receiverName: recipient.name,
      receiverAvatarSeed: recipient.avatarSeed,
      subject: `Admin Reply: ${activeThread.lastMessageSnippet.substring(0,20)}...`, 
      body: adminReply,
      timestamp: serverTimestamp(),
      isReadByReceiver: false, 
      type: 'corporation_to_salespro', // Simplified admin type
      conversationId: activeConversationId,
      participantIds: [ADMIN_ID, recipient.id].sort(),
      attachmentName: null,
    };
    
    try {
        await addDoc(collection(db, "directMessages"), newAdminMsg);
        setAdminReply("");
        toast({ title: "Admin Reply Sent", description: "Your message has been added."});
    } catch (error) {
        console.error("Error sending admin reply to Firestore:", error);
        toast({ title: "Reply Failed", variant: "destructive"});
    }
  };

  const handleFlagConversation = (conversationId: string) => {
    setEphemeralAdminFlaggedIds(prev => {
      if (prev.includes(conversationId)) {
        toast({ title: "Conversation Unflagged (This Session)" });
        return prev.filter(id => id !== conversationId);
      } else {
        toast({ title: "Conversation Flagged (This Session)" });
        return [...prev, conversationId];
      }
    });
  };
  
  const handleDeleteConversation = async (conversationId: string) => {
    if (!db) return;
    const conversation = conversationThreads.find(c => c.id === conversationId);
    const participantNames = conversation?.participants.map(p => p.name).join(' & ') || 'participants';

    const messagesQuery = query(collection(db, "directMessages"), where("conversationId", "==", conversationId));
    try {
        const batch = writeBatch(db);
        const snapshot = await getDocs(messagesQuery);
        snapshot.forEach(docSnap => { 
            batch.update(docSnap.ref, { isDeletedByAdmin: true });
        });
        await batch.commit();
        
        if (activeConversationId === conversationId) setActiveConversationId(null);
        toast({ title: "Conversation Hidden (Admin View)", description: `Conversation between ${participantNames} marked as deleted.`});
    } catch (error) {
        console.error("Error soft-deleting conversation messages:", error);
        toast({title: "Delete Error", description: "Could not delete conversation messages.", variant: "destructive"})
    }
  }

  const activeConversationDetails = useMemo(() => {
    return conversationThreads.find(c => c.id === activeConversationId);
  }, [conversationThreads, activeConversationId]);
  
  const filteredConversationThreads = useMemo(() => {
    return conversationThreads.filter(thread => 
        thread.participants.some(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        thread.lastMessageSnippet.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [conversationThreads, searchTerm]);
  
  const getParticipantTypeIcon = (participantType?: Participant['type']): React.ReactNode => {
    if (participantType === 'admin') return <ShieldAlert className="h-3.5 w-3.5 text-red-500" />;
    if (participantType === 'investor') return <Landmark className="h-3.5 w-3.5 text-blue-500" />;
    if (participantType === 'company') return <Briefcase className="h-3.5 w-3.5 text-purple-500" />;
    if (participantType === 'professional') return <Users className="h-3.5 w-3.5 text-green-500" />;
    return <Users className="h-3.5 w-3.5" />; 
  };


  if (authLoading) {
    return <div className="flex h-screen items-center justify-center bg-muted/40"><p>Loading Conversations Management...</p></div>;
  }
  if (!adminUser || adminUser.type !== 'admin') {
      return <div className="container mx-auto py-8 px-4 md:px-6 text-center">Access Denied. Admin privileges required.</div>;
  }


  return (
    <div className="container mx-auto py-8 px-4 md:px-6 h-[calc(100vh-6rem)] flex flex-col">
        <div className="mb-6">
            <h1 className="text-3xl font-bold tracking-tight flex items-center">
                <MessageSquare className="mr-3 h-8 w-8 text-primary" /> Manage All Platform Conversations
            </h1>
            <p className="text-muted-foreground">Monitor and intervene in user communications across the platform.</p>
        </div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 min-h-0">
        <Card className="md:col-span-1 lg:col-span-1 flex flex-col shadow-lg rounded-xl">
          <CardHeader className="p-4 border-b">
            <CardTitle className="text-lg">All Threads ({filteredConversationThreads.length})</CardTitle>
            <div className="relative mt-2">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                type="search"
                placeholder="Search by participant, message..."
                className="pl-8 w-full h-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-1 min-h-0">
            <ScrollArea className="h-full p-2 custom-scrollbar">
              {filteredConversationThreads.length > 0 ? filteredConversationThreads.map((thread) => (
                <ConversationListItem
                  key={thread.id}
                  conversationThread={thread}
                  isSelected={activeConversationId === thread.id}
                  onSelect={handleSelectConversation}
                  onFlag={() => handleFlagConversation(thread.id)}
                  onDelete={() => handleDeleteConversation(thread.id)}
                  getParticipantTypeIcon={getParticipantTypeIcon}
                />
              )) : (
                <p className="p-4 text-sm text-muted-foreground text-center">No conversations found on the platform.</p>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 lg:col-span-3 flex flex-col shadow-lg rounded-xl">
          {activeConversationDetails ? (
            <>
              <CardHeader className="p-4 border-b flex flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    {activeConversationDetails.participants.map(p => (
                        <Avatar key={p.id} className="h-8 w-8 border">
                            <AvatarImage src={`https://picsum.photos/seed/${p.avatarSeed}/32/32`} alt={p.name} data-ai-hint="person avatar small"/>
                            <AvatarFallback>{p.name.substring(0,1)}</AvatarFallback>
                        </Avatar>
                    ))}
                     <CardTitle className="text-base">
                       {activeConversationDetails.participants.map(p => 
                          p.id !== ADMIN_ID ? (
                            <Link key={p.id} href={`/profile/${p.id}`} target="_blank" className="hover:underline text-primary mr-1">
                              {p.name}
                            </Link>
                          ) : (
                            <span key={p.id} className="mr-1">{p.name}</span>
                          )
                       ).reduce((prev: React.ReactNode, curr: React.ReactNode) => prev ? <>{prev} & {curr}</> : curr, null as React.ReactNode)}
                    </CardTitle>
                </div>
                {activeConversationDetails.isFlaggedByThisAdminSession && <Badge variant="destructive"><ShieldAlert className="h-4 w-4 mr-1"/>Flagged</Badge>}
              </CardHeader>
              <CardContent className="p-0 flex-1 min-h-0">
                <ScrollArea className="h-full p-4 space-y-4 custom-scrollbar">
                  {currentMessagesForActiveThread.map((msg) => (
                    <MessageBubble key={msg.docId || msg.id?.toString()} message={msg} allParticipants={activeConversationDetails.participants} adminId={ADMIN_ID} />
                  ))}
                  <div ref={messagesEndRef} />
                </ScrollArea>
              </CardContent>
              <CardFooter className="p-4 border-t">
                <div className="flex w-full items-center gap-2">
                  <Textarea
                    placeholder="Type admin reply or note..."
                    value={adminReply}
                    onChange={(e) => setAdminReply(e.target.value)}
                    className="min-h-[60px] max-h-[120px] resize-none flex-1 rounded-lg"
                  />
                  <Button onClick={handleAdminReply} disabled={!adminReply.trim()} className="h-full bg-primary hover:bg-primary/90">
                    <Send className="h-5 w-5" /> <span className="ml-2 hidden sm:inline">Send Reply</span>
                  </Button>
                </div>
              </CardFooter>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-muted-foreground">
              <MessageSquare className="h-20 w-20 mb-4 text-primary/30" />
              <p className="text-lg font-medium">Select a conversation thread to view.</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

interface ConversationListItemProps {
  conversationThread: ConversationThread;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onFlag: () => void;
  onDelete: () => void;
  getParticipantTypeIcon: (participantType?: Participant['type']) => React.ReactNode;
}

function ConversationListItem({ conversationThread, isSelected, onSelect, onFlag, onDelete, getParticipantTypeIcon }: ConversationListItemProps) {
  const participantNames = conversationThread.participants.map(p => p.name).join(' & ');
  return (
    <div className={cn("rounded-lg hover:bg-muted", isSelected && "bg-muted")}>
        <button
        onClick={() => onSelect(conversationThread.id)}
        className={cn( "w-full flex items-center gap-3 p-3 text-left transition-colors" )}
        >
        <div className="flex -space-x-2">
            {conversationThread.participants.slice(0,2).map(p => (
                 <Avatar key={p.id} className="h-9 w-9 border-2 border-background">
                    <AvatarImage src={`https://picsum.photos/seed/${p.avatarSeed}/36/36`} alt={p.name} data-ai-hint="person avatar small"/>
                    <AvatarFallback>{p.name.substring(0,1)}</AvatarFallback>
                </Avatar>
            ))}
        </div>
        <div className="flex-1 min-w-0">
            <div className="flex justify-between items-center">
                <h3 className="font-semibold text-sm truncate" title={participantNames}>{participantNames}</h3>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDistanceToNowStrict(conversationThread.lastMessageTimestamp, { addSuffix: true })}
                </span>
            </div>
            <p className="text-xs text-muted-foreground truncate">{conversationThread.lastMessageSnippet}</p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
                {conversationThread.participants.map(p => (
                    <Badge key={p.id} variant="secondary" className="text-xs py-0.5 px-1.5">
                       {getParticipantTypeIcon(p.type)} {p.name}
                    </Badge>
                ))}
                {conversationThread.isFlaggedByThisAdminSession && <Badge variant="destructive" className="text-xs py-0.5 px-1.5"><ShieldAlert className="h-3 w-3 mr-1"/>Flagged (Session)</Badge>}
            </div>
        </div>
        </button>
        <div className="flex justify-end gap-1 px-2 pb-1.5">
            <Button variant="ghost" size="xs" onClick={onFlag} className="text-xs h-6 px-1.5">
                <ShieldAlert className="h-3.5 w-3.5 mr-1"/> {conversationThread.isFlaggedByThisAdminSession ? "Unflag (Session)" : "Flag (Session)"}
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="xs"  className="text-destructive hover:text-destructive text-xs h-6 px-1.5">
                    <Trash2 className="h-3.5 w-3.5 mr-1"/> Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                  <AlertDialogHeader>
                      <AlertDialogTitle>Delete this conversation?</AlertDialogTitle>
                      <AlertDialogDescription>
                          This will mark all messages in the conversation between "{participantNames}" as deleted for the admin.
                      </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={onDelete} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                          Confirm Delete
                      </AlertDialogAction>
                  </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
        </div>
    </div>
  );
}

interface MessageBubbleProps {
  message: DirectMessage;
  allParticipants: Participant[]; 
  adminId: string; 
}

function MessageBubble({ message, allParticipants, adminId }: MessageBubbleProps) {
  const sender = allParticipants.find(p => p.id === message.senderId) || 
                 (message.senderId === adminId ? { id: adminId, name: 'Admin Support', avatarSeed: 'AdminAvatarListed', type: 'admin' } : 
                 {id: message.senderId, name: message.senderName, avatarSeed: message.senderAvatarSeed || message.senderId.substring(0,10), type: 'professional'});
  const isOwnMessageByAdmin = message.senderId === adminId; 

  return (
    <div className={cn("flex items-end gap-2", isOwnMessageByAdmin ? "justify-end" : "justify-start")}>
      {!isOwnMessageByAdmin && sender && (
        <Avatar className="h-8 w-8 border">
          <AvatarImage src={`https://picsum.photos/seed/${sender.avatarSeed}/32/32`} alt={sender.name} data-ai-hint="person avatar small"/>
          <AvatarFallback>{sender.name.substring(0, 1)}</AvatarFallback>
        </Avatar>
      )}
      <div
        className={cn(
          "max-w-[70%] rounded-lg p-3 text-sm shadow",
          isOwnMessageByAdmin ? "bg-primary text-primary-foreground rounded-br-none" : "bg-card text-card-foreground rounded-bl-none border"
        )}
      >
        {!isOwnMessageByAdmin && sender && sender.id !== adminId ? (
            <Link href={`/profile/${sender.id}`} target="_blank" className="hover:underline text-primary font-semibold text-xs mb-0.5 block">
                {sender.name}
            </Link>
        ) : (
             !isOwnMessageByAdmin && sender && <p className="text-xs font-semibold mb-0.5">{sender.name}</p>
        )}
        <p className="whitespace-pre-wrap">{message.body}</p>
        <p className={cn("text-xs mt-1", isOwnMessageByAdmin ? "text-primary-foreground/70 text-right" : "text-muted-foreground text-right")}>
            {message.timestamp instanceof Date ? format(message.timestamp, "p") : "Sending..."}
        </p>
      </div>
      {isOwnMessageByAdmin && sender && (
        <Avatar className="h-8 w-8 border">
           <AvatarImage src={`https://picsum.photos/seed/${sender.avatarSeed}/32/32`} alt={sender.name} data-ai-hint="admin avatar small"/>
           <AvatarFallback>{sender.name.substring(0,1)}</AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}


    
    
