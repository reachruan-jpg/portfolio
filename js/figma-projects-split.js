(function () {
  var split = document.querySelector(".figma-projects-split");
  if (!split) return;

  var panels = split.querySelectorAll(".js-detail-panel");
  var canvas = document.createElement("canvas");
  var ctx = canvas.getContext("2d", { willReadFrequently: true });
  var sampleSize = 48;
  var cards = split.querySelectorAll(".figma-project-card--thumb");

  function luminance(r, g, b) {
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  }

  function averageRgbFromImage(img) {
    if (!ctx) return { r: 42, g: 42, b: 46 };
    canvas.width = sampleSize;
    canvas.height = sampleSize;
    try {
      ctx.drawImage(img, 0, 0, sampleSize, sampleSize);
    } catch {
      return { r: 42, g: 42, b: 46 };
    }
    var data = ctx.getImageData(0, 0, sampleSize, sampleSize).data;
    var r = 0,
      g = 0,
      b = 0,
      n = 0;
    for (var i = 0; i < data.length; i += 4) {
      var a = data[i + 3];
      if (a < 8) continue;
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
      n++;
    }
    if (!n) return { r: 42, g: 42, b: 46 };
    return {
      r: Math.round(r / n),
      g: Math.round(g / n),
      b: Math.round(b / n),
    };
  }

  function tweakRgb(rgb, lum) {
    var factor = lum > 0.55 ? 0.92 : 1.08;
    return {
      r: clamp(Math.round(rgb.r * factor), 0, 255),
      g: clamp(Math.round(rgb.g * factor), 0, 255),
      b: clamp(Math.round(rgb.b * factor), 0, 255),
    };
  }

  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  /** 封面 hover 遮罩：与侧栏共用封面取色 */
  function applyThumbOverlayFromRgb(card, rgb) {
    var lum = luminance(rgb.r, rgb.g, rgb.b);
    var tw = tweakRgb(rgb, lum);
    card.style.setProperty(
      "--thumb-overlay-bg",
      "rgba(" + tw.r + "," + tw.g + "," + tw.b + ",0.88)"
    );
    card.dataset.thumbTone = lum > 0.62 ? "light" : "dark";
  }

  function fillThumbLabels() {
    cards.forEach(function (card) {
      var k = card.querySelector(".figma-thumb-hover-kicker");
      var t = card.querySelector(".figma-thumb-hover-title");
      if (k) k.textContent = card.getAttribute("data-project-kicker") || "";
      if (t) t.textContent = card.getAttribute("data-project-title") || "";
    });
  }

  function applyDetail(card) {
    if (!card || !panels.length) return;

    var img = card.querySelector("img");
    var title = card.getAttribute("data-project-title") || "";
    var kicker = card.getAttribute("data-project-kicker") || "";
    var href = card.getAttribute("data-project-href") || "#";
    var tagsRaw = card.getAttribute("data-project-tags") || "";

    panels.forEach(function (detail) {
      var detailLink = detail.querySelector(".js-detail-link");
      var detailKicker = detail.querySelector(".js-detail-kicker");
      var detailTitle = detail.querySelector(".js-detail-title");
      var detailTags = detail.querySelector(".js-detail-tags");
      if (!detailLink || !detailKicker || !detailTitle || !detailTags) return;

      detailTitle.textContent = title;
      detailKicker.textContent = kicker;
      detailLink.setAttribute("href", href);

      detailTags.innerHTML = "";
      if (tagsRaw) {
        tagsRaw.split("|").forEach(function (label) {
          var lab = label.trim();
          if (!lab) return;
          var span = document.createElement("span");
          span.className = "figma-projects-detail-tag";
          span.textContent = lab;
          detailTags.appendChild(span);
        });
        detailTags.hidden = detailTags.children.length === 0;
      } else {
        detailTags.hidden = true;
      }
    });

    cards.forEach(function (c) {
      c.classList.toggle("is-active", c === card);
    });

    function paint(rgb) {
      var lum = luminance(rgb.r, rgb.g, rgb.b);
      var tweaked = tweakRgb(rgb, lum);
      var bg =
        "rgb(" + tweaked.r + "," + tweaked.g + "," + tweaked.b + ")";
      var darkText = lum > 0.62;
      var fg = darkText ? "#0a0a0a" : "#fafafa";
      var muted = darkText ? "rgba(10,10,10,0.72)" : "rgba(250,250,250,0.75)";

      panels.forEach(function (detail) {
        var detailLink = detail.querySelector(".js-detail-link");
        var detailKicker = detail.querySelector(".js-detail-kicker");
        var detailTitle = detail.querySelector(".js-detail-title");
        detail.style.backgroundColor = bg;
        detail.style.color = fg;
        if (detailKicker) detailKicker.style.color = muted;
        if (detailTitle) detailTitle.style.color = fg;
        if (detailLink) detailLink.style.color = fg;
      });

      split.dataset.detailTone = darkText ? "light" : "dark";
      applyThumbOverlayFromRgb(card, rgb);
    }

    if (!img || !img.complete || img.naturalWidth === 0) {
      if (img) {
        img.addEventListener(
          "load",
          function onImgLoad() {
            img.removeEventListener("load", onImgLoad);
            paint(averageRgbFromImage(img));
          },
          { once: true }
        );
      }
      paint({ r: 42, g: 42, b: 46 });
      return;
    }

    paint(averageRgbFromImage(img));
  }

  fillThumbLabels();

  cards.forEach(function (card) {
    card.addEventListener("mouseenter", function () {
      applyDetail(card);
    });
    card.addEventListener("focusin", function () {
      applyDetail(card);
    });
  });

  if (cards.length) {
    applyDetail(cards[0]);
  }

  split.addEventListener("mouseleave", function () {
    if (cards.length) applyDetail(cards[0]);
  });
})();
