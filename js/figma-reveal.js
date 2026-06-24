/**
 * Section reveal — staggered layer fade-up on scroll; hero on load.
 */
(function () {
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var STAGGER_MS = 130;
  var INTRO_THRESHOLD = 0.14;
  var ITEM_THRESHOLD = 0.08;

  var SECTIONS =
    ".figma-experience, .figma-projects, .figma-process, .figma-awards, .figma-footer";

  function markItem(el, index, mode) {
    el.classList.add("figma-reveal-item");
    if (mode === "surface") {
      el.classList.add("figma-reveal-item--surface");
    }
    el.style.setProperty("--reveal-i", String(index));
    el.dataset.revealMode = mode;
    return el;
  }

  function revealAll(items) {
    items.forEach(function (el) {
      el.classList.add("is-visible");
    });
  }

  function revealStagger(items, baseDelay) {
    items.forEach(function (el, i) {
      window.setTimeout(function () {
        el.classList.add("is-visible");
      }, (baseDelay || 0) + i * STAGGER_MS);
    });
  }

  function collectLayers(section) {
    var intro = [];
    var scroll = [];

    function addIntro(el) {
      if (el) intro.push(el);
    }

    if (section.matches(".figma-experience, .figma-awards")) {
      var introRoot = section.querySelector(".figma-exp-intro");
      if (introRoot) {
        addIntro(introRoot.querySelector(".figma-section-kicker"));
        addIntro(introRoot.querySelector(".figma-exp-lede"));
      }
      section.querySelectorAll(".figma-exp-item").forEach(function (el) {
        scroll.push(el);
      });
    } else if (section.matches(".figma-projects")) {
      var head = section.querySelector(".figma-projects-head");
      if (head) {
        addIntro(head.querySelector(".figma-block-kicker"));
      }
      var gallery = section.querySelector("#portfolio-circular-gallery");
      if (gallery) scroll.push(gallery);
    } else if (section.matches(".figma-process")) {
      var processHead = section.querySelector(".figma-process-head");
      if (processHead) {
        addIntro(processHead.querySelector(".figma-section-kicker"));
        addIntro(processHead.querySelector(".figma-process-lede"));
      }
      section.querySelectorAll(".figma-process-card").forEach(function (el) {
        scroll.push(el);
      });
    } else if (section.matches(".figma-footer")) {
      var footerHead = section.querySelector(".figma-footer-head");
      if (footerHead) {
        addIntro(footerHead.querySelector(".figma-block-kicker"));
      }
      section.querySelectorAll(".figma-footer-block").forEach(function (el) {
        scroll.push(el);
      });
    }

    intro.forEach(function (el, i) {
      markItem(el, i, "intro");
    });
    scroll.forEach(function (el, i) {
      var mode = el.id === "portfolio-circular-gallery" ? "surface" : "scroll";
      markItem(el, i, mode);
    });

    return { intro: intro, scroll: scroll };
  }

  var introObserver = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var section = entry.target;
        var items = section._revealIntro || [];
        revealStagger(items, 40);
        introObserver.unobserve(section);
      });
    },
    { threshold: INTRO_THRESHOLD, rootMargin: "0px 0px -5% 0px" }
  );

  var scrollObserver = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        scrollObserver.unobserve(entry.target);
      });
    },
    { threshold: ITEM_THRESHOLD, rootMargin: "0px 0px -4% 0px" }
  );

  function initSection(section) {
    section.classList.add("figma-reveal");
    var layers = collectLayers(section);
    section._revealIntro = layers.intro;

    if (reduced) {
      revealAll(layers.intro.concat(layers.scroll));
      return;
    }

    if (layers.intro.length && "IntersectionObserver" in window) {
      introObserver.observe(section);
    } else {
      revealAll(layers.intro);
    }

    layers.scroll.forEach(function (el) {
      if ("IntersectionObserver" in window) {
        scrollObserver.observe(el);
      } else {
        el.classList.add("is-visible");
      }
    });
  }

  function revealHero() {
    var heroEls = document.querySelectorAll(".figma-hero-display-wrap, .figma-hero-aside");
    heroEls.forEach(function (el, i) {
      el.classList.add("figma-reveal-item", "figma-reveal-item--hero");
      el.style.setProperty("--reveal-i", String(i));
      window.setTimeout(function () {
        el.classList.add("is-visible");
      }, 160 + i * STAGGER_MS);
    });
  }

  function boot() {
    if (reduced) {
      document.querySelectorAll(".figma-hero-display-wrap, .figma-hero-aside").forEach(function (el) {
        el.classList.add("figma-reveal-item", "is-visible");
      });
    } else {
      revealHero();
    }

    document.querySelectorAll(SECTIONS).forEach(initSection);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
