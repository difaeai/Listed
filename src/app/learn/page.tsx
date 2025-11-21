"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlayCircle, Loader2, BookOpen, Filter, Lock, SkipForward, CheckCircle as CheckCircleIcon, ArrowLeft, Check, X } from 'lucide-react';
import { db } from '@/lib/firebaseConfig';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import NextImage from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import type { OnlineCourse, VideoContent } from '@/app/admin/online-learning-content/page';


function getYoutubeVideoId(url: string): string | null {
  const regex = /(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

function getYoutubeThumbnailUrl(videoId: string): string {
    return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

// --- Local Storage Hook for Progress ---
function useCourseProgress(courseId: string) {
    const [completedVideos, setCompletedVideos] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const storedProgress = localStorage.getItem(`course_progress_${courseId}`);
            if (storedProgress) {
                setCompletedVideos(new Set(JSON.parse(storedProgress)));
            }
        }
    }, [courseId]);

    const toggleVideoCompletion = (videoUrl: string) => {
        setCompletedVideos(prev => {
            const newSet = new Set(prev);
            if (newSet.has(videoUrl)) {
                newSet.delete(videoUrl);
            } else {
                newSet.add(videoUrl);
            }
            if (typeof window !== 'undefined') {
                localStorage.setItem(`course_progress_${courseId}`, JSON.stringify(Array.from(newSet)));
            }
            return newSet;
        });
    };
    
    return { completedVideos, toggleVideoCompletion };
}


