
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, User, Mail, Briefcase, BarChart3, CalendarDays, TrendingUp, Clock, FileText, Phone, MessageSquare as MessageSquareIcon, UserX, UserCheck as UserCheckLucide, ShieldQuestion, AlertTriangle, DollarSign, ShieldAlert, Info, Handshake } from 'lucide-react'; 
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { format, isFuture } from 'date-fns';
import { CountdownTimer } from '@/components/common/countdown-timer';
import { db, auth } from '@/lib/firebaseConfig'; 
import { doc, getDoc, Timestamp, updateDoc as firestoreUpdateDoc, serverTimestamp as firestoreServerTimestamp, addDoc, collection } from "firebase/firestore"; 
import type { RegisteredUserEntry } from '@/app/auth/components/auth-shared-types';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import type { DirectMessage } from '@/app/offers/conversations/page';
import { Alert, AlertDescription as ShadAlertDescription, AlertTitle as ShadAlertTitle } from "@/components/ui/alert";


interface UserProfileData extends RegisteredUserEntry {
  // UserProfileData can be the same as RegisteredUserEntry if all fields are sourced from Firestore
}

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const userId = decodeURIComponent(params.salesProId as string); 
  const { toast } = useToast();
  const { currentUser: authUser, loading: authLoading, setCurrentAppUser } = useAuth();
  
  const [userProfile, setUserProfile] = useState<UserProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  const [isBlockedByCurrentUser, setIsBlockedByCurrentUser] = useState(false);
  const [isMessagingBlockedOverall, setIsMessagingBlockedOverall] = useState(false);

  const [isMessageDialogOpen, setIsMessageDialogOpen] = useState(false);
  const [messageSubject, setMessageSubject] = useState("");
  const [messageBody, setMessageBody] = useState("");


  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && userId && db) {
      setIsLoading(true);
      const fetchUserProfile = async () => {
        try {
          const userDocRef = doc(db, "users", userId); 
          const docSnap = await getDoc(userDocRef);

          if (docSnap.exists()) {
            const data = docSnap.data() as RegisteredUserEntry;
            
            const processTimestamp = (timestampField: any): string | undefined => {
              if (!timestampField) return undefined;
              if (timestampField instanceof Timestamp) return timestampField.toDate().toISOString();
              if (typeof timestampField === 'string') return new Date(timestampField).toISOString();
              if (timestampField instanceof Date) return timestampField.toISOString();
              return undefined;
            };
            
            const fetchedProfileData = {
              ...data,
              uid: docSnap.id,
              createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt as string | Date),
              subscriptionExpiryDate: processTimestamp(data.subscriptionExpiryDate),
              subscriptionPaymentSubmittedAt: processTimestamp(data.subscriptionPaymentSubmittedAt),
              previousSubscriptionDetails: data.previousSubscriptionDetails
                ? {
                    ...data.previousSubscriptionDetails,
                    expiryDate: processTimestamp(data.previousSubscriptionDetails.expiryDate)!,
                  }
                : undefined,
            } as UserProfileData;
            setUserProfile(fetchedProfileData);

            if (authUser && fetchedProfileData.uid) {
                setIsBlockedByCurrentUser(authUser.blockedUsers?.includes(fetchedProfileData.uid) || false);
                setIsMessagingBlockedOverall(
                    (authUser.blockedUsers?.includes(fetchedProfileData.uid)) || (fetchedProfileData.blockedUsers?.includes(authUser.uid)) || false
                );
            }

          } else {
            console.log("No such user document in Firestore!");
            setUserProfile(null);
          }
        } catch (e) {
          console.error("Error fetching user profile from Firestore:", e);
          setUserProfile(null);
        } finally {
          setIsLoading(false);
        }
      };
      fetchUserProfile();
    } else if (mounted && !userId) {
        setIsLoading(false);
        setUserProfile(null);
    }
  }, [mounted, userId, authUser]);

  const handleBlockUnblockUser = async () => {
    if (!authUser || !authUser.uid || !userProfile || !userProfile.uid || !db) {
      toast({ title: "Error", description: "Cannot perform action. User session or profile data missing.", variant: "destructive" });
      return;
    }

    const currentUserDocRef = doc(db, "users", authUser.uid);
    let updatedBlockedUsers: string[];
    let toastMessage = "";

    if (isBlockedByCurrentUser) { // Action is to Unblock
      updatedBlockedUsers = (authUser.blockedUsers || []).filter(id => id !== userProfile.uid);
      toastMessage = `${userProfile.name || 'User'} has been unblocked.`;
    } else { // Action is to Block
      updatedBlockedUsers = [...(authUser.blockedUsers || []), userProfile.uid];
      toastMessage = `${userProfile.name || 'User'} has been blocked.`;
    }

    try {
      await firestoreUpdateDoc(currentUserDocRef, {
        blockedUsers: updatedBlockedUsers,
        updatedAt: firestoreServerTimestamp()
      });
      
      const updatedAuthContextUser = { ...authUser, blockedUsers: updatedBlockedUsers } as RegisteredUserEntry;
      setCurrentAppUser(updatedAuthContextUser, auth.currentUser); 

      setIsBlockedByCurrentUser(!isBlockedByCurrentUser);
      setIsMessagingBlockedOverall(updatedBlockedUsers.includes(userProfile.uid) || (userProfile.blockedUsers?.includes(authUser.uid)) || false);
      toast({ title: "Success", description: toastMessage });
    } catch (error) {
      console.error("Error updating block status:", error);
      toast({ title: "Error", description: "Failed to update block status.", variant: "destructive" });
    }
  };
  
  const handleOpenMessageDialog = () => {
      if (!userProfile || !authUser) return;
      if (isMessagingBlockedOverall) {
          toast({ title: "Messaging Blocked", description: "Cannot send message as communication is blocked.", variant: "destructive" });
          return;
      }
      setMessageSubject(`Inquiry from ${authUser.name || "LISTED User"}`);
      setMessageBody("");
      setIsMessageDialogOpen(true);
  };

  const handleSendMessageToProfileUser = async () => {
      if (!messageSubject.trim() || !messageBody.trim() || !userProfile || !userProfile.uid || !currentLoggedInUser || !currentLoggedInUser.uid || !db) {
        toast({ title: "Missing Information", description: "Cannot send message.", variant: "destructive" }); return;
      }
      if (isMessagingBlockedOverall) {
        toast({ title: "Messaging Blocked", description: "Cannot send message as communication is blocked.", variant: "destructive" }); return;
      }

      let messageType: DirectMessage['type'] = 'salespro_to_salespro'; // Default
      if(currentLoggedInUser.type === 'investor' && userProfile.type === 'professional') messageType = 'investor_to_salespro';
      else if(currentLoggedInUser.type === 'company' && userProfile.type === 'professional') messageType = 'corporation_to_salespro';
      else if(currentLoggedInUser.type === 'professional' && userProfile.type === 'investor') messageType = 'salespro_to_investor';
      else if(currentLoggedInUser.type === 'professional' && userProfile.type === 'company') messageType = 'salespro_to_corporation';
      else if(currentLoggedInUser.type === 'admin' && userProfile.type !== 'admin') messageType = 'corporation_to_salespro'; 
      else if(currentLoggedInUser.type !== 'admin' && userProfile.type === 'admin') messageType = 'salespro_to_corporation'; 
      else if(currentLoggedInUser.type === 'investor' && userProfile.type === 'company') messageType = 'investor_to_corporation';
      else if(currentLoggedInUser.type === 'company' && userProfile.type === 'investor') messageType = 'corporation_to_investor';
        

      const conversationId = [currentLoggedInUser.uid, userProfile.uid].sort().join('_CONVO_');
      const newMessageData = { 
          senderId: currentLoggedInUser.uid,
          senderName: currentLoggedInUser.name || "User",
          senderEmail: currentLoggedInUser.email,
          senderAvatarSeed: currentLoggedInUser.avatarSeed,
          receiverId: userProfile.uid,
          receiverName: userProfile.name || "User",
          receiverAvatarSeed: userProfile.avatarSeed,
          subject: messageSubject,
          body: messageBody,
          attachmentName: null,
          isReadByReceiver: false,
          type: messageType,
          timestamp: firestoreServerTimestamp(),
          conversationId: conversationId,
          participantIds: [currentLoggedInUser.uid, userProfile.uid].sort(),
      };
      
      try {
          await addDoc(collection(db, "directMessages"), newMessageData as DirectMessage);
          toast({ title: "Message Sent!", description: `Your message to ${userProfile.name} has been sent.` });
          setIsMessageDialogOpen(false);
      } catch (error) {
          console.error("Error sending message from profile page:", error);
          toast({ title: "Message Sending Failed", variant: "destructive" });
      }
  };

  const currentLoggedInUser = authUser;

  if (!mounted || isLoading || authLoading) {
    return (
      <div className="container mx-auto py-8 px-4 md:px-6 text-center">
        <p>Loading profile...</p>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="container mx-auto py-8 px-4 md:px-6 text-center">
        <h2 className="text-2xl font-semibold mb-4">User Profile Not Found</h2>
        <p className="text-muted-foreground mb-4">The profile you are looking for does not exist or could not be loaded from the database.</p>
        <Button onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
        </Button>
      </div>
    );
  }

  const expiryDate = userProfile.subscriptionExpiryDate ? (userProfile.subscriptionExpiryDate instanceof Timestamp ? userProfile.subscriptionExpiryDate.toDate() : new Date(userProfile.subscriptionExpiryDate as string | Date)) : null;
  const isActiveMonthlySub = userProfile.subscriptionType === 'monthly' && expiryDate && isFuture(expiryDate);

  const profileAvatarSrc = userProfile.avatarDataUri || `https://picsum.photos/seed/${userProfile.avatarSeed || userProfile.uid}/128/128`;

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <Button variant="outline" onClick={() => router.back()} className="mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back
      </Button>

      <Card className="shadow-xl rounded-xl overflow-hidden">
        <CardHeader className="bg-muted/30 p-6">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <Avatar className="h-24 w-24 border-4 border-primary shadow-lg">
              <AvatarImage src={profileAvatarSrc} alt={userProfile.name || "User"} data-ai-hint="profile person large"/>
              <AvatarFallback className="text-3xl">{(userProfile.name || "U").substring(0, 1)}</AvatarFallback>
            </Avatar>
            <div className="text-center md:text-left">
              <CardTitle className="text-3xl font-bold">{userProfile.name || "User Profile"}</CardTitle>
              <CardDescription className="text-lg text-primary">{userProfile.type === 'professional' ? 'Fundraise / Sales Professional' : userProfile.type.charAt(0).toUpperCase() + userProfile.type.slice(1)}</CardDescription>
              {userProfile.subscriptionType === 'yearly' && userProfile.status === 'active' && (
                <Badge variant="default" className="mt-2 text-xs bg-green-500 hover:bg-green-600 py-1 px-2">Yearly Subscriber</Badge>
              )}
              {isActiveMonthlySub && userProfile.subscriptionExpiryDate && (
                <div className="text-sm text-muted-foreground mt-2 flex items-center justify-center md:justify-start">
                  <Clock className="h-4 w-4 mr-1.5 text-orange-500" />
                  <CountdownTimer 
                    expiryDate={userProfile.subscriptionExpiryDate} 
                    prefix="Monthly plan: " 
                    displayMode="daysOnly"
                    className="text-sm"
                  />
                </div>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <InfoItem icon={<Mail className="h-4 w-4" />} label="Email" value={userProfile.email || 'N/A'} />
            {userProfile.phoneNumber && <InfoItem icon={<Phone className="h-4 w-4" />} label="Phone" value={userProfile.phoneNumber} />}
            <InfoItem icon={<CalendarDays className="h-4 w-4" />} label="Joined" value={userProfile.createdAt ? format(new Date(userProfile.createdAt as Date | string), "dd MMM, yyyy") : "N/A"} />
            {userProfile.yearsExperience !== undefined && <InfoItem icon={<TrendingUp className="h-4 w-4" />} label="Experience" value={`${userProfile.yearsExperience} yrs`} />}
            {userProfile.workingLeads !== undefined && <InfoItem icon={<BarChart3 className="h-4 w-4" />} label="Leads" value={userProfile.workingLeads.toLocaleString()} />}
             {userProfile.type === 'investor' && userProfile.investmentRange && (
              <InfoItem icon={<DollarSign className="h-4 w-4" />} label="Investment Range" value={userProfile.investmentRange} />
            )}
            {userProfile.type === 'company' && userProfile.corporationName && (
                <InfoItem icon={<Briefcase className="h-4 w-4" />} label="Company Name" value={userProfile.corporationName} />
            )}
            </div>

            {(userProfile.profileDescription || (userProfile.type === 'investor' && userProfile.investmentFocus)) && (
              <>
                <Separator />
                <div>
                  <h3 className="text-md font-semibold mb-1 text-foreground flex items-center"><FileText className="mr-2 h-4 w-4"/>About</h3>
                  {userProfile.profileDescription && 
                    <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line bg-muted/20 p-3 rounded-md mb-3">
                      {userProfile.profileDescription}
                    </p>
                  }
                  {userProfile.type === 'investor' && userProfile.investmentFocus &&
                    <div>
                      <p className="font-medium text-xs text-muted-foreground">Investment Focus:</p>
                      <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line bg-muted/20 p-3 rounded-md">
                        {userProfile.investmentFocus}
                      </p>
                    </div>
                  }
                </div>
              </>
            )}

            {!userProfile.profileDescription && !(userProfile.type === 'investor' && userProfile.investmentFocus) && (
             <div>
              <h3 className="text-xl font-semibold mb-3 text-foreground">Profile Summary</h3>
              <p className="text-muted-foreground leading-relaxed">
                {userProfile.name || "This user"} is a {userProfile.type === 'professional' ? 'Fundraise / Sales Professional' : userProfile.type.charAt(0).toUpperCase() + userProfile.type.slice(1)} on the LISTED platform.
                They joined on {userProfile.createdAt ? format(new Date(userProfile.createdAt as string | Date), "MMMM dd, yyyy") : 'N/A'}.
                {userProfile.yearsExperience !== undefined && ` They have ${userProfile.yearsExperience} years of experience.`}
                {userProfile.workingLeads !== undefined && ` Currently managing ${userProfile.workingLeads} active leads.`}
              </p>
            </div>
          )}
          <Separator />
          {currentLoggedInUser && currentLoggedInUser.uid !== userProfile.uid && (
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button onClick={handleOpenMessageDialog} className="flex-1 bg-primary hover:bg-primary/90" disabled={isMessagingBlockedOverall}>
                <MessageSquareIcon className="mr-2 h-4 w-4" /> Message {userProfile.name ? userProfile.name.split(' ')[0] : "User"}
              </Button>
              <Button
                variant="outline"
                onClick={handleBlockUnblockUser}
                className={`flex-1 ${isBlockedByCurrentUser ? 'border-green-500 text-green-600 hover:bg-green-50' : 'border-red-500 text-red-600 hover:bg-red-50'}`}
              >
                {isBlockedByCurrentUser ? <UserCheckLucide className="mr-2 h-4 w-4" /> : <UserX className="mr-2 h-4 w-4" />}
                {isBlockedByCurrentUser ? "Unblock" : "Block"}
              </Button>
            </div>
          )}
          {currentLoggedInUser && currentLoggedInUser.uid !== userProfile.uid && isMessagingBlockedOverall && !isBlockedByCurrentUser && (
            <Alert variant="destructive" className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <ShadAlertTitle>Messaging Blocked by This User</ShadAlertTitle>
              <ShadAlertDescription>
                This user has blocked communication with you. You cannot send them messages.
              </ShadAlertDescription>
            </Alert>
          )}
           {currentLoggedInUser && currentLoggedInUser.uid !== userProfile.uid && isMessagingBlockedOverall && isBlockedByCurrentUser && (
            <Alert variant="destructive" className="mt-4">
              <ShieldQuestion className="h-4 w-4" />
              <ShadAlertTitle>Messaging Blocked by You</ShadAlertTitle>
              <ShadAlertDescription>
                You have blocked this user. Unblock them to send messages.
              </ShadAlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Dialog open={isMessageDialogOpen} onOpenChange={setIsMessageDialogOpen}>
        <DialogContent className="sm:max-w-lg">
            <DialogHeader>
            <DialogTitle>Message {userProfile?.name}</DialogTitle>
            <DialogDescription>
                Compose your message to {userProfile?.name} ({userProfile?.email}).
            </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
            <div className="space-y-1.5">
                <Label htmlFor="dialog_message_subject">Subject</Label>
                <Input id="dialog_message_subject" value={messageSubject} onChange={(e) => setMessageSubject(e.target.value)} placeholder="Message subject"/>
            </div>
            <div className="space-y-1.5">
                <Label htmlFor="dialog_message_body">Message</Label>
                <Textarea id="dialog_message_body" value={messageBody} onChange={(e) => setMessageBody(e.target.value)} className="min-h-[100px]" placeholder="Type your message here..."/>
            </div>
            </div>
            <DialogFooter>
            <Button variant="outline" onClick={() => setIsMessageDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSendMessageToProfileUser} disabled={!messageSubject.trim() || !messageBody.trim() || !currentLoggedInUser || isMessagingBlockedOverall}>
                Send Message
            </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface InfoItemProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}
function InfoItem({ icon, label, value }: InfoItemProps) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <div className="flex items-start gap-2 p-2 bg-muted/30 rounded-md text-sm">
      <div className="flex-shrink-0 text-primary mt-0.5">{icon}</div>
      <div>
        <p className="font-medium text-muted-foreground">{label}</p>
        <p className="text-foreground">{value}</p>
      </div>
    </div>
  );
}
