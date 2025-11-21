
"use client";

import React, { useState, useEffect } from 'react';
import { Bell, AlertTriangle, Info, CheckCircle, Users, Zap, DollarSign, X, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from '@/lib/utils';
import { formatDistanceToNowStrict } from 'date-fns';
import Link from 'next/link';

interface Notification {
  id: string;
  type: 'alert' | 'info' | 'success' | 'system_update' | 'new_lead' | 'offer_engagement' | 'network_activity';
  title: string;
  message: string;
  timestamp: string; // ISO Date string
  isRead: boolean;
  link?: string;
  relatedEntityId?: string; // e.g., offerId, userId
}

const initialNotifications: Notification[] = []; // Cleared initial notifications

const getNotificationIcon = (type: Notification['type']) => {
  switch (type) {
    case 'alert': return <AlertTriangle className="h-5 w-5 text-destructive" />;
    case 'info': return <Info className="h-5 w-5 text-blue-500" />;
    case 'success': return <CheckCircle className="h-5 w-5 text-accent" />;
    case 'system_update': return <Settings className="h-5 w-5 text-muted-foreground" />;
    case 'new_lead': return <DollarSign className="h-5 w-5 text-yellow-500" />;
    case 'offer_engagement': return <Zap className="h-5 w-5 text-primary" />;
    case 'network_activity': return <Users className="h-5 w-5 text-purple-500" />;
    default: return <Bell className="h-5 w-5 text-muted-foreground" />;
  }
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');

  useEffect(() => {
    setMounted(true);
    // In a real app, fetch notifications from a service
    // For this prototype, we start with an empty list or could load from localStorage if persisted
  }, []);

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    // Persist this change to localStorage/backend
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    // Persist this change
  };

  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    // Persist this change
  };
  
  const deleteAllNotifications = () => {
    setNotifications([]);
    // Persist this change
  };

  const filteredNotifications = notifications
    .filter(n => activeTab === 'all' || (activeTab === 'unread' && !n.isRead))
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const unreadCount = notifications.filter(n => !n.isRead).length;

  if (!mounted) {
    return <div className="flex h-screen items-center justify-center bg-muted/40"><p>Loading Notifications...</p></div>;
  }

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center">
            <Bell className="mr-3 h-8 w-8 text-primary" /> Notifications
          </h1>
          <p className="text-muted-foreground">Stay updated with important alerts and activities.</p>
        </div>
        <div className="flex gap-2">
            <Button variant="outline" onClick={markAllAsRead} disabled={unreadCount === 0}>
                Mark all as read ({unreadCount})
            </Button>
            <Button variant="destructive" onClick={deleteAllNotifications} disabled={notifications.length === 0}>
                Clear All
            </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'all' | 'unread')} className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:w-1/3 mb-4">
          <TabsTrigger value="all">All Notifications</TabsTrigger>
          <TabsTrigger value="unread">Unread ({unreadCount})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all">
          <NotificationList notifications={filteredNotifications} markAsRead={markAsRead} deleteNotification={deleteNotification} />
        </TabsContent>
        <TabsContent value="unread">
          <NotificationList notifications={filteredNotifications} markAsRead={markAsRead} deleteNotification={deleteNotification} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface NotificationListProps {
  notifications: Notification[];
  markAsRead: (id: string) => void;
  deleteNotification: (id: string) => void;
}

function NotificationList({ notifications, markAsRead, deleteNotification }: NotificationListProps) {
  if (notifications.length === 0) {
    return (
      <Card className="shadow-lg rounded-xl">
        <CardContent className="p-10 text-center text-muted-foreground">
          <Bell className="mx-auto h-16 w-16 mb-4 text-primary/20" />
          <p className="text-lg font-medium">No notifications here.</p>
          <p>You're all caught up!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {notifications.map((notification) => (
        <Card
          key={notification.id}
          className={cn(
            "shadow-md rounded-lg transition-all hover:shadow-lg",
            !notification.isRead && "border-primary/50 bg-primary/5"
          )}
        >
          <CardContent className="p-4 flex items-start gap-4">
            <div className="flex-shrink-0 mt-1">
              {getNotificationIcon(notification.type)}
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <h3 className={cn("font-semibold", !notification.isRead && "text-primary")}>{notification.title}</h3>
                {!notification.isRead && <Badge variant="default" className="bg-primary text-xs h-5">New</Badge>}
              </div>
              <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
              <p className="text-xs text-muted-foreground mt-2">
                {formatDistanceToNowStrict(new Date(notification.timestamp), { addSuffix: true })}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
                {notification.link && (
                    <Button variant="outline" size="sm" asChild>
                        <Link href={notification.link}>View Details</Link>
                    </Button>
                )}
                {!notification.isRead && (
                    <Button variant="ghost" size="sm" onClick={() => markAsRead(notification.id)}>Mark as Read</Button>
                )}
                 <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive h-7 w-7" onClick={() => deleteNotification(notification.id)}>
                    <X className="h-4 w-4"/>
                    <span className="sr-only">Delete notification</span>
                 </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
