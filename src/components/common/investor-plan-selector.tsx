
"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ArrowRight, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { db } from '@/lib/firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";


interface PlanDetails {
    title: string;
    investorAccess: string;
    features: string[];
    className: string;
}

interface PricingData {
    silver: number;
    gold: number;
    platinum: number;
    royal: number;
    dollarRate: number;
    currencySymbol: string;
}

type PlanKey = 'silver' | 'gold' | 'platinum' | 'royal';

const planDetails: { [key: string]: PlanDetails } = {
    silver: { title: "Silver", investorAccess: "Investors of 2.5 Million", features: ["Access to Angel Investors (Tier 1)", "1 Active Funding Pitch", "Community Access"], className: "border-gray-300 hover:border-gray-400" },
    gold: { title: "Gold", investorAccess: "Investors of 5 Million", features: ["Access to Angel Investors (Tier 1 & 2)", "2 Active Funding Pitches", "Priority Support"], className: "border-yellow-400 hover:border-yellow-500" },
    platinum: { title: "Platinum", investorAccess: "Investors of 10 Million", features: ["Access to All Angel Investors", "3 Active Funding Pitches", "Pitch Review Session"], className: "border-blue-400 hover:border-blue-500" },
    royal: { title: "Royal", investorAccess: "Investors of 50 Million+", features: ["Full Investor Access (Angel & Institutional)", "5 Active Funding Pitches", "Dedicated Support"], className: "border-purple-500 hover:border-purple-600" },
};

export function InvestorPlanSelector() {
    const [pricing, setPricing] = useState<PricingData>({ silver: 10, gold: 13, platinum: 16, royal: 18, dollarRate: 283, currencySymbol: '$' });
    const [isLoadingPricing, setIsLoadingPricing] = useState(true);
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

    useEffect(() => {
        const fetchPricing = async () => {
            if (!db) {
                setIsLoadingPricing(false);
                return;
            }
            const pricingDocRef = doc(db, "siteContent", "launchpadPricing");
            try {
                const docSnap = await getDoc(pricingDocRef);
                if (docSnap.exists()) {
                    setPricing(docSnap.data() as PricingData);
                }
            } catch (error) {
                console.error("Error fetching pricing data:", error);
            } finally {
                setIsLoadingPricing(false);
            }
        };
        fetchPricing();
    }, []);

    const getPlanPrice = (planKey: PlanKey) => {
        if (isLoadingPricing) return '...';
        const pricePerMonth = pricing[planKey] || 0;
        const total = billingCycle === 'yearly' ? pricePerMonth * 12 * 0.8 : pricePerMonth;
        return `${pricing.currencySymbol}${total.toFixed(0)}`;
    };

    return (
        <Card className="w-full mx-auto shadow-2xl border-0 bg-transparent">
            <CardHeader className="text-center">
                <CardTitle className="text-3xl md:text-4xl font-bold">LISTED Launchpad</CardTitle>
                <CardDescription className="text-md md:text-lg text-muted-foreground max-w-2xl mx-auto">
                    Choose a plan that matches your ambition. Get direct access to the investors you need, right when you need them.
                </CardDescription>
                <div className="flex justify-center items-center gap-4 mt-4">
                    <Label htmlFor="billing-cycle" className={cn(billingCycle === 'monthly' ? 'text-primary' : 'text-muted-foreground')}>Monthly</Label>
                    <Switch id="billing-cycle" checked={billingCycle === 'yearly'} onCheckedChange={(checked) => setBillingCycle(checked ? 'yearly' : 'monthly')} />
                    <Label htmlFor="billing-cycle" className={cn(billingCycle === 'yearly' ? 'text-primary' : 'text-muted-foreground')}>Yearly</Label>
                     <Badge variant="destructive" className="animate-pulse">-20%</Badge>
                </div>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch pt-6">
                {(Object.keys(planDetails) as PlanKey[]).map((planKey) => {
                    const plan = planDetails[planKey];
                    return (
                        <Card key={planKey} className={cn("flex flex-col shadow-lg transition-transform hover:scale-[1.02]", plan.className, planKey === 'royal' && "lg:col-span-1 md:col-span-2")}>
                            <CardHeader className="text-center">
                                <CardTitle className="text-2xl font-semibold">{plan.title.split(' - ')[0]}</CardTitle>
                                <CardDescription className="text-sm">{plan.investorAccess}</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-grow space-y-4 flex flex-col">
                                <div className="text-center mb-4">
                                    <span className="text-5xl font-bold">{getPlanPrice(planKey)}</span>
                                    <span className="text-sm text-muted-foreground">/{billingCycle === 'yearly' ? 'year' : 'month'}</span>
                                </div>
                                <ul className="space-y-3 text-sm flex-grow">
                                    {plan.features.map(feature => (
                                        <li key={feature} className="flex items-start gap-3">
                                            <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                                            <span className="text-muted-foreground">{feature}</span>
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                            <CardFooter className="pt-4">
                                <Button asChild className="w-full bg-primary hover:bg-primary/90">
                                    <Link href={`/auth?action=signup&plan=${planKey}&duration=${billingCycle === 'yearly' ? 12 : 1}`}>Get Started</Link>
                                </Button>
                            </CardFooter>
                        </Card>
                    );
                })}
            </CardContent>
            <CardFooter className="flex-col items-center justify-center pt-8">
                <p className="text-sm text-muted-foreground">The annual plan is fully refundable if you find that LISTED has not been helpful for you.</p>
                <Button variant="link" asChild className="mt-2 text-primary">
                    <Link href="/contact">Need a custom plan? Contact Us</Link>
                </Button>
            </CardFooter>
        </Card>
    );
}
