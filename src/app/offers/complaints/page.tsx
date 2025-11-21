
"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, ShieldAlert, PlusCircle, Send, Edit, Trash2, Eye, Filter, UserCircle, Users, Server, Lightbulb, Info } from 'lucide-react'; // Added Info here
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebaseConfig';
import { collection, addDoc, serverTimestamp, query, where, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import type { Complaint, ComplaintType, ComplaintStatus } from '@/app/auth/components/auth-shared-types';
import { format } from 'date-fns';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";

const complaintTypes = ["againstUser", "platformIssue", "featureRequest", "other"] as const;

const complaintFormSchema = z.object({
  complaintType: z.enum(complaintTypes, { required_error: "Please select a complaint type." }),
  targetUserIdentifier: z.string().optional(),
  subject: z.string().min(5, "Subject must be at least 5 characters.").max(100, "Subject must be 100 characters or less."),
  description: z.string().min(20, "Description must be at least 20 characters.").max(2000, "Description must be 2000 characters or less."),
});

type ComplaintFormValues = z.infer<typeof complaintFormSchema>;

export default function UserComplaintsPage() {
  const { currentUser: authUser, loading: authLoading } = useAuth();
  const [myComplaints, setMyComplaints] = useState<Complaint[]>([]);
  const [isLoadingComplaints, setIsLoadingComplaints] = useState(true);
  const [isSubmittingComplaint, setIsSubmittingComplaint] = useState(false);
  const { toast } = useToast();

  const form = useForm<ComplaintFormValues>({
    resolver: zodResolver(complaintFormSchema),
    defaultValues: {
      complaintType: undefined,
      targetUserIdentifier: "",
      subject: "",
      description: "",
    },
  });

  const watchComplaintType = form.watch("complaintType");

  useEffect(() => {
    if (authLoading || !authUser || authUser.type !== 'professional' || !db) {
      setIsLoadingComplaints(false);
      return;
    }

    setIsLoadingComplaints(true);
    const complaintsRef = collection(db, "complaints");
    const q = query(
      complaintsRef,
      where("complainantUid", "==", authUser.uid),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetchedComplaints: Complaint[] = [];
      querySnapshot.forEach((doc) => {
        fetchedComplaints.push({ id: doc.id, ...doc.data() } as Complaint);
      });
      setMyComplaints(fetchedComplaints);
      setIsLoadingComplaints(false);
    }, (error) => {
      console.error("Error fetching complaints: ", error);
      toast({ title: "Error", description: "Could not fetch your complaints.", variant: "destructive" });
      setIsLoadingComplaints(false);
    });

    return () => unsubscribe();
  }, [authUser, authLoading, toast]);

  const onSubmitComplaint = async (values: ComplaintFormValues) => {
    if (!authUser || !authUser.uid || !authUser.email || !db) {
      toast({ title: "Error", description: "User information not available. Please re-login.", variant: "destructive" });
      return;
    }
    setIsSubmittingComplaint(true);

    const complaintBase: Omit<Complaint, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'adminNotes' | 'targetUserIdentifier'> & { createdAt: any, updatedAt: any, status: ComplaintStatus } = {
      complainantUid: authUser.uid,
      complainantName: authUser.name || "User",
      complainantEmail: authUser.email,
      complainantType: 'professional', // Hardcoded for this user type's page
      complaintType: values.complaintType,
      subject: values.subject,
      description: values.description,
      status: 'Pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    
    const newComplaintData: any = { ...complaintBase };
    if (values.complaintType === 'againstUser' && values.targetUserIdentifier && values.targetUserIdentifier.trim() !== "") {
      newComplaintData.targetUserIdentifier = values.targetUserIdentifier.trim();
    }

    try {
      await addDoc(collection(db, "complaints"), newComplaintData);
      toast({ title: "Complaint Filed Successfully!", description: "Your complaint has been submitted for review." });
      form.reset();
    } catch (error) {
      console.error("Error filing complaint:", error);
      toast({ title: "Submission Failed", description: "Could not file your complaint.", variant: "destructive" });
    } finally {
      setIsSubmittingComplaint(false);
    }
  };

  const getComplaintTypeIcon = (type: ComplaintType) => {
    switch (type) {
      case 'againstUser': return <UserCircle className="h-4 w-4 mr-2" />;
      case 'platformIssue': return <Server className="h-4 w-4 mr-2" />;
      case 'featureRequest': return <Lightbulb className="h-4 w-4 mr-2" />;
      default: return <Info className="h-4 w-4 mr-2" />;
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

  if (authLoading || (!authUser && !authLoading)) {
    return <div className="container mx-auto py-8 px-4 md:px-6 text-center">Loading complaint system...</div>;
  }
  if (authUser?.type !== 'professional') {
    return <div className="container mx-auto py-8 px-4 md:px-6 text-center">Access Denied. This page is for Startups / Fundraisers.</div>;
  }


  return (
    <div className="container mx-auto py-8 px-4 md:px-6 space-y-8">
      <Button variant="outline" asChild className="mb-4 print:hidden">
        <Link href="/home"><ArrowLeft className="mr-2 h-4 w-4" /> Back to User Portal Home</Link>
      </Button>
      
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center">
          <ShieldAlert className="mr-3 h-8 w-8 text-primary" /> My Complaints
        </h1>
        <p className="text-muted-foreground">File new complaints and track your existing submissions.</p>
      </div>

      <Card className="shadow-lg rounded-xl">
        <CardHeader>
          <CardTitle className="text-xl flex items-center"><PlusCircle className="mr-2 h-5 w-5 text-primary"/>File a New Complaint</CardTitle>
          <CardDescription>Submit a complaint regarding another user, a platform issue, or suggest a feature.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitComplaint)} className="space-y-6">
              <FormField
                control={form.control}
                name="complaintType"
                render={({ field }) => (
                  <FormItem>
                    <Label>Complaint Type</Label>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select the type of complaint" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {complaintTypes.map(type => (
                          <SelectItem key={type} value={type}>
                            <div className="flex items-center">{getComplaintTypeIcon(type)}{type.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {watchComplaintType === 'againstUser' && (
                <FormField
                  control={form.control}
                  name="targetUserIdentifier"
                  render={({ field }) => (
                    <FormItem>
                      <Label>User to Complain About (Name/Email/UID)</Label>
                      <FormControl><Input placeholder="Enter name, email, or user ID" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              <FormField
                control={form.control}
                name="subject"
                render={({ field }) => (
                  <FormItem>
                    <Label>Subject / Summary</Label>
                    <FormControl><Input placeholder="Brief subject of your complaint" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <Label>Detailed Description</Label>
                    <FormControl><Textarea placeholder="Provide all relevant details about your complaint..." rows={5} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isSubmittingComplaint}>
                <Send className="mr-2 h-4 w-4" /> {isSubmittingComplaint ? "Submitting..." : "Submit Complaint"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card className="shadow-lg rounded-xl">
        <CardHeader>
          <CardTitle className="text-xl">My Submitted Complaints ({myComplaints.length})</CardTitle>
          <CardDescription>Track the status of complaints you have filed.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingComplaints ? (
            <p className="text-muted-foreground text-center py-4">Loading your complaints...</p>
          ) : myComplaints.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[150px]">Complaint ID</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Date Filed</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {myComplaints.map((complaint) => (
                  <TableRow key={complaint.id}>
                    <TableCell className="font-medium text-xs">{complaint.id?.substring(0, 8)}...</TableCell>
                    <TableCell>{complaint.subject}</TableCell>
                    <TableCell>
                        <Badge variant="secondary" className="text-xs whitespace-nowrap">
                            {getComplaintTypeIcon(complaint.complaintType)}
                            {complaint.complaintType.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                        </Badge>
                    </TableCell>
                    <TableCell>{complaint.createdAt ? format( (complaint.createdAt as Timestamp).toDate(), "dd MMM, yyyy") : 'N/A'}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(complaint.status)} className="text-xs">
                        {complaint.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-center py-6">You have not filed any complaints yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
