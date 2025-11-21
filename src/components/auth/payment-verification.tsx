

"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Loader2, DollarSign, CheckCircle, Upload, Info, AlertTriangle, ShieldCheck, Star, Banknote, ChevronsUpDown, Calendar as CalendarIcon, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import type { RegisteredUserEntry, UserStatus } from '@/app/auth/components/auth-shared-types';
import { db } from '@/lib/firebaseConfig';
import { doc, updateDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import { format, isFuture, differenceInDays, addMonths, addHours } from 'date-fns';
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import Link from 'next/link';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { CountdownTimer } from '@/components/common/countdown-timer';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

const MAX_FILE_SIZE_MB = 1;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

interface LaunchpadPricing {
  silver: number;
  gold: number;
  platinum: number;
  royal: number;
  dollarRate: number;
  currencySymbol: string;
}

interface PaymentVerificationCardProps {
    currentUser: RegisteredUserEntry;
    onVerificationStatusChange: (newStatus: UserStatus, updatedUserDetails?: Partial<RegisteredUserEntry>) => void;
    onMonthlyPlanSelect: () => void;
    pricing: LaunchpadPricing;
}

type PlanKey = keyof Omit<LaunchpadPricing, 'dollarRate' | 'currencySymbol'>;

export function PaymentVerificationCard({ currentUser, onVerificationStatusChange, onMonthlyPlanSelect, pricing }: PaymentVerificationCardProps) {
  const [selectedPlan, setSelectedPlan] = useState<PlanKey | null>(null);
  const [selectedMonths, setSelectedMonths] = useState<number>(0);
  const [totalPricePKR, setTotalPricePKR] = useState<number>(0);
  const [livePitches, setLivePitches] = useState<number>(0);
  const [paymentProofFile, setPaymentProofFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showRejectionNotice, setShowRejectionNotice] = useState(false);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [referralCode, setReferralCode] = useState("");
  const [activeAccordionItems, setActiveAccordionItems] = useState<string[]>(["step1"]);

  const rejectionNoticeKey = `payment_rejection_notice_${currentUser.uid}`;
  
  const planDetails = {
    silver: { title: "Silver", pricePerMonthUSD: pricing.silver, features: ["Access to Investors up to 2.5 Million"] },
    gold: { title: "Gold", pricePerMonthUSD: pricing.gold, features: ["Access to Investors up to 5 Million"] },
    platinum: { title: "Platinum", pricePerMonthUSD: pricing.platinum, features: ["Access to Investors up to 10 Million"] },
    royal: { title: "Royal", pricePerMonthUSD: pricing.royal, features: ["Access to Investors up to 50 Million"] },
  };

  useEffect(() => {
    if (typeof window !== "undefined" && localStorage.getItem(rejectionNoticeKey)) {
        setShowRejectionNotice(true);
        localStorage.removeItem(rejectionNoticeKey);
    }
  }, [rejectionNoticeKey]);

  useEffect(() => {
    if (selectedPlan && selectedMonths > 0) {
        let calculatedPriceUSD = planDetails[selectedPlan].pricePerMonthUSD * selectedMonths;
        if (selectedMonths === 12) {
            calculatedPriceUSD *= 0.8; 
        }
        setTotalPricePKR(calculatedPriceUSD * pricing.dollarRate);
        
        let bonusPitches = 0;
        if (selectedMonths >= 3) bonusPitches++;
        if (selectedMonths >= 6) bonusPitches++;
        if (selectedMonths >= 9) bonusPitches++;
        if (selectedMonths === 12) bonusPitches++;
        setLivePitches(1 + bonusPitches);
        
        setActiveAccordionItems(prev => prev.includes("step2") ? prev : [...prev, "step2"]);

    } else {
        setTotalPricePKR(0);
        setLivePitches(0);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPlan, selectedMonths, pricing]);

  const handlePlanChange = (value: PlanKey) => {
    setSelectedPlan(value);
    if(value !== 'silver') {
      onMonthlyPlanSelect();
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        toast({
          title: "File Too Large",
          description: `Please select an image smaller than ${MAX_FILE_SIZE_MB}MB.`,
          variant: "destructive",
        });
        setPaymentProofFile(null);
        setFileName("");
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        return;
      }
      setPaymentProofFile(file);
      setFileName(file.name);
    }
  };

  const resizeImageAndReadAsDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith("image/")) return reject(new Error("File is not an image."));
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = async () => {
    if (!selectedPlan || selectedMonths === 0 || !paymentProofFile) {
      toast({ title: "Missing Information", description: "Please complete all steps, including plan, duration, and payment proof.", variant: "destructive" });
      return;
    }
    if (!currentUser || !db) {
        toast({ title: "Error", description: "User session or database not available.", variant: "destructive"});
        return;
    }

    setIsSubmitting(true);
    try {
      const proofDataUri = await resizeImageAndReadAsDataURL(paymentProofFile);

      const userDocRef = doc(db, "users", currentUser.uid);
      
      const subscriptionType = selectedMonths >= 12 ? 'yearly' : 'monthly';
      const now = new Date();
      const expiryDate = addMonths(now, selectedMonths);

      const updateData: Partial<RegisteredUserEntry> = {
        status: 'payment_proof_submitted',
        subscriptionType: subscriptionType,
        subscriptionDurationInMonths: selectedMonths,
        paymentProofDataUri: proofDataUri,
        subscriptionPaymentSubmittedAt: serverTimestamp(),
        referralCodeUsed: referralCode.trim() || "",
        subscriptionExpiryDate: expiryDate,
      };
      
      if (currentUser.subscriptionType && currentUser.subscriptionExpiryDate) {
        updateData.previousSubscriptionDetails = {
          type: currentUser.subscriptionType as 'monthly',
          expiryDate: currentUser.subscriptionExpiryDate,
        };
      }
      
      await updateDoc(userDocRef, updateData as any);
      
      onVerificationStatusChange('payment_proof_submitted', updateData);
      
      toast({
        title: "Proof Submitted!",
        description: "Your payment proof has been uploaded for verification. This may take up to 24-48 hours.",
        variant: "default",
      });
      
    } catch (error) {
      console.error("Error submitting payment proof:", error);
      toast({ title: "Submission Failed", description: "Could not upload your proof. Please try again.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const expiryDate = currentUser.subscriptionExpiryDate ? new Date(currentUser.subscriptionExpiryDate as string | Date) : null;
  const hasActiveSubscription = currentUser.status === 'active' && expiryDate && isFuture(expiryDate);
  const isRenewalWindowActive = hasActiveSubscription && expiryDate ? differenceInDays(expiryDate, new Date()) <= 30 : false;
  
  const submissionTimestamp = currentUser.subscriptionPaymentSubmittedAt ? new Date(currentUser.subscriptionPaymentSubmittedAt as string | Date) : null;
  const twentyFourHoursFromSubmission = submissionTimestamp ? addHours(submissionTimestamp, 24) : null;
  
  const isStep1Complete = !!selectedPlan && selectedMonths > 0;
  const isStep2Complete = isStep1Complete;
  const isStep3Complete = !!paymentProofFile;


  const renderCurrentStatus = () => {
    switch (currentUser.status) {
      case 'payment_proof_submitted':
        return (
          <Alert className="border-blue-500 bg-blue-100/50 text-center">
             <ShieldCheck className="h-4 w-4 text-blue-600" />
            <AlertTitle className="text-blue-700 font-bold text-lg">Verification in Progress</AlertTitle>
            <AlertDescription className="text-blue-700">
              Your payment proof is under review. This may take up to 24-48 hours. You will get full access once approved.
               {twentyFourHoursFromSubmission && isFuture(twentyFourHoursFromSubmission) && (
                <div className="font-semibold text-lg mt-2">
                   <CountdownTimer
                    expiryDate={twentyFourHoursFromSubmission}
                    prefix="Approx. time remaining: "
                    className="text-blue-800"
                   />
                </div>
               )}
            </AlertDescription>
          </Alert>
        );
      case 'active':
        if (hasActiveSubscription && !isRenewalWindowActive) {
           return (
             <Card className="border-green-500 bg-green-100/50 text-center p-6">
                <CardHeader className="p-0">
                    <ShieldCheck className="h-10 w-10 text-green-600 mx-auto mb-2" />
                    <CardTitle className="text-green-800 text-xl capitalize">
                        {currentUser.subscriptionDurationInMonths} Month(s) Subscription Active!
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0 mt-2 space-y-2">
                    <p className="text-green-700 text-sm">
                        You have full access to all premium features. Use them to the fullest!
                    </p>
                    {expiryDate && (
                         <div className="font-semibold text-lg mt-2">
                            <CountdownTimer
                                expiryDate={expiryDate}
                                prefix="Time Remaining: "
                                className="text-green-800"
                                displayMode="full"
                            />
                        </div>
                    )}
                </CardContent>
            </Card>
           )
        }
        if (expiryDate && !isFuture(expiryDate)) {
          return (
             <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Subscription Expired</AlertTitle>
                <AlertDescription>
                  Your <span className="font-semibold capitalize">{currentUser.subscriptionType}</span> subscription has expired. Please renew your plan to continue accessing premium features.
                </AlertDescription>
            </Alert>
          );
        }
        return null;
      case 'suspended':
          return (
             <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Account Suspended</AlertTitle>
                <AlertDescription>
                  Your account has been suspended. Please contact support for more information.
                </AlertDescription>
            </Alert>
          );
      default:
        return null;
    }
  };

  const shouldShowPaymentForm = currentUser.status !== 'payment_proof_submitted' && (!hasActiveSubscription || isRenewalWindowActive);


  return (
    <div className="container mx-auto max-w-4xl py-12 px-4 md:px-6">
      <Card className="shadow-2xl rounded-2xl">
        <CardHeader className="text-center">
          <DollarSign className="mx-auto h-12 w-12 text-primary p-2 bg-primary/10 rounded-full" />
          <CardTitle className="text-3xl font-bold mt-2">Account Verification & Subscription</CardTitle>
          <CardDescription className="text-md text-muted-foreground">
            Activate your Startup account by following the steps below.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
            {renderCurrentStatus()}
            {showRejectionNotice && (
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Previous Payment Rejected</AlertTitle>
                    <AlertDescription>
                        The previous payment proof was not accepted. Please ensure your new submission is clear and correct. Contact support if you need assistance.
                    </AlertDescription>
                </Alert>
            )}
            
            {shouldShowPaymentForm && (
            <Accordion type="multiple" className="w-full" value={activeAccordionItems} onValueChange={setActiveAccordionItems}>
                <AccordionItem value="step1">
                    <AccordionTrigger className="text-xl font-semibold">
                       <div className="flex items-center gap-4">
                        {isStep1Complete ? <CheckCircle className="h-6 w-6 text-green-500"/> : <div className="h-6 w-6 rounded-full border-2 border-primary text-primary flex items-center justify-center font-bold text-sm">1</div>}
                        <div className="flex flex-col items-start">
                             <span className="text-lg">Step 1: Choose Your Plan</span>
                             <div className="flex items-center gap-3 mt-1">
                                <Badge variant={selectedPlan ? "default" : "outline"} className={cn("transition-all text-xs", selectedPlan && "bg-primary/80")}>
                                    <Tag className="h-3 w-3 mr-1"/>Category: {selectedPlan ? planDetails[selectedPlan].title : '...'}
                                </Badge>
                                <ChevronsUpDown className="h-4 w-4 text-muted-foreground"/>
                                <Badge variant={selectedMonths > 0 ? "default" : "outline"} className={cn("transition-all text-xs", selectedMonths > 0 && "bg-primary/80")}>
                                    <CalendarIcon className="h-3 w-3 mr-1"/>Duration: {selectedMonths > 0 ? `${selectedMonths} Month(s)` : '...'}
                                </Badge>
                             </div>
                        </div>
                       </div>
                    </AccordionTrigger>
                    <AccordionContent>
                        <div className="space-y-4 pt-2">
                             <h4 className="text-lg font-semibold text-center">Choose the Investor Category</h4>
                             <RadioGroup 
                                onValueChange={(value: PlanKey) => handlePlanChange(value)}
                                value={selectedPlan || undefined}
                                className="grid grid-cols-1 md:grid-cols-2 gap-4"
                             >
                                {Object.entries(planDetails).map(([key, value]) => (
                                    <Label key={key} htmlFor={key} className="cursor-pointer">
                                        <Card className={`p-4 hover:border-primary transition-all ${selectedPlan === key ? 'border-primary ring-2 ring-primary' : ''}`}>
                                            <div className="flex items-center gap-4">
                                                <RadioGroupItem value={key as PlanKey} id={key} />
                                                <div>
                                                    <p className="font-semibold text-lg">{value.title}</p>
                                                    <p className="text-primary font-bold">{pricing.currencySymbol}{value.pricePerMonthUSD.toLocaleString()}/mo</p>
                                                </div>
                                            </div>
                                            <ul className="mt-4 ml-4 text-sm text-muted-foreground list-disc space-y-1">
                                                {value.features.map(f => <li key={f}>{f}</li>)}
                                            </ul>
                                        </Card>
                                    </Label>
                                ))}
                            </RadioGroup>
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                                <Label htmlFor="months-select" className="font-semibold">For how long do you want to connect with investors?</Label>
                                <Select
                                    value={selectedMonths ? selectedMonths.toString() : "0"}
                                    onValueChange={(value) => setSelectedMonths(parseInt(value, 10))}
                                    disabled={!selectedPlan}
                                >
                                    <SelectTrigger id="months-select" className="w-full sm:w-[180px]">
                                        <SelectValue placeholder="Select duration"/>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="0" disabled>Select duration</SelectItem>
                                        {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                                            <SelectItem key={month} value={month.toString()}>
                                                {month} Month{month > 1 ? 's' : ''}{month === 12 ? ' (20% Off)' : ''}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </AccordionContent>
                </AccordionItem>
                <AccordionItem value="step2" disabled={!isStep1Complete}>
                    <AccordionTrigger className={cn("text-xl font-semibold", !isStep1Complete && "opacity-50 cursor-not-allowed")}>
                         <div className="flex items-center gap-2">
                            {isStep2Complete ? <CheckCircle className="h-6 w-6 text-green-500"/> : <div className="h-6 w-6 rounded-full border-2 border-primary text-primary flex items-center justify-center font-bold text-sm">2</div>}
                             Step 2: Make Payment
                        </div>
                    </AccordionTrigger>
                    <AccordionContent>
                        <div className="text-center space-y-2 p-4 bg-muted/50 rounded-lg pt-4">
                            <h3 className="text-lg font-semibold">Our Bank Account Details</h3>
                             <p className="text-2xl font-bold text-destructive">Payable Amount: PKR {totalPricePKR.toLocaleString()}</p>
                             <p className="text-md font-bold text-primary">Bank: Bank Islami</p>
                            <p className="text-md">Account Title: <span className="font-semibold">BERRETO</span></p>
                            <p className="text-md">IBAN: <span className="font-semibold">PK59BKIP0301600475030001</span></p>
                            <p className="text-sm text-muted-foreground pt-2">
                                Please use RAAST, bank transfer, or any other method to pay the total amount for your selected plan to this account.
                            </p>
                        </div>
                    </AccordionContent>
                </AccordionItem>
                <AccordionItem value="step3" disabled={!isStep2Complete}>
                    <AccordionTrigger className={cn("text-xl font-semibold", !isStep2Complete && "opacity-50 cursor-not-allowed")}>
                         <div className="flex items-center gap-2">
                           {isStep3Complete ? <CheckCircle className="h-6 w-6 text-green-500"/> : <div className="h-6 w-6 rounded-full border-2 border-primary text-primary flex items-center justify-center font-bold text-sm">3</div>}
                            Step 3: Upload Proof & Submit
                        </div>
                    </AccordionTrigger>
                    <AccordionContent>
                         <div className="space-y-6 pt-4">
                            <div className="space-y-2">
                                <Label htmlFor="payment-proof-upload" className="font-semibold">Upload Payment Proof</Label>
                                <div className="flex flex-col items-center justify-center w-full">
                                    <Label htmlFor="payment-proof-upload-input" className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-card hover:bg-muted">
                                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                            <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
                                            <p className="mb-1 text-sm text-muted-foreground"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                                            <p className="text-xs text-muted-foreground">Image file (PNG, JPG, etc. Max {MAX_FILE_SIZE_MB}MB)</p>
                                        </div>
                                        <Input id="payment-proof-upload-input" ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} accept="image/*"/>
                                    </Label>
                                    {fileName && <p className="text-sm text-muted-foreground mt-2">File selected: <span className="font-medium text-foreground">{fileName}</span></p>}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="referral-code" className="text-center block">Referral Code (Optional)</Label>
                                <Input id="referral-code" placeholder="Enter referral code if you have one" value={referralCode} onChange={(e) => setReferralCode(e.target.value)} className="max-w-sm mx-auto"/>
                                <p className="text-xs text-muted-foreground text-center">If you don't have a referral code, leave this empty.</p>
                            </div>
                            <Button className="w-full text-lg" onClick={handleSubmit} disabled={!isStep3Complete || isSubmitting}>
                                {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <CheckCircle className="mr-2 h-5 w-5" />}
                                {isSubmitting ? "Submitting for Verification..." : "Submit for Verification"}
                            </Button>
                         </div>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
            )}
        </CardContent>
        {shouldShowPaymentForm && (
            <CardFooter className="flex-col">
                 {totalPricePKR > 0 && (
                    <div className="text-center font-bold text-xl pt-2 mb-4">
                        Total Price: <span className="text-primary">{pricing.currencySymbol}{Math.round(totalPricePKR / pricing.dollarRate).toLocaleString()} (Approx. PKR {totalPricePKR.toLocaleString()})</span>
                        <p className="text-sm text-muted-foreground font-normal">
                           Your plan will include business ideas that will show user that user can post new business ideas to investors
                        </p>
                        {selectedMonths === 12 && (
                            <p className="text-xs font-semibold text-muted-foreground mt-2">
                                The annual plan is fully refundable if you find that LISTED has not been helpful for you.
                            </p>
                        )}
                    </div>
                )}
              <div className="text-center mt-6">
                  <p className="text-sm text-muted-foreground">Have questions? <Link href="/contact" className="text-primary hover:underline">Contact our support team</Link>.</p>
              </div>
            </CardFooter>
        )}
      </Card>
    </div>
  );
}
