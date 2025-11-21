

"use client";

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Zap, Briefcase, Users, Landmark, ArrowRight, Lightbulb, TrendingUp, CheckCircle, XCircle, FileSignature, BookOpen, UserPlus, Network, MessageSquare, Handshake, Loader2, Info, Video, Megaphone, X as XIcon, Percent, Phone, Mail, ImageIcon, ArrowLeft, Globe, Building, ShoppingCart } from 'lucide-react';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext'; 
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '@/lib/firebaseConfig';
import { doc, getDoc, onSnapshot, collection, query, orderBy } from 'firebase/firestore';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { HomeCarousel, type HomeSlide } from '@/components/common/home-carousel';
import { InvestorPlanSelector } from '@/components/common/investor-plan-selector';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BreakingNewsTicker } from '@/components/common/breaking-news-ticker';

type PlanKey = 'silver' | 'gold' | 'platinum' | 'royal';

interface PlanDetails {
    title: string;
    investorAccess: string;
    features: string[];
    className: string;
    priceKey: PlanKey;
}

interface PricingData {
    silver: number;
    gold: number;
    platinum: number;
    royal: number;
    dollarRate: number;
    currencySymbol: string;
}

type BusinessType = 'online' | 'offline';
const onlineBusinessCategories = ["Drop Shipping", "White Label Products", "Affiliate Marketing", "Content Creation (Blogging/Vlogging)", "SaaS (Software as a Service)", "Online Courses/EdTech", "Digital Marketing Agency", "E-commerce Store (Own Product)", "Other"];

