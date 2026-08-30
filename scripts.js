(() => {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(pointer: fine)").matches;

  // Mark JS as active so CSS can opt certain elements into a hidden->reveal
  // starting state. Everything is visible by default without this class.
  document.documentElement.classList.add("js-anim");

  // ---------------------------------------------------------------------
  // Theme toggle (light / dark) — persisted, synced across both buttons
  // ---------------------------------------------------------------------
  var root = document.documentElement;
  var themeButtons = [document.getElementById("theme-toggle-desktop"), document.getElementById("theme-toggle-mobile")].filter(Boolean);

  function currentTheme() {
    return root.getAttribute("data-theme") === "light" ? "light" : "dark";
  }
  function syncToggleLabels() {
    var t = currentTheme();
    themeButtons.forEach(function (btn) {
      btn.setAttribute("aria-pressed", t === "light" ? "true" : "false");
      var label = btn.querySelector(".tt-label");
      if (label) label.textContent = t === "light" ? "LIGHT" : "DARK";
    });
  }
  function setTheme(t) {
    root.setAttribute("data-theme", t);
    try { localStorage.setItem("theme", t); } catch (e) {}
    syncToggleLabels();
  }
  themeButtons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      setTheme(currentTheme() === "light" ? "dark" : "light");
    });
  });
  syncToggleLabels();

  // ---------------------------------------------------------------------
  // Footer year
  // ---------------------------------------------------------------------
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // ---------------------------------------------------------------------
  // Close the mobile <details> nav after a link is tapped
  // ---------------------------------------------------------------------
  var navToggle = document.querySelector(".nav-toggle");
  if (navToggle) {
    navToggle.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        navToggle.removeAttribute("open");
      });
    });
    document.addEventListener("click", function (e) {
      if (navToggle.open && !navToggle.contains(e.target)) {
        navToggle.removeAttribute("open");
      }
    });
  }

  // ---------------------------------------------------------------------
  // Scroll-reveal for sections + staggered reveal for card grids
  // Content is fully visible without JS/if IntersectionObserver is missing;
  // this only ever adds an "in-view" class, never hides content permanently.
  // ---------------------------------------------------------------------
  if ("IntersectionObserver" in window) {
    var revealObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );

    document.querySelectorAll(".reveal").forEach(function (el) {
      revealObserver.observe(el);
      el.classList.add("in-view"); // section wrapper itself: no hide, just a hook
    });

    var staggerGroups = [
      document.querySelectorAll(".job"),
      document.querySelectorAll(".skill-group"),
      document.querySelectorAll(".earlier-item"),
    ];
    staggerGroups.forEach(function (group) {
      group.forEach(function (el, i) {
        el.style.setProperty("--d", Math.min(i * 90, 360) + "ms");
        revealObserver.observe(el);
      });
    });
  } else {
    document.querySelectorAll(".reveal, .job, .skill-group, .earlier-item").forEach(function (el) {
      el.classList.add("in-view");
    });
  }

  // Safety net: if for any reason the observer never fires for an element
  // (older/unusual browsers), force everything visible after a short delay
  // so content can never get stuck hidden.
  window.setTimeout(function () {
    document.querySelectorAll(".reveal, .job, .skill-group, .earlier-item").forEach(function (el) {
      el.classList.add("in-view");
    });
  }, 2500);

  // ---------------------------------------------------------------------
  // Scroll-spy: highlight the current section in the nav
  // ---------------------------------------------------------------------
  var sections = ["about", "experience", "skills", "education", "contact"]
    .map(function (id) { return document.getElementById(id); })
    .filter(Boolean);
  var navLinkMap = {};
  document.querySelectorAll('.nav-links a, .nav-toggle-panel a').forEach(function (a) {
    var href = a.getAttribute("href") || "";
    if (href.charAt(0) === "#") {
      var id = href.slice(1);
      navLinkMap[id] = navLinkMap[id] || [];
      navLinkMap[id].push(a);
    }
  });

  if ("IntersectionObserver" in window && sections.length) {
    var spy = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          Object.keys(navLinkMap).forEach(function (id) {
            navLinkMap[id].forEach(function (a) { a.classList.remove("active"); });
          });
          var links = navLinkMap[entry.target.id];
          if (links) links.forEach(function (a) { a.classList.add("active"); });
        });
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: 0 }
    );
    sections.forEach(function (s) { spy.observe(s); });
  }

  // ---------------------------------------------------------------------
  // Typewriter effect for the hero role line (runs once, on load)
  // ---------------------------------------------------------------------
  var tw = document.getElementById("typewriter");
  if (tw) {
    // The full text already lives in the HTML (so it's visible/crawlable
    // with no JS at all). We read it, then "type" it back in on load.
    var full = tw.textContent;
    if (reduceMotion) {
      tw.textContent = full;
    } else {
      tw.textContent = "";
      var i = 0;
      var speed = 18; // ms per character — quick, not gimmicky
      (function type() {
        tw.textContent = full.slice(0, i);
        i++;
        if (i <= full.length) {
          window.setTimeout(type, speed);
        } else {
          var caret = document.querySelector(".hero-role .caret");
          if (caret) window.setTimeout(function () { caret.style.display = "none"; }, 1400);
        }
      })();
    }
  }

  // ---------------------------------------------------------------------
  // Cursor spotlight glow on the hero (desktop / fine-pointer only)
  // ---------------------------------------------------------------------
  var hero = document.querySelector(".hero");
  if (hero && finePointer && !reduceMotion) {
    hero.addEventListener("pointerenter", function () { hero.classList.add("spot-active"); });
    hero.addEventListener("pointerleave", function () { hero.classList.remove("spot-active"); });
    hero.addEventListener("pointermove", function (e) {
      var rect = hero.getBoundingClientRect();
      var x = ((e.clientX - rect.left) / rect.width) * 100;
      var y = ((e.clientY - rect.top) / rect.height) * 100;
      hero.style.setProperty("--spot-x", x + "%");
      hero.style.setProperty("--spot-y", y + "%");
    });
  }

  // ---------------------------------------------------------------------
  // Magnetic tilt on the avatar placeholder (desktop / fine-pointer only)
  // ---------------------------------------------------------------------
  var photoWrap = document.querySelector(".avatar-wrap");
  var photo = document.querySelector(".avatar-slot");
  if (photoWrap && photo && finePointer && !reduceMotion) {
    photoWrap.addEventListener("pointermove", function (e) {
      var rect = photoWrap.getBoundingClientRect();
      var px = (e.clientX - rect.left) / rect.width - 0.5;
      var py = (e.clientY - rect.top) / rect.height - 0.5;
      photo.style.setProperty("--tilt-y", (px * 14).toFixed(2) + "deg");
      photo.style.setProperty("--tilt-x", (py * -14).toFixed(2) + "deg");
      photo.style.setProperty("--tilt-s", "1.03");
    });
    photoWrap.addEventListener("pointerleave", function () {
      photo.style.setProperty("--tilt-x", "0deg");
      photo.style.setProperty("--tilt-y", "0deg");
      photo.style.setProperty("--tilt-s", "1");
    });
  }

  // ---------------------------------------------------------------------
  // Copy email to clipboard
  // ---------------------------------------------------------------------
  var copyBtn = document.getElementById("copy-email");
  var mailLink = document.getElementById("contact-mail-link");
  if (copyBtn && mailLink && navigator.clipboard) {
    copyBtn.style.display = "inline-flex";
    copyBtn.style.marginLeft = "0.5rem";
    copyBtn.addEventListener("click", function () {
      navigator.clipboard.writeText("ld.yogiraj@gmail.com").then(function () {
        showToast("Email copied to clipboard");
      });
    });
  }

  var toastEl;
  function showToast(msg) {
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.className = "toast";
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    requestAnimationFrame(function () { toastEl.classList.add("show"); });
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(function () {
      toastEl.classList.remove("show");
    }, 2200);
  }
})();

