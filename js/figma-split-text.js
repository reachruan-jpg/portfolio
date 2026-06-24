/**
 * Section title char-stagger on scroll (React Bits SplitText port, vanilla + GSAP).
 */
(function () {
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var CONFIG = {
    delay: 0.05,
    duration: 1.25,
    ease: "power3.out",
    from: { opacity: 0, y: 40 },
    to: { opacity: 1, y: 0 },
    threshold: 0.1,
    rootMargin: "-100px",
  };

  function buildScrollTriggerStart(threshold, rootMargin) {
    var startPct = (1 - threshold) * 100;
    var marginMatch = /^(-?\d+(?:\.\d+)?)(px|em|rem|%)?$/.exec(rootMargin);
    var marginValue = marginMatch ? parseFloat(marginMatch[1]) : 0;
    var marginUnit = marginMatch ? marginMatch[2] || "px" : "px";
    var sign =
      marginValue === 0
        ? ""
        : marginValue < 0
          ? "-=" + Math.abs(marginValue) + marginUnit
          : "+=" + marginValue + marginUnit;
    return "top " + startPct + "%" + sign;
  }

  function splitToChars(el) {
    var text = el.textContent;
    if (!text || !text.trim()) return [];

    el.setAttribute("aria-label", text.trim());
    el.classList.add("split-parent");
    el.textContent = "";

    var chars = [];
    for (var i = 0; i < text.length; i++) {
      var ch = text[i];
      var span = document.createElement("span");
      span.className = "split-char";
      span.setAttribute("aria-hidden", "true");
      span.style.display = "inline-block";
      if (ch === " ") {
        span.innerHTML = "\u00A0";
      } else {
        span.textContent = ch;
      }
      el.appendChild(span);
      chars.push(span);
    }
    return chars;
  }

  function collectTitles() {
    var elements = [];

    document.querySelectorAll(".figma-exp-title").forEach(function (el) {
      var lines = el.querySelectorAll(".figma-exp-title-line");
      if (lines.length) {
        lines.forEach(function (line) {
          elements.push(line);
        });
      } else {
        elements.push(el);
      }
    });

    document
      .querySelectorAll(".figma-projects-title-line, .figma-process-title, .figma-footer-heading-line")
      .forEach(function (el) {
        elements.push(el);
      });

    return elements;
  }

  function animateElement(el) {
    var chars = splitToChars(el);
    if (!chars.length) return;

    gsap.set(chars, Object.assign({ force3D: true, willChange: "transform, opacity" }, CONFIG.from));
    gsap.to(
      chars,
      Object.assign({}, CONFIG.to, {
        duration: CONFIG.duration,
        ease: CONFIG.ease,
        stagger: CONFIG.delay,
        scrollTrigger: {
          trigger: el,
          start: buildScrollTriggerStart(CONFIG.threshold, CONFIG.rootMargin),
          once: true,
          fastScrollEnd: true,
          anticipatePin: 0.4,
        },
      })
    );
  }

  function boot() {
    if (reduced) return;
    if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") return;

    gsap.registerPlugin(ScrollTrigger);
    collectTitles().forEach(animateElement);
  }

  function start() {
    var fontsReady =
      document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    fontsReady.then(boot);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
