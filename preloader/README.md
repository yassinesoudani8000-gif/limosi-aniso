# Preloader LIMOSI · « Imperial Signature »

Préchargeur d'entrée pour le site LIMOSI : une intro de marque en 3D (CSS et canvas) qui suit le chargement réel de la page, puis s'efface pour révéler le site.

- **Zéro dépendance** : aucun framework, aucun CDN, aucune requête externe.
- **Hors ligne et en `file://`** : fonctionne tel quel, sans serveur.
- **Progression réelle** : documents, images, polices et évènement `load`, avec une durée minimale garantie.
- **Accessible** : texte pour lecteurs d'écran, passage avec la touche Échap, réduction des mouvements respectée.
- **Replis automatiques** : retrait par CSS après 10 s, retrait immédiat si le script ne charge pas, rien à afficher sans JavaScript.

## Contenu du dossier

| Fichier | Rôle |
| --- | --- |
| `limosi-preloader.css` | Styles, jetons de couleur, animations 3D, filet de sécurité CSS |
| `limosi-preloader.js` | Progression, intro et sortie, particules canvas, API publique |
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

Coller ce bloc après la feuille de style du site. Le script d'initialisation doit rester inline et placé avant le premier rendu : il masque les états de départ dès le début. Le script principal est en `defer` et ne bloque pas le rendu.

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

  <div class="lm-layer lm-layer--top"><span class="lm-seam"></span></div>
  <div class="lm-layer lm-layer--bottom"><span class="lm-seam"></span></div>

  <canvas class="lm-dust" aria-hidden="true"></canvas>
  <div class="lm-glow" aria-hidden="true"></div>

  <span class="lm-corner lm-corner--tl" aria-hidden="true"></span>
  <span class="lm-corner lm-corner--tr" aria-hidden="true"></span>
  <span class="lm-corner lm-corner--bl" aria-hidden="true"></span>
  <span class="lm-corner lm-corner--br" aria-hidden="true"></span>

  <div class="lm-stage" aria-hidden="true">
    <div class="lm-hero">
      <div class="lm-emblem">
        <div class="lm-gyro">
          <span class="lm-orbit lm-orbit--a"><i></i></span>
          <span class="lm-orbit lm-orbit--b"><i></i></span>
          <svg class="lm-mark" viewBox="0 0 64 64" focusable="false">
            <defs>
              <linearGradient id="lm-gold" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="64" y2="64">
                <stop offset="0" stop-color="#f6e7c4"/>
                <stop offset="0.55" stop-color="#d1b07b"/>
                <stop offset="1" stop-color="#8d7143"/>
              </linearGradient>
            </defs>
            <path class="lm-tile" d="M15.5 1.5h33a14 14 0 0 1 14 14v33a14 14 0 0 1-14 14h-33a14 14 0 0 1-14-14v-33a14 14 0 0 1 14-14z"/>
            <path class="lm-stroke lm-frame" pathLength="100" data-lm-delay="0" d="M15.5 1.5h33a14 14 0 0 1 14 14v33a14 14 0 0 1-14 14h-33a14 14 0 0 1-14-14v-33a14 14 0 0 1 14-14z"/>
            <path class="lm-stroke lm-stem" pathLength="100" data-lm-delay="220" d="M20 15v32h29"/>
            <path class="lm-stroke lm-inlay" pathLength="100" data-lm-delay="780" d="M28 47h21"/>
          </svg>
        </div>
      </div>

      <div class="lm-word" data-text="LIMOSI"><span class="lm-letter">L</span><span class="lm-letter">I</span><span class="lm-letter">M</span><span class="lm-letter">O</span><span class="lm-letter">S</span><span class="lm-letter">I</span></div>
      <span class="lm-rule"></span>
      <p class="lm-tag">Imperial Signature</p>
    </div>
  </div>

  <div class="lm-foot" aria-hidden="true">
    <div class="lm-progress"><span class="lm-progress__bar"></span></div>
    <div class="lm-count">
      <span>Wird geladen</span>
      <span class="lm-count__value"><span data-lm-count>0</span>%</span>
    </div>
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

