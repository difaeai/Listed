
"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { BookOpen, Search, PlusCircle, Edit, Trash2, MoreHorizontal, Briefcase, TrendingUp, Filter, Eye, EyeOff, CheckCircle, Edit3, Loader2, FileUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { db } from '@/lib/firebaseConfig';
import { collection, addDoc, doc, updateDoc, deleteDoc, onSnapshot, query, orderBy, serverTimestamp, writeBatch, getDocs } from 'firebase/firestore';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';

// Interface remains the same, but id is now Firestore document ID
export interface BusinessDirectoryEntry {
  id: string; // Firestore document ID
  businessName: string;
  industry: string;
  model: string;
  shortDescription: string;
  expectedAnnualGrowth: string;
  detailedSteps?: string;
  requiredInvestment?: string;
  status: 'draft' | 'published';
  createdAt?: any; // Firestore Timestamp
  updatedAt?: any; // Firestore Timestamp
}

const formSchema = z.object({
  // id is removed from form, Firestore generates it or uses existing on edit
  businessName: z.string().min(3, "Business name is required."),
  industry: z.string().min(3, "Industry is required."),
  model: z.string().min(3, "Business model is required."),
  shortDescription: z.string().min(10, "Short description is required."),
  expectedAnnualGrowth: z.string().min(1, "Expected growth is required."),
  detailedSteps: z.string().optional(),
  requiredInvestment: z.string().optional(),
  status: z.enum(['draft', 'published'], { required_error: "Status is required." }),
});
type DirectoryFormValues = z.infer<typeof formSchema>;

