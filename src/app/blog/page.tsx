'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, BookOpen, ArrowRight } from 'lucide-react'

export default function BlogPage() {
  const [articulos, setArticulos] = useState([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchArticles() {
      setLoading(true)
      try {
        const res = await fetch(`/api/blog?page=${page}`)
        const data = await res.json()
        if (data.success) {
          setArticulos(data.data)
          setTotalPages(data.pagination.totalPages)
        }
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    fetchArticles()
  }, [page])

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-body">
      {/* Hero Section */}
      <div className="relative py-20 px-6 text-center bg-gradient-to-b from-emerald-900/20 to-zinc-950 border-b border-zinc-800">
        <div className="max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-lime/10 text-lime text-xs font-medium mb-6 border border-lime/20">
            <BookOpen size={14} />
            <span>Centro de Conocimiento Kreditools</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-display font-bold text-white mb-6 leading-tight">
            Domina el arte de la <span className="text-lime">Gestión de Préstamos</span>
          </h1>
          <p className="text-zinc-400 text-lg mb-8">
            Consejos, estrategias y guías para optimizar tu cartera de créditos y escalar tu negocio financiero con tecnología de vanguardia.
          </p>
        </div>
      </div>

      {/* Blog Grid */}
      <div className="max-w-7xl mx-auto px-6 py-16">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-800 border-t-lime" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {articulos.map((art: any) => (
                <article key={art.id} className="group flex flex-col rounded-2xl border border-zinc-800 bg-zinc-900/50 overflow-hidden hover:border-lime/50 transition-all duration-300 hover:-translate-y-1">
                  <div className="aspect-video w-full bg-zinc-800 relative overflow-hidden">
                    {art.imagenUrl ? (
                      <img src={art.imagenUrl} alt={art.titulo} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-700 font-display font-bold text-4xl uppercase italic">
                        Kreditools Blog
                      </div>
                    )}
                  </div>
                  <div className="p-6 flex flex-col flex-1">
                    <h3 className="text-xl font-display font-bold text-white mb-3 group-hover:text-lime transition-colors">
                      {art.titulo}
                    </h3>
                    <p className="text-zinc-400 text-sm line-clamp-3 mb-6 flex-1">
                      {art.resumen}
                    </p>
                    <Link 
                      href={`/blog/${art.slug}`} 
                      className="inline-flex items-center gap-2 text-lime text-sm font-semibold hover:gap-3 transition-all"
                    >
                      Leer más <ArrowRight size={16} />
                    </Link>
                  </div>
                </article>
              ))}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-center gap-4 mt-16">
              <button 
                disabled={page === 1} 
                onClick={() => setPage(p => p - 1)}
                className="p-2 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white disabled:opacity-30 transition-colors"
              >
                <ChevronLeft size={20} />
              </button>
              
              <div className="flex items-center gap-2 text-sm font-medium">
                <span className="text-zinc-500">Página</span>
                <span className="text-white bg-lime/20 px-2 py-1 rounded-md text-lime">{page}</span>
                <span className="text-zinc-500">de {totalPages}</span>
              </div>

              <button 
                disabled={page === totalPages} 
                onClick={() => setPage(p => p + 1)}
                className="p-2 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white disabled:opacity-30 transition-colors"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
