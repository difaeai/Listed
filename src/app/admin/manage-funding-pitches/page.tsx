
"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, Eye, Search, Lightbulb, ShieldAlert, CheckCircle, ImageIcon, CalendarDays, Briefcase, DollarSign, Percent, FileText, Mail, User as UserIcon, Filter as FilterIcon, RotateCcw, ThumbsUp, ThumbsDown, Users, ChevronDown, Landmark } from 'lucide-react'; 
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MoreHorizontal } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { format, isFuture } from 'date-fns';
import { useToast } from "@/hooks/use-toast";
import type { FundingPitch } from '@/app/offers/my-ads/page';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebaseConfig';
import { collection, query, orderBy, doc, updateDoc, Timestamp, onSnapshot, serverTimestamp, increment, runTransaction, getDocs, where, writeBatch, getDoc } from "firebase/firestore";
import { useRouter } from 'next/navigation'; 
import NextImage from 'next/image';
import type { InvestmentRangeType } from '@/app/auth/components/auth-shared-types';

type PitchStatusFilter = 'all_active' | FundingPitch['status'] | 'admin_deleted';

const pitchStatusOptions: { value: PitchStatusFilter; label: string }[] = [
  { value: 'all_active', label: 'All Active (Seeking, Draft, Funded)' },
  { value: 'seeking_funding', label: 'Seeking Funding' },
  { value: 'draft', label: 'Draft' },
  { value: 'funded', label: 'Funded' },
  { value: 'closed', label: 'Closed (by User/System)' },
  { value: 'admin_deleted', label: 'Admin Deleted' },
];