const initialSampleBusinessDirectoryDataForSeeding: Omit<BusinessDirectoryEntry, 'id' | 'createdAt' | 'updatedAt'>[] = [
  // --- 1. E-commerce & Retail ---
  {
    businessName: 'Online Handicrafts Store (Pakistan-made)',
    industry: 'E-commerce',
    model: 'Marketplace/DTC',
    shortDescription: 'A premium e-commerce platform curating and exporting high-quality, authentic Pakistani handicrafts to a global audience.',
    expectedAnnualGrowth: '25-35%',
    detailedSteps: `1. **Market Research & Niche Selection:**\n   - **Market Need:** Global demand for authentic, ethically-sourced artisanal products. Address the lack of a single, trusted online platform for high-quality Pakistani crafts.\n   - **Niche Focus:** Specialize in 2-3 categories like Sindh's Ajrak & Blue Pottery, Multan's Camel Skin Lamps, or Swat's woodwork.\n   - **Target Audience:** Pakistani diaspora in the US, UK, Canada, UAE; Western buyers interested in ethical fashion and home decor; Corporate gifting clients.\n\n2. **Supply Chain & Artisan Partnerships:**\n   - **Onboarding:** Travel to artisan hubs (Hala, Multan, Swat) to build direct relationships. Document their stories for marketing.\n   - **Quality Control:** Establish strict quality standards. Reject imperfect items to build a premium brand reputation. Implement a fair trade pricing model.\n   - **Inventory:** Start with a consignment model to minimize initial capital risk. Move to wholesale purchasing for best-sellers.\n\n3. **Platform Development & Branding:**\n   - **Branding:** Create a brand that screams authenticity and luxury (e.g., "Crafts of the Indus").\n   - **Platform:** Use Shopify Advanced for its international sales features. Invest heavily in professional photography.\n   - **Storytelling:** Each product page must feature the artisan's story, the craft's history, and the region of origin.\n\n4. **Logistics & Operations:**\n   - **Packaging:** Design secure, branded, and gift-worthy packaging.\n   - **Shipping:** Negotiate contracts with reliable international couriers like DHL or FedEx.\n   - **Payments:** Integrate Stripe Atlas for international credit card processing.\n\n5. **Go-to-Market & Sales Strategy:**\n   - **Launch:** Use Instagram and Pinterest with high-quality visuals. Run targeted Facebook/Instagram ads aimed at the Pakistani diaspora.\n   - **Content Marketing:** Blog about the history of Pakistani crafts, artisan interviews, and home styling tips.\n   - **B2B Sales:** Create a corporate gifting catalog and pitch to multinational companies.`,
    requiredInvestment: 'PKR 500K - 2M',
    status: 'published'
  },
  {
    businessName: 'Subscription Box (Local Pakistani Products)',
    industry: 'E-commerce',
    model: 'Subscription',
    shortDescription: 'A curated monthly subscription box delivering a themed experience of unique, high-quality Pakistani products.',
    expectedAnnualGrowth: '20-30%',
    detailedSteps: `1. **Concept & Niche Definition:**\n   - **Market Need:** Consumers crave discovery and unique experiences. This model offers a convenient way to explore local culture.\n   - **Theme Ideation:** Choose a specific, appealing theme. Examples: "Lahori Food Trail" (spices, sauces), "Artisanal Pakistan" (small crafts), "Pakistani Wellness" (local teas, organic honey).\n   - **Target Audience:** Urban professionals (25-45), foodies, Pakistani diaspora.\n\n2. **Supplier Sourcing & Curation:**\n   - **Discovery:** Scour local markets and Instagram businesses to find hidden gems.\n   - **Negotiation:** Negotiate wholesale or bulk pricing. Build strong relationships for long-term collaboration.\n   - **Curation:** Each box must tell a story. The products should be complementary.\n\n3. **Branding, Packaging & Pricing:**\n   - **Brand Identity:** Create a vibrant and memorable brand name.\n   - **Packaging:** Invest in custom-designed, sturdy, and "Instagrammable" boxes. The unboxing experience is key.\n   - **Pricing Strategy:** Offer monthly, 3-month, and 6-month plans. Target a 30-40% profit margin.\n\n4. **Tech & Operations:**\n   - **Platform:** Use a subscription-focused e-commerce platform like CrateJoy or Shopify with subscription apps.\n   - **Logistics:** Assemble boxes in a clean space. Partner with a reliable local courier service (e.g., M&P, Leopards).\n\n5. **Marketing & Growth:**\n   - **Pre-Launch:** Build hype on social media. Run a giveaway for a free subscription.\n   - **Influencer Marketing:** Send free boxes to local food and lifestyle bloggers for unboxing videos.\n   - **Retention:** Offer referral discounts and loyalty points.`,
    requiredInvestment: 'PKR 300K - 1M',
    status: 'draft'
  },
  {
    businessName: 'Specialty Organic Grocery Delivery',
    industry: 'Retail/Logistics',
    model: 'Online Retail + Delivery',
    shortDescription: 'A farm-to-door delivery service for certified organic produce, targeting health-conscious urban consumers.',
    expectedAnnualGrowth: '18-28%',
    detailedSteps: `1. **Supply Chain & Sourcing:**\n   - **Market Gap:** Existing grocery stores have limited organic options. Health-conscious consumers are an underserved market.\n   - **Farmer Network:** Forge exclusive partnerships with 3-5 certified organic farms near a major city.\n   - **Product Range:** Start with seasonal vegetables, fruits, free-range eggs, and local honey.\n\n2. **Operations & Logistics:**\n   - **Cold Chain:** Crucial for freshness. Set up a small cold storage unit or use refrigerated vans.\n   - **Delivery Fleet:** Start with a small, efficient fleet of motorbikes with insulated delivery boxes.\n   - **Quality Control:** Implement rigorous inbound and outbound quality checks.\n\n3. **Technology Platform:**\n   - **Website/App:** Develop a simple, mobile-first e-commerce website with clear delivery slot selection.\n   - **Inventory Management:** Use a system to track stock levels in real-time to avoid order cancellations.\n\n4. **Business Model & Pricing:**\n   - **Pricing:** Organic produce commands a premium. Price competitively but ensure a healthy margin.\n   - **Subscription Model:** Offer weekly "Harvest Baskets" for recurring revenue and demand forecasting.\n\n5. **Marketing & Customer Trust:**\n   - **Transparency:** Build trust by showcasing your partner farms on your website and social media.\n   - **Targeted Marketing:** Run digital ads targeting users interested in "organic food" and "healthy living."\n   - **Partnerships:** Partner with gyms, yoga studios, and nutritionists.`,
    requiredInvestment: 'PKR 700K - 3M',
    status: 'published'
  },
  {
    businessName: 'Thrift Store (Online/Physical Hybrid)',
    industry: 'Retail',
    model: 'Circular Economy',
    shortDescription: 'A curated thrift and consignment store for trendy, pre-loved fashion, promoting sustainability and affordability.',
    expectedAnnualGrowth: '22-32%',
    detailedSteps: `1. **Business Model & Sourcing:**\n   - **Market Need:** Growing interest in sustainable fashion and budget-friendly clothing among Gen Z and millennials.\n   - **Sourcing Strategy:** Choose one or more methods: Consignment (split profit), Direct Buying (buy by weight), or Donations.\n\n2. **Curation & Operations:**\n   - **Quality is Key:** This is not a flea market. Every item must be rigorously inspected, laundered, steamed, and repaired.\n   - **Inventory Management:** Photograph and catalog every item with a unique SKU. Use a system to track inventory across online and offline channels.\n\n3. **Go-to-Market: The Hybrid Approach:**\n   - **Online First:** Start with an "Instagram Store." Post daily "drops" of new items. Graduate to a Shopify store.\n   - **Physical Presence:** Begin with pop-up shops at local cafes or markets. A small, permanent store can come later.\n\n4. **Branding & Community:**\n   - **Aesthetic:** Develop a cool, trendy brand identity that resonates with your target audience.\n   - **Community Building:** Engage heavily with the sustainable fashion community on Instagram and TikTok.\n\n5. **Financials:**\n   - **Pricing:** Price items at 25-40% of their estimated original retail price, depending on brand and condition.\n   - **Margins:** Carefully track your cost of goods, processing costs, and margins to ensure profitability.`,
    requiredInvestment: 'PKR 200K - 800K',
    status: 'published'
  },
  // --- 2. Food & Beverage ---
  {
    businessName: 'Cloud Kitchen (Niche Cuisine)',
    industry: 'FoodTech',
    model: 'Delivery-Only Restaurant',
    shortDescription: 'A delivery-only kitchen operating multiple virtual brands from a single, low-cost location to maximize efficiency.',
    expectedAnnualGrowth: '30-45%',
    detailedSteps: `1. **Market & Concept Validation:**\n   - **Data-Driven Approach:** Use FoodPanda/Cheetay to analyze your area. What cuisine is popular but has few high-rated options? (e.g., Authentic Korean, Healthy Salads).\n   - **Virtual Brands:** Create 2-3 distinct brands from one kitchen. Example: "Seoul Food" (Korean), "Salad Lab" (Healthy).\n\n2. **Kitchen & Operations:**\n   - **Location:** Rent a small, low-rent commercial space. No need for prime real estate.\n   - **Menu Engineering:** Design small, optimized menus (10-15 items per brand). Use overlapping ingredients to minimize waste.\n\n3. **Technology & Platform Integration:**\n   - **Aggregator Onboarding:** Register each virtual brand separately on FoodPanda, Cheetay, etc.\n   - **POS:** Use a modern POS system that integrates all delivery platforms into a single dashboard.\n   - **Packaging:** Invest in high-quality, spill-proof, and branded packaging.\n\n4. **Financial Management:**\n   - **Costing:** Precisely cost every menu item to ensure a gross margin of 65-75% before commissions.\n   - **Commission:** Factor in the high commissions from delivery aggregators (25-35%).\n\n5. **Marketing & Growth:**\n   - **Digital Storefront:** Optimize your brand pages on the delivery apps with professional food photography.\n   - **Targeted Ads:** Run hyper-local ads on Instagram and Facebook for each brand.\n   - **Customer Feedback:** Monitor reviews closely and use feedback to improve.`,
    requiredInvestment: 'PKR 600K - 1.5M',
    status: 'published'
  },
  {
    businessName: 'Healthy Meal Prep Service',
    industry: 'Health/Food',
    model: 'Subscription Service',
    shortDescription: 'A weekly subscription service delivering calorie-counted, macro-balanced meals for busy professionals.',
    expectedAnnualGrowth: '25-38%',
    detailedSteps: `1. **Niche & Menu Planning:**\n   - **Target Audience:** Focus on a specific niche: weight loss, muscle gain (high protein), or general healthy eating.\n   - **Dietitian Consultation:** Crucial for credibility. Work with a certified dietitian to design your meal plans.\n   - **Menu Rotation:** Create a 4-week rotating menu to prevent customer boredom.\n\n2. **Kitchen Operations & Sourcing:**\n   - **Kitchen:** Start with a rented commercial kitchen space (can be part-time initially). Focus on food safety.\n   - **Sourcing:** Source fresh ingredients in bulk to manage costs.\n\n3. **Technology & Ordering:**\n   - **Website:** Build a user-friendly website where customers can view the weekly menu, select their plan, and pay online.\n   - **Subscription Management:** Use a platform like Stripe or Shopify with subscription apps.\n\n4. **Packaging & Delivery:**\n   - **Packaging:** Use high-quality, microwave-safe, and portion-controlled containers. Good labeling is essential.\n   - **Delivery:** Deliver meals twice a week (e.g., Sunday and Wednesday) to ensure freshness.\n\n5. **Marketing & Partnerships:**\n   - **Targeting:** Run social media ads targeting people interested in fitness and healthy living.\n   - **Corporate Partnerships:** Pitch your service to HR departments of corporate offices.\n   - **Gym Partnerships:** Partner with gyms and personal trainers. Offer them a commission for referrals.`,
    requiredInvestment: 'PKR 400K - 1.2M',
    status: 'published'
  },
  // --- 3. Services ---
  {
    businessName: 'Digital Marketing Agency for SMEs',
    industry: 'Marketing',
    model: 'B2B Service',
    shortDescription: 'A results-focused digital marketing agency providing SEO, SMM, and content services for small Pakistani businesses.',
    expectedAnnualGrowth: '28-40%',
    detailedSteps: `1. **Niche & Service Specialization:**\n   - **Target a Niche:** Don't be a generalist. Specialize in a specific industry, e.g., local cafes & restaurants, real estate, or fashion brands.\n   - **Core Services:** Start with 2-3 core services you excel at: Social Media Management, SEO, or Content Creation.\n\n2. **Build Your Portfolio & Credibility:**\n   - **Case Studies:** Offer your services for free or at a low cost to 2-3 initial clients in exchange for a detailed case study and testimonial.\n   - **Website:** Create a professional website that showcases these case studies.\n\n3. **Develop Service Packages:**\n   - **Tiered Pricing:** Create clear, monthly retainer packages. E.g., "Basic" (SMM only), "Growth" (SMM + SEO), "Pro" (SMM + SEO + Ads).\n\n4. **Client Acquisition:**\n   - **LinkedIn:** Actively connect with and message business owners in your target niche.\n   - **Local Networking:** Join local business groups on Facebook. Attend local trade shows.\n\n5. **Execution & Reporting:**\n   - **Tools:** Invest in essential tools for scheduling (Buffer), SEO (Ahrefs - start with free versions), and project management (Trello).\n   - **Reporting:** Provide clients with clear, monthly reports that focus on metrics that matter (leads, sales), not just vanity metrics (likes).`,
    requiredInvestment: 'PKR 75K - 300K',
    status: 'published'
  },
  {
    businessName: 'Home Cleaning & Maintenance Services',
    industry: 'Services',
    model: 'On-Demand Service',
    shortDescription: 'A trusted, tech-enabled platform connecting homeowners with verified, trained cleaners, plumbers, and electricians.',
    expectedAnnualGrowth: '20-30%',
    detailedSteps: `1. **Recruitment & Vetting (Your Core Asset):**\n   - **Onboarding:** Recruit service providers (cleaners, plumbers, electricians).\n   - **Rigorous Vetting:** Implement a strict background check process, including police verification.\n   - **Uniforms & ID Cards:** Provide all verified workers with professional uniforms and ID cards.\n\n2. **Training & Standardization:**\n   - **Soft Skills:** Train workers on professionalism, communication, and punctuality.\n   - **SOPs:** Create a detailed Standard Operating Procedure for each service, especially a checklist for cleaning.\n\n3. **Booking & Technology:**\n   - **Platform:** Start with a simple website with a booking form and a dedicated WhatsApp Business number. An app can come later.\n   - **Scheduling:** Use scheduling software (e.g., Calendly) to manage bookings.\n   - **Pricing:** Offer clear, upfront pricing (per hour or per square foot for cleaning).\n\n4. **Marketing & Building Trust:**\n   - **Targeting:** Focus your marketing on specific residential areas (e.g., DHA, Bahria Town).\n   - **Customer Reviews:** Heavily promote positive customer reviews and testimonials.\n   - **Service Guarantee:** Offer a satisfaction guarantee (e.g., a free re-do).\n\n5. **Operations & Customer Support:**\n   - **Dispatching:** Have a dedicated person to manage scheduling and dispatch workers.\n   - **Feedback Loop:** After every service, send a simple survey to rate the worker.`,
    requiredInvestment: 'PKR 200K - 700K',
    status: 'published'
  },
  // --- 4. EdTech ---
  {
    businessName: 'Educational Content Creation (Urdu)',
    industry: 'EdTech/Media',
    model: 'Content Provider',
    shortDescription: 'Developing high-quality, engaging video lessons and tutorials in Urdu for the Pakistani national curriculum (Matric/FSc) and publishing on YouTube.',
    expectedAnnualGrowth: '20-35%',
    detailedSteps: `1. **Content Strategy:**\n   - **Niche Down:** Start with the most difficult subjects for students, like 9th/10th grade Physics, Chemistry, or Math.\n   - **Solve Specific Problems:** Don't just teach entire chapters. Create videos that solve specific, highly-searched past paper questions or difficult concepts.\n   - **Video Title SEO:** Title your videos based on how students search, e.g., "9th Class Physics Chapter 2 Numericals," "How to Balance Chemical Equations in Urdu."\n\n2. **Production Quality:**\n   - **Audio is King:** Invest in a good quality USB microphone (e.g., Blue Yeti). Clear audio is more important than video quality.\n   - **Visuals:** Use a digital tablet (like a Wacom) and screen recording software (like OBS Studio - it's free) to write and explain concepts clearly. Use simple animations to illustrate difficult ideas.\n   - **Editing:** Keep videos concise, well-paced, and remove any mistakes.\n\n3. **Platform & Distribution:**\n   - **YouTube:** This is your primary platform. Create a professional channel with a clear banner and playlists for each subject and grade.\n   - **Consistency:** Create and upload videos on a regular schedule (e.g., 2-3 videos per week). This is crucial for the YouTube algorithm.\n\n4. **Community Engagement & Growth:**\n   - **Engage:** Respond to comments and questions on your videos. Create a community where students can help each other.\n   - **Social Media:** Create a Facebook and Instagram page to share snippets, announcements, and study tips to drive traffic to your YouTube channel.\n   - **Collaboration:** Collaborate with other educational YouTubers or teachers.\n\n5. **Monetization Strategy:**\n   - **Phase 1 (Audience Building):** Focus on getting your first 1,000 subscribers and 4,000 watch hours to enable YouTube monetization (AdSense).\n   - **Phase 2 (Diversification):** \n     a) **Sponsorships:** Partner with brands targeting students (e.g., stationery, tech gadgets).\n     b) **Premium Content:** Offer paid, in-depth crash courses or notes on your own simple website or app.\n     c) **Live Classes:** Offer paid live-streamed "Doubt Solving" sessions before exams.`,
    requiredInvestment: 'PKR 100K - 500K (for a good PC, digital tablet, microphone, and internet)',
    status: 'published'
  },
  {
    businessName: 'Personalized Learning App for Kids',
    industry: 'EdTech',
    model: 'Mobile App (Subscription)',
    shortDescription: 'An adaptive, gamified mobile learning app for pre-school to early primary (ages 3-8) focusing on foundational English, Urdu, and Math skills.',
    expectedAnnualGrowth: '22-38%',
    detailedSteps: `1. **Educational Framework & Curriculum:**\n   - **Foundation:** Base the app on a recognized early childhood education curriculum (e.g., Montessori principles, National Curriculum of Pakistan for early years).\n   - **Core Skills:** Focus on foundational literacy (Urdu Haroof-e-Tahajji, English alphabet, phonics), numeracy (counting, basic addition), and problem-solving.\n   - **Personalization:** The app must adapt its difficulty based on the child\'s performance. This is the key "personalized learning" feature.\n\n2. **Content & Gamification:**\n   - **Engaging Content:** Design colorful, interactive games, animated stories, and quizzes. The app should feel like a game, not a textbook.\n   - **Character Design:** Create a friendly, memorable mascot character to guide the child through the learning journey.\n   - **Sound & Music:** Use professional voice-overs (in both English and Urdu) and cheerful background music.\n\n3. **App Development:**\n   - **Platform:** Choose your initial platform (iOS or Android) or use a cross-platform framework like Flutter or React Native.\n   - **Team:** You will need to hire a team: a UI/UX designer, mobile app developers, and a content/game designer. Outsourcing to a reputable app development agency is a common approach.\n   - **Parent Dashboard:** Include a section for parents to track their child\'s progress, time spent, and areas of improvement.\n\n4. **Business Model:**\n   - **Freemium with Subscription:** Offer the first few levels or a limited number of activities for free. Unlock the full content with a monthly or yearly subscription.\n   - **Pricing:** Research competitors. Price attractively for the Pakistani market (e.g., PKR 500/month or PKR 4,000/year).\n\n5. **Marketing & User Acquisition:**\n   - **Target Audience:** Your marketing target is the parents, not the children.\n   - **Digital Marketing:** Run ads on Facebook, Instagram, and YouTube targeting parents of young children.\n   - **Partnerships:** Collaborate with preschools, daycare centers, and influential "mommy bloggers" to promote the app.\n   - **App Store Optimization (ASO):** Optimize your app\'s name, description, and screenshots on the Google Play Store and Apple App Store to increase organic downloads.`,
    requiredInvestment: 'PKR 1.5M - 6M (app development is capital-intensive)',
    status: 'draft'
  },
  // --- 5. Health & Wellness ---
  {
    businessName: 'Online Mental Wellness Platform',
    industry: 'HealthTech',
    model: 'Telehealth/Subscription',
    shortDescription: 'A confidential platform connecting users with licensed Pakistani therapists and counselors via secure video calls and messaging.',
    expectedAnnualGrowth: '25-40%',
    detailedSteps: `1. **Problem & Solution:**\n   - **Market Need:** Significant social stigma and lack of access to qualified mental health professionals in Pakistan.\n   - **Solution:** Provide a discreet, affordable, and accessible way for people to seek therapy from the comfort of their home.\n\n2. **Therapist Onboarding & Vetting:**\n   - **Quality is paramount.** Your platform\'s reputation depends on the quality of your therapists.\n   - **Verification:** Implement a strict vetting process. Require and verify academic degrees, professional licenses, and proof of experience. Conduct a video interview.\n   - **Specializations:** Onboard therapists with diverse specializations (e.g., depression, anxiety, couples counseling, career guidance).\n\n3. **Technology Platform:**\n   - **Compliance:** While Pakistan doesn\'t have a direct HIPAA equivalent, build the platform with patient confidentiality as the top priority. Use end-to-end encryption for all communications.\n   - **Core Features:**\n     a) Secure user & therapist profiles.\n     b) Search and filter for therapists by specialty and language.\n     c) A secure booking and scheduling system.\n     d) Integrated secure video calling and messaging.\n     e) Secure online payments.\n\n4. **Business & Pricing Model:**\n   - **Pay-per-session:** Users pay for each session they book. The platform takes a commission (e.g., 20-30%).\n   - **Subscription Model:** Users pay a monthly fee for a certain number of sessions or unlimited messaging with their therapist. This provides better value and predictable revenue.\n\n5. **Marketing & Trust Building:**\n   - **Content Marketing:** Create a blog and social media presence focused on mental health awareness, de-stigmatization, and self-help tips. Do NOT use stock photos; use culturally relevant imagery.\n   - **Anonymity:** Emphasize the confidentiality and privacy of the platform in all marketing.\n   - **Corporate Wellness Programs (B2B):** Pitch your platform to companies as part of their employee wellness programs. This can be a major revenue stream.\n   - **University Partnerships:** Collaborate with universities to offer subsidized counseling services to students.`,
    requiredInvestment: 'PKR 500K - 2M (for platform development and therapist recruitment)',
    status: 'published'
  },
  // --- More Models ---
  {
    businessName: 'Co-working Space with Niche Focus',
    industry: 'Real Estate/Services',
    model: 'Space as a Service',
    shortDescription: 'A co-working space tailored to a specific community, like female entrepreneurs, digital artists, or developers.',
    expectedAnnualGrowth: '15-25%',
    detailedSteps: `1. **Niche Identification:** Standard co-working is crowded. Find a niche. 'Hacker House' for developers, 'Creator Studio' with photo/podcast equipment, or 'Femme-Space' for women.\n2. **Location & Design:** Secure a location with good accessibility. Design the interior to match the niche's vibe and functional needs.\n3. **Community Building:** This is key. Host niche-specific events, workshops, and networking sessions. Your value is the community, not just the desk space.\n4. **Membership Tiers:** Offer flexible plans: hot desk (daily/monthly), dedicated desk, private office, virtual office.\n5. **Partnerships:** Partner with local tech companies, universities, or industry bodies to offer benefits to your members.`,
    requiredInvestment: 'PKR 2M - 10M+',
    status: 'published'
  },
  {
    businessName: 'Personalized Kids Storybook Service',
    industry: 'E-commerce/Publishing',
    model: 'DTC E-commerce',
    shortDescription: 'An online service where parents can create customized storybooks featuring their child as the main character.',
    expectedAnnualGrowth: '20-30%',
    detailedSteps: `1. **Content Creation:** Write several engaging story templates for different age groups (2-8 years) and themes (adventure, fantasy, learning).\n2. **Platform Development:** Build a website where users can input their child's name, gender, and customize an avatar (skin tone, hair color).\n3. **Printing & Fulfillment:** Partner with a high-quality local digital printing press that can handle print-on-demand orders. Ensure good quality binding and paper.\n4. **Marketing:** Target parents on Facebook, Instagram, and parenting blogs. Run ads around birthdays and holidays. It's a perfect gift product.\n5. **Pricing:** Price as a premium gift item. Factor in printing cost, shipping, marketing, and a healthy margin.`,
    requiredInvestment: 'PKR 400K - 1.2M',
    status: 'draft'
  },
  {
    businessName: 'Local Tourism & Experience Platform',
    industry: 'Travel & Tourism',
    model: 'Marketplace',
    shortDescription: 'A platform connecting tourists with verified local guides for unique experiences beyond standard sightseeing.',
    expectedAnnualGrowth: '30-50%',
    detailedSteps: `1. **Market Gap:** Tourists often miss authentic local culture. Offer experiences like a 'Lahori Food Walk,' 'Old City Photo Tour,' or 'Pottery Making in Hala.'\n2. **Guide Onboarding:** Recruit and rigorously vet passionate local guides. They must have deep knowledge and excellent communication skills.\n3. **Platform:** Create a website showcasing experiences with high-quality photos, detailed itineraries, and a secure booking system.\n4. **Business Model:** Take a commission (15-25%) on each booking.\n5. **Marketing:** Use Instagram and travel blogs to showcase unique experiences. Partner with hotels and travel agencies for referrals.`,
    requiredInvestment: 'PKR 300K - 900K',
    status: 'published'
  },
  {
    businessName: 'Sustainable Packaging Solutions',
    industry: 'Manufacturing/B2B',
    model: 'B2B Sales',
    shortDescription: 'Providing eco-friendly packaging materials (e.g., compostable mailers, paper-based void fill) to e-commerce businesses.',
    expectedAnnualGrowth: '25-40%',
    detailedSteps: `1. **Sourcing:** Identify and partner with manufacturers (local or international) of sustainable packaging materials like cornstarch bags, mushroom packaging, or recycled paper products.\n2. **Target Audience:** Focus on small to medium-sized e-commerce brands in Pakistan who want to improve their environmental credentials.\n3. **Sales & Distribution:** Set up a simple e-commerce site for orders. Proactively reach out to brands on Instagram and LinkedIn.\n4. **Education:** Create content about the benefits of sustainable packaging to build awareness and attract customers.\n5. **Inventory:** Start with a small inventory of the most popular products to manage cash flow.`,
    requiredInvestment: 'PKR 1M - 5M (for initial inventory)',
    status: 'draft'
  },
  {
    businessName: 'Senior Care Services (Non-Medical)',
    industry: 'Healthcare/Services',
    model: 'Service Provider',
    shortDescription: 'Providing non-medical companionship, errand running, and assistance services for senior citizens living alone.',
    expectedAnnualGrowth: '15-25%',
    detailedSteps: `1. **Service Definition:** Focus strictly on non-medical help: grocery shopping, meal prep, companionship, accompanying to appointments, light housekeeping.\n2. **Staff Vetting:** Your staff's trustworthiness is everything. Conduct thorough background checks (police verification is a must) and reference checks.\n3. **Training:** Train staff in elderly care ethics, communication, and basic first aid.\n4. **Pricing:** Offer hourly rates and monthly subscription packages.\n5. **Marketing:** Target the adult children of seniors through community centers, hospitals, and targeted Facebook ads. Build partnerships with doctors.`,
    requiredInvestment: 'PKR 300K - 1M',
    status: 'published'
  },
  {
    businessName: 'Drone Services for Agriculture & Real Estate',
    industry: 'Technology/Services',
    model: 'B2B Service',
    shortDescription: 'Offering professional drone-based services like crop health monitoring, land surveying, and real estate videography.',
    expectedAnnualGrowth: '35-50%',
    detailedSteps: `1. **Equipment & Licensing:** Invest in high-quality drones (e.g., DJI Phantom, Mavic) with good cameras and sensors. Obtain all necessary DGCA/local authority permits.\n2. **Niche Application:** Specialize initially. For agriculture, offer NDVI analysis for crop health. For real estate, offer high-quality aerial video tours.\n3. **Pilot Training:** Get yourself or your pilots professionally trained and certified.\n4. **Data Processing:** The value is in the data. Learn to use software like Pix4D or DroneDeploy to process images and generate valuable reports for clients.\n5. **Client Acquisition:** Directly approach large farm owners, corporate farms, and real estate developers with a strong portfolio of your work.`,
    requiredInvestment: 'PKR 800K - 2.5M (drones are expensive)',
    status: 'published'
  },
  {
    businessName: 'Gourmet Pet Food Delivery',
    industry: 'E-commerce/Pets',
    model: 'Subscription E-commerce',
    shortDescription: 'A subscription service delivering fresh, human-grade, and nutritionally balanced meals for pets.',
    expectedAnnualGrowth: '20-35%',
    detailedSteps: `1. **Recipe Development:** Collaborate with a veterinarian or animal nutritionist to develop balanced recipes for dogs and cats.\n2. **Sourcing & Kitchen:** Source high-quality ingredients. Prepare meals in a dedicated, hygienic commercial kitchen.\n3. **Packaging & Delivery:** Use vacuum-sealed, portioned packaging. Offer weekly or bi-weekly delivery in insulated boxes.\n4. **Subscription Platform:** Use a Shopify store with a subscription app like Recharge.\n5. **Marketing:** Target pet owners on social media. Partner with vets, groomers, and pet influencers. Emphasize the health benefits for pets.`,
    requiredInvestment: 'PKR 500K - 1.5M',
    status: 'draft'
  },
  {
    businessName: 'Electric Vehicle (EV) Charging Station Network',
    industry: 'Energy/Automotive',
    model: 'Infrastructure/Utility',
    shortDescription: 'Building and operating a network of public EV charging stations in key urban locations.',
    expectedAnnualGrowth: '40-60%',
    detailedSteps: `1. **Location Scouting:** This is critical. Identify high-traffic locations: malls, premium restaurants, corporate offices, and major highways.\n2. **Hardware & Partnerships:** Partner with EV charger manufacturers. Form partnerships with property owners for location rights (revenue share model).\n3. **Software Platform:** Develop a mobile app for users to locate stations, check availability, and make payments.\n4. **Grid Connection:** Work with local power distribution companies (e.g., K-Electric, LESCO) for grid connectivity.\n5. **Monetization:** Charge users on a per-kWh basis or a time-based fee. Offer subscription plans for frequent users.`,
    requiredInvestment: 'PKR 5M - 20M+ (per station cost is high)',
    status: 'published'
  },
  {
    businessName: 'AI-Powered Resume Builder & Career Coach',
    industry: 'HR Tech/SaaS',
    model: 'Freemium SaaS',
    shortDescription: 'An online platform that uses AI to help job seekers create perfect resumes and provides automated career advice.',
    expectedAnnualGrowth: '25-40%',
    detailedSteps: `1. **Core AI Feature:** Use a large language model API (like OpenAI's) to parse existing resumes, suggest improvements based on job descriptions, and generate professional summaries.\n2. **Freemium Model:** Offer a free version with basic templates and limited AI suggestions. Premium features (advanced templates, unlimited AI reviews, cover letter generator) would be paid.\n3. **Platform:** Build a web application with a user-friendly resume editor.\n4. **Marketing:** Target university students and young professionals on LinkedIn and through university career services.\n5. **Upsell:** Offer premium one-on-one career coaching sessions as an additional revenue stream.`,
    requiredInvestment: 'PKR 700K - 3M (for development and API costs)',
    status: 'draft'
  },
  {
    businessName: 'Virtual Reality (VR) Arcade',
    industry: 'Entertainment',
    model: 'Location-Based Entertainment',
    shortDescription: 'A modern arcade offering immersive single and multi-player virtual reality gaming experiences.',
    expectedAnnualGrowth: '20-35%',
    detailedSteps: `1. **Location:** Choose a high-footfall area like a major mall or entertainment district.\n2. **Equipment:** Invest in multiple high-end VR headsets (e.g., Valve Index, HTC Vive Pro) and powerful PCs.\n3. **Game Licensing:** License a diverse library of popular VR games. Offer single-player, multi-player, and escape room experiences.\n4. **Pricing:** Charge per hour per station. Offer party packages and corporate event bookings.\n5. **Marketing:** Use social media to showcase exciting gameplay videos. Run promotions for students and families.`,
    requiredInvestment: 'PKR 3M - 8M',
    status: 'published'
  },
  {
    businessName: 'Mobile App for Hyperlocal Services',
    industry: 'Tech/Services',
    model: 'Marketplace App',
    shortDescription: 'A mobile app connecting users with local, verified service providers for tasks like plumbing, AC repair, or tutoring.',
    expectedAnnualGrowth: '30-45%',
    detailedSteps: `1. **Niche First:** Don't do everything. Start with 2-3 high-demand categories like electricians and plumbers.\n2. **Vendor Vetting:** This is your USP. Implement a rigorous verification process for all service providers, including background checks.\n3. **App Development:** Build a user-friendly app for booking, tracking, and payments.\n4. **Monetization:** Take a commission on each completed job or charge vendors a lead generation fee.\n5. **Hyperlocal Marketing:** Focus your initial marketing efforts on a single, dense residential area (e.g., a specific phase in DHA Lahore) before expanding.`,
    requiredInvestment: 'PKR 1.5M - 5M',
    status: 'published'
  },
  {
    businessName: 'Artisan Cheese Making Business',
    industry: 'Food Production',
    model: 'B2C/B2B Manufacturing',
    shortDescription: 'Producing and selling high-quality, European-style artisanal cheeses using local Pakistani milk.',
    expectedAnnualGrowth: '15-25%',
    detailedSteps: `1. **Training & Craft:** Cheese making is a science and an art. Get professional training. Master 2-3 types of cheese first (e.g., Feta, Mozzarella, Halloumi).\n2. **Milk Sourcing:** Establish a relationship with a high-quality local dairy farm for a consistent supply of fresh, high-fat milk.\n3. **Production Setup:** Set up a small, temperature-controlled, and hygienic production facility (a "creamery").\n4. **Distribution:** Sell directly to consumers at farmer's markets and online. Supply to high-end restaurants, cafes, and gourmet grocery stores.\n5. **Branding:** Build a premium brand focused on quality, local ingredients, and the artisanal process.`,
    requiredInvestment: 'PKR 1M - 3M',
    status: 'draft'
  },
  {
    businessName: 'Custom Mechanical Keyboard Building',
    industry: 'E-commerce/Hobbyist',
    model: 'Niche E-commerce',
    shortDescription: 'An online store and service for building and selling custom mechanical keyboards for enthusiasts and gamers.',
    expectedAnnualGrowth: '20-30%',
    detailedSteps: `1. **Expertise:** Become an expert in mechanical keyboards (switches, keycaps, cases, PCBs).\n2. **Sourcing:** Source components from international suppliers (e.g., from China, USA).\n3. **Service Offering:** Offer fully pre-built custom keyboards, DIY kits, and individual components.\n4. **Community Engagement:** Build a presence in Pakistani keyboard and gaming communities on Facebook and Discord.\n5. **Content Marketing:** Create content (YouTube videos, blog posts) about keyboard building, sound tests, and modding to attract customers.`,
    requiredInvestment: 'PKR 300K - 1M (for initial component inventory)',
    status: 'published'
  },
  {
    businessName: 'Personal Finance & Investment App',
    industry: 'Fintech',
    model: 'SaaS',
    shortDescription: 'A mobile app designed for the Pakistani market to track expenses, manage budgets, and learn about local investment options.',
    expectedAnnualGrowth: '30-50%',
    detailedSteps: `1. **Core Features:** Focus on expense tracking via SMS scraping (with permission), budget planning, and bill reminders.\n2. **Educational Content:** Integrate content explaining Pakistani investment options (stocks, mutual funds, National Savings, etc.) in simple Urdu and English.\n3. **Monetization:** Offer a freemium model. Premium features could include advanced analytics, connecting to bank accounts (if APIs are available), or personalized investment advice.\n4. **Regulatory Compliance:** Understand and comply with SECP and SBP regulations regarding financial advice.\n5. **Marketing:** Target young professionals and university students through digital marketing and financial literacy workshops.`,
    requiredInvestment: 'PKR 2M - 7M',
    status: 'draft'
  },
  {
    businessName: '3D Printing Service Bureau',
    industry: 'Manufacturing/Tech',
    model: 'B2B/B2C Service',
    shortDescription: 'Offering on-demand 3D printing services for architects, engineers, product designers, and hobbyists.',
    expectedAnnualGrowth: '25-40%',
    detailedSteps: `1. **Equipment:** Invest in a few different types of 3D printers to offer various materials and resolutions (e.g., FDM for prototyping, SLA for high detail).\n2. **Target Niches:** Focus on specific client types: architectural models for real estate developers, custom parts for university engineering projects, or figurines for hobbyists.\n3. **Online Platform:** Create a website where users can upload their 3D models, get an instant quote, and place an order.\n4. **Material Sales:** Also sell 3D printing filaments and resins as an additional revenue stream.\n5. **Education:** Host workshops to teach people 3D modeling and printing, creating a pipeline of future customers.`,
    requiredInvestment: 'PKR 600K - 2M (for printers and materials)',
    status: 'published'
  },
  {
    businessName: 'Specialized Coffee Roastery & Cafe',
    industry: 'Food & Beverage',
    model: 'Retail & Wholesale',
    shortDescription: 'A small-batch coffee roastery with an attached cafe focusing on high-quality, single-origin beans and coffee education.',
    expectedAnnualGrowth: '15-25%',
    detailedSteps: `1. **Sourcing:** Source high-quality green coffee beans from reputable international importers.\n2. **Roasting:** Invest in a good quality coffee roaster and master the craft of roasting to bring out the best in each bean.\n3. **Cafe Experience:** Create a minimalist, welcoming cafe space focused on the coffee experience (e.g., manual brewing methods, tasting notes).\n4. **Wholesale:** Supply your roasted beans to other cafes, restaurants, and offices.\n5. **Direct to Consumer:** Sell packaged beans and brewing equipment both in-store and online. Offer coffee subscriptions.`,
    requiredInvestment: 'PKR 2.5M - 6M',
    status: 'published'
  },
  {
    businessName: 'Data Analytics as a Service (DaaS) for Retailers',
    industry: 'B2B/Tech',
    model: 'B2B SaaS',
    shortDescription: 'A subscription service that helps small to medium retailers analyze their sales data to optimize inventory and marketing.',
    expectedAnnualGrowth: '30-45%',
    detailedSteps: `1. **Problem:** Small retailers lack the tools to analyze their sales data effectively.\n2. **Solution:** Build a platform that integrates with common local POS systems. It should provide simple dashboards showing best-selling products, peak sales hours, customer loyalty metrics, etc.\n3. **Subscription Tiers:** Offer different tiers based on the number of transactions or stores.\n4. **Sales:** Directly approach retail businesses, showing them a demo of how your platform can increase their profitability.\n5. **Data Security:** Ensure your platform is secure and compliant with data privacy principles.`,
    requiredInvestment: 'PKR 1M - 4M',
    status: 'draft'
  },
  {
    businessName: 'Modern, Branded Car Wash & Detailing Center',
    industry: 'Automotive/Services',
    model: 'Retail Service',
    shortDescription: 'A professional car wash and detailing center with a focus on customer experience, quality products, and a membership model.',
    expectedAnnualGrowth: '15-25%',
    detailedSteps: `1. **Location & Setup:** Secure a location with easy access. Invest in modern equipment (e.g., high-pressure washers, foam cannons) and a comfortable waiting area with Wi-Fi.\n2. **Service Packages:** Offer clear packages: Basic Wash, Wash & Wax, Interior Detailing, Full Detailing, Ceramic Coating.\n3. **Membership Model:** Offer unlimited monthly wash packages for a fixed fee to create recurring revenue.\n4. **Branding:** Create a strong, trustworthy brand that stands out from informal roadside car washes.\n5. **Marketing:** Use location-based social media ads. Partner with local car clubs and corporate offices for fleet deals.`,
    requiredInvestment: 'PKR 1.5M - 5M',
    status: 'published'
  },
  {
    businessName: 'Last-Mile Logistics for E-commerce',
    industry: 'Logistics/Tech',
    model: 'B2B Service',
    shortDescription: 'Providing fast, reliable, and tech-enabled last-mile delivery services specifically for small e-commerce businesses.',
    expectedAnnualGrowth: '25-40%',
    detailedSteps: `1. **Tech-First Approach:** Develop a simple dashboard for businesses to book deliveries and a mobile app for riders with route optimization.\n2. **Niche Focus:** Initially, focus on a specific area of a large city (e.g., Gulberg, Lahore) and offer same-day or next-day delivery.\n3. **Rider Network:** Build a network of reliable delivery riders (either on salary or per-delivery basis).\n4. **Target Clients:** Approach small to medium Instagram and Shopify stores who are underserved by larger courier companies.\n5. **Pricing:** Offer competitive, weight-based pricing with a clear zone map.`,
    requiredInvestment: 'PKR 500K - 2M',
    status: 'published'
  },
  {
    businessName: 'Bespoke Corporate Training Provider',
    industry: 'HR/Services',
    model: 'B2B Service',
    shortDescription: 'Offering customized training workshops to companies on topics like leadership, sales, and digital skills.',
    expectedAnnualGrowth: '20-30%',
    detailedSteps: `1. **Trainer Network:** Build a network of expert freelance trainers with strong industry experience.\n2. **Needs Analysis:** Instead of off-the-shelf courses, work with companies to conduct a training needs analysis and design a custom program.\n3. **Core Modules:** Develop core, high-demand modules: "Leadership for New Managers," "Advanced Sales Techniques," "Digital Marketing for Non-Marketers."\n4. **Client Acquisition:** Use LinkedIn to connect with HR managers and department heads. Showcase testimonials and case studies from previous clients.\n5. **Delivery:** Offer both in-person and live virtual training sessions.`,
    requiredInvestment: 'PKR 200K - 800K',
    status: 'draft'
  },
  {
    businessName: 'Personalized Gifting Service',
    industry: 'E-commerce',
    model: 'DTC E-commerce',
    shortDescription: 'An online store offering curated and personalized gift boxes for various occasions like birthdays, anniversaries, and corporate events.',
    expectedAnnualGrowth: '18-28%',
    detailedSteps: `1. **Curation:** Source unique, high-quality products from local artisans and brands.\n2. **Themed Boxes:** Create pre-curated boxes for specific occasions (e.g., "New Mom Gift Box," "Corporate Welcome Kit").\n3. **Personalization:** Offer options to add personalized items like engraved mugs, custom-printed cards, or monogrammed accessories.\n4. **Platform:** Build a visually appealing Shopify store.\n5. **Marketing:** Focus on Instagram and Pinterest. Run targeted ads around key gifting seasons (Valentine's, Eid, Mother's Day).`,
    requiredInvestment: 'PKR 400K - 1.2M',
    status: 'published'
  },
  {
    businessName: 'Event Management for Niche Events',
    industry: 'Events/Services',
    model: 'Service',
    shortDescription: 'An event management company specializing in niche events like comic cons, book festivals, or pet shows.',
    expectedAnnualGrowth: '15-25%',
    detailedSteps: `1. **Choose Your Niche:** Become the go-to expert for a specific type of event that is underserved in your city.\n2. **Vendor Network:** Build a strong network of vendors relevant to your niche (e.g., artists for a comic con, authors for a book festival).\n3. **Sponsorships:** Develop attractive sponsorship packages to sell to relevant brands to fund your events.\n4. **Community Building:** Create an online community around your event niche to build hype and sell tickets year-round.\n5. **Execution:** Flawless execution of one successful event is your best marketing for the next one.`,
    requiredInvestment: 'PKR 500K - 3M (highly dependent on event scale)',
    status: 'published'
  },
  {
    businessName: 'Smart Home Automation Installation',
    industry: 'Tech/Services',
    model: 'B2C Service',
    shortDescription: 'A service that sells, installs, and configures smart home devices (lights, cameras, speakers) for homeowners.',
    expectedAnnualGrowth: '25-40%',
    detailedSteps: `1. **Product Partnerships:** Become an authorized reseller and installer for popular smart home brands (e.g., Philips Hue, Google Nest, Amazon Alexa).\n2. **Service Packages:** Offer packages like "Starter Smart Home Kit," "Home Security Package," and "Full Home Automation."\n3. **Certified Technicians:** Train your technicians to be experts in installation, network configuration, and troubleshooting.\n4. **Target Audience:** Target owners of new homes and apartments in upscale residential areas.\n5. **Marketing:** Showcase projects on social media. Partner with real estate developers and interior designers.`,
    requiredInvestment: 'PKR 600K - 2M',
    status: 'draft'
  },
  {
    businessName: 'Rental Marketplace for Occasional-Use Items',
    industry: 'E-commerce/Sharing Economy',
    model: 'Peer-to-Peer Marketplace',
    shortDescription: 'A platform where people can rent out items they own but rarely use, like cameras, camping gear, or formal wear.',
    expectedAnnualGrowth: '20-35%',
    detailedSteps: `1. **Niche Focus:** Start with one or two high-value categories, such as high-end camera equipment or party/event supplies.\n2. **Platform:** Build a website or app where users can list their items, manage bookings, and process payments.\n3. **Trust & Security:** This is crucial. Implement user verification, reviews, and offer an insurance option (partner with an insurance company) for rented items.\n4. **Logistics:** Initially, let users manage pickup and drop-off themselves. Later, you can offer a delivery service for a fee.\n5. **Build Liquidity:** The platform is useless without items. Run a campaign to get the first 100 item listings, possibly with zero commission initially.`,
    requiredInvestment: 'PKR 1M - 4M',
    status: 'published'
  },
  // Add 40+ more unique and detailed business models
  {
    businessName: 'Local Language Learning App',
    industry: 'EdTech',
    model: 'Mobile App (Freemium)',
    shortDescription: 'A gamified mobile app for learning Pakistani regional languages like Punjabi, Sindhi, and Pashto.',
    expectedAnnualGrowth: '20-30%',
    detailedSteps: `1. **Market Need:** Young generation and expatriates losing touch with regional languages. A fun, modern way to learn is needed.\n2. **Content:** Create bite-sized lessons with vocabulary, grammar, audio pronunciations by native speakers, and cultural notes.\n3. **Gamification:** Use points, streaks, and leaderboards to keep users engaged.\n4. **Monetization:** Offer basic lessons for free. Unlock advanced levels, ad-free experience, and live practice sessions with a premium subscription.\n5. **Marketing:** Target university students, cultural societies, and the Pakistani diaspora on social media.`,
    requiredInvestment: 'PKR 1.2M - 4M',
    status: 'published'
  },
  {
    businessName: 'Solar Panel Installation & Maintenance',
    industry: 'Energy/Services',
    model: 'B2C/B2B Service',
    shortDescription: 'Providing end-to-end solar solutions for residential and commercial properties, from consultation to installation.',
    expectedAnnualGrowth: '30-50%',
    detailedSteps: `1. **Technical Expertise:** Gain certifications in solar system design and installation.\n2. **Supplier Partnerships:** Partner with reputable solar panel, inverter, and battery manufacturers.\n3. **Consultative Sales:** Offer a free energy audit and consultation to potential clients to show them the potential savings.\n4. **Installation Team:** Hire and train a professional installation team that prioritizes safety and quality workmanship.\n5. **After-Sales Service:** Offer annual maintenance contracts (e.g., panel cleaning, system check-ups) for recurring revenue.`,
    requiredInvestment: 'PKR 1.5M - 6M (for initial inventory and team)',
    status: 'published'
  },
  {
    businessName: 'Waste Management & Recycling Service',
    industry: 'Environmental/Services',
    model: 'B2B/B2C Subscription',
    shortDescription: 'A private waste management company specializing in source-segregated waste collection and recycling for residential complexes and businesses.',
    expectedAnnualGrowth: '15-25%',
    detailedSteps: `1. **Niche:** Focus on source segregation (paper, plastic, organic). Provide customers with color-coded bins.\n2. **Logistics:** Operate a fleet of small trucks for efficient collection on scheduled routes.\n3. **Sorting Facility:** Set up a small material recovery facility (MRF) to sort and bale the collected recyclables.\n4. **Revenue Streams:** Charge a monthly collection fee to households/businesses. Sell the sorted recyclable materials to larger recycling plants.\n5. **Marketing:** Target residents' welfare associations (RWAs) of apartment complexes and environmentally conscious businesses.`,
    requiredInvestment: 'PKR 4M - 12M (for vehicles and facility)',
    status: 'draft'
  },
  {
    businessName: 'Mobile Truck/Car Repair Service',
    industry: 'Automotive/Services',
    model: 'On-Demand Service',
    shortDescription: 'A mobile mechanic service that performs routine maintenance and minor repairs at the customer\'s home or office.',
    expectedAnnualGrowth: '20-30%',
    detailedSteps: `1. **Service Focus:** Start with high-demand services: oil changes, battery replacement, brake pad changes, and diagnostics.\n2. **The Van:** Equip a van with all the necessary professional tools, diagnostic equipment, and common spare parts.\n3. **Certified Mechanics:** Hire experienced and certified mechanics who are also customer-friendly.\n4. **Booking System:** Use a simple website or a dedicated phone number for customers to book appointments.\n5. **Marketing:** Use targeted online ads for your service area. Partner with corporate offices to offer employee discounts.`,
    requiredInvestment: 'PKR 1M - 2.5M (for van and equipment)',
    status: 'published'
  },
  {
    businessName: 'DIY Craft & Hobby Kits',
    industry: 'E-commerce',
    model: 'DTC E-commerce',
    shortDescription: 'Selling curated DIY kits for adults and children, such as candle making, painting, or model building.',
    expectedAnnualGrowth: '18-28%',
    detailedSteps: `1. **Kit Curation:** Design all-in-one kits with clear, easy-to-follow instructions. Start with popular hobbies.\n2. **Sourcing:** Source materials in bulk from local and international suppliers to keep costs down.\n3. **Branding & Packaging:** Create attractive and gift-worthy packaging.\n4. **Online Store:** Sell through your own Shopify store and on marketplaces like Daraz.\n5. **Content Marketing:** Create video tutorials and project showcases on Instagram and YouTube to inspire and attract buyers.`,
    requiredInvestment: 'PKR 300K - 900K',
    status: 'published'
  },
  {
    businessName: 'Cloud-Based Accounting for Small Businesses',
    industry: 'Fintech/SaaS',
    model: 'B2B SaaS',
    shortDescription: 'A simple, affordable, cloud-based accounting and invoicing software tailored for Pakistani freelancers and small businesses.',
    expectedAnnualGrowth: '25-40%',
    detailedSteps: `1. **Problem:** Traditional accounting software is complex and expensive for small businesses in Pakistan.\n2. **Core Features:** Focus on simplicity: creating professional invoices, tracking expenses, generating FBR-compliant sales tax reports, and simple financial dashboards.\n3. **Pricing:** Offer a competitive monthly subscription model (e.g., PKR 1000-3000/month).\n4. **Marketing:** Target freelancers on platforms like Upwork, and small business owners through Facebook groups and digital ads.\n5. **Customer Support:** Provide excellent, responsive customer support via chat and email.`,
    requiredInvestment: 'PKR 2M - 6M (for software development)',
    status: 'draft'
  },
  {
    businessName: 'Hydroponic Farming (Urban Farm)',
    industry: 'Agriculture/Food',
    model: 'B2B/B2C Production',
    shortDescription: 'Growing high-value produce like lettuce, herbs, and strawberries year-round in an urban hydroponic farm.',
    expectedAnnualGrowth: '20-35%',
    detailedSteps: `1. **Setup:** Set up a vertical hydroponic system in a controlled environment (e.g., a warehouse or rooftop greenhouse). This saves space and water.\n2. **Crop Selection:** Focus on high-demand, high-margin crops that are difficult to source locally with good quality (e.g., arugula, basil, kale).\n3. **Distribution Channels:** Supply directly to high-end restaurants, gourmet supermarkets, and sell directly to consumers via a subscription box model.\n4. **Expertise:** Gain knowledge in hydroponics, nutrient solutions, and pest management.\n5. **Branding:** Build a brand around freshness, sustainability, and "locally grown in the city."`,
    requiredInvestment: 'PKR 2.5M - 8M',
    status: 'published'
  },
  {
    businessName: 'Esports Tournament Platform',
    industry: 'Gaming/Entertainment',
    model: 'Platform',
    shortDescription: 'An online platform for organizing and managing amateur and semi-pro esports tournaments in Pakistan for popular games.',
    expectedAnnualGrowth: '30-50%',
    detailedSteps: `1. **Game Focus:** Start with 1-2 highly popular games in Pakistan (e.g., PUBG Mobile, Valorant).\n2. **Platform Features:** The platform should handle team registrations, bracket generation, score reporting, and player profiles.\n3. **Monetization:** Charge a small entry fee per team. Secure sponsorships from brands targeting gamers (e.g., tech, snacks, beverages).\n4. **Community Management:** Build a community on Discord and social media. Stream matches on YouTube or Twitch.\n5. **Anti-Cheat:** Implement strong anti-cheat measures to maintain the integrity of your tournaments.`,
    requiredInvestment: 'PKR 800K - 2.5M',
    status: 'published'
  },
  {
    businessName: 'Personalized Nutrition & Diet Plan Service',
    industry: 'Health & Wellness',
    model: 'Online Service',
    shortDescription: 'Connecting users with certified nutritionists who create customized diet plans based on their goals and lifestyle.',
    expectedAnnualGrowth: '20-30%',
    detailedSteps: `1. **Onboard Nutritionists:** Partner with a team of qualified and certified nutritionists.\n2. **Consultation Process:** Create a detailed online questionnaire for users to fill out their goals, dietary preferences, and medical history.\n3. **Service Tiers:** Offer one-time plans, monthly check-in plans, and premium plans with direct chat support.\n4. **Tech Platform:** A website for marketing, onboarding, and delivering the plans. A mobile app can be a future step.\n5. **Content Marketing:** Create a blog and social media presence with healthy recipes, nutrition tips, and success stories to build credibility.`,
    requiredInvestment: 'PKR 300K - 900K',
    status: 'draft'
  },
  {
    businessName: 'Ethnic Wear Rental Service',
    industry: 'Fashion/E-commerce',
    model: 'Rental E-commerce',
    shortDescription: 'An online service for renting high-end designer and bridal wear for weddings and formal events.',
    expectedAnnualGrowth: '18-28%',
    detailedSteps: `1. **Inventory:** Acquire an inventory of designer outfits through purchasing, consignment with designers, or partnering with individuals.\n2. **Operations:** Invest in professional dry-cleaning and minor repair services to maintain the quality of the garments.\n3. **Website:** Build an e-commerce site with a robust booking calendar and high-quality photography.\n4. **Logistics:** Manage delivery and pickup of garments efficiently.\n5. **Marketing:** Target users on Instagram and Facebook who are attending weddings. Collaborate with wedding planners and makeup artists.`,
    requiredInvestment: 'PKR 1.5M - 5M+ (inventory is expensive)',
    status: 'published'
  },
  {
    businessName: 'Career Counseling for Students',
    industry: 'Education/Services',
    model: 'B2C Service',
    shortDescription: 'Providing personalized career counseling and university admission guidance for O/A Level and FSc students.',
    expectedAnnualGrowth: '15-25%',
    detailedSteps: `1. **Expert Counselors:** Build a team of experienced career counselors who understand both local and international university admission processes.\n2. **Service Packages:** Offer packages including psychometric testing, career path exploration, university shortlisting, and application assistance.\n3. **Partnerships:** Collaborate with schools and colleges to offer your services to their students.\n4. **Online Presence:** Create a professional website with success stories and testimonials.\n5. **Workshops:** Conduct free workshops and webinars on topics like "Choosing the Right Major" to generate leads.`,
    requiredInvestment: 'PKR 250K - 750K',
    status: 'published'
  },
  {
    businessName: 'Antique & Vintage Furniture Restoration',
    industry: 'Services/Retail',
    model: 'Service & Retail Hybrid',
    shortDescription: 'A workshop that restores and sells vintage and antique furniture, and also offers restoration services for customers.',
    expectedAnnualGrowth: '12-22%',
    detailedSteps: `1. **Skill & Workshop:** Master furniture restoration techniques. Set up a workshop with proper tools and ventilation.\n2. **Sourcing:** Source old furniture from flea markets, auctions, and online marketplaces (e.g., Olx).\n3. **Restoration:** Painstakingly restore pieces to their former glory, documenting the before-and-after process.\n4. **Sales Channels:** Sell the restored pieces through a physical showroom, Instagram, and your own website.\n5. **Service Offering:** Offer your restoration skills as a service to clients who have their own heirloom pieces.`,
    requiredInvestment: 'PKR 500K - 1.8M',
    status: 'draft'
  },
  {
    businessName: 'Fleet Management System (SaaS)',
    industry: 'Logistics/SaaS',
    model: 'B2B SaaS',
    shortDescription: 'A software platform for businesses to track their vehicles in real-time, monitor fuel consumption, and manage maintenance schedules.',
    expectedAnnualGrowth: '25-40%',
    detailedSteps: `1. **Hardware Integration:** Partner with GPS tracking hardware providers.\n2. **Software Development:** Build a web and mobile dashboard for fleet managers. Core features should include a live map, trip history, over-speeding alerts, and maintenance reminders.\n3. **Target Audience:** Target logistics companies, distribution businesses, and companies with a large sales fleet.\n4. **Pricing:** Offer a monthly subscription fee per vehicle.\n5. **Direct Sales:** Employ a B2B sales team to directly approach and demo the product to potential clients.`,
    requiredInvestment: 'PKR 2.5M - 8M',
    status: 'published'
  },
  {
    businessName: 'Ethical & Halal Cosmetics Brand',
    industry: 'Beauty/E-commerce',
    model: 'DTC Brand',
    shortDescription: 'Developing and marketing a line of cosmetics that are cruelty-free, vegan, and certified Halal for the modern Muslim consumer.',
    expectedAnnualGrowth: '20-35%',
    detailedSteps: `1. **Formulation & Manufacturing:** Partner with a third-party cosmetics manufacturer to develop your product line. Ensure you get all necessary certifications (Halal, vegan).\n2. **Branding:** Create a brand that is modern, ethical, and appeals to your target demographic.\n3. **Product Range:** Start with a focused range of products, like foundation, lipsticks, and skincare.\n4. **Distribution:** Sell primarily through your own e-commerce website and partner with select online marketplaces.\n5. **Influencer Marketing:** Collaborate with beauty and lifestyle influencers who align with your brand's ethical values.`,
    requiredInvestment: 'PKR 1.5M - 5M (for formulation and initial inventory)',
    status: 'published'
  },
  {
    businessName: 'Customized Corporate Merchandising',
    industry: 'B2B/Services',
    model: 'B2B Service',
    shortDescription: 'Providing high-quality, customized corporate gifts and merchandise (e.g., notebooks, pens, apparel) for businesses.',
    expectedAnnualGrowth: '15-25%',
    detailedSteps: `1. **Supplier Network:** Build relationships with suppliers for various products (apparel, stationery, tech gadgets).\n2. **Printing & Customization:** Partner with high-quality printing and engraving workshops.\n3. **Design Services:** Offer in-house design services to help clients create their custom merchandise.\n4. **Sales:** Create a professional catalog and directly approach HR and marketing departments of companies.\n5. **Quality Control:** Ensure a rigorous quality check before delivering any order to build a reputation for reliability.`,
    requiredInvestment: 'PKR 400K - 1.2M',
    status: 'draft'
  },
  {
    businessName: 'Mobile Pet Grooming Service',
    industry: 'Pets/Services',
    model: 'Mobile Service',
    shortDescription: 'A fully equipped van that travels to customers\' homes to provide professional grooming services for pets.',
    expectedAnnualGrowth: '18-28%',
    detailedSteps: `1. **The Van:** Purchase and custom-fit a van with a grooming table, bathtub, water tanks, and all necessary grooming tools.\n2. **Professional Groomers:** Hire experienced and certified pet groomers who are gentle with animals.\n3. **Booking System:** Use an online booking system where customers can choose a time slot.\n4. **Pricing:** Price as a premium convenience service, higher than traditional grooming salons.\n5. **Marketing:** Target pet owners in specific affluent neighborhoods using social media ads and flyers in pet stores and vet clinics.`,
    requiredInvestment: 'PKR 1.8M - 4M (van conversion is costly)',
    status: 'published'
  },
  {
    businessName: 'Local News & Events Newsletter',
    industry: 'Media',
    model: 'Subscription/Advertising',
    shortDescription: 'A curated daily or weekly email newsletter covering important news, events, and happenings in a specific city (e.g., "Karachi Minutes").',
    expectedAnnualGrowth: '15-25%',
    detailedSteps: `1. **Content Curation:** Aggregate and summarize the most important local news and events in an easy-to-read format.\n2. **Platform:** Use an email marketing platform like Substack or Mailchimp.\n3. **Growth:** Promote the newsletter in local Facebook groups and through social media to get initial subscribers.\n4. **Monetization:** Once you have a substantial subscriber base, monetize through a premium subscription (for in-depth content) and selling classified ad space to local businesses.\n5. **Consistency:** Delivering the newsletter on a consistent schedule is key to retaining subscribers.`,
    requiredInvestment: 'PKR 50K - 200K',
    status: 'published'
  },
  {
    businessName: 'Board Game Cafe',
    industry: 'Entertainment/Food',
    model: 'Retail/Experience',
    shortDescription: 'A cafe offering a wide variety of board games for customers to play, along with a menu of snacks and beverages.',
    expectedAnnualGrowth: '12-20%',
    detailedSteps: `1. **Game Library:** Invest in a large and diverse library of board games, from classic to modern strategy games.\n2. **Location:** Choose a location that is easily accessible and has a cozy, comfortable ambiance.\n3. **Revenue Model:** Charge a per-person hourly fee to play games. Generate additional revenue from food and beverage sales.\n4. **Game Gurus:** Hire staff ("Game Gurus") who can explain game rules and recommend games to customers.\n5. **Events:** Host regular events like tournament nights, new game launch parties, and "learn-to-play" sessions to build a community.`,
    requiredInvestment: 'PKR 2.5M - 7M',
    status: 'draft'
  },
  {
    businessName: 'Subscription-based Legal Services for Startups',
    industry: 'Legal/Services',
    model: 'B2B Subscription',
    shortDescription: 'A legal-tech firm offering a monthly subscription for basic legal services to startups, like document review and consultation.',
    expectedAnnualGrowth: '20-30%',
    detailedSteps: `1. **Team:** Build a team of lawyers specializing in corporate and tech law.\n2. **Service Tiers:** Offer tiered monthly plans. Basic tier could include a set number of document reviews and consultation hours. Premium tiers could include company registration and trademark filing.\n3. **Platform:** A client portal for submitting documents, scheduling calls, and accessing legal templates.\n4. **Target Market:** Market heavily to startups in incubators, accelerators, and co-working spaces.\n5. **Efficiency:** Use technology and standardized processes to deliver services efficiently and keep costs low.`,
    requiredInvestment: 'PKR 700K - 2.5M',
    status: 'published'
  },
  {
    businessName: 'Outdoor Adventure & Camping Trips',
    industry: 'Travel & Tourism',
    model: 'Tour Operator',
    shortDescription: 'Organizing and guiding curated camping, hiking, and adventure trips to scenic locations in Northern Pakistan.',
    expectedAnnualGrowth: '22-35%',
    detailedSteps: `1. **Niche Itineraries:** Design unique trips beyond the usual tourist spots. Focus on experiences like stargazing, wilderness survival basics, or yoga retreats in the mountains.\n2. **Logistics & Safety:** Invest in high-quality camping gear. Have certified guides and a strong focus on safety protocols and emergency plans.\n3. **Booking Platform:** A professional website with detailed trip information, galleries, and an online booking system.\n4. **Marketing:** Use stunning photos and videos from your trips on social media to attract adventure seekers.\n5. **Partnerships:** Collaborate with travel bloggers and adventure influencers.`,
    requiredInvestment: 'PKR 800K - 3M (for gear and marketing)',
    status: 'published'
  },
  {
    businessName: 'Ghost Kitchen for Home Chefs',
    industry: 'FoodTech/Real Estate',
    model: 'Space as a Service',
    shortDescription: 'A commercial kitchen space with multiple stations that home chefs can rent by the hour or day to prepare food for their delivery businesses.',
    expectedAnnualGrowth: '25-40%',
    detailedSteps: `1. **Facility:** Lease a commercial space and equip it with multiple professional-grade kitchen stations (cooking range, prep area, refrigeration).\n2. **Licensing:** Obtain all necessary food and commercial kitchen licenses.\n3. **Booking System:** Create an online system for chefs to book kitchen time slots.\n4. **Value-Added Services:** Offer additional services like bulk ingredient sourcing, packaging supplies, and partnerships with delivery services.\n5. **Target Audience:** Market to the growing number of home-based food businesses on Instagram and Facebook.`,
    requiredInvestment: 'PKR 3.5M - 10M',
    status: 'draft'
  },
  {
    businessName: 'AI-based Content Generation Tool for Urdu',
    industry: 'SaaS/AI',
    model: 'B2B/B2C SaaS',
    shortDescription: 'A software tool that uses AI to generate marketing copy, social media posts, and articles in high-quality, natural-sounding Urdu.',
    expectedAnnualGrowth: '35-55%',
    detailedSteps: `1. **Core Technology:** Fine-tune a large language model (like Llama or a GPT model) specifically on a large corpus of high-quality Urdu text.\n2. **Web Interface:** Build a simple web application where users can select a template (e.g., "Facebook Ad," "Blog Post Intro"), input keywords, and generate content.\n3. **Subscription Model:** Offer tiered monthly subscriptions based on the number of words generated.\n4. **Target Audience:** Market to digital marketing agencies, content creators, and businesses in Pakistan.\n5. **Continuous Improvement:** Continuously train the model on new data to improve the quality and style of the generated content.`,
    requiredInvestment: 'PKR 1.5M - 5M (API and fine-tuning costs)',
    status: 'published'
  },
  {
    businessName: 'Custom-Fit Orthotics via 3D Scanning',
    industry: 'HealthTech/Retail',
    model: 'Hybrid B2C',
    shortDescription: 'Using mobile 3D foot scanning technology and 3D printing to create perfectly custom-fitted shoe insoles for customers.',
    expectedAnnualGrowth: '20-30%',
    detailedSteps: `1. **Technology:** Develop or license a mobile app that uses the phone's camera to create an accurate 3D scan of a person's foot.\n2. **Manufacturing:** Partner with a 3D printing facility that can print with flexible, durable materials (like TPU) to produce the custom orthotics.\n3. **Podiatrist Partnership:** Collaborate with podiatrists and physiotherapists who can recommend your service to their patients.\n4. **Marketing:** Target athletes, people with foot pain, and individuals who stand for long hours (e.g., retail workers, nurses).\n5. **Pricing:** Position it as a premium, custom healthcare product.`,
    requiredInvestment: 'PKR 2M - 6M (for app development and partnerships)',
    status: 'draft'
  },
  {
    businessName: 'Cold Pressed Juice & Health Shots Subscription',
    industry: 'Food & Beverage',
    model: 'Subscription E-commerce',
    shortDescription: 'A subscription service delivering fresh, cold-pressed juices and wellness shots (e.g., ginger, turmeric) to homes and offices.',
    expectedAnnualGrowth: '18-28%',
    detailedSteps: `1. **Equipment:** Invest in a commercial-grade cold press juicer, which retains more nutrients than traditional juicers.\n2. **Recipe Development:** Create a menu of delicious and functional juice blends (e.g., for detox, energy, immunity).\n3. **Subscription Plans:** Offer weekly subscription plans with a variety of juice combinations.\n4. **Logistics:** Plan efficient delivery routes to ensure customers receive their juices fresh every few days.\n5. **Marketing:** Target health-conscious consumers and corporate offices for employee wellness programs.`,
    requiredInvestment: 'PKR 1.2M - 3.5M',
    status: 'published'
  },
  {
    businessName: 'Personal Styling & Wardrobe Management Service',
    industry: 'Fashion/Services',
    model: 'B2C Service',
    shortDescription: 'Offering personal styling, wardrobe audits, and personal shopping services for busy professionals.',
    expectedAnnualGrowth: '15-25%',
    detailedSteps: `1. **Build Expertise:** Develop a strong sense of style and knowledge of body types, color theory, and local brands.\n2. **Service Packages:** Offer services like "Wardrobe Detox," "Special Event Styling," and a "Seasonal Style Update" subscription.\n3. **Build a Portfolio:** Style friends or offer free services initially to build a portfolio of before-and-after transformations.\n4. **Partnerships:** Collaborate with local fashion boutiques and department stores for commissions on purchased items.\n5. **Marketing:** Use a visually appealing Instagram account and a professional website to attract clients. Target high-income professionals on LinkedIn.`,
    requiredInvestment: 'PKR 100K - 400K',
    status: 'published'
  },
  {
    businessName: 'Tech Gadget Repair & Refurbishment',
    industry: 'Services/Retail',
    model: 'Service & Retail Hybrid',
    shortDescription: 'A professional service center for repairing smartphones, laptops, and other gadgets, which also sells certified refurbished devices.',
    expectedAnnualGrowth: '20-30%',
    detailedSteps: `1. **Technical Skills:** Hire or become a certified technician for popular brands like Apple, Samsung, etc.\n2. **Workshop & Sourcing:** Set up a clean, professional workshop. Build relationships with suppliers for high-quality spare parts.\n3. **Refurbishment:** Buy used or broken devices, professionally repair and refurbish them, and sell them with a short-term warranty.\n4. **Transparency:** Offer clear, upfront pricing for repairs.\n5. **Trust:** Build trust through excellent customer service and by offering a warranty on your repairs and refurbished products.`,
    requiredInvestment: 'PKR 700K - 2M (for tools and part inventory)',
    status: 'published'
  }
];

