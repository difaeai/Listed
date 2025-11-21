
"use client";

import Link from 'next/link';
import { Edit, Trash2, Eye, Search, Briefcase, ShieldAlert, MoreHorizontal, Filter, User, Package, Loader2, FileText, MessageSquare, Users as UsersIcon, CalendarDays, DollarSign as DollarSignIcon, Percent, Tag, Link as LinkIcon, RotateCcw, Share2, Handshake, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
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
  AlertDialogTrigger, // Added AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogClose,
  DialogContent as OfferViewDialogContent,
  DialogDescription as OfferViewDialogDescription,
  DialogFooter as OfferViewDialogFooter,
  DialogHeader as OfferViewDialogHeader,
  DialogTitle as OfferViewDialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import React, { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebaseConfig';
import { collection, query, where, orderBy, doc, updateDoc, Timestamp, onSnapshot, getDoc, serverTimestamp } from "firebase/firestore";
import NextImage from 'next/image';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import type { PlatformOffer, UserSalesOffer } from '@/types/platform-offer';

type AdminDisplayableOfferStatus = PlatformOffer['status'] | UserSalesOffer['status'] | 'closed'; // 'closed' added for user sales offer logic
type FullAdminViewableOffer = (PlatformOffer | UserSalesOffer) & { source: 'corporation' | 'user_portal' };


interface AdminDisplayableOffer {
  id: string; 
  title: string;
  creatorName: string; 
  creatorId: string;
  source: 'corporation' | 'user_portal';
  status: AdminDisplayableOfferStatus;
  postedDate: string; 
  commissionOrTerms: string; 
  targetAudience?: string;
  isDeletedByAdmin?: boolean; 
}

type OfferStatusFilterOption = 'all_active_combined' | AdminDisplayableOfferStatus | 'admin_deleted';

const allPossibleStatuses: AdminDisplayableOfferStatus[] = ['active', 'paused', 'draft', 'completed', 'expired', 'flagged', 'closed'];
const offerStatusFilterOptions: { value: OfferStatusFilterOption; label: string }[] = [
  { value: 'all_active_combined', label: 'All Active (Combined)' },
  ...allPossibleStatuses.map(status => ({
    value: status,
    label: status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ')
  })),
  { value: 'admin_deleted', label: 'Admin Deleted' },
];


export default function AdminManageOffersPage() {
  const [allOffers, setAllOffers] = useState<AdminDisplayableOffer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'corporation' | 'user_portal'>('all');
  const [offerStatusFilter, setOfferStatusFilter] = useState<OfferStatusFilterOption>('all_active_combined');
  const [isLoading, setIsLoading] = useState(true);
  const { currentUser: adminUser, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [selectedOfferForViewDetails, setSelectedOfferForViewDetails] = useState<FullAdminViewableOffer | null>(null);
  const [isOfferViewDialogOpen, setIsOfferViewDialogOpen] = useState(false);
  const [isFetchingOfferDetails, setIsFetchingOfferDetails] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!adminUser || adminUser.type !== 'admin' || !db) {
      toast({ title: "Unauthorized", description: "Admin access required.", variant: "destructive"});
      router.push("/auth");
      return;
    }
    setIsLoading(true);

    const platformOffersRef = collection(db, "platformOffers");
    const userSalesOffersRef = collection(db, "userSalesOffers");

    let platformOffersData: AdminDisplayableOffer[] = [];
    let userSalesOffersData: AdminDisplayableOffer[] = [];

    const updateCombinedOffers = () => {
        const combined = [...platformOffersData, ...userSalesOffersData];
        combined.sort((a, b) => new Date(b.postedDate).getTime() - new Date(a.postedDate).getTime());
        setAllOffers(combined);
        setIsLoading(false);
    };


    const unsubPlatform = onSnapshot(query(platformOffersRef, orderBy("postedDate", "desc")), (snapshot) => {
      platformOffersData = snapshot.docs.map(docSnap => { 
        const data = docSnap.data() as PlatformOffer;
        return {
          id: docSnap.id,
          title: data.title,
          creatorName: data.corporationName,
          creatorId: data.corporationId,
          source: 'corporation' as 'corporation',
          status: data.status, 
          postedDate: data.postedDate,
          commissionOrTerms: `${data.commissionRate} (${data.commissionType.replace('_', ' ')})`,
          targetAudience: data.targetAudience,
          isDeletedByAdmin: data.isDeletedByAdmin || false,
        };
      });
      updateCombinedOffers();
    });

    const unsubUserSales = onSnapshot(query(userSalesOffersRef, orderBy("postedDate", "desc")), (snapshot) => {
      userSalesOffersData = snapshot.docs.map(docSnap => { 
        const data = docSnap.data() as UserSalesOffer;
        return {
          id: docSnap.id,
          title: data.title,
          creatorName: data.creatorName,
          creatorId: data.creatorId,
          source: 'user_portal' as 'user_portal',
          status: data.status,
          postedDate: data.postedDate,
          commissionOrTerms: `${data.commissionRateInput || 'N/A'} (${data.commissionType ? data.commissionType.replace('_', ' ') : 'Custom'})`,
          targetAudience: data.targetAudience,
          isDeletedByAdmin: data.isDeletedByAdmin || false,
        };
      });
      updateCombinedOffers();
    });

    return () => {
      unsubPlatform();
      unsubUserSales();
    };
  }, [adminUser, authLoading, router, toast]);

  const filteredOffers = useMemo(() => {
    let offersToFilter = allOffers;

    if (sourceFilter !== 'all') {
      offersToFilter = offersToFilter.filter(offer => offer.source === sourceFilter);
    }
    
    if (offerStatusFilter === 'admin_deleted') {
      offersToFilter = offersToFilter.filter(offer => offer.isDeletedByAdmin === true);
    } else if (offerStatusFilter === 'all_active_combined') {
      offersToFilter = offersToFilter.filter(offer =>
        !offer.isDeletedByAdmin &&
        (
          (offer.source === 'corporation' && ['active', 'draft', 'paused'].includes(offer.status)) ||
          (offer.source === 'user_portal' && ['active', 'draft'].includes(offer.status))
        )
      );
    } else {
       offersToFilter = offersToFilter.filter(offer =>
        !offer.isDeletedByAdmin && offer.status === offerStatusFilter
      );
    }

    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      offersToFilter = offersToFilter.filter(offer =>
        offer.title.toLowerCase().includes(lowerSearchTerm) ||
        offer.creatorName.toLowerCase().includes(lowerSearchTerm) ||
        (offer.targetAudience && offer.targetAudience.toLowerCase().includes(lowerSearchTerm))
      );
    }
    return offersToFilter;
  }, [allOffers, searchTerm, sourceFilter, offerStatusFilter]);

  const handleViewOfferDialog = async (offerId: string, offerSource: 'corporation' | 'user_portal') => {
    if (!db) return;
    setIsFetchingOfferDetails(true);
    setIsOfferViewDialogOpen(true);
    setSelectedOfferForViewDetails(null); 
    const collectionName = offerSource === 'corporation' ? "platformOffers" : "userSalesOffers";
    const offerDocRef = doc(db, collectionName, offerId);
    try {
      const docSnap = await getDoc(offerDocRef);
      if (docSnap.exists()) {
        setSelectedOfferForViewDetails({ id: docSnap.id, source: offerSource, ...docSnap.data() } as FullAdminViewableOffer);
      } else {
        toast({ title: "Error", description: "Offer details not found.", variant: "destructive" });
        setIsOfferViewDialogOpen(false);
      }
    } catch (error) {
      console.error("Error fetching offer details:", error);
      toast({ title: "Error", description: "Could not load offer details.", variant: "destructive" });
      setIsOfferViewDialogOpen(false);
    } finally {
      setIsFetchingOfferDetails(false);
    }
  };

  const handleUpdateOfferStatus = async (offerId: string, offerSource: 'corporation' | 'user_portal', newStatus: AdminDisplayableOfferStatus, offerTitle: string) => {
    if (!db) return;
    const collectionName = offerSource === 'corporation' ? "platformOffers" : "userSalesOffers";
    const offerDocRef = doc(db, collectionName, offerId);
    try {
      await updateDoc(offerDocRef, { status: newStatus, updatedAt: serverTimestamp() });
      toast({ title: "Offer Status Updated", description: `Offer "${offerTitle}" status changed to ${newStatus}.`});
    } catch (error) {
      console.error("Error updating offer status:", error);
      toast({ title: "Error", description: "Could not update offer status.", variant: "destructive"});
    }
  };

  const handleToggleDeleteOffer = async (offerId: string, offerSource: 'corporation' | 'user_portal', offerTitle: string, currentDeleteStatus?: boolean) => {
    if (!db) return;
    const collectionName = offerSource === 'corporation' ? "platformOffers" : "userSalesOffers";
    const offerDocRef = doc(db, collectionName, offerId);
    const newDeleteStatus = !currentDeleteStatus;
    const newOfferStatus: AdminDisplayableOfferStatus = newDeleteStatus ? 'closed' : 'active'; 

    try {
      await updateDoc(offerDocRef, { 
        isDeletedByAdmin: newDeleteStatus, 
        status: newOfferStatus, 
        updatedAt: serverTimestamp() 
      }); 
      toast({ 
        title: `Offer ${newDeleteStatus ? 'Marked as Deleted' : 'Restored'}`, 
        description: `Offer "${offerTitle}" has been ${newDeleteStatus ? 'marked as deleted and closed' : 'restored to active'}.`
      });
    } catch (error) {
      console.error(`Error ${newDeleteStatus ? 'soft-deleting' : 'restoring'} offer:`, error);
      toast({ title: "Error", description: `Could not ${newDeleteStatus ? 'delete' : 'restore'} offer.`, variant: "destructive"});
    }
  };

  const getStatusBadgeClasses = (status: AdminDisplayableOfferStatus, isDeleted?: boolean): string => {
    if (isDeleted) return 'bg-gray-500 text-white border-gray-500';
    switch(status) {
      case 'active': return 'bg-accent text-accent-foreground border-accent';
      case 'paused': return 'border-yellow-500 text-yellow-600 bg-yellow-100';
      case 'completed': return 'bg-blue-500 text-white border-blue-500';
      case 'draft': return 'border-gray-400 text-gray-500 bg-gray-100';
      case 'expired': return 'bg-destructive text-destructive-foreground border-destructive'; 
      case 'flagged': return 'bg-orange-500 text-white border-orange-600';
      case 'closed': return 'bg-destructive/80 text-destructive-foreground border-destructive/80';
      default: return 'border-gray-300 text-gray-600';
    }
  }

  const getCategoryIcon = (offer?: FullAdminViewableOffer) => {
    if (!offer) return <Tag className="h-4 w-4 text-muted-foreground inline mr-1.5" />;
    const iconProps = { className: "h-4 w-4 text-muted-foreground inline mr-1.5" };
    const category = offer.offerCategory;
    
    if (offer.source === 'corporation') {
        switch(category as PlatformOffer['offerCategory']) {
            case "Product": return <Package {...iconProps} />;
            case "Service": return <Briefcase {...iconProps} />;
            case "Subscription": return <Zap {...iconProps} />;
            case "Digital Product": return <FileText {...iconProps} />;
            case "Event": return <CalendarDays {...iconProps} />;
            default: return <Tag {...iconProps} />;
        }
    } else { 
         switch(category as UserSalesOffer['offerCategory']) {
            case "Collaboration": return <UsersIcon {...iconProps} />;
            case "Lead Sharing": return <Share2 {...iconProps} />;
            case "Joint Venture": return <Handshake {...iconProps} />;
            case "Referral Program": return <DollarSignIcon {...iconProps} />;
            default: return <Tag {...iconProps} />;
        }
    }
  };

  if (authLoading || isLoading) {
    return <div className="container mx-auto py-8 px-4 md:px-6 text-center">Loading offers management...</div>;
  }
   if (!adminUser || adminUser.type !== 'admin') {
    return <div className="container mx-auto py-8 px-4 md:px-6 text-center">Admin access required.</div>;
  }

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center"><Briefcase className="mr-3 h-8 w-8 text-primary"/>Manage All Platform Offers</h1>
          <p className="text-muted-foreground">Oversee, edit, or remove any offer on the platform.</p>
        </div>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>All Offers ({filteredOffers.length} matching)</CardTitle>
          <CardDescription>A comprehensive list of all offers from Corporations and User Portals. Use filters to narrow down the list.</CardDescription>
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
            <div className="relative lg:col-span-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                type="search"
                placeholder="Search by title, creator, target..."
                className="pl-8 w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <Select value={sourceFilter} onValueChange={(value) => setSourceFilter(value as typeof sourceFilter)}>
              <SelectTrigger className="w-full">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <SelectValue placeholder="Filter by source" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="corporation">Corporation Offers</SelectItem>
                <SelectItem value="user_portal">User Portal Offers</SelectItem>
              </SelectContent>
            </Select>
            <Select value={offerStatusFilter} onValueChange={(value) => setOfferStatusFilter(value as OfferStatusFilterOption)}>
              <SelectTrigger className="w-full">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <SelectValue placeholder="Filter by status" />
                </div>
              </SelectTrigger>
              <SelectContent>
                {offerStatusFilterOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Creator / Company</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">Commission / Terms</TableHead>
                <TableHead className="hidden lg:table-cell">Posted On</TableHead>
                <TableHead className="text-right">Admin Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOffers.length > 0 ? (
                filteredOffers.map((offer) => (
                  <TableRow key={offer.id} className={offer.isDeletedByAdmin ? 'opacity-50' : ''}>
                    <TableCell>
                      <div className="font-medium">{offer.title} {offer.isDeletedByAdmin && <span className="text-xs text-red-500">(Deleted)</span>}</div>
                      <div className="text-xs text-muted-foreground">Target: {offer.targetAudience || "N/A"}</div>
                    </TableCell>
                    <TableCell>
                        {offer.creatorName || "N/A"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={offer.source === 'corporation' ? 'secondary' : 'outline'} className="text-xs">
                        {offer.source === 'corporation' ? 
                          <Briefcase className="mr-1 h-3 w-3"/> : 
                          <User className="mr-1 h-3 w-3"/> }
                        {offer.source === 'corporation' ? 'Corporation' : 'User Portal'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={getStatusBadgeClasses(offer.status, offer.isDeletedByAdmin) + " py-1 px-2 text-xs"}
                      >
                        {offer.isDeletedByAdmin ? 'Admin Deleted' : offer.status.charAt(0).toUpperCase() + offer.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-xs">{offer.commissionOrTerms}</TableCell>
                    <TableCell className="hidden lg:table-cell">{format(new Date(offer.postedDate), "dd MMM, yyyy")}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                           <DropdownMenuItem onClick={() => handleViewOfferDialog(offer.id, offer.source)}>
                            <Eye className="mr-2 h-4 w-4" />View Full Offer
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={offer.source === 'corporation' ? `/offers/${offer.id}` : `/offers/peer-sales-offer/${offer.id}`} target="_blank">
                              <Eye className="mr-2 h-4 w-4" /> View Publicly
                            </Link>
                          </DropdownMenuItem>
                           <DropdownMenuItem onClick={() => {
                               if (offer.source === 'corporation') {
                                   router.push(`/dashboard/ads/${offer.id}/edit`); 
                               } else if (offer.source === 'user_portal') {
                                   router.push(`/offers/my-sales/edit/${offer.id}`); 
                               }
                               toast({ title: "Edit Action", description: "Redirecting to creator's edit page. Admin-specific editing interface is not available."})
                           }}> 
                              <Edit className="mr-2 h-4 w-4" /> Edit Offer (as Creator)
                          </DropdownMenuItem>
                          <DropdownMenuSeparator/>
                           {allPossibleStatuses.filter(s => s !== offer.status && !(offer.isDeletedByAdmin && s !== 'closed')).map(newStatus => (
                            <DropdownMenuItem 
                              key={newStatus} 
                              onClick={() => handleUpdateOfferStatus(offer.id, offer.source, newStatus, offer.title)}
                              className="capitalize"
                            >
                              Set to {newStatus.replace('_', ' ')}
                            </DropdownMenuItem>
                          ))}
                          <DropdownMenuSeparator />
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem onSelect={(e) => e.preventDefault()} className={offer.isDeletedByAdmin ? "text-green-600 focus:text-green-700" : "text-destructive focus:text-destructive focus:bg-destructive/10"}>
                                  {offer.isDeletedByAdmin ? <RotateCcw className="mr-2 h-4 w-4" /> : <Trash2 className="mr-2 h-4 w-4" />}
                                  <span>{offer.isDeletedByAdmin ? 'Restore Offer' : 'Soft Delete Offer'}</span>
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>{offer.isDeletedByAdmin ? 'Restore this offer?' : 'Are you sure?'}</AlertDialogTitle>
                                <AlertDialogDescription>
                                  {offer.isDeletedByAdmin 
                                    ? `This will restore the offer "${offer.title}" and set its status to 'active'. It will become visible to users again.`
                                    : `This action will mark "${offer.title}" as deleted and set its status to closed. It will only be visible via the 'Admin Deleted' filter.`}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleToggleDeleteOffer(offer.id, offer.source, offer.title, offer.isDeletedByAdmin)}
                                  className={offer.isDeletedByAdmin ? "bg-green-600 hover:bg-green-700 text-white" : "bg-destructive text-destructive-foreground hover:bg-destructive/90"}
                                >
                                  {offer.isDeletedByAdmin ? 'Confirm Restore' : 'Confirm Soft Delete'}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    No offers found matching your criteria.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isOfferViewDialogOpen} onOpenChange={setIsOfferViewDialogOpen}>
        <OfferViewDialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
          <OfferViewDialogHeader>
            <OfferViewDialogTitle>
              {selectedOfferForViewDetails?.title || "Offer Details"}
            </OfferViewDialogTitle>
            {selectedOfferForViewDetails && (
              <OfferViewDialogDescription>
                Details for offer by {selectedOfferForViewDetails.source === 'corporation' ? (selectedOfferForViewDetails as PlatformOffer).corporationName : (selectedOfferForViewDetails as UserSalesOffer).creatorName}.
                 {selectedOfferForViewDetails.isDeletedByAdmin && <span className="text-red-500 font-semibold ml-2">(Admin Deleted)</span>}
              </OfferViewDialogDescription>
            )}
          </OfferViewDialogHeader>
          <ScrollArea className="flex-grow overflow-y-auto pr-2">
            <div className="py-4 space-y-6">
              {isFetchingOfferDetails ? (
                <div className="flex justify-center items-center h-40">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="ml-2">Loading offer details...</p>
                </div>
              ) : selectedOfferForViewDetails ? (
                <>
                  {selectedOfferForViewDetails.mediaUrl && (
                    <div className="mb-4">
                      <NextImage src={selectedOfferForViewDetails.mediaUrl} alt={selectedOfferForViewDetails.title} width={600} height={350} className="rounded-md object-contain mx-auto border" data-ai-hint="offer image large"/>
                    </div>
                  )}
                  <InfoSection label="Offer Title" value={selectedOfferForViewDetails.title} />
                  <InfoSection label="Description" value={selectedOfferForViewDetails.description} isPreformatted />
                  <Separator />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InfoSection label="Category" value={selectedOfferForViewDetails.offerCategory} icon={getCategoryIcon(selectedOfferForViewDetails)} />
                    <InfoSection label="Target Audience" value={selectedOfferForViewDetails.targetAudience || "N/A"} icon={<UsersIcon />} />
                    <InfoSection label="Status" value={<Badge variant="outline" className={getStatusBadgeClasses(selectedOfferForViewDetails.status, selectedOfferForViewDetails.isDeletedByAdmin) + " py-1 px-1.5"}>{selectedOfferForViewDetails.isDeletedByAdmin ? 'Admin Deleted' : selectedOfferForViewDetails.status}</Badge>} />
                    <InfoSection label="Posted Date" value={format(new Date(selectedOfferForViewDetails.postedDate), "PPP")} icon={<CalendarDays />} />
                  </div>
                  <Separator />
                  <h4 className="font-semibold text-md">Commission & Terms</h4>
                  {selectedOfferForViewDetails.source === 'corporation' && (
                    <>
                      <InfoSection label="Commission Rate" value={(selectedOfferForViewDetails as PlatformOffer).commissionRate} icon={<DollarSignIcon />} />
                      <InfoSection label="Commission Type" value={(selectedOfferForViewDetails as PlatformOffer).commissionType.replace('_', ' ')} icon={<Percent />} />
                       {(selectedOfferForViewDetails as PlatformOffer).price && <InfoSection label="Offer Price/Value" value={`PKR ${(selectedOfferForViewDetails as PlatformOffer).price?.toLocaleString()}`} icon={<Tag />} />}
                      <InfoSection label="Value Details" value={(selectedOfferForViewDetails as PlatformOffer).offerValueDetails} />
                    </>
                  )}
                  {selectedOfferForViewDetails.source === 'user_portal' && (
                    <>
                      <InfoSection label="Commission/Exchange Type" value={(selectedOfferForViewDetails as UserSalesOffer).commissionType?.replace('_', ' ') || "N/A"} icon={<Percent />} />
                      <InfoSection label="Commission/Exchange Details" value={(selectedOfferForViewDetails as UserSalesOffer).commissionRateInput || "N/A"} />
                      <InfoSection label="General Terms" value={(selectedOfferForViewDetails as UserSalesOffer).terms} isPreformatted />
                    </>
                  )}
                  <Separator />
                  <h4 className="font-semibold text-md">Contact Information</h4>
                   <InfoSection label="Contact Person" value={(selectedOfferForViewDetails as PlatformOffer).contactPerson || (selectedOfferForViewDetails as UserSalesOffer).creatorName} icon={<User />} />
                  <InfoSection label="Contact Number" value={(selectedOfferForViewDetails as PlatformOffer).contactNumber || (selectedOfferForViewDetails as UserSalesOffer).contactNumber} icon={<MessageSquare />} />
                  {(selectedOfferForViewDetails as PlatformOffer).offerLink && (
                    <InfoSection label="Offer Link" value={<Link href={(selectedOfferForViewDetails as PlatformOffer).offerLink!} target="_blank" className="text-primary hover:underline break-all">Visit Link</Link>} icon={<LinkIcon />} />
                  )}
                   <InfoSection label="Creator ID" value={selectedOfferForViewDetails.source === 'corporation' ? (selectedOfferForViewDetails as PlatformOffer).corporationId : (selectedOfferForViewDetails as UserSalesOffer).creatorId} />
                  <Separator />
                  <div><h4 className="font-semibold text-sm">Timestamps:</h4>
                    <p className="text-xs text-muted-foreground">Created: {selectedOfferForViewDetails.createdAt instanceof Timestamp ? format(selectedOfferForViewDetails.createdAt.toDate(), "dd MMM, yyyy HH:mm") : "N/A"}</p>
                    {selectedOfferForViewDetails.updatedAt instanceof Timestamp && (<p className="text-xs text-muted-foreground">Last Updated: {format(selectedOfferForViewDetails.updatedAt.toDate(), "dd MMM, yyyy HH:mm")}</p>)}
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground text-center">No offer selected or details could not be loaded.</p>
              )}
            </div>
          </ScrollArea>
          <OfferViewDialogFooter className="mt-2 pt-4 border-t">
            <DialogClose asChild>
              <Button variant="outline">Close</Button>
            </DialogClose>
          </OfferViewDialogFooter>
        </OfferViewDialogContent>
      </Dialog>

    </div>
  );
}

const InfoSection: React.FC<{label: string; value?: string | React.ReactNode; icon?: React.ReactNode, isPreformatted?: boolean}> = ({ label, value, icon, isPreformatted }) => {
  if (value === undefined || value === null || (typeof value === 'string' && value.trim() === "")) return null;
  return (
    <div>
      <h5 className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
        {icon}
        {label}
      </h5>
      {isPreformatted ? (
          <pre className="text-sm text-foreground whitespace-pre-wrap font-sans bg-muted/30 p-2 rounded-md">{value}</pre>
      ) : (
          <p className="text-sm text-foreground">{value}</p>
      )}
    </div>
  );
};

