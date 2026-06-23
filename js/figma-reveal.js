/**
 * Section reveal — fade-up on scroll; hero copy on load.
 */
(function () {
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var SECTIONS =
    ".figma-experience, .figma-projects, .figma-process, .figma-awards, .figma-footer";

  function markItems(section) {
    var items;

    if (section.matches(".figma-experience, .figma-awards")) {
      items = section.querySelectorAll(".figma-exp-intro, .figma-exp-item");
    } else if (section.matches(".figma-projects")) {
      items = section.querySelectorAll(".figma-projects-head");
    } else if (section.matches(".figma-process")) {
      items = section.querySelectorAll(".figma-process-head, .figma-process-card");
    } else if (section.matches(".figma-footer")) {
      items = section.querySelectorAll(".figma-footer-head, .figma-footer-band");
    } else {
      items = section.children;
    }

    items.forEach(function (el, i) {
      el.classList.add("figma-reveal-item");
      el.style.setProperty("--reveal-i", String(i));
    });
  }

  function revealHero() {
    var heroEls = document.querySelectorAll(".figma-hero-display-wrap, .figma-hero-aside");
    heroEls.forEach(function (el, i) {
      el.classList.add("figma-reveal-item", "figma-reveal-item--hero");
      el.style.setProperty("--reveal-i", String(i));
      window.setTimeout(function () {
        el.classList.add("is-visible");
      }, 160 + i * 140);
    });
  }

  function initSections() {
    document.querySelectorAll(SECTIONS).forEach(function (section) {
      section.classList.add("figma-reveal");
      markItems(section);

      if (reduced) {
        section.classList.add("is-visible");
        section.querySelectorAll(".figma-reveal-item").forEach(function (el) {
          el.classList.add("is-visible");
        });
        return;
      }

      if ("IntersectionObserver" in window) {
        observer.observe(section);
      } else {
        section.classList.add("is-visible");
      }
    });
  }

  var observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var section = entry.target;
        section.classList.add("is-visible");
        section.querySelectorAll(".figma-reveal-item").forEach(function (el) {
          el.classList.add("is-visible");
        });
        observer.unobserve(section);
      });
    },
    { threshold: 0.1, rootMargin: "0px 0px -6% 0px" }
  );

  function boot() {
    if (reduced) {
      document.querySelectorAll(".figma-hero-display-wrap, .figma-hero-aside").forEach(function (el) {
        el.classList.add("figma-reveal-item", "is-visible");
      });
    } else {
      revealHero();
    }
    initSections();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
