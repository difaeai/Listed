
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import React, { useState, useEffect } from "react";
import { ArrowLeft, Save, Share2, Users, FileText, Image as ImageIcon, MessageCircle, Tag, DollarSign, Percent, Info } from "lucide-react";

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { UserSalesOffer, UserSalesOfferCommissionType } from '@/types/platform-offer';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebaseConfig';
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const offerCategories = ["Collaboration", "Lead Sharing", "Joint Venture", "Service Exchange", "Referral Program", "Other"] as const;
const offerStatuses = ['active', 'paused', 'draft', 'completed'] as const;
const commissionTypes: UserSalesOfferCommissionType[] = ['percentage_split', 'fixed_fee', 'lead_exchange', 'service_swap', 'custom_negotiable'];

const salesOfferFormSchema = z.object({
  title: z.string().min(5, "Offer title must be at least 5 characters.").max(100, "Offer title must be 100 characters or less."),
  description: z.string().min(20, "Description must be at least 20 characters.").max(1000, "Description must be 1000 characters or less."),
  offerCategory: z.enum(offerCategories, { required_error: "Please select an offer category." }),
  targetAudience: z.string().min(5, "Specify who this offer is for."),
  terms: z.string().min(10, "Describe the general terms or additional collaboration details."),
  commissionType: z.enum(commissionTypes as [string, ...string[]]).optional(),
  commissionRateInput: z.string().optional(),
  contactNumber: z.string().regex(/^(\+92|0)?3\d{2}(-|\s)?\d{7}$/, {message: "Please enter a valid Pakistani mobile number."}),
  mediaFile: z.custom<FileList>().optional()
    .refine(files => !files || files.length === 0 || files[0].type.startsWith("image/"), { message: "Only image files are allowed." })
    .refine(files => !files || files.length === 0 || files[0].size <= MAX_FILE_SIZE_BYTES, { message: `Image file size should be less than ${MAX_FILE_SIZE_MB}MB.` }),
  status: z.enum(offerStatuses, { required_error: "Offer status is required." }),
});

export type SalesOfferFormValues = z.infer<typeof salesOfferFormSchema>;

