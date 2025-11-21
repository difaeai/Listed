
"use client";

import React from 'react';
import { usePathname as useNextPathname } from 'next/navigation';
import { PublicNavbar } from '@/components/nav/public-navbar';
import { PublicFooter } from '@/components/nav/public-footer';
import { useAuth } from '@/contexts/AuthContext'; // Import useAuth

function usePathnameSafe() {
  const [mounted, setMounted] = React.useState(false);
  const pathname = useNextPathname();

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }
  return pathname;
}

const ConditionalRender: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [hidePublicElements, setHidePublicElements] = React.useState(false);
  const pathname = usePathnameSafe();
  const { currentUser: authUser, loading: authLoading } = useAuth();

  React.useEffect(() => {
    // console.log("[ConditionalRender] Pathname or Auth changed. Pathname:", pathname, "AuthLoading:", authLoading, "AuthUser:", !!authUser);
    if (authLoading && pathname !== null) { // If auth state is still loading on client, wait.
      return;
    }

    let shouldHide = false;
    if (authUser) { // If user is authenticated, always hide public nav/footer
      shouldHide = true;
      // console.log("[ConditionalRender] User is authenticated, hiding public elements.");
    } else if (pathname) { // If not authenticated, check path for app-specific routes
      shouldHide =
        pathname.startsWith('/dashboard') ||
        pathname.startsWith('/offers') ||
        pathname.startsWith('/investor') ||
        pathname.startsWith('/auth') || // Auth page has its own minimal structure
        pathname.startsWith('/admin');
      // console.log("[ConditionalRender] User not authenticated. Path-based hide:", shouldHide);
    } else if (pathname === null && typeof window !== 'undefined') {
      // Fallback for initial client render if pathname from hook isn't ready
      const currentWindowPath = window.location.pathname;
       shouldHide =
        currentWindowPath.startsWith('/dashboard') ||
        currentWindowPath.startsWith('/offers') ||
        currentWindowPath.startsWith('/investor') ||
        currentWindowPath.startsWith('/auth') ||
        currentWindowPath.startsWith('/admin');
    }
    
    setHidePublicElements(shouldHide);

  }, [pathname, authUser, authLoading]);

  // To prevent flicker during initial auth check, especially if default is to show.
  // If still loading auth on the client, and we haven't decided to hide yet based on path,
  // it might be better to render nothing until auth state is confirmed.
  if (authLoading && pathname !== null && !hidePublicElements) {
    // console.log("[ConditionalRender] Auth is loading, path indicates public, but deferring render.");
    return null;
  }

  if (hidePublicElements) {
    // console.log("[ConditionalRender] Not rendering children. hidePublicElements:", hidePublicElements);
    return null;
  }

  // console.log("[ConditionalRender] Rendering children. hidePublicElements:", hidePublicElements);
  return <>{children}</>;
};


export function ConditionalPublicNavbarWrapper() {
  return (
    <ConditionalRender>
      <PublicNavbar />
    </ConditionalRender>
  );
}

export function ConditionalPublicFooterWrapper() {
  return (
    <ConditionalRender>
      <PublicFooter />
    </ConditionalRender>
  );
}
