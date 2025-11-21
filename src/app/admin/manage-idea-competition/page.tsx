
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Lightbulb, Award, DollarSign, Search, Filter, CheckCircle, Star, Trophy, Loader2, Save, Calendar as CalendarIcon, PlusCircle, MoreHorizontal, Edit, Trash2, Eye, EyeOff, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebaseConfig';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, serverTimestamp, Timestamp, addDoc, deleteDoc } from 'firebase/firestore';
import { format, isPast } from 'date-fns';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface Competition {
  id: string;
  title: string;
  description: string;
  rules: string;
  prizeDescription: string;
  winAmount?: string;
  sponsorshipAmount?: string;
  startDate?: Timestamp;
  endDate?: Timestamp;
  status: 'draft' | 'published' | 'archived';
  isAccepting: boolean;
  createdAt: Timestamp;
}

const competitionFormSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters long."),
  description: z.string().min(20, "Description must be at least 20 characters long."),
  rules: z.string().min(20, "Rules must be at least 20 characters long."),
  prizeDescription: z.string().min(10, "Prize description is required."),
  winAmount: z.string().optional(),
  sponsorshipAmount: z.string().optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
}).refine(data => !data.endDate || !data.startDate || data.endDate > data.startDate, {
  message: "End date must be after the start date.",
  path: ["endDate"],
});

type CompetitionFormValues = z.infer<typeof competitionFormSchema>;

