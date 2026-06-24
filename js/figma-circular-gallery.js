/**
 * CircularGallery — vanilla port of user-provided React / OGL code
 */
import { Camera, Mesh, Plane, Program, Renderer, Texture, Transform } from "./vendor/ogl/index.js";

var PORTFOLIO_ITEMS = [
  {
    image: "assets/projects/elem/cover.jpg?v=20260624",
    text: "饿了么VI升级",
    href: "projects/elem.html",
  },
  { image: "assets/projects/pin/cover.jpg?v=20260624", text: "Pin", href: "projects/pin.html" },
  { image: "assets/projects/周大侠/62.jpg", text: "周大虾", href: "projects/zhouxiaxia.html" },
  {
    image: "assets/projects/紫云玄清/紫云玄清_页面_02.jpg",
    text: "紫云玄清",
    href: "projects/ziyun-xuanqing.html",
  },
  { image: "assets/projects/bae/cover.png", text: "BAE", href: "projects/bae.html" },
  {
    image: "assets/projects/饿小宝2.0/cover.jpg?v=20260624",
    text: "饿小宝 2.0",
    href: "projects/exiaobao-2.html",
  },
];

var DEFAULT_FONT = "bold 30px Figtree";
var DEFAULT_FONT_URL =
  "https://fonts.googleapis.com/css2?family=Figtree:wght@400;700&display=swap";

function debounce(func, wait) {
  var timeout;
  return function () {
    var args = arguments;
    var ctx = this;
    clearTimeout(timeout);
    timeout = setTimeout(function () {
      func.apply(ctx, args);
    }, wait);
  };
}

function lerp(p1, p2, t) {
  return p1 + (p2 - p1) * t;
}

function autoBind(instance) {
  var proto = Object.getPrototypeOf(instance);
  Object.getOwnPropertyNames(proto).forEach(function (key) {
    if (key !== "constructor" && typeof instance[key] === "function") {
      instance[key] = instance[key].bind(instance);
    }
  });
}

function deriveFontFamilyFromUrl(url) {
  var fileName = (url.split("/").pop() || "custom-font").split("?")[0];
  var base = fileName.replace(/\.(woff2?|ttf|otf|eot)$/i, "");
  return base.replace(/[^a-zA-Z0-9-_ ]/g, "").trim() || "CircularGalleryFont";
}

async function loadFontFromStylesheet(url) {
  var response = await fetch(url);
  if (!response.ok) {
    throw new Error("Failed to fetch font stylesheet (" + response.status + ")");
  }
  var cssText = await response.text();
  var faceBlocks = cssText.match(/@font-face\s*{[^}]*}/g) || [];
  var family = null;
  var fontFaces = [];
  for (var i = 0; i < faceBlocks.length; i++) {
    var block = faceBlocks[i];
    var familyMatch = block.match(/font-family:\s*['"]?([^;'"]+)['"]?/);
    var urlMatch = block.match(/url\(\s*['"]?([^'")]+)['"]?\s*\)/);
    if (!familyMatch || !urlMatch) continue;
    family = familyMatch[1].trim();
    var descriptors = {};
    var weightMatch = block.match(/font-weight:\s*([^;]+);/);
    var styleMatch = block.match(/font-style:\s*([^;]+);/);
    var rangeMatch = block.match(/unicode-range:\s*([^;]+);/);
    if (weightMatch) descriptors.weight = weightMatch[1].trim();
    if (styleMatch) descriptors.style = styleMatch[1].trim();
    if (rangeMatch) descriptors.unicodeRange = rangeMatch[1].trim();
    fontFaces.push(new FontFace(family, "url(" + urlMatch[1] + ")", descriptors));
  }
  if (!family) throw new Error("No @font-face rule found in the stylesheet");
  await Promise.allSettled(
    fontFaces.map(async function (face) {
      await face.load();
      document.fonts.add(face);
    })
  );
  return family;
}

async function loadFontFromFile(url) {
  var family = deriveFontFamilyFromUrl(url);
  var fontFace = new FontFace(family, "url(" + url + ")");
  await fontFace.load();
  document.fonts.add(fontFace);
  return family;
}

async function loadCustomFont(fontUrl) {
  var isStylesheet =
    fontUrl.includes("fonts.googleapis.com") || /\.css(\?.*)?$/i.test(fontUrl);
  return isStylesheet ? loadFontFromStylesheet(fontUrl) : loadFontFromFile(fontUrl);
}

