
"use client";

import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowRight, DollarSign, FileSignature, Users, Handshake, UserCheck as UserCheckIcon, Lightbulb, Network, Search, MessageSquare as MessageSquareIcon, BookOpen } from 'lucide-react';
import React from 'react';

interface ProcessStepProps {
  stepNumber: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}

function ProcessStep({ stepNumber, title, description, icon }: ProcessStepProps) {
  return (
    <div className="flex items-start space-x-4 p-6 bg-card rounded-xl shadow-md border hover:shadow-lg transition-shadow">
      <div className="flex-shrink-0 w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold text-lg shadow-sm">
        {stepNumber}
      </div>
      <div className="flex-1">
        <div className="flex items-center mb-1.5">
          <div className="mr-2 text-accent">{icon}</div>
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        </div>
        <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

export default function HowItWorksPage() {
  const fundraiserSteps = [
    { title: "Sign Up & Complete Your Profile", icon: <UserCheckIcon className="h-5 w-5" />, description: "Your journey begins by creating a 'Startup' account. A complete and professional profile is your first impression to serious investors and is essential before you can create a pitch." },
    { title: "Navigate to 'My Funding Pitches'", icon: <Lightbulb className="h-5 w-5" />, description: "Once logged in, go to your dashboard and find the 'My Funding Pitches' section in the sidebar. This is your command center for creating and managing all your investment proposals." },
    { title: "Craft an Investor-Ready Pitch", icon: <FileSignature className="h-5 w-5" />, description: "Click 'Create New Pitch' and fill out the form with compelling, data-driven details. Describe the problem you solve, your unique solution, and the market opportunity. Use our AI tools to refine your summary!" },
    { title: "Upload an Engaging Pitch Image", icon: <Search className="h-5 w-5" />, description: "A picture is worth a thousand words—and potentially millions in funding. Upload a high-quality image, logo, or prototype picture to visually engage investors and make your pitch stand out." },
    { title: "Submit to Our Exclusive Network", icon: <Network className="h-5 w-5" />, description: "Once submitted, your pitch goes live to our entire network of 110+ Angel Investors & 35+ Institutional Funds instantly. No gatekeepers, no endless emails—just direct access." },
    { title: "Engage & Secure Your Funding", icon: <Handshake className="h-5 w-5" />, description: "Monitor your pitch's engagement, respond to inquiries from interested investors, and build relationships. This is where you close the deal and turn your vision into a funded reality." },
  ];

  return (
    <div className="py-12 md:py-20 bg-background">
      <div className="container mx-auto px-4 md:px-6">
        <section className="text-center mb-16 md:mb-24" aria-labelledby="how-it-works-heading">
          <FileSignature className="h-16 w-16 text-primary mx-auto mb-6" />
          <h1 id="how-it-works-heading" className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground mb-6">
            Your Step-by-Step Guide to Funding
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            From a spark of genius to a funded reality. Here’s your detailed playbook for creating a winning pitch and securing the investment that will change your life.
          </p>
        </section>

        <section className="mb-16 md:mb-20 py-10 last:mb-0 bg-muted/20 rounded-xl p-6 md:p-8" aria-label="Process for Fundraisers">
          <div className="grid md:grid-cols-1 gap-8 items-center">
            <div>
              <div className="flex items-center mb-4">
                <div className="p-3 bg-primary/10 rounded-full mr-3 shadow-sm">
                  <Lightbulb className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-foreground">For Fundraisers: Your Path to Investment</h2>
              </div>
              <p className="text-md text-muted-foreground mb-8 leading-relaxed">Your visionary idea deserves to be seen by those who can make it happen. LISTED is your direct line to an exclusive circle of Pakistan's most active and influential investors.</p>
              <div className="space-y-5 mb-8">
                {fundraiserSteps.map((step, index) => (
                  <ProcessStep
                    key={index}
                    stepNumber={(index + 1).toString()}
                    title={step.title}
                    description={step.description}
                    icon={step.icon}
                  />
                ))}
              </div>
              <Button size="lg" asChild className="bg-primary hover:bg-primary/90 text-primary-foreground text-md px-8 py-3">
                <Link href="/auth?action=signup">Start Your Pitch Now <ArrowRight className="ml-2 h-5 w-5" /></Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="mb-16 md:mb-20 py-10 last:mb-0 bg-muted/20 rounded-xl p-6 md:p-8" aria-label="Business Model Directory">
            <div className="grid md:grid-cols-1 gap-8 items-center">
                <div>
                    <div className="flex items-center mb-4">
                        <div className="p-3 bg-green-500/10 rounded-full mr-3 shadow-sm">
                            <BookOpen className="h-8 w-8 text-green-600" />
                        </div>
                        <h2 className="text-2xl md:text-3xl font-bold text-foreground">No Idea? No Problem.</h2>
                    </div>
                    <p className="text-md text-muted-foreground mb-8 leading-relaxed">
                       Don't have a business idea yet? Explore our comprehensive <strong className="text-green-700">Business Model Directory</strong>. We've compiled dozens of proven, market-relevant business blueprints complete with operational steps and investment estimates. Find an idea that excites you, adapt it to your vision, and use our platform to pitch it to investors. Your next big venture might be just a click away.
                    </p>
                    <Button size="lg" asChild className="bg-green-600 hover:bg-green-700 text-white text-md px-8 py-3">
                        <Link href="/offers/business-model-directory">Explore Business Models <ArrowRight className="ml-2 h-5 w-5" /></Link>
                    </Button>
                </div>
            </div>
        </section>
        
        <section className="mb-16 md:mb-20 py-10 last:mb-0 bg-muted/20 rounded-xl p-6 md:p-8" aria-label="Process for Proactive Founders">
            <div className="grid md:grid-cols-1 gap-8 items-center">
                <div>
                    <div className="flex items-center mb-4">
                        <div className="p-3 bg-blue-500/10 rounded-full mr-3 shadow-sm">
                            <MessageSquareIcon className="h-8 w-8 text-blue-500" />
                        </div>
                        <h2 className="text-2xl md:text-3xl font-bold text-foreground">For Proactive Founders: Connect Directly with Investors</h2>
                    </div>
                    <p className="text-md text-muted-foreground mb-8 leading-relaxed">
                        Don't just wait for investors to find you. Take control. On LISTED, you can browse our curated directory of Angel and Institutional Investors in the <strong className="text-blue-600">Find Investor</strong> section. See their focus areas and directly send them a message to introduce your pitch. Showing initiative is a key trait investors look for. Start building relationships today.
                    </p>
                    <Button size="lg" asChild className="bg-blue-600 hover:bg-blue-700 text-white text-md px-8 py-3">
                        <Link href="/offers/find-investor">Find Investors Now <ArrowRight className="ml-2 h-5 w-5" /></Link>
                    </Button>
                </div>
            </div>
        </section>

        <section className="mb-16 md:mb-20 py-10 last:mb-0 bg-muted/20 rounded-xl p-6 md:p-8" aria-label="Process for Sales Professionals">
            <div className="grid md:grid-cols-1 gap-8 items-center">
                <div>
                    <div className="flex items-center mb-4">
                        <div className="p-3 bg-accent/10 rounded-full mr-3 shadow-sm">
                            <DollarSign className="h-8 w-8 text-accent" />
                        </div>
                        <h2 className="text-2xl md:text-3xl font-bold text-foreground">For Sales Professionals: Unlock Your Earning Potential</h2>
                    </div>
                    <p className="text-md text-muted-foreground mb-8 leading-relaxed">
                        Why limit your income? With LISTED, you have a verified list of high-value business owners at your fingertips. Simply navigate to the <strong className="text-accent">Premium Business Leads</strong> section, find companies that align with your expertise, and contact them directly. Sell your services, products, or expertise without the gatekeepers. This is your chance to build a high-ticket client list and control your financial future.
                    </p>
                    <Button size="lg" asChild className="bg-accent hover:bg-accent/80 text-accent-foreground text-md px-8 py-3">
                        <Link href="/offers/business-leads">Explore Business Leads <ArrowRight className="ml-2 h-5 w-5" /></Link>
                    </Button>
                </div>
            </div>
        </section>
        
        <section className="text-center mt-20 py-16 bg-gradient-to-r from-primary/10 to-accent/10 rounded-xl" aria-labelledby="final-cta-heading">
          <h2 id="final-cta-heading" className="text-3xl md:text-4xl font-bold text-foreground mb-6">Your Future Starts Now. Don't Get Left Behind.</h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-10 leading-relaxed">
            LISTED is your unfair advantage in the Pakistani market. The platform is launching soon. Secure your spot and be ready to seize the opportunity from day one.
          </p>
          <Button size="xl" asChild className="bg-primary hover:bg-primary/90 text-primary-foreground text-lg px-10 py-4 font-semibold">
            <Link href="/auth?action=signup">Onboard and Change Your Life <ArrowRight className="ml-2 h-5 w-5" /></Link>
          </Button>
        </section>
      </div>
    </div>
  );
}
