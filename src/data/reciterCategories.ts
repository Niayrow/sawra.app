import type { AppIcon } from '../icons/motion';
import { Landmark, MoonStar, Building2, Sparkles } from '../icons/motion';
import { CURATED_RECITER_ID_SET } from './curatedReciters';

export type ReciterCategoryId = 'makkah' | 'madinah' | 'riyadh' | 'sawra';

export interface ReciterCategory {
  id: ReciterCategoryId;
  title: string;
  subtitle: string;
  arabicLabel: string;
  image: string;
  icon: AppIcon;
  /** Accent classes for buttons / modal chrome */
  accent: {
    border: string;
    bg: string;
    glow: string;
    text: string;
    badge: string;
    iconBg: string;
  };
  reciterIds: number[];
}

const onlyCurated = (ids: number[]) => ids.filter((id) => CURATED_RECITER_ID_SET.has(id));

/**
 * Curated city / editorial groupings (mp3quran IDs).
 * Only IDs present in the curated catalogue are shown.
 */
export const RECITER_CATEGORIES: ReciterCategory[] = [
  {
    id: 'makkah',
    title: 'La Mecque',
    subtitle: 'Imams du Haram',
    arabicLabel: 'مكة',
    image: '/img/mecca.webp',
    icon: Landmark,
    accent: {
      border: 'border-amber-400/35',
      bg: 'bg-gradient-to-br from-amber-500/15 via-slate-900/80 to-slate-950',
      glow: 'shadow-[0_12px_40px_rgba(245,158,11,0.18)]',
      text: 'text-amber-300',
      badge: 'bg-amber-400/10 border-amber-400/25 text-amber-300',
      iconBg: 'bg-amber-400/15 text-amber-300',
    },
    reciterIds: onlyCurated([
      54, // Abderrahmane Al-Soudais
      31, // Saoud Al-Shuraim
      102, // Maher Al-Mouaiqly
      92, // Yasser Al-Dossary
      217, // Bandar Balilah
      62, // Abdullah Awad Al-Juhany
    ]),
  },
  {
    id: 'madinah',
    title: 'Médine',
    subtitle: 'Imams du Nabawi',
    arabicLabel: 'المدينة',
    image: '/img/medine.webp',
    icon: MoonStar,
    accent: {
      border: 'border-emerald-400/35',
      bg: 'bg-gradient-to-br from-emerald-500/15 via-slate-900/80 to-slate-950',
      glow: 'shadow-[0_12px_40px_rgba(122,145,159,0.18)]',
      text: 'text-emerald-300',
      badge: 'bg-emerald-400/10 border-emerald-400/25 text-emerald-300',
      iconBg: 'bg-emerald-400/15 text-emerald-300',
    },
    reciterIds: onlyCurated([
      74, // Ali Al-Houdhayfi
      43, // Salah Al-Boudeir
      109, // Mohamed Ayyoub
    ]),
  },
  {
    id: 'riyadh',
    title: 'Riyad',
    subtitle: 'Voix de la capitale',
    arabicLabel: 'الرياض',
    image: '/img/riyad.webp',
    icon: Building2,
    accent: {
      border: 'border-sky-400/35',
      bg: 'bg-gradient-to-br from-sky-500/15 via-slate-900/80 to-slate-950',
      glow: 'shadow-[0_12px_40px_rgba(56,189,248,0.16)]',
      text: 'text-sky-300',
      badge: 'bg-sky-400/10 border-sky-400/25 text-sky-300',
      iconBg: 'bg-sky-400/15 text-sky-300',
    },
    reciterIds: onlyCurated([
      86, // Nasser Al-Qatami
      20, // Khaled Al-Jalil
      30, // Saad El-Ghamidi
      5, // Ahmed El-Ajami
      4, // Abou Bakr Al-Chatri
      21, // Khalid Al-Qahtani
      160, // Adel Al-Kalbani
    ]),
  },
  {
    id: 'sawra',
    title: 'Choix Sawra',
    subtitle: 'Sélection éditoriale',
    arabicLabel: 'مختار',
    image: '/img/sawra.webp',
    icon: Sparkles,
    accent: {
      border: 'border-rose-400/30',
      bg: 'bg-gradient-to-br from-rose-500/12 via-slate-900/80 to-slate-950',
      glow: 'shadow-[0_12px_40px_rgba(251,113,133,0.14)]',
      text: 'text-rose-300',
      badge: 'bg-rose-400/10 border-rose-400/25 text-rose-300',
      iconBg: 'bg-rose-400/15 text-rose-300',
    },
    reciterIds: onlyCurated([
      86, // Nasser Al-Qatami
      31, // Saoud Al-Shuraim
      107, // Mohamed El-Louhaïdan
      245, // Mansour Al-Salemi
      12, // Idris Abkar
      254, // Badr Al-Turki
      20, // Khaled Al-Jalil
      221, // Raad Al-Kurdi
      92, // Yasser Al-Dossary
      272, // Okasha Kameny
      253, // Islam Sobhi
      16, // Laayoun El Kouchi
    ]),
  },
];

export const getReciterCategory = (id: ReciterCategoryId) =>
  RECITER_CATEGORIES.find((category) => category.id === id);
