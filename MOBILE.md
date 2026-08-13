# Build mobile natif (Capacitor) — Sawra

Sawra peut être empaqueté en application Android et iOS avec **Capacitor**, incluant un widget d'écran d'accueil synchronisé avec la lecture en cours.

**Identifiants Android (Play Store)**

| Champ | Valeur |
|--------|--------|
| Nom affiché | Sawra |
| Package / applicationId | `app.sawra` |
| versionName | `1.5.0` |
| versionCode | `5` |
| targetSdk | `36` |
| Confidentialité (URL Play) | `https://sawra.app/privacy/` |

## Prérequis

- Node.js 20+
- **Android** : Android Studio, JDK 17+
- **iOS** (macOS uniquement) : Xcode 15+, compte développeur Apple

## Commandes

```bash
npm run cap:sync      # build web + copie vers android/ et ios/
npm run cap:android   # ouvre Android Studio
npm run cap:ios       # ouvre Xcode (macOS)
```

---

## Publication Google Play — checklist

### A. Créer l’app dans Play Console

1. Nom : **Sawra**
2. Package : **`app.sawra`** (définitif après premier AAB)
3. Langue par défaut : **Français (France) – fr-FR**
4. Type : **Appli** · Prix : **Sans frais**
5. Cocher règlement développeurs + lois d’export US → **Créer l’application**

### B. Upload keystore (déjà généré localement)

Le keystore d’upload est déjà créé sur cette machine (hors git) :

- `android/upload-keystore.jks`
- `android/keystore.properties`
- Identifiants : `android/KEYSTORE_CREDENTIALS.txt` (**sauvegarde-le hors du PC**, ne le commit jamais)

Alias : `sawra-upload`

Pour régénérer (seulement si tu perds le keystore **avant** le premier upload Play) :

```bash
cd android
keytool -genkeypair -v -keystore upload-keystore.jks -keyalg RSA -keysize 2048 -validity 10000 -alias sawra-upload
copy keystore.properties.example keystore.properties
```

**Important :** après le premier AAB uploadé sur Play, ne régénère plus ce keystore — Google lie l’app à cette upload key (Play App Signing permet un reset d’upload key en dernier recours).

### C. Build de l’Android App Bundle (AAB)

```bash
npm run build
npx cap sync android
cd android
.\gradlew.bat bundleRelease
```

Ou en une commande : `npm run android:bundle` (puis `cd android && .\gradlew.bat bundleRelease` si le script npm s’arrête après le sync).

Fichier à uploader :

`android/app/build/outputs/bundle/release/app-release.aab`

Activer **Play App Signing** (clé d’app gérée par Google) lors du premier upload — recommandé.

### D. Fiche Play Store (assets)

- Icône **512×512** PNG
- Feature graphic **1024×500**
- Au moins **2 captures** téléphone
- Description courte (~80 car.) + longue
- URL confidentialité : **`https://sawra.app/privacy/`**
- Catégorie suggérée : **Musique et audio**
- Annonces : **Non**
- E-mail de contact développeur

### E. Déclarations contenu (App content)

**Data safety (à aligner sur la politique) :**

- Compte / auth : oui si login GoMuslimLife (Supabase)
- Sync favoris / reprise / préférences : oui (cloud)
- Identifiant appareil local : oui (sync multi-appareils)
- Analytics performance (Vercel) : oui, anonymisées
- Publicité / vente de données : **non**
- Fichiers audio : streaming tiers mp3quran (pas d’hébergement Sawra)

**Autres formulaires :** classification IARC, public cible, sécurité des données, etc.

### F. Tests puis production (compte personnel)

1. Upload AAB sur track **interne** (smoke test)
2. Puis track **test fermé** : ≥ **12 testeurs** opt-in, ~**14 jours**
3. Demande d’accès **production** + review Google

---

## Widget Android

1. Compilez et installez l'app sur un appareil ou émulateur.
2. Appui long sur l'écran d'accueil → **Widgets** → **Sawra**.
3. Le widget affiche la sourate, le récitateur et la progression de la dernière lecture.
4. Un appui ouvre l'app sur l'onglet Sourates.

Le plugin natif `WidgetBridge` écrit dans `sawra_widget_prefs` et rafraîchit `SawraWidgetProvider`.

## Widget iOS (WidgetKit)

Sur macOS, dans Xcode :

1. Ouvrez `ios/App/App.xcodeproj`.
2. **File → Add Target → Widget Extension** (ou ajoutez manuellement le dossier `ios/SawraWidget/`).
3. Activez **App Groups** pour l'app principale et l'extension : `group.app.sawra` (à aligner sur `app.sawra` si vous republiez iOS).
4. Ajoutez `WidgetBridgePlugin.swift` au target App.
5. Partagez `WidgetSharedStore.swift` entre l'app et l'extension.
6. Build & run sur appareil iOS 14+.

## Comparateur A/B

Onglet **Comparer** dans la barre de navigation :

- Choisissez une sourate et deux récitateurs (voix A / voix B).
- Lecture exclusive : une seule voix à la fois.
- **Basculer A ↔ B** conserve la position de lecture pour comparer instantanément.

URL directe : `/?tab=compare`

## Deep link widget

- Android : `sawra://surah/{id}` (intent sur `MainActivity`)
- iOS : configurez le scheme `sawra` dans Info.plist si besoin

## TWA (alternative)

Pour publier la PWA via **Trusted Web Activity** sans widget natif, utilisez [Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap) avec l'URL de production. Les widgets nécessitent toutefois Capacitor ou du code natif.
