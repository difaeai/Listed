
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Share2, Users, FileText, Image as ImageIcon, MessageCircle, Tag, DollarSign, Percent, Info } from "lucide-react";
import React, { useState, useEffect } from 'react';

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription as ShadCardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import type { UserSalesOffer, UserSalesOfferCommissionType } from '@/types/platform-offer';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebaseConfig';
import { collection, addDoc, serverTimestamp, query, where, getDocs, onSnapshot } from "firebase/firestore";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";


const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const offerCategories = ["Collaboration", "Lead Sharing", "Joint Venture", "Service Exchange", "Referral Program", "Other"] as const;
const commissionTypes: UserSalesOfferCommissionType[] = ['percentage_split', 'fixed_fee', 'lead_exchange', 'service_swap', 'custom_negotiable'];

const salesOfferFormSchema = z.object({
  title: z.string().min(5, "Offer title must be at least 5 characters.").max(100, "Offer title must be 100 characters or less."),
  description: z.string().min(20, "Description must be at least 20 characters.").max(1000, "Description must be 1000 characters or less."),
  offerCategory: z.enum(offerCategories, { required_error: "Please select an offer category." }),
  targetAudience: z.string().min(5, "Specify who this offer is for (e.g., Sales Pros in Real Estate)."),
  terms: z.string().min(10, "Describe general terms or additional collaboration details."),
  commissionType: z.enum(commissionTypes as [string, ...string[]]).optional(),
  commissionRateInput: z.string().optional(),
  contactNumber: z.string().regex(/^(\+92|0)?3\d{2}(-|\s)?\d{7}$/, {message: "Please enter a valid Pakistani mobile number (e.g., 03XX-XXXXXXX or +923XX-XXXXXXX)."}),
  mediaFile: z.custom<FileList>().optional()
    .refine(files => !files || files.length === 0 || files[0].type.startsWith("image/"), {
      message: "Only image files are allowed.",
    })
    .refine(files => !files || files.length === 0 || files[0].size <= MAX_FILE_SIZE_BYTES, {
      message: `Image file size should be less than ${MAX_FILE_SIZE_MB}MB.`,
    }),
});

export type SalesOfferFormValues = z.infer<typeof salesOfferFormSchema>;

