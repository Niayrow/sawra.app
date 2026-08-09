# Charte Graphique Sawra

## 1. Intention de marque

Sawra doit transmettre une sensation de calme, de noblesse, de clarté et de précision.  
L'interface doit sembler premium, contemplative et maîtrisée, sans tomber dans l'ornement excessif.

L'expérience visuelle repose sur 5 piliers :

- `Serein` : pas d'agressivité visuelle, pas de saturation excessive.
- `Premium` : matériaux sombres, accents chauds, hiérarchie nette.
- `Clair` : chaque écran doit être compris immédiatement sur mobile.
- `Spirituel sans folklore` : ambiance respectueuse, élégante, contemporaine.
- `Mobile-first` : lisibilité, respiration, zones tactiles généreuses.

## 2. ADN visuel

### 2.1 Signature émotionnelle

L'univers doit évoquer :

- une nuit calme
- une lumière chaude discrète
- une matière lisse, dense, sophistiquée
- une sensation de silence et de contrôle

### 2.2 Ce que l'interface ne doit pas devenir

À éviter :

- couleurs trop vives type néon pur
- empilement de cartes identiques partout
- bordures trop fortes sur tous les blocs
- boutons criards
- gradients multicolores
- ombres trop floues ou trop “gaming”
- trop de texte explicatif au-dessus de la ligne de flottaison

## 3. Palette officielle

### 3.1 Couleurs de base

#### Fond principal

- `--color-brand-night` : `#07111d`
- usage : fond global de l'application, zones les plus profondes

#### Fond secondaire

- `--color-brand-night-soft` : `#0d1725`
- usage : variations de fond, surfaces basses, zones de transition

#### Panneau principal

- `--color-brand-panel` : `#111d2d`
- usage : cartes standards, fonds des modules, surfaces de contenu

#### Panneau renforcé

- `--color-brand-panel-strong` : `#162538`
- usage : cartes importantes, hero, lecteur, panneaux actifs

#### Panneau élevé

- `--color-brand-panel-elevated` : `#1b2d43`
- usage : hover, états renforcés, surfaces à mettre légèrement en avant

### 3.2 Couleurs de structure

#### Ligne faible

- `--color-brand-line` : `#30455c`
- usage : bordures structurelles, séparations, contours neutres

#### Ligne forte

- `--color-brand-line-strong` : `#46607b`
- usage : éléments actifs secondaires, chips, séparateurs plus visibles

### 3.3 Couleurs de texte

#### Texte principal

- `--color-brand-pearl` : `#e6edf5`
- usage : titres, contenu principal, labels importants

#### Texte secondaire

- `--color-brand-soft` : `#aab7c5`
- usage : sous-titres, descriptions, textes d'accompagnement

#### Texte faible

- `--color-brand-mist` : `#8899ad`
- usage : méta-infos, états passifs, indices visuels discrets

### 3.4 Couleurs d'accent

#### Accent chaud principal

- `--color-brand-warm` : `#f0d1bc`
- usage : CTA principal, icônes premium, surbrillance importante, point d'attraction visuelle

#### Accent cuivre moyen

- `--color-brand-gold-400` : `#cea687`
- usage : hover premium, contours actifs, détails nobles

#### Accent cuivre profond

- `--color-brand-gold-500` : `#b98d6e`
- usage : ombres chaudes, micro accents, statuts raffinés

### 3.5 Couleurs acier

- `--color-brand-steel-300` : `#8fa3b0`
- `--color-brand-steel-400` : `#7990a1`
- `--color-brand-steel-500` : `#62798a`

Usage :

- accents froids
- informations techniques
- composants secondaires
- équilibrage de la chaleur du cuivre

### 3.6 Couleurs d'état

#### Danger

- `--color-brand-danger` : `#f08c8c`
- usage : suppression, erreur, alerte

#### Succès

- `--color-brand-success` : `#a7c6b4`
- usage : succès doux, téléchargement réussi, validation non agressive

## 4. Règles d'usage de la couleur

### 4.1 Répartition idéale par écran

Sur un écran moyen :

- `70%` surfaces nuit / panneaux sombres
- `20%` texte clair et lignes de structure
- `10%` accents cuivre ou acier

### 4.2 Règle fondamentale

L'accent chaud ne doit jamais être partout.  
Il doit désigner ce qui compte le plus :

- action principale
- état actif fort
- élément premium
- focus narratif de l'écran

### 4.3 Priorité des couleurs d'action

Ordre d'importance :

1. `Cuivre chaud` pour l'action principale
2. `Acier clair` pour l'action secondaire utile
3. `Texte neutre` pour les actions discrètes
4. `Rouge doux` uniquement pour le destructif

## 5. Matériaux et surfaces

