
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { MailQuestion, Search, Eye, Edit, Trash2, Filter, Info, UserCircle, Server, Lightbulb, CheckCircle, Clock, Copy as CopyIcon, MessageSquare as MessageSquareIcon, CalendarClock, MoreHorizontal, Phone, Laptop, Calendar as CalendarIcon, Save } from 'lucide-react';
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
import { collection, query, orderBy, onSnapshot, doc, updateDoc, serverTimestamp, Timestamp, deleteDoc, getDoc, setDoc, FieldValue } from 'firebase/firestore';
import type { Inquiry, InquiryType, InquiryStatus } from '@/app/auth/components/auth-shared-types';
import type { AppointmentType } from '@/app/contact/page';
import { format, startOfDay } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger as AlertTrigger } from '@/components/ui/alert-dialog';
import { Calendar } from '@/components/ui/calendar';

interface Appointment {
  id: string;
  name: string;
  phoneNumber: string;
  appointmentType: AppointmentType;
  appointmentDate?: Timestamp;
  createdAt: Timestamp;
  status: 'Pending' | 'Completed' | 'Cancelled';
}

const inquiryStatusOptions: InquiryStatus[] = ["New", "In Progress", "Resolved", "Closed"];
const inquiryTypeOptions: InquiryType[] = ["general_query", "corporation_account_request", "investor_account_request"];
const appointmentStatusOptions: Appointment['status'][] = ["Pending", "Completed", "Cancelled"];

