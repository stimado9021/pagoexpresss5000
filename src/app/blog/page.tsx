import type { Metadata } from 'next';
import Link from 'next/link';
import { POSTS } from '@/lib/blog';

export const metadata: Metadata = {
  title: 'Blog',
  description:
    'Guías prácticas sobre gestión de préstamos, cálculo de intereses, cobranza y control de mora para prestamistas y empresas de crédito en Colombia.',
  alternates: { canonical: '/blog' },
};

export default function BlogIndex() {
  return (
    <main className="bg-emerald-950 text-bone min-h-screen py-28 px-6">
      <div className="max-w-3xl mx-auto">
        <p className="font-mono text-xs uppercase text-lime">Blog</p>
        <h1 className="font-display font-bold text-4xl mt-3 mb-4">Guías para gestionar tu cartera</h1>
        <p className="text-bone/65 mb-12 leading-relaxed">
          Contenido práctico sobre cálculo de intereses, cobranza y control de mora, escrito para
          prestamistas y empresas de crédito.
        </p>

        <div className="space-y-6">
          {POSTS.map((post) => (
            <article
              key={post.slug}
              className="rounded-2xl border border-bone/10 bg-graphite-900 p-6 hover:border-lime/30 transition-colors"
            >
              <div className="flex items-center gap-3 font-mono text-xs text-bone/40 mb-3">
                <span className="text-lime">{post.category}</span>
                <span>·</span>
                <time dateTime={post.date}>{post.date}</time>
                <span>·</span>
                <span>{post.readMinutes} min</span>
              </div>
              <h2 className="font-display font-semibold text-xl mb-2">
                <Link href={`/blog/${post.slug}`} className="hover:text-lime transition-colors">
                  {post.title}
                </Link>
              </h2>
              <p className="text-bone/60 text-sm leading-relaxed">{post.description}</p>
            </article>
          ))}
        </div>

        <Link href="/" className="inline-block mt-12 text-lime hover:underline">
          ← Volver al inicio
        </Link>
      </div>
    </main>
  );
}
