
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
import { useToast } from "@/hooks/use-toast";
import type { RegisteredUserEntry } from "./auth-shared-types";
import { auth, db } from '@/lib/firebaseConfig';
import { createUserWithEmailAndPassword, updateProfile, fetchSignInMethodsForEmail } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { Loader2, ShieldAlert } from "lucide-react";

const adminSignupFormSchema = z.object({
  fullName: z.string().min(2, { message: "Full name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(8, { message: "Password must be at least 8 characters for security." }),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match.",
  path: ["confirmPassword"],
});

type AdminSignUpFormValues = z.infer<typeof adminSignupFormSchema>;

export function AdminSignUpForm() {
  const { toast } = useToast();
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);

  const form = useForm<AdminSignUpFormValues>({
    resolver: zodResolver(adminSignupFormSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
    mode: "onBlur",
  });

  const onSubmit: SubmitHandler<AdminSignUpFormValues> = async (values) => {
    setIsSubmittingForm(true);
    
    if (!auth || !db) {
      toast({ title: "Service Unavailable", description: "Authentication service is not ready.", variant: "destructive" });
      setIsSubmittingForm(false);
      return;
    }

    try {
        const signInMethods = await fetchSignInMethodsForEmail(auth, values.email);
        if (signInMethods.length > 0) {
            form.setError("email", { message: "This email is already in use." });
            toast({ description: "This email is already registered.", variant: "destructive" });
            setIsSubmittingForm(false);
            return;
        }
    } catch (error) {
        console.error("Error checking email existence:", error);
        toast({ title: "Sign Up Error", description: "An error occurred during email validation.", variant: "destructive" });
        setIsSubmittingForm(false);
        return;
    }

    let newFirebaseUser: FirebaseUser;
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      newFirebaseUser = userCredential.user;
    } catch (authError: any) {
      console.error("Error creating Firebase Auth admin user:", authError);
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

    if (values.fullName && newFirebaseUser) {
      try { await updateProfile(newFirebaseUser, { displayName: values.fullName }); }
      catch (profileError) { console.warn("Warning: Error updating Firebase Auth displayName:", profileError); }
    }

    const newUserFirestoreData: RegisteredUserEntry = {
      uid: newFirebaseUser.uid,
      email: values.email,
      type: "admin",
      name: values.fullName,
      status: 'active',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      avatarSeed: (values.fullName.replace(/[^a-zA-Z0-9]/g, '')) || 'AdminSeed',
      isDeletedByAdmin: false,
      blockedUsers: [],
    };

    try {
      await setDoc(doc(db, "users", newFirebaseUser.uid), newUserFirestoreData);
      toast({
        title: "Admin Account Created!",
        description: "Admin account has been created successfully.",
        variant: "default",
        duration: 3000
      });
      // The onAuthStateChanged listener will handle the app state change and redirection.
    } catch (firestoreError: any) {
      console.error("Error creating admin document in Firestore:", firestoreError);
      toast({ title: "Sign Up Profile Error", description: `Failed to save admin profile: ${firestoreError.message}.`, variant: "destructive", duration: 10000 });
    } finally {
        setIsSubmittingForm(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField control={form.control} name="fullName" render={({ field }) => (
          <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input placeholder="Admin Full Name" {...field} /></FormControl><FormMessage /></FormItem>
        )}/>
        <FormField control={form.control} name="email" render={({ field }) => (
          <FormItem><FormLabel>Email Address</FormLabel><FormControl><Input type="email" placeholder="admin.email@example.com" {...field} /></FormControl><FormMessage /></FormItem>
        )}/>
        <FormField control={form.control} name="password" render={({ field }) => (
          <FormItem><FormLabel>Password</FormLabel><FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl><FormMessage /></FormItem>
        )}/>
        <FormField control={form.control} name="confirmPassword" render={({ field }) => (
          <FormItem><FormLabel>Confirm Password</FormLabel><FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl><FormMessage /></FormItem>
        )}/>
        <Button type="submit" className="w-full bg-destructive hover:bg-destructive/90 text-destructive-foreground" disabled={isSubmittingForm}>
          {isSubmittingForm ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldAlert className="mr-2 h-4 w-4"/>}
          {isSubmittingForm ? "Creating Admin Account..." : "Create Admin Account"}
        </Button>
      </form>
    </Form>
  );
}
