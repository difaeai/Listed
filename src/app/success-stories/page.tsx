"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Trophy, Star, TrendingUp, Megaphone, Handshake } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import Image from 'next/image';
import { HomeCarousel, type HomeSlide } from '@/components/common/home-carousel';
import { db } from '@/lib/firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';

const successStories = [
    // FinTech & E-commerce
    { founderName: "Zainab Ahmed", startupName: "Karobar Asaan", story: "Zainab's vision for a simplified SME accounting app was powerful, but she lacked capital. She connected with two angel investors from Karachi, securing PKR 5 Million to scale her platform, which now serves over 1,000 small businesses." },
    { founderName: "Usman Khalid", startupName: "FasalPay", story: "An AgriTech idea to digitize crop payments for farmers in Punjab seemed too niche. Usman found an institutional fund specializing in agriculture that funded his pilot project with PKR 8 Million, and FasalPay is now revolutionizing local mandi transactions." },
    { founderName: "Ayesha Malik", startupName: "Dukaan Online", story: "Ayesha wanted to empower home-based sellers. Her pitch for a hyperlocal e-commerce platform attracted a syndicate of female investors who provided PKR 4.5 Million in seed funding. Dukaan Online now supports over 500 women entrepreneurs." },
    { founderName: "Fahad Khan", startupName: "Swift Logistics", story: "Fahad's tech-driven logistics solution was struggling. After refining his pitch, he caught the eye of a major logistics corporation, securing a strategic PKR 9 Million investment to modernize their supply chain." },
    { founderName: "Sana Tariq", startupName: "Sehat First", story: "A HealthTech platform providing remote consultations, Sehat First needed capital to hire certified doctors. Sana pitched her idea and raised PKR 6 Million from a healthcare-focused angel investor, expanding services to rural areas." },
    { founderName: "Bilal Mansoor", startupName: "TaleemForAll", story: "Bilal's EdTech platform offered free curriculum resources but needed a premium model. He pitched his vision and secured PKR 3.5 Million from an education-focused venture group to build out his subscription features, now reaching thousands of students." },
    // Creative & Niche
    { founderName: "Nida Ali", startupName: "Hunarmand", story: "Nida's dream of an online marketplace for Pakistani artisans was just an idea. Her heartfelt pitch resonated with a diaspora investor who funded her with PKR 4 Million to create a global platform for local craftsmanship." },
    { founderName: "Kamran Siddiqui", startupName: "Lahori Bites", story: "A cloud kitchen specializing in authentic Lahori cuisine, Kamran needed funds for expansion. He raised PKR 7 Million from a group of food-loving angel investors, allowing him to open a new location in Islamabad." },
    { founderName: "Fatima Jilani", startupName: "EcoPak", story: "Fatima developed a biodegradable packaging alternative but couldn't afford mass production. Her pitch attracted a green-tech fund, securing a PKR 8.5 Million investment to build a small manufacturing facility." },
    { founderName: "Ahmed Raza", startupName: "GameStorm Studios", story: "Ahmed's mobile game had potential but no marketing budget. He found an angel investor with a background in gaming who invested PKR 6.5 Million, helping him launch and market the game successfully." },
    { founderName: "Hira Asif", startupName: "Mindful Moments", story: "Hira's mental wellness app for corporate employees needed credibility. She secured a strategic partnership and PKR 5.5 Million in funding from a major corporation looking to enhance their employee wellness programs." },
    { founderName: "Imran Yousuf", startupName: "FixIt Fast", story: "An on-demand home repair service, FixIt Fast was limited to one neighborhood. Imran's pitch helped him raise PKR 3 Million to expand his team of technicians and cover more areas of Lahore." },
    // Tech & SaaS
    { founderName: "Jawad Hassan", startupName: "CodeFlow AI", story: "Jawad's AI code assistant was a powerful tool with no users. He connected with a syndicate of tech executives who invested PKR 9 Million, helping him build a sales team and secure B2B clients." },
    { founderName: "Mariam Baig", startupName: "SecureLeads", story: "A cybersecurity startup, SecureLeads needed funding for R&D. Mariam's detailed pitch attracted a specialized tech fund, leading to a PKR 7.5 Million seed round." },
    { founderName: "Saad Abbasi", startupName: "RentalPro", story: "Saad's property management software was a side project. After seeing its potential, he pitched it and raised PKR 4 Million from a real estate tycoon to turn it into a full-fledged business." },
    { founderName: "Alina Jaffar", startupName: "DataSift", story: "Alina's data analytics platform was too complex for most investors. She found a tech-savvy angel investor who understood her vision and provided PKR 6 Million to simplify the UI and onboard enterprise clients." },
    { founderName: "Haris Qureshi", startupName: "Tourista", story: "A tourism app for Northern Pakistan, Haris needed funds to create high-quality content. He raised PKR 3.8 Million from an investor who shared his passion for promoting local tourism." },
    { founderName: "Yasmin Elahi", startupName: "LegalEase", story: "Yasmin's platform for affordable legal consultations for startups was a social enterprise. A group of lawyers invested PKR 5 Million to support her mission." },
    // B2B & Services
    { founderName: "Rizwan Ahmed", startupName: "OfficeOps", story: "Rizwan's B2B platform for office supplies was struggling with logistics. An investor with a background in supply chain management invested PKR 6.2 Million and helped optimize his entire operation." },
    { founderName: "Mahnoor Syed", startupName: "EventSphere", story: "An AI-powered event planning tool, Mahnoor's startup needed to integrate with more venues. She pitched and secured a PKR 4.8 Million investment to build out her platform's API." },
    { founderName: "Zahid Mehmood", startupName: "Solar Grid", story: "Zahid's plan for a network of solar-powered EV charging stations was capital-intensive. He met a consortium of energy sector investors who co-funded his project with PKR 9 Million." },
    { founderName: "Rabia Iqbal", startupName: "CareerPath", story: "Rabia's career counseling platform for university students needed to scale. She raised PKR 3.2 Million from an HR-focused investor group, enabling her to partner with major universities." },
    { founderName: "Osman Gul", startupName: "FreshFleet", story: "A farm-to-doorstep delivery service, FreshFleet required a cold chain. Osman secured PKR 7 Million to purchase refrigerated vans and a warehouse, drastically reducing spoilage." },
    { founderName: "Sonia Batool", startupName: "VirtualFit", story: "Sonia's AR app for trying on clothes was a brilliant prototype. An investor from the fashion retail industry found her and invested PKR 5.8 Million to bring the technology to major brands." },
    // More Stories
    { founderName: "Ali Farhan", startupName: "PetPals", story: "Ali's subscription box for pet supplies was a local hit. He raised PKR 3.5 Million to expand his delivery network nationwide, delighting pet owners across Pakistan." },
    { founderName: "Khadija Bibi", startupName: "AquaPure", story: "Khadija designed a low-cost water filtration system for households. Her social impact pitch secured a PKR 4.2 Million grant-investment from a foundation, allowing her to deploy units in underserved communities." },
    { founderName: "Taha Malik", startupName: "CyberGuard", story: "Taha, a cybersecurity expert, needed funding to get his new security protocol certified. He found an investor who understood the value of certification and funded the PKR 6.8 Million process." },
    { founderName: "Iqra Nadeem", startupName: "WriteRight AI", story: "Iqra's AI-powered tool for correcting academic papers in Urdu was a breakthrough. She raised PKR 5.5 Million to hire more developers and expand into other regional languages." },
    { founderName: "Waqas Ali", startupName: "AutoAssist", story: "Waqas created an app to connect car owners with verified mechanics. His pitch attracted an investment of PKR 3.1 Million from an automotive parts distributor, creating a powerful strategic alliance." },
    { founderName: "Noor Fatima", startupName: "GharKaKhana", story: "Noor's platform connecting home chefs with customers needed better tech. She secured PKR 4.7 Million, allowing her to build a robust app and onboard hundreds of chefs." }
];

