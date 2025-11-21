
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import React, { useState, useEffect } from "react";
import { ArrowLeft, Save, Paperclip, Tag, Users, Link as LinkIcon, DollarSign, Briefcase, Package, Zap, FileText, Image as ImageIcon } from "lucide-react";

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { offerTypeIcons, CalendarDays } from "@/components/common/icons";
import type { PlatformOffer } from '@/types/platform-offer'; 

// Firestore imports
import { db, auth } from '@/lib/firebaseConfig';
import { doc, getDoc, updateDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";


const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const offerCategories = ["Product", "Service", "Subscription", "Digital Product", "Event", "Other"] as const;
const offerStatuses = ['active', 'paused', 'draft', 'completed', 'expired', 'flagged'] as const;


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
    .optional(),
  status: z.enum(offerStatuses, { required_error: "Offer status is required." }),
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

export default function EditOfferPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const offerId = params.offerId as string;

  const [originalOffer, setOriginalOffer] = useState<PlatformOffer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentMediaUrl, setCurrentMediaUrl] = useState<string | undefined>(undefined);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);


  const form = useForm<OfferFormValues>({
    resolver: zodResolver(offerFormSchema),
    defaultValues: { 
      title: "", description: "", offerCategory: "Product", targetAudience: "",
      price: undefined, offerValueDetails: "", commissionRateInput: "", commissionType: "percentage",
      contactPerson: "", contactNumber: "", keySellingPoints: "", offerLink: "",
      mediaFile: undefined, status: 'draft',
    },
  });

  useEffect(() => {
    if (!auth || !db) {
      toast({ title: "Firebase Error", description: "Firebase services are not available.", variant: "destructive" });
      router.push("/auth/corporation-login");
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUserId(user.uid);
      } else {
        toast({ title: "Not Logged In", description: "Please log in to edit offers.", variant: "destructive" });
        router.push("/auth/corporation-login");
      }
    });
    return () => unsubscribe();
  }, [router, toast]);

  useEffect(() => {
    if (offerId && currentUserId && db) {
      setIsLoading(true);
      const fetchOffer = async () => {
        const offerDocRef = doc(db, "platformOffers", offerId);
        try {
          const docSnap = await getDoc(offerDocRef);
          if (docSnap.exists()) {
            const offerData = { id: docSnap.id, ...docSnap.data() } as PlatformOffer;
            if (offerData.corporationId !== currentUserId) {
              toast({ title: "Unauthorized", description: "You are not authorized to edit this offer.", variant: "destructive"});
              router.push("/dashboard/ads");
              return;
            }
            setOriginalOffer(offerData);
            setCurrentMediaUrl(offerData.mediaUrl);

            let commissionRateVal = "";
            if (offerData.commissionType === 'percentage' && offerData.commissionRate.endsWith('%')) {
              commissionRateVal = offerData.commissionRate.replace('%', '');
            } else if (offerData.commissionType === 'fixed_amount' && offerData.commissionRate.startsWith('PKR ')) {
              commissionRateVal = offerData.commissionRate.replace('PKR ', '').replace(/,/g, '');
            } else {
              commissionRateVal = offerData.commissionRate; 
            }

            form.reset({
              title: offerData.title,
              description: offerData.description,
              offerCategory: offerData.offerCategory,
              targetAudience: offerData.targetAudience,
              price: offerData.price,
              offerValueDetails: offerData.offerValueDetails,
              commissionRateInput: commissionRateVal,
              commissionType: offerData.commissionType,
              contactPerson: offerData.contactPerson,
              contactNumber: offerData.contactNumber,
              keySellingPoints: offerData.keySellingPoints || "",
              offerLink: offerData.offerLink || "",
              status: offerData.status,
              mediaFile: undefined,
            });
          } else {
            toast({ title: "Not Found", description: "Offer not found.", variant: "destructive"});
            router.push("/dashboard/ads");
          }
        } catch (error) {
          console.error("Error fetching offer for edit:", error);
          toast({ title: "Error", description: "Could not load offer details.", variant: "destructive"});
        } finally {
          setIsLoading(false);
        }
      };
      fetchOffer();
    }
  }, [offerId, currentUserId, form, router, toast]);

  const resizeImageAndReadAsDataURL = (file: File): Promise<string> => {
    const MAX_DIMENSION = 1280; // Resize to max 1280px on the longest side
    const reader = new FileReader();
    const image = new window.Image();
    const canvas = document.createElement('canvas');

    return new Promise((resolve, reject) => {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        return reject(new Error(`File is too large. Max size is ${MAX_FILE_SIZE_MB}MB.`));
      }
      if (!file.type.startsWith("image/")) {
        return reject(new Error("File is not an image."));
      }

      reader.onload = (e) => {
        if (!e.target?.result) return reject(new Error("Could not read file."));
        image.src = e.target.result as string;
      };
      image.onload = () => {
        let width = image.width;
        let height = image.height;

        if (width > height) {
          if (width > MAX_DIMENSION) {
            height *= MAX_DIMENSION / width;
            width = MAX_DIMENSION;
          }
        } else {
          if (height > MAX_DIMENSION) {
            width *= MAX_DIMENSION / height;
            height = MAX_DIMENSION;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error("Could not get canvas context."));
        ctx.drawImage(image, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.85)); // Use JPEG with 85% quality for smaller size
      };
      image.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  };

  async function onSubmit(data: OfferFormValues) {
    if (!originalOffer || !originalOffer.id || !db) {
        toast({ title: "Error", description: "Original offer data not found or database not ready.", variant: "destructive"});
        return;
    }
    form.formState.isSubmitting;

    let newMediaDataUri: string | undefined = originalOffer.mediaUrl;

    if (data.mediaFile && data.mediaFile.length > 0) {
      const file = data.mediaFile[0];
      if (file.size > MAX_FILE_SIZE_BYTES) {
          toast({ title: "File Too Large", description: `Please upload an image smaller than ${MAX_FILE_SIZE_MB}MB.`, variant: "destructive"});
          form.setError("mediaFile", { message: `File must be under ${MAX_FILE_SIZE_MB}MB` });
          return;
      }
      toast({ title: "Processing media...", description: `Preparing ${file.name}.`});
      try {
        newMediaDataUri = await resizeImageAndReadAsDataURL(file);
        toast({ title: "Media Processed!", description: `${file.name} is ready.`});
      } catch (error) {
        form.setError("mediaFile", { type: "manual", message: "Error processing file. Please try a different image." });
        return;
      }
    }
    
    const offerDocRef = doc(db, "platformOffers", originalOffer.id);
    const updatedOfferData: Partial<PlatformOffer> = { // Use Partial as some fields like corporationId are not changed
      title: data.title,
      description: data.description,
      offerCategory: data.offerCategory,
      targetAudience: data.targetAudience,
      price: data.price,
      offerValueDetails: data.offerValueDetails,
      commissionRate: data.commissionType === 'percentage' ? `${data.commissionRateInput}%` : `PKR ${data.commissionRateInput}`,
      commissionType: data.commissionType,
      contactPerson: data.contactPerson,
      contactNumber: data.contactNumber,
      keySellingPoints: data.keySellingPoints,
      offerLink: data.offerLink,
      mediaUrl: newMediaDataUri,
      status: data.status,
      updatedAt: serverTimestamp()
    };
    
    try {
      await updateDoc(offerDocRef, updatedOfferData);
      toast({
        title: "Offer Updated Successfully!",
        description: `Offer "${data.title}" has been updated in Firestore.`,
      });
      router.push("/dashboard/ads");
    } catch (error) {
      console.error("Error updating offer in Firestore:", error);
      toast({ title: "Firestore Error", description: "Could not save offer changes to the database.", variant: "destructive" });
    }
  }

  if (isLoading) {
    return <div className="container mx-auto py-8 px-4 md:px-6 text-center">Loading offer for editing...</div>;
  }
  if (!originalOffer) {
    // This case should ideally be handled by the redirect in useEffect if offer not found or unauthorized
    return (
      <div className="container mx-auto py-8 px-4 md:px-6 text-center">
        <h2 className="text-2xl font-semibold mb-4">Offer Not Found or Unauthorized</h2>
        <Button asChild><Link href="/dashboard/ads"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Offers</Link></Button>
      </div>
    );
  }

  const mediaFileRef = form.register("mediaFile");
  const selectedOfferCategory = form.watch("offerCategory");
  const commissionType = form.watch("commissionType");

  const getCategoryIcon = (category: typeof offerCategories[number] | undefined) => {
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

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <div className="mb-6 flex items-center">
        <Button variant="ghost" size="icon" asChild className="mr-2">
          <Link href="/dashboard/ads"><ArrowLeft className="h-5 w-5" /><span className="sr-only">Back</span></Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Edit Offer</h1>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Modify Offer Details</CardTitle>
              <ShadCardDescription>Update the information for your sales offer.</ShadCardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem><FormLabel>Offer Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )}/>
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem><FormLabel>Offer Description</FormLabel><FormControl><Textarea className="min-h-[150px]" {...field} /></FormControl><FormMessage /></FormItem>
              )}/>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField control={form.control} name="offerCategory" render={({ field }) => (
                  <FormItem><FormLabel>Offer Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><div className="flex items-center gap-2">{getCategoryIcon(selectedOfferCategory)}<SelectValue /></div></SelectTrigger></FormControl>
                      <SelectContent>{offerCategories.map(c => <SelectItem key={c} value={c}><div className="flex items-center gap-2">{getCategoryIcon(c)}{c}</div></SelectItem>)}</SelectContent>
                    </Select><FormMessage />
                  </FormItem>
                )}/>
                <FormField control={form.control} name="targetAudience" render={({ field }) => (
                  <FormItem><FormLabel>Target Audience</FormLabel><div className="flex items-center gap-2"><Users className="h-4 w-4 text-muted-foreground" /><FormControl><Input {...field} /></FormControl></div><FormMessage /></FormItem>
                )}/>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField control={form.control} name="price" render={({ field }) => (
                  <FormItem><FormLabel>Price/Value (PKR) (Optional)</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || undefined)} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
                )}/>
                <FormField control={form.control} name="offerValueDetails" render={({ field }) => (
                  <FormItem><FormLabel>Offer Value Details</FormLabel><div className="flex items-center gap-2"><Tag className="h-4 w-4 text-muted-foreground" /><FormControl><Input {...field} /></FormControl></div><FormMessage /></FormItem>
                )}/>
              </div>
              
               <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem><FormLabel>Offer Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger></FormControl>
                    <SelectContent>{offerStatuses.map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}</SelectContent>
                  </Select><FormMessage />
                </FormItem>
              )}/>

              <FormField control={form.control} name="mediaFile" render={() => (
                <FormItem><FormLabel>New Image/Video (Optional)</FormLabel>
                  {currentMediaUrl && (
                    <div className="mb-2">
                      <p className="text-sm text-muted-foreground mb-1">Current Media:</p>
                      {currentMediaUrl.startsWith('data:image') ? <img src={currentMediaUrl} alt="Current media" className="rounded-md max-w-xs max-h-40 object-contain border p-1" data-ai-hint="offer image"/> :
                       currentMediaUrl.startsWith('data:video') ? <video src={currentMediaUrl} controls className="rounded-md max-w-xs max-h-40 border p-1" data-ai-hint="offer video"/> :
                       <p className="text-xs">Media present (link or other)</p>}
                    </div>
                  )}
                  <FormControl><div className="flex items-center gap-2"><Paperclip className="h-5 w-5 text-muted-foreground" /><Input type="file" accept="image/*,video/*" {...mediaFileRef} className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"/></div></FormControl>
                  <FormDescription>Upload a new file to replace the current one (max ${MAX_FILE_SIZE_MB}MB).</FormDescription><FormMessage />
                </FormItem>
              )}/>

              <Card className="border-accent/50 shadow-sm">
                <CardHeader><CardTitle className="text-xl text-accent flex items-center"><DollarSign className="mr-2 h-5 w-5"/>Commission Details</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField control={form.control} name="commissionType" render={({ field }) => (
                      <FormItem><FormLabel>Commission Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="percentage">% of Sale</SelectItem><SelectItem value="fixed_amount">Fixed (PKR)</SelectItem>
                            <SelectItem value="hybrid">Hybrid</SelectItem><SelectItem value="negotiable">Negotiable</SelectItem>
                          </SelectContent>
                        </Select><FormMessage />
                      </FormItem>
                    )}/>
                    <FormField control={form.control} name="commissionRateInput" render={({ field }) => (
                      <FormItem><FormLabel>{commissionType === "percentage" ? "%" : commissionType === "fixed_amount" ? "Amount (PKR)" : "Details"}</FormLabel>
                        <FormControl><Input type={commissionType==="percentage"||commissionType==="fixed_amount"?"number":"text"} {...field} /></FormControl><FormMessage />
                      </FormItem>
                    )}/>
                  </div>
                </CardContent>
              </Card>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField control={form.control} name="contactPerson" render={({ field }) => (
                  <FormItem><FormLabel>Contact Person</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                <FormField control={form.control} name="contactNumber" render={({ field }) => (
                  <FormItem><FormLabel>Contact Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
              </div>
              <FormField control={form.control} name="keySellingPoints" render={({ field }) => (
                <FormItem><FormLabel>Key Selling Points (Optional)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )}/>
              <FormField control={form.control} name="offerLink" render={({ field }) => (
                <FormItem><FormLabel>Offer Link (Optional)</FormLabel><div className="flex items-center gap-2"><LinkIcon className="h-4 w-4 text-muted-foreground" /><FormControl><Input {...field} /></FormControl></div><FormMessage /></FormItem>
              )}/>
            </CardContent>
            <CardFooter className="flex justify-end gap-2 border-t pt-6">
              <Button variant="outline" asChild><Link href="/dashboard/ads">Cancel</Link></Button>
              <Button type="submit" className="bg-accent hover:bg-accent/90 text-accent-foreground" disabled={form.formState.isSubmitting}><Save className="mr-2 h-4 w-4" />Save Changes</Button>
            </CardFooter>
          </Card>
        </form>
      </Form>
    </div>
  );
}

    