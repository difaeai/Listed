
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import React, { useState, useEffect, useRef } from "react";
import { ArrowLeft, Save, Lightbulb, DollarSign, Percent, Briefcase, FileText, Info, Mail, Image as ImageIcon } from "lucide-react";

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
import type { FundingPitch, IndustryType } from '@/app/offers/my-ads/page';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebaseConfig';
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";

const industries: IndustryType[] = ["Technology", "Real Estate", "Healthcare", "Education", "Manufacturing", "Retail", "Services", "Agriculture", "Fintech", "E-commerce", "Other"];

const MAX_FILE_SIZE_MB = 1;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const pitchFormSchema = z.object({
  projectTitle: z.string().min(5, "Project title must be at least 5 characters.").max(100, "Project title must be 100 characters or less."),
  projectSummary: z.string().min(50, "Summary must be at least 50 characters.").max(1000, "Summary must be 1000 characters or less."),
  fundingAmountSought: z.coerce.number().positive("Funding amount must be a positive number.").min(100000, "Minimum funding amount is PKR 100,000."),
  equityOffered: z.coerce.number().min(0.1, "Equity offered must be at least 0.1%.").max(90, "Equity offered cannot exceed 90%."),
  industry: z.enum(industries as [string, ...string[]], { required_error: "Please select an industry." }),
  businessPlanLink: z.string().url("Please enter a valid URL for your business plan (e.g., Google Drive, Dropbox).").optional().or(z.literal('')),
  contactEmail: z.string().email("Please enter a valid contact email."),
  pitchImageFile: z.custom<FileList>().optional()
    .refine(files => !files || files.length === 0 || files[0].type.startsWith("image/"), {
      message: "Only image files are allowed.",
    })
    .refine(files => !files || files.length === 0 || files[0].size <= MAX_FILE_SIZE_BYTES, {
      message: `Image must be smaller than ${MAX_FILE_SIZE_MB}MB to avoid save errors.`,
    }),
  status: z.enum(['draft', 'seeking_funding', 'funded', 'closed'], { required_error: "Pitch status is required."}),
});

export type PitchFormValues = z.infer<typeof pitchFormSchema>;