### 5.1 Fond global

Le fond global doit rester sombre, immersif, subtil.

Construction recommandée :

- base `#07111d`
- léger radial chaud très dilué en haut
- léger radial acier très dilué sur un bord
- gradient vertical très doux

Le fond ne doit jamais concurrencer le contenu.

### 5.2 Types de surfaces

#### Surface standard

- fond : `#111d2d` avec légère transparence possible
- bordure : `rgba(166, 184, 203, 0.08 à 0.14)`
- ombre : douce, profonde, peu floue

Usage :

- cartes de contenu
- formulaires
- listes

#### Surface premium

- fond : mélange `#162538` vers `#0f1a29`
- légère lueur interne chaude
- bordure discrète

Usage :

- hero
- lecteur
- carte de reprise
- modules clés de la home

#### Surface interactive

- plus claire que le fond
- hover plus dense
- accent léger au survol

Usage :

- boutons secondaires
- cartes cliquables
- cellules de navigation

### 5.3 Glassmorphism

Autorisé mais contrôlé.

Règles :

- blur mesuré
- transparence modérée
- bordure subtile
- ombre profonde mais pas opaque

Le glassmorphism doit suggérer la sophistication, pas l'effet gadget.

## 6. Formes et géométrie

### 6.1 Philosophie des formes

Les formes doivent être :

- souples
- généreuses
- stables
- jamais agressives

### 6.2 Rayon de bordure

#### Très grand rayon

- `24px à 36px`
- usage : hero, panneaux principaux, lecteurs, grandes cartes

#### Rayon moyen

- `18px à 24px`
- usage : cartes standards, formulaires, blocs de contenu

#### Petit rayon

- `10px à 16px`
- usage : chips larges, boutons compacts, éléments utilitaires

#### Rond complet

- `9999px`
- usage : boutons pilule, indicateurs, badges, avatars ronds

### 6.3 Coins

Préférence :

- coins arrondis réguliers
- pas de formes trop complexes
- pas d'angles durs sur les composants premium

## 7. Typographie

### 7.1 Police

#### Sans-serif principale

- police recommandée : `Manrope`
- usage : toute l'interface
- ton : moderne, premium, lisible, sobre, moins déjà-vu que les sans-serif UI les plus courantes

Pourquoi `Manrope` :

- rend l'interface plus raffinée sans extravagance
- fonctionne très bien sur fond sombre
- garde une excellente lisibilité mobile
- apporte une légère signature premium sans effet “startup générique”
- reste solide sur les titres, boutons, labels et textes de contenu

Règles d'usage de `Manrope` :

- `400` à `500` pour le texte courant
- `600` à `700` pour les labels et boutons
- `800` pour les titres forts
- éviter le `900` partout pour ne pas durcir inutilement l'interface

Fallback recommandé :

- `"Manrope", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`

#### Serif secondaire

- usage : micro touches d'élévation culturelle ou spirituelle
- réservé aux éléments très ciblés

### 7.2 Hiérarchie typographique

#### H1

- poids : `800` à `900`
- usage : hero, titres majeurs
- ton : impactant mais pas criard

#### H2

- poids : `800` à `900`
- usage : titres de sections importantes

#### H3

- poids : `700` à `800`
- usage : titres de cartes, modules

#### Texte courant

- poids : `400` à `500`
- usage : contenu, descriptions

#### Micro-label

- poids : `700` à `900`
- uppercase possible
- espacement augmenté
- usage : overlines, statuts, catégories

### 7.3 Couleurs typographiques

- titre principal : `#f6f8fb` ou `#e6edf5`
- texte normal : `#d0d9e3` à `#e6edf5`
- texte secondaire : `#aab7c5`
- texte passif : `#8899ad`
- texte accentué chaud : `#f0d1bc`

## 8. Iconographie

### 8.1 Style

Les icônes doivent être :

- linéaires
- simples
- cohérentes en épaisseur
- jamais trop décoratives

### 8.2 Couleur des icônes

#### Icône standard

- `#9fb1c3` ou `#d7e4ef`

#### Icône d'accent

- `#f0d1bc`

#### Icône active premium

- `#f0d1bc` avec légère lueur

#### Icône destructive

- `#f08c8c`

## 9. Boutons

### 9.1 Bouton primaire

Usage :

- action la plus importante de la zone
- un seul vrai bouton primaire par bloc majeur

Style :

- fond : gradient chaud `#f0d1bc -> #cea687`
- texte : `#111d2d`
- poids : `700` à `800`
- rayon : pilule ou grand arrondi
- ombre : chaude et modérée

Hover :

- fond légèrement plus clair
- légère élévation

Active :

- micro réduction d'échelle
- contraste conservé

