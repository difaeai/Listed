
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, Image as ImageIcon } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import Link from 'next/link';

export interface HomeSlide {
  imageUrl: string;
  heading: string;
  subheading: string;
  ctaText: string;
  ctaLink: string;
}

interface HomeCarouselProps {
  slides: HomeSlide[];
}

const variants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 1000 : -1000,
    opacity: 0,
  }),
  center: {
    zIndex: 1,
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    zIndex: 0,
    x: direction < 0 ? 1000 : -1000,
    opacity: 0,
  }),
};

export function HomeCarousel({ slides }: HomeCarouselProps) {
  const [[page, direction], setPage] = useState([0, 0]);

  const paginate = useCallback((newDirection: number) => {
    setPage(([prevPage]) => [(prevPage + newDirection + slides.length) % slides.length, newDirection]);
  }, [slides.length]);

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => {
      paginate(1);
    }, 5000);
    return () => clearInterval(timer);
  }, [slides.length, paginate]);

  if (!slides || slides.length === 0) {
    return (
      <div className="absolute inset-0 bg-muted flex flex-col items-center justify-center text-center">
        <ImageIcon className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <p className="text-muted-foreground font-semibold">No slides available for preview.</p>
        <p className="text-xs text-muted-foreground">Add slides with images and headings in the section above.</p>
      </div>
    );
  }

  const slideIndex = ((page % slides.length) + slides.length) % slides.length;

  return (
    <div className="relative w-full h-full overflow-hidden rounded-lg">
      <AnimatePresence initial={false} custom={direction}>
        <motion.div
          key={page}
          className="absolute inset-0 w-full h-full bg-cover bg-center"
          style={{ backgroundImage: `url(${slides[slideIndex].imageUrl})` }}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{
            x: { type: 'spring', stiffness: 300, damping: 30 },
            opacity: { duration: 0.3 },
          }}
        >
          {/* Gradient Overlay for Text Legibility */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-black/10" />

          {/* Content inside the slide */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-white p-4">
            <motion.h1
              className="text-4xl md:text-6xl font-extrabold drop-shadow-2xl"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.6, ease: "easeOut" }}
            >
              {slides[slideIndex].heading}
            </motion.h1>
            <motion.p
              className="mt-4 text-lg md:text-xl max-w-3xl drop-shadow-lg"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.6, ease: "easeOut" }}
            >
              {slides[slideIndex].subheading}
            </motion.p>
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.7, duration: 0.6, ease: "easeOut" }}
              className="mt-8"
            >
              {slides[slideIndex].ctaLink && slides[slideIndex].ctaText && (
                <Button size="xl" asChild className="bg-primary hover:bg-primary/90 text-primary-foreground text-lg px-10 py-4 font-semibold shadow-lg transform hover:scale-105 transition-transform duration-300">
                  <Link href={slides[slideIndex].ctaLink}>
                    {slides[slideIndex].ctaText} <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
              )}
            </motion.div>
          </div>
        </motion.div>
      </AnimatePresence>

      {slides.length > 1 && (
        <>
          <div className="absolute z-10 top-1/2 -translate-y-1/2 left-4">
            <Button size="icon" variant="secondary" className="rounded-full h-10 w-10 opacity-70 hover:opacity-100 transition-opacity bg-white/20 hover:bg-white/40 text-white" onClick={() => paginate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </div>
          <div className="absolute z-10 top-1/2 -translate-y-1/2 right-4">
            <Button size="icon" variant="secondary" className="rounded-full h-10 w-10 opacity-70 hover:opacity-100 transition-opacity bg-white/20 hover:bg-white/40 text-white" onClick={() => paginate(1)}>
              <ArrowRight className="h-5 w-5" />
            </Button>
          </div>
          <div className="absolute z-10 bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setPage([i, i > slideIndex ? 1 : -1])}
                className="w-8 h-1 rounded-full cursor-pointer transition-all duration-300"
                style={{ backgroundColor: i === slideIndex ? 'hsl(var(--primary))' : 'rgba(255, 255, 255, 0.5)'}}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
