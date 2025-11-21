
"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { BarChart3, Search, Eye, Edit, Trash2, MoreHorizontal, User, MapPin, Phone, Mail, DollarSign, PlusCircle, Loader2, FileUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  DialogContent,
  DialogDescription as FormDialogDescription,
  DialogFooter as FormDialogFooter,
  DialogHeader as FormDialogHeader,
  DialogTitle as FormDialogTitle,
  DialogTrigger as FormDialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { db } from '@/lib/firebaseConfig';
import { collection, addDoc, doc, updateDoc, onSnapshot, query, orderBy, serverTimestamp, Timestamp, getDoc, writeBatch } from 'firebase/firestore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';


export interface Lead {
  id: string; // Firestore document ID
  name: string; // Organization Name
  contactPerson: string; 
  address: string;
  email: string;
  phoneNumber?: string;
  corporationName?: string; 
  salesProfessionalName?: string;
  isDeletedByAdmin?: boolean; // For soft delete
  notes?: string; // Admin notes
  createdAt?: any; // Firestore Timestamp
  updatedAt?: any; // Firestore Timestamp
  status?: 'new' | 'contacted' | 'qualified' | 'converted' | 'lost' | 'flagged';
}

const leadFormSchema = z.object({
  name: z.string().optional(),
  contactPerson: z.string().optional(),
  email: z.string().optional(),
  address: z.string().optional(),
  phoneNumber: z.string().optional(),
});
type LeadFormValues = z.infer<typeof leadFormSchema>;


