
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Paperclip, Tag, Users, Link as LinkIcon, DollarSign, Briefcase, Package, Zap, FileText, Image as ImageIcon, AlertTriangle } from "lucide-react";
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
import Link from "next/link";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { offerTypeIcons, CalendarDays } from '@/components/common/icons';
import { useAuth } from '@/contexts/AuthContext'; 
import { db } from '@/lib/firebaseConfig';
import { collection, addDoc, serverTimestamp, Timestamp, query, where, getDocs } from "firebase/firestore";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { PlatformOffer } from '@/types/platform-offer';


const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const offerCategories = ["Product", "Service", "Subscription", "Digital Product", "Event", "Other"] as const;

const offerFormSchema = z.object({
  title: z.string().min(10, { message: "Title must be at least 10 characters." }).max(150, { message: "Title must be less than 150 characters."}),
  description: z.string().min(50, { message: "Description must be at least 50 characters." }).max(2000, {message: "Description must be less than 2000 characters."}),
  offerCategory: z.enum(offerCategories, { required_error: "Offer category is required."}),
  targetAudience: z.string().min(5, {message: "Target audience/market is required (e.g., Small Businesses, Tech Enthusiasts, Local Residents)."}),
  price: z.coerce.number().positive({message: "Price/Value must be a positive number."}).optional(),
  offerValueDetails: z.string().min(2, {message: "Offer value details are required (e.g., MSRP 15,000 PKR, Annual Subscription, Free + Commission)."}),
  commissionRateInput: z.string().min(1, { message: "Commission rate/amount is required." }), 
  commissionType: z.enum(["percentage", "fixed_amount", "hybrid", "negotiable"], { required_error: "Commission type is required."}), 
  contactPerson: z.string().min(3, { message: "Contact person name is required."}),
  contactNumber: z.string().regex(/^(\+92|0)?3\d{2}(-|\s)?\d{7}$/, {message: "Please enter a valid Pakistani mobile number (e.g., 03XX-XXXXXXX or +923XX-XXXXXXX)."}),
  keySellingPoints: z.string().optional(),
  offerLink: z.string().url({ message: "Please enter a valid URL for the offer/landing page." }).optional().or(z.literal('')),
  mediaFile: z
    .custom<FileList>()
    .optional()
    .refine(
      (files) => !files || files.length === 0 || (files.length === 1 && (files[0].type.startsWith("image/") || files[0].type.startsWith("video/"))),
      "Please upload a single image or video file."
    )
    .refine(
        (files) => !files || files.length === 0 || files[0].size <= MAX_FILE_SIZE_BYTES,
        `File size should be less than ${MAX_FILE_SIZE_MB}MB.`
    ),
}).refine(data => {
  if (data.commissionType === 'percentage') {
    const rate = parseFloat(data.commissionRateInput);
    if (isNaN(rate) || rate > 100 || rate < 0.1) {
      return false;
    }
  }
  return true;
}, {
  message: "Percentage commission rate must be a number between 0.1 and 100.",
  path: ["commissionRateInput"],
});

type OfferFormValues = z.infer<typeof offerFormSchema>;

