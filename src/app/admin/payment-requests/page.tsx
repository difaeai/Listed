
"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { DollarSign, CheckCircle, XCircle, Search, Eye, AlertTriangle, Calendar as CalendarIcon, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
import {
  Dialog, // Root component
  DialogContent as UIDialogContent, // Aliased
  DialogHeader as UIDialogHeader,     // Aliased
  DialogTitle as UIDialogTitle,       // Aliased
  DialogDescription as UIDialogDescription, // Aliased
  DialogFooter as UIDialogFooter,     // Aliased
  DialogClose,
} from "@/components/ui/dialog";
import { useToast } from '@/hooks/use-toast';
import type { RegisteredUserEntry, UserStatus } from '@/app/auth/components/auth-shared-types';
import { format } from 'date-fns';
import { db, auth } from '@/lib/firebaseConfig';
import { doc, updateDoc, getDocs, collection, query, where, Timestamp, serverTimestamp, arrayUnion, onSnapshot, deleteField } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { CountdownTimer } from '@/components/common/countdown-timer';
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export default function AdminPaymentRequestsPage() {
  const [paymentRequests, setPaymentRequests] = useState<RegisteredUserEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const [isProofDialogOpen, setIsProofDialogOpen] = useState(false);
  const [currentProofUrl, setCurrentProofUrl] = useState<string | null | undefined>(null);
  const { currentUser: adminUser, loading: adminAuthLoading } = useAuth();

  const [isEditExpiryDialogOpen, setIsEditExpiryDialogOpen] = useState(false);
  const [editingExpiryUser, setEditingExpiryUser] = useState<RegisteredUserEntry | null>(null);
  const [newSelectedExpiryDate, setNewSelectedExpiryDate] = useState<Date | undefined>(new Date());

  useEffect(() => {
    if (adminAuthLoading) return;
    if (!adminUser || adminUser.type !== 'admin' || !db) {
        setIsLoading(false);
        if(!adminAuthLoading) toast({title: "Unauthorized", description: "Admin access required.", variant: "destructive"});
        return;
    }

    setIsLoading(true);
    const usersRef = collection(db, "users");
    const q = query(usersRef, 
      where("type", "==", "professional"), 
      where("status", "==", "payment_proof_submitted")
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const requests: RegisteredUserEntry[] = [];
      querySnapshot.forEach((docSnap) => {
        const user = docSnap.data() as RegisteredUserEntry;
        requests.push({
          ...user,
          uid: docSnap.id, 
          name: user.name || user.email.split('@')[0],
          avatarSeed: user.avatarSeed || user.name?.replace(/[^a-zA-Z0-9]/g, '') || user.email.replace(/[^a-zA-Z0-9]/g, ''),
        });
      });
      setPaymentRequests(requests);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching payment requests with onSnapshot:", error);
      toast({ title: "Error Loading Requests", description: "Could not fetch payment requests.", variant: "destructive" });
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [adminAuthLoading, adminUser, toast]);


  const filteredRequests = useMemo(() => {
    return paymentRequests.filter(req =>
      (req.name && req.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (req.email && req.email.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [paymentRequests, searchTerm]);

  const handleUpdateRequestStatus = async (userId: string, userName: string, action: 'approve' | 'reject') => {
    if (!db) {
        toast({ title: "Database Error", description: "Firestore not available.", variant: "destructive" });
        return;
    }
    const userEntryForAction = paymentRequests.find(req => req.uid === userId);
    if (!userEntryForAction) {
        toast({ title: "User data not found", description: "Cannot process request.", variant: "destructive"});
        return;
    }

    const userDocRef = doc(db, "users", userId);
    let firestoreUpdateData: any = { updatedAt: serverTimestamp() };
    let toastTitle = "";
    let toastDescription = "";

    if (action === 'approve') {
        firestoreUpdateData = {
            ...firestoreUpdateData,
            status: 'active',
            paymentProofDataUri: deleteField(), 
            subscriptionPaymentSubmittedAt: deleteField(),
        };
        toastTitle = "Payment Approved";
        toastDescription = `User ${userName}'s ${userEntryForAction.subscriptionType || 'selected'} subscription is now active. They are now part of the Startup / Fundraiser network.`;
    } else if (action === 'reject') {
        const rejectionNoticeKey = 'payment_rejection_notice_' + userId;
        if (typeof window !== "undefined") {
            localStorage.setItem(rejectionNoticeKey, 'true');
        }
        
        firestoreUpdateData = {
            ...firestoreUpdateData,
            status: 'pending_payment_verification', 
            paymentProofDataUri: deleteField(),
            subscriptionPaymentSubmittedAt: deleteField(),
        };
        toastTitle = "Payment Rejected";
        toastDescription = `User ${userName}'s payment was rejected. They have been notified to re-submit proof.`;
    }

    try {
        await updateDoc(userDocRef, firestoreUpdateData);
        
        // If approved and a referral code was used, credit the ambassador
        if (action === 'approve' && userEntryForAction.referralCodeUsed && userEntryForAction.email) {
            const ambassadorsRef = collection(db, "ambassadors");
            const q = query(ambassadorsRef, where("referralCode", "==", userEntryForAction.referralCodeUsed.toUpperCase()));
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
                const ambassadorDocRef = querySnapshot.docs[0].ref;
                await updateDoc(ambassadorDocRef, {
                    referredUsers: arrayUnion({
                        email: userEntryForAction.email,
                        referredAt: Timestamp.now()
                    })
                });
                console.log(`Referral for ${userEntryForAction.email} credited to ambassador.`);
                toast({ title: "Referral Credited!", description: `Ambassador with code ${userEntryForAction.referralCodeUsed} has been credited.` });
            } else {
                console.warn(`Could not find ambassador for referral code: ${userEntryForAction.referralCodeUsed}`);
                toast({ title: "Referral Code Not Found", description: `The referral code ${userEntryForAction.referralCodeUsed} did not match any ambassador.`, variant: "destructive" });
            }
        }
        
        toast({ title: toastTitle, description: toastDescription, variant: action === 'approve' ? "default" : "destructive"});
        
        setPaymentRequests(prevRequests => prevRequests.filter(req => req.uid !== userId));

    } catch (error) {
        console.error("Error updating user status in Firestore:", error);
        toast({title: "Update Failed", description: "Could not update user status.", variant: "destructive"});
    }
  };

  const handleViewProof = (proofUrl: string | undefined | null) => {
    setCurrentProofUrl(proofUrl);
    setIsProofDialogOpen(true);
  };

  const handleOpenEditExpiryDialog = (user: RegisteredUserEntry) => {
    setEditingExpiryUser(user);
    const currentExpiry = user.subscriptionExpiryDate;
    if (currentExpiry) {
        if (currentExpiry instanceof Timestamp) {
            setNewSelectedExpiryDate(currentExpiry.toDate());
        } else if (typeof currentExpiry === 'string' || currentExpiry instanceof Date) {
            setNewSelectedExpiryDate(new Date(currentExpiry));
        } else {
            setNewSelectedExpiryDate(undefined);
        }
    } else {
        setNewSelectedExpiryDate(undefined);
    }
    setIsEditExpiryDialogOpen(true);
  };

  const handleSaveNewExpiryDate = async () => {
    if (!editingExpiryUser || !newSelectedExpiryDate || !db) {
      toast({ title: "Error", description: "User or date not selected.", variant: "destructive" });
      return;
    }
    const userDocRef = doc(db, "users", editingExpiryUser.uid);
    try {
      await updateDoc(userDocRef, {
        subscriptionExpiryDate: Timestamp.fromDate(newSelectedExpiryDate),
        updatedAt: serverTimestamp()
      });
      toast({ title: "Expiry Date Updated", description: `Subscription expiry for ${editingExpiryUser.name} updated.` });
      setIsEditExpiryDialogOpen(false);
    } catch (error) {
      console.error("Error updating expiry date:", error);
      toast({ title: "Update Failed", description: "Could not update expiry date.", variant: "destructive" });
    }
  };


  if (adminAuthLoading || isLoading) {
    return <div className="container mx-auto py-8 px-4 md:px-6 text-center">Loading payment requests...</div>;
  }
  if(!adminUser || adminUser.type !== 'admin'){
    return <div className="container mx-auto py-8 px-4 md:px-6 text-center">Unauthorized. Admin access required.</div>;
  }

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight flex items-center">
          <DollarSign className="mr-3 h-8 w-8 text-primary" /> Manage Payment Requests
        </h1>
        <p className="text-muted-foreground">Review and process payment proofs submitted by Startup / Fundraiser users.</p>
      </div>

      <Card className="shadow-lg rounded-xl">
        <CardHeader>
          <CardTitle>Pending Payment Verifications ({filteredRequests.length})</CardTitle>
          <CardDescription>Users who have submitted payment proof and are awaiting verification.</CardDescription>
          <div className="relative mt-4">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by name or email..."
              className="pl-8 w-full md:w-1/2 lg:w-1/3"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="px-2 whitespace-nowrap">User Profile</TableHead>
                <TableHead className="px-2 whitespace-nowrap">Email</TableHead>
                <TableHead className="hidden md:table-cell px-2 whitespace-nowrap">Plan & Referral</TableHead>
                <TableHead className="hidden lg:table-cell px-2 whitespace-nowrap">Proof Submitted</TableHead>
                <TableHead className="px-2 whitespace-nowrap">Subscription Ends</TableHead>
                <TableHead className="text-right px-2 whitespace-nowrap">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRequests.length > 0 ? (
                filteredRequests.map((req) => (
                  <TableRow key={req.uid}>
                    <TableCell className="px-2">
                      <div className="flex items-center gap-2 whitespace-nowrap">
                        <Avatar className="h-9 w-9"><AvatarImage src={req.avatarDataUri || `https://picsum.photos/seed/${req.avatarSeed}/40/40`} alt={req.name || ""} data-ai-hint="person avatar"/><AvatarFallback>{req.name ? req.name.substring(0, 1) : 'U'}</AvatarFallback></Avatar>
                        <div><div className="font-medium">{req.name || 'N/A'}</div></div>
                      </div>
                    </TableCell>
                    <TableCell className="px-2 whitespace-nowrap">{req.email}</TableCell>
                    <TableCell className="hidden md:table-cell px-2">
                      <Badge variant={req.subscriptionType === 'yearly' ? 'default' : 'secondary'}>
                        {req.subscriptionDurationInMonths ? `${req.subscriptionDurationInMonths} Month(s)` : (req.subscriptionType ? req.subscriptionType.charAt(0).toUpperCase() + req.subscriptionType.slice(1) : 'N/A')}
                        {req.previousSubscriptionDetails && <span className="text-xs ml-1">(Upgrade Attempt)</span>}
                      </Badge>
                      {req.referralCodeUsed && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Code: <span className="font-mono text-primary">{req.referralCodeUsed}</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell px-2 whitespace-nowrap">
                      {req.subscriptionPaymentSubmittedAt ? 
                        format(
                            req.subscriptionPaymentSubmittedAt instanceof Timestamp 
                                ? req.subscriptionPaymentSubmittedAt.toDate() 
                                : new Date(req.subscriptionPaymentSubmittedAt as string | Date),
                            "dd MMM, yyyy p"
                        )
                        : "N/A"}
                    </TableCell>
                    <TableCell className="px-2 whitespace-nowrap">
                      {req.subscriptionExpiryDate ? (
                        <>
                          {format(
                            req.subscriptionExpiryDate instanceof Timestamp 
                                ? req.subscriptionExpiryDate.toDate() 
                                : new Date(req.subscriptionExpiryDate as string | Date),
                            "dd MMM, yyyy"
                          )}
                          <br/>
                          <CountdownTimer 
                            expiryDate={req.subscriptionExpiryDate} 
                            prefix="" 
                            className="text-xs text-muted-foreground"
                          />
                        </>
                      ) : "Not Set"}
                    </TableCell>
                    <TableCell className="text-right px-2 space-x-1">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-muted-foreground hover:text-primary h-8 px-2" 
                        onClick={() => handleViewProof(req.paymentProofDataUri)}
                        disabled={!req.paymentProofDataUri}
                      >
                        <Eye className="mr-1.5 h-3.5 w-3.5" /> Proof
                      </Button>
                       <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-blue-600 border-blue-500 hover:bg-blue-50 hover:text-blue-700 h-8 px-2"
                        onClick={() => handleOpenEditExpiryDialog(req)}
                        disabled={!req.subscriptionExpiryDate}
                      >
                        <Edit className="mr-1.5 h-3.5 w-3.5" /> Expiry
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm" className="text-green-600 border-green-500 hover:bg-green-50 hover:text-green-700 h-8 px-2">
                            <CheckCircle className="mr-1.5 h-3.5 w-3.5" /> Approve
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader><AlertDialogTitle>Approve Payment for {req.name}?</AlertDialogTitle><AlertDialogDescription>This will activate {req.name}'s <strong>{req.subscriptionDurationInMonths} Month(s)</strong> subscription {req.previousSubscriptionDetails ? "(upgrade)" : ""} and add them to the Startup / Fundraiser network.</AlertDialogDescription></AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleUpdateRequestStatus(req.uid, req.name || req.email, 'approve')} className="bg-green-600 hover:bg-green-700 text-white">Confirm Approve</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm" className="text-red-600 border-red-500 hover:bg-red-50 hover:text-red-700 h-8 px-2">
                            <XCircle className="mr-1.5 h-3.5 w-3.5" /> Reject
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader><AlertDialogTitle>Reject Payment for {req.name}?</AlertDialogTitle><AlertDialogDescription>This will {req.previousSubscriptionDetails ? `revert ${req.name} to their previous monthly plan (if still valid) and notify them.` : `set ${req.name}'s account status to 'pending verification' and require them to re-submit proof.`}</AlertDialogDescription></AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleUpdateRequestStatus(req.uid, req.name || req.email, 'reject')} className="bg-red-600 hover:bg-red-700 text-white">Confirm Reject</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={6} className="h-24 text-center">No pending payment requests.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog for Viewing Payment Proof */}
      <Dialog open={isProofDialogOpen} onOpenChange={setIsProofDialogOpen}>
        <UIDialogContent className="sm:max-w-md md:max-w-lg lg:max-w-xl">
          <UIDialogHeader>
            <UIDialogTitle>Payment Proof</UIDialogTitle>
            <UIDialogDescription>
              Review the uploaded payment proof.
            </UIDialogDescription>
          </UIDialogHeader>
          <div className="my-4 max-h-[70vh] overflow-auto flex justify-center">
            {currentProofUrl && currentProofUrl.startsWith("data:image") ? (
                <img src={currentProofUrl} alt="Payment Proof" className="max-w-full h-auto rounded-md border" data-ai-hint="payment proof"/>
              ) : currentProofUrl ? ( 
                <div className="text-muted-foreground text-center py-8 px-4">
                  <p>Proof submitted as filename: <strong className="text-foreground">{currentProofUrl}</strong>.</p>
                  <p className="text-xs mt-2">
                    (This is a filename reference. In a production system, this would be a link to a file in cloud storage.)
                  </p>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No payment proof image available for this user.</p>
              )}
          </div>
          <UIDialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Close</Button>
            </DialogClose>
          </UIDialogFooter>
        </UIDialogContent>
      </Dialog>

      {/* Dialog for Editing Expiry Date */}
      {editingExpiryUser && (
        <Dialog open={isEditExpiryDialogOpen} onOpenChange={setIsEditExpiryDialogOpen}>
          <UIDialogContent className="sm:max-w-md">
            <UIDialogHeader>
              <UIDialogTitle>Edit Subscription Expiry for {editingExpiryUser.name}</UIDialogTitle>
              <UIDialogDescription>
                Current Plan: {editingExpiryUser.subscriptionType?.charAt(0).toUpperCase() + editingExpiryUser.subscriptionType!.slice(1)}
                <br />
                Current Expiry: {editingExpiryUser.subscriptionExpiryDate ? 
                                  format(editingExpiryUser.subscriptionExpiryDate instanceof Timestamp ? editingExpiryUser.subscriptionExpiryDate.toDate() : new Date(editingExpiryUser.subscriptionExpiryDate as string | Date), "PPP") 
                                  : "Not set"}
              </UIDialogDescription>
            </UIDialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="new-expiry-date">New Subscription End Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="new-expiry-date"
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !newSelectedExpiryDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {newSelectedExpiryDate ? format(newSelectedExpiryDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={newSelectedExpiryDate}
                      onSelect={setNewSelectedExpiryDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <UIDialogFooter>
              <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
              <Button onClick={handleSaveNewExpiryDate} disabled={!newSelectedExpiryDate}>Save New Expiry</Button>
            </UIDialogFooter>
          </UIDialogContent>
        </Dialog>
      )}
    </div>
  );
}
