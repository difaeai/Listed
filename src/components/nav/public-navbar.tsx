
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Zap, Menu, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { usePathname as useNextPathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { db } from '@/lib/firebaseConfig';
import { doc, onSnapshot } from "firebase/firestore";

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/education-partners', label: 'Educational Partners' },
  { href: '/success-stories', label: 'Success Stories' },
  { href: '/how-it-works', label: 'How to Use LISTED' },
  { href: '/about', label: 'About Us' },
  { href: '/contact', label: 'Contact' },
];

function useSafePathname() {
  const [pathname, setPathname] = useState<string | null>(null);
  const nextPathname = useNextPathname();

  useEffect(() => {
    setPathname(nextPathname);
  }, [nextPathname]);

  return pathname;
}

interface VisibilitySettings {
  enableSignupButton: boolean;
}

export function PublicNavbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = useSafePathname();
  const [visibility, setVisibility] = useState<VisibilitySettings>({ enableSignupButton: true });

  useEffect(() => {
    setIsMenuOpen(false); // Close menu on route change
  }, [pathname]);

  useEffect(() => {
    if (!db) return;

    const visibilityDocRef = doc(db, "siteContent", "signupVisibilitySettings");
    const unsubscribe = onSnapshot(visibilityDocRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            setVisibility({
                enableSignupButton: data.enableSignupButton !== false, // Default to true if undefined
            });
        }
    }, (error) => {
        console.error("Error fetching navbar visibility settings:", error);
    });

    return () => unsubscribe();
  }, []);

  if (pathname === null) {
    return null;
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 md:px-6 flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Zap className="h-7 w-7 text-primary" />
          <span className="text-xl font-bold text-foreground">LISTED</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className={cn(
                "text-muted-foreground transition-colors hover:text-primary",
                pathname === link.href && "text-primary font-semibold"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <Button variant="outline" asChild>
            <Link href="/auth?action=signin">Login</Link>
          </Button>
          {visibility.enableSignupButton && (
            <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <Link href="/auth?action=signup">Sign Up</Link>
            </Button>
          )}
        </div>

        {/* Mobile Menu Button */}
        <div className="md:hidden">
          <Button variant="ghost" size="icon" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            <span className="sr-only">Toggle menu</span>
          </Button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden absolute top-16 left-0 right-0 bg-background shadow-lg p-4 z-40 border-b">
          <nav className="flex flex-col gap-4">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className={cn(
                  "text-muted-foreground hover:text-primary py-2 text-center",
                  pathname === link.href && "text-primary font-semibold bg-muted rounded-md"
                )}
                onClick={() => setIsMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <Button variant="outline" asChild className="w-full mt-2">
              <Link href="/auth?action=signin" onClick={() => setIsMenuOpen(false)}>Login</Link>
            </Button>
            {visibility.enableSignupButton && (
              <Button asChild className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                <Link href="/auth?action=signup" onClick={() => setIsMenuOpen(false)}>Sign Up</Link>
              </Button>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
