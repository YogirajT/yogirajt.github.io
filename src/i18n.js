/**
 * Language switching for yogirajt.github.io  (English default, German on demand)
 *
 * TEMPLATE: the German text (DE), the run-time English (EN) and ANNOUNCEMENTS below are injected at
 * build time from content/*.json by .github/scripts/build.mjs. Edit the wording in content/, not here.
 *
 * How it works
 *   - index.html ships fully written in ENGLISH. Nothing here rewrites English text, so search
 *     engines and no-JS visitors get the complete English page straight from the HTML.
 *   - German is applied only when it is asked for: "?ln=de" in the URL, the EN / DE switch in the
 *     header, or a previous choice remembered in localStorage. Order of precedence:
 *         ?ln=de|en  >  remembered choice  >  English
 *   - Translatable elements carry data-i18n="key" (their inner HTML is swapped) and/or
 *     data-i18n-attr="attr:key;attr2:key2" (attribute values are swapped). The German text lives
 *     in the DE table (generated from content/). The original English is captured once at start-up, so switching back
 *     to English restores exactly what the HTML says.
 *   - <title>, meta description, Open Graph / Twitter tags, canonical URL, <html lang> and the
 *     JSON-LD block follow the language too.
 *   - The current language is mirrored in the address bar (?ln=de, or no parameter for English),
 *     so every language version has its own shareable URL.
 *
 * Pages opt in with data-i18n-page on <html>; on any other page (e.g. privacy.html) this file does
 * nothing at all.
 *
 * Public API (used by scripts.js):  window.siteI18n = { lang, set(lang), t(key, fallback, vars), build }
 * Fires "sitelanguagechange" on document after every change.
 */
