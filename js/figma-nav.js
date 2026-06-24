(function () {
  var header = document.querySelector(".figma-header");
  var overlay = document.getElementById("figma-nav-overlay");
  var toggle = document.getElementById("figma-nav-toggle");
  var links = document.querySelectorAll("a.figma-nav-link");
  var sectionIds = ["hero", "projects-label", "process-heading"];
  var desktopMq = window.matchMedia("(min-width: 721px)");
  var reducedMotionMq = window.matchMedia("(prefers-reduced-motion: reduce)");

  var pendingNavHash = null;
  var navIgnoreScroll = false;
  var navScrollEndTimer = null;
  var navScrollLockStart = 0;
  var NAV_SCROLL_SETTLE_MS = 120;

  function smoothScrollBehavior() {
    return reducedMotionMq.matches ? "auto" : "smooth";
  }

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

  function sectionDocumentTop(id) {
    var el = document.getElementById(id);
    if (!el) return null;
    return el.getBoundingClientRect().top + window.scrollY;
  }

  function activeSectionFromScroll() {
    var line = window.scrollY + scrollOffset();
    var activeId = sectionIds[0];

    sectionIds.forEach(function (id) {
      var top = sectionDocumentTop(id);
      if (top != null && top <= line + 1) activeId = id;
    });

    return activeId;
  }

  function syncFromScroll() {
    var hasSection = sectionIds.some(function (id) {
      return document.getElementById(id);
    });
    if (!hasSection) {
      syncActiveFromPill();
      return;
    }

    if (navIgnoreScroll && pendingNavHash) {
      setActiveLink(pendingNavHash);
      return;
    }

    setActiveLink("#" + activeSectionFromScroll());
  }

  function syncActiveFromPill() {
    var pill = document.querySelector(".figma-nav-pill");
    if (!pill) return;
    var active = pill.querySelector("a.figma-nav-link.figma-nav-link--active");
    if (!active) return;
    setActiveLink(linkHash(active));
  }

  function isNearNavTarget(hash) {
    if (!hash) return true;
    var id = hash.charAt(0) === "#" ? hash.slice(1) : hash;
    if (id === "hero") return window.scrollY <= scrollOffset();

    var el = document.getElementById(id);
    if (!el) return true;
    return Math.abs(el.getBoundingClientRect().top - scrollOffset()) <= 48;
  }

  function releaseNavScrollLock() {
    navIgnoreScroll = false;
    pendingNavHash = null;
    syncFromScroll();
  }

  function scheduleNavScrollLockEnd() {
    clearTimeout(navScrollEndTimer);
    navScrollEndTimer = setTimeout(function () {
      if (!navIgnoreScroll || !pendingNavHash) return;
      if (!isNearNavTarget(pendingNavHash)) {
        scheduleNavScrollLockEnd();
        return;
      }
      releaseNavScrollLock();
    }, NAV_SCROLL_SETTLE_MS);
  }

  function updateHistoryHash(hash) {
    hash = normalizeHash(hash);
    if (history.replaceState) {
      history.replaceState(null, "", hash);
      return;
    }
    if (location.hash !== hash) location.hash = hash;
  }

  function scrollToNavTarget(hash) {
    hash = normalizeHash(hash);
    var behavior = smoothScrollBehavior();

    if (hash === "#hero") {
      window.scrollTo({ top: 0, left: 0, behavior: behavior });
      return;
    }

    var el = document.getElementById(hash.slice(1));
    if (!el) return;
    el.scrollIntoView({ behavior: behavior, block: "start" });
  }

  function navigateToHash(hash, fromClick) {
    hash = normalizeHash(hash);
    pendingNavHash = hash;
    navIgnoreScroll = true;
    navScrollLockStart = Date.now();
    setActiveLink(hash);

    if (fromClick) {
      updateHistoryHash(hash);
    }

    scrollToNavTarget(hash);
    scheduleNavScrollLockEnd();
  }

  links.forEach(function (link) {
    link.addEventListener("click", function (e) {
      var h = linkHash(link);
      if (!h) return;

      var hash = normalizeHash(h);
      var id = hash.slice(1);
      var target = document.getElementById(id);
      if (!target) return;

      e.preventDefault();
      navigateToHash(hash, true);
    });
  });

  var scrollBgThreshold = 12;

  function updateHeaderScrolledBg() {
    if (!header) return;
    var showBg =
      window.scrollY > scrollBgThreshold || document.body.classList.contains("figma-nav-open");
    header.classList.toggle("figma-header--scrolled", showBg);
  }

  function syncHeaderHeight() {
    if (!header) return;
    document.documentElement.style.setProperty("--figma-header-h", header.offsetHeight + "px");
  }

  function closeNav() {
    if (!overlay || !toggle) return;
    overlay.setAttribute("hidden", "");
    overlay.setAttribute("aria-hidden", "true");
    toggle.setAttribute("aria-expanded", "false");
    toggle.classList.remove("figma-nav-toggle--open");
    document.body.classList.remove("figma-nav-open");
    toggle.setAttribute("aria-label", "打开菜单");
    updateHeaderScrolledBg();
  }

  function openNav() {
    if (!overlay || !toggle) return;
    overlay.removeAttribute("hidden");
    overlay.setAttribute("aria-hidden", "false");
    toggle.setAttribute("aria-expanded", "true");
    toggle.classList.add("figma-nav-toggle--open");
    document.body.classList.add("figma-nav-open");
    toggle.setAttribute("aria-label", "关闭菜单");
    updateHeaderScrolledBg();
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

  var lastHeaderScrollY = window.scrollY;
  var headerScrollThreshold = 8;
  var headerTopRevealY = 48;

  function updateHeaderVisibility() {
    if (!header || reducedMotionMq.matches) return;

    if (document.body.classList.contains("figma-nav-open") || navIgnoreScroll) {
      header.classList.remove("figma-header--hidden");
      lastHeaderScrollY = window.scrollY;
      return;
    }

    var y = window.scrollY;
    if (y <= headerTopRevealY) {
      header.classList.remove("figma-header--hidden");
    } else if (y > lastHeaderScrollY + headerScrollThreshold) {
      header.classList.add("figma-header--hidden");
    } else if (y < lastHeaderScrollY - headerScrollThreshold) {
      header.classList.remove("figma-header--hidden");
    }
    lastHeaderScrollY = y;
  }

  window.addEventListener(
    "scroll",
    function () {
      if (navIgnoreScroll) {
        setActiveLink(pendingNavHash);
        scheduleNavScrollLockEnd();
      } else {
        syncFromScroll();
      }
      updateHeaderVisibility();
      updateHeaderScrolledBg();
    },
    { passive: true }
  );

  if ("onscrollend" in window) {
    window.addEventListener("scrollend", function () {
      if (!navIgnoreScroll || !pendingNavHash) return;
      if (!isNearNavTarget(pendingNavHash)) return;
      clearTimeout(navScrollEndTimer);
      releaseNavScrollLock();
    });
  }

  window.addEventListener("resize", function () {
    syncFromScroll();
    onDesktopResize();
    syncHeaderHeight();
  });
  if (desktopMq.addEventListener) {
    desktopMq.addEventListener("change", onDesktopResize);
  } else if (desktopMq.addListener) {
    desktopMq.addListener(onDesktopResize);
  }

  window.addEventListener("hashchange", function () {
    clearTimeout(navScrollEndTimer);
    navigateToHash(location.hash || "#hero", false);
  });

  syncFromScroll();
  window.addEventListener("load", function () {
    syncFromScroll();
    syncHeaderHeight();
  });
  syncHeaderHeight();
  updateHeaderScrolledBg();
  updateHeaderVisibility();
})();
