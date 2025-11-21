

"use client";

import React, { useState, useEffect, useRef } from 'react';
import { FileEdit, Save, Loader2, Users, Video, Image as ImageIcon, PlusCircle, Trash2, ArrowLeft, ArrowRight, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { db } from '@/lib/firebaseConfig';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { HomeCarousel } from '@/components/common/home-carousel';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface FrontendContentSection {
  heroTitle: string;
  heroSubtitle: string;
  feature1Title: string;
  feature1Description: string;
}

interface AboutPageContentSection {
  mainHeading: string;
  missionStatement: string;
}

interface FeatureVisibilitySettings {
  enableInvestorSignup: boolean;
  enableCompanySignup: boolean;
  enableStartupSignup: boolean;
  enableSignupButton: boolean;
}

interface VideoMessageContent {
  videoUrl: string | null;
}

interface MotivationPageContent {
  youtubeLinks: string[];
}

export interface HomeSlide {
    imageUrl: string;
    heading: string;
    subheading: string;
    ctaText: string;
    ctaLink: string;
}

interface HomeSliderContent {
    slides: HomeSlide[];
}

interface TestimonialsContent {
    youtubeVideoUrl?: string;
    enableTestimonialsSection?: boolean;
}

interface MyGoalContent {
    youtubeLinks: string[];
}

interface LaunchpadPricing {
  silver: number;
  gold: number;
  platinum: number;
  royal: number;
  dollarRate: number;
  currencySymbol: string;
}


const initialHomepageContent: FrontendContentSection = {
  heroTitle: "What an <strong class='text-red-600 italic'>&quot;IDEA&quot;</strong> Sir Jee!!!",
  heroSubtitle: "Got a brilliant idea? LISTED is where you get it funded. Pitch your idea to <strong class='text-foreground'>110+ Angel Investors & 35+ Institutional Funds</strong>. Don't let your dream die in a notebook. Let's get it funded.",
  feature1Title: "1. Craft Your Pitch",
  feature1Description: "Easily create a compelling funding pitch that tells your story. Our AI-powered tools help you refine your summary to make it irresistible and grab investor attention instantly.",
};

const initialAboutPageContent: AboutPageContentSection = {
  mainHeading: "About LISTED",
  missionStatement: "We are dedicated to creating a dynamic ecosystem where businesses, sales talent, and investors converge to foster growth and innovation.",
};

const initialFeatureVisibilitySettings: FeatureVisibilitySettings = {
  enableInvestorSignup: false,
  enableCompanySignup: false,
  enableStartupSignup: true,
  enableSignupButton: true,
};

const initialVideoMessageContent: VideoMessageContent = {
  videoUrl: null,
};

const initialMotivationPageContent: MotivationPageContent = {
  youtubeLinks: [],
};

const initialHomeSliderContent: HomeSliderContent = {
    slides: []
};

const initialTestimonialsContent: TestimonialsContent = {
    youtubeVideoUrl: "",
    enableTestimonialsSection: true,
};

const initialMyGoalContent: MyGoalContent = {
    youtubeLinks: [],
};

const initialLaunchpadPricing: LaunchpadPricing = {
    silver: 10,
    gold: 13,
    platinum: 15,
    royal: 18,
    dollarRate: 283,
    currencySymbol: '$',
};


type SectionName = 'homepage' | 'aboutPage' | 'signupVisibilitySettings' | 'homepageVideoMessage' | 'motivationPageVideos' | 'homeSlider' | 'secondarySlider' | 'institutesSlider' | 'testimonials' | 'myGoal' | 'launchpadPricing';

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
    if (match) {
        videoId = match[1];
    }
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


export default function AdminFrontendContentPage() {
  const [homepageContent, setHomepageContent] = useState<FrontendContentSection>(initialHomepageContent);
  const [aboutPageContent, setAboutPageContent] = useState<AboutPageContentSection>(initialAboutPageContent);
  const [featureVisibility, setFeatureVisibility] = useState<FeatureVisibilitySettings>(initialFeatureVisibilitySettings);
  const [videoMessageContent, setVideoMessageContent] = useState<VideoMessageContent>(initialVideoMessageContent);
  const [motivationPageContent, setMotivationPageContent] = useState<MotivationPageContent>(initialMotivationPageContent);
  const [homeSliderContent, setHomeSliderContent] = useState<HomeSliderContent>(initialHomeSliderContent);
  const [secondarySliderContent, setSecondarySliderContent] = useState<HomeSliderContent>(initialHomeSliderContent);
  const [institutesSliderContent, setInstitutesSliderContent] = useState<HomeSliderContent>(initialHomeSliderContent);
  const [testimonialsContent, setTestimonialsContent] = useState<TestimonialsContent>(initialTestimonialsContent);
  const [myGoalContent, setMyGoalContent] = useState<MyGoalContent>(initialMyGoalContent);
  const [launchpadPricing, setLaunchpadPricing] = useState<LaunchpadPricing>(initialLaunchpadPricing);

  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchContent = async () => {
      if (!db) {
        toast({ title: "Error", description: "Database not available.", variant: "destructive" });
        setIsFetching(false);
        return;
      }
      setIsFetching(true);
      try {
        const docRefs = {
            homepage: doc(db, "siteContent", "homepage"),
            aboutPage: doc(db, "siteContent", "aboutPage"),
            signupVisibilitySettings: doc(db, "siteContent", "signupVisibilitySettings"),
            homepageVideoMessage: doc(db, "siteContent", "homepageVideoMessage"),
            motivationPageVideos: doc(db, "siteContent", "motivationPageVideos"),
            homeSlider: doc(db, "siteContent", "homeSlider"),
            secondarySlider: doc(db, "siteContent", "secondarySlider"),
            institutesSlider: doc(db, "siteContent", "institutesSlider"),
            testimonials: doc(db, "siteContent", "testimonials"),
            myGoal: doc(db, "siteContent", "myGoal"),
            launchpadPricing: doc(db, "siteContent", "launchpadPricing"),
        };

        const [homepageSnap, aboutSnap, visibilitySnap, videoSnap, motivationSnap, sliderSnap, secondarySliderSnap, institutesSliderSnap, testimonialsSnap, myGoalSnap, pricingSnap] = await Promise.all([
            getDoc(docRefs.homepage),
            getDoc(docRefs.aboutPage),
            getDoc(docRefs.signupVisibilitySettings),
            getDoc(docRefs.homepageVideoMessage),
            getDoc(docRefs.motivationPageVideos),
            getDoc(docRefs.homeSlider),
            getDoc(docRefs.secondarySlider),
            getDoc(docRefs.institutesSlider),
            getDoc(docRefs.testimonials),
            getDoc(docRefs.myGoal),
            getDoc(docRefs.launchpadPricing),
        ]);

        if (homepageSnap.exists()) setHomepageContent(homepageSnap.data().content);
        else await setDoc(docRefs.homepage, { content: initialHomepageContent, updatedAt: serverTimestamp() });
        
        if (aboutSnap.exists()) setAboutPageContent(aboutSnap.data().content);
        else await setDoc(docRefs.aboutPage, { content: initialAboutPageContent, updatedAt: serverTimestamp() });

        if (visibilitySnap.exists()) {
            const data = visibilitySnap.data() as FeatureVisibilitySettings;
            setFeatureVisibility({
                enableInvestorSignup: data.enableInvestorSignup === true,
                enableCompanySignup: data.enableCompanySignup === true,
                enableStartupSignup: data.enableStartupSignup !== false,
                enableSignupButton: data.enableSignupButton !== false,
            });
        } else {
            await setDoc(docRefs.signupVisibilitySettings, { ...initialFeatureVisibilitySettings, updatedAt: serverTimestamp() });
            setFeatureVisibility(initialFeatureVisibilitySettings);
        }

        if (videoSnap.exists()) setVideoMessageContent(videoSnap.data() as VideoMessageContent);
        else await setDoc(docRefs.homepageVideoMessage, { ...initialVideoMessageContent, updatedAt: serverTimestamp() });

        if (motivationSnap.exists()) setMotivationPageContent(motivationSnap.data() as MotivationPageContent);
        else await setDoc(docRefs.motivationPageVideos, { ...initialMotivationPageContent, updatedAt: serverTimestamp() });
        
        if (sliderSnap.exists()) {
            const data = sliderSnap.data() as HomeSliderContent;
            setHomeSliderContent({ slides: data.slides || [] });
        } else {
            await setDoc(docRefs.homeSlider, { ...initialHomeSliderContent, updatedAt: serverTimestamp() });
            setHomeSliderContent(initialHomeSliderContent);
        }

        if (secondarySliderSnap.exists()) {
            const data = secondarySliderSnap.data() as HomeSliderContent;
            setSecondarySliderContent({ slides: data.slides || [] });
        } else {
            await setDoc(docRefs.secondarySlider, { ...initialHomeSliderContent, updatedAt: serverTimestamp() });
            setSecondarySliderContent(initialHomeSliderContent);
        }

        if (institutesSliderSnap.exists()) {
            const data = institutesSliderSnap.data() as HomeSliderContent;
            setInstitutesSliderContent({ slides: data.slides || [] });
        } else {
            await setDoc(docRefs.institutesSlider, { ...initialHomeSliderContent, updatedAt: serverTimestamp() });
            setInstitutesSliderContent(initialHomeSliderContent);
        }
        
        if (testimonialsSnap.exists()) {
            const data = testimonialsSnap.data() as TestimonialsContent;
            setTestimonialsContent({
                ...data,
                enableTestimonialsSection: data.enableTestimonialsSection !== false,
            });
        } else {
            await setDoc(docRefs.testimonials, { ...initialTestimonialsContent, updatedAt: serverTimestamp() });
            setTestimonialsContent(initialTestimonialsContent);
        }

        if (myGoalSnap.exists()) {
            const data = myGoalSnap.data() as MyGoalContent;
            setMyGoalContent({ youtubeLinks: data.youtubeLinks || [] });
        } else {
            await setDoc(docRefs.myGoal, { ...initialMyGoalContent, updatedAt: serverTimestamp() });
            setMyGoalContent(initialMyGoalContent);
        }

        if (pricingSnap.exists()) {
            setLaunchpadPricing(pricingSnap.data() as LaunchpadPricing);
        } else {
            await setDoc(docRefs.launchpadPricing, { ...initialLaunchpadPricing, updatedAt: serverTimestamp() });
            setLaunchpadPricing(initialLaunchpadPricing);
        }


      } catch (error) {
        console.error("Error fetching frontend content from Firestore:", error);
        toast({ title: "Fetch Error", description: "Could not load content from database.", variant: "destructive" });
      }
      setIsFetching(false);
    };
    fetchContent();
  }, [toast]);

  const handleInputChange = (section: 'homepage' | 'aboutPage', field: string, value: string) => {
    if (section === 'homepage') {
      setHomepageContent(prev => ({ ...prev, [field]: value }));
    } else if (section === 'aboutPage') {
      setAboutPageContent(prev => ({ ...prev, [field]: value }));
    }
  };
  
  const handleSliderInputChange = (index: number, field: keyof HomeSlide, value: string) => {
    setHomeSliderContent(prevState => {
        const newSlides = [...prevState.slides];
        newSlides[index] = { ...newSlides[index], [field]: value };
        return { slides: newSlides };
    });
  };

  const handleSliderImageChange = (index: number, file: File | null) => {
    if (!file) {
      handleSliderInputChange(index, 'imageUrl', '');
      return;
    }
  
    const MAX_DIMENSION = 1280;
    const reader = new FileReader();
  
    reader.onload = (e) => {
      const img = new window.Image();
      img.src = e.target?.result as string;
  
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
  
        if (width > height) {
          if (width > MAX_DIMENSION) {
            height *= MAX_DIMENSION / width;
            width = MAX_DIMENSION;
          }
        } else {
          if (height > MAX_DIMENSION) {
            width *= MAX_DIMENSION / height;
            height = MAX_DIMENSION;
          }
        }
  
        canvas.width = width;
        canvas.height = height;
  
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85); // Compress as JPEG
          handleSliderInputChange(index, 'imageUrl', dataUrl);
          toast({ title: "Image Ready", description: `Image for slide ${index + 1} has been resized and compressed.`});
        }
      };
    };
  
    reader.onerror = (error) => {
        console.error("Error reading file:", error);
        toast({ title: "Image Error", description: "Could not process the uploaded image.", variant: "destructive"});
    };
  
    reader.readAsDataURL(file);
  };
  
  const handleAddSlide = () => {
    setHomeSliderContent(prevState => ({
        slides: [
            ...prevState.slides,
            { imageUrl: '', heading: '', subheading: '', ctaText: '', ctaLink: '' }
        ]
    }));
  };

  const handleRemoveSlide = (index: number) => {
    setHomeSliderContent(prevState => ({
        slides: prevState.slides.filter((_, i) => i !== index)
    }));
  };
  
  const handleSecondarySliderInputChange = (index: number, field: keyof HomeSlide, value: string) => {
    setSecondarySliderContent(prevState => {
        const newSlides = [...prevState.slides];
        newSlides[index] = { ...newSlides[index], [field]: value };
        return { slides: newSlides };
    });
  };

  const handleSecondarySliderImageChange = (index: number, file: File | null) => {
    if (!file) {
      handleSecondarySliderInputChange(index, 'imageUrl', '');
      return;
    }
    const MAX_DIMENSION = 1280;
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new window.Image();
      img.src = e.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        if (width > height) {
          if (width > MAX_DIMENSION) { height *= MAX_DIMENSION / width; width = MAX_DIMENSION; }
        } else {
          if (height > MAX_DIMENSION) { width *= MAX_DIMENSION / height; height = MAX_DIMENSION; }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          handleSecondarySliderInputChange(index, 'imageUrl', dataUrl);
          toast({ title: "Image Ready", description: `Image for secondary slide ${index + 1} has been resized and compressed.`});
        }
      };
    };
    reader.readAsDataURL(file);
  };

  const handleAddSecondarySlide = () => {
    setSecondarySliderContent(prevState => ({
        slides: [...prevState.slides, { imageUrl: '', heading: '', subheading: '', ctaText: '', ctaLink: '' }]
    }));
  };

  const handleRemoveSecondarySlide = (index: number) => {
    setSecondarySliderContent(prevState => ({
        slides: prevState.slides.filter((_, i) => i !== index)
    }));
  };

    const handleInstitutesSliderInputChange = (index: number, field: keyof HomeSlide, value: string) => {
    setInstitutesSliderContent(prevState => {
        const newSlides = [...prevState.slides];
        newSlides[index] = { ...newSlides[index], [field]: value };
        return { slides: newSlides };
    });
  };

  const handleInstitutesSliderImageChange = (index: number, file: File | null) => {
    if (!file) {
      handleInstitutesSliderInputChange(index, 'imageUrl', '');
      return;
    }
    const MAX_DIMENSION = 1280;
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new window.Image();
      img.src = e.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        if (width > height) {
          if (width > MAX_DIMENSION) { height *= MAX_DIMENSION / width; width = MAX_DIMENSION; }
        } else {
          if (height > MAX_DIMENSION) { width *= MAX_DIMENSION / height; height = MAX_DIMENSION; }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          handleInstitutesSliderInputChange(index, 'imageUrl', dataUrl);
          toast({ title: "Image Ready", description: `Image for institutes slide ${index + 1} has been resized and compressed.`});
        }
      };
    };
    reader.readAsDataURL(file);
  };

  const handleAddInstitutesSlide = () => {
    setInstitutesSliderContent(prevState => ({
        slides: [...prevState.slides, { imageUrl: '', heading: '', subheading: '', ctaText: '', ctaLink: '' }]
    }));
  };

  const handleRemoveInstitutesSlide = (index: number) => {
    setInstitutesSliderContent(prevState => ({
        slides: prevState.slides.filter((_, i) => i !== index)
    }));
  };


  const handleTestimonialsInputChange = (field: keyof TestimonialsContent, value: string | boolean) => {
    setTestimonialsContent(prev => ({...prev, [field]: value}));
  };

  const handleMyGoalInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const links = e.target.value.split('\n').map(link => link.trim()).filter(link => link);
    setMyGoalContent({ youtubeLinks: links });
  };

  const handleVideoUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVideoMessageContent({ videoUrl: e.target.value });
  };
  
  const handleMotivationVideosChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const links = e.target.value.split('\n').map(link => link.trim()).filter(link => link);
    setMotivationPageContent({ youtubeLinks: links });
  };

  const handleSwitchChange = (field: keyof FeatureVisibilitySettings, checked: boolean) => {
    setFeatureVisibility(prev => ({ ...prev, [field]: checked }));
  };

  const handlePricingInputChange = (plan: keyof LaunchpadPricing, value: string | number) => {
      setLaunchpadPricing(prev => ({ ...prev, [plan]: value }));
  };

  const handleSaveData = async (sectionName: SectionName) => {
    if (!db) {
      toast({ title: "Error", description: "Database not available.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    
    let contentToSave: any;
    const successMessageKey = sectionName;

    try {
        const createCleanSlides = (slides: HomeSlide[]) => slides.map(slide => ({
            imageUrl: slide.imageUrl,
            heading: slide.heading,
            subheading: slide.subheading,
            ctaText: slide.ctaText,
            ctaLink: slide.ctaLink,
        }));

        switch (sectionName) {
        case 'homepage':
            contentToSave = { content: homepageContent, updatedAt: serverTimestamp() };
            break;
        case 'aboutPage':
            contentToSave = { content: aboutPageContent, updatedAt: serverTimestamp() };
            break;
        case 'signupVisibilitySettings':
            contentToSave = { ...featureVisibility, updatedAt: serverTimestamp() };
            break;
        case 'homepageVideoMessage':
            contentToSave = { videoUrl: videoMessageContent.videoUrl, updatedAt: serverTimestamp() };
            break;
        case 'motivationPageVideos':
            contentToSave = { ...motivationPageContent, updatedAt: serverTimestamp() };
            break;
        case 'homeSlider':
            contentToSave = { slides: createCleanSlides(homeSliderContent.slides), updatedAt: serverTimestamp() };
            break;
        case 'secondarySlider':
            contentToSave = { slides: createCleanSlides(secondarySliderContent.slides), updatedAt: serverTimestamp() };
            break;
        case 'institutesSlider':
            contentToSave = { slides: createCleanSlides(institutesSliderContent.slides), updatedAt: serverTimestamp() };
            break;
        case 'testimonials':
            contentToSave = { ...testimonialsContent, updatedAt: serverTimestamp() };
            break;
        case 'myGoal':
            contentToSave = { ...myGoalContent, updatedAt: serverTimestamp() };
            break;
        case 'launchpadPricing':
            contentToSave = { 
                ...launchpadPricing, 
                silver: Number(launchpadPricing.silver) || 0,
                gold: Number(launchpadPricing.gold) || 0,
                platinum: Number(launchpadPricing.platinum) || 0,
                royal: Number(launchpadPricing.royal) || 0,
                dollarRate: Number(launchpadPricing.dollarRate) || 0,
                currencySymbol: launchpadPricing.currencySymbol || '$',
                updatedAt: serverTimestamp() 
            };
            break;
        default:
            toast({ title: "Error", description: "Invalid section name.", variant: "destructive" });
            setIsLoading(false);
            return;
        }
        
        const docRef = doc(db, "siteContent", sectionName);

        await setDoc(docRef, contentToSave, { merge: true });
        toast({
            title: "Content Saved",
            description: `Content for ${successMessageKey.replace(/([A-Z])/g, ' $1').toLowerCase()} has been updated.`,
        });
    } catch (error: any) {
        console.error(`Error saving ${sectionName} content to Firestore:`, error);
        toast({ title: "Save Error", description: `Could not save ${sectionName} content. Error: ${error.message}`, variant: "destructive" });
    }
    setIsLoading(false);
  };
  
  const handleRemoveVideo = () => {
    setVideoMessageContent({ videoUrl: null });
  };

  const youtubeEmbedUrl = videoMessageContent.videoUrl ? getYoutubeEmbedUrl(videoMessageContent.videoUrl) : null;
  const testimonialsYoutubeEmbedUrl = testimonialsContent.youtubeVideoUrl ? getYoutubeEmbedUrl(testimonialsContent.youtubeVideoUrl) : null;
  const firstMyGoalYoutubeEmbedUrl = myGoalContent.youtubeLinks && myGoalContent.youtubeLinks.length > 0 ? getYoutubeEmbedUrl(myGoalContent.youtubeLinks[0]) : null;


  if (isFetching) {
    return <div className="container mx-auto py-8 px-4 md:px-6 text-center">Loading content editor...</div>;
  }

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight flex items-center">
          <FileEdit className="mr-3 h-8 w-8 text-primary" /> Manage Frontend Content
        </h1>
        <p className="text-muted-foreground">
          Update text elements and toggle features on public-facing pages. Changes are saved to Firestore.
        </p>
      </div>

      <Accordion type="multiple" className="w-full space-y-4" defaultValue={['homepage', 'signupVisibilitySettings']}>
        <AccordionItem value="homepage">
          <Card className="shadow-lg">
            <AccordionTrigger className="px-6 py-4 text-lg font-semibold hover:no-underline">
                Homepage Content
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
                <div className="space-y-4">
                    <div>
                        <Label htmlFor="heroTitle">Hero Title</Label>
                        <Input id="heroTitle" value={homepageContent.heroTitle} onChange={(e) => handleInputChange('homepage', 'heroTitle', e.target.value)} />
                    </div>
                    <div>
                        <Label htmlFor="heroSubtitle">Hero Subtitle</Label>
                        <Textarea id="heroSubtitle" value={homepageContent.heroSubtitle} onChange={(e) => handleInputChange('homepage', 'heroSubtitle', e.target.value)} rows={3}/>
                    </div>
                    <div>
                        <Label htmlFor="feature1Title">Feature Card 1 Title (Corporations)</Label>
                        <Input id="feature1Title" value={homepageContent.feature1Title} onChange={(e) => handleInputChange('homepage', 'feature1Title', e.target.value)} />
                    </div>
                    <div>
                        <Label htmlFor="feature1Description">Feature Card 1 Description</Label>
                        <Textarea id="feature1Description" value={homepageContent.feature1Description} onChange={(e) => handleInputChange('homepage', 'feature1Description', e.target.value)} rows={3}/>
                    </div>
                     <Button onClick={() => handleSaveData('homepage')} disabled={isLoading} className="mt-4">
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        {isLoading ? "Saving..." : "Save Homepage Content"}
                    </Button>
                </div>
            </AccordionContent>
          </Card>
        </AccordionItem>
        
         <AccordionItem value="aboutpage">
          <Card className="shadow-lg">
            <AccordionTrigger className="px-6 py-4 text-lg font-semibold hover:no-underline">
                About Us Page Content
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
                <div className="space-y-4">
                    <div>
                        <Label htmlFor="aboutMainHeading">Main Heading</Label>
                        <Input id="aboutMainHeading" value={aboutPageContent.mainHeading} onChange={(e) => handleInputChange('aboutPage', 'mainHeading', e.target.value)} />
                    </div>
                    <div>
                        <Label htmlFor="aboutMissionStatement">Mission Statement</Label>
                        <Textarea id="aboutMissionStatement" value={aboutPageContent.missionStatement} onChange={(e) => handleInputChange('aboutPage', 'missionStatement', e.target.value)} rows={4}/>
                    </div>
                     <Button onClick={() => handleSaveData('aboutPage')} disabled={isLoading} className="mt-4">
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        {isLoading ? "Saving..." : "Save About Us Content"}
                    </Button>
                </div>
            </AccordionContent>
          </Card>
        </AccordionItem>

        <AccordionItem value="launchpadPricing">
          <Card className="shadow-lg">
            <AccordionTrigger className="px-6 py-4 text-lg font-semibold hover:no-underline">
                <div className="flex items-center">
                  <DollarSign className="mr-2 h-5 w-5 text-primary" />
                  Manage Launchpad Pricing
                </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">Set the prices for subscription plans, the currency symbol, and the current dollar rate for PKR conversion.</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><Label htmlFor="price-silver">Silver Plan Price</Label><Input id="price-silver" type="number" value={launchpadPricing.silver} onChange={(e) => handlePricingInputChange('silver', e.target.value)} /></div>
                    <div><Label htmlFor="price-gold">Gold Plan Price</Label><Input id="price-gold" type="number" value={launchpadPricing.gold} onChange={(e) => handlePricingInputChange('gold', e.target.value)} /></div>
                    <div><Label htmlFor="price-platinum">Platinum Plan Price</Label><Input id="price-platinum" type="number" value={launchpadPricing.platinum} onChange={(e) => handlePricingInputChange('platinum', e.target.value)} /></div>
                    <div><Label htmlFor="price-royal">Royal Plan Price</Label><Input id="price-royal" type="number" value={launchpadPricing.royal} onChange={(e) => handlePricingInputChange('royal', e.target.value)} /></div>
                    <div>
                        <Label htmlFor="price-currency">Currency Symbol</Label>
                        <Select onValueChange={(value) => handlePricingInputChange('currencySymbol', value)} value={launchpadPricing.currencySymbol}>
                            <SelectTrigger id="price-currency">
                                <SelectValue placeholder="Select currency" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="PKR">PKR (₨)</SelectItem>
                                <SelectItem value="$">USD ($)</SelectItem>
                                <SelectItem value="€">EUR (€)</SelectItem>
                                <SelectItem value="£">GBP (£)</SelectItem>
                                <SelectItem value="AED">AED (د.إ)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div><Label htmlFor="price-dollar">Dollar to PKR Rate</Label><Input id="price-dollar" type="number" value={launchpadPricing.dollarRate} onChange={(e) => handlePricingInputChange('dollarRate', e.target.value)} /></div>
                  </div>
                   <Button onClick={() => handleSaveData('launchpadPricing')} disabled={isLoading} className="mt-4">
                      {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                      {isLoading ? "Saving..." : "Save Pricing"}
                  </Button>
                </div>
            </AccordionContent>
          </Card>
        </AccordionItem>

        <AccordionItem value="testimonials">
            <Card className="shadow-lg">
                <AccordionTrigger className="px-6 py-4 text-lg font-semibold hover:no-underline">
                    <div className="flex items-center">
                    <Users className="mr-2 h-5 w-5 text-primary" />
                    Testimonials Section
                    </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-6">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between space-x-2 p-3 border rounded-md">
                            <Label htmlFor="enableTestimonialsSwitch" className="flex flex-col space-y-1">
                                <span>Show Testimonials Section</span>
                                <span className="font-normal leading-snug text-muted-foreground text-xs">
                                Toggle the visibility of the entire testimonials section on the homepage.
                                </span>
                            </Label>
                            <Switch
                                id="enableTestimonialsSwitch"
                                checked={testimonialsContent.enableTestimonialsSection}
                                onCheckedChange={(checked) => handleTestimonialsInputChange('enableTestimonialsSection', checked)}
                            />
                        </div>
                        <p className="text-sm text-muted-foreground">Add a YouTube video link to be displayed in the testimonials section of the homepage.</p>
                        <Label htmlFor="testimonialsVideoUrl">YouTube Video URL</Label>
                        <Input 
                            id="testimonialsVideoUrl" 
                            type="url" 
                            placeholder="https://www.youtube.com/watch?v=..." 
                            value={testimonialsContent.youtubeVideoUrl || ''} 
                            onChange={(e) => handleTestimonialsInputChange('youtubeVideoUrl', e.target.value)} 
                        />
                        {testimonialsYoutubeEmbedUrl && (
                            <div className="mt-4">
                                <p className="text-sm text-muted-foreground mb-2">Testimonial Video Preview:</p>
                                <div className="aspect-video w-full max-w-sm rounded-md border bg-black">
                                <iframe
                                    src={testimonialsYoutubeEmbedUrl}
                                    title="YouTube video player preview"
                                    frameBorder="0"
                                    allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                    allowFullScreen
                                    className="w-full h-full"
                                ></iframe>
                                </div>
                            </div>
                        )}
                        <Button onClick={() => handleSaveData('testimonials')} disabled={isLoading} className="mt-4">
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            {isLoading ? "Saving..." : "Save Testimonials Section"}
                        </Button>
                    </div>
                </AccordionContent>
            </Card>
        </AccordionItem>

        <AccordionItem value="myGoal">
            <Card className="shadow-lg">
                <AccordionTrigger className="px-6 py-4 text-lg font-semibold hover:no-underline">
                    <div className="flex items-center">
                    <Users className="mr-2 h-5 w-5 text-primary" />
                    Must Listen Section
                    </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-6">
                    <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">Add one YouTube video link per line to be displayed in the 'Must Listen' slider on the homepage.</p>
                        <Label htmlFor="myGoalVideoUrl">YouTube Video URLs</Label>
                        <Textarea
                          id="myGoalVideoUrl"
                          placeholder="https://www.youtube.com/watch?v=...&#10;https://www.youtube.com/watch?v=..."
                          value={myGoalContent.youtubeLinks?.join('\n') || ''}
                          onChange={handleMyGoalInputChange}
                          rows={5}
                        />
                        {firstMyGoalYoutubeEmbedUrl && (
                            <div className="mt-4">
                                <p className="text-sm text-muted-foreground mb-2">First Video Preview:</p>
                                <div className="aspect-video w-full max-w-sm rounded-md border bg-black">
                                <iframe
                                    src={firstMyGoalYoutubeEmbedUrl}
                                    title="YouTube video player preview"
                                    frameBorder="0"
                                    allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                    allowFullScreen
                                    className="w-full h-full"
                                ></iframe>
                                </div>
                            </div>
                        )}
                        <Button onClick={() => handleSaveData('myGoal')} disabled={isLoading} className="mt-4">
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            {isLoading ? "Saving..." : "Save Must Listen Section"}
                        </Button>
                    </div>
                </AccordionContent>
            </Card>
        </AccordionItem>
        
        <AccordionItem value="homepageVideoMessage">
          <Card className="shadow-lg">
            <AccordionTrigger className="px-6 py-4 text-lg font-semibold hover:no-underline">
                <div className="flex items-center">
                  <Video className="mr-2 h-5 w-5 text-primary" />
                  Homepage Video Message
                </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">Provide a public URL to a video (e.g., from YouTube, Vimeo, or a direct file link) to be shown in a pop-up on the homepage for first-time visitors.</p>
                <Label htmlFor="videoUpload">Video URL</Label>
                <Input id="videoUpload" type="url" placeholder="https://www.youtube.com/watch?v=..." value={videoMessageContent.videoUrl || ''} onChange={handleVideoUrlChange} />
                {videoMessageContent.videoUrl && (
                  <div className="mt-4">
                    <p className="text-sm text-muted-foreground mb-2">Current Video Preview:</p>
                    <div className="aspect-video w-full max-w-sm rounded-md border bg-black">
                      {youtubeEmbedUrl ? (
                        <iframe
                          src={youtubeEmbedUrl}
                          title="YouTube video player preview"
                          frameBorder="0"
                          allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          allowFullScreen
                          className="w-full h-full"
                        ></iframe>
                      ) : (
                        <video src={videoMessageContent.videoUrl} controls className="w-full h-full object-contain" />
                      )}
                    </div>
                    <Button variant="destructive" size="sm" onClick={handleRemoveVideo} className="mt-2">Remove Video</Button>
                  </div>
                )}
                <Button onClick={() => handleSaveData('homepageVideoMessage')} disabled={isLoading} className="mt-4">
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  {isLoading ? "Saving..." : "Save Video Message"}
                </Button>
              </div>
            </AccordionContent>
          </Card>
        </AccordionItem>
        
        <AccordionItem value="motivationPageVideos">
          <Card className="shadow-lg">
            <AccordionTrigger className="px-6 py-4 text-lg font-semibold hover:no-underline">
              <div className="flex items-center">
                <Video className="mr-2 h-5 w-5 text-primary" />
                Motivation Page Videos
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">Enter one YouTube video URL per line. These will appear on the "Motivation" page.</p>
                <Label htmlFor="motivationVideos">YouTube Video Links</Label>
                <Textarea
                  id="motivationVideos"
                  placeholder="https://www.youtube.com/watch?v=...&#10;https://www.youtube.com/watch?v=..."
                  value={motivationPageContent.youtubeLinks.join('\n')}
                  onChange={handleMotivationVideosChange}
                  rows={5}
                />
                <Button onClick={() => handleSaveData('motivationPageVideos')} disabled={isLoading} className="mt-4">
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  {isLoading ? "Saving..." : "Save Motivation Videos"}
                </Button>
              </div>
            </AccordionContent>
          </Card>
        </AccordionItem>

        <AccordionItem value="signupVisibilitySettings">
          <Card className="shadow-lg">
            <AccordionTrigger className="px-6 py-4 text-lg font-semibold hover:no-underline">
              <div className="flex items-center">
                <Users className="mr-2 h-5 w-5 text-primary" />
                Authentication Feature Visibility
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              <div className="space-y-6">
                <div className="flex items-center justify-between space-x-2 p-3 border rounded-md">
                  <Label htmlFor="enableSignupButtonSwitch" className="flex flex-col space-y-1">
                    <span>Show Sign Up Button (Public Navbar)</span>
                    <span className="font-normal leading-snug text-muted-foreground text-xs">
                      Enable this to show the main "Sign Up" button in the public-facing navigation bar.
                    </span>
                  </Label>
                  <Switch
                    id="enableSignupButtonSwitch"
                    checked={featureVisibility.enableSignupButton}
                    onCheckedChange={(checked) => handleSwitchChange('enableSignupButton', checked)}
                  />
                </div>
                 <div className="flex items-center justify-between space-x-2 p-3 border rounded-md">
                  <Label htmlFor="enableStartupSignupSwitch" className="flex flex-col space-y-1">
                    <span>Show Startup Sign Up Form</span>
                    <span className="font-normal leading-snug text-muted-foreground text-xs">
                      Enable this to allow public sign-up for Startups (Fundraise/Sales Professionals).
                    </span>
                  </Label>
                  <Switch
                    id="enableStartupSignupSwitch"
                    checked={featureVisibility.enableStartupSignup}
                    onCheckedChange={(checked) => handleSwitchChange('enableStartupSignup', checked)}
                  />
                </div>
                <div className="flex items-center justify-between space-x-2 p-3 border rounded-md">
                  <Label htmlFor="enableInvestorSignupSwitch" className="flex flex-col space-y-1">
                    <span>Show Investor Sign Up Form</span>
                    <span className="font-normal leading-snug text-muted-foreground text-xs">
                      Enable this to allow public sign-up for Investors on the main /auth page.
                    </span>
                  </Label>
                  <Switch
                    id="enableInvestorSignupSwitch"
                    checked={featureVisibility.enableInvestorSignup}
                    onCheckedChange={(checked) => handleSwitchChange('enableInvestorSignup', checked)}
                  />
                </div>
                <div className="flex items-center justify-between space-x-2 p-3 border rounded-md">
                  <Label htmlFor="enableCompanySignupSwitch" className="flex flex-col space-y-1">
                    <span>Show Company Sign Up Form</span>
                    <span className="font-normal leading-snug text-muted-foreground text-xs">
                      Enable this to allow public sign-up for Companies on the main /auth page.
                    </span>
                  </Label>
                  <Switch
                    id="enableCompanySignupSwitch"
                    checked={featureVisibility.enableCompanySignup}
                    onCheckedChange={(checked) => handleSwitchChange('enableCompanySignup', checked)}
                  />
                </div>
                <Button onClick={() => handleSaveData('signupVisibilitySettings')} disabled={isLoading} className="mt-4">
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  {isLoading ? "Saving Settings..." : "Save Visibility Settings"}
                </Button>
              </div>
            </AccordionContent>
          </Card>
        </AccordionItem>
        
      </Accordion>
      
       <Card className="mt-8 shadow-lg">
        <CardHeader>
            <CardTitle>Developer Note</CardTitle>
        </CardHeader>
        <CardContent>
            <p className="text-sm text-muted-foreground">
                This page manages dynamic content stored in Firestore. Public pages need to fetch this content to reflect changes.
                The visibility toggles control which forms appear on the `/auth` page and which buttons appear in the main navbar.
            </p>
        </CardContent>
       </Card>

        <Card className="mt-8 shadow-lg">
            <CardHeader>
                <CardTitle className="flex items-center">
                    <ImageIcon className="mr-2 h-5 w-5 text-primary" />
                    Home Slider
                </CardTitle>
                <CardDescription>
                    Manage the promotional slides on the homepage carousel. Add or remove slides as needed.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {homeSliderContent.slides.map((slide, index) => (
                    <div key={index} className="space-y-4 border p-4 rounded-md relative">
                        <div className="flex justify-between items-center">
                            <h4 className="font-semibold text-md">Slide {index + 1}</h4>
                            <Button variant="destructive" size="icon" onClick={() => handleRemoveSlide(index)} className="h-7 w-7">
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                        <div className="space-y-2">
                           <Label htmlFor={`slide-heading-${index}`}>Heading</Label>
                           <Input id={`slide-heading-${index}`} value={slide.heading} onChange={(e) => handleSliderInputChange(index, 'heading', e.target.value)} />
                        </div>
                         <div className="space-y-2">
                           <Label htmlFor={`slide-subheading-${index}`}>Subheading</Label>
                           <Input id={`slide-subheading-${index}`} value={slide.subheading} onChange={(e) => handleSliderInputChange(index, 'subheading', e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor={`slide-image-${index}`}>Image</Label>
                            <Input id={`slide-image-${index}`} type="file" accept="image/*" onChange={(e) => handleSliderImageChange(index, e.target.files ? e.target.files[0] : null)} />
                            {slide.imageUrl && <img src={slide.imageUrl} alt={`Slide ${index+1} preview`} className="mt-2 h-20 w-auto object-contain border rounded-md" data-ai-hint="slider image preview"/>}
                        </div>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <div className="space-y-2">
                               <Label htmlFor={`slide-cta-text-${index}`}>CTA Button Text</Label>
                               <Input id={`slide-cta-text-${index}`} value={slide.ctaText} onChange={(e) => handleSliderInputChange(index, 'ctaText', e.target.value)} />
                           </div>
                           <div className="space-y-2">
                               <Label htmlFor={`slide-cta-link-${index}`}>CTA Button Link</Label>
                               <Input id={`slide-cta-link-${index}`} value={slide.ctaLink} onChange={(e) => handleSliderInputChange(index, 'ctaLink', e.target.value)} />
                           </div>
                        </div>
                    </div>
                ))}
                 <div className="flex justify-between items-center pt-4 border-t">
                    <Button onClick={handleAddSlide} variant="outline">
                        <PlusCircle className="mr-2 h-4 w-4"/> Add New Slide
                    </Button>
                    <Button onClick={() => handleSaveData('homeSlider')} disabled={isLoading} className="mt-4">
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        {isLoading ? "Saving..." : "Save Home Slider"}
                    </Button>
                </div>
            </CardContent>
        </Card>

        <Card className="mt-8 shadow-lg">
            <CardHeader>
                <CardTitle className="flex items-center">
                    <ImageIcon className="mr-2 h-5 w-5 text-primary" />
                    Slider Preview
                </CardTitle>
                <CardDescription>
                    This is a live preview of how the slider will appear on the homepage.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="relative w-full h-40 bg-muted rounded-lg overflow-hidden">
                   <HomeCarousel slides={homeSliderContent.slides.filter(slide => slide.imageUrl && slide.heading)} />
                </div>
            </CardContent>
        </Card>
        
        <Card className="mt-8 shadow-lg">
            <CardHeader>
                <CardTitle className="flex items-center">
                    <ImageIcon className="mr-2 h-5 w-5 text-purple-500" />
                    Partner Companies Slider
                </CardTitle>
                <CardDescription>
                    Manage the promotional slides for the partner companies carousel. Add or remove slides as needed.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {secondarySliderContent.slides.map((slide, index) => (
                    <div key={`secondary-slide-${index}`} className="space-y-4 border p-4 rounded-md relative">
                        <div className="flex justify-between items-center">
                            <h4 className="font-semibold text-md">Slide {index + 1}</h4>
                            <Button variant="destructive" size="icon" onClick={() => handleRemoveSecondarySlide(index)} className="h-7 w-7">
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                        <div className="space-y-2">
                           <Label htmlFor={`secondary-slide-heading-${index}`}>Heading</Label>
                           <Input id={`secondary-slide-heading-${index}`} value={slide.heading} onChange={(e) => handleSecondarySliderInputChange(index, 'heading', e.target.value)} />
                        </div>
                         <div className="space-y-2">
                           <Label htmlFor={`secondary-slide-subheading-${index}`}>Subheading</Label>
                           <Input id={`secondary-slide-subheading-${index}`} value={slide.subheading} onChange={(e) => handleSecondarySliderInputChange(index, 'subheading', e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor={`secondary-slide-image-${index}`}>Image</Label>
                            <Input id={`secondary-slide-image-${index}`} type="file" accept="image/*" onChange={(e) => handleSecondarySliderImageChange(index, e.target.files ? e.target.files[0] : null)} />
                            {slide.imageUrl && <img src={slide.imageUrl} alt={`Secondary Slide ${index+1} preview`} className="mt-2 h-20 w-auto object-contain border rounded-md" data-ai-hint="slider image preview"/>}
                        </div>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <div className="space-y-2">
                               <Label htmlFor={`secondary-slide-cta-text-${index}`}>CTA Button Text</Label>
                               <Input id={`secondary-slide-cta-text-${index}`} value={slide.ctaText} onChange={(e) => handleSecondarySliderInputChange(index, 'ctaText', e.target.value)} />
                           </div>
                           <div className="space-y-2">
                               <Label htmlFor={`secondary-slide-cta-link-${index}`}>CTA Button Link</Label>
                               <Input id={`secondary-slide-cta-link-${index}`} value={slide.ctaLink} onChange={(e) => handleSecondarySliderInputChange(index, 'ctaLink', e.target.value)} />
                           </div>
                        </div>
                    </div>
                ))}
                 <div className="flex justify-between items-center pt-4 border-t">
                    <Button onClick={handleAddSecondarySlide} variant="outline">
                        <PlusCircle className="mr-2 h-4 w-4"/> Add New Slide
                    </Button>
                    <Button onClick={() => handleSaveData('secondarySlider')} disabled={isLoading} className="mt-4">
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        {isLoading ? "Saving..." : "Save Partner Companies Slider"}
                    </Button>
                </div>
            </CardContent>
        </Card>
        
        <Card className="mt-8 shadow-lg">
            <CardHeader>
                <CardTitle className="flex items-center">
                    <ImageIcon className="mr-2 h-5 w-5 text-green-500" />
                    Institutes Slider
                </CardTitle>
                <CardDescription>
                    Manage the promotional slides for the institutes carousel on the Success Stories page.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {institutesSliderContent.slides.map((slide, index) => (
                    <div key={`institutes-slide-${index}`} className="space-y-4 border p-4 rounded-md relative">
                        <div className="flex justify-between items-center">
                            <h4 className="font-semibold text-md">Slide {index + 1}</h4>
                            <Button variant="destructive" size="icon" onClick={() => handleRemoveInstitutesSlide(index)} className="h-7 w-7">
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                        <div className="space-y-2">
                           <Label htmlFor={`institutes-slide-heading-${index}`}>Heading</Label>
                           <Input id={`institutes-slide-heading-${index}`} value={slide.heading} onChange={(e) => handleInstitutesSliderInputChange(index, 'heading', e.target.value)} />
                        </div>
                         <div className="space-y-2">
                           <Label htmlFor={`institutes-slide-subheading-${index}`}>Subheading</Label>
                           <Input id={`institutes-slide-subheading-${index}`} value={slide.subheading} onChange={(e) => handleInstitutesSliderInputChange(index, 'subheading', e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor={`institutes-slide-image-${index}`}>Image</Label>
                            <Input id={`institutes-slide-image-${index}`} type="file" accept="image/*" onChange={(e) => handleInstitutesSliderImageChange(index, e.target.files ? e.target.files[0] : null)} />
                            {slide.imageUrl && <img src={slide.imageUrl} alt={`Institutes Slide ${index+1} preview`} className="mt-2 h-20 w-auto object-contain border rounded-md" data-ai-hint="slider image preview"/>}
                        </div>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <div className="space-y-2">
                               <Label htmlFor={`institutes-slide-cta-text-${index}`}>CTA Button Text</Label>
                               <Input id={`institutes-slide-cta-text-${index}`} value={slide.ctaText} onChange={(e) => handleInstitutesSliderInputChange(index, 'ctaText', e.target.value)} />
                           </div>
                           <div className="space-y-2">
                               <Label htmlFor={`institutes-slide-cta-link-${index}`}>CTA Button Link</Label>
                               <Input id={`institutes-slide-cta-link-${index}`} value={slide.ctaLink} onChange={(e) => handleInstitutesSliderInputChange(index, 'ctaLink', e.target.value)} />
                           </div>
                        </div>
                    </div>
                ))}
                 <div className="flex justify-between items-center pt-4 border-t">
                    <Button onClick={handleAddInstitutesSlide} variant="outline">
                        <PlusCircle className="mr-2 h-4 w-4"/> Add New Slide
                    </Button>
                    <Button onClick={() => handleSaveData('institutesSlider')} disabled={isLoading} className="mt-4">
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        {isLoading ? "Saving..." : "Save Institutes Slider"}
                    </Button>
                </div>
            </CardContent>
        </Card>
    </div>
  );
}