export default function AdminManageFundingPitchesPage() {
  const [allPitches, setAllPitches] = useState<FundingPitch[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<PitchStatusFilter>('all_active');
  const [isLoading, setIsLoading] = useState(true);
  const { currentUser: adminUser, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    if (authLoading) return;
    if (!adminUser || adminUser.type !== 'admin' || !db) {
      toast({ title: "Unauthorized", description: "Admin access required.", variant: "destructive"});
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const pitchesRef = collection(db, "fundingPitches");
    const pitchesQuery = query(pitchesRef, orderBy("createdAt", "desc"));
    const unsubscribePitches = onSnapshot(pitchesQuery, (querySnapshot) => {
      const fetchedPitches: FundingPitch[] = [];
      querySnapshot.forEach((docSnap) => { 
        const data = docSnap.data();
        fetchedPitches.push({ 
            id: docSnap.id, 
            ...data,
            postedDate: typeof data.postedDate === 'string' ? data.postedDate : (data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : new Date().toISOString()),
            createdAt: data.createdAt, 
            updatedAt: data.updatedAt,
         } as FundingPitch);
      });
      setAllPitches(fetchedPitches);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching funding pitches: ", error);
      toast({ title: "Error", description: "Could not fetch funding pitches from Firestore.", variant: "destructive"});
      setIsLoading(false);
    });
    
    return () => {
        unsubscribePitches();
    };
  }, [adminUser, authLoading, router, toast]);

  const filteredPitches = useMemo(() => {
    let pitchesToFilter = allPitches;
    
    // Filter by status first
    if (statusFilter === 'admin_deleted') {
      pitchesToFilter = pitchesToFilter.filter(pitch => pitch.isDeletedByAdmin === true);
    } else if (statusFilter === 'all_active') {
      pitchesToFilter = pitchesToFilter.filter(pitch => 
        !pitch.isDeletedByAdmin && 
        ['seeking_funding', 'draft', 'funded'].includes(pitch.status)
      );
    } else { // Handles 'seeking_funding', 'draft', 'funded', 'closed'
      pitchesToFilter = pitchesToFilter.filter(pitch =>
        !pitch.isDeletedByAdmin && pitch.status === statusFilter
      );
    }

    // Then filter by search term
    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      pitchesToFilter = pitchesToFilter.filter(pitch =>
        pitch.projectTitle.toLowerCase().includes(lowerSearchTerm) ||
        (pitch.industry && pitch.industry.toLowerCase().includes(lowerSearchTerm)) ||
        pitch.contactEmail.toLowerCase().includes(lowerSearchTerm) ||
        (pitch.creatorName && pitch.creatorName.toLowerCase().includes(lowerSearchTerm))
      );
    }
    
    return pitchesToFilter;
  }, [allPitches, searchTerm, statusFilter]);

  const handleUpdatePitchStatus = async (pitchId: string, newStatus: FundingPitch['status'], pitchTitle: string) => {
    if (!db) return;
    const pitchDocRef = doc(db, "fundingPitches", pitchId);
    try {
      await updateDoc(pitchDocRef, { status: newStatus, updatedAt: serverTimestamp() });
      toast({
        title: "Pitch Status Updated",
        description: `Pitch "${pitchTitle}" status changed to ${newStatus.replace('_', ' ')}.`,
      });
    } catch (error) {
      console.error("Error updating pitch status:", error);
      toast({ title: "Error", description: "Could not update pitch status.", variant: "destructive"});
    }
  };

  const handleAdminDeletePitch = async (pitchId: string, pitchTitle: string) => {
    if (!db) return;
    const pitchDocRef = doc(db, "fundingPitches", pitchId);
    try {
      await updateDoc(pitchDocRef, { isDeletedByAdmin: true, status: 'closed', updatedAt: serverTimestamp() });
      toast({
        title: "Pitch Soft Deleted",
        description: `Pitch "${pitchTitle}" marked as deleted and closed. It will now appear under the 'Admin Deleted' filter.`,
      });
    } catch (error) {
      console.error("Error soft-deleting pitch:", error);
      toast({ title: "Error", description: "Could not soft delete pitch.", variant: "destructive"});
    }
  };

  const handleRestorePitch = async (pitchId: string, pitchTitle: string) => {
    if (!db) return;
    const pitchDocRef = doc(db, "fundingPitches", pitchId);
    try {
      await updateDoc(pitchDocRef, { isDeletedByAdmin: false, status: 'seeking_funding', updatedAt: serverTimestamp() });
      toast({
        title: "Pitch Restored",
        description: `Pitch "${pitchTitle}" has been restored and is now seeking funding.`,
      });
    } catch (error) {
      console.error("Error restoring pitch:", error);
      toast({ title: "Error", description: "Could not restore pitch.", variant: "destructive"});
    }
  };

  const getStatusBadgeClasses = (status: FundingPitch["status"], isDeletedByAdmin?: boolean): string => {
    if (isDeletedByAdmin) return 'bg-gray-500 text-white border-gray-500'; 
    switch(status) {
      case 'seeking_funding': return 'bg-blue-500 text-white border-blue-500';
      case 'funded': return 'bg-accent text-accent-foreground border-accent';
      case 'closed': return 'bg-destructive/80 text-destructive-foreground border-destructive/80';
      case 'draft': return 'border-yellow-500 text-yellow-600 bg-yellow-500/10';
      default: return 'border-gray-300 text-gray-600';
    }
  }

  if (authLoading || isLoading) {
    return <div className="container mx-auto py-8 px-4 md:px-6 text-center">Loading funding pitches management...</div>;
  }
   if (!adminUser || adminUser.type !== 'admin') {
    return <div className="container mx-auto py-8 px-4 md:px-6 text-center">Admin access required.</div>;
  }

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <div className="flex items-center justify-between mb-6">
        <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center">
                <Lightbulb className="mr-3 h-8 w-8 text-primary" /> Manage Funding Pitches
            </h1>
            <p className="text-muted-foreground">Oversee all funding pitches submitted by users.</p>
        </div>
      </div>

      <Card className="shadow-lg rounded-xl">
        <CardHeader>
            <CardTitle>All Funding Pitches ({filteredPitches.length} matching filter)</CardTitle>
            <CardDescription>Review, edit status, or manage funding proposals. Use filters to narrow down the list.</CardDescription>
            <div className="flex flex-col md:flex-row gap-4 mt-4">
                <div className="relative flex-grow">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Search by title, industry, email, creator..."
                        className="pl-8 w-full"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as PitchStatusFilter)}>
                    <SelectTrigger className="w-full md:w-[280px]">
                        <div className="flex items-center gap-2">
                        <FilterIcon className="h-4 w-4 text-muted-foreground" />
                        <SelectValue placeholder="Filter by status" />
                        </div>
                    </SelectTrigger>
                    <SelectContent>
                        {pitchStatusOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </CardHeader>
        <CardContent>
          {filteredPitches.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredPitches.map((pitch) => (
                <Card key={pitch.id} className={`flex flex-col shadow-md hover:shadow-lg transition-shadow duration-300 rounded-xl overflow-hidden ${pitch.isDeletedByAdmin ? 'opacity-60 border-dashed border-gray-400 bg-slate-50' : ''}`}>
                  <CardHeader className="p-4">
                    <div className="flex justify-between items-start">
                      <Link href={`/admin/manage-funding-pitches/${pitch.id}/engagement`} className="cursor-pointer hover:text-primary">
                        <CardTitle className="text-lg leading-tight line-clamp-2">{pitch.projectTitle}</CardTitle>
                      </Link>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                             <Link href={`/admin/manage-funding-pitches/${pitch.id}/engagement`}>
                                <Eye className="mr-2 h-4 w-4" />View & Manage Engagement
                             </Link>
                          </DropdownMenuItem>
                           <DropdownMenuSeparator/>
                           <DropdownMenuItem onClick={() => handleUpdatePitchStatus(pitch.id!, 'seeking_funding', pitch.projectTitle)} className="text-green-600 focus:text-green-700"><CheckCircle className="mr-2 h-4 w-4" /> Set to Seeking Funding</DropdownMenuItem>
                           <DropdownMenuItem onClick={() => handleUpdatePitchStatus(pitch.id!, 'draft', pitch.projectTitle)} className="text-orange-600 focus:text-orange-700"><ShieldAlert className="mr-2 h-4 w-4" /> Set to Draft</DropdownMenuItem>
                           <DropdownMenuItem onClick={() => handleUpdatePitchStatus(pitch.id!, 'funded', pitch.projectTitle)} className="text-blue-600 focus:text-blue-700">Set to Funded</DropdownMenuItem>
                           <DropdownMenuItem onClick={() => handleUpdatePitchStatus(pitch.id!, 'closed', pitch.projectTitle)} className="text-gray-600 focus:text-gray-700">Set to Closed</DropdownMenuItem>
                           <DropdownMenuSeparator/>
                          {pitch.isDeletedByAdmin ? (
                            <DropdownMenuItem onClick={() => handleRestorePitch(pitch.id!, pitch.projectTitle)} className="text-green-600 focus:text-green-700">
                              <RotateCcw className="mr-2 h-4 w-4" />Restore Pitch
                            </DropdownMenuItem>
                          ) : (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                                  <Trash2 className="mr-2 h-4 w-4" />Soft Delete Pitch
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will mark the funding pitch "{pitch.projectTitle}" as deleted and closed. It will only be visible via the 'Admin Deleted' filter.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleAdminDeletePitch(pitch.id!, pitch.projectTitle)} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                                    Yes, Mark Deleted
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                     <Badge variant="outline" className={getStatusBadgeClasses(pitch.status, pitch.isDeletedByAdmin) + " py-1 px-2 text-xs mt-1 w-fit"}>
                      {pitch.isDeletedByAdmin ? 'Admin Deleted' : pitch.status.replace(/_/g, ' ').split(' ').map(s => s.charAt(0).toUpperCase() + s.substring(1)).join(' ')}
                    </Badge>
                     {pitch.featureStatus === 'active' && !pitch.isDeletedByAdmin && pitch.featureEndsAt && isFuture(pitch.featureEndsAt instanceof Timestamp ? pitch.featureEndsAt.toDate() : new Date(pitch.featureEndsAt as any)) && (
                        <Badge variant="default" className="bg-accent text-accent-foreground ml-1 text-xs">Featured</Badge>
                    )}
                  </CardHeader>
                  <CardContent className="p-4 flex-grow space-y-2 text-sm">
                     {pitch.pitchImageUrl && pitch.pitchImageUrl.startsWith('data:image') ? (
                      <div className="mb-3 rounded-md overflow-hidden border aspect-video relative h-32">
                        <NextImage src={pitch.pitchImageUrl} alt={pitch.projectTitle} layout="fill" objectFit="contain" data-ai-hint="pitch image thumbnail"/>
                      </div>
                    ) : pitch.pitchImageUrl ? ( 
                      <div className="mb-3 p-1.5 text-xs border rounded-md bg-muted text-muted-foreground text-center">
                        <ImageIcon className="inline h-3.5 w-3.5 mr-1" /> Image: {pitch.pitchImageUrl.length > 20 ? pitch.pitchImageUrl.substring(0,17) + '...' : pitch.pitchImageUrl}
                      </div>
                    ) : null}
                    <p><span className="font-semibold">Industry:</span> {pitch.industry}</p>
                    <p><span className="font-semibold">Seeking:</span> PKR {pitch.fundingAmountSought.toLocaleString()}</p>
                    <p><span className="font-semibold">Equity Offered:</span> {pitch.equityOffered}%</p>
                    <p className="text-xs text-muted-foreground pt-1 border-t">
                        Creator: {pitch.creatorName} ({pitch.contactEmail})
                    </p>
                    <div className="flex justify-between text-xs text-muted-foreground pt-2 border-t">
                      <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5"/> {pitch.views || 0}</span>
                      <span className="flex items-center gap-1"><ThumbsUp className="h-3.5 w-3.5 text-green-600"/> {pitch.interestedInvestorsCount || 0}</span>
                      <span className="flex items-center gap-1"><ThumbsDown className="h-3.5 w-3.5 text-red-600"/> {pitch.negativeResponseRate || 0}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-10">
              <Lightbulb className="mx-auto h-16 w-16 text-muted-foreground/50 mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Funding Pitches Found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || statusFilter !== 'all_active' ? "No pitches match your current search or filter." : "There are currently no funding pitches on the platform."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

    