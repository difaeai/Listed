"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Phone, MapPin, Send, AlertTriangle, Info, CalendarClock, Calendar as CalendarIcon, Loader2, Laptop } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { db } from '@/lib/firebaseConfig';
import { collection, addDoc, serverTimestamp, Timestamp, onSnapshot, doc } from 'firebase/firestore';
import type { InquiryType } from '@/app/auth/components/auth-shared-types';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, startOfDay } from "date-fns";
import { cn } from "@/lib/utils";


const inquiryTypes = ["general_query", "corporation_account_request", "investor_account_request"] as const;

const contactFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  inquiryType: z.enum(inquiryTypes, { required_error: "Please select an inquiry type."}),
  subject: z.string().optional(), // Optional now
  message: z.string().min(10, { message: "Message must be at least 10 characters." }),
}).superRefine((data, ctx) => {
    if (data.inquiryType === "general_query" && (!data.subject || data.subject.length < 5)) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Subject must be at least 5 characters for general queries.",
            path: ["subject"],
        });
    }
});

type ContactFormValues = z.infer<typeof contactFormSchema>;

export type AppointmentType = 'call' | 'online';

export default function ContactUsPage() {
  const { toast } = useToast();
  const [date, setDate] = useState<Date | undefined>(undefined);
  
  const [appointmentType, setAppointmentType] = useState<AppointmentType | null>(null);
  const [appointmentName, setAppointmentName] = useState('');
  const [appointmentPhoneNumber, setAppointmentPhoneNumber] = useState('');
  const [isSubmittingAppointment, setIsSubmittingAppointment] = useState(false);

  const [fullyUnavailableDates, setFullyUnavailableDates] = useState<Date[]>([]);
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(true);

  useEffect(() => {
    if(!db) {
        setIsLoadingAvailability(false);
        return;
    }
    
    // Listener for disabled dates by admin
    const settingsRef = doc(db, "siteContent", "bookingSettings");
    const unsubSettings = onSnapshot(settingsRef, (docSnap) => {
        const adminDisabledDates = docSnap.exists() ? (docSnap.data().disabledDates || []).map((d: string) => startOfDay(new Date(d))) : [];
        setFullyUnavailableDates(prev => [...prev.filter(d => !adminDisabledDates.some((ad: Date) => ad.getTime() === d.getTime())), ...adminDisabledDates]);
    });

    // Listener for already booked appointments
    const appointmentsRef = collection(db, "appointments");
    const unsubAppointments = onSnapshot(appointmentsRef, (querySnapshot) => {
        const bookedDates = querySnapshot.docs.map(docSnap => {
            const appointment = docSnap.data();
            return appointment.appointmentDate ? startOfDay(appointment.appointmentDate.toDate()) : null;
        }).filter((d): d is Date => d !== null);
        setFullyUnavailableDates(prev => [...prev.filter(d => !bookedDates.some(bd => bd.getTime() === d.getTime())), ...bookedDates]);
    });
    
    setIsLoadingAvailability(false);

    return () => {
        unsubSettings();
        unsubAppointments();
    };

  }, []);

  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
        name: "",
        email: "",
        inquiryType: undefined,
        subject: "",
        message: "",
    }
  });
  const watchedInquiryType = form.watch("inquiryType");

  const onSubmit: SubmitHandler<ContactFormValues> = async (data) => {
    if (form.formState.isSubmitting) return;
    if (!db) {
        toast({ title: "Error", description: "Database not available. Please try again later.", variant: "destructive"});
        return;
    }

    let subjectForFirestore = data.subject;
    if (data.inquiryType === 'corporation_account_request') {
        subjectForFirestore = "Corporation Account Request";
    } else if (data.inquiryType === 'investor_account_request') {
        subjectForFirestore = "Investor Account Request";
    }

    try {
      await addDoc(collection(db, "inquiries"), {
        ...data,
        subject: subjectForFirestore, // Use potentially modified subject
        status: 'New', // Default status
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      toast({
        title: "Inquiry Sent!",
        description: "Thank you for contacting us. We'll get back to you shortly.",
        variant: "default",
      });
      form.reset(); 
    } catch (error) {
      console.error("Error sending inquiry to Firestore:", error);
      toast({ title: "Submission Failed", description: "Could not send your inquiry. Please try again.", variant: "destructive"});
    }
  };
  
  const handleAppointmentSubmit = async () => {
    if (!db || !appointmentType || !appointmentName || !appointmentPhoneNumber || !date) {
        toast({ title: "Error", description: "Please fill all required fields for appointment.", variant: "destructive"});
        return;
    }
    
    setIsSubmittingAppointment(true);
    
    const appointmentData: any = {
        name: appointmentName,
        phoneNumber: appointmentPhoneNumber,
        appointmentType: appointmentType,
        createdAt: serverTimestamp(),
        status: 'Pending',
    };

    if (date) {
        appointmentData.appointmentDate = Timestamp.fromDate(date);
    }

    try {
        await addDoc(collection(db, "appointments"), appointmentData);
        toast({
            title: "Appointment Request Submitted",
            description: `Your request for an ${appointmentType} appointment has been received. Our team will get in touch shortly.`,
        });
        setAppointmentType(null);
        setAppointmentName('');
        setAppointmentPhoneNumber('');
        setDate(undefined);
    } catch (error) {
        console.error("Error saving appointment to Firestore:", error);
        toast({ title: "Submission Failed", description: "Could not submit your appointment request.", variant: "destructive"});
    } finally {
        setIsSubmittingAppointment(false);
    }
  };

  const isSubmitDisabled = !appointmentType || !appointmentName.trim() || !appointmentPhoneNumber.trim() || !date || isSubmittingAppointment;


  return (
    <div className="py-12 md:py-20">
      <div className="container mx-auto px-4 md:px-6">
        <section className="text-center mb-16 md:mb-20">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-4">Connect With Us</h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Have a question or need to get in touch? We'd love to hear from you. For institutional investor or corporation onboarding inquiries, please use the form below.
          </p>
        </section>

        <div className="grid md:grid-cols-2 gap-12 items-start">
          <Card className="shadow-xl">
            <CardHeader>
              <CardTitle className="text-2xl">Send a Direct Message</CardTitle>
              <CardDescription>Fill out the form for general questions or account requests.</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField control={form.control} name="name" render={({ field }) => (
                      <FormItem><Label>Full Name</Label><FormControl><Input placeholder="Your Name" {...field} /></FormControl><FormMessage /></FormItem>
                  )}/>
                  <FormField control={form.control} name="email" render={({ field }) => (
                      <FormItem><Label>Email Address</Label><FormControl><Input type="email" placeholder="your@email.com" {...field} /></FormControl><FormMessage /></FormItem>
                  )}/>
                  <FormField control={form.control} name="inquiryType" render={({ field }) => (
                    <FormItem>
                      <Label>Inquiry Type</Label>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select inquiry type" /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="general_query">General Query</SelectItem>
                          <SelectItem value="corporation_account_request">Request Corporation Account</SelectItem>
                          <SelectItem value="investor_account_request">Request Investor Account</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}/>
                  {(watchedInquiryType === 'general_query' || !watchedInquiryType) && (
                     <FormField control={form.control} name="subject" render={({ field }) => (
                        <FormItem><Label>Subject</Label><FormControl><Input placeholder="Inquiry Subject" {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                  )}
                  <FormField control={form.control} name="message" render={({ field }) => (
                    <FormItem><Label>Message</Label><FormControl><Textarea placeholder="Your message..." rows={5} {...field} /></FormControl><FormMessage /></FormItem>
                  )}/>
                  <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" disabled={form.formState.isSubmitting}>
                    <Send className="mr-2 h-4 w-4" /> {form.formState.isSubmitting ? "Sending..." : "Send Message"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          <div className="space-y-8">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl">Book an Appointment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                 <div className="flex items-start">
                  <CalendarClock className="h-6 w-6 text-primary mr-3 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-foreground">Schedule a Meeting</h3>
                    <p className="text-muted-foreground text-sm mb-4">To ensure our team can give you their full attention, please schedule a meeting in advance. <strong className="text-destructive-foreground bg-destructive/80 px-1 rounded-sm">No walk-ins will be entertained.</strong> Our team will call you to finalize the appointment details. Weekends are unavailable, and only one appointment can be scheduled per person.</p>
                    <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                           <Button variant={appointmentType === 'call' ? 'default' : 'outline'} className="w-full" onClick={() => setAppointmentType('call')}>Book a Call</Button>
                           <Button variant={appointmentType === 'online' ? 'default' : 'outline'} className="w-full" onClick={() => setAppointmentType('online')}>Book Online Meeting</Button>
                        </div>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                variant={'outline'}
                                className={cn(
                                    "w-full justify-start text-left font-normal",
                                    !date && "text-muted-foreground",
                                    !appointmentType && "opacity-50 cursor-not-allowed"
                                )}
                                disabled={!appointmentType || isLoadingAvailability}
                                >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {date ? format(date, "PPP") : <span>Choose appointment date</span>}
                                {isLoadingAvailability && <Loader2 className="ml-auto h-4 w-4 animate-spin"/>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar
                                mode="single"
                                selected={date}
                                onSelect={setDate}
                                initialFocus
                                disabled={[{ before: new Date() }, { dayOfWeek: [0, 6] }, ...fullyUnavailableDates]}
                                />
                            </PopoverContent>
                        </Popover>
                        <div className="pt-2 space-y-2">
                            <Label htmlFor="appointment-name">Please Enter your name</Label>
                            <Input id="appointment-name" placeholder="Full Name" type="text" className="mt-1" value={appointmentName} onChange={(e) => setAppointmentName(e.target.value)} />
                            <Label htmlFor="appointment-phone">Please enter your mobile number</Label>
                            <Input id="appointment-phone" placeholder="03XX-XXXXXXX" type="tel" className="mt-1" value={appointmentPhoneNumber} onChange={(e) => setAppointmentPhoneNumber(e.target.value)} />
                        </div>
                        <Button 
                            className="w-full mt-2"
                            disabled={isSubmitDisabled}
                            onClick={handleAppointmentSubmit}
                        >
                            {isSubmittingAppointment && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                            Submit
                        </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-lg">
              <CardHeader><CardTitle className="text-xl">Our Contact Details</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start">
                  <Mail className="h-6 w-6 text-primary mr-3 mt-1 flex-shrink-0" />
                  <div><h3 className="font-semibold text-foreground">Email Us</h3><a href="mailto:info@listed.com.pk" className="text-muted-foreground hover:text-primary">info@listed.com.pk</a></div>
                </div>
                <div className="flex items-start">
                  <Phone className="h-6 w-6 text-primary mr-3 mt-1 flex-shrink-0" />
                  <div><h3 className="font-semibold text-foreground">Call Us</h3><p className="text-muted-foreground">+92 370 3860050</p></div>
                </div>
                <div className="flex items-start">
                  <MapPin className="h-6 w-6 text-primary mr-3 mt-1 flex-shrink-0" />
                  <div><h3 className="font-semibold text-foreground">Our Office</h3><p className="text-muted-foreground">Diamond mall, Gulberg Greens, Islamabad, Pakistan</p></div>
                </div>
              </CardContent>
            </Card>
            
             <Card className="shadow-lg">
              <CardHeader><CardTitle className="text-xl">Find Us Here</CardTitle></CardHeader>
              <CardContent>
                <div className="aspect-video rounded-md overflow-hidden">
                  <iframe 
                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3322.930827590228!2d73.1674895!3d33.6070992!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x38dfed1b0bedce71%3A0x6f641bf3a51aacac!2sDiamond%20Mall%20And%20Residencia!5e0!3m2!1sen!2s!4v1747560114235!5m2!1sen!2s" 
                    width="100%" height="100%" style={{ border:0 }} allowFullScreen={true} loading="lazy" referrerPolicy="no-referrer-when-downgrade" title="Office Location Map"></iframe>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}