const FlagPakistan = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 600" width="20" height="15"><rect fill="#fff" width="900" height="600"/><rect fill="#006643" x="225" width="675" height="600"/><circle fill="#fff" cx="581.25" cy="300" r="131.25"/><path fill="#006643" d="M601.875,300a112.5,112.5 0 1,0 0,0.001z"/><path fill="#fff" d="M649.125 258.1875l-42.334 26.175l16.1725 42.334l-42.334-26.1732l-26.175 42.334l26.1732-42.334l-42.334-26.175l42.334 26.1732z"/></svg>;
const FlagUAE = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 600" width="20" height="15"><rect fill="#00732f" width="1200" height="600"/><rect fill="#fff" y="200" width="1200" height="200"/><rect fill="#000" y="400" width="1200" height="200"/><rect fill="#f00" width="300" height="600"/></svg>;
const FlagSaudiArabia = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400" width="20" height="15"><rect fill="#006c35" width="600" height="400"/><text fill="#fff" font-family="sans-serif" font-size="85" y="200" x="300" text-anchor="middle">لَا إِلٰهَ إِلَّا الله، مُحَمَّدٌ رَسُوْلُ الله</text><rect fill="#fff" x="100" y="280" width="400" height="20" transform="rotate(2 300 290)"/><rect fill="#fff" x="100" y="280" width="400" height="20" transform="rotate(-2 300 290)"/><path fill="#fff" d="M120 320 L100 300 L480 300 L500 320 Z"/></svg>;
const FlagUSA = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1235 650" width="20" height="15"><path fill="#BF0A30" d="M0 0h1235v650H0z"/><path fill="#FFF" d="M0 50h1235v50H0zm0 100h1235v50H0zm0 100h1235v50H0zm0 100h1235v50H0zm0 100h1235v50H0zm0 100h1235v50H0z"/><path fill="#002868" d="M0 0h494v350H0z"/><path fill="#FFF" d="M41.16 29.16l12.7 38.97 32.7-24.08-24.08 32.7 38.97-12.7-12.7 38.97L121.45 70l-38.97-12.7 12.7-38.97-32.7 24.08zM123.5 29.16l12.7 38.97 32.7-24.08-24.08 32.7 38.97-12.7-12.7 38.97L216.45 70l-38.97-12.7 12.7-38.97-32.7 24.08zM205.84 29.16l12.7 38.97 32.7-24.08-24.08 32.7 38.97-12.7-12.7 38.97L309.15 70l-38.97-12.7 12.7-38.97-32.7 24.08zM288.18 29.16l12.7 38.97 32.7-24.08-24.08 32.7 38.97-12.7-12.7 38.97L401.85 70l-38.97-12.7 12.7-38.97-32.7 24.08zM370.52 29.16l12.7 38.97 32.7-24.08-24.08 32.7 38.97-12.7-12.7 38.97L484.55 70l-38.97-12.7 12.7-38.97-32.7 24.08zM82.33 87.5l12.7 38.97 32.7-24.08-24.08 32.7 38.97-12.7-12.7 38.97L164.12 140l-38.97-12.7 12.7-38.97-32.7 24.08zM164.67 87.5l12.7 38.97 32.7-24.08-24.08 32.7 38.97-12.7-12.7 38.97L256.82 140l-38.97-12.7 12.7-38.97-32.7 24.08zM247.01 87.5l12.7 38.97 32.7-24.08-24.08 32.7 38.97-12.7-12.7 38.97L349.52 140l-38.97-12.7 12.7-38.97-32.7 24.08zM329.35 87.5l12.7 38.97 32.7-24.08-24.08 32.7 38.97-12.7-12.7 38.97L432.22 140l-38.97-12.7 12.7-38.97-32.7 24.08zM41.16 145.84l12.7 38.97 32.7-24.08-24.08 32.7 38.97-12.7-12.7 38.97L121.45 210l-38.97-12.7 12.7-38.97-32.7 24.08zM123.5 145.84l12.7 38.97 32.7-24.08-24.08 32.7 38.97-12.7-12.7 38.97L216.45 210l-38.97-12.7 12.7-38.97-32.7 24.08zM205.84 145.84l12.7 38.97 32.7-24.08-24.08 32.7 38.97-12.7-12.7 38.97L309.15 210l-38.97-12.7 12.7-38.97-32.7 24.08zM288.18 145.84l12.7 38.97 32.7-24.08-24.08 32.7 38.97-12.7-12.7 38.97L401.85 210l-38.97-12.7 12.7-38.97-32.7 24.08zM370.52 145.84l12.7 38.97 32.7-24.08-24.08 32.7 38.97-12.7-12.7 38.97L484.55 210l-38.97-12.7 12.7-38.97-32.7 24.08zM82.33 204.16l12.7 38.97 32.7-24.08-24.08 32.7 38.97-12.7-12.7 38.97L164.12 280l-38.97-12.7 12.7-38.97-32.7 24.08zM164.67 204.16l12.7 38.97 32.7-24.08-24.08 32.7 38.97-12.7-12.7 38.97L256.82 280l-38.97-12.7 12.7-38.97-32.7 24.08zM247.01 204.16l12.7 38.97 32.7-24.08-24.08 32.7 38.97-12.7-12.7 38.97L349.52 280l-38.97-12.7 12.7-38.97-32.7 24.08zM329.35 204.16l12.7 38.97 32.7-24.08-24.08 32.7 38.97-12.7-12.7 38.97L432.22 280l-38.97-12.7 12.7-38.97-32.7 24.08zM41.16 262.5l12.7 38.97 32.7-24.08-24.08 32.7 38.97-12.7-12.7 38.97L121.45 350l-38.97-12.7 12.7-38.97-32.7 24.08zM123.5 262.5l12.7 38.97 32.7-24.08-24.08 32.7 38.97-12.7-12.7 38.97L216.45 350l-38.97-12.7 12.7-38.97-32.7 24.08zM205.84 262.5l12.7 38.97 32.7-24.08-24.08 32.7 38.97-12.7-12.7 38.97L309.15 350l-38.97-12.7 12.7-38.97-32.7 24.08zM288.18 262.5l12.7 38.97 32.7-24.08-24.08 32.7 38.97-12.7-12.7 38.97L401.85 350l-38.97-12.7 12.7-38.97-32.7 24.08zM370.52 262.5l12.7 38.97 32.7-24.08-24.08 32.7 38.97-12.7-12.7 38.97L484.55 350l-38.97-12.7 12.7-38.97-32.7 24.08z"/></svg>;
const FlagNorway = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 22 16" width="20" height="15"><path fill="#ba0c2f" d="M0 0h22v16H0z"/><path fill="#fff" d="M6 0h4v16H6zM0 6h22v4H0z"/><path fill="#00205b" d="M7 0h2v16H7zM0 7h22v2H0z"/></svg>;
const FlagLuxembourg = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 600" width="20" height="15"><path fill="#EA2F44" d="M0 0h1000v200H0z"/><path fill="#FFFFFF" d="M0 200h1000v200H0z"/><path fill="#00A3E0" d="M0 400h1000v200H0z"/></svg>;
const FlagQatar = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 11" width="20" height="15"><path fill="#8d1b3d" d="M0 0h28v11H0z"/><path fill="#fff" d="M0 0h3l1 1-1 1 1 1-1 1 1 1-1 1 1 1-1 1 1 1-1 1 1 1h22V0H3z"/></svg>;
const FlagUK = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 30" width="20" height="15"><clipPath id="a"><path d="M0 0v30h60V0z"/></clipPath><path d="M0 0v30h60V0z" fill="#00247d"/><path d="M0 0l60 30m-60 0L60 0" stroke="#fff" stroke-width="6"/><path d="M0 0l60 30m-60 0L60 0" clip-path="url(#a)" stroke="#cf142b" stroke-width="4"/><path d="M30 0v30M0 15h60" stroke="#fff" stroke-width="10"/><path d="M30 0v30M0 15h60" stroke="#cf142b" stroke-width="6"/></svg>;
const FlagMauritius = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400" width="20" height="15"><path fill="#EA2F44" d="M0 0h600v100H0z"/><path fill="#00A3E0" d="M0 100h600v100H0z"/><path fill="#FFD200" d="M0 200h600v100H0z"/><path fill="#007A33" d="M0 300h600v100H0z"/></svg>;
const FlagSingapore = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 120" width="20" height="15"><path fill="#EE2536" d="M0 0h180v60H0z"/><path fill="#FFFFFF" d="M0 60h180v60H0z"/><path fill="#FFFFFF" d="M54.9 13.5c-5.7 0-10.4 4.7-10.4 10.4 0 .9.1 1.7.4 2.5-.5.1-1 .2-1.5.2-6.5 0-11.8-5.3-11.8-11.8C32 8.3 37.3 3 43.8 3c.5 0 1 .1 1.5.2-1.2-.9-2.5-1.5-4-1.5z"/><path fill="#FFFFFF" d="M53 14.5l-2 6h6l-2-6-2 6zM61 24.5l-2 6h6l-2-6-2 6zM53 34.5l-2 6h6l-2-6-2 6zM45 24.5l-2 6h6l-2-6-2 6zM57 29.5l6-2-6-2-2 6z"/></svg>;

const countries = [
    { name: "Pakistan", investors: 25, flag: <FlagPakistan /> },
    { name: "United Arab Emirates", investors: 11, flag: <FlagUAE /> },
    { name: "Saudi Arabia", investors: 12, flag: <FlagSaudiArabia /> },
    { name: "United States", investors: 19, flag: <FlagUSA /> },
    { name: "Norway", investors: 8, flag: <FlagNorway /> },
    { name: "Luxembourg", investors: 5, flag: <FlagLuxembourg /> },
    { name: "Qatar", investors: 16, flag: <FlagQatar /> },
    { name: "United Kingdom", investors: 20, flag: <FlagUK /> },
    { name: "Mauritius", investors: 7, flag: <FlagMauritius /> },
    { name: "Singapore", investors: 4, flag: <FlagSingapore /> },
];

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <Card className="shadow-lg hover:shadow-xl transition-shadow h-full text-center border">
        <CardHeader className="items-center">
            <div className="p-4 bg-primary/10 rounded-full mb-3 inline-block">
                {icon}
            </div>
            <CardTitle className="text-xl font-bold text-foreground">{title}</CardTitle>
        </CardHeader>
        <CardContent className="flex-grow">
            <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
        </CardContent>
    </Card>
  );
}

