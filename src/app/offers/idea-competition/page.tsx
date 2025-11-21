
"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Lightbulb, Send, CheckCircle, Loader2, Award, DollarSign, Users, Info, Sparkles, AlertTriangle, Calendar as CalendarIcon, Trophy, School, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebaseConfig';
import { collection, query, where, onSnapshot, Timestamp, doc, orderBy } from 'firebase/firestore';
import { format, isPast } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { CountdownTimer } from '@/components/common/countdown-timer';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';

interface IdeaSubmission {
    id: string;
    userId: string;
    userName: string;
    ideaTitle: string;
    ideaDescription: string;
    competitionId: string;
    competitionTitle: string;
    status: 'submitted' | 'reviewed' | 'shortlisted' | 'winner';
    createdAt: Timestamp;
}

interface Competition {
  id: string;
  title: string;
  description: string;
  rules: string;
  prizeDescription: string;
  winAmount?: string;
  sponsorshipAmount?: string;
  startDate?: Timestamp;
  endDate?: Timestamp;
  status: 'draft' | 'published' | 'archived';
  isAccepting: boolean;
  createdAt: Timestamp;
}

export default function IdeaCompetitionPage() {
    const { currentUser, loading: authLoading } = useAuth();
    const { toast } = useToast();
    const [mySubmissions, setMySubmissions] = useState<IdeaSubmission[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [publishedCompetitions, setPublishedCompetitions] = useState<Competition[]>([]);
    
    useEffect(() => {
        if (!db) {
            setIsLoading(false);
            return;
        }

        const competitionsQuery = query(collection(db, "ideaCompetitions"), where("status", "==", "published"), orderBy("endDate", "desc"));
        const unsubCompetitions = onSnapshot(competitionsQuery, (snapshot) => {
            const comps: Competition[] = [];
            snapshot.forEach(doc => {
                const data = doc.data() as Omit<Competition, 'id'>;
                // Only show competitions that are not past their end date
                if (!data.endDate || !isPast(data.endDate.toDate())) {
                    comps.push({ id: doc.id, ...data });
                }
            });
            setPublishedCompetitions(comps);
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching competitions:", error);
            toast({ title: "Error", description: "Could not load competitions.", variant: "destructive" });
            setIsLoading(false);
        });
        
        let unsubSubmissions = () => {};
        if (currentUser?.uid) {
            const submissionsQuery = query(
                collection(db, 'ideaSubmissions'),
                where('userId', '==', currentUser.uid)
            );
            unsubSubmissions = onSnapshot(submissionsQuery, (snapshot) => {
                const subs: IdeaSubmission[] = [];
                snapshot.forEach(doc => subs.push({ id: doc.id, ...doc.data() } as IdeaSubmission));
                setMySubmissions(subs);
            });
        }

        return () => { unsubCompetitions(); unsubSubmissions(); };

    }, [currentUser?.uid, toast]);

    const userHasSubmittedTo = (competitionId: string) => {
        return mySubmissions.some(sub => sub.competitionId === competitionId);
    };

    const rewardCompetitions = publishedCompetitions.filter(c => c.winAmount && c.winAmount.trim() !== '');
    const sponsorshipCompetitions = publishedCompetitions.filter(c => c.sponsorshipAmount && c.sponsorshipAmount.trim() !== '');
    
    if (isLoading || authLoading) {
        return (
             <div className="container mx-auto py-8 px-4 md:px-6">
                <Button variant="outline" asChild className="mb-4">
                    <Link href="/offers"><ArrowLeft className="mr-2 h-4 w-4" /> Back to User Portal</Link>
                </Button>
                <div className="text-center p-10"><Loader2 className="h-8 w-8 animate-spin mx-auto"/> <p>Loading competitions...</p></div>
             </div>
        )
    }

    const renderCompetitionCard = (comp: Competition) => {
        const hasSubmitted = userHasSubmittedTo(comp.id);
        const submission = mySubmissions.find(s => s.competitionId === comp.id);
        const submissionsClosed = (comp.endDate && isPast(comp.endDate.toDate())) || !comp.isAccepting;

        return (
            <Card key={comp.id} className="shadow-lg flex flex-col border-2 border-transparent hover:border-primary transition-all">
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <CardTitle className="text-xl">{comp.title}</CardTitle>
                        <Badge variant={submissionsClosed ? "destructive" : "default"} className={submissionsClosed ? '' : 'bg-green-600'}>
                            {submissionsClosed ? 'Submissions Closed' : 'Accepting Submissions'}
                        </Badge>
                    </div>
                    <CardDescription className="line-clamp-2 h-[40px]">{comp.description}</CardDescription>
                    {comp.endDate && <CountdownTimer expiryDate={comp.endDate} prefix="Time remaining: " className="text-destructive font-bold"/>}
                </CardHeader>
                <CardContent className="space-y-3 flex-grow">
                    <div className="space-y-3 rounded-lg border bg-muted/30 p-4 h-full">
                        <h3 className="font-semibold text-md">Details:</h3>
                        <p className="text-sm"><strong className="text-primary">Prize:</strong> {comp.prizeDescription}</p>
                        <Separator />
                        <h4 className="font-semibold">Guidelines:</h4>
                        <ScrollArea className="h-24">
                           <p className="text-sm whitespace-pre-line pr-4">{comp.rules}</p>
                        </ScrollArea>
                    </div>
                </CardContent>
                <CardFooter>
                    {hasSubmitted ? (
                        <Button asChild variant="outline" className="w-full">
                            <Link href={`/offers/idea-competition/submissions/${submission?.id}`}>View Your Submission</Link>
                        </Button>
                    ) : (
                        <Button asChild size="lg" className="w-full" disabled={submissionsClosed}>
                            <Link href={`/offers/idea-competition/${comp.id}/submit`}>
                                <Send className="mr-2 h-4 w-4" /> Submit Your Idea
                            </Link>
                        </Button>
                    )}
                </CardFooter>
            </Card>
        );
    }

    return (
        <div className="container mx-auto py-8 px-4 md:px-6 space-y-8">
            <Button variant="outline" asChild className="mb-4">
                <Link href="/offers"><ArrowLeft className="mr-2 h-4 w-4" /> Back to User Portal</Link>
            </Button>
            
            <div className="text-center">
                <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground mb-4">What an "<strong className="text-primary italic">IDEA</strong>" Sir Jee!!!</h1>
                <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
                   This is your moment to shine. Choose your ambition: launch your business with prize money or launch your future with an educational sponsorship abroad.
                </p>
            </div>

            {publishedCompetitions.length === 0 && !isLoading ? (
                <Alert variant="default" className="border-primary/30 bg-primary/5">
                    <Lightbulb className="h-5 w-5 text-primary" />
                    <AlertTitle>No Active Competitions</AlertTitle>
                    <AlertDescription>
                        There are no active idea competitions at the moment. Please check back soon!
                    </AlertDescription>
                </Alert>
            ) : (
                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                    {/* Reward Section */}
                    <section className="space-y-6">
                        <div className="text-center p-6 rounded-lg bg-green-500/10 border border-green-500/20">
                           <DollarSign className="h-10 w-10 text-green-600 mx-auto mb-2" />
                           <h2 className="text-3xl font-bold tracking-tight text-green-700">Compete for Cash</h2>
                           <p className="text-muted-foreground mt-1">Win prize money to fuel your venture and turn your idea into a business.</p>
                        </div>
                        {rewardCompetitions.length > 0 ? (
                            rewardCompetitions.map(comp => renderCompetitionCard(comp))
                        ) : (
                            <p className="text-center text-muted-foreground py-10">No cash prize competitions are active right now.</p>
                        )}
                    </section>

                    {/* Sponsorship Section */}
                    <section className="space-y-6">
                        <div className="text-center p-6 rounded-lg bg-purple-500/10 border border-purple-500/20">
                            <Award className="h-10 w-10 text-purple-600 mx-auto mb-2" />
                           <h2 className="text-3xl font-bold tracking-tight text-purple-700">Win a Sponsorship</h2>
                           <p className="text-muted-foreground mt-1">Secure a fully-funded educational sponsorship to study abroad.</p>
                        </div>
                        {sponsorshipCompetitions.length > 0 ? (
                            sponsorshipCompetitions.map(comp => renderCompetitionCard(comp))
                        ) : (
                            <p className="text-center text-muted-foreground py-10">No sponsorship competitions are active right now.</p>
                        )}
                    </section>
                </div>
            )}
        </div>
    );
}
