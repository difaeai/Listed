
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, SubmitHandler } from "react-hook-form";
import * as z from "zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { User, Lock, Save, Building, Phone, Settings as SettingsIcon, Image as ImageIcon, ArrowLeft } from "lucide-react";
import React, { useState, useEffect } from "react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel as RHFFormLabel, // Aliased to avoid conflict with ShadCN Label
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription as ShadCardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { useAuth } from '@/contexts/AuthContext';
import { db, auth } from '@/lib/firebaseConfig';
import { doc, updateDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential, updateProfile as updateFirebaseProfile } from 'firebase/auth';
import type { RegisteredUserEntry } from '@/app/auth/components/auth-shared-types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';


const MAX_AVATAR_SIZE_MB = 2;
const MAX_AVATAR_SIZE_BYTES = MAX_AVATAR_SIZE_MB * 1024 * 1024;

const profileFormSchema = z.object({
  businessName: z.string().min(2, { message: "Business name must be at least 2 characters." }),
  contactPerson: z.string().min(3, { message: "Contact person name is required." }),
  contactNumber: z.string().regex(/^(\+92|0)?3\d{2}(-|\s)?\d{7}$/, {message: "Please enter a valid Pakistani mobile number."}),
  email: z.string().email({ message: "Invalid email address." }).optional(),
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

export default function CorporationSettingsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { currentUser: authUser, loading: authLoading, setCurrentAppUser } = useAuth();

  const [localUserEmail, setLocalUserEmail] = useState<string>("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      businessName: "",
      contactPerson: "",
      contactNumber: "",
      email: "",
      profilePictureFile: undefined,
    },
  });

  useEffect(() => {
    if (!authLoading && authUser && db) {
      setLocalUserEmail(authUser.email || "");
      setIsLoading(true);
      if (!authUser.uid) {
        toast({ title: "Error", description: "User session invalid. Please re-login.", variant: "destructive" });
        setIsLoading(false); return;
      }
      const userDocRef = doc(db, "users", authUser.uid);
      getDoc(userDocRef).then(docSnap => {
        if (docSnap.exists()) {
          const profileData = docSnap.data() as RegisteredUserEntry;
          profileForm.reset({
            businessName: profileData.corporationName || profileData.name || "",
            contactPerson: profileData.name || "", // Assuming main 'name' is contact person for corp
            contactNumber: profileData.phoneNumber || "",
            email: profileData.email || authUser.email || "",
          });
          setAvatarPreview(profileData.avatarDataUri || `https://picsum.photos/seed/${authUser.avatarSeed || profileData.corporationName?.replace(/[^a-zA-Z0-9]/g, '') || profileData.name?.replace(/[^a-zA-Z0-9]/g, '') || profileData.email}/128/128`);
        } else {
           profileForm.reset({
            businessName: authUser.corporationName || authUser.name || "Corporation",
            contactPerson: authUser.name || "",
            contactNumber: authUser.phoneNumber || "",
            email: authUser.email || "",
          });
           setAvatarPreview(`https://picsum.photos/seed/${authUser.avatarSeed || authUser.corporationName?.replace(/[^a-zA-Z0-9]/g, '') || authUser.name?.replace(/[^a-zA-Z0-9]/g, '') || authUser.email}/128/128`);
        }
      }).catch(error => {
        console.error("Error fetching corporation profile for settings:", error);
        toast({ title: "Error", description: "Could not load profile data.", variant: "destructive" });
      }).finally(() => {
        setIsLoading(false);
      });
    } else if (!authLoading && !authUser) {
      setIsLoading(false);
    }
  }, [authLoading, authUser, profileForm, toast]);


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
    let newAvatarDataUri: string | null | undefined = authUser.avatarDataUri; // Keep existing if no change

    if (data.profilePictureFile && data.profilePictureFile.length > 0) {
      const file = data.profilePictureFile[0];
      try {
        newAvatarDataUri = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = (error) => reject(error);
          reader.readAsDataURL(file);
        });
        setAvatarPreview(newAvatarDataUri); // Update preview immediately
      } catch (error) {
        toast({ title: "Image Error", description: "Could not process new profile picture.", variant: "destructive" });
        return;
      }
    } else if (profileForm.formState.dirtyFields.profilePictureFile && (!data.profilePictureFile || data.profilePictureFile.length === 0)) {
        // This means the file input was touched (e.g., to clear a selection)
        newAvatarDataUri = null; // Set to null to remove custom avatar, will revert to placeholder
        if (authUser?.email) setAvatarPreview(`https://picsum.photos/seed/${authUser.avatarSeed || data.businessName.replace(/[^a-zA-Z0-9]/g, '') + authUser.email}/128/128`);
    }


    const dataToUpdate: Partial<RegisteredUserEntry> = {
      corporationName: data.businessName,
      name: data.contactPerson, // For Corporation, contactPerson can be stored in 'name'
      phoneNumber: data.contactNumber,
      avatarDataUri: newAvatarDataUri,
      updatedAt: serverTimestamp(),
    };
     const cleanDataToUpdate = Object.fromEntries(Object.entries(dataToUpdate).filter(([_,v])=> v !== undefined));


    try {
      await updateDoc(userDocRef, cleanDataToUpdate);
      const updatedAuthUser = { ...authUser, ...cleanDataToUpdate, corporationName: data.businessName, name: data.contactPerson, avatarDataUri: newAvatarDataUri } as RegisteredUserEntry;
      setCurrentAppUser(updatedAuthUser, auth.currentUser); // Update AuthContext
      if (auth.currentUser && data.businessName !== auth.currentUser.displayName) {
        // Firebase Auth profile's displayName might be the corporation name for easier identification
        await updateFirebaseProfile(auth.currentUser, { displayName: data.businessName });
      }
      toast({ title: "Profile Updated!", description: "Your business profile information has been successfully updated.", variant: "default" });
      profileForm.reset(data); // Reset with new data to clear dirty state
      setSelectedFileName(null); // Clear selected file name
      if (profileForm.getValues("profilePictureFile")) {
        profileForm.setValue("profilePictureFile", undefined); // Reset file input
      }
    } catch (error) {
      console.error("Error updating profile in Firestore:", error);
      toast({ title: "Update Failed", description: "Could not update your profile.", variant: "destructive" });
    }
  };

  const onPasswordSubmit: SubmitHandler<PasswordFormValues> = async (data) => {
    if (!auth || !auth.currentUser || !authUser?.email) {
      toast({ title: "Error", description: "User not authenticated or email missing.", variant: "destructive" });
      return;
    }
    passwordForm.formState.isSubmitting;
    try {
      const credential = EmailAuthProvider.credential(authUser.email, data.currentPassword);
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
      profileForm.setValue("profilePictureFile", event.target.files, { shouldDirty: true }); // Mark form as dirty
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else { // No file selected or selection cleared
      setSelectedFileName(null);
      profileForm.setValue("profilePictureFile", undefined, { shouldDirty: true }); // Mark form as dirty
      // Revert to default placeholder based on business name if available, or generic
      if (authUser?.email) setAvatarPreview(`https://picsum.photos/seed/${authUser.avatarSeed || (profileForm.getValues("businessName") || authUser.corporationName || "Corp").replace(/[^a-zA-Z0-9]/g, '') + authUser.email}/128/128`);
    }
  };

  if (isLoading || authLoading) {
    return <div className="container mx-auto py-8 px-4 md:px-6 text-center">Loading business settings...</div>;
  }
  if (!authUser || authUser.type !== 'company') {
     return (
      <div className="container mx-auto py-8 px-4 md:px-6 text-center">
        <p>Access Denied. Please log in as a Corporation.</p>
        <Button asChild className="mt-4"><Link href="/auth/corporation-login">Go to Corporation Login</Link></Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
       <Button variant="outline" asChild className="mb-6">
        <Link href="/dashboard"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard</Link>
      </Button>

      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight flex items-center">
          <SettingsIcon className="mr-3 h-8 w-8 text-primary" /> Business Settings
        </h1>
        <p className="text-muted-foreground">Manage your company profile and account security.</p>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:w-1/3 mb-6">
          <TabsTrigger value="profile"><User className="mr-2 h-4 w-4" /> Profile</TabsTrigger>
          <TabsTrigger value="security"><Lock className="mr-2 h-4 w-4" /> Security</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card className="shadow-lg rounded-xl">
            <CardHeader>
              <CardTitle>Business Profile</CardTitle>
              <ShadCardDescription>Update your company's information.</ShadCardDescription>
            </CardHeader>
            <Form {...profileForm}>
              <form onSubmit={profileForm.handleSubmit(onProfileSubmit)}>
                <CardContent className="space-y-6">
                  <div className="flex flex-col items-center space-y-4">
                    <Avatar className="h-24 w-24 border-2 border-primary">
                      <AvatarImage src={avatarPreview || `https://picsum.photos/seed/${authUser.avatarSeed || (profileForm.getValues("businessName") || authUser.corporationName || "Corp").replace(/[^a-zA-Z0-9]/g, '') + authUser.email}/128/128`} alt={authUser.corporationName || "Business Logo"} data-ai-hint="business logo large"/>
                      <AvatarFallback>{(authUser.corporationName || "C")?.substring(0,1).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <FormField
                      control={profileForm.control}
                      name="profilePictureFile"
                      render={({ field }) => ( // field is not directly used here, but needed for RHF
                        <FormItem className="w-full max-w-sm">
                          <RHFFormLabel htmlFor="profilePictureInput" className="sr-only">Change business logo</RHFFormLabel>
                          <FormControl>
                            <Input
                              id="profilePictureInput"
                              type="file"
                              accept="image/*"
                              onChange={handleFileChange} // Use custom handler
                              className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                            />
                          </FormControl>
                           {selectedFileName && <FormDescription className="text-xs text-muted-foreground mt-1">Selected: {selectedFileName}</FormDescription>}
                           {!selectedFileName && !avatarPreview?.startsWith('data:image') && <FormDescription className="text-xs text-muted-foreground mt-1">No custom logo uploaded.</FormDescription>}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={profileForm.control}
                    name="businessName"
                    render={({ field }) => (
                      <FormItem>
                        <RHFFormLabel>Business Name</RHFFormLabel>
                        <div className="flex items-center gap-2">
                            <Building className="h-5 w-5 text-muted-foreground" />
                            <FormControl>
                                <Input placeholder="Your Company Name" {...field} />
                            </FormControl>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormItem>
                    <RHFFormLabel>Business Email</RHFFormLabel>
                     <div className="flex items-center gap-2">
                        <User className="h-5 w-5 text-muted-foreground" />
                        <Input value={localUserEmail} disabled />
                    </div>
                    <FormDescription>This email is used for your account. Contact support to change it.</FormDescription>
                  </FormItem>
                  <FormField
                    control={profileForm.control}
                    name="contactPerson"
                    render={({ field }) => (
                      <FormItem>
                        <RHFFormLabel>Contact Person</RHFFormLabel>
                        <div className="flex items-center gap-2">
                            <User className="h-5 w-5 text-muted-foreground" />
                            <FormControl>
                                <Input placeholder="Full Name" {...field} />
                            </FormControl>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={profileForm.control}
                    name="contactNumber"
                    render={({ field }) => (
                      <FormItem>
                        <RHFFormLabel>Contact Number</RHFFormLabel>
                        <div className="flex items-center gap-2">
                            <Phone className="h-5 w-5 text-muted-foreground" />
                            <FormControl>
                                <Input placeholder="03XX-XXXXXXX" {...field} />
                            </FormControl>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
                <CardFooter className="border-t pt-6 flex justify-end">
                  <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground" disabled={profileForm.formState.isSubmitting || !profileForm.formState.isDirty}>
                    <Save className="mr-2 h-4 w-4" />
                    {profileForm.formState.isSubmitting ? "Saving..." : "Save Changes"}
                  </Button>
                </CardFooter>
              </form>
            </Form>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card className="shadow-lg rounded-xl">
            <CardHeader>
              <CardTitle>Password & Security</CardTitle>
              <ShadCardDescription>Change your account password.</ShadCardDescription>
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
      </Tabs>
    </div>
  );
}