const successStories = [
    { title: "Dhirubhai Ambani", company: "Reliance Industries", website: "https://www.ril.com", description: "From a yarn trader in a small office, he built Reliance Industries into India's largest conglomerate, a company now worth over $240 billion." },
    { title: "Malik Riaz Hussain", company: "Bahria Town", website: "https://bahriatown.com/", description: "Starting as a clerk, Malik Riaz created Bahria Town, one of Asia's largest private real estate developers with projects valued in the billions." },
    { title: "Jan Koum", company: "WhatsApp", website: "https://www.whatsapp.com", description: "An immigrant from Ukraine living on food stamps, he co-created WhatsApp, which was later acquired by Facebook for an astounding $19 billion." },
    { title: "Vineeta Singh", company: "Sugar Cosmetics", website: "https://in.sugarcosmetics.com", description: "Rejecting a high-paying job offer, she built Sugar Cosmetics from the ground up, creating a direct-to-consumer beauty brand now valued at over $500 million." },
    { title: "Monis Rahman", company: "Rozee.pk", website: "https://www.rozee.pk", description: "He created Rozee.pk, Pakistan's leading online employment platform connecting millions with opportunities, building a company valued in the millions of dollars." },
    { title: "Oprah Winfrey", company: "OWN Network", website: "https://www.oprah.com/app/own-tv.html", description: "Born into poverty, Oprah Winfrey overcame immense adversity to build a media empire, becoming a self-made billionaire with a net worth over $2.8 billion." },
    { title: "Aman Gupta", company: "boAt", website: "https://www.boat-lifestyle.com", description: "He co-founded boAt with a vision for affordable, high-quality audio products. Today, it's a dominant brand in India valued at over $1.4 billion." },
    { title: "Mudassir Sheikha", company: "Careem", website: "https://www.careem.com", description: "A Pakistani consultant, Mudassir co-founded Careem, the Middle East's first unicorn, which was ultimately acquired by Uber for a massive $3.1 billion." },
    { title: "Richard Branson", company: "Virgin Group", website: "https://www.virgin.com", description: "A school dropout with dyslexia, he started a student magazine, then a record store, which evolved into the multi-billion dollar Virgin Group conglomerate." },
    { title: "Kiran Mazumdar-Shaw", company: "Biocon", website: "https://www.biocon.com", description: "She started Biocon in her garage with just Rs. 10,000. It's now India's largest biopharmaceutical company with a multi-billion dollar market cap." },
    { title: "Salman Saeed", company: "PakWheels", website: "https://www.pakwheels.com", description: "Two friends launched PakWheels from a small room; it grew to become Pakistan's #1 automotive portal, attracting millions in investment." },
    { title: "Elon Musk", company: "Tesla, SpaceX", website: "https://www.tesla.com", description: "An immigrant from South Africa, he co-founded PayPal, then risked it all on SpaceX and Tesla, becoming one of the wealthiest people on the planet with a net worth over $200 billion." },
    { title: "Anupam Mittal", company: "Shaadi.com", website: "https://www.shaadi.com", description: "He launched one of the world's first online matrimony sites, Shaadi.com, fundamentally changing arranged marriages in India and building a massive business." },
    { title: "Jehan Ara", company: "Nest I/O", website: null, description: "A trailblazer in Pakistan's tech scene, she spearheaded Nest I/O, a premier tech incubator that has nurtured countless successful startups and shaped the ecosystem." },
    { title: "Ralph Lauren", company: "Ralph Lauren Corporation", website: "https://www.ralphlauren.com", description: "The son of immigrants, he started by selling ties out of a drawer and built a global fashion empire synonymous with American style, worth over $7 billion." },
    { title: "Peyush Bansal", company: "Lenskart", website: "https://www.lenskart.com", description: "He co-founded Lenskart to solve vision correction problems, growing it into an omnichannel eyewear platform valued at over $4.5 billion." },
    { title: "Ayesha Chundrigar", company: "ACF Animal Rescue", website: "https://www.acfanimalrescue.org", description: "She started Pakistan's first-ever animal shelter, ACF Animal Rescue, with a vision to rescue and rehabilitate street animals, creating a massive social impact." },
    { title: "Steve Jobs", company: "Apple Inc.", website: "https://www.apple.com", description: "From a garage, Steve Jobs co-founded Apple, eventually building one of the world's most valuable companies, worth trillions of dollars." },
    { title: "Ritesh Agarwal", company: "OYO Rooms", website: "https://www.oyorooms.com", description: "At 19, he dropped out of college to start OYO with a small grant. Today, OYO is a global hospitality giant, once valued at $10 billion." },
    { title: "Abdul Razak Dawood", company: "Descon", website: "https://www.descon.com", description: "With a small loan, he started Descon, now a major Pakistani conglomerate with operations across the globe and revenues in the hundreds of millions of dollars." },
    { title: "Daymond John", company: "FUBU", website: "https://fubu.com", description: "He started making hats in his mother's basement. His brand, FUBU, became a fashion phenomenon, and he is now a celebrated multi-millionaire investor." },
    { title: "Falguni Nayar", company: "Nykaa", website: "https://www.nykaa.com", description: "Leaving a banking career at 50, she started Nykaa, building it into India's premier beauty e-commerce destination and becoming a self-made billionaire." },
    { title: "Shahid Balwa", company: "DB Realty", website: "https://www.dbrealty.co.in", description: "Starting with a small hotel, he ventured into real estate and co-founded DB Realty, a major player in Mumbai's property market worth billions." },
    { title: "Sam Walton", company: "Walmart", website: "https://www.walmart.com", description: "He started with a single dime store in a small town and his relentless focus on low prices built Walmart into the world's largest retailer, a trillion-dollar enterprise." },
    { title: "Bhavish Aggarwal", company: "Ola Cabs", website: "https://www.olacabs.com", description: "Frustrated by a bad taxi experience, he co-founded Ola Cabs, which became one of the world's largest ride-hailing companies, valued at over $7 billion." },
    { title: "Mohed Altrad", company: "Altrad Group", website: "https://www.altrad.com", description: "An orphan from a Syrian Bedouin tribe, he moved to France with no money, earned a PhD, and built Altrad Group into a world leader in construction equipment with over a billion in revenue." },
    { title: "Byju Raveendran", company: "BYJU'S", website: "https://byjus.com", description: "A teacher who started helping friends, he took his classes online. Today, BYJU'S is an ed-tech behemoth, once valued at $22 billion." },
    { title: "Fiza Farhan", company: "Buksh Foundation", website: null, description: "Passionate about social change, she co-founded Buksh Foundation, bringing clean energy solutions to impoverished rural areas of Pakistan and gaining global recognition." },
];

