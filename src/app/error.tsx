
"use client";

import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';
import Link from 'next/link';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service or console
    console.error("Unhandled Application Error:", error);
    if (error.digest) {
      console.error("Error Digest:", error.digest);
    }
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 p-4 md:p-8">
      <Card className="w-full max-w-lg shadow-xl">
        <CardHeader className="text-center">
          <div className="inline-block mx-auto p-3 bg-destructive/10 rounded-full mb-3">
            <AlertTriangle className="h-10 w-10 text-destructive" />
          </div>
          <CardTitle className="text-2xl md:text-3xl text-destructive">Oops! Something Went Wrong</CardTitle>
          <CardDescription className="text-base text-muted-foreground pt-2">
            We're sorry, but the application encountered an unexpected issue.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-foreground">
            Our team has been notified of this error. Please try refreshing the page or clicking the "Try Again" button.
          </p>
          <p className="text-sm text-muted-foreground">
            If the problem persists, please take a screenshot and contact support through our 
            <Link href="/contact" className="text-primary hover:underline mx-1">Contact Us</Link> 
            page. Your help is appreciated!
          </p>
          <div className="text-xs text-muted-foreground/80 p-2 border rounded-md bg-background">
            <strong>Error Information (for reporting):</strong>
            <p>Timestamp: {new Date().toISOString()}</p>
            {error.digest && <p>Digest: {error.digest}</p>}
            <p className="mt-1">Message: {error.message || "No specific message."}</p>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row gap-3 pt-6 border-t">
          <Button onClick={() => reset()} variant="outline" className="w-full sm:w-auto">
            <RotateCcw className="mr-2 h-4 w-4" /> Try Again
          </Button>
          <Button asChild className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground">
            <Link href="/">
              <Home className="mr-2 h-4 w-4" /> Go to Homepage
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
