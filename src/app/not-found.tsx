import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Page introuvable — Sawra',
  description: 'Cette page n’existe pas sur Sawra.',
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-5 py-16 text-center text-[#e6edf5]">
      <img src="/icons/sansfond.webp" alt="" width={80} height={80} className="mb-5" />
      <h1 className="text-2xl font-bold">Page introuvable</h1>
      <p className="mt-3 text-[#aab7c5]">Cette adresse n’existe pas sur Sawra. Le Coran vous attend à l’accueil.</p>
      <Link
        href="/"
        className="mt-6 rounded-full border border-[rgba(201,160,106,0.35)] bg-[rgba(201,160,106,0.12)] px-5 py-2.5 font-bold text-[#e8d4bc]"
      >
        Retour à l’accueil
      </Link>
      <nav className="mt-8 flex flex-wrap justify-center gap-4 text-sm font-semibold text-[#e8d4bc]">
        <Link href="/ecouter">Écouter</Link>
        <Link href="/bibliotheque">Bibliothèque</Link>
        <Link href="/quiz">Quiz</Link>
        <Link href="/apprendre">Apprendre</Link>
        <Link href="/privacy">Confidentialité</Link>
      </nav>
    </main>
  );
}
