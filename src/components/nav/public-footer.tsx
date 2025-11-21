import Link from 'next/link';
import { Zap, Twitter, Facebook, Linkedin, Instagram } from 'lucide-react';

export function PublicFooter() {
  return (
    <footer className="border-t bg-muted/20">
      <div className="container mx-auto px-4 md:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div>
            <Link href="/" className="flex items-center gap-2 mb-4">
              <Zap className="h-7 w-7 text-primary" />
              <span className="text-xl font-bold text-foreground">LISTED</span>
            </Link>
            <p className="text-sm text-muted-foreground">
              Connecting businesses, sales professionals, and investors.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-foreground mb-3">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/about" className="text-muted-foreground hover:text-primary">About Us</Link></li>
              <li><Link href="/how-it-works" className="text-muted-foreground hover:text-primary">How It Works</Link></li>
              <li><Link href="/contact" className="text-muted-foreground hover:text-primary">Contact</Link></li>
              <li><Link href="/auth" className="text-muted-foreground hover:text-primary">Login / Sign Up</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-foreground mb-3">Legal</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/terms" className="text-muted-foreground hover:text-primary">Terms of Service</Link></li>
              <li><Link href="/privacy" className="text-muted-foreground hover:text-primary">Privacy Policy</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-foreground mb-3">Connect With Us</h3>
            <div className="flex space-x-4">
              <Link href="https://x.com/listednow_" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary"><Twitter className="h-5 w-5" /></Link>
              <Link href="https://www.facebook.com/ListedPakistan" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary"><Facebook className="h-5 w-5" /></Link>
              <Link href="https://www.linkedin.com/company/listedd" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary"><Linkedin className="h-5 w-5" /></Link>
              <Link href="https://www.instagram.com/listednow_" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary"><Instagram className="h-5 w-5" /></Link>
              <Link href="https://www.tiktok.com/@listednow_" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 448 512"
                  fill="currentColor"
                  className="h-5 w-5"
                >
                  <path d="M448 209.9a210.1 210.1 0 0 1 -122.8-39.25V349.4a162.6 162.6 0 1 1 -185-188.3v89.8a74.6 74.6 0 1 0 52.2 71.2V0l88 0a121.2 121.2 0 0 0 1.9 22.2h0A122.2 122.2 0 0 0 381 102.4a121.4 121.4 0 0 0 67 20.1z" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
        <div className="border-t pt-8 text-center">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} LISTED Platform. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
