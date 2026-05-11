/**
 * Hero：鼠标替换为白色圆；仅在 hover 指针设备启用。
 * 悬停在标题 / 问候 / 导语等文案上时放大圆形（放大镜）+ difference 反色。
 */
(function () {
  var hero = document.querySelector(".figma-hero-main");
  var cursor = document.getElementById("figma-hero-cursor");
  if (!hero || !cursor) return;

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (!window.matchMedia("(hover: hover)").matches) return;
  if (!window.matchMedia("(pointer: fine)").matches) return;

  var onClass = "figma-hero-cursor--on";
  var magClass = "figma-hero-cursor--mag";
  var textSelector =
    ".figma-hero-title, .figma-hero-greeting, .figma-hero-lede, .figma-hero-rule";

  function move(clientX, clientY) {
    cursor.style.left = clientX + "px";
    cursor.style.top = clientY + "px";
  }

  function updateMag(clientX, clientY) {
    var target = document.elementFromPoint(clientX, clientY);
    var overCopy =
      target &&
      target.closest &&
      !!target.closest(textSelector);
    hero.classList.toggle(magClass, !!overCopy);
  }

  hero.addEventListener(
    "mouseenter",
    function (e) {
      hero.classList.add(onClass);
      move(e.clientX, e.clientY);
      updateMag(e.clientX, e.clientY);
    },
    false
  );

  hero.addEventListener(
    "mousemove",
    function (e) {
      if (!hero.classList.contains(onClass)) return;
      move(e.clientX, e.clientY);
      updateMag(e.clientX, e.clientY);
    },
    false
  );

  hero.addEventListener(
    "mouseleave",
    function () {
      hero.classList.remove(onClass);
      hero.classList.remove(magClass);
    },
    false
  );
})();