export default function CreateSalesOfferPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { currentUser: authUser, loading: authLoading } = useAuth(); 
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUserInfo, setCurrentUserInfo] = useState<{ uid: string, name: string, email: string, avatarSeed?: string } | null>(null);
  const [canCreateOffer, setCanCreateOffer] = useState(false);
  const [isCheckingOfferLimit, setIsCheckingOfferLimit] = useState(true);


  useEffect(() => {
    if (authLoading) return;

    if (authUser && authUser.type === 'professional') {
      setCurrentUserInfo({
        uid: authUser.uid,
        name: authUser.name || "User",
        email: authUser.email || "",
        avatarSeed: authUser.avatarSeed || authUser.name?.replace(/[^a-zA-Z0-9]/g, '') || 'UserDefaultSeed'
      });
      form.setValue("contactNumber", authUser.phoneNumber || "");

      if (db && authUser.uid) {
        const offersRef = collection(db, "userSalesOffers");
        const q = query(
          offersRef,
          where("creatorId", "==", authUser.uid),
          where("status", "==", "active"),
          where("isDeletedByAdmin", "==", false)
        );
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
          if (snapshot.size > 0) {
            setCanCreateOffer(false);
            toast({
              title: "Active Offer Limit Reached",
              description: "You already have an active sales offer. Please manage it before creating a new one.",
              variant: "destructive",
              duration: 7000,
            });
            router.push("/offers/my-sales");
          } else {
            setCanCreateOffer(true);
          }
          setIsCheckingOfferLimit(false);
        }, (error) => {
          console.error("Error checking for active sales offers:", error);
          toast({ title: "Error", description: "Could not verify offer limit. Please try again.", variant: "destructive"});
          setIsCheckingOfferLimit(false);
          setCanCreateOffer(false); 
        });
        return () => unsubscribe();
      } else {
        setIsCheckingOfferLimit(false);
        setCanCreateOffer(false); 
      }
    } else if (!authLoading) { 
      toast({ title: "Unauthorized", description: "You must be logged in as a User to create sales offers.", variant: "destructive" });
      router.push("/auth");
      setIsCheckingOfferLimit(false);
      setCanCreateOffer(false);
    }
  }, [authUser, authLoading, router, toast]);


  const form = useForm<SalesOfferFormValues>({
    resolver: zodResolver(salesOfferFormSchema),
    defaultValues: {
      title: "",
      description: "",
      offerCategory: "Collaboration",
      targetAudience: "",
      terms: "",
      commissionType: undefined,
      commissionRateInput: "",
      contactNumber: "",
      mediaFile: undefined,
    },
  });

  async function onSubmit(data: SalesOfferFormValues) {
    if (!currentUserInfo || !db) {
      toast({ title: "Error", description: "User details not found or database not ready. Please re-login.", variant: "destructive" });
      return;
    }
    if (!canCreateOffer) {
        toast({ title: "Cannot Create Offer", description: "You already have an active sales offer.", variant: "destructive" });
        return;
    }
    setIsSubmitting(true);

    let imageUrl: string | undefined = undefined;
    if (data.mediaFile && data.mediaFile.length > 0) {
      const file = data.mediaFile[0];
      try {
        imageUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (event) => resolve(event.target?.result as string);
          reader.onerror = (error) => reject(error);
          reader.readAsDataURL(file);
        });
      } catch (error) {
        form.setError("mediaFile", { message: "Failed to process image." });
        setIsSubmitting(false);
        return;
      }
    }

    const newSalesOfferData: Omit<UserSalesOffer, 'id' | 'createdAt' | 'updatedAt'> = {
      creatorId: currentUserInfo.uid,
      creatorName: currentUserInfo.name,
      creatorEmail: currentUserInfo.email, // Storing email for filtering
      creatorAvatarSeed: currentUserInfo.avatarSeed,
      title: data.title,
      description: data.description,
      offerCategory: data.offerCategory,
      targetAudience: data.targetAudience,
      terms: data.terms,
      commissionType: data.commissionType as UserSalesOfferCommissionType | undefined,
      commissionRateInput: data.commissionRateInput,
      contactNumber: data.contactNumber,
      status: 'active', 
      postedDate: new Date().toISOString(), 
      mediaUrl: imageUrl,
      views: 0,
      positiveResponseRate: 0,
      negativeResponseRate: 0,
      peerInterestCount: 0,
      isDeletedByAdmin: false,
    };

    try {
      await addDoc(collection(db, "userSalesOffers"), {
        ...newSalesOfferData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      toast({ title: "Sales Offer Posted!", description: `Your offer "${data.title}" is now live in LISTED.` });
      router.push("/offers/my-sales");
    } catch (error) {
      console.error("Error saving sales offer to Firestore:", error);
      toast({ title: "Error Saving Offer", description: "Could not save your offer to Firestore.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  }
  const mediaFileRef = form.register("mediaFile");

  if (authLoading || isCheckingOfferLimit) {
    return <div className="container mx-auto py-8 px-4 md:px-6 text-center">Loading...</div>;
  }

  if (!canCreateOffer && !isCheckingOfferLimit) {
     return (
        <div className="container mx-auto py-8 px-4 md:px-6 text-center">
            <Alert variant="destructive" className="max-w-md mx-auto">
                <Info className="h-4 w-4" />
                <AlertTitle>Action Not Allowed</AlertTitle>
                <AlertDescription>
                    You already have an active sales offer. Please manage or delete your existing offer before creating a new one.
                </AlertDescription>
            </Alert>
            <Button asChild className="mt-6">
                <Link href="/offers/my-sales"><ArrowLeft className="mr-2 h-4 w-4" /> Go to Generate Revenue</Link>
            </Button>
        </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <div className="mb-6 flex items-center">
        <Button variant="ghost" size="icon" asChild className="mr-2">
          <Link href="/offers/my-sales"><ArrowLeft className="h-5 w-5" /></Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight flex items-center">
          <Share2 className="mr-3 h-7 w-7 text-primary" /> Create New Sales Offer
        </h1>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Card className="shadow-lg rounded-xl">
            <CardHeader>
              <CardTitle>Sales Offer Details</CardTitle>
              <ShadCardDescription>Create an offer for collaboration or partnership with other sales professionals.</ShadCardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem><FormLabel>Offer Title</FormLabel><FormControl><Input placeholder="E.g., Joint Marketing for Real Estate Leads" {...field} /></FormControl><FormMessage /></FormItem>
              )}/>
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem><FormLabel>Offer Description</FormLabel><FormControl><Textarea placeholder="Describe your collaboration idea, what you offer, and what you seek." className="min-h-[120px]" {...field} /></FormControl><FormMessage /></FormItem>
              )}/>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField control={form.control} name="offerCategory" render={({ field }) => (
                  <FormItem><FormLabel>Offer Category</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select offer category" /></SelectTrigger></FormControl>
                      <SelectContent>{offerCategories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}</SelectContent>
                    </Select><FormMessage />
                  </FormItem>
                )}/>
                 <FormField control={form.control} name="targetAudience" render={({ field }) => (
                  <FormItem><FormLabel>Target Sales Professionals</FormLabel><FormControl><Input placeholder="E.g., Experts in Corporate Sales, Lahore Region" {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
              </div>

              <Card className="border-blue-500/30 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg text-blue-600 flex items-center"><Percent className="mr-2 h-5 w-5"/>Commission / Value Exchange (Optional)</CardTitle>
                   <ShadCardDescription>Define the commission or value exchange for this peer offer.</ShadCardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField control={form.control} name="commissionType" render={({ field }) => (
                      <FormItem><FormLabel>Type of Commission/Exchange</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger></FormControl>
                          <SelectContent>
                            {commissionTypes.map(type => (
                              <SelectItem key={type} value={type}>
                                {type.replace('_', ' ').split(' ').map(s=>s.charAt(0).toUpperCase()+s.substring(1)).join(' ')}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                         <FormDescription>Choose the structure of your commission or exchange.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}/>
                    <FormField control={form.control} name="commissionRateInput" render={({ field }) => (
                      <FormItem><FormLabel>Commission/Exchange Details</FormLabel>
                        <FormControl><Input placeholder="E.g., 50% split, PKR 500, Exchange 10 leads" {...field} /></FormControl>
                        <FormDescription>Specify rate, amount, or details of the exchange.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}/>
                  </div>
                </CardContent>
              </Card>
              
              <FormField control={form.control} name="terms" render={({ field }) => (
                <FormItem><FormLabel>General Terms & Collaboration Details</FormLabel><FormControl><Textarea placeholder="E.g., Duration of collaboration, specific responsibilities, milestones, etc." className="min-h-[100px]" {...field} /></FormControl><FormMessage /></FormItem>
              )}/>
              <FormField control={form.control} name="contactNumber" render={({ field }) => (
                  <FormItem><FormLabel>Your Contact Number</FormLabel><FormControl><Input placeholder="Your contact number for this offer" {...field} /></FormControl><FormMessage /></FormItem>
              )}/>
              <FormField control={form.control} name="mediaFile" render={() => (
                <FormItem><FormLabel>Offer Image (Optional)</FormLabel>
                  <FormControl><div className="flex items-center gap-2"><ImageIcon className="h-5 w-5 text-muted-foreground" /><Input type="file" accept="image/*" {...mediaFileRef} className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"/></div></FormControl>
                  <FormDescription>Upload an image to represent your offer (max ${MAX_FILE_SIZE_MB}MB).</FormDescription><FormMessage />
                </FormItem>
              )}/>
            </CardContent>
            <CardFooter className="flex justify-end gap-2 border-t pt-6">
              <Button variant="outline" asChild><Link href="/offers/my-sales">Cancel</Link></Button>
              <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isSubmitting || authLoading || !currentUserInfo || !canCreateOffer}>
                <Save className="mr-2 h-4 w-4" />{isSubmitting ? "Posting..." : "Post Sales Offer"}
              </Button>
            </CardFooter>
          </Card>
        </form>
      </Form>
    </div>
  );
}
