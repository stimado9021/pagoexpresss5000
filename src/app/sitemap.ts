import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site'
import { POSTS } from '@/lib/blog'

const BASE_URL = SITE_URL

export default function sitemap(): MetadataRoute.Sitemap {
  const statics = [
    { path: '/', changeFrequency: 'weekly' as const, priority: 1 },
    { path: '/blog', changeFrequency: 'weekly' as const, priority: 0.8 },
    { path: '/terminos', changeFrequency: 'yearly' as const, priority: 0.3 },
    { path: '/politica-de-datos', changeFrequency: 'yearly' as const, priority: 0.3 },
  ]

  return [
    ...statics.map((route) => ({
      url: `${BASE_URL}${route.path}`,
      lastModified: new Date(),
      changeFrequency: route.changeFrequency,
      priority: route.priority,
    })),
    ...POSTS.map((post) => ({
      url: `${BASE_URL}/blog/${post.slug}`,
      lastModified: new Date(post.date),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
  ]
}
