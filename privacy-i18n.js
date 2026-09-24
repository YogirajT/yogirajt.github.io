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

  const apply = (lang) => {
    const german = lang === "de";
    current = lang;
    root.lang = lang;

    contentNodes.forEach(({ el, key, en }) => {
      const value = german && has(key) ? DE[key] : en;
      if (el.tagName === "TITLE") el.textContent = value;
      else el.innerHTML = value;
    });

    attrNodes.forEach(({ el, attr, key, en }) => {
      el.setAttribute(attr, german && has(key) ? plain(DE[key]) : en);
    });

    langLinks.forEach((link) => {
      if (link.dataset.lang === lang) link.setAttribute("aria-current", "true");
      else link.removeAttribute("aria-current");
    });
  };

  const setLang = (lang, { persist = true, updateUrl = true } = {}) => {
    if (!LANGS.includes(lang)) return;
    const changed = lang !== current;
    apply(lang);
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
