'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Calendar, User, Share2 } from 'lucide-react'

export default function BlogDetailPage({ params }: { params: { slug: string } }) {
  const [articulo, setArticulo] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function fetchArticle() {
      try {
        const res = await fetch(`/api/blog/${params.slug}`)
        const data = await res.json()
        if (data.success) setArticulo(data.data)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    fetchArticle()
  }, [params.slug])

  if (loading) return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-800 border-t-lime" />
    </div>
  )

  if (!articulo) return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-white">
      <p>Artículo no encontrado</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-body">
      {/* Navbar simple */}
      <nav className="border-b border-zinc-800 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button onClick={() => router.push('/blog')} className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors">
            <ArrowLeft size={16} /> Volver al Blog
          </button>
          <button className="p-2 rounded-full bg-zinc-900 text-zinc-400 hover:text-white transition-colors">
            <Share2 size={18} />
          </button>
        </div>
      </nav>

      <article className="max-w-3xl mx-auto px-6 py-16">
        <header className="mb-12">
          <h1 className="text-4xl md:text-5xl font-display font-bold text-white mb-6 leading-tight">
            {articulo.titulo}
          </h1>
          <div className="flex items-center gap-6 text-sm text-zinc-500">
            <div className="flex items-center gap-2">
              <Calendar size={16} />
              {new Date(articulo.createdAt).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
            <div className="flex items-center gap-2">
              <User size={16} />
              <span>Equipo Kreditools</span>
            </div>
          </div>
        </header>

        <div className="aspect-video w-full rounded-3xl bg-zinc-900 overflow-hidden mb-12 border border-zinc-800">
          {articulo.imagenUrl ? (
            <img src={articulo.imagenUrl} alt={articulo.titulo} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-zinc-800 font-display font-bold text-4xl uppercase italic">
              Kreditools Blog
            </div>
          )}
        </div>

        <div className="prose prose-invert max-w-none">
          {articulo.contenido.split('\n').map((p, i) => (
            <p key={i} className="text-zinc-300 text-lg leading-relaxed mb-6">
              {p}
            </p>
          ))}
        </div>

        {/* CTA Section */}
        <div className="mt-20 p-8 rounded-3xl bg-gradient-to-br from-emerald-900/40 to-zinc-900 border border-lime/30 text-center">
          <h2 className="text-2xl font-display font-bold text-white mb-4">
            ¿Listo para profesionalizar tu cartera de créditos?
          </h2>
          <p className="text-zinc-400 mb-8">
            Deja de usar cuadernos o Excels complicados. Únete a las empresas que ya escalan sus cobros con Kreditools.
          </p>
          <Link 
            href="/register" 
            className="inline-block bg-lime text-emerald-950 font-bold px-8 py-4 rounded-full hover:bg-lime/90 transition-all transform hover:scale-105 shadow-lg shadow-lime/20"
          >
            Empieza tu prueba gratis ahora
          </Link>
        </div>
      </article>
    </div>
  )
}
