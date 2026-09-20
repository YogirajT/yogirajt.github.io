(() => {
  "use strict";

  var reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  var finePointer = window.matchMedia("(pointer: fine)").matches;

  // Mark JS as active so CSS can opt certain elements into a hidden->reveal
  // starting state. Everything is visible by default without this class.
  document.documentElement.classList.add("js-anim");

  // ---------------------------------------------------------------------
  // Theme toggle (light / dark) — persisted, synced across both buttons
  // ---------------------------------------------------------------------
  var root = document.documentElement;
  var themeButtons = [
    document.getElementById("theme-toggle-desktop"),
    document.getElementById("theme-toggle-mobile"),
  ].filter(Boolean);

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
  let themeTransitionTimer;
  function setTheme(t) {
    const oldTheme = currentTheme();

    if (oldTheme === t) return;

    const directionClass =
      t === "light" ? "theme-shifting-to-light" : "theme-shifting-to-dark";

    root.classList.remove("theme-shifting-to-light", "theme-shifting-to-dark");

    // Trigger cinematic overlay
    root.classList.add(directionClass);

    // Change the actual theme
    root.setAttribute("data-theme", t);

    try {
      localStorage.setItem("theme", t);
    } catch (e) {}

    syncToggleLabels();

    clearTimeout(themeTransitionTimer);

    themeTransitionTimer = setTimeout(() => {
      root.classList.remove(directionClass);
    }, 1900);
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
  // Hero visual: cycling backend-architecture-paradigm diagrams
  // ---------------------------------------------------------------------
  var archCycler = document.querySelector("[data-arch-cycler]");
  if (archCycler) {
    var archOrder = [
      "layered",
      "hexagonal",
      "event-driven",
      "microservices",
      "cqrs",
      "pipeline",
      "service-mesh",
      "actor-model",
      "peer-to-peer",
      "saga",
      "master-worker",
      "serverless",
      "active-passive",
    ];
    var archPanels = archCycler.querySelectorAll("[data-arch-panel]");
    var archDots = archCycler.querySelectorAll("[data-arch-target]");
    var archIndex = 0;
    var archTimer = null;
    var archHovered = false;
    var archInView = true;

    function setArch(key) {
      archIndex = archOrder.indexOf(key);
      archPanels.forEach(function (panel) {
        panel.classList.toggle(
          "is-active",
          panel.getAttribute("data-arch-panel") === key,
        );
      });
      archDots.forEach(function (dot) {
        var isActive = dot.getAttribute("data-arch-target") === key;
        dot.classList.toggle("is-active", isActive);
        dot.setAttribute("aria-selected", isActive ? "true" : "false");
      });
    }

    // like setArch, but slides the outgoing/incoming diagrams past each other
    // (with a fade) in the given direction, for swipe gestures
    function swipeArch(key, direction) {
      var toPanel = archCycler.querySelector('[data-arch-panel="' + key + '"]');
      var fromPanel = archCycler.querySelector(".arch-diagram.is-active");
      if (!toPanel || toPanel === fromPanel) return;

      if (reduceMotion) {
        setArch(key);
        return;
      }

      // "left" swipe advances (next comes in from the right, current exits left)
      var startClass = direction === "left" ? "arch-swipe-right" : "arch-swipe-left";
      var endClass = direction === "left" ? "arch-swipe-left" : "arch-swipe-right";

      toPanel.classList.add("arch-swipe", startClass);
      toPanel.style.zIndex = 3;
      void toPanel.offsetWidth; // force reflow so the start position registers

      requestAnimationFrame(function () {
        if (fromPanel) {
          fromPanel.classList.add("arch-swipe", endClass);
          fromPanel.classList.remove("is-active");
        }
        toPanel.classList.remove(startClass);
        toPanel.classList.add("is-active");
      });

      var cleanup = function () {
        toPanel.classList.remove("arch-swipe");
        toPanel.style.zIndex = "";
        if (fromPanel) fromPanel.classList.remove("arch-swipe", endClass);
        toPanel.removeEventListener("transitionend", cleanup);
      };
      toPanel.addEventListener("transitionend", cleanup);

      archIndex = archOrder.indexOf(key);
      archDots.forEach(function (dot) {
        var isActive = dot.getAttribute("data-arch-target") === key;
        dot.classList.toggle("is-active", isActive);
        dot.setAttribute("aria-selected", isActive ? "true" : "false");
      });
    }

    function refreshArchTimer() {
      clearInterval(archTimer);
      if (reduceMotion || archHovered || !archInView) return;
      // give mobile viewers (who glance at it mid-scroll) more time per diagram
      var delay = window.innerWidth <= 700 ? 7500 : 5200;
      archTimer = setInterval(function () {
        setArch(archOrder[(archIndex + 1) % archOrder.length]);
      }, delay);
    }

    archDots.forEach(function (dot) {
      dot.addEventListener("click", function () {
        setArch(dot.getAttribute("data-arch-target"));
        refreshArchTimer();
      });
    });

    archCycler.addEventListener("pointerenter", function () {
      archHovered = true;
      refreshArchTimer();
    });
    archCycler.addEventListener("pointerleave", function () {
      archHovered = false;
      refreshArchTimer();
    });
    archCycler.addEventListener("focusin", function () {
      archHovered = true;
      refreshArchTimer();
    });
    archCycler.addEventListener("focusout", function () {
      archHovered = false;
      refreshArchTimer();
    });

    // swipe left/right on the diagram stage to navigate (mobile)
    var archStage = archCycler.querySelector(".arch-stage");
    if (archStage) {
      var archTouchStartX = 0;
      var archTouchStartY = 0;
      var archTouchActive = false;

      archStage.addEventListener(
        "touchstart",
        function (e) {
          if (e.touches.length !== 1) return;
          archTouchStartX = e.touches[0].clientX;
          archTouchStartY = e.touches[0].clientY;
          archTouchActive = true;
        },
        { passive: true },
      );

      archStage.addEventListener(
        "touchend",
        function (e) {
          if (!archTouchActive) return;
          archTouchActive = false;
          var touch = e.changedTouches[0];
          var dx = touch.clientX - archTouchStartX;
          var dy = touch.clientY - archTouchStartY;
          // require a deliberate, mostly-horizontal swipe
          if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
          var direction = dx < 0 ? "left" : "right";
          var nextKey =
            direction === "left"
              ? archOrder[(archIndex + 1) % archOrder.length]
              : archOrder[(archIndex - 1 + archOrder.length) % archOrder.length];
          swipeArch(nextKey, direction);
          refreshArchTimer();
        },
        { passive: true },
      );
    }

    // pause entirely while scrolled out of view, so mobile viewers always
    // see a fresh diagram (not a mid-fade one) when it scrolls back on screen
    if ("IntersectionObserver" in window) {
      var archObserver = new IntersectionObserver(
        function (entries) {
          archInView = entries[0].isIntersecting;
          refreshArchTimer();
        },
        { threshold: 0.2 },
      );
      archObserver.observe(archCycler);
    }

    refreshArchTimer();
  }

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
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
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
    document
      .querySelectorAll(".reveal, .job, .skill-group, .earlier-item")
      .forEach(function (el) {
        el.classList.add("in-view");
      });
  }

  // Safety net: if for any reason the observer never fires for an element
  // (older/unusual browsers), force everything visible after a short delay
  // so content can never get stuck hidden.
  window.setTimeout(function () {
    document
      .querySelectorAll(".reveal, .job, .skill-group, .earlier-item")
      .forEach(function (el) {
        el.classList.add("in-view");
      });
  }, 2500);

  // ---------------------------------------------------------------------
  // Scroll-spy: highlight the current section in the nav
  // ---------------------------------------------------------------------
  var sections = ["about", "experience", "skills", "education", "contact"]
    .map(function (id) {
      return document.getElementById(id);
    })
    .filter(Boolean);
  var navLinkMap = {};
  document
    .querySelectorAll(".nav-links a, .nav-toggle-panel a")
    .forEach(function (a) {
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
            navLinkMap[id].forEach(function (a) {
              a.classList.remove("active");
            });
          });
          var links = navLinkMap[entry.target.id];
          if (links)
            links.forEach(function (a) {
              a.classList.add("active");
            });
        });
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: 0 },
    );
    sections.forEach(function (s) {
      spy.observe(s);
    });
  }

  // ---------------------------------------------------------------------
  // Typewriter effect for the hero role line (runs once, on load)
  // ---------------------------------------------------------------------
  var tw = document.getElementById("typewriter");
  if (tw) {
    // The full text already lives in the HTML (so it's visible/crawlable
    // with no JS at all). We read it, then "type" it back in on load.
    var full = tw.textContent.replace(/\s+/g, " ").trim();
    if (reduceMotion) {
      tw.textContent = full;
    } else {
      // Keep the *whole* line laid out at all times: the typed part is
      // visible, the remainder is present but hidden (visibility: hidden).
      // That reserves the final height and wrapping up front, so the
      // layout below never shifts when the text reaches a second line.
      var typed = document.createElement("span");
      var rest = document.createElement("span");
      typed.className = "tw-typed";
      rest.className = "tw-rest";
      rest.setAttribute("aria-hidden", "true");
      tw.textContent = "";
      tw.appendChild(typed);
      tw.appendChild(rest);

      var i = 0;
      var speed = 18; // ms per character — quick, not gimmicky
      (function type() {
        typed.textContent = full.slice(0, i);
        rest.textContent = full.slice(i);
        i++;
        if (i <= full.length) {
          window.setTimeout(type, speed);
        } else {
          // Let the caret blink a moment, then settle back to plain text.
          window.setTimeout(function () {
            tw.textContent = full;
          }, 1400);
        }
      })();
    }
  }

  // ---------------------------------------------------------------------
  // Cursor spotlight glow on the hero and contact sections
  // (desktop / fine-pointer only)
  // ---------------------------------------------------------------------
  if (finePointer && !reduceMotion) {
    [document.querySelector(".hero"), document.getElementById("contact")].forEach(
      function (el) {
        if (!el) return;
        el.addEventListener("pointerenter", function () {
          el.classList.add("spot-active");
        });
        el.addEventListener("pointerleave", function () {
          el.classList.remove("spot-active");
        });
        el.addEventListener("pointermove", function (e) {
          var rect = el.getBoundingClientRect();
          var x = ((e.clientX - rect.left) / rect.width) * 100;
          var y = ((e.clientY - rect.top) / rect.height) * 100;
          el.style.setProperty("--spot-x", x + "%");
          el.style.setProperty("--spot-y", y + "%");
        });
      },
    );
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
    requestAnimationFrame(function () {
      toastEl.classList.add("show");
    });
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
  const boltSvg = document.querySelector(".ambient-bolt");

  const topSection = document.querySelector("#top");
  const contactSection = document.querySelector("#contact");
  const heroWrap = topSection ? topSection.querySelector(".wrap") : null;

  const reducedMotionQuery = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  );

  if (!ambientLayer || !rainContainer || !leavesContainer) {
    return;
  }

  /* =====================================================================
     SETTINGS
     ===================================================================== */

  const isMobile = window.innerWidth < 700;
  const RAIN_COUNT = isMobile ? 45 : 90;
  const LEAF_COUNT = isMobile ? 10 : 18;

  /* =====================================================================
     FOLIAGE SILHOUETTES -- simple leaves on a simple stem. Each cluster is
     one gently curved stem (a stroked path) with plain pointed-oval leaves
     attached along it in alternating pairs and one leaf at the tip. The
     stem always grows inward from the left or right side of the page.
     Three presets change only the proportions: "canopy" = a few broad
     leaves, "fern" = many small narrow leaves, "palm" = long slim blades.
     Every instance is still procedurally unique.
     ===================================================================== */

  function buildCluster(preset, edge) {
    let leafCount, leafLen, leafHalfW, leafAngle;

    if (preset === "canopy") {
      leafCount = 5;
      leafLen = 66;
      leafHalfW = 0.27; // half-width as a fraction of leaf length
      leafAngle = 48; // degrees away from the stem direction
    } else if (preset === "fern") {
      leafCount = 10;
      leafLen = 42;
      leafHalfW = 0.17;
      leafAngle = 62;
    } else {
      // palm
      leafCount = 6;
      leafLen = 92;
      leafHalfW = 0.1;
      leafAngle = 36;
    }

    const rad = (deg) => (deg * Math.PI) / 180;
    const rand = (min, max) => min + Math.random() * (max - min);
    const f = (n) => n.toFixed(1);

    // The stem starts at the middle of the box's outer side and grows inward:
    // left clusters grow rightwards, right clusters grow leftwards.
    // Shorter on phones so the (twice-as-large) leaves don't cover the whole screen.
    const stemLen = isMobile ? 150 : 240;
    const by = 150;
    let bx, dir;
    if (edge === "left") {
      bx = 0;
      dir = rand(-22, 22);
    } else {
      bx = 300;
      dir = 180 + rand(-22, 22);
    }

    // Stem: a quadratic curve with a slight bend.
    const ex = bx + Math.cos(rad(dir)) * stemLen;
    const ey = by + Math.sin(rad(dir)) * stemLen;
    const bend = (Math.random() > 0.5 ? 1 : -1) * stemLen * rand(0.08, 0.16);
    const cx = (bx + ex) / 2 + Math.cos(rad(dir + 90)) * bend;
    const cy = (by + ey) / 2 + Math.sin(rad(dir + 90)) * bend;

    const pointAt = (t) => ({
      x: (1 - t) * (1 - t) * bx + 2 * (1 - t) * t * cx + t * t * ex,
      y: (1 - t) * (1 - t) * by + 2 * (1 - t) * t * cy + t * t * ey,
    });
    const angleAt = (t) =>
      (Math.atan2(
        2 * (1 - t) * (cy - by) + 2 * t * (ey - cy),
        2 * (1 - t) * (cx - bx) + 2 * t * (ex - cx),
      ) *
        180) /
      Math.PI;

    // A simple leaf: a pointed oval, base at (0,0), tip at (len,0).
    const leaf = (x, y, angle, len) => {
      const w = len * leafHalfW * 2; // curve control offset = 2x visible half-width
      return `<path transform="translate(${f(x)} ${f(y)}) rotate(${f(angle)})" d="M 0 0 Q ${f(len * 0.45)} ${f(-w)} ${f(len)} 0 Q ${f(len * 0.45)} ${f(w)} 0 0 Z"/>`;
    };

    let leaves = "";
    for (let i = 0; i < leafCount; i++) {
      const t = 0.2 + (0.7 * i) / Math.max(1, leafCount - 1);
      const p = pointAt(t);
      const side = i % 2 === 0 ? 1 : -1;
      const angle = angleAt(t) + side * (leafAngle + rand(-6, 6));
      const len = leafLen * (1 - 0.35 * t) * rand(0.9, 1.1);
      leaves += leaf(p.x, p.y, angle, len);
    }
    // terminal leaf continues along the stem direction
    leaves += leaf(ex, ey, angleAt(1), leafLen * 0.8);

    const stem = `<path d="M ${f(bx)} ${f(by)} Q ${f(cx)} ${f(cy)} ${f(ex)} ${f(ey)}" stroke="currentColor" stroke-width="3.4" fill="none" stroke-linecap="round" opacity="0.8"/>`;

    return `<svg viewBox="0 0 300 300" fill="currentColor">${stem}${leaves}</svg>`;
  }

  const LEAF_TYPES = ["canopy", "fern", "palm"];
  const LEAF_TINTS = [
    "color-mix(in srgb, var(--green) 42%, black 58%)",
    "color-mix(in srgb, var(--green) 42%, black 58%)",
    "color-mix(in srgb, var(--green) 60%, black 40%)",
    "var(--green)",
    "var(--cyan)",
  ]; // mostly dark jungle-shadow green, occasional lit green or cyan rim-light

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
      drop.dataset.depth =
        Math.random() > 0.65 ? "front" : Math.random() > 0.5 ? "mid" : "back";

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
     CREATE FOLIAGE CLUSTERS
     Every cluster grows from the left or right side of the page, never from
     the top, bottom or middle. Sides alternate, and each side's clusters are
     spread evenly down the viewport (with jitter) so the foliage reads as a
     continuous border instead of random patches and gaps.
     ===================================================================== */

  const leaves = [];

  function createLeaves() {
    leavesContainer.innerHTML = "";
    leaves.length = 0;

    const perSide = Math.ceil(LEAF_COUNT / 2);

    for (let i = 0; i < LEAF_COUNT; i++) {
      const type = LEAF_TYPES[Math.floor(Math.random() * LEAF_TYPES.length)];
      const depthOptions = ["front", "front", "mid", "mid", "back"];
      const depth =
        depthOptions[Math.floor(Math.random() * depthOptions.length)];
      const edge = i % 2 === 0 ? "left" : "right";

      const leaf = document.createElement("div");
      leaf.className = "ambient-leaf";
      leaf.dataset.depth = depth;
      leaf.dataset.edge = edge;
      leaf.innerHTML = buildCluster(type, edge);

      const size =
        depth === "front"
          ? 460 + Math.random() * 300
          : depth === "mid"
            ? 320 + Math.random() * 200
            : 220 + Math.random() * 140;

      // Vertical position: this side's slot down the viewport, plus jitter.
      // The stem base sits at the box's vertical middle, so offset by half the box.
      const slot = Math.floor(i / 2);
      const slotH = 110 / perSide;
      const centerY = -5 + (slot + 0.15 + Math.random() * 0.7) * slotH; // % of viewport height
      const y = `calc(${centerY.toFixed(1)}% - ${(size / 2).toFixed(0)}px)`;

      // Horizontal position: the stem base sits just past the page's edge.
      const x =
        edge === "left"
          ? `${(-size * 0.02).toFixed(0)}px`
          : `calc(100% - ${(size * 0.98).toFixed(0)}px)`;

      const rotation = -8 + Math.random() * 16; // subtle sway tilt only, mass shape does the rest

      const baseOpacity =
        depth === "front"
          ? 0.5 + Math.random() * 0.22
          : depth === "mid"
            ? 0.34 + Math.random() * 0.18
            : 0.22 + Math.random() * 0.12;

      const swayRange = depth === "front" ? 14 : depth === "mid" ? 8 : 4;
      const tint = LEAF_TINTS[Math.floor(Math.random() * LEAF_TINTS.length)];

      leaf.style.setProperty("--leaf-size", `${size}px`);
      leaf.style.setProperty("--leaf-x", x);
      leaf.style.setProperty("--leaf-y", y);
      leaf.style.setProperty("--leaf-rotation", `${rotation}deg`);
      leaf.style.setProperty("--leaf-opacity", baseOpacity);
      leaf.style.setProperty("--leaf-tint", tint);

      leaves.push({
        element: leaf,
        baseRotation: rotation,
        swayRange,
        swaySeed: Math.random() * Math.PI * 2,
        swaySpeed: 0.00025 + Math.random() * 0.00025,
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

    leaves.forEach((leaf) => {
      const idleSway =
        Math.sin(now * leaf.swaySpeed + leaf.swaySeed) * leaf.swayRange;
      const scrollSway =
        Math.sin(scrollPhase * Math.PI * 2 + leaf.swaySeed) *
        (leaf.swayRange * 0.6);

      leaf.element.style.setProperty(
        "--leaf-shift-y",
        `${(idleSway * 0.4).toFixed(2)}px`,
      );
      leaf.element.style.setProperty(
        "--leaf-shift-x",
        `${(scrollSway * 0.3).toFixed(2)}px`,
      );
      leaf.element.style.setProperty(
        "--leaf-rotation",
        `${(leaf.baseRotation + idleSway * 0.25).toFixed(2)}deg`,
      );
    });
  }

  /* =====================================================================
     LIGHTNING -- occasional, randomly positioned, from the edges only.
     Scheduled independently of the scroll loop with its own timers.
     Draws both a soft ambient glow wash and an actual jagged bolt path.
     ===================================================================== */

  let lightningTimer = null;

  function jaggedPath(x1, y1, x2, y2, segments, jitter) {
    let d = `M ${x1.toFixed(1)} ${y1.toFixed(1)}`;
    for (let i = 1; i <= segments; i++) {
      const t = i / segments;
      const x = x1 + (x2 - x1) * t + (Math.random() - 0.5) * jitter;
      const y = y1 + (y2 - y1) * t;
      d += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
    }
    return d;
  }

  function drawBolt(originXPct, originYPct) {
    if (!boltSvg) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    boltSvg.setAttribute("viewBox", `0 0 ${w} ${h}`);

    const x1 = (originXPct / 100) * w;
    const y1 = Math.max(0, (originYPct / 100) * h);
    const x2 = x1 + (Math.random() - 0.5) * w * 0.22;
    const y2 = h * (0.42 + Math.random() * 0.32);

    const mainD = jaggedPath(x1, y1, x2, y2, 6, 34);

    // A short secondary branch off a point partway down the main bolt.
    const branchT = 0.35 + Math.random() * 0.3;
    const bx = x1 + (x2 - x1) * branchT;
    const by = y1 + (y2 - y1) * branchT;
    const branchD = jaggedPath(
      bx,
      by,
      bx + (Math.random() - 0.5) * w * 0.12,
      by + (y2 - y1) * 0.3,
      3,
      22,
    );
    const showBranch = Math.random() > 0.45;

    boltSvg.innerHTML =
      `<path class="bolt-glow" d="${mainD}" fill="none" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>` +
      `<path class="bolt-core" d="${mainD}" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>` +
      (showBranch
        ? `<path class="bolt-glow" d="${branchD}" fill="none" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>` +
          `<path class="bolt-core" d="${branchD}" fill="none" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>`
        : "");
  }

  function flashOnce(peak) {
    if (!lightningEl) return;
    const edge = Math.floor(Math.random() * 3); // 0 left, 1 right, 2 top
    const xPct =
      edge === 0
        ? -5 + Math.random() * 10
        : edge === 1
          ? 95 + Math.random() * 10
          : Math.random() * 100;
    const yPct = edge === 2 ? -5 + Math.random() * 10 : Math.random() * 60;

    root.style.setProperty("--lightning-x", `${xPct}%`);
    root.style.setProperty("--lightning-y", `${yPct}%`);
    root.style.setProperty("--lightning-opacity", peak);

    drawBolt(xPct, yPct);

    window.setTimeout(
      () => {
        root.style.setProperty("--lightning-opacity", 0);
      },
      90 + Math.random() * 80,
    );
  }

  function triggerLightning() {
    if (reducedMotionQuery.matches) return;

    const isLight = root.getAttribute("data-theme") === "light";
    const peak = isLight
      ? 0.05 + Math.random() * 0.08
      : 0.16 + Math.random() * 0.22;

    flashOnce(peak);

    // Occasionally a double or triple flash, same general direction.
    const extraFlashes =
      Math.random() > 0.8 ? (Math.random() > 0.5 ? 2 : 1) : 0;
    for (let i = 1; i <= extraFlashes; i++) {
      window.setTimeout(
        () => flashOnce(peak * (0.6 + Math.random() * 0.3)),
        i * (140 + Math.random() * 120),
      );
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

  const MIDDLE_BASELINE = 0.16;

  function updateAtmosphere(heroProgress, contactProgress) {
    const heroFactor = 1 - heroProgress;
    const contactFactor = contactProgress;
    const intensity =
      MIDDLE_BASELINE +
      (1 - MIDDLE_BASELINE) * Math.max(heroFactor, contactFactor);

    root.style.setProperty("--rain-intensity", intensity.toFixed(3));
    // root.style.setProperty("--rain-speed", (0.8 + intensity * 0.4).toFixed(3));
    root.style.setProperty("--leaf-density", intensity.toFixed(3));
    root.style.setProperty(
      "--ambient-blur",
      `${((1 - intensity) * 0.6).toFixed(2)}px`,
    );

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
    contactSection.style.setProperty(
      "--contact-progress",
      contactProgress.toFixed(4),
    );
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

/* ==========================================================================
   COOKIE CONSENT + GOOGLE ANALYTICS — BASIC / CONSENT-GATED

   Google Analytics is NOT loaded before consent.

   First visit:
     - No gtag.js request
     - No Google Analytics request
     - Consent banner is shown

   Accept:
     - Save consent
     - Load gtag.js
     - Initialise Google Analytics
     - Send the page_view

   Reject:
     - Save rejection
     - Do not load Google Analytics

   Returning visitor:
     - "accepted" -> load Google Analytics immediately
     - "rejected" -> keep Google Analytics completely unloaded

   No advertising features are enabled.
   ========================================================================== */

(function () {
  "use strict";

  const GA_MEASUREMENT_ID = "G-48BYR598ZB";
  const CONSENT_STORAGE_KEY = "yt_cookie_consent";

  let analyticsLoaded = false;
  let analyticsLoading = false;

  /* ------------------------------------------------------------------------
     STORAGE
     ------------------------------------------------------------------------ */

  function getConsent() {
    try {
      return localStorage.getItem(CONSENT_STORAGE_KEY);
    } catch (error) {
      console.warn("Unable to read privacy preference.");
      return null;
    }
  }

  function saveConsent(value) {
    try {
      localStorage.setItem(CONSENT_STORAGE_KEY, value);
    } catch (error) {
      console.warn("Unable to save privacy preference.");
    }
  }

  function clearConsent() {
    try {
      localStorage.removeItem(CONSENT_STORAGE_KEY);
    } catch (error) {
      console.warn("Unable to reset privacy preference.");
    }
  }

  /* ------------------------------------------------------------------------
     GOOGLE ANALYTICS
     ------------------------------------------------------------------------ */

  function loadGoogleAnalytics() {
    /*
     * Prevent duplicate loading.
     */
    if (analyticsLoaded || analyticsLoading) {
      return;
    }

    if (!GA_MEASUREMENT_ID) {
      return;
    }

    analyticsLoading = true;

    /*
     * Create dataLayer and gtag ONLY when consent has already been granted.
     */
    window.dataLayer = window.dataLayer || [];

    window.gtag =
      window.gtag ||
      function () {
        window.dataLayer.push(arguments);
      };

    /*
     * Initialise the Google tag.
     */
    window.gtag("js", new Date());

    /*
     * Analytics is being loaded only after explicit consent.
     *
     * Advertising-related storage remains disabled.
     */
    window.gtag("config", GA_MEASUREMENT_ID, {
      anonymize_ip: true,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
    });

    /*
     * Load Google's script.
     *
     * THIS is the first point at which the browser is allowed to request
     * anything from googletagmanager.com.
     */
    const script = document.createElement("script");

    script.async = true;

    script.src =
      "https://www.googletagmanager.com/gtag/js?id=" +
      encodeURIComponent(GA_MEASUREMENT_ID);

    script.onload = function () {
      analyticsLoaded = true;
      analyticsLoading = false;
    };

    script.onerror = function () {
      analyticsLoading = false;

      console.error("Google Analytics failed to load.");
    };

    document.head.appendChild(script);
  }

  /* ------------------------------------------------------------------------
     BANNER
     ------------------------------------------------------------------------ */

  function showBanner() {
    const banner = document.getElementById("cookie-banner");

    if (!banner) {
      return;
    }

    banner.hidden = false;

    requestAnimationFrame(function () {
      banner.classList.add("is-visible");
    });
  }

  function hideBanner() {
    const banner = document.getElementById("cookie-banner");

    if (!banner) {
      return;
    }

    banner.classList.remove("is-visible");

    window.setTimeout(function () {
      banner.hidden = true;
    }, 350);
  }

  /* ------------------------------------------------------------------------
     ACCEPT
     ------------------------------------------------------------------------ */

  function acceptAnalytics() {
    /*
     * Save the decision FIRST.
     */
    saveConsent("accepted");

    /*
     * Now — and only now — load Google Analytics.
     */
    loadGoogleAnalytics();

    hideBanner();
  }

  /* ------------------------------------------------------------------------
     REJECT
     ------------------------------------------------------------------------ */

  function rejectAnalytics() {
    /*
     * Save rejection.
     *
     * Crucially, we do NOT call loadGoogleAnalytics().
     */
    saveConsent("rejected");

    hideBanner();
  }

  /* ------------------------------------------------------------------------
     RESET CONSENT
     ------------------------------------------------------------------------ */

  function resetConsent() {
    /*
     * Remove the previous decision.
     */
    clearConsent();

    /*
     * If Analytics has already been loaded in this page session, we cannot
     * undo the network requests that have already happened.
     *
     * We therefore reload the page after clearing the preference.
     *
     * On the next load, because there is no consent, Google Analytics will
     * NOT be loaded.
     */
    window.location.reload();
  }

  /* ------------------------------------------------------------------------
     PRIVACY PAGE
     ------------------------------------------------------------------------ */

  function openPrivacyPage() {
    window.location.href = "privacy.html";
  }

  /* ------------------------------------------------------------------------
     INITIALISE
     ------------------------------------------------------------------------ */

  document.addEventListener("DOMContentLoaded", function () {
    const acceptButton = document.getElementById("cookie-accept");
    const rejectButton = document.getElementById("cookie-reject");
    const settingsButton = document.getElementById("cookie-settings");

    const privacySettingsButton = document.getElementById(
      "privacy-cookie-settings",
    );

    const footerCookieSettingsButton = document.getElementById(
      "footer-cookie-settings",
    );

    /*
     * Read the saved consent decision.
     */
    const savedConsent = getConsent();

    /* --------------------------------------------------------------
       RETURNING VISITOR — ACCEPTED
       -------------------------------------------------------------- */

    if (savedConsent === "accepted") {
      /*
       * Explicit consent was previously given.
       *
       * Analytics can be loaded immediately.
       */
      loadGoogleAnalytics();
    }

    /* --------------------------------------------------------------
       RETURNING VISITOR — REJECTED
       -------------------------------------------------------------- */

    else if (savedConsent === "rejected") {
      /*
       * Do absolutely nothing.
       *
       * No Google Analytics script.
       * No dataLayer.
       * No gtag.
       * No Google requests.
       */
    }

    /* --------------------------------------------------------------
       FIRST VISIT
       -------------------------------------------------------------- */

    else {
      /*
       * No decision yet.
       *
       * Most importantly:
       *
       * DO NOT load Google Analytics here.
       */
      showBanner();
    }

    /* --------------------------------------------------------------
       ACCEPT
       -------------------------------------------------------------- */

    if (acceptButton) {
      acceptButton.addEventListener("click", acceptAnalytics);
    }

    /* --------------------------------------------------------------
       REJECT
       -------------------------------------------------------------- */

    if (rejectButton) {
      rejectButton.addEventListener("click", rejectAnalytics);
    }

    /* --------------------------------------------------------------
       PRIVACY POLICY
       -------------------------------------------------------------- */

    if (settingsButton) {
      settingsButton.addEventListener("click", openPrivacyPage);
    }

    /* --------------------------------------------------------------
       CHANGE COOKIE SETTINGS — PRIVACY PAGE
       -------------------------------------------------------------- */

    if (privacySettingsButton) {
      privacySettingsButton.addEventListener("click", resetConsent);
    }

    /* --------------------------------------------------------------
       CHANGE COOKIE SETTINGS — FOOTER
       -------------------------------------------------------------- */

    if (footerCookieSettingsButton) {
      footerCookieSettingsButton.addEventListener("click", resetConsent);
    }
  });
})();
