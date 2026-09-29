/**
 * Language switching for yogirajt.github.io  (English default, German on demand)
 *
 * How it works
 *   - index.html ships fully written in ENGLISH. Nothing here rewrites English text, so search
 *     engines and no-JS visitors get the complete English page straight from the HTML.
 *   - German is applied only when it is asked for: "?ln=de" in the URL, the EN / DE switch in the
 *     header, or a previous choice remembered in localStorage. Order of precedence:
 *         ?ln=de|en  >  remembered choice  >  English
 *   - Translatable elements carry data-i18n="key" (their inner HTML is swapped) and/or
 *     data-i18n-attr="attr:key;attr2:key2" (attribute values are swapped). The German text lives
 *     in the DE table below. The original English is captured once at start-up, so switching back
 *     to English restores exactly what the HTML says.
 *   - <title>, meta description, Open Graph / Twitter tags, canonical URL, <html lang> and the
 *     JSON-LD block follow the language too.
 *   - The current language is mirrored in the address bar (?ln=de, or no parameter for English),
 *     so every language version has its own shareable URL.
 *
 * Pages opt in with data-i18n-page on <html>; on any other page (e.g. privacy.html) this file does
 * nothing at all.
 *
 * Public API (used by scripts.js):  window.siteI18n = { lang, set(lang), t(key, fallback, vars) }
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
  const DE = {
      "skip": "Zum Inhalt springen",
      "nav.about": "Über mich",
      "nav.experience": "Erfahrung",
      "nav.skills": "Kenntnisse",
      "nav.contact": "Kontakt",
      "nav.resume": "Lebenslauf",
      "a11y.newtab": " (öffnet in neuem Tab)",
      "a11y.pdfnewtab": " (PDF, öffnet in neuem Tab)",
      "hero.eyebrow": "Senior Full-Stack-Entwickler &middot; Berlin, DE",
      "hero.role": "Verteilte Systeme, ereignisgesteuerte APIs und Datenbanken, die auch im großen Maßstab halten.",
      "hero.pitch": "Ich bin ein Backend-orientierter Full-Stack-Entwickler mit <strong>über 8 Jahren</strong> Erfahrung darin, chaotische Produktionsprobleme in skalierbare Systeme zu verwandeln &ndash; von einem RabbitMQ-Framework, das Tausende Events pro Sekunde verarbeitet, bis zu einer Produktlinie, die auf <strong>1&nbsp;Mio.&nbsp;US-Dollar Jahresumsatz</strong> wuchs. Derzeit verantworte ich die Backend-Architektur in Berlin.",
      "hero.cta.download": "Lebenslauf herunterladen",
      "hero.cta.hello": "Kontakt aufnehmen",
      "social.email": "E-Mail",
      "arch.name.layered": "Schichtenarchitektur",
      "arch.name.hexagonal": "Hexagonal",
      "arch.name.event-driven": "Ereignisgesteuert",
      "arch.name.microservices": "Microservices",
      "arch.name.cqrs": "CQRS",
      "arch.name.pipeline": "Pipes und Filter",
      "arch.name.service-mesh": "Service Mesh",
      "arch.name.actor-model": "Aktormodell",
      "arch.name.peer-to-peer": "Peer-to-Peer",
      "arch.name.saga": "Saga",
      "arch.name.master-worker": "Master-Worker",
      "arch.name.serverless": "Serverless",
      "arch.name.active-passive": "Aktiv-Passiv",
      "about.eyebrow": "Der Werdegang",
      "about.title": "Von QBasic-Kritzeleien zu verteilten Systemen",
      "about.p1": "Alles begann mit der Neugier, in QBasic Formen zu zeichnen. Es folgten Bots für Ragnarok Online und das Reverse Engineering von Windows-Programmen mit OllyDbg, um sich einen Vorteil gegenüber anderen Spielern zu verschaffen – bis hin zu einer Excel-Anwendung zur Suche nach CPT-Code-Konflikten.",
      "about.p2": "Überwiegend Autodidakt, mit <strong>über 8 Jahren</strong> bewegter Web- und Mobile-Entwicklung in unterschiedlichen Branchen, Tech-Stacks, Backend-Architekturen, verteilten Systemen und Full-Stack-Produktarbeit – zwischen äußerst erfolgreichen Projekten und einigen leiseren Lektionen, die ich auf die harte Tour gelernt habe. Und es geht weiter. Wir fangen ja gerade erst an!",
      "facts.location": "Standort",
      "facts.location.v": "Berlin, Deutschland",
      "facts.focus": "Schwerpunkt",
      "facts.focus.v": "Backend-Architektur und verteilte Systeme",
      "facts.experience": "Erfahrung",
      "facts.experience.v": "8+ Jahre, Full-Stack-Wurzeln",
      "facts.languages": "Sprachen",
      "facts.languages.v": "Englisch, Deutsch (A2), Hindi, Marathi",
      "exp.eyebrow": "Berufserfahrung",
      "exp.title": "Systeme, die ich gebaut und ausgeliefert habe",
      "exp.sub": "In umgekehrt chronologischer Reihenfolge.",
      "loc.berlin": "&middot; Berlin, Deutschland",
      "loc.remote": "&middot; Remote",
      "loc.mumbai": "&middot; Mumbai, Indien",
      "date.job1": "Apr. 2026 &ndash; heute",
      "date.job2": "Aug. 2023 &ndash; März 2026",
      "date.job3": "Apr. 2022 &ndash; März 2023",
      "date.job4": "Feb. 2021 &ndash; März 2022",
      "date.job5": "Nov. 2019 &ndash; Feb. 2021",
      "job1.b1": "Leitung der Backend-Entwicklung für ein dreiköpfiges Vehicle-Procurement-Team und zentrale technische Ansprechperson für APIs, Backend-Services und ereignisgesteuerte Systeme.",
      "job1.b2": "Neugestaltung der Workflows für Fahrzeugimport, Auktion, Filterung und Bewertung &ndash; eine <strong>~4-fache</strong> Steigerung der Einkaufsproduktivität; die Bewertungszeit sank von 4&ndash;5 Minuten auf unter 1 Minute.",
      "job1.b3": "Aufbau einer Ingestion-Pipeline mit hohem Durchsatz, die von 10 auf <strong>~30 Fahrzeuge/s</strong> skaliert und die Entscheidungszeit in knappen Zeitfenstern um das <strong>3-Fache</strong> verkürzt.",
      "job2.b1": "Leitung der schrittweisen Migration eines Legacy-Monolithen zu NestJS-Microservices mit dem Strangler-Fig-Pattern und einer Database-per-Service-Architektur.",
      "job2.b2": "Entwurf eines produktiven RabbitMQ-Frameworks über <strong>8 Services und 15+ Exchanges, das Tausende Events pro Sekunde verarbeitet</strong> &ndash; mit generierten TypeScript-Typen.",
      "job2.b3": "Eigenständige Identifikation und Umsetzung von Produktverbesserungen mit einem geschätzten jährlichen Geschäftsnutzen von <strong>100.000&nbsp;&euro;+</strong>.",
      "job2.b4": "Mentoring von Entwicklerinnen und Entwicklern sowie Low-Code-Teammitgliedern bei der Integration von KI-Workflows in Produktfunktionen.",
      "job2.b5": "Verbesserung der Systemzuverlässigkeit: Die täglichen Support-Tickets sanken von <strong>~10&ndash;20 auf 2&ndash;3</strong>, und ein Rückstau nicht bestätigter Events wurde abgebaut.",
      "job2.b6": "Neuarchitektur des Zugriffs auf Fahrzeugdaten &ndash; die Antwortzeiten von Abfragen sanken <strong>von über 40 Sekunden auf unter 4 s bei mehr als 1&nbsp;Mio. Fahrzeugdatensätzen</strong>.",
      "job3.b1": "Mitentwurf und Aufbau eines Proceedings-Management-Produkts mit <strong>~1&nbsp;Mio.&nbsp;$ ARR</strong> &ndash; etwa ein Drittel des gesamten Unternehmens-ARR.",
      "job3.b2": "Entwurf wissenschaftlicher Publikations-Workflows, die von Organisationen wie IOP Publishing, ASCE, SPIE, AAAS und SAE International genutzt werden.",
      "job3.b3": "Entwicklung eines Citation-Analysis-Services zur Erkennung möglicher Zitationsmanipulation, doppelter Zitate und übermäßiger Selbstzitation.",
      "job3.b4": "Migration eines Legacy-API-Gateway-Monolithen in fachlich geschnittene Microservices mit dem Strangler-Fig-Pattern.",
      "job3.b5": "Verbesserung der Performance durch Beseitigung von N+1-Abfrageproblemen &ndash; <strong>Zugewinne um Größenordnungen</strong> in zentralen nutzernahen Workflows.",
      "job4.b1": "Entwurf und Aufbau eines privaten Payment-Gateways mit Anbindung von drei Großbanken &ndash; Echtgeldüberweisungen in Höhe von <strong>mehreren Millionen USD pro Tag</strong>, mit automatisiertem Abgleich.",
      "job4.b2": "Integration sicherer Banking-APIs mit Mutual TLS (mTLS) und zertifikatsbasierter Authentifizierung.",
      "job4.b3": "Mitarbeit an einer internen Plattform, die ein Drittsystem für ~1&nbsp;Mio.&nbsp;$ pro Jahr ersetzen sollte.",
      "job4.b4": "Entwicklung eines metadatengetriebenen React-Frameworks, das Formulare, CRUD-Operationen und Validierung aus JSON-Konfiguration erzeugt &ndash; die Entwicklungszeit pro Formular sank von <strong>~1 Tag auf ~2 Stunden</strong>.",
      "job4.b5": "Mentoring von drei Entwicklern zu React, Backend-Entwicklung und Datenbanktransaktionen.",
      "job5.b1": "End-to-End-Entwicklung einer Workplace-Analytics-Plattform, die Daten von <strong>~35.000 IoT-Sensoren</strong> auf fünf Kontinenten verarbeitet &ndash; für Kunden wie PwC, WTW, Rolls-Royce und Mastercard.",
      "job5.b2": "Aufbau einer Plattform für Bürobuchung und Arbeitsplatzzuweisung aus der COVID-Zeit mit AWS Lambda, API Gateway, S3 und Athena.",
      "job5.b3": "Verbesserung der MySQL/JPA-Abfrageperformance <strong>von ~10&ndash;15 s auf unter 500 ms</strong> durch Query-Optimierung und Redis-Caching.",
      "job5.b4": "Reduzierung der Laufzeiten von AWS-Athena-Analyseabfragen <strong>von über 1 Minute auf ~8&ndash;9 Sekunden</strong> bei Datensätzen von bis zu 1&nbsp;Milliarde Zeilen pro Jahr.",
      "job5.b5": "Entwurf von Echtzeit-WebSocket-Workflows und ereignisgesteuertem Caching für Live-Sensortracking, Belegung und die Auswertung von Geschäftsregeln.",
      "earlier.title": "Frühere Erfahrung",
      "e1.h": "Webentwickler &mdash; Legaldocs RSE",
      "e1.d": "Sep. 2018 &ndash; Nov. 2019 &middot; Navi Mumbai",
      "e1.p": "Legal-Tech-CRM, Automatisierungswerkzeuge, Workflows und Chrome-Erweiterungen. Mitentwicklung der Abrechnungs- und Buchhaltungs-App Ezo &ndash; über 40.000 Downloads in 5 Monaten.",
      "e2.h": "Webentwickler &mdash; Ahsan Alliance",
      "e2.d": "Jan. 2018 &ndash; Aug. 2018 &middot; Mumbai",
      "e2.p": "Soziale Sportplattform mit Live-Chat und Statistik-Tracking für über 150 Sportarten; Verbesserung der MariaDB-Skalierbarkeit.",
      "e3.h": "Praktikant Webentwicklung &mdash; Fierydevs",
      "e3.d": "Okt. 2017 &ndash; Jan. 2018 &middot; Thane",
      "e3.p": "Responsive Weboberflächen und Werkzeuge zur Erstellung von Umfragen und Formularen.",
      "skills.eyebrow": "Werkzeugkasten",
      "skills.title": "Kenntnisse und Technologien",
      "skills.g1": "Backend und Architektur",
      "skills.g2": "Messaging und Asynchronität",
      "skills.g3": "Datenbanken und Performance",
      "skills.g4": "Cloud und Infrastruktur",
      "skills.g5": "Frontend",
      "skills.g6": "Weitere Programmiersprachen",
      "edu.h2": "Ausbildung und Sprachen",
      "edu.title": "Ausbildung",
      "edu.web": "Weiterbildung Webentwicklung",
      "edu.langs": "Gesprochene Sprachen",
      "lang.english": "Englisch",
      "lang.german": "Deutsch",
      "lang.english.lvl": "Fließend im beruflichen Kontext",
      "lang.native": "Muttersprache",
      "contact.eyebrow": "Kontakt aufnehmen",
      "contact.title": "Sie suchen Verstärkung oder brauchen einfach fachliche Beratung?",
      "contact.sub": "Ansässig in Berlin, Deutschland",
      "contact.cta.download": "Lebenslauf herunterladen",
      "contact.cta.linkedin": "Auf LinkedIn vernetzen",
      "footer.privacy": "Datenschutzerklärung",
      "footer.cookies": "Cookie-Einstellungen",
      "cookie.eyebrow": "DATENSCHUTZ_EINSTELLUNGEN",
      "cookie.title": "Ihre Privatsphäre, Ihre Entscheidung.",
      "cookie.desc": "Diese Website nutzt notwendigen Browser-Speicher, um Ihre Einstellungen zu speichern. Mit Ihrer Erlaubnis hilft mir Google Analytics zu verstehen, wie die Website genutzt wird, und sie zu verbessern.",
      "cookie.reject": "Analyse ablehnen",
      "cookie.accept": "Analyse akzeptieren",
      "cookie.policy": "Datenschutzerklärung lesen",
      "a.nav.primary": "Hauptnavigation",
      "a.lang.group": "Sprache",
      "a.theme.dark": "Dunkelmodus",
      "a.social.group": "Soziale Netzwerke",
      "a.social.email": "E-Mail",
      "a.facts": "Kurzfakten",
      "a.copy.email": "E-Mail-Adresse kopieren",
      "a.tech": "Eingesetzte Technologien",
      "a.arch.region": "Diagramme zu Backend-Architekturen",
      "a.arch.roledesc": "Karussell",
      "a.arch.group": "Architekturdiagramm auswählen",
      "a.arch.desc.layered": "Schichtenarchitektur: Präsentations-, Anwendungs-, Domänen- und Infrastrukturschicht übereinander. Aufrufe laufen von oben nach unten durch die Schichten, und die Infrastruktur implementiert die von der Domäne definierten Schnittstellen.",
      "a.arch.desc.hexagonal": "Hexagonale Architektur: ein Domänenkern, umgeben von Ports. Eine REST-API, eine externe API und eine CLI steuern den Kern auf der einen Seite; Message Queue, Cache und Datenbank werden auf der anderen Seite von ihm angesteuert.",
      "a.arch.desc.event-driven": "Ereignisgesteuerte Architektur: Bestell- und Zahlungsdienst veröffentlichen Events auf einem zentralen Event-Bus, der sie an E-Mail-, Analyse- und Lagerdienst verteilt.",
      "a.arch.desc.microservices": "Microservices: Ein API-Gateway leitet Anfragen an unabhängige Benutzer-, Bestell-, Lager- und Zahlungsdienste weiter, jeder mit eigener Datenbank.",
      "a.arch.desc.cqrs": "CQRS: Ein Client sendet Befehle an ein Schreibmodell mit Event Store und Abfragen an ein getrenntes Lesemodell mit eigener Lesedatenbank. Änderungen werden vom Event Store in die Lesedatenbank projiziert.",
      "a.arch.desc.pipeline": "Pipes und Filter: Daten fließen von einer Quelle durch die Stufen Parsen, Validieren und Transformieren in eine Senke.",
      "a.arch.desc.service-mesh": "Service Mesh: Eine Control Plane konfiguriert Sidecar-Proxys an den Diensten A, B und C, die darüber miteinander kommunizieren.",
      "a.arch.desc.actor-model": "Aktormodell: Unabhängige Aktoren A, B, C und D kommunizieren ausschließlich über asynchrone Nachrichten, ohne gemeinsamen Zustand.",
      "a.arch.desc.peer-to-peer": "Peer-to-Peer: fünf direkt miteinander verbundene Knoten, ohne zentralen Server.",
      "a.arch.desc.saga": "Saga-Muster: Bestell-, Zahlungs-, Lager- und Versanddienst führen nacheinander je eine lokale Transaktion aus; schlägt ein Schritt fehl, machen Kompensationsaktionen die vorherigen Schritte rückgängig.",
      "a.arch.desc.master-worker": "Master-Worker: Ein Master verteilt Aufgaben an vier Worker und sammelt deren Ergebnisse ein.",
      "a.arch.desc.serverless": "Serverless: Ein Ereignis-Trigger ruft kurzlebige Funktionen bei Bedarf auf.",
      "a.arch.desc.active-passive": "Aktiv-Passiv-Failover: Der Datenverkehr geht an den aktiven Primärknoten, während ein replizierter Standby-Knoten im Leerlauf wartet.",
      "head.title": "Yogiraj Tawde | Senior Backend- & Full-Stack-Entwickler, Berlin",
      "head.description": "Yogiraj Tawde, Senior Backend- und Full-Stack-Entwickler in Berlin. 8+ Jahre Erfahrung mit verteilten Systemen und ereignisgesteuerten APIs (Node.js, TypeScript).",
      "head.ogTitle": "Yogiraj Tawde | Senior Backend- & Full-Stack-Entwickler, Berlin",
      "head.ogDescription": "Senior Backend- und Full-Stack-Entwickler mit über 8 Jahren Erfahrung in verteilten Systemen, ereignisgesteuerten APIs und leistungsstarken Datenplattformen.",
      "head.ogImageAlt": "Yogiraj Tawde, Senior Backend- und Full-Stack-Entwickler in Berlin",
      "head.ogLocale": "de_DE",
      "head.ogLocaleAlt": "en_US",
      "head.jobTitle": "Senior Backend- und Full-Stack-Entwickler",
      "head.ldDescription": "Senior Backend- und Full-Stack-Entwickler mit über 8 Jahren Erfahrung in verteilten Systemen, ereignisgesteuerten APIs und leistungsstarken Datenplattformen.",
      "arch.pause": "Diagramm-Rotation anhalten",
      "arch.play": "Diagramm-Rotation fortsetzen",
      "arch.status": "Diagramm {n} von {total}: {name}",
      "toast.copied": "E-Mail-Adresse in die Zwischenablage kopiert",
      "nav.menu.open": "Menü öffnen",
      "nav.menu.close": "Menü schließen",
      "lang.changed": "Sprache auf Deutsch umgestellt."
    };

  const ANNOUNCEMENTS = {
    en: "Language changed to English.",
    de: DE["lang.changed"],
  };

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
    ["head.description", pick('meta[name="description"]'), "content"],
    ["head.ogTitle", pick('meta[property="og:title"]'), "content"],
    ["head.ogDescription", pick('meta[property="og:description"]'), "content"],
    ["head.ogTitle", pick('meta[name="twitter:title"]'), "content"],
    ["head.ogDescription", pick('meta[name="twitter:description"]'), "content"],
    ["head.ogImageAlt", pick('meta[property="og:image:alt"]'), "content"],
    ["head.ogImageAlt", pick('meta[name="twitter:image:alt"]'), "content"],
    ["head.ogLocale", pick('meta[property="og:locale"]'), "content"],
    ["head.ogLocaleAlt", pick('meta[property="og:locale:alternate"]'), "content"],
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

  const TYPE_MS_PER_TOKEN = 16; // pace of the cursor: roughly constant, so length genuinely changes duration
  const TYPE_MS_MIN = 450; // even a one-word swap should read as a deliberate retype, not a flicker
  const TYPE_MS_MAX = 3600; // a full paragraph takes longer, but this stops an outlier running away
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
     thin cursor marks the boundary and the next LOOKAHEAD_WORDS words of old text ahead of it are
     already gone -- so the eye can follow the cursor, and it never types into text that is still
     there. The cursor has no layout width (a border cancelled by a negative margin, like the
     hero's), and its style is added from here so both pages get it without a stylesheet change. */
  const LOOKAHEAD_WORDS = 2;
  const CARET_HTML = '<span class="i18n-caret" aria-hidden="true"></span>';
  const CARET_RE = /<span class="i18n-caret"[^>]*><\/span>/g;
  if (!document.getElementById("i18n-caret-style")) {
    const style = document.createElement("style");
    style.id = "i18n-caret-style";
    style.textContent =
      ".i18n-caret{display:inline-block;width:0;height:1.05em;margin-right:-2px;vertical-align:text-bottom;" +
      "border-right:2px solid var(--green,currentColor);pointer-events:none}";
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

  /** [new text so far] + cursor + [old text from just past the words the cursor has cleared]. */
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
    return typed.join("") + closeTyped + (withCaret ? CARET_HTML : "") + reopenRest + fromTokens.slice(j).join("");
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
      const fromHtml = el.innerHTML.replace(CARET_RE, "");
      if (fromHtml === toHtml) {
        cancelSwap(el);
        return;
      }
      const fromTokens = tokenize(fromHtml);
      const toTokens = tokenize(toHtml);
      // Flex/grid containers (an icon + label button) lay each child out separately, so an extra
      // child -- even an invisible cursor -- would move things; they just go without one.
      const withCaret = !/flex|grid/.test(getComputedStyle(el).display);
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
      const step = (now) => {
        if (!isCurrent()) return;
        // (rAF's timestamp is the frame's start, which can be a hair before `start`: never go below 0,
        // or the first frame would slice from the wrong end.)
        const progress = Math.max(0, (now - start) / durationMs);
        if (progress >= 1) {
          el.innerHTML = toHtml; // land on the exact final markup, not an interpolated step
          finish();
          return;
        }
        el.innerHTML = overwriteFrame(fromTokens, toTokens, progress, withCaret, lookahead);
        if (hasBox) {
          const k = smoothstep(Math.min(1, progress / SIZE_LEAD));
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
          node.jobTitle = DE["head.jobTitle"];
          node.description = DE["head.ldDescription"];
        }
        if (node["@type"] === "ProfilePage") {
          node.name = DE["head.title"];
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
    document.title = isEnglish ? titleEn : DE["head.title"];
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
    let text = current === DEFAULT_LANG ? fallback : (DE[key] ?? fallback);
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
