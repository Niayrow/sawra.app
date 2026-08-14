import Link from 'next/link';
import type { ReactNode } from 'react';

export function LegalDocument({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto max-w-2xl px-5 py-10 pb-16 text-[#e6edf5]">
      <p className="mb-3 text-[0.7rem] font-extrabold uppercase tracking-[0.18em] text-[#c9a06a]">
        Sawra
      </p>
      <h1 className="mb-2 text-3xl font-bold tracking-tight">{title}</h1>
      <p className="mb-6 text-sm text-[#8295aa]">{updated}</p>
      <div className="rounded-2xl border border-[rgba(166,184,203,0.16)] bg-[rgba(15,26,40,0.72)] p-5 text-sm leading-relaxed text-[#aab7c5] [&_a]:text-[#e8d4bc] [&_h2]:mt-8 [&_h2]:mb-3 [&_h2]:text-[1.05rem] [&_h2]:text-[#c9a06a] [&_p]:mb-3 [&_ul]:mb-3 [&_ul]:list-disc [&_ul]:pl-5">
        {children}
      </div>
      <p className="mt-6 text-sm">
        <Link href="/">← Retour à Sawra</Link>
      </p>
    </main>
  );
}
