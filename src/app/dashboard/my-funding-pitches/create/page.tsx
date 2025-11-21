
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Lightbulb, DollarSign, Percent, Briefcase, FileText, Info, Mail, Image as ImageIcon, Sparkles, Loader2, AlertTriangle } from "lucide-react";
import React, { useState, useEffect, useRef } from 'react';

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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import type { FundingPitch, IndustryType } from '@/app/offers/my-ads/page';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebaseConfig';
import { collection, addDoc, serverTimestamp, Timestamp, query, where, getDocs } from "firebase/firestore";
import { improveProjectSummary, type DetailedPitchOutput } from '@/ai/flows/improve-summary-flow';
import { Alert, AlertTitle as ShadAlertTitle, AlertDescription as ShadAlertDescription } from "@/components/ui/alert";
import { isFuture } from "date-fns";


const industries = ["Technology", "Real Estate", "Healthcare", "Education", "Manufacturing", "Retail", "Services", "Agriculture", "Fintech", "E-commerce", "Other"] as const;

const MAX_FILE_SIZE_MB = 1;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const pitchFormSchema = z.object({
  projectTitle: z.string().min(5, "Project title must be at least 5 characters.").max(100, "Project title must be 100 characters or less."),
  projectSummary: z.string().min(50, "Summary must be at least 50 characters.").max(1000, "Summary must be 1000 characters or less."),
  fundingAmountSought: z.coerce.number().positive("Funding amount must be a positive number.").min(100000, "Minimum funding amount is PKR 100,000."),
  equityOffered: z.coerce.number().min(0.1, "Equity offered must be at least 0.1%.").max(90, "Equity offered cannot exceed 90%."),
  industry: z.enum(industries, { required_error: "Please select an industry." }),
  businessPlanLink: z.string().url("Please enter a valid URL for your business plan (e.g., Google Drive, Dropbox).").optional().or(z.literal('')),
  contactEmail: z.string().email("Please enter a valid contact email."),
  pitchImageFile: z.custom<FileList>().optional()
    .refine(files => !files || files.length === 0 || files[0].type.startsWith("image/"), {
      message: "Only image files are allowed.",
    })
    .refine(files => !files || files.length === 0 || files[0].size <= MAX_FILE_SIZE_BYTES, { 
      message: `Image must be smaller than ${MAX_FILE_SIZE_MB}MB to avoid save errors.`,
    }),
});

export type PitchFormValues = z.infer<typeof pitchFormSchema>;

