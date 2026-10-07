import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Calendar, Clock, Share2, User } from 'lucide-react';
import { getPosts, getPost, estimateReadMinutes, formatDate } from '@/lib/blog';
import { SITE_URL } from '@/lib/site';

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams(): Promise<Array<{ slug: string }>> {
  const posts = await getPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) {
    return { title: 'Artículo no encontrado' };
  }
  const url = `/blog/${post.slug}`;
  return {
    title: post.titulo,
    description: post.resumen ?? undefined,
    alternates: { canonical: url },
    openGraph: {
      type: 'article',
      url,
      siteName: 'Kreditools',
      title: post.titulo,
      description: post.resumen ?? undefined,
      publishedTime: post.createdAt.toISOString(),
      authors: ['Kreditools'],
      images: post.imagenUrl ? [post.imagenUrl] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: post.titulo,
      description: post.resumen ?? undefined,
    },
  };
}

export const dynamic = 'force-dynamic';

export default async function BlogDetailPage({ params }: Props) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();

  const url = `${SITE_URL}/blog/${post.slug}`;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.titulo,
    description: post.resumen,
    datePublished: post.createdAt.toISOString(),
    inLanguage: 'es-CO',
    author: { '@type': 'Organization', name: 'Kreditools', url: `${SITE_URL}/` },
    publisher: {
      '@type': 'Organization',
      name: 'Kreditools',
      url: `${SITE_URL}/`,
      logo: { '@type': 'ImageObject', url: `${SITE_URL}/kreditools.jpg` },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    image: post.imagenUrl ?? undefined,
  };

  const paragraphs = post.contenido
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

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
          <h1 className="text-4xl md:text-5xl font-display font-bold text-white mb-6 leading-tight">
            {post.titulo}
          </h1>
          <p className="text-zinc-400 text-lg leading-relaxed mb-6">{post.resumen}</p>
          <div className="flex items-center gap-6 text-sm text-zinc-500">
            <span className="inline-flex items-center gap-2">
              <Calendar size={16} />
              {formatDate(post.createdAt)}
            </span>
            <span className="inline-flex items-center gap-2">
              <Clock size={16} />
              {estimateReadMinutes(post.contenido)} min de lectura
            </span>
            <span className="inline-flex items-center gap-2">
              <User size={16} />
              <span>Equipo Kreditools</span>
            </span>
          </div>
        </header>

        {post.imagenUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.imagenUrl}
            alt={post.titulo}
            className="w-full aspect-video object-cover rounded-3xl mb-12"
          />
        ) : null}

        {paragraphs.map((p, i) => (
          <p key={i} className="text-zinc-300 text-lg leading-relaxed mb-6 whitespace-pre-line">
            {p}
          </p>
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
