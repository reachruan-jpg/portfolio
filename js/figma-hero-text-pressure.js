/**
 * TextPressure — vanilla port of React Bits / CodePen JuanFuentes/rgXKGQ
 * Variable-font wght / wdth / ital driven by pointer distance per character.
 */
(function () {
  var FONT_URL =
    "https://fonts.googleapis.com/css2?family=Roboto+Flex:opsz,wdth,wght@8..144,25..151,100..1000&display=swap";

  function dist(a, b) {
    var dx = b.x - a.x;
    var dy = b.y - a.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function getAttr(distance, maxDist, minVal, maxVal) {
    var val = maxVal - Math.abs((maxVal * distance) / maxDist);
    return Math.max(minVal, val + minVal);
  }

  function debounce(func, delay) {
    var timeoutId;
    return function () {
      var args = arguments;
      var ctx = this;
      clearTimeout(timeoutId);
      timeoutId = setTimeout(function () {
        func.apply(ctx, args);
      }, delay);
    };
  }

  function loadFont(href) {
    if (document.querySelector('link[data-text-pressure-font="1"]')) return;
    var link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.setAttribute("data-text-pressure-font", "1");
    document.head.appendChild(link);
  }

  function initTextPressure(container, options) {
    options = options || {};
    var text = (options.text || container.getAttribute("data-text") || "").toUpperCase();
    var minFontSize = options.minFontSize != null ? options.minFontSize : 24;
    var flex = options.flex !== false;
    var autoSize = options.autoSize !== false;
    var width = options.width !== false;
    var weight = options.weight !== false;
    var italic = options.italic !== false;
    var alpha = options.alpha === true;
    var scale = options.scale === true;
    var stroke = options.stroke === true;
    var textColor = options.textColor || "#f0ebe3";
    var strokeColor = options.strokeColor || "#ff0000";

    loadFont(options.fontUrl || FONT_URL);

    var chars = text.split("");
    var mouse = { x: 0, y: 0 };
    var cursor = { x: 0, y: 0 };
    var fontSize = minFontSize;
    var scaleY = 1;
    var lineHeight = 1;
    var spans = [];
    var rafId = 0;
    var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    container.innerHTML = "";
    container.classList.add("figma-hero-text-pressure-root");

    var title = document.createElement("h1");
    title.className = "text-pressure-title figma-hero-display";
    title.id = "hero-title";
    if (flex) title.classList.add("text-pressure-flex");
    if (stroke) title.classList.add("text-pressure-stroke");
    title.style.setProperty("--text-pressure-color", textColor);
    title.style.setProperty("--text-pressure-stroke", strokeColor);

    chars.forEach(function (char, i) {
      var span = document.createElement("span");
      span.setAttribute("data-char", char);
      if (char === " ") {
        span.innerHTML = "&nbsp;";
      } else {
        span.textContent = char;
      }
      if (!stroke) span.style.color = textColor;
      title.appendChild(span);
      spans[i] = span;
    });

    container.appendChild(title);

    function setSize() {
      var rect = container.getBoundingClientRect();
      var containerH = rect.height;

      if (!autoSize) {
        scaleY = 1;
        lineHeight = 1;
        title.style.lineHeight = String(lineHeight);
        title.style.transform = "scale(1, " + scaleY + ")";
      } else {
        var containerW = rect.width;
        var newFontSize = containerW / (chars.length / 2);
        newFontSize = Math.max(newFontSize, minFontSize);
        fontSize = newFontSize;
        scaleY = 1;
        lineHeight = 1;

        title.style.fontSize = fontSize + "px";
        title.style.lineHeight = String(lineHeight);
        title.style.transform = "scale(1, " + scaleY + ")";
      }

      if (scale) {
        requestAnimationFrame(function () {
          var textRect = title.getBoundingClientRect();
          if (textRect.height > 0) {
            scaleY = containerH / textRect.height;
            lineHeight = scaleY;
            title.style.lineHeight = String(lineHeight);
            title.style.transform = "scale(1, " + scaleY + ")";
          }
        });
      }
    }

    function onPointerMove(clientX, clientY) {
      cursor.x = clientX;
      cursor.y = clientY;
    }

    function onMouseMove(e) {
      onPointerMove(e.clientX, e.clientY);
    }

    function onTouchMove(e) {
      if (!e.touches[0]) return;
      onPointerMove(e.touches[0].clientX, e.touches[0].clientY);
    }

    function animate() {
      mouse.x += (cursor.x - mouse.x) / 15;
      mouse.y += (cursor.y - mouse.y) / 15;

      if (title) {
        var titleRect = title.getBoundingClientRect();
        var maxDist = titleRect.width / 2;

        spans.forEach(function (span) {
          if (!span) return;
          var rect = span.getBoundingClientRect();
          var charCenter = {
            x: rect.x + rect.width / 2,
            y: rect.y + rect.height / 2,
          };
          var d = dist(mouse, charCenter);

          var wdth = width ? Math.floor(getAttr(d, maxDist, 5, 200)) : 100;
          var wght = weight ? Math.floor(getAttr(d, maxDist, 100, 900)) : 400;
          var italVal = italic ? getAttr(d, maxDist, 0, 1).toFixed(2) : "0";
          var alphaVal = alpha ? getAttr(d, maxDist, 0, 1).toFixed(2) : "1";

          var fvs = "'wght' " + wght + ", 'wdth' " + wdth + ", 'ital' " + italVal;
          if (span.style.fontVariationSettings !== fvs) {
            span.style.fontVariationSettings = fvs;
          }
          if (alpha && span.style.opacity !== alphaVal) {
            span.style.opacity = alphaVal;
          }
        });
      }

      rafId = requestAnimationFrame(animate);
    }

    var debouncedSetSize = debounce(setSize, 100);
    setSize();
    window.addEventListener("resize", debouncedSetSize);

    var rect = container.getBoundingClientRect();
    mouse.x = rect.left + rect.width / 2;
    mouse.y = rect.top + rect.height / 2;
    cursor.x = mouse.x;
    cursor.y = mouse.y;

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("touchmove", onTouchMove, { passive: true });

    if (!reduced) {
      animate();
    } else {
      spans.forEach(function (span) {
        span.style.fontVariationSettings = "'wght' 400, 'wdth' 100, 'ital' 0";
      });
    }

    return function destroy() {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", debouncedSetSize);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("touchmove", onTouchMove);
    };
  }

  function bootstrap() {
    var root = document.getElementById("hero-text-pressure");
    if (!root) return;

    initTextPressure(root, {
      text: root.getAttribute("data-text") || "HEY IM REACH",
      textColor: "#f0ebe3",
      flex: false,
      autoSize: false,
      width: true,
      weight: true,
      italic: true,
      alpha: false,
      stroke: false,
      scale: false,
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootstrap);
  } else {
    bootstrap();
  }
})();
