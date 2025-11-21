
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { ShieldAlert, Search, Edit, Eye, UserCircle, Server, Lightbulb, Info as InfoIcon, CheckCircle, Clock, Filter, Copy as CopyIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebaseConfig';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import type { Complaint, ComplaintType, ComplaintStatus } from '@/app/auth/components/auth-shared-types';
import { format } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';

const complaintStatusOptions: ComplaintStatus[] = ["Pending", "In Progress", "Resolved", "Closed"];
const complaintTypeOptions: ComplaintType[] = ["againstUser", "platformIssue", "featureRequest", "other"];

export default function AdminManageComplaintsPage() {
  const { currentUser: adminUser, loading: authLoading } = useAuth();
  const [allComplaints, setAllComplaints] = useState<Complaint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ComplaintStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<ComplaintType | 'all'>('all');
  const { toast } = useToast();

  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [adminNote, setAdminNote] = useState('');
  const [newStatusForUpdate, setNewStatusForUpdate] = useState<ComplaintStatus | undefined>(undefined);

  useEffect(() => {
    if (authLoading || !adminUser || adminUser.type !== 'admin' || !db) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const complaintsRef = collection(db, "complaints");
    const q = query(complaintsRef, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetchedComplaints: Complaint[] = [];
      querySnapshot.forEach((docSnap) => {
        fetchedComplaints.push({ id: docSnap.id, ...docSnap.data() } as Complaint);
      });
      setAllComplaints(fetchedComplaints);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching complaints:", error);
      toast({ title: "Error", description: "Could not fetch complaints.", variant: "destructive" });
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [adminUser, authLoading, toast]);

  const filteredComplaints = useMemo(() => {
    return allComplaints.filter(c => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        (c.id?.toLowerCase().includes(searchLower)) ||
        (c.subject.toLowerCase().includes(searchLower)) ||
        (c.complainantName.toLowerCase().includes(searchLower)) ||
        (c.complainantEmail.toLowerCase().includes(searchLower)) ||
        (c.targetUserIdentifier && c.targetUserIdentifier.toLowerCase().includes(searchLower));
      const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
      const matchesType = typeFilter === 'all' || c.complaintType === typeFilter;
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [allComplaints, searchTerm, statusFilter, typeFilter]);

  const handleViewDetails = (complaint: Complaint) => {
    setSelectedComplaint(complaint);
    setNewStatusForUpdate(complaint.status); 
    setAdminNote('');
    setIsDetailDialogOpen(true);
  };

  const handleUpdateComplaint = async () => {
    if (!selectedComplaint || !selectedComplaint.id || !newStatusForUpdate || !db || !adminUser || !adminUser.uid) {
      toast({ title: "Error", description: "Cannot update complaint.", variant: "destructive" });
      return;
    }
    const complaintDocRef = doc(db, "complaints", selectedComplaint.id);
    const updatePayload: Record<string, any> = {
      status: newStatusForUpdate,
      updatedAt: serverTimestamp(),
    };

    if (adminNote.trim()) {
      const noteEntry = {
        note: adminNote.trim(),
        adminId: adminUser.uid,
        adminName: adminUser.name || "Admin",
        timestamp: Timestamp.now(), 
      };
      updatePayload.adminNotes = [...(selectedComplaint.adminNotes || []), noteEntry];
    }

    try {
      await updateDoc(complaintDocRef, updatePayload);
      toast({ title: "Complaint Updated", description: `Complaint ${selectedComplaint.id.substring(0,8)}... status set to ${newStatusForUpdate}.` });
      setIsDetailDialogOpen(false);
    } catch (error) {
      console.error("Error updating complaint:", error);
      toast({ title: "Update Failed", description: "Could not update complaint.", variant: "destructive" });
    }
  };

  const getComplaintTypeIcon = (type: ComplaintType) => {
    switch (type) {
      case 'againstUser': return <UserCircle className="h-4 w-4 mr-1.5" />;
      case 'platformIssue': return <Server className="h-4 w-4 mr-1.5" />;
      case 'featureRequest': return <Lightbulb className="h-4 w-4 mr-1.5" />;
      default: return <InfoIcon className="h-4 w-4 mr-1.5" />;
    }
  };

  const getStatusBadgeVariant = (status: ComplaintStatus): "default" | "secondary" | "outline" | "destructive" => {
    switch (status) {
      case 'Pending': return "outline";
      case 'In Progress': return "secondary";
      case 'Resolved': return "default"; 
      case 'Closed': return "destructive";
      default: return "outline";
    }
  };
  
  const copyToClipboard = (text: string, complaintId?: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({ title: "Copied!", description: `Complaint ID ${complaintId ? complaintId.substring(0,8) + '...' : ''} copied to clipboard.` });
    }).catch(err => {
      console.error('Failed to copy: ', err);
      toast({ title: "Copy Failed", description: "Could not copy ID to clipboard.", variant: "destructive" });
    });
  };


  if (isLoading || authLoading) {
    return <div className="container mx-auto py-8 px-4 md:px-6 text-center">Loading complaints management...</div>;
  }
  if (!adminUser || adminUser.type !== 'admin') {
    return <div className="container mx-auto py-8 px-4 md:px-6 text-center">Admin access required.</div>;
  }

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight flex items-center">
          <ShieldAlert className="mr-3 h-8 w-8 text-primary" /> Manage Complaints
        </h1>
        <p className="text-muted-foreground">Review, update status, and manage user-submitted complaints.</p>
      </div>

      <Card className="shadow-lg rounded-xl">
        <CardHeader>
          <CardTitle>All Platform Complaints ({filteredComplaints.length})</CardTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
            <Input
              type="search"
              placeholder="Search by ID, subject, complainant..."
              className="pl-8 w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}>
              <SelectTrigger><div className="flex items-center gap-2"><Filter className="h-4 w-4"/>Status: <SelectValue/></div></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {complaintStatusOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as typeof typeFilter)}>
              <SelectTrigger><div className="flex items-center gap-2"><Filter className="h-4 w-4"/>Type: <SelectValue/></div></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {complaintTypeOptions.map(t => <SelectItem key={t} value={t}>{t.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Complainant</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredComplaints.length > 0 ? (
                filteredComplaints.map((complaint) => (
                  <TableRow key={complaint.id}>
                    <TableCell className="font-medium text-xs">
                      <div className="flex items-center gap-1">
                        <span>{complaint.id?.substring(0, 8)}...</span>
                        <Button variant="ghost" size="icon" className="h-6 w-6 p-0" onClick={() => copyToClipboard(complaint.id!, complaint.id)}>
                          <CopyIcon className="h-3.5 w-3.5 text-muted-foreground hover:text-primary" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>{complaint.subject}</TableCell>
                    <TableCell>{complaint.complainantName} <span className="text-xs text-muted-foreground">({complaint.complainantType})</span></TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs whitespace-nowrap flex items-center">
                        {getComplaintTypeIcon(complaint.complaintType)}
                        {complaint.complaintType.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                      </Badge>
                    </TableCell>
                    <TableCell>{complaint.createdAt ? format((complaint.createdAt as Timestamp).toDate(), "dd MMM, yy") : 'N/A'}</TableCell>
                    <TableCell><Badge variant={getStatusBadgeVariant(complaint.status)} className="text-xs">{complaint.status}</Badge></TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => handleViewDetails(complaint)}>
                        <Eye className="mr-1.5 h-4 w-4" /> View / Manage
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={7} className="h-24 text-center">No complaints found.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {selectedComplaint && (
        <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Complaint Details: {selectedComplaint.id?.substring(0,8)}...</DialogTitle>
              <DialogDescription>Subject: {selectedComplaint.subject}</DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh] p-1">
              <div className="space-y-4 py-4">
                <div><Label>Full ID:</Label><p className="text-sm flex items-center gap-1">{selectedComplaint.id} <Button variant="ghost" size="icon" className="h-5 w-5 p-0" onClick={() => copyToClipboard(selectedComplaint.id!)}><CopyIcon className="h-3 w-3 text-muted-foreground hover:text-primary"/></Button></p></div>
                <div><Label>Complainant:</Label><p className="text-sm">{selectedComplaint.complainantName} ({selectedComplaint.complainantEmail}) - {selectedComplaint.complainantType}</p></div>
                <div><Label>Type:</Label><p className="text-sm">{selectedComplaint.complaintType.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</p></div>
                {selectedComplaint.targetUserIdentifier && <div><Label>Target User/Feature:</Label><p className="text-sm">{selectedComplaint.targetUserIdentifier}</p></div>}
                <div><Label>Description:</Label><p className="text-sm whitespace-pre-line bg-muted/50 p-3 rounded-md">{selectedComplaint.description}</p></div>
                <div><Label>Filed On:</Label><p className="text-sm">{selectedComplaint.createdAt ? format((selectedComplaint.createdAt as Timestamp).toDate(), "PPPpp") : 'N/A'}</p></div>
                <div><Label>Current Status:</Label><Badge variant={getStatusBadgeVariant(selectedComplaint.status)}>{selectedComplaint.status}</Badge></div>
                {selectedComplaint.adminNotes && selectedComplaint.adminNotes.length > 0 && (
                  <div><Label>Admin Notes:</Label>
                    <div className="space-y-2 mt-1 border p-3 rounded-md bg-muted/20 max-h-40 overflow-y-auto">
                      {selectedComplaint.adminNotes.map((note, index) => (
                        <div key={index} className="text-xs border-b pb-1 mb-1">
                          <p className="font-semibold">{note.adminName} ({note.timestamp ? format((note.timestamp as Timestamp).toDate(), "dd MMM, yy HH:mm") : 'Now'}):</p>
                          <p className="whitespace-pre-line">{note.note}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="newStatus">Update Status:</Label>
                  <Select value={newStatusForUpdate} onValueChange={(value) => setNewStatusForUpdate(value as ComplaintStatus)}>
                    <SelectTrigger id="newStatus"><SelectValue /></SelectTrigger>
                    <SelectContent>{complaintStatusOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="adminNote">Add Admin Note (Optional):</Label>
                  <Textarea id="adminNote" value={adminNote} onChange={(e) => setAdminNote(e.target.value)} placeholder="Add internal notes or resolution details..." />
                </div>
              </div>
            </ScrollArea>
            <DialogFooter>
              <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
              <Button onClick={handleUpdateComplaint}>Update Complaint</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

