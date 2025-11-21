"use client";

import React from 'react';

export function BreakingNewsTicker() {
  const newsText = "IRADA and LISTED Sign MoU to Empower Differently-Abled Entrepreneurs in Pakistan's Tech Ecosystem... This landmark partnership will provide accessible resources, mentorship, and funding opportunities, fostering inclusivity and innovation... IRADA's expertise in advocacy and LISTED's powerful network will create a launchpad for talented individuals to build and scale their ventures... ";
  return (
    <div className="bg-primary text-primary-foreground shadow-md flex items-center overflow-hidden h-10">
      <span className="flex-shrink-0 font-bold text-sm px-4 uppercase tracking-wider bg-red-600 h-full flex items-center z-10">
        BREAKING NEWS
      </span>
      <div className="flex-1 relative h-full flex items-center marquee-container">
        <div className="marquee-content">
            <span className="text-sm mx-12">{newsText}</span>
            <span className="text-sm mx-12">{newsText}</span>
        </div>
      </div>
    </div>
  );
}