Disabled :

- fond désaturé
- texte affaibli
- aucune lueur

### 9.2 Bouton secondaire

Usage :

- action utile mais non dominante

Style :

- fond : `rgba(17, 29, 45, 0.78)`
- texte : `#d7e4ef`
- bordure : `rgba(166, 184, 203, 0.14)`

Hover :

- fond : `rgba(27, 45, 67, 0.9)`
- bordure cuivre légère

### 9.3 Bouton tertiaire / ghost

Usage :

- liens d'action discrets
- “Voir tout”, “Tous”, “Retour”, etc.

Style :

- pas de fond fort
- texte : `#d0d9e3`
- hover : `#f1d4c1`

### 9.4 Bouton destructif

Usage :

- suppression
- vider le cache
- déconnexion seulement si nécessaire

Style :

- fond rouge doux transparent
- texte rouge clair
- bordure rouge légère

Hover :

- renforcement du fond de quelques points d'opacité

## 10. Inputs et champs

### 10.1 Champ texte

Style :

- fond sombre dense
- bordure neutre
- rayon moyen
- placeholder acier faible

Focus :

- bordure cuivre légère
- fond légèrement plus dense
- pas de glow agressif

### 10.2 Select

Même logique que les champs texte :

- surface sombre
- texte clair
- bordure stable
- focus visible mais raffiné

## 11. Cartes

### 11.1 Carte standard

Usage :

- modules simples
- cartes d'option
- cartes d'information

Style :

- fond sombre semi-opaque
- bordure très légère
- espacement généreux
- icône dans un contenant doux si nécessaire

### 11.2 Carte premium

Usage :

- hero
- reprise de lecture
- mise en avant forte

Style :

- dégradé sombre raffiné
- détail chaud subtil
- forte hiérarchie typographique
- contenu respirant

### 11.3 Carte interactive

Hover :

- fond légèrement plus clair
- légère élévation verticale
- bordure un peu plus chaude

Active :

- effet d'enfoncement très léger

## 12. Chips, badges et indicateurs

### 12.1 Chip chaude

Usage :

- premium
- état sélectionné noble
- méta-information importante

Style :

- fond cuivre translucide
- bordure cuivre
- texte chaud

### 12.2 Chip froide

Usage :

- tags secondaires
- catégories
- indicateurs neutres

Style :

- fond acier translucide
- texte clair
- bordure acier

### 12.3 Badge d'état

#### Succès

- fond vert doux transparent
- texte clair verdâtre

#### Erreur

- fond rouge doux transparent
- texte rosé clair

#### Neutre

- fond panneau élevé
- texte clair

## 13. Ombres, relief et lumière

### 13.1 Philosophie

Les ombres doivent donner de la profondeur, jamais attirer l'attention seules.

### 13.2 Règles

- ombres plutôt verticales
- peu de diffusion excessive
- teinte sombre dominante
- chaleur légère possible sous les CTA premium

### 13.3 Ombre recommandée

#### Carte standard

- profondeur moyenne
- opacité modérée

#### CTA principal

- ombre chaude plus présente

#### Navbar / dock

- ombre dense mais propre
- impression de bloc solide

## 14. Bordures et traits

### 14.1 Bordures par défaut

- fines
- semi-transparentes
- structurelles

### 14.2 Bordures actives

- réchauffées par le cuivre
- jamais trop opaques

### 14.3 Ligne décorative

Autorisée uniquement pour :

- le haut d'un hero
- la séparation premium d'un panneau majeur

## 15. États interactifs

### 15.1 Hover

Le hover doit :

- densifier légèrement le fond
- parfois réchauffer la bordure
- éventuellement faire monter l'élément de `1px à 2px`

### 15.2 Active / tap

Le tap doit :

- réduire légèrement l'échelle
- confirmer l'interaction
- rester rapide

### 15.3 Focus clavier

Le focus doit :

- être visible
- rester premium
- éviter les outlines navigateur bruts si remplacés correctement

Recommandation :

- anneau discret cuivre / acier
- contraste suffisant

### 15.4 Disabled

Un élément désactivé doit :

- perdre en contraste
- perdre ses ombres
- rester lisible mais non attractif

## 16. Motion design

### 16.1 Principe

L'animation doit servir la fluidité, pas la décoration.

### 16.2 Durées recommandées

- micro interaction : `100ms à 160ms`
- hover : `180ms à 280ms`
- transition de panneau : `280ms à 400ms`
- animation d'ambiance : `5s à 7s`

### 16.3 Courbes

Préférence :

- `cubic-bezier(0.16, 1, 0.3, 1)` pour les entrées premium
- `ease` ou équivalent doux pour les micro interactions

### 16.4 Animations autorisées

