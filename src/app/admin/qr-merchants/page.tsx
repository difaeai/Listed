

"use client";

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { QrCode, Printer, PlusCircle, RefreshCw, Search, Banknote, Settings, Link as LinkIcon, MoreHorizontal, Edit, Trash2, CheckCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { QRCodeCanvas } from 'qrcode.react';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { db } from '@/lib/firebaseConfig';
import { collection, onSnapshot, query, orderBy, Timestamp, addDoc, serverTimestamp, doc, updateDoc, deleteDoc } from 'firebase/firestore'; 
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

interface MerchantData {
  id: string;
  businessName?: string;
  contactPerson?: string;
  email?: string;
  phoneNumber?: string;
  bankName?: string;
  accountNumber?: string;
  isProvisioned: boolean;
  createdAt: Timestamp;
}

const formSchema = z.object({
  businessName: z.string().min(2, "Business name is required."),
  contactPerson: z.string().min(2, "Contact person's name is required."),
  email: z.string().email("Please enter a valid email.").optional().or(z.literal('')),
  phoneNumber: z.string().optional().refine(val => !val || /^(\+92|0)?3\d{2}(-|\s)?\d{7}$/.test(val), {
    message: "Enter a valid Pakistani mobile number or leave blank.",
  }),
  bankName: z.string().min(3, "Bank Title is required."),
  accountNumber: z.string().min(8, "A valid account number is required.").regex(/^\d+$/, "IBAN / Bank Account Number must only contain digits."),
});
type MerchantFormValues = z.infer<typeof formSchema>;


export default function QrForMerchantsPage() {
  const [baseUrl, setBaseUrl] = useState<string>('');
  
  const [merchants, setMerchants] = useState<MerchantData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingMerchant, setEditingMerchant] = useState<MerchantData | null>(null);

  const form = useForm<MerchantFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { businessName: "", contactPerson: "", email: "", phoneNumber: "", bankName: "", accountNumber: "" },
  });
  
  const mockTransactions = [
    { id: 'TXN7483921', date: '2024-05-20', merchant: 'Super Store', total: 1500, commission: 13.50, net: 1486.50, status: 'Completed' },
    { id: 'TXN9210384', date: '2024-05-20', merchant: 'Book Haven', total: 750, commission: 6.75, net: 743.25, status: 'Completed' },
    { id: 'TXN5832190', date: '2024-05-19', merchant: 'Fresh Bakes', total: 2500, commission: 22.50, net: 2477.50, status: 'Completed' },
    { id: 'TXN4123567', date: '2024-05-19', merchant: 'Gadget Hub', total: 12500, commission: 112.50, net: 12387.50, status: 'Pending' }
  ];

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setBaseUrl(window.location.origin);
    }
    if (!db) {
      toast({ title: "Database Error", description: "Firestore is not available.", variant: "destructive" });
      setIsLoading(false);
      return;
    }
    const merchantsQuery = query(collection(db, "merchants"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(merchantsQuery, (querySnapshot) => {
      const fetchedMerchants: MerchantData[] = [];
      querySnapshot.forEach((doc) => {
        fetchedMerchants.push({ id: doc.id, ...doc.data() } as MerchantData);
      });
      setMerchants(fetchedMerchants);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching merchants:", error);
      toast({ title: "Fetch Error", description: "Could not load merchants.", variant: "destructive" });
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [toast]);

  const filteredMerchants = useMemo(() => {
    return merchants.filter(merchant =>
      (merchant.businessName && merchant.businessName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (merchant.contactPerson && merchant.contactPerson.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (merchant.bankName && merchant.bankName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      merchant.id.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [merchants, searchTerm]);
  
  const handleGenerateAndAddMerchant = async () => {
    if (!db) {
        toast({ title: "Database error", variant: "destructive" });
        return;
    }
    setIsAdding(true);
    try {
        await addDoc(collection(db, "merchants"), {
            isProvisioned: false,
            createdAt: serverTimestamp(),
        });
        toast({ title: "QR Code Reserved", description: "A new QR code has been generated. Click 'Onboard' to add merchant details." });
    } catch (error) {
        console.error("Error adding new merchant QR:", error);
        toast({ title: "Error", description: "Could not generate new QR.", variant: "destructive" });
    } finally {
        setIsAdding(false);
    }
  };

  const handleOpenEditDialog = (merchant: MerchantData) => {
    setEditingMerchant(merchant);
    form.reset({
      businessName: merchant.businessName || "",
      contactPerson: merchant.contactPerson || "",
      email: merchant.email || "",
      phoneNumber: merchant.phoneNumber || "",
      bankName: merchant.bankName || "",
      accountNumber: merchant.accountNumber || "",
    });
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (values: MerchantFormValues) => {
    if (!editingMerchant) return;

    const merchantDocRef = doc(db, "merchants", editingMerchant.id);
    const updatedMerchantData = {
      ...values,
      isProvisioned: true,
      updatedAt: serverTimestamp(),
    };

    try {
      await updateDoc(merchantDocRef, updatedMerchantData as any);
      toast({ title: "Merchant Details Saved", description: `${values.businessName} has been successfully saved.` });
      setIsFormOpen(false);
      setEditingMerchant(null);
    } catch (error) {
      console.error("Error updating merchant data:", error);
      toast({ title: "Save Failed", variant: "destructive" });
    }
  };

  const handleDeleteMerchant = async (merchantId: string) => {
    if (!db) return;
    const merchantDocRef = doc(db, "merchants", merchantId);
    try {
      await deleteDoc(merchantDocRef);
      toast({ title: "Merchant QR Deleted", description: "The merchant QR code has been removed from the system." });
    } catch (error) {
      console.error("Error deleting merchant:", error);
      toast({ title: "Delete Failed", variant: "destructive" });
    }
  };

  return (
    <>
      <div className="container mx-auto py-8 px-4 md:px-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center">
              <QrCode className="mr-3 h-8 w-8 text-primary" /> Merchant QR Code System
            </h1>
            <p className="text-muted-foreground">
              Generate QR codes and onboard merchants.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
              <Link href="/admin/qr-settings">
                  <Settings className="mr-2 h-4 w-4" /> QR Code Settings
              </Link>
            </Button>
            <Button onClick={handleGenerateAndAddMerchant} disabled={isAdding}>
              {isAdding ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
              {isAdding ? "Generating..." : "Generate New QR"}
            </Button>
          </div>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Generated Merchant QR Codes ({filteredMerchants.length})</CardTitle>
            <CardDescription>A list of all generated QR codes. Onboard unprovisioned codes or manage existing merchants.</CardDescription>
            <div className="relative mt-4">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search by business name, contact, ID..."
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
                  <TableHead>QR Code</TableHead>
                  <TableHead>Business Name</TableHead>
                  <TableHead className="hidden md:table-cell">Contact Person</TableHead>
                  <TableHead className="hidden md:table-cell">Contact Info (Optional)</TableHead>
                  <TableHead className="hidden lg:table-cell">Date Generated</TableHead>
                  <TableHead className="hidden lg:table-cell">Transactions</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={7} className="h-24 text-center">Loading QR codes...</TableCell></TableRow>
                ) : filteredMerchants.length > 0 ? (
                  filteredMerchants.map((merchant) => (
                    <TableRow key={merchant.id} className={!merchant.isProvisioned ? 'bg-yellow-500/10' : ''}>
                      <TableCell>
                        <button onClick={() => handleOpenEditDialog(merchant)} className="p-1 bg-white rounded-sm shadow-inner inline-block hover:scale-105 transition-transform">
                          <QRCodeCanvas
                            value={`${baseUrl}/merchant/${merchant.id}`}
                            size={64}
                            level={"H"}
                            includeMargin={true}
                          />
                        </button>
                      </TableCell>
                      <TableCell className="font-medium">
                        {merchant.isProvisioned ? merchant.businessName : 
                          <Button variant="link" className="p-0 h-auto" onClick={() => handleOpenEditDialog(merchant)}>
                            <span className="text-muted-foreground italic">Pending Onboarding...</span>
                          </Button>
                        }
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{merchant.contactPerson || "---"}</TableCell>
                      <TableCell className="hidden md:table-cell text-xs">
                          {merchant.email && <div>{merchant.email}</div>}
                          {merchant.phoneNumber && <div>{merchant.phoneNumber}</div>}
                          {!merchant.email && !merchant.phoneNumber && "---"}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {merchant.createdAt ? format(merchant.createdAt.toDate(), 'dd MMM, yyyy') : 'N/A'}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <div className="flex items-center gap-2">
                          <Banknote className="h-4 w-4 text-green-600"/>
                          <span className="font-mono">0</span>
                        </div>
                        <p className="text-xs text-muted-foreground">(Placeholder)</p>
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
                            <DropdownMenuItem onClick={() => handleOpenEditDialog(merchant)}>
                              <Edit className="mr-2 h-4 w-4" />
                              {merchant.isProvisioned ? 'Edit Details' : 'Onboard Merchant'}
                            </DropdownMenuItem>
                             <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete the QR code for "{merchant.businessName || `ID: ${merchant.id.substring(0,8)}...`}".
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteMerchant(merchant.id)} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                                    Delete
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
                  <TableRow><TableCell colSpan={7} className="h-24 text-center">No QR codes generated yet.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="mt-8">
            <CardHeader>
                <CardTitle>RAAST Payment Distribution Center</CardTitle>
                <CardDescription>
                  This center simulates the payment flow. When a customer pays, the full amount arrives at Berreto's central RAAST account. The system then automatically calculates the commission for Berreto and disburses the remaining net amount to the merchant's account.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead>Transaction ID</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Merchant</TableHead>
                    <TableHead className="text-right">Total Amount (PKR)</TableHead>
                    <TableHead className="text-right">Commission (PKR)</TableHead>
                    <TableHead className="text-right">Net Payout (PKR)</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {mockTransactions.map((tx) => (
                    <TableRow key={tx.id}>
                        <TableCell className="font-mono text-xs">{tx.id}</TableCell>
                        <TableCell>{tx.date}</TableCell>
                        <TableCell>{tx.merchant}</TableCell>
                        <TableCell className="text-right">{tx.total.toFixed(2)}</TableCell>
                        <TableCell className="text-right">{tx.commission.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-medium">{tx.net.toFixed(2)}</TableCell>
                        <TableCell className="text-center">
                        <Badge variant={tx.status === 'Completed' ? 'default' : 'secondary'} className={tx.status === 'Completed' ? 'bg-green-600 text-white' : 'bg-yellow-500 text-white'}>
                            {tx.status === 'Completed' ? <CheckCircle className="mr-1 h-3.5 w-3.5"/> : <Clock className="mr-1 h-3.5 w-3.5"/>}
                            {tx.status}
                        </Badge>
                        </TableCell>
                    </TableRow>
                    ))}
                </TableBody>
                </Table>
            </CardContent>
        </Card>

      </div>

      {/* Edit/Onboarding Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
            <DialogTitle>{editingMerchant?.isProvisioned ? 'Edit Merchant Details' : 'Onboard New Merchant'}</DialogTitle>
            <DialogDescription>
                Fill in the details for this QR code. Once saved, it will be active for payments.
            </DialogDescription>
            </DialogHeader>
            <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 py-2">
                 <FormField control={form.control} name="businessName" render={({ field }) => (
                <FormItem><FormLabel>Business Name</FormLabel><FormControl><Input placeholder="Merchant's Business Name" {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                <FormField control={form.control} name="contactPerson" render={({ field }) => (
                <FormItem><FormLabel>Contact Person</FormLabel><FormControl><Input placeholder="Full Name" {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem><FormLabel>Email (Optional)</FormLabel><FormControl><Input placeholder="For transaction notifications" {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                <FormField control={form.control} name="phoneNumber" render={({ field }) => (
                <FormItem><FormLabel>Phone Number (Optional)</FormLabel><FormControl><Input placeholder="For SMS alerts" {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                <FormField control={form.control} name="bankName" render={({ field }) => (
                <FormItem><FormLabel>Bank Title</FormLabel><FormControl><Input placeholder="e.g., Meezan Bank" {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                <FormField control={form.control} name="accountNumber" render={({ field }) => (
                <FormItem><FormLabel>IBAN / Bank Account Number</FormLabel><FormControl><Input type="text" inputMode="numeric" placeholder="Merchant's Bank Account Number" {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                <DialogFooter className="pt-4">
                    <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                    <Button type="submit" disabled={form.formState.isSubmitting}>Save Details</Button>
                </DialogFooter>
            </form>
            </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