function CoursePlayer({ course, onBack }: { course: OnlineCourse; onBack: () => void; }) {
    const [currentVideo, setCurrentVideo] = useState<VideoContent | null>(course.videos?.[0] || null);
    const [isVideoPlayerOpen, setIsVideoPlayerOpen] = useState(false);
    const { completedVideos, toggleVideoCompletion } = useCourseProgress(course.id);

    const currentIndex = useMemo(() => {
        if (!currentVideo) return -1;
        return course.videos.findIndex(v => v.url === currentVideo.url);
    }, [currentVideo, course.videos]);

    const nextVideo = useMemo(() => {
        if (currentIndex === -1 || currentIndex >= course.videos.length - 1) return null;
        return course.videos[currentIndex + 1];
    }, [currentIndex, course.videos]);
    
    const nextVideoId = nextVideo ? getYoutubeVideoId(nextVideo.url) : null;

    const handleVideoSelect = (video: VideoContent) => {
        setCurrentVideo(video);
    };
    
    const playNextVideo = () => {
        if (nextVideo) {
            setCurrentVideo(nextVideo);
        } else {
            setIsVideoPlayerOpen(false);
        }
    };

    const handlePlayMainVideo = () => {
        if (currentVideo) {
            setIsVideoPlayerOpen(true);
        }
    };

    const MainVideoPlayer = () => {
        if (!currentVideo) {
            return (
                <div className="aspect-video w-full bg-muted rounded-2xl flex items-center justify-center">
                    <p className="text-muted-foreground">No videos in this course yet.</p>
                </div>
            );
        }
        const videoId = getYoutubeVideoId(currentVideo.url);
        if (!videoId) {
            return (
                <div className="aspect-video w-full bg-muted rounded-2xl flex items-center justify-center">
                    <p className="text-destructive">Invalid video URL</p>
                </div>
            );
        }
        return (
            <div className="aspect-video w-full rounded-2xl border bg-black shadow-2xl overflow-hidden relative group cursor-pointer" onClick={handlePlayMainVideo}>
                <NextImage
                    src={getYoutubeThumbnailUrl(videoId)}
                    alt={currentVideo.title}
                    layout="fill"
                    objectFit="cover"
                    className="opacity-80 group-hover:opacity-100 transition-opacity"
                    data-ai-hint="video player thumbnail"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-center justify-center">
                    <PlayCircle className="h-20 w-20 text-white/80 group-hover:text-white transition-all transform group-hover:scale-110" />
                </div>
                <div className="absolute bottom-4 left-4 right-4">
                    <h3 className="text-white text-xl font-bold drop-shadow-md">{currentVideo.title}</h3>
                </div>
            </div>
        );
    };

    return (
        <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
                 <Button variant="outline" onClick={onBack} className="mb-4">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to All Courses
                </Button>
                <Card className="shadow-xl rounded-2xl overflow-hidden border-2">
                    <CardHeader>
                        <CardTitle className="text-3xl font-bold">{course.title}</CardTitle>
                        <CardDescription>{course.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-2 space-y-6">
                                <MainVideoPlayer />
                            </div>
                            <div className="lg:col-span-1">
                                <Card className="shadow-inner h-full bg-muted/50">
                                    <CardHeader className="pt-4 pb-2">
                                        <CardTitle className="text-lg">Course Playlist</CardTitle>
                                        <CardDescription>{course.videos.length} lessons</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <ScrollArea className="h-[400px] pr-3">
                                            <div className="space-y-3">
                                                {course.videos.map((video, index) => {
                                                    const videoId = getYoutubeVideoId(video.url);
                                                    if (!videoId) return null;
                                                    const isTeaser = index === 0;
                                                    const isLocked = index > 0;
                                                    const isPlaying = video.url === currentVideo?.url;
                                                    const isCompleted = completedVideos.has(video.url);

                                                    return (
                                                        <div
                                                            key={index}
                                                            onClick={() => !isLocked && handleVideoSelect(video)}
                                                            className={cn(
                                                                "group flex items-center gap-4 p-2 rounded-lg transition-all",
                                                                isLocked ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:bg-background",
                                                                isPlaying && "bg-primary/10"
                                                            )}
                                                        >
                                                            <div className="relative flex-shrink-0 w-28 h-16 rounded-md overflow-hidden border shadow-sm">
                                                                <NextImage
                                                                    src={getYoutubeThumbnailUrl(videoId)}
                                                                    alt={video.title}
                                                                    layout="fill"
                                                                    objectFit="cover"
                                                                    data-ai-hint="lesson thumbnail"
                                                                />
                                                                <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                                                                    {isLocked ? <Lock className="h-5 w-5 text-white/80" /> : <PlayCircle className="h-6 w-6 text-white/80" />}
                                                                </div>
                                                            </div>
                                                            <div className="flex-1">
                                                                <h4 className="font-semibold text-sm leading-snug line-clamp-2">{video.title}</h4>
                                                                <div className="flex items-center gap-2 mt-1">
                                                                    {isTeaser && <Badge variant="secondary" className="mt-1 text-xs">Teaser</Badge>}
                                                                    <Button 
                                                                        variant={isCompleted ? "secondary" : "outline"} 
                                                                        size="xs" 
                                                                        className="h-6 text-xs px-2" 
                                                                        onClick={(e) => { e.stopPropagation(); toggleVideoCompletion(video.url); }}
                                                                    >
                                                                        {isCompleted ? <Check className="h-3 w-3 mr-1"/> : null}
                                                                        {isCompleted ? "Completed" : "Mark as Done"}
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </ScrollArea>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>

            <Dialog open={isVideoPlayerOpen} onOpenChange={setIsVideoPlayerOpen}>
                 <DialogContent className="sm:max-w-3xl p-0 border-0 bg-black">
                    <DialogHeader className="p-4 pb-0">
                        <DialogTitle className="text-white text-lg truncate">{currentVideo?.title}</DialogTitle>
                    </DialogHeader>
                    <div className="aspect-video">
                        {currentVideo && (
                            <iframe
                                key={currentVideo.url}
                                src={`https://www.youtube.com/embed/${getYoutubeVideoId(currentVideo.url)}?autoplay=1&modestbranding=1&rel=0&enablejsapi=1`}
                                title="YouTube video player"
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                allowFullScreen
                                className="w-full h-full"
                            ></iframe>
                        )}
                    </div>
                    {nextVideo && nextVideoId ? (
                        <div 
                            className="bg-gray-900/80 p-3 hover:bg-gray-800 transition-colors cursor-pointer"
                            onClick={playNextVideo}
                        >
                            <div className="flex items-center gap-4">
                                <div className="relative w-24 h-14 rounded overflow-hidden flex-shrink-0">
                                    <NextImage src={getYoutubeThumbnailUrl(nextVideoId)} layout="fill" objectFit="cover" alt={`Next: ${nextVideo.title}`} />
                                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                                        <SkipForward className="h-6 w-6 text-white" />
                                    </div>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground font-semibold">UP NEXT</p>
                                    <p className="text-white font-medium line-clamp-2">{nextVideo.title}</p>
                                </div>
                            </div>
                        </div>
                    ) : (
                         <div className="bg-gray-900/80 p-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                                <CheckCircleIcon className="h-5 w-5 text-green-500"/>
                                <p className="text-white font-semibold">Course Complete!</p>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}

export default function LearnOnlineBusinessPage() {
  const [courses, setCourses] = useState<OnlineCourse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState<OnlineCourse | null>(null);
  const [courseFilter, setCourseFilter] = useState<string>('all');

  useEffect(() => {
    const fetchContent = async () => {
      if (!db) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      
      const coursesQuery = query(collection(db, "onlineCourses"), orderBy("createdAt", "asc"));
      const unsubscribe = onSnapshot(coursesQuery, (snapshot) => {
        const fetchedCourses: OnlineCourse[] = [];
        snapshot.forEach(doc => {
            fetchedCourses.push({ id: doc.id, ...doc.data() } as OnlineCourse);
        });
        setCourses(fetchedCourses);
        setIsLoading(false);
      }, (error) => {
        console.error("Error fetching online courses:", error);
        setIsLoading(false);
      });

      return () => unsubscribe();
    };

    fetchContent();
  }, []);

  const filteredCourses = useMemo(() => {
    if (courseFilter === 'all') {
      return courses;
    }
    return courses.filter(course => course.id === courseFilter);
  }, [courses, courseFilter]);
  
  if (isLoading) {
    return (
      <div className="container mx-auto py-8 text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto" />
        <p>Loading Courses...</p>
      </div>
    );
  }

  if (selectedCourse) {
      return <CoursePlayer course={selectedCourse} onBack={() => setSelectedCourse(null)} />
  }

  return (
    <>
      <section className="mb-12 text-center">
        <div className="inline-block p-4 bg-primary/10 rounded-full mb-4">
            <BookOpen className="h-12 w-12 text-primary" />
        </div>
        <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-foreground mb-4">Learn Online Business</h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
          Your expert-led guide to building and scaling a successful online venture, from concept to launch.
        </p>
      </section>

      <section className="mb-8">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8 max-w-md mx-auto">
            <Label htmlFor="course-filter" className="text-muted-foreground font-semibold">I'm interested in...</Label>
            <Select onValueChange={setCourseFilter} defaultValue="all">
                <SelectTrigger id="course-filter" className="w-full sm:w-[250px]">
                    <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4"/>
                        <SelectValue placeholder="Filter by course..." />
                    </div>
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Courses</SelectItem>
                    {courses.map(course => (
                        <SelectItem key={course.id} value={course.id}>{course.title}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
      </section>

      <div className="space-y-12">
       {filteredCourses.length > 0 ? (
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {filteredCourses.map(course => {
                const firstVideo = course.videos?.[0];
                const firstVideoId = firstVideo ? getYoutubeVideoId(firstVideo.url) : null;
                
                return (
                    <Card key={course.id} className="group flex flex-col cursor-pointer shadow-lg hover:shadow-2xl transition-shadow rounded-2xl overflow-hidden" onClick={() => setSelectedCourse(course)}>
                         <CardHeader className="p-0">
                            <div className="relative aspect-video w-full">
                                {firstVideoId ? (
                                    <NextImage src={getYoutubeThumbnailUrl(firstVideoId)} layout="fill" objectFit="cover" alt={course.title} data-ai-hint="course teaser thumbnail"/>
                                ) : (
                                    <div className="w-full h-full bg-muted flex items-center justify-center"><BookOpen className="h-12 w-12 text-muted-foreground/30"/></div>
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <PlayCircle className="h-16 w-16 text-white"/>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-4 flex-grow">
                             <CardTitle className="text-lg font-bold line-clamp-2">{course.title}</CardTitle>
                             <CardDescription className="text-sm mt-1 line-clamp-3">{course.description}</CardDescription>
                        </CardContent>
                        <CardFooter className="p-4 border-t bg-muted/30">
                            <p className="text-xs font-semibold text-primary">{course.videos?.length || 0} Lessons</p>
                        </CardFooter>
                    </Card>
                )
             })}
           </div>
       ) : (
        <div className="text-center text-muted-foreground py-16">
            <h2 className="text-2xl font-semibold">Course Content Coming Soon!</h2>
            <p>Our team is busy preparing valuable content. Please check back later.</p>
        </div>
      )}
      </div>
    </>
  );
}
