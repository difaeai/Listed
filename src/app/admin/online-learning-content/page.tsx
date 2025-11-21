
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebaseConfig';
import { collection, doc, addDoc, updateDoc, deleteDoc, getDoc, setDoc, serverTimestamp, onSnapshot, query, orderBy } from 'firebase/firestore';
import { BookOpen, PlusCircle, Trash2, Save, Loader2, Video, Edit, XCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from '@/components/ui/label';

export interface VideoContent {
  title: string;
  url: string;
}

export interface OnlineCourse {
  id: string;
  title: string;
  description: string;
  videos: VideoContent[];
  createdAt: any;
}

export default function AdminOnlineLearningContentPage() {
  const [courses, setCourses] = useState<OnlineCourse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [isCourseDialogOpen, setIsCourseDialogOpen] = useState(false);
  const [currentCourseTitle, setCurrentCourseTitle] = useState('');
  const [currentCourseDescription, setCurrentCourseDescription] = useState('');
  const [editingCourse, setEditingCourse] = useState<OnlineCourse | null>(null);

  const [isVideoDialogOpen, setIsVideoDialogOpen] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [videoTitle, setVideoTitle] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  
  const { toast } = useToast();

  useEffect(() => {
    const q = query(collection(db, "onlineCourses"), orderBy("createdAt", "asc"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetchedCourses: OnlineCourse[] = [];
      querySnapshot.forEach((doc) => {
        fetchedCourses.push({ id: doc.id, ...doc.data() } as OnlineCourse);
      });
      setCourses(fetchedCourses);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching courses:", error);
      toast({ title: "Error", description: "Could not load courses.", variant: "destructive" });
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [toast]);
  
  const handleOpenCourseDialog = (course: OnlineCourse | null = null) => {
    if (course) {
      setEditingCourse(course);
      setCurrentCourseTitle(course.title);
      setCurrentCourseDescription(course.description);
    } else {
      setEditingCourse(null);
      setCurrentCourseTitle('');
      setCurrentCourseDescription('');
    }
    setIsCourseDialogOpen(true);
  };
  
  const handleSaveCourse = async () => {
    if (!currentCourseTitle.trim() || !currentCourseDescription.trim()) {
      toast({ title: "Validation Error", description: "Course Title and Description are required.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    
    try {
      if (editingCourse) {
        // Update existing course
        const courseRef = doc(db, "onlineCourses", editingCourse.id);
        await updateDoc(courseRef, {
          title: currentCourseTitle,
          description: currentCourseDescription,
          updatedAt: serverTimestamp(),
        });
        toast({ title: "Course Updated", description: "The course has been successfully updated." });
      } else {
        // Add new course
        await addDoc(collection(db, "onlineCourses"), {
          title: currentCourseTitle,
          description: currentCourseDescription,
          videos: [],
          createdAt: serverTimestamp(),
        });
        toast({ title: "Course Created", description: "The new course has been successfully added." });
      }
      setIsCourseDialogOpen(false);
    } catch (error) {
      console.error("Error saving course:", error);
      toast({ title: "Save Error", description: "Could not save the course.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCourse = async (courseId: string) => {
    try {
      await deleteDoc(doc(db, "onlineCourses", courseId));
      toast({ title: "Course Deleted", description: "The course and all its videos have been removed." });
    } catch (error) {
      console.error("Error deleting course:", error);
      toast({ title: "Delete Error", description: "Could not delete the course.", variant: "destructive" });
    }
  };

  const handleOpenVideoDialog = () => {
    setSelectedCourseId('');
    setVideoTitle('');
    setVideoUrl('');
    setIsVideoDialogOpen(true);
  };

  const handleSaveVideo = async () => {
    if (!selectedCourseId || !videoTitle.trim() || !videoUrl.trim()) {
      toast({ title: "Validation Error", description: "Please select a course and fill in all video fields.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);

    const courseRef = doc(db, "onlineCourses", selectedCourseId);
    try {
      const courseSnap = await getDoc(courseRef);
      if (courseSnap.exists()) {
        const courseData = courseSnap.data();
        const updatedVideos = [...(courseData.videos || []), { title: videoTitle, url: videoUrl }];
        await updateDoc(courseRef, {
          videos: updatedVideos,
          updatedAt: serverTimestamp(),
        });
        toast({ title: "Video Added", description: "The video has been successfully added to the course." });
        setIsVideoDialogOpen(false);
      } else {
        throw new Error("Course not found");
      }
    } catch (error) {
      console.error("Error adding video:", error);
      toast({ title: "Error", description: "Could not add the video to the course.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveVideo = async (courseId: string, videoIndex: number) => {
    const courseRef = doc(db, "onlineCourses", courseId);
    try {
        const courseSnap = await getDoc(courseRef);
        if (courseSnap.exists()) {
            const courseData = courseSnap.data();
            const updatedVideos = courseData.videos.filter((_: any, index: number) => index !== videoIndex);
            await updateDoc(courseRef, { videos: updatedVideos });
            toast({ title: "Video Removed", description: "The video has been removed from the course." });
        }
    } catch (error) {
        console.error("Error removing video:", error);
        toast({ title: "Error", description: "Could not remove the video.", variant: "destructive" });
    }
  };
  
  if (isLoading) {
    return (
      <div className="container mx-auto py-8 text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto" />
        <p>Loading Content Editor...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight flex items-center">
          <BookOpen className="mr-3 h-8 w-8 text-primary" /> Online Learning Center Content
        </h1>
        <p className="text-muted-foreground">Manage the courses and videos for the "Learn Online Business" page.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Course Management Section */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Manage Courses</CardTitle>
            <CardDescription>Create, edit, or delete entire courses.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {courses.length > 0 ? (
              <div className="space-y-3">
                {courses.map(course => (
                  <div key={course.id} className="flex justify-between items-center p-3 border rounded-lg bg-muted/50">
                    <div>
                      <p className="font-semibold">{course.title}</p>
                      <p className="text-xs text-muted-foreground">{course.videos.length} video(s)</p>
                    </div>
                    <div className="flex gap-2">
                       <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenCourseDialog(course)}>
                        <Edit className="h-4 w-4"/>
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDeleteCourse(course.id)}>
                        <Trash2 className="h-4 w-4"/>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No courses created yet. Add a course to begin.</p>
            )}
          </CardContent>
          <CardFooter>
             <Button onClick={() => handleOpenCourseDialog(null)} className="w-full">
              <PlusCircle className="mr-2 h-4 w-4" /> Add New Course
            </Button>
          </CardFooter>
        </Card>

        {/* Video Management Section */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Manage Videos</CardTitle>
            <CardDescription>Add new videos to your existing courses.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             <Alert variant="default" className="bg-blue-50 border-blue-200 text-blue-800">
                <Video className="h-5 w-5 !text-blue-600" />
                <AlertTitle className="font-semibold">YouTube Links Only</AlertTitle>
                <AlertDescription>
                    Please ensure all video URLs are valid links to YouTube videos.
                </AlertDescription>
            </Alert>
            <Button onClick={handleOpenVideoDialog} className="w-full" disabled={courses.length === 0}>
                <PlusCircle className="mr-2 h-4 w-4"/> Add New Video to a Course
            </Button>
             {courses.length === 0 && <p className="text-xs text-muted-foreground text-center">You must create a course before you can add a video.</p>}
          </CardContent>
           <CardFooter>
             <p className="text-xs text-muted-foreground">To remove a video, expand the course details below and click the delete icon next to the video.</p>
           </CardFooter>
        </Card>
      </div>

       <Card className="mt-8 shadow-lg">
        <CardHeader>
          <CardTitle>Course & Video Details</CardTitle>
          <CardDescription>Review and manage all videos within each course.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {courses.map((course) => (
            <Card key={`detail-${course.id}`} className="p-4 border-dashed relative group">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">{course.title}</h3>
                <p className="text-sm text-muted-foreground">{course.videos.length} video(s)</p>
              </div>
              <div className="space-y-4 pl-4 border-l-2">
                {course.videos && course.videos.length > 0 ? course.videos.map((video, videoIndex) => (
                  <div key={videoIndex} className="space-y-2 p-3 bg-muted/50 rounded-md">
                    <div className="flex justify-between items-center">
                      <p className="font-semibold text-sm text-muted-foreground">{video.title}</p>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleRemoveVideo(course.id, videoIndex)}>
                        <XCircle className="h-4 w-4 text-destructive/70" />
                      </Button>
                    </div>
                    <p className="text-xs text-blue-600 truncate">{video.url}</p>
                  </div>
                )) : (
                    <p className="text-sm text-muted-foreground p-3">No videos added to this course yet.</p>
                )}
              </div>
            </Card>
          ))}
        </CardContent>
      </Card>


      {/* Course Dialog */}
      <Dialog open={isCourseDialogOpen} onOpenChange={setIsCourseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCourse ? "Edit Course" : "Create New Course"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="course-title">Course Title</Label>
              <Input id="course-title" value={currentCourseTitle} onChange={(e) => setCurrentCourseTitle(e.target.value)} placeholder="e.g., Introduction to Digital Marketing"/>
            </div>
            <div className="space-y-2">
              <Label htmlFor="course-desc">Course Description</Label>
              <Textarea id="course-desc" value={currentCourseDescription} onChange={(e) => setCurrentCourseDescription(e.target.value)} placeholder="A brief description of what the course covers."/>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={handleSaveCourse} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4"/>}
              {isSubmitting ? "Saving..." : "Save Course"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Video Dialog */}
      <Dialog open={isVideoDialogOpen} onOpenChange={setIsVideoDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add a New Video</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
             <div className="space-y-2">
                <Label htmlFor="course-select">Select Course</Label>
                <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
                    <SelectTrigger id="course-select"><SelectValue placeholder="Choose a course..." /></SelectTrigger>
                    <SelectContent>
                        {courses.map(course => <SelectItem key={course.id} value={course.id}>{course.title}</SelectItem>)}
                    </SelectContent>
                </Select>
             </div>
             <div className="space-y-2">
                <Label htmlFor="video-title">Video Title</Label>
                <Input id="video-title" value={videoTitle} onChange={(e) => setVideoTitle(e.target.value)} placeholder="e.g., What is SEO?" />
             </div>
             <div className="space-y-2">
                <Label htmlFor="video-url">YouTube Video URL</Label>
                <Input id="video-url" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=..." />
             </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={handleSaveVideo} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4"/>}
              {isSubmitting ? "Adding..." : "Add Video"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
