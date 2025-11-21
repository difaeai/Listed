
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Briefcase, TrendingUp, DollarSign, ListChecks, Info, Loader2, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { db } from '@/lib/firebaseConfig';
import { doc, getDoc, Timestamp } from 'firebase/firestore';
import type { BusinessDirectoryEntry } from '@/app/admin/manage-directory/page';
import { useAuth } from '@/contexts/AuthContext';
import { isFuture } from 'date-fns';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

export default function BusinessModelDetailPage() {
  const params = useParams();
  const router = useRouter();
  const businessId = params.businessId as string;

  const { currentUser: authUser, loading: authLoading } = useAuth();
  const [businessModel, setBusinessModel] = useState<BusinessDirectoryEntry | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const hasAnnualSubscription = useMemo(() => {
    if (!authUser || authUser.type !== 'professional' || authUser.status !== 'active') return false;
    if (authUser.subscriptionType !== 'yearly') return false;
    if (!authUser.subscriptionExpiryDate) return false;
    const expiryDate = authUser.subscriptionExpiryDate instanceof Timestamp 
      ? authUser.subscriptionExpiryDate.toDate() 
      : new Date(authUser.subscriptionExpiryDate as string | Date);
    return isFuture(expiryDate);
  }, [authUser]);

  useEffect(() => {
    if (authLoading) return;
    if (!hasAnnualSubscription) {
        setIsLoading(false);
        return;
    }

    if (businessId && db) {
      setIsLoading(true);
      const modelDocRef = doc(db, "businessDirectory", businessId);
      getDoc(modelDocRef).then(docSnap => {
        if (docSnap.exists()) {
          const data = docSnap.data() as BusinessDirectoryEntry;
          if (data.status === 'published') {
            setBusinessModel({ ...data, id: docSnap.id });
          } else {
            setBusinessModel(null);
          }
        } else {
          setBusinessModel(null);
        }
        setIsLoading(false);
      }).catch(error => {
        console.error("Error fetching business model:", error);
        setIsLoading(false);
      });
    } else {
      setIsLoading(false);
    }
  }, [businessId, hasAnnualSubscription, authLoading]);

  if (isLoading || authLoading) {
    return (
        <div className="container mx-auto py-8 px-4 md:px-6">
            <Button variant="outline" asChild className="mb-4">
                <Link href="/business-model-directory"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Directory</Link>
            </Button>
            <div className="text-center flex flex-col items-center justify-center py-10">
              <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
              <p>Loading business model details...</p>
            </div>
        </div>
    );
  }

  if (!hasAnnualSubscription) {
    return (
      <div className="container mx-auto py-8 px-4 md:px-6">
        <Button variant="outline" asChild className="mb-4">
            <Link href="/home"><ArrowLeft className="mr-2 h-4 w-4" /> Back to User Portal</Link>
        </Button>
        <Alert variant="default" className="border-yellow-500 bg-yellow-100/80 text-yellow-800">
            <Star className="h-5 w-5 text-yellow-600" />
            <AlertTitle className="font-bold">Premium Feature</AlertTitle>
            <AlertDescription>
                The Business Model Directory is an exclusive feature for Annual Subscribers. Upgrade your plan to unlock these valuable insights and kickstart your entrepreneurial journey.
                <Button asChild variant="link" className="p-0 h-auto ml-2 text-yellow-800 font-bold">
                    <Link href="/verify-payment">Upgrade Now</Link>
                </Button>
            </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!businessModel) {
    return (
      <div className="container mx-auto py-8 px-4 md:px-6 text-center">
        <Button variant="outline" asChild className="mb-4">
            <Link href="/business-model-directory"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Directory</Link>
        </Button>
        <h2 className="text-2xl font-semibold mb-4">Business Model Not Available</h2>
        <p className="text-muted-foreground">The business model you are looking for is not currently published or does not exist.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <Button variant="outline" asChild className="mb-6">
        <Link href="/offers/business-model-directory"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Directory</Link>
      </Button>

      <Card className="shadow-xl rounded-xl overflow-hidden">
        <CardHeader className="bg-muted/30 p-6">
            <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                <div>
                    <CardTitle className="text-3xl font-bold mb-1">{businessModel.businessName}</CardTitle>
                    <div className="flex flex-wrap gap-2 items-center">
                        <Badge variant="secondary"><Briefcase className="mr-1.5 h-4 w-4"/>{businessModel.industry}</Badge>
                        <Badge variant="outline">{businessModel.model}</Badge>
                    </div>
                </div>
                <div className="text-sm text-muted-foreground text-left md:text-right">
                    <p className="flex items-center gap-1.5"><TrendingUp className="h-4 w-4 text-accent"/>Est. Growth: {businessModel.expectedAnnualGrowth}</p>
                    {businessModel.requiredInvestment && (
                        <p className="flex items-center gap-1.5"><DollarSign className="h-4 w-4 text-blue-600"/>Est. Investment: {businessModel.requiredInvestment}</p>
                    )}
                </div>
            </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          <div className="space-y-2">
            <h3 className="text-xl font-semibold flex items-center"><Info className="mr-2 h-5 w-5 text-primary"/>Short Description</h3>
            <p className="text-muted-foreground leading-relaxed">{businessModel.shortDescription}</p>
          </div>
          
          {businessModel.detailedSteps && (
            <>
              <Separator />
              <div className="space-y-2">
                <h3 className="text-xl font-semibold flex items-center"><ListChecks className="mr-2 h-5 w-5 text-primary"/>Detailed Steps / Requirements</h3>
                <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground whitespace-pre-line bg-muted/30 p-4 rounded-md">
                  {businessModel.detailedSteps}
                </div>
              </div>
            </>
          )}

          {businessModel.requiredInvestment && (
            <>
              <Separator />
              <div className="space-y-2">
                <h3 className="text-xl font-semibold flex items-center"><DollarSign className="mr-2 h-5 w-5 text-primary"/>Estimated Initial Investment</h3>
                <p className="text-muted-foreground font-medium text-lg">{businessModel.requiredInvestment}</p>
                <p className="text-xs text-muted-foreground">Note: This is an estimate. Actual investment may vary based on scale, location, and specific business plan.</p>
              </div>
            </>
          )}
        </CardContent>

        <CardFooter className="p-6 border-t bg-muted/30">
            <p className="text-xs text-muted-foreground">
              This information is for guidance. Conduct thorough market research and create a detailed business plan before starting any venture.
            </p>
        </CardFooter>
      </Card>
    </div>
  );
}
