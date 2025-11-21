
"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { db } from '@/lib/firebaseConfig';
import { doc, getDoc, Timestamp, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Loader2, QrCode, Building } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

interface MerchantData {
  id: string;
  businessName: string;
  contactPerson: string;
  email?: string;
  phoneNumber?: string;
  bankName: string;
  accountNumber: string;
  isProvisioned: boolean;
  createdAt: Timestamp;
}

interface BerretoSettings {
  businessName: string;
  transactionFeePercentage: number;
  email?: string;
  phoneNumber?: string;
}

const paymentFormSchema = z.object({
  amount: z.coerce.number().positive("Amount must be a positive number.").min(1, "Minimum payment is 1."),
});
type PaymentFormValues = z.infer<typeof paymentFormSchema>;

const merchantOnboardingSchema = z.object({
  businessName: z.string().min(2, "Business name is required."),
  contactPerson: z.string().min(2, "Contact person's name is required."),
  email: z.string().email("Please enter a valid email.").optional().or(z.literal('')),
  phoneNumber: z.string().optional().refine(val => !val || /^(\+92|0)?3\d{2}(-|\s)?\d{7}$/.test(val), {
    message: "Enter a valid Pakistani mobile number or leave blank.",
  }),
  bankName: z.string().min(3, "Bank name is required."),
  accountNumber: z.string().min(8, "A valid account number is required.").regex(/^\d+$/, "Account number must only contain digits."),
});
type MerchantOnboardingValues = z.infer<typeof merchantOnboardingSchema>;


// --- Onboarding Component ---
function MerchantOnboardingForm({ merchantId }: { merchantId: string }) {
  const { toast } = useToast();
  const form = useForm<MerchantOnboardingValues>({
    resolver: zodResolver(merchantOnboardingSchema),
    defaultValues: { businessName: "", contactPerson: "", email: "", phoneNumber: "", bankName: "", accountNumber: "" },
  });

  const handleOnboardingSubmit = async (values: MerchantOnboardingValues) => {
    if (!db) {
        toast({ title: "Database error", variant: "destructive" });
        return;
    }
    const merchantDocRef = doc(db, "merchants", merchantId);
    try {
        await updateDoc(merchantDocRef, {
            ...values,
            isProvisioned: true,
            updatedAt: serverTimestamp(),
        });
        toast({ title: "Merchant Onboarded", description: "The merchant is now active and can receive payments."});
        window.location.reload(); // Reload to show payment screen
    } catch (error) {
        console.error("Error onboarding merchant:", error);
        toast({ title: "Onboarding Failed", variant: "destructive"});
    }
  };

  return (
    <Card className="w-full max-w-lg shadow-xl">
      <CardHeader className="text-center">
        <div className="inline-block mx-auto p-3 bg-primary/10 rounded-full mb-3">
            <Building className="h-10 w-10 text-primary" />
        </div>
        <CardTitle className="text-2xl">Merchant Onboarding</CardTitle>
        <CardDescription>
          This QR code is not yet active. Please provide the merchant's details to activate it for payments.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleOnboardingSubmit)} className="space-y-4">
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
                <Button type="submit" className="w-full mt-4" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? "Saving..." : "Onboard Merchant"}
                </Button>
            </form>
        </Form>
      </CardContent>
    </Card>
  );
}


