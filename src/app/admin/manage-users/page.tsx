
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Users, Search, Briefcase, User as UserIconStd, Landmark, ShieldAlert, Edit, Trash2, MoreHorizontal, Filter, UserCheck, Eye, Lock, Unlock, CheckCircle, ListX, CalendarDays as CalendarIcon, Clock, ListFilter, Loader2, ChevronDown, UserPlus, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent as FormDialogContent,
  DialogDescription as FormDialogDescription,
  DialogFooter as FormDialogFooter,
  DialogHeader as FormDialogHeader,
  DialogTitle as FormDialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import {
  type InvestmentRangeType,
  type UserStatus,
  type RegisteredUserEntry,
  investmentRangeOptions,
} from '@/app/auth/components/auth-shared-types';
import { cn } from '@/lib/utils';
import { db, auth } from '@/lib/firebaseConfig';
import { doc, updateDoc, collection, query, where, Timestamp, onSnapshot, deleteField, serverTimestamp, getDoc, FieldValue } from 'firebase/firestore';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { CountdownTimer } from '@/components/common/countdown-timer';
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from '@/components/ui/label';
import { Checkbox } from "@/components/ui/checkbox";
import type { CheckedState } from '@radix-ui/react-checkbox';
import { UserProfileDialog } from '@/components/common/user-profile-dialog';
import * as XLSX from 'xlsx';
import Link from 'next/link';


interface User extends RegisteredUserEntry {
  // UID here refers to Firebase Auth UID
}

const userTypeOptions = ["all", "company", "professional", "investor", "admin"] as const;
const allStatusOptions = ['active', 'suspended', 'locked', 'pending_payment_verification', 'payment_proof_submitted', 'pending_verification'] as const;


const statusFilterOptions = ["all", ...allStatusOptions] as const;
const sortOptions = ["newest", "oldest"] as const;

const editUserFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  corporationName: z.string().optional(),
  status: z.enum(allStatusOptions),
  investmentRange: z.enum(investmentRangeOptions).optional(),
  investmentFocus: z.string().max(500, "Investment focus must be less than 500 characters.").optional(),
  phoneNumber: z.string().optional().refine(val => !val || /^(\+92|0)?3\d{2}(-|\s)?\d{7}$/.test(val), { message: "Enter a valid Pakistani mobile number or leave blank." }),
  profileDescription: z.string().max(500, "Description must be 500 characters or less.").optional(),
  yearsExperience: z.coerce.number().int().min(0, "Years of experience cannot be negative.").optional(),
  workingLeads: z.coerce.number().int().min(0, "Working leads cannot be negative.").optional(),
});
type EditUserFormValues = z.infer<typeof editUserFormSchema>;


