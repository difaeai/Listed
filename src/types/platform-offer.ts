
import type { Timestamp, FieldValue } from 'firebase/firestore';

const offerCategories = ["Product", "Service", "Subscription", "Digital Product", "Event", "Other"] as const;

export interface PlatformOffer {
    id?: string;
    corporationId: string;
    corporationName: string;
    corporationLogoSeed?: string;
    title: string;
    description: string;
    offerCategory: typeof offerCategories[number];
    targetAudience: string;
    price?: number;
    offerValueDetails: string;
    commissionRate: string;
    commissionType: "percentage" | "fixed_amount" | "hybrid" | "negotiable";
    contactPerson: string;
    contactNumber: string;
    keySellingPoints?: string;
    offerLink?: string;
    mediaUrl?: string;
    status: 'active' | 'paused' | 'draft' | 'completed' | 'expired' | 'flagged';
    postedDate: string; // ISO 8601 format
    expiresInDays?: number;
    views?: number;
    positiveResponseRate?: number;
    negativeResponseRate?: number;
    isDeletedByAdmin?: boolean;
    createdAt?: Timestamp | Date | FieldValue;
    updatedAt?: Timestamp | Date | FieldValue;
    // New fields for corporation subscription features
    corpFeatureSubscriptionStatus?: 'active' | 'inactive';
    corpFeatureSubscriptionType?: 'monthly' | 'yearly';
    corpFeatureSubscriptionEndsAt?: Timestamp | Date | string | null;
}

export type UserSalesOfferCommissionType = 'percentage_split' | 'fixed_fee' | 'lead_exchange' | 'service_swap' | 'custom_negotiable';

export interface UserSalesOffer {
  id?: string;
  creatorId: string;
  creatorName: string;
  creatorEmail: string; // For filtering out own user
  creatorAvatarSeed?: string;
  title: string;
  description: string;
  offerCategory: "Collaboration" | "Lead Sharing" | "Joint Venture" | "Service Exchange" | "Referral Program" | "Other";
  targetAudience: string;
  terms: string;
  commissionType?: UserSalesOfferCommissionType;
  commissionRateInput?: string; // Flexible input for various commission types
  contactNumber: string;
  status: 'active' | 'paused' | 'draft' | 'completed';
  postedDate: string;
  mediaUrl?: string;
  views?: number;
  positiveResponseRate?: number;
  negativeResponseRate?: number; // Added for consistency
  peerInterestCount?: number;
  isDeletedByAdmin?: boolean;
  createdAt?: Timestamp | Date | FieldValue;
  updatedAt?: Timestamp | Date | FieldValue;
}