function SuccessStoryCard({ story }: { story: { founderName: string; startupName: string; story: string; } }) {
  const avatarSeed = story.founderName.replace(/ /g, '');
  return (
    <Card className="flex flex-col shadow-lg hover:shadow-2xl transition-shadow duration-300 rounded-2xl border-2 border-transparent hover:border-primary/50 bg-card">
      <CardHeader className="flex-row items-center gap-4">
        <Image
          src={`https://picsum.photos/seed/${avatarSeed}/80/80`}
          alt={story.founderName}
          width={80}
          height={80}
          className="rounded-full border-4 border-primary/20"
          data-ai-hint="person avatar"
        />
        <div>
          <CardTitle className="text-xl text-primary">{story.founderName}</CardTitle>
          <CardDescription className="font-semibold">{story.startupName}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex-grow">
        <p className="text-muted-foreground leading-relaxed">{story.story}</p>
      </CardContent>
    </Card>
  );
}

export default function SuccessStoriesPage() {
  const [institutesSliderContent, setInstitutesSliderContent] = useState<HomeSlide[]>([]);
  const [isLoadingSlider, setIsLoadingSlider] = useState(true);

  useEffect(() => {
    const fetchInstitutesSlider = async () => {
      if (!db) {
        setIsLoadingSlider(false);
        return;
      }
      try {
        const docRef = doc(db, "siteContent", "institutesSlider");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          const slides: HomeSlide[] = (data.slides || []).filter((slide: HomeSlide) => slide.imageUrl && slide.heading);
          setInstitutesSliderContent(slides);
        }
      } catch (e) {
        console.error("Error fetching institutes slider content:", e);
      } finally {
        setIsLoadingSlider(false);
      }
    };

    fetchInstitutesSlider();
  }, []);

  return (
    <div className="py-12 md:py-20 bg-background text-foreground">
      <div className="container mx-auto px-4 md:px-6">
        
        {isLoadingSlider ? (
          <div className="h-64 flex items-center justify-center bg-muted rounded-lg mb-16 md:mb-20">
            <p>Loading Partner Institutes...</p>
          </div>
        ) : institutesSliderContent.length > 0 ? (
            <section className="mb-16 md:mb-20" aria-labelledby="partner-institutes-heading">
                <Card className="shadow-2xl rounded-2xl overflow-hidden border bg-card">
                    <CardHeader className="text-center p-6 bg-muted/30">
                        <h1 id="partner-institutes-heading" className="text-3xl font-bold text-foreground">Institutes Working With Us</h1>
                        <p className="text-muted-foreground max-w-2xl mx-auto mt-2">
                          Listed’s Official Ambassador Program – Running Across Leading Universities
                        </p>
                    </CardHeader>
                    <CardContent className="p-2 md:p-4">
                        <div className="relative w-full h-[30vh] md:h-[45vh] bg-muted rounded-lg overflow-hidden">
                            <HomeCarousel slides={institutesSliderContent} />
                        </div>
                    </CardContent>
                </Card>
            </section>
        ) : (
           <section className="text-center mb-16 md:mb-20" aria-labelledby="success-stories-heading">
             <Trophy className="h-16 w-16 text-primary mx-auto mb-6" />
             <h1 id="success-stories-heading" className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground mb-6">
               Success Stories
             </h1>
           </section>
        )}

        <section className="mb-16 md:mb-20 text-center" aria-labelledby="platform-news-heading">
           <h2 id="platform-news-heading" className="text-3xl md:text-4xl font-bold text-foreground mb-4">Platform News & Founder Spotlights</h2>
           <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Real stories from real founders who turned their vision into reality. Your success story could be next.
          </p>
        </section>

        <section className="py-16 bg-gradient-to-tr from-primary/10 via-background to-accent/10 mb-16 md:mb-20 rounded-2xl border shadow-xl" aria-labelledby="news-heading">
          <div className="container mx-auto px-4 text-center">
             <div className="inline-flex items-center justify-center p-4 bg-primary text-primary-foreground rounded-full mb-6 shadow-lg">
                <Handshake className="h-12 w-12" />
            </div>
            <h2 id="news-heading" className="text-3xl font-bold text-foreground mb-4">A Landmark Partnership for Pakistani Startups</h2>
            <h3 className="text-2xl font-semibold text-primary mb-6">LISTED & ZedComm Join Forces</h3>
            <p className="text-muted-foreground leading-relaxed max-w-3xl mx-auto">
              In a transformative development for Pakistan's startup ecosystem, LISTED is thrilled to announce a strategic partnership with ZedComm, the nation's undisputed leader in electronics import and distribution.
            </p>
            <p className="text-muted-foreground leading-relaxed max-w-3xl mx-auto mt-4">
              Renowned for their industry-defining standards and unwavering commitment to quality, ZedComm is extending its influence beyond commerce by becoming a mega sponsor and active investor on the LISTED platform. This powerful alliance signifies a deep-seated belief in nurturing homegrown innovation and empowering the next generation of Pakistani entrepreneurs to build world-class companies.
            </p>
            <div className="mt-8">
                <Button asChild size="lg">
                    <Link href="/auth?action=signup">Join The Ecosystem <TrendingUp className="ml-2 h-4 w-4"/></Link>
                </Button>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {successStories.map((story, index) => (
            <SuccessStoryCard key={index} story={story} />
          ))}
        </section>

        <section className="text-center mt-20 py-16 bg-gradient-to-r from-primary/10 to-accent/10 rounded-xl" aria-labelledby="cta-heading">
          <h2 id="cta-heading" className="text-3xl md:text-4xl font-bold text-foreground mb-6">Ready to Write Your Own Success Story?</h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-10 leading-relaxed">
            The only thing separating you from these founders is the decision to start. Join LISTED, create your pitch, and connect with the investors waiting to fund the next big thing.
          </p>
          <Button size="xl" asChild className="bg-primary hover:bg-primary/90 text-primary-foreground text-lg px-10 py-4 font-semibold">
            <Link href="/auth?action=signup">Start My Journey <TrendingUp className="ml-2 h-5 w-5" /></Link>
          </Button>
        </section>
      </div>
    </div>
  );
}
