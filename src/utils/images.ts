import type { Reciter } from '../types';

/** Brand plate behind every cutout portrait (layered in ReciterPortrait). */
export const RECITER_BACKGROUND = '/reciters/background.webp';

/**
 * Local cutout portraits in /public/reciters (WebP + alpha).
 * IDs without a local file fall back to getGeneratedReciterAvatar.
 */
export const RECITER_IMAGES: Record<number, string> = {
  123: '/reciters/alafasy.webp', // Mishary Rachid Al-Afasy
  54: '/reciters/sudais.webp', // Abderrahmane Al-Soudais
  102: '/reciters/maher.webp', // Maher Al-Mouaiqly
  92: '/reciters/dossary.webp', // Yasser Al-Dossary
  30: '/reciters/sghamdi.webp', // Saad El-Ghamidi
  31: '/reciters/shuraim.webp', // Saoud Al-Shuraim
  51: '/reciters/basit.webp', // Abdel Bassit Abdel Samad
  112: '/reciters/minshawi.webp', // Mohamed Siddiq El-Menchaoui
  118: '/reciters/husary.webp', // Mahmoud Khalil Al-Housary
  4: '/reciters/shatri.webp', // Abou Bakr Al-Chatri
  5: '/reciters/ajmi.webp', // Ahmed El-Ajami
  89: '/reciters/arrefay.webp', // Hani Arrifai
  86: '/reciters/qatami.webp', // Nasser Al-Qatami
  12: '/reciters/abkar.webp', // Idris Abkar
  81: '/reciters/abbad.webp', // Fares Abbad
  60: '/reciters/basfer.webp', // Abdullah Basfar
  225: '/reciters/ossi.webp', // Abdulrahman Aloosi
  111: '/reciters/jibreel.webp', // Mohamed Jibreel
  221: '/reciters/kurdi.webp', // Raad Al-Kurdi
  272: '/reciters/kameny.webp', // Okasha Kameny
  107: '/reciters/luhaidan.webp', // Mohamed El-Louhaïdan
  245: '/reciters/salimi.webp', // Mansour Al-Salemi
  254: '/reciters/turki.webp', // Badr Al-Turki
  20: '/reciters/jalil.webp', // Khaled Al-Jalil
  1: '/reciters/akhdar.webp', // Ibrahim Al-Akhdar
  62: '/reciters/juhany.webp', // Abdullah Al-Johani
  253: '/reciters/islam_sobhi.webp', // Islam Sobhi
  137: '/reciters/humaid.webp', // Ahmad Talib bin Humaid
  152: '/reciters/salama.webp', // Yasser Salamah
  84: '/reciters/alkabi.webp', // Fawaz Alkabi
  217: '/reciters/bandar.webp', // Bandar Balilah
  76: '/reciters/jaber.webp', // Ali Jaber
  43: '/reciters/budair.webp', // Salah Al-Boudeir
  74: '/reciters/houdaifi.webp', // Ali Al-Houdhayfi
  109: '/reciters/ayyoub.webp', // Mohamed Ayyoub
  125: '/reciters/ismail.webp', // Mustafa Ismail
  21: '/reciters/qahtani.webp', // Khalid Al-Qahtani
  121: '/reciters/albanna.webp', // Mahmoud Ali Albanna
  160: '/reciters/kalbani.webp', // Adel Al-Kalbani
  16: '/reciters/kouchi.webp', // Laayoun El Kouchi
};

export const hasLocalReciterImage = (reciterId: number) =>
  Object.prototype.hasOwnProperty.call(RECITER_IMAGES, reciterId);

const AVATAR_PALETTES = [
  ['#07111d', '#162538', '#e2d0ba', '#7990a1'],
  ['#0d1725', '#1b2d43', '#bfa078', '#8fa3b0'],
  ['#111d2d', '#22364f', '#cbb08a', '#b8c7d2'],
  ['#09131f', '#203249', '#e6d5c2', '#95a7ba'],
  ['#0b1622', '#16293e', '#d7b299', '#7f97ab'],
  ['#07111d', '#1a2b3f', '#e6c8b3', '#aab7c5'],
];

