(function () {
  var header = document.querySelector(".figma-header");
  var overlay = document.getElementById("figma-nav-overlay");
  var toggle = document.getElementById("figma-nav-toggle");
  var links = document.querySelectorAll("a.figma-nav-link");
  var sectionIds = ["hero", "projects-label", "process-heading"];
  var desktopMq = window.matchMedia("(min-width: 721px)");

  /** 点击锚点导航后短暂锁定高亮为「即将滚到的区块」，避免 scroll 同步仍判为上一段而造成闪烁 */
  var pendingNavHash = null;
  var navIgnoreScroll = false;
  var navScrollEndTimer = null;

  function scheduleNavScrollLockEnd() {
    clearTimeout(navScrollEndTimer);
    navScrollEndTimer = setTimeout(function () {
      navIgnoreScroll = false;
      pendingNavHash = null;
      syncFromScroll();
    }, 160);
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
      pendingNavHash = normalizeHash(h);
      navIgnoreScroll = true;
      setActiveLink(pendingNavHash);
      scheduleNavScrollLockEnd();
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

  window.addEventListener(
    "scroll",
    function () {
      if (navIgnoreScroll) {
        scheduleNavScrollLockEnd();
      }
      syncFromScroll();
      updateHeaderScrolledBg();
    },
    { passive: true }
  );
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
    navIgnoreScroll = false;
    pendingNavHash = null;
    clearTimeout(navScrollEndTimer);
    var h = location.hash;
    if (h === "#top" || h === "") {
      setActiveLink("#hero");
      return;
    }
    if (["#hero", "#projects-label", "#process-heading"].indexOf(h) !== -1) {
      setActiveLink(h);
    }
  });

  syncFromScroll();
  window.addEventListener("load", function () {
    syncFromScroll();
    syncHeaderHeight();
  });
  syncHeaderHeight();
  updateHeaderScrolledBg();

  /* 详情页：向下滚动隐藏顶栏，回顶或向上滑时渐现 */
  var detailPage = document.querySelector(".figma-page--detail");
  if (detailPage && header && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    var lastScrollY = window.scrollY;
    var scrollThreshold = 8;
    var topRevealY = 48;

    function updateDetailHeaderVisibility() {
      if (document.body.classList.contains("figma-nav-open")) {
        header.classList.remove("figma-header--hidden");
        lastScrollY = window.scrollY;
        return;
      }

      var y = window.scrollY;
      if (y <= topRevealY) {
        header.classList.remove("figma-header--hidden");
      } else if (y > lastScrollY + scrollThreshold) {
        header.classList.add("figma-header--hidden");
      } else if (y < lastScrollY - scrollThreshold) {
        header.classList.remove("figma-header--hidden");
      }
      lastScrollY = y;
    }

    window.addEventListener("scroll", updateDetailHeaderVisibility, { passive: true });
    updateDetailHeaderVisibility();
  }
})();
