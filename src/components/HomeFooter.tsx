import React, { useState } from 'react';
import {
  Headphones,
  BookOpen,
  Sparkles,
  AudioLines,
  GitCompare,
  Download,
  Compass,
  Settings,
  Share,
  Smartphone,
  ExternalLink,
} from '../icons/motion';
import { usePwaInstall } from '../hooks/usePwaInstall';
import { PwaInstallModal } from './PwaInstallModal';
import { SawraBrandMark } from './SawraBrandMark';

const GOMUSLIMLIFE_URL = 'https://gomuslimlife.com';

type FooterLink = {
  label: string;
  href: string;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
  featured?: boolean;
};

type HomeFooterProps = {
  onNavigate: (href: string) => void;
};

const PRODUCT: FooterLink[] = [
  { label: 'Écouter', href: '/ecouter', hint: 'Récitateurs & sourates', icon: Headphones, featured: true },
  { label: 'Bibliothèque', href: '/bibliotheque', hint: 'Signets & historique', icon: BookOpen },
  { label: 'Quiz', href: '/quiz', hint: 'Devinez la sourate', icon: Sparkles },
  { label: 'Apprendre', href: '/apprendre', hint: 'Flou · écoute · révélation', icon: AudioLines },
];

const DISCOVER: FooterLink[] = [
  { label: 'Comparer', href: '/comparer', hint: 'Voix côte à côte', icon: GitCompare },
  { label: 'Hors ligne', href: '/telechargements', hint: 'Sourates téléchargées', icon: Download },
  { label: 'À propos', href: '/a-propos', hint: 'FAQ & nouveautés', icon: Compass },
  { label: 'Options', href: '/options', hint: 'Hors-ligne, idées, confidentialité', icon: Settings },
];

const LEGAL = [
  { label: 'Sources', href: '/sources' },
  { label: 'Confidentialité', href: '/privacy' },
  { label: 'Conditions', href: '/terms' },
];

function handleInternalNav(
  event: React.MouseEvent<HTMLAnchorElement>,
  href: string,
  onNavigate: (href: string) => void,
) {
  if (
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey ||
    event.button !== 0
  ) {
    return;
  }
  event.preventDefault();
  onNavigate(href);
}

