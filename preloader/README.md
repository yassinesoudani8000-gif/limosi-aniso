# Preloader LIMOSI · « Minimal de luxe »

Préchargeur d'entrée du site LIMOSI : fond bleu nuit, mot LIMOSI en or qui se lève, reflet doré qui le balaie, progression discrète. Typographie seule : pas d'image, pas de 3D, aucune dépendance.

- **Très léger** : 6,3 Ko de CSS et 9,4 Ko de JavaScript non compressés, soit environ 5,6 Ko compressés.
- **Progression réelle** : document, images, polices et évènement `load`, avec une durée minimale garantie.
- **Hors ligne et en `file://`** : aucune requête externe.
- **Accessible** : texte pour lecteurs d'écran, passage avec la touche Échap, réduction des mouvements respectée.
- **Replis automatiques** : sans JavaScript, l'overlay est masqué. Script introuvable, il est retiré aussitôt. Script bloqué, il disparaît au plus tard après 10 s.

## Contenu du dossier

| Fichier | Rôle |
| --- | --- |
| `limosi-preloader.css` | Styles, jetons de couleur, intro en CSS, filet de sécurité |
| `limosi-preloader.js` | Progression, sortie en fondu, API publique |
| `index.html` | Démo : bloc d'intégration complet, sur une maquette de site |
| `README.md` | Ce guide |

## Démo

Ouvrir `index.html` dans un navigateur, ou lancer un serveur local :

```bash
cd preloader
python3 -m http.server 8080
```

Puis ouvrir `http://localhost:8080`. Le bouton « Rejouer l'intro » de la maquette relance l'animation.

## Intégration

L'intégration tient en trois étapes. Les blocs ci-dessous sont repris tels quels de `index.html`.

### 1. Dans le `<head>`

Coller ce bloc après la feuille de style du site. Le script d'initialisation doit rester inline et placé avant le premier rendu : il pose la classe `lm-js`, qui active l'intro. Le script principal est en `defer` et ne bloque pas le rendu.

```html
<link rel="stylesheet" href="limosi-preloader.css">
<script>
  window.LIMOSI_PRELOADER = { minDuration: 2400, maxDuration: 7000, once: false };
  (function () {
    var d = document.documentElement;
    d.classList.add('lm-js');
    try {
      if (window.LIMOSI_PRELOADER.once && sessionStorage.getItem('limosi-preloader-seen')) {
        d.classList.add('lm-skip');
      }
    } catch (e) {}
  })();
</script>
<script src="limosi-preloader.js" defer
        onerror="var p=document.getElementById('limosi-preloader');if(p)p.remove();document.documentElement.classList.remove('lm-js')"></script>
<noscript><style>.lm-preloader { display: none !important; }</style></noscript>
```

Adapter les chemins à l'arborescence du site.

### 2. Juste après `<body>`

Coller le bloc suivant comme **premier élément** du `<body>`. Il est autonome : toutes ses classes sont préfixées `lm-`.

```html
<div id="limosi-preloader" class="lm-preloader" role="status" aria-live="polite">
  <span class="lm-sr">LIMOSI, Imperial Signature. Wird geladen.</span>

  <div class="lm-stage" aria-hidden="true">
    <div class="lm-word">
      <div class="lm-word__text" data-text="LIMOSI">LIMOSI</div>
    </div>
    <p class="lm-tag">Imperial Signature</p>
  </div>

  <div class="lm-foot" aria-hidden="true">
    <div class="lm-track"><span class="lm-bar"></span></div>
    <div class="lm-count"><span data-lm-count>0</span>%</div>
  </div>
</div>
```

### 3. Rien d'autre à modifier

Le preloader ne modifie ni le contenu ni les styles du site. Si le site doit lancer ses propres animations d'entrée après l'intro, il peut écouter l'évènement `limosi:ready` :

```js
window.addEventListener('limosi:ready', lancerAnimations);
```

Ne masquer aucun contenu du site en attendant cet évènement : si le script du preloader ne charge pas, il n'est jamais émis.

### Variante : fichier HTML unique (export)

Si le site tient dans un seul fichier HTML, coller le CSS dans une balise `<style>` du `<head>`. Coller le JavaScript dans une balise `<script>` placée **après** le bloc HTML du preloader, en fin de `<body>` (il lit le DOM au chargement). Le script d'initialisation et la règle `<noscript>` restent dans le `<head>` ; l'attribut `onerror` n'est alors pas nécessaire.

## Configuration

```js
window.LIMOSI_PRELOADER = {
  minDuration: 2400, // durée minimale de l'intro, en ms
  maxDuration: 7000, // sortie forcée au-delà, même si le chargement n'est pas fini
  once: false        // true : intro une seule fois par session
};
```