- flottement très léger du logo
- pulsation douce de glow
- apparition vers le haut
- shimmer de chargement discret
- slide up contrôlé pour le lecteur

### 16.5 Animations à éviter

- rebonds trop forts
- rotations inutiles
- zoom exagéré
- transitions trop longues
- effets flashy

## 17. Navigation

### 17.1 Navbar mobile

Objectif :

- stable
- lisible au pouce
- dense mais respirante

Style :

- dock sombre très net
- état actif par fond renforcé
- icône accentuée chaud
- label très lisible

### 17.2 Sélection active

Un item actif doit avoir :

- fond plus dense
- bordure ou ring subtil
- icône cuivre
- texte plus clair

L'élément actif doit être évident sans être lumineux partout.

## 18. Règles spécifiques mobile-first

### 18.1 Densité

Sur mobile :

- une seule priorité visuelle à la fois
- peu de texte dans les cartes
- boutons larges
- zones tactiles confortables

### 18.2 Scroll

Préférences :

- scroll vertical principal propre
- éviter le scroll horizontal sauf vraie nécessité éditoriale

### 18.3 Espacements

- sections : généreuses
- contenu : respirant
- éviter les blocs collés

### 18.4 Above the fold

Sur la home mobile :

- message principal
- action principale
- reprise ou point d'entrée immédiat

Le reste vient ensuite.

## 19. Hiérarchie de l'accueil

Ordre de priorité visuelle recommandé :

1. Hero
2. Reprise d'écoute
3. Accès rapides
4. Découverte / recommandations
5. Atouts / informations secondaires

Tout ce qui n'est pas essentiel doit descendre plus bas.

## 20. Contraste et accessibilité

### 20.1 Principes

- jamais de texte secondaire trop faible sur fond sombre
- CTA principal toujours très lisible
- états actifs clairement distincts
- informations importantes jamais transmises uniquement par la couleur

### 20.2 Références pratiques

- texte principal : contraste élevé
- texte secondaire : modéré mais confortable
- placeholder : discret sans disparaître
- focus visible clavier

## 21. Ton rédactionnel dans l'UI

La rédaction doit être :

- brève
- claire
- premium
- paisible

Préférer :

- “Reprendre”
- “Explorer les voix”
- “Sourates téléchargées”
- “Vos favoris”

Éviter :

- phrases longues
- jargon technique sur les écrans principaux
- formulations trop froides

## 22. Composants de référence

### Hero

- fond premium sombre
- accent chaud discret
- grand titre fort
- sous-texte bref
- un CTA principal
- un CTA secondaire maximum

### Carte de reprise

- forte lisibilité
- action immédiate
- hiérarchie simple : surah / réciteur / reprendre

### Carte de raccourci

- icône dans pastille
- titre court
- aide en une ligne
- grand touch target

### Carte de liste active

- fond plus dense
- contour élégant
- lueur très subtile

## 23. Correspondance couleur -> usage

### Boutons

- primaire : `#f0d1bc -> #cea687`
- secondaire : `#111d2d` avec bordure `rgba(166,184,203,0.14)`
- destructif : rouge transparent

### Textes

- titre : `#f6f8fb`
- paragraphe : `#d0d9e3`
- secondaire : `#aab7c5`
- méta : `#8899ad`

### Fonds

- app : `#07111d`
- carte normale : `#111d2d`
- carte renforcée : `#162538`
- hover : `#1b2d43`

### Bordures

- standard : `rgba(166,184,203,0.08 à 0.14)`
- active premium : `rgba(206,166,135,0.22 à 0.34)`

## 24. Règles de cohérence

Avant d'ajouter un nouveau composant, vérifier :

1. Est-ce une surface standard, premium ou interactive ?
2. A-t-il vraiment besoin d'un accent chaud ?
3. Est-ce l'action principale ou secondaire ?
4. Le texte peut-il être raccourci ?
5. L'élément reste-t-il clair sur mobile ?
6. Y a-t-il déjà trop de bordures, trop de cartes ou trop de hiérarchie concurrente sur l'écran ?

## 25. Résumé exécutif

Sawra doit conserver cette identité :

- `Fond nuit profond`
- `Surfaces bleu marine raffinées`
- `Accent cuivre chaleureux`
- `Texte perlé très lisible`
- `Angles généreusement arrondis`
- `Relief premium discret`
- `Animations lentes et calmes`
- `Navigation mobile ultra claire`

## 26. Fichier source actuel de référence

Les tokens principaux déjà en place vivent dans :

- `src/index.css`

Cette charte sert de document directeur pour :

- futures refontes
- création de nouveaux composants
- maintien de la cohérence visuelle
- arbitrage UI/UX sur mobile et desktop
