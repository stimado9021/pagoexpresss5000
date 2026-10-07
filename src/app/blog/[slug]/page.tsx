import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Calendar, Clock, Share2, User } from 'lucide-react';
import { POSTS, getPost } from '@/lib/blog';
import { SITE_URL } from '@/lib/site';

type Props = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams(): Array<{ slug: string }> {
  return POSTS.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) {
    return { title: 'Artículo no encontrado' };
  }
  const url = `/blog/${post.slug}`;
  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: url },
    openGraph: {
      type: 'article',
      url,
      siteName: 'Kreditools',
      title: post.title,
      description: post.description,
      publishedTime: post.date,
      authors: ['Kreditools'],
      images: [post.image],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.description,
    },
  };
}

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default async function BlogDetailPage({ params }: Props) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  const url = `${SITE_URL}/blog/${post.slug}`;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    inLanguage: 'es-CO',
    author: { '@type': 'Organization', name: 'Kreditools', url: `${SITE_URL}/` },
    publisher: {
      '@type': 'Organization',
      name: 'Kreditools',
      url: `${SITE_URL}/`,
      logo: { '@type': 'ImageObject', url: `${SITE_URL}/kreditools.jpg` },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    image: post.image,
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-body">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
        }}
      />
      {/* Navbar simple */}
      <nav className="border-b border-zinc-800 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={16} /> Volver al Blog
          </Link>
          <span className="p-2 rounded-full bg-zinc-900 text-zinc-400">
            <Share2 size={18} />
          </span>
        </div>
      </nav>

      <article className="max-w-3xl mx-auto px-6 py-16">
        <header className="mb-12">
          <p className="inline-block px-3 py-1 rounded-full bg-lime/10 text-lime text-xs font-bold uppercase tracking-widest border border-lime/20 mb-6">
            {post.category}
          </p>
          <h1 className="text-4xl md:text-5xl font-display font-bold text-white mb-6 leading-tight">
            {post.title}
          </h1>
          <p className="text-zinc-400 text-lg leading-relaxed mb-6">{post.description}</p>
          <div className="flex items-center gap-6 text-sm text-zinc-500">
            <span className="inline-flex items-center gap-2">
              <Calendar size={16} />
              {formatDate(post.date)}
            </span>
            <span className="inline-flex items-center gap-2">
              <Clock size={16} />
              {post.readMinutes} min de lectura
            </span>
            <span className="inline-flex items-center gap-2">
              <User size={16} />
              <span>Equipo Kreditools</span>
            </span>
          </div>
        </header>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={post.image}
          alt={post.title}
          className="w-full aspect-video object-cover rounded-3xl mb-12"
        />

        {post.content.map((section, i) => (
          <section key={i} className="mb-10">
            {section.heading ? (
              <h2 className="text-2xl md:text-3xl font-display font-bold text-white mb-5 leading-snug">
                {section.heading}
              </h2>
            ) : null}
            {section.paragraphs.map((p, j) => (
              <p key={j} className="text-zinc-300 text-lg leading-relaxed mb-6">
                {p}
              </p>
            ))}
            {section.list ? (
              <ul className="space-y-3 mb-6">
                {section.list.map((item, k) => (
                  <li key={k} className="flex gap-3 text-zinc-300 text-lg leading-relaxed">
                    <span className="mt-2.5 h-2 w-2 shrink-0 rounded-full bg-lime" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            ) : null}
            {section.table ? (
              <div className="overflow-x-auto rounded-2xl border border-zinc-800 mb-6">
                <table className="w-full text-left text-zinc-300">
                  <thead>
                    <tr className="bg-zinc-900">
                      {section.table.head.map((h, k) => (
                        <th key={k} className="px-5 py-3 text-sm font-bold uppercase tracking-wide text-lime">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {section.table.rows.map((row, k) => (
                      <tr key={k} className="border-t border-zinc-800">
                        {row.map((cell, c) => (
                          <td key={c} className="px-5 py-3 text-sm leading-relaxed">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </section>
        ))}

        {/* CTA Section */}
        <div className="mt-20 p-8 rounded-3xl bg-gradient-to-br from-emerald-900/40 to-zinc-900 border border-lime/30 text-center">
          <h2 className="text-2xl font-display font-bold text-white mb-4">
            ¿Listo para profesionalizar tu cartera de créditos?
          </h2>
          <p className="text-zinc-400 mb-8">
            Deja de usar cuadernos o Excels complicados. Únete a las empresas que ya escalan sus cobros con Kreditools.
          </p>
          <Link
            href="/#registro"
            className="inline-block bg-lime text-emerald-950 font-bold px-8 py-4 rounded-full hover:bg-lime/90 transition-all transform hover:scale-105 shadow-lg shadow-lime/20"
          >
            Empieza tu prueba gratis ahora
          </Link>
        </div>
      </article>
    </div>
  );
}