export default function ManageIdeaCompetitionPage() {
    const { currentUser: adminUser, loading: authLoading } = useAuth();
    const [competitions, setCompetitions] = useState<Competition[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingCompetition, setEditingCompetition] = useState<Competition | null>(null);

    const form = useForm<CompetitionFormValues>({
        resolver: zodResolver(competitionFormSchema),
    });

    useEffect(() => {
        if (authLoading || !adminUser || adminUser.type !== 'admin' || !db) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);

        const competitionsRef = collection(db, "ideaCompetitions");
        const q = query(competitionsRef, orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedCompetitions: Competition[] = [];
            snapshot.forEach(doc => fetchedCompetitions.push({ id: doc.id, ...doc.data() } as Competition));
            setCompetitions(fetchedCompetitions);
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching competitions:", error);
            toast({ title: "Error", description: "Could not load competitions.", variant: "destructive" });
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [adminUser, authLoading, toast]);

    const handleOpenForm = (competition: Competition | null = null) => {
        setEditingCompetition(competition);
        if (competition) {
            form.reset({
                title: competition.title,
                description: competition.description,
                rules: competition.rules,
                prizeDescription: competition.prizeDescription,
                winAmount: competition.winAmount || "",
                sponsorshipAmount: competition.sponsorshipAmount || "",
                startDate: competition.startDate ? competition.startDate.toDate() : undefined,
                endDate: competition.endDate ? competition.endDate.toDate() : undefined,
            });
        } else {
            form.reset({ title: "", description: "", rules: "", prizeDescription: "", winAmount: "", sponsorshipAmount: "", startDate: undefined, endDate: undefined });
        }
        setIsFormOpen(true);
    };

    const handleFormSubmit = async (values: CompetitionFormValues) => {
        if (!db) return;
        
        const competitionData = {
            ...values,
            startDate: values.startDate ? Timestamp.fromDate(values.startDate) : null,
            endDate: values.endDate ? Timestamp.fromDate(values.endDate) : null,
        };

        try {
            if (editingCompetition) {
                const docRef = doc(db, "ideaCompetitions", editingCompetition.id);
                await updateDoc(docRef, { ...competitionData, updatedAt: serverTimestamp() });
                toast({ title: "Competition Updated", description: "The competition details have been saved." });
            } else {
                await addDoc(collection(db, "ideaCompetitions"), { 
                    ...competitionData, 
                    status: 'draft', 
                    isAccepting: true, // Default to accepting submissions
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp()
                });
                toast({ title: "Competition Created", description: "The new competition has been saved as a draft." });
            }
            setIsFormOpen(false);
        } catch (error) {
            console.error("Error saving competition:", error);
            toast({ title: "Save Error", description: "Could not save competition details.", variant: "destructive" });
        }
    };
    
    const handleUpdateStatus = async (id: string, newStatus: Competition['status']) => {
      const docRef = doc(db, "ideaCompetitions", id);
      try {
        await updateDoc(docRef, { status: newStatus, updatedAt: serverTimestamp() });
        toast({ title: "Status Updated", description: `Competition is now ${newStatus}.` });
      } catch (error) {
        toast({ title: "Error", description: "Could not update status.", variant: "destructive" });
      }
    };

    const handleDelete = async (id: string) => {
        const docRef = doc(db, "ideaCompetitions", id);
        try {
            await deleteDoc(docRef);
            toast({ title: "Competition Deleted", description: "The competition has been permanently removed." });
        } catch (error) {
            toast({ title: "Error", description: "Could not delete competition.", variant: "destructive" });
        }
    }
    
    const handleToggleAccepting = async (id: string, currentStatus: boolean) => {
        const docRef = doc(db, "ideaCompetitions", id);
        try {
            await updateDoc(docRef, { isAccepting: !currentStatus, updatedAt: serverTimestamp() });
            toast({ title: "Submissions Toggled", description: `Competition is now ${!currentStatus ? 'accepting' : 'not accepting'} submissions.` });
        } catch (error) {
            toast({ title: "Error", description: "Could not toggle submission status.", variant: "destructive"});
        }
    };

    const getStatusBadgeVariant = (status: Competition['status'], endDate?: Timestamp) => {
        if (status === 'published' && endDate && isPast(endDate.toDate())) {
            return { variant: 'destructive', text: 'Closed (Ended)' };
        }
        switch (status) {
            case 'draft': return { variant: 'secondary', text: 'Draft' };
            case 'published': return { variant: 'default', text: 'Published' };
            case 'archived': return { variant: 'outline', text: 'Archived' };
            default: return { variant: 'outline', text: status };
        }
    };

    return (
        <div className="container mx-auto py-8 px-4 md:px-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center">
                        <Trophy className="mr-3 h-8 w-8 text-primary" /> Manage Idea Competitions
                    </h1>
                    <p className="text-muted-foreground">Create, publish, and manage all idea competitions.</p>
                </div>
                 <Button onClick={() => handleOpenForm(null)}><PlusCircle className="mr-2 h-4 w-4" /> Create New Competition</Button>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle>All Competitions</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Title</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Submissions</TableHead>
                                <TableHead>Start Date</TableHead>
                                <TableHead>End Date</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow><TableCell colSpan={6} className="text-center h-24">Loading competitions...</TableCell></TableRow>
                            ) : competitions.length > 0 ? (
                                competitions.map(comp => {
                                    const { variant, text } = getStatusBadgeVariant(comp.status, comp.endDate);
                                    return (
                                        <TableRow key={comp.id}>
                                            <TableCell className="font-medium">{comp.title}</TableCell>
                                            <TableCell><Badge variant={variant as any}>{text}</Badge></TableCell>
                                             <TableCell>
                                                <Badge variant={comp.isAccepting ? 'default' : 'destructive'} className={comp.isAccepting ? 'bg-green-600' : ''}>
                                                    {comp.isAccepting ? 'Open' : 'Closed'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>{comp.startDate ? format(comp.startDate.toDate(), 'dd MMM yyyy') : 'Not set'}</TableCell>
                                            <TableCell>{comp.endDate ? format(comp.endDate.toDate(), 'dd MMM yyyy') : 'Not set'}</TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => handleOpenForm(comp)}><Edit className="mr-2 h-4 w-4" />Edit Details</DropdownMenuItem>
                                                         <DropdownMenuItem onClick={() => handleToggleAccepting(comp.id, comp.isAccepting)}>
                                                            {comp.isAccepting ? <XCircle className="mr-2 h-4 w-4 text-orange-600"/> : <CheckCircle className="mr-2 h-4 w-4 text-green-600"/>}
                                                            {comp.isAccepting ? 'Stop Submissions' : 'Accept Submissions'}
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        {comp.status === 'draft' && <DropdownMenuItem onClick={() => handleUpdateStatus(comp.id, 'published')}><Eye className="mr-2 h-4 w-4 text-green-600"/>Publish</DropdownMenuItem>}
                                                        {comp.status === 'published' && <DropdownMenuItem onClick={() => handleUpdateStatus(comp.id, 'archived')}><EyeOff className="mr-2 h-4 w-4 text-orange-600"/>Archive</DropdownMenuItem>}
                                                        {comp.status === 'archived' && <DropdownMenuItem onClick={() => handleUpdateStatus(comp.id, 'draft')}><Edit className="mr-2 h-4 w-4"/>Move to Drafts</DropdownMenuItem>}
                                                        <DropdownMenuSeparator />
                                                        <AlertDialog>
                                                            <AlertDialogTrigger asChild><DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive focus:bg-destructive/10"><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem></AlertDialogTrigger>
                                                            <AlertDialogContent>
                                                                <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete "{comp.title}" and all its submissions. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                                                                <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(comp.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter>
                                                            </AlertDialogContent>
                                                        </AlertDialog>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            ) : (
                               <TableRow><TableCell colSpan={6} className="text-center h-24">No competitions created yet. Start by creating one!</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                 <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>{editingCompetition ? 'Edit Competition' : 'Create New Competition'}</DialogTitle>
                        <DialogDescription>Fill in the details below. You can publish it from the main list later.</DialogDescription>
                    </DialogHeader>
                     <div className="flex-grow overflow-hidden">
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(handleFormSubmit)} id="competition-form" className="space-y-4 py-4 pr-4 h-full overflow-y-auto">
                                <FormField control={form.control} name="title" render={({ field }) => (
                                    <FormItem><FormLabel>Competition Title</FormLabel><FormControl><Input placeholder="e.g., Summer Innovation Challenge 2024" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField control={form.control} name="description" render={({ field }) => (
                                    <FormItem><FormLabel>Short Description</FormLabel><FormControl><Textarea placeholder="A brief, engaging summary of the competition." {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField control={form.control} name="prizeDescription" render={({ field }) => (
                                    <FormItem><FormLabel>Prize Details</FormLabel><FormControl><Input placeholder="e.g., PKR 100,000 Cash or 1 Year Sponsorship" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                     <FormField control={form.control} name="winAmount" render={({ field }) => (
                                        <FormItem><FormLabel>Win Amount (for Reward)</FormLabel><FormControl><Input placeholder="e.g., 100,000" {...field} /></FormControl><FormMessage /></FormItem>
                                    )}/>
                                     <FormField control={form.control} name="sponsorshipAmount" render={({ field }) => (
                                        <FormItem><FormLabel>Sponsorship Amount (for Education)</FormLabel><FormControl><Input placeholder="e.g., 1,000,000" {...field} /></FormControl><FormMessage /></FormItem>
                                    )}/>
                                </div>
                                <FormField control={form.control} name="rules" render={({ field }) => (
                                    <FormItem><FormLabel>Guidelines & Rules</FormLabel><FormControl><Textarea placeholder="Explain the rules, eligibility, and judging criteria." {...field} rows={6} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                     <FormField control={form.control} name="startDate" render={({ field }) => (
                                        <FormItem className="flex flex-col"><FormLabel>Start Date (Optional)</FormLabel>
                                            <Popover><PopoverTrigger asChild><FormControl>
                                                <Button variant="outline" className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                                    {field.value ? format(field.value, "PPP") : <span>Pick a start date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50"/>
                                                </Button>
                                            </FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} /></PopoverContent></Popover>
                                        <FormMessage /></FormItem>
                                    )}/>
                                     <FormField control={form.control} name="endDate" render={({ field }) => (
                                        <FormItem className="flex flex-col"><FormLabel>End Date (Optional)</FormLabel>
                                            <Popover><PopoverTrigger asChild><FormControl>
                                                <Button variant="outline" className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                                    {field.value ? format(field.value, "PPP") : <span>Pick an end date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50"/>
                                                </Button>
                                            </FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={{ before: form.getValues("startDate") || new Date() }} /></PopoverContent></Popover>
                                        <FormMessage /></FormItem>
                                    )}/>
                                </div>
                            </form>
                        </Form>
                     </div>
                    <DialogFooter className="border-t pt-4">
                        <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                        <Button type="submit" form="competition-form" disabled={form.formState.isSubmitting}>
                             {form.formState.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4"/>}
                            {editingCompetition ? 'Save Changes' : 'Create Competition'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
