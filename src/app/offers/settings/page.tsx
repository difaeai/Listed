
"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, Save, User, Lock, Camera, Mail, Phone, Settings as SettingsIcon, BarChart3, FileText, ListX, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription as ShadCardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel as RHFFormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { db, auth } from '@/lib/firebaseConfig';
import { doc, updateDoc, getDoc, Timestamp, serverTimestamp, collection, where, query, getDocs } from 'firebase/firestore';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential, updateProfile } from 'firebase/auth';
import type { RegisteredUserEntry } from '@/app/auth/components/auth-shared-types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { CountdownTimer } from '@/components/common/countdown-timer';
import { Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const MAX_AVATAR_SIZE_MB = 2;
const MAX_AVATAR_SIZE_BYTES = MAX_AVATAR_SIZE_MB * 1024 * 1024;

const profileFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  phoneNumber: z.string().optional().refine(val => !val || /^(\+92|0)?3\d{2}(-|\s)?\d{7}$/.test(val), {
    message: "Please enter a valid Pakistani mobile number or leave blank.",
  }),
  profileDescription: z.string().max(500, "Description must be 500 characters or less.").optional(),
  yearsExperience: z.coerce.number().int().min(0, "Years of experience cannot be negative.").optional(),
  workingLeads: z.coerce.number().int().min(0, "Working leads cannot be negative.").optional(),
  profilePictureFile: z.custom<FileList>().optional()
    .refine(files => !files || files.length === 0 || files[0].type.startsWith("image/"), {
      message: "Only image files are allowed.",
    })
    .refine(files => !files || files.length === 0 || files[0].size <= MAX_AVATAR_SIZE_BYTES, {
      message: `Image file size should be less than ${MAX_AVATAR_SIZE_MB}MB.`,
    }),
});
type ProfileFormValues = z.infer<typeof profileFormSchema>;

const passwordFormSchema = z.object({
  currentPassword: z.string().min(1, { message: "Current password is required." }),
  newPassword: z.string().min(8, { message: "New password must be at least 8 characters." }),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "New passwords don't match.",
  path: ["confirmPassword"],
});
type PasswordFormValues = z.infer<typeof passwordFormSchema>;

interface BlockedUserDetail extends RegisteredUserEntry {
  // uid is already in RegisteredUserEntry
}