Si le site tient dans un seul fichier HTML, coller le CSS dans une balise `<style>` du `<head>`. Coller le JavaScript dans une balise `<script>` placée **après** le bloc HTML du preloader, en fin de `<body>` (il lit le DOM au chargement). Le script d'initialisation reste dans le `<head>`, et l'attribut `onerror` n'est alors pas nécessaire.

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
| `minDuration` | `2400` | Durée minimale de l'intro. La sortie ne démarre pas avant. |
| `maxDuration` | `7000` | Limite de sécurité : la sortie est forcée passé ce délai. Si `maxDuration` est inférieur à `minDuration`, il devient `minDuration + 2000`. |
| `once` | `false` | Si `true`, l'intro n'est jouée qu'une fois par session (`sessionStorage`). Les chargements suivants retirent l'overlay tout de suite. |

Le délai du filet CSS se règle avec `--lm-failsafe` dans `limosi-preloader.css` (défaut `10s`).

### Couleurs et typographie

Les jetons sont déclarés dans `:root`, en tête de `limosi-preloader.css` : `--lm-navy`, `--lm-navy-deep`, `--lm-cream`, `--lm-gold`, `--lm-gold-light`, `--lm-gold-deep`, `--lm-serif`, `--lm-sans`.

## API

| Élément | Rôle |
| --- | --- |
| `window.LimosiPreloader.skip()` | Passe l'intro et lance la sortie. |
| `window.LimosiPreloader.isDone()` | Renvoie `true` une fois l'overlay retiré. |
| `limosi:ready` (sur `window`) | Émis à la fin de la sortie. |

La touche **Échap** passe l'intro.

## Comportement

- **Progression** : la barre suit l'avancement réel du chargement (document, images, polices, évènement `load`). Le compteur ne va jamais plus vite que le temps écoulé.
- **Intro** (environ 2,4 s) : lueur, tuile du blason qui se déploie, tracé du « L » doré, lettres qui montent, tagline, filet et pied de page.
- **Sortie** (environ 1,5 s) : le contenu, les coins et les particules s'effacent, les deux rideaux se séparent et révèlent le site.
- **Réduction des mouvements** (`prefers-reduced-motion: reduce`) : pas de 3D ni de particules, un simple fondu de 480 ms, durée totale de 700 ms au plus.
- **Souris** : le blason s'incline doucement avec le pointeur (désactivé en mode réduit et sur écran tactile).
- **Sans JavaScript** : une balise `<noscript>` masque l'overlay.
- **Script introuvable** : `onerror` retire l'overlay et la classe `lm-js`.
- **Script bloqué** : après 10 s, le filet CSS retire l'overlay, même si le script ne répond pas.

## Compatibilité et performance

- Navigateurs récents (Chrome, Edge, Firefox, Safari) : Web Animations API, canvas 2D, `clip-path`.
- Si `element.animate` n'est pas disponible, l'intro est ignorée et le site s'affiche immédiatement.
- Animations sur `transform`, `opacity` et `clip-path`. Les particules sont limitées à 110, et le rendu est plafonné à un ratio de pixels de 2.
- Poids non compressé : CSS environ 11 Ko, JS environ 16 Ko. Compresser en production (gzip ou brotli).

## Polices

Le preloader désigne les polices « Limosi Serif » et « Limosi Sans ». Elles doivent être déclarées par `@font-face` dans le site. Sans elles, le texte s'affiche en Georgia et Arial.

## Vérifications

Tests automatisés dans Chromium headless, rendu logiciel :

- séquence complète : évènement `limosi:ready` émis, overlay retiré en 4 à 5 s ;
- réduction des mouvements : overlay retiré en moins de 2 s ;
- script bloqué : overlay retiré en moins de 800 ms ;
- filet CSS sans JavaScript : overlay masqué à 10 s ;
- `once` : pas d'intro au second chargement ;
- aucune erreur console ; pas de débordement horizontal en 390 × 844, 844 × 390 et 768 × 1024.

Ces mesures ont été faites sans GPU. Valider sur appareils réels (iPhone et Android d'entrée de gamme) avant la mise en production.

## Points d'attention

- La 3D est volontairement réalisée en CSS et canvas, sans WebGL ni Three.js : le preloader reste autonome, hors ligne et en `file://`.
- Le libellé « Wird geladen » est en allemand, comme le site exporté. Le modifier dans le bloc HTML (les `<span>` de `.lm-count` et `.lm-sr`) pour une autre langue.
