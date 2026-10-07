import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site'
import { getPosts } from '@/lib/blog'

const BASE_URL = SITE_URL

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await getPosts()
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
    ...posts.map((post) => ({
      url: `${BASE_URL}/blog/${post.slug}`,
      lastModified: post.updatedAt,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
  ]
}
