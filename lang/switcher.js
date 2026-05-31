/* ── HUI Language Switcher v2 — DE / EN only ──────────────────────────
 * Loaded by all pages via <script src="lang/switcher.js"></script>
 * Lang-switcher is currently hidden (display:none) — DE is forced.
 * When re-enabled, set FORCE_DE = false.
 * ─────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  /* ── Set to false when lang-switcher is made visible again ─────── */
  var FORCE_DE = true;

  var LANGS = {
    de: { flag: '&#127465;&#127466;', label: 'DE' },
    en: { flag: '&#127468;&#127463;', label: 'EN' }
  };

  /* ── Always enforce DE while switcher is hidden ───────────────────── */
  if (FORCE_DE) {
    document.documentElement.lang = 'de';
    localStorage.removeItem('hui-lang');
    return;
  }

  /* ── DOM refs ─────────────────────────────────────────────────────── */
  var li     = document.getElementById('langSwitcher');
  var btn    = document.getElementById('langBtn');
  var flagEl = document.getElementById('langFlag');
  var dd     = document.getElementById('langDd');
  if (!li || !btn || !dd) return;

  /* ── Toggle dropdown ──────────────────────────────────────────────── */
  btn.addEventListener('click', function (e) {
    e.stopPropagation();
    var open = li.classList.toggle('open');
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  document.addEventListener('click', function () {
    li.classList.remove('open');
    btn.setAttribute('aria-expanded', 'false');
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      li.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
    }
  });

  /* ── Update flag label + active state ────────────────────────────── */
  function setLangUI(lang) {
    var info = LANGS[lang] || LANGS.de;
    if (flagEl) flagEl.innerHTML = info.flag + '<span class="lang-label">' + info.label + '</span>';
    dd.querySelectorAll('a[data-lang]').forEach(function (a) {
      a.classList.toggle('active', a.dataset.lang === lang);
    });
  }

  /* ── Apply translations ───────────────────────────────────────────── */
  function applyLang(lang) {
    document.documentElement.lang = lang;
    localStorage.setItem('hui-lang', lang);
    setLangUI(lang);

    if (lang === 'de') {
      document.querySelectorAll('[data-t-key]').forEach(function (el) {
        var orig = el.getAttribute('data-orig');
        if (orig !== null) {
          el.innerHTML = orig;
          el.removeAttribute('data-orig');
        }
      });
      return;
    }

    var dict = window.HUI_TRANSLATIONS && window.HUI_TRANSLATIONS[lang];
    if (!dict) {
      loadLangFile(lang, function () { applyLang(lang); });
      return;
    }

    document.querySelectorAll('[data-t-key]').forEach(function (el) {
      var key = el.getAttribute('data-t-key');
      if (dict[key] !== undefined) {
        if (!el.hasAttribute('data-orig')) {
          el.setAttribute('data-orig', el.innerHTML);
        }
        el.innerHTML = dict[key];
      }
    });
  }

  /* ── Lazy-load lang file ──────────────────────────────────────────── */
  function loadLangFile(lang, cb) {
    if (window.HUI_TRANSLATIONS && window.HUI_TRANSLATIONS[lang]) { cb(); return; }
    var s = document.createElement('script');
    var base = document.querySelector('meta[name="lang-base"]');
    var prefix = base ? base.getAttribute('content') : '';
    s.src = prefix + 'lang/' + lang + '.js';
    s.onload = cb;
    s.onerror = function () { console.warn('HUI: no translation for', lang); };
    document.head.appendChild(s);
  }

  /* ── Option click handlers ────────────────────────────────────────── */
  dd.querySelectorAll('a[data-lang]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      li.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
      applyLang(a.dataset.lang);
    });
  });

  /* ── Auto-detect language ─────────────────────────────────────────── */
  function detectLang() {
    var stored = localStorage.getItem('hui-lang');
    if (stored && LANGS[stored]) return stored;
    var browser = ((navigator.language || navigator.userLanguage || 'de').split('-')[0]).toLowerCase();
    return LANGS[browser] ? browser : 'de';
  }

  /* ── Init ─────────────────────────────────────────────────────────── */
  var initLang = detectLang();
  setLangUI(initLang);
  if (initLang !== 'de') applyLang(initLang);

})();
