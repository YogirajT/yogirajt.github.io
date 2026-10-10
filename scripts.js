/**
 * Site behaviour for yogirajt.github.io
 *
 * Accessibility: honours window.siteI18n (see i18n.js) for every user-facing
 * string it creates itself (toast, live-region announcements, aria-labels).
 *
 * A plain script (no build step, no modules). Every feature looks up its own
 * markup and quietly does nothing when it isn't on the page, so the same file
 * also works on pages that only contain part of the site (e.g. privacy.html).
 *
 *   1. Shared helpers
 *   2. Page features      theme toggle, footer year, hero diagrams, mobile
 *                         nav, scroll reveal, scroll-spy, power-bus timeline,
 *                         toolbox chips, section effects (see SECTION_FX), typewriter, pointer
 *                         effects, hero fireflies, copy-email
 *   3. Ambient scene      rain, foliage, lightning, scroll-driven atmosphere
 *   4. Cookie consent     consent-gated Google Analytics
 *   5. Start-up
 */
(() => {
  "use strict";

  /* ==========================================================================
     1. SHARED HELPERS
     ========================================================================== */

  const root = document.documentElement;

  const reducedMotionQuery = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  );
  /** Snapshot taken at load. The ambient scene also listens for live changes. */
  const reduceMotion = reducedMotionQuery.matches;
  const finePointer = window.matchMedia("(pointer: fine)").matches;
  const hasIntersectionObserver = "IntersectionObserver" in window;

  /** SECTION EFFECTS. List the sections (by id) that get each effect, or set a
      list to [] to switch that effect off everywhere.
        doodle  hand-drawn line under the section heading
        mesh    growing node graph behind the section
        facts   status LEDs on the About facts card (true / false)
      To compare combinations without editing the file, add ?fx=... to the page URL:
        ?fx=doodle,mesh      only those two effects (in their configured sections)
        ?fx=doodle:skills    the doodle in the Toolbox section only
        ?fx=mesh:education   the mesh in the Education section only
        ?fx=all  ?fx=none    everything / nothing
      (?journey=... works too.) */
  const SECTION_FX = (() => {
    const fx = {
      doodle: ["about", "experience", "skills"],
      mesh: ["about", "education"],
      facts: true,
    };
    const params = new URLSearchParams(window.location.search);
    const query = params.get("fx") ?? params.get("journey");
    if (query !== null) {
      const wanted = query.toLowerCase().split(",").map((token) => token.trim());
      const all = wanted.includes("all");
      ["doodle", "mesh"].forEach((name) => {
        fx[name] =
          all || wanted.includes(name)
            ? fx[name]
            : fx[name].filter((id) => wanted.includes(`${name}:${id}`));
      });
      fx.facts = !wanted.includes("none"); // LEDs stay unless everything is off
    }
    return fx;
  })();

  const isLightTheme = () => root.getAttribute("data-theme") === "light";
  const currentTheme = () => (isLightTheme() ? "light" : "dark");

  /** Random element of a non-empty array. */
  const pick = (items) => items[Math.floor(Math.random() * items.length)];

  /** Random number in [min, max). */
  const randomBetween = (min, max) => min + Math.random() * (max - min);

  const toRadians = (degrees) => (degrees * Math.PI) / 180;

  /** Sets several CSS custom properties / style properties in one go. */
  const setStyleProps = (element, props) => {
    Object.entries(props).forEach(([name, value]) => {
      element.style.setProperty(name, value);
    });
  };

  /** Runs `callback` once the DOM is ready (immediately if it already is). */
  const onReady = (callback) => {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", callback);
    } else {
      callback();
    }
  };

  /** Translates `key` (falling back to `fallback` in English) via i18n.js, if it loaded. */
  const t = (key, fallback, vars) =>
    window.siteI18n ? window.siteI18n.t(key, fallback, vars) : fallback;

  /* ==========================================================================
     2. PAGE FEATURES
     ========================================================================== */

  /* --- Theme toggle (light / dark) ------------------------------------------
     The bulb switch (checked = dark) drives the theme, which is persisted.
     The old button-style toggles are still wired up in case another page
     (e.g. privacy.html) hasn't been switched over to the bulb yet.
     Every change is announced with a "themechange" event on the document. */

  const THEME_SHIFT_MS = 1900; // how long the theme-change overlay class stays

  function initThemeToggle() {
    const bulb = document.getElementById("theme-toggle");
    const buttons = ["theme-toggle-desktop", "theme-toggle-mobile"]
      .map((id) => document.getElementById(id))
      .filter(Boolean);
    let shiftTimer;

    const syncLabels = () => {
      const light = isLightTheme();
      if (bulb) {
        bulb.checked = !light;
        bulb.setAttribute("aria-checked", String(!light));
        bulb.setAttribute(
          "aria-label",
          t("ui.aria.themeDark", "Dark mode"),
        );
      }
      buttons.forEach((button) => {
        button.setAttribute("aria-pressed", String(light));
        const label = button.querySelector(".tt-label");
        if (label) label.textContent = light ? "LIGHT" : "DARK";
      });
    };
    document.addEventListener("sitelanguagechange", syncLabels);

    const setTheme = (theme) => {
      if (currentTheme() === theme) return;

      const shiftClass =
        theme === "light"
          ? "theme-shifting-to-light"
          : "theme-shifting-to-dark";

      root.classList.remove(
        "theme-shifting-to-light",
        "theme-shifting-to-dark",
      );
      root.classList.add(shiftClass); // triggers the cinematic overlay
      root.setAttribute("data-theme", theme);

      try {
        localStorage.setItem("theme", theme);
      } catch {
        // Storage can be blocked (e.g. private mode); the theme still applies.
      }

      syncLabels();
      document.dispatchEvent(new CustomEvent("themechange", { detail: { theme } }));

      clearTimeout(shiftTimer);
      shiftTimer = setTimeout(() => {
        root.classList.remove(shiftClass);
      }, THEME_SHIFT_MS);
    };

    buttons.forEach((button) => {
      button.addEventListener("click", () => {
        setTheme(isLightTheme() ? "dark" : "light");
      });
    });
    if (bulb) {
      bulb.addEventListener("change", () => {
        setTheme(bulb.checked ? "dark" : "light");
        syncLabels();
      });
    }
    syncLabels();
  }

  /* --- Hero fireflies --------------------------------------------------------
     Dark mode only. Switching the bulb on releases a swarm of fireflies that
     flies out of the bulb and buzzes around the hero; switching to light mode
     fades them out one by one. Each firefly is a spring-driven wanderer (smooth
     curved flight to a nearby random spot, with a tiny fast jitter for the
     buzz) plus a CSS glow pulse. The loop pauses while the hero is off-screen
     and nothing runs at all under prefers-reduced-motion. */

  const FIREFLY_MIN = 6;
  const FIREFLY_MAX = 10;
  const FIREFLY_AREA_PER_FLY = 80000; // px² of hero per firefly
  const FIREFLY_FADE_IN_MS = 700;
  const FIREFLY_FADE_OUT_MS = 1100;
  const FIREFLY_FADE_OUT_STAGGER_MS = 900;

  function initHeroFireflies() {
    const hero = document.querySelector(".hero");
    if (!hero || reduceMotion) return;

    const bulbSwitch = document.getElementById("theme-switch");
    const layer = document.createElement("div");
    layer.className = "fireflies";
    layer.setAttribute("aria-hidden", "true");
    hero.appendChild(layer);

    let flies = [];
    let rafId = 0;
    let lastTime = 0;
    let inView = true;
    let cleanupTimer = 0;
    let width = hero.clientWidth;
    let height = hero.clientHeight;

    const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

    const measure = () => {
      width = hero.clientWidth;
      height = hero.clientHeight;
    };

    /** Where the lit bulb sits, in hero coordinates (clamped to the hero). */
    const bulbOrigin = () => {
      if (!bulbSwitch) return { x: width * 0.9, y: 0 };
      const heroRect = hero.getBoundingClientRect();
      const rect = bulbSwitch.getBoundingClientRect();
      // Lit = bulb rests on the right-hand side of the switch.
      return {
        x: clamp(rect.left + rect.width * 0.75 - heroRect.left, 0, width),
        y: clamp(rect.top + rect.height / 2 - heroRect.top, 0, height),
      };
    };

    const chooseTarget = (fly, now, forceFar) => {
      const margin = 24;
      if (forceFar || Math.random() < 0.18) {
        fly.tx = randomBetween(margin, Math.max(margin, width - margin));
        fly.ty = randomBetween(margin, Math.max(margin, height - margin));
      } else {
        const angle = randomBetween(0, Math.PI * 2);
        const distance = randomBetween(50, 200);
        fly.tx = clamp(
          fly.x + Math.cos(angle) * distance,
          margin,
          Math.max(margin, width - margin),
        );
        fly.ty = clamp(
          fly.y + Math.sin(angle) * distance,
          margin,
          Math.max(margin, height - margin),
        );
      }
      fly.retargetAt = now + randomBetween(1100, 3200);
    };

    const fadeIn = (fly, delayMs) => {
      const el = fly.el;
      el.style.transition = `opacity ${FIREFLY_FADE_IN_MS}ms ease ${delayMs}ms`;
      el.style.opacity = String(randomBetween(0.75, 1));
    };

    const createFly = (origin, now, delayMs) => {
      const el = document.createElement("span");
      el.className = "firefly";
      setStyleProps(el, {
        "--ff-size": `${randomBetween(3, 6.5).toFixed(1)}px`,
        "--ff-pulse": `${randomBetween(1.6, 3.8).toFixed(2)}s`,
        "--ff-delay": `${(-randomBetween(0, 3.8)).toFixed(2)}s`,
      });
      el.appendChild(document.createElement("i"));
      el.style.transform = `translate3d(${origin.x}px, ${origin.y}px, 0)`;
      layer.appendChild(el);

      const fly = {
        el,
        x: origin.x,
        y: origin.y,
        vx: randomBetween(-30, 30),
        vy: randomBetween(10, 60),
        tx: origin.x,
        ty: origin.y,
        retargetAt: 0,
        startAt: now + delayMs,
        maxSpeed: randomBetween(110, 190),
        buzz: randomBetween(0.8, 1.8),
        phase: randomBetween(0, Math.PI * 2),
      };
      chooseTarget(fly, now, true);
      fly.retargetAt = fly.startAt + randomBetween(1500, 3500);

      void el.offsetWidth; // commit opacity: 0 so the fade-in transitions
      fadeIn(fly, delayMs);
      return fly;
    };

    const step = (fly, now, dt) => {
      if (now < fly.startAt) return;
      if (now >= fly.retargetAt) chooseTarget(fly, now, false);

      // Damped spring towards the target: smooth, slightly curved flight.
      fly.vx += ((fly.tx - fly.x) * 3 - fly.vx * 2.8) * dt;
      fly.vy += ((fly.ty - fly.y) * 3 - fly.vy * 2.8) * dt;
      const speed = Math.hypot(fly.vx, fly.vy);
      if (speed > fly.maxSpeed) {
        fly.vx *= fly.maxSpeed / speed;
        fly.vy *= fly.maxSpeed / speed;
      }
      fly.x += fly.vx * dt;
      fly.y += fly.vy * dt;

      // The buzz: a tiny, fast wobble that never accumulates.
      const t = now / 1000;
      const bx = Math.sin(t * 9 * fly.buzz + fly.phase) * 1.6;
      const by = Math.cos(t * 11 * fly.buzz + fly.phase * 1.7) * 1.6;
      fly.el.style.transform = `translate3d(${(fly.x + bx).toFixed(1)}px, ${(fly.y + by).toFixed(1)}px, 0)`;
    };

    const tick = (time) => {
      const dt = Math.max(0, Math.min((time - lastTime) / 1000, 0.05));
      lastTime = time;
      flies.forEach((fly) => step(fly, time, dt));
      rafId = requestAnimationFrame(tick);
    };

    const startLoop = () => {
      if (rafId || !flies.length || !inView) return;
      lastTime = performance.now();
      rafId = requestAnimationFrame(tick);
    };

    const stopLoop = () => {
      cancelAnimationFrame(rafId);
      rafId = 0;
    };

    const destroy = () => {
      stopLoop();
      flies.forEach((fly) => fly.el.remove());
      flies = [];
    };

    const release = () => {
      clearTimeout(cleanupTimer);
      if (flies.length) {
        // Switched back on mid-fade: bring the same swarm back.
        flies.forEach((fly) => fadeIn(fly, 0));
        startLoop();
        return;
      }
      measure();
      const origin = bulbOrigin();
      const now = performance.now();
      const count = Math.round(
        clamp(
          (width * height) / FIREFLY_AREA_PER_FLY,
          FIREFLY_MIN,
          FIREFLY_MAX,
        ),
      );
      // Wait for the bulb to light up, then let them out a few at a time.
      for (let i = 0; i < count; i += 1) {
        const delay = 500 + i * 110 + randomBetween(0, 100);
        flies.push(createFly(origin, now, delay));
      }
      startLoop();
    };

    const fadeAway = () => {
      flies.forEach((fly) => {
        // They keep buzzing while they fade, each leaving at its own moment.
        fly.el.style.transition = `opacity ${FIREFLY_FADE_OUT_MS}ms ease ${randomBetween(0, FIREFLY_FADE_OUT_STAGGER_MS).toFixed(0)}ms`;
        fly.el.style.opacity = "0";
      });
      clearTimeout(cleanupTimer);
      cleanupTimer = setTimeout(
        destroy,
        FIREFLY_FADE_OUT_MS + FIREFLY_FADE_OUT_STAGGER_MS + 150,
      );
    };

    document.addEventListener("themechange", (event) => {
      if (event.detail.theme === "dark") release();
      else fadeAway();
    });

    if (hasIntersectionObserver) {
      new IntersectionObserver((entries) => {
        inView = entries[entries.length - 1].isIntersecting;
        if (inView) startLoop();
        else stopLoop();
      }).observe(hero);
    }

    if ("ResizeObserver" in window) new ResizeObserver(measure).observe(hero);
    else window.addEventListener("resize", measure);

    if (!isLightTheme()) release();
  }

  /* --- Footer year ---------------------------------------------------------- */

  function initFooterYear() {
    const yearElement = document.getElementById("year");
    if (yearElement) yearElement.textContent = new Date().getFullYear();
  }

  /* --- Hero visual: cycling backend-architecture diagrams -------------------
     Auto-advances, pauses on hover / focus / while off-screen, can be driven
     by the dots, and supports swipe left/right on touch screens. */

  const ARCH_DELAY_MS = 5200;
  // Mobile viewers glance at the diagrams mid-scroll, so give them longer.
  const ARCH_DELAY_MOBILE_MS = 7500;
  const ARCH_SWIPE_MIN_DISTANCE = 40; // px
  const ARCH_SWIPE_HORIZONTAL_RATIO = 1.5; // |dx| must beat |dy| by this factor

  function initArchCycler() {
    const cycler = document.querySelector("[data-arch-cycler]");
    if (!cycler) return;

    const panels = cycler.querySelectorAll("[data-arch-panel]");
    const dots = cycler.querySelectorAll("[data-arch-target]");
    // Order = the order of the dots, which the build generates from content/hero.json.
    const ARCH_ORDER = Array.from(dots, (dot) => dot.getAttribute("data-arch-target"));
    const pauseButton = cycler.querySelector("[data-arch-pause]");
    const statusEl = cycler.querySelector("[data-arch-status]");

    let index = 0; // position of the visible diagram in ARCH_ORDER
    let timer = null;
    let hovered = false;
    let inView = true;
    let userPaused = false;
    let announceTimer = null;

    /** Key of the diagram `step` places after (or before) the current one. */
    const keyAtOffset = (step) =>
      ARCH_ORDER[(index + step + ARCH_ORDER.length) % ARCH_ORDER.length];

    const highlightDot = (key) => {
      dots.forEach((dot) => {
        const isActive = dot.getAttribute("data-arch-target") === key;
        dot.classList.toggle("is-active", isActive);
        if (isActive) dot.setAttribute("aria-current", "true");
        else dot.removeAttribute("aria-current");
      });
    };

    /** Tells a screen reader which diagram is now showing (throttled so
     *  auto-advance every few seconds doesn't talk over the user). */
    const announce = (key) => {
      if (!statusEl) return;
      clearTimeout(announceTimer);
      const n = ARCH_ORDER.indexOf(key) + 1;
      // Read the name straight from that dot's visually-hidden label rather
      // than keeping a second copy of the diagram names in JS: i18n.js keeps
      // that label in the current language already.
      const dot = cycler.querySelector(`[data-arch-target="${key}"]`);
      const name = dot ? dot.textContent.trim() : key;
      const message = t("ui.messages.archStatus", "Diagram {n} of {total}: {name}", {
        n,
        total: ARCH_ORDER.length,
        name,
      });
      statusEl.textContent = "";
      announceTimer = setTimeout(() => {
        statusEl.textContent = message;
      }, 120);
    };

    const showDiagram = (key) => {
      index = ARCH_ORDER.indexOf(key);
      panels.forEach((panel) => {
        const active = panel.getAttribute("data-arch-panel") === key;
        panel.classList.toggle("is-active", active);
        panel.setAttribute("aria-hidden", String(!active));
      });
      highlightDot(key);
      announce(key);
    };

    /**
     * Like showDiagram, but slides the outgoing and incoming diagrams past
     * each other (with a fade). A "left" swipe advances: the next diagram
     * enters from the right while the current one exits to the left.
     */
    const swipeToDiagram = (key, direction) => {
      const toPanel = cycler.querySelector(`[data-arch-panel="${key}"]`);
      const fromPanel = cycler.querySelector(".arch-diagram.is-active");
      if (!toPanel || toPanel === fromPanel) return;
      toPanel.setAttribute("aria-hidden", "false");
      if (fromPanel) fromPanel.setAttribute("aria-hidden", "true");

      if (reduceMotion) {
        showDiagram(key);
        return;
      }

      const enterClass =
        direction === "left" ? "arch-swipe-right" : "arch-swipe-left";
      const exitClass =
        direction === "left" ? "arch-swipe-left" : "arch-swipe-right";

      toPanel.classList.add("arch-swipe", enterClass);
      toPanel.style.zIndex = "3";
      void toPanel.offsetWidth; // force a reflow so the start position registers

      requestAnimationFrame(() => {
        if (fromPanel) {
          fromPanel.classList.add("arch-swipe", exitClass);
          fromPanel.classList.remove("is-active");
        }
        toPanel.classList.remove(enterClass);
        toPanel.classList.add("is-active");
      });
      announce(key);

      const cleanup = () => {
        toPanel.classList.remove("arch-swipe");
        toPanel.style.zIndex = "";
        if (fromPanel) fromPanel.classList.remove("arch-swipe", exitClass);
        toPanel.removeEventListener("transitionend", cleanup);
      };
      toPanel.addEventListener("transitionend", cleanup);

      index = ARCH_ORDER.indexOf(key);
      highlightDot(key);
    };

    /** (Re)starts auto-advance, unless something says it should be paused. */
    const refreshTimer = () => {
      clearInterval(timer);
      if (reduceMotion || hovered || !inView || userPaused) return;

      const delay =
        window.innerWidth <= 700 ? ARCH_DELAY_MOBILE_MS : ARCH_DELAY_MS;
      timer = setInterval(() => showDiagram(keyAtOffset(1)), delay);
    };

    const syncPauseButton = () => {
      if (!pauseButton) return;
      const paused = userPaused || reduceMotion;
      pauseButton.setAttribute("aria-pressed", String(paused));
      pauseButton.setAttribute(
        "aria-label",
        paused
          ? t("ui.messages.archPlay", "Resume diagram rotation")
          : t("ui.messages.archPause", "Pause diagram rotation"),
      );
    };

    dots.forEach((dot) => {
      dot.addEventListener("click", () => {
        showDiagram(dot.getAttribute("data-arch-target"));
        refreshTimer();
      });
    });

    if (pauseButton) {
      // A manual pause/play, independent of the automatic reasons above (hover,
      // focus, off-screen, reduced motion): it is the only one that persists.
      pauseButton.hidden = reduceMotion; // reduced motion is already fully paused
      pauseButton.addEventListener("click", () => {
        userPaused = !userPaused;
        syncPauseButton();
        refreshTimer();
      });
      syncPauseButton();
      document.addEventListener("sitelanguagechange", syncPauseButton);
    }

    // Pause while the pointer is over the diagrams or keyboard focus is inside.
    [
      ["pointerenter", true],
      ["pointerleave", false],
      ["focusin", true],
      ["focusout", false],
    ].forEach(([eventName, isHovered]) => {
      cycler.addEventListener(eventName, () => {
        hovered = isHovered;
        refreshTimer();
      });
    });

    // Swipe left/right on the diagram stage to navigate (mobile).
    const stage = cycler.querySelector(".arch-stage");
    if (stage) {
      let touchStartX = 0;
      let touchStartY = 0;
      let touchActive = false;

      stage.addEventListener(
        "touchstart",
        (event) => {
          if (event.touches.length !== 1) return;
          touchStartX = event.touches[0].clientX;
          touchStartY = event.touches[0].clientY;
          touchActive = true;
        },
        { passive: true },
      );

      stage.addEventListener(
        "touchend",
        (event) => {
          if (!touchActive) return;
          touchActive = false;

          const touch = event.changedTouches[0];
          const dx = touch.clientX - touchStartX;
          const dy = touch.clientY - touchStartY;

          // Require a deliberate, mostly-horizontal swipe.
          if (
            Math.abs(dx) < ARCH_SWIPE_MIN_DISTANCE ||
            Math.abs(dx) < Math.abs(dy) * ARCH_SWIPE_HORIZONTAL_RATIO
          ) {
            return;
          }

          const direction = dx < 0 ? "left" : "right";
          const step = direction === "left" ? 1 : -1;
          swipeToDiagram(keyAtOffset(step), direction);
          refreshTimer();
        },
        { passive: true },
      );
    }

    // Pause entirely while scrolled out of view, so mobile viewers always see
    // a fresh diagram (not a mid-fade one) when it scrolls back on screen.
    if (hasIntersectionObserver) {
      new IntersectionObserver(
        ([entry]) => {
          inView = entry.isIntersecting;
          refreshTimer();
        },
        { threshold: 0.2 },
      ).observe(cycler);
    }

    refreshTimer();
  }

  /* --- Language switch: a 3D globe that spins between EN and DE -------------
     The two links in .lang-switch are labels written on opposite sides of one
     globe (see the CSS). Whichever part of it is hit, a click always goes to the
     language that isn't showing: the globe spins half a turn to show its far
     side, and once the new label is coming round the real link is
     followed, so i18n.js does the actual switching exactly as before. Only the
     label pointing away is exposed to keyboards / screen readers, as the
     "switch to ..." action. */

  function initLangSwitch() {
    const box = document.querySelector(".lang-switch");
    const faces = box ? [...box.querySelectorAll("a[data-lang]")] : [];
    if (faces.length < 2) return;

    const SPIN_MS = 800; // matches the --rot transition in the CSS
    const SPIN_DEG = 180; // half a turn: ends on the other language
    const SWAP_AT = 0.5; // follow the link once the new label is coming round
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const titles = new Map(faces.map((f) => [f, f.getAttribute("title") || ""]));
    let rot = null; // globe angle in degrees once we've set it; null = CSS decides
    let relaying = false;
    let busy = false;

    const showing = () =>
      faces.find((f) => f.getAttribute("aria-current") === "true") || faces[0];
    const waiting = () => faces.find((f) => f !== showing());
    const restAngle = () => (showing().dataset.lang === "de" ? 180 : 0);

    const setRot = (deg, animate) => {
      if (animate) {
        box.classList.add("is-animated");
      } else {
        box.classList.remove("is-animated");
      }
      box.style.setProperty("--rot", `${deg}deg`);
      if (!animate) void box.offsetWidth; // commit the snap before anything else changes
      rot = deg;
    };

    // Keep focus order, screen-reader exposure and tooltips in step with the labels.
    const sync = () => {
      const front = showing();
      const back = waiting();
      faces.forEach((face) => {
        face.tabIndex = face === front ? -1 : 0;
        if (face === front) face.setAttribute("aria-hidden", "true");
        else face.removeAttribute("aria-hidden");
      });
      // Hovering the globe names the language a click will switch to.
      front.setAttribute("title", titles.get(back));
      back.setAttribute("title", titles.get(back));
      // If the language changed by other means, park the globe on the right side.
      if (!busy && rot !== null && ((rot % 360) + 360) % 360 !== restAngle()) {
        setRot(restAngle(), false);
      }
    };

    // Capture phase: runs before i18n.js sees the click, so we can hold it back
    // until the globe is well into its spin.
    box.addEventListener(
      "click",
      (event) => {
        if (relaying || !event.target.closest("a[data-lang]")) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        if (busy) return;

        const target = waiting();
        const from = rot ?? restAngle();
        busy = true;
        setRot(from + SPIN_DEG, true);

        const quick = reduceMotion.matches;
        window.setTimeout(
          () => {
            relaying = true;
            target.click();
            relaying = false;
          },
          quick ? 0 : SPIN_MS * SWAP_AT,
        );
        window.setTimeout(
          () => {
            busy = false;
            // The switch didn't register (e.g. it was blocked): turn back.
            if (showing() !== target) setRot(from, true);
            sync();
          },
          quick ? 50 : SPIN_MS + 100,
        );
      },
      true,
    );

    // i18n.js flips aria-current when the language changes; follow it.
    new MutationObserver(sync).observe(box, {
      attributes: true,
      attributeFilter: ["aria-current"],
      subtree: true,
    });

    sync();
  }

  /* --- Mobile nav: close the <details> menu after a link is tapped ---------- */

  function initMobileNav() {
    const navToggle = document.querySelector(".nav-toggle");
    const summary = navToggle?.querySelector("summary");
    if (!navToggle) return;

    const closeMenu = () => navToggle.removeAttribute("open");

    navToggle.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", closeMenu);
    });

    // Tapping anywhere outside the open menu closes it too.
    document.addEventListener("click", (event) => {
      if (navToggle.open && !navToggle.contains(event.target)) closeMenu();
    });

    // <details>/<summary> has no built-in aria-expanded; keep one in sync so
    // screen readers announce the menu's open/closed state.
    if (summary) {
      summary.setAttribute("aria-expanded", "false");
      navToggle.addEventListener("toggle", () => {
        summary.setAttribute("aria-expanded", String(navToggle.open));
      });
      // Escape closes the menu and returns focus to the toggle button.
      navToggle.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && navToggle.open) {
          closeMenu();
          summary.focus();
        }
      });
    }
  }

  /* --- Scroll reveal --------------------------------------------------------
     Sections themselves are always visible from first paint -- only the card
     grids inside them (.job, .skill-group, .earlier-item) stagger in as the
     section scrolls into view. Content is fully visible without JS or
     IntersectionObserver: browsers without it get everything shown
     immediately, no fade. */

  const REVEAL_STAGGER_GROUPS = [".job", ".skill-group", ".earlier-item"];
  const REVEAL_SELECTOR = `.reveal, ${REVEAL_STAGGER_GROUPS.join(", ")}`;
  const REVEAL_STAGGER_STEP_MS = 90;
  const REVEAL_STAGGER_MAX_MS = 360;

  function initScrollReveal() {
    const revealEverything = () => {
      document.querySelectorAll(REVEAL_SELECTOR).forEach((element) => {
        element.classList.add("in-view");
      });
    };

    // Light mode never runs the fade/blur machinery at all: the matching
    // CSS (.js-anim:not([data-theme="light"]) ...) already makes it a no-op
    // there, but skipping the observer too means light-mode visitors never
    // pay for it, and nothing can ever be caught mid-transition regardless
    // of what the CSS says -- belt and suspenders for whatever crawls the
    // page (PageSpeed Insights included).
    if (isLightTheme()) {
      revealEverything();
      return;
    }

    if (hasIntersectionObserver) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add("in-view");
            observer.unobserve(entry.target);
          });
        },
        // A positive bottom margin grows the intersection area *past* the
        // viewport, so a card counts as "in view" a little before it's
        // actually scrolled into sight -- it's finished (or well underway)
        // revealing by the time it reaches the visible area, instead of
        // visibly popping in right as it crosses the fold.
        { threshold: 0.12, rootMargin: "0px 0px 15% 0px" },
      );

      document.querySelectorAll(".reveal").forEach((element) => {
        // The section wrapper itself is never gated behind scroll -- only
        // the card groups inside it stagger in (below). Marking it in-view
        // immediately means a section is at full opacity/contrast from the
        // very first paint, whether it's above the fold or not, so nothing
        // sits mid-fade waiting to be scrolled to (that's what previously
        // made whole sections, not just cards, feel like they only "loaded"
        // once you scrolled down -- and separately was why an audit tool
        // once caught the below-the-fold contact CTA at a genuinely
        // low-contrast, semi-transparent opacity: it was still mid-fade at
        // sample time). Real per-card staggering happens entirely through
        // the observer below.
        element.classList.add("in-view");
      });

      REVEAL_STAGGER_GROUPS.forEach((selector) => {
        document.querySelectorAll(selector).forEach((element, i) => {
          const delay = Math.min(
            i * REVEAL_STAGGER_STEP_MS,
            REVEAL_STAGGER_MAX_MS,
          );
          element.style.setProperty("--d", `${delay}ms`);
          observer.observe(element);
        });
      });
    } else {
      revealEverything();
    }
  }

  /* --- Scroll-spy: highlight the current section in the nav ------------------ */

  const SPY_SECTION_IDS = [
    "about",
    "experience",
    "skills",
    "education",
    "contact",
  ];

  function initScrollSpy() {
    if (!hasIntersectionObserver) return;

    const sections = SPY_SECTION_IDS.map((id) =>
      document.getElementById(id),
    ).filter(Boolean);
    if (!sections.length) return;

    // Nav links pointing at an in-page anchor, grouped by the id they target.
    const linksById = new Map();
    document
      .querySelectorAll(".nav-links a, .nav-toggle-panel a")
      .forEach((link) => {
        const href = link.getAttribute("href") ?? "";
        if (!href.startsWith("#")) return;

        const id = href.slice(1);
        linksById.set(id, [...(linksById.get(id) ?? []), link]);
      });
    const allLinks = [...linksById.values()].flat();

    const spy = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          allLinks.forEach((link) => link.classList.remove("active"));
          linksById.get(entry.target.id)?.forEach((link) => {
            link.classList.add("active");
          });
        });
      },
      // A thin band across the middle of the viewport decides the active section.
      { rootMargin: "-45% 0px -50% 0px", threshold: 0 },
    );
    sections.forEach((section) => spy.observe(section));
  }

  /* --- Power bus: the experience timeline as a live circuit ----------------
     styles.css draws everything; this builds the (aria-hidden) parts and
     decides *when* things light up.
       - A twin-rail bus runs beside the cards. An "energy front" sits at
         BUS_FRONT_LINE of the viewport height; the bus fills down to it and
         every job whose junction it has passed gets .is-live (switch closes,
         current runs through the logic gate, the card powers up). Scrolling
         back up opens the switches again.
       - Tapping/clicking a card sends a magenta surge down the bus into it.
     Only transforms and class toggles happen per frame. With reduced motion
     the finished (fully powered) state is shown and nothing moves. Also runs
     on privacy.html, whose policy sections are the same .timeline/.job. */

  const BUS_FRONT_LINE = 0.66; // share of the viewport height where the front sits
  // One gate per job, top to bottom; the current role is a plain buffer (amplifier).
  const BUS_GATES = ["buf", "and", "or", "xor", "nand", "not"];

  /** Inline SVG (34x20) of a logic gate: input wires, body, output wire. */
  function busGateSvg(kind) {
    const gates = {
      buf: { body: "M7 1L24 10L7 19Z", inX: 7, outX: 24, inputs: 1 },
      not: { body: "M7 1L24 10L7 19Z", inX: 7, outX: 24, inputs: 1, bubble: 26 },
      and: { body: "M7 1H15A9 9 0 0 1 15 19H7Z", inX: 7, outX: 24, inputs: 2 },
      nand: { body: "M7 1H14A9 9 0 0 1 14 19H7Z", inX: 7, outX: 23, inputs: 2, bubble: 25 },
      or: { body: "M7 1H13Q23 1 26 10Q23 19 13 19H7Q11 10 7 1Z", inX: 8, outX: 26, inputs: 2 },
      xor: {
        body: "M10 1H16Q26 1 29 10Q26 19 16 19H10Q14 10 10 1Z",
        inX: 7.3,
        outX: 29,
        inputs: 2,
        extra: "M6 1Q10 10 6 19",
      },
    };
    const g = gates[kind] || gates.buf;
    const outStart = g.bubble ? g.bubble + 2 : g.outX;
    // Wires first, so the filled body (and its outline) sits on top of them.
    const wires =
      g.inputs === 2
        ? `<path d="M1 5V15M1 5H${g.inX}M1 15H${g.inX}"/>`
        : `<path d="M1 10H${g.inX}"/>`;
    const out = `<path d="M${outStart} 10H33"/>`;
    const bubble = g.bubble ? `<circle cx="${g.bubble}" cy="10" r="2"/>` : "";
    const extra = g.extra ? `<path d="${g.extra}"/>` : "";
    return (
      `<svg class="jn-gate" viewBox="0 0 34 20" aria-hidden="true" focusable="false">` +
      `${wires}${out}<path class="g-body" d="${g.body}"/>${extra}${bubble}</svg>`
    );
  }

  /** Distance from `ancestor`'s top edge to `el`'s top edge (ignores transforms). */
  const offsetWithin = (el, ancestor) => {
    let y = 0;
    while (el && el !== ancestor) {
      y += el.offsetTop;
      el = el.offsetParent;
    }
    return y;
  };

  function setupPowerBus(timeline) {
    const jobs = [...timeline.querySelectorAll(".job")];
    if (!jobs.length) return;

    const make = (tag, className) => {
      const el = document.createElement(tag);
      el.className = className;
      el.setAttribute("aria-hidden", "true");
      return el;
    };

    // prepend, never append: styles.css still relies on `.job:last-child`.
    const fill = make("i", "bus-fill");
    const head = make("i", "bus-head");
    const source = make("i", "bus-source");
    const ground = make("i", "bus-ground");
    timeline.prepend(fill, head, source, ground);

    const entries = jobs.map((job, i) => {
      const node = make("span", "job-node");
      node.innerHTML =
        '<span class="jn-switch"><i class="jn-blade"></i><i class="jn-spark jn-spark--sw"></i></span>' +
        `<span class="jn-trace">${busGateSvg(BUS_GATES[i % BUS_GATES.length])}</span>` +
        '<span class="jn-pad"><i class="jn-spark jn-spark--pad"></i></span>';
      job.prepend(node);
      return { job, node, live: false, timer: 0 };
    });

    // Reduced motion: show the finished circuit, fully powered, and stop here.
    if (reduceMotion) {
      entries.forEach((e) => e.job.classList.add("is-live"));
      timeline.classList.add("is-fed", "is-closed");
      fill.style.transform = "scaleY(1)";
      return;
    }

    let frame = 0;
    let visible = !hasIntersectionObserver;

    function update() {
      frame = 0;
      const height = timeline.offsetHeight;
      if (!height) return;
      const front = window.innerHeight * BUS_FRONT_LINE - timeline.getBoundingClientRect().top;
      const clamped = Math.min(Math.max(front, 0), height);

      fill.style.transform = `scaleY(${(clamped / height).toFixed(4)})`;
      head.style.transform = `translateY(${clamped.toFixed(1)}px)`;
      timeline.classList.toggle("is-running", front > 0 && front < height);
      timeline.classList.toggle("is-fed", front > 0);
      timeline.classList.toggle("is-closed", front >= height);

      entries.forEach((entry) => {
        const live = offsetWithin(entry.node, timeline) <= front;
        if (live === entry.live) return;
        entry.live = live;
        entry.job.classList.toggle("is-live", live);
      });
    }

    const schedule = () => {
      if (visible && !frame) frame = requestAnimationFrame(update);
    };

    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });
    if (hasIntersectionObserver) {
      new IntersectionObserver(
        ([entry]) => {
          visible = entry.isIntersecting;
          schedule();
        },
        { rootMargin: "240px 0px 240px 0px" },
      ).observe(timeline);
    }
    if ("ResizeObserver" in window) {
      new ResizeObserver(schedule).observe(timeline); // e.g. a language switch reflows the cards
    }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(schedule);
    schedule();

    /* Tap / click a card: a surge runs down the bus into it. */
    function surge(entry) {
      const flash = () => {
        const job = entry.job;
        job.classList.remove("is-surging");
        void job.offsetWidth; // restart the CSS animations
        job.classList.add("is-surging");
        clearTimeout(entry.timer);
        entry.timer = setTimeout(() => job.classList.remove("is-surging"), 1000);
      };
      if (typeof timeline.animate !== "function") {
        flash();
        return;
      }
      const y = offsetWithin(entry.node, timeline);
      const pulse = make("i", "bus-pulse");
      timeline.prepend(pulse);
      const run = pulse.animate(
        [
          { transform: "translateY(0px)", opacity: 1 },
          { transform: `translateY(${y}px)`, opacity: 1 },
        ],
        {
          duration: Math.round(Math.min(Math.max(240 + y * 0.55, 320), 1100)),
          easing: "cubic-bezier(0.55, 0, 0.85, 0.5)", // accelerates, like a spike
          fill: "forwards",
        },
      );
      run.onfinish = () => {
        pulse.remove();
        flash();
      };
      run.oncancel = () => pulse.remove();
    }

    timeline.addEventListener("click", (event) => {
      const card = event.target.closest(".job-card");
      if (!card || event.target.closest("a, button, summary, input, label")) return;
      const selection = window.getSelection && window.getSelection();
      if (selection && !selection.isCollapsed) return; // the visitor is selecting text
      const entry = entries.find((e) => e.job.contains(card));
      if (entry) surge(entry);
    });
  }

  function initPowerBus() {
    document.querySelectorAll(".timeline").forEach(setupPowerBus);
  }

  /* --- Toolbox: skill groups as ICs on a board ------------------------------
     styles.css draws it. This adds the (aria-hidden) notch, LED and pins, boots
     a chip each time it scrolls into view (.is-booted: pins light top to bottom,
     the LED flickers on, the tags self-test in turn), and turns a tap/click on a
     tag into a probe: a magenta trace runs from the tag to the nearest pin on
     the chip's edge, which flashes and throws sparks. With reduced motion every
     chip is simply shown booted and probes are off. */

  // Must match the pin pattern in styles.css (.cp): 3px pins every 12px, 10px inset.
  const CHIP_PIN_TOP = 10;
  const CHIP_PIN_PITCH = 12;
  const CHIP_PIN_THICK = 3;
  const CHIP_PIN_LEN = 7;

  function initToolboxChips() {
    const groups = [...document.querySelectorAll(".skill-group")];
    if (!groups.length) return;

    const make = (tag, className) => {
      const el = document.createElement(tag);
      el.className = className;
      el.setAttribute("aria-hidden", "true");
      return el;
    };

    groups.forEach((group) => {
      // prepend, never append: the CSS may rely on :last-child.
      group.prepend(
        make("i", "chip-notch"),
        make("i", "chip-dot"),
        make("i", "cp cp-l"),
        make("i", "cp cp-r"),
        make("i", "cp cp-l cp-lit"),
        make("i", "cp cp-r cp-lit"),
      );
      group.querySelectorAll(".tag").forEach((tag, i) => {
        tag.style.setProperty("--i", i);
      });
    });

    if (reduceMotion) {
      groups.forEach((group) => group.classList.add("is-booted"));
      return;
    }

    // Boot at 30% visible; power down only once fully off-screen, so a chip
    // never blinks off while you can still see it.
    const bootObserver = hasIntersectionObserver
      ? new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.intersectionRatio >= 0.3) {
                entry.target.classList.add("is-booted");
              } else if (!entry.isIntersecting) {
                entry.target.classList.remove("is-booted");
              }
            });
          },
          { threshold: [0, 0.3] },
        )
      : null;
    groups.forEach((group) => {
      if (bootObserver) bootObserver.observe(group);
      else group.classList.add("is-booted");
    });

    function probe(group, tag) {
      const g = group.getBoundingClientRect();
      const t = tag.getBoundingClientRect();
      // Absolute children are positioned from the padding box (inside the border).
      const pw = group.clientWidth;
      const ph = group.clientHeight;
      const cx = t.left - g.left - group.clientLeft + t.width / 2;
      const cy = t.top - g.top - group.clientTop + t.height / 2;

      const maxIndex = Math.max(
        0,
        Math.floor((ph - 2 * CHIP_PIN_TOP - CHIP_PIN_THICK) / CHIP_PIN_PITCH),
      );
      const index = Math.min(
        maxIndex,
        Math.max(0, Math.round((cy - CHIP_PIN_TOP - CHIP_PIN_THICK / 2) / CHIP_PIN_PITCH)),
      );
      const py = CHIP_PIN_TOP + index * CHIP_PIN_PITCH + CHIP_PIN_THICK / 2;

      const right = cx > pw / 2; // leave through whichever side is closer
      const tipX = right ? pw + CHIP_PIN_LEN : -CHIP_PIN_LEN;

      const trace = make("i", right ? "chip-probe" : "chip-probe chip-probe--l");
      trace.style.cssText =
        `left:${Math.min(cx, tipX)}px;top:${py - 1}px;width:${Math.abs(tipX - cx)}px;` +
        `transform-origin:${right ? "0" : "100%"} 50%`;
      const flash = make("i", "chip-flash");
      flash.style.cssText = `left:${right ? pw : -CHIP_PIN_LEN}px;top:${py - CHIP_PIN_THICK / 2}px`;
      const spark = make("i", "chip-spark");
      spark.style.cssText = `left:${tipX}px;top:${py}px`;
      group.prepend(trace, flash, spark);

      if (typeof trace.animate === "function") {
        trace.animate(
          [
            { transform: "scaleX(0)", opacity: 1 },
            { transform: "scaleX(1)", opacity: 1, offset: 0.45 },
            { transform: "scaleX(1)", opacity: 0 },
          ],
          { duration: 900, easing: "ease-out" },
        );
      }
      setTimeout(() => {
        trace.remove();
        flash.remove();
        spark.remove();
      }, 1100);

      tag.classList.add("is-pressed");
      setTimeout(() => tag.classList.remove("is-pressed"), 180);
      group.classList.remove("is-probed");
      void group.offsetWidth; // restart the border flash
      group.classList.add("is-probed");
      setTimeout(() => group.classList.remove("is-probed"), 900);
    }

    groups.forEach((group) => {
      group.addEventListener("click", (event) => {
        const tag = event.target.closest(".tag");
        if (!tag || event.target.closest("a, button")) return;
        probe(group, tag);
      });
    });
  }

  /* --- Section effects: heading doodles, node meshes, facts LEDs --------------
     styles.css draws them; this builds the (aria-hidden) parts and decides when
     they play. Which sections get which effect is set in SECTION_FX (top of this
     file). Everything is decorative. With reduced motion each effect shows its
     finished state and nothing animates.
       doodle  a hand-drawn line under a section heading that straightens into a
               circuit trace and ends in a pad (draws in when scrolled to)
       mesh    a node graph framing the section's content that grows as you scroll
               in; tap an item and a message hops node to node across it
       facts   status LEDs on the About facts card (tap a fact to strobe its LED) */

  /** Small seeded PRNG so generated shapes are identical on every visit. */
  const seededRandom = (seed) => () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let r = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
  const smoothstep = (a, b, x) => {
    const k = Math.min(Math.max((x - a) / (b - a), 0), 1);
    return k * k * (3 - 2 * k);
  };

  /** Adds `className` while `element` is visible; removes it once fully off-screen
      so the effect replays on the next visit. */
  function replayWhenVisible(element, className, ratio) {
    if (reduceMotion || !hasIntersectionObserver) {
      element.classList.add(className);
      return;
    }
    new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.intersectionRatio >= ratio) element.classList.add(className);
          else if (!entry.isIntersecting) element.classList.remove(className);
        });
      },
      { threshold: [0, ratio] },
    ).observe(element);
  }

  /* doodle: wobbly hand-drawn line -> straight trace with a pad on the end. */
  function setupHeadingDoodle(sectionId) {
    const heading = document.querySelector(`#${sectionId} h2`);
    if (!heading) return;
    const gradientId = `jd-grad-${sectionId}`; // one gradient per doodle: ids must be unique
    const holder = document.createElement("div");
    holder.className = "jd";
    holder.setAttribute("aria-hidden", "true");
    holder.innerHTML =
      `<svg focusable="false"><defs><linearGradient id="${gradientId}" gradientUnits="userSpaceOnUse" y1="0" y2="0">` +
      '<stop offset="0" style="stop-color:var(--magenta)"/>' +
      '<stop offset="0.55" style="stop-color:var(--cyan)"/>' +
      '<stop offset="1" style="stop-color:var(--green)"/>' +
      "</linearGradient></defs>" +
      '<path class="jd-glow" pathLength="1"/><path class="jd-line" pathLength="1"/>' +
      '<circle class="jd-pad" r="4"/></svg>';
    // After the heading, not inside it: translations rewrite the heading's content.
    heading.insertAdjacentElement("afterend", holder);

    const svg = holder.querySelector("svg");
    const glow = holder.querySelector(".jd-glow");
    const line = holder.querySelector(".jd-line");
    const pad = holder.querySelector(".jd-pad");
    const grad = holder.querySelector("linearGradient");
    glow.style.stroke = `url(#${gradientId})`;
    line.style.stroke = `url(#${gradientId})`;

    function build() {
      const width = holder.clientWidth;
      const height = holder.clientHeight;
      if (!width || !height) return;
      const rand = seededRandom(5);
      const mid = height / 2;
      const end = width - 10; // where the trace meets the pad
      const count = Math.max(40, Math.round(width / 3));
      let d = "";
      for (let i = 0; i <= count; i++) {
        const t = i / count;
        const wobble = 1 - smoothstep(0.08, 0.62, t); // 1 = doodle, 0 = clean line
        const y =
          mid +
          wobble *
            (5.5 * Math.sin(2 * Math.PI * 3.4 * t + 1.7 * Math.sin(2 * Math.PI * 9 * t)) +
              (rand() - 0.5) * 4.5);
        d += `${i ? "L" : "M"}${(t * end).toFixed(1)} ${y.toFixed(1)}`;
      }
      glow.setAttribute("d", d);
      line.setAttribute("d", d);
      pad.setAttribute("cx", String(end + 4));
      pad.setAttribute("cy", String(mid));
      svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
      grad.setAttribute("x1", "0");
      grad.setAttribute("x2", String(width));
    }
    build();
    window.addEventListener("resize", build, { passive: true });
    replayWhenVisible(holder, "is-drawn", 0.6);
  }

  /* mesh: a node graph that frames a section's content, grows as you scroll in,
     and relays a message when an item is tapped.
       contentSelector  the blocks the mesh must keep clear of
       triggerSelector  items that start a relay when tapped (optional)
     Returns { spread(element, anchorClientX) } or null. */
  function setupSectionMesh(sectionId, contentSelector, triggerSelector) {
    const section = document.getElementById(sectionId);
    if (!section) return null;

    const NS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("class", "jm-mesh");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    section.prepend(svg);

    const HOP = 230; // ms per hop of a relayed message
    let nodes = [];
    let links = [];
    let adjacency = [];
    let shown = -1;

    const rectWithin = (el, box, pad) => {
      const r = el.getBoundingClientRect();
      return { l: r.left - box.left - pad, t: r.top - box.top - pad, r: r.right - box.left + pad, b: r.bottom - box.top + pad };
    };
    const inside = (blocks, x, y) => blocks.some((b) => x > b.l && x < b.r && y > b.t && y < b.b);
    const crosses = (blocks, a, b) => {
      for (let k = 1; k < 14; k++) {
        const t = k / 14;
        if (inside(blocks, a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t)) return true;
      }
      return false;
    };
    const make = (tag, attrs) => {
      const el = document.createElementNS(NS, tag);
      Object.keys(attrs).forEach((name) => el.setAttribute(name, attrs[name]));
      return el;
    };
    const contentBlocks = () => {
      const found = [...section.querySelectorAll(contentSelector)].filter((el) => el.offsetWidth && el.offsetHeight);
      const wrap = section.querySelector(".wrap");
      return found.length ? found : wrap ? [wrap] : [];
    };

    function build() {
      svg.replaceChildren();
      nodes = [];
      links = [];
      adjacency = [];
      shown = -1;
      const width = section.clientWidth;
      const height = section.clientHeight;
      if (width < 320 || !height) return;
      svg.setAttribute("viewBox", `0 0 ${width} ${height}`);

      const box = section.getBoundingClientRect();
      const blocks = contentBlocks().map((el) => rectWithin(el, box, 18));
      if (!blocks.length) return;

      // Jittered grid, minus anything that would sit under the content.
      const rand = seededRandom(11);
      const cols = Math.max(4, Math.round(width / 140));
      const rows = Math.max(3, Math.round(height / 120));
      const cw = width / cols;
      const ch = height / rows;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = (c + 0.5 + (rand() - 0.5) * 0.76) * cw;
          const y = (r + 0.5 + (rand() - 0.5) * 0.76) * ch;
          if (x < 10 || y < 10 || x > width - 10 || y > height - 10) continue;
          if (inside(blocks, x, y)) continue;
          nodes.push({ x, y });
        }
      }
      if (nodes.length < 5) {
        nodes = [];
        return;
      }

      // The first node sits by the top-left of the content and the mesh grows from it.
      const origin = { x: blocks[0].l - 6, y: blocks[0].t + 24 };
      const dist = (n, p) => Math.hypot(n.x - p.x, n.y - p.y);
      nodes.sort((a, b) => dist(a, origin) - dist(b, origin));
      nodes.forEach((n, i) => (n.rank = i));

      // Each node links to its nearest few neighbours, never through the content.
      const maxLink = Math.max(width, height) * 0.3;
      const seen = new Set();
      adjacency = nodes.map(() => []);
      nodes.forEach((a, i) => {
        nodes
          .map((b, j) => ({ j, d: dist(a, b) }))
          .filter((o) => o.j !== i && o.d < maxLink)
          .sort((p, q) => p.d - q.d)
          .slice(0, 3)
          .forEach(({ j }) => {
            const key = i < j ? `${i}-${j}` : `${j}-${i}`;
            if (seen.has(key) || crosses(blocks, a, nodes[j])) return;
            seen.add(key);
            const b = nodes[j];
            const el = make("path", {
              class: "jm-link",
              pathLength: "1",
              d: `M${a.x.toFixed(1)} ${a.y.toFixed(1)}L${b.x.toFixed(1)} ${b.y.toFixed(1)}`,
            });
            links.push({ a: i, b: j, rank: Math.max(i, j), el });
            adjacency[i].push(j);
            adjacency[j].push(i);
          });
      });
      links.forEach((l) => svg.append(l.el));
      nodes.forEach((n, i) => {
        n.el = make("circle", {
          class: i === 0 ? "jm-node jm-seed" : "jm-node",
          cx: n.x.toFixed(1),
          cy: n.y.toFixed(1),
          r: i === 0 ? "4" : "2.6",
        });
        svg.append(n.el);
      });
    }

    function grow(count) {
      if (count === shown) return;
      shown = count;
      nodes.forEach((n) => {
        const on = n.rank < count;
        n.on = on;
        n.el.classList.toggle("on", on);
      });
      links.forEach((l) => l.el.classList.toggle("on", l.rank < count));
    }

    build();
    if (reduceMotion) {
      grow(nodes.length);
    } else {
      let frame = 0;
      let visible = !hasIntersectionObserver;
      const update = () => {
        frame = 0;
        if (!nodes.length) return;
        const r = section.getBoundingClientRect();
        const p = Math.min(Math.max((window.innerHeight * 0.9 - r.top) / (r.height * 0.75), 0), 1);
        grow(p <= 0 ? 0 : Math.max(1, Math.ceil(p * nodes.length)));
      };
      const schedule = () => {
        if (visible && !frame) frame = requestAnimationFrame(update);
      };
      window.addEventListener("scroll", schedule, { passive: true });
      if (hasIntersectionObserver) {
        new IntersectionObserver(
          ([entry]) => {
            visible = entry.isIntersecting;
            schedule();
          },
          { rootMargin: "200px 0px 200px 0px" },
        ).observe(section);
      }
      if ("ResizeObserver" in window) {
        let timer = 0;
        new ResizeObserver(() => {
          clearTimeout(timer);
          timer = setTimeout(() => {
            build();
            schedule();
          }, 150);
        }).observe(section);
      }
      schedule();
    }

    function hit(node) {
      node.el.classList.remove("jm-hit");
      void node.el.getBoundingClientRect(); // restart the animation
      node.el.classList.add("jm-hit");
      setTimeout(() => node.el.classList.remove("jm-hit"), 850);
    }

    /** Relay a message into the mesh at the node nearest `fromElement` (or nearest
        the viewport x `anchorClientX`, if given), then let it hop outwards across
        every visible link. */
    function spread(fromElement, anchorClientX) {
      if (reduceMotion || !nodes.length || typeof svg.animate !== "function") return;
      const box = section.getBoundingClientRect();
      const from = fromElement.getBoundingClientRect();
      const px = (anchorClientX !== undefined ? anchorClientX : from.left + from.width / 2) - box.left;
      const py = from.top + from.height / 2 - box.top;

      let source = -1;
      let best = Infinity;
      nodes.forEach((n, i) => {
        if (!n.on) return;
        const d = Math.hypot(n.x - px, n.y - py);
        if (d < best) {
          best = d;
          source = i;
        }
      });
      if (source < 0) return;

      const depth = new Map([[source, 0]]);
      const queue = [source];
      const hops = [];
      while (queue.length) {
        const u = queue.shift();
        adjacency[u].forEach((v) => {
          if (!nodes[v].on || depth.has(v)) return;
          depth.set(v, depth.get(u) + 1);
          hops.push([u, v]);
          queue.push(v);
        });
      }

      hit(nodes[source]);
      hops.forEach(([u, v]) => {
        const dot = make("circle", { class: "jm-dot", r: "2.8" });
        svg.append(dot);
        const a = `translate(${nodes[u].x}px, ${nodes[u].y}px)`;
        const b = `translate(${nodes[v].x}px, ${nodes[v].y}px)`;
        const run = dot.animate(
          [
            { transform: a, opacity: 0 },
            { transform: a, opacity: 1, offset: 0.1 },
            { transform: b, opacity: 1, offset: 0.9 },
            { transform: b, opacity: 0 },
          ],
          { duration: HOP, delay: depth.get(u) * HOP, easing: "ease-in-out", fill: "both" },
        );
        run.onfinish = () => {
          dot.remove();
          hit(nodes[v]);
        };
        run.oncancel = () => dot.remove();
      });
    }

    if (triggerSelector && !reduceMotion) {
      section.addEventListener("click", (event) => {
        const item = event.target.closest(triggerSelector);
        if (item && section.contains(item)) spread(item);
      });
    }

    return { spread };
  }

  /* facts: status LEDs that come on one after another; tap a fact to strobe one
     (and, when the About section has a mesh, to relay a message across it). */
  function setupAboutFacts(mesh) {
    const facts = document.querySelector("#about .facts");
    if (!facts) return;

    facts.querySelectorAll("dt").forEach((dt, i) => dt.style.setProperty("--i", i));
    replayWhenVisible(facts, "is-live", 0.35);
    if (reduceMotion) return;

    facts.addEventListener("click", (event) => {
      const cell = event.target.closest("dt, dd");
      if (!cell) return;
      const dt =
        cell.tagName === "DT"
          ? cell
          : cell.previousElementSibling && cell.previousElementSibling.tagName === "DT"
            ? cell.previousElementSibling
            : cell.parentElement.querySelector("dt");
      if (!dt) return;
      dt.classList.remove("is-ping");
      void dt.offsetWidth; // restart the strobe
      dt.classList.add("is-ping");
      setTimeout(() => dt.classList.remove("is-ping"), 750);
      // Messages enter the mesh from the facts card's left edge.
      if (mesh) mesh.spread(dt, facts.getBoundingClientRect().left - 10);
    });
  }

  function initSectionFx() {
    SECTION_FX.doodle.forEach(setupHeadingDoodle);

    const meshes = {};
    SECTION_FX.mesh.forEach((id) => {
      if (id === "about") meshes.about = setupSectionMesh("about", ".about-copy, .facts", null);
      else if (id === "education")
        meshes.education = setupSectionMesh("education", ".edu-block", ".edu-list li, .lang-row");
      else meshes[id] = setupSectionMesh(id, ".wrap > *", null); // any other section: keep clear of its content
    });

    if (SECTION_FX.facts) setupAboutFacts(meshes.about || null);
  }

  /* --- Hero title: old-TV signal interference ------------------------------- */

  // styles.css does the drawing (.glitch.is-glitching); this only decides *when*: a
  // "signal locks in" burst shortly after load, then a short burst every few seconds
  // while the title is on screen and the tab is visible. Tapping/clicking the title
  // triggers one too. With reduced motion nothing is scheduled (the CSS hides the layers).
  function initHeroGlitch() {
    const glitch = document.querySelector(".glitch");
    if (!glitch || reduceMotion) return;

    let busy = false;
    let visible = true;
    const burst = (ms) => {
      if (busy) return;
      busy = true;
      glitch.style.setProperty("--glitch-ms", `${Math.round(ms)}ms`);
      glitch.classList.add("is-glitching");
      window.setTimeout(() => {
        glitch.classList.remove("is-glitching");
        busy = false;
      }, ms + 40);
    };
    const scheduleNext = () => {
      window.setTimeout(
        () => {
          if (visible && !document.hidden) burst(380 + Math.random() * 360);
          scheduleNext();
        },
        3200 + Math.random() * 5200,
      );
    };

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
      }).observe(glitch);
    }
    window.setTimeout(() => burst(950), 500);
    scheduleNext();
    glitch.closest("h1")?.addEventListener("pointerdown", () => burst(520));
  }

  /* --- Typewriter effect for the hero role line (runs once, on load) --------- */

  const TYPEWRITER_CHAR_MS = 18; // quick, not gimmicky
  const TYPEWRITER_SETTLE_MS = 1400; // how long the caret blinks before settling

  function initTypewriter() {
    const target = document.getElementById("typewriter");
    if (!target) return;

    // The full text already lives in the HTML (so it's visible and crawlable
    // with no JS at all). Read it, then "type" it back in.
    const fullText = target.textContent.replace(/\s+/g, " ").trim();

    if (reduceMotion) {
      target.textContent = fullText;
      return;
    }

    // Keep the *whole* line laid out at all times: the typed part is visible,
    // the remainder is present but hidden (visibility: hidden). That reserves
    // the final height and wrapping up front, so the layout below never shifts
    // when the text reaches a second line.
    const typed = document.createElement("span");
    const rest = document.createElement("span");
    typed.className = "tw-typed";
    rest.className = "tw-rest";
    rest.setAttribute("aria-hidden", "true");
    target.textContent = "";
    target.append(typed, rest);

    let charCount = 0;
    const typeNextCharacter = () => {
      // The language switch takes over this line (it replaces our spans): stop, so we never
      // write the old language back over the new one.
      if (!typed.isConnected) return;
      typed.textContent = fullText.slice(0, charCount);
      rest.textContent = fullText.slice(charCount);
      charCount++;

      if (charCount <= fullText.length) {
        setTimeout(typeNextCharacter, TYPEWRITER_CHAR_MS);
      } else {
        // Let the caret blink a moment, then settle back to plain text.
        setTimeout(() => {
          if (typed.isConnected) target.textContent = fullText;
        }, TYPEWRITER_SETTLE_MS);
      }
    };
    typeNextCharacter();
  }

  /* --- Cursor spotlight glow on the hero and contact sections ----------------
     Desktop / fine-pointer only. CSS draws the glow at --spot-x / --spot-y. */

  function initSpotlight() {
    if (!finePointer || reduceMotion) return;

    [document.querySelector(".hero"), document.getElementById("contact")]
      .filter(Boolean)
      .forEach((section) => {
        section.addEventListener("pointerenter", () => {
          section.classList.add("spot-active");
        });
        section.addEventListener("pointerleave", () => {
          section.classList.remove("spot-active");
        });
        section.addEventListener("pointermove", (event) => {
          const rect = section.getBoundingClientRect();
          setStyleProps(section, {
            "--spot-x": `${((event.clientX - rect.left) / rect.width) * 100}%`,
            "--spot-y": `${((event.clientY - rect.top) / rect.height) * 100}%`,
          });
        });
      });
  }

  /* --- Magnetic tilt on the avatar placeholder (desktop / fine-pointer only) -- */

  const AVATAR_MAX_TILT_DEG = 14;

  function initAvatarTilt() {
    const wrap = document.querySelector(".avatar-wrap");
    const avatar = document.querySelector(".avatar-slot");
    if (!wrap || !avatar || !finePointer || reduceMotion) return;

    wrap.addEventListener("pointermove", (event) => {
      const rect = wrap.getBoundingClientRect();
      const px = (event.clientX - rect.left) / rect.width - 0.5;
      const py = (event.clientY - rect.top) / rect.height - 0.5;
      setStyleProps(avatar, {
        "--tilt-y": `${(px * AVATAR_MAX_TILT_DEG).toFixed(2)}deg`,
        "--tilt-x": `${(py * -AVATAR_MAX_TILT_DEG).toFixed(2)}deg`,
        "--tilt-s": "1.03",
      });
    });

    wrap.addEventListener("pointerleave", () => {
      setStyleProps(avatar, {
        "--tilt-x": "0deg",
        "--tilt-y": "0deg",
        "--tilt-s": "1",
      });
    });
  }

  /* --- Copy email to clipboard, with a small toast --------------------------- */

  const CONTACT_EMAIL = "ld.yogiraj@gmail.com";
  const TOAST_VISIBLE_MS = 2200;

  /** Creates the toast lazily on first use; returns a `showToast(message)`. */
  function createToast() {
    let element;
    let hideTimer;

    return (message) => {
      if (!element) {
        element = document.createElement("div");
        element.className = "toast";
        element.setAttribute("role", "status");
        element.setAttribute("aria-live", "polite");
        document.body.appendChild(element);
      }
      element.textContent = message;
      requestAnimationFrame(() => element.classList.add("show"));

      clearTimeout(hideTimer);
      hideTimer = setTimeout(
        () => element.classList.remove("show"),
        TOAST_VISIBLE_MS,
      );
    };
  }

  function initCopyEmail() {
    const copyButton = document.getElementById("copy-email");
    const mailLink = document.getElementById("contact-mail-link");
    if (!copyButton || !mailLink || !navigator.clipboard) return;

    const showToast = createToast();

    // The button ships hidden and is only revealed when copying is possible.
    copyButton.style.display = "inline-flex";
    copyButton.style.marginLeft = "0.5rem";
    copyButton.addEventListener("click", () => {
      navigator.clipboard.writeText(CONTACT_EMAIL).then(() => {
        showToast(t("ui.messages.toastCopied", "Email copied to clipboard"));
      });
    });
  }

  /* ==========================================================================
     3. AMBIENT SCENE
     One persistent rain / jungle / lightning layer behind the whole page.
     Nothing in it needs a script to keep moving: rain falls and leaves sway
     through CSS animations that run on the compositor. The script only reacts
     to scroll / resize (rain + foliage intensity, hero + contact transitions,
     glow position), and only does any work in a frame where something
     actually changed. At rest the page runs no scripted animation at all.
     ========================================================================== */

  /* --- Foliage geometry ------------------------------------------------------
     Simple leaves on a simple stem. Each cluster is one gently curved stem (a
     stroked path) with plain pointed-oval leaves attached along it in
     alternating pairs, plus one leaf at the tip. The stem always grows inward
     from the left or right side of the page.

     Three presets change only the proportions: "canopy" = a few broad leaves,
     "fern" = many small narrow leaves, "palm" = long slim blades. Every
     instance is still procedurally unique. */

  // halfWidth: half a leaf's width, as a fraction of its length.
  // spreadAngle: degrees between a leaf and the stem direction.
  const LEAF_PRESETS = {
    canopy: { leafCount: 5, leafLength: 66, halfWidth: 0.27, spreadAngle: 48 },
    fern: { leafCount: 10, leafLength: 42, halfWidth: 0.17, spreadAngle: 62 },
    palm: { leafCount: 6, leafLength: 92, halfWidth: 0.1, spreadAngle: 36 },
  };

  const LEAF_TYPES = Object.keys(LEAF_PRESETS);

  // Mostly dark jungle-shadow green, with an occasional lit green or cyan rim-light.
  const LEAF_TINTS = [
    "color-mix(in srgb, var(--green) 42%, black 58%)",
    "color-mix(in srgb, var(--green) 42%, black 58%)",
    "color-mix(in srgb, var(--green) 60%, black 40%)",
    "var(--green)",
    "var(--cyan)",
  ];

  const LEAF_DEPTH_OPTIONS = ["front", "front", "mid", "mid", "back"];

  /**
   * Builds the SVG markup for one foliage cluster (viewBox is 0 0 300 300).
   * @param {"canopy"|"fern"|"palm"} preset
   * @param {"left"|"right"} edge  Side of the page the stem grows from.
   * @param {boolean} isMobile     Phones get shorter stems so the large leaves
   *                               don't cover the whole screen.
   */
  function buildFoliageCluster(preset, edge, isMobile) {
    const { leafCount, leafLength, halfWidth, spreadAngle } =
      LEAF_PRESETS[preset] ?? LEAF_PRESETS.palm;
    const fixed = (n) => n.toFixed(1);

    // The stem starts at the middle of the box's outer side and grows inward:
    // left clusters grow rightwards, right clusters grow leftwards.
    const stemLength = isMobile ? 150 : 240;
    const startY = 150;
    let startX;
    let direction; // degrees, 0 = towards +x
    if (edge === "left") {
      startX = 0;
      direction = randomBetween(-22, 22);
    } else {
      startX = 300;
      direction = 180 + randomBetween(-22, 22);
    }

    // Stem: a quadratic curve with a slight bend.
    const endX = startX + Math.cos(toRadians(direction)) * stemLength;
    const endY = startY + Math.sin(toRadians(direction)) * stemLength;
    const bend =
      (Math.random() > 0.5 ? 1 : -1) * stemLength * randomBetween(0.08, 0.16);
    const controlX =
      (startX + endX) / 2 + Math.cos(toRadians(direction + 90)) * bend;
    const controlY =
      (startY + endY) / 2 + Math.sin(toRadians(direction + 90)) * bend;

    /** Point on the stem at t (0 = base, 1 = tip). */
    const pointAt = (t) => ({
      x: (1 - t) * (1 - t) * startX + 2 * (1 - t) * t * controlX + t * t * endX,
      y: (1 - t) * (1 - t) * startY + 2 * (1 - t) * t * controlY + t * t * endY,
    });

    /** Stem direction in degrees at t. */
    const angleAt = (t) =>
      (Math.atan2(
        2 * (1 - t) * (controlY - startY) + 2 * t * (endY - controlY),
        2 * (1 - t) * (controlX - startX) + 2 * t * (endX - controlX),
      ) *
        180) /
      Math.PI;

    /** A pointed oval: base at (0,0), tip at (length,0), placed and rotated. */
    const leaf = (x, y, angle, length) => {
      const controlOffset = length * halfWidth * 2; // 2x the visible half-width
      return `<path transform="translate(${fixed(x)} ${fixed(y)}) rotate(${fixed(angle)})" d="M 0 0 Q ${fixed(length * 0.45)} ${fixed(-controlOffset)} ${fixed(length)} 0 Q ${fixed(length * 0.45)} ${fixed(controlOffset)} 0 0 Z"/>`;
    };

    // Leaves alternate sides along the stem and shrink slightly towards the tip.
    let leaves = "";
    for (let i = 0; i < leafCount; i++) {
      const t = 0.2 + (0.7 * i) / Math.max(1, leafCount - 1);
      const point = pointAt(t);
      const side = i % 2 === 0 ? 1 : -1;
      const angle = angleAt(t) + side * (spreadAngle + randomBetween(-6, 6));
      const length = leafLength * (1 - 0.35 * t) * randomBetween(0.9, 1.1);
      leaves += leaf(point.x, point.y, angle, length);
    }
    // The terminal leaf continues along the stem direction.
    leaves += leaf(endX, endY, angleAt(1), leafLength * 0.8);

    const stem = `<path d="M ${fixed(startX)} ${fixed(startY)} Q ${fixed(controlX)} ${fixed(controlY)} ${fixed(endX)} ${fixed(endY)}" stroke="currentColor" stroke-width="3.4" fill="none" stroke-linecap="round" opacity="0.8"/>`;

    return `<svg viewBox="0 0 300 300" fill="currentColor">${stem}${leaves}</svg>`;
  }

  /** A jagged, mostly vertical SVG path from (x1, y1) to (x2, y2). */
  function buildJaggedPath(x1, y1, x2, y2, segments, jitter) {
    let d = `M ${x1.toFixed(1)} ${y1.toFixed(1)}`;
    for (let i = 1; i <= segments; i++) {
      const t = i / segments;
      const x = x1 + (x2 - x1) * t + (Math.random() - 0.5) * jitter;
      const y = y1 + (y2 - y1) * t;
      d += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
    }
    return d;
  }

  // Rain / foliage intensity while neither the hero nor the contact section is
  // the focus (0 = invisible, 1 = full strength).
  const MIDDLE_BASELINE = 0.16;

  function initAmbientScene() {
    const ambientLayer = document.querySelector(".ambient-layer");
    const rainContainer = document.querySelector(".ambient-rain");
    const leavesContainer = document.querySelector(".ambient-leaves");
    const lightningElement = document.querySelector(".ambient-lightning");
    const boltSvg = document.querySelector(".ambient-bolt");

    const topSection = document.querySelector("#top");
    const contactSection = document.querySelector("#contact");

    if (!ambientLayer || !rainContainer || !leavesContainer) return;

    const isMobile = window.innerWidth < 700;
    const rainCount = isMobile ? 45 : 90;
    const leafCount = isMobile ? 10 : 18;

    /* --- Rain --- */

    const createRain = () => {
      rainContainer.innerHTML = "";
      if (reducedMotionQuery.matches) return;

      const fragment = document.createDocumentFragment();

      for (let i = 0; i < rainCount; i++) {
        const drop = document.createElement("span");
        drop.className = "ambient-drop";
        drop.dataset.depth =
          Math.random() > 0.65 ? "front" : Math.random() > 0.5 ? "mid" : "back";

        const height = 35 + Math.random() * 120;
        const duration = 0.8 + Math.random() * 1.5;
        const delay = -(Math.random() * 3);
        const x = Math.random() * 100;
        const opacity = 0.45 + Math.random() * 0.5;
        const drift = -25 + Math.random() * 50;

        setStyleProps(drop, {
          "--drop-height": `${height}px`,
          "--drop-duration": `${duration}s`,
          "--drop-delay": `${delay}s`,
          "--drop-x": `${x}%`,
          "--drop-opacity": opacity,
          "--drift-end": `${drift}px`,
        });

        fragment.appendChild(drop);
      }

      rainContainer.appendChild(fragment);
    };

    /* --- Foliage ---
       Every cluster grows from the left or right side of the page, never from
       the top, bottom or middle. Sides alternate, and each side's clusters are
       spread evenly down the viewport (with jitter) so the foliage reads as a
       continuous border instead of random patches and gaps. */

    const createLeaves = () => {
      leavesContainer.innerHTML = "";

      const perSide = Math.ceil(leafCount / 2);

      for (let i = 0; i < leafCount; i++) {
        const type = pick(LEAF_TYPES);
        const depth = pick(LEAF_DEPTH_OPTIONS);
        const edge = i % 2 === 0 ? "left" : "right";

        const leaf = document.createElement("div");
        leaf.className = "ambient-leaf";
        leaf.dataset.depth = depth;
        leaf.dataset.edge = edge;
        leaf.innerHTML = buildFoliageCluster(type, edge, isMobile);

        const size =
          depth === "front"
            ? 460 + Math.random() * 300
            : depth === "mid"
              ? 320 + Math.random() * 200
              : 220 + Math.random() * 140;

        // Vertical position: this side's slot down the viewport, plus jitter.
        // The stem base sits at the box's vertical middle, so offset by half
        // the box.
        const slot = Math.floor(i / 2);
        const slotHeight = 110 / perSide;
        // As a % of viewport height:
        const centerY = -5 + (slot + 0.15 + Math.random() * 0.7) * slotHeight;
        const y = `calc(${centerY.toFixed(1)}% - ${(size / 2).toFixed(0)}px)`;

        // Horizontal position: the stem base sits just past the page's edge.
        const x =
          edge === "left"
            ? `${(-size * 0.02).toFixed(0)}px`
            : `calc(100% - ${(size * 0.98).toFixed(0)}px)`;

        // Subtle sway tilt only; the cluster's shape does the rest.
        const rotation = -8 + Math.random() * 16;

        const baseOpacity =
          depth === "front"
            ? 0.5 + Math.random() * 0.22
            : depth === "mid"
              ? 0.34 + Math.random() * 0.18
              : 0.22 + Math.random() * 0.12;

        // Idle sway is a CSS animation (see @keyframes leaf-sway), so it runs
        // off the main thread. Same motion as before: a slow back-and-forth
        // over a period of roughly 12-25 s, larger for leaves nearer the
        // viewer, starting at a random point in its cycle.
        const swayRange = depth === "front" ? 14 : depth === "mid" ? 8 : 4;
        const swaySpeed = 0.00025 + Math.random() * 0.00025; // rad per ms
        const swayHalfPeriod = Math.PI / swaySpeed / 1000; // seconds, one way
        const swayDelay = -Math.random() * swayHalfPeriod * 2;
        const tint = pick(LEAF_TINTS);

        setStyleProps(leaf, {
          "--leaf-size": `${size}px`,
          "--leaf-x": x,
          "--leaf-y": y,
          "--leaf-rotation": `${rotation}deg`,
          "--leaf-opacity": baseOpacity,
          "--leaf-tint": tint,
          "--sway-x": `${(swayRange * 0.18).toFixed(2)}px`,
          "--sway-y": `${(swayRange * 0.4).toFixed(2)}px`,
          "--sway-rot": `${(swayRange * 0.25).toFixed(2)}deg`,
          "--sway-duration": `${swayHalfPeriod.toFixed(2)}s`,
          "--sway-delay": `${swayDelay.toFixed(2)}s`,
        });

        leavesContainer.appendChild(leaf);
      }
    };

    /* --- Lightning ---
       Occasional, randomly positioned, from the edges only. Scheduled with its
       own timers, independent of the animation loop. Draws both a soft ambient
       glow wash and an actual jagged bolt path. */

    let lightningTimer = null;

    const drawBolt = (originXPercent, originYPercent) => {
      if (!boltSvg) return;

      const width = window.innerWidth;
      const height = window.innerHeight;
      boltSvg.setAttribute("viewBox", `0 0 ${width} ${height}`);

      const x1 = (originXPercent / 100) * width;
      const y1 = Math.max(0, (originYPercent / 100) * height);
      const x2 = x1 + (Math.random() - 0.5) * width * 0.22;
      const y2 = height * (0.42 + Math.random() * 0.32);

      const mainPath = buildJaggedPath(x1, y1, x2, y2, 6, 34);

      // A short secondary branch off a point partway down the main bolt.
      const branchT = 0.35 + Math.random() * 0.3;
      const branchX = x1 + (x2 - x1) * branchT;
      const branchY = y1 + (y2 - y1) * branchT;
      const branchPath = buildJaggedPath(
        branchX,
        branchY,
        branchX + (Math.random() - 0.5) * width * 0.12,
        branchY + (y2 - y1) * 0.3,
        3,
        22,
      );
      const showBranch = Math.random() > 0.45;

      const boltPaths = (d, glowWidth, coreWidth) =>
        `<path class="bolt-glow" d="${d}" fill="none" stroke-width="${glowWidth}" stroke-linecap="round" stroke-linejoin="round"/>` +
        `<path class="bolt-core" d="${d}" fill="none" stroke-width="${coreWidth}" stroke-linecap="round" stroke-linejoin="round"/>`;

      boltSvg.innerHTML =
        boltPaths(mainPath, 9, 2) +
        (showBranch ? boltPaths(branchPath, 5, 1.2) : "");
    };

    const flashOnce = (peakOpacity) => {
      if (!lightningElement) return;

      const edge = Math.floor(Math.random() * 3); // 0 left, 1 right, 2 top
      const xPercent =
        edge === 0
          ? -5 + Math.random() * 10
          : edge === 1
            ? 95 + Math.random() * 10
            : Math.random() * 100;
      const yPercent =
        edge === 2 ? -5 + Math.random() * 10 : Math.random() * 60;

      // Set on the two lightning elements themselves rather than on <html>:
      // a custom property changed on the root makes the browser re-check
      // styles for the entire page, twice per flash.
      setStyleProps(lightningElement, {
        "--lightning-x": `${xPercent}%`,
        "--lightning-y": `${yPercent}%`,
        "--lightning-opacity": peakOpacity,
      });
      boltSvg?.style.setProperty("--lightning-opacity", peakOpacity);

      drawBolt(xPercent, yPercent);

      setTimeout(
        () => {
          lightningElement.style.setProperty("--lightning-opacity", 0);
          boltSvg?.style.setProperty("--lightning-opacity", 0);
        },
        90 + Math.random() * 80,
      );
    };

    const triggerLightning = () => {
      if (reducedMotionQuery.matches) return;

      const peakOpacity = isLightTheme()
        ? 0.05 + Math.random() * 0.08
        : 0.16 + Math.random() * 0.22;

      flashOnce(peakOpacity);

      // Occasionally a double or triple flash, in the same general direction.
      const extraFlashes =
        Math.random() > 0.8 ? (Math.random() > 0.5 ? 2 : 1) : 0;
      for (let i = 1; i <= extraFlashes; i++) {
        setTimeout(
          () => flashOnce(peakOpacity * (0.6 + Math.random() * 0.3)),
          i * (140 + Math.random() * 120),
        );
      }
    };

    const scheduleLightning = () => {
      const delay = 7000 + Math.random() * 14000;
      lightningTimer = setTimeout(() => {
        triggerLightning();
        scheduleLightning();
      }, delay);
    };

    /* --- Scroll-relative progress ---
       Measured against each section's own position, never total page scroll,
       so the atmosphere reacts to the right section however much content sits
       between them. Both helpers return a value from 0 to 1. */

    /** 0 at the top of the page, 1 once the hero has scrolled away. */
    const getHeroProgress = () => {
      if (!topSection) return 0;

      const rect = topSection.getBoundingClientRect();
      const traveled = Math.max(0, -rect.top);
      const distance = Math.min(rect.height * 0.85, window.innerHeight);
      return distance > 0 ? Math.min(1, traveled / distance) : 0;
    };

    /** 0 until the contact section nears the viewport, 1 once it has arrived. */
    const getContactProgress = () => {
      if (!contactSection) return 1;

      const rect = contactSection.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      // Contact's top just entering the bottom of the viewport...
      const start = viewportHeight;
      // ...and contact has arrived, roughly a third of the way down the screen.
      const end = viewportHeight * 0.35;

      if (rect.top >= start) return 0;
      if (rect.top <= end) return 1;
      return (start - rect.top) / (start - end);
    };

    /* --- Apply atmosphere: one function, one set of custom properties --- */

    let lastAtmosphere = "";

    const updateAtmosphere = (heroProgress, contactProgress) => {
      const heroFactor = 1 - heroProgress;
      const contactFactor = contactProgress;
      const strongest = Math.max(heroFactor, contactFactor);
      const intensity = MIDDLE_BASELINE + (1 - MIDDLE_BASELINE) * strongest;

      // The glow drifts diagonally down the page rather than jumping per section.
      const glowX = 22 + strongest * 55;
      const glowY = 20 + (1 - strongest) * 45;

      const props = {
        "--rain-intensity": intensity.toFixed(3),
        "--leaf-density": intensity.toFixed(3),
        "--ambient-blur": `${((1 - intensity) * 0.6).toFixed(2)}px`,
        "--glow-x": `${glowX.toFixed(1)}%`,
        "--glow-y": `${glowY.toFixed(1)}%`,
      };

      // Writing a custom property on <html> makes the browser re-check styles
      // for the whole document, so only do it when a value really changed.
      const key = Object.values(props).join("|");
      if (key === lastAtmosphere) return;
      lastAtmosphere = key;
      setStyleProps(root, props);
    };

    /* --- Scroll / resize driven update ---
       No permanent animation loop: a single frame is requested when the scroll
       position or the layout changes, and does nothing else. Measurements are
       all read first and the custom properties written afterwards (and only
       when their value changed), so the browser never has to recalculate
       layout between the two. */

    let frameRequested = false;
    let lastHero = "";
    let lastContact = "";

    const frame = () => {
      frameRequested = false;
      if (reducedMotionQuery.matches) return;

      // Reads
      const heroProgress = getHeroProgress();
      const contactProgress = getContactProgress();
      const heroValue = heroProgress.toFixed(4);
      const contactValue = contactProgress.toFixed(4);

      // Writes
      updateAtmosphere(heroProgress, contactProgress);

      if (heroValue !== lastHero) {
        lastHero = heroValue;
        topSection?.style.setProperty("--hero-progress", heroValue);
      }
      if (contactValue !== lastContact) {
        lastContact = contactValue;
        contactSection?.style.setProperty("--contact-progress", contactValue);
      }
    };

    const requestFrame = () => {
      if (frameRequested || reducedMotionQuery.matches) return;
      frameRequested = true;
      requestAnimationFrame(frame);
    };

    window.addEventListener("scroll", requestFrame, { passive: true });
    window.addEventListener("resize", requestFrame, { passive: true });
    window.addEventListener("orientationchange", requestFrame);
    window.addEventListener("pageshow", requestFrame); // back/forward cache
    window.addEventListener("load", requestFrame);
    // Content above the contact section can change height without any scroll
    // (language switch, fonts, images, the typewriter), which moves the
    // section the progress is measured against.
    if ("ResizeObserver" in window) {
      new ResizeObserver(requestFrame).observe(document.body);
    }

    reducedMotionQuery.addEventListener("change", () => {
      createRain();

      if (reducedMotionQuery.matches) {
        clearTimeout(lightningTimer);
        // Leave the CSS reduced-motion fallback values in charge.
        updateAtmosphere(0, 1);
      } else {
        requestFrame();
        scheduleLightning();
      }
    });

    /* --- Start --- */

    createRain();
    createLeaves();

    if (reducedMotionQuery.matches) {
      updateAtmosphere(0, 1);
    } else {
      requestFrame();
      scheduleLightning();
    }
  }

  /* ==========================================================================
     4. COOKIE CONSENT + GOOGLE ANALYTICS  (basic, consent-gated)

     Google Analytics is NOT loaded before consent.

       First visit         No request to Google. The consent banner is shown.
       Accept              Save consent, load gtag.js, initialise Analytics
                           (which sends the page_view).
       Reject              Save the rejection. Analytics is never loaded.
       Returning visitor   "accepted": load Analytics immediately.
                           "rejected": keep Analytics completely unloaded (no
                           script, no dataLayer, no gtag, no Google requests).

     No advertising features are enabled.
     ========================================================================== */

  const GA_MEASUREMENT_ID = "G-48BYR598ZB";
  const CONSENT_STORAGE_KEY = "yt_cookie_consent";
  const BANNER_HIDE_DELAY_MS = 350; // matches the banner's CSS transition

  let analyticsLoaded = false;
  let analyticsLoading = false;

  /* --- Stored consent decision ("accepted" | "rejected" | null) --- */

  const getConsent = () => {
    try {
      return localStorage.getItem(CONSENT_STORAGE_KEY);
    } catch {
      console.warn("Unable to read privacy preference.");
      return null;
    }
  };

  const saveConsent = (value) => {
    try {
      localStorage.setItem(CONSENT_STORAGE_KEY, value);
    } catch {
      console.warn("Unable to save privacy preference.");
    }
  };

  const clearConsent = () => {
    try {
      localStorage.removeItem(CONSENT_STORAGE_KEY);
    } catch {
      console.warn("Unable to reset privacy preference.");
    }
  };

  /* --- Google Analytics --- */

  /**
   * Loads Google Analytics. Only ever called after consent has been granted:
   * this is the first point at which the browser may request anything from
   * googletagmanager.com.
   */
  function loadGoogleAnalytics() {
    // Prevent duplicate loading.
    if (analyticsLoaded || analyticsLoading) return;
    if (!GA_MEASUREMENT_ID) return;

    analyticsLoading = true;

    // Create dataLayer and gtag only now that consent has been granted.
    window.dataLayer = window.dataLayer || [];
    // Must stay a regular function that pushes `arguments`: the Google tag
    // expects an Arguments object in the dataLayer, not an array.
    window.gtag =
      window.gtag ||
      function () {
        window.dataLayer.push(arguments);
      };

    window.gtag("js", new Date());
    // Advertising-related storage and signals stay disabled.
    window.gtag("config", GA_MEASUREMENT_ID, {
      anonymize_ip: true,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
    });

    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_MEASUREMENT_ID)}`;
    script.onload = () => {
      analyticsLoaded = true;
      analyticsLoading = false;
    };
    script.onerror = () => {
      analyticsLoading = false;
      console.error("Google Analytics failed to load.");
    };
    document.head.appendChild(script);
  }

  /* --- Banner --- */

  let cookieReturnFocus = null;

  const showBanner = () => {
    const banner = document.getElementById("cookie-banner");
    if (!banner) return;

    // Deliberately does NOT move focus into the banner: it is a non-modal
    // notice (aria-modal="false") that appears on first load, right after the
    // skip link -- auto-focusing it here would jump keyboard users straight
    // past the skip link with no way back via a forward Tab press. It is
    // still the very next stop from the top, so it is reached a moment later.
    cookieReturnFocus = document.activeElement;
    banner.hidden = false;
    requestAnimationFrame(() => banner.classList.add("is-visible"));
  };

  const hideBanner = () => {
    const banner = document.getElementById("cookie-banner");
    if (!banner) return;

    banner.classList.remove("is-visible");
    setTimeout(() => {
      banner.hidden = true;
      if (cookieReturnFocus && document.contains(cookieReturnFocus)) {
        cookieReturnFocus.focus();
      }
      cookieReturnFocus = null;
    }, BANNER_HIDE_DELAY_MS);
  };

  /* --- Visitor actions --- */

  const acceptAnalytics = () => {
    saveConsent("accepted"); // save the decision first
    loadGoogleAnalytics(); // ...and only then load Google Analytics
    hideBanner();
  };

  const rejectAnalytics = () => {
    saveConsent("rejected"); // deliberately does NOT call loadGoogleAnalytics()
    hideBanner();
  };

  /**
   * Forgets the previous decision. If Analytics already loaded in this page
   * session its requests can't be undone, so reload the page: with no stored
   * consent, the next load won't load Analytics.
   */
  const resetConsent = () => {
    clearConsent();
    window.location.reload();
  };

  const openPrivacyPage = () => {
    window.location.href = "privacy.html";
  };

  function initCookieConsent() {
    switch (getConsent()) {
      case "accepted":
        loadGoogleAnalytics();
        break;
      case "rejected":
        break; // nothing at all: no script, no dataLayer, no gtag
      default:
        showBanner(); // no decision yet: ask, and do NOT load Analytics
    }

    const bindClick = (id, handler) => {
      document.getElementById(id)?.addEventListener("click", handler);
    };

    bindClick("cookie-accept", acceptAnalytics);
    bindClick("cookie-reject", rejectAnalytics);
    bindClick("cookie-settings", openPrivacyPage); // banner's policy link
    bindClick("privacy-cookie-settings", resetConsent); // on the privacy page
    bindClick("footer-cookie-settings", resetConsent); // in the footer
  }

  /* ==========================================================================
     5. START-UP
     ========================================================================== */

  // Lets CSS opt certain elements into a hidden -> reveal starting state.
  // Everything is visible by default without this class.
  root.classList.add("js-anim");

  initThemeToggle();
  initFooterYear();
  initArchCycler();
  initMobileNav();
  initLangSwitch();
  initScrollReveal();
  initScrollSpy();
  initPowerBus();
  initToolboxChips();
  initSectionFx();
  initTypewriter();
  initHeroGlitch();
  initSpotlight();
  initHeroFireflies();
  initAvatarTilt();
  initCopyEmail();

  onReady(initAmbientScene);
  onReady(initCookieConsent);
})();