export default function AdminManageDirectoryPage() {
  const [directoryEntries, setDirectoryEntries] = useState<BusinessDirectoryEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<BusinessDirectoryEntry | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<DirectoryFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { businessName: "", industry: "", model: "", shortDescription: "", expectedAnnualGrowth: "", detailedSteps: "", requiredInvestment: "", status: "draft" },
  });

  useEffect(() => {
    if (!db) {
        toast({title: "Error", description: "Database not available.", variant: "destructive"});
        setIsLoading(false);
        return;
    }
    setIsLoading(true);
    const directoryRef = collection(db, "businessDirectory");
    const q = query(directoryRef, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const entries: BusinessDirectoryEntry[] = [];
      querySnapshot.forEach((docSnap) => {
        entries.push({ id: docSnap.id, ...docSnap.data() } as BusinessDirectoryEntry);
      });
      setDirectoryEntries(entries);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching directory entries:", error);
      toast({ title: "Fetch Error", description: "Could not load directory from database.", variant: "destructive" });
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [toast]);

  useEffect(() => {
    if (isFormOpen) {
      if (editingEntry) {
        form.reset(editingEntry); 
      } else {
        form.reset({ businessName: "", industry: "", model: "", shortDescription: "", expectedAnnualGrowth: "", detailedSteps: "", requiredInvestment: "", status: "draft" });
      }
    }
  }, [editingEntry, form, isFormOpen]);

  const filteredEntries = useMemo(() => {
    return directoryEntries.filter(entry =>
      (entry.businessName?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (entry.industry?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (entry.model?.toLowerCase() || "").includes(searchTerm.toLowerCase())
    ).filter(entry => statusFilter === 'all' || entry.status === statusFilter);
  }, [directoryEntries, searchTerm, statusFilter]);

  const handleFormSubmit = async (values: DirectoryFormValues) => {
    if (!db) return;
    form.formState.isSubmitting; 

    try {
      if (editingEntry) {
        const entryDocRef = doc(db, "businessDirectory", editingEntry.id);
        await updateDoc(entryDocRef, { ...values, updatedAt: serverTimestamp() });
        toast({ title: "Entry Updated", description: `Business model "${values.businessName}" updated.` });
      } else {
        await addDoc(collection(db, "businessDirectory"), { 
            ...values, 
            createdAt: serverTimestamp(), 
            updatedAt: serverTimestamp() 
        });
        toast({ title: "Entry Added", description: `New business model "${values.businessName}" added.` });
      }
      setIsFormOpen(false);
      setEditingEntry(null);
      form.reset();
    } catch (error) {
        console.error("Error saving directory entry:", error);
        toast({ title: "Save Error", description: "Could not save entry.", variant: "destructive"});
    }
  };

  const handleDeleteEntry = async (entryId: string, entryName: string) => {
    if (!db) return;
    const entryDocRef = doc(db, "businessDirectory", entryId);
    try {
      await deleteDoc(entryDocRef);
      toast({ title: "Entry Deleted", description: `Business model "${entryName}" has been removed.` });
    } catch (error) {
      console.error("Error deleting directory entry:", error);
      toast({ title: "Delete Error", description: "Could not delete entry.", variant: "destructive"});
    }
  };

  const handleTogglePublishStatus = async (entry: BusinessDirectoryEntry) => {
    if (!db) return;
    const entryDocRef = doc(db, "businessDirectory", entry.id);
    const newStatus = entry.status === 'published' ? 'draft' : 'published';
    try {
      await updateDoc(entryDocRef, { status: newStatus, updatedAt: serverTimestamp() });
      toast({
        title: `Entry ${newStatus === 'published' ? 'Published' : 'Unpublished'}`,
        description: `Business model "${entry.businessName}" is now ${newStatus}.`
      });
    } catch (error) {
      console.error("Error toggling publish status:", error);
      toast({ title: "Update Error", description: "Could not update status.", variant: "destructive"});
    }
  };
  
  const handleSeedData = async () => {
    if (!db) {
      toast({ title: "Error", description: "Database not available for seeding.", variant: "destructive" });
      return;
    }
    setIsSeeding(true);
    const directoryRef = collection(db, "businessDirectory");
    
    const currentDocs = await getDocs(directoryRef);
    if (!currentDocs.empty) {
        toast({ title: "Seeding Skipped", description: "Directory already contains data. Please clear manually if re-seeding is intended.", variant: "default" });
        setIsSeeding(false);
        return;
    }

    const batch = writeBatch(db);
    initialSampleBusinessDirectoryDataForSeeding.forEach(sample => {
      const newDocRef = doc(directoryRef); 
      batch.set(newDocRef, { ...sample, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    });

    try {
      await batch.commit();
      toast({ title: "Sample Data Seeded", description: "Initial business models added to the directory." });
    } catch (error) {
      console.error("Error seeding data:", error);
      toast({ title: "Seeding Failed", description: "Could not add sample data.", variant: "destructive" });
    } finally {
      setIsSeeding(false);
    }
  };
  
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !db) return;

    setIsUploading(true);

    const fileReader = new FileReader();
    fileReader.onload = async (e) => {
        const fileContent = e.target?.result;
        if (!fileContent) {
            setIsUploading(false);
            toast({ title: "File Error", description: "Could not read the file.", variant: "destructive" });
            return;
        }

        try {
            let entriesToUpload: Omit<BusinessDirectoryEntry, 'id'>[] = [];
            const lowerCaseFileName = file.name.toLowerCase();

            if (lowerCaseFileName.endsWith('.csv') || lowerCaseFileName.endsWith('.txt')) {
                const result = Papa.parse(fileContent as string, { header: true, skipEmptyLines: true });
                const parsedData = result.data as any[];
                 entriesToUpload = parsedData.map((row: any) => ({
                    businessName: row['Business Name'] || '',
                    industry: row['Industry'] || '',
                    model: row['Model'] || '',
                    shortDescription: row['Short Description'] || '',
                    expectedAnnualGrowth: row['Expected Annual Growth'] || '',
                    detailedSteps: row['Detailed Steps'] || '',
                    requiredInvestment: row['Required Investment'] || '',
                    status: (row['Status'] === 'published' ? 'published' : 'draft') as 'draft' | 'published',
                })).filter(entry => entry.businessName);
            } else if (lowerCaseFileName.endsWith('.xlsx') || lowerCaseFileName.endsWith('.xls')) {
                const workbook = XLSX.read(fileContent, { type: 'binary' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const parsedData = XLSX.utils.sheet_to_json(worksheet) as any[];
                 entriesToUpload = parsedData.map((row: any) => ({
                    businessName: row['Business Name'] || '',
                    industry: row['Industry'] || '',
                    model: row['Model'] || '',
                    shortDescription: row['Short Description'] || '',
                    expectedAnnualGrowth: row['Expected Annual Growth'] || '',
                    detailedSteps: row['Detailed Steps'] || '',
                    requiredInvestment: row['Required Investment'] || '',
                    status: (row['Status'] === 'published' ? 'published' : 'draft') as 'draft' | 'published',
                })).filter(entry => entry.businessName);
            } else {
                throw new Error("Unsupported file type. Please upload a CSV, Excel, or Text file.");
            }

            if (entriesToUpload.length > 0) {
                const batch = writeBatch(db);
                entriesToUpload.forEach(entry => {
                    const newEntryRef = doc(collection(db, "businessDirectory"));
                    batch.set(newEntryRef, {
                        ...entry,
                        createdAt: serverTimestamp(),
                        updatedAt: serverTimestamp(),
                    });
                });
                await batch.commit();
                toast({
                    title: "Upload Successful",
                    description: `${entriesToUpload.length} new business models were added.`,
                });
            } else {
                 toast({
                    title: "No New Entries Added",
                    description: `No new business models were found in the file.`,
                });
            }
        } catch (error: any) {
            toast({ title: "Upload Failed", description: error.message || "An error occurred during file processing.", variant: "destructive" });
        } finally {
            if(fileInputRef.current) fileInputRef.current.value = "";
            setIsUploading(false);
        }
    };
    
    if (file.name.toLowerCase().endsWith('.csv') || file.name.toLowerCase().endsWith('.txt')) {
      fileReader.readAsText(file);
    } else {
      fileReader.readAsBinaryString(file);
    }
  };


  const openEditForm = (entry: BusinessDirectoryEntry) => {
    setEditingEntry(entry);
    setIsFormOpen(true);
  };

  const openNewForm = () => {
    setEditingEntry(null);
    form.reset({ businessName: "", industry: "", model: "", shortDescription: "", expectedAnnualGrowth: "", detailedSteps: "", requiredInvestment: "", status: "draft" });
    setIsFormOpen(true);
  };

  if (isLoading) {
    return <div className="container mx-auto py-8 px-4 md:px-6 text-center">Loading directory management...</div>;
  }
  
  const getStatusBadgeVariant = (status: 'draft' | 'published'): "default" | "secondary" | "outline" | "destructive" => {
    if (status === 'published') return 'default'; 
    return 'secondary'; 
  };

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center"><BookOpen className="mr-3 h-8 w-8 text-primary"/>Manage Business Model Directory</h1>
          <p className="text-muted-foreground">Add, edit, publish, or remove entries in the business model directory (Firestore).</p>
        </div>
        <div className="flex items-center gap-2">
            <Button onClick={() => fileInputRef.current?.click()} variant="outline" disabled={isUploading}>
              <FileUp className="mr-2 h-4 w-4" /> 
              {isUploading ? 'Uploading...' : 'Upload File'}
            </Button>
            <Input
              type="file"
              ref={fileInputRef}
              className="hidden"
              onChange={handleFileUpload}
              accept=".csv, .xlsx, .xls, .txt"
            />
          <div className="flex flex-col items-start">
            <Button
              onClick={handleSeedData}
              variant="outline"
              disabled={isSeeding || directoryEntries.length > 0}
              title={directoryEntries.length > 0 ? "Seeding is disabled because the directory already contains data. Clear data manually to re-seed." : "Seed the directory with initial sample business models."}
            >
              {isSeeding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Seed Sample Data
            </Button>
            {directoryEntries.length > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                Directory not empty. Clear first to re-seed.
              </p>
            )}
          </div>

          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button onClick={openNewForm}><PlusCircle className="mr-2 h-4 w-4" /> Add New Entry</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>{editingEntry ? "Edit Business Model" : "Add New Business Model"}</DialogTitle>
                <DialogDescription>
                  {editingEntry ? "Update the details for this business model." : "Enter details for the new business model entry."}
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
                  <FormField control={form.control} name="businessName" render={({ field }) => (
                    <FormItem><FormLabel>Business Name</FormLabel><FormControl><Input {...field} placeholder="e.g., Online Boutique" /></FormControl><FormMessage /></FormItem>
                  )}/>
                  <FormField control={form.control} name="industry" render={({ field }) => (
                    <FormItem><FormLabel>Industry</FormLabel><FormControl><Input {...field} placeholder="e.g., E-commerce / Retail" /></FormControl><FormMessage /></FormItem>
                  )}/>
                  <FormField control={form.control} name="model" render={({ field }) => (
                    <FormItem><FormLabel>Business Model</FormLabel><FormControl><Input {...field} placeholder="e.g., DTC E-commerce" /></FormControl><FormMessage /></FormItem>
                  )}/>
                  <FormField control={form.control} name="shortDescription" render={({ field }) => (
                    <FormItem><FormLabel>Short Description</FormLabel><FormControl><Textarea {...field} placeholder="Brief overview..." /></FormControl><FormMessage /></FormItem>
                  )}/>
                  <FormField control={form.control} name="expectedAnnualGrowth" render={({ field }) => (
                    <FormItem><FormLabel>Expected Annual Growth</FormLabel><FormControl><Input {...field} placeholder="e.g., 20-30%" /></FormControl><FormMessage /></FormItem>
                  )}/>
                  <FormField control={form.control} name="detailedSteps" render={({ field }) => (
                    <FormItem><FormLabel>Detailed Steps (Optional)</FormLabel><FormControl><Textarea {...field} rows={5} placeholder="Steps to start, requirements..." /></FormControl><FormMessage /></FormItem>
                  )}/>
                  <FormField control={form.control} name="requiredInvestment" render={({ field }) => (
                    <FormItem><FormLabel>Required Investment (Optional)</FormLabel><FormControl><Input {...field} placeholder="e.g., PKR 1M - 3M" /></FormControl><FormMessage /></FormItem>
                  )}/>
                  <FormField control={form.control} name="status" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="published">Published</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}/>
                  <DialogFooter className="pt-4">
                      <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                      <Button type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? "Saving..." : "Save Entry"}</Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="shadow-lg rounded-xl">
        <CardHeader>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
                <CardTitle>Directory Entries ({filteredEntries.length})</CardTitle>
                <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                    <div className="relative flex-grow sm:flex-grow-0">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                        type="search"
                        placeholder="Search by name, industry, model..."
                        className="pl-8 w-full"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}>
                        <SelectTrigger className="w-full sm:w-[180px]">
                             <div className="flex items-center gap-2">
                                <Filter className="h-4 w-4 text-muted-foreground" />
                                <SelectValue placeholder="Filter by status" />
                            </div>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Statuses</SelectItem>
                            <SelectItem value="published">Published</SelectItem>
                            <SelectItem value="draft">Draft</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
        </CardHeader>
        <CardContent>
          {filteredEntries.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredEntries.map((entry) => (
                <Card key={entry.id} className="flex flex-col shadow-md hover:shadow-lg transition-shadow duration-300 rounded-xl overflow-hidden">
                  <CardHeader className="p-4">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-base leading-tight line-clamp-2">{entry.businessName}</CardTitle>
                       <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditForm(entry)}>
                            <Edit3 className="mr-2 h-4 w-4" />Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleTogglePublishStatus(entry)}>
                            {entry.status === 'published' ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
                            {entry.status === 'published' ? 'Unpublish' : 'Publish'}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                                <Trash2 className="mr-2 h-4 w-4" />Delete
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete this entry?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete "{entry.businessName}" from the directory. This action also affects the User Portal view.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteEntry(entry.id, entry.businessName)} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                                  Confirm Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                        <Badge variant="secondary" className="text-xs"><Briefcase className="mr-1 h-3 w-3"/>{entry.industry}</Badge>
                        <Badge variant="outline" className="text-xs">{entry.model}</Badge>
                        <Badge variant={getStatusBadgeVariant(entry.status)} className="text-xs">
                            {entry.status === 'published' ? <CheckCircle className="mr-1 h-3 w-3"/> : <Edit className="mr-1 h-3 w-3"/>}
                            {entry.status ? (entry.status.charAt(0).toUpperCase() + entry.status.slice(1)) : 'Draft'}
                        </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 flex-grow space-y-1 text-sm">
                    <p className="text-muted-foreground line-clamp-3 text-xs">{entry.shortDescription}</p>
                    <p className="font-medium text-accent/90 flex items-center text-xs"><TrendingUp className="mr-1 h-3.5 w-3.5"/> Growth: {entry.expectedAnnualGrowth}</p>
                    {entry.detailedSteps && <p className="text-xs text-muted-foreground mt-1 line-clamp-2"><strong>Steps:</strong> {entry.detailedSteps}</p>}
                    {entry.requiredInvestment && <p className="text-xs text-muted-foreground mt-1"><strong>Investment:</strong> {entry.requiredInvestment}</p>}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-10">
              <BookOpen className="mx-auto h-16 w-16 text-muted-foreground/50 mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Directory Entries Found</h3>
              <p className="text-muted-foreground">
                {searchTerm || statusFilter !== 'all' ? "No entries match your search or filter criteria." : "The directory is empty. Add some entries, or seed sample data if it's the first time."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

