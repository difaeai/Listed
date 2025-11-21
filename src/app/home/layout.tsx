"use client";

import SalesProfessionalLayout from '@/app/offers/layout';
import React from 'react';

// This layout file simply re-uses the main user dashboard layout for this page.
export default function HomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SalesProfessionalLayout>{children}</SalesProfessionalLayout>;
}
