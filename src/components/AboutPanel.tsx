import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Compass, Cloud, HardDrive, Headphones, Shield, Sparkles, Trash2, Wifi,
  MonitorSmartphone, ListMusic, Smartphone, ExternalLink, History, BookOpen, FileText,
  Bookmark, ChevronDown,
} from '../icons/motion';
import { useAudio } from '../context/AudioContext';
import { APP_VERSION } from '../utils/legalMeta';

export { APP_VERSION };

const FAQ_ITEMS: Array<{ question: string; answer: string }> = [
  {
    question: 'Sawra est-il gratuit ?',
    answer:
      'Oui. Sawra est 100 % gratuit et sans publicité. Vous pouvez écouter le Coran en streaming sans créer de compte.',
  },
  {
    question: 'D’où viennent les audios du Coran ?',
    answer:
      'Les flux audio proviennent de mp3quran.net. Sawra ne revend pas d’écoute et n’héberge pas les fichiers MP3.',
  },
  {
    question: 'Puis-je écouter le Coran hors ligne ?',
    answer:
      'Oui. Téléchargez des sourates sur votre appareil pour les réécouter sans connexion.',
  },
  {
    question: 'Comment fonctionnent les signets et la Bibliothèque ?',
    answer:
      'Marquez des versets précis avec des notes depuis le lecteur. Retrouvez-les dans l’onglet Bibliothèque, avec vos récitateurs favoris.',
  },
  {
    question: 'Qu’est-ce que le streak et l’historique d’écoute ?',
    answer:
      'Avec un compte GoMuslimLife, Sawra enregistre votre temps d’écoute, un calendrier sur 7 jours et un streak (≥ 1 min / jour). Données synchronisées dans le cloud.',
  },
  {
    question: 'Qu’est-ce que le Quiz Coran et la page Apprendre ?',
    answer:
      'Le Quiz vous invite à deviner la sourate à partir d’un extrait audio. Apprendre propose un entraînement verset par verset : flou, écoute, révélation.',
  },
  {
    question: 'Puis-je supprimer mon compte et mes données ?',
    answer:
      'Oui. Depuis Connexion, supprimez définitivement votre compte et toutes vos données Sawra (droit d’effacement RGPD). Le compte GoMuslimLife associé est fermé.',
  },
  {
    question: 'Le compte GoMuslimLife est-il partagé ?',
    answer:
      'Oui. Un même compte GoMuslimLife sert pour Sawra et gomuslimlife.com. Sur Sawra, favoris, signets, historique, reprise et préférences sont synchronisés entre vos appareils.',
  },
  {
    question: 'Sawra fonctionne-t-il sur mobile ?',
    answer:
      'Oui. Sawra est une PWA installable sur Android et iOS. Des applications natives sont en préparation.',
  },
];

const UPDATE_HISTORY: Array<{
  version: string;
  date: string;
  title: string;
  items: string[];
}> = [
  {
    version: '1.0.0',
    date: '16 août 2026',
    title: 'Première version publique',
    items: [
      'Écoute en streaming, favoris, téléchargement hors-ligne et installation PWA.',
      'Lecteur personnalisable : thèmes, progression, plein écran, effets audio.',
      'Lecture des versets synchronisée avec l’audio, signets et notes personnelles.',
      'Bibliothèque : signets, historique d’écoute, streak et récitateurs favoris.',
      'Quiz Coran et page Apprendre (écoute, flou, phonétique).',
      'Compte GoMuslimLife : sync multi-appareils, reprise de lecture, suppression du compte.',
      'Options, pages À propos / Légal, et confirmation avant suppression de compte.',
    ],
  },
];

