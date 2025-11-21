
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth, db } from '@/lib/firebaseConfig';
import { doc, getDoc, Timestamp, onSnapshot } from 'firebase/firestore'; 
import type { RegisteredUserEntry } from '@/app/auth/components/auth-shared-types';

export interface AuthContextType {
  currentUser: RegisteredUserEntry | null;
  firebaseUserInternal: FirebaseUser | null;
  loading: boolean;
  setCurrentAppUser: (user: RegisteredUserEntry | null, firebaseUser: FirebaseUser | null) => void;
  setAdminIsCreatingUser: (status: boolean) => void; 
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUserInternal, setCurrentUserInternal] = useState<RegisteredUserEntry | null>(null);
  const [firebaseUserInternalState, setFirebaseUserInternalState] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth || !db) {
        console.warn("AuthContext: Firebase not ready.");
        setLoading(false);
        return;
    }
    
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      console.log(`[AuthContext] Auth state changed. User: ${firebaseUser?.uid || 'null'}`);
      setFirebaseUserInternalState(firebaseUser);

      if (firebaseUser) {
        let profileUnsubscribe: (() => void) | undefined;
        let attempts = 0;
        const maxAttempts = 5;
        const retryDelay = 1000; // 1 second

        const fetchUserProfile = () => {
          attempts++;
          console.log(`[AuthContext] Fetching profile for ${firebaseUser.uid}, attempt ${attempts}.`);
          const userDocRef = doc(db, "users", firebaseUser.uid);
          
          // Detach any previous listener before creating a new one
          if (profileUnsubscribe) {
            profileUnsubscribe();
          }

          profileUnsubscribe = onSnapshot(userDocRef, (docSnap) => {
            if (docSnap.exists()) {
              if (profileUnsubscribe) { // If we found the doc, stop retrying from the timer
                const timerId = (profileUnsubscribe as any)._timerId;
                if(timerId) clearTimeout(timerId);
              }

              const appUserProfile = docSnap.data() as Omit<RegisteredUserEntry, 'uid'>;
              const processTimestamp = (timestampField: any): string | undefined => {
                if (!timestampField) return undefined;
                if (timestampField instanceof Timestamp) return timestampField.toDate().toISOString();
                if (typeof timestampField === 'string') { const date = new Date(timestampField); return !isNaN(date.getTime()) ? date.toISOString() : undefined; }
                if (timestampField instanceof Date) return timestampField.toISOString();
                return undefined;
              };

              setCurrentUserInternal({
                  uid: firebaseUser.uid,
                  email: firebaseUser.email || appUserProfile.email,
                  name: appUserProfile.name || firebaseUser.displayName || "User",
                  type: appUserProfile.type,
                  status: appUserProfile.status,
                  corporationName: appUserProfile.corporationName,
                  investmentRange: appUserProfile.investmentRange,
                  phoneNumber: appUserProfile.phoneNumber,
                  createdAt: processTimestamp(appUserProfile.createdAt) || new Date().toISOString(),
                  updatedAt: processTimestamp(appUserProfile.updatedAt),
                  subscriptionPaymentSubmittedAt: processTimestamp(appUserProfile.subscriptionPaymentSubmittedAt),
                  paymentProofDataUri: appUserProfile.paymentProofDataUri || null,
                  subscriptionType: appUserProfile.subscriptionType || null,
                  subscriptionDurationInMonths: appUserProfile.subscriptionDurationInMonths,
                  subscriptionExpiryDate: processTimestamp(appUserProfile.subscriptionExpiryDate),
                  previousSubscriptionDetails: appUserProfile.previousSubscriptionDetails?.expiryDate ? { ...appUserProfile.previousSubscriptionDetails, expiryDate: processTimestamp(appUserProfile.previousSubscriptionDetails.expiryDate)! } : undefined,
                  profileDescription: appUserProfile.profileDescription,
                  yearsExperience: appUserProfile.yearsExperience,
                  workingLeads: appUserProfile.workingLeads,
                  avatarDataUri: appUserProfile.avatarDataUri || null,
                  avatarSeed: appUserProfile.avatarSeed,
                  isDeletedByAdmin: appUserProfile.isDeletedByAdmin,
                  investmentFocus: appUserProfile.investmentFocus,
                  blockedUsers: appUserProfile.blockedUsers,
                  isOptedInCoFounder: appUserProfile.isOptedInCoFounder,
                  optedInCoFounderAt: processTimestamp(appUserProfile.optedInCoFounderAt),
                  gender: appUserProfile.gender,
                  referralCodeUsed: appUserProfile.referralCodeUsed,
                  isHiddenBySeeder: appUserProfile.isHiddenBySeeder,
                  isSeededInvestor: appUserProfile.isSeededInvestor,
                  // New corporate feature fields
                  corpFeatureSubscriptionStatus: appUserProfile.corpFeatureSubscriptionStatus,
                  corpFeatureSubscriptionType: appUserProfile.corpFeatureSubscriptionType,
                  corpFeatureSubscriptionEndsAt: processTimestamp(appUserProfile.corpFeatureSubscriptionEndsAt),
              } as RegisteredUserEntry);
              console.log(`[AuthContext] Profile for ${firebaseUser.email} loaded/updated.`);
              setLoading(false);
            } else {
              console.warn(`[AuthContext] Firestore profile NOT FOUND for user ${firebaseUser.uid} on attempt ${attempts}.`);
              if (attempts < maxAttempts) {
                // @ts-ignore
                profileUnsubscribe._timerId = setTimeout(fetchUserProfile, retryDelay);
              } else {
                console.error(`[AuthContext] Failed to find profile for ${firebaseUser.uid} after ${maxAttempts} attempts. Logging out.`);
                setCurrentUserInternal(null);
                setLoading(false);
                auth.signOut(); // Force sign out if profile is consistently missing
              }
            }
          }, (error) => {
            console.error("[AuthContext] Error in profile onSnapshot:", error);
            setCurrentUserInternal(null);
            setLoading(false);
          });
        };

        fetchUserProfile();

        // Return the unsubscribe function for the profile listener
        return () => {
          if (profileUnsubscribe) {
            const timerId = (profileUnsubscribe as any)._timerId;
            if(timerId) clearTimeout(timerId);
            console.log(`[AuthContext] Unsubscribing from profile listener for ${firebaseUser.uid}`);
            profileUnsubscribe();
          }
        };

      } else {
        // No firebaseUser, so no profile to fetch.
        setCurrentUserInternal(null);
        setLoading(false);
        console.log("[AuthContext] No user logged in. State settled.");
      }
    });

    return () => {
        console.log("[AuthContext] Unsubscribing from auth state listener.");
        unsubscribeAuth();
    };
  }, []);

  const setCurrentAppUserWrapper = (appUser: RegisteredUserEntry | null, fbUser: FirebaseUser | null) => {
    setCurrentUserInternal(appUser);
    setFirebaseUserInternalState(fbUser);
  };

  const setAdminIsCreatingUser = (status: boolean) => {
    // Placeholder if needed
  };

  return (
    <AuthContext.Provider value={{ currentUser: currentUserInternal, firebaseUserInternal: firebaseUserInternalState, loading, setCurrentAppUser: setCurrentAppUserWrapper, setAdminIsCreatingUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
