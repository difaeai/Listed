
"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import Image from 'next/image';
import { Building, CheckCircle, Loader2, Link as LinkIcon, Mail, Phone, Facebook, Instagram, Linkedin, UserCircle } from 'lucide-react';
import { db } from '@/lib/firebaseConfig';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Separator } from '@/components/ui/separator';

interface EducationalPartner {
  id: string;
  name: string;
  description: string;
  logoUrl: string;
  hasBlueBadge: boolean;
  contactPerson?: string;
  contactEmail?: string;
  website?: string;
  facebookUrl?: string;
  instagramUrl?: string;
  linkedinUrl?: string;
  snapchatUrl?: string;
}

const SocialIcon = ({ handle, url, children }: { handle: string; url?: string; children: React.ReactNode }) => {
  if (!url) return null;
  const finalUrl = handle === 'snapchat' ? `https://www.snapchat.com/add/${url}` : url;
  return (
    <a href={finalUrl} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
      {children}
    </a>
  );
};

function PartnerCard({ partner }: { partner: EducationalPartner }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Card className="flex flex-col text-center shadow-lg hover:shadow-2xl transition-shadow duration-300 rounded-2xl border-2 border-transparent hover:border-primary/50 bg-card p-6 cursor-pointer group">
          <div className="relative mb-4 mx-auto">
              <Image
                  src={partner.logoUrl}
                  alt={`${partner.name} logo`}
                  width={128}
                  height={128}
                  className="rounded-full object-cover h-32 w-32 border-4 border-background shadow-md group-hover:scale-105 transition-transform duration-300"
                  data-ai-hint="partner logo"
              />
              {partner.hasBlueBadge && (
                  <div className="absolute -bottom-1 -right-1 bg-blue-500 rounded-full p-1.5 border-4 border-card">
                      <CheckCircle className="h-6 w-6 text-white"/>
                  </div>
              )}
          </div>
          <CardHeader className="p-0">
              <CardTitle className="text-xl text-foreground group-hover:text-primary transition-colors">{partner.name}</CardTitle>
          </CardHeader>
          <CardContent className="flex-grow pt-2">
              <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">{partner.description}</p>
          </CardContent>
          <CardFooter className="pt-4 mt-auto">
            <Button variant="outline" size="sm" className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors">View Details</Button>
          </CardFooter>
        </Card>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex flex-col items-center text-center mb-4">
            <div className="relative mb-4">
              <Image
                src={partner.logoUrl}
                alt={`${partner.name} logo`}
                width={100}
                height={100}
                className="rounded-full object-contain h-28 w-28 border-4 border-muted"
                data-ai-hint="partner logo large"
              />
               {partner.hasBlueBadge && (
                <div className="absolute -bottom-0 -right-0 bg-blue-500 rounded-full p-1 border-2 border-background">
                  <CheckCircle className="h-5 w-5 text-white"/>
                </div>
              )}
            </div>
            <DialogTitle className="text-2xl">{partner.name}</DialogTitle>
            <DialogDescription>{partner.description}</DialogDescription>
          </div>
        </DialogHeader>
        <Separator />
        <div className="py-4 space-y-3 text-sm">
          {partner.contactPerson && (
            <div className="flex items-center gap-2">
              <UserCircle className="h-4 w-4 text-muted-foreground"/>
              <strong>Contact:</strong> {partner.contactPerson}
            </div>
          )}
          {partner.contactEmail && (
            <div className="flex items-center gap-2">
               <Mail className="h-4 w-4 text-muted-foreground"/>
              <strong>Email:</strong> <a href={`mailto:${partner.contactEmail}`} className="text-primary hover:underline">{partner.contactEmail}</a>
            </div>
          )}
          {partner.website && (
             <div className="flex items-center gap-2">
               <LinkIcon className="h-4 w-4 text-muted-foreground"/>
              <strong>Website:</strong> <a href={partner.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate">{partner.website}</a>
            </div>
          )}
        </div>
        <Separator />
         <div className="flex justify-center items-center space-x-6 py-4">
           <SocialIcon handle="facebook" url={partner.facebookUrl}><Facebook className="h-6 w-6" /></SocialIcon>
           <SocialIcon handle="instagram" url={partner.instagramUrl}><Instagram className="h-6 w-6" /></SocialIcon>
           <SocialIcon handle="linkedin" url={partner.linkedinUrl}><Linkedin className="h-6 w-6" /></SocialIcon>
           {partner.snapchatUrl && <SocialIcon handle="snapchat" url={partner.snapchatUrl}><svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 fill-current"><title>Snapchat</title><path d="M23.882 18.025c-1.38-2.09-4.838-3.41-8.733-3.41-1.393 0-2.678.21-3.83.585.01-1.666.01-3.332.01-5.01 0-1.077.34-1.923.95-2.585.604-.663 1.483-1.018 2.592-1.018 1.15 0 2.063.355 2.68 1.018.618.662.956 1.508.956 2.585 0 .973-.008 1.94-.008 2.912h4.22c.007-1.33.007-2.66.007-4 0-2.316-1.03-4.32-2.8-5.71-1.77-1.39-4-2.12-6.57-2.12-2.568 0-4.794.73-6.563 2.12-1.77 1.39-2.793 3.394-2.793 5.71v9.33c0 2.316 1.023 4.32 2.793 5.71 1.77 1.39 3.996 2.12 6.564 2.12 2.57 0 4.8-.73 6.57-2.12 1.77-1.39 2.8-3.394 2.8-5.71.002-.554.002-1.108.002-1.662 1.15-.375 2.438-.585 3.83-.585 3.896 0 7.355 1.32 8.734 3.41.428.647.936 1.96 0 2.606-.935.645-2.222-.5-3.32-.5s-2.073.5-3.172.5-2.222-1.146-3.32-1.146-2.073 1.146-3.172 1.146c-1.1 0-2.222-1.146-3.32-1.146s-2.074.5-3.173.5-2.222-1.146-3.32-1.146s2.074-.5 3.173-.5c1.1 0 2.222 1.146 3.32 1.146 1.28 0 2.44-.696 3.12-1.76.936-.645 2.222.5 3.32.5s2.073-.5 3.172-.5c1.1 0 2.222 1.146 3.32 1.146 1.28 0 2.44-.696 3.12-1.76a4.232 4.232 0 0 0 .05-3.414z"/></svg></SocialIcon>}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


export default function EducationalPartnersPage() {
  const [partners, setPartners] = useState<EducationalPartner[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const partnersQuery = query(collection(db, "educationalPartners"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(partnersQuery, (snapshot) => {
      const fetchedPartners = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as EducationalPartner));
      setPartners(fetchedPartners);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching partners:", error);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="py-12 md:py-20 bg-muted/20">
      <div className="container mx-auto px-4 md:px-6">
        <section className="text-center mb-16 md:mb-20">
           <div className="inline-block bg-primary/10 p-4 rounded-full mb-6">
            <Building className="h-16 w-16 text-primary" />
           </div>
           <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground mb-6">
             Our Educational Partners
           </h1>
           <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
             We are proud to collaborate with leading educational institutions to foster innovation and empower the next generation of entrepreneurs.
           </p>
        </section>

        <section>
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
          ) : partners.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {partners.map(partner => (
                <PartnerCard key={partner.id} partner={partner} />
              ))}
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-16">
              <Building className="mx-auto h-16 w-16 mb-4 text-primary/20" />
              <p className="text-lg font-semibold">No partners to display.</p>
              <p>Check back soon to see our list of collaborating institutions.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
