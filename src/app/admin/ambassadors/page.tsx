
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { db } from '@/lib/firebaseConfig';
import { collection, onSnapshot, query, orderBy, addDoc, serverTimestamp, doc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore'; // Added Timestamp
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import { Users, PlusCircle, Search, MoreHorizontal, Edit, Trash2, Loader2, Copy, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Ambassador {
  id: string; // Firestore document ID
  name: string;
  phoneNumber?: string;
  referralCode: string;
  instituteName: string;
  referralCount: number; // This is now calculated
  createdAt: any; // Firestore Timestamp
  referredUsers?: Array<{ email: string; referredAt: Timestamp }>; // New field
}

const formSchema = z.object({
  name: z.string().min(2, "Name is required."),
  instituteName: z.string().min(3, "Institute name is required."),
  phoneNumber: z.string().optional().refine(val => !val || /^(\+92|0)?3\d{2}(-|\s)?\d{7}$/.test(val), {
    message: "Enter a valid Pakistani mobile number or leave blank.",
  }),
});
type AmbassadorFormValues = z.infer<typeof formSchema>;

const generateReferralCode = () => {
    return Math.random().toString(36).substring(2, 7).toUpperCase();
};

export default function AdminAmbassadorsPage() {
    const [ambassadors, setAmbassadors] = useState<Ambassador[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingAmbassador, setEditingAmbassador] = useState<Ambassador | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const { toast } = useToast();

    const [isReferredUsersDialogOpen, setIsReferredUsersDialogOpen] = useState(false);
    const [selectedAmbassadorForDialog, setSelectedAmbassadorForDialog] = useState<Ambassador | null>(null);


    const form = useForm<AmbassadorFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: { name: "", instituteName: "", phoneNumber: "" },
    });

    useEffect(() => {
        if (!db) {
            toast({ title: "Database Error", description: "Firestore is not available.", variant: "destructive" });
            setIsLoading(false);
            return;
        }
        const ambassadorsQuery = query(collection(db, "ambassadors"), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(ambassadorsQuery, (snapshot) => {
            const fetchedAmbassadors: Ambassador[] = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                fetchedAmbassadors.push({ 
                    id: doc.id,
                    ...data,
                    referralCount: data.referredUsers?.length || 0,
                } as Ambassador);
            });
            setAmbassadors(fetchedAmbassadors);
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching ambassadors:", error);
            toast({ title: "Fetch Error", description: "Could not load ambassadors.", variant: "destructive" });
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, [toast]);

    const filteredAmbassadors = useMemo(() => {
        return ambassadors.filter(ambassador =>
            ambassador.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            ambassador.instituteName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            ambassador.referralCode.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [ambassadors, searchTerm]);

    const handleFormSubmit = async (values: AmbassadorFormValues) => {
        if (!db) return;
        form.formState.isSubmitting;

        try {
            if (editingAmbassador) {
                const ambassadorDocRef = doc(db, "ambassadors", editingAmbassador.id);
                await updateDoc(ambassadorDocRef, { ...values, updatedAt: serverTimestamp() });
                toast({ title: "Ambassador Updated", description: `Details for ${values.name} updated.` });
            } else {
                const newReferralCode = generateReferralCode();
                await addDoc(collection(db, "ambassadors"), {
                    ...values,
                    referralCode: newReferralCode,
                    referredUsers: [],
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp()
                });
                toast({ title: "Ambassador Added", description: `${values.name} has been added with code ${newReferralCode}.` });
            }
            setIsFormOpen(false);
        } catch (error) {
            console.error("Error saving ambassador:", error);
            toast({ title: "Save Error", description: "Could not save ambassador details.", variant: "destructive"});
        }
    };
    
    const handleDeleteAmbassador = async (ambassadorId: string, ambassadorName: string) => {
        if (!db) return;
        const ambassadorDocRef = doc(db, "ambassadors", ambassadorId);
        try {
            await deleteDoc(ambassadorDocRef);
            toast({ title: "Ambassador Deleted", description: `${ambassadorName} has been removed.` });
        } catch (error) {
            console.error("Error deleting ambassador:", error);
            toast({ title: "Delete Error", description: "Could not delete ambassador.", variant: "destructive"});
        }
    };

    const openEditDialog = (ambassador: Ambassador) => {
        setEditingAmbassador(ambassador);
        form.reset({ name: ambassador.name, instituteName: ambassador.instituteName, phoneNumber: ambassador.phoneNumber || "" });
        setIsFormOpen(true);
    };

    const openNewDialog = () => {
        setEditingAmbassador(null);
        form.reset({ name: "", instituteName: "", phoneNumber: "" });
        setIsFormOpen(true);
    };

    const openReferredUsersDialog = (ambassador: Ambassador) => {
        setSelectedAmbassadorForDialog(ambassador);
        setIsReferredUsersDialogOpen(true);
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text).then(() => {
            toast({ title: "Copied!", description: `Code ${text} copied to clipboard.` });
        }).catch(err => {
            console.error('Failed to copy: ', err);
            toast({ title: "Copy Failed", variant: "destructive" });
        });
    };

    if (isLoading) {
        return <div className="container mx-auto py-8 px-4 md:px-6 text-center">Loading ambassadors...</div>;
    }

    return (
        <div className="container mx-auto py-8 px-4 md:px-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center"><Users className="mr-3 h-8 w-8 text-primary"/>Manage Ambassadors</h1>
                    <p className="text-muted-foreground">Add, edit, and track campus ambassadors.</p>
                </div>
                <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={openNewDialog}><PlusCircle className="mr-2 h-4 w-4" /> Add Ambassador</Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>{editingAmbassador ? "Edit Ambassador" : "Add New Ambassador"}</DialogTitle>
                            <DialogDescription>Enter the details for the ambassador.</DialogDescription>
                        </DialogHeader>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 py-2">
                                <FormField control={form.control} name="name" render={({ field }) => (
                                    <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input placeholder="Ambassador's full name" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField control={form.control} name="instituteName" render={({ field }) => (
                                    <FormItem><FormLabel>Institute Name</FormLabel><FormControl><Input placeholder="e.g., NUST, LUMS, FAST" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField control={form.control} name="phoneNumber" render={({ field }) => (
                                    <FormItem><FormLabel>Phone Number (Optional)</FormLabel><FormControl><Input placeholder="03XX-XXXXXXX" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <DialogFooter className="pt-4">
                                    <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                                    <Button type="submit" disabled={form.formState.isSubmitting}>
                                        {form.formState.isSubmitting ? <Loader2 className="h-4 w-4 animate-spin"/> : null}
                                        {editingAmbassador ? "Save Changes" : "Add Ambassador"}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </Form>
                    </DialogContent>
                </Dialog>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle>Ambassador List ({filteredAmbassadors.length})</CardTitle>
                    <CardDescription>A list of all campus ambassadors in the program.</CardDescription>
                    <div className="relative mt-4">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input type="search" placeholder="Search by name, institute, code..." className="pl-8 w-full md:w-1/2 lg:w-1/3" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Institute</TableHead>
                                <TableHead>Phone Number</TableHead>
                                <TableHead>Referral Code</TableHead>
                                <TableHead className="text-center">Referrals</TableHead>
                                <TableHead className="hidden lg:table-cell">Date Added</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredAmbassadors.length > 0 ? (
                                filteredAmbassadors.map((ambassador) => (
                                    <TableRow key={ambassador.id}>
                                        <TableCell className="font-medium">{ambassador.name}</TableCell>
                                        <TableCell>{ambassador.instituteName}</TableCell>
                                        <TableCell>{ambassador.phoneNumber || 'N/A'}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2 font-mono text-primary">
                                                <span>{ambassador.referralCode}</span>
                                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(ambassador.referralCode)}>
                                                    <Copy className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Button
                                                variant="link"
                                                size="sm"
                                                className="font-semibold p-0 h-auto"
                                                onClick={() => openReferredUsersDialog(ambassador)}
                                                disabled={!ambassador.referralCount || ambassador.referralCount === 0}
                                            >
                                                {ambassador.referralCount}
                                            </Button>
                                        </TableCell>
                                        <TableCell className="hidden lg:table-cell">
                                            {ambassador.createdAt ? format(ambassador.createdAt.toDate(), 'dd MMM, yyyy') : 'N/A'}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => openReferredUsersDialog(ambassador)} disabled={!ambassador.referralCount || ambassador.referralCount === 0}>
                                                        <Eye className="mr-2 h-4 w-4" />View Progress
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => openEditDialog(ambassador)}><Edit className="mr-2 h-4 w-4" />Edit</DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive focus:bg-destructive/10"><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                                <AlertDialogDescription>This will permanently delete {ambassador.name} from the ambassador list.</AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                <AlertDialogAction onClick={() => handleDeleteAmbassador(ambassador.id, ambassador.name)} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">Delete</AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow><TableCell colSpan={7} className="h-24 text-center">No ambassadors found.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={isReferredUsersDialogOpen} onOpenChange={setIsReferredUsersDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Users Referred by {selectedAmbassadorForDialog?.name}</DialogTitle>
                        <DialogDescription>
                            A list of user emails who signed up using this ambassador's referral code.
                        </DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="max-h-[400px] mt-4">
                        {(selectedAmbassadorForDialog?.referredUsers && selectedAmbassadorForDialog.referredUsers.length > 0) ? (
                            <ul className="space-y-2 pr-4">
                                {selectedAmbassadorForDialog.referredUsers.map((referral, index) => (
                                    <li key={index} className="flex justify-between items-center text-sm p-2 border rounded-md">
                                        <span>{referral.email}</span>
                                        <span className="text-xs text-muted-foreground">
                                            {referral.referredAt ? format(referral.referredAt.toDate(), 'dd MMM, yyyy') : 'N/A'}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-sm text-muted-foreground text-center py-4">No users have been referred by this ambassador yet.</p>
                        )}
                    </ScrollArea>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button type="button" variant="outline">Close</Button>
                        </DialogClose>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
