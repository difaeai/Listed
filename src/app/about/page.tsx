
"use client";

import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Image from 'next/image';
import { Users, Target, Lightbulb, CheckCircle, Zap, Briefcase, Landmark, TrendingUp, ShieldCheck, Handshake, Globe, Building, UserCheck as UserCheckIcon, MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import React from 'react';
import { motion } from 'framer-motion';

interface ValueCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

function ValueCard({ icon, title, description }: ValueCardProps) {
  return (
    <motion.div 
      className="p-6 bg-card rounded-xl shadow-lg hover:shadow-2xl transition-shadow duration-300 flex flex-col items-center text-center border"
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.5 }}
    >
      <div className="p-3 bg-primary text-primary-foreground rounded-full mb-4 inline-block">
        {icon}
      </div>
      <h3 className="text-xl font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground flex-grow">{description}</p>
    </motion.div>
  );
}

interface TestimonialCardProps {
  quote: string;
  name: string;
  role: string;
  location: string;
}

function TestimonialCard({ quote, name, role, location }: TestimonialCardProps) {
  return (
    <motion.div 
      className="bg-background p-8 rounded-xl shadow-xl flex flex-col items-center text-center border"
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <p className="text-muted-foreground italic text-base mb-6 flex-grow pt-4">&ldquo;{quote}&rdquo;</p>
      <div>
        <p className="font-semibold text-lg text-foreground">{name}</p>
        <p className="text-sm text-primary">{role}</p>
        <p className="text-xs text-muted-foreground mt-1 flex items-center justify-center"><MapPin className="h-3 w-3 mr-1"/>{location}</p>
      </div>
    </motion.div>
  );
}


