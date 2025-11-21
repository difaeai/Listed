
import React from 'react';
import { Package, Briefcase, Zap, FileText, Tag, CalendarDays as LucideCalendarDays } from "lucide-react";
import { cn } from '@/lib/utils';

export const offerTypeIcons = {
    Product: <Package className="h-4 w-4 text-muted-foreground" />,
    Service: <Briefcase className="h-4 w-4 text-muted-foreground" />,
    Subscription: <Zap className="h-4 w-4 text-muted-foreground" />,
    Digital: <FileText className="h-4 w-4 text-muted-foreground" />,
    Event: <LucideCalendarDays className="h-4 w-4 text-muted-foreground" />,
    Default: <Tag className="h-4 w-4 text-muted-foreground" />
};

// Renamed to avoid conflict with lucide-react's CalendarDays if it were to be directly imported in consuming files.
// This component can be further customized if needed.
export function CalendarDays({ className }: { className?: string }) {
    return <LucideCalendarDays className={cn("h-4 w-4", className)} />;
}
