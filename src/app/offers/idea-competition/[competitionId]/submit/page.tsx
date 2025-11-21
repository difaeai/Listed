
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Lightbulb, Send, Loader2, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebaseConfig';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";

interface Competition {
  id: string;
  title: string;
}

const MAX_FILE_SIZE_MB = 2;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const ideaFormSchema = z.object({
  ideaTitle: z.string().min(5, "Title must be at least 5 characters.").max(150, "Title must be under 150 characters."),
  ideaDescription: z.string().min(100, "Description must be at least 100 characters to be considered.").max(3000, "Description must be under 3000 characters."),
  bannerImage: z.custom<FileList>().optional()
    .refine(files => !files || files.length === 0 || files[0].type.startsWith("image/"), {
      message: "Only image files are allowed.",
    })
    .refine(files => !files || files.length === 0 || files[0].size <= MAX_FILE_SIZE_BYTES, { 
      message: `Image must be smaller than ${MAX_FILE_SIZE_MB}MB.`,
    }),
});

type IdeaFormValues = z.infer<typeof ideaFormSchema>;

export default function SubmitIdeaPage() {
    const params = useParams();
    const router = useRouter();
    const competitionId = params.competitionId as string;

    const { currentUser, loading: authLoading } = useAuth();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [competition, setCompetition] = useState<Competition | null>(null);
    const [isLoadingCompetition, setIsLoadingCompetition] = useState(true);

    const form = useForm<IdeaFormValues>({
        resolver: zodResolver(ideaFormSchema),
        defaultValues: { ideaTitle: "", ideaDescription: "", bannerImage: undefined },
    });

    useEffect(() => {
        if (competitionId && db) {
            const compDocRef = doc(db, "ideaCompetitions", competitionId);
            getDoc(compDocRef).then(docSnap => {
                if (docSnap.exists()) {
                    setCompetition({ id: docSnap.id, ...docSnap.data() } as Competition);
                } else {
                    toast({ title: "Error", description: "Competition not found.", variant: "destructive" });
                    router.push("/offers/idea-competition");
                }
            }).catch(() => {
                toast({ title: "Error", description: "Could not load competition details.", variant: "destructive" });
                router.push("/offers/idea-competition");
            }).finally(() => {
                setIsLoadingCompetition(false);
            });
        }
    }, [competitionId, router, toast]);

    const onSubmit = async (values: IdeaFormValues) => {
        if (!competition) {
             toast({ title: "Submission Error", description: "Competition details are missing.", variant: "destructive" });
             return;
        }
        if (!currentUser?.uid || !currentUser.name) {
            toast({ title: "Authentication Error", description: "You must be logged in to submit an idea.", variant: "destructive" });
            return;
        }
        setIsSubmitting(true);

        let imageUrl: string | undefined = undefined;
        if (values.bannerImage && values.bannerImage.length > 0) {
            const file = values.bannerImage[0];
            try {
                imageUrl = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = (event) => resolve(event.target?.result as string);
                    reader.onerror = (error) => reject(error);
                    reader.readAsDataURL(file);
                });
            } catch (error) {
                form.setError("bannerImage", { message: "Failed to process image file." });
                setIsSubmitting(false);
                return;
            }
        }

        try {
            await addDoc(collection(db, "ideaSubmissions"), {
                userId: currentUser.uid,
                userName: currentUser.name,
                ...values,
                bannerImage: imageUrl,
                competitionId: competition.id,
                competitionTitle: competition.title,
                status: 'submitted',
                createdAt: serverTimestamp(),
            });
            toast({
                title: "Idea Submitted!",
                description: `Your idea has been entered into "${competition.title}". Good luck!`,
                variant: "default",
            });
            router.push('/offers/idea-competition');
        } catch (error) {
            console.error("Error submitting idea:", error);
            toast({ title: "Submission Failed", description: "Could not submit your idea.", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (authLoading || isLoadingCompetition) {
        return <div className="container mx-auto py-8 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto"/> Loading Submission Form...</div>;
    }

    return (
        <div className="container mx-auto py-8 px-4 md:px-6">
            <Button variant="outline" asChild className="mb-4">
                <Link href="/offers/idea-competition"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Competitions</Link>
            </Button>
            <Card className="shadow-lg max-w-3xl mx-auto">
                 <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)}>
                        <CardHeader>
                            <CardTitle className="text-2xl">Submit Your Idea</CardTitle>
                            <CardDescription>You are submitting to the competition: <strong className="text-primary">{competition?.title || '...'}</strong></CardDescription>
                        </CardHeader>
                         <CardContent className="space-y-6">
                             <FormField control={form.control} name="ideaTitle" render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-lg font-semibold">Your Idea's Title</FormLabel>
                                    <FormControl><Input placeholder="A catchy, descriptive title for your concept" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                            <FormField control={form.control} name="ideaDescription" render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-lg font-semibold">Detailed Description</FormLabel>
                                    <FormControl><Textarea placeholder="Explain the problem, your solution, the target market, and what makes your idea unique." className="min-h-[250px]" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                            <FormField control={form.control} name="bannerImage" render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-lg font-semibold">Banner Image (Optional)</FormLabel>
                                    <FormControl>
                                        <div className="flex items-center gap-2">
                                            <ImageIcon className="h-5 w-5 text-muted-foreground" />
                                            <Input type="file" accept="image/*" onChange={(e) => field.onChange(e.target.files)} />
                                        </div>
                                    </FormControl>
                                    <FormDescription>Upload a banner or concept image for your idea (max {MAX_FILE_SIZE_MB}MB).</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                        </CardContent>
                        <CardFooter>
                            <Button type="submit" size="lg" className="w-full md:w-auto" disabled={isSubmitting}>
                                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Send className="mr-2 h-4 w-4"/>}
                                {isSubmitting ? "Submitting..." : "Finalize & Submit Idea"}
                            </Button>
                        </CardFooter>
                    </form>
                </Form>
            </Card>
        </div>
    );
}
