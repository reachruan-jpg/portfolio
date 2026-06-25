/**
 * Section title char-stagger on scroll (React Bits SplitText port, vanilla + GSAP).
 */
(function () {
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var CONFIG = {
    delayMs: 50,
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

  function applySplitParentStyles(el) {
    el.classList.add("split-parent");
    el.style.overflow = "hidden";
    el.style.display = "inline-block";
    el.style.whiteSpace = "normal";
    el.style.wordWrap = "break-word";
    el.style.willChange = "transform, opacity";
  }

  function splitToChars(el) {
    if (el.dataset.splitReady === "1") return null;

    var text = el.textContent;
    if (!text || !text.trim()) return null;

    el.setAttribute("aria-label", text.trim());
    applySplitParentStyles(el);
    el.textContent = "";

    var chars = [];
    for (var i = 0; i < text.length; i++) {
      var ch = text[i];
      var mask = document.createElement("span");
      mask.className = "split-char-mask";
      mask.setAttribute("aria-hidden", "true");

      var span = document.createElement("span");
      span.className = "split-char";
      if (ch === " ") {
        span.innerHTML = "\u00A0";
      } else {
        span.textContent = ch;
      }

      mask.appendChild(span);
      el.appendChild(mask);
      chars.push(span);
    }

    el.dataset.splitReady = "1";
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
    if (!chars || !chars.length) return;

    gsap.fromTo(
      chars,
      Object.assign({ force3D: true, willChange: "transform, opacity" }, CONFIG.from),
      Object.assign({}, CONFIG.to, {
        duration: CONFIG.duration,
        ease: CONFIG.ease,
        stagger: CONFIG.delayMs / 1000,
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

  function revealStuckChars() {
    document.querySelectorAll(".split-char").forEach(function (char) {
      var opacity = window.getComputedStyle(char).opacity;
      if (parseFloat(opacity) < 0.05) {
        gsap.set(char, { opacity: 1, y: 0, clearProps: "transform" });
      }
    });
  }

  function boot() {
    if (reduced) return;
    if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") return;

    gsap.registerPlugin(ScrollTrigger);
    collectTitles().forEach(animateElement);
    ScrollTrigger.refresh();

    window.setTimeout(function () {
      ScrollTrigger.refresh();
      revealStuckChars();
    }, 800);
    window.setTimeout(revealStuckChars, 3500);
  }

  function waitForGsap(triesLeft, done) {
    if (typeof gsap !== "undefined" && typeof ScrollTrigger !== "undefined") {
      done();
      return;
    }
    if (triesLeft <= 0) return;
    window.setTimeout(function () {
      waitForGsap(triesLeft - 1, done);
    }, 50);
  }

  function start() {
    var fontsReady =
      document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    fontsReady.then(function () {
      waitForGsap(40, boot);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
