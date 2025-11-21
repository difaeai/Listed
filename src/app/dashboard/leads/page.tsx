
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { BarChart3, Search, User, MapPin, DollarSign } from 'lucide-react'; 
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import type { Lead } from '@/app/admin/manage-leads/page'; // Re-use interface from admin
import { db } from '@/lib/firebaseConfig';
import { collection, query, where, onSnapshot, orderBy, Timestamp } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';

export default function CorporationBusinessLeadsPage() {
  const [allLeads, setAllLeads] = useState<Lead[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const { currentUser: authUser, loading: authLoading } = useAuth();
  const { toast } = useToast(); // Not used in this version but kept for consistency

  useEffect(() => {
    if (authLoading) {
        setIsLoading(true);
        return;
    }
    if (!authUser || authUser.type !== 'company' || !db) {
        setIsLoading(false);
        // Consider redirecting or showing an error if not logged in as company
        return;
    }
    setIsLoading(true);
    const leadsRef = collection(db, "leads");
    // Query for leads relevant to this corporation OR general leads (no corporationName)
    const q = query(leadsRef, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetchedLeads: Lead[] = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data() as Omit<Lead, 'id'> & { createdAt: Timestamp };
        if (!data.isDeletedByAdmin) { // Only show non-admin-deleted leads
            // Filter for leads that are either assigned to this corporation or are general (no corp assigned)
            if (!data.corporationName || data.corporationName.trim() === "" || data.corporationName === authUser.corporationName) {
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
      console.error("Error fetching leads for corporation:", error);
      toast({ title: "Fetch Error", description: "Could not load leads from database.", variant: "destructive" });
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [authUser, authLoading, toast]);


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


  const getStatusBadgeClasses = (status: Lead["status"]): string => {
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
    return <div className="container mx-auto py-8 px-4 md:px-6 text-center">Loading business leads...</div>;
  }
  if (!authUser || authUser.type !== 'company') {
     return <div className="container mx-auto py-8 px-4 md:px-6 text-center">Access Denied. Please log in as a Corporation.</div>;
  }

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center">
            <BarChart3 className="mr-3 h-8 w-8 text-primary" /> Business Leads
          </h1>
          <p className="text-muted-foreground">Manage and track leads for your corporation (from Firestore).</p>
        </div>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Business Leads</CardTitle>
          <CardDescription>Leads relevant to your corporation and general platform leads.</CardDescription>
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Organization Name</TableHead>
                <TableHead className="hidden md:table-cell">Contact Person</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="hidden sm:table-cell">Address</TableHead>
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
                        <span className="font-medium">{lead.name}</span>
                      </div>
                       {lead.salesProfessionalName && <div className="text-xs text-muted-foreground mt-0.5">Sales Pro: {lead.salesProfessionalName}</div>}
                       {(!lead.corporationName || lead.corporationName.trim() === "") && authUser?.corporationName && <div className="text-xs text-muted-foreground mt-0.5 italic">(General Lead)</div>}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                         <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <User className="h-3.5 w-3.5" />
                            {lead.contactPerson || "N/A"}
                         </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground space-y-0.5 whitespace-pre-wrap">
                         {lead.email || "N/A"}
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                           <MapPin className="h-3.5 w-3.5 text-green-600" />
                           {lead.address || "N/A"}
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
                  <TableCell colSpan={5} className="h-24 text-center">
                    No leads found.
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
