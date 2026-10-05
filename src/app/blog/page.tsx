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
      <div className="relative py-24 px-6 text-center bg-gradient-to-b from-emerald-900/40 via-zinc-950 to-zinc-950 border-b border-lime/20">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 pointer-events-none"></div>
        <div className="relative max-w-4xl mx-auto">
          <div className="flex justify-center mb-10">
            <h2 className="text-5xl md:text-7xl font-display font-black text-white tracking-tighter uppercase italic">
              Kredi<span className="text-lime">tools</span>
            </h2>
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-lime/10 text-lime text-xs font-medium mb-6 border border-lime/20 animate-pulse">
            <BookOpen size={14} />
            <span className="uppercase tracking-widest">Centro de Conocimiento</span>
          </div>
          <h1 className="text-5xl md:text-8xl font-display font-bold text-white mb-8 leading-tight tracking-tight">
            Domina el arte de la <span className="text-transparent bg-clip-text bg-gradient-to-r from-lime-400 to-emerald-400">Gestión de Préstamos</span>
          </h1>
          <p className="text-zinc-400 text-xl mb-8 max-w-2xl mx-auto leading-relaxed">
            Estrategias reales para optimizar tu cartera, reducir la mora y escalar tu negocio financiero con la tecnología de Kreditools.
          </p>
        </div>
      </div>

      {/* Blog Grid */}
      <div className="max-w-7xl mx-auto px-6 py-20">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-zinc-800 border-t-lime" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
              {articulos.map((art: any) => (
                <article key={art.id} className="group flex flex-col rounded-3xl border border-zinc-800 bg-zinc-900/40 overflow-hidden hover:border-lime/50 transition-all duration-500 hover:shadow-2xl hover:shadow-lime/10 hover:-translate-y-2">
                  <div className="aspect-video w-full bg-zinc-800 relative overflow-hidden">
                    {art.imagenUrl ? (
                      <img src={art.imagenUrl} alt={art.titulo} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-900 text-zinc-700 font-display font-bold text-4xl uppercase italic">
                        Kreditools
                      </div>
                    )}
                    <div className="absolute top-4 right-4">
                      <span className="px-3 py-1 rounded-full bg-zinc-950/80 backdrop-blur-md text-lime text-[10px] font-bold uppercase tracking-tighter border border-lime/30">
                        Lectura Recomendada
                      </span>
                    </div>
                  </div>
                  <div className="p-8 flex flex-col flex-1">
                    <h3 className="text-2xl font-display font-bold text-white mb-4 group-hover:text-lime transition-colors leading-snug">
                      {art.titulo}
                    </h3>
                    <p className="text-zinc-400 text-sm leading-relaxed mb-8 flex-1">
                      {art.resumen}
                    </p>
                    <Link 
                      href={`/blog/${art.slug}`} 
                      className="inline-flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-zinc-800 text-lime text-sm font-bold hover:bg-lime hover:text-emerald-950 transition-all duration-300 group-hover:shadow-lg group-hover:shadow-lime/10"
                    >
                      Leer artículo completo <ArrowRight size={16} />
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
