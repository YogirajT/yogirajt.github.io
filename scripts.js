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
  // Rain layer (decorative only — purely an enhancement, hero reads fine
  // without it). Skipped entirely under reduced-motion.
  // ---------------------------------------------------------------------
  var rainEl = document.getElementById("rain");
  if (rainEl && !reduceMotion) {
    var dropCount = window.innerWidth < 700 ? 26 : 46;
    var frag = document.createDocumentFragment();
    for (var r = 0; r < dropCount; r++) {
      var drop = document.createElement("span");
      drop.className = "drop";
      var left = Math.random() * 100;
      var duration = 0.9 + Math.random() * 1.1;
      var delay = Math.random() * 2.5;
      var height = 40 + Math.random() * 70;
      var opacity = 0.25 + Math.random() * 0.5;
      drop.style.left = left + "%";
      drop.style.height = height + "px";
      drop.style.opacity = opacity;
      drop.style.animationDuration = duration + "s";
      drop.style.animationDelay = "-" + delay + "s";
      frag.appendChild(drop);
    }
    rainEl.appendChild(frag);
  }

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

/* ============================================================
   GLOBAL ATMOSPHERIC ENGINE
   Vanilla JS
   One scroll listener
   One requestAnimationFrame loop
   ============================================================ */

(() => {
  "use strict";

  /* ----------------------------------------------------------
     DOM CACHE
     ---------------------------------------------------------- */

  const ambientLayer =
    document.querySelector(".ambient-layer");

  const ambientRain =
    document.querySelector(".ambient-rain");

  const ambientLeaves =
    document.querySelector(".ambient-leaves");

  const lightning =
    document.querySelector(".ambient-lightning");

  const hero =
    document.querySelector("#top.hero");

  const contact =
    document.querySelector("#contact.contact");

  const leafElements =
    Array.from(
      document.querySelectorAll(".ambient-leaf")
    );


  /*
   * The atmospheric system cannot operate without these.
   * Fail quietly rather than breaking the website.
   */
  if (
    !ambientLayer ||
    !ambientRain ||
    !hero ||
    !contact
  ) {
    console.warn(
      "[ambient] Atmospheric layer could not initialize."
    );

    return;
  }


  /* ----------------------------------------------------------
     PREFER-REDUCED-MOTION
     ---------------------------------------------------------- */

  const reducedMotion =
    window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    );


  /* ----------------------------------------------------------
     STATE
     ---------------------------------------------------------- */

  const state = {
    viewportWidth:
      window.innerWidth,

    viewportHeight:
      window.innerHeight,

    scrollY:
      window.scrollY,

    heroProgress:
      0,

    contactProgress:
      0,

    contactExit:
      0,

    pageProgress:
      0,

    previousMobile:
      window.innerWidth <= 768
  };


  let rafPending = false;

  let lightningTimer = null;


  /* ----------------------------------------------------------
     HELPERS
     ---------------------------------------------------------- */

  const clamp = (
    value,
    min = 0,
    max = 1
  ) =>
    Math.min(
      max,
      Math.max(min, value)
    );


  const smoothstep = (
    value
  ) => {
    const x =
      clamp(value);

    return (
      x *
      x *
      (3 - 2 * x)
    );
  };


  const lerp = (
    a,
    b,
    amount
  ) =>
    a +
    (b - a) *
    amount;


  const random = (
    min,
    max
  ) =>
    Math.random() *
      (max - min) +
    min;


  /* ----------------------------------------------------------
     SECTION PROGRESS
     ---------------------------------------------------------- */

  function getHeroProgress() {

    const rect =
      hero.getBoundingClientRect();

    /*
     * Hero begins transitioning once it starts leaving
     * the top of the viewport.
     *
     * The transition completes after a large portion
     * of the hero has moved away.
     */
    const start =
      0;

    const end =
      -Math.max(
        1,
        rect.height * 0.76
      );

    return clamp(
      (start - rect.top) /
      (start - end)
    );
  }


  function getContactProgress() {

    const rect =
      contact.getBoundingClientRect();

    /*
     * Entrance starts before contact reaches the viewport.
     *
     * This is intentionally stronger than a basic
     * IntersectionObserver-style on/off trigger.
     */
    const start =
      state.viewportHeight * 1.08;

    const end =
      state.viewportHeight * 0.30;

    return smoothstep(
      clamp(
        (start - rect.top) /
        (start - end)
      )
    );
  }


  function getContactExit() {

    const rect =
      contact.getBoundingClientRect();

    /*
     * If another section/footer follows contact,
     * this supplies a soft exit.
     *
     * At the normal bottom of the document this remains near 0,
     * so the contact section does not suddenly disappear.
     */
    const distancePast =
      state.viewportHeight -
      rect.bottom;

    const range =
      Math.max(
        1,
        state.viewportHeight * 0.70
      );

    return smoothstep(
      clamp(
        distancePast /
        range
      )
    );
  }


  function getPageProgress() {

    const maxScroll =
      document.documentElement.scrollHeight -
      state.viewportHeight;

    if (maxScroll <= 0) {
      return 0;
    }

    return clamp(
      state.scrollY /
      maxScroll
    );
  }


  /* ----------------------------------------------------------
     ATMOSPHERE INTENSITY
     ---------------------------------------------------------- */

  function calculateAtmosphere() {

    const heroPresence =
      1 -
      smoothstep(
        state.heroProgress
      );

    const contactPresence =
      smoothstep(
        state.contactProgress
      );


    /*
     * Middle-page baseline remains subtle.
     */
    const middle =
      0.22;


    /*
     * Strong hero atmosphere.
     */
    const heroContribution =
      heroPresence *
      0.73;


    /*
     * Strong contact atmosphere.
     */
    const contactContribution =
      contactPresence *
      0.70;


    const intensity =
      clamp(
        middle +
        heroContribution +
        contactContribution,
        0.16,
        1
      );


    const leaves =
      clamp(
        0.06 +
        heroPresence * 0.94 +
        contactPresence * 0.92,
        0.05,
        1
      );


    /*
     * Rain speed responds subtly to atmosphere.
     */
    const rainSpeed =
      lerp(
        0.86,
        1.16,
        intensity
      );


    return {
      intensity,
      leaves,
      rainSpeed
    };
  }


  /* ----------------------------------------------------------
     HERO UPDATE
     ---------------------------------------------------------- */

  function updateHero() {

    const progress =
      smoothstep(
        state.heroProgress
      );


    /*
     * Strong center fade near the end.
     *
     * Importantly:
     * the hero isn't relying on opacity alone.
     */
    const centerAlpha =
      lerp(
        1,
        0.16,
        progress
      );


    /*
     * Edge fades much faster than center.
     */
    const edgeAlpha =
      lerp(
        1,
        0.05,
        progress
      );


    hero.style.setProperty(
      "--hero-progress",
      progress.toFixed(4)
    );


    hero.style.setProperty(
      "--hero-center-alpha",
      centerAlpha.toFixed(4)
    );


    hero.style.setProperty(
      "--hero-edge-alpha",
      edgeAlpha.toFixed(4)
    );
  }


  /* ----------------------------------------------------------
     CONTACT UPDATE
     ---------------------------------------------------------- */

  function updateContact() {

    const entrance =
      smoothstep(
        state.contactProgress
      );

    const exit =
      smoothstep(
        state.contactExit
      );


    /*
     * Strong top dissolve at first.
     * Then the full contact section becomes solid.
     */
    const topAlpha =
      lerp(
        0.04,
        0.92,
        entrance
      );


    /*
     * Keep a very soft bottom atmospheric fade.
     */
    const bottomAlpha =
      lerp(
        0.10,
        0.24,
        entrance
      );


    contact.style.setProperty(
      "--contact-progress",
      entrance.toFixed(4)
    );


    contact.style.setProperty(
      "--contact-exit",
      exit.toFixed(4)
    );


    contact.style.setProperty(
      "--contact-top-alpha",
      topAlpha.toFixed(4)
    );


    contact.style.setProperty(
      "--contact-bottom-alpha",
      bottomAlpha.toFixed(4)
    );
  }


  /* ----------------------------------------------------------
     LEAF CONFIGURATION
     ---------------------------------------------------------- */

  const leafConfig =
    leafElements.map(
      (element, index) => ({

        element,

        /*
         * Smaller depth values =
         * slower parallax.
         */
        depth:
          [
            0.12,
            0.24,
            0.08,
            0.40,
            0.18,
            0.31
          ][index] ??
          0.20,

        phase:
          index *
          1.63,

        direction:
          index % 2 === 0
            ? 1
            : -1,

        rotation:
          [
            -7,
            9,
            -3,
            6,
            -10,
            4
          ][index] ??
          0
      })
    );


  /* ----------------------------------------------------------
     LEAF PARALLAX
     ---------------------------------------------------------- */

  function updateLeaves(
    atmosphere
  ) {

    const now =
      performance.now();

    /*
     * Very slow time-based movement.
     */
    const time =
      now *
      0.000075;


    /*
     * Page motion is intentionally gentle.
     */
    const pageShift =
      (
        state.pageProgress -
        0.5
      ) *
      state.viewportHeight;


    const heroPresence =
      1 -
      smoothstep(
        state.heroProgress
      );


    const contactPresence =
      smoothstep(
        state.contactProgress
      );


    /*
     * Both ends of the page are atmospheric.
     * Middle remains intentionally subdued.
     */
    const environmentalPresence =
      Math.max(
        heroPresence * 0.96,
        contactPresence * 0.94,
        0.08
      );


    leafConfig.forEach(
      config => {

        const {
          element,
          depth,
          phase,
          direction,
          rotation
        } = config;


        /*
         * Scroll parallax.
         */
        const y =
          pageShift *
          depth *
          direction *
          -0.16;


        /*
         * Tiny horizontal sway.
         */
        const x =
          Math.sin(
            time +
            phase
          ) *
          (
            3 +
            depth * 4
          );


        /*
         * Gentle jungle movement.
         */
        const rotate =
          rotation +
          Math.sin(
            time * 1.35 +
            phase
          ) *
          (
            0.8 +
            depth * 2.1
          );


        /*
         * Background leaves stay faint.
         * Near leaves are more apparent at hero/contact.
         */
        const depthOpacity =
          depth < 0.16
            ? 0.34
            : depth < 0.25
              ? 0.51
              : 0.68;


        const opacity =
          atmosphere.leaves *
          environmentalPresence *
          depthOpacity;


        element.style.setProperty(
          "--leaf-x",
          `${x.toFixed(2)}px`
        );


        element.style.setProperty(
          "--leaf-y",
          `${y.toFixed(2)}px`
        );


        element.style.setProperty(
          "--leaf-rotate",
          `${rotate.toFixed(2)}deg`
        );


        element.style.opacity =
          clamp(
            opacity,
            0,
            0.78
          ).toFixed(3);
      }
    );
  }


  /* ----------------------------------------------------------
     RAIN
     ---------------------------------------------------------- */

  function updateRain(
    atmosphere
  ) {

    ambientLayer.style.setProperty(
      "--ambient-intensity",
      atmosphere.intensity.toFixed(3)
    );


    ambientLayer.style.setProperty(
      "--ambient-leaf-opacity",
      atmosphere.leaves.toFixed(3)
    );


    ambientLayer.style.setProperty(
      "--ambient-rain-speed",
      atmosphere.rainSpeed.toFixed(3)
    );


    /*
     * Extremely slight global atmosphere movement.
     * This does not move content.
     */
    ambientLayer.style.setProperty(
      "--ambient-shift-y",
      `${(
        state.pageProgress *
        -18
      ).toFixed(2)}px`
    );
  }


  /* ----------------------------------------------------------
     RAIN GENERATION
     ---------------------------------------------------------- */

  function createRain() {

    /*
     * Rebuilding is only done when the viewport crosses
     * the mobile breakpoint.
     */
    ambientRain.innerHTML = "";


    const mobile =
      state.viewportWidth <= 768;


    const count =
      mobile
        ? 36
        : 72;


    const fragment =
      document.createDocumentFragment();


    for (
      let i = 0;
      i < count;
      i++
    ) {

      const drop =
        document.createElement(
          "span"
        );


      drop.className =
        "ambient-drop";


      const depthRoll =
        Math.random();


      let depth;


      if (
        depthRoll < 0.25
      ) {
        depth = "far";
      } else if (
        depthRoll > 0.80
      ) {
        depth = "near";
      } else {
        depth = "mid";
      }


      const length =
        depth === "far"
          ? random(18, 38)
          : depth === "near"
            ? random(42, 82)
            : random(28, 60);


      const duration =
        depth === "far"
          ? random(1.8, 3.2)
          : depth === "near"
            ? random(0.72, 1.28)
            : random(1.10, 2.20);


      const delay =
        random(
          -duration,
          0
        );


      const drift =
        random(
          -16,
          16
        );


      const opacity =
        depth === "far"
          ? random(0.25, 0.50)
          : depth === "near"
            ? random(0.54, 0.90)
            : random(0.38, 0.72);


      drop.dataset.depth =
        depth;


      drop.style.left =
        `${random(0, 100).toFixed(2)}%`;


      drop.style.setProperty(
        "--drop-length",
        `${length.toFixed(1)}px`
      );


      drop.style.setProperty(
        "--drop-duration",
        `${duration.toFixed(2)}s`
      );


      drop.style.setProperty(
        "--drop-delay",
        `${delay.toFixed(2)}s`
      );


      drop.style.setProperty(
        "--drop-drift",
        `${drift.toFixed(1)}px`
      );


      drop.style.setProperty(
        "--drop-opacity",
        opacity.toFixed(2)
      );


      fragment.appendChild(
        drop
      );
    }


    ambientRain.appendChild(
      fragment
    );
  }


  /* ----------------------------------------------------------
     LIGHTNING
     ---------------------------------------------------------- */

  function scheduleLightning() {

    if (
      reducedMotion.matches
    ) {
      return;
    }


    const delay =
      random(
        14000,
        36000
      );


    lightningTimer =
      window.setTimeout(
        () => {

          triggerLightning();

          scheduleLightning();

        },
        delay
      );
  }


  function triggerLightning() {

    if (
      !lightning ||
      reducedMotion.matches
    ) {
      return;
    }


    /*
     * Respect existing data-theme.
     */
    const isLight =
      document.documentElement
        .dataset
        .theme ===
      "light";


    /*
     * Random distant location.
     */
    const x =
      random(
        8,
        92
      );


    const y =
      random(
        0,
        42
      );


    /*
     * Very subtle in light mode.
     */
    const strength =
      isLight
        ? random(
            0.045,
            0.10
          )
        : random(
            0.17,
            0.40
          );


    /*
     * Roughly one-third are double flashes.
     */
    const doubleFlash =
      Math.random() <
      0.30;


    lightning.style.setProperty(
      "--lightning-x",
      `${x.toFixed(1)}%`
    );


    lightning.style.setProperty(
      "--lightning-y",
      `${y.toFixed(1)}%`
    );


    lightning.style.setProperty(
      "--lightning-strength",
      strength.toFixed(3)
    );


    /*
     * Restart CSS animation.
     */
    lightning.classList.remove(
      "is-flashing",
      "is-double"
    );


    void lightning.offsetWidth;


    lightning.classList.add(
      doubleFlash
        ? "is-double"
        : "is-flashing"
    );
  }


  /* ----------------------------------------------------------
     MAIN RENDER
     ---------------------------------------------------------- */

  function render() {

    rafPending =
      false;


    state.scrollY =
      window.scrollY;


    state.heroProgress =
      getHeroProgress();


    state.contactProgress =
      getContactProgress();


    state.contactExit =
      getContactExit();


    state.pageProgress =
      getPageProgress();


    /*
     * Centered calculation of the whole environmental field.
     */
    const atmosphere =
      calculateAtmosphere();


    updateHero();

    updateContact();

    updateRain(
      atmosphere
    );

    updateLeaves(
      atmosphere
    );
  }


  /* ----------------------------------------------------------
     REQUEST RENDER
     ---------------------------------------------------------- */

  function requestRender() {

    if (
      rafPending
    ) {
      return;
    }


    rafPending =
      true;


    window.requestAnimationFrame(
      render
    );
  }


  /* ----------------------------------------------------------
     ONE SCROLL LISTENER
     ---------------------------------------------------------- */

  window.addEventListener(
    "scroll",
    requestRender,
    {
      passive: true
    }
  );


  /* ----------------------------------------------------------
     RESIZE
     ---------------------------------------------------------- */

  window.addEventListener(
    "resize",
    () => {

      state.viewportWidth =
        window.innerWidth;

      state.viewportHeight =
        window.innerHeight;


      const mobile =
        state.viewportWidth <= 768;


      /*
       * Only rebuild rain when crossing
       * desktop/mobile boundary.
       */
      if (
        mobile !==
        state.previousMobile
      ) {

        createRain();

        state.previousMobile =
          mobile;
      }


      requestRender();

    },
    {
      passive: true
    }
  );


  /* ----------------------------------------------------------
     REDUCED-MOTION CHANGES
     ---------------------------------------------------------- */

  function handleMotionChange() {

    if (
      reducedMotion.matches &&
      lightningTimer
    ) {

      window.clearTimeout(
        lightningTimer
      );

      lightningTimer =
        null;
    }


    if (
      !reducedMotion.matches &&
      !lightningTimer
    ) {

      scheduleLightning();
    }


    requestRender();
  }


  /*
   * Modern browsers.
   */
  reducedMotion.addEventListener(
    "change",
    handleMotionChange
  );


  /* ----------------------------------------------------------
     INITIALIZE
     ---------------------------------------------------------- */

  createRain();

  requestRender();

  scheduleLightning();

})();