(() => {
  "use strict";

  const root = document.documentElement;
  if (!root.hasAttribute("data-i18n-page")) return;

  const PARAM = "ln";
  const STORAGE_KEY = "lang";
  const DEFAULT_LANG = "en";
  const LANGUAGES = ["en", "de"];
  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  /* German copy. Keys ending in a plain-text meaning (a.*, head.*, JS-only strings) are used as
     attribute / text values; everything else is HTML and may contain entities and <strong>. */
  const DE = /*__DE__*/{};
  const EN = /*__EN__*/{}; // English for strings scripts.js creates at run time

  const ANNOUNCEMENTS = /*__ANNOUNCEMENTS__*/{};

  /* --- helpers ------------------------------------------------------------------------------ */

  const normalise = (value) => {
    if (typeof value !== "string") return null;
    const code = value.trim().toLowerCase().slice(0, 2);
    return LANGUAGES.includes(code) ? code : null;
  };

  const readStored = () => {
    try {
      return normalise(localStorage.getItem(STORAGE_KEY));
    } catch {
      return null;
    }
  };

  const writeStored = (lang) => {
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // Storage can be blocked (private mode); the language still applies for this visit.
    }
  };

  const readParam = () => {
    try {
      return normalise(new URLSearchParams(window.location.search).get(PARAM));
    } catch {
      return null;
    }
  };

  /** Mirrors the language in the address bar without adding a history entry. */
  const syncUrl = (lang) => {
    try {
      const url = new URL(window.location.href);
      if (lang === DEFAULT_LANG) url.searchParams.delete(PARAM);
      else url.searchParams.set(PARAM, lang);
      if (url.href !== window.location.href) {
        window.history.replaceState(window.history.state, "", url.href);
      }
    } catch {
      // e.g. file:// previews; harmless.
    }
  };

  /* --- capture the English that is already in the HTML ------------------------------------- */

  const textItems = [...document.querySelectorAll("[data-i18n]")].map((el) => ({
    el,
    key: el.getAttribute("data-i18n"),
    en: el.innerHTML,
  }));

  const attrItems = [...document.querySelectorAll("[data-i18n-attr]")].flatMap((el) =>
    el
      .getAttribute("data-i18n-attr")
      .split(";")
      .map((pair) => {
        const [attr, key] = pair.split(":");
        return { el, attr, key, en: el.getAttribute(attr) };
      }),
  );

  const pick = (selector) => document.querySelector(selector);
  const canonicalEl = pick('link[rel="canonical"]');
  const canonicalEn = canonicalEl ? canonicalEl.href : window.location.origin + "/";
  const canonicalDe = `${canonicalEn}?${PARAM}=de`;

  // [key, element, attribute, function(lang, englishValue) => override]
  const headItems = [
    ["seo.description", pick('meta[name="description"]'), "content"],
    ["seo.ogTitle", pick('meta[property="og:title"]'), "content"],
    ["seo.ogDescription", pick('meta[property="og:description"]'), "content"],
    ["seo.ogTitle", pick('meta[name="twitter:title"]'), "content"],
    ["seo.ogDescription", pick('meta[name="twitter:description"]'), "content"],
    ["seo.ogImageAlt", pick('meta[property="og:image:alt"]'), "content"],
    ["seo.ogImageAlt", pick('meta[name="twitter:image:alt"]'), "content"],
    ["seo.locale", pick('meta[property="og:locale"]'), "content"],
    ["seo.localeAlt", pick('meta[property="og:locale:alternate"]'), "content"],
    [null, canonicalEl, "href", (lang) => (lang === "de" ? canonicalDe : canonicalEn)],
    [null, pick('meta[property="og:url"]'), "content", (lang) => (lang === "de" ? canonicalDe : canonicalEn)],
  ]
    .filter(([, el]) => el)
    .map(([key, el, attr, compute]) => ({ key, el, attr, compute, en: el.getAttribute(attr) }));

  const titleEn = document.title;
  const ldEl = document.getElementById("ld-json");
  const ldEn = ldEl ? ldEl.textContent : null;

  /* --- typewriter-style text swap (switching language after page load) ----------------------
     On first load `apply()` sets text instantly -- there's nothing to see yet, so nothing to
     smooth. On a live switch (the globe click), textItems swap through this instead: erase the
     old text a token at a time, then type the new one in, reusing the same visual language as
     the hero's #typewriter effect. A "token" is one character, or one whole tag/entity (<strong>,
     &nbsp;, ...) -- those never appear half-written, since a browser renders an unclosed inline
     tag in innerHTML just fine (it's implicitly closed at the end of the fragment).
     Only elements actually on screen get the animation; anything off-screen is swapped instantly
     since animating text nobody can see would just burn a frame budget for no visible smoothing,
     and it'll already be in the target language by the time it's scrolled to. */

  const TOKEN_RE = /<[^>]+>|&[a-zA-Z#0-9]+;|[\s\S]/g;
  const tokenize = (html) => html.match(TOKEN_RE) || [];

  const TYPE_MS_PER_TOKEN = 24; // pace of the cursor: roughly constant, so length genuinely changes duration
  const TYPE_MS_MIN = 600; // even a one-word swap should read as a deliberate retype, not a flicker
  const TYPE_MS_MAX = 6000; // the longest paragraph (the hero pitch) takes this long; stops an outlier running away
  const STAGGER_MS = 260; // spread across the visible viewport, top to bottom

  const isOnScreen = (el) => {
    const rect = el.getBoundingClientRect();
    const viewportH = window.innerHeight || document.documentElement.clientHeight;
    return rect.bottom > 0 && rect.top < viewportH;
  };

  /* Retyping. The new text is typed left to right *over* the old text: at any moment the element
     shows [the new text so far] + [whatever of the old text hasn't been overwritten yet], so it
     is never empty and the two languages just trade places from left to right.

     Size. The text inside a box changes, and with it the box. Rather than letting the box follow
     the half-old, half-new text around (or snap at the end), the box is held at its old size and
     eased to its new size in step with the overwrite -- the size is driven from the same progress
     value as the text, so the two can't drift apart, and there's nothing left to snap at the end.
     Everything is measured when *this* element starts, not when the button was clicked. */
  const SIZE_LEAD = 0.85; // the box reaches its new size at this share of the overwrite
  const SIZE_EPSILON = 0.5; // px; a smaller change isn't worth animating
  const SIZE_SETTLE_MS = 220; // absorbs a last late-layout difference instead of snapping
  const SIZE_SETTLE_EASE = "cubic-bezier(0.22, 0.61, 0.36, 1)";
  const smoothstep = (x) => x * x * (3 - 2 * x);
  const norm = (text) => text.replace(/\s+/g, " ").trim();

  /* The cursor, and the words it has already cleared. While the new text is typed over the old, a
     block cursor -- the kind an editor shows in overwrite mode -- sits on the next character of old
     text that is about to be replaced, and the next few words after the typed text are already gone
     (see lookaheadFor). The eye can follow the block, and it never types into text that is still
     there. The block is that character itself with a background, so it adds no width and can't
     change how anything wraps. It is styled inline (with the theme colours as variables) so it
     shows even if the small stylesheet below were ever dropped. */
  const LOOKAHEAD_WORDS = 2;
  const CARET_STYLE = "background:var(--green,#39ff88);color:var(--i18n-caret-ink,#06120b);border-radius:2px";
  const caretOver = (token) => `<span class="i18n-caret" aria-hidden="true" style="${CARET_STYLE}">${token}</span>`;
  const CARET_RE = /<span class="i18n-caret"[^>]*>([\s\S]*?)<\/span>/g; // matches a cursor; $1 is the character under it
  const INVISIBLE_TOKEN = /^(?:<[^>]+>|&shy;|&#173;|&#xad;)$/i; // tags and soft hyphens: nothing to put a block on
  if (!document.getElementById("i18n-caret-style")) {
    const style = document.createElement("style");
    style.id = "i18n-caret-style";
    style.textContent =
      ":root{--i18n-caret-ink:#06120b}" + // dark text on the neon-green block in the dark theme...
      '[data-theme="light"]{--i18n-caret-ink:#fff}'; // ...white text on the deeper green in the light theme
    document.head.appendChild(style);
  }

  /** How many words of old text to clear ahead of the cursor: none for a label, so a one- or
   *  two-word item is never blank; the full amount only for real sentences. */
  const lookaheadFor = (tokens) => {
    let words = 0;
    let inWord = false;
    for (const token of tokens) {
      if (/^\s$/.test(token) || token === "&nbsp;") inWord = false;
      else if (token[0] !== "<" && !inWord) {
        inWord = true;
        words++;
      }
    }
    return words >= 6 ? LOOKAHEAD_WORDS : words >= 3 ? 1 : 0;
  };

  /** Index just past the next `count` words, starting at `from` (tags and spaces don't count). */
  const skipWords = (tokens, from, count) => {
    let k = from;
    let words = 0;
    let inWord = false;
    while (k < tokens.length && words < count) {
      const token = tokens[k];
      if (/^\s$/.test(token) || token === "&nbsp;") {
        if (inWord) {
          words++;
          inWord = false;
        }
      } else if (token[0] !== "<") {
        inWord = true;
      }
      k++;
    }
    return k;
  };

  /** Width/height to give CSS so the box measures like `rect`, whatever box-sizing says. */
  const cssBoxSize = (el, rect) => {
    const cs = getComputedStyle(el);
    if (cs.boxSizing === "border-box") return { w: rect.width, h: rect.height };
    const px = (value) => parseFloat(value) || 0;
    return {
      w: rect.width - px(cs.paddingLeft) - px(cs.paddingRight) - px(cs.borderLeftWidth) - px(cs.borderRightWidth),
      h: rect.height - px(cs.paddingTop) - px(cs.paddingBottom) - px(cs.borderTopWidth) - px(cs.borderBottomWidth),
    };
  };

  /* Cutting HTML in the middle can cut through <strong>...</strong>. These helpers work out which
     tags are open at a cut point, so the two halves can each be closed and re-opened properly. */
  const VOID_TAGS = new Set(["br", "wbr", "img", "hr", "input"]);
  const openTagsAt = (tokens) => {
    const stack = [];
    for (const token of tokens) {
      const match = /^<(\/?)([a-zA-Z][\w-]*)/.exec(token);
      if (!match) continue;
      const name = match[2].toLowerCase();
      if (VOID_TAGS.has(name) || token.endsWith("/>")) continue;
      if (match[1]) {
        for (let n = stack.length - 1; n >= 0; n--) {
          if (stack[n].name === name) {
            stack.length = n; // closes it (and anything left open inside it)
            break;
          }
        }
      } else {
        stack.push({ name, token });
      }
    }
    return stack;
  };

  /** [new text so far] + [old text from just past the words the cursor has cleared], with the
   *  block cursor on the first character of that old text (or trailing the typing if none is left). */
  const overwriteFrame = (fromTokens, toTokens, progress, withCaret, lookahead) => {
    const i = Math.round(toTokens.length * progress);
    const j = skipWords(fromTokens, Math.round(fromTokens.length * progress), lookahead);
    const typed = toTokens.slice(0, i);
    const closeTyped = openTagsAt(typed)
      .map((tag) => `</${tag.name}>`)
      .reverse()
      .join("");
    const reopenRest = openTagsAt(fromTokens.slice(0, j))
      .map((tag) => tag.token)
      .join("");
    const rest = fromTokens.slice(j);
    let trailing = "";
    if (withCaret) {
      const onto = rest.findIndex((token) => !INVISIBLE_TOKEN.test(token));
      if (onto >= 0) rest[onto] = caretOver(rest[onto]);
      else trailing = caretOver("&nbsp;");
    }
    return typed.join("") + closeTyped + reopenRest + rest.join("") + trailing;
  };

  /* Typing rhythm. A cursor that advances one token every 24 ms exactly reads as a machine; a
     person (or a good typewriter animation) speeds up and slows down, hesitates a touch before
     starting, and breathes at punctuation. So the *time* each token takes is weighted rather than
     equal: letters wobble a little (a deterministic wobble, so it never flickers between frames),
     spaces are quick, a comma or dash is followed by a short beat and a full stop by a longer one,
     and the first few characters ease in. Tags and soft hyphens cost nothing. The weights are only
     proportions: the total duration is still durationMs, so a long paragraph can't run away. */
  const PAUSE_SENTENCE = 7; // in "letter" units, after . ! ? …
  const PAUSE_CLAUSE = 3.5; // after , ; : and dashes
  const WARM_UP = [2.4, 1.8, 1.4, 1.15]; // the first typed characters are a little slower
  const wobble = (n) => {
    const x = Math.sin(n * 12.9898 + 4.1414) * 43758.5453;
    return x - Math.floor(x);
  };

  /** Returns progressAt(u): how far through the new text (0..1) the cursor is after the share
   *  `u` (0..1) of the animation's time, following the rhythm above. */
  const buildRhythm = (tokens) => {
    const cum = [];
    let total = 0;
    let pause = 0;
    let typedCount = 0;
    tokens.forEach((token, n) => {
      let weight = 0;
      if (!INVISIBLE_TOKEN.test(token)) {
        const isSpace = /^\s$/.test(token) || token === "&nbsp;";
        weight = isSpace ? 0.55 : 0.7 + 0.5 * wobble(n) + 0.2 * Math.sin(n / 7); // bursts and lulls
        weight += pause;
        pause = 0;
        if (typedCount < WARM_UP.length) weight *= WARM_UP[typedCount];
        typedCount++;
        if (/^[.!?…]$/.test(token)) pause = PAUSE_SENTENCE;
        else if (/^(?:[,;:–—]|&[mn]dash;|&#8211;|&#8212;)$/.test(token)) pause = PAUSE_CLAUSE;
      }
      total += weight;
      cum.push(total);
    });
    if (total <= 0) return (u) => u;
    return (u) => {
      const target = u * total;
      let lo = 0;
      let hi = cum.length;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (cum[mid] <= target) lo = mid + 1;
        else hi = mid;
      }
      return lo / tokens.length; // share of tokens fully typed at this moment
    };
  };

  const latestSwap = new WeakMap(); // el -> token of the newest swap requested for it
  const heldBox = new WeakMap(); // el -> how to put its box back, while a swap has it held

  /** Stops any swap running (or waiting to start) on `el` and gives its box back. */
  const cancelSwap = (el) => {
    latestSwap.set(el, null);
    const held = heldBox.get(el);
    if (held) {
      heldBox.delete(el);
      held.restoreBox();
    }
  };

  const typeSwap = (el, toHtml, delayMs) => {
    // Whatever was pending or running for this element is superseded by this request.
    const token = {};
    latestSwap.set(el, token);
    const isCurrent = () => latestSwap.get(el) === token;

    const run = () => {
      if (!isCurrent()) return;

      // The text as it is *now* -- which, on a quick second click, is the middle of the last swap.
      const fromHtml = el.innerHTML.replace(CARET_RE, "$1");
      if (fromHtml === toHtml) {
        cancelSwap(el);
        return;
      }
      const fromTokens = tokenize(fromHtml);
      const toTokens = tokenize(toHtml);
      // Flex/grid containers (an icon + label button) lay each child out separately, so an extra
      // child -- even a cursor -- would move things; they just go without one.
      const withCaret = !/flex|grid/.test(getComputedStyle(el).display);
      const progressAt = buildRhythm(toTokens);
      const lookahead = lookaheadFor(fromTokens);
      const durationMs = Math.min(
        TYPE_MS_MAX,
        Math.max(TYPE_MS_MIN, Math.max(fromTokens.length, toTokens.length) * TYPE_MS_PER_TOKEN),
      );

      // Which box to hold? Usually the element itself. An inline element (a span, a link) has no
      // height or width of its own: if it is all the text its block parent has (like the hero role
      // line), hold the parent; otherwise turn it inline-block for the duration -- with
      // `vertical-align: top`, because an inline-block's baseline is that of its last line and the
      // line around it would otherwise grow and shrink as its text changes.
      let held = heldBox.get(el);
      if (!held) {
        const inline = getComputedStyle(el).display === "inline";
        const parent = el.parentElement;
        const soleInParent =
          inline &&
          parent &&
          parent !== document.body &&
          getComputedStyle(parent).display !== "inline" &&
          !parent.hasAttribute("data-i18n") &&
          norm(parent.textContent) === norm(el.textContent);
        const boxEl = soleInParent ? parent : el;
        const saved = { display: el.style.display, align: el.style.verticalAlign, wrap: boxEl.style.whiteSpace };
        const convert = inline && !soleInParent;
        held = {
          boxEl,
          convert,
          restoreBox: () => {
            boxEl.style.height = "";
            boxEl.style.width = "";
            boxEl.style.whiteSpace = saved.wrap;
            if (convert) {
              el.style.display = saved.display;
              el.style.verticalAlign = saved.align;
            }
          },
        };
        heldBox.set(el, held);
      }
      const { boxEl, convert, restoreBox } = held;
      if (convert) {
        el.style.display = "inline-block";
        el.style.verticalAlign = "top";
      }

      // Measure the old and the new rendering back to back (no paint in between, so no flicker).
      const from = cssBoxSize(boxEl, boxEl.getBoundingClientRect());
      boxEl.style.height = "";
      boxEl.style.width = "";
      el.innerHTML = toHtml;
      const to = cssBoxSize(boxEl, boxEl.getBoundingClientRect());
      el.innerHTML = fromHtml;

      // Hold the old size -- width too where the element sizes itself to its text (buttons, nav
      // links), or it would keep resizing while the text changes and push its neighbours around.
      const hasBox = from.w > 0 && from.h > 0;
      const widthChanges = Math.abs(to.w - from.w) > SIZE_EPSILON;
      if (hasBox) {
        boxEl.style.height = `${from.h}px`;
        boxEl.style.width = `${from.w}px`;
        // An item that sizes itself to its text (a nav link, a button) stays on one line while its
        // width eases: the half-old, half-new text can briefly be wider than either language.
        if (widthChanges) boxEl.style.whiteSpace = "nowrap";
      }

      const finish = () => {
        heldBox.delete(el);
        restoreBox();
        if (!hasBox || convert || typeof boxEl.animate !== "function") return;
        const natural = cssBoxSize(boxEl, boxEl.getBoundingClientRect());
        if (Math.abs(natural.h - to.h) > 1) {
          boxEl.animate([{ height: `${to.h}px` }, { height: `${natural.h}px` }], {
            duration: SIZE_SETTLE_MS,
            easing: SIZE_SETTLE_EASE,
          });
        }
      };

      const start = performance.now();
      let lastFrameKey = "";
      const step = (now) => {
        if (!isCurrent()) return;
        // (rAF's timestamp is the frame's start, which can be a hair before `start`: never go below 0,
        // or the first frame would slice from the wrong end.)
        const time = Math.max(0, (now - start) / durationMs);
        if (time >= 1) {
          el.innerHTML = toHtml; // land on the exact final markup, not an interpolated step
          finish();
          return;
        }
        const progress = progressAt(time); // the text follows the typing rhythm...
        const frameKey = `${Math.round(toTokens.length * progress)}:${Math.round(fromTokens.length * progress)}`;
        if (frameKey !== lastFrameKey) {
          // ...and is only rewritten when the cursor actually moved (during a pause, nothing to do)
          lastFrameKey = frameKey;
          el.innerHTML = overwriteFrame(fromTokens, toTokens, progress, withCaret, lookahead);
        }
        if (hasBox) {
          const k = smoothstep(Math.min(1, time / SIZE_LEAD));
          boxEl.style.height = `${from.h + (to.h - from.h) * k}px`;
          if (widthChanges) boxEl.style.width = `${from.w + (to.w - from.w) * k}px`;
        }
        requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };

    if (delayMs > 0) setTimeout(run, delayMs);
    else run();
  };

  /* --- applying a language ------------------------------------------------------------------ */

  const langLinks = [...document.querySelectorAll("a[data-lang]")];
  let current = DEFAULT_LANG; // the HTML is English

  const applyStructuredData = (lang) => {
    if (!ldEl || !ldEn) return;
    if (lang === DEFAULT_LANG) {
      ldEl.textContent = ldEn;
      return;
    }
    try {
      const data = JSON.parse(ldEn);
      (data["@graph"] || []).forEach((node) => {
        if (node["@type"] === "Person") {
          node.jobTitle = DE["seo.jobTitle"];
          node.description = DE["seo.ogDescription"];
        }
        if (node["@type"] === "ProfilePage") {
          node.name = DE["seo.title"];
          node.inLanguage = lang;
          node.url = canonicalDe;
        }
      });
      ldEl.textContent = JSON.stringify(data, null, 2);
    } catch {
      ldEl.textContent = ldEn;
    }
  };

  const apply = (lang, { animate = false } = {}) => {
    const isEnglish = lang === DEFAULT_LANG;
    const viewportH = window.innerHeight || document.documentElement.clientHeight;

    textItems.forEach(({ el, key, en }) => {
      const value = isEnglish ? en : (DE[key] ?? en);
      if (!animate || reduceMotion || !isOnScreen(el)) {
        cancelSwap(el); // a swap still running here (quick second click) must not overwrite this
        el.innerHTML = value;
        return;
      }
      // Elements nearer the top of the screen start retyping a beat sooner than
      // ones nearer the bottom, so the switch reads as a wave rather than a flash.
      const rect = el.getBoundingClientRect();
      const delayMs = Math.max(0, Math.min(STAGGER_MS, (rect.top / viewportH) * STAGGER_MS));
      typeSwap(el, value, delayMs);
    });

    attrItems.forEach(({ el, attr, key, en }) => {
      el.setAttribute(attr, isEnglish ? en : (DE[key] ?? en));
    });

    headItems.forEach(({ key, el, attr, compute, en }) => {
      const value = compute ? compute(lang) : isEnglish ? en : (DE[key] ?? en);
      el.setAttribute(attr, value);
    });
    document.title = isEnglish ? titleEn : DE["seo.title"];
    applyStructuredData(lang);

    root.setAttribute("lang", lang);

    langLinks.forEach((link) => {
      if (link.getAttribute("data-lang") === lang) link.setAttribute("aria-current", "true");
      else link.removeAttribute("aria-current");
    });

    current = lang;
  };

  /* --- screen-reader announcement ----------------------------------------------------------- */

  let statusEl = null;
  const announce = (lang) => {
    if (!statusEl) {
      statusEl = document.createElement("div");
      statusEl.className = "sr-only";
      statusEl.setAttribute("role", "status");
      statusEl.setAttribute("aria-live", "polite");
      document.body.appendChild(statusEl);
    }
    statusEl.textContent = "";
    // A short delay makes repeated announcements reliable across screen readers.
    setTimeout(() => {
      statusEl.textContent = ANNOUNCEMENTS[lang];
    }, 60);
  };

  /* --- public switch ------------------------------------------------------------------------ */

  const setLanguage = (value, { announceChange = true } = {}) => {
    const lang = normalise(value);
    if (!lang) return;

    if (lang !== current) {
      apply(lang, { animate: true });
      document.dispatchEvent(new CustomEvent("sitelanguagechange", { detail: { lang } }));
      if (announceChange) announce(lang);
    }
    writeStored(lang);
    syncUrl(lang);
  };

  /** Translates a string that scripts create at runtime. English falls back to `fallback`. */
  const translate = (key, fallback, vars) => {
    let text = current === DEFAULT_LANG ? (EN[key] ?? fallback) : (DE[key] ?? fallback);
    if (vars) {
      text = text.replace(/\{(\w+)\}/g, (match, name) => (name in vars ? vars[name] : match));
    }
    return text;
  };

  window.siteI18n = {
    get lang() {
      return current;
    },
    set: setLanguage,
    t: translate,
    // Which copy of this file the browser is really running (type `siteI18n.build` in the console).
    build: "overwrite-block-cursor",
  };

  /* --- wire up the EN / DE links ------------------------------------------------------------ */

  langLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
      // Leave modified clicks alone so "open in new tab" still works.
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      setLanguage(link.getAttribute("data-lang"));
    });
  });

  /* --- start-up ----------------------------------------------------------------------------- */

  const requested = readParam();
  const initial = requested ?? readStored() ?? DEFAULT_LANG;

  if (initial !== DEFAULT_LANG) apply(initial);
  if (requested) writeStored(requested);
  // Keep the address bar honest (?ln=de for German, clean URL for English).
  if (requested || initial !== DEFAULT_LANG) syncUrl(initial);

  root.classList.remove("i18n-pending");
})();