const hashString = (input: string) => {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
  }
  return hash;
};

export const getGeneratedReciterAvatar = (reciter: Reciter) => {
  const hash = hashString(`${reciter.id}-${reciter.name}`);
  const [night, panel, warm, mist] = AVATAR_PALETTES[hash % AVATAR_PALETTES.length];
  const arcOffset = hash % 24;
  const beamShift = hash % 18;
  const sparkX = 30 + (hash % 52);
  const sparkY = 26 + (hash % 18);
  const lineOffset = hash % 14;

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" role="img" aria-label="${reciter.name}">
      <defs>
        <linearGradient id="bg" x1="18" y1="12" x2="142" y2="148" gradientUnits="userSpaceOnUse">
          <stop offset="0" stop-color="${panel}"/>
          <stop offset=".52" stop-color="${night}"/>
          <stop offset="1" stop-color="#050b14"/>
        </linearGradient>
        <radialGradient id="topGlow" cx="50%" cy="18%" r="78%">
          <stop offset="0" stop-color="${warm}" stop-opacity=".34"/>
          <stop offset=".46" stop-color="${mist}" stop-opacity=".12"/>
          <stop offset="1" stop-color="#050b14" stop-opacity="0"/>
        </radialGradient>
        <linearGradient id="beam" x1="48" y1="26" x2="126" y2="138" gradientUnits="userSpaceOnUse">
          <stop offset="0" stop-color="${warm}" stop-opacity=".95"/>
          <stop offset=".58" stop-color="${mist}" stop-opacity=".42"/>
          <stop offset="1" stop-color="#ffffff" stop-opacity=".08"/>
        </linearGradient>
        <linearGradient id="beamSoft" x1="60" y1="22" x2="120" y2="132" gradientUnits="userSpaceOnUse">
          <stop offset="0" stop-color="#ffffff" stop-opacity=".65"/>
          <stop offset=".65" stop-color="${mist}" stop-opacity=".1"/>
          <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
        </linearGradient>
        <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="14" stdDeviation="12" flood-color="#020617" flood-opacity=".52"/>
        </filter>
      </defs>
      <rect width="160" height="160" rx="34" fill="url(#bg)"/>
      <rect width="160" height="160" rx="34" fill="url(#topGlow)"/>
      <circle cx="112" cy="38" r="44" fill="${warm}" opacity=".08"/>
      <path d="M22 122 C46 ${118 + lineOffset} 63 ${104 + lineOffset} 80 86 C96 ${104 + lineOffset} 114 118 138 122" fill="none" stroke="${mist}" stroke-opacity=".18" stroke-width="2"/>
      <path d="M36 130 C49 102 58 80 80 58 C102 80 111 102 124 130 Z" fill="#050b14" opacity=".44" filter="url(#softShadow)"/>
      <path d="M52 ${124 + arcOffset * 0.08} C62 94 74 71 95 49 C109 63 118 80 128 112" fill="none" stroke="url(#beam)" stroke-width="5" stroke-linecap="round" opacity=".92"/>
      <path d="M62 ${123 + beamShift * 0.06} C70 96 80 77 95 58" fill="none" stroke="url(#beamSoft)" stroke-width="2.6" stroke-linecap="round"/>
      <path d="M47 136 H113" stroke="${mist}" stroke-opacity=".18" stroke-width="2"/>
      <g transform="translate(${sparkX} ${sparkY})">
        <path d="M0 -5.5 L1.6 -1.6 L5.5 0 L1.6 1.6 L0 5.5 L-1.6 1.6 L-5.5 0 L-1.6 -1.6 Z" fill="${warm}" opacity=".92"/>
      </g>
      <circle cx="${118 - beamShift * 0.4}" cy="${34 + lineOffset * 0.32}" r="1.8" fill="#ffffff" opacity=".46"/>
      <circle cx="${42 + lineOffset * 0.45}" cy="101" r="1.5" fill="#ffffff" opacity=".24"/>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

export const getReciterImage = (reciter: Reciter) => (
  RECITER_IMAGES[reciter.id] || getGeneratedReciterAvatar(reciter)
);
