
"use client";

import React, { useState, useRef, ChangeEvent, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { TrendingUp, PlusCircle, ArrowLeft, DollarSign, BarChart3, Edit, Trash2, MoreHorizontal, Image as ImageIcon, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebaseConfig';
import { collection, addDoc, doc, updateDoc, deleteDoc, onSnapshot, query, where, orderBy, serverTimestamp } from 'firebase/firestore';
import { ScrollArea } from '@/components/ui/scroll-area';


interface ScalingOpportunity {
  id: string;
  creatorId: string;
  name: string;
  description: string;
  price: string;
  annualRevenue: string;
  imageUrl?: string;
  createdAt?: any;
}

const MAX_FILE_SIZE_MB = 1;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export default function ScaleBusinessPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [opportunities, setOpportunities] = useState<ScalingOpportunity[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [annualRevenue, setAnnualRevenue] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [editingOpportunity, setEditingOpportunity] = useState<ScalingOpportunity | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!currentUser || !db) {
        setIsLoading(false);
        return;
    }
    const q = query(
        collection(db, "scalingOpportunities"), 
        where("creatorId", "==", currentUser.uid),
        orderBy("createdAt", "desc")
    );
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const fetchedOpportunities: ScalingOpportunity[] = [];
        querySnapshot.forEach((doc) => {
            fetchedOpportunities.push({ id: doc.id, ...doc.data() } as ScalingOpportunity);
        });
        setOpportunities(fetchedOpportunities);
        setIsLoading(false);
    }, (error) => {
        console.error("Error fetching scaling opportunities: ", error);
        toast({ title: "Error", description: "Could not fetch opportunities.", variant: "destructive" });
        setIsLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser, toast]);


  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        toast({
          title: "File Too Large",
          description: `Image must be smaller than ${MAX_FILE_SIZE_MB}MB.`,
          variant: "destructive",
        });
        setImageFile(null);
        setImagePreview(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setPrice('');
    setAnnualRevenue('');
    setImageFile(null);
    setImagePreview(null);
    setEditingOpportunity(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !description || !price || !annualRevenue) {
      toast({ title: "Validation Error", description: "Please fill out all text fields.", variant: "destructive" });
      return;
    }
    if (!currentUser) {
        toast({ title: "Authentication Error", description: "You must be logged in to perform this action.", variant: "destructive"});
        return;
    }

    setIsSubmitting(true);

    let imageUrlForFirestore = editingOpportunity?.imageUrl || undefined;
    if(imageFile) {
        imageUrlForFirestore = imagePreview || undefined;
    }
    
    const opportunityData = {
        name,
        description,
        price,
        annualRevenue,
        imageUrl: imageUrlForFirestore,
        creatorId: currentUser.uid,
    };
    
    try {
        if (editingOpportunity) {
          const docRef = doc(db, "scalingOpportunities", editingOpportunity.id);
          await updateDoc(docRef, { ...opportunityData, updatedAt: serverTimestamp() });
          toast({ title: "Opportunity Updated", description: `"${name}" has been successfully updated.` });
        } else {
          await addDoc(collection(db, "scalingOpportunities"), { ...opportunityData, createdAt: serverTimestamp() });
          toast({ title: "Opportunity Listed", description: `"${name}" has been added to your scaling opportunities.` });
        }
        resetForm();
        setIsDialogOpen(false);
    } catch (error) {
        console.error("Error saving to Firestore:", error);
        toast({ title: "Error", description: "Could not save the opportunity.", variant: "destructive"});
    } finally {
        setIsSubmitting(false);
    }
  };
  
  const handleEdit = (opportunity: ScalingOpportunity) => {
    setEditingOpportunity(opportunity);
    setName(opportunity.name);
    setDescription(opportunity.description);
    setPrice(opportunity.price);
    setAnnualRevenue(opportunity.annualRevenue);
    setImagePreview(opportunity.imageUrl || null);
    setImageFile(null);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!db) return;
    try {
        await deleteDoc(doc(db, "scalingOpportunities", id));
        toast({ title: "Opportunity Deleted", description: "The scaling opportunity has been removed." });
    } catch (error) {
        console.error("Error deleting from Firestore:", error);
        toast({ title: "Delete Failed", description: "Could not delete the opportunity.", variant: "destructive"});
    }
  };
  
  const handleOpenDialog = (opp: ScalingOpportunity | null = null) => {
    if (opp) {
        handleEdit(opp);
    } else {
        resetForm();
        setIsDialogOpen(true);
    }
  };

  if (isLoading) {
    return (
         <div className="container mx-auto py-8 px-4 md:px-6">
             <Button variant="outline" asChild className="mb-4">
                <Link href="/dashboard"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard</Link>
            </Button>
            <div className="text-center">Loading opportunities...</div>
        </div>
    );
  }


  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
       <Button variant="outline" asChild className="mb-4">
        <Link href="/dashboard"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard</Link>
      </Button>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center">
            <TrendingUp className="mr-3 h-8 w-8 text-primary" />
            Scale Your Business
          </h1>
          <p className="text-muted-foreground">
            List opportunities for scaling your business operations or franchise.
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(isOpen) => { setIsDialogOpen(isOpen); if (!isOpen) resetForm(); }}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog(null)} disabled={opportunities.length > 0}>
              <PlusCircle className="mr-2 h-4 w-4" /> List Scale
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>{editingOpportunity ? 'Edit Scaling Opportunity' : 'List a New Scaling Opportunity'}</DialogTitle>
              <DialogDescription>
                Provide details about the business opportunity you are offering.
              </DialogDescription>
            </DialogHeader>
            <div className="flex-grow overflow-hidden">
                <ScrollArea className="h-full pr-4">
                    <form onSubmit={handleSubmit} id="scale-opportunity-form" className="space-y-4 py-4">
                        <div className="space-y-1">
                        <Label htmlFor="name">Name of Business</Label>
                        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Modern Cafe Franchise"/>
                        </div>
                        <div className="space-y-1">
                        <Label htmlFor="description">Description</Label>
                        <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the opportunity, what's included, etc." rows={4}/>
                        </div>
                        <div className="space-y-1">
                        <Label htmlFor="price">Price</Label>
                        <Input id="price" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="e.g., 1,000,000 PKR"/>
                        </div>
                        <div className="space-y-1">
                        <Label htmlFor="annualRevenue">Annual Revenue</Label>
                        <Input id="annualRevenue" value={annualRevenue} onChange={(e) => setAnnualRevenue(e.target.value)} placeholder="e.g., 500,000 PKR"/>
                        </div>
                        <div className="space-y-1">
                        <Label htmlFor="image">Image</Label>
                        <Input id="image" type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" />
                        </div>
                        {imagePreview && (
                        <div className="flex justify-center p-2 border rounded-md">
                            <Image src={imagePreview} alt="Image preview" width={200} height={150} className="rounded-md object-cover" data-ai-hint="business building"/>
                        </div>
                        )}
                    </form>
                </ScrollArea>
            </div>
              <DialogFooter className="border-t pt-4">
                <DialogClose asChild><Button type="button" variant="outline">Close</Button></DialogClose>
                <Button type="submit" form="scale-opportunity-form" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                    {editingOpportunity ? 'Save Changes' : 'Submit'}
                </Button>
              </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="shadow-lg rounded-xl">
        <CardHeader>
          <CardTitle>My Scaling Opportunities</CardTitle>
          <CardDescription>
            This section displays your listed scaling opportunities.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {opportunities.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <p>You have not listed any scaling opportunities yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {opportunities.map((opp) => (
                <div key={opp.id} className="relative group">
                    <Card 
                        className="shadow-md h-full flex flex-col transition-all hover:shadow-xl hover:border-primary/50 cursor-pointer"
                        onClick={() => handleOpenDialog(opp)}
                    >
                        {opp.imageUrl && (
                            <div className="relative h-48 w-full">
                                <Image src={opp.imageUrl} alt={opp.name} layout="fill" objectFit="cover" className="rounded-t-lg" data-ai-hint="business building"/>
                            </div>
                        )}
                        <CardHeader className={opp.imageUrl ? 'pt-4' : ''}>
                            <CardTitle className="text-xl">{opp.name}</CardTitle>
                        </CardHeader>
                        <CardContent className="flex-grow space-y-2">
                           <p className="text-muted-foreground text-sm line-clamp-3">{opp.description}</p>
                        </CardContent>
                         <CardFooter className="flex justify-between items-center text-sm font-semibold border-t pt-4 mt-4">
                            <div className="flex items-center text-green-600">
                                <DollarSign className="mr-2 h-5 w-5" />
                                <span>{opp.price}</span>
                            </div>
                            <div className="flex items-center text-blue-600">
                                <BarChart3 className="mr-2 h-5 w-5" />
                                <span>{opp.annualRevenue}</span>
                            </div>
                        </CardFooter>
                    </Card>
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                         <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="secondary" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                            <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenuItem onClick={() => handleOpenDialog(opp)}><Edit className="mr-2 h-4 w-4"/>Edit</DropdownMenuItem>
                            <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                                    <Trash2 className="mr-2 h-4 w-4"/>Delete
                                </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete "{opp.name}".</AlertDialogDescription></AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(opp.id)} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">Delete</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                            </AlertDialog>
                        </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