export const AboutPanel: React.FC = () => {
  const router = useRouter();
  const { cacheInfo, clearCache } = useAudio();

  const handleClear = async () => {
    if (confirm('Voulez-vous supprimer toutes les sourates téléchargées pour l\'écoute hors-ligne ?')) {
      await clearCache();
    }
  };

  const features = [
    {
      icon: Headphones,
      title: 'Écoute en streaming',
      body: 'Catalogue de récitateurs via mp3quran.net, lecteur personnalisable, reprise automatique et contrôles média système.',
    },
    {
      icon: Bookmark,
      title: 'Bibliothèque personnelle',
      body: 'Signets de versets et notes. Historique et streak avec un compte, enregistrés dans le cloud.',
    },
    {
      icon: MonitorSmartphone,
      title: 'Multi-appareils (compte requis)',
      body: 'Avec un compte GoMuslimLife : favoris, signets, historique, reprise et position synchronisés. Sans compte, tout reste sur cet appareil.',
    },
    {
      icon: ListMusic,
      title: 'Boucle de sourates',
      body: 'Sélectionnez les sourates à répéter. Avec un compte, la sélection et les préférences suivent le cloud.',
    },
    {
      icon: HardDrive,
      title: 'Hors-ligne (téléchargement manuel)',
      body: 'Seules les sourates que vous téléchargez sont écoutables sans réseau. Le catalogue et le streaming restent en ligne.',
    },
    {
      icon: Cloud,
      title: 'Compte GoMuslimLife',
      body: 'Un même compte pour Sawra et GoMuslimLife.com. Sur Sawra : sync favoris, signets, historique et reprise entre appareils — pas de pub ni d’historique commercialisé.',
    },
    {
      icon: Smartphone,
      title: 'Sur votre téléphone dès maintenant',
      body: 'Ajoutez Sawra à l’écran d’accueil (PWA). Les apps App Store et Google Play sont en préparation ; une liste d’attente suivra.',
    },
    {
      icon: Shield,
      title: 'Données & confidentialité',
      body: 'Sans compte : stockage local uniquement. Avec compte : sync ciblée (favoris, signets, historique, reprise, préférences). Détails dans Confidentialité.',
    },
  ];

  return (
    <div className="flex flex-col gap-5 pb-8">
      <div className="relative overflow-hidden rounded-3xl brand-card p-6">
        <div className="absolute -top-16 -right-10 h-40 w-40 rounded-full bg-[#e2d0ba]/14 blur-3xl pointer-events-none" />
        <div className="relative">
          <div className="flex items-center gap-3">
            <img
              src="/icons/sansfond.webp"
              alt=""
              className="h-11 w-11 object-contain drop-shadow-[0_2px_12px_rgba(191,160,120),0.45)]"
              draggable={false}
            />
            <div>
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-[#e2d0ba]" />
                <h2 className="text-xl font-bold text-[#f6f8fb]">À propos de Sawra</h2>
              </div>
              <p className="mt-1 text-sm leading-relaxed text-[#b4c0ce]">
                Lecteur coranique web / PWA — gratuit, sans pub, sources audio documentées.
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="brand-chip inline-flex items-center rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider">
              v{APP_VERSION}
            </span>
            <span className="text-[11px] text-[#95a7ba]">Dernière maj · 16 août 2026</span>
          </div>
          <a
            href="https://gomuslimlife.com"
            target="_blank"
            rel="noopener noreferrer"
            className="brand-button-secondary mt-4 inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors"
          >
            Découvrir GoMuslimLife.com
            <ExternalLink className="h-3.5 w-3.5 opacity-70" />
          </a>
        </div>
      </div>

      <div className="glass-panel rounded-3xl border border-[#30455c]/60 p-5 flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-[#e2d0ba]" />
          <h3 className="text-sm font-bold text-[#f6f8fb]">Historique des mises à jour</h3>
        </div>

        <div className="relative flex flex-col gap-5 pl-1">
          <div className="absolute left-[7px] top-2 bottom-2 w-px bg-[#30455c]" aria-hidden />
          {UPDATE_HISTORY.map((release, index) => (
            <div key={release.version} className="relative pl-6">
              <span
                className={`absolute left-0 top-1.5 h-3.5 w-3.5 rounded-full border-2 ${
                  index === 0
                    ? 'border-[#e2d0ba] bg-[#bfa078]/40'
                    : 'border-[#46607b] bg-[#111d2d]'
                }`}
                aria-hidden
              />
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <span className="text-sm font-bold text-[#f6f8fb]">v{release.version}</span>
                <span className="text-[11px] text-[#95a7ba]">{release.date}</span>
              </div>
              <p className="mt-0.5 text-xs font-semibold text-[#e6d5c2]">{release.title}</p>
              <ul className="mt-2 flex flex-col gap-1.5">
                {release.items.map((item) => (
                  <li key={item} className="text-[12px] leading-relaxed text-[#b4c0ce] flex gap-2">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[#8a7350]" aria-hidden />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="glass-panel rounded-3xl border border-[#30455c]/60 p-5 flex flex-col gap-4">
        {features.map(({ icon: Icon, title, body }) => (
          <div key={title} className="flex gap-3">
            <span className="brand-chip-cool mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl">
              <Icon className="w-4 h-4" />
            </span>
            <div>
              <h4 className="text-sm font-semibold text-[#e6edf5]">{title}</h4>
              <p className="text-xs text-[#b4c0ce] mt-0.5 leading-relaxed">{body}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="glass-panel rounded-3xl border border-[#30455c]/60 p-5 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-[#e2d0ba]" />
          <h3 className="text-sm font-bold text-[#f6f8fb]">Questions fréquentes</h3>
        </div>
        <div className="flex flex-col gap-2">
          {FAQ_ITEMS.map(({ question, answer }) => (
            <FaqItem key={question} question={question} answer={answer} />
          ))}
        </div>
      </div>

      <div className="glass-panel rounded-3xl border border-[#30455c]/60 p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between border-b border-[#111d2d] pb-2">
          <div className="flex items-center gap-2">
            <Wifi className="w-4 h-4 text-[#d0d9e3]" />
            <h4 className="text-sm font-semibold text-[#e6edf5]">Cache hors-ligne</h4>
          </div>
          <span className="brand-chip-cool text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
            Local
          </span>
        </div>

        <p className="text-[11px] leading-relaxed text-[#95a7ba]">
          Stockage navigateur uniquement. Non synchronisé entre appareils. Peut être purgé par
          le système si l’espace manque.
        </p>

        <div className="flex justify-between items-center text-xs">
          <div className="flex flex-col gap-0.5">
            <span className="text-[#b4c0ce]">Sourates téléchargées</span>
            <span className="text-[#e6edf5] font-bold">{cacheInfo?.count ?? 0} sourate(s)</span>
          </div>
          <div className="flex flex-col items-end gap-0.5">
            <span className="text-[#b4c0ce]">Espace utilisé</span>
            <span className="text-[#e6edf5] font-bold">{cacheInfo?.totalSizeMb ?? 0} Mo</span>
          </div>
        </div>

        {cacheInfo && cacheInfo.count > 0 && (
          <button
            type="button"
            onClick={handleClear}
            className="mt-1 flex min-h-11 items-center justify-center gap-2 w-full py-2.5 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 hover:border-rose-500/40 text-rose-400 text-xs font-semibold rounded-xl transition-all duration-200 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#bfa078]"
          >
            <Trash2 className="w-4 h-4" />
            <span>Vider le cache hors-ligne</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {(
            [
              { href: '/sources', label: 'Sources & licences', icon: BookOpen },
              { href: '/privacy', label: 'Confidentialité', icon: Shield },
              { href: '/terms', label: 'Conditions', icon: FileText },
            ] as const
          ).map(({ href, label, icon: Icon }) => (
            <a
              key={href}
              href={href}
              onClick={(event) => {
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
                router.push(href);
              }}
              className="flex min-h-11 items-center gap-2 rounded-2xl border border-[#30455c]/55 bg-[#111d2d]/70 px-3.5 py-3 text-left text-xs font-semibold text-[#d0d9e3] transition-colors hover:border-[#46607b]/60 hover:text-[#f6f8fb] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#bfa078] tap-feedback"
            >
              <Icon className="h-4 w-4 shrink-0 text-[#e2d0ba]" aria-hidden />
              {label}
            </a>
          ))}
        </div>

      <div className="rounded-2xl border border-[#30455c]/40 bg-[#111d2d]/45 p-4 flex items-center gap-3">
        <Sparkles className="w-5 h-5 text-[#e2d0ba] shrink-0" />
        <p className="text-[11px] text-[#b4c0ce] leading-relaxed">
          Conçu pour une écoute sereine : sources claires, données maîtrisées, Coran au centre.
        </p>
      </div>

      <div className="flex items-center justify-between text-[11px] text-[#95a7ba] gap-3 flex-wrap px-1">
        <span>Sawra © {new Date().getFullYear()} · v{APP_VERSION}</span>
        <a
          href="https://sofianeweb.fr"
          target="_blank"
          rel="noopener noreferrer"
          className="group flex min-h-9 items-center gap-1.5 rounded-full border border-[#30455c]/40 bg-[#111d2d]/45 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-[#aab7c5] transition-all duration-300 hover:border-[#46607b]/60 hover:bg-[#162538] hover:text-[#eef3f8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#bfa078]"
        >
          <span>Créé par sofianeweb.fr</span>
          <span className="inline-block transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5">↗</span>
        </a>
      </div>
    </div>
  );
};

const FaqItem: React.FC<{ question: string; answer: string }> = ({ question, answer }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-[#30455c]/45 bg-[#111d2d]/45 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className="flex w-full min-h-11 items-center justify-between gap-3 px-3.5 py-3 text-left text-xs font-semibold text-[#e6edf5] transition-colors hover:bg-[#162538]/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#bfa078]"
      >
        <span>{question}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-[#95a7ba] transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          aria-hidden
        />
      </button>
      {open && (
        <p className="border-t border-[#30455c]/40 px-3.5 py-3 text-[12px] leading-relaxed text-[#b4c0ce]">
          {answer}
        </p>
      )}
    </div>
  );
};
