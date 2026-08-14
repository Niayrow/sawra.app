const GRAPH = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': 'https://sawra.app/#organization',
      name: 'Sawra',
      url: 'https://sawra.app/',
      description: 'Sawra est un lecteur coranique web et PWA, gratuit et sans publicité.',
      logo: {
        '@type': 'ImageObject',
        url: 'https://sawra.app/icon.png',
        width: 512,
        height: 512,
      },
      image: 'https://sawra.app/og-image.png',
    },
    {
      '@type': 'WebSite',
      '@id': 'https://sawra.app/#website',
      url: 'https://sawra.app/',
      name: 'Sawra',
      alternateName: ['Sawra Coran', 'Lecteur Coranique Sawra'],
      description:
        'Écoutez le Coran en ligne gratuitement avec les grands récitateurs. Sans publicité, hors-ligne et synchronisation multi-appareils.',
      inLanguage: 'fr-FR',
      publisher: { '@id': 'https://sawra.app/#organization' },
    },
    {
      '@type': ['WebApplication', 'SoftwareApplication'],
      '@id': 'https://sawra.app/#app',
      name: 'Sawra',
      url: 'https://sawra.app/',
      applicationCategory: 'MultimediaApplication',
      applicationSubCategory: 'Quran audio player',
      operatingSystem: 'Web, Android, iOS',
      browserRequirements: 'Requires JavaScript. Modern browser recommended.',
      inLanguage: 'fr-FR',
      isAccessibleForFree: true,
      description:
        'Sawra permet d’écouter le Coran en streaming (sources mp3quran.net), de télécharger des sourates pour le hors-ligne, de gérer une Bibliothèque (signets, historique, streak), de s’entraîner avec le Quiz et la page Apprendre, et de synchroniser favoris et reprise avec un compte. Gratuit et sans publicité.',
      image: 'https://sawra.app/og-image.png',
      screenshot: 'https://sawra.app/og-image.png',
      featureList: [
        'Streaming Coran audio (mp3quran.net)',
        'Grands récitateurs (Al-Afasy, Soudais, Minshawi…)',
        'Bibliothèque : signets de versets et notes',
        'Historique d’écoute et streak (compte requis)',
        'Quiz Coran — devinez la sourate',
        'Apprendre : flou, écoute, révélation',
        'Radio Coran en continu',
        'Téléchargement hors-ligne',
        'Sync multi-appareils avec compte GoMuslimLife',
        'Comparaison de récitateurs',
        'Lecture des versets synchronisée',
        'Suppression du compte (RGPD)',
        'Installation PWA',
        '100 % gratuit, sans publicité',
      ],
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'EUR',
        availability: 'https://schema.org/InStock',
      },
      publisher: { '@id': 'https://sawra.app/#organization' },
    },
    {
      '@type': 'FAQPage',
      '@id': 'https://sawra.app/#faq',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'Sawra est-il gratuit ?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Oui. Sawra est 100 % gratuit et sans publicité. Vous pouvez écouter le Coran en streaming sans créer de compte.',
          },
        },
        {
          '@type': 'Question',
          name: 'D’où viennent les audios du Coran ?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Les flux audio proviennent de mp3quran.net. Sawra ne revend pas d’écoute et n’héberge pas les fichiers MP3.',
          },
        },
        {
          '@type': 'Question',
          name: 'Puis-je écouter le Coran hors ligne ?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Oui. Vous pouvez télécharger des sourates sur votre appareil pour les réécouter sans connexion.',
          },
        },
        {
          '@type': 'Question',
          name: 'Sawra fonctionne-t-il sur mobile ?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Oui. Sawra est une application web progressive (PWA) installable sur Android et iOS, avec une expérience optimisée mobile.',
          },
        },
        {
          '@type': 'Question',
          name: 'Comment fonctionnent les signets et la Bibliothèque ?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Vous pouvez marquer des versets précis avec des notes personnelles depuis le lecteur. Retrouvez-les dans l’onglet Bibliothèque, avec vos récitateurs favoris.',
          },
        },
        {
          '@type': 'Question',
          name: 'Qu’est-ce que le streak et l’historique d’écoute ?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Avec un compte GoMuslimLife, Sawra enregistre votre temps d’écoute, un calendrier sur 7 jours et un streak (au moins 1 minute par jour). Ces données sont synchronisées dans le cloud.',
          },
        },
        {
          '@type': 'Question',
          name: 'Qu’est-ce que le Quiz Coran et la page Apprendre ?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Le Quiz vous invite à deviner la sourate à partir d’un extrait audio. La page Apprendre propose un entraînement verset par verset avec flou, écoute et révélation du texte.',
          },
        },
        {
          '@type': 'Question',
          name: 'Puis-je supprimer mon compte et mes données ?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Oui. Depuis l’onglet Connexion, vous pouvez supprimer définitivement votre compte et toutes vos données Sawra (droit d’effacement RGPD). Le compte GoMuslimLife associé est également fermé.',
          },
        },
        {
          '@type': 'Question',
          name: 'Le compte GoMuslimLife est-il partagé ?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Oui. Un même compte GoMuslimLife sert pour Sawra et gomuslimlife.com : favoris, signets, historique, reprise et préférences sont synchronisés entre appareils.',
          },
        },
      ],
    },
  ],
};

export function JsonLd() {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(GRAPH) }}
    />
  );
}
