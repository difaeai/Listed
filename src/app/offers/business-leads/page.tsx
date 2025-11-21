
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { BarChart3, Search, User, MapPin, DollarSign, ArrowLeft, Info, Phone, Star } from 'lucide-react'; 
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import type { Lead } from '@/app/admin/manage-leads/page';
import { db } from '@/lib/firebaseConfig';
import { collection, query, where, onSnapshot, orderBy, Timestamp } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { isFuture } from 'date-fns';

export default function UserBusinessLeadsPage() {
  const [allLeads, setAllLeads] = useState<Lead[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const { currentUser: authUser, loading: authLoading } = useAuth();
  const { toast } = useToast(); 

  const hasAnnualSubscription = useMemo(() => {
    if (!authUser || authUser.type !== 'professional' || authUser.status !== 'active') return false;
    if (authUser.subscriptionType !== 'yearly') return false;
    if (!authUser.subscriptionExpiryDate) return false;
    const expiryDate = authUser.subscriptionExpiryDate instanceof Timestamp 
      ? authUser.subscriptionExpiryDate.toDate() 
      : new Date(authUser.subscriptionExpiryDate as string | Date);
    return isFuture(expiryDate);
  }, [authUser]);

  const isDemoUser = authUser?.email === 'demo@gmail.com';

  useEffect(() => {
    if (authLoading) {
        setIsLoading(true);
        return;
    }
    if (!authUser || authUser.type !== 'professional' || !db || !hasAnnualSubscription) {
        setIsLoading(false);
        return;
    }
    setIsLoading(true);
    const leadsRef = collection(db, "leads");
    const q = query(leadsRef, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetchedLeads: Lead[] = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data() as Omit<Lead, 'id'> & { createdAt: Timestamp };
        if (!data.isDeletedByAdmin) { 
            if (!data.salesProfessionalName || data.salesProfessionalName.trim() === "" || data.salesProfessionalName === authUser.name) {
                fetchedLeads.push({ 
                    id: docSnap.id, 
                    ...data,
                });
            }
        }
      });
      setAllLeads(fetchedLeads);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching leads for user portal:", error);
      toast({ title: "Fetch Error", description: "Could not load leads from database.", variant: "destructive" });
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [authUser, authLoading, toast, hasAnnualSubscription]);


  const filteredLeads = useMemo(() => {
    if (isLoading) return [];    
    return allLeads.filter(lead =>
        lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.contactPerson.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (lead.salesProfessionalName && lead.salesProfessionalName.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [allLeads, searchTerm, isLoading]);


  const getStatusBadgeClasses = (status?: Lead["status"]): string => {
    switch(status) {
      case 'new': return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'contacted': return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'qualified': return 'bg-purple-100 text-purple-700 border-purple-300';
      case 'converted': return 'bg-accent text-accent-foreground border-accent';
      case 'lost': return 'bg-destructive/20 text-destructive border-destructive/50';
      case 'flagged': return 'bg-orange-500 text-white border-orange-600';
      default: return 'border-gray-300 text-gray-600';
    }
  }

  if (isLoading || authLoading) {
    return (
      <div className="container mx-auto py-8 px-4 md:px-6">
        <Button variant="outline" asChild className="mb-4">
          <Link href="/home"><ArrowLeft className="mr-2 h-4 w-4" /> Back to User Portal</Link>
        </Button>
        <div className="text-center">Loading business contacts...</div>
      </div>
    );
  }
  
  if (!authUser || authUser.type !== 'professional') {
     return (
       <div className="container mx-auto py-8 px-4 md:px-6">
          <Button variant="outline" asChild className="mb-4">
            <Link href="/home"><ArrowLeft className="mr-2 h-4 w-4" /> Back to User Portal</Link>
          </Button>
          <div className="text-center">Access Denied. Please log in as a Startup/Fundraiser.</div>
      </div>
    );
  }
  
  if (!hasAnnualSubscription) {
    return (
      <div className="container mx-auto py-8 px-4 md:px-6">
        <Button variant="outline" asChild className="mb-4">
            <Link href="/home"><ArrowLeft className="mr-2 h-4 w-4" /> Back to User Portal</Link>
        </Button>
        <Alert variant="default" className="border-yellow-500 bg-yellow-100/80 text-yellow-800">
            <Star className="h-5 w-5 text-yellow-600" />
            <AlertTitle className="font-bold">Premium Feature</AlertTitle>
            <AlertDescription>
                Access to Premium Business Contacts is an exclusive feature for our Annual Subscribers. This gives you direct contact with verified businesses, opening up unparalleled sales opportunities.
                <Button asChild variant="link" className="p-0 h-auto ml-2 text-yellow-800 font-bold">
                    <Link href="/verify-payment">Upgrade to Annual Plan</Link>
                </Button>
            </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <Button variant="outline" asChild className="mb-4">
        <Link href="/home"><ArrowLeft className="mr-2 h-4 w-4" /> Back to User Portal</Link>
      </Button>
      
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight flex items-center">
            <BarChart3 className="mr-3 h-8 w-8 text-primary" /> Premium Business Contacts
        </h1>
        <p className="text-muted-foreground">Track and manage contacts related to your sales activities.</p>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Business Contacts</CardTitle>
          <CardDescription>General platform contacts and those relevant to your activities.</CardDescription>
           <div className="relative mt-4">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by name, area, sales pro..."
              className="pl-8 w-full md:w-1/2 lg:w-1/3"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          {isDemoUser && (
            <Alert variant="default" className="mb-4 border-yellow-500 bg-yellow-100">
                <Info className="h-4 w-4 text-yellow-600" />
                <AlertTitle className="font-semibold text-yellow-700">Demo Account View</AlertTitle>
                <AlertDescription className="text-yellow-700">
                    Contact details are hidden for demo accounts. Full access is available with a standard subscription.
                </AlertDescription>
            </Alert>
          )}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Organization Name</TableHead>
                <TableHead className="hidden md:table-cell">Contact Person</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="hidden sm:table-cell">Address</TableHead>
                <TableHead className="hidden md:table-cell">Mobile Number</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLeads.length > 0 ? (
                filteredLeads.map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{isDemoUser ? "Hidden for Demo" : lead.name}</span>
                      </div>
                       {lead.salesProfessionalName && <div className="text-xs text-muted-foreground mt-0.5">Sales Pro: {isDemoUser ? "Hidden" : lead.salesProfessionalName}</div>}
                       {(!lead.corporationName || lead.corporationName.trim() === "") && authUser?.name && <div className="text-xs text-muted-foreground mt-0.5 italic">(General Lead)</div>}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                         <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <User className="h-3.5 w-3.5" />
                            {isDemoUser ? "Hidden for Demo" : lead.contactPerson || "N/A"}
                         </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground space-y-0.5 whitespace-pre-wrap">
                         {isDemoUser ? "Hidden for Demo" : lead.email || "N/A"}
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                           <MapPin className="h-3.5 w-3.5 text-green-600" />
                           {isDemoUser ? "Hidden for Demo" : lead.address || "N/A"}
                        </div>
                    </TableCell>
                     <TableCell className="hidden md:table-cell">
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                           <Phone className="h-3.5 w-3.5" />
                           {isDemoUser ? "Hidden for Demo" : lead.phoneNumber || "N/A"}
                        </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`py-1 px-2.5 text-xs font-medium ${getStatusBadgeClasses(lead.status)}`}
                      >
                        {(lead.status || 'New').charAt(0).toUpperCase() + (lead.status || 'New').slice(1)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    No contacts found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
