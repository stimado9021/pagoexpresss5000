import 'server-only'
import { prisma } from '@/lib/prisma'
import type { Articulo } from '@prisma/client'

export type { Articulo }

export async function getPosts(): Promise<Articulo[]> {
  return prisma.articulo.findMany({ orderBy: { createdAt: 'desc' } })
}

export async function getPost(slug: string): Promise<Articulo | null> {
  return prisma.articulo.findUnique({ where: { slug } })
}

export function estimateReadMinutes(contenido: string): number {
  const words = contenido.trim().split(/\s+/).length
  return Math.max(1, Math.round(words / 200))
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}
