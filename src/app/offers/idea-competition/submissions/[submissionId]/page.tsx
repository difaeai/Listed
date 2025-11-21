
"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Lightbulb, Loader2, Calendar, Award, User, Info, FileText, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebaseConfig';
import { doc, getDoc, Timestamp } from 'firebase/firestore';
import { format } from 'date-fns';
import { Separator } from '@/components/ui/separator';

interface IdeaSubmission {
  id: string;
  userId: string;
  userName: string;
  ideaTitle: string;
  ideaDescription: string;
  competitionId: string;
  competitionTitle: string;
  status: 'submitted' | 'reviewed' | 'shortlisted' | 'winner';
  bannerImage?: string;
  createdAt: Timestamp;
}

export default function SubmissionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const submissionId = params.submissionId as string;
  const { currentUser, loading: authLoading } = useAuth();

  const [submission, setSubmission] = useState<IdeaSubmission | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!currentUser) {
      router.push('/auth');
      return;
    }
    if (submissionId && db) {
      const submissionDocRef = doc(db, "ideaSubmissions", submissionId);
      getDoc(submissionDocRef).then(docSnap => {
        if (docSnap.exists()) {
          const data = { id: docSnap.id, ...docSnap.data() } as IdeaSubmission;
          if (data.userId === currentUser.uid) {
            setSubmission(data);
          } else {
            // Unauthorized access attempt
            router.push('/offers/idea-competition');
          }
        } else {
          // Submission not found
          router.push('/offers/idea-competition');
        }
      }).catch(console.error).finally(() => setIsLoading(false));
    }
  }, [submissionId, currentUser, authLoading, router]);

  if (isLoading || authLoading) {
    return <div className="container mx-auto py-8 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto"/> Loading your submission...</div>;
  }

  if (!submission) {
    return (
      <div className="container mx-auto py-8">
        <Button variant="outline" asChild className="mb-4">
          <Link href="/offers/idea-competition"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Competitions</Link>
        </Button>
        <p className="text-center">Submission not found.</p>
      </div>
    );
  }
  
  const getStatusBadgeVariant = (status: IdeaSubmission['status']) => {
    switch (status) {
        case 'submitted': return 'secondary';
        case 'reviewed': return 'outline';
        case 'shortlisted': return 'default';
        case 'winner': return 'default'; // Consider a more distinct style for winner
        default: return 'secondary';
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <Button variant="outline" asChild className="mb-6">
        <Link href="/offers/idea-competition"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Competitions</Link>
      </Button>

      <Card className="shadow-lg max-w-4xl mx-auto">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-3xl">{submission.ideaTitle}</CardTitle>
              <CardDescription>Your submission for "{submission.competitionTitle}"</CardDescription>
            </div>
            <Badge variant={getStatusBadgeVariant(submission.status)} className="text-sm">
                {submission.status.charAt(0).toUpperCase() + submission.status.slice(1)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
            {submission.bannerImage && (
                <div className="my-6">
                    <img src={submission.bannerImage} alt={submission.ideaTitle} className="rounded-lg w-full h-auto max-h-[400px] object-cover shadow-md border" />
                </div>
            )}
            <Separator />
             <div>
                <h3 className="text-lg font-semibold mb-1 flex items-center"><Info className="mr-2 h-5 w-5 text-primary"/>Idea Description</h3>
                <p className="text-muted-foreground whitespace-pre-line text-sm leading-relaxed bg-muted/50 p-4 rounded-md">{submission.ideaDescription}</p>
            </div>
             <Separator />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-md">
                    <User className="h-5 w-5 text-primary"/>
                    <div>
                        <span className="text-muted-foreground">Submitted By:</span>
                        <p className="font-semibold">{submission.userName}</p>
                    </div>
                </div>
                 <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-md">
                    <Calendar className="h-5 w-5 text-primary"/>
                    <div>
                        <span className="text-muted-foreground">Submitted On:</span>
                        <p className="font-semibold">{format(submission.createdAt.toDate(), "dd MMM, yyyy 'at' hh:mm a")}</p>
                    </div>
                </div>
            </div>
        </CardContent>
        <CardFooter className="bg-muted/30 p-4">
             <p className="text-xs text-muted-foreground">Your idea has been submitted and cannot be edited. Results will be announced after the competition ends.</p>
        </CardFooter>
      </Card>
    </div>
  );
}
