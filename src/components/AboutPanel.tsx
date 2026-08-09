import React from 'react';
import {
  Compass, Cloud, HardDrive, Headphones, Shield, Sparkles, Trash2, Wifi,
  MonitorSmartphone, ListMusic, Smartphone, ExternalLink, History, BookOpen, FileText,
} from '../icons/motion';
import { useAudio } from '../context/AudioContext';

export const APP_VERSION = '1.4.0';

type LegalPanelId = 'sources' | 'privacy' | 'terms';

type AboutPanelProps = {
  onOpenLegal?: (panel: LegalPanelId) => void;
};

const UPDATE_HISTORY: Array<{
  version: string;
  date: string;
  title: string;
  items: string[];
}> = [
  {
    version: '1.4.0',
    date: '9 août 2026',
    title: 'Lecteur de versets & nouvelle identité',
    items: [
      'Feuille de lecture sourate avec texte, options et sync audio ↔ versets (mp3quran).',
      'Nouveau branding : appicon PWA, icônes & favicon, logo navbar sans cadre.',
      'Compte : renommer le nom affiché ; badge Connecté à la place de Connexion.',
      'Filtres Versets / Sans sur Écouter et polish divers (hero, cartes).',
    ],
  },
  {
    version: '1.3.0',
    date: '2 août 2026',
    title: 'Sélection mobile & polish UX',
    items: [
      'Liste des sourates mobile : appui long, multi-sélection, barre Boucle / Télécharger.',
      'Navbar mobile allégée : Accueil, Écouter, Favoris (+ Moments), Options.',
      'Toast téléchargement, modal effets audio et bouton effets affinés.',
      'Hero « simplement. » animé (couleur) et correctif chevauchement recherche / récitateur.',
    ],
  },
  {
    version: '1.2.0',
    date: '27 juil. 2026',
    title: 'Identité & expérience mobile',
    items: [
      'Nouveau logo calligraphie + icônes app / PWA (noir & cuivre).',
      'Accueil redesigné : hero compact, accès rapide, lieux et favoris.',
      'Navbar mobile : sélection marine, dock collé au lecteur, sans logo.',
      'Player bar : temps, progression seekable, swipe plein écran, liste des sourates au tap.',
      'Lecture distante : contrôles grisés + masquage temps/progression hors appareil local.',
    ],
  },
  {
    version: '1.1.0',
    date: '2026',
    title: 'Sync & lecteur V2',
    items: [
      'Lecteur V2 personnalisable (thèmes, densité, contrôles).',
      'Synchronisation cloud des favoris, préférences et boucle de sourates.',
      'Bandeau multi-appareils « Basculer ici » et reprise de lecture.',
      'Palette marine et accents UI harmonisés.',
    ],
  },
  {
    version: '1.0.0',
    date: '2026',
    title: 'Première version publique',
    items: [
      'Streaming des récitateurs, favoris et mode hors-ligne.',
      'Installation PWA.',
      'Compte GoMuslimLife partagé.',
    ],
  },
];

