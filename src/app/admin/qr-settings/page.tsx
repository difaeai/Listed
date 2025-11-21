
"use client";

import React, { useState, useEffect } from 'react';
import { Settings, Save, Loader2, Percent, Mail, Phone, Building, Banknote, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebaseConfig';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import Link from 'next/link';

interface QrSettings {
  businessName: string;
  transactionFeePercentage: number;
  email?: string;
  phoneNumber?: string;
  bankName?: string;
  accountNumber?: string;
}

const settingsFormSchema = z.object({
  businessName: z.string().min(2, "Business name is required."),
  transactionFeePercentage: z.coerce.number().min(0).max(10, "Fee cannot exceed 10%."),
  email: z.string().email("Please enter a valid email.").optional().or(z.literal('')),
  phoneNumber: z.string().optional().refine(val => !val || /^(\+92|0)?3\d{2}(-|\s)?\d{7}$/.test(val), {
    message: "Enter a valid Pakistani mobile number or leave blank.",
  }),
  bankName: z.string().min(3, "Bank name is required."),
  accountNumber: z.string().min(8, "A valid account number is required.").regex(/^\d+$/, "Account number must only contain digits."),
});

type SettingsFormValues = z.infer<typeof settingsFormSchema>;

const defaultSettings: QrSettings = {
    businessName: "BERRETO",
    transactionFeePercentage: 0.9,
    email: "",
    phoneNumber: "",
    bankName: "",
    accountNumber: "",
};

export default function QrSettingsPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const { toast } = useToast();

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: {
        businessName: defaultSettings.businessName,
        transactionFeePercentage: defaultSettings.transactionFeePercentage,
        email: defaultSettings.email,
        phoneNumber: defaultSettings.phoneNumber,
        bankName: defaultSettings.bankName,
        accountNumber: defaultSettings.accountNumber,
    },
  });

  useEffect(() => {
    const fetchSettings = async () => {
      if (!db) {
        toast({ title: "Error", description: "Database not available.", variant: "destructive" });
        setIsFetching(false);
        return;
      }
      setIsFetching(true);
      try {
        const settingsDocRef = doc(db, "siteContent", "qrPaymentSettings");
        const docSnap = await getDoc(settingsDocRef);
        if (docSnap.exists()) {
          const data = docSnap.data() as QrSettings;
          form.reset(data);
        } else {
          // If doc doesn't exist, create it with default values
          await setDoc(settingsDocRef, { ...defaultSettings, updatedAt: serverTimestamp() });
          form.reset(defaultSettings);
        }
      } catch (error) {
        console.error("Error fetching QR settings:", error);
        toast({ title: "Fetch Error", description: "Could not load QR payment settings.", variant: "destructive" });
      }
      setIsFetching(false);
    };
    fetchSettings();
  }, [toast, form]);

  const onSubmit: SubmitHandler<SettingsFormValues> = async (values) => {
    if (!db) {
      toast({ title: "Error", description: "Database not available.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    const settingsDocRef = doc(db, "siteContent", "qrPaymentSettings");

    try {
      await setDoc(settingsDocRef, { ...values, updatedAt: serverTimestamp() }, { merge: true });
      toast({
        title: "Settings Saved",
        description: "QR payment settings have been updated successfully.",
      });
    } catch (error) {
      console.error("Error saving QR settings:", error);
      toast({ title: "Save Error", description: "Could not save settings.", variant: "destructive" });
    }
    setIsLoading(false);
  };
  
  if (isFetching) {
    return <div className="container mx-auto py-8 px-4 md:px-6 text-center">Loading QR settings...</div>;
  }

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
        <Button variant="outline" asChild className="mb-6">
            <Link href="/admin/qr-merchants"><ArrowLeft className="mr-2 h-4 w-4" /> Back to QR Merchants</Link>
        </Button>
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight flex items-center">
          <Settings className="mr-3 h-8 w-8 text-primary" /> QR Code Platform Settings
        </h1>
        <p className="text-muted-foreground">
          Configure the platform name, bank details, and fee percentage for all merchant transactions.
        </p>
      </div>

      <Card className="shadow-lg max-w-2xl mx-auto">
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
                <CardHeader>
                    <CardTitle>Platform Details, Bank &amp; Fee</CardTitle>
                    <CardDescription>
                        Set the platform name, commission bank account, and the fee percentage to be used in calculations or billing.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <FormField control={form.control} name="businessName" render={({ field }) => (
                        <FormItem><FormLabel>Platform Business Name</FormLabel>
                          <div className="relative">
                            <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <FormControl><Input className="pl-8" placeholder="e.g., Berreto" {...field} /></FormControl>
                          </div>
                          <FormMessage />
                        </FormItem>
                    )}/>
                     <FormField control={form.control} name="bankName" render={({ field }) => (
                        <FormItem><FormLabel>Berreto Bank Title</FormLabel>
                            <div className="relative">
                                <Banknote className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <FormControl><Input className="pl-8" placeholder="e.g., Meezan Bank" {...field} /></FormControl>
                            </div>
                            <FormMessage />
                        </FormItem>
                    )}/>
                    <FormField control={form.control} name="accountNumber" render={({ field }) => (
                        <FormItem><FormLabel>Berreto IBAN / Bank Account Number</FormLabel>
                            <div className="relative">
                                <Banknote className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <FormControl><Input type="text" inputMode="numeric" className="pl-8" placeholder="Berreto's Commission Account Number" {...field} /></FormControl>
                            </div>
                            <FormMessage />
                        </FormItem>
                    )}/>
                    <FormField control={form.control} name="email" render={({ field }) => (
                        <FormItem><FormLabel>Notification Email (Optional)</FormLabel>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <FormControl><Input type="email" className="pl-8" placeholder="For commission alerts" {...field} /></FormControl>
                            </div>
                            <FormMessage />
                        </FormItem>
                    )}/>
                    <FormField control={form.control} name="phoneNumber" render={({ field }) => (
                        <FormItem><FormLabel>Notification Phone (Optional)</FormLabel>
                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <FormControl><Input className="pl-8" placeholder="For SMS alerts" {...field} /></FormControl>
                            </div>
                            <FormMessage />
                        </FormItem>
                    )}/>
                     <FormField control={form.control} name="transactionFeePercentage" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Transaction Fee (%)</FormLabel>
                            <div className="relative">
                                <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <FormControl><Input type="number" step="0.1" className="pl-8" {...field} /></FormControl>
                            </div>
                            <FormMessage />
                        </FormItem>
                    )}/>
                </CardContent>
                <CardFooter className="border-t pt-6">
                    <Button type="submit" disabled={isLoading} className="w-full sm:w-auto ml-auto">
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        {isLoading ? "Saving..." : "Save Settings"}
                    </Button>
                </CardFooter>
            </form>
        </Form>
      </Card>
    </div>
  );
}