export default function AdminManageLeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<LeadFormValues>({
    resolver: zodResolver(leadFormSchema),
    defaultValues: {
      name: "", 
      contactPerson: "", 
      email: "", 
      address: "", 
      phoneNumber: "",
    },
  });

  useEffect(() => {
    if (!db) {
        toast({title: "Error", description: "Database not available.", variant: "destructive"});
        setIsLoading(false);
        return;
    }
    setIsLoading(true);
    const leadsRef = collection(db, "leads");
    const q = query(leadsRef, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetchedLeads: Lead[] = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (!data.isDeletedByAdmin) { 
            fetchedLeads.push({ 
                id: docSnap.id, 
                ...data,
            } as Lead);
        }
      });
      setLeads(fetchedLeads);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching leads:", error);
      toast({ title: "Fetch Error", description: "Could not load leads from database.", variant: "destructive" });
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [toast]);

  useEffect(() => {
    if (isFormOpen && editingLead) {
      form.reset({
        name: editingLead.name,
        contactPerson: editingLead.contactPerson,
        address: editingLead.address,
        email: editingLead.email,
        phoneNumber: editingLead.phoneNumber || "",
      });
    } else if (isFormOpen && !editingLead) {
      form.reset({
        name: "", 
        contactPerson: "", 
        email: "", 
        address: "", 
        phoneNumber: "",
      });
    }
  }, [isFormOpen, editingLead, form]);

  const filteredLeads = useMemo(() => {
    return leads.filter(lead =>
        lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.contactPerson.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.email.toLowerCase().includes(searchTerm.toLowerCase()) || 
        lead.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (lead.phoneNumber && lead.phoneNumber.includes(searchTerm)) ||
        (lead.corporationName && lead.corporationName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (lead.salesProfessionalName && lead.salesProfessionalName.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [leads, searchTerm]);

  const handleSoftDeleteLead = async (leadId: string, leadName: string) => {
    if (!db) return;
    const leadDocRef = doc(db, "leads", leadId);
    try {
        await updateDoc(leadDocRef, { isDeletedByAdmin: true, updatedAt: serverTimestamp() });
        toast({ title: "Lead Hidden", description: `Lead for ${leadName} has been hidden.`});
    } catch (error) {
        console.error("Error soft deleting lead:", error);
        toast({ title: "Error", description: "Could not hide lead.", variant: "destructive"});
    }
  };
  
  const handleFormSubmit = async (values: LeadFormValues) => {
    if (!db) return;
    form.formState.isSubmitting;

    try {
        if (editingLead) {
            const leadDocRef = doc(db, "leads", editingLead.id);
            // Fetch existing data to preserve fields not in the form
            const existingDoc = await getDoc(leadDocRef);
            const existingData = existingDoc.data() || {};
            await updateDoc(leadDocRef, { 
                ...existingData, // Preserve existing fields
                ...values,       
                updatedAt: serverTimestamp() 
            });
            toast({ title: "Lead Updated", description: `Lead for "${values.name}" updated.` });
        } else {
            await addDoc(collection(db, "leads"), { 
                ...values, 
                isDeletedByAdmin: false,
                createdAt: serverTimestamp(), 
                updatedAt: serverTimestamp() 
            });
            toast({ title: "Lead Added", description: `New lead for "${values.name}" created.` });
        }
        setIsFormOpen(false);
        setEditingLead(null);
        form.reset();
    } catch (error) {
        console.error("Error saving lead:", error);
        toast({ title: "Save Error", description: "Could not save lead.", variant: "destructive"});
    }
  };
  
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !db) return;
    setIsUploading(true);

    const processData = async (data: any[]) => {
      try {
        let entriesToUpload: Omit<Lead, 'id'>[] = data.map((row: any) => ({
            name: String(row['Organization Name'] || row['name'] || '').trim(),
            contactPerson: String(row['Contact Person'] || row['contactPerson'] || '').trim(),
            email: String(row['Email'] || row['email'] || '').trim(),
            address: String(row['Address'] || row['address'] || '').trim(),
            phoneNumber: String(row['Mobile Number'] || row['phoneNumber'] || '').trim(),
            status: 'new' as Lead['status']
        })).filter(lead => lead.name && lead.email); // Basic validation

        if (entriesToUpload.length > 0) {
            const batch = writeBatch(db);
            entriesToUpload.forEach(entry => {
                const newEntryRef = doc(collection(db, "leads"));
                batch.set(newEntryRef, {
                    ...entry,
                    isDeletedByAdmin: false,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                });
            });
            await batch.commit();
            toast({
                title: "Upload Successful",
                description: `${entriesToUpload.length} new business models were added.`,
            });
        } else {
             toast({
                title: "No New Entries Added",
                description: `No new business models were found in the file.`,
            });
        }
      } catch (error: any) {
         toast({ title: "Upload Failed", description: error.message || "An error occurred during data processing.", variant: "destructive" });
      } finally {
        if(fileInputRef.current) fileInputRef.current.value = "";
        setIsUploading(false);
      }
    }

    const lowerCaseFileName = file.name.toLowerCase();

    if (lowerCaseFileName.endsWith('.csv') || lowerCaseFileName.endsWith('.txt')) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => processData(results.data),
        error: (error: any) => {
          toast({ title: "CSV Parsing Failed", description: error.message, variant: "destructive" });
          setIsUploading(false);
        }
      });
    } else if (lowerCaseFileName.endsWith('.xlsx') || lowerCaseFileName.endsWith('.xls')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = e.target?.result;
        if (data) {
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          processData(jsonData);
        }
      };
      reader.onerror = () => {
        toast({ title: "File Read Error", description: "Could not read the Excel file.", variant: "destructive" });
        setIsUploading(false);
      }
      reader.readAsBinaryString(file);
    } else {
      toast({ title: "Unsupported File", description: "Please upload a CSV or Excel file.", variant: "destructive" });
      setIsUploading(false);
    }
  };


  const openEditForm = (lead: Lead) => {
    setEditingLead(lead);
    setIsFormOpen(true);
  };

  const openNewForm = () => {
    setEditingLead(null);
    setIsFormOpen(true);
  };

  if (isLoading) {
    return <div className="container mx-auto py-8 px-4 md:px-6 text-center">Loading leads management...</div>;
  }

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center">
            <BarChart3 className="mr-3 h-8 w-8 text-primary" /> Manage All Leads
          </h1>
          <p className="text-muted-foreground">Oversee leads generated across the platform (from Firestore).</p>
        </div>
        <div className="flex items-center gap-2">
            <Button onClick={() => fileInputRef.current?.click()} disabled={isUploading} variant="outline">
              <FileUp className="mr-2 h-4 w-4" />
              {isUploading ? 'Uploading...' : 'Upload File'}
            </Button>
            <Input
              type="file"
              ref={fileInputRef}
              className="hidden"
              onChange={handleFileUpload}
              accept=".csv, .xlsx, .xls, text/plain"
            />
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <FormDialogTrigger asChild>
                <Button onClick={openNewForm}><PlusCircle className="mr-2 h-4 w-4" />Add New Lead</Button>
            </FormDialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
                <FormDialogHeader>
                <FormDialogTitle>{editingLead ? "Edit Lead" : "Add New Lead"}</FormDialogTitle>
                <FormDialogDescription>
                    {editingLead ? "Update the details for this lead." : "Enter the details for the new lead."}
                </FormDialogDescription>
                </FormDialogHeader>
                <Form {...form}>
                <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
                    <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem><FormLabel>Organization Name</FormLabel><FormControl><Input {...field} placeholder="e.g., Acme Corp" /></FormControl><FormMessage /></FormItem>
                    )}/>
                    <FormField control={form.control} name="contactPerson" render={({ field }) => (
                    <FormItem><FormLabel>Contact Person</FormLabel><FormControl><Input {...field} placeholder="e.g., Jane Doe" /></FormControl><FormMessage /></FormItem>
                    )}/>
                    <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} placeholder="e.g., contact@acme.com" /></FormControl><FormMessage /></FormItem>
                    )}/>
                    <FormField control={form.control} name="address" render={({ field }) => (
                    <FormItem><FormLabel>Address</FormLabel><FormControl><Textarea {...field} placeholder="e.g., 123 Main St, Lahore, Pakistan" /></FormControl><FormMessage /></FormItem>
                    )}/>
                    <FormField control={form.control} name="phoneNumber" render={({ field }) => (
                    <FormItem><FormLabel>Mobile Number</FormLabel><FormControl><Input type="tel" {...field} placeholder="e.g., 03001234567" /></FormControl><FormMessage /></FormItem>
                    )}/>
                    <FormDialogFooter className="pt-4">
                        <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                        <Button type="submit" disabled={form.formState.isSubmitting}>
                            {form.formState.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            {form.formState.isSubmitting ? "Saving..." : "Save Lead"}
                        </Button>
                    </FormDialogFooter>
                </form>
                </Form>
            </DialogContent>
            </Dialog>
        </div>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Platform Leads ({filteredLeads.length})</CardTitle>
          <CardDescription>Review, edit, or manage all leads.</CardDescription>
           <div className="relative mt-4">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by name, company, sales pro..."
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
                <TableHead>Organization Name</TableHead>
                <TableHead className="hidden md:table-cell">Contact Person</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="hidden sm:table-cell">Address</TableHead>
                <TableHead className="hidden md:table-cell">Mobile Number</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLeads.length > 0 ? (
                filteredLeads.map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{lead.name}</span>
                      </div>
                       {lead.corporationName && <div className="text-xs text-muted-foreground mt-0.5">Company: {lead.corporationName}</div>}
                       {lead.salesProfessionalName && <div className="text-xs text-muted-foreground mt-0.5">Sales Pro: {lead.salesProfessionalName}</div>}
                       {!lead.corporationName && !lead.salesProfessionalName && <div className="text-xs text-muted-foreground mt-0.5 italic">(General Lead)</div>}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                         <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <User className="h-3.5 w-3.5" />
                            {lead.contactPerson || "N/A"}
                         </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground space-y-0.5 whitespace-pre-wrap">
                        {lead.email || "N/A"}
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                           <MapPin className="h-3.5 w-3.5 text-green-600" />
                           {lead.address || "N/A"}
                        </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                           <Phone className="h-3.5 w-3.5" />
                           {lead.phoneNumber || "N/A"}
                        </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                           <DropdownMenuItem onClick={() => openEditForm(lead)}>
                            <Edit className="mr-2 h-4 w-4" /> Edit Lead
                          </DropdownMenuItem>
                           <DropdownMenuSeparator/>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  <span>Hide Lead</span>
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action will hide this lead from general view. It will not permanently delete it from the system unless explicitly purged by a super admin. Are you sure you want to hide the lead for "{lead.name}"?
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleSoftDeleteLead(lead.id, lead.name)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Hide Lead
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    No leads found. Add leads using the button above.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

    