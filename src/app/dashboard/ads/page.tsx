
"use client";
import Link from 'next/link';
import { PlusCircle, Edit, Trash2, Eye, Search, Users as UsersIconStd, MoreHorizontal, Briefcase as BriefcaseIcon, DollarSign, Percent } from "lucide-react";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
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
import React, { useState, useEffect, useMemo } from 'react'; 
import { format } from 'date-fns';
import { offerTypeIcons, CalendarDays } from '@/components/common/icons';
import type { PlatformOffer } from '@/types/platform-offer'; 
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebaseConfig';
import { collection, query, where, orderBy, deleteDoc, doc, onSnapshot, Timestamp } from "firebase/firestore";
import NextImage from 'next/image';

export default function ManageOffersPage() {
  const [offers, setOffers] = useState<PlatformOffer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const { currentUser: authUser, loading: authLoading } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (authLoading) {
      setIsLoading(true);
      return;
    }
    if (!authUser || authUser.type !== 'company' || !authUser.uid || !db) {
      setIsLoading(false);
      console.warn("[ManageOffersPage] User not authorized or DB not ready.");
      return;
    }

    setIsLoading(true);
    const offersRef = collection(db, "platformOffers");
    const q = query(offersRef, 
                    where("corporationId", "==", authUser.uid), 
                    orderBy("postedDate", "desc")); 

    const unsubscribeSnapshot = onSnapshot(q, (querySnapshot) => {
      const fetchedOffers: PlatformOffer[] = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data() as Omit<PlatformOffer, 'id' | 'createdAt' | 'updatedAt'> & { createdAt?: Timestamp, updatedAt?: Timestamp};
        if (data.isDeletedByAdmin !== true) {
            fetchedOffers.push({ 
                id: docSnap.id, 
                ...data,
                postedDate: typeof data.postedDate === 'string' ? data.postedDate : (data.postedDate as any)?.toDate?.().toISOString() || new Date().toISOString(),
                createdAt: data.createdAt,
                updatedAt: data.updatedAt
            } as PlatformOffer);
        }
      });
      setOffers(fetchedOffers);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching offers from Firestore: ", error);
      toast({ 
        title: "Failed to Fetch Offers", 
        description: "Could not load your offers. Please try again in a few seconds.", 
        variant: "destructive"
      });
      setIsLoading(false);
    });

    return () => unsubscribeSnapshot();
  }, [authUser, authLoading, toast]);


  const filteredOffers = useMemo(() => {
    return offers.filter(offer => 
      (offer.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (offer.offerCategory && offer.offerCategory.toLowerCase().includes(searchTerm.toLowerCase())) || 
      (offer.targetAudience && offer.targetAudience.toLowerCase().includes(searchTerm.toLowerCase()))) 
    );
  }, [offers, searchTerm]);

  const handleDeleteOffer = async (offerId: string, offerTitle: string) => {
    if (!db || !offerId) return;
    try {
      await deleteDoc(doc(db, "platformOffers", offerId));
      toast({
        title: "Offer Deleted",
        description: `Offer "${offerTitle}" has been successfully deleted from LISTED.`,
      });
    } catch (error) {
      console.error("Error deleting offer from Firestore: ", error);
      toast({ 
        title: "Deletion Failed", 
        description: "Could not delete the offer. Please try again in a few seconds.", 
        variant: "destructive"
      });
    }
  };
  
  const getOfferCategoryIcon = (category?: PlatformOffer["offerCategory"]) => {
    if (!category) return offerTypeIcons.Default;
    switch(category) {
        case "Product": return offerTypeIcons.Product;
        case "Service": return offerTypeIcons.Service;
        case "Subscription": return offerTypeIcons.Subscription;
        case "Digital Product": return offerTypeIcons.Digital;
        case "Event": return <CalendarDays className="h-3.5 w-3.5" />;
        default: return offerTypeIcons.Default;
    }
  };

  const getStatusBadgeClasses = (status?: PlatformOffer["status"]): string => {
    if (!status) return 'border-gray-300 text-gray-600';
    switch(status) {
      case 'active': return 'bg-accent text-accent-foreground border-accent'; 
      case 'paused': return 'border-yellow-500 text-yellow-600 bg-yellow-100';
      case 'completed': return 'bg-blue-500 text-white border-blue-500';
      case 'draft': return 'border-gray-400 text-gray-500 bg-gray-100';
      case 'expired': return 'bg-destructive text-destructive-foreground border-destructive';
      case 'flagged': return 'bg-orange-500 text-white border-orange-600';
      default: return 'border-gray-300 text-gray-600';
    }
  }

  if (isLoading || authLoading) {
    return <div className="container mx-auto py-8 px-4 md:px-6 text-center">Loading your offers...</div>;
  }
  if (!authUser || authUser.type !== 'company') {
    return <div className="container mx-auto py-8 px-4 md:px-6 text-center">Access denied. Please log in as a Corporation.</div>;
  }

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Manage Offers</h1>
          <p className="text-muted-foreground">Oversee your business's offers and their status.</p>
        </div>
        <Button asChild className="bg-accent hover:bg-accent/90 text-accent-foreground">
          <Link href="/dashboard/ads/create"> 
            <PlusCircle className="mr-2 h-4 w-4" /> Create New Offer
          </Link>
        </Button>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Your Offers ({filteredOffers.length})</CardTitle>
          <CardDescription>A comprehensive list of all offers your business has created for the sales network.</CardDescription>
           <div className="relative mt-4">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by title, category, or target audience..."
              className="pl-8 w-full md:w-1/3"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          {filteredOffers.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredOffers.map((offer) => (
                <Card key={offer.id} className="flex flex-col shadow-md hover:shadow-lg transition-shadow duration-300 rounded-xl overflow-hidden">
                  {offer.mediaUrl && offer.mediaUrl.startsWith('data:image') ? (
                    <div className="relative h-40 w-full">
                      <NextImage src={offer.mediaUrl} alt={offer.title} layout="fill" objectFit="cover" className="rounded-t-md" data-ai-hint="offer image medium"/>
                    </div>
                  ) : null}
                  <CardHeader className="p-4">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg leading-tight line-clamp-2 hover:text-primary">
                        <Link href={`/dashboard/ads/view/${offer.id}`}>{offer.title}</Link>
                      </CardTitle>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                           <DropdownMenuItem asChild>
                            <Link href={`/offers/${offer.id}`} target="_blank"> 
                              <Eye className="mr-2 h-4 w-4" /> View Publicly
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/dashboard/ads/view/${offer.id}`}>
                              <BriefcaseIcon className="mr-2 h-4 w-4" /> View My Offer Details
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                             <Link href={`/dashboard/ads/${offer.id}/edit`}>
                              <Edit className="mr-2 h-4 w-4" /> Edit Offer
                            </Link>
                          </DropdownMenuItem>
                           <DropdownMenuSeparator />
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                                <Trash2 className="mr-2 h-4 w-4" /> Delete Offer
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete the offer "{offer.title}". This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => handleDeleteOffer(offer.id!, offer.title)}
                                  className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <Badge variant="outline" className={getStatusBadgeClasses(offer.status) + " py-1 px-2 text-xs mt-1 w-fit"}>
                      {offer.status ? (offer.status.charAt(0).toUpperCase() + offer.status.slice(1)) : 'N/A'}
                    </Badge>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 flex-grow space-y-2 text-sm">
                    <p className="flex items-center gap-1.5"><UsersIconStd className="h-4 w-4 text-muted-foreground" />Target: {offer.targetAudience}</p>
                    <p className="flex items-center gap-1.5 text-green-600 font-semibold"><DollarSign className="h-4 w-4"/>{offer.commissionRate}</p>
                  </CardContent>
                  <CardFooter className="p-4 border-t bg-muted/20">
                    <div className="flex justify-between w-full text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5"/> {offer.views?.toLocaleString() || 0} views</span>
                        <span className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5"/>{format(new Date(offer.postedDate), "dd MMM, yyyy")}</span>
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-10">
              <BriefcaseIcon className="mx-auto h-16 w-16 text-muted-foreground/50 mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Offers Posted Yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first sales offer to build your on-demand sales network.
              </p>
              <Button asChild>
                <Link href="/dashboard/ads/create">
                  <PlusCircle className="mr-2 h-4 w-4" /> Create Your First Offer
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
