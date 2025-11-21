
import { MetadataRoute } from 'next';

const BASE_URL = 'https://www.listed.com.pk'; // Replace with your production domain

export default function sitemap(): MetadataRoute.Sitemap {
  // Static pages
  const staticRoutes = [
    '',
    '/about',
    '/success-stories',
    '/how-it-works',
    '/contact',
    '/terms',
    '/privacy',
    '/auth',
    '/offers',
    '/offers/my-ads',
    '/offers/my-sales',
    '/offers/find-investor',
    '/offers/co-founder',
    '/offers/business-model-directory',
  ].map((route) => ({
    url: `${BASE_URL}${route}`,
    lastModified: new Date().toISOString(),
    changeFrequency: 'monthly' as 'monthly',
    priority: route === '' ? 1.0 : 0.8,
  }));

  // Note: Dynamic routes fetching from Firestore has been temporarily removed 
  // to resolve a build error. This ensures the site builds successfully.

  return staticRoutes;
}
