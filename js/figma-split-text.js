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

  var splitTweens = [];

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
    el.style.whiteSpace = "normal";
    el.style.wordWrap = "break-word";
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

    var tween = gsap.fromTo(
      chars,
      Object.assign({ force3D: true }, CONFIG.from),
      Object.assign({}, CONFIG.to, {
        duration: CONFIG.duration,
        ease: CONFIG.ease,
        stagger: CONFIG.delayMs / 1000,
        immediateRender: false,
        scrollTrigger: {
          trigger: el,
          start: buildScrollTriggerStart(CONFIG.threshold, CONFIG.rootMargin),
          toggleActions: "play none none none",
          once: true,
          invalidateOnRefresh: true,
        },
        onComplete: function () {
          gsap.set(chars, { clearProps: "willChange,transform" });
        },
      })
    );

    splitTweens.push(tween);
  }

  function refreshScrollTriggers() {
    if (typeof ScrollTrigger === "undefined") return;
    ScrollTrigger.refresh();
  }

  function playVisibleMissed() {
    splitTweens.forEach(function (tween) {
      if (!tween || !tween.scrollTrigger) return;
      if (tween.progress() > 0) return;

      var trigger = tween.scrollTrigger.trigger;
      if (!trigger) return;

      var rect = trigger.getBoundingClientRect();
      var inView = rect.top < window.innerHeight * 0.92 && rect.bottom > 0;
      if (inView) tween.play();
    });
  }

  function boot() {
    if (reduced) return;
    if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") return;

    gsap.registerPlugin(ScrollTrigger);
    collectTitles().forEach(animateElement);
    refreshScrollTriggers();

    window.addEventListener("load", function () {
      refreshScrollTriggers();
      playVisibleMissed();
    });

    window.setTimeout(function () {
      refreshScrollTriggers();
      playVisibleMissed();
    }, 1200);
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