export default function EditSalesOfferPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const offerId = params.offerId as string;
  const { currentUser: authUser, loading: authLoading } = useAuth();

  const [originalOffer, setOriginalOffer] = useState<UserSalesOffer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentImageUrl, setCurrentImageUrl] = useState<string | undefined>(undefined);

  const form = useForm<SalesOfferFormValues>({
    resolver: zodResolver(salesOfferFormSchema),
    defaultValues: {
      title: "", description: "", offerCategory: "Collaboration", targetAudience: "",
      terms: "", commissionType: undefined, commissionRateInput: "", contactNumber: "",
      mediaFile: undefined, status: 'draft',
    },
  });

  useEffect(() => {
    if (authLoading) return;
    if (!authUser || authUser.type !== 'professional' || !db) {
        toast({ title: "Unauthorized", description: "You must be logged in to edit this offer.", variant: "destructive" });
        router.push("/auth");
        return;
    }

    if (offerId && db) {
      setIsLoading(true);
      const fetchOffer = async () => {
        const offerDocRef = doc(db, "userSalesOffers", offerId);
        try {
          const docSnap = await getDoc(offerDocRef);
          if (docSnap.exists()) {
            const offerData = { id: docSnap.id, ...docSnap.data() } as UserSalesOffer;
            if (offerData.creatorId !== authUser.uid) {
                toast({ title: "Access Denied", description: "You are not authorized to edit this offer.", variant: "destructive"});
                router.push("/offers/my-sales");
                return;
            }
            setOriginalOffer(offerData);
            setCurrentImageUrl(offerData.mediaUrl);
            form.reset({
              title: offerData.title,
              description: offerData.description,
              offerCategory: offerData.offerCategory,
              targetAudience: offerData.targetAudience,
              terms: offerData.terms,
              commissionType: offerData.commissionType,
              commissionRateInput: offerData.commissionRateInput || "",
              contactNumber: offerData.contactNumber,
              status: offerData.status,
              mediaFile: undefined,
            });
          } else {
            toast({ title: "Not Found", description: "Sales offer not found.", variant: "destructive"});
            router.push("/offers/my-sales");
          }
        } catch (error) {
          console.error("Error fetching sales offer for edit:", error);
          toast({ title: "Error", description: "Could not load sales offer details.", variant: "destructive"});
        } finally {
          setIsLoading(false);
        }
      };
      fetchOffer();
    }
  }, [offerId, authUser, authLoading, form, router, toast]);

  async function onSubmit(data: SalesOfferFormValues) {
    if (!originalOffer || !originalOffer.id || !db || !authUser || authUser.uid !== originalOffer.creatorId) {
        toast({ title: "Error", description: "Offer data not found or unauthorized.", variant: "destructive"});
        return;
    }
    setIsSubmitting(true);

    let imageUrl: string | undefined = originalOffer.mediaUrl;
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

    const offerDocRef = doc(db, "userSalesOffers", originalOffer.id);
    const updatedOfferData: Partial<UserSalesOffer> = {
      title: data.title,
      description: data.description,
      offerCategory: data.offerCategory,
      targetAudience: data.targetAudience,
      terms: data.terms,
      commissionType: data.commissionType as UserSalesOfferCommissionType | undefined,
      commissionRateInput: data.commissionRateInput,
      contactNumber: data.contactNumber,
      status: data.status,
      mediaUrl: imageUrl,
      updatedAt: serverTimestamp(),
    };
    
    try {
      await updateDoc(offerDocRef, updatedOfferData);
      toast({ title: "Sales Offer Updated!", description: `Offer "${data.title}" has been updated in Firestore.` });
      router.push("/offers/my-sales");
    } catch (error) {
      console.error("Error updating sales offer in Firestore:", error);
      toast({ title: "Firestore Error", description: "Could not save offer changes.", variant: "destructive" });
    } finally {
        setIsSubmitting(false);
    }
  }

  if (isLoading || authLoading) {
    return <div className="container mx-auto py-8 px-4 md:px-6 text-center">Loading offer for editing...</div>;
  }
  if (!originalOffer && !isLoading && !authLoading) {
    return (
      <div className="container mx-auto py-8 px-4 md:px-6 text-center">
        <h2 className="text-2xl font-semibold mb-4">Sales Offer Not Found</h2>
        <Button asChild><Link href="/offers/my-sales"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Generate Revenue</Link></Button>
      </div>
    );
  }

  const mediaFileRef = form.register("mediaFile");

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <div className="mb-6 flex items-center">
        <Button variant="ghost" size="icon" asChild className="mr-2">
          <Link href="/offers/my-sales"><ArrowLeft className="h-5 w-5" /></Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Edit Sales Offer</h1>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Modify Sales Offer Details</CardTitle>
              <ShadCardDescription>Update the information for your sales offer.</ShadCardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem><FormLabel>Offer Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )}/>
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem><FormLabel>Offer Description</FormLabel><FormControl><Textarea className="min-h-[120px]" {...field} /></FormControl><FormMessage /></FormItem>
              )}/>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField control={form.control} name="offerCategory" render={({ field }) => (
                  <FormItem><FormLabel>Offer Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger></FormControl>
                      <SelectContent>{offerCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select><FormMessage />
                  </FormItem>
                )}/>
                 <FormField control={form.control} name="targetAudience" render={({ field }) => (
                  <FormItem><FormLabel>Target Sales Professionals</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
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
                <FormItem><FormLabel>General Terms & Collaboration Details</FormLabel><FormControl><Textarea className="min-h-[100px]" {...field} /></FormControl><FormMessage /></FormItem>
              )}/>
              <FormField control={form.control} name="contactNumber" render={({ field }) => (
                  <FormItem><FormLabel>Contact Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )}/>
              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem><FormLabel>Offer Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger></FormControl>
                    <SelectContent>{offerStatuses.map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}</SelectContent>
                  </Select><FormMessage />
                </FormItem>
              )}/>
              <FormField control={form.control} name="mediaFile" render={() => (
                <FormItem><FormLabel>New Image (Optional)</FormLabel>
                  {currentImageUrl && (
                    <div className="mb-2"><p className="text-sm text-muted-foreground mb-1">Current Image:</p><img src={currentImageUrl} alt="Current offer" className="rounded-md max-w-xs max-h-40 object-contain border p-1" data-ai-hint="offer image medium"/></div>
                  )}
                  <FormControl><div className="flex items-center gap-2"><ImageIcon className="h-5 w-5 text-muted-foreground" /><Input type="file" accept="image/*" {...mediaFileRef} className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"/></div></FormControl>
                  <FormDescription>Upload a new image to replace the current one (max ${MAX_FILE_SIZE_MB}MB).</FormDescription><FormMessage />
                </FormItem>
              )}/>
            </CardContent>
            <CardFooter className="flex justify-end gap-2 border-t pt-6">
              <Button variant="outline" asChild><Link href="/offers/my-sales">Cancel</Link></Button>
              <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isSubmitting || authLoading}>
                <Save className="mr-2 h-4 w-4" />{isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </CardFooter>
          </Card>
        </form>
      </Form>
    </div>
  );
}