export default function UserSettingsPage() {
  const { toast } = useToast();
  const { currentUser: authUser, loading: authLoading, setCurrentAppUser } = useAuth();

  const [localUserEmail, setLocalUserEmail] = useState<string>("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [blockedUsersDetails, setBlockedUsersDetails] = useState<BlockedUserDetail[]>([]);
  const [isLoadingBlockedList, setIsLoadingBlockedList] = useState(false);

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
        name: "",
        phoneNumber: "",
        profileDescription: "",
        yearsExperience: 0,
        workingLeads: 0,
        profilePictureFile: undefined,
    },
  });

  useEffect(() => {
    if (!authLoading && authUser && db) {
      setLocalUserEmail(authUser.email || "");
      setIsLoading(true);

      if (!authUser.uid) {
          console.error("User UID is missing in authUser context.");
          toast({ title: "Error", description: "User session invalid. Please re-login.", variant: "destructive" });
          setIsLoading(false);
          return;
      }
      const userDocRef = doc(db, "users", authUser.uid);
      getDoc(userDocRef).then(docSnap => {
        if (docSnap.exists()) {
          const profileData = docSnap.data() as RegisteredUserEntry;
          profileForm.reset({
            name: profileData.name || authUser.name || "",
            phoneNumber: profileData.phoneNumber || "",
            profileDescription: profileData.profileDescription || "",
            yearsExperience: profileData.yearsExperience ?? 0,
            workingLeads: profileData.workingLeads ?? 0,
          });
          setAvatarPreview(profileData.avatarDataUri || `https://picsum.photos/seed/${authUser.avatarSeed || profileData.name?.replace(/[^a-zA-Z0-9]/g, '') || profileData.email}/128/128`);
        } else {
           profileForm.reset({
            name: authUser.name || "User",
            phoneNumber: authUser.phoneNumber || "",
            profileDescription: authUser.profileDescription || "",
            yearsExperience: authUser.yearsExperience ?? 0,
            workingLeads: authUser.workingLeads ?? 0,
          });
          setAvatarPreview(`https://picsum.photos/seed/${authUser.avatarSeed || authUser.name?.replace(/[^a-zA-Z0-9]/g, '') || authUser.email}/128/128`);
        }
      }).catch(error => {
        console.error("Error fetching user profile for settings:", error);
        toast({ title: "Error", description: "Could not load profile data.", variant: "destructive" });
      }).finally(() => {
        setIsLoading(false);
      });
    } else if (!authLoading && !authUser) {
      setIsLoading(false);
    }
  }, [authLoading, authUser, profileForm, toast]);

  const fetchBlockedUsersDetails = async () => {
    if (!authUser || !authUser.blockedUsers || authUser.blockedUsers.length === 0 || !db) {
      setBlockedUsersDetails([]);
      return;
    }
    setIsLoadingBlockedList(true);
    const detailsPromises = authUser.blockedUsers.map(async (uid) => {
      const userDocRef = doc(db, "users", uid);
      const docSnap = await getDoc(userDocRef);
      if (docSnap.exists()) {
        return { uid, ...docSnap.data() } as BlockedUserDetail;
      }
      return { uid, name: `User Record Not Found (${uid.substring(0,8)}...)`, email: "N/A" } as BlockedUserDetail;
    });
    try {
      const resolvedDetails = await Promise.all(detailsPromises);
      setBlockedUsersDetails(resolvedDetails.filter(Boolean) as BlockedUserDetail[]);
    } catch (error) {
      console.error("Error fetching blocked users' details:", error);
      toast({ title: "Error", description: "Could not load details of blocked users.", variant: "destructive" });
      setBlockedUsersDetails([]);
    } finally {
      setIsLoadingBlockedList(false);
    }
  };

  useEffect(() => {
    if (authUser && authUser.blockedUsers) {
      fetchBlockedUsersDetails();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser?.blockedUsers]);


  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  const onProfileSubmit: SubmitHandler<ProfileFormValues> = async (data) => {
    if (!authUser || !authUser.uid || !db) {
      toast({ title: "Error", description: "User session or database not available.", variant: "destructive" });
      return;
    }

    profileForm.formState.isSubmitting;
    const userDocRef = doc(db, "users", authUser.uid);
    let newAvatarDataUri: string | null | undefined = authUser.avatarDataUri;

    if (data.profilePictureFile && data.profilePictureFile.length > 0) {
      const file = data.profilePictureFile[0];
      try {
        newAvatarDataUri = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = (error) => reject(error);
          reader.readAsDataURL(file);
        });
        setAvatarPreview(newAvatarDataUri);
      } catch (error) {
        toast({ title: "Image Error", description: "Could not process new profile picture.", variant: "destructive" });
        return;
      }
    } else if (profileForm.formState.dirtyFields.profilePictureFile && (!data.profilePictureFile || data.profilePictureFile.length === 0)) {
        newAvatarDataUri = null;
        if(authUser?.email) setAvatarPreview(`https://picsum.photos/seed/${authUser.avatarSeed || data.name.replace(/[^a-zA-Z0-9]/g, '') + authUser.email}/128/128`);
    }

    const dataToUpdate: Partial<RegisteredUserEntry> = {
      name: data.name,
      phoneNumber: data.phoneNumber,
      profileDescription: data.profileDescription,
      yearsExperience: data.yearsExperience,
      workingLeads: data.workingLeads,
      avatarDataUri: newAvatarDataUri,
      updatedAt: serverTimestamp(),
    };
    const cleanDataToUpdate = Object.fromEntries(Object.entries(dataToUpdate).filter(([_,v])=> v !== undefined));

    try {
      await updateDoc(userDocRef, cleanDataToUpdate);
      const updatedAuthUser = { ...authUser, ...cleanDataToUpdate, name: data.name, avatarDataUri: newAvatarDataUri } as RegisteredUserEntry;
      setCurrentAppUser(updatedAuthUser, auth.currentUser);
      if (auth.currentUser && data.name !== auth.currentUser.displayName) {
          await updateProfile(auth.currentUser, { displayName: data.name });
      }
      toast({ title: "Profile Updated!", description: "Your profile information has been successfully updated.", variant: "default" });
      profileForm.reset(data);
      setSelectedFileName(null);
      if (profileForm.getValues("profilePictureFile")) {
        profileForm.setValue("profilePictureFile", undefined);
      }
    } catch (error) {
      console.error("Error updating profile in Firestore:", error);
      toast({ title: "Update Failed", description: "Could not update your profile.", variant: "destructive" });
    }
  };

  const onPasswordSubmit: SubmitHandler<PasswordFormValues> = async (data) => {
    if (!auth || !auth.currentUser) {
      toast({ title: "Error", description: "User not authenticated.", variant: "destructive" });
      return;
    }

    try {
      if (!auth.currentUser.email) {
        toast({ title: "Error", description: "User email not found for re-authentication.", variant: "destructive" });
        return;
      }
      const credential = EmailAuthProvider.credential(auth.currentUser.email, data.currentPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);
      await updatePassword(auth.currentUser, data.newPassword);
      toast({ title: "Password Updated", description: "Your password has been successfully changed.", variant: "default" });
      passwordForm.reset();
    } catch (error: any) {
      console.error("Password update error:", error);
      let errorMessage = "Failed to update password.";
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        errorMessage = "Incorrect current password. Please try again.";
        passwordForm.setError("currentPassword", { type: "manual", message: errorMessage });
      } else if (error.code === 'auth/weak-password') {
        errorMessage = "The new password is too weak.";
         passwordForm.setError("newPassword", { type: "manual", message: errorMessage });
      }
      toast({ title: "Password Update Failed", description: errorMessage, variant: "destructive" });
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      setSelectedFileName(file.name);
      profileForm.setValue("profilePictureFile", event.target.files, { shouldDirty: true });
      const reader = new FileReader();
      reader.onloadend = () => setAvatarPreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setSelectedFileName(null);
      profileForm.setValue("profilePictureFile", undefined, { shouldDirty: true });
      if (authUser?.email) {
        setAvatarPreview(`https://picsum.photos/seed/${authUser.avatarSeed || (profileForm.getValues("name") || authUser.name || "User").replace(/[^a-zA-Z0-9]/g, '') + authUser.email}/128/128`);
      }
    }
  };

  const handleUnblockUser = async (targetUserId: string, targetUserName: string) => {
    if (!authUser || !authUser.uid || !db) return;
    const currentUserDocRef = doc(db, "users", authUser.uid);
    const updatedBlockedUsers = (authUser.blockedUsers || []).filter(uid => uid !== targetUserId);
    try {
      await updateDoc(currentUserDocRef, {
        blockedUsers: updatedBlockedUsers,
        updatedAt: serverTimestamp()
      });
      setCurrentAppUser({ ...authUser, blockedUsers: updatedBlockedUsers }, auth.currentUser);
      toast({ title: "User Unblocked", description: `${targetUserName} has been unblocked.` });
    } catch (error) {
      console.error("Error unblocking user:", error);
      toast({ title: "Unblock Failed", description: `Could not unblock ${targetUserName}.`, variant: "destructive" });
    }
  };


  if (isLoading || authLoading) {
    return <div className="container mx-auto py-8 px-4 md:px-6 text-center">Loading settings...</div>;
  }
  if (!authUser) {
     return (
      <div className="container mx-auto py-8 px-4 md:px-6 text-center">
        <p>Please log in to access settings.</p>
        <Button asChild><Link href="/auth">Go to Login</Link></Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <Button variant="outline" asChild className="mb-6">
        <Link href="/home"><ArrowLeft className="mr-2 h-4 w-4" /> Back to User Portal</Link>
      </Button>

      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight flex items-center">
            <SettingsIcon className="mr-3 h-8 w-8 text-primary" /> Account Settings
        </h1>
        <p className="text-muted-foreground">Manage your profile, security, and preferences.</p>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3 gap-1 mb-6">
          <TabsTrigger value="profile"><User className="mr-2 h-4 w-4" /> Profile</TabsTrigger>
          <TabsTrigger value="security"><Lock className="mr-2 h-4 w-4" /> Security</TabsTrigger>
          <TabsTrigger value="blocked"><ListX className="mr-2 h-4 w-4" /> Blocked Users</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card className="shadow-lg rounded-xl">
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <ShadCardDescription>Update your name, contact details, profile picture, and description.</ShadCardDescription>
            </CardHeader>
            <Form {...profileForm}>
              <form onSubmit={profileForm.handleSubmit(onProfileSubmit)}>
                <CardContent className="space-y-6">
                   <div className="flex flex-col items-center space-y-4">
                    <Avatar className="h-24 w-24 border-2 border-primary">
                      <AvatarImage src={avatarPreview || `https://picsum.photos/seed/${authUser.avatarSeed || (profileForm.getValues("name") || authUser.name || "User").replace(/[^a-zA-Z0-9]/g, '') + authUser.email}/128/128`} alt={authUser.name || "User"} data-ai-hint="profile person large"/>
                      <AvatarFallback>{(authUser.name || "U")?.substring(0,1).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <FormField
                      control={profileForm.control}
                      name="profilePictureFile"
                      render={({ field }) => (
                        <FormItem className="w-full max-w-sm">
                          <RHFFormLabel htmlFor="profilePictureInput" className="sr-only">Change profile picture</RHFFormLabel>
                          <FormControl>
                            <Input
                              id="profilePictureInput"
                              type="file"
                              accept="image/*"
                              onChange={handleFileChange}
                              className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                            />
                          </FormControl>
                           {selectedFileName && <FormDescription className="text-xs text-muted-foreground mt-1">Selected: {selectedFileName}</FormDescription>}
                           {!selectedFileName && !avatarPreview?.startsWith('data:image') && <FormDescription className="text-xs text-muted-foreground mt-1">No custom picture uploaded.</FormDescription>}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={profileForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <RHFFormLabel>Full Name</RHFFormLabel>
                        <div className="flex items-center gap-2">
                          <User className="h-5 w-5 text-muted-foreground" />
                          <FormControl><Input placeholder="Your Full Name" {...field} /></FormControl>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormItem>
                    <RHFFormLabel>Email Address</RHFFormLabel>
                    <div className="flex items-center gap-2">
                        <Mail className="h-5 w-5 text-muted-foreground" />
                        <Input type="email" value={localUserEmail} disabled />
                    </div>
                    <FormDescription>Your email address cannot be changed. Please contact support if you need to update it.</FormDescription>
                  </FormItem>
                  <FormField
                    control={profileForm.control}
                    name="phoneNumber"
                    render={({ field }) => (
                      <FormItem>
                        <RHFFormLabel>Phone Number (Optional)</RHFFormLabel>
                        <div className="flex items-center gap-2">
                          <Phone className="h-5 w-5 text-muted-foreground" />
                          <FormControl><Input placeholder="03XX-XXXXXXX" {...field} value={field.value ?? ""} /></FormControl>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                   <FormField
                    control={profileForm.control}
                    name="profileDescription"
                    render={({ field }) => (
                      <FormItem>
                        <RHFFormLabel>Profile Description</RHFFormLabel>
                        <div className="flex items-start gap-2">
                          <FileText className="h-5 w-5 text-muted-foreground mt-2.5" />
                          <FormControl>
                            <Textarea
                              rows={4}
                              placeholder="Tell us about your work, achievements, or what you're looking for..."
                              {...field}
                              value={field.value ?? ""}
                            />
                          </FormControl>
                        </div>
                        <FormDescription>Max 500 characters.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={profileForm.control}
                    name="yearsExperience"
                    render={({ field }) => (
                      <FormItem>
                        <RHFFormLabel>Years of Experience</RHFFormLabel>
                        <div className="flex items-center gap-2">
                          <BarChart3 className="h-5 w-5 text-muted-foreground" />
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="e.g., 5"
                              {...field}
                              value={field.value ?? 0}
                              onChange={e => {
                                const val = parseInt(e.target.value, 10);
                                field.onChange(isNaN(val) || val < 0 ? 0 : val);
                              }}
                            />
                          </FormControl>
                        </div>
                        <FormDescription>Your total years of professional experience.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={profileForm.control}
                    name="workingLeads"
                    render={({ field }) => (
                      <FormItem>
                        <RHFFormLabel>Working Leads Count</RHFFormLabel>
                        <div className="flex items-center gap-2">
                          <BarChart3 className="h-5 w-5 text-muted-foreground" />
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="e.g., 10"
                              {...field}
                              value={field.value ?? 0}
                              onChange={e => {
                                const val = parseInt(e.target.value, 10);
                                field.onChange(isNaN(val) || val < 0 ? 0 : val);
                              }}
                            />
                          </FormControl>
                        </div>
                        <FormDescription>Number of leads you are currently working on.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
                <CardFooter className="border-t pt-6 flex justify-end">
                  <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground" disabled={profileForm.formState.isSubmitting || !profileForm.formState.isDirty}>
                    <Save className="mr-2 h-4 w-4" />
                    {profileForm.formState.isSubmitting ? "Saving..." : "Save Profile"}
                  </Button>
                </CardFooter>
              </form>
            </Form>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card className="shadow-lg rounded-xl">
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <ShadCardDescription>Update your account password for better security.</ShadCardDescription>
            </CardHeader>
            <Form {...passwordForm}>
              <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}>
                <CardContent className="space-y-6">
                <FormField
                    control={passwordForm.control}
                    name="currentPassword"
                    render={({ field }) => (
                      <FormItem>
                        <RHFFormLabel>Current Password</RHFFormLabel>
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
                        <RHFFormLabel>New Password</RHFFormLabel>
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
                        <RHFFormLabel>Confirm New Password</RHFFormLabel>
                        <FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
                <CardFooter className="border-t pt-6 flex justify-end">
                  <Button type="submit" className="bg-accent hover:bg-accent/90 text-accent-foreground" disabled={passwordForm.formState.isSubmitting}>
                    <Lock className="mr-2 h-4 w-4" />
                    {passwordForm.formState.isSubmitting ? "Updating..." : "Update Password"}
                  </Button>
                </CardFooter>
              </form>
            </Form>
          </Card>
        </TabsContent>

        <TabsContent value="blocked">
          <Card className="shadow-lg rounded-xl">
            <CardHeader>
              <CardTitle className="flex items-center">
                <ListX className="mr-2 h-5 w-5 text-destructive" /> Blocked Users List
              </CardTitle>
              <ShadCardDescription>
                Manage users you have blocked. They will not be able to message you, and you will not be able to message them.
              </ShadCardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingBlockedList ? (
                <p className="text-muted-foreground">Loading your blocked users list...</p>
              ) : blockedUsersDetails.length > 0 ? (
                <ScrollArea className="h-[400px] border rounded-md p-2">
                  <ul className="space-y-3">
                    {blockedUsersDetails.map((user) => (
                      <li key={user.uid} className="flex items-center justify-between p-3 bg-muted/50 rounded-md shadow-sm">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 border">
                             <AvatarImage src={user.avatarDataUri || `https://picsum.photos/seed/${user.avatarSeed || user.uid}/40/40`} alt={user.name || "User"} data-ai-hint="person avatar"/>
                            <AvatarFallback>{(user.name || user.email || "U").substring(0,1).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-semibold">{user.name || "Unknown User"}</p>
                            <p className="text-xs text-muted-foreground">{user.email || `UID: ${user.uid}`}</p>
                          </div>
                        </div>
                         <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" className="border-green-500 text-green-600 hover:bg-green-50 hover:text-green-700">
                              <User className="mr-1.5 h-4 w-4" /> Unblock
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Unblock {user.name || "this user"}?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to unblock {user.name || user.email || "this user"}? You will be able to message each other again.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleUnblockUser(user.uid, user.name || user.email || `User ${user.uid.substring(0,6)}`)} className="bg-green-600 hover:bg-green-700">
                                Confirm Unblock
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </li>
                    ))}
                  </ul>
                </ScrollArea>
              ) : (
                <p className="text-muted-foreground py-6 text-center">You haven't blocked any users.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