export default function EditCorporationPitchPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const pitchId = params.pitchId as string;
  const { currentUser: authUser, loading: authLoading } = useAuth();

  const [originalPitch, setOriginalPitch] = useState<FundingPitch | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null | undefined>(undefined);
  const pitchImageFileRef = useRef<HTMLInputElement>(null);

  const form = useForm<PitchFormValues>({
    resolver: zodResolver(pitchFormSchema),
    defaultValues: {
      projectTitle: "", projectSummary: "", fundingAmountSought: "" as unknown as number,
      equityOffered: "" as unknown as number, industry: undefined, businessPlanLink: "",
      contactEmail: "", pitchImageFile: undefined, status: 'draft',
    },
  });

  useEffect(() => {
    if (!pitchId || !db || authLoading) { setIsLoading(false); return; }
    if (!authUser) {
        toast({ title: "Unauthorized", variant: "destructive" });
        router.push("/auth/corporation-login");
        setIsLoading(false); return;
    }

    setIsLoading(true);
    const pitchDocRef = doc(db, "fundingPitches", pitchId);
    getDoc(pitchDocRef).then(docSnap => {
      if (docSnap.exists() && docSnap.data().creatorId === authUser.uid) {
        const pitchData = { id: docSnap.id, ...docSnap.data() } as FundingPitch;
        setOriginalPitch(pitchData);
        setCurrentImageUrl(pitchData.pitchImageUrl);
        form.reset({
          projectTitle: pitchData.projectTitle, projectSummary: pitchData.projectSummary,
          fundingAmountSought: pitchData.fundingAmountSought, equityOffered: pitchData.equityOffered,
          industry: pitchData.industry as IndustryType, businessPlanLink: pitchData.businessPlanLink || "",
          contactEmail: pitchData.contactEmail, status: pitchData.status,
          pitchImageFile: undefined,
        });
      } else {
        toast({ title: "Not Found or Unauthorized", variant: "destructive" });
        router.push("/dashboard/my-funding-pitches");
      }
    }).catch(error => {
      console.error("Error fetching pitch for edit:", error);
      toast({ title: "Error", description: "Could not load pitch details.", variant: "destructive" });
    }).finally(() => setIsLoading(false));
  }, [pitchId, authUser, authLoading, form, router, toast]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        toast({
          title: "Image Too Large",
          description: `Please select an image smaller than ${MAX_FILE_SIZE_MB}MB.`,
          variant: "destructive",
        });
        if (pitchImageFileRef.current) {
          pitchImageFileRef.current.value = "";
        }
        form.setValue("pitchImageFile", undefined, { shouldValidate: true });
      } else {
        form.setValue("pitchImageFile", event.target.files ?? undefined, { shouldValidate: true });
      }
    } else {
      form.setValue("pitchImageFile", undefined, { shouldValidate: true });
    }
  };
  
  async function onSubmit(data: PitchFormValues) {
    if (!originalPitch || !originalPitch.id || !db || !authUser || authUser.uid !== originalPitch.creatorId) return;

    let newPitchImageValue: string | null | undefined = originalPitch.pitchImageUrl;
    if (data.pitchImageFile && data.pitchImageFile.length > 0) {
      const file = data.pitchImageFile[0];
      try {
        newPitchImageValue = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = (error) => reject(error);
          reader.readAsDataURL(file);
        });
      } catch (error) {
        toast({ title: "Image Error", variant: "destructive" }); return;
      }
    }

    const pitchDocRef = doc(db, "fundingPitches", originalPitch.id!);
    const updatedPitchData: Partial<FundingPitch> = {
      projectTitle: data.projectTitle, projectSummary: data.projectSummary,
      fundingAmountSought: data.fundingAmountSought, equityOffered: data.equityOffered,
      industry: data.industry as IndustryType, businessPlanLink: data.businessPlanLink || null,
      contactEmail: data.contactEmail, status: data.status,
      pitchImageUrl: newPitchImageValue, updatedAt: serverTimestamp()
    };

    try {
      await updateDoc(pitchDocRef, updatedPitchData);
      toast({ title: "Pitch Updated Successfully!" });
      router.push("/dashboard/my-funding-pitches");
    } catch (error: any) {
      toast({ title: "Error Updating Pitch", description: error.message, variant: "destructive" });
    }
  }

  if (isLoading || authLoading) return <div className="container mx-auto py-8 text-center">Loading...</div>;
  if (!originalPitch) return <div className="container mx-auto py-8 text-center">Pitch not found or you do not have permission to edit it.</div>;

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <div className="mb-6 flex items-center">
        <Button variant="ghost" size="icon" asChild className="mr-2">
          <Link href="/dashboard/my-funding-pitches"><ArrowLeft className="h-5 w-5" /></Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Edit Business Pitch</h1>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Card className="shadow-lg">
            <CardHeader><CardTitle>Modify Pitch Details</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <FormField control={form.control} name="projectTitle" render={({ field }) => (
                  <FormItem><FormLabel>Project Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )}/>
              <FormField control={form.control} name="projectSummary" render={({ field }) => (
                  <FormItem><FormLabel>Executive Summary</FormLabel><FormControl><Textarea className="min-h-[150px]" {...field} /></FormControl><FormMessage /></FormItem>
              )}/>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField control={form.control} name="fundingAmountSought" render={({ field }) => (
                    <FormItem><FormLabel>Funding Amount (PKR)</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
                )}/>
                <FormField control={form.control} name="equityOffered" render={({ field }) => (
                    <FormItem><FormLabel>Equity Offered (%)</FormLabel><FormControl><Input type="number" step="0.1" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
                )}/>
              </div>
              <FormField control={form.control} name="industry" render={({ field }) => (
                  <FormItem><FormLabel>Industry</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>{industries.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
                  </Select><FormMessage /></FormItem>
              )}/>
              <FormField control={form.control} name="pitchImageFile" render={() => (
                <FormItem><FormLabel>New Pitch Image (Optional, Up to ${MAX_FILE_SIZE_MB}MB)</FormLabel>
                  {currentImageUrl && <div className="mb-2"><img src={currentImageUrl} alt="Current pitch" className="rounded-md max-w-xs max-h-40 object-contain border p-1" data-ai-hint="project image"/></div>}
                  <FormControl><Input type="file" accept="image/*" ref={pitchImageFileRef} onChange={handleFileChange} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}/>
              <FormField control={form.control} name="businessPlanLink" render={({ field }) => (
                  <FormItem><FormLabel>Business Plan/Deck Link (Optional)</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
              )}/>
              <FormField control={form.control} name="contactEmail" render={({ field }) => (
                  <FormItem><FormLabel>Contact Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
              )}/>
              <FormField control={form.control} name="status" render={({ field }) => (
                  <FormItem><FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>{(['draft', 'seeking_funding', 'funded', 'closed'] as const).map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}</SelectContent>
                  </Select><FormMessage /></FormItem>
              )}/>
            </CardContent>
            <CardFooter className="flex justify-end gap-2 border-t pt-6">
              <Button variant="outline" asChild><Link href={`/dashboard/my-funding-pitches/view/${pitchId}`}>Cancel</Link></Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                <Save className="mr-2 h-4 w-4" />{form.formState.isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </CardFooter>
          </Card>
        </form>
      </Form>
    </div>
  );
}

    