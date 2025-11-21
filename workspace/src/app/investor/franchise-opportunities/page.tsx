
"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Store, Search, Eye, DollarSign, Briefcase, CalendarDays, Tag, Filter, Package, Zap, FileText as FileTextIcon } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebaseConfig';
import type { PlatformOffer } from '@/types/platform-offer';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import NextImage from 'next/image';

const offerCategoriesList = ["Product", "Service", "Subscription", "Digital Product", "Event", "Other"] as const;


export default function InvestorFranchiseOpportunitiesPage() {
  const [platformOffers, setPlatformOffers] = useState<PlatformOffer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const { currentUser: authUser, loading: authLoading } = useAuth();
  
  useEffect(() => {
    // Data fetching for this page has been disabled. It will now appear empty to investors.
    setIsLoading(false);
  }, []);

  const filteredOffers = useMemo(() => {
    return platformOffers.filter(offer => {
      const matchesSearch =
        offer.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        offer.corporationName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        offer.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        offer.commissionRate.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = categoryFilter === 'all' || offer.offerCategory === categoryFilter;
      
      return matchesSearch && matchesCategory;
    });
  }, [platformOffers, searchTerm, categoryFilter]);

  const getCategoryIcon = (category: PlatformOffer['offerCategory'] | undefined) => {
    if (!category) return <Tag className="h-4 w-4 text-muted-foreground" />;
    switch (category) {
      case "Product": return <Package className="h-4 w-4 text-muted-foreground" />;
      case "Service": return <Briefcase className="h-4 w-4 text-muted-foreground" />;
      case "Subscription": return <Zap className="h-4 w-4 text-muted-foreground" />;
      case "Digital Product": return <FileTextIcon className="h-4 w-4 text-muted-foreground" />;
      case "Event": return <CalendarDays className="h-4 w-4 text-muted-foreground" />;
      default: return <Tag className="h-4 w-4 text-muted-foreground" />;
    }
  };

  if (isLoading || authLoading) {
    return <div className="container mx-auto py-8 px-4 md:px-6 text-center">Loading franchise opportunities...</div>;
  }
  if (!authUser) {
    return <div className="container mx-auto py-8 px-4 md:px-6 text-center">Please log in to view franchise opportunities.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center">
            <Store className="mr-3 h-8 w-8 text-primary" />
            Franchise Opportunities
          </h1>
          <p className="text-muted-foreground">
            Explore potential franchise or business partnership opportunities from corporations.
          </p>
        </div>
      </div>

      <Card className="shadow-lg rounded-xl">
        <CardHeader>
          <CardTitle>Available Opportunities ({filteredOffers.length})</CardTitle>
          <CardDescription>
            Businesses seeking partners, potentially for franchise models.
          </CardDescription>
          <div className="flex flex-col md:flex-row gap-4 mt-4">
            <div className="relative flex-grow">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search by title, company, description..."
                  className="pl-8 w-full"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full md:w-[220px]">
                     <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4 text-muted-foreground" />
                        <SelectValue placeholder="Filter by category" />
                    </div>
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {offerCategoriesList.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {filteredOffers.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredOffers.map((offer) => (
                <Card key={offer.id} className="flex flex-col shadow-md hover:shadow-lg transition-shadow duration-300 rounded-xl overflow-hidden">
                  {offer.mediaUrl && offer.mediaUrl.startsWith('data:image') ? (
                    <div className="relative h-48 w-full">
                      <NextImage src={offer.mediaUrl} alt={offer.title} layout="fill" objectFit="cover" className="rounded-t-xl" data-ai-hint="business opportunity"/>
                    </div>
                  ) : (
                    <div className="h-48 w-full bg-muted flex items-center justify-center rounded-t-xl">
                        <Store className="h-16 w-16 text-primary/30"/>
                    </div>
                  )}
                  <CardHeader className="p-4">
                    <CardTitle className="text-lg leading-tight line-clamp-2 hover:text-primary">
                      {offer.title}
                    </CardTitle>
                    <CardDescription className="text-xs text-muted-foreground">
                        By: <span className="font-medium text-primary/90">{offer.corporationName}</span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 flex-grow space-y-2 text-sm">
                    <p className="text-muted-foreground line-clamp-3 text-xs">{offer.description}</p>
                    <div className="flex items-center gap-1.5"><Briefcase className="h-4 w-4 text-primary/70"/>Type: {offer.offerCategory}</div>
                    <div className="flex items-center gap-1.5"><DollarSign className="h-4 w-4 text-green-600"/>Value/Commission: {offer.commissionRate} ({offer.commissionType})</div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><CalendarDays className="h-3.5 w-3.5"/>Posted: {format(new Date(offer.postedDate), "dd MMM, yyyy")}</div>
                  </CardContent>
                  <CardFooter className="p-4 border-t bg-muted/20">
                    <Button asChild className="w-full" variant="default">
                      <Link href={`/investor/franchise-detail/${offer.id}`}>
                        <Eye className="mr-2 h-4 w-4"/> View Details & Connect
                      </Link>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 text-muted-foreground">
              <Store className="mx-auto h-16 w-16 text-primary/20 mb-4" />
              <p className="text-lg font-medium">No Franchise Opportunities Found</p>
              <p className="text-sm">
                {searchTerm || categoryFilter !== 'all' ? "No opportunities match your current search/filter." : "There are currently no active franchise-like opportunities listed by corporations."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
