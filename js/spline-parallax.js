/**
 * 鼠标视差：对匹配 [data-spline-parallax] 的根节点施加 perspective + rotate。
 * 请勿把该属性放在直接包裹 <spline-viewer> 的容器上 —— 祖先的 transform
 * 会让部分浏览器中 WebGL / Canvas 合成失败，出现空白画面。
 */
(function () {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  document.querySelectorAll("[data-spline-parallax]").forEach(function (root) {
    var maxDeg = parseFloat(root.getAttribute("data-parallax-deg") || "") || 10;
    var smooth = parseFloat(root.getAttribute("data-parallax-smooth") || "") || 0.14;
    var mx = 0;
    var my = 0;
    var cx = 0;
    var cy = 0;

    function clamp(n, a, b) {
      return Math.max(a, Math.min(b, n));
    }

    function loop() {
      cx += (mx - cx) * smooth;
      cy += (my - cy) * smooth;
      root.style.transform =
        "perspective(920px) rotateX(" +
        -cy * maxDeg +
        "deg) rotateY(" +
        cx * maxDeg +
        "deg)";
      requestAnimationFrame(loop);
    }

    function onMove(e) {
      var nx = (e.clientX / window.innerWidth) * 2 - 1;
      var ny = (e.clientY / window.innerHeight) * 2 - 1;
      mx = clamp(nx, -1, 1);
      my = clamp(ny, -1, 1);
    }

    root.style.transformOrigin = "center center";
    root.style.willChange = "transform";

    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener(
      "touchmove",
      function (e) {
        var t = e.touches && e.touches[0];
        if (t) {
          onMove({ clientX: t.clientX, clientY: t.clientY });
        }
      },
      { passive: true }
    );

    requestAnimationFrame(loop);
  });
})();
