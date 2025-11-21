
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
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
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebaseConfig';
import { collection, addDoc, doc, updateDoc, deleteDoc, onSnapshot, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { Users, PlusCircle, Search, Edit, Trash2, Loader2, CheckCircle, Link as LinkIcon, Facebook, Instagram, Linkedin, MessageSquare as SnapchatIcon } from 'lucide-react';
import Image from 'next/image';

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
  createdAt: any;
}

const MAX_FILE_SIZE_MB = 2;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export default function AdminEducationalPartnersPage() {
  const [partners, setPartners] = useState<EducationalPartner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<EducationalPartner | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [hasBlueBadge, setHasBlueBadge] = useState(false);
  const [contactPerson, setContactPerson] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [facebookUrl, setFacebookUrl] = useState('');
  const [instagramUrl, setInstagramUrl] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [snapchatUrl, setSnapchatUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const partnersQuery = query(collection(db, "educationalPartners"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(partnersQuery, (snapshot) => {
      const fetchedPartners = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as EducationalPartner));
      setPartners(fetchedPartners);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching partners:", error);
      toast({ title: "Fetch Error", description: "Could not load educational partners.", variant: "destructive" });
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [toast]);

  const filteredPartners = useMemo(() => {
    return partners.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [partners, searchTerm]);

  const resetForm = () => {
    setName('');
    setDescription('');
    setLogoFile(null);
    setLogoPreview(null);
    setHasBlueBadge(false);
    setContactPerson('');
    setContactEmail('');
    setWebsite('');
    setFacebookUrl('');
    setInstagramUrl('');
    setLinkedinUrl('');
    setSnapchatUrl('');
    setEditingPartner(null);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        toast({ title: "File Too Large", description: `Logo must be smaller than ${MAX_FILE_SIZE_MB}MB.`, variant: "destructive" });
        return;
      }
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setLogoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !description) {
      toast({ title: "Missing Fields", description: "Name and Description are required.", variant: "destructive" });
      return;
    }
    if (!editingPartner && !logoFile) {
      toast({ title: "Missing Logo", description: "A logo is required when creating a new partner.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    let logoUrlForFirestore = editingPartner?.logoUrl || '';

    if (logoFile) {
      // In a real app, upload to Firebase Storage and get URL. For now, use Data URI.
      logoUrlForFirestore = logoPreview!;
    }

    const partnerData = {
      name,
      description,
      logoUrl: logoUrlForFirestore,
      hasBlueBadge,
      contactPerson,
      contactEmail,
      website,
      facebookUrl,
      instagramUrl,
      linkedinUrl,
      snapchatUrl,
      updatedAt: serverTimestamp(),
    };

    try {
      if (editingPartner) {
        await updateDoc(doc(db, "educationalPartners", editingPartner.id), partnerData);
        toast({ title: "Partner Updated", description: `${name} has been updated.` });
      } else {
        await addDoc(collection(db, "educationalPartners"), { ...partnerData, createdAt: serverTimestamp() });
        toast({ title: "Partner Added", description: `${name} has been added.` });
      }
      resetForm();
      setIsFormOpen(false);
    } catch (error) {
      console.error("Error saving partner:", error);
      toast({ title: "Save Error", description: "Could not save partner details.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditDialog = (partner: EducationalPartner) => {
    setEditingPartner(partner);
    setName(partner.name);
    setDescription(partner.description);
    setLogoPreview(partner.logoUrl);
    setHasBlueBadge(partner.hasBlueBadge);
    setContactPerson(partner.contactPerson || '');
    setContactEmail(partner.contactEmail || '');
    setWebsite(partner.website || '');
    setFacebookUrl(partner.facebookUrl || '');
    setInstagramUrl(partner.instagramUrl || '');
    setLinkedinUrl(partner.linkedinUrl || '');
    setSnapchatUrl(partner.snapchatUrl || '');
    setIsFormOpen(true);
  };

  const handleDeletePartner = async (partner: EducationalPartner) => {
    await deleteDoc(doc(db, "educationalPartners", partner.id));
    toast({ title: "Partner Deleted", description: `${partner.name} has been removed.` });
  };

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center"><Users className="mr-3 h-8 w-8 text-primary"/>Manage Educational Partners</h1>
          <p className="text-muted-foreground">Add, edit, and manage partner institutions.</p>
        </div>
        <Dialog open={isFormOpen} onOpenChange={isOpen => { setIsFormOpen(isOpen); if (!isOpen) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><PlusCircle className="mr-2 h-4 w-4"/> Add Partner</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>{editingPartner ? 'Edit Partner' : 'Add New Educational Partner'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-4">
              <div className="space-y-2">
                <Label htmlFor="name">Partner Name</Label>
                <Input id="name" value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" value={description} onChange={e => setDescription(e.target.value)} />
              </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contactPerson">Contact Person</Label>
                  <Input id="contactPerson" value={contactPerson} onChange={e => setContactPerson(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactEmail">Contact Email</Label>
                  <Input id="contactEmail" type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">Website URL</Label>
                <Input id="website" type="url" value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://example.com" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="facebookUrl">Facebook URL</Label>
                  <Input id="facebookUrl" type="url" value={facebookUrl} onChange={e => setFacebookUrl(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="instagramUrl">Instagram URL</Label>
                  <Input id="instagramUrl" type="url" value={instagramUrl} onChange={e => setInstagramUrl(e.target.value)} />
                </div>
                 <div className="space-y-2">
                  <Label htmlFor="linkedinUrl">LinkedIn URL</Label>
                  <Input id="linkedinUrl" type="url" value={linkedinUrl} onChange={e => setLinkedinUrl(e.target.value)} />
                </div>
                 <div className="space-y-2">
                  <Label htmlFor="snapchatUrl">Snapchat Username</Label>
                  <Input id="snapchatUrl" type="text" value={snapchatUrl} onChange={e => setSnapchatUrl(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="logo">Logo Image</Label>
                <Input id="logo" type="file" onChange={handleImageChange} accept="image/*" />
                {logoPreview && <Image src={logoPreview} alt="Logo preview" width={100} height={100} className="mt-2 rounded-md object-contain border p-1" />}
              </div>
              <div className="flex items-center space-x-2">
                <Switch id="blue-badge" checked={hasBlueBadge} onCheckedChange={setHasBlueBadge} />
                <Label htmlFor="blue-badge">Show Blue Verified Badge</Label>
              </div>
              <DialogFooter>
                <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                <Button type="submit" disabled={isSubmitting}>{isSubmitting ? <Loader2 className="animate-spin mr-2"/> : null} {editingPartner ? 'Save Changes' : 'Add Partner'}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Partner List ({filteredPartners.length})</CardTitle>
          <div className="relative mt-4">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by name..." className="pl-8 w-full md:w-1/3" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>Loading partners...</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPartners.map(partner => (
                <Card key={partner.id} className="shadow-md">
                  <CardContent className="flex flex-col items-center text-center p-6">
                    <div className="relative mb-4">
                      <Image src={partner.logoUrl} alt={partner.name} width={120} height={120} className="rounded-full object-contain h-32 w-32 border-2" />
                      {partner.hasBlueBadge && (
                        <div className="absolute -bottom-1 -right-1 bg-blue-500 rounded-full p-1 border-2 border-background">
                          <CheckCircle className="h-5 w-5 text-white"/>
                        </div>
                      )}
                    </div>
                    <h3 className="text-lg font-semibold">{partner.name}</h3>
                    <p className="text-sm text-muted-foreground mt-2 flex-grow">{partner.description}</p>
                  </CardContent>
                  <CardFooter className="flex justify-end gap-2 p-3 border-t">
                    <Button variant="ghost" size="icon" onClick={() => openEditDialog(partner)}><Edit className="h-4 w-4"/></Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4"/></Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete {partner.name}.</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeletePartner(partner)} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