async function resolveFont(font, fontUrl) {
  var effectiveUrl = fontUrl || (font === DEFAULT_FONT ? DEFAULT_FONT_URL : null);
  if (!effectiveUrl) {
    if (document.fonts && document.fonts.load) {
      try {
        await document.fonts.load(font);
        await document.fonts.ready;
      } catch (err) {
        /* ignore */
      }
    }
    return font;
  }
  try {
    var family = await loadCustomFont(effectiveUrl);
    var sizeMatch = font.match(/^\s*(.*?\d+px)/);
    var prefix = sizeMatch ? sizeMatch[1].trim() : "bold 30px";
    var resolved = prefix + ' "' + family + '"';
    if (document.fonts && document.fonts.load) {
      try {
        await document.fonts.load(resolved);
      } catch (err) {
        /* ignore */
      }
    }
    return resolved;
  } catch (error) {
    console.error("CircularGallery: unable to load font from", fontUrl, error);
    return font;
  }
}

function getFontSize(font) {
  var match = font.match(/(\d+)px/);
  return match ? parseInt(match[1], 10) : 30;
}

function createTextTexture(gl, text, font, color) {
  font = font || "bold 30px monospace";
  color = color || "black";
  var canvas = document.createElement("canvas");
  var context = canvas.getContext("2d");
  context.font = font;
  var metrics = context.measureText(text);
  var textWidth = Math.ceil(metrics.width);
  var textHeight = Math.ceil(getFontSize(font) * 1.2);
  canvas.width = textWidth + 20;
  canvas.height = textHeight + 20;
  context.font = font;
  context.fillStyle = color;
  context.textBaseline = "middle";
  context.textAlign = "center";
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillText(text, canvas.width / 2, canvas.height / 2);
  var texture = new Texture(gl, { generateMipmaps: false });
  texture.image = canvas;
  return { texture: texture, width: canvas.width, height: canvas.height };
}

function Title(opts) {
  autoBind(this);
  this.gl = opts.gl;
  this.plane = opts.plane;
  this.renderer = opts.renderer;
  this.text = opts.text;
  this.textColor = opts.textColor || "#545050";
  this.font = opts.font || "30px sans-serif";
  this.createMesh();
}

