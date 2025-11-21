
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, Search, ExternalLink, User as UserIcon, Building, Landmark, Loader2, ListFilter, DollarSign as DollarSignIcon } from 'lucide-react'; 
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useRouter, usePathname } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import type { InvestmentRangeType, RegisteredUserEntry } from '@/app/auth/components/auth-shared-types';
import { investmentRangeOptions } from '@/app/auth/components/auth-shared-types'; 
import { db, auth } from '@/lib/firebaseConfig';
import { collection, query, where, onSnapshot, orderBy, Timestamp } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { UserProfileDialog } from '@/components/common/user-profile-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; 
import { isFuture } from 'date-fns';

interface PotentialInvestor extends RegisteredUserEntry {
  displayId?: string;
  createdAt: string; 
}

const sortOptionsValues = [
  { value: 'name_asc', label: 'Name (A-Z)' },
  { value: 'name_desc', label: 'Name (Z-A)' },
  { value: 'date_desc', label: 'Date Joined (Newest)' },
  { value: 'date_asc', label: 'Date Joined (Oldest)' },
] as const;
type SortOptionValue = typeof sortOptionsValues[number]['value'];


export default function CorpFindInvestorPage() {
  const { currentUser: authUser, loading: authLoading } = useAuth();
  
  const [allPotentialInvestors, setAllPotentialInvestors] = useState<PotentialInvestor[]>([]);

  const [searchTerm, setSearchTerm] = useState('');
  const [sortOption, setSortOption] = useState<SortOptionValue>('name_asc');
  const [investmentRangeFilter, setInvestmentRangeFilter] = useState<InvestmentRangeType | 'all'>('all');
  
  const [isLoading, setIsLoading] = useState(true); 

  const { toast } = useToast();
  const router = useRouter();

  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
  const [selectedUserIdForDialog, setSelectedUserIdForDialog] = useState<string | null>(null);

  const mapDocToPotentialInvestor = useCallback((docSnap: any): PotentialInvestor | null => {
    const data = docSnap.data() as RegisteredUserEntry;
    if (!data || !data.type || !data.status || !data.email) {
        return null;
    }
    const randomNumber = Math.floor(10000 + Math.random() * 90000);
    let mappedName = data.name;
    if (data.type === 'company' && data.corporationName) {
        mappedName = data.corporationName;
    } else if (!mappedName && data.email) {
        mappedName = data.email.split('@')[0];
    } else if (!mappedName) {
        mappedName = data.type === 'company' ? "Company" : "Investor";
    }
    
    let displayIdentifier = data.type === 'company' ? `CORP-${randomNumber}` : `ANGEL-${randomNumber}`;
    const mappedCreatedAt = (data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt as string | Date)).toISOString();
    const mappedAvatarSeed = data.avatarSeed || (mappedName || 'Default').replace(/[^a-zA-Z0-9]/g, '') || (data.email ? data.email.replace(/[^a-zA-Z0-9]/g, '') : 'DefaultSeed');

    return {
      ...data,
      uid: docSnap.id,
      name: mappedName || 'Unnamed User', 
      displayId: displayIdentifier,
      avatarSeed: mappedAvatarSeed,
      createdAt: mappedCreatedAt,
    } as PotentialInvestor;
  }, []);


  useEffect(() => {
    if (authLoading || !authUser || authUser.type !== 'company' || !db) {
        setIsLoading(false);
        return;
    }

    setIsLoading(true);

    const investorQuery = query(collection(db, "users"),
        where("type", "==", "investor"),
        where("status", "==", "active"),
        where("isHiddenBySeeder", "==", false)
    );

    const companyQuery = query(collection(db, "users"),
        where("type", "==", "company"),
        where("status", "==", "active"),
        where("isDeletedByAdmin", "==", false)
        // No isInstitutionalInvestor filter here, we will filter client-side
    );

    let investorsData: PotentialInvestor[] = [];
    let companiesData: PotentialInvestor[] = [];
    let investorsLoaded = false;
    let companiesLoaded = false;

    const updateCombinedList = () => {
        if(investorsLoaded && companiesLoaded) {
            const institutionalCompanies = companiesData.filter(c => c.isInstitutionalInvestor === true || c.isInstitutionalInvestor === undefined);
            const combined = [...investorsData, ...institutionalCompanies.filter(c => c?.uid !== authUser.uid)];
            setAllPotentialInvestors(combined);
            setIsLoading(false);
        }
    };
    
    const unsubscribeInvestors = onSnapshot(investorQuery, (querySnapshot) => {
      investorsData = querySnapshot.docs.map(mapDocToPotentialInvestor).filter(Boolean) as PotentialInvestor[];
      investorsLoaded = true;
      updateCombinedList();
    }, (error) => {
      console.error("[CorpFindInvestor] Error fetching investors: ", error);
      toast({ title: "Network Error", description: "Could not load investor data.", variant: "destructive"});
      investorsLoaded = true;
      updateCombinedList();
    });

    const unsubscribeCompanies = onSnapshot(companyQuery, (querySnapshot) => {
      companiesData = querySnapshot.docs.map(mapDocToPotentialInvestor).filter(Boolean) as PotentialInvestor[];
      companiesLoaded = true;
      updateCombinedList();
    }, (error) => {
      console.error("[CorpFindInvestor] Error fetching companies: ", error);
      toast({ title: "Network Error", description: "Could not load institutional investor data.", variant: "destructive"});
      companiesLoaded = true;
      updateCombinedList();
    });
    
    return () => { 
      unsubscribeInvestors(); unsubscribeCompanies();
    };
  }, [toast, mapDocToPotentialInvestor, authUser, authLoading]);
  
  const filteredInvestors = useMemo(() => {
    let processedInvestors = [...allPotentialInvestors];
    
    if (searchTerm.trim()) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      processedInvestors = processedInvestors.filter(investor =>
        (investor.name && investor.name.toLowerCase().includes(lowerSearchTerm)) ||
        (investor.email && investor.email.toLowerCase().includes(lowerSearchTerm)) ||
        (investor.displayId && investor.displayId.toLowerCase().includes(lowerSearchTerm)) ||
        (investor.type && investor.type.toLowerCase().includes(lowerSearchTerm)) ||
        (investor.investmentRange && investor.investmentRange.toLowerCase().includes(lowerSearchTerm)) ||
        (investor.investmentFocus && investor.investmentFocus.toLowerCase().includes(lowerSearchTerm))
      );
    }

    if (investmentRangeFilter !== 'all') {
      processedInvestors = processedInvestors.filter(investor =>
        investor.type === 'investor' && investor.investmentRange === investmentRangeFilter
      );
    }

    processedInvestors.sort((a, b) => {
      switch (sortOption) {
        case 'name_asc':
          return (a.name || "").toLowerCase().localeCompare((b.name || "").toLowerCase());
        case 'name_desc':
          return (b.name || "").toLowerCase().localeCompare((a.name || "").toLowerCase());
        case 'date_desc':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'date_asc':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        default:
          return 0;
      }
    });

    return processedInvestors;
  }, [allPotentialInvestors, searchTerm, investmentRangeFilter, sortOption]);

  const handleViewProfile = (investorId: string) => {
    setSelectedUserIdForDialog(investorId);
    setIsProfileDialogOpen(true);
  };

  const getInvestorTypeDisplay = (type: RegisteredUserEntry['type']): { text: string; icon: React.ReactNode, badgeClass: string } => {
    if (type === 'investor') {
      return { text: 'Angel Investor', icon: <Landmark className="h-3.5 w-3.5 mr-1"/>, badgeClass: 'bg-yellow-100 text-yellow-700 border-yellow-200' };
    } else if (type === 'company') {
      return { text: 'Institutional Investor', icon: <Building className="h-3.5 w-3.5 mr-1"/>, badgeClass: 'bg-purple-100 text-purple-700 border-purple-200' };
    }
    return { text: 'Investor', icon: <UserIcon className="h-3.5 w-3.5 mr-1"/>, badgeClass: 'bg-gray-100 text-gray-700 border-gray-200' };
  };

  if (authLoading || isLoading) { 
    return (
      <div className="container mx-auto py-8 px-4 md:px-6 text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto my-4" />
        Loading investors...
      </div>
    );
  }

  if (!authUser || authUser.type !== 'company') {
      return (
          <div className="container mx-auto py-8 px-4 md:px-6 text-center">
             <p>Please log in as a corporation to view this page.</p>
          </div>
      )
  }

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <Button variant="outline" asChild className="mb-4 print:hidden">
        <Link href="/dashboard"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard</Link>
      </Button>

      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight flex items-center">
            <Landmark className="mr-3 h-8 w-8 text-primary" /> Find Angel & Institutional Investors
        </h1>
        <p className="text-muted-foreground">Connect with potential investors for your deals and projects.</p>
      </div>

      <Card className="shadow-lg rounded-xl">
        <CardHeader>
          <CardTitle>Investor Network</CardTitle>
          <CardDescription>
            Browse and connect with Angel and Institutional Investors registered on LISTED.
          </CardDescription>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
            <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                type="search"
                placeholder="Search by name, ID, email, type..."
                className="pl-8 w-full h-10 rounded-md"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <Select value={sortOption} onValueChange={(value) => setSortOption(value as SortOptionValue)}>
                <SelectTrigger className="h-10 rounded-md">
                    <div className="flex items-center gap-2">
                        <ListFilter className="h-4 w-4 text-muted-foreground" />
                        <SelectValue placeholder="Sort by..." />
                    </div>
                </SelectTrigger>
                <SelectContent>
                    {sortOptionsValues.map(option => (
                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Select value={investmentRangeFilter} onValueChange={(value) => setInvestmentRangeFilter(value as InvestmentRangeType | 'all')}>
                <SelectTrigger className="h-10 rounded-md">
                    <div className="flex items-center gap-2">
                        <DollarSignIcon className="h-4 w-4 text-muted-foreground" />
                        <SelectValue placeholder="Filter by Investment Range" />
                    </div>
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Investment Ranges</SelectItem>
                    {investmentRangeOptions.map(range => (
                        <SelectItem key={range} value={range}>{range}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative w-full overflow-auto">
              <Table className="min-w-max">
                <TableHeader>
                  <TableRow>
                    <TableHead className="px-2 min-w-[250px] whitespace-nowrap">Investor Profile</TableHead>
                    <TableHead className="hidden md:table-cell px-2 whitespace-nowrap">ID / Type</TableHead>
                    <TableHead className="hidden sm:table-cell px-2 whitespace-nowrap">Email</TableHead>
                    <TableHead className="text-right px-2 whitespace-nowrap min-w-[140px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvestors.length > 0 ? (
                    filteredInvestors.map((investor) => {
                      const investorTypeInfo = getInvestorTypeDisplay(investor.type);
                      return (
                        <TableRow key={investor.uid}>
                          <TableCell className="px-2 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10 border">
                                <AvatarImage src={investor.avatarDataUri || `https://picsum.photos/seed/${investor.avatarSeed || investor.uid}/40/40`} alt={investor.name} data-ai-hint={investor.type === 'company' ? 'company logo' : 'person investor'}/>
                                <AvatarFallback>{(investor.name || (investor.type === 'company' ? "C" : "I")).substring(0, 1)}</AvatarFallback>
                              </Avatar>
                              <div>
                                <span className="font-medium">{investor.name}</span>
                                <div className="text-xs text-muted-foreground">
                                  <Badge variant="outline" className={`${investorTypeInfo.badgeClass} text-xs flex items-center`}>
                                    {investorTypeInfo.icon}
                                    {investorTypeInfo.text}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell px-2 py-3 text-sm text-muted-foreground whitespace-nowrap">{investor.displayId}</TableCell>
                          <TableCell className="hidden sm:table-cell px-2 py-3 text-sm text-muted-foreground whitespace-nowrap">
                            {investor.email}
                          </TableCell>
                          <TableCell className="text-right px-2 min-w-[140px] whitespace-nowrap">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewProfile(investor.uid)}
                                className="px-2 h-8"
                              >
                                <ExternalLink className="h-4 w-4 md:mr-1" /> <span className="hidden md:inline">View Profile</span>
                              </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                        No investors match your search criteria or none are currently listed.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
        </CardContent>
      </Card>

      {selectedUserIdForDialog && authUser && (
        <UserProfileDialog
          userId={selectedUserIdForDialog}
          isOpen={isProfileDialogOpen}
          onOpenChange={setIsProfileDialogOpen}
          currentLoggedInUser={authUser}
        />
      )}
    </div>
  );
}
