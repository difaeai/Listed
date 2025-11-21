

"use client";

import React, { useEffect, useState, Suspense, useCallback } from "react";
import { Lightbulb, Landmark, Zap, Loader2, UserPlus, Briefcase, ShieldAlert } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { User as FirebaseUser } from "firebase/auth";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SignInForm } from "./components/sign-in-form";
import { SimpleSignUpForm } from "./components/simple-signup-form";
import { InvestorSignUpForm } from "./components/investor-signup-form";
import { CompanySignUpForm } from "./components/company-signup-form";
import { AdminSignUpForm } from "./components/admin-signup-form";
import { useToast } from "@/hooks/use-toast";
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { cn } from "@/lib/utils";
import type { RegisteredUserEntry, AuthPageUserType } from "@/app/auth/components/auth-shared-types";
import { Separator } from "@/components/ui/separator";
import { db } from '@/lib/firebaseConfig';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';

interface SignupVisibilitySettings {
  enableInvestorSignup: boolean;
  enableCompanySignup: boolean;
  enableStartupSignup: boolean;
}

const initialSignupVisibilitySettings: SignupVisibilitySettings = {
  enableInvestorSignup: false,
  enableCompanySignup: false,
  enableStartupSignup: true, 
};


function AuthPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { loading: authContextLoading, currentUser } = useAuth();

  const [selectedUserTypeUI, setSelectedUserTypeUI] = useState<AuthPageUserType>("professional");
  const [activeTab, setActiveTab] = useState("signin");
  const [signupVisibility, setSignupVisibility] = useState<SignupVisibilitySettings>(initialSignupVisibilitySettings);
  const [isFetchingVisibility, setIsFetchingVisibility] = useState(true);

  useEffect(() => {
    if (!db) {
      setIsFetchingVisibility(false);
      toast({ title: "Error", description: "Database connection failed.", variant: "destructive" });
      return;
    }
    const visibilityDocRef = doc(db, "siteContent", "signupVisibilitySettings");
    const unsubscribe = onSnapshot(visibilityDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setSignupVisibility({
          enableInvestorSignup: data.enableInvestorSignup === true,
          enableCompanySignup: data.enableCompanySignup === true,
          enableStartupSignup: data.enableStartupSignup !== false,
        });
      } else {
        setSignupVisibility(initialSignupVisibilitySettings);
      }
      setIsFetchingVisibility(false);
    }, (error) => {
      console.error("Error fetching signup visibility settings:", error);
      setSignupVisibility(initialSignupVisibilitySettings);
      toast({ title: "Configuration Error", description: "Could not load signup options.", variant: "destructive" });
      setIsFetchingVisibility(false);
    });

    return () => unsubscribe();
  }, [toast]);


  // This handles query params for deep linking and showing toasts
  useEffect(() => {
    const actionParam = searchParams.get('action');
    const reasonParam = searchParams.get('reason');
    let userTypeParamFromQuery = searchParams.get('userType') as AuthPageUserType | null;

    if (actionParam === 'signup_startup' && signupVisibility?.enableStartupSignup) {
        if (activeTab !== 'signup_startup') setActiveTab('signup_startup');
    } else if (actionParam === 'signup_investor' && signupVisibility?.enableInvestorSignup) {
      if (activeTab !== 'signup_investor') setActiveTab('signup_investor');
    } else if (actionParam === 'signup_company' && signupVisibility?.enableCompanySignup) {
      if (activeTab !== 'signup_company') setActiveTab('signup_company');
    } else if (actionParam === 'signup') { 
        if (activeTab !== 'signup_startup' && signupVisibility.enableStartupSignup) setActiveTab('signup_startup');
        else if (activeTab !== 'signup_investor' && signupVisibility.enableInvestorSignup) setActiveTab('signup_investor');
        else if (activeTab !== 'signup_company' && signupVisibility.enableCompanySignup) setActiveTab('signup_company');
        else if (activeTab !== 'signin') setActiveTab('signin'); // Fallback if no signup active
    } else if (actionParam === 'signin') {
        if (activeTab !== 'signin') setActiveTab('signin');
    }

    if (userTypeParamFromQuery === 'professional' || userTypeParamFromQuery === 'investor') {
      setSelectedUserTypeUI(userTypeParamFromQuery);
    } else if (userTypeParamFromQuery === 'company') {
       router.push('/auth/corporation-login');
       return;
    }

    if (reasonParam) {
        let toastTitle = "Notification";
        let toastDescription = reasonParam;
        let toastVariant: "default" | "destructive" = "default";

        if (reasonParam.startsWith('logout')) { toastTitle = "Logged Out"; toastDescription = "You have been successfully logged out."; }
        else if (reasonParam.startsWith('unauthorized_') || reasonParam.startsWith('missing_user_data')) {
            toastTitle = "Access Denied"; toastVariant = "destructive";
            if (reasonParam.includes('corporation')) toastDescription = "Please log in as a Corporation to access this section.";
            else if (reasonParam.includes('offers_') || reasonParam.includes('user_portal') || reasonParam.includes('professional')) toastDescription = "Please log in to access this section.";
            else if (reasonParam.includes('investor')) toastDescription = "Please log in as an Investor to access this section.";
            else if (reasonParam.includes('admin')) toastDescription = "Please log in as an Admin to access the Admin Panel.";
            else toastDescription = "Please log in to access this section.";
        } else if (reasonParam.includes('verify_payment') || reasonParam.includes('payment_required')) {
            toastTitle = "Action Required"; toastDescription = "Your account requires payment verification or subscription renewal.";
        }
        toast({ title: toastTitle, description: toastDescription, variant: toastVariant, duration: 7000 });
    }

    if (reasonParam || actionParam || userTypeParamFromQuery) {
        if (typeof window !== "undefined") {
            const currentUrl = new URL(window.location.href);
            if (reasonParam) currentUrl.searchParams.delete('reason');
            if (actionParam) currentUrl.searchParams.delete('action');
            if (userTypeParamFromQuery) currentUrl.searchParams.delete('userType');
            window.history.replaceState({}, '', currentUrl.pathname + currentUrl.search);
        }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, router, toast, signupVisibility]);

  if (authContextLoading || isFetchingVisibility) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
        <p>{isFetchingVisibility ? "Loading signup options..." : "Initializing session..."}</p>
      </div>
    );
  }

  // AppContentClient will handle redirects for logged-in users.
  // This component now only needs to worry about rendering the auth forms.

  const visibleSignupTabs = [];
  if (signupVisibility?.enableStartupSignup) {
    visibleSignupTabs.push({ value: "signup_startup", label: "Startup", icon: <Lightbulb className="h-4 w-4 text-primary" /> });
  }
  if (signupVisibility?.enableInvestorSignup) {
    visibleSignupTabs.push({ value: "signup_investor", label: "Investor", icon: <Landmark className="h-4 w-4 text-blue-600" /> });
  }
  if (signupVisibility?.enableCompanySignup) {
    visibleSignupTabs.push({ value: "signup_company", label: "Company", icon: <Briefcase className="h-4 w-4 text-purple-600" /> });
  }

  const totalTabs = 1 + visibleSignupTabs.length;
  const tabsListColsClass = `grid-cols-${totalTabs > 0 ? totalTabs : 1}`;

  const hasVisibleSignupOptions = visibleSignupTabs.length > 0;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="mb-8 text-center">
        <Link href="/" className="inline-block">
          <div className="flex items-center justify-center mb-2 cursor-pointer hover:opacity-80 transition-opacity">
            <Zap className="h-10 w-10 text-primary mr-2" />
            <h1 className="text-4xl font-bold text-primary">LISTED</h1>
          </div>
        </Link>
        <p className="text-muted-foreground">Connecting startups with Investors</p>
      </div>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full max-w-md">
        <TabsList className={`grid w-full ${tabsListColsClass} text-xs sm:text-sm`}>
          <TabsTrigger value="signin">Sign In</TabsTrigger>
          {visibleSignupTabs.map(tab => (
            <TabsTrigger key={tab.value} value={tab.value} className="flex items-center gap-1.5 px-1 sm:px-3">
              {tab.icon} {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="signin">
          <Card className="shadow-lg">
            <CardHeader><CardTitle>Sign In</CardTitle><CardDescription>Access your LISTED account.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <SignInForm userType={selectedUserTypeUI} />
            </CardContent>
             <CardFooter className="flex flex-col items-center pt-6 border-t">
              <p className="text-xs text-muted-foreground mt-1 text-center">
                For Company or Investor account creation, please <Link href="/contact" className="text-primary hover:underline">Contact Us</Link> as these are often admin-managed unless enabled above.
              </p>
            </CardFooter>
          </Card>
        </TabsContent>
        
        {signupVisibility?.enableStartupSignup && (
            <TabsContent value="signup_startup">
            <Card className="shadow-lg">
                <CardHeader>
                <CardTitle className="flex items-center">
                    <Lightbulb className="mr-2 h-6 w-6 text-primary"/>Startup Sign Up
                </CardTitle>
                <CardDescription>Create your Startup account for Fundraise &amp; Sales Professional roles.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                <Separator className="my-4" />
                <SimpleSignUpForm />
                </CardContent>
                <CardFooter className="flex flex-col items-center pt-6 border-t">
                <p className="text-xs text-muted-foreground text-center">
                    By creating an account, you agree to our <Link href="/terms" className="text-primary hover:underline">Terms of Service</Link> and <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
                </p>
                </CardFooter>
            </Card>
            </TabsContent>
        )}

        {signupVisibility?.enableInvestorSignup && (
          <TabsContent value="signup_investor">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Landmark className="mr-2 h-6 w-6 text-blue-600"/>Investor Sign Up
                </CardTitle>
                <CardDescription>Join LISTED as an Investor to discover and fund promising ventures.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <InvestorSignUpForm />
              </CardContent>
              <CardFooter className="flex flex-col items-center pt-6 border-t">
                <p className="text-xs text-muted-foreground text-center">
                  By creating an account, you agree to our <Link href="/terms" className="text-primary hover:underline">Terms of Service</Link> and <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
                </p>
              </CardFooter>
            </Card>
          </TabsContent>
        )}
        {signupVisibility?.enableCompanySignup && (
          <TabsContent value="signup_company">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Briefcase className="mr-2 h-6 w-6 text-purple-600"/>Company Sign Up
                </CardTitle>
                <CardDescription>Register your company to post sales offers and connect with professionals.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <CompanySignUpForm />
              </CardContent>
              <CardFooter className="flex flex-col items-center pt-6 border-t">
                <p className="text-xs text-muted-foreground text-center">
                  By creating an account, you agree to our <Link href="/terms" className="text-primary hover:underline">Terms of Service</Link> and <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
                </p>
              </CardFooter>
            </Card>
          </TabsContent>
        )}
        
        {!hasVisibleSignupOptions && activeTab !== 'signin' && (
             <TabsContent value={activeTab}>
                <Card className="shadow-lg">
                    <CardHeader>
                        <CardTitle>Sign Up Option Not Available</CardTitle>
                        <CardDescription>This sign-up option is currently not enabled by the administrator.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">Please choose another available option or contact support if you believe this is an error.</p>
                         <Button variant="link" onClick={() => setActiveTab('signin')} className="mt-4">Go to Sign In</Button>
                    </CardContent>
                </Card>
            </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

const UserTypeSelectionBox = ({ type, icon, title, description, onClick, isSelected }: { type: AuthPageUserType; icon: React.ReactNode; title: string; description: string; onClick: () => void; isSelected: boolean; }) => (
  <Card onClick={onClick} className={cn("transition-all duration-200 ease-in-out hover:shadow-md cursor-pointer", isSelected ? "border-primary ring-2 ring-primary shadow-lg" : "border-border hover:border-muted-foreground/50")}>
    <CardHeader className="items-center p-4">
      <div className={cn("p-3 rounded-full mb-2 transition-colors", isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-primary")}>{icon}</div>
      <CardTitle className={cn("text-lg text-center", isSelected ? "text-primary" : "text-foreground")}>{title}</CardTitle>
    </CardHeader>
    <CardContent className="p-4 pt-0 text-center"><p className="text-xs text-muted-foreground">{description}</p></CardContent>
  </Card>
);

export default function AuthPageWithProvider() {
  return (
    <AuthProvider>
      <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary mb-2" /><p>Loading authentication...</p></div>}>
        <AuthPageContent />
      </Suspense>
    </AuthProvider>
  );
}
