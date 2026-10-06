import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, BookOpen, Calendar, Clock } from 'lucide-react';
import { POSTS } from '@/lib/blog';

export const metadata: Metadata = {
  title: 'Blog: gestión de préstamos, cobranza y cartera',
  description:
    'Guías prácticas para prestamistas y empresas de crédito: calcular intereses, reducir la mora, cobrar a tiempo y dejar Excel sin perder el control.',
  alternates: { canonical: '/blog' },
};

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-body">
      {/* Hero Section */}
      <div className="relative py-24 px-6 text-center bg-gradient-to-b from-emerald-900/40 via-zinc-950 to-zinc-950 border-b border-lime/20">
        <div className="relative max-w-4xl mx-auto">
          <div className="flex justify-center mb-10">
            <p className="text-5xl md:text-7xl font-display font-black text-white tracking-tighter uppercase italic">
              Kredi<span className="text-lime">tools</span>
            </p>
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-lime/10 text-lime text-xs font-medium mb-6 border border-lime/20">
            <BookOpen size={14} />
            <span className="uppercase tracking-widest">Centro de Conocimiento</span>
          </div>
          <h1 className="text-5xl md:text-8xl font-display font-bold text-white mb-8 leading-tight tracking-tight">
            Domina el arte de la{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-lime-400 to-emerald-400">
              Gestión de Préstamos
            </span>
          </h1>
          <p className="text-zinc-400 text-xl mb-8 max-w-2xl mx-auto leading-relaxed">
            Estrategias reales para optimizar tu cartera, reducir la mora y escalar tu negocio financiero con la tecnología de Kreditools.
          </p>
        </div>
      </div>

      {/* Blog Grid */}
      <div className="max-w-7xl mx-auto px-6 py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {POSTS.map((post) => (
            <article
              key={post.slug}
              className="group flex flex-col rounded-3xl border border-zinc-800 bg-zinc-900/40 overflow-hidden hover:border-lime/50 transition-all duration-500 hover:shadow-2xl hover:shadow-lime/10 hover:-translate-y-2"
            >
              <div className="aspect-video w-full bg-zinc-800 relative overflow-hidden">
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-900 text-zinc-700 font-display font-bold text-4xl uppercase italic">
                  Kreditools
                </div>
                <div className="absolute top-4 right-4">
                  <span className="px-3 py-1 rounded-full bg-zinc-950/80 backdrop-blur-md text-lime text-[10px] font-bold uppercase tracking-tighter border border-lime/30">
                    {post.category}
                  </span>
                </div>
              </div>
              <div className="p-8 flex flex-col flex-1">
                <div className="flex items-center gap-4 text-xs text-zinc-500 mb-4">
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar size={14} /> {formatDate(post.date)}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Clock size={14} /> {post.readMinutes} min
                  </span>
                </div>
                <h2 className="text-2xl font-display font-bold text-white mb-4 group-hover:text-lime transition-colors leading-snug">
                  {post.title}
                </h2>
                <p className="text-zinc-400 text-sm leading-relaxed mb-8 flex-1">
                  {post.description}
                </p>
                <Link
                  href={`/blog/${post.slug}`}
                  className="inline-flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-zinc-800 text-lime text-sm font-bold hover:bg-lime hover:text-emerald-950 transition-all duration-300 group-hover:shadow-lg group-hover:shadow-lime/10"
                >
                  Leer artículo completo <ArrowRight size={16} />
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