export default function CreateOfferPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { currentUser: authUser, loading: authLoading } = useAuth(); 
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUserInfo, setCurrentUserInfo] = useState<{ id: string, name: string, email: string, avatarSeed?: string } | null>(null);
  const [canCreateOffer, setCanCreateOffer] = useState(false); // Default to false until checked
  const [isCheckingOfferLimit, setIsCheckingOfferLimit] = useState(true);


  // Define 'form' before any useEffect that uses it
  const form = useForm<OfferFormValues>({
    resolver: zodResolver(offerFormSchema),
    defaultValues: {
      title: "",
      description: "",
      offerCategory: "Product",
      targetAudience: "",
      price: undefined,
      offerValueDetails: "",
      commissionRateInput: "",
      commissionType: "percentage",
      contactPerson: "",
      contactNumber: "",
      keySellingPoints: "",
      offerLink: "",
      mediaFile: undefined,
    },
  });

  useEffect(() => {
    if (!authLoading) {
      if (authUser && authUser.type === 'company' && authUser.uid) {
        setCurrentUserInfo({
          id: authUser.uid, 
          name: authUser.corporationName || authUser.name || "Corporation",
          email: authUser.email || "",
          avatarSeed: authUser.avatarSeed || authUser.corporationName?.replace(/[^a-zA-Z0-9]/g, '') || authUser.name?.replace(/[^a-zA-Z0-9]/g, '') || 'CorpDefaultSeed'
        });
        form.setValue("contactPerson", authUser.name || ""); 
        form.setValue("contactNumber", authUser.phoneNumber || ""); 
      } else {
        toast({ title: "Unauthorized", description: "You must be logged in as a Corporation to create offers.", variant: "destructive" });
        router.push("/auth/corporation-login?reason=unauthorized_create_offer");
      }
    }
  }, [authUser, authLoading, router, toast, form]); // 'form' is now correctly in the dependency array

  useEffect(() => {
    if (!authLoading && authUser && authUser.type === 'company' && authUser.uid && db) {
      setIsCheckingOfferLimit(true);
      const offersRef = collection(db, "platformOffers");
      const q = query(offersRef, 
                      where("corporationId", "==", authUser.uid),
                      where("status", "==", "active"),
                      where("isDeletedByAdmin", "==", false) 
                    );
      
      getDocs(q).then(snapshot => {
        const activeOffersCount = snapshot.size;
        let maxOffersAllowed = 1; // Standard limit

        if (authUser.corpFeatureSubscriptionStatus === 'active' && authUser.corpFeatureSubscriptionEndsAt && new Date(authUser.corpFeatureSubscriptionEndsAt as string | Date) > new Date()) {
            if (authUser.corpFeatureSubscriptionType === 'monthly') {
                maxOffersAllowed = 3;
            } else if (authUser.corpFeatureSubscriptionType === 'yearly') {
                maxOffersAllowed = 5;
            }
        }
        
        if (activeOffersCount >= maxOffersAllowed) {
          setCanCreateOffer(false);
        } else {
          setCanCreateOffer(true);
        }
        setIsCheckingOfferLimit(false);
      }).catch(error => {
        console.error("Error checking corporation offer limit:", error);
        toast({ title: "Error", description: "Could not verify your offer limit. Please try again.", variant: "destructive" });
        setIsCheckingOfferLimit(false);
        setCanCreateOffer(false); // Default to not allowed if error
      });
    } else if (!authLoading) {
      setIsCheckingOfferLimit(false); // Not a company or not logged in
      setCanCreateOffer(false);
    }
  }, [authUser, authLoading, toast]);


  async function onSubmit(data: OfferFormValues) {
    if (!currentUserInfo || !db) {
      toast({ title: "Error", description: "User details not found or database not ready. Please re-login.", variant: "destructive" });
      return;
    }
    if (!canCreateOffer && !isCheckingOfferLimit) { // Double check, though button should be disabled
      toast({ title: "Offer Limit Reached", description: "You have reached your maximum number of active offers.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);

    let mediaDataUri: string | undefined = undefined;
    if (data.mediaFile && data.mediaFile.length > 0) {
      const file = data.mediaFile[0];
      try {
        mediaDataUri = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (event) => resolve(event.target?.result as string);
          reader.onerror = (error) => reject(error);
          reader.readAsDataURL(file);
        });
      } catch (error) {
        console.error("Error processing media file:", error);
        toast({ title: "Media Processing Failed", description: "Could not process the uploaded file.", variant: "destructive" });
        form.setError("mediaFile", { type: "manual", message: "Error processing file." });
        setIsSubmitting(false);
        return;
      }
    }
    
    const newOfferDataForFirestore = { 
      corporationId: currentUserInfo.id,
      corporationName: currentUserInfo.name,
      corporationLogoSeed: currentUserInfo.avatarSeed,
      title: data.title,
      description: data.description,
      offerCategory: data.offerCategory,
      targetAudience: data.targetAudience,
      price: data.price !== undefined ? data.price : null,
      offerValueDetails: data.offerValueDetails,
      commissionRate: data.commissionType === 'percentage' ? `${data.commissionRateInput}%` : (data.commissionType === 'fixed_amount' ? `PKR ${data.commissionRateInput}` : data.commissionRateInput),
      commissionType: data.commissionType,
      contactPerson: data.contactPerson,
      contactNumber: data.contactNumber,
      keySellingPoints: data.keySellingPoints,
      offerLink: data.offerLink,
      mediaUrl: mediaDataUri, 
      status: 'active', 
      postedDate: new Date().toISOString(),
      views: 0,
      positiveResponseRate: 0, 
      negativeResponseRate: 0, 
      isDeletedByAdmin: false,
    };
    
    try {
      const docRef = await addDoc(collection(db, "platformOffers"), {
        ...newOfferDataForFirestore,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      console.log("Offer created in Firestore with ID: ", docRef.id);
      toast({ title: "Offer Created Successfully!", description: `Your offer "${newOfferDataForFirestore.title}" is now live in LISTED.` });
      router.push("/dashboard/ads");
    } catch (error) {
        console.error("Failed to save offer to Firestore:", error);
        toast({ 
          title: "Operation Failed", 
          description: "Could not save the offer to the database. Please try again.", 
          variant: "destructive" 
        });
    } finally {
      setIsSubmitting(false);
    }
  }

  const mediaFileRef = form.register("mediaFile");
  const selectedOfferCategory = form.watch("offerCategory");
  const commissionType = form.watch("commissionType");

  const getCategoryIcon = (category?: typeof offerCategories[number]) => {
    if(!category) return offerTypeIcons.Default;
    switch(category) {
        case "Product": return offerTypeIcons.Product;
        case "Service": return offerTypeIcons.Service;
        case "Subscription": return offerTypeIcons.Subscription;
        case "Digital Product": return offerTypeIcons.Digital;
        case "Event": return <CalendarDays className="h-4 w-4 text-muted-foreground" />;
        default: return offerTypeIcons.Default;
    }
  };

  if (authLoading || isCheckingOfferLimit || !currentUserInfo) {
    return <div className="container mx-auto py-8 px-4 md:px-6 text-center">Initializing Create Offer...</div>;
  }

  if (!canCreateOffer && !isCheckingOfferLimit) {
    let alertMessage = "You have reached your maximum number of active offers (1 for standard accounts).";
    let upgradeLink = "/dashboard/feature-account";
    if (authUser?.corpFeatureSubscriptionStatus === 'active') {
        const limit = authUser.corpFeatureSubscriptionType === 'yearly' ? 5 : 3;
        alertMessage = `You have reached your maximum number of active offers (${limit} for your featured account).`;
    }

    return (
        <div className="container mx-auto py-8 px-4 md:px-6">
            <Button variant="outline" asChild className="mb-6">
                <Link href="/dashboard/ads"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Manage Offers</Link>
            </Button>
            <Alert variant="destructive" className="max-w-2xl mx-auto">
                <AlertTriangle className="h-5 w-5" />
                <AlertTitle>Offer Limit Reached</AlertTitle>
                <AlertDescription>
                    {alertMessage} 
                    Please manage your existing offers or <Link href={upgradeLink} className="font-semibold underline hover:text-destructive/80">upgrade your account</Link> to post more.
                </AlertDescription>
            </Alert>
        </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <div className="mb-6 flex items-center">
        <Button variant="ghost" size="icon" asChild className="mr-2">
          <Link href="/dashboard/ads">
            <ArrowLeft className="h-5 w-5" />
            <span className="sr-only">Back to Offers</span>
          </Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Create New Offer</h1>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Offer Details</CardTitle>
              <ShadCardDescription>Detail the offer and the commission for sales professionals.</ShadCardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Offer Title</FormLabel>
                    <FormControl>
                      <Input placeholder="E.g., Premium SaaS Subscription - 50% Off First Year" {...field} />
                    </FormControl>
                    <FormDescription>A clear and attractive title for your offer.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Offer Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe the offer in detail, including key benefits, target audience, unique selling points, etc."
                        className="min-h-[150px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>Provide comprehensive details about the offer to attract sales professionals and customers.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="offerCategory"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Offer Category</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                             <div className="flex items-center gap-2">
                              {getCategoryIcon(selectedOfferCategory)}
                              <SelectValue placeholder="Select offer category" />
                            </div>
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {offerCategories.map(category => (
                            <SelectItem key={category} value={category}>
                                <div className="flex items-center gap-2">
                                    {getCategoryIcon(category)}
                                    {category}
                                </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>Select the category of your offer.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="targetAudience"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target Audience / Market</FormLabel>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <FormControl>
                            <Input placeholder="E.g., Startups, Gamers, Fitness Enthusiasts" {...field} />
                        </FormControl>
                      </div>
                      <FormDescription>Specify the primary audience or market for this offer.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Offer Price/Value (PKR) (Optional)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="E.g., 10000 (if applicable)" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || undefined)} value={field.value ?? ""} />
                      </FormControl>
                      <FormDescription>Price of the product/service if applicable. Leave blank if not a direct sale item.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="offerValueDetails"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Offer Value Details</FormLabel>
                       <div className="flex items-center gap-2">
                         <Tag className="h-4 w-4 text-muted-foreground" />
                        <FormControl>
                          <Input placeholder="E.g., MSRP 15,000 PKR, Annual Plan, Free Trial + Commission" {...field} />
                        </FormControl>
                      </div>
                      <FormDescription>Clearly state the value proposition (e.g., retail price, package details).</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="mediaFile"
                render={({ fieldState }) => ( 
                  <FormItem>
                    <FormLabel>Upload Image or Video (Optional)</FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-2">
                        <Paperclip className="h-5 w-5 text-muted-foreground" />
                        <Input
                          type="file"
                          accept="image/*,video/*"
                          {...mediaFileRef} 
                          className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                        />
                      </div>
                    </FormControl>
                    <FormDescription>
                      Upload a high-quality image or short video for the offer (max ${MAX_FILE_SIZE_MB}MB).
                      {form.watch("mediaFile") && form.watch("mediaFile")!.length > 0 && (
                        <span className="block mt-1 text-xs">
                          Selected: {form.watch("mediaFile")![0].name} ({(form.watch("mediaFile")![0].size / 1024 / 1024).toFixed(2)} MB)
                        </span>
                      )}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Card className="border-accent/50 shadow-sm">
                <CardHeader>
                    <CardTitle className="text-xl text-accent flex items-center"><DollarSign className="mr-2 h-5 w-5"/>Commission Details for Sales Professionals</CardTitle>
                    <ShadCardDescription>Specify the commission sales professionals will earn for successfully closing a deal for this offer.</ShadCardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                    control={form.control}
                    name="commissionType"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Commission Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Select commission type" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="percentage">% of Sale Price/Value</SelectItem>
                              <SelectItem value="fixed_amount">Fixed Amount (PKR)</SelectItem>
                              <SelectItem value="hybrid">Hybrid (Base + %)</SelectItem>
                              <SelectItem value="negotiable">Negotiable</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormDescription>How is the commission structured?</FormDescription>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={form.control}
                    name="commissionRateInput"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>
                            {commissionType === "percentage" ? "Commission Percentage (%)" : 
                             commissionType === "fixed_amount" ? "Fixed Commission Amount (PKR)" :
                             "Commission Details"}
                        </FormLabel>
                        <FormControl>
                            <Input 
                              type={commissionType === "percentage" || commissionType === "fixed_amount" ? "number" : "text"} 
                              step={commissionType === "percentage" ? "0.1" : "1"}
                              placeholder={
                                commissionType === "percentage" ? "E.g., 10 for 10%" : 
                                commissionType === "fixed_amount" ? "E.g., 5000 for PKR 5,000" :
                                "E.g., PKR 2k + 5% or 'To be discussed'"
                              } 
                              {...field} 
                            />
                        </FormControl>
                        <FormDescription>
                            {commissionType === "percentage" ? "Enter percentage (e.g., 15 for 15%)." : 
                             commissionType === "fixed_amount" ? "Enter fixed amount in PKR." :
                             "Describe the commission (e.g., base salary + percentage, or specify it's negotiable)."}
                        </FormDescription>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                </div>
                </CardContent>
              </Card>
              
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="contactPerson"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Business Contact Person</FormLabel>
                      <FormControl>
                        <Input placeholder="E.g., Ali Ahmed (Sales Manager)" {...field} />
                      </FormControl>
                      <FormDescription>Name of the person sales professionals should contact regarding this offer.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="contactNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Business Contact Number</FormLabel>
                      <FormControl>
                        <Input placeholder="E.g., 03001234567" {...field} />
                      </FormControl>
                      <FormDescription>Official contact number for inquiries from sales professionals.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="keySellingPoints"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Key Selling Points (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="E.g., High demand, Unique features, Limited time offer" {...field} />
                    </FormControl>
                    <FormDescription>Comma-separated list of important selling points for sales professionals.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="offerLink"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Offer Link / Landing Page (Optional)</FormLabel>
                     <div className="flex items-center gap-2">
                        <LinkIcon className="h-4 w-4 text-muted-foreground" />
                        <FormControl>
                            <Input placeholder="https://yourbusiness.com/offer-details" {...field} />
                        </FormControl>
                    </div>
                    <FormDescription>Link to a dedicated webpage, product page, or detailed information for this offer.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter className="flex justify-end gap-2 border-t pt-6">
              <Button variant="outline" asChild>
                <Link href="/dashboard/ads">Cancel</Link>
              </Button>
              <Button type="submit" className="bg-accent hover:bg-accent/90 text-accent-foreground" disabled={isSubmitting || authLoading || !currentUserInfo || !canCreateOffer}>
                <Save className="mr-2 h-4 w-4" />
                {isSubmitting ? "Saving Offer..." : "Save and Publish Offer"}
              </Button>
            </CardFooter>
          </Card>
        </form>
      </Form>
    </div>
  );
}
