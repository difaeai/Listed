
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
  Dialog,
  DialogContent as ProofDialogContent,
  DialogHeader as ProofDialogHeader,
  DialogTitle as ProofDialogTitle,
  DialogDescription as ProofDialogDescription,
  DialogFooter as ProofDialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Star, Search, Eye, CheckCircle, XCircle, CalendarDays } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebaseConfig';
import { collection, query, where, onSnapshot, doc, updateDoc, Timestamp, serverTimestamp, deleteField } from 'firebase/firestore'; 
import type { FundingPitch } from '@/app/offers/my-ads/page';
import Link from 'next/link';

export default function AdminFeatureRequestsPage() {
  const [featureRequests, setFeatureRequests] = useState<FundingPitch[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const { currentUser: adminUser, loading: adminAuthLoading } = useAuth();
  const { toast } = useToast();
  const [isProofDialogOpen, setIsProofDialogOpen] = useState(false);
  const [currentProofUrl, setCurrentProofUrl] = useState<string | null | undefined>(null); 

  useEffect(() => {
    if (adminAuthLoading) return;
    if (!adminUser || adminUser.type !== 'admin' || !db) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const pitchesRef = collection(db, "fundingPitches");
    const q = query(
      pitchesRef,
      where("featureStatus", "==", "pending_approval"),
      where("isDeletedByAdmin", "==", false) 
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const requests: FundingPitch[] = [];
      querySnapshot.forEach((docSnap) => {
        requests.push({ id: docSnap.id, ...docSnap.data() } as FundingPitch);
      });
      setFeatureRequests(requests);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching feature requests:", error);
      toast({ title: "Error Loading Requests", description: "Could not fetch feature requests.", variant: "destructive" });
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [adminUser, adminAuthLoading, toast]);

  const filteredRequests = useMemo(() => {
    return featureRequests.filter(req =>
      req.projectTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (req.creatorName && req.creatorName.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [featureRequests, searchTerm]);

  const handleViewProof = (proofData: string | undefined | null) => {
    if (proofData && proofData.startsWith("data:image")) { 
      setCurrentProofUrl(proofData);
    } else if (proofData) { 
      setCurrentProofUrl(proofData); 
    } else {
      setCurrentProofUrl(null);
    }
    setIsProofDialogOpen(true);
  };

  const handleFeatureAction = async (pitchId: string, action: 'approve' | 'reject') => {
    if (!db) {
      toast({ title: "Database Error", variant: "destructive" });
      return;
    }
    const pitchDocRef = doc(db, "fundingPitches", pitchId);
    let updateData: Record<string, any> = { updatedAt: serverTimestamp() };
    let toastTitle = "";
    let toastDescription = "";

    if (action === 'approve') {
      const now = new Date();
      const sevenDaysFromNow = new Date(now.setDate(now.getDate() + 7));
      updateData = {
        ...updateData,
        featureStatus: 'active',
        featureEndsAt: Timestamp.fromDate(sevenDaysFromNow),
      };
      toastTitle = "Feature Approved";
      toastDescription = "The pitch will now be featured for 7 days.";
    } else { // reject
      updateData = {
        ...updateData,
        featureStatus: 'rejected',
        featurePaymentProofDataUri: deleteField(), 
      };
      toastTitle = "Feature Rejected";
      toastDescription = "The feature request has been rejected. The user will be notified (simulated) and can resubmit proof from their Subscription page if they choose to re-request.";
    }

    try {
      await updateDoc(pitchDocRef, updateData);
      toast({ title: toastTitle, description: toastDescription, variant: action === 'approve' ? "default" : "destructive" });
    } catch (error) {
      console.error("Error updating feature status:", error);
      toast({ title: "Update Failed", description: "Could not update feature status.", variant: "destructive" });
    }
  };

  if (adminAuthLoading || isLoading) {
    return <div className="container mx-auto py-8 px-4 md:px-6 text-center">Loading feature requests...</div>;
  }
  if (!adminUser || adminUser.type !== 'admin') {
    return <div className="container mx-auto py-8 px-4 md:px-6 text-center">Admin access required.</div>;
  }

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight flex items-center">
          <Star className="mr-3 h-8 w-8 text-primary" /> Manage Feature Requests
        </h1>
        <p className="text-muted-foreground">Review and process requests from users to feature their funding pitches.</p>
      </div>

      <Card className="shadow-lg rounded-xl">
        <CardHeader>
          <CardTitle>Pending Feature Approvals ({filteredRequests.length})</CardTitle>
          <CardDescription>Pitches awaiting approval to be featured. Payment proof might be a filename or a Data URI.</CardDescription>
          <div className="relative mt-4">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by pitch title or creator name..."
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
                <TableHead>Pitch Title</TableHead>
                <TableHead>Creator</TableHead>
                <TableHead className="hidden md:table-cell">Requested On</TableHead>
                <TableHead>Payment Proof</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRequests.length > 0 ? (
                filteredRequests.map((req) => (
                  <TableRow key={req.id}>
                    <TableCell className="font-medium">
                      <Link href={`/admin/manage-funding-pitches/${req.id}/engagement`} target="_blank" className="hover:underline text-primary">
                        {req.projectTitle}
                      </Link>
                    </TableCell>
                    <TableCell>{req.creatorName || "N/A"}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      {req.featureRequestedAt instanceof Timestamp
                        ? format(req.featureRequestedAt.toDate(), "dd MMM, yyyy p")
                        : req.featureRequestedAt ? format(new Date(req.featureRequestedAt as any), "dd MMM, yyyy p") : "N/A"}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewProof(req.featurePaymentProofDataUri)}
                      >
                        <Eye className="mr-1.5 h-3.5 w-3.5" /> View Proof
                      </Button>
                    </TableCell>
                    <TableCell className="text-right">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm" className="text-green-600 border-green-500 hover:bg-green-50 hover:text-green-700 mr-1">
                            <CheckCircle className="mr-1.5 h-4 w-4" /> Approve
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader><AlertDialogTitle>Approve Feature for "{req.projectTitle}"?</AlertDialogTitle><AlertDialogDescription>This will mark the pitch as featured for 7 days.</AlertDialogDescription></AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleFeatureAction(req.id!, 'approve')} className="bg-green-600 hover:bg-green-700 text-white">Confirm Approve</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm" className="text-red-600 border-red-500 hover:bg-red-50 hover:text-red-700">
                            <XCircle className="mr-1.5 h-4 w-4" /> Reject
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader><AlertDialogTitle>Reject Feature for "{req.projectTitle}"?</AlertDialogTitle><AlertDialogDescription>This will mark the request as rejected. The user will be able to resubmit proof.</AlertDialogDescription></AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleFeatureAction(req.id!, 'reject')} className="bg-red-600 hover:bg-red-700 text-white">Confirm Reject</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={5} className="h-24 text-center">No pending feature requests.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isProofDialogOpen} onOpenChange={setIsProofDialogOpen}>
        <ProofDialogContent className="sm:max-w-md md:max-w-lg lg:max-w-xl">
          <ProofDialogHeader>
            <ProofDialogTitle>Feature Payment Proof</ProofDialogTitle>
            <ProofDialogDescription>Review the uploaded payment proof for featuring the pitch.</ProofDialogDescription>
          </ProofDialogHeader>
          <div className="my-4 max-h-[70vh] overflow-auto flex justify-center items-center">
            {currentProofUrl && currentProofUrl.startsWith("data:image") ? (
              <img src={currentProofUrl} alt="Feature Payment Proof" className="max-w-full h-auto rounded-md border" data-ai-hint="payment proof"/>
            ) : currentProofUrl ? ( 
              <div className="text-muted-foreground text-center py-8 px-4">
                <p>Proof submitted as filename: <strong className="text-foreground">{currentProofUrl}</strong>.</p>
                <p className="text-xs mt-2">
                  (This is a filename reference. The actual image file is not stored directly in the database due to size limits.
                  In a production system, this file would be uploaded to a secure storage service, and a link would be provided here.
                  For this prototype, please verify this payment through your separate records if needed.)
                </p>
              </div>
            ): (
              <p className="text-muted-foreground text-center py-8">No payment proof image data or filename available for this request.</p>
            )}
          </div>
          <ProofDialogFooter>
            <DialogClose asChild><Button variant="outline">Close</Button></DialogClose>
          </ProofDialogFooter>
        </ProofDialogContent>
      </Dialog>
    </div>
  );
}