export const AboutPanel: React.FC<AboutPanelProps> = ({ onOpenLegal }) => {
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
      icon: MonitorSmartphone,
      title: 'Multi-appareils (compte requis)',
      body: 'Avec un compte GoMuslimLife : favoris, reprise et position synchronisés. Sans compte, tout reste sur cet appareil.',
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
      body: 'Un compte pour Sawra et GoMuslimLife.com : favoris, reprise et préférences — pas de pub ni d’historique commercialisé.',
    },
    {
      icon: Smartphone,
      title: 'Sur votre téléphone dès maintenant',
      body: 'Ajoutez Sawra à l’écran d’accueil (PWA). Les apps App Store et Google Play sont en préparation ; une liste d’attente suivra.',
    },
    {
      icon: Shield,
      title: 'Données & confidentialité',
      body: 'Sans compte : stockage local uniquement. Avec compte : sync ciblée (favoris, reprise, préférences). Détails dans Confidentialité.',
    },
  ];

  return (
    <div className="flex flex-col gap-5 pb-8">
      <div className="relative overflow-hidden rounded-3xl brand-card p-6">
        <div className="absolute -top-16 -right-10 h-40 w-40 rounded-full bg-[#f0d1bc]/14 blur-3xl pointer-events-none" />
        <div className="relative">
          <div className="flex items-center gap-3">
            <img
              src="/icons/sansfond.webp"
              alt=""
              className="h-11 w-11 object-contain drop-shadow-[0_2px_12px_rgba(200,160,122,0.45)]"
              draggable={false}
            />
            <div>
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-[#f0d1bc]" />
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
            <span className="text-[11px] text-[#95a7ba]">Dernière maj · 9 août 2026</span>
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
          <History className="w-4 h-4 text-[#f0d1bc]" />
          <h3 className="text-sm font-bold text-[#f6f8fb]">Historique des mises à jour</h3>
        </div>

        <div className="relative flex flex-col gap-5 pl-1">
          <div className="absolute left-[7px] top-2 bottom-2 w-px bg-[#30455c]" aria-hidden />
          {UPDATE_HISTORY.map((release, index) => (
            <div key={release.version} className="relative pl-6">
              <span
                className={`absolute left-0 top-1.5 h-3.5 w-3.5 rounded-full border-2 ${
                  index === 0
                    ? 'border-[#f0d1bc] bg-[#cea687]/40'
                    : 'border-[#46607b] bg-[#111d2d]'
                }`}
                aria-hidden
              />
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <span className="text-sm font-bold text-[#f6f8fb]">v{release.version}</span>
                <span className="text-[11px] text-[#95a7ba]">{release.date}</span>
              </div>
              <p className="mt-0.5 text-xs font-semibold text-[#f1d4c1]">{release.title}</p>
              <ul className="mt-2 flex flex-col gap-1.5">
                {release.items.map((item) => (
                  <li key={item} className="text-[12px] leading-relaxed text-[#b4c0ce] flex gap-2">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[#b98d6e]" aria-hidden />
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
            className="mt-1 flex min-h-11 items-center justify-center gap-2 w-full py-2.5 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 hover:border-rose-500/40 text-rose-400 text-xs font-semibold rounded-xl transition-all duration-200 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#cea687]"
          >
            <Trash2 className="w-4 h-4" />
            <span>Vider le cache hors-ligne</span>
          </button>
        )}
      </div>

      {onOpenLegal && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {([
            { id: 'sources' as const, label: 'Sources & licences', icon: BookOpen },
            { id: 'privacy' as const, label: 'Confidentialité', icon: Shield },
            { id: 'terms' as const, label: 'Conditions', icon: FileText },
          ]).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => onOpenLegal(id)}
              className="flex min-h-11 items-center gap-2 rounded-2xl border border-[#30455c]/55 bg-[#111d2d]/70 px-3.5 py-3 text-left text-xs font-semibold text-[#d0d9e3] transition-colors hover:border-[#46607b]/60 hover:text-[#f6f8fb] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#cea687] tap-feedback"
            >
              <Icon className="h-4 w-4 shrink-0 text-[#f0d1bc]" aria-hidden />
              {label}
            </button>
          ))}
        </div>
      )}

      <div className="rounded-2xl border border-[#30455c]/40 bg-[#111d2d]/45 p-4 flex items-center gap-3">
        <Sparkles className="w-5 h-5 text-[#f0d1bc] shrink-0" />
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
          className="group flex min-h-9 items-center gap-1.5 rounded-full border border-[#30455c]/40 bg-[#111d2d]/45 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-[#aab7c5] transition-all duration-300 hover:border-[#46607b]/60 hover:bg-[#162538] hover:text-[#eef3f8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#cea687]"
        >
          <span>Créé par sofianeweb.fr</span>
          <span className="inline-block transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5">↗</span>
        </a>
      </div>
    </div>
  );
};