export default function AdminManageInquiriesPage() {
  const { currentUser: adminUser, loading: authLoading } = useAuth();
  const [allInquiries, setAllInquiries] = useState<Inquiry[]>([]);
  const [allAppointments, setAllAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<InquiryStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<InquiryType | 'all'>('all');
  const { toast } = useToast();

  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [adminNote, setAdminNote] = useState('');
  const [newStatusForUpdate, setNewStatusForUpdate] = useState<InquiryStatus | undefined>(undefined);

  const [disabledDates, setDisabledDates] = useState<Date[]>([]);
  const [bookedDates, setBookedDates] = useState<Date[]>([]);
  const [isSavingDisabledDates, setIsSavingDisabledDates] = useState(false);

  useEffect(() => {
    if (authLoading || !adminUser || adminUser.type !== 'admin' || !db) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    let unsubInquiries: () => void;
    let unsubAppointments: () => void;
    let unsubBookingSettings: () => void;

    // Inquiries Listener
    const inquiriesRef = collection(db, "inquiries");
    const qInquiries = query(inquiriesRef, orderBy("createdAt", "desc"));
    unsubInquiries = onSnapshot(qInquiries, (querySnapshot) => {
      const fetchedInquiries: Inquiry[] = [];
      querySnapshot.forEach((docSnap) => {
        if (!docSnap.data().isDeletedByAdmin) {
          fetchedInquiries.push({ id: docSnap.id, ...docSnap.data() } as Inquiry);
        }
      });
      setAllInquiries(fetchedInquiries);
    }, (error) => {
      console.error("Error fetching inquiries:", error);
      toast({ title: "Error", description: "Could not fetch inquiries.", variant: "destructive" });
    });

    // Appointments Listener
    const appointmentsRef = collection(db, "appointments");
    const qAppointments = query(appointmentsRef, orderBy("createdAt", "desc"));
    unsubAppointments = onSnapshot(qAppointments, (querySnapshot) => {
        const fetchedAppointments: Appointment[] = [];
        const newBookedDates: Date[] = [];
        querySnapshot.forEach((docSnap) => {
            const appointment = { id: docSnap.id, ...docSnap.data()} as Appointment;
            fetchedAppointments.push(appointment);
            if(appointment.appointmentDate) {
                newBookedDates.push(startOfDay(appointment.appointmentDate.toDate()));
            }
        });
        setAllAppointments(fetchedAppointments);
        setBookedDates(newBookedDates);
    }, (error) => {
        console.error("Error fetching appointments:", error);
        toast({ title: "Error", description: "Could not fetch appointments.", variant: "destructive"});
    });
    
    // Booking Settings Listener (for disabled dates)
    const bookingSettingsRef = doc(db, "siteContent", "bookingSettings");
    unsubBookingSettings = onSnapshot(bookingSettingsRef, (docSnap) => {
        if(docSnap.exists()){
            const data = docSnap.data();
            const dates: string[] = data.disabledDates || [];
            setDisabledDates(dates.map(d => new Date(d)));
        } else {
            setDisabledDates([]);
        }
    }, (error) => {
        console.error("Error fetching booking settings:", error);
    });

    setIsLoading(false);

    return () => {
      if (unsubInquiries) unsubInquiries();
      if (unsubAppointments) unsubAppointments();
      if (unsubBookingSettings) unsubBookingSettings();
    };
  }, [adminUser, authLoading, toast]);
  
  const handleUpdateAppointmentStatus = async (appointmentId: string, newStatus: Appointment['status']) => {
    if (!db) return;
    try {
        await updateDoc(doc(db, "appointments", appointmentId), { status: newStatus });
        toast({ title: "Appointment Updated", description: `Status changed to ${newStatus}`});
    } catch(e) {
        toast({title: "Error", description: "Could not update appointment status.", variant: "destructive"});
    }
  };

  const handleDeleteAppointment = async (appointmentId: string, appointmentName: string) => {
    if (!db) return;
    try {
        await deleteDoc(doc(db, "appointments", appointmentId));
        toast({ title: "Appointment Deleted", description: `Appointment for ${appointmentName} has been permanently removed.`});
    } catch (e) {
        toast({title: "Error", description: "Could not delete appointment.", variant: "destructive"});
    }
  };

  const handleSaveDisabledDates = async () => {
    if(!db) return;
    setIsSavingDisabledDates(true);
    const bookingSettingsRef = doc(db, "siteContent", "bookingSettings");
    try {
        // Convert dates to YYYY-MM-DD strings for consistent storage
        const dateStrings = disabledDates.map(d => d.toISOString().split('T')[0]);
        await setDoc(bookingSettingsRef, { disabledDates: dateStrings }, { merge: true });
        toast({ title: "Availability Updated", description: "Your booking availability has been saved."});
    } catch (error) {
        console.error("Error saving disabled dates:", error);
        toast({title: "Save Failed", description: "Could not save your availability settings.", variant: "destructive"});
    } finally {
        setIsSavingDisabledDates(false);
    }
  };


  const filteredInquiries = useMemo(() => {
    return allInquiries.filter(c => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        (c.id?.toLowerCase().includes(searchLower)) ||
        (c.subject && c.subject.toLowerCase().includes(searchLower)) ||
        (c.name.toLowerCase().includes(searchLower)) ||
        (c.email.toLowerCase().includes(searchLower)) ||
        (c.message.toLowerCase().includes(searchLower));
      const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
      const matchesType = typeFilter === 'all' || c.inquiryType === typeFilter;
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [allInquiries, searchTerm, statusFilter, typeFilter]);

  const handleViewDetails = (inquiry: Inquiry) => {
    setSelectedInquiry(inquiry);
    setNewStatusForUpdate(inquiry.status); 
    setAdminNote('');
    setIsDetailDialogOpen(true);
  };

  const handleUpdateInquiry = async () => {
    if (!selectedInquiry || !selectedInquiry.id || !newStatusForUpdate || !db || !adminUser || !adminUser.uid) {
      toast({ title: "Error", description: "Cannot update inquiry.", variant: "destructive" });
      return;
    }
    const inquiryDocRef = doc(db, "inquiries", selectedInquiry.id);
    const updatePayload: { [key: string]: any } = { 
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
      updatePayload.adminNotes = [...(selectedInquiry.adminNotes || []), noteEntry];
    }

    try {
      await updateDoc(inquiryDocRef, updatePayload);
      toast({ title: "Inquiry Updated", description: `Inquiry ${selectedInquiry.id.substring(0,8)}... status set to ${newStatusForUpdate}.` });
      setIsDetailDialogOpen(false);
    } catch (error) {
      console.error("Error updating inquiry:", error);
      toast({ title: "Update Failed", description: "Could not update inquiry.", variant: "destructive" });
    }
  };
  
  const handleSoftDelete = async (inquiryId: string, inquirySubject?: string) => {
    if (!db) return;
    const inquiryDocRef = doc(db, "inquiries", inquiryId);
    try {
        await updateDoc(inquiryDocRef, { isDeletedByAdmin: true, status: "Closed", updatedAt: serverTimestamp() });
        toast({ title: "Inquiry Hidden", description: `Inquiry "${inquirySubject || inquiryId.substring(0,8)}" hidden.`});
    } catch (error) {
        console.error("Error soft deleting inquiry:", error);
        toast({ title: "Error", description: "Could not hide inquiry.", variant: "destructive"});
    }
  };


  const getInquiryTypeIcon = (type: InquiryType) => {
    switch (type) {
      case 'corporation_account_request': return <UserCircle className="h-4 w-4 mr-1.5 text-purple-600" />;
      case 'investor_account_request': return <Server className="h-4 w-4 mr-1.5 text-blue-600" />;
      case 'general_query': return <MessageSquareIcon className="h-4 w-4 mr-1.5 text-green-600" />;
      default: return <Info className="h-4 w-4 mr-1.5" />;
    }
  };
  
  const getAppointmentTypeIcon = (type: AppointmentType) => {
    switch(type) {
      case 'call': return <Phone className="h-4 w-4 mr-2" />;
      case 'online': return <Laptop className="h-4 w-4 mr-2" />;
      default: return <Info className="h-4 w-4 mr-2" />;
    }
  };

  const getStatusBadgeVariant = (status: InquiryStatus | Appointment['status']): "default" | "secondary" | "outline" | "destructive" => {
    switch (status) {
      case 'New':
      case 'Pending':
        return "outline";
      case 'In Progress':
        return "secondary";
      case 'Resolved':
      case 'Completed':
        return "default"; 
      case 'Closed':
      case 'Cancelled':
        return "destructive";
      default: return "outline";
    }
  };
  
  const copyToClipboard = (text: string, id?: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({ title: "Copied!", description: `ID ${id ? id.substring(0,8) + '...' : ''} copied to clipboard.` });
    }).catch(err => {
      console.error('Failed to copy: ', err);
      toast({ title: "Copy Failed", description: "Could not copy ID to clipboard.", variant: "destructive" });
    });
  };


  if (isLoading || authLoading) {
    return <div className="container mx-auto py-8 px-4 md:px-6 text-center">Loading inquiries management...</div>;
  }
  if (!adminUser || adminUser.type !== 'admin') {
    return <div className="container mx-auto py-8 px-4 md:px-6 text-center">Admin access required.</div>;
  }

  return (
    <div className="container mx-auto py-8 px-4 md:px-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center">
          <MailQuestion className="mr-3 h-8 w-8 text-primary" /> Manage Inquiries & Appointments
        </h1>
        <p className="text-muted-foreground">Review, update status, and manage inquiries and appointments.</p>
      </div>
      
      <Card className="shadow-lg rounded-xl">
        <CardHeader>
            <CardTitle>Appointment Calendar Management</CardTitle>
            <CardDescription>View booked dates and disable specific dates for new appointments. Click a date to select/deselect it for disabling.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col md:flex-row gap-6 items-start">
             <Calendar
                mode="multiple"
                selected={disabledDates}
                onSelect={(dates) => setDisabledDates(dates || [])}
                disabled={[{ before: new Date() }, ...bookedDates]}
                modifiers={{ booked: bookedDates }}
                modifiersStyles={{
                    booked: { color: 'red', textDecoration: 'line-through', opacity: 0.6 },
                    disabled: { opacity: 0.4 }
                }}
                className="rounded-md border"
             />
             <div className="flex-grow space-y-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground"><div className="w-4 h-4 rounded-full bg-primary/20 border border-primary"></div><span>Selected for Disabling</span></div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground"><div className="w-4 h-4 rounded-full bg-red-500/80 opacity-60"></div><span>Booked Dates (Cannot be changed)</span></div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground"><div className="w-4 h-4 rounded-full bg-muted-foreground/40"></div><span>Past/Unavailable</span></div>
                <Button onClick={handleSaveDisabledDates} disabled={isSavingDisabledDates} className="w-full">
                  <Save className="mr-2 h-4 w-4"/>
                  {isSavingDisabledDates ? "Saving..." : "Save Availability"}
                </Button>
             </div>
        </CardContent>
      </Card>

      <Card className="shadow-lg rounded-xl">
        <CardHeader>
          <CardTitle>Appointments ({allAppointments.length})</CardTitle>
          <CardDescription>Appointments booked via the Contact Us page.</CardDescription>
        </CardHeader>
        <CardContent>
           <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Appointment Type</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allAppointments.length > 0 ? (
                allAppointments.map((appt) => (
                  <TableRow key={appt.id}>
                    <TableCell>{appt.name}</TableCell>
                    <TableCell>{appt.phoneNumber}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs whitespace-nowrap flex items-center">
                        {getAppointmentTypeIcon(appt.appointmentType)}
                        {appt.appointmentType.charAt(0).toUpperCase() + appt.appointmentType.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>{appt.appointmentDate ? format(appt.appointmentDate.toDate(), "dd MMM, yyyy") : 'N/A'}</TableCell>
                    <TableCell><Badge variant={getStatusBadgeVariant(appt.status)}>{appt.status}</Badge></TableCell>
                    <TableCell className="text-right">
                       <DropdownMenu>
                         <DropdownMenuTrigger asChild>
                           <Button variant="ghost" size="icon" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                         </DropdownMenuTrigger>
                         <DropdownMenuContent align="end">
                           {appointmentStatusOptions.filter(s => s !== appt.status).map(s => (
                             <DropdownMenuItem key={s} onClick={() => handleUpdateAppointmentStatus(appt.id, s)}>
                               Mark as {s}
                             </DropdownMenuItem>
                           ))}
                           <DropdownMenuSeparator />
                            <AlertDialog>
                                <AlertTrigger asChild>
                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                                    <Trash2 className="mr-2 h-4 w-4" />Delete
                                    </DropdownMenuItem>
                                </AlertTrigger>
                                <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete the appointment for {appt.name}.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteAppointment(appt.id, appt.name)} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                                    Delete Appointment
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
                <TableRow><TableCell colSpan={6} className="h-24 text-center">No appointments booked.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <Separator />

      <Card className="shadow-lg rounded-xl">
        <CardHeader>
          <CardTitle>All Frontend Inquiries ({filteredInquiries.length})</CardTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
            <Input
              type="search"
              placeholder="Search by ID, subject, name, email..."
              className="pl-8 w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as InquiryStatus | 'all')}>
              <SelectTrigger><div className="flex items-center gap-2"><Filter className="h-4 w-4"/>Status: <SelectValue/></div></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {inquiryStatusOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as InquiryType | 'all')}>
              <SelectTrigger><div className="flex items-center gap-2"><Filter className="h-4 w-4"/>Type: <SelectValue/></div></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {inquiryTypeOptions.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, ' ').split(' ').map(s => s.charAt(0).toUpperCase() + s.substring(1)).join(' ')}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Submitter</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInquiries.length > 0 ? (
                filteredInquiries.map((inquiry) => (
                  <TableRow key={inquiry.id}>
                    <TableCell className="font-medium text-xs">
                      <div className="flex items-center gap-1">
                        <span>{inquiry.id?.substring(0, 8)}...</span>
                        <Button variant="ghost" size="icon" className="h-6 w-6 p-0" onClick={() => copyToClipboard(inquiry.id!, inquiry.id)}>
                          <CopyIcon className="h-3.5 w-3.5 text-muted-foreground hover:text-primary" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>{inquiry.name} <span className="text-xs text-muted-foreground">({inquiry.email})</span></TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs whitespace-nowrap flex items-center">
                        {getInquiryTypeIcon(inquiry.inquiryType)}
                        {inquiry.inquiryType.replace(/_/g, ' ').split(' ').map(s => s.charAt(0).toUpperCase() + s.substring(1)).join(' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="truncate max-w-xs">{inquiry.subject || "N/A"}</TableCell>
                    <TableCell>{inquiry.createdAt ? format((inquiry.createdAt as Timestamp).toDate(), "dd MMM, yy") : 'N/A'}</TableCell>
                    <TableCell><Badge variant={getStatusBadgeVariant(inquiry.status)} className="text-xs">{inquiry.status}</Badge></TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => handleViewDetails(inquiry)} className="mr-1">
                        <Eye className="mr-1.5 h-4 w-4" /> View
                      </Button>
                      <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleSoftDelete(inquiry.id!, inquiry.subject)}>
                        <Trash2 className="mr-1.5 h-4 w-4" /> Hide
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={7} className="h-24 text-center">No inquiries found.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {selectedInquiry && (
        <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Inquiry Details: {selectedInquiry.id?.substring(0,8)}...</DialogTitle>
              <DialogDescription>From: {selectedInquiry.name} ({selectedInquiry.email})</DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh] p-1">
              <div className="space-y-4 py-4">
                <div><Label>Full ID:</Label><p className="text-sm flex items-center gap-1">{selectedInquiry.id} <Button variant="ghost" size="icon" className="h-5 w-5 p-0" onClick={() => copyToClipboard(selectedInquiry.id!)}><CopyIcon className="h-3 w-3 text-muted-foreground hover:text-primary"/></Button></p></div>
                <div><Label>Inquiry Type:</Label><p className="text-sm">{selectedInquiry.inquiryType.replace(/_/g, ' ').split(' ').map(s => s.charAt(0).toUpperCase() + s.substring(1)).join(' ')}</p></div>
                {selectedInquiry.subject && <div><Label>Subject:</Label><p className="text-sm">{selectedInquiry.subject}</p></div>}
                <div><Label>Message:</Label><p className="text-sm whitespace-pre-line bg-muted/50 p-3 rounded-md">{selectedInquiry.message}</p></div>
                <div><Label>Received On:</Label><p className="text-sm">{selectedInquiry.createdAt ? format((selectedInquiry.createdAt as Timestamp).toDate(), "PPPpp") : 'N/A'}</p></div>
                <div><Label>Current Status:</Label><Badge variant={getStatusBadgeVariant(selectedInquiry.status)}>{selectedInquiry.status}</Badge></div>
                {selectedInquiry.adminNotes && selectedInquiry.adminNotes.length > 0 && (
                  <div><Label>Admin Notes:</Label>
                    <div className="space-y-2 mt-1 border p-3 rounded-md bg-muted/20 max-h-40 overflow-y-auto">
                      {selectedInquiry.adminNotes.map((note, index) => (
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
                  <Select value={newStatusForUpdate} onValueChange={(value) => setNewStatusForUpdate(value as InquiryStatus)}>
                    <SelectTrigger id="newStatus"><SelectValue /></SelectTrigger>
                    <SelectContent>{inquiryStatusOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
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
              <Button onClick={handleUpdateInquiry}>Update Inquiry</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
    