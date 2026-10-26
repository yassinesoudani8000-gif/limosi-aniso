/* ============================================================
   ANISO — Preloader
   Combine 25 images du domaine Ksar Ezzit en mosaïque de fond.
   Le mot ANISO reste fixe au centre.
   ============================================================ */

// 25 images issues du site ksar-ezzit.de (>= 20)
const IMAGES = [
  "https://ksar-ezzit.de/images/hero-open-stone-mill-2026.webp",
  "https://ksar-ezzit.de/images/hero-estate-panorama-2026.webp",
  "https://ksar-ezzit.de/images/olive-harvest-optimized.webp",
  "https://ksar-ezzit.de/images/hero-historic-double-press-2026.webp",
  "https://ksar-ezzit.de/images/hero-villa-kssour-blue-sky-2026.webp",
  "https://ksar-ezzit.de/images/estate-animals-optimized.webp",
  "https://ksar-ezzit.de/images/aniso-hero-gold-crest-transparent-2026.webp",
  "https://ksar-ezzit.de/images/ksar-ezzit-heritage-aniso-edited.webp",
  "https://ksar-ezzit.de/images/hassouna-jdidi-1914.webp",
  "https://ksar-ezzit.de/images/aniso-lassad-together-2026.webp",
  "https://ksar-ezzit.de/images/villa-kssour-2026.webp",
  "https://ksar-ezzit.de/images/villa-huillerie-2026.webp",
  "https://ksar-ezzit.de/images/villa-tabarka-2026.webp",
  "https://ksar-ezzit.de/images/villa-bergerie-2026.webp",
  "https://ksar-ezzit.de/images/les-maison-hammamet-2026.webp",
  "https://ksar-ezzit.de/images/ksar-ezzit-camper-welcome.webp",
  "https://ksar-ezzit.de/images/aniso-car-heritage-2026.webp",
  "https://ksar-ezzit.de/images/olive-tree-heart-2026.webp",
  "https://ksar-ezzit.de/images/aniso-olive-grove-walk-2026.webp",
  "https://ksar-ezzit.de/images/aniso-private-tasting-2026.webp",
  "https://ksar-ezzit.de/images/aniso-bottle-farmer-2026.webp",
  "https://ksar-ezzit.de/images/press-open-air-stone-mill-2026.webp",
  "https://ksar-ezzit.de/images/aniso-kraft-olive-heritage-tree-2026.webp",
  "https://ksar-ezzit.de/images/aniso-private-collection-harvest-2026.jpg",
  "https://ksar-ezzit.de/images/aniso-quality-logistics-2026.webp"
];

const COLS = 8;
const ROWS = 9;                 // 8 x 9 = 72 tuiles (mosaïque plein écran)
const TOTAL_TILES = COLS * ROWS;

const collage = document.getElementById("collage");
const counterEl = document.getElementById("counter");
const barEl = document.getElementById("bar");
const preloader = document.getElementById("preloader");
const site = document.getElementById("site");

// Ordre mélangé pour que les tuiles voisines diffèrent
function shuffled(arr){
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
const order = shuffled(IMAGES);

// --- Construit la mosaïque ---
const built = [];
for (let i = 0; i < TOTAL_TILES; i++){
  const src = order[i % order.length];
  const tile = document.createElement("div");
  tile.className = "tile";
  const img = document.createElement("img");
  img.loading = "eager";
  img.decoding = "async";
  img.alt = "";
  img.src = src;
  img.style.animationDelay = (-(i * 0.37)).toFixed(2) + "s";
  img.addEventListener("load", onAsset);
  img.addEventListener("error", () => { tile.classList.add("broken"); onAsset(); });
  tile.appendChild(img);
  collage.appendChild(tile);
  built.push(img);
}

// --- Progression de chargement ---
let loaded = 0;
const total = IMAGES.length;            // on compte chaque image distincte une fois
const loadedSet = new Set();
function onAsset(){
  // déduplique par src pour la progression
  const src = this && this.src ? this.src : null;
  if (src && loadedSet.has(src)) return;
  if (src) loadedSet.add(src);
  loaded++;
  targetPct = Math.min(100, Math.round((loadedSet.size / total) * 100));
  if (loadedSet.size >= total) allLoaded = true;
}

let targetPct = 0;
let shownPct = 0;
let allLoaded = false;
const MIN_TIME = 2600;                  // temps d'affichage minimal (ms)
const MAX_TIME = 9000;                  // sécurité si le réseau bloque
const start = performance.now();

counterEl.textContent = "0";

function tick(now){
  // easing du compteur vers la cible
  shownPct += (targetPct - shownPct) * 0.08;
  if (targetPct - shownPct < 0.4) shownPct = targetPct;
  const v = Math.round(shownPct);
  counterEl.textContent = String(v);
  barEl.style.width = v + "%";

  const elapsed = now - start;
  const ready = (allLoaded || elapsed > MAX_TIME) && elapsed > MIN_TIME && v >= 100;

  if (ready){
    finish();
    return;
  }
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);

let finished = false;
function finish(){
  if (finished) return;
  finished = true;
  counterEl.textContent = "100";
  barEl.style.width = "100%";
  setTimeout(() => {
    preloader.classList.add("done");
    site.classList.remove("hidden");
    // libère les ressources après la transition
    setTimeout(() => { preloader.style.display = "none"; }, 1200);
  }, 350);
}