// --- Payment Component ---
function CustomerPaymentForm({ merchantData, berretoSettings }: { merchantData: MerchantData, berretoSettings: BerretoSettings | null }) {
  const { toast } = useToast();
  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentFormSchema),
  });

  const [isProcessing, setIsProcessing] = useState(false);

  const executeSimulatedPayment = async (values: PaymentFormValues) => {
    setIsProcessing(true);
    const { dismiss } = toast({
      title: "Processing Payment...",
      description: "Please wait while we complete the transfer.",
      duration: Infinity, 
    });

    // Simulate network delay for receiving money
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    dismiss();
    
    toast({
        title: "Payment Received via RAAST (Simulated)",
        description: `PKR ${values.amount.toLocaleString()} received by LISTED's central account.`,
        duration: 4000,
    });
    
    // Simulate backend processing and payouts
    setTimeout(() => {
        if (berretoSettings && berretoSettings.transactionFeePercentage > 0) {
            const commission = values.amount * (berretoSettings.transactionFeePercentage / 100);
            const merchantAmount = values.amount - commission;
            
            toast({
                title: "Commission Processed (Simulated)",
                description: `PKR ${commission.toFixed(2)} commission sent to ${berretoSettings.businessName}'s account.`,
                duration: 4000,
            });
            
            // This is the notification for the merchant's payout
            setTimeout(() => {
                toast({
                    title: "Merchant Payout Sent (Simulated)",
                    description: `PKR ${merchantAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} sent to ${merchantData.businessName}'s account.`,
                    duration: 5000,
                });

                if (merchantData.email) {
                    setTimeout(() => toast({ title: "Email Sent (Simulated)", description: `Receipt for payment sent to ${merchantData.email}.`}), 500);
                }
                if (merchantData.phoneNumber) {
                    setTimeout(() => toast({ title: "SMS Sent (Simulated)", description: `Payment notification sent to ${merchantData.phoneNumber}.` }), 1000);
                }
                 if (berretoSettings.email) {
                    setTimeout(() => toast({ title: "Email Sent (Simulated)", description: `Commission notification sent to ${berretoSettings.email}.`}), 1500);
                }

            }, 1000);

        } else { // No commission
             toast({
                title: "Payment Forwarded (Simulated)",
                description: `PKR ${values.amount.toLocaleString()} has been forwarded to ${merchantData.businessName}.`,
                duration: 5000,
            });
        }
    }, 500);
    
    form.reset();
    setIsProcessing(false);
  };


  return (
    <>
      <Card className="w-full max-w-lg shadow-xl">
        <CardHeader className="text-center">
          <div className="inline-block mx-auto p-3 bg-primary/10 rounded-full mb-3">
              <QrCode className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-2xl">Universal QR Payment</CardTitle>
          <CardDescription>Scan with any banking or wallet app to pay this merchant.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 p-4 border rounded-lg bg-muted/50 mb-6">
            <h3 className="font-semibold text-center text-foreground">Paying To</h3>
            <div className="flex items-center justify-center gap-2 text-lg">
              <Building className="h-5 w-5 text-primary"/>
              <p className="font-bold">{merchantData.businessName}</p>
            </div>
          </div>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(executeSimulatedPayment)} className="space-y-4">
              <FormField control={form.control} name="amount" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base">Amount (PKR)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number"
                      inputMode="decimal" 
                      placeholder="Enter amount to pay" 
                      className="h-12 text-lg"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}/>
              <Button type="submit" className="w-full text-lg py-6" disabled={isProcessing}>
                {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isProcessing ? "Processing..." : "Pay"}
              </Button>
            </form>
          </Form>
           <p className="text-center text-xs text-muted-foreground pt-4">
              Your transaction is secure. After pressing pay, please wait a few seconds for the transfer to complete.
            </p>
        </CardContent>
        <CardFooter className="text-center text-xs text-muted-foreground justify-center">
          Secured by <Link href="/" className="font-semibold text-primary hover:underline ml-1">LISTED</Link>
        </CardFooter>
      </Card>
      
      <div className="mt-4 w-full max-w-lg text-center text-muted-foreground text-xs">
          <p className="font-semibold mb-2">Pay with your favorite app:</p>
          <div className="flex justify-center items-center gap-x-4 gap-y-1 flex-wrap opacity-70">
              <span>Easypaisa</span>
              <span>JazzCash</span>
              <span>SadaPay</span>
              <span>NayaPay</span>
              <span>Any Bank App</span>
          </div>
      </div>
    </>
  );
}


// --- Main Page Component ---
export default function MerchantPage() {
  const params = useParams();
  const merchantId = params.merchantId as string;
  const router = useRouter();

  const [merchantData, setMerchantData] = useState<MerchantData | null>(null);
  const [berretoSettings, setBerretoSettings] = useState<BerretoSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!merchantId) {
      setError("Invalid merchant ID.");
      setIsLoading(false);
      return;
    }
    if (!db) {
      setError("Database connection is not available.");
      setIsLoading(false);
      return;
    }

    const fetchInitialData = async () => {
        try {
            const merchantDocRef = doc(db, "merchants", merchantId);
            const settingsDocRef = doc(db, "siteContent", "qrPaymentSettings");
            
            const [merchantDocSnap, settingsDocSnap] = await Promise.all([
                getDoc(merchantDocRef),
                getDoc(settingsDocRef)
            ]);

            if (merchantDocSnap.exists()) {
                const data = merchantDocSnap.data();
                setMerchantData({ id: merchantDocSnap.id, ...data } as MerchantData);
            } else {
                 setError("This QR code is invalid or has not been generated by an admin.");
            }

            if (settingsDocSnap.exists()) {
                setBerretoSettings(settingsDocSnap.data() as BerretoSettings);
            } else {
                console.warn("QR Payment settings not found in Firestore.");
            }

        } catch (err) {
            console.error("Error fetching initial data:", err);
            setError("Could not retrieve required information.");
        } finally {
            setIsLoading(false);
        }
    };

    fetchInitialData();
  }, [merchantId]);

  return (
    <div className="min-h-screen bg-muted/40 flex flex-col items-center justify-center p-4">
      {isLoading && (
        <div className="flex flex-col items-center gap-2 text-primary">
          <Loader2 className="h-12 w-12 animate-spin" />
          <p className="text-lg">Loading Merchant Portal...</p>
        </div>
      )}
      {!isLoading && error && (
        <Card className="w-full max-w-md text-center">
            <CardHeader><CardTitle className="text-destructive">Error</CardTitle></CardHeader>
            <CardContent><p>{error}</p></CardContent>
            <CardFooter><Button onClick={() => router.push('/')} className="w-full">Go to Homepage</Button></CardFooter>
        </Card>
      )}
       {!isLoading && !error && merchantData && !merchantData.isProvisioned && (
        <MerchantOnboardingForm merchantId={merchantId} />
      )}
      {!isLoading && !error && merchantData && merchantData.isProvisioned && (
        <CustomerPaymentForm merchantData={merchantData} berretoSettings={berretoSettings}/>
      )}
    </div>
  );
}
