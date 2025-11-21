
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { RegisteredUserEntry } from "./auth-shared-types";
import { auth, db } from '@/lib/firebaseConfig';
import { createUserWithEmailAndPassword, updateProfile, fetchSignInMethodsForEmail } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { Loader2 } from "lucide-react";

const simpleSignupFormSchema = z.object({
  fullName: z.string().min(2, { message: "Full name must be at least 2 characters." }),
  gender: z.enum(['male', 'female', 'other'], { required_error: "Please select a gender." }),
  phoneNumber: z.string().optional().refine(val => !val || /^(\+92|0)?3\d{2}(-|\s)?\d{7}$/.test(val), {
    message: "Please enter a valid Pakistani mobile number (e.g., 03XX-XXXXXXX) or leave blank.",
  }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match.",
  path: ["confirmPassword"],
});

type SimpleSignUpFormValues = z.infer<typeof simpleSignupFormSchema>;

export function SimpleSignUpForm() {
  const { toast } = useToast();
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);

  const form = useForm<SimpleSignUpFormValues>({
    resolver: zodResolver(simpleSignupFormSchema),
    defaultValues: { fullName: "", gender: undefined, phoneNumber: "", email: "", password: "", confirmPassword: "" },
    mode: "onBlur",
  });

  const onSubmit: SubmitHandler<SimpleSignUpFormValues> = async (values) => {
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
      if (values.fullName) {
        await updateProfile(newFirebaseUser, { displayName: values.fullName });
      }
      
      const newUserFirestoreData: Omit<RegisteredUserEntry, 'uid'> = {
        email: values.email,
        type: "professional", 
        name: values.fullName,
        gender: values.gender,
        status: 'pending_payment_verification',
        phoneNumber: values.phoneNumber || "",
        profileDescription: "",
        yearsExperience: 0,
        workingLeads: 0,
        subscriptionType: null, 
        subscriptionExpiryDate: null,
        subscriptionPaymentSubmittedAt: null,
        paymentProofDataUri: null,
        previousSubscriptionDetails: null,
        referralCodeUsed: "",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        avatarSeed: (values.fullName.replace(/[^a-zA-Z0-9]/g, '')) || 'UserSeed',
        isDeletedByAdmin: false,
        blockedUsers: [],
        isOptedInCoFounder: false, 
        optedInCoFounderAt: null, 
      };

      await setDoc(doc(db, "users", newFirebaseUser.uid), newUserFirestoreData);
      
      toast({ 
        title: "Account Created!", 
        description: "Please verify your payment to activate your account. Redirecting...", 
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
        <FormField control={form.control} name="fullName" render={({ field }) => (
          <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input placeholder="Your Full Name" {...field} /></FormControl><FormMessage /></FormItem>
        )}/>
        <FormField control={form.control} name="gender" render={({ field }) => (
          <FormItem><FormLabel>Gender</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl><SelectTrigger><SelectValue placeholder="Select your gender" /></SelectTrigger></FormControl>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select><FormMessage />
          </FormItem>
        )}/>
        <FormField control={form.control} name="phoneNumber" render={({ field }) => (
          <FormItem><FormLabel>Mobile Number (Optional)</FormLabel><FormControl><Input placeholder="03XX-XXXXXXX" {...field} /></FormControl><FormMessage /></FormItem>
        )}/>
        <FormField control={form.control} name="email" render={({ field }) => (
          <FormItem><FormLabel>Email Address</FormLabel>
            <FormControl><Input type="email" placeholder="your.email@example.com" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )}/>
        <FormField control={form.control} name="password" render={({ field }) => (
          <FormItem><FormLabel>Password</FormLabel><FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl><FormMessage /></FormItem>
        )}/>
        <FormField control={form.control} name="confirmPassword" render={({ field }) => (
          <FormItem><FormLabel>Confirm Password</FormLabel><FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl><FormMessage /></FormItem>
        )}/>
        
        <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isSubmittingForm}>
          {isSubmittingForm ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {isSubmittingForm ? "Creating Account..." : "Create Account"}
        </Button>
      </form>
    </Form>
  );
}
