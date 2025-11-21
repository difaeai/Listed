
"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Eye, Search, Landmark, Loader2, ChevronDown, User as UserIcon, ArrowLeft, Info, DollarSign as DollarSignIcon, Briefcase as BriefcaseIcon, ThumbsUp, ThumbsDown, Mail, CalendarDays, BarChartHorizontalBig, FileText, Percent, ImageIcon, Star } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { format, isFuture } from 'date-fns';
import { useToast } from "@/hooks/use-toast";
import type { FundingPitch } from '@/app/offers/my-ads/page';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebaseConfig';
import { collection, query, orderBy, doc, updateDoc, Timestamp, onSnapshot, serverTimestamp, increment, runTransaction, getDocs, where, writeBatch, getDoc } from "firebase/firestore";
import { useRouter, useParams } from 'next/navigation';
import NextImage from 'next/image';
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { RegisteredUserEntry } from '@/app/auth/components/auth-shared-types';
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

export default function ManagePitchEngagementPage() {
    const params = useParams();
    const router = useRouter();
    const pitchId = params.pitchId as string;
    const { toast } = useToast();
    const { currentUser: adminUser, loading: authLoading } = useAuth();
    
    const [pitch, setPitch] = useState<FundingPitch | null>(null);
    const [allInvestors, setAllInvestors] = useState<RegisteredUserEntry[]>([]);
    const [engagementData, setEngagementData] = useState<{ viewers: string[], interests: string[], disinterests: string[] }>({ viewers: [], interests: [], disinterests: [] });
    
    const [isLoadingPage, setIsLoadingPage] = useState(true);
    const [isLoadingEngagement, setIsLoadingEngagement] = useState(false);
    
    const [engagementSearchTerm, setEngagementSearchTerm] = useState('');
    const [selectedInvestorUids, setSelectedInvestorUids] = useState<string[]>([]);
    const [isBulkActionLoading, setIsBulkActionLoading] = useState(false);
  
    useEffect(() => {
        if (!pitchId || !db || authLoading) {
            setIsLoadingPage(false);
            return;
        }
        if (!adminUser || adminUser.type !== 'admin') {
            toast({ title: "Unauthorized", variant: "destructive"});
            router.push("/admin/dashboard");
            return;
        }

        const unsubPitch = onSnapshot(doc(db, "fundingPitches", pitchId), (docSnap) => {
            if (docSnap.exists()) {
                setPitch({ id: docSnap.id, ...docSnap.data() } as FundingPitch);
            } else {
                toast({ title: "Pitch Not Found", variant: "destructive" });
                router.push("/admin/manage-funding-pitches");
            }
            setIsLoadingPage(false);
        });

        const usersQuery = query(collection(db, "users"), where("type", "in", ["investor", "company"]), orderBy("name"));
        const unsubInvestors = onSnapshot(usersQuery, (snapshot) => {
            setAllInvestors(snapshot.docs.map(d => ({ uid: d.id, ...d.data() } as RegisteredUserEntry)));
        });

        return () => {
            unsubPitch();
            unsubInvestors();
        };

    }, [pitchId, db, authLoading, adminUser, router, toast]);

    const fetchEngagementData = useCallback(async () => {
        if (!pitchId || !db) return;
        setIsLoadingEngagement(true);
        try {
            const viewersRef = collection(db, "fundingPitches", pitchId, "viewers");
            const interestsRef = collection(db, "fundingPitches", pitchId, "interests");
            const disinterestsRef = collection(db, "fundingPitches", pitchId, "disinterests");

            const [viewersSnap, interestsSnap, disinterestsSnap] = await Promise.all([
                getDocs(viewersRef),
                getDocs(interestsRef),
                getDocs(disinterestsRef)
            ]);

            setEngagementData({
                viewers: viewersSnap.docs.map(d => d.id),
                interests: interestsSnap.docs.map(d => d.id),
                disinterests: disinterestsSnap.docs.map(d => d.id)
            });
        } catch (e) {
            console.error("Error fetching engagement data:", e);
            toast({ title: "Error", description: "Failed to load engagement data.", variant: "destructive"});
        } finally {
            setIsLoadingEngagement(false);
        }
    }, [pitchId, db, toast]);

    useEffect(() => {
        fetchEngagementData();
    }, [fetchEngagementData]);

    const handleBulkEngagementAction = async (action: 'view' | 'interest' | 'disinterest') => {
        if (!pitchId || !db || selectedInvestorUids.length === 0) {
            toast({ title: "No selection", description: "Please select one or more investors.", variant: "default" });
            return;
        }
        setIsBulkActionLoading(true);
        const subcollectionName = action === 'view' ? 'viewers' : action === 'interest' ? 'interests' : 'disinterests';
        const counterField = action === 'view' ? 'views' : action === 'interest' ? 'interestedInvestorsCount' : 'negativeResponseRate';
        
        const batch = writeBatch(db);
        const pitchDocRef = doc(db, "fundingPitches", pitchId);
        let successCount = 0;

        for (const uid of selectedInvestorUids) {
            const alreadyEngaged = (action === 'view' && engagementData.viewers.includes(uid)) ||
                               ((action === 'interest' || action === 'disinterest') && (engagementData.interests.includes(uid) || engagementData.disinterests.includes(uid)));
            
            if (!alreadyEngaged) {
                const investor = allInvestors.find(inv => inv.uid === uid);
                if (investor) {
                    const engagementDocRef = doc(db, "fundingPitches", pitchId, subcollectionName, uid);
                    batch.set(engagementDocRef, {
                        userId: investor.uid, userName: investor.name, userType: investor.type,
                        userAvatarSeed: investor.avatarSeed, timestamp: serverTimestamp()
                    });
                    successCount++;
                }
            }
        }

        if (successCount > 0) {
            batch.update(pitchDocRef, { [counterField]: increment(successCount) });
            try {
                await batch.commit();
                toast({ title: "Bulk Action Successful", description: `${successCount} investors updated for action: ${action}.` });
                fetchEngagementData();
                setSelectedInvestorUids([]);
            } catch (e) {
                console.error("Error committing bulk engagement batch:", e);
                toast({ title: "Error", description: "Could not complete bulk action.", variant: "destructive" });
            }
        } else {
            toast({ title: "No Action Taken", description: "Selected investors had already performed this action." });
        }
        setIsBulkActionLoading(false);
    };

    const handleRowSelect = (uid: string, checked: boolean) => {
        setSelectedInvestorUids(prev => checked ? [...prev, uid] : prev.filter(id => id !== uid));
    };

    const handleSelectAll = (checked: boolean) => {
        setSelectedInvestorUids(checked ? filteredInvestors.map(inv => inv.uid) : []);
    };
    
    const filteredInvestors = useMemo(() => {
        return allInvestors.filter(inv => inv.name?.toLowerCase().includes(engagementSearchTerm.toLowerCase()) || inv.email?.toLowerCase().includes(engagementSearchTerm.toLowerCase()));
    }, [allInvestors, engagementSearchTerm]);

    const isAllSelected = filteredInvestors.length > 0 && selectedInvestorUids.length === filteredInvestors.length;


    if (isLoadingPage) {
        return <div className="container mx-auto p-8 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto"/><div>Loading Engagement Manager...</div></div>;
    }

    if (!pitch) {
        return <div className="container mx-auto p-8 text-center">Pitch not found.</div>;
    }
    
    return (
        <div className="container mx-auto py-8 px-4 md:px-6 space-y-6">
            <Button variant="outline" asChild className="mb-4">
                <Link href="/admin/manage-funding-pitches"><ArrowLeft className="mr-2 h-4 w-4"/> Back to All Pitches</Link>
            </Button>
            
            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle className="text-2xl">Pitch Overview: {pitch.projectTitle}</CardTitle>
                    <CardDescription>Full details of the funding pitch.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     {pitch.pitchImageUrl && (
                        <div className="mb-4">
                            <NextImage src={pitch.pitchImageUrl} alt={pitch.projectTitle} width={600} height={350} className="rounded-md object-contain mx-auto border" data-ai-hint="project image"/>
                        </div>
                    )}
                    <p className="text-muted-foreground whitespace-pre-wrap">{pitch.projectSummary}</p>
                    <Separator/>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <InfoItem icon={<BriefcaseIcon className="h-4 w-4"/>} label="Industry" value={pitch.industry} />
                        <InfoItem icon={<DollarSignIcon className="h-4 w-4"/>} label="Amount Sought" value={`PKR ${pitch.fundingAmountSought.toLocaleString()}`} />
                        <InfoItem icon={<Percent className="h-4 w-4"/>} label="Equity Offered" value={`${pitch.equityOffered}%`} />
                        <InfoItem icon={<UserIcon className="h-4 w-4"/>} label="Creator" value={pitch.creatorName || "N/A"} />
                        <InfoItem icon={<Mail className="h-4 w-4"/>} label="Contact Email" value={pitch.contactEmail} />
                        <InfoItem icon={<Eye className="h-4 w-4"/>} label="Views" value={pitch.views?.toString() || '0'} />
                        <InfoItem icon={<ThumbsUp className="h-4 w-4 text-green-600"/>} label="Interested" value={pitch.interestedInvestorsCount?.toString() || '0'} />
                        <InfoItem icon={<ThumbsDown className="h-4 w-4 text-red-600"/>} label="Not Interested" value={pitch.negativeResponseRate?.toString() || '0'} />
                        {pitch.featureStatus === 'active' && <InfoItem icon={<Star className="h-4 w-4 text-yellow-500"/>} label="Feature Status" value="Active" />}
                    </div>
                    {pitch.businessPlanLink && (
                        <>
                        <Separator/>
                        <InfoItem icon={<FileText className="h-4 w-4"/>} label="Business Plan" value={<Link href={pitch.businessPlanLink} target="_blank" className="text-primary hover:underline break-all">View Document</Link>} />
                        </>
                    )}
                </CardContent>
            </Card>

            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle className="text-2xl">Assign Engagement</CardTitle>
                    <CardDescription>
                        Manually assign investor engagement actions to this pitch. This is useful for offline interactions or correcting records.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col sm:flex-row gap-2 mb-4">
                        <Input 
                            placeholder="Search investors by name or email..." 
                            value={engagementSearchTerm}
                            onChange={(e) => setEngagementSearchTerm(e.target.value)}
                            className="w-full sm:w-auto flex-grow"
                        />
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                            <Button variant="outline" disabled={isBulkActionLoading || selectedInvestorUids.length === 0} className="w-full sm:w-auto">
                                {isBulkActionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Bulk Actions ({selectedInvestorUids.length}) <ChevronDown className="ml-2 h-4 w-4" />
                            </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleBulkEngagementAction('view')}>Mark as Viewed</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleBulkEngagementAction('interest')}>Mark as Interested</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleBulkEngagementAction('disinterest')}>Mark as Not Interested</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                    <ScrollArea className="h-[500px] border rounded-lg">
                        <div className="p-4 space-y-2">
                        <div className="flex items-center gap-2 border-b px-2 py-2 sticky top-0 bg-background/80 backdrop-blur-sm z-10">
                            <Checkbox
                                id="selectAllInvestors"
                                checked={isAllSelected}
                                onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
                            />
                            <label htmlFor="selectAllInvestors" className="text-sm font-medium">Select All Visible ({filteredInvestors.length})</label>
                        </div>
                        {(isLoadingEngagement) ? (
                            <p className="text-center text-muted-foreground py-4">Loading investors...</p>
                        ) : filteredInvestors.length === 0 ? (
                            <p className="text-center text-muted-foreground py-4">No investors match your search.</p>
                        ) : (
                            filteredInvestors.map(investor => {
                            const hasViewed = engagementData.viewers.includes(investor.uid);
                            const hasInterested = engagementData.interests.includes(investor.uid);
                            const hasDisinterested = engagementData.disinterests.includes(investor.uid);
                            
                            return (
                                <div key={investor.uid} className="flex items-center justify-between p-2 border rounded-md hover:bg-muted/50">
                                <div className="flex items-center gap-3">
                                    <Checkbox
                                    id={`investor-${investor.uid}`}
                                    checked={selectedInvestorUids.includes(investor.uid)}
                                    onCheckedChange={(checked) => handleRowSelect(investor.uid, checked as boolean)}
                                    />
                                    <Avatar className="h-8 w-8">
                                    <AvatarImage src={investor.avatarDataUri || `https://picsum.photos/seed/${investor.avatarSeed || investor.uid}/32/32`} alt={investor.name} data-ai-hint="person investor"/>
                                    <AvatarFallback>{investor.name?.substring(0,1)}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                    <p className="text-sm font-medium">{investor.name}</p>
                                    <p className="text-xs text-muted-foreground">{investor.email}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {hasViewed && <Badge variant="secondary"><Eye className="h-3 w-3 mr-1"/>Viewed</Badge>}
                                    {hasInterested && <Badge variant="default" className="bg-green-600 hover:bg-green-700"><ThumbsUp className="h-3 w-3 mr-1"/>Interested</Badge>}
                                    {hasDisinterested && <Badge variant="destructive"><ThumbsDown className="h-3 w-3 mr-1"/>Not Interested</Badge>}
                                </div>
                                </div>
                            );
                            })
                        )}
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
    );
}

const InfoItem: React.FC<{label: string, value: string | React.ReactNode, icon: React.ReactNode}> = ({label, value, icon}) => (
    <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-md">
        <div className="flex-shrink-0 text-muted-foreground mt-1">{icon}</div>
        <div>
            <p className="text-xs font-semibold text-muted-foreground">{label}</p>
            <div className="text-sm font-medium text-foreground">{value}</div>
        </div>
    </div>
);