function SuccessStoryMarquee() {
  const storiesWithLogos = successStories.filter(s => s.website); // Filter for stories that can have logos
  const duplicatedStories = [...storiesWithLogos, ...storiesWithLogos];

  return (
    <div className="w-full inline-flex flex-nowrap overflow-hidden [mask-image:_linear-gradient(to_right,transparent_0,_black_128px,_black_calc(100%-200px),transparent_100%)]">
      <ul className="flex items-center justify-center md:justify-start [&_li]:mx-8 [&_img]:max-w-none animate-infinite-scroll">
        {duplicatedStories.map((story, index) => (
          <li key={index} className="flex-shrink-0">
             <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <a href={story.website ?? '#'} target="_blank" rel="noopener noreferrer" className="grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all duration-300">
                    <Image
                      src={`https://logo.clearbit.com/${new URL(story.website!).hostname}`}
                      alt={`${story.company} Logo`}
                      width={120}
                      height={50}
                      className="object-contain"
                      unoptimized // Important for external dynamic URLs
                    />
                  </a>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs text-center bg-card">
                  <p className="font-bold">{story.title} ({story.company})</p>
                  <p className="text-xs text-muted-foreground">{story.description}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </li>
        ))}
      </ul>
    </div>
  );
}

interface EducationalPartner {
  id: string;
  name: string;
  logoUrl: string;
}

