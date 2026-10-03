import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { POSTS, getPost } from '@/lib/blog';

export function generateStaticParams() {
  return POSTS.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      type: 'article',
      title: post.title,
      description: post.description,
      url: `/blog/${post.slug}`,
      publishedTime: post.date,
    },
  };
}

export default async function BlogPost({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  return (
    <main className="bg-emerald-950 text-bone min-h-screen py-28 px-6">
      <article className="max-w-3xl mx-auto">
        <Link href="/blog" className="text-lime text-sm hover:underline">
          ← Blog
        </Link>

        <header className="mt-6 mb-10">
          <div className="flex items-center gap-3 font-mono text-xs text-bone/40 mb-4">
            <span className="text-lime">{post.category}</span>
            <span>·</span>
            <time dateTime={post.date}>{post.date}</time>
            <span>·</span>
            <span>{post.readMinutes} min de lectura</span>
          </div>
          <h1 className="font-display font-bold text-3xl sm:text-4xl leading-tight">{post.title}</h1>
          <p className="mt-4 text-bone/65 leading-relaxed">{post.description}</p>
        </header>

        <div className="space-y-8">
          {post.content.map((block, i) => (
            <section key={i}>
              {block.heading && (
                <h2 className="font-display font-semibold text-xl sm:text-2xl mt-10 mb-4 text-bone">
                  {block.heading}
                </h2>
              )}

              {block.paragraphs.map((p, j) => (
                <p key={j} className="text-bone/70 leading-relaxed mb-4">
                  {p}
                </p>
              ))}

              {block.list && (
                <ul className="space-y-2.5 my-5">
                  {block.list.map((item, j) => (
                    <li key={j} className="flex gap-3 text-bone/70 leading-relaxed">
                      <span className="text-lime shrink-0">→</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              )}

              {block.table && (
                <div className="overflow-x-auto my-6">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr>
                        {block.table.head.map((h) => (
                          <th
                            key={h}
                            className="text-left py-3 px-4 border-b border-bone/20 font-display font-semibold text-bone"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {block.table.rows.map((row, r) => (
                        <tr key={r} className="border-b border-bone/5">
                          {row.map((cell, c) => (
                            <td key={c} className="py-3 px-4 text-bone/70">
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          ))}
        </div>

        <div className="mt-14 rounded-2xl border border-lime/25 bg-gradient-to-br from-emerald-800 to-graphite-900 p-8">
          <h2 className="font-display font-semibold text-xl mb-2">
            ¿Quieres dejar de calcular a mano?
          </h2>
          <p className="text-bone/65 mb-6 text-sm leading-relaxed">
            Kreditools aplica estas fórmulas sobre el saldo real y recalcula la mora todos los días.
          </p>
          <Link
            href="/#registro"
            className="inline-flex rounded-full bg-lime px-6 py-3 font-display font-semibold text-emerald-950 hover:bg-bone transition-colors"
          >
            Crear mi espacio
          </Link>
        </div>
      </article>
    </main>
  );
}
