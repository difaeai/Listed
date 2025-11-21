
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type SubmitHandler } from "react-hook-form";
import * as z from "zod";
import React, { useState } from "react";
import { User as FirebaseUser } from "firebase/auth";

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
import { useToast } from "@/hooks/use-toast";
import type { RegisteredUserEntry } from "./auth-shared-types";
import { auth, db } from '@/lib/firebaseConfig';
import { createUserWithEmailAndPassword, updateProfile, fetchSignInMethodsForEmail } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { Loader2, Briefcase } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import Link from 'next/link';

const companySignupFormSchema = z.object({
  corporationName: z.string().min(2, { message: "Corporation name must be at least 2 characters." }),
  contactPersonName: z.string().min(2, { message: "Contact person's name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
  confirmPassword: z.string(),
  phoneNumber: z.string().optional().refine(val => !val || /^(\+92|0)?3\d{2}(-|\s)?\d{7}$/.test(val), {
    message: "Please enter a valid Pakistani mobile number (e.g., 03XX-XXXXXXX) or leave blank.",
  }),
  isInstitutionalInvestor: z.boolean().default(false).optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match.",
  path: ["confirmPassword"],
});

type CompanySignUpFormValues = z.infer<typeof companySignupFormSchema>;

export function CompanySignUpForm() {
  const { toast } = useToast();
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);

  const form = useForm<CompanySignUpFormValues>({
    resolver: zodResolver(companySignupFormSchema),
    defaultValues: {
      corporationName: "",
      contactPersonName: "",
      email: "",
      password: "",
      confirmPassword: "",
      phoneNumber: "",
      isInstitutionalInvestor: false,
    },
    mode: "onBlur",
  });

  const onSubmit: SubmitHandler<CompanySignUpFormValues> = async (values) => {
    setIsSubmittingForm(true);
    
    if (!auth || !db) {
      toast({ title: "Service Unavailable", description: "Authentication service is not ready.", variant: "destructive" });
      setIsSubmittingForm(false);
      return;
    }

    try {
      const signInMethods = await fetchSignInMethodsForEmail(auth, values.email);
      if (signInMethods.length > 0) {
        form.setError("email", { message: "This email is already registered." });
        toast({ description: "This email is already in use. Please sign in or use a different email.", variant: "destructive" });
        setIsSubmittingForm(false);
        return;
      }
    } catch (error) {
      console.error("Error checking email existence:", error);
      toast({ title: "Sign Up Error", description: "An error occurred during email validation. Please try again.", variant: "destructive" });
      setIsSubmittingForm(false);
      return;
    }

    let newFirebaseUser: FirebaseUser;
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      newFirebaseUser = userCredential.user;
    } catch (authError: any) {
      console.error("Error creating Firebase Auth user:", authError);
      let toastDescription = "An unexpected error occurred during account creation.";
      if (authError.code === 'auth/email-already-in-use') {
        toastDescription = "This email is already registered.";
        form.setError("email", { message: toastDescription });
      } else if (authError.code === 'auth/weak-password') {
        toastDescription = "Password is too weak. Please choose a stronger password.";
        form.setError("password", { message: toastDescription });
      }
      toast({ title: "Sign Up Failed", description: toastDescription, variant: "destructive" });
      setIsSubmittingForm(false);
      return;
    }

    try {
      if (values.corporationName) {
        await updateProfile(newFirebaseUser, { displayName: values.corporationName });
      }

      const newUserFirestoreData: Omit<RegisteredUserEntry, 'uid'> = {
        email: values.email,
        type: "company",
        corporationName: values.corporationName,
        name: values.contactPersonName, 
        status: 'active', 
        phoneNumber: values.phoneNumber || "",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        avatarSeed: (values.corporationName.replace(/[^a-zA-Z0-9]/g, '')) || 'CorpSeed',
        isDeletedByAdmin: false,
        blockedUsers: [],
        isInstitutionalInvestor: values.isInstitutionalInvestor || false,
      };

      await setDoc(doc(db, "users", newFirebaseUser.uid), newUserFirestoreData);
      
      toast({
        title: "Company Account Created!",
        description: "Your account is active. Redirecting to your dashboard...",
        variant: "default",
        duration: 3000
      });
      // The global onAuthStateChanged listener in AuthContext will handle the redirect.
    } catch (error: any) {
      console.error("Error saving profile or updating display name:", error);
      toast({ title: "Sign Up Profile Error", description: `Failed to save profile: ${error.message}. Please contact support.`, variant: "destructive", duration: 10000 });
    } finally {
        setIsSubmittingForm(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField control={form.control} name="corporationName" render={({ field }) => (
          <FormItem><FormLabel>Corporation Name</FormLabel><FormControl><Input placeholder="Your Corporation Name" {...field} /></FormControl><FormMessage /></FormItem>
        )}/>
        <FormField control={form.control} name="contactPersonName" render={({ field }) => (
          <FormItem><FormLabel>Contact Person Full Name</FormLabel><FormControl><Input placeholder="Full Name of Contact Person" {...field} /></FormControl><FormMessage /></FormItem>
        )}/>
        <FormField control={form.control} name="email" render={({ field }) => (
          <FormItem><FormLabel>Official Email Address</FormLabel><FormControl><Input type="email" placeholder="official.email@company.com" {...field} /></FormControl><FormMessage /></FormItem>
        )}/>
        <FormField control={form.control} name="password" render={({ field }) => (
          <FormItem><FormLabel>Password</FormLabel><FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl><FormMessage /></FormItem>
        )}/>
        <FormField control={form.control} name="confirmPassword" render={({ field }) => (
          <FormItem><FormLabel>Confirm Password</FormLabel><FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl><FormMessage /></FormItem>
        )}/>
        <FormField control={form.control} name="phoneNumber" render={({ field }) => (
          <FormItem><FormLabel>Contact Mobile Number (Optional)</FormLabel><FormControl><Input placeholder="03XX-XXXXXXX" {...field} /></FormControl><FormMessage /></FormItem>
        )}/>
        <FormField
          control={form.control}
          name="isInstitutionalInvestor"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow-sm">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>
                  Act as Institutional Investor?
                </FormLabel>
                <FormDescription>
                  Select this if you want your company to be listed as an institutional investor, discoverable by startups seeking funding.
                </FormDescription>
              </div>
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-700 text-white" disabled={isSubmittingForm}>
          {isSubmittingForm ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Briefcase className="mr-2 h-4 w-4"/>}
          {isSubmittingForm ? "Creating Company Account..." : "Create Company Account"}
        </Button>
      </form>
    </Form>
  );
}