const DestinationTile: React.FC<{
  item: FooterLink;
  onNavigate: (href: string) => void;
}> = ({ item, onNavigate }) => {
  const Icon = item.icon;
  return (
    <a
      href={item.href}
      onClick={(event) => handleInternalNav(event, item.href, onNavigate)}
      className={`home-footer__tile group relative flex min-h-[4.5rem] flex-col justify-between overflow-hidden rounded-[1.15rem] border px-3.5 py-3 transition-all duration-300 tap-feedback focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#bfa078] ${
        item.featured
          ? 'border-[#bfa078]/35 bg-[linear-gradient(145deg,rgba(226,208,186,0.14),rgba(15,25,40,0.92))]'
          : 'border-[#30455c]/55 bg-[#0c1522]/72 hover:border-[#bfa078]/28 hover:bg-[#132033]/90'
      }`}
    >
      <span
        className={`pointer-events-none absolute -right-4 -top-4 h-16 w-16 rounded-full blur-2xl transition-opacity duration-500 ${
          item.featured ? 'bg-[#e2d0ba]/18 opacity-100' : 'bg-[#46607b]/20 opacity-0 group-hover:opacity-100'
        }`}
        aria-hidden
      />
      <span className="relative flex items-start justify-between gap-2">
        <span
          className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border ${
            item.featured
              ? 'border-[#bfa078]/35 bg-[#e2d0ba]/14 text-[#e6d5c2]'
              : 'border-[#30455c]/70 bg-[#162538]/80 text-[#b4c0ce] group-hover:text-[#e6d5c2]'
          }`}
        >
          <Icon className="h-4 w-4" />
        </span>
        <span
          className="translate-x-0 text-[#bfa078]/0 transition-all duration-300 group-hover:translate-x-0.5 group-hover:text-[#bfa078]/80"
          aria-hidden
        >
          →
        </span>
      </span>
      <span className="relative mt-2.5">
        <span className="block text-[13px] font-bold text-[#f6f8fb]">{item.label}</span>
        <span className="mt-0.5 block text-[10px] leading-snug text-[#8ea1b3]">{item.hint}</span>
      </span>
    </a>
  );
};

export const HomeFooter: React.FC<HomeFooterProps> = ({ onNavigate }) => {
  const pwa = usePwaInstall();
  const [installOpen, setInstallOpen] = useState(false);

  const installPwa = async () => {
    if (pwa.standalone) return;
    if (pwa.canNativeInstall) {
      const outcome = await pwa.promptNativeInstall();
      if (outcome === 'accepted') return;
      if (outcome === 'dismissed') return;
    }
    setInstallOpen(true);
  };

  const InstallIcon = pwa.platform === 'ios' ? Share : Smartphone;

  return (
    <footer className="home-footer relative overflow-hidden rounded-[1.6rem] border border-[#30455c]/45">
      <PwaInstallModal
        open={installOpen}
        platform={pwa.platform}
        onClose={() => setInstallOpen(false)}
      />
      <div className="home-footer__atmosphere" aria-hidden>
        <span className="home-footer__orb home-footer__orb--gold" />
        <span className="home-footer__orb home-footer__orb--steel" />
        <span className="home-footer__grid" />
      </div>

      <div className="relative z-[1] flex flex-col gap-5 p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-start gap-3">
            <SawraBrandMark size="lg" asLink className="shrink-0" />
            <div className="min-w-0 pt-0.5">
              <p className="text-[1.05rem] font-black tracking-tight text-[#f6f8fb]">
                Le Coran, simplement.
              </p>
              <p className="mt-1 max-w-[16rem] text-[11px] leading-relaxed text-[#95a7ba]">
                {pwa.standalone
                  ? 'Gratuit · sans pub · installé sur cet appareil'
                  : pwa.canSuggest
                    ? `Gratuit · sans pub · ${pwa.hint}`
                    : 'Gratuit · sans pub · PWA installable'}
              </p>
            </div>
          </div>

          {!pwa.standalone && (
            <button
              type="button"
              onClick={() => void installPwa()}
              className="home-footer__install inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full border border-[#bfa078]/35 bg-[#e2d0ba]/14 px-4 py-2.5 text-[12px] font-bold text-[#e6d5c2] shadow-[0_0_28px_rgba(191,160,120,0.12)] transition-all hover:bg-[#e2d0ba]/22 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#bfa078] tap-feedback sm:min-w-[13.5rem]"
            >
              <InstallIcon className="h-3.5 w-3.5" aria-hidden />
              {pwa.buttonLabel}
            </button>
          )}
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
          <section aria-labelledby="footer-product-heading">
            <div className="mb-2.5 flex items-center gap-2">
              <span className="h-px flex-1 bg-gradient-to-r from-[#bfa078]/45 to-transparent" aria-hidden />
              <h2
                id="footer-product-heading"
                className="text-[10px] font-black uppercase tracking-[0.2em] text-[#8ea1b3]"
              >
                Produit
              </h2>
              <span className="h-px flex-1 bg-gradient-to-l from-[#bfa078]/45 to-transparent" aria-hidden />
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-2">
              {PRODUCT.map((item) => (
                <DestinationTile key={item.href} item={item} onNavigate={onNavigate} />
              ))}
            </div>
          </section>

          <section aria-labelledby="footer-discover-heading">
            <div className="mb-2.5 flex items-center gap-2">
              <span className="h-px flex-1 bg-gradient-to-r from-[#46607b]/55 to-transparent" aria-hidden />
              <h2
                id="footer-discover-heading"
                className="text-[10px] font-black uppercase tracking-[0.2em] text-[#8ea1b3]"
              >
                Découvrir
              </h2>
              <span className="h-px flex-1 bg-gradient-to-l from-[#46607b]/55 to-transparent" aria-hidden />
            </div>
            <div className="grid grid-cols-2 gap-2">
              {DISCOVER.map((item) => (
                <DestinationTile key={item.href} item={item} onNavigate={onNavigate} />
              ))}
            </div>
          </section>
        </div>

        <nav
          aria-label="Informations légales"
          className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-[#30455c]/40 bg-[#07111d]/45 p-1.5"
        >
          {LEGAL.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="inline-flex min-h-9 items-center rounded-xl px-3 text-[11px] font-semibold text-[#95a7ba] transition-colors hover:bg-[#162538]/80 hover:text-[#e6d5c2] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#bfa078]"
            >
              {item.label}
            </a>
          ))}
          <span className="mx-1 hidden h-4 w-px bg-[#30455c]/55 sm:block" aria-hidden />
          <a
            href={GOMUSLIMLIFE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-9 items-center gap-1.5 rounded-xl px-3 text-[11px] font-semibold text-[#95a7ba] transition-colors hover:bg-[#162538]/80 hover:text-[#e6d5c2] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#bfa078]"
          >
            GoMuslimLife
            <ExternalLink className="h-3 w-3 opacity-50" aria-hidden />
          </a>
        </nav>
      </div>

      <div className="relative z-[1] flex flex-col items-center gap-2 border-t border-[#30455c]/35 bg-[#07111d]/40 px-4 py-3.5 text-center sm:px-5">
        <SawraBrandMark
          size="sm"
          showTagline={false}
          asLink
          className="opacity-90 hover:opacity-100"
        />
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#6d8298]">
          Sawra · {new Date().getFullYear()}
        </p>
        <a
          href="https://sofianeweb.fr"
          target="_blank"
          rel="noopener noreferrer"
          className="group inline-flex items-center gap-1.5 rounded-full border border-[#30455c]/45 bg-[#0c1522]/70 px-3 py-1.5 text-[11px] text-[#95a7ba] transition-all duration-300 hover:border-[#bfa078]/35 hover:bg-[#162538]/80 hover:text-[#e6edf5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#bfa078]"
        >
          <span>Imaginé &amp; façonné par</span>
          <span className="font-bold text-[#e6d5c2] transition-colors group-hover:text-[#e2d0ba]">
            sofianeweb.fr
          </span>
          <span
            className="inline-block text-[#bfa078] transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            aria-hidden
          >
            ↗
          </span>
        </a>
      </div>
    </footer>
  );
};
