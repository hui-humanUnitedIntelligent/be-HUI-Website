/* ── HUI Language Switcher ────────────────────────────────────────────
 * External script loaded by all pages.
 * Works with the #langSwitcher, #langBtn, #langFlag, #langDd elements
 * inserted into the nav of each page.
 * ─────────────────────────────────────────────────────────────────── */
(function(){
  'use strict';

  const LANGS = {
    de: { flag: '🇩🇪', name: 'Deutsch'  },
    en: { flag: '🇬🇧', name: 'English'  },
    fr: { flag: '🇫🇷', name: 'Français' },
    es: { flag: '🇪🇸', name: 'Español'  }
  };
  const SUPPORTED = Object.keys(LANGS);

  /* ── DOM refs ─────────────────────────────────────────────────────── */
  const li      = document.getElementById('langSwitcher');
  const btn     = document.getElementById('langBtn');
  const flagEl  = document.getElementById('langFlag');
  const dd      = document.getElementById('langDd');
  if (!li || !btn || !dd) return;

  /* ── Toggle dropdown ─────────────────────────────────────────────── */
  btn.addEventListener('click', function(e) {
    e.stopPropagation();
    var open = li.classList.toggle('open');
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  document.addEventListener('click', function() {
    li.classList.remove('open');
    btn.setAttribute('aria-expanded', 'false');
  });
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      li.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
    }
  });

  /* ── Update flag + active state ──────────────────────────────────── */
  function setLangUI(lang) {
    var info = LANGS[lang] || LANGS.de;
    if (flagEl) flagEl.textContent = info.flag;
    dd.querySelectorAll('a[data-lang]').forEach(function(a) {
      a.classList.toggle('active', a.dataset.lang === lang);
    });
  }

  /* ── Apply translations from window.HUI_TRANSLATIONS[lang] ──────── */
  function applyLang(lang) {
    document.documentElement.lang = lang;
    localStorage.setItem('hui-lang', lang);
    setLangUI(lang);

    /* Restore German (remove translated nodes, restore originals) */
    if (lang === 'de') {
      document.querySelectorAll('[data-t-key]').forEach(function(el) {
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
      loadLangFile(lang, function() { applyLang(lang); });
      return;
    }

    document.querySelectorAll('[data-t-key]').forEach(function(el) {
      var key = el.getAttribute('data-t-key');
      if (dict[key] !== undefined) {
        if (!el.hasAttribute('data-orig')) {
          el.setAttribute('data-orig', el.innerHTML);
        }
        el.innerHTML = dict[key];
      }
    });
  }

  /* ── Lazy-load translation file: lang/en.js etc. ─────────────────── */
  function loadLangFile(lang, cb) {
    if (window.HUI_TRANSLATIONS && window.HUI_TRANSLATIONS[lang]) { cb(); return; }
    var s = document.createElement('script');
    s.src = 'lang/' + lang + '.js';
    s.onload  = cb;
    s.onerror = function() { console.warn('HUI: no translation file for', lang); };
    document.head.appendChild(s);
  }

  /* ── Handle option clicks ────────────────────────────────────────── */
  dd.querySelectorAll('a[data-lang]').forEach(function(a) {
    a.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      li.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
      applyLang(a.dataset.lang);
    });
  });

  /* ── Auto-detect on first visit ──────────────────────────────────── */
  function detectLang() {
    var stored = localStorage.getItem('hui-lang');
    if (stored && SUPPORTED.indexOf(stored) !== -1) return stored;
    var browser = ((navigator.language || navigator.userLanguage || 'de')
                    .split('-')[0]).toLowerCase();
    return SUPPORTED.indexOf(browser) !== -1 ? browser : 'de';
  }

  /* ── Init ────────────────────────────────────────────────────────── */
  var initLang = detectLang();
  setLangUI(initLang);
  if (initLang !== 'de') applyLang(initLang);

})();
