
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type SubmitHandler } from "react-hook-form";
import * as z from "zod";
import React, { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import type { AuthPageUserType } from "./auth-shared-types";
import { auth, db } from '@/lib/firebaseConfig';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { Loader2 } from "lucide-react";
import { doc, getDoc } from "firebase/firestore";
import type { RegisteredUserEntry } from "./auth-shared-types";


const formSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
});

type SignInFormValues = z.infer<typeof formSchema>;

interface SignInFormProps {
  userType: AuthPageUserType;
}

export function SignInForm({ userType: selectedUserTypeFromUI }: SignInFormProps) {
  const { toast } = useToast();
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);

  const form = useForm<SignInFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit: SubmitHandler<SignInFormValues> = async (values) => {
    setIsSubmittingForm(true);
    const { email, password } = values;

    if (!auth || !db) {
        toast({ title: "Service Unavailable", description: "Authentication service is not ready. Please try again later.", variant: "destructive" });
        setIsSubmittingForm(false);
        return;
    }

    try {
      // The onAuthStateChanged listener in AuthContext and the logic in AppContentClient
      // will handle all post-authentication checks, including 'locked' status and redirects.
      // This form's only responsibility is to attempt the sign-in.
      await signInWithEmailAndPassword(auth, email, password);

      // If sign-in is successful, we don't need to do anything else here.
      // The global state management will take over.
      toast({ title: "Sign In Successful!", description: "Redirecting to your dashboard...", variant: "default", duration: 2000 });
      // The onAuthStateChanged listener will take over.

    } catch (error: any) {
      console.error("[SignInForm] Firebase signIn error caught:", error.code, error.message);
      let errorMessage = "An unexpected error occurred during sign-in. Please try again later.";
      if (error.code === 'auth/user-not-found' ||
          error.code === 'auth/invalid-credential' ||
          error.code === 'auth/wrong-password' ||
          error.code === 'auth/invalid-login-credentials') {
        errorMessage = "Invalid email or password. Please try again.";
      }
      toast({ title: "Sign In Failed", description: errorMessage, variant: "destructive" });
    } finally {
        setIsSubmittingForm(false); 
    }
  };

  const handlePasswordReset = async () => {
    const email = form.getValues("email");
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      toast({ title: "Email Required", description: "Please enter a valid email address in the email field to reset your password.", variant: "destructive" });
      return;
    }

    if (!auth) {
      toast({ title: "Service Unavailable", description: "Password reset service is not ready.", variant: "destructive" });
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      toast({
        title: "Password Reset Email Sent",
        description: `If an account exists for ${email}, a password reset link has been sent. Please check your inbox (and spam folder).`,
        variant: "default",
        duration: 7000,
      });
    } catch (error: any) {
      console.error("Password reset error:", error);
      // For security, show the same message even on error
      toast({
          title: "Password Reset Email Sent",
          description: `If an account exists for ${email}, a password reset link has been sent. Please check your inbox (and spam folder).`,
          variant: "default",
          duration: 7000,
        });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField control={form.control} name="email" render={({ field }) => (
          <FormItem><FormLabel>Email Address</FormLabel>
            <FormControl>
              <Input type="email" placeholder="your.email@example.com" {...field} />
            </FormControl><FormMessage />
          </FormItem>
        )}/>
        <FormField control={form.control} name="password" render={({ field }) => (
          <FormItem><FormLabel>Password</FormLabel><FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl><FormMessage /></FormItem>
        )}/>
        <Button type="submit" className="w-full" disabled={isSubmittingForm}>
          {isSubmittingForm ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {isSubmittingForm ? "Signing In..." : "Sign In"}
        </Button>
        <Button type="button" variant="link" size="sm" className="w-full text-xs" onClick={handlePasswordReset}>
          Forgot Password?
        </Button>
      </form>
    </Form>
  );
}
