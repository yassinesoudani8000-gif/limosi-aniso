/* ==========================================================================
   LIMOSI · Preloader « Minimal de luxe »
   limosi-preloader.js — aucune dépendance.

   - L'intro (lever du mot, reflet doré, tagline) est en CSS et démarre au premier rendu.
   - Ce script suit le chargement réel (document, images, polices, load), respecte la
     durée minimale et pilote la sortie : un fondu en Web Animations API.
   - Évènement « limosi:ready » à la fin. API : window.LimosiPreloader.skip() et isDone().
   - Configuration : window.LIMOSI_PRELOADER = { minDuration, maxDuration, once }
     (à définir dans le <head>, avant ce script : voir README.md).
   ========================================================================== */
(function (window, document) {
  'use strict';

  var root = document.getElementById('limosi-preloader');
  if (!root) { return; }

  var html = document.documentElement;
  var user = window.LIMOSI_PRELOADER || {};
  var cfg = {
    minDuration: toNumber(user.minDuration, 2400),  // durée minimale, en ms depuis la navigation
    maxDuration: toNumber(user.maxDuration, 7000),  // sortie forcée au-delà, en ms
    once: !!user.once                                // une seule fois par session
  };
  if (cfg.maxDuration < cfg.minDuration) { cfg.maxDuration = cfg.minDuration + 2000; }

  var STORAGE_KEY = 'limosi-preloader-seen';        // identique dans le <head>
  var SMOOTH = 'cubic-bezier(.4, 0, .2, 1)';

  var reduceMotion = matches('(prefers-reduced-motion: reduce)');
  var el = {
    word: one('.lm-word'),
    tag: one('.lm-tag'),
    foot: one('.lm-foot'),
    bar: one('.lm-bar'),
    count: one('[data-lm-count]')
  };

  // ----- Temps : depuis la navigation, pour que l'intro ne soit pas coupée ----
  var origin = (window.performance && performance.now) ? 0 : Date.now();
  function now() { return (window.performance && performance.now) ? performance.now() : Date.now(); }
  function elapsed() { return now() - origin; }

  // ----- État -------------------------------------------------------------
  var done = false;        // overlay retiré
  var exiting = false;     // fondu de sortie lancé
  var finishing = false;   // on n'attend plus : le compteur va vers 100 %
  var minDone = false;     // durée minimale écoulée
  var forced = false;      // durée maximale atteinte, ou skip()
  var shown = 0;           // valeur affichée (0 → 1)
  var lastPct = -1;
  var lastStamp = 0;
  var real = 0;            // progression réelle estimée (0 → 1)
  var parts = { doc: 0, img: 0, fonts: 0, load: 0 };
  var weights = { doc: 0.2, img: 0.4, fonts: 0.15, load: 0.25 };
  var rafId = 0;

  // ----- Utilitaires ------------------------------------------------------
  function one(sel) { return root.querySelector(sel); }
  function toNumber(v, fallback) { var n = parseFloat(v); return isFinite(n) ? n : fallback; }
  function matches(query) { return !!(window.matchMedia && window.matchMedia(query).matches); }

  function anim(node, frames, opts) {
    if (!node || typeof node.animate !== 'function') { return null; }
    opts.fill = opts.fill || 'both';
    try { return node.animate(frames, opts); } catch (err) { return null; }
  }

  function whenDone(animation, fallbackMs) {
    if (animation && animation.finished) {
      animation.finished.then(finalize, finalize);
    } else {
      window.setTimeout(finalize, fallbackMs);
    }
  }

  // ----- Progression réelle -----------------------------------------------
  function setPart(key, value) {
    if (value > parts[key]) { parts[key] = Math.min(1, value); }
    real = 0;
    for (var k in weights) {
      if (Object.prototype.hasOwnProperty.call(weights, k)) { real += weights[k] * parts[k]; }
    }
  }

  function trackLoading() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () { setPart('doc', 1); });
    } else {
      setPart('doc', 1);
    }

    if (document.readyState === 'complete') {
      setPart('load', 1);
    } else {
      window.addEventListener('load', function () { setPart('load', 1); });
    }

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () { setPart('fonts', 1); }, function () { setPart('fonts', 1); });
    } else {
      setPart('fonts', 1);
    }

    // Seules les images « eager » comptent : les « lazy » ne bloquent pas l'entrée.
    var pending = Array.prototype.filter.call(document.images, function (img) {
      return !img.complete && img.getAttribute('loading') !== 'lazy';
    });
    if (!pending.length) { setPart('img', 1); return; }
    var count = 0;
    var onImage = function () { count += 1; setPart('img', count / pending.length); };
    pending.forEach(function (img) {
      img.addEventListener('load', onImage);
      img.addEventListener('error', onImage);
    });
  }

  // ----- Boucle : compteur et barre ---------------------------------------
  function tick() {
    rafId = 0;
    try {
      update();
    } catch (err) {
      finalize();
    }
  }

  function update() {
    if (done) { return; }
    var stamp = now();
    var dt = lastStamp ? Math.min(3, (stamp - lastStamp) / 16.67) : 1;
    lastStamp = stamp;
    var t = elapsed();

    if (!minDone && t >= cfg.minDuration) { minDone = true; }
    if (!forced && t >= cfg.maxDuration) { forced = true; }
    if (!finishing && ((minDone && real >= 0.999) || forced)) { finishing = true; }

    // Le compteur suit le temps (au moins minDuration) sans dépasser le chargement réel.
    var timeP = 0.92 * Math.min(1, t / Math.max(1, cfg.minDuration));
    var target = finishing ? 1 : Math.min(timeP, 0.2 + 0.8 * real);
    var k = 1 - Math.pow(1 - (finishing ? 0.12 : 0.05), dt);
    shown += (target - shown) * k;
    if (finishing && shown > 0.985) { shown = 1; }

    var pct = Math.round(shown * 100);
    if (pct !== lastPct) {
      lastPct = pct;
      if (el.count) { el.count.textContent = String(pct); }
    }
    if (el.bar) { el.bar.style.transform = 'scaleX(' + shown.toFixed(4) + ')'; }

    if (finishing && shown >= 1) { exit(); return; }
    rafId = window.requestAnimationFrame(tick);
  }

  // ----- Sortie : fondu ---------------------------------------------------
  function exit() {
    if (exiting) { return; }
    exiting = true;
    root.classList.add('is-exiting');

    if (typeof root.animate !== 'function') { finalize(); return; }

    if (reduceMotion) {
      whenDone(anim(root, [{ opacity: 1 }, { opacity: 0 }],
        { duration: 480, easing: SMOOTH, fill: 'forwards' }), 520);
      return;
    }

    // Le mot s'élève et s'efface, la tagline et la progression suivent, puis le voile se dissout.
    anim(el.word, [
      { opacity: 1, transform: 'translate3d(0, 0, 0)' },
      { opacity: 0, transform: 'translate3d(0, -16px, 0)' }
    ], { duration: 700, easing: SMOOTH, fill: 'forwards' });
    anim(el.tag, [{ opacity: 1 }, { opacity: 0 }], { duration: 500, easing: SMOOTH, fill: 'forwards' });
    anim(el.foot, [{ opacity: 1 }, { opacity: 0 }], { duration: 400, easing: SMOOTH, fill: 'forwards' });
    whenDone(anim(root, [{ opacity: 1 }, { opacity: 0 }],
      { duration: 800, delay: 450, easing: SMOOTH, fill: 'forwards' }), 1400);
  }

  // ----- Fin : retrait de l'overlay et évènement ---------------------------
  function finalize() {
    if (done) { return; }
    done = true;
    if (rafId) { window.cancelAnimationFrame(rafId); }
    root.classList.add('is-done');
    root.setAttribute('aria-hidden', 'true');
    html.classList.remove('lm-loading');
    html.classList.add('lm-ready');
    try {
      window.dispatchEvent(new CustomEvent('limosi:ready'));
    } catch (err) { /* navigateurs anciens : évènement ignoré */ }
  }

  function skip() {
    if (done) { return; }
    minDone = true;
    forced = true;
  }

  // ----- Démarrage --------------------------------------------------------
  function init() {
    // Déjà vu dans cette session (ou masqué par le <head>) : sortie immédiate.
    if (html.classList.contains('lm-skip')) { finalize(); return; }
    if (cfg.once) {
      try {
        if (window.sessionStorage.getItem(STORAGE_KEY)) { finalize(); return; }
        window.sessionStorage.setItem(STORAGE_KEY, '1');
      } catch (err) { /* stockage indisponible : l'intro est jouée */ }
    }

    html.classList.add('lm-loading');   // bloque le défilement pendant l'intro
    if (reduceMotion) {
      html.classList.remove('lm-js');   // pas d'intro animée : tout reste visible
      root.classList.add('is-reduced');
      cfg.minDuration = Math.min(cfg.minDuration, 700);
    }

    trackLoading();
    window.setTimeout(function () { minDone = true; }, Math.max(0, cfg.minDuration - elapsed()));
    window.setTimeout(function () { forced = true; }, Math.max(0, cfg.maxDuration - elapsed()));
    window.setTimeout(finalize, Math.max(0, cfg.maxDuration + 3000 - elapsed()));
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' || e.key === 'Esc') { skip(); }
    });
    rafId = window.requestAnimationFrame(tick);
  }

  window.LimosiPreloader = {
    skip: skip,
    isDone: function () { return done; }
  };

  try {
    init();
  } catch (err) {
    finalize();
    if (window.console) { console.warn('[LIMOSI] preloader désactivé :', err); }
  }
})(window, document);