function EducationalPartnersMarquee() {
  const [partners, setPartners] = useState<EducationalPartner[]>([]);

  useEffect(() => {
    if (!db) return;
    const partnersQuery = query(collection(db, "educationalPartners"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(partnersQuery, (snapshot) => {
      const fetchedPartners = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as EducationalPartner));
      setPartners(fetchedPartners);
    });
    return () => unsubscribe();
  }, []);

  if (partners.length === 0) {
    return null; // Don't render the section if there are no partners
  }

  return (
    <section className="py-12 bg-background" aria-labelledby="educational-partners-heading">
      <div className="container mx-auto px-4">
        <h2 id="educational-partners-heading" className="text-2xl font-bold text-center text-foreground mb-4">Our Educational Partners</h2>
        <p className="text-center text-muted-foreground mb-8 max-w-2xl mx-auto">Collaborating with leading institutions to foster the next generation of entrepreneurs.</p>
        <div className="w-full inline-flex flex-nowrap overflow-hidden [mask-image:_linear-gradient(to_right,transparent_0,_black_128px,_black_calc(100%-200px),transparent_100%)]">
          <ul className="flex items-center justify-center md:justify-start [&_li]:mx-8 animate-fast-infinite-scroll-single">
            {partners.map((partner, index) => (
              <li key={index} className="flex-shrink-0">
                 <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Image
                        src={partner.logoUrl}
                        alt={`${partner.name} Logo`}
                        width={140}
                        height={60}
                        className="object-contain opacity-90 hover:opacity-100 transition-opacity duration-300"
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{partner.name}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function getYoutubeEmbedUrl(url: string): string | null {
  if (!url) return null;
  let videoId = null;

  try {
    const urlObj = new URL(url);
    if (urlObj.hostname === 'www.youtube.com' || urlObj.hostname === 'youtube.com') {
      videoId = urlObj.searchParams.get('v');
    } else if (urlObj.hostname === 'youtu.be') {
      videoId = urlObj.pathname.substring(1);
    }
  } catch (e) {
    const regex = /(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = url.match(regex);
    if (match) videoId = match[1];
  }
  
  if (videoId) {
    return `https://www.youtube.com/embed/${videoId}`;
  }
  
  if (url.includes('/embed/')) {
    const embedIdMatch = url.match(/\/embed\/([a-zA-Z0-9_-]{11})/);
    if(embedIdMatch && embedIdMatch[1]){
      return `https://www.youtube.com/embed/${embedIdMatch[1]}`;
    }
  }

  return null;
}

function HomePagePlanSelector() {
    const [businessType, setBusinessType] = useState<BusinessType | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
    const [selectedCountryInvestors, setSelectedCountryInvestors] = useState<number | null>(null);
    const [selectedPlan, setSelectedPlan] = useState<PlanKey | null>(null);
    const [selectedMonths, setSelectedMonths] = useState<number>(0);
    const [pricing, setPricing] = useState<PricingData>({ silver: 10, gold: 13, platinum: 16, royal: 18, dollarRate: 283, currencySymbol: '$' });
    const [isLoadingPricing, setIsLoadingPricing] = useState(true);

    const planDetailsData: { [key in PlanKey]: { title: string; investorAccess: string; priceKey: PlanKey } } = {
        silver: { title: "Silver - (Investors of 2.5 million)", investorAccess: "Investors of 2.5 Million", priceKey: 'silver' },
        gold: { title: "Gold - (Investors of 5 million)", investorAccess: "Investors of 5 Million", priceKey: 'gold' },
        platinum: { title: "Platinum - (Investors of 10 million)", investorAccess: "Investors of 10 Million", priceKey: 'platinum' },
        royal: { title: "Royal - (Investors of 50 million & above)", investorAccess: "Investors of 50 Million+", priceKey: 'royal' },
    };

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

    const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

    useEffect(() => {
        setSelectedMonths(billingCycle === 'yearly' ? 12 : selectedMonths === 12 ? 1 : selectedMonths);
    }, [billingCycle, selectedMonths]);

    const isProceedEnabled = businessType !== null && (
        (businessType === 'offline' && selectedCountry !== null && selectedPlan !== null && (billingCycle === 'yearly' || selectedMonths > 0)) ||
        (businessType === 'online' && selectedCategory !== null && selectedPlan !== null && (billingCycle === 'yearly' || selectedMonths > 0))
    );
    
    const calculateTotalPrice = () => {
        if (!selectedPlan || !pricing) return { main: 0, pkr: 0 };
        const pricePerMonth = pricing[selectedPlan];
        let total = 0;
        if (billingCycle === 'yearly') {
            total = pricePerMonth * 12 * 0.8;
        } else {
            total = pricePerMonth * selectedMonths;
        }
        const pkrTotal = total * pricing.dollarRate;
        return { main: total, pkr: pkrTotal };
    };
    
    const { main: totalPriceMain, pkr: totalPricePKR } = calculateTotalPrice();
    const currencySymbol = pricing ? pricing.currencySymbol || '$' : '$';


    const handleBusinessTypeChange = (type: BusinessType) => {
        setBusinessType(type);
        setSelectedCategory(null);
        setSelectedCountry(null);
        setSelectedCountryInvestors(null);
        setSelectedPlan(null);
        setSelectedMonths(0);
    };

    const handleCountryChange = (countryName: string) => {
        const country = countries.find(c => c.name === countryName);
        setSelectedCountry(countryName);
        setSelectedCountryInvestors(country ? country.investors : null);
        if (businessType === 'offline') {
            setSelectedPlan(null);
            setSelectedMonths(0);
        }
    };
    
    const getPlanPrice = (planKey: PlanKey) => {
        if (isLoadingPricing) return '...';
        return `${currencySymbol}${pricing[planKey] || 0}/mo`;
    };

    const OfflineFlow = () => (
        <>
            <div className="space-y-1.5">
                <h3 className="text-sm font-semibold text-center text-muted-foreground pt-2">Great! Let's find the right investors for your physical business.</h3>
            </div>
            <div className="space-y-1.5">
                <Label htmlFor="country-select">2. Choose your Country</Label>
                <Select onValueChange={handleCountryChange} value={selectedCountry || ""}>
                    <SelectTrigger id="country-select"><div className="flex items-center gap-2"><Globe className="h-4 w-4" /><SelectValue placeholder="Select your country..." /></div></SelectTrigger>
                    <SelectContent>{countries.map((c) => (<SelectItem key={c.name} value={c.name}><div className="flex items-center gap-2">{c.flag}<span>{c.name} ({c.investors} Investors)</span></div></SelectItem>))}</SelectContent>
                </Select>
                 {selectedCountryInvestors !== null && (<p className="text-xs text-muted-foreground pt-1 text-center">There are <span className="font-bold text-primary">{selectedCountryInvestors}</span> available investors in {selectedCountry}.</p>)}
            </div>
            <div className="space-y-1.5">
                <Label htmlFor="investor-type-select-main">3. Choose Investor Type</Label>
                <Select onValueChange={(v: PlanKey) => setSelectedPlan(v)} disabled={!selectedCountry} value={selectedPlan || ""}>
                  <SelectTrigger id="investor-type-select-main"><SelectValue placeholder={selectedCountry ? "Select investor category..." : "Please choose a country first"} /></SelectTrigger>
                  <SelectContent>{Object.entries(planDetailsData).map(([key, value]) => (<SelectItem key={key} value={key as PlanKey}><div className="flex justify-between items-center w-full"><span>{value.title}</span><span className="font-semibold text-primary ml-4">{getPlanPrice(value.priceKey)}</span></div></SelectItem>))}</SelectContent>
                </Select>
            </div>
        </>
    );

    const OnlineFlow = () => (
        <>
            <div className="space-y-1.5">
                <h3 className="text-sm font-semibold text-center text-muted-foreground pt-2">Awesome! Let's find investors for your digital business.</h3>
            </div>
            <div className="space-y-1.5">
                <Label htmlFor="category-select">2. Choose Business Category</Label>
                <Select onValueChange={setSelectedCategory} value={selectedCategory || ""}>
                  <SelectTrigger id="category-select"><div className="flex items-center gap-2"><Briefcase className="h-4 w-4" /><SelectValue placeholder="Select online business category..." /></div></SelectTrigger>
                  <SelectContent>{onlineBusinessCategories.map((cat) => (<SelectItem key={cat} value={cat}>{cat}</SelectItem>))}</SelectContent>
                </Select>
            </div>
             <div className="space-y-1.5">
                <Label htmlFor="investor-type-select-online">3. Choose Investor Type</Label>
                <Select onValueChange={(v: PlanKey) => setSelectedPlan(v)} disabled={!selectedCategory} value={selectedPlan || ""}>
                  <SelectTrigger id="investor-type-select-online"><SelectValue placeholder={selectedCategory ? "Select investor category..." : "Please choose a category first"} /></SelectTrigger>
                  <SelectContent>{Object.entries(planDetailsData).map(([key, value]) => (<SelectItem key={key} value={key as PlanKey}><div className="flex justify-between items-center w-full"><span>{value.title}</span><span className="font-semibold text-primary ml-4">{getPlanPrice(value.priceKey)}</span></div></SelectItem>))}</SelectContent>
                </Select>
            </div>
        </>
    );

    return (
        <Card className="w-full max-w-lg mx-auto shadow-2xl border-2 border-primary/20">
            <CardHeader className="text-center">
                <CardTitle className="text-2xl font-bold">Start Your Business Now!</CardTitle>
                <CardDescription>Tell us about your venture to connect with the right investors.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                 <div className="space-y-1.5">
                    <Label htmlFor="business-type-select">1. What's your business style?</Label>
                    <Select onValueChange={(value: BusinessType) => handleBusinessTypeChange(value)} value={businessType || ""}>
                        <SelectTrigger id="business-type-select"><div className="flex items-center gap-2"><ShoppingCart className="h-4 w-4" /><SelectValue placeholder="Select business type..." /></div></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="offline">Offline Business</SelectItem>
                            <SelectItem value="online">Online Business</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                
                <AnimatePresence>
                {businessType === 'offline' && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-4 overflow-hidden">
                        <OfflineFlow />
                    </motion.div>
                )}
                {businessType === 'online' && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-4 overflow-hidden">
                        <OnlineFlow />
                    </motion.div>
                )}
                </AnimatePresence>
                
                 {businessType && selectedPlan && (
                     <div className="space-y-1.5 pt-2">
                        <Label htmlFor="duration-select-main">4. Choose Duration</Label>
                        <div className="flex justify-center items-center gap-4">
                             <Label htmlFor="billing-cycle" className={cn(billingCycle === 'monthly' ? 'text-primary' : 'text-muted-foreground')}>Monthly</Label>
                            <Switch id="billing-cycle" checked={billingCycle === 'yearly'} onCheckedChange={(checked) => setBillingCycle(checked ? 'yearly' : 'monthly')} />
                            <Label htmlFor="billing-cycle" className={cn(billingCycle === 'yearly' ? 'text-primary' : 'text-muted-foreground')}>Yearly</Label>
                            <Badge variant="destructive" className="animate-pulse">-20%</Badge>
                        </div>
                        {billingCycle === 'monthly' && (
                            <Select onValueChange={(v) => setSelectedMonths(parseInt(v, 10))} value={selectedMonths > 0 && selectedMonths < 12 ? selectedMonths.toString() : "0"}>
                                <SelectTrigger id="duration-select-main"><SelectValue placeholder="Select monthly duration..." /></SelectTrigger>
                                <SelectContent>{Array.from({ length: 11 }, (_, i) => i + 1).map(m => (<SelectItem key={m} value={m.toString()}>{m} Month{m > 1 ? 's' : ''}</SelectItem>))}</SelectContent>
                            </Select>
                        )}
                    </div>
                 )}
                
                 {totalPriceMain > 0 && pricing && (
                    <div className="text-center bg-muted/50 p-3 rounded-md border mt-4">
                        <p className="text-sm text-muted-foreground">Total Amount</p>
                        <p className="text-2xl font-bold text-primary">
                           {currencySymbol}{' '}{totalPriceMain.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                        {pricing.currencySymbol !== 'PKR' && (<p className="text-xs font-semibold text-muted-foreground">(Approx. PKR {totalPricePKR.toLocaleString()})</p>)}
                         {selectedMonths === 12 && (<p className="text-xs font-semibold text-muted-foreground mt-2">The annual plan is fully refundable if you find that LISTED has not been helpful for you.</p>)}
                    </div>
                 )}
            </CardContent>
            <CardFooter>
                 <Button asChild className="w-full" disabled={!isProceedEnabled}>
                    <Link href={`/auth?action=signup&plan=${selectedPlan}&duration=${selectedMonths}`}>Get Started <ArrowRight className="ml-2 h-4 w-4" /></Link>
                </Button>
            </CardFooter>
        </Card>
    );
}



export default function HomePage() {
  const { currentUser, loading: authContextLoading } = useAuth(); 
  const [dashboardLink, setDashboardLink] = useState("/");

  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  
  const [homepageContent, setHomepageContent] = useState({
    heroTitle: "What an <strong class='text-red-600 italic'>&quot;IDEA&quot;</strong> Sir Jee!!!",
    heroSubtitle: "Got a brilliant idea? LISTED is where you get it funded. Pitch your idea to <strong class='text-foreground'>110+ Angel Investors & 35+ Institutional Funds</strong>. Don't let your dream die in a notebook. Let's get it funded.",
    feature1Title: "1. Craft Your Pitch",
    feature1Description: "Easily create a compelling funding pitch that tells your story. Our AI-powered tools help you refine your summary to make it irresistible and grab investor attention instantly.",
  });
  
  const [sliderContent, setSliderContent] = useState<HomeSlide[]>([]);
  const [secondarySliderContent, setSecondarySliderContent] = useState<HomeSlide[]>([]);
  const [testimonialsSettings, setTestimonialsSettings] = useState({
      youtubeVideoUrl: "",
      enableTestimonialsSection: true,
  });

  const [myGoalVideos, setMyGoalVideos] = useState<string[]>([]);
  const [myGoalVideoIndex, setMyGoalVideoIndex] = useState(0);

  useEffect(() => {
    const fetchContent = async () => {
      if (!db) {
        return
      };
      const homepageDocRef = doc(db, "siteContent", "homepage");
      const sliderDocRef = doc(db, "siteContent", "homeSlider");
      const secondarySliderDocRef = doc(db, "siteContent", "secondarySlider");
      const testimonialsDocRef = doc(db, "siteContent", "testimonials");
      const myGoalDocRef = doc(db, "siteContent", "myGoal");
      
      try {
        const [homepageDocSnap, sliderDocSnap, secondarySliderDocSnap, testimonialsDocSnap, myGoalDocSnap] = await Promise.all([
          getDoc(homepageDocRef),
          getDoc(sliderDocRef),
          getDoc(secondarySliderDocRef),
          getDoc(testimonialsDocRef),
          getDoc(myGoalDocRef),
        ]);

        if (homepageDocSnap.exists() && homepageDocSnap.data().content) {
          const content = homepageDocSnap.data().content;
          setHomepageContent({
            heroTitle: content.heroTitle || homepageContent.heroTitle,
            heroSubtitle: content.heroSubtitle || homepageContent.heroSubtitle,
            feature1Title: content.feature1Title || homepageContent.feature1Title,
            feature1Description: content.feature1Description || homepageContent.feature1Description,
          });
        }
        
        if (sliderDocSnap.exists()) {
            const data = sliderDocSnap.data();
            const slides: HomeSlide[] = (data.slides || []).filter((slide: HomeSlide) => slide.imageUrl);
            setSliderContent(slides);
        }
        
        if (secondarySliderDocSnap.exists()) {
            const data = secondarySliderDocSnap.data();
            const slides: HomeSlide[] = (data.slides || []).filter((slide: HomeSlide) => slide.imageUrl && slide.heading);
            setSecondarySliderContent(slides);
        }

        if (testimonialsDocSnap.exists()) {
            const data = testimonialsDocSnap.data();
            setTestimonialsSettings({
                youtubeVideoUrl: data.youtubeVideoUrl || "",
                enableTestimonialsSection: data.enableTestimonialsSection !== false,
            });
        }
        
        if (myGoalDocSnap.exists() && myGoalDocSnap.data().youtubeLinks) {
            const embeddableLinks = (myGoalDocSnap.data().youtubeLinks as string[])
                .map(link => getYoutubeEmbedUrl(link))
                .filter((url): url is string => url !== null);
            setMyGoalVideos(embeddableLinks);
        }

      } catch (e) {
        console.error("Error fetching homepage content:", e);
      }
    };

    const fetchVideoUrl = async () => {
      if (db && !sessionStorage.getItem('videoModalShown')) {
        try {
          const docRef = doc(db, "siteContent", "homepageVideoMessage");
          const docSnap = await getDoc(docRef);
          if (docSnap.exists() && docSnap.data().videoUrl) {
            setVideoUrl(docSnap.data().videoUrl);
            setIsVideoModalOpen(true);
            sessionStorage.setItem('videoModalShown', 'true');
          }
        } catch(e) {
          console.error("Error fetching homepage video:", e)
        }
      }
    };
    
    fetchContent();
    fetchVideoUrl();
  }, []);

  const youtubeEmbedUrl = videoUrl ? getYoutubeEmbedUrl(videoUrl) : null;
  const testimonialsYoutubeEmbedUrl = testimonialsSettings.youtubeVideoUrl ? getYoutubeEmbedUrl(testimonialsSettings.youtubeVideoUrl) : null;

  useEffect(() => {
    if (currentUser) {
      let path = "/";
      switch (currentUser.type) {
        case "company": path = "/dashboard"; break;
        case "professional": path = "/offers"; break; 
        case "investor": path = "/investor/dashboard"; break;
        case "admin": path = "/admin/dashboard"; break;
        default: path = "/"; break;
      }
      setDashboardLink(path);
    }
  }, [currentUser]);
  
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <main className="flex-1">
        <BreakingNewsTicker />
        
        <section className="pt-8 text-center" aria-labelledby="hero-heading">
          <div className="container mx-auto px-4">
              <Lightbulb className="h-16 w-16 text-primary mx-auto mb-6" />
              <h1 id="hero-heading" className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-primary mb-6" dangerouslySetInnerHTML={{ __html: homepageContent.heroTitle }}/>
              <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-10 leading-relaxed" dangerouslySetInnerHTML={{ __html: homepageContent.heroSubtitle }} />
              {currentUser && (
                 <div className="mt-8">
                    <Button size="lg" asChild className="bg-accent hover:bg-accent/90 text-accent-foreground text-lg px-10 py-3 shadow-lg transform hover:scale-105 transition-transform duration-300">
                        <Link href={dashboardLink}>Go to Your Dashboard <ArrowRight className="ml-2 h-5 w-5"/></Link>
                    </Button>
                </div>
              )}
          </div>
        </section>

        <section className="pb-16 pt-0 md:pt-0" aria-labelledby="how-it-works-heading">
            <div className="container mx-auto px-4">
                <HomePagePlanSelector />
            </div>
        </section>

        <EducationalPartnersMarquee />
        
        <section className="relative w-full h-[50vh] min-h-[300px] md:h-auto md:aspect-[16/7] bg-muted overflow-hidden">
          {sliderContent.length > 0 ? (
            <HomeCarousel slides={sliderContent} />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <ImageIcon className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground font-semibold">Slider content is being prepared.</p>
              <p className="text-xs text-muted-foreground">Add slides with images and headings in the section above.</p>
            </div>
          )}
        </section>
        
        <section className="py-16 md:py-24 bg-background" aria-labelledby="success-stories-heading">
            <div className="container mx-auto px-4">
                <h2 id="success-stories-heading" className="text-3xl md:text-4xl font-bold text-center text-foreground mb-4">From Zero to Global Recognition</h2>
                <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">Real stories of grit and triumph that started just like yours. A single idea can build empires.</p>
                 <SuccessStoryMarquee />
            </div>
        </section>
        
         {myGoalVideos.length > 0 && (
          <section className="py-16 md:py-24 bg-muted/40" aria-labelledby="my-goal-heading">
            <div className="container mx-auto px-4">
               <Card className="max-w-4xl mx-auto shadow-xl rounded-2xl overflow-hidden border">
                <CardHeader className="text-center bg-card p-6">
                  <h2 id="my-goal-heading" className="text-3xl font-bold text-foreground">Must Listen</h2>
                  <p className="text-muted-foreground text-md max-w-xl mx-auto">This message might change your thinking—don’t miss it!</p>
                </CardHeader>
                <CardContent className="p-4 md:p-6 bg-card">
                  <div className="relative group">
                    <AnimatePresence initial={false}>
                      <motion.div
                        key={myGoalVideos[myGoalVideoIndex]}
                        initial={{ opacity: 0, x: 300 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -300 }}
                        transition={{ duration: 0.3, ease: "circOut" }}
                        className="aspect-video w-full rounded-xl border bg-black shadow-2xl overflow-hidden"
                      >
                        <iframe
                          src={myGoalVideos[myGoalVideoIndex]}
                          title="My Goal Video"
                          frameBorder="0"
                          allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          allowFullScreen
                          className="w-full h-full"
                        ></iframe>
                      </motion.div>
                    </AnimatePresence>
                    {myGoalVideos.length > 1 && (
                      <>
                        <Button
                          size="icon"
                          variant="secondary"
                          onClick={() => setMyGoalVideoIndex((prev) => (prev === 0 ? myGoalVideos.length - 1 : prev - 1))}
                          className="absolute z-10 top-1/2 -translate-y-1/2 left-2 rounded-full h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="secondary"
                          onClick={() => setMyGoalVideoIndex((prev) => (prev + 1) % myGoalVideos.length)}
                          className="absolute z-10 top-1/2 -translate-y-1/2 right-2 rounded-full h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
                {myGoalVideos.length > 1 && (
                    <CardFooter className="p-4 flex justify-center items-center gap-2">
                         {myGoalVideos.map((_, i) => (
                            <button
                                key={i}
                                onClick={() => setMyGoalVideoIndex(i)}
                                className={cn(
                                    "w-6 h-1.5 rounded-full cursor-pointer transition-all duration-300",
                                    i === myGoalVideoIndex ? "bg-primary scale-125" : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                                )}
                                aria-label={`Go to video ${i + 1}`}
                            />
                        ))}
                    </CardFooter>
                )}
              </Card>
            </div>
          </section>
        )}
        
        <section id="launchpad" className="py-16 md:py-24 bg-background" aria-labelledby="how-it-works-heading">
            <div className="container mx-auto px-4 max-w-5xl">
                 <InvestorPlanSelector />
            </div>
        </section>

        <section className="py-16 md:py-24 bg-background" aria-labelledby="features-heading">
          <div className="container mx-auto px-4">
            <h2 id="features-heading" className="text-3xl md:text-4xl font-bold text-center text-foreground mb-4">The Simplest Path from Idea to Investment</h2>
            <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">We've removed the barriers. Your journey to a funded startup has only three steps.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <FeatureCard
                icon={<FileSignature className="h-10 w-10 text-primary" />}
                title={homepageContent.feature1Title}
                description={homepageContent.feature1Description}
              />
              <FeatureCard
                icon={<Network className="h-10 w-10 text-primary" />}
                title="2. Connect with Investors"
                description="Your pitch goes live to our entire exclusive network. No gatekeepers, no endless emails—just direct access to the people who can write cheques and build empires with you."
              />
              <FeatureCard
                icon={<Handshake className="h-10 w-10 text-primary" />}
                title="3. Secure Your Funding"
                description="Engage directly with investors who believe in your vision. Close your funding round and get the capital you need to build, scale, and dominate your market."
              />
            </div>
          </div>
        </section>

        {secondarySliderContent.length > 0 && (
          <section className="py-16 md:py-24 bg-muted/40" aria-labelledby="partner-companies-heading">
            <div className="container mx-auto px-4">
              <h2 id="partner-companies-heading" className="text-3xl md:text-4xl font-bold text-center text-foreground mb-4">Partner Companies</h2>
              <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">These are some of the great companies working with Listed to find talent and opportunities.</p>
              <Card className="max-w-6xl mx-auto shadow-xl rounded-2xl overflow-hidden border">
                <CardContent className="p-2">
                  <div className="relative w-full h-[30vh] md:h-[45vh] bg-muted rounded-lg overflow-hidden">
                    <HomeCarousel slides={secondarySliderContent} />
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>
        )}
        
        {testimonialsSettings.enableTestimonialsSection && (
          <section className="py-16 md:py-24 bg-muted/40" aria-labelledby="testimonials-heading">
            <div className="container mx-auto px-4">
              <div className="max-w-4xl mx-auto">
                <Card className="shadow-2xl rounded-2xl overflow-hidden border bg-card">
                  <CardHeader className="text-center p-6">
                     <h2 id="testimonials-heading" className="text-3xl md:text-4xl font-bold text-foreground mb-2">Don't Just Take Our Word For It</h2>
                     <p className="text-muted-foreground max-w-xl mx-auto">Early members are already seeing life-changing results.</p>
                  </CardHeader>
                  <CardContent className="p-4 md:p-6">
                    {testimonialsYoutubeEmbedUrl ? (
                      <div className="aspect-video w-full rounded-xl border bg-black shadow-lg overflow-hidden">
                        <iframe
                          src={testimonialsYoutubeEmbedUrl}
                          title="Testimonial Video"
                          frameBorder="0"
                          allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          allowFullScreen
                          className="w-full h-full"
                        ></iframe>
                      </div>
                    ) : (
                      <div className="h-64 flex items-center justify-center bg-muted rounded-xl border">
                        <p className="text-muted-foreground">Testimonial video coming soon.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </section>
        )}
        
        <section className="py-20 md:py-28 bg-gradient-to-r from-primary to-blue-600 text-primary-foreground" aria-labelledby="cta-heading">
          <div className="container mx-auto px-4 text-center">
            <h2 id="cta-heading" className="text-3xl md:text-4xl font-bold mb-6">Your Idea is Worth Millions. Let's Prove It.</h2>
            <p className="text-lg md:text-xl max-w-2xl mx-auto mb-10 opacity-90 leading-relaxed">
              The platform is launching soon. Onboard now and be the first in line to meet your investors. This is your chance.
            </p>
            <Button size="xl" variant="secondary" asChild className="bg-white text-primary hover:bg-white/90 text-lg px-12 py-4 font-semibold shadow-2xl transform hover:scale-105 transition-transform duration-300">
              <Link href="/auth?action=signup">I'm Ready. Fund My Idea! <ArrowRight className="ml-2 h-5 w-5" /></Link>
            </Button>
          </div>
        </section>
      </main>
      
      <Dialog open={isVideoModalOpen} onOpenChange={setIsVideoModalOpen}>
        <DialogContent className="sm:max-w-3xl p-0 border-0">
           <DialogHeader className="p-4 pb-0 sr-only">
             <DialogTitle>Welcome Video</DialogTitle>
          </DialogHeader>
          <div className="aspect-video bg-black relative">
            {youtubeEmbedUrl ? (
              <iframe
                src={youtubeEmbedUrl}
                title="YouTube video player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="w-full h-full"
              ></iframe>
            ) : videoUrl ? (
                <video src={videoUrl} controls autoPlay className="w-full h-full object-contain" />
            ) : null}
             <DialogClose className="absolute right-2 top-2 rounded-full p-2 opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground bg-black/50 hover:bg-black/70 text-white">
                <XIcon className="h-6 w-6" />
                <span className="sr-only">Close</span>
            </DialogClose>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