document.addEventListener("DOMContentLoaded", () => {

  /* =====================================================================
     ELEMENTS
     ===================================================================== */

  const root = document.documentElement;

  const ambientLayer = document.querySelector(".ambient-layer");
  const rainContainer = document.querySelector(".ambient-rain");
  const leavesContainer = document.querySelector(".ambient-leaves");
  const lightningEl = document.querySelector(".ambient-lightning");

  const topSection = document.querySelector("#top");
  const contactSection = document.querySelector("#contact");
  const heroWrap = topSection ? topSection.querySelector(".wrap") : null;

  const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

  if (!ambientLayer || !rainContainer || !leavesContainer) {
    return;
  }

  /* =====================================================================
     SETTINGS
     ===================================================================== */

  const isMobile = window.innerWidth < 700;
  const RAIN_COUNT = isMobile ? 45 : 90;
  const LEAF_COUNT = isMobile ? 7 : 13;

  /* =====================================================================
     LEAF SILHOUETTES -- tasteful filled tropical foliage, not thin line
     art. Monstera uses a real SVG mask to cut its signature leaf holes;
     fern and palm are built from filled leaflet/blade shapes along a
     stem. Each is drawn once per instance (monstera needs a unique mask
     id since multiple copies share the DOM at once).
     ===================================================================== */

  let leafUid = 0;

  const LEAF_SVGS = {
    monstera: () => {
      const id = `leaf-monstera-${leafUid++}`;
      return `<svg viewBox="0 0 100 150" fill="currentColor">
        <defs>
          <mask id="${id}" maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="150">
            <rect x="0" y="0" width="100" height="150" fill="#fff"/>
            <ellipse cx="40" cy="55" rx="6" ry="10" fill="#000" transform="rotate(-20 40 55)"/>
            <ellipse cx="63" cy="78" rx="7" ry="12" fill="#000" transform="rotate(15 63 78)"/>
            <ellipse cx="38" cy="103" rx="5" ry="9" fill="#000" transform="rotate(-10 38 103)"/>
          </mask>
        </defs>
        <path mask="url(#${id})" d="M50 4 C 84 14 100 55 92 96 C 86 132 66 154 50 158 C 34 154 14 132 8 96 C 0 55 16 14 50 4 Z"/>
        <path d="M50 148 L50 20" stroke="currentColor" stroke-opacity="0.3" stroke-width="1.4" fill="none"/>
      </svg>`;
    },
    fern: () => `<svg viewBox="0 0 100 200" fill="currentColor">
      <path d="M50 197 C 49 150 49 80 50 6" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-opacity="0.9"/>
      <ellipse cx="34" cy="26" rx="5" ry="13" transform="rotate(-35 34 26)"/><ellipse cx="66" cy="26" rx="5" ry="13" transform="rotate(35 66 26)"/>
      <ellipse cx="30" cy="48" rx="6" ry="16" transform="rotate(-38 30 48)"/><ellipse cx="70" cy="48" rx="6" ry="16" transform="rotate(38 70 48)"/>
      <ellipse cx="27" cy="72" rx="6.5" ry="18" transform="rotate(-40 27 72)"/><ellipse cx="73" cy="72" rx="6.5" ry="18" transform="rotate(40 73 72)"/>
      <ellipse cx="27" cy="98" rx="6.5" ry="18" transform="rotate(-40 27 98)"/><ellipse cx="73" cy="98" rx="6.5" ry="18" transform="rotate(40 73 98)"/>
      <ellipse cx="30" cy="124" rx="6" ry="16" transform="rotate(-38 30 124)"/><ellipse cx="70" cy="124" rx="6" ry="16" transform="rotate(38 70 124)"/>
      <ellipse cx="34" cy="148" rx="5" ry="13" transform="rotate(-34 34 148)"/><ellipse cx="66" cy="148" rx="5" ry="13" transform="rotate(34 66 148)"/>
      <ellipse cx="38" cy="168" rx="4" ry="10" transform="rotate(-30 38 168)"/><ellipse cx="62" cy="168" rx="4" ry="10" transform="rotate(30 62 168)"/>
    </svg>`,
    palm: () => `<svg viewBox="0 0 160 200" fill="currentColor">
      <path d="M14 192 C 40 150 80 90 142 22" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-opacity="0.9"/>
      <ellipse cx="26" cy="176" rx="3.2" ry="18" transform="rotate(-35 26 176)"/><ellipse cx="26" cy="176" rx="3.2" ry="16" transform="rotate(150 26 176)"/>
      <ellipse cx="44" cy="152" rx="3.4" ry="21" transform="rotate(-40 44 152)"/><ellipse cx="44" cy="152" rx="3.4" ry="19" transform="rotate(145 44 152)"/>
      <ellipse cx="62" cy="128" rx="3.6" ry="25" transform="rotate(-45 62 128)"/><ellipse cx="62" cy="128" rx="3.6" ry="22" transform="rotate(140 62 128)"/>
      <ellipse cx="80" cy="104" rx="3.6" ry="25" transform="rotate(-50 80 104)"/><ellipse cx="80" cy="104" rx="3.6" ry="22" transform="rotate(135 80 104)"/>
      <ellipse cx="98" cy="80" rx="3.4" ry="21" transform="rotate(-55 98 80)"/><ellipse cx="98" cy="80" rx="3.4" ry="19" transform="rotate(130 98 80)"/>
      <ellipse cx="116" cy="56" rx="3" ry="17" transform="rotate(-60 116 56)"/><ellipse cx="116" cy="56" rx="3" ry="15" transform="rotate(125 116 56)"/>
      <ellipse cx="132" cy="36" rx="2.6" ry="13" transform="rotate(-65 132 36)"/><ellipse cx="132" cy="36" rx="2.6" ry="11" transform="rotate(120 132 36)"/>
    </svg>`
  };
  const LEAF_TYPES = Object.keys(LEAF_SVGS);
  const LEAF_TINTS = ["var(--green)", "var(--green)", "var(--cyan)"]; // mostly green, occasional cyan rim-light

  /* =====================================================================
     CREATE RAIN
     ===================================================================== */

  function createRain() {
    rainContainer.innerHTML = "";
    if (reducedMotionQuery.matches) return;

    const fragment = document.createDocumentFragment();

    for (let i = 0; i < RAIN_COUNT; i++) {
      const drop = document.createElement("span");
      drop.className = "ambient-drop";
      drop.dataset.depth = Math.random() > 0.65 ? "front" : Math.random() > 0.5 ? "mid" : "back";

      const height = 35 + Math.random() * 120;
      const duration = 0.8 + Math.random() * 1.5;
      const delay = -(Math.random() * 3);
      const x = Math.random() * 100;
      const opacity = 0.45 + Math.random() * 0.5;
      const drift = -25 + Math.random() * 50;

      drop.style.setProperty("--drop-height", `${height}px`);
      drop.style.setProperty("--drop-duration", `${duration}s`);
      drop.style.setProperty("--drop-delay", `${delay}s`);
      drop.style.setProperty("--drop-x", `${x}%`);
      drop.style.setProperty("--drop-opacity", opacity);
      drop.style.setProperty("--drift-end", `${drift}px`);

      fragment.appendChild(drop);
    }

    rainContainer.appendChild(fragment);
  }

  /* =====================================================================
     CREATE LEAVES
     Every leaf stems from an edge -- left, right, top or bottom -- never
     floats near the center. Sides are the most common; a smaller share
     hangs from the top or rises from the bottom, so the jungle frames the
     viewport from all four sides rather than clustering in corners.
     ===================================================================== */

  const leaves = [];
  const LEAF_EDGES = ["left", "left", "right", "right", "top", "bottom"];

  function createLeaves() {
    leavesContainer.innerHTML = "";
    leaves.length = 0;

    for (let i = 0; i < LEAF_COUNT; i++) {
      const type = LEAF_TYPES[Math.floor(Math.random() * LEAF_TYPES.length)];
      const depthOptions = ["front", "front", "mid", "mid", "back"];
      const depth = depthOptions[Math.floor(Math.random() * depthOptions.length)];
      const edge = LEAF_EDGES[Math.floor(Math.random() * LEAF_EDGES.length)];

      const leaf = document.createElement("div");
      leaf.className = "ambient-leaf";
      leaf.dataset.depth = depth;
      leaf.dataset.edge = edge;
      leaf.innerHTML = LEAF_SVGS[type]();

      let x, y, rotation, flip;

      if (edge === "left") {
        x = -10 + Math.random() * 14;
        y = Math.random() * 100;
        rotation = -25 + Math.random() * 50;
        flip = 1;
      } else if (edge === "right") {
        x = 92 + Math.random() * 14;
        y = Math.random() * 100;
        rotation = -25 + Math.random() * 50;
        flip = -1;
      } else if (edge === "top") {
        x = 8 + Math.random() * 84;
        y = -12 + Math.random() * 14;
        rotation = 160 + Math.random() * 40; // hangs downward, tip pointing into the scene
        flip = Math.random() > 0.5 ? 1 : -1;
      } else {
        x = 8 + Math.random() * 84;
        y = 90 + Math.random() * 16;
        rotation = -20 + Math.random() * 40; // grows upward, like undergrowth
        flip = Math.random() > 0.5 ? 1 : -1;
      }

      const size = depth === "front" ? 150 + Math.random() * 110
                 : depth === "mid"   ? 100 + Math.random() * 70
                 :                     70 + Math.random() * 45;

      const baseOpacity = depth === "front" ? 0.36 + Math.random() * 0.18
                         : depth === "mid"   ? 0.26 + Math.random() * 0.16
                         :                     0.17 + Math.random() * 0.10;

      const swayRange = depth === "front" ? 18 : depth === "mid" ? 10 : 5;
      const tint = LEAF_TINTS[Math.floor(Math.random() * LEAF_TINTS.length)];

      leaf.style.setProperty("--leaf-size", `${size}px`);
      leaf.style.setProperty("--leaf-x", `${x}%`);
      leaf.style.setProperty("--leaf-y", `${y}%`);
      leaf.style.setProperty("--leaf-rotation", `${rotation}deg`);
      leaf.style.setProperty("--leaf-opacity", baseOpacity);
      leaf.style.setProperty("--leaf-tint", tint);
      leaf.style.setProperty("--leaf-flip", flip);

      leaves.push({
        element: leaf,
        baseRotation: rotation,
        swayRange,
        swaySeed: Math.random() * Math.PI * 2,
        swaySpeed: 0.00025 + Math.random() * 0.00025
      });

      leavesContainer.appendChild(leaf);
    }
  }

  /* =====================================================================
     LEAF MOVEMENT
     Slow, gentle, and bounded -- a leaf never drifts permanently off
     screen the further the page scrolls. Sway comes from time (a slow
     idle breathing motion) plus a small scroll-bounded offset per depth.
     ===================================================================== */

  function updateLeaves(scrollY, now) {
    if (reducedMotionQuery.matches) return;

    const vh = window.innerHeight || 800;
    // Bounded by viewport height so leaves sway with scroll without
    // ever accumulating an unbounded, permanent upward drift.
    const scrollPhase = (scrollY % vh) / vh;

    leaves.forEach(leaf => {
      const idleSway = Math.sin(now * leaf.swaySpeed + leaf.swaySeed) * leaf.swayRange;
      const scrollSway = Math.sin(scrollPhase * Math.PI * 2 + leaf.swaySeed) * (leaf.swayRange * 0.6);

      leaf.element.style.setProperty("--leaf-shift-y", `${(idleSway * 0.4).toFixed(2)}px`);
      leaf.element.style.setProperty("--leaf-shift-x", `${(scrollSway * 0.3).toFixed(2)}px`);
      leaf.element.style.setProperty("--leaf-rotation", `${(leaf.baseRotation + idleSway * 0.25).toFixed(2)}deg`);
    });
  }

  /* =====================================================================
     LIGHTNING -- occasional, randomly positioned, from the edges only.
     Scheduled independently of the scroll loop with its own timers.
     ===================================================================== */

  let lightningTimer = null;

  function flashOnce(peak) {
    if (!lightningEl) return;
    const edge = Math.floor(Math.random() * 3); // 0 left, 1 right, 2 top
    const x = edge === 0 ? `${-5 + Math.random() * 10}%`
            : edge === 1 ? `${95 + Math.random() * 10}%`
            : `${Math.random() * 100}%`;
    const y = edge === 2 ? `${-5 + Math.random() * 10}%` : `${Math.random() * 60}%`;

    root.style.setProperty("--lightning-x", x);
    root.style.setProperty("--lightning-y", y);
    root.style.setProperty("--lightning-opacity", peak);

    window.setTimeout(() => {
      root.style.setProperty("--lightning-opacity", 0);
    }, 90 + Math.random() * 80);
  }

  function triggerLightning() {
    if (reducedMotionQuery.matches) return;

    const isLight = root.getAttribute("data-theme") === "light";
    const peak = isLight
      ? 0.05 + Math.random() * 0.08
      : 0.16 + Math.random() * 0.22;

    flashOnce(peak);

    // Occasionally a double or triple flash, same general direction.
    const extraFlashes = Math.random() > 0.8 ? (Math.random() > 0.5 ? 2 : 1) : 0;
    for (let i = 1; i <= extraFlashes; i++) {
      window.setTimeout(() => flashOnce(peak * (0.6 + Math.random() * 0.3)), i * (140 + Math.random() * 120));
    }
  }

  function scheduleLightning() {
    const delay = 7000 + Math.random() * 14000;
    lightningTimer = window.setTimeout(() => {
      triggerLightning();
      scheduleLightning();
    }, delay);
  }

  /* =====================================================================
     SCROLL-RELATIVE PROGRESS
     heroProgress and contactProgress are each measured against their own
     section's position -- never against total page scroll -- so the
     atmosphere reacts to the right section regardless of how much content
     sits between them.
     ===================================================================== */

  function getHeroProgress() {
    if (!topSection) return 0;
    const rect = topSection.getBoundingClientRect();
    const traveled = Math.max(0, -rect.top);
    const distance = Math.min(rect.height * 0.85, window.innerHeight);
    return distance > 0 ? Math.min(1, traveled / distance) : 0;
  }

  function getContactProgress() {
    if (!contactSection) return 1;
    const rect = contactSection.getBoundingClientRect();
    const vh = window.innerHeight;
    const start = vh; // contact's top just entering the bottom of the viewport
    const end = vh * 0.35; // contact has arrived, roughly a third down the screen
    if (rect.top >= start) return 0;
    if (rect.top <= end) return 1;
    return (start - rect.top) / (start - end);
  }

  /* =====================================================================
     APPLY ATMOSPHERE -- one function, one set of custom properties.
     ===================================================================== */

  const MIDDLE_BASELINE = 0.32;

  function updateAtmosphere(heroProgress, contactProgress) {
    const heroFactor = 1 - heroProgress;
    const contactFactor = contactProgress;
    const intensity = MIDDLE_BASELINE + (1 - MIDDLE_BASELINE) * Math.max(heroFactor, contactFactor);

    root.style.setProperty("--rain-intensity", intensity.toFixed(3));
    root.style.setProperty("--rain-speed", (0.8 + intensity * 0.4).toFixed(3));
    root.style.setProperty("--leaf-density", intensity.toFixed(3));
    root.style.setProperty("--ambient-blur", `${((1 - intensity) * 0.6).toFixed(2)}px`);

    // Glow drifts diagonally down the page rather than jumping per section.
    const glowX = 22 + Math.max(heroFactor, contactFactor) * 55;
    const glowY = 20 + (1 - Math.max(heroFactor, contactFactor)) * 45;
    root.style.setProperty("--glow-x", `${glowX.toFixed(1)}%`);
    root.style.setProperty("--glow-y", `${glowY.toFixed(1)}%`);
  }

  /* =====================================================================
     HERO + CONTACT TRANSITIONS
     ===================================================================== */

  function updateHeroTransition(heroProgress) {
    if (!topSection) return;
    topSection.style.setProperty("--hero-progress", heroProgress.toFixed(4));
  }

  function updateContactTransition(contactProgress) {
    if (!contactSection) return;
    contactSection.style.setProperty("--contact-progress", contactProgress.toFixed(4));
  }

  /* =====================================================================
     ANIMATION LOOP -- one centralized requestAnimationFrame loop drives
     every atmospheric effect (rain intensity, leaf sway, hero transition,
     contact transition, glow position). Reading layout values fresh each
     frame means it responds to scroll AND resize with zero extra
     listeners, and leaves keep their slow idle sway even at rest.
     ===================================================================== */

  let rafId = null;

  function frame(now) {
    const heroProgress = getHeroProgress();
    const contactProgress = getContactProgress();

    updateAtmosphere(heroProgress, contactProgress);
    updateHeroTransition(heroProgress);
    updateContactTransition(contactProgress);
    updateLeaves(window.scrollY, now);

    rafId = window.requestAnimationFrame(frame);
  }

  function startLoop() {
    if (rafId !== null) return;
    rafId = window.requestAnimationFrame(frame);
  }

  function stopLoop() {
    if (rafId === null) return;
    window.cancelAnimationFrame(rafId);
    rafId = null;
  }

  reducedMotionQuery.addEventListener("change", () => {
    createRain();

    if (reducedMotionQuery.matches) {
      stopLoop();
      window.clearTimeout(lightningTimer);
      // Leave the CSS reduced-motion fallback values in charge.
      updateAtmosphere(0, 1);
    } else {
      startLoop();
      scheduleLightning();
    }
  });

  /* =====================================================================
     INITIALIZE
     ===================================================================== */

  createRain();
  createLeaves();

  if (reducedMotionQuery.matches) {
    updateAtmosphere(0, 1);
  } else {
    startLoop();
    scheduleLightning();
  }

});