export default function AboutUsPage() {
  const sectionVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" }},
  };
  
  return (
    <div className="py-16 md:py-24 bg-background text-foreground overflow-hidden">
      <div className="container mx-auto px-4 md:px-6">
        {/* Hero Section */}
        <motion.section 
          className="text-center mb-20 md:mb-28" 
          aria-labelledby="about-hero-heading"
          initial="hidden"
          animate="visible"
          variants={sectionVariants}
        >
           <div className="inline-block p-4 bg-primary/10 rounded-full mb-6">
             <Lightbulb className="h-12 w-12 text-primary" />
           </div>
          <h1 id="about-hero-heading" className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground mb-6">
            We're LISTED: The Engine of Pakistan's Next Big Ideas.
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
           We exist for one reason: to find the most brilliant ideas in Pakistan and connect them with the capital to make them legendary. We believe in the "What an <strong className="text-primary">IDEA</strong>, Sir Jee!" moment, and we've built the ecosystem to make it a reality.
          </p>
        </motion.section>

        {/* BERRETO Section */}
        <motion.section 
          className="mb-20 md:mb-28 text-center" 
          aria-labelledby="berreto-heading"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={sectionVariants}
        >
          <div className="inline-block p-4 bg-primary/10 rounded-full mb-6">
            <Building className="h-12 w-12 text-primary" />
          </div>
          <h2 id="berreto-heading" className="text-3xl md:text-4xl font-bold text-foreground mb-6">A Project by BERRETO Pvt Ltd.</h2>
          <p className="text-lg text-muted-foreground max-w-4xl mx-auto leading-relaxed">
            <strong className="text-foreground">LISTED</strong> is a flagship project of <strong className="text-primary">BERRETO Pvt Ltd.</strong> Started in 2019, BERRETO is a leading Development & Design expert company providing superior Software, Web, Mobile and Creative Designing solutions and services. Berreto Private Limited is registered and regulated by the Securities and Exchange Commission of Pakistan and recognized by the Pakistan Software Export Board (Ministry of Information and Technology).
          </p>
        </motion.section>

        {/* Our Mission & Vision Section */}
        <motion.section 
          className="mb-20 md:mb-28" 
          aria-labelledby="mission-vision-heading"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={sectionVariants}
        >
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 id="mission-vision-heading" className="text-3xl md:text-4xl font-bold text-foreground mb-8 text-center md:text-left">Our Guiding Philosophy</h2>
              <div className="space-y-8">
                <div>
                  <div className="flex items-center mb-2">
                    <Target className="h-7 w-7 text-primary mr-3 flex-shrink-0" />
                    <h3 className="text-2xl font-semibold text-primary">Our Mission</h3>
                  </div>
                  <p className="text-muted-foreground text-lg leading-relaxed">
                    At BERRETO Pvt Ltd., our mission is to deliver superior software, web, mobile, and creative design solutions that provide measurable value to our clients. We strive to leverage the most effective use of technology and resources to help organizations across the globe achieve their business objectives. Our commitment is to foster innovation, enhance customer experience, and drive societal progress through cutting-edge technology.
                  </p>
                </div>
                <div>
                  <div className="flex items-center mb-2">
                    <Globe className="h-7 w-7 text-accent mr-3 flex-shrink-0" />
                    <h3 className="text-2xl font-semibold text-accent">Our Vision</h3>
                  </div>
                  <p className="text-muted-foreground text-lg leading-relaxed">
                    Our vision is to become a leading force in the global software industry by continuously innovating and introducing impactful technological solutions that contribute to the betterment of society. We aspire to set new standards in the industry, advancing Pakistan’s position in the global technology landscape while adhering to regulatory excellence and ethical business practices.
                  </p>
                </div>
              </div>
            </div>
            <div className="relative h-64 md:h-full w-full rounded-2xl overflow-hidden shadow-2xl">
              <Image 
                src="https://picsum.photos/seed/philosophy/600/800"
                alt="Office discussion about philosophy"
                fill
                className="object-cover transition-transform duration-500 hover:scale-105"
                data-ai-hint="teamwork collaboration"
              />
            </div>
          </div>
        </motion.section>

        {/* Our Core Values Section */}
        <motion.section 
          className="mb-20 md:mb-28" 
          aria-labelledby="values-heading"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
          variants={sectionVariants}
        >
          <h2 id="values-heading" className="text-3xl md:text-4xl font-bold text-center text-foreground mb-16">Our Guiding Principles</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            <ValueCard
              icon={<ShieldCheck className="h-8 w-8" />}
              title="Integrity & Exclusivity"
              description="We uphold the highest ethical standards, curating a network of verified, high-caliber members to foster trust and meaningful connections."
            />
            <ValueCard
              icon={<TrendingUp className="h-8 w-8" />}
              title="Unlocking Capital & Opportunity"
              description="Our core purpose is to break down barriers, providing direct access to the capital and opportunities that turn ambitious ideas into market-leading enterprises."
            />
            <ValueCard
              icon={<Lightbulb className="h-8 w-8" />}
              title="Innovation as Standard"
              description="We are relentlessly enhancing our platform with cutting-edge tools and insights to give our members a competitive edge in a fast-evolving market."
            />
            <ValueCard
              icon={<Handshake className="h-8 w-8" />}
              title="Powerful Collaboration"
              description="We believe in the exponential power of strategic partnerships, creating a dynamic environment where collaborations lead to mutual, unprecedented success."
            />
             <ValueCard
              icon={<UserCheckIcon className="h-8 w-8" />}
              title="Founder & Investor Centricity"
              description="Our members—Founders, Sales Professionals, and Investors—are at the heart of everything we do. Their success is our ultimate metric."
            />
             <ValueCard
              icon={<Zap className="h-8 w-8" />}
              title="Fueling Pakistan's Economic Engine"
              description="We are passionately committed to driving significant, positive change in Pakistan's business landscape and contributing to national prosperity."
            />
          </div>
        </motion.section>
        
        {/* Testimonials Section */}
        <motion.section 
          className="py-16 md:py-20 bg-muted/40 rounded-xl mb-20 md:mb-28" 
          aria-labelledby="testimonials-heading"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
          variants={sectionVariants}
        >
          <div className="container mx-auto px-4 md:px-6">
            <h2 id="testimonials-heading" className="text-3xl md:text-4xl font-bold text-center text-foreground mb-4">Real Results, Real Impact</h2>
            <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto text-lg">
              Stories from the visionaries and trailblazers who are already winning with LISTED.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <TestimonialCard
                quote="The access to institutional investors on LISTED is unparalleled. We secured over PKR 50 Million for our AgriTech venture, a feat that would have taken years otherwise."
                name="Zainab R."
                role="Founder, Sindh Organics"
                location="Hyderabad, Sindh"
              />
              <TestimonialCard
                quote="I had the capital but needed the right high-growth opportunity. LISTED's directory gave me a solid FinTech model. Found an incredible co-founder here too. We're scaling fast."
                name="Usman K."
                role="Entrepreneur & Investor"
                location="Faisalabad, Punjab"
              />
               <TestimonialCard
                quote="As a software house, expanding our B2B client base was a challenge. Posting a high-commission offer on LISTED connected us with elite sales partners who closed deals across the country."
                name="Ahmedullah Q."
                role="CEO, Quetta Tech Solutions"
                location="Quetta, Balochistan"
              />
              <TestimonialCard
                quote="I left my traditional sales job to become a partner on LISTED. The quality of the products and the commission structures are life-changing. I'm earning more than ever."
                name="Sara J."
                role="Independent Sales Partner"
                location="Rawalpindi, Punjab"
              />
            </div>
          </div>
        </motion.section>

        {/* Join Us Section */}
        <motion.section 
          className="text-center mt-20 py-12" 
          aria-labelledby="join-us-heading"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={sectionVariants}
        >
            <div className="relative max-w-4xl mx-auto rounded-2xl shadow-2xl p-8 md:p-12 overflow-hidden bg-card border">
                <div className="absolute inset-0 z-0">
                    <Image
                        src="https://picsum.photos/seed/join/1200/400"
                        alt="Abstract background representing future opportunities"
                        fill
                        className="object-cover opacity-10"
                        data-ai-hint="abstract network"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent"></div>
                </div>
                <div className="relative z-10">
                    <h2 id="join-us-heading" className="text-3xl md:text-4xl font-bold text-foreground mb-6">Your Future Awaits. The Time is Now.</h2>
                    <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
                       The platform is launching soon. This is your chance to get in on the ground floor. Whether you're a Founder with a world-changing vision or an Investor looking for the next unicorn, LISTED is your launchpad.
                    </p>
                    <Button size="lg" asChild className="bg-primary hover:bg-primary/90 text-primary-foreground text-lg px-10 py-3 transform hover:scale-105 transition-transform">
                        <Link href="/auth?action=signup">Seize The Opportunity</Link>
                    </Button>
                </div>
            </div>
        </motion.section>
      </div>
    </div>
  );
}