| Option | Défaut | Effet |
| --- | --- | --- |
| `minDuration` | `2400` | Durée minimale, comptée depuis le début de la navigation. La sortie ne démarre pas avant. |
| `maxDuration` | `7000` | Limite de sécurité : la sortie est forcée passé ce délai. Si `maxDuration` est inférieur à `minDuration`, il devient `minDuration + 2000`. |
| `once` | `false` | Si `true`, l'intro n'est jouée qu'une fois par session (`sessionStorage`). Les chargements suivants retirent l'overlay tout de suite. |

Le délai du filet CSS se règle avec `--lm-failsafe` (défaut `10s`) dans `limosi-preloader.css`.

### Couleurs, typographie et réglages visuels

- **Jetons** : déclarés dans `:root`, en tête de `limosi-preloader.css` (`--lm-navy`, `--lm-navy-deep`, `--lm-cream`, `--lm-gold`, `--lm-gold-light`, `--lm-gold-deep`, `--lm-serif`, `--lm-sans`).
- **Reflet** : couleur dans `.lm-word__text::after` (`rgba(255, 238, 196, 0.95)`). Vitesse et fréquence dans `.lm-js .lm-word__text::after` (cycle de `4.4s`, première passe après `1.2s`).
- **Progression** : pour la retirer, supprimer le bloc `.lm-foot` du markup. Le script tolère son absence.

## API

| Élément | Rôle |
| --- | --- |
| `window.LimosiPreloader.skip()` | Passe l'intro et lance la sortie. |
| `window.LimosiPreloader.isDone()` | Renvoie `true` une fois l'overlay retiré. |
| `limosi:ready` (sur `window`) | Émis à la fin de la sortie. |

La touche **Échap** passe l'intro.

## Comportement

- **Progression** : la barre suit l'avancement réel du chargement (document, images, polices, évènement `load`). Le compteur ne va jamais plus vite que le temps écoulé.
- **Intro** (environ 2 s) : le mot se lève depuis un masque, un reflet doré passe à 1,2 s, puis la tagline apparaît. Tant que le chargement continue, il repasse toutes les 4,4 s.
- **Sortie** (environ 1,3 s) : le mot s'élève et s'efface, la progression disparaît, puis le voile se dissout et révèle le site.
- **Réduction des mouvements** (`prefers-reduced-motion: reduce`) : aucune animation. Le mot reste fixe et le voile disparaît en 480 ms.
- **Sans JavaScript** : une balise `<noscript>` masque l'overlay.
- **Script introuvable** : `onerror` retire l'overlay et la classe `lm-js`.
- **Script bloqué** : après 10 s, le filet CSS retire l'overlay.

## Compatibilité et performance

- Navigateurs récents : Web Animations API et `background-clip: text` (Chrome, Edge, Firefox, Safari).
- Si `element.animate` n'est pas disponible, le voile est retiré sans fondu.
- Animations sur `transform` et `opacity`. Le reflet déplace un arrière-plan sur la seule zone du mot : pas de filtre, pas de canvas, pas d'image.
- Poids : 6,3 Ko de CSS et 9,4 Ko de JavaScript non compressés, environ 2,3 Ko et 3,3 Ko compressés.

## Polices

Le preloader désigne les polices « Limosi Serif » et « Limosi Sans ». Elles doivent être déclarées par `@font-face` dans le site. Sans elles, le texte s'affiche en Georgia et Arial.

## Vérifications

Tests automatisés dans Chromium headless, rendu logiciel (sans GPU) :

- séquence complète : `limosi:ready` émis, overlay retiré vers 4 s ;
- `file://` : même comportement, aucune erreur console ;
- réduction des mouvements : aucune animation, overlay retiré vers 2 s ;
- script abandonné : overlay retiré en moins de 800 ms ;
- script vide : overlay masqué à 10 s par le filet CSS ;
- Échap : sortie environ 2,5 s après la touche ;
- `once` : pas d'intro au second chargement ;
- sans JavaScript : overlay masqué, maquette visible ;
- mobile 390 × 844 : aucun débordement horizontal.

Valider sur appareils réels (iPhone et Android d'entrée de gamme) avant la mise en production.

## Points d'attention

- Le texte visible se limite à « LIMOSI », « Imperial Signature » et au pourcentage. Le libellé pour lecteurs d'écran, « Wird geladen », est en allemand (`.lm-sr`) : à adapter à la langue du site.
- **Content-Security-Policy stricte** : sans `'unsafe-inline'`, le script d'initialisation est bloqué. La configuration `window.LIMOSI_PRELOADER` est alors ignorée, et l'intro CSS n'est pas jouée : le mot reste fixe, puis le voile disparaît. Autoriser le hash du script d'initialisation pour retrouver l'intro.
