
"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Zap, PlayCircle, Loader2, ArrowLeft } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { db } from '@/lib/firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import NextImage from 'next/image';
import Link from 'next/link';

interface MotivationVideo {
  id: string;
  url: string;
  thumbnail: string;
}

function getYoutubeVideoId(url: string): string | null {
  const regex = /(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

export default function MotivationPage() {
  const [motivationVideos, setMotivationVideos] = useState<MotivationVideo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentVideoUrl, setCurrentVideoUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchVideos = async () => {
      if (!db) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const docRef = doc(db, "siteContent", "motivationPageVideos");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const links = docSnap.data().youtubeLinks || [];
          const videos: MotivationVideo[] = links
            .map((url: string, index: number) => {
              const videoId = getYoutubeVideoId(url);
              if (videoId) {
                return {
                  id: videoId + index,
                  url: `https://www.youtube.com/embed/${videoId}?autoplay=1`,
                  thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
                };
              }
              return null;
            })
            .filter((v: MotivationVideo | null): v is MotivationVideo => v !== null); 
          setMotivationVideos(videos);
        }
      } catch (error) {
        console.error("Error fetching motivation videos:", error);
      }
      setIsLoading(false);
    };

    fetchVideos();
  }, []);
  
  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <Button variant="outline" asChild className="mb-4 print:hidden">
        <Link href="/home"><ArrowLeft className="mr-2 h-4 w-4" /> Back to User Portal</Link>
      </Button>

      <section className="mb-12 text-center">
        <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-foreground mb-4">Motivation & Inspiration</h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
          Fuel your entrepreneurial spirit with insights from leaders and real-world success stories.
        </p>
      </section>

      <section className="mb-12">
        <Card className="shadow-lg rounded-xl">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center">
              <Zap className="mr-3 h-6 w-6 text-primary" /> Must Watch Videos
            </CardTitle>
            <CardDescription>Handpicked videos to inspire and guide you on your journey.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center items-center h-48">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-2">Loading videos...</p>
              </div>
            ) : motivationVideos.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {motivationVideos.map((video) => (
                  <Card
                    key={video.id}
                    onClick={() => setCurrentVideoUrl(video.url)}
                    className="group cursor-pointer overflow-hidden rounded-lg shadow-md hover:shadow-xl transition-shadow"
                  >
                    <div className="relative aspect-video">
                      <NextImage
                        src={video.thumbnail}
                        alt="Video thumbnail"
                        layout="fill"
                        objectFit="cover"
                        className="transition-transform duration-300 group-hover:scale-105"
                        data-ai-hint="youtube thumbnail"
                      />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <PlayCircle className="h-16 w-16 text-white" />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-10">No motivational videos have been added by the admin yet.</p>
            )}
          </CardContent>
        </Card>
      </section>

      <Dialog open={!!currentVideoUrl} onOpenChange={(isOpen) => !isOpen && setCurrentVideoUrl(null)}>
        <DialogContent className="sm:max-w-3xl p-0 border-0">
          <DialogHeader className="p-4 pb-0 sr-only">
             <DialogTitle>Video Player</DialogTitle>
          </DialogHeader>
          <div className="aspect-video bg-black">
            {currentVideoUrl && (
              <iframe
                src={currentVideoUrl}
                title="YouTube video player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="w-full h-full"
              ></iframe>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
