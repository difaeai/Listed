
"use client"; 

import type { Timestamp, FieldValue } from 'firebase/firestore';

export type AuthPageUserType = "company" | "professional" | "investor" | "admin";

export const investmentRangeOptions = ["Rs 0 - 1M", "1M - 5M", "5M - 10M", "10M - 50M", "50M Above"] as const;
export type InvestmentRangeType = typeof investmentRangeOptions[number];

export type UserStatus = 'active' | 'suspended' | 'pending_verification' | 'locked' | 'pending_payment_verification' | 'payment_proof_submitted';

export interface RegisteredUserEntry {
  uid: string; 
  email: string;
  type: AuthPageUserType;
  name?: string; 
  corporationName?: string; 
  investmentRange?: InvestmentRangeType; 
  status: UserStatus;
  phoneNumber?: string;
  gender?: 'male' | 'female' | 'other';
  
  subscriptionPaymentSubmittedAt?: Timestamp | Date | string | null; 
  paymentProofDataUri?: string | null; 
  subscriptionType?: 'monthly' | 'yearly' | null;
  subscriptionDurationInMonths?: number; 
  subscriptionExpiryDate?: Timestamp | Date | string | null; 
  previousSubscriptionDetails?: {
    type: 'monthly'; 
    expiryDate: Timestamp | Date | string; 
  } | null;
  referralCodeUsed?: string;

  profileDescription?: string;
  yearsExperience?: number;
  workingLeads?: number;
  avatarDataUri?: string | null; 
  investmentFocus?: string; 
  isInstitutionalInvestor?: boolean;

  createdAt: Timestamp | Date | string | FieldValue; 
  avatarSeed?: string; 
  updatedAt?: Timestamp | Date | string | FieldValue; 
  
  isDeletedByAdmin?: boolean; 
  blockedUsers?: string[]; 
  isOptedInCoFounder?: boolean; 
  optedInCoFounderAt?: Timestamp | Date | string | null;
  
  // Fields for admin-seeded investors
  isSeededInvestor?: boolean;
  isHiddenBySeeder?: boolean;
  
  // Fields for corporation subscription features
  corpFeatureSubscriptionStatus?: 'active' | 'inactive';
  corpFeatureSubscriptionType?: 'monthly' | 'yearly';
  corpFeatureSubscriptionEndsAt?: Timestamp | Date | string | null;
}

export type ComplaintType = "againstUser" | "platformIssue" | "featureRequest" | "other";
export type ComplaintStatus = "Pending" | "In Progress" | "Resolved" | "Closed";

export interface Complaint {
  id?: string; 
  complainantUid: string;
  complainantName: string;
  complainantEmail: string;
  complainantType: AuthPageUserType;
  complaintType: ComplaintType;
  targetUserIdentifier?: string; 
  subject: string;
  description: string;
  status: ComplaintStatus;
  createdAt: Timestamp | Date | string;
  updatedAt: Timestamp | Date | string;
  adminNotes?: Array<{
    note: string;
    adminId: string;
    adminName: string;
    timestamp: Timestamp | Date | string;
  }>;
}

export type InquiryType = "general_query" | "corporation_account_request" | "investor_account_request";
export type InquiryStatus = "New" | "In Progress" | "Resolved" | "Closed";

export interface Inquiry {
    id?: string; 
    name: string;
    email: string;
    inquiryType: InquiryType;
    subject?: string; 
    message: string;
    status: InquiryStatus;
    createdAt: Timestamp | Date | string;
    updatedAt: Timestamp | Date | string;
    isDeletedByAdmin?: boolean;
    adminNotes?: Array<{
        note: string;
        adminId: string;
        adminName: string;
        timestamp: Timestamp | Date | string;
    }>;
}