export default function AdminManageUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [userTypeFilter, setUserTypeFilter] = useState<typeof userTypeOptions[number]>("all");
  const [statusFilter, setStatusFilter] = useState<typeof statusFilterOptions[number]>("all");
  const [sortOrder, setSortOrder] = useState<typeof sortOptions[number]>("newest");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUserUids, setSelectedUserUids] = useState<string[]>([]);
  const { toast } = useToast();
  
  const [isEditUserDialogOpen, setIsEditUserDialogOpen] = useState(false);
  const [isViewProfileDialogOpen, setIsViewProfileDialogOpen] = useState(false);
  const [selectedUserForAction, setSelectedUserForAction] = useState<User | null>(null);

  const [isBlockedListDialogOpen, setIsBlockedListDialogOpen] = useState(false);
  const [blockedUserDetailsList, setBlockedUserDetailsList] = useState<RegisteredUserEntry[]>([]);
  const [isLoadingBlockedDetails, setIsLoadingBlockedDetails] = useState(false);

  const [isEditExpiryDialogOpen, setIsEditExpiryDialogOpen] = useState(false);
  const [newSelectedExpiryDateForEdit, setNewSelectedExpiryDateForEdit] = useState<Date | undefined>(new Date());
  const [selectedHour, setSelectedHour] = useState<string>("23");
  const [selectedMinute, setSelectedMinute] = useState<string>("59");
  const [selectedSecond, setSelectedSecond] = useState<string>("59");

  const { currentUser: adminAuthUser, loading: adminAuthLoading, setCurrentAppUser } = useAuth();
  
  const editForm = useForm<EditUserFormValues>({
    resolver: zodResolver(editUserFormSchema),
    defaultValues: {
      name: "",
      corporationName: "",
      status: "pending_verification",
      investmentRange: undefined,
      investmentFocus: "",
      phoneNumber: "",
      profileDescription: "",
      yearsExperience: 0,
      workingLeads: 0,
    },
  });

  useEffect(() => {
    if (!adminAuthLoading && adminAuthUser && db) {
      setIsLoading(true);
      const usersRef = collection(db, "users");
      const unsubscribe = onSnapshot(usersRef, (snapshot) => {
        const userList: User[] = [];
        snapshot.forEach(doc => userList.push({ uid: doc.id, ...doc.data() } as User));
        setUsers(userList);
        setIsLoading(false);
      }, (error) => {
        console.error("Error fetching users: ", error);
        toast({ title: "Error", description: "Could not fetch user data.", variant: "destructive" });
        setIsLoading(false);
      });
      return () => unsubscribe();
    } else if (!adminAuthLoading && !adminAuthUser) {
        setIsLoading(false);
    }
  }, [adminAuthLoading, adminAuthUser, toast]);

  useEffect(() => {
    if (selectedUserForAction) {
      editForm.reset({
        name: selectedUserForAction.name || "",
        corporationName: selectedUserForAction.corporationName || "",
        status: selectedUserForAction.status,
        investmentRange: selectedUserForAction.investmentRange,
        investmentFocus: selectedUserForAction.investmentFocus || "",
        phoneNumber: selectedUserForAction.phoneNumber || "",
        profileDescription: selectedUserForAction.profileDescription || "",
        yearsExperience: selectedUserForAction.yearsExperience ?? 0,
        workingLeads: selectedUserForAction.workingLeads ?? 0,
      });
    }
  }, [selectedUserForAction, editForm]);

  const handleEditSubmit: SubmitHandler<EditUserFormValues> = async (values) => {
    if (!selectedUserForAction || !db) {
        toast({ title: "Error", description: "No user selected for edit.", variant: "destructive" });
        return;
    }
    
    const isSubmitting = editForm.formState.isSubmitting;
    if(isSubmitting) return;

    const userDocRef = doc(db, "users", selectedUserForAction.uid);
    const updateData: Partial<RegisteredUserEntry> = {
        name: values.name,
        corporationName: values.corporationName,
        status: values.status,
        investmentRange: values.investmentRange,
        investmentFocus: values.investmentFocus,
        phoneNumber: values.phoneNumber,
        profileDescription: values.profileDescription,
        yearsExperience: values.yearsExperience,
        workingLeads: values.workingLeads,
    };
    
    const updateDataWithTimestamp: any = {
      ...updateData,
      updatedAt: serverTimestamp()
    };

    try {
        await updateDoc(userDocRef, updateDataWithTimestamp);
        toast({ title: "User Updated", description: `${values.name}'s profile has been updated.` });
        setIsEditUserDialogOpen(false);
    } catch (error) {
        console.error("Error updating user document:", error);
        toast({ title: "Update Failed", description: "Could not save changes.", variant: "destructive" });
    }
  };

  const handleOpenEditDialog = (user: User) => {
    setSelectedUserForAction(user);
    setIsEditUserDialogOpen(true);
  };
  
  const sortedAndFilteredUsers = useMemo(() => {
    let usersToProcess = users.filter(user => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        (user.name && user.name.toLowerCase().includes(searchLower)) ||
        (user.email && user.email.toLowerCase().includes(searchLower)) ||
        (user.uid && user.uid.toLowerCase().includes(searchLower));
      const matchesUserType = userTypeFilter === 'all' || user.type === userTypeFilter;
      const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
      return matchesSearch && matchesUserType && matchesStatus && user.isDeletedByAdmin !== true;
    });

    usersToProcess.sort((a, b) => {
      const dateA = a.createdAt ? (a.createdAt instanceof Timestamp ? (a.createdAt as Timestamp).toDate() : new Date(a.createdAt as string | Date)) : new Date(0);
      const dateB = b.createdAt ? (b.createdAt instanceof Timestamp ? (b.createdAt as Timestamp).toDate() : new Date(b.createdAt as string | Date)) : new Date(0);
      if (sortOrder === 'newest') {
        return dateB.getTime() - dateA.getTime();
      } else {
        return dateA.getTime() - dateB.getTime();
      }
    });

    return usersToProcess;
  }, [users, searchTerm, userTypeFilter, sortOrder]);


  const handleUserAction = async (userId: string, userName: string, action: 'suspend' | 'activate' | 'delete' | 'lock' | 'unlock' | 'approve_verification') => {
    let toastTitle = "User Status Updated";
    let toastDescription = `User ${userName}'s status has been updated.`;
    let newStatus: UserStatus | undefined = undefined;
    let firestoreUpdate: Record<string, any> = { updatedAt: serverTimestamp() };

    if (!db) {
      toast({title: "Database Error", description: "Firestore is not available.", variant: "destructive"});
      return;
    }
    const userDocRef = doc(db, "users", userId);

    if (action === 'delete') {
      toastTitle = "User Marked Deleted (Admin)";
      toastDescription = `User ${userName} marked as deleted. Their status will be set to 'suspended'. They will no longer appear in user-facing lists.`;
      newStatus = 'suspended';
      firestoreUpdate.status = 'suspended';
      firestoreUpdate.isDeletedByAdmin = true;
    } else {
      switch (action) {
        case 'suspend': newStatus = 'suspended'; toastTitle = `User Suspended`; toastDescription = `${userName} has been suspended.`; break;
        case 'activate': newStatus = 'active'; toastTitle = `User Activated`; toastDescription = `${userName} has been activated.`; firestoreUpdate.isDeletedByAdmin = false; break;
        case 'unlock': newStatus = 'active'; toastTitle = `User Unlocked`; toastDescription = `${userName} has been unlocked and activated.`; firestoreUpdate.isDeletedByAdmin = false; break;
        case 'lock': newStatus = 'locked'; toastTitle = "User Account Locked"; toastDescription = `${userName}'s account has been locked.`; break;
        case 'approve_verification':
          newStatus = 'active';
          toastTitle = "User Verification Approved";
          toastDescription = `${userName} is now active.`;
          firestoreUpdate.paymentProofDataUri = deleteField();
          firestoreUpdate.subscriptionPaymentSubmittedAt = deleteField();
          break;
      }
      if (newStatus) {
        firestoreUpdate.status = newStatus;
      }
    }

    if (userId && (Object.keys(firestoreUpdate).length > 1)) {
      try {
        await updateDoc(userDocRef, firestoreUpdate);
        toast({ title: toastTitle, description: toastDescription });
      } catch (error) {
        console.error("Error updating user in Firestore:", error);
        toast({ title: "Update Failed", description: "Could not update user in Firestore.", variant: "destructive"});
      }
    }
  };

  const handleOpenBlockedListDialog = async (user: User) => {
    setSelectedUserForAction(user);
    if (user.blockedUsers && user.blockedUsers.length > 0 && db) {
      setIsLoadingBlockedDetails(true);
      setIsBlockedListDialogOpen(true);
      const detailsPromises = user.blockedUsers.map(async (uid) => {
        const userDocRef = doc(db, "users", uid);
        const docSnap = await getDoc(userDocRef);
        if (docSnap.exists()) {
          return { uid, ...docSnap.data() } as RegisteredUserEntry;
        }
        return { uid, name: `User Record Not Found (${uid.substring(0,8)}...)`, email: `UID: ${uid}` } as RegisteredUserEntry;
      });
      const resolvedDetails = await Promise.all(detailsPromises);
      setBlockedUserDetailsList(resolvedDetails);
      setIsLoadingBlockedDetails(false);
    } else {
      setBlockedUserDetailsList([]);
      setIsBlockedListDialogOpen(true);
    }
  };

  const handleAdminUnblockUser = async (blockerUserId: string, userToUnblockUid: string, userToUnblockName?: string) => {
    if (!db || !selectedUserForAction) return;
    const blockerUserDocRef = doc(db, "users", blockerUserId);
    try {
        const currentBlockedByThisUser = selectedUserForAction.blockedUsers || [];
        const updatedBlockedUsersForBlocker = currentBlockedByThisUser.filter(uid => uid !== userToUnblockUid);

        await updateDoc(blockerUserDocRef, {
          blockedUsers: updatedBlockedUsersForBlocker,
          updatedAt: serverTimestamp(),
        });

        toast({ title: "User Unblocked by Admin", description: `${userToUnblockName || 'User'} has been unblocked for ${selectedUserForAction?.name || 'the selected user'}.` });
        setBlockedUserDetailsList(prev => prev.filter(u => u.uid !== userToUnblockUid));
        setUsers(prevUsers => prevUsers.map(u => u.uid === blockerUserId ? { ...u, blockedUsers: updatedBlockedUsersForBlocker } : u));
    } catch (error) {
      console.error("Error unblocking user by admin:", error);
      toast({ title: "Unblock Failed", description: "Could not unblock user.", variant: "destructive" });
    }
  };

  const handleOpenEditExpiryDialog = (user: User) => {
    if (user.type !== 'professional') {
        toast({title: "Not Applicable", description: "Subscription expiry is only applicable to Startups.", variant: "default"});
        return;
    }
    setSelectedUserForAction(user);
    const currentExpiry = user.subscriptionExpiryDate;
    if (currentExpiry) {
        const d = currentExpiry instanceof Timestamp ? currentExpiry.toDate() : new Date(currentExpiry as string | Date);
        setNewSelectedExpiryDateForEdit(d);
        setSelectedHour(d.getHours().toString().padStart(2, '0'));
        setSelectedMinute(d.getMinutes().toString().padStart(2, '0'));
        setSelectedSecond(d.getSeconds().toString().padStart(2, '0'));
    } else {
        setNewSelectedExpiryDateForEdit(new Date());
        setSelectedHour("23");
        setSelectedMinute("59");
        setSelectedSecond("59");
    }
    setIsEditExpiryDialogOpen(true);
  };

  const handleSaveNewExpiryDate = async () => {
    if (!selectedUserForAction || !newSelectedExpiryDateForEdit || !db) {
      toast({ title: "Error", description: "User or date not selected.", variant: "destructive" });
      return;
    }
    const userDocRef = doc(db, "users", selectedUserForAction.uid);
    try {
      const finalDate = new Date(newSelectedExpiryDateForEdit);
      finalDate.setHours(parseInt(selectedHour, 10), parseInt(selectedMinute, 10), parseInt(selectedSecond, 10));

      await updateDoc(userDocRef, {
        subscriptionExpiryDate: Timestamp.fromDate(finalDate),
        updatedAt: serverTimestamp()
      });
      toast({ title: "Expiry Date Updated", description: `Subscription expiry for ${selectedUserForAction.name} updated.` });
      setIsEditExpiryDialogOpen(false);
    } catch (error) {
      console.error("Error updating expiry date:", error);
      toast({ title: "Update Failed", description: "Could not update expiry date.", variant: "destructive" });
    }
  };

  const getUserTypeIcon = (type?: User['type']) => {
    if (type === 'company') return <Briefcase className="mr-2 h-4 w-4" />;
    if (type === 'professional') return <UserIconStd className="mr-2 h-4 w-4" />;
    if (type === 'investor') return <Landmark className="mr-2 h-4 w-4" />;
    if (type === 'admin') return <ShieldAlert className="mr-2 h-4 w-4 text-red-500" />;
    return <UserIconStd className="mr-2 h-4 w-4" />;
  };

  const getStatusBadgeClasses = (status?: User["status"]): string => {
    switch(status) {
      case 'active': return 'bg-accent text-accent-foreground border-accent';
      case 'suspended': return 'bg-destructive text-destructive-foreground border-destructive';
      case 'pending_payment_verification': return 'bg-yellow-500 text-yellow-50 border-yellow-600';
      case 'payment_proof_submitted': return 'bg-blue-500 text-white border-blue-600';
      case 'locked': return 'bg-slate-700 text-slate-50 border-slate-700';
      case 'pending_verification': return 'bg-orange-500 text-white border-orange-600';
      default: return 'border-gray-300 text-gray-600 bg-gray-100';
    }
  };

  const handleSelectAll = (checked: CheckedState) => {
    if (checked === true) {
      setSelectedUserUids(sortedAndFilteredUsers.map(user => user.uid));
    } else {
      setSelectedUserUids([]);
    }
  };

  const handleRowSelect = (uid: string, checked: boolean) => {
    if (checked) {
      setSelectedUserUids(prev => [...prev, uid]);
    } else {
      setSelectedUserUids(prev => prev.filter(id => id !== uid));
    }
  };
  
  const getFormattedDate = (dateInput: string | Date | Timestamp | FieldValue | null | undefined): string => {
      if (!dateInput) return 'N/A';
      if (typeof (dateInput as any).toDate === 'function') {
          return format((dateInput as Timestamp).toDate(), "yyyy-MM-dd HH:mm:ss");
      }
      if (typeof dateInput === 'string' || dateInput instanceof Date) {
          const date = new Date(dateInput);
          if (!isNaN(date.getTime())) {
              return format(date, "yyyy-MM-dd HH:mm:ss");
          }
      }
      return 'Pending Write'; 
  };


  const downloadExcel = (data: User[]) => {
    const formattedData = data.map(user => ({
      UID: user.uid,
      Name: user.name,
      Email: user.email,
      Type: user.type,
      Status: user.status,
      PhoneNumber: user.phoneNumber,
      CorporationName: user.corporationName,
      Gender: user.gender,
      InvestmentRange: user.investmentRange,
      InvestmentFocus: user.investmentFocus,
      ProfileDescription: user.profileDescription,
      YearsExperience: user.yearsExperience,
      WorkingLeads: user.workingLeads,
      SubscriptionType: user.subscriptionType,
      SubscriptionExpiry: getFormattedDate(user.subscriptionExpiryDate),
      ReferralCodeUsed: user.referralCodeUsed,
      BlockedUsersCount: user.blockedUsers?.length || 0,
      DateJoined: getFormattedDate(user.createdAt),
      LastUpdated: getFormattedDate(user.updatedAt),
    }));
    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Users");
    XLSX.writeFile(workbook, `LISTED_Users_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleDownloadSelected = () => {
    const selectedUsers = users.filter(user => selectedUserUids.includes(user.uid));
    if (selectedUsers.length === 0) {
      toast({ title: "No Users Selected", description: "Please select users to download.", variant: "default" });
      return;
    }
    downloadExcel(selectedUsers);
  };
  
  const handleDownloadAll = () => {
    if (sortedAndFilteredUsers.length === 0) {
        toast({ title: "No Users to Download", description: "There are no users in the current filtered list.", variant: "default" });
        return;
    }
    downloadExcel(sortedAndFilteredUsers);
  };

  const isAllSelected = sortedAndFilteredUsers.length > 0 && selectedUserUids.length === sortedAndFilteredUsers.length;
  const isSomeSelected = selectedUserUids.length > 0 && !isAllSelected;


  if (isLoading) {
    return <div className="container mx-auto py-8 px-4 md:px-6 text-center">Loading user management...</div>;
  }

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center"><Users className="mr-3 h-8 w-8 text-primary"/>Manage Users</h1>
          <p className="text-muted-foreground">Oversee all registered user accounts on the LISTED platform.</p>
        </div>
        <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleDownloadSelected} disabled={selectedUserUids.length === 0}>
                <Download className="mr-2 h-4 w-4"/>Download Selected ({selectedUserUids.length})
            </Button>
            <Button variant="outline" onClick={handleDownloadAll} disabled={sortedAndFilteredUsers.length === 0}>
                <Download className="mr-2 h-4 w-4"/>Download All Filtered
            </Button>
        </div>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Platform Users ({sortedAndFilteredUsers.length})</CardTitle>
          <CardDescription>Review, edit, or manage user accounts and their statuses.</CardDescription>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
            <div className="relative lg:col-span-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input type="search" placeholder="Search by name, email, ID..." className="pl-8 w-full" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <Select value={userTypeFilter} onValueChange={(value) => setUserTypeFilter(value as typeof userTypeOptions[number])}>
              <SelectTrigger className="w-full"><div className="flex items-center gap-2"><Filter className="h-4 w-4 text-muted-foreground" /><SelectValue placeholder="Filter by user type" /></div></SelectTrigger>
              <SelectContent>{userTypeOptions.map(option => <SelectItem key={option} value={option}>{option === 'professional' ? 'Startup' : (option.charAt(0).toUpperCase() + option.slice(1))}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as typeof statusFilterOptions[number])}>
              <SelectTrigger className="w-full"><div className="flex items-center gap-2"><Filter className="h-4 w-4 text-muted-foreground" /><SelectValue placeholder="Filter by status" /></div></SelectTrigger>
              <SelectContent>{statusFilterOptions.map(option => <SelectItem key={option} value={option}>{option.replace(/_/g, ' ').split(' ').map(s => s.charAt(0).toUpperCase() + s.substring(1)).join(' ')}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={sortOrder} onValueChange={(value) => setSortOrder(value as typeof sortOptions[number])}>
              <SelectTrigger className="w-full"><div className="flex items-center gap-2"><ListFilter className="h-4 w-4 text-muted-foreground" /><SelectValue placeholder="Sort by date" /></div></SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Date Joined (Newest First)</SelectItem>
                <SelectItem value="oldest">Date Joined (Oldest First)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative w-full overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="px-2 py-3 w-10">
                     <Checkbox
                        checked={isAllSelected ? true : isSomeSelected ? 'indeterminate' : false}
                        onCheckedChange={handleSelectAll}
                        aria-label="Select all rows"
                      />
                  </TableHead>
                  <TableHead className="px-2 max-w-[200px] whitespace-nowrap">User Profile</TableHead>
                  <TableHead className="px-2 max-w-[180px] whitespace-nowrap">Email</TableHead>
                  <TableHead className="hidden md:table-cell px-2">User Type</TableHead>
                  <TableHead className="px-2">Status</TableHead>
                  <TableHead className="px-2 min-w-[200px]">Sub. Renewal</TableHead>
                  <TableHead className="hidden lg:table-cell px-2">Date Joined</TableHead>
                  <TableHead className="px-2 text-center">Blocked</TableHead>
                  <TableHead className="text-right px-2">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedAndFilteredUsers.length > 0 ? (
                  sortedAndFilteredUsers.map((user) => (
                    <TableRow key={user.uid} data-state={selectedUserUids.includes(user.uid) && "selected"}>
                       <TableCell className="px-2 py-3">
                        <Checkbox
                            checked={selectedUserUids.includes(user.uid)}
                            onCheckedChange={(checked) => handleRowSelect(user.uid, checked as boolean)}
                            aria-label={`Select row for ${user.name}`}
                          />
                      </TableCell>
                      <TableCell className="px-2 py-3 max-w-[200px] whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-9 w-9 flex-shrink-0"><AvatarImage src={user.avatarDataUri || `https://picsum.photos/seed/${user.avatarSeed || user.uid}/40/40`} alt={user.name || user.email} data-ai-hint="person avatar"/><AvatarFallback>{(user.name || user.email || "U").substring(0, 1).toUpperCase()}</AvatarFallback></Avatar>
                          <div className="min-w-0">
                            <div className="font-medium truncate block">{user.name || (user.email ? user.email.split('@')[0] : 'Unknown')}</div>
                            <div className="text-xs text-muted-foreground truncate block whitespace-nowrap">ID: {user.uid && user.uid.length > 10 ? user.uid.substring(0,10) + '...' : user.uid }</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-2 py-3 max-w-[180px] truncate whitespace-nowrap">{user.email}</TableCell>
                      <TableCell className="hidden md:table-cell px-2 py-3">
                        <Badge variant="secondary" className="flex items-center gap-1 w-fit">{getUserTypeIcon(user.type)}{user.type ? (user.type === 'professional' ? 'Startup' : user.type.charAt(0).toUpperCase() + user.type.slice(1)) : 'N/A'}</Badge>
                      </TableCell>
                       <TableCell className="px-2 py-3">
                        <Badge variant="outline" className={cn(getStatusBadgeClasses(user.status), "py-1 px-2 text-xs whitespace-nowrap")}>
                          {user.status ? user.status.replace(/_/g, ' ').split(' ').map(s => s.charAt(0).toUpperCase() + s.substring(1)).join(' ') : 'N/A'}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-2 py-3 text-xs min-w-[200px]">
                        {user.type === 'professional' && user.subscriptionExpiryDate ? (
                          <>
                            {format(new Date(user.subscriptionExpiryDate as string | Date), "dd MMM, yy HH:mm:ss")}
                            <CountdownTimer
                              expiryDate={user.subscriptionExpiryDate}
                              prefix=""
                              className="block text-muted-foreground text-[10px]"
                              displayMode="full"
                            />
                          </>
                        ) : <span className="text-muted-foreground">N/A</span>}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell px-2 py-3 whitespace-nowrap">
                        {user.createdAt ? format(new Date(user.createdAt as string | Date), "dd MMM, yyyy") : "N/A"}
                      </TableCell>
                      <TableCell className="px-2 py-3 text-center">
                        <Button variant="link" size="sm" className="p-0 h-auto text-xs" onClick={() => handleOpenBlockedListDialog(user)} disabled={(user.blockedUsers?.length || 0) === 0}>
                          {user.blockedUsers?.length || 0}
                        </Button>
                      </TableCell>
                      <TableCell className="text-right px-2 py-3">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={()=>{ setSelectedUserForAction(user); setIsViewProfileDialogOpen(true); }}><Eye className="mr-2 h-4 w-4" />View Profile</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleOpenEditDialog(user)}><Edit className="mr-2 h-4 w-4" />Edit User</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleOpenEditExpiryDialog(user)} disabled={user.type !== 'professional' || !user.subscriptionExpiryDate}>
                                <CalendarIcon className="mr-2 h-4 w-4" /> Edit Sub. Expiry
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleOpenBlockedListDialog(user)}><ListX className="mr-2 h-4 w-4" />View Blocked Users</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            
                             <AlertDialog>
                                <AlertDialogTrigger asChild><DropdownMenuItem className="text-orange-600 focus:text-orange-700" onSelect={(e) => e.preventDefault()}>
                                    <ShieldAlert className="mr-2 h-4 w-4"/>
                                    {user.status === 'suspended' ? 'Activate User' : 'Suspend User'}
                                </DropdownMenuItem></AlertDialogTrigger>
                                <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Confirm Action</AlertDialogTitle><AlertDialogDescription>Are you sure you want to {user.status === 'suspended' ? 'activate' : 'suspend'} {user.name}?</AlertDialogDescription></AlertDialogHeader>
                                <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleUserAction(user.uid, user.name || user.email, user.status === 'suspended' ? 'activate' : 'suspend')}>Confirm</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
                            </AlertDialog>

                             <AlertDialog>
                                <AlertDialogTrigger asChild><DropdownMenuItem className="text-red-600 focus:text-red-700" onSelect={(e) => e.preventDefault()}>
                                    <Lock className="mr-2 h-4 w-4"/>
                                    {user.status === 'locked' ? 'Unlock User' : 'Lock User'}
                                </DropdownMenuItem></AlertDialogTrigger>
                                <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Confirm Action</AlertDialogTitle><AlertDialogDescription>Are you sure you want to {user.status === 'locked' ? 'unlock' : 'lock'} {user.name}'s account?</AlertDialogDescription></AlertDialogHeader>
                                <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleUserAction(user.uid, user.name || user.email, user.status === 'locked' ? 'unlock' : 'lock')}>Confirm</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
                            </AlertDialog>

                             <AlertDialog>
                                <AlertDialogTrigger asChild><DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10" onSelect={(e) => e.preventDefault()}>
                                    <Trash2 className="mr-2 h-4 w-4" />Mark Deleted
                                </DropdownMenuItem></AlertDialogTrigger>
                                <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle><AlertDialogDescription>This will mark user "{user.name || user.email}" as deleted and suspend them.</AlertDialogDescription></AlertDialogHeader>
                                <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleUserAction(user.uid, user.name || user.email, 'delete')} className="bg-destructive hover:bg-destructive/90">Mark Deleted</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
                            </AlertDialog>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow><TableCell colSpan={9} className="h-24 text-center px-2 py-3">No registered users found.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

        {selectedUserForAction && (
            <UserProfileDialog
                userId={selectedUserForAction.uid}
                isOpen={isViewProfileDialogOpen}
                onOpenChange={setIsViewProfileDialogOpen}
                currentLoggedInUser={adminAuthUser}
            />
        )}
        
        <Dialog open={isEditUserDialogOpen} onOpenChange={setIsEditUserDialogOpen}>
            <FormDialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
                <FormDialogHeader><FormDialogTitle>Edit User: {selectedUserForAction?.name}</FormDialogTitle><FormDialogDescription>Modify user details below. Changes are saved directly to Firestore.</FormDialogDescription></FormDialogHeader>
                <div className="flex-grow overflow-y-auto pr-4">
                  <Form {...editForm}>
                    <form onSubmit={editForm.handleSubmit(handleEditSubmit)} id="edit-user-form" className="space-y-4 py-4">
                      {selectedUserForAction && (
                        <>
                          <FormField control={editForm.control} name="name" render={({ field }) => (
                            <FormItem><Label>Full Name</Label><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                          )}/>
                          {selectedUserForAction.type === 'company' && <FormField control={editForm.control} name="corporationName" render={({ field }) => (
                            <FormItem><Label>Corporation Name</Label><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                          )}/>}
                          <FormField control={editForm.control} name="phoneNumber" render={({ field }) => (
                            <FormItem><Label>Phone Number</Label><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                          )}/>
                          <FormField control={editForm.control} name="status" render={({ field }) => (
                            <FormItem><Label>Status</Label>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                                    <SelectContent>{allStatusOptions.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.substring(1)).join(' ')}</SelectItem>)}</SelectContent>
                                </Select>
                            <FormMessage /></FormItem>
                          )}/>
                          {selectedUserForAction.type === 'investor' && (<>
                            <FormField control={editForm.control} name="investmentRange" render={({ field }) => (
                                <FormItem><Label>Investment Range</Label>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                                    <SelectContent>{investmentRangeOptions.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                                </Select>
                                <FormMessage /></FormItem>
                            )}/>
                            <FormField control={editForm.control} name="investmentFocus" render={({ field }) => (
                              <FormItem><Label>Investment Focus</Label><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                          </>)}
                          {selectedUserForAction.type === 'professional' && (<>
                            <FormField control={editForm.control} name="profileDescription" render={({ field }) => (
                                <FormItem><Label>Profile Description</Label><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                             <FormField control={editForm.control} name="yearsExperience" render={({ field }) => (
                                <FormItem><Label>Years of Experience</Label><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                             <FormField control={editForm.control} name="workingLeads" render={({ field }) => (
                                <FormItem><Label>Working Leads</Label><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                          </>)}
                        </>
                      )}
                    </form>
                  </Form>
                </div>
                <FormDialogFooter className="border-t pt-4">
                  <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                  <Button type="submit" form="edit-user-form" disabled={editForm.formState.isSubmitting}>Save Changes</Button>
                </FormDialogFooter>
            </FormDialogContent>
        </Dialog>


      <Dialog open={isBlockedListDialogOpen} onOpenChange={setIsBlockedListDialogOpen}>
        <FormDialogContent className="sm:max-w-md">
            <FormDialogHeader><FormDialogTitle>Users Blocked by {selectedUserForAction?.name || 'User'}</FormDialogTitle><FormDialogDescription>This list shows all users that the selected user has blocked.</FormDialogDescription></FormDialogHeader>
            <ScrollArea className="max-h-[400px] mt-4 pr-3">
              {isLoadingBlockedDetails ? ( <p>Loading...</p> ) : blockedUserDetailsList.length > 0 ? (
                <ul className="space-y-2">
                  {blockedUserDetailsList.map((blockedUser) => (
                    <li key={blockedUser.uid} className="flex items-center justify-between p-2 border rounded-md">
                      <div className="flex items-center gap-3">
                           <Avatar className="h-9 w-9 border">
                                <AvatarImage src={blockedUser.avatarDataUri || `https://picsum.photos/seed/${blockedUser.avatarSeed || blockedUser.uid}/40/40`} alt={blockedUser.name || "User"} data-ai-hint="person avatar"/>
                                <AvatarFallback>{(blockedUser.name || "U").substring(0,1).toUpperCase()}</AvatarFallback>
                            </Avatar>
                        <div>
                            <p className="text-sm font-medium">{blockedUser.name || "Unknown User"}</p>
                            <p className="text-xs text-muted-foreground">{blockedUser.email}</p>
                        </div>
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild><Button variant="outline" size="sm" className="text-green-600 border-green-500 hover:bg-green-50">Unblock</Button></AlertDialogTrigger>
                        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Confirm Unblock</AlertDialogTitle><AlertDialogDescription>Are you sure you want to unblock {blockedUser.name} on behalf of {selectedUserForAction?.name}?</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleAdminUnblockUser(selectedUserForAction!.uid, blockedUser.uid, blockedUser.name)} className="bg-green-600 hover:bg-green-700">Confirm Unblock</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
                      </AlertDialog>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">This user has not blocked anyone.</p>
              )}
            </ScrollArea>
            <FormDialogFooter className="mt-4"><DialogClose asChild><Button variant="outline">Close</Button></DialogClose></FormDialogFooter>
        </FormDialogContent>
      </Dialog>
      
      <Dialog open={isEditExpiryDialogOpen} onOpenChange={setIsEditExpiryDialogOpen}>
        <FormDialogContent className="sm:max-w-md">
            <FormDialogHeader><FormDialogTitle>Edit Subscription Expiry for {selectedUserForAction?.name}</FormDialogTitle><FormDialogDescription>Set a new subscription end date and time for this user.</FormDialogDescription></FormDialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2"><Label htmlFor="new-expiry-date-admin">New End Date</Label>
                <Popover>
                  <PopoverTrigger asChild><Button id="new-expiry-date-admin" variant={"outline"} className={cn("w-full justify-start text-left font-normal",!newSelectedExpiryDateForEdit && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />{newSelectedExpiryDateForEdit ? format(newSelectedExpiryDateForEdit, "PPP") : <span>Pick a date</span>}
                  </Button></PopoverTrigger>
                  <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={newSelectedExpiryDateForEdit} onSelect={setNewSelectedExpiryDateForEdit} initialFocus/></PopoverContent>
                </Popover>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div><Label htmlFor="expiry-hour">Hour (0-23)</Label><Select value={selectedHour} onValueChange={setSelectedHour}><SelectTrigger id="expiry-hour"><SelectValue/></SelectTrigger><SelectContent>{Array.from({length: 24}, (_, i) => i.toString().padStart(2, '0')).map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                <div><Label htmlFor="expiry-minute">Minute (0-59)</Label><Select value={selectedMinute} onValueChange={setSelectedMinute}><SelectTrigger id="expiry-minute"><SelectValue/></SelectTrigger><SelectContent>{Array.from({length: 60}, (_, i) => i.toString().padStart(2, '0')).map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select></div>
                <div><Label htmlFor="expiry-second">Second (0-59)</Label><Select value={selectedSecond} onValueChange={setSelectedSecond}><SelectTrigger id="expiry-second"><SelectValue/></SelectTrigger><SelectContent>{Array.from({length: 60}, (_, i) => i.toString().padStart(2, '0')).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
              </div>
            </div>
            <FormDialogFooter><Button variant="outline" onClick={() => setIsEditExpiryDialogOpen(false)}>Cancel</Button><Button onClick={handleSaveNewExpiryDate} disabled={!newSelectedExpiryDateForEdit}>Save New Expiry</Button></FormDialogFooter>
        </FormDialogContent>
      </Dialog>
    </div>
  );
}
