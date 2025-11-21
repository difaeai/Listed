"use client";

import React from 'react';
import { cn } from '@/lib/utils';

export function NewsTicker() {
  const newsText = "Angels and Institutional Investors don’t just look at your idea—they look at your commitment. Being on a Monthly plan signals that you’re still not sure enough about your future, while a Yearly subscription instantly sets you apart as a serious, investment-ready founder. On LISTED, we’ve intentionally kept Yearly slots limited to maintain a high-quality network of startups that investors can trust and fund. The risk is on the investors, not on you—your only challenge is to trust your dream and execute it with conviction. Every successful founder knows that one decisive step can change everything—and this is yours. Upgrading to Yearly is not just an upgrade; it’s a declaration that you’re here to build, scale, and make business";
  return (
    <div className="bg-primary text-primary-foreground shadow-md flex items-center overflow-hidden h-10">
      <span className="flex-shrink-0 font-bold text-sm px-4 uppercase tracking-wider bg-red-600 h-full flex items-center z-10">
        IMPORTANT
      </span>
      <div className="flex-1 relative h-full flex items-center marquee-container no-mask">
        <div className="marquee-content">
            <span className="text-sm mx-12">{newsText}</span>
            <span className="text-sm mx-12">{newsText}</span>
        </div>
      </div>
    </div>
  );
}
