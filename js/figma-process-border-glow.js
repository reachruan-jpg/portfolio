/**
 * BorderGlow — vanilla port of React Bits BorderGlow for process cards
 */
(function () {
  var cards = document.querySelectorAll(".figma-process-card");
  if (!cards.length) return;

  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var CONFIG = {
    edgeSensitivity: 30,
    glowColor: "72 95 72",
    backgroundColor: "#141414",
    borderRadius: 16,
    glowRadius: 32,
    glowIntensity: 1,
    coneSpread: 25,
    fillOpacity: 0.45,
    colors: ["#d2ff73", "#c084fc", "#38bdf8"],
  };

  var GRADIENT_POSITIONS = ["80% 55%", "69% 34%", "8% 6%", "41% 38%", "86% 85%", "82% 18%", "51% 4%"];
  var GRADIENT_KEYS = [
    "--gradient-one",
    "--gradient-two",
    "--gradient-three",
    "--gradient-four",
    "--gradient-five",
    "--gradient-six",
    "--gradient-seven",
  ];
  var COLOR_MAP = [0, 1, 2, 0, 1, 2, 1];

  function parseHSL(hslStr) {
    var match = hslStr.match(/([\d.]+)\s*([\d.]+)%?\s*([\d.]+)%?/);
    if (!match) return { h: 72, s: 95, l: 72 };
    return { h: parseFloat(match[1]), s: parseFloat(match[2]), l: parseFloat(match[3]) };
  }

  function buildGlowVars(glowColor, intensity) {
    var parsed = parseHSL(glowColor);
    var base = parsed.h + "deg " + parsed.s + "% " + parsed.l + "%";
    var opacities = [100, 60, 50, 40, 30, 20, 10];
    var keys = ["", "-60", "-50", "-40", "-30", "-20", "-10"];
    var vars = {};
    for (var i = 0; i < opacities.length; i++) {
      vars["--glow-color" + keys[i]] =
        "hsl(" + base + " / " + Math.min(opacities[i] * intensity, 100) + "%)";
    }
    return vars;
  }

  function buildGradientVars(colors) {
    var vars = {};
    for (var i = 0; i < 7; i++) {
      var c = colors[Math.min(COLOR_MAP[i], colors.length - 1)];
      vars[GRADIENT_KEYS[i]] = "radial-gradient(at " + GRADIENT_POSITIONS[i] + ", " + c + " 0px, transparent 50%)";
    }
    vars["--gradient-base"] = "linear-gradient(" + colors[0] + " 0 100%)";
    return vars;
  }

  function easeOutCubic(x) {
    return 1 - Math.pow(1 - x, 3);
  }

  function easeInCubic(x) {
    return x * x * x;
  }

  function animateValue(options) {
    var start = options.start != null ? options.start : 0;
    var end = options.end != null ? options.end : 100;
    var duration = options.duration != null ? options.duration : 1000;
    var delay = options.delay != null ? options.delay : 0;
    var ease = options.ease || easeOutCubic;
    var onUpdate = options.onUpdate;
    var onEnd = options.onEnd;
    var t0 = performance.now() + delay;

    function tick() {
      var elapsed = performance.now() - t0;
      var t = Math.min(elapsed / duration, 1);
      onUpdate(start + (end - start) * ease(t));
      if (t < 1) {
        requestAnimationFrame(tick);
      } else if (onEnd) {
        onEnd();
      }
    }

    window.setTimeout(function () {
      requestAnimationFrame(tick);
    }, delay);
  }

  function applyConfig(el, config) {
    el.style.setProperty("--card-bg", config.backgroundColor);
    el.style.setProperty("--edge-sensitivity", String(config.edgeSensitivity));
    el.style.setProperty("--border-radius", config.borderRadius + "px");
    el.style.setProperty("--glow-padding", config.glowRadius + "px");
    el.style.setProperty("--cone-spread", String(config.coneSpread));
    el.style.setProperty("--fill-opacity", String(config.fillOpacity));

    var glowVars = buildGlowVars(config.glowColor, config.glowIntensity);
    var gradientVars = buildGradientVars(config.colors);
    var key;

    for (key in glowVars) {
      if (Object.prototype.hasOwnProperty.call(glowVars, key)) {
        el.style.setProperty(key, glowVars[key]);
      }
    }
    for (key in gradientVars) {
      if (Object.prototype.hasOwnProperty.call(gradientVars, key)) {
        el.style.setProperty(key, gradientVars[key]);
      }
    }
  }

  function getCenterOfElement(el) {
    var rect = el.getBoundingClientRect();
    return [rect.width / 2, rect.height / 2];
  }

  function getEdgeProximity(el, x, y) {
    var center = getCenterOfElement(el);
    var cx = center[0];
    var cy = center[1];
    var dx = x - cx;
    var dy = y - cy;
    var kx = Infinity;
    var ky = Infinity;
    if (dx !== 0) kx = cx / Math.abs(dx);
    if (dy !== 0) ky = cy / Math.abs(dy);
    return Math.min(Math.max(1 / Math.min(kx, ky), 0), 1);
  }

  function getCursorAngle(el, x, y) {
    var center = getCenterOfElement(el);
    var cx = center[0];
    var cy = center[1];
    var dx = x - cx;
    var dy = y - cy;
    if (dx === 0 && dy === 0) return 0;
    var radians = Math.atan2(dy, dx);
    var degrees = radians * (180 / Math.PI) + 90;
    if (degrees < 0) degrees += 360;
    return degrees;
  }

  function bindPointerMove(card) {
    card.addEventListener("pointermove", function (e) {
      var rect = card.getBoundingClientRect();
      var x = e.clientX - rect.left;
      var y = e.clientY - rect.top;
      var edge = getEdgeProximity(card, x, y);
      var angle = getCursorAngle(card, x, y);
      card.style.setProperty("--edge-proximity", (edge * 100).toFixed(3));
      card.style.setProperty("--cursor-angle", angle.toFixed(3) + "deg");
    });

    card.addEventListener("pointerleave", function () {
      card.style.setProperty("--edge-proximity", "0");
    });
  }

  function runSweep(card) {
    var angleStart = 110;
    var angleEnd = 465;
    card.classList.add("sweep-active");
    card.style.setProperty("--cursor-angle", angleStart + "deg");

    animateValue({
      duration: 500,
      onUpdate: function (v) {
        card.style.setProperty("--edge-proximity", String(v));
      },
    });

    animateValue({
      ease: easeInCubic,
      duration: 1500,
      end: 50,
      onUpdate: function (v) {
        card.style.setProperty("--cursor-angle", (angleEnd - angleStart) * (v / 100) + angleStart + "deg");
      },
    });

    animateValue({
      ease: easeOutCubic,
      delay: 1500,
      duration: 2250,
      start: 50,
      end: 100,
      onUpdate: function (v) {
        card.style.setProperty("--cursor-angle", (angleEnd - angleStart) * (v / 100) + angleStart + "deg");
      },
    });

    animateValue({
      ease: easeInCubic,
      delay: 2500,
      duration: 1500,
      start: 100,
      end: 0,
      onUpdate: function (v) {
        card.style.setProperty("--edge-proximity", String(v));
      },
      onEnd: function () {
        card.classList.remove("sweep-active");
      },
    });
  }

  function observeSweep(card, index) {
    if (!("IntersectionObserver" in window)) {
      runSweep(card);
      return;
    }

    var played = false;
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting || played) return;
          played = true;
          observer.disconnect();
          window.setTimeout(function () {
            runSweep(card);
          }, index * 180);
        });
      },
      { threshold: 0.35, rootMargin: "0px 0px -8% 0px" }
    );

    observer.observe(card);
  }

  cards.forEach(function (article, index) {
    var wrapper = document.createElement("div");
    wrapper.className = "border-glow-card figma-process-card-glow";

    var edgeLight = document.createElement("span");
    edgeLight.className = "edge-light";
    edgeLight.setAttribute("aria-hidden", "true");

    var inner = document.createElement("div");
    inner.className = "border-glow-inner";

    article.parentNode.insertBefore(wrapper, article);
    inner.appendChild(article);
    wrapper.appendChild(edgeLight);
    wrapper.appendChild(inner);

    applyConfig(wrapper, CONFIG);

    if (!reducedMotion) {
      bindPointerMove(wrapper);
      observeSweep(wrapper, index);
    }
  });
})();