Title.prototype.createMesh = function () {
  var result = createTextTexture(this.gl, this.text, this.font, this.textColor);
  var geometry = new Plane(this.gl);
  var program = new Program(this.gl, {
    vertex: `
      attribute vec3 position;
      attribute vec2 uv;
      uniform mat4 modelViewMatrix;
      uniform mat4 projectionMatrix;
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragment: `
      precision highp float;
      uniform sampler2D tMap;
      varying vec2 vUv;
      void main() {
        vec4 color = texture2D(tMap, vUv);
        if (color.a < 0.1) discard;
        gl_FragColor = color;
      }
    `,
    uniforms: { tMap: { value: result.texture } },
    transparent: true,
  });
  this.mesh = new Mesh(this.gl, { geometry: geometry, program: program });
  var aspect = result.width / result.height;
  var textHeight = this.plane.scale.y * 0.15;
  var textWidth = textHeight * aspect;
  this.mesh.scale.set(textWidth, textHeight, 1);
  this.mesh.position.y = -this.plane.scale.y * 0.5 - textHeight * 0.5 - 0.05;
  this.mesh.setParent(this.plane);
};

function Media(opts) {
  this.extra = 0;
  this.geometry = opts.geometry;
  this.gl = opts.gl;
  this.image = opts.image;
  this.href = opts.href || "";
  this.index = opts.index;
  this.length = opts.length;
  this.renderer = opts.renderer;
  this.scene = opts.scene;
  this.screen = opts.screen;
  this.text = opts.text;
  this.viewport = opts.viewport;
  this.bend = opts.bend;
  this.textColor = opts.textColor;
  this.borderRadius = opts.borderRadius != null ? opts.borderRadius : 0;
  this.font = opts.font;
  this.createShader();
  this.createMesh();
  this.createTitle();
  this.onResize();
}

Media.prototype.createShader = function () {
  var self = this;
  var texture = new Texture(this.gl, { generateMipmaps: true });
  this.program = new Program(this.gl, {
    depthTest: false,
    depthWrite: false,
    vertex: `
      precision highp float;
      attribute vec3 position;
      attribute vec2 uv;
      uniform mat4 modelViewMatrix;
      uniform mat4 projectionMatrix;
      uniform float uTime;
      uniform float uSpeed;
      varying vec2 vUv;
      void main() {
        vUv = uv;
        vec3 p = position;
        p.z = (sin(p.x * 4.0 + uTime) * 1.5 + cos(p.y * 2.0 + uTime) * 1.5) * (0.1 + uSpeed * 0.5);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }
    `,
    fragment: `
      precision highp float;
      uniform vec2 uImageSizes;
      uniform vec2 uPlaneSizes;
      uniform sampler2D tMap;
      uniform float uBorderRadius;
      varying vec2 vUv;

      float roundedBoxSDF(vec2 p, vec2 b, float r) {
        vec2 d = abs(p) - b;
        return length(max(d, vec2(0.0))) + min(max(d.x, d.y), 0.0) - r;
      }

      void main() {
        vec2 ratio = vec2(
          min((uPlaneSizes.x / uPlaneSizes.y) / (uImageSizes.x / uImageSizes.y), 1.0),
          min((uPlaneSizes.y / uPlaneSizes.x) / (uImageSizes.y / uImageSizes.x), 1.0)
        );
        vec2 uv = vec2(
          vUv.x * ratio.x + (1.0 - ratio.x) * 0.5,
          vUv.y * ratio.y + (1.0 - ratio.y) * 0.5
        );
        vec4 color = texture2D(tMap, uv);
        float d = roundedBoxSDF(vUv - 0.5, vec2(0.5 - uBorderRadius), uBorderRadius);
        float edgeSmooth = 0.002;
        float alpha = 1.0 - smoothstep(-edgeSmooth, edgeSmooth, d);
        gl_FragColor = vec4(color.rgb, alpha);
      }
    `,
    uniforms: {
      tMap: { value: texture },
      uPlaneSizes: { value: [0, 0] },
      uImageSizes: { value: [0, 0] },
      uSpeed: { value: 0 },
      uTime: { value: 100 * Math.random() },
      uBorderRadius: { value: this.borderRadius },
    },
    transparent: true,
  });
  var img = new Image();
  img.crossOrigin = "anonymous";
  img.src = this.image;
  img.onload = function () {
    texture.image = img;
    self.program.uniforms.uImageSizes.value = [img.naturalWidth, img.naturalHeight];
  };
};

Media.prototype.createMesh = function () {
  this.plane = new Mesh(this.gl, {
    geometry: this.geometry,
    program: this.program,
  });
  this.plane.setParent(this.scene);
};

Media.prototype.createTitle = function () {
  this.title = new Title({
    gl: this.gl,
    plane: this.plane,
    renderer: this.renderer,
    text: this.text,
    textColor: this.textColor,
    font: this.font,
  });
};

Media.prototype.update = function (scroll, direction) {
  this.plane.position.x = this.x - scroll.current - this.extra;

  var x = this.plane.position.x;
  var H = this.viewport.width / 2;

  if (this.bend === 0) {
    this.plane.position.y = 0;
    this.plane.rotation.z = 0;
  } else {
    var B_abs = Math.abs(this.bend);
    var R = (H * H + B_abs * B_abs) / (2 * B_abs);
    var effectiveX = Math.min(Math.abs(x), H);
    var arc = R - Math.sqrt(R * R - effectiveX * effectiveX);
    if (this.bend > 0) {
      this.plane.position.y = -arc;
      this.plane.rotation.z = -Math.sign(x) * Math.asin(effectiveX / R);
    } else {
      this.plane.position.y = arc;
      this.plane.rotation.z = Math.sign(x) * Math.asin(effectiveX / R);
    }
  }

  this.speed = scroll.current - scroll.last;
  this.program.uniforms.uTime.value += 0.04;
  this.program.uniforms.uSpeed.value = this.speed;

  var planeOffset = this.plane.scale.x / 2;
  var viewportOffset = this.viewport.width / 2;
  this.isBefore = this.plane.position.x + planeOffset < -viewportOffset;
  this.isAfter = this.plane.position.x - planeOffset > viewportOffset;
  if (direction === "right" && this.isBefore) {
    this.extra -= this.widthTotal;
    this.isBefore = this.isAfter = false;
  }
  if (direction === "left" && this.isAfter) {
    this.extra += this.widthTotal;
    this.isBefore = this.isAfter = false;
  }
};

Media.prototype.onResize = function (opts) {
  opts = opts || {};
  if (opts.screen) this.screen = opts.screen;
  if (opts.viewport) {
    this.viewport = opts.viewport;
    if (this.plane.program.uniforms.uViewportSizes) {
      this.plane.program.uniforms.uViewportSizes.value = [
        this.viewport.width,
        this.viewport.height,
      ];
    }
  }
  this.scale = this.screen.height / 1500;
  this.plane.scale.y = (this.viewport.height * (900 * this.scale)) / this.screen.height;
  this.plane.scale.x = (this.viewport.width * (700 * this.scale)) / this.screen.width;
  this.plane.program.uniforms.uPlaneSizes.value = [this.plane.scale.x, this.plane.scale.y];
  this.padding = 2;
  this.width = this.plane.scale.x + this.padding;
  this.widthTotal = this.width * this.length;
  this.x = this.width * this.index;
};

function App(container, options) {
  options = options || {};
  document.documentElement.classList.remove("no-js");
  this.container = container;
  this.scrollSpeed = options.scrollSpeed != null ? options.scrollSpeed : 2;
  this.scroll = {
    ease: options.scrollEase != null ? options.scrollEase : 0.05,
    current: 0,
    target: 0,
    last: 0,
  };
  this.onCheckDebounce = debounce(this.onCheck.bind(this), 200);
  this.createRenderer();
  this.createCamera();
  this.createScene();
  this.onResize();
  this.createGeometry();
  this.createMedias(
    options.items,
    options.bend != null ? options.bend : 3,
    options.textColor || "#ffffff",
    options.borderRadius != null ? options.borderRadius : 0.05,
    options.font || DEFAULT_FONT
  );
  this.update();
  this.addEventListeners();
}

App.prototype.createRenderer = function () {
  this.renderer = new Renderer({
    alpha: true,
    antialias: true,
    dpr: Math.min(window.devicePixelRatio || 1, 2),
  });
  this.gl = this.renderer.gl;
  if (!this.gl) throw new Error("WebGL unavailable");
  this.gl.clearColor(0, 0, 0, 0);
  this.container.appendChild(this.renderer.gl.canvas);
};

App.prototype.createCamera = function () {
  this.camera = new Camera(this.gl);
  this.camera.fov = 45;
  this.camera.position.z = 20;
};

App.prototype.createScene = function () {
  this.scene = new Transform();
};

App.prototype.createGeometry = function () {
  this.planeGeometry = new Plane(this.gl, {
    heightSegments: 50,
    widthSegments: 100,
  });
};

App.prototype.createMedias = function (items, bend, textColor, borderRadius, font) {
  var galleryItems = items && items.length ? items : PORTFOLIO_ITEMS;
  this.mediasImages = galleryItems.concat(galleryItems);
  var self = this;
  this.medias = this.mediasImages.map(function (data, index) {
    return new Media({
      geometry: self.planeGeometry,
      gl: self.gl,
      image: data.image,
      href: data.href,
      index: index,
      length: self.mediasImages.length,
      renderer: self.renderer,
      scene: self.scene,
      screen: self.screen,
      text: data.text,
      viewport: self.viewport,
      bend: bend,
      textColor: textColor,
      borderRadius: borderRadius,
      font: font,
    });
  });
};

App.prototype.onTouchDown = function (e) {
  var target = e.target;
  if (target !== this.container && !this.container.contains(target)) return;
  this.isDown = true;
  this.dragDistance = 0;
  this.scroll.position = this.scroll.current;
  var point = e.touches ? e.touches[0] : e;
  this.start = point.clientX;
  this.initialX = this.start;
  this.initialY = point.clientY;
};

App.prototype.onTouchMove = function (e) {
  if (!this.isDown) return;
  var point = e.touches ? e.touches[0] : e;
  var x = point.clientX;
  var y = point.clientY;
  this.dragDistance = Math.max(
    this.dragDistance,
    Math.abs(x - this.initialX),
    Math.abs(y - (this.initialY || y))
  );
  var distance = (this.start - x) * (this.scrollSpeed * 0.025);
  this.scroll.target = this.scroll.position + distance;
};

App.prototype.onTouchUp = function (e) {
  if (this.isDown && this.dragDistance < 12 && e) {
    var point = e.changedTouches ? e.changedTouches[0] : e;
    this.openItemAtPoint(point.clientX, point.clientY);
  }
  this.isDown = false;
  this.onCheck();
};

App.prototype.openItemAtPoint = function (clientX, clientY) {
  if (!this.medias || !this.medias.length || !this.viewport || !this.screen) return;

  var rect = this.container.getBoundingClientRect();
  var localX = clientX - rect.left;
  var localY = clientY - rect.top;
  var vw = this.viewport.width;
  var vh = this.viewport.height;
  var sw = this.screen.width;
  var sh = this.screen.height;

  var best = null;
  var bestDist = Infinity;

  this.medias.forEach(function (media) {
    if (!media.href || !media.plane) return;

    var wx = media.plane.position.x;
    var wy = media.plane.position.y;
    var halfW = media.plane.scale.x * 0.52;
    var halfH = media.plane.scale.y * 0.72;

    var px = sw * (0.5 + wx / vw);
    var py = sh * (0.5 - wy / vh);

    var inX = localX >= px - (halfW / vw) * sw && localX <= px + (halfW / vw) * sw;
    var inY = localY >= py - (halfH / vh) * sh && localY <= py + (halfH / vh) * sh;
    if (!inX || !inY) return;

    var dx = localX - px;
    var dy = localY - py;
    var dist = dx * dx + dy * dy;
    if (dist < bestDist) {
      bestDist = dist;
      best = media;
    }
  });

  if (best && best.href) {
    window.location.href = best.href;
  }
};

App.prototype.openCenterItem = function () {
  if (!this.container) return;
  var rect = this.container.getBoundingClientRect();
  this.openItemAtPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
};

App.prototype.onWheel = function (e) {
  var delta = e.deltaY || e.wheelDelta || e.detail;
  this.scroll.target += (delta > 0 ? this.scrollSpeed : -this.scrollSpeed) * 0.2;
  this.onCheckDebounce();
};

App.prototype.onKeyDown = function (e) {
  switch (e.key) {
    case "ArrowRight":
      e.preventDefault();
      this.scroll.target += this.scrollSpeed * 5;
      this.onCheckDebounce();
      break;
    case "ArrowLeft":
      e.preventDefault();
      this.scroll.target -= this.scrollSpeed * 5;
      this.onCheckDebounce();
      break;
    case "Home":
      e.preventDefault();
      this.scroll.target = 0;
      this.onCheckDebounce();
      break;
    case "Enter":
    case " ":
      e.preventDefault();
      this.openCenterItem();
      break;
    default:
      break;
  }
};

App.prototype.onCheck = function () {
  if (!this.medias || !this.medias[0]) return;
  var width = this.medias[0].width;
  var itemIndex = Math.round(Math.abs(this.scroll.target) / width);
  var item = width * itemIndex;
  this.scroll.target = this.scroll.target < 0 ? -item : item;
};

App.prototype.onResize = function () {
  this.screen = {
    width: this.container.clientWidth,
    height: this.container.clientHeight,
  };
  this.renderer.setSize(this.screen.width, this.screen.height);
  this.camera.perspective({
    aspect: this.screen.width / this.screen.height,
  });
  var fov = (this.camera.fov * Math.PI) / 180;
  var height = 2 * Math.tan(fov / 2) * this.camera.position.z;
  var width = height * this.camera.aspect;
  this.viewport = { width: width, height: height };
  if (this.medias) {
    var self = this;
    this.medias.forEach(function (media) {
      media.onResize({ screen: self.screen, viewport: self.viewport });
    });
  }
};

App.prototype.update = function () {
  this.scroll.current = lerp(this.scroll.current, this.scroll.target, this.scroll.ease);
  var direction = this.scroll.current > this.scroll.last ? "right" : "left";
  if (this.medias) {
    var self = this;
    this.medias.forEach(function (media) {
      media.update(self.scroll, direction);
    });
  }
  this.renderer.render({ scene: this.scene, camera: this.camera });
  this.scroll.last = this.scroll.current;
  this.raf = window.requestAnimationFrame(this.update.bind(this));
};

App.prototype.addEventListeners = function () {
  this.boundOnResize = this.onResize.bind(this);
  this.boundOnWheel = this.onWheel.bind(this);
  this.boundOnTouchDown = this.onTouchDown.bind(this);
  this.boundOnTouchMove = this.onTouchMove.bind(this);
  this.boundOnTouchUp = this.onTouchUp.bind(this);
  this.boundOnKeyDown = this.onKeyDown.bind(this);

  window.addEventListener("resize", this.boundOnResize);
  window.addEventListener("mousewheel", this.boundOnWheel);
  window.addEventListener("wheel", this.boundOnWheel);
  window.addEventListener("mousedown", this.boundOnTouchDown);
  window.addEventListener("mousemove", this.boundOnTouchMove);
  window.addEventListener("mouseup", this.boundOnTouchUp);
  window.addEventListener("touchstart", this.boundOnTouchDown);
  window.addEventListener("touchmove", this.boundOnTouchMove);
  window.addEventListener("touchend", this.boundOnTouchUp);
  this.container.addEventListener("keydown", this.boundOnKeyDown);
};

App.prototype.destroy = function () {
  window.cancelAnimationFrame(this.raf);
  window.removeEventListener("resize", this.boundOnResize);
  window.removeEventListener("mousewheel", this.boundOnWheel);
  window.removeEventListener("wheel", this.boundOnWheel);
  window.removeEventListener("mousedown", this.boundOnTouchDown);
  window.removeEventListener("mousemove", this.boundOnTouchMove);
  window.removeEventListener("mouseup", this.boundOnTouchUp);
  window.removeEventListener("touchstart", this.boundOnTouchDown);
  window.removeEventListener("touchmove", this.boundOnTouchMove);
  window.removeEventListener("touchend", this.boundOnTouchUp);
  if (this.container) {
    this.container.removeEventListener("keydown", this.boundOnKeyDown);
  }
  if (this.renderer && this.renderer.gl && this.renderer.gl.canvas.parentNode) {
    this.renderer.gl.canvas.parentNode.removeChild(this.renderer.gl.canvas);
  }
};

function withTimeout(promise, ms, fallbackValue) {
  return Promise.race([
    promise,
    new Promise(function (resolve) {
      setTimeout(function () {
        resolve(fallbackValue);
      }, ms);
    }),
  ]);
}

function showStaticFallback(container) {
  container.classList.add("figma-circular-gallery--static");
  container.hidden = true;
}

var galleryApp = null;

function resetGalleryContainer(container) {
  if (!container) return;
  container.classList.remove("figma-circular-gallery--ready");
  container.classList.remove("figma-circular-gallery--static");
  container.hidden = false;
  var canvas = container.querySelector("canvas");
  if (canvas) canvas.remove();
}

function destroyGallery() {
  if (galleryApp) {
    galleryApp.destroy();
    galleryApp = null;
  }
  resetGalleryContainer(document.getElementById("portfolio-circular-gallery"));
}

function boot() {
  var container = document.getElementById("portfolio-circular-gallery");
  if (!container) return;

  if (galleryApp && container.querySelector("canvas")) return;

  destroyGallery();

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    showStaticFallback(container);
    return;
  }

  var items = PORTFOLIO_ITEMS;
  try {
    var raw = container.getAttribute("data-items");
    if (raw) items = JSON.parse(raw);
  } catch (err) {
    console.warn("[figma-circular-gallery]", err);
  }

  withTimeout(resolveFont(DEFAULT_FONT, null), 3000, DEFAULT_FONT)
    .then(function (resolvedFont) {
      if (!container || !container.isConnected) return;
      try {
        galleryApp = new App(container, {
          items: items,
          bend: 3,
          textColor: "#ffffff",
          borderRadius: 0.05,
          font: resolvedFont,
          scrollSpeed: 2,
          scrollEase: 0.05,
        });
        container.classList.add("figma-circular-gallery--ready");
      } catch (err) {
        console.warn("[figma-circular-gallery]", err);
        showStaticFallback(container);
      }
    })
    .catch(function (err) {
      console.warn("[figma-circular-gallery]", err);
      showStaticFallback(container);
    });
}

function setupGalleryLifecycle() {
  window.addEventListener("pagehide", function () {
    destroyGallery();
  });
  window.addEventListener("pageshow", function (e) {
    if (e.persisted) boot();
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", function () {
    setupGalleryLifecycle();
    boot();
  });
} else {
  setupGalleryLifecycle();
  boot();
}
