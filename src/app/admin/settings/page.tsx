
"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Settings as SettingsIcon, User, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { useAuth } from '@/contexts/AuthContext';
import { auth } from '@/lib/firebaseConfig';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';

// Password Form Schema
const passwordFormSchema = z.object({
  currentPassword: z.string().min(1, { message: "Current password is required." }),
  newPassword: z.string().min(8, { message: "New password must be at least 8 characters." }),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "New passwords don't match.",
  path: ["confirmPassword"],
});
type PasswordFormValues = z.infer<typeof passwordFormSchema>;


export default function AdminSettingsPage() {
  const { toast } = useToast();
  const { currentUser: adminAuthUser, loading: authLoading } = useAuth();
  const [adminName, setAdminName] = useState("Admin User"); 
  const [adminEmail, setAdminEmail] = useState("");

  useEffect(() => {
    if (!authLoading && adminAuthUser && adminAuthUser.type === 'admin') {
      setAdminName(adminAuthUser.name || "Admin User");
      setAdminEmail(adminAuthUser.email || "");
    }
  }, [adminAuthUser, authLoading]);


  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  const onPasswordSubmit = async (data: PasswordFormValues) => {
    if (!auth.currentUser || !adminAuthUser?.email) {
      toast({
        title: "Authentication Error",
        description: "Admin user is not properly authenticated or email is missing.",
        variant: "destructive",
      });
      return;
    }
    
    passwordForm.formState.isSubmitting;

    try {
      const credential = EmailAuthProvider.credential(adminAuthUser.email, data.currentPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);
      
      await updatePassword(auth.currentUser, data.newPassword);
      
      toast({
        title: "Password Updated",
        description: "Your admin password has been changed successfully.",
      });
      passwordForm.reset();
    } catch (error: any) {
      console.error("Admin password update error:", error);
      let errorMessage = "Failed to update password.";
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        errorMessage = "Incorrect current password. Please try again.";
        passwordForm.setError("currentPassword", { type: "manual", message: errorMessage });
      } else if (error.code === 'auth/weak-password') {
        errorMessage = "The new password is too weak.";
        passwordForm.setError("newPassword", { type: "manual", message: errorMessage });
      }
      toast({
        title: "Password Update Failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };
  
  if (authLoading) {
    return <div className="container mx-auto py-8 px-4 md:px-6 text-center">Loading admin settings...</div>;
  }
  if (!adminAuthUser || adminAuthUser.type !== 'admin') {
    return <div className="container mx-auto py-8 px-4 md:px-6 text-center">Access Denied. Admin privileges required.</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center">
          <SettingsIcon className="mr-3 h-8 w-8 text-primary" />
          Admin Account Settings
        </h1>
        <p className="text-muted-foreground">
          Manage your administrator account security.
        </p>
      </div>

      <Tabs defaultValue="security" className="w-full">
        <TabsList className="grid w-full grid-cols-1 md:w-1/3 mb-6">
          <TabsTrigger value="security"><Lock className="mr-2 h-4 w-4" /> Security</TabsTrigger>
        </TabsList>

        <TabsContent value="security">
          <Card className="shadow-lg rounded-xl">
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>
                Update your administrator account password.
              </CardDescription>
            </CardHeader>
            <Form {...passwordForm}>
              <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}>
                <CardContent className="space-y-6">
                  <FormField
                    control={passwordForm.control}
                    name="currentPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current Password</FormLabel>
                        <FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={passwordForm.control}
                    name="newPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>New Password</FormLabel>
                        <FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={passwordForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm New Password</FormLabel>
                        <FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
                <CardFooter className="border-t pt-6 flex justify-end">
                  <Button type="submit" className="bg-accent hover:bg-accent/90" disabled={passwordForm.formState.isSubmitting}>Update Password</Button>
                </CardFooter>
              </form>
            </Form>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
