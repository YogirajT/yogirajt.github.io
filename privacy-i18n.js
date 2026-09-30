/**
 * Language support for privacy.html (English <-> German).
 *
 * English lives in the HTML itself (so it is what search engines and no-JS
 * visitors get). This file only holds the German text and swaps it in.
 *
 * It follows the same conventions as the home page, so a visitor's choice
 * carries from one page to the other:
 *   - the choice is remembered in localStorage under "lang" ("en" / "de");
 *   - "?ln=de" / "?ln=en" in the URL wins over the remembered choice;
 *   - it flips aria-current on the EN/DE links, which turns the globe;
 *   - it fires "sitelanguagechange" on document and exposes window.siteI18n.t()
 *     so scripts.js can translate the strings it creates itself.
 *
 * Markup hooks:
 *   data-i18n="key"                         replaces the element's content
 *   data-i18n-attr="attr:key;attr:key"      replaces attributes (aria-label, content...)
 *
 * Shared keys (nav.*, cookie.*, footer.*, a.*, contact.eyebrow) use the same names
 * as the home page. Page-specific keys start with "pv.".
 *
 * Load this file OR i18n.js on a page, never both.
 */
(() => {
  "use strict";

  const root = document.documentElement;
  const STORAGE_KEY = "lang";
  const LANGS = ["en", "de"];
  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  /* ==========================================================================
     GERMAN TEXT  (formal "Sie", as usual for a privacy policy)
     ========================================================================== */
  const DE = {
    /* --- shared with the home page --- */
    "nav.about": "Über mich",
    "nav.experience": "Erfahrung",
    "nav.skills": "Skills",
    "nav.contact": "Kontakt",
    "a.nav.primary": "Hauptnavigation",
    "a.lang.group": "Sprache",
    "a.theme.dark": "Dunkelmodus",
    "a.menu": "Menü öffnen",
    "cookie.eyebrow": "DATENSCHUTZ_EINSTELLUNGEN",
    "cookie.title": "Ihre Privatsphäre, Ihre Entscheidung.",
    "cookie.desc":
      "Diese Website nutzt notwendigen Browser-Speicher, um Ihre Einstellungen zu merken. Mit Ihrer Erlaubnis hilft mir Google Analytics zu verstehen, wie die Website genutzt wird, und sie zu verbessern.",
    "cookie.reject": "Analytics ablehnen",
    "cookie.accept": "Analytics akzeptieren",
    "cookie.policy": "Datenschutzerklärung lesen",
    "footer.privacy": "Datenschutzerklärung",
    "footer.cookies": "Cookie-Einstellungen",
    "contact.eyebrow": "Kontakt aufnehmen",

    /* --- page: title block --- */
    "pv.meta.title": "Datenschutzerklärung | Yogiraj Tawde",
    "pv.meta.desc":
      "Datenschutzerklärung für die persönliche Website von Yogiraj Tawde.",
    "pv.eyebrow": "Umgang mit Ihren Daten",
    "pv.title": "Daten&shy;schutz&shy;erklärung",
    "pv.intro":
      "Diese Seite erklärt, wie diese Website mit personenbezogenen Daten, dem Browser-Speicher und der Webanalyse umgeht.",
    "pv.updated": "Zuletzt aktualisiert: 23. September 2026",
    "pv.a.facts": "Auf einen Blick",
    "pv.f.controller": "Verantwortlicher",
    "pv.f.hosting": "Hosting",
    "pv.f.analytics": "Analytics",
    "pv.f.analytics.v": "Google Analytics, nur nach Ihrer Zustimmung",
    "pv.f.contact": "Kontakt",

    /* --- 1. controller --- */
    "pv.s1.h": "Wer ist für diese Website verantwortlich?",
    "pv.s1.p":
      "Verantwortlich für die Verarbeitung personenbezogener Daten auf dieser Website ist:",
    "pv.s1.role": "Persönliche Portfolio-Website",
    "pv.s1.email": "E-Mail:",

    /* --- 2. hosting --- */
    "pv.s2.h": "Hosting der Website",
    "pv.s2.p1":
      "Diese Website wird über GitHub Pages gehostet. Beim Besuch der Website können technische Informationen in Server-Logs verarbeitet werden, um die Website sicher und zuverlässig auszuliefern.",
    "pv.s2.p2":
      "Dazu können technische Daten wie Ihre IP-Adresse, Browser-Informationen, aufgerufene Seiten, Datum und Uhrzeit des Zugriffs sowie weitere Informationen gehören, die für den Betrieb und die Sicherheit der Hosting-Infrastruktur erforderlich sind.",
    "pv.s2.p3":
      "Informationen dazu, wie GitHub mit personenbezogenen Daten umgeht, finden Sie in der Datenschutzdokumentation von GitHub.",

    /* --- 3. local storage --- */
    "pv.s3.h": "Notwendiger lokaler Speicher",
    "pv.s3.p1":
      "Diese Website kann bestimmte Einstellungen lokal in Ihrem Browser speichern. Das dient dazu, Einstellungen wie Ihr gewähltes Farbschema, Ihre Sprache und Ihre Cookie-Auswahl zu merken.",
    "pv.s3.p2":
      "Diese Einstellungen werden lokal auf Ihrem Gerät gespeichert und weder für Werbung noch für websiteübergreifendes Tracking verwendet.",
    "pv.s3.cap": "Im Browser gespeicherte Einträge",
    "pv.s3.th1": "Speichereintrag",
    "pv.s3.th2": "Zweck",
    "pv.s3.r1.a": "Farbschema",
    "pv.s3.r1.b":
      "Merkt sich, ob Sie den hellen oder den dunklen Modus gewählt haben.",
    "pv.s3.r2.a": "Sprache",
    "pv.s3.r2.b":
      "Merkt sich, ob Sie Englisch oder Deutsch gewählt haben.",
    "pv.s3.r3.a": "Cookie-Auswahl",
    "pv.s3.r3.b": "Merkt sich Ihre Entscheidung zu Analytics.",

    /* --- 4. Google Analytics --- */
    "pv.s4.h": "Google Analytics",
    "pv.s4.p1":
      "Diese Website verwendet Google Analytics, um zu verstehen, wie Besucher mit der Website interagieren, und um Inhalte und Benutzerfreundlichkeit zu verbessern.",
    "pv.s4.p2":
      "Google Analytics wird erst geladen, nachdem Sie Analytics ausdrücklich akzeptiert haben. Wenn Sie Analytics ablehnen, wird das Google-Analytics-Skript von dieser Website nicht absichtlich geladen.",
    "pv.s4.p3":
      "Zu den Analytics-Daten können unter anderem Seitenaufrufe, der aus Netzwerkinformationen abgeleitete ungefähre Standort, Geräte- und Browser-Informationen sowie allgemeine Interaktionsdaten gehören.",
    "pv.s4.p4":
      "Google Analytics wird von Google bereitgestellt. Die Verarbeitung kann die Übermittlung von Daten in Länder außerhalb des Europäischen Wirtschaftsraums umfassen; dabei können geeignete Garantien und Übermittlungsmechanismen zum Einsatz kommen.",
    "pv.s4.p5":
      "Sie können Ihre Analytics-Auswahl jederzeit über die folgende Schaltfläche widerrufen oder ändern.",
    "pv.s4.btn": "Cookie-Einstellungen verwalten",

    /* --- 5. email --- */
    "pv.s5.h": "Kontakt per E-Mail",
    "pv.s5.p1":
      "Diese Website enthält einen E-Mail-Link, über den Sie mich direkt kontaktieren können. Ein Klick auf den Link öffnet Ihre eigene E-Mail-Anwendung bzw. Ihren E-Mail-Dienst.",
    "pv.s5.p2":
      "Wenn Sie mich per E-Mail kontaktieren, verarbeite ich die von Ihnen übermittelten Informationen, um Ihre Anfrage zu lesen, zu beantworten und zu bearbeiten.",
    "pv.s5.p3":
      "Zu den verarbeiteten personenbezogenen Daten können Ihr Name, Ihre E-Mail-Adresse, der Inhalt Ihrer Nachricht und weitere Angaben gehören, die Sie freiwillig machen.",

    /* --- 6. retention --- */
    "pv.s6.h": "Wie lange Daten gespeichert werden",
    "pv.s6.p1":
      "Lokale Browser-Einstellungen bleiben auf Ihrem Gerät gespeichert, bis Sie sie löschen, den Browser-Speicher leeren oder Ihre Auswahl ändern.",
    "pv.s6.p2":
      "Die Speicherdauer von Analytics-Daten richtet sich nach der Konfiguration der Google-Analytics-Property und den geltenden Datenverarbeitungspraktiken von Google.",
    "pv.s6.p3":
      "E-Mails und der zugehörige Schriftverkehr können so lange aufbewahrt werden, wie es zur Bearbeitung der Anfrage und zur Erfüllung geltender gesetzlicher Pflichten angemessen erforderlich ist.",

    /* --- 7. rights --- */
    "pv.s7.h": "Ihre Datenschutzrechte",
    "pv.s7.p":
      "Je nach anwendbarem Datenschutzrecht stehen Ihnen möglicherweise Rechte in Bezug auf Ihre personenbezogenen Daten zu. Dazu können gehören:",
    "pv.s7.l1": "Das Recht, Auskunft über personenbezogene Daten zu verlangen.",
    "pv.s7.l2": "Das Recht, die Berichtigung unrichtiger Daten zu verlangen.",
    "pv.s7.l3":
      "Das Recht, gegebenenfalls die Löschung personenbezogener Daten zu verlangen.",
    "pv.s7.l4":
      "Das Recht, unter bestimmten Voraussetzungen die Einschränkung der Verarbeitung zu verlangen.",
    "pv.s7.l5": "Das Recht, der Verarbeitung bestimmter Daten zu widersprechen.",
    "pv.s7.l6":
      "Das Recht, eine erteilte Einwilligung jederzeit zu widerrufen, sofern die Verarbeitung auf einer Einwilligung beruht.",
    "pv.s7.l7":
      "Das Recht, sich gegebenenfalls bei einer zuständigen Datenschutz-Aufsichtsbehörde zu beschweren.",

    /* --- 8. changes --- */
    "pv.s8.h": "Änderungen dieser Datenschutzerklärung",
    "pv.s8.p1":
      "Diese Datenschutzerklärung kann aktualisiert werden, wenn sich die Website, die eingesetzten Technologien oder die geltenden rechtlichen Anforderungen ändern.",
    "pv.s8.p2":
      "Die jeweils aktuelle Version ist stets auf dieser Seite abrufbar.",

    /* --- contact block --- */
    "pv.contact.h": "Fragen zum Datenschutz?",
    "pv.contact.p":
      "Wenn Sie Fragen zu dieser Datenschutzerklärung oder zur Verarbeitung Ihrer personenbezogenen Daten haben, erreichen Sie mich unter:",
    "pv.back": "&larr; Zurück zur Website",
  };

  /* ==========================================================================
     ENGINE
     ========================================================================== */

  const has = (key) => Object.prototype.hasOwnProperty.call(DE, key);
  let current = "en";

  const readStored = () => {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  };
  const writeStored = (lang) => {
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // Storage can be blocked (private mode); the language still applies.
    }
  };

  /** Same rule as the inline script in <head>: ?ln= wins, then the saved choice, else English. */
  const askedLang = () => {
    try {
      const asked = new URLSearchParams(location.search).get("ln");
      return LANGS.includes(asked) ? asked : null;
    } catch {
      return null;
    }
  };

  const fill = (text, vars) =>
    vars
      ? text.replace(/\{(\w+)\}/g, (match, name) =>
          name in vars ? String(vars[name]) : match,
        )
      : text;

  /** Translate `key`; `fallback` is the English text. Used by scripts.js. */
  const t = (key, fallback, vars) =>
    fill(current === "de" && has(key) ? DE[key] : (fallback ?? key), vars);

  // Snapshot the English text once, before anything is swapped, so switching
  // back never depends on a second copy of it.
  const contentNodes = [...document.querySelectorAll("[data-i18n]")].map(
    (el) => ({
      el,
      key: el.getAttribute("data-i18n"),
      en: el.tagName === "TITLE" ? el.textContent : el.innerHTML,
    }),
  );
  const attrNodes = [];
  document.querySelectorAll("[data-i18n-attr]").forEach((el) => {
    el.getAttribute("data-i18n-attr")
      .split(";")
      .forEach((pair) => {
        const at = pair.indexOf(":");
        if (at < 1) return;
        const attr = pair.slice(0, at).trim();
        attrNodes.push({
          el,
          attr,
          key: pair.slice(at + 1).trim(),
          en: el.getAttribute(attr) ?? "",
        });
      });
  });
  // aria-label / content attributes whose key is a *content* key (e.g. pv.title
  // carries soft hyphens): use the plain text form.
  const plain = (html) => html.replace(/&shy;/g, "").replace(/&amp;/g, "&");

  const langLinks = [...document.querySelectorAll(".lang-switch a[data-lang]")];

  /* --- typewriter-style text swap (switching language after page load) ----------------------
     Mirrors the effect in i18n.js -- see that file for the full rationale. In short: on a live
     switch, on-screen text is overwritten left to right, a token at a time (whole tags/entities count as one
     token, so nothing renders half-written); anything off-screen just swaps instantly. */

  const TOKEN_RE = /<[^>]+>|&[a-zA-Z#0-9]+;|[\s\S]/g;
  const tokenize = (html) => html.match(TOKEN_RE) || [];

  const TYPE_MS_PER_TOKEN = 24; // pace of the cursor: roughly constant, so length genuinely changes duration
  const TYPE_MS_MIN = 600; // even a one-word swap should read as a deliberate retype, not a flicker
  const TYPE_MS_MAX = 6000; // the longest paragraph (the hero pitch) takes this long; stops an outlier running away
  const STAGGER_MS = 260;

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

  const apply = (lang, { animate = false } = {}) => {
    const german = lang === "de";
    current = lang;
    root.lang = lang;
    const viewportH = window.innerHeight || document.documentElement.clientHeight;

    contentNodes.forEach(({ el, key, en }) => {
      const value = german && has(key) ? DE[key] : en;
      if (el.tagName === "TITLE") {
        el.textContent = value;
        return;
      }
      if (!animate || reduceMotion || !isOnScreen(el)) {
        cancelSwap(el); // a swap still running here (quick second click) must not overwrite this
        el.innerHTML = value;
        return;
      }
      const rect = el.getBoundingClientRect();
      const delayMs = Math.max(0, Math.min(STAGGER_MS, (rect.top / viewportH) * STAGGER_MS));
      typeSwap(el, value, delayMs);
    });

    attrNodes.forEach(({ el, attr, key, en }) => {
      el.setAttribute(attr, german && has(key) ? plain(DE[key]) : en);
    });

    langLinks.forEach((link) => {
      if (link.dataset.lang === lang) link.setAttribute("aria-current", "true");
      else link.removeAttribute("aria-current");
    });
  };

  const setLang = (lang, { persist = true, updateUrl = true, animate = true } = {}) => {
    if (!LANGS.includes(lang)) return;
    const changed = lang !== current;
    apply(lang, { animate });
    if (persist) writeStored(lang);

    if (updateUrl) {
      try {
        const url = new URL(location.href);
        if (lang === "de") url.searchParams.set("ln", "de");
        else url.searchParams.delete("ln");
        history.replaceState(null, "", url);
      } catch {
        // Not critical (e.g. sandboxed file:// previews).
      }
    }

    if (changed) {
      document.dispatchEvent(
        new CustomEvent("sitelanguagechange", { detail: { lang } }),
      );
    }
  };

  window.siteI18n = window.siteI18n || {
    t,
    setLang,
    get lang() {
      return current;
    },
  };

  // scripts.js relays the (spinning) globe's click to the real link; a plain click
  // or keyboard activation reaches us the same way. Either way: switch in place.
  document.addEventListener("click", (event) => {
    const link = event.target.closest(".lang-switch a[data-lang]");
    if (!link) return;
    event.preventDefault();
    setLang(link.dataset.lang);
  });

  /* --- Start-up: apply the requested language before scripts.js runs --- */
  try {
    const asked = askedLang();
    const start = asked || (readStored() === "de" ? "de" : "en");
    apply(start);
    if (asked) writeStored(asked); // a link that names a language sets the choice
  } finally {
    root.classList.remove("i18n-pending");
  }
})();
