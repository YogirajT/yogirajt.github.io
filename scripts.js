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
