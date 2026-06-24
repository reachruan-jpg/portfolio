/**
 * Kicker shiny sweep (React Bits ShinyText port, vanilla CSS + rAF).
 */
(function () {
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var CONFIG = {
    speed: 2,
    spread: 120,
    direction: "left",
    delay: 0,
    yoyo: false,
    color: "#d2ff73",
    shineColor: "#ffffff",
  };

  var KICKER_SELECTOR = ".figma-section-kicker, .figma-block-kicker";

  function wrapKickerText(kicker) {
    if (kicker.querySelector(".figma-shiny-text")) return null;

    var parts = [];
    kicker.childNodes.forEach(function (node) {
      if (node.nodeType !== Node.TEXT_NODE) return;
      var trimmed = node.textContent.replace(/\s+/g, " ").trim();
      if (trimmed) parts.push(trimmed);
      node.remove();
    });

    if (!parts.length) return null;

    var span = document.createElement("span");
    span.className = "figma-shiny-text";
    span.textContent = parts.join(" ");
    kicker.appendChild(span);
    return span;
  }

  function initShiny(el) {
    el.style.setProperty("--figma-shiny-spread", CONFIG.spread + "deg");
    el.style.setProperty("--figma-shiny-color", CONFIG.color);
    el.style.setProperty("--figma-shiny-shine", CONFIG.shineColor);

    if (reduced) return;

    var elapsed = 0;
    var lastTime = null;
    var direction = CONFIG.direction === "left" ? 1 : -1;
    var animationDuration = CONFIG.speed * 1000;
    var delayDuration = CONFIG.delay * 1000;
    var rafId = 0;

    function setProgress(p) {
      el.style.backgroundPosition = 150 - p * 2 + "% center";
    }

    function tick(time) {
      if (!el.isConnected) return;

      if (lastTime === null) {
        lastTime = time;
        rafId = window.requestAnimationFrame(tick);
        return;
      }

      elapsed += time - lastTime;
      lastTime = time;

      var progress;
      if (CONFIG.yoyo) {
        var cycleDuration = animationDuration + delayDuration;
        var fullCycle = cycleDuration * 2;
        var cycleTime = elapsed % fullCycle;

        if (cycleTime < animationDuration) {
          progress = (cycleTime / animationDuration) * 100;
        } else if (cycleTime < cycleDuration) {
          progress = 100;
        } else if (cycleTime < cycleDuration + animationDuration) {
          var reverseTime = cycleTime - cycleDuration;
          progress = 100 - (reverseTime / animationDuration) * 100;
        } else {
          progress = 0;
        }
        progress = direction === 1 ? progress : 100 - progress;
      } else {
        var loopDuration = animationDuration + delayDuration;
        var loopTime = elapsed % loopDuration;

        if (loopTime < animationDuration) {
          progress = (loopTime / animationDuration) * 100;
          progress = direction === 1 ? progress : 100 - progress;
        } else {
          progress = direction === 1 ? 100 : 0;
        }
      }

      setProgress(progress);
      rafId = window.requestAnimationFrame(tick);
    }

    setProgress(0);
    rafId = window.requestAnimationFrame(tick);

    el._figmaShinyCleanup = function () {
      window.cancelAnimationFrame(rafId);
    };
  }

  function boot() {
    document.querySelectorAll(KICKER_SELECTOR).forEach(function (kicker) {
      var textEl = wrapKickerText(kicker);
      if (textEl) initShiny(textEl);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
