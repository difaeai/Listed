
"use client";

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import type { Timestamp } from 'firebase/firestore';

interface CountdownTimerProps {
  expiryDate: string | Date | Timestamp; // ISO string, Date object, or Firestore Timestamp
  prefix?: string;
  onExpiry?: () => void;
  className?: string;
  displayMode?: 'full' | 'daysOnly';
}

export function CountdownTimer({ expiryDate, prefix = "Time left: ", onExpiry, className, displayMode = 'full' }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState('');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return; 

    const getTargetDate = (): Date => {
      if (expiryDate instanceof Date) {
        return expiryDate;
      }
      if (typeof expiryDate === 'string') {
        return new Date(expiryDate);
      }
      // Check if it's a Firestore Timestamp-like object (has toDate method)
      if (expiryDate && typeof (expiryDate as any).toDate === 'function') {
        return (expiryDate as Timestamp).toDate();
      }
      console.error("Invalid expiryDate prop passed to CountdownTimer:", expiryDate);
      return new Date(); // Fallback to now, effectively making it expired
    };
    
    const targetDate = getTargetDate();

    const calculateTimeLeft = () => {
      const difference = +targetDate - +new Date();
      let newTimeLeft = '';

      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((difference / 1000 / 60) % 60);
        const seconds = Math.floor((difference / 1000) % 60);

        if (displayMode === 'daysOnly') {
          if (days > 0) {
            newTimeLeft = `~${days} day${days > 1 ? 's' : ''} left`;
          } else if (hours > 0 || minutes > 0 || seconds > 0) {
            newTimeLeft = `Expires today`;
          } else {
            newTimeLeft = 'Expired';
          }
        } else { // full mode
          if (days > 0) {
            newTimeLeft = `${days}d ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
          } else if (hours > 0 || minutes > 0 || seconds > 0) {
            newTimeLeft = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
          } else {
            newTimeLeft = 'Expired';
          }
        }
      } else {
        newTimeLeft = 'Expired';
        if (onExpiry) {
          onExpiry();
        }
      }
      setTimeLeft(newTimeLeft);
    };

    calculateTimeLeft(); 
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [expiryDate, onExpiry, isMounted, displayMode]);

  if (!isMounted || !timeLeft) {
    return <span className={cn(className)}>{prefix}Calculating...</span>;
  }

  if (timeLeft === 'Expired') {
    return <span className={cn("text-destructive font-medium", className)}>{prefix}Expired</span>;
  }

  return <span className={cn(className)}>{prefix}{timeLeft}</span>;
}
