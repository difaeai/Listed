
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Bell, UserPlus, Lightbulb, Briefcase, Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNowStrict } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebaseConfig';
import { collection, query, orderBy, onSnapshot, Timestamp, limit, where } from 'firebase/firestore';
import type { RegisteredUserEntry } from '@/app/auth/components/auth-shared-types';
import type { FundingPitch } from '@/app/offers/my-ads/page';
import type { PlatformOffer } from '@/types/platform-offer';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

type NotificationItem = {
  id: string;
  type: 'new_user' | 'new_pitch' | 'new_offer';
  timestamp: Date;
  title: string;
  description: string;
  creatorName: string;
  avatarSeed?: string;
  link: string;
};

export default function AdminNotificationsPage() {
  const { currentUser: adminUser, loading: authLoading } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'new_user' | 'new_pitch' | 'new_offer'>('all');

  useEffect(() => {
    if (authLoading || !adminUser || adminUser.type !== 'admin' || !db) {
      setIsLoading(false);
      return;
    }

    const unsubs: (() => void)[] = [];
    const combinedItems: NotificationItem[] = [];

    // New Users
    const usersQuery = query(
        collection(db, "users"), 
        where("isDeletedByAdmin", "==", false), 
        orderBy("createdAt", "desc"), 
        limit(50)
    );
    unsubs.push(onSnapshot(usersQuery, (snapshot) => {
      snapshot.docs.forEach(doc => {
        const data = doc.data() as RegisteredUserEntry;
        if (data.createdAt) {
          const idx = combinedItems.findIndex(item => item.id === doc.id && item.type === 'new_user');
          const newItem: NotificationItem = {
            id: doc.id,
            type: 'new_user',
            timestamp: (data.createdAt as Timestamp).toDate(),
            title: `New User: ${data.name || data.email}`,
            description: `${data.type?.charAt(0).toUpperCase() + (data.type?.slice(1) || '')} account created.`,
            creatorName: data.name || data.email,
            avatarSeed: data.avatarSeed,
            link: `/admin/manage-users`,
          };
          if (idx > -1) combinedItems[idx] = newItem;
          else combinedItems.push(newItem);
        }
      });
      updateNotifications();
    }));

    // New Funding Pitches
    const pitchesQuery = query(
        collection(db, "fundingPitches"), 
        where("isDeletedByAdmin", "==", false), 
        orderBy("createdAt", "desc"), 
        limit(50)
    );
    unsubs.push(onSnapshot(pitchesQuery, (snapshot) => {
      snapshot.docs.forEach(doc => {
        const data = doc.data() as FundingPitch;
        if (data.createdAt) {
          const idx = combinedItems.findIndex(item => item.id === doc.id && item.type === 'new_pitch');
          const newItem: NotificationItem = {
            id: doc.id!,
            type: 'new_pitch',
            timestamp: (data.createdAt as Timestamp).toDate(),
            title: `New Pitch: ${data.projectTitle}`,
            description: `By ${data.creatorName}, seeking PKR ${data.fundingAmountSought.toLocaleString()}.`,
            creatorName: data.creatorName,
            avatarSeed: data.creatorAvatarSeed,
            link: `/admin/manage-funding-pitches/${doc.id}/engagement`,
          };
           if (idx > -1) combinedItems[idx] = newItem;
           else combinedItems.push(newItem);
        }
      });
      updateNotifications();
    }));

    // New Platform Offers
    const offersQuery = query(
        collection(db, "platformOffers"), 
        where("isDeletedByAdmin", "==", false), 
        orderBy("createdAt", "desc"), 
        limit(50)
    );
    unsubs.push(onSnapshot(offersQuery, (snapshot) => {
      snapshot.docs.forEach(doc => {
        const data = doc.data() as PlatformOffer;
         if (data.createdAt) {
          const idx = combinedItems.findIndex(item => item.id === doc.id && item.type === 'new_offer');
          const newItem: NotificationItem = {
            id: doc.id,
            type: 'new_offer',
            timestamp: (data.createdAt as Timestamp).toDate(),
            title: `New Offer: ${data.title}`,
            description: `From ${data.corporationName} with commission: ${data.commissionRate}.`,
            creatorName: data.corporationName,
            avatarSeed: data.corporationLogoSeed,
            link: `/admin/manage-offers`,
          };
          if (idx > -1) combinedItems[idx] = newItem;
          else combinedItems.push(newItem);
        }
      });
      updateNotifications();
    }));
    
    const updateNotifications = () => {
        combinedItems.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        setNotifications([...combinedItems]);
        setIsLoading(false);
    };

    return () => unsubs.forEach(unsub => unsub());
  }, [adminUser, authLoading]);

  const filteredNotifications = useMemo(() => {
    return notifications
      .filter(n => typeFilter === 'all' || n.type === typeFilter)
      .filter(n =>
        n.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        n.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        n.creatorName.toLowerCase().includes(searchTerm.toLowerCase())
      );
  }, [notifications, searchTerm, typeFilter]);

  const getNotificationIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'new_user': return <UserPlus className="h-6 w-6 text-green-500" />;
      case 'new_pitch': return <Lightbulb className="h-6 w-6 text-yellow-500" />;
      case 'new_offer': return <Briefcase className="h-6 w-6 text-blue-500" />;
      default: return <Bell className="h-6 w-6 text-muted-foreground" />;
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight flex items-center">
          <Bell className="mr-3 h-8 w-8 text-primary" /> Notifications
        </h1>
        <p className="text-muted-foreground">A real-time feed of important events across the platform.</p>
      </div>

      <Card className="shadow-lg rounded-xl">
        <CardHeader>
          <CardTitle>Activity Feed ({filteredNotifications.length})</CardTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <Input
              type="search"
              placeholder="Search notifications..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className="relative">
              <Filter className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <select
                className="w-full h-10 pl-8 pr-4 text-sm border rounded-md"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as any)}
              >
                <option value="all">All Types</option>
                <option value="new_user">New Users</option>
                <option value="new_pitch">New Pitches</option>
                <option value="new_offer">New Offers</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[65vh]">
            <div className="space-y-4 pr-4">
              {isLoading ? (
                <p className="text-center text-muted-foreground py-10">Loading notifications...</p>
              ) : filteredNotifications.length > 0 ? (
                filteredNotifications.map((notification) => (
                  <div key={`${notification.id}-${notification.type}`} className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="p-2 bg-muted rounded-full">
                        {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold">{notification.title}</p>
                      <p className="text-sm text-muted-foreground">{notification.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNowStrict(notification.timestamp, { addSuffix: true })}
                      </p>
                    </div>
                    <Button asChild variant="outline" size="sm">
                      <Link href={notification.link}>View</Link>
                    </Button>
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-10">No notifications found matching your criteria.</p>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
