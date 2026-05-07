(function () {
  var header = document.querySelector(".figma-header");
  var overlay = document.getElementById("figma-nav-overlay");
  var toggle = document.getElementById("figma-nav-toggle");
  var links = document.querySelectorAll("a.figma-nav-link");
  var sectionIds = ["hero", "portfolio-masonry", "what-we-provide"];
  var desktopMq = window.matchMedia("(min-width: 721px)");

  function linkHash(link) {
    var href = link.getAttribute("href") || "";
    var i = href.lastIndexOf("#");
    return i >= 0 ? href.slice(i) : "";
  }

  function normalizeHash(hash) {
    if (!hash || hash === "#") return "#hero";
    if (hash === "#top") return "#hero";
    return hash;
  }

  function setActiveLink(hash) {
    hash = normalizeHash(hash);
    links.forEach(function (link) {
      var h = linkHash(link);
      var match = h === hash || (hash === "#hero" && (h === "#top" || h === "#hero"));
      link.classList.toggle("figma-nav-link--active", match);
    });
  }

  function scrollOffset() {
    return header ? header.offsetHeight + 8 : 72;
  }

  function syncFromScroll() {
    var hasSection = sectionIds.some(function (id) {
      return document.getElementById(id);
    });
    if (!hasSection) {
      syncActiveFromPill();
      return;
    }

    var y = window.scrollY + scrollOffset();
    var activeId = "hero";
    sectionIds.forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      var top = el.getBoundingClientRect().top + window.scrollY;
      if (top <= y) activeId = id;
    });
    setActiveLink("#" + activeId);
  }

  function syncActiveFromPill() {
    var pill = document.querySelector(".figma-nav-pill");
    if (!pill) return;
    var active = pill.querySelector("a.figma-nav-link.figma-nav-link--active");
    if (!active) return;
    setActiveLink(linkHash(active));
  }

  links.forEach(function (link) {
    link.addEventListener("click", function () {
      var h = linkHash(link);
      if (!h) return;
      window.requestAnimationFrame(function () {
        setActiveLink(h);
      });
    });
  });

  function closeNav() {
    if (!overlay || !toggle) return;
    overlay.setAttribute("hidden", "");
    overlay.setAttribute("aria-hidden", "true");
    toggle.setAttribute("aria-expanded", "false");
    toggle.classList.remove("figma-nav-toggle--open");
    document.body.classList.remove("figma-nav-open");
    toggle.setAttribute("aria-label", "打开菜单");
  }

  function openNav() {
    if (!overlay || !toggle) return;
    overlay.removeAttribute("hidden");
    overlay.setAttribute("aria-hidden", "false");
    toggle.setAttribute("aria-expanded", "true");
    toggle.classList.add("figma-nav-toggle--open");
    document.body.classList.add("figma-nav-open");
    toggle.setAttribute("aria-label", "关闭菜单");
  }

  function toggleNav() {
    if (!overlay || !toggle) return;
    if (overlay.hasAttribute("hidden")) openNav();
    else closeNav();
  }

  if (toggle && overlay) {
    toggle.addEventListener("click", function () {
      toggleNav();
    });
    overlay.querySelectorAll("[data-figma-nav-close]").forEach(function (el) {
      el.addEventListener("click", closeNav);
    });
    overlay.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        window.requestAnimationFrame(closeNav);
      });
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && overlay && !overlay.hasAttribute("hidden")) {
        e.preventDefault();
        closeNav();
      }
    });
  }

  function onDesktopResize() {
    if (desktopMq.matches && overlay && !overlay.hasAttribute("hidden")) {
      closeNav();
    }
  }

  window.addEventListener("scroll", syncFromScroll, { passive: true });
  window.addEventListener("resize", function () {
    syncFromScroll();
    onDesktopResize();
  });
  if (desktopMq.addEventListener) {
    desktopMq.addEventListener("change", onDesktopResize);
  } else if (desktopMq.addListener) {
    desktopMq.addListener(onDesktopResize);
  }

  window.addEventListener("hashchange", function () {
    var h = location.hash;
    if (h === "#top" || h === "") {
      setActiveLink("#hero");
      return;
    }
    if (["#hero", "#portfolio-masonry", "#what-we-provide"].indexOf(h) !== -1) {
      setActiveLink(h);
    }
  });

  syncFromScroll();
  window.addEventListener("load", syncFromScroll);
})();
