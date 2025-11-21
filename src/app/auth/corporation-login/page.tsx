
"use client";

import Link from 'next/link';
import { Briefcase, Zap } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SignInForm } from "../components/sign-in-form"; 
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { AuthProvider } from '@/contexts/AuthContext';
import React from 'react';

function CorporationLoginPageContent() {
  // The onAuthFlowComplete prop is no longer needed.
  // The AuthContext's onAuthStateChanged listener handles all post-auth logic.
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="mb-8 text-center">
        <Link href="/" className="inline-block">
          <div className="flex items-center justify-center mb-2 cursor-pointer hover:opacity-80 transition-opacity">
            <Zap className="h-10 w-10 text-primary mr-2" />
            <h1 className="text-4xl font-bold text-primary">LISTED</h1>
          </div>
        </Link>
        <p className="text-muted-foreground">
          Connecting businesses with sales professionals and investors.
        </p>
      </div>
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <div className="inline-block mx-auto p-3 bg-primary/10 rounded-full mb-3">
            <Briefcase className="h-8 w-8 text-primary" />
          </div>
          <CardTitle>
            Corporation Sign In
          </CardTitle>
          <CardDescription>
            Access your LISTED Corporation account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <SignInForm userType="company" />
        </CardContent>
        <CardFooter className="flex flex-col items-center pt-6 border-t">
          <p className="text-sm text-muted-foreground mb-2">
            New Corporation? Company accounts are created by administrators.
          </p>
          <Button
            variant="outline"
            asChild
            className="w-full"
          >
            <Link href="/contact">Contact Us for Onboarding</Link>
          </Button>
          <Separator className="my-4" />
          <Button variant="link" size="sm" asChild className="mt-1 text-primary text-center">
            <Link href="/auth">Looking for funding or sales? Login/Signup here!</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

export default function CorporationLoginPageWithProvider() {
  return (
    <AuthProvider>
      <CorporationLoginPageContent />
    </AuthProvider>
  );
}
