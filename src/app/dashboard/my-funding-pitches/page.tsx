
"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PlusCircle, Search, Lightbulb, Edit, Trash2, Eye, MoreHorizontal, Users as UsersIcon, CalendarDays, MessageSquare, Star, Info, FileText, AlertTriangle, XCircle, RotateCcw, ImageIcon } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { format, isFuture } from 'date-fns';
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebaseConfig';
import { collection, query, where, orderBy, onSnapshot, doc, deleteDoc, Timestamp, getDocs, writeBatch, updateDoc, serverTimestamp, deleteField } from "firebase/firestore";
import NextImage from 'next/image';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Alert, AlertTitle as ShadAlertTitle, AlertDescription as ShadAlertDescription } from "@/components/ui/alert";
import type { FundingPitch, IndustryType } from '@/app/offers/my-ads/page';

export default function MyCorporationFundingPitchesPage() {
  const [allUserPitches, setAllUserPitches] = useState<FundingPitch[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const { currentUser: authUser, loading: authLoading } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (authLoading || !authUser || authUser.type !== 'company' || !db) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const pitchesRef = collection(db, "fundingPitches");
    const q = query(
      pitchesRef,
      where("creatorId", "==", authUser.uid),
      where("isDeletedByAdmin", "==", false),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetchedPitches: FundingPitch[] = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        fetchedPitches.push({ id: docSnap.id, ...data } as FundingPitch);
      });
      setAllUserPitches(fetchedPitches);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching funding pitches: ", error);
      toast({ title: "Error", description: "Could not fetch your funding pitches.", variant: "destructive" });
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [authUser, authLoading, toast]);

  const filteredPitches = useMemo(() => {
    return allUserPitches.filter(p =>
      p.projectTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.industry && p.industry.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [allUserPitches, searchTerm]);

  const handleDeletePitch = async (pitchId: string, pitchTitle: string) => {
    if (!db || !pitchId) return;
    try {
      await deleteDoc(doc(db, "fundingPitches", pitchId));
      toast({ title: "Pitch Deleted", description: `The funding pitch "${pitchTitle}" has been successfully deleted.` });
    } catch (error) {
      console.error("Error deleting pitch: ", error);
      toast({ title: "Deletion Failed", description: "Could not delete the pitch.", variant: "destructive" });
    }
  };

  const getStatusBadgeClasses = (status: FundingPitch["status"]): string => {
    switch (status) {
      case 'seeking_funding': return 'bg-blue-500 text-white border-blue-500';
      case 'funded': return 'bg-accent text-accent-foreground border-accent';
      case 'closed': return 'bg-destructive/80 text-destructive-foreground border-destructive/80';
      case 'draft': return 'border-yellow-500 text-yellow-600 bg-yellow-500/10';
      default: return 'border-gray-300 text-gray-600';
    }
  };

  if (authLoading || isLoading) {
    return <div className="container mx-auto py-8 px-4 md:px-6 text-center">Loading your funding pitches...</div>;
  }
  
  if (!authUser || authUser.type !== 'company') {
    return <div className="container mx-auto py-8 px-4 md:px-6 text-center">Access denied. Please log in as a Corporation.</div>;
  }

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center">
            <Lightbulb className="mr-3 h-8 w-8 text-primary" /> My Business Pitches
          </h1>
          <p className="text-muted-foreground">Manage your corporation's investment proposals.</p>
        </div>
        <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground">
          <Link href="/dashboard/my-funding-pitches/create">
            <PlusCircle className="mr-2 h-4 w-4" /> Create New Pitch
          </Link>
        </Button>
      </div>
      <Card className="shadow-lg rounded-xl">
        <CardHeader>
          <CardTitle>Your Pitches ({filteredPitches.length})</CardTitle>
           <div className="relative mt-2">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search your pitches by title or industry..."
              className="pl-8 w-full md:w-1/2 lg:w-1/3"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          {filteredPitches.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredPitches.map((pitch) => (
                 <Card key={pitch.id} className="flex flex-col shadow-md hover:shadow-lg transition-shadow duration-300 rounded-xl overflow-hidden">
                   <CardHeader className="p-4">
                     <div className="flex justify-between items-start">
                       <CardTitle className="text-lg leading-tight line-clamp-2 hover:text-primary">
                         <Link href={`/dashboard/my-funding-pitches/view/${pitch.id}`}>{pitch.projectTitle}</Link>
                       </CardTitle>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/dashboard/my-funding-pitches/view/${pitch.id}`}><Eye className="mr-2 h-4 w-4" />View & Engagement</Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/dashboard/my-funding-pitches/edit/${pitch.id}`}><Edit className="mr-2 h-4 w-4" />Edit Pitch</Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                                  <Trash2 className="mr-2 h-4 w-4" />Delete Pitch
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader><AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle><AlertDialogDescription>This action will permanently delete this funding pitch.</AlertDialogDescription></AlertDialogHeader>
                                <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDeletePitch(pitch.id!, pitch.projectTitle)} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">Delete</AlertDialogAction></AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </DropdownMenuContent>
                        </DropdownMenu>
                     </div>
                      <Badge variant="outline" className={`${getStatusBadgeClasses(pitch.status)} py-1 px-2 text-xs mt-1 w-fit`}>
                        {pitch.status.replace('_', ' ').split(' ').map(s => s.charAt(0).toUpperCase() + s.substring(1)).join(' ')}
                      </Badge>
                   </CardHeader>
                   <CardContent className="p-4 pt-0 flex-grow space-y-2 text-sm">
                      <p className="text-muted-foreground line-clamp-3 text-xs">{pitch.projectSummary}</p>
                   </CardContent>
                   <CardFooter className="p-4 border-t bg-muted/20">
                    <div className="flex justify-between w-full text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5"/> {pitch.views || 0} views</span>
                        <span className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5"/>
                           {pitch.createdAt instanceof Timestamp ? format(pitch.createdAt.toDate(), "dd MMM, yyyy") : (pitch.postedDate ? format(new Date(pitch.postedDate), "dd MMM, yyyy") : "N/A")}
                        </span>
                    </div>
                  </CardFooter>
                 </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-10">
              <Lightbulb className="mx-auto h-16 w-16 text-muted-foreground/50 mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Funding Pitches Yet</h3>
              <p className="text-muted-foreground mb-4">Create your first funding pitch to attract investors.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