export default function CreateCorporationPitchPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { currentUser: authUser, loading: authLoading } = useAuth();
  
  const [currentUserInfo, setCurrentUserInfo] = useState<{ uid: string; name: string; email: string; avatarSeed?: string } | null>(null);
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const pitchImageFileRef = useRef<HTMLInputElement>(null);

  const [isAiImproving, setIsAiImproving] = useState(false);
  const [aiImprovedSummary, setAiImprovedSummary] = useState<DetailedPitchOutput | null>(null);
  const [isAiDialogOpenn, setIsAiDialogOpenn] = useState(false);

  const form = useForm<PitchFormValues>({
    resolver: zodResolver(pitchFormSchema),
    defaultValues: {
      projectTitle: "",
      projectSummary: "",
      fundingAmountSought: "" as unknown as number,
      equityOffered: "" as unknown as number,
      industry: undefined,
      businessPlanLink: "",
      contactEmail: "",
      pitchImageFile: undefined,
    },
  });

  useEffect(() => {
    if (authLoading) {
      setIsPageLoading(true);
      return;
    }
    if (authUser && authUser.type === 'company' && db) {
      setCurrentUserInfo({
        uid: authUser.uid,
        name: authUser.corporationName || authUser.name || "Corporation",
        email: authUser.email || "",
        avatarSeed: authUser.avatarSeed,
      });
      form.setValue("contactEmail", authUser.email || "");
    } else if (!authLoading) {
      toast({ title: "Access Denied", description: "You must be logged in as a Corporation to create a funding pitch.", variant: "destructive" });
      router.push("/auth/corporation-login");
    }
    setIsPageLoading(false);
  }, [authLoading, authUser, router, toast, form]);

  const handleImproveSummary = async () => {
    const currentSummary = form.getValues("projectSummary");
    if (!currentSummary || currentSummary.length < 50) {
      toast({ title: "Summary Too Short", description: "Please provide a summary of at least 50 characters for AI improvement.", variant: "destructive" });
      return;
    }
    setIsAiImproving(true);
    try {
      const result = await improveProjectSummary({ summary: currentSummary });
      setAiImprovedSummary(result);
      setIsAiDialogOpenn(true);
    } catch (error) {
      console.error("Error improving summary:", error);
      toast({ title: "AI Improvement Failed", description: "Could not get AI suggestion. Please try again.", variant: "destructive" });
    } finally {
      setIsAiImproving(false);
    }
  };

  async function onSubmit(data: PitchFormValues) {
    setIsSubmitting(true);
    if (!currentUserInfo || !currentUserInfo.uid || !db) {
      toast({ title: "User Error", description: "User information not available. Cannot create pitch. Please re-login.", variant: "destructive" });
      setIsSubmitting(false);
      return;
    }

    let pitchImageValue: string | null = null;
    if (data.pitchImageFile && data.pitchImageFile.length > 0) {
      const file = data.pitchImageFile[0];
      try {
        pitchImageValue = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = (error) => reject(error);
          reader.readAsDataURL(file);
        });
      } catch (error) {
        console.error("Error processing pitch image:", error);
        toast({ title: "Image Error", variant: "destructive" });
        setIsSubmitting(false);
        return;
      }
    }

    const newPitchDataForFirestore: Omit<FundingPitch, 'id' | 'createdAt' | 'updatedAt'> = {
      creatorId: currentUserInfo.uid,
      creatorName: currentUserInfo.name,
      creatorAvatarSeed: currentUserInfo.avatarSeed,
      projectTitle: data.projectTitle,
      projectSummary: data.projectSummary,
      fundingAmountSought: data.fundingAmountSought,
      equityOffered: data.equityOffered,
      industry: data.industry,
      contactEmail: data.contactEmail,
      status: 'seeking_funding',
      views: 0,
      interestedInvestorsCount: 0,
      isDeletedByAdmin: false,
      featureStatus: 'none',
      businessPlanLink: data.businessPlanLink || null,
      pitchImageUrl: pitchImageValue,
      featureRequestedAt: null,
      featurePaymentProofDataUri: null,
      featureEndsAt: null,
    };

    try {
      await addDoc(collection(db, "fundingPitches"), {
        ...newPitchDataForFirestore,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      toast({ title: "Pitch Submitted Successfully!", description: `Your pitch "${data.projectTitle}" has been posted.` });
      router.push("/dashboard/my-funding-pitches");
    } catch (error: any) {
      console.error("Failed to save pitch:", error);
      toast({ title: "Error Saving Pitch", description: "Could not save your pitch.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (authLoading || isPageLoading) {
    return <div className="container mx-auto py-8 px-4 md:px-6 text-center">Initializing...</div>;
  }
  
  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <div className="mb-6 flex items-center">
        <Button variant="ghost" size="icon" asChild className="mr-2">
          <Link href="/dashboard/my-funding-pitches"><ArrowLeft className="h-5 w-5" /></Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight flex items-center">
          <Lightbulb className="mr-3 h-7 w-7 text-primary" /> Create New Business Pitch
        </h1>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Card className="shadow-lg rounded-xl">
            <CardHeader>
              <CardTitle>Pitch Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
               <FormField control={form.control} name="projectTitle" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Title</FormLabel>
                    <FormControl><Input placeholder="E.g., B2B SaaS for Supply Chain Automation" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}/>
                <FormField control={form.control} name="projectSummary" render={({ field }) => (
                  <FormItem>
                    <div className="flex justify-between items-center">
                      <FormLabel>Executive Summary</FormLabel>
                      <Button type="button" variant="outline" size="sm" onClick={handleImproveSummary} disabled={isAiImproving} className="gap-1.5">
                        {isAiImproving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 text-primary" />}
                        Improve with AI
                      </Button>
                    </div>
                    <FormControl><Textarea placeholder="Describe your project, problem, solution, and market." className="min-h-[150px]" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}/>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField control={form.control} name="fundingAmountSought" render={({ field }) => (
                        <FormItem><FormLabel>Funding Amount Sought (PKR)</FormLabel><FormControl><Input type="number" placeholder="e.g., 10000000" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
                    )}/>
                    <FormField control={form.control} name="equityOffered" render={({ field }) => (
                        <FormItem><FormLabel>Equity Offered (%)</FormLabel><FormControl><Input type="number" step="0.1" placeholder="e.g., 15" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
                    )}/>
                </div>
                <FormField control={form.control} name="industry" render={({ field }) => (
                  <FormItem><FormLabel>Industry</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select industry" /></SelectTrigger></FormControl>
                        <SelectContent>{industries.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
                    </Select><FormMessage />
                  </FormItem>
                )}/>
                 <FormField control={form.control} name="pitchImageFile" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pitch Image (Optional, Up to ${MAX_FILE_SIZE_MB}MB)</FormLabel>
                    <FormControl><Input type="file" accept="image/*" ref={pitchImageFileRef} onChange={(e) => field.onChange(e.target.files || undefined)} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}/>
                <FormField control={form.control} name="businessPlanLink" render={({ field }) => (
                  <FormItem><FormLabel>Business Plan / Pitch Deck Link (Optional)</FormLabel><FormControl><Input placeholder="https://link.to/your_deck.pdf" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
                )}/>
                <FormField control={form.control} name="contactEmail" render={({ field }) => (
                  <FormItem><FormLabel>Contact Email</FormLabel><FormControl><Input type="email" placeholder="your.project@email.com" {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
            </CardContent>
            <CardFooter className="flex justify-end gap-2 border-t pt-6">
              <Button variant="outline" asChild><Link href="/dashboard/my-funding-pitches">Cancel</Link></Button>
              <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isSubmitting || authLoading || isPageLoading || !currentUserInfo}>
                <Save className="mr-2 h-4 w-4" />{isSubmitting ? "Posting..." : "Post Pitch"}
              </Button>
            </CardFooter>
          </Card>
        </form>
      </Form>
    </div>
  );
}

    