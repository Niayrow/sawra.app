/** Curated radio stations — continuous surah playback with preset reciters & playlists. */
export type RadioStation = {
  id: string;
  name: string;
  tagline: string;
  description: string;
  reciterId: number;
  surahIds: number[];
  shuffle: boolean;
  /** CSS gradient stops for card art */
  gradient: [string, string, string];
  mood: 'calme' | 'énergie' | 'nuit' | 'matin' | 'méditation' | 'classique';
};

export const RADIO_STATIONS: RadioStation[] = [
  {
    id: 'juz-amma',
    name: 'Juz Amma',
    tagline: 'Les dernières sourates',
    description: 'An-Naba à An-Nas — parfait pour une écoute quotidienne ou la mémorisation.',
    reciterId: 123,
    surahIds: Array.from({ length: 37 }, (_, i) => i + 78),
    shuffle: false,
    gradient: ['#1a3a52', '#2d5a72', '#bfa078'],
    mood: 'classique',
  },
  {
    id: 'sourates-coeur',
    name: 'Sourates du cœur',
    tagline: 'Yasin, Rahman, Mulk…',
    description: 'Les sourates les plus aimées, enchaînées avec douceur.',
    reciterId: 54,
    surahIds: [18, 32, 36, 55, 56, 67, 78, 112, 113, 114],
    shuffle: true,
    gradient: ['#2a1f4e', '#4a3078', '#e2d0ba'],
    mood: 'calme',
  },
  {
    id: 'nuit-paisible',
    name: 'Nuit paisible',
    tagline: 'Ambiance nocturne',
    description: 'Voix profonde et apaisante pour la fin de journée ou avant le sommeil.',
    reciterId: 118,
    surahIds: [56, 57, 59, 62, 67, 73, 76, 78, 87, 93, 94, 95],
    shuffle: true,
    gradient: ['#0c1424', '#1a2844', '#7990a1'],
    mood: 'nuit',
  },
  {
    id: 'matin-lumineux',
    name: 'Matin lumineux',
    tagline: 'Commencer la journée',
    description: 'Récitation claire et lumineuse pour un réveil spirituel.',
    reciterId: 30,
    surahIds: [1, 18, 36, 55, 67, 78, 86, 87, 112, 113, 114],
    shuffle: false,
    gradient: ['#1a3d2e', '#2d6b4a', '#c9e4d4'],
    mood: 'matin',
  },
  {
    id: 'meditation',
    name: 'Méditation',
    tagline: 'Courtes sourates',
    description: 'Sourates brèves pour une pause méditative à tout moment.',
    reciterId: 123,
    surahIds: [1, 93, 94, 95, 97, 99, 103, 109, 112, 113, 114],
    shuffle: false,
    gradient: ['#1f2a3a', '#354860', '#bfa078'],
    mood: 'méditation',
  },
  {
    id: 'voix-haram',
    name: 'Voix du Haram',
    tagline: 'Imam de la Mosquée sacrée',
    description: 'Abdurrahman As-Sudais — récitation emblématique de La Mecque.',
    reciterId: 54,
    surahIds: [1, 36, 55, 67, 78, 112, 113, 114],
    shuffle: true,
    gradient: ['#3a2018', '#6b3a28', '#e2d0ba'],
    mood: 'énergie',
  },
  {
    id: 'radio-sawra',
    name: 'Radio Sawra',
    tagline: 'Le meilleur de Sawra',
    description: 'Un mix varié des sourates favorites — laissez-vous porter.',
    reciterId: 102,
    surahIds: [1, 2, 18, 36, 55, 56, 67, 78, 112, 113, 114],
    shuffle: true,
    gradient: ['#1a2540', '#3a5080', '#bfa078'],
    mood: 'classique',
  },
];

export const RADIO_STATION_BY_ID = new Map(RADIO_STATIONS.map((s) => [s.id, s]));

export const RADIO_MOOD_LABELS: Record<RadioStation['mood'], string> = {
  calme: 'Calme',
  énergie: 'Énergie',
  nuit: 'Nuit',
  matin: 'Matin',
  méditation: 'Méditation',
  classique: 'Classique',
};
