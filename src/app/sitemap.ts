import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site'

const BASE_URL = SITE_URL

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${BASE_URL}/`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 1,
    },
  ]
}
