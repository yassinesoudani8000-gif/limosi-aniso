/* ==========================================================================
   LIMOSI · Preloader « Imperial Signature »
   limosi-preloader.js — aucune dépendance.

   - Progression réelle (DOM, polices, images, évènement load) + durée minimale.
   - Intro et sortie pilotées par la Web Animations API (transform / opacity).
   - Particules 3D en perspective sur canvas 2D, blason incliné au pointeur.
   - Évènement « limosi:ready » à la fin, API : window.LimosiPreloader.skip().

   Configuration : window.LIMOSI_PRELOADER = { minDuration, maxDuration, once }
   (à définir dans le <head>, avant ce script — voir README.md).
   ========================================================================== */
(function (window, document) {
  'use strict';

  var root = document.getElementById('limosi-preloader');
  if (!root) { return; }

  var html = document.documentElement;
  var user = window.LIMOSI_PRELOADER || {};
  var cfg = {
    minDuration: toNumber(user.minDuration, 2400),  // durée minimale de l'intro (ms)
    maxDuration: toNumber(user.maxDuration, 7000),  // sortie forcée au-delà (ms)
    once: !!user.once                                // une seule fois par session
  };
  if (cfg.maxDuration < cfg.minDuration) { cfg.maxDuration = cfg.minDuration + 2000; }
  var STORAGE_KEY = 'limosi-preloader-seen';         // identique dans le <head>

  var EXPO = 'cubic-bezier(.16, 1, .3, 1)';
  var SMOOTH = 'cubic-bezier(.4, 0, .2, 1)';
  var CURTAIN = 'cubic-bezier(.76, 0, .24, 1)';
  var TAU = Math.PI * 2;

  var reduceMotion = matches('(prefers-reduced-motion: reduce)');
  var finePointer = matches('(hover: hover) and (pointer: fine)');

  var el = {
    topLayer: one('.lm-layer--top'),
    bottomLayer: one('.lm-layer--bottom'),
    seams: all('.lm-seam'),
    dust: one('.lm-dust'),
    glow: one('.lm-glow'),
    stage: one('.lm-stage'),
    foot: one('.lm-foot'),
    gyro: one('.lm-gyro'),
    orbits: all('.lm-orbit'),
    mark: one('.lm-mark'),
    corners: all('.lm-corner'),
    strokes: all('.lm-stroke'),
    letters: all('.lm-letter'),
    rule: one('.lm-rule'),
    tag: one('.lm-tag'),
    bar: one('.lm-progress__bar'),
    count: one('[data-lm-count]')
  };

  // ----- État -----------------------------------------------------------------
  var done = false;        // overlay retiré
  var exiting = false;     // sortie lancée
  var finishing = false;   // on n'attend plus : compteur vers 100 %
  var minDone = false;     // durée minimale écoulée
  var forced = false;      // durée maximale atteinte, ou skip()
  var shown = 0;           // valeur affichée (0 → 1)
  var lastPct = -1;
  var rafId = 0;
  var lastTime = 0;
  var start = now();
  var real = 0;            // progression réelle estimée (0 → 1)
  var parts = { doc: 0, img: 0, fonts: 0, load: 0 };
  var weights = { doc: 0.2, img: 0.4, fonts: 0.15, load: 0.25 };
  var aimX = 0, aimY = 0, tiltX = 0, tiltY = 0;
  var dust = null;
  var dustOff = false;     // canvas arrêté en fin de sortie

  // ----- Utilitaires ----------------------------------------------------------
  function one(sel) { return root.querySelector(sel); }
  function all(sel) { return Array.prototype.slice.call(root.querySelectorAll(sel)); }
  function toNumber(v, fallback) { var n = parseFloat(v); return isFinite(n) ? n : fallback; }
  function matches(query) { return !!(window.matchMedia && window.matchMedia(query).matches); }
  function now() { return (window.performance && performance.now) ? performance.now() : Date.now(); }

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

  // ----- Progression réelle --------------------------------------------------
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

    // Images chargées eagerly uniquement (les « lazy » ne bloquent pas l'entrée).
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

  // ----- Intro ---------------------------------------------------------------
  function intro() {
    anim(el.glow, [
      { opacity: 0, transform: 'scale(0.55)' },
      { opacity: 1, transform: 'scale(1)' }
    ], { duration: 1900, easing: EXPO });

    anim(el.dust, [{ opacity: 0 }, { opacity: 1 }], { duration: 1400, easing: SMOOTH });

    el.corners.forEach(function (corner, i) {
      anim(corner, [
        { opacity: 0, transform: 'scale(1.8)' },
        { opacity: 1, transform: 'scale(1)' }
      ], { duration: 1000, delay: 160 + i * 100, easing: EXPO });
    });

    el.orbits.forEach(function (orbit, i) {
      anim(orbit, [{ opacity: 0 }, { opacity: 1 }], { duration: 1400, delay: 260 + i * 160, easing: SMOOTH });
    });

    // Le blason se retourne dans l'espace (rotateY) avant de se stabiliser.
    anim(el.mark, [
      { opacity: 0, transform: 'perspective(800px) rotateY(-100deg) scale(0.7)' },
      { opacity: 1, transform: 'perspective(800px) rotateY(0deg) scale(1)' }
    ], { duration: 1500, delay: 120, easing: EXPO });

    // Tracé du cadre, de la hampe, puis de l'incrustation du pied.
    el.strokes.forEach(function (path) {
      var delay = toNumber(path.getAttribute('data-lm-delay'), 0);
      anim(path, [
        { strokeDashoffset: 100, opacity: 0 },
        { strokeDashoffset: 0, opacity: 1 }
      ], { duration: 1000, delay: 320 + delay, easing: SMOOTH });
    });

    el.letters.forEach(function (letter, i) {
      anim(letter, [
        { transform: 'translate3d(0, 112%, 0)' },
        { transform: 'translate3d(0, 0, 0)' }
      ], { duration: 900, delay: 750 + i * 70, easing: EXPO });
    });

    anim(el.rule, [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }],
      { duration: 800, delay: 1150, easing: EXPO });

    anim(el.tag, [
      { opacity: 0, letterSpacing: '0.9em', transform: 'translate3d(0, 8px, 0)' },
      { opacity: 1, letterSpacing: '0.42em', transform: 'translate3d(0, 0, 0)' }
    ], { duration: 1000, delay: 1300, easing: EXPO });

    anim(el.foot, [
      { opacity: 0, transform: 'translate3d(0, 14px, 0)' },
      { opacity: 1, transform: 'translate3d(0, 0, 0)' }
    ], { duration: 900, delay: 350, easing: EXPO });
  }

  // ----- Sortie : le contenu s'efface, un filet s'ouvre, les rideaux se séparent
  function exit() {
    if (exiting) { return; }
    exiting = true;
    root.classList.add('is-exiting');

    if (reduceMotion) {
      whenDone(anim(root, [{ opacity: 1 }, { opacity: 0 }],
        { duration: 480, easing: SMOOTH, fill: 'forwards' }), 520);
      return;
    }

    // Uniquement transform / opacity : pas de filter (coûteux sur un plein écran).
    anim(el.stage, [
      { opacity: 1, transform: 'translate3d(0, 0, 0) scale(1)' },
      { opacity: 0, transform: 'translate3d(0, -24px, 0) scale(1.035)' }
    ], { duration: 620, easing: SMOOTH, fill: 'forwards' });

    anim(el.foot, [{ opacity: 1 }, { opacity: 0 }], { duration: 380, easing: SMOOTH, fill: 'forwards' });
    anim(el.glow, [{ opacity: 1 }, { opacity: 0 }], { duration: 520, easing: SMOOTH, fill: 'forwards' });
    anim(el.dust, [{ opacity: 1 }, { opacity: 0 }], { duration: 480, easing: SMOOTH, fill: 'forwards' });
    // Un canvas plein écran composé sous des rideaux mobiles coûte cher (rendu logiciel
    // notamment) : on arrête le dessin et on le retire dès la fin de son fondu.
    window.setTimeout(function () {
      dustOff = true;
      if (el.dust) { el.dust.style.display = 'none'; }
    }, 500);
    el.corners.forEach(function (corner) {
      anim(corner, [{ opacity: 1 }, { opacity: 0 }], { duration: 380, easing: SMOOTH, fill: 'forwards' });
    });

    el.seams.forEach(function (seam) {
      anim(seam, [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }],
        { duration: 700, delay: 140, easing: CURTAIN, fill: 'forwards' });
    });

    anim(el.bottomLayer, [
      { transform: 'translate3d(0, 0, 0)' },
      { transform: 'translate3d(0, 100%, 0)' }
    ], { duration: 980, delay: 480, easing: CURTAIN, fill: 'forwards' });

    whenDone(anim(el.topLayer, [
      { transform: 'translate3d(0, 0, 0)' },
      { transform: 'translate3d(0, -100%, 0)' }
    ], { duration: 980, delay: 480, easing: CURTAIN, fill: 'forwards' }), 1600);
  }

  // ----- Fin : retrait de l'overlay et évènement ------------------------------
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

  // ----- Poussière 3D (canvas, projection en perspective) --------------------
  function createDust(canvas) {
    if (!canvas || !canvas.getContext) { return null; }
    var ctx = canvas.getContext('2d');
    if (!ctx) { return null; }
    var W = 0, H = 0, focal = 1, pts = [];

    function rand(a, b) { return a + Math.random() * (b - a); }

    function spawn(p, initial) {
      p.x = rand(-1, 1);
      p.y = rand(-1, 1);
      p.z = initial ? rand(0.12, 1) : 1;      // profondeur : 1 = loin, 0.12 = très proche
      p.r = rand(0.6, 1.7);
      p.v = rand(0.0016, 0.0042);             // vitesse d'approche par image (60 Hz)
      p.a = rand(0.3, 0.9);
      return p;
    }

    function resize() {
      var ratio = Math.min(window.devicePixelRatio || 1, 2);
      W = canvas.clientWidth;
      H = canvas.clientHeight;
      canvas.width = Math.max(1, Math.round(W * ratio));
      canvas.height = Math.max(1, Math.round(H * ratio));
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      var count = Math.round(Math.min(110, Math.max(36, (W * H) / 15000)));
      pts = [];
      for (var i = 0; i < count; i++) { pts.push(spawn({}, true)); }
      focal = Math.min(W, H) * 0.6;
    }

    function draw(dt, warp) {
      ctx.clearRect(0, 0, W, H);
      var cx = W / 2, cy = H / 2, step = dt * warp;
      for (var i = 0; i < pts.length; i++) {
        var p = pts[i];
        p.z -= p.v * step;
        if (p.z < 0.12) { spawn(p, false); }
        var k = focal / p.z;
        var x = cx + p.x * k;
        var y = cy + p.y * k;
        if (x < -10 || x > W + 10 || y < -10 || y > H + 10) { continue; }
        var near = 1 - p.z;
        var alpha = p.a * Math.min(1, near * 4) * (0.45 + 0.55 * near);
        ctx.fillStyle = 'rgba(240, 220, 174, ' + alpha.toFixed(3) + ')';
        ctx.beginPath();
        ctx.arc(x, y, p.r * (0.55 + 0.9 * near), 0, TAU);
        ctx.fill();
      }
    }

    resize();
    window.addEventListener('resize', resize);
    return { draw: draw };
  }

  // ----- Inclinaison 3D du blason au pointeur --------------------------------
  function bindPointer() {
    if (!finePointer || reduceMotion) { return; }
    root.addEventListener('pointermove', function (e) {
      var w = window.innerWidth || 1, h = window.innerHeight || 1;
      aimX = -(e.clientX / w - 0.5) * 22;
      aimY = (e.clientY / h - 0.5) * 14;
    }, { passive: true });
  }

  function tilt(dt) {
    if (!finePointer || reduceMotion || exiting || !el.gyro) { return; }
    var k = 1 - Math.pow(0.9, dt);
    tiltX += (aimX - tiltX) * k;
    tiltY += (aimY - tiltY) * k;
    el.gyro.style.transform = 'rotateX(' + tiltY.toFixed(2) + 'deg) rotateY(' + tiltX.toFixed(2) + 'deg)';
  }

  // ----- Boucle d'animation --------------------------------------------------
  function step(t) {
    var dt = lastTime ? Math.min(3, (t - lastTime) / 16.67) : 1;
    lastTime = t;

    // Progression : suit le temps (au moins minDuration) sans dépasser le réel.
    var elapsed = Math.max(0, t - start);
    var timeP = 0.92 * Math.min(1, elapsed / Math.max(1, cfg.minDuration));
    if (!finishing && ((minDone && real >= 0.999) || forced)) { finishing = true; }
    var target = finishing ? 1 : Math.min(timeP, 0.2 + 0.8 * real);
    var k = 1 - Math.pow(1 - (finishing ? 0.16 : 0.07), dt);
    shown += (target - shown) * k;
    if (finishing && shown > 0.985) { shown = 1; }

    var pct = Math.round(shown * 100);
    if (pct !== lastPct) {
      lastPct = pct;
      if (el.count) { el.count.textContent = String(pct); }
    }
    if (el.bar) { el.bar.style.transform = 'scaleX(' + shown.toFixed(4) + ')'; }

    if (dust && !dustOff) { dust.draw(dt, exiting ? 4 : 1); }
    tilt(dt);

    if (finishing && shown >= 1 && !exiting) { exit(); }
  }

  function frame(t) {
    if (done) { return; }
    try {
      step(t);
    } catch (err) {
      finalize();
      if (window.console) { console.warn('[LIMOSI] preloader interrompu :', err); }
      return;
    }
    rafId = window.requestAnimationFrame(frame);
  }

  // ----- Démarrage -----------------------------------------------------------
  function skip() {
    if (done) { return; }
    minDone = true;
    forced = true;
  }

  function init() {
    // Déjà vu dans cette session (ou masqué par le <head>) : sortie immédiate.
    if (html.classList.contains('lm-skip') || typeof root.animate !== 'function') {
      finalize();
      return;
    }
    if (cfg.once) {
      try {
        if (window.sessionStorage.getItem(STORAGE_KEY)) { finalize(); return; }
        window.sessionStorage.setItem(STORAGE_KEY, '1');
      } catch (err) { /* stockage indisponible : on affiche quand même */ }
    }

    html.classList.add('lm-loading');   // bloque le défilement pendant l'intro

    if (reduceMotion) {
      html.classList.remove('lm-js');   // pas d'intro 3D : tout reste visible
      root.classList.add('is-reduced');
      cfg.minDuration = Math.min(cfg.minDuration, 700);
    } else {
      intro();
      dust = createDust(el.dust);
    }

    trackLoading();
    bindPointer();
    window.setTimeout(function () { minDone = true; }, cfg.minDuration);
    window.setTimeout(function () { forced = true; }, cfg.maxDuration);
    // Filet de sécurité côté JS (si la boucle d'animation s'arrêtait).
    window.setTimeout(finalize, cfg.maxDuration + 3000);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' || e.key === 'Esc') { skip(); }
    });
    rafId = window.requestAnimationFrame(frame);
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
