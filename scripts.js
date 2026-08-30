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
    try { localStorage.setItem("theme", t); } catch (e) { }
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


document.addEventListener("DOMContentLoaded", () => {

  /* =====================================================================
     ELEMENTS
     ===================================================================== */

  const root = document.documentElement;

  const ambientLayer =
    document.querySelector(".ambient-layer");

  const rainContainer =
    document.querySelector(".ambient-rain");

  const leavesContainer =
    document.querySelector(".ambient-leaves");

  const topSection =
    document.querySelector("#top");

  const contactSection =
    document.querySelector("#contact");

  const heroWrap =
    topSection?.querySelector(".wrap");

  const sections =
    [...document.querySelectorAll("main section")];

  const reducedMotion =
    window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    );


  if (
    !ambientLayer ||
    !rainContainer ||
    !leavesContainer
  ) {
    return;
  }


  /* =====================================================================
     SETTINGS
     ===================================================================== */

  const RAIN_COUNT =
    window.innerWidth < 700
      ? 85
      : 130;

  const LEAF_COUNT =
    window.innerWidth < 700
      ? 8
      : 18;


/* ============================================================
   AMBIENT RAIN
   ============================================================ */

const ambientRain = document.querySelector(".ambient-rain");

if (ambientRain) {
  const rainCount = 110;

  for (let i = 0; i < rainCount; i++) {
    const drop = document.createElement("span");

    drop.className = "drop";

    const left = Math.random() * 100;
    const duration = 0.7 + Math.random() * 1.1;
    const delay = Math.random() * -2;
    const height = 30 + Math.random() * 80;
    const width = Math.random() > 0.8 ? 2 : 1;
    const opacity = 0.3 + Math.random() * 0.7;
    const drift = -30 + Math.random() * 30;

    drop.style.left = `${left}%`;
    drop.style.setProperty(
      "--drop-duration",
      `${duration}s`
    );

    drop.style.setProperty(
      "--drop-delay",
      `${delay}s`
    );

    drop.style.setProperty(
      "--drop-height",
      `${height}px`
    );

    drop.style.setProperty(
      "--drop-width",
      `${width}px`
    );

    drop.style.setProperty(
      "--drop-opacity",
      opacity
    );

    drop.style.setProperty(
      "--drop-drift",
      `${drift}px`
    );

    ambientRain.appendChild(drop);
  }
}


  /* =====================================================================
     CREATE LEAVES
     ===================================================================== */

  const leaves = [];


  function createLeaves() {

    leavesContainer.innerHTML = "";

    leaves.length = 0;


    for (
      let i = 0;
      i < LEAF_COUNT;
      i++
    ) {

      const leaf =
        document.createElement("div");

      leaf.className =
        "ambient-leaf";


      /*
        Three depth planes.

        Back:
        slow / blurry / subtle

        Mid:
        medium

        Front:
        strongest movement
      */
      const depthOptions =
        ["back", "mid", "front"];

      const depth =
        depthOptions[
        Math.floor(
          Math.random()
          * depthOptions.length
        )
        ];


      leaf.dataset.depth =
        depth;


      /*
        Keep many leaves near edges so they
        frame content instead of covering it.
      */
      const side =
        Math.random() > 0.5
          ? "left"
          : "right";

      const x =
        side === "left"
          ? -10 + Math.random() * 25
          : 75 + Math.random() * 25;

      const y =
        Math.random() * 100;


      const size =
        depth === "front"
          ? 160 + Math.random() * 200
          : depth === "mid"
            ? 110 + Math.random() * 140
            : 80 + Math.random() * 100;


      const rotation =
        -80 + Math.random() * 160;


      const opacity =
        depth === "front"
          ? 0.18 + Math.random() * 0.22
          : depth === "mid"
            ? 0.12 + Math.random() * 0.18
            : 0.06 + Math.random() * 0.12;


      /*
        Different depth = different scroll speed.
      */
      const parallax =
        depth === "front"
          ? 0.14
          : depth === "mid"
            ? 0.08
            : 0.035;


      leaf.style.setProperty(
        "--leaf-size",
        `${size}px`
      );

      leaf.style.setProperty(
        "--leaf-x",
        `${x}%`
      );

      leaf.style.setProperty(
        "--leaf-y",
        `${y}%`
      );

      leaf.style.setProperty(
        "--leaf-rotation",
        `${rotation}deg`
      );

      leaf.style.setProperty(
        "--leaf-opacity",
        opacity
      );


      leaves.push({
        element: leaf,
        parallax,
        rotation
      });


      leavesContainer.appendChild(
        leaf
      );
    }
  }


  /* =====================================================================
     ATMOSPHERE STATES
     ===================================================================== */

  function getAtmosphereState() {

    const viewportCenter =
      window.innerHeight * 0.5;


    /*
      Find which section currently owns
      the center of the screen.
    */
    let activeSection =
      sections[0];


    let closestDistance =
      Infinity;


    sections.forEach(section => {

      const rect =
        section.getBoundingClientRect();

      const center =
        rect.top +
        rect.height * 0.5;

      const distance =
        Math.abs(
          center -
          viewportCenter
        );


      if (
        distance <
        closestDistance
      ) {

        closestDistance =
          distance;

        activeSection =
          section;
      }
    });


    /*
      Each section gets its own atmosphere personality.
    */
    const id =
      activeSection?.id;


    switch (id) {

      case "top":
        return {
          opacity: 1,
          speed: 1.0,
          blur: 0,
          density: 1,
          glowX: "78%",
          glowY: "25%"
        };


      case "about":
        return {
          opacity: 0.65,
          speed: 0.8,
          blur: 0.4,
          density: 0.72,
          glowX: "30%",
          glowY: "30%"
        };


      case "experience":
        return {
          opacity: 0.48,
          speed: 0.65,
          blur: 0.8,
          density: 0.5,
          glowX: "70%",
          glowY: "50%"
        };


      case "skills":
        return {
          opacity: 0.58,
          speed: 0.72,
          blur: 0.5,
          density: 0.65,
          glowX: "40%",
          glowY: "65%"
        };


      case "contact":
        /*
          Bring the jungle back.

          Contact becomes the atmospheric
          second climax of the site.
        */
        return {
          opacity: 0.95,
          speed: 1.15,
          blur: 0.2,
          density: 1,
          glowX: "20%",
          glowY: "20%"
        };


      default:
        return {
          opacity: 0.7,
          speed: 0.8,
          blur: 0.5,
          density: 0.7,
          glowX: "50%",
          glowY: "50%"
        };
    }
  }


  /* =====================================================================
     HERO TAKEOVER
     ===================================================================== */

  function updateHeroTakeover() {

    if (
      !topSection ||
      reducedMotion.matches
    ) {
      return;
    }


    const rect =
      topSection.getBoundingClientRect();


    /*
      Start fading when the hero begins
      moving out of the viewport.
    */
    const traveled =
      Math.max(
        0,
        -rect.top
      );


    /*
      Control how long the fade takes.

      Larger = slower cinematic handoff.
    */
    const distance =
      Math.min(
        rect.height * 0.8,
        window.innerHeight * 0.95
      );


    const progress =
      Math.min(
        1,
        traveled / distance
      );


    topSection.style.setProperty(
      "--takeover-progress",
      progress.toFixed(4)
    );


    /*
      Content moves slightly faster than
      the section itself.
    */
    if (heroWrap) {

      const heroOffset =
        -(progress * 38);

      heroWrap.style.setProperty(
        "--hero-parallax",
        `${heroOffset}px`
      );
    }
  }


  /* =====================================================================
     LEAF PARALLAX
     ===================================================================== */

  function updateLeaves() {

    if (
      reducedMotion.matches
    ) {
      return;
    }


    const scrollY =
      window.scrollY;


    leaves.forEach(leaf => {

      /*
        Each leaf has a different depth.

        Front leaves move the most.
        Back leaves barely move.
      */
      const movement =
        -(scrollY * leaf.parallax);


      const rotation =
        leaf.rotation +
        Math.sin(
          scrollY * 0.001
        ) * 4;


      leaf.element.style.setProperty(
        "--leaf-shift-y",
        `${movement}px`
      );


      leaf.element.style.setProperty(
        "--leaf-rotation",
        `${rotation}deg`
      );
    });
  }


  /* =====================================================================
     APPLY ATMOSPHERE
     ===================================================================== */
  const ambient = document.querySelector(".ambient-layer");
  const top = document.querySelector("#top");
  const contact = document.querySelector("#contact");
  function clamp(value, min = 0, max = 1) {
    return Math.min(Math.max(value, min), max);
  }
  function updateAtmosphere() {
    const scrollY = window.scrollY;
    const viewportHeight = window.innerHeight;

    const topRect = top.getBoundingClientRect();
    const contactRect = contact.getBoundingClientRect();

    /* -------------------------------------------------
       HERO PROGRESS
       0 = hero fully visible
       1 = hero has scrolled away
    ------------------------------------------------- */

    const heroProgress = clamp(
      -topRect.top / (top.offsetHeight * 0.8)
    );

    /* -------------------------------------------------
       CONTACT PROGRESS
       0 = contact not visible
       1 = contact centered / dominant
    ------------------------------------------------- */

    const contactProgress = clamp(
      (viewportHeight - contactRect.top) /
      (viewportHeight * 0.8)
    );

    /*
      Atmosphere strength:
  
      HERO      → 1
      MIDDLE    → ~0.25
      CONTACT   → 1
    */

    const heroStrength = 1 - heroProgress;
    const contactStrength = contactProgress;

    const atmosphereStrength = Math.max(
      0.28,
      heroStrength,
      contactStrength
    );

    /*
      CSS variables
    */

    ambient.style.setProperty(
      "--ambient-opacity",
      0.45 + atmosphereStrength * 0.55
    );

    ambient.style.setProperty(
      "--leaf-density",
      0.35 + atmosphereStrength * 0.65
    );

    ambient.style.setProperty(
      "--ambient-blur",
      `${(1 - atmosphereStrength) * 2}px`
    );

    ambient.style.setProperty(
      "--rain-speed",
      0.65 + atmosphereStrength * 0.8
    );
  }



  /* =====================================================================
     SCROLL LOOP
     ===================================================================== */

  let ticking =
    false;


  function updateScene() {

    updateHeroTakeover();

    updateLeaves();

    let ticking = false;

    window.addEventListener(
      "scroll",
      () => {
        if (!ticking) {
          window.requestAnimationFrame(() => {
            updateAtmosphere();
            ticking = false;
          });

          ticking = true;
        }
      },
      { passive: true }
    );

    window.addEventListener("resize", updateAtmosphere);

    updateAtmosphere();

    ticking =
      false;
  }


  function onScroll() {

    if (ticking) {
      return;
    }


    window.requestAnimationFrame(
      updateScene
    );


    ticking =
      true;
  }


  window.addEventListener(
    "scroll",
    onScroll,
    {
      passive: true
    }
  );


  window.addEventListener(
    "resize",
    onScroll
  );


  reducedMotion.addEventListener(
    "change",
    () => {

      createRain();

      updateScene();
    }
  );


  /* =====================================================================
     INITIALIZE
     ===================================================================== */

  createRain();

  createLeaves();

  updateScene();

});