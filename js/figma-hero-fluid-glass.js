/**
 * Hero Fluid Glass — vanilla port of React Bits FluidGlass (Lens + Cube)
 * FBO → MeshTransmissionMaterial refraction, pointer damp λ=0.15
 */
import * as THREE from "./vendor/three.module.js";
import { MeshTransmissionMaterialImpl } from "./vendor/MeshTransmissionMaterialImpl.js";
import { Text } from "troika-three-text";

const INTER_BOLD =
  "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfAZ9hiJ-Ek-_EeA.woff";
const ACCENT = 0xd2ff73;
const WHITE = 0xffffff;
const HERO_LEDE =
  "I work with brands globally to build pixel-perfect, engaging, and accessible\ndigital experiences that drive results and achieve business goals.";
const CONTENT_Z = 12;
const LENS_Z = 15;

function viewportAt(camera, targetZ) {
  const dist = Math.abs(camera.position.z - targetZ);
  const vFov = (camera.fov * Math.PI) / 180;
  const height = 2 * Math.tan(vFov / 2) * dist;
  return { width: height * camera.aspect, height, dist };
}

function damp3(current, target, lambda, delta) {
  const t = 1 - Math.exp(-lambda * delta);
  current.x += (target.x - current.x) * t;
  current.y += (target.y - current.y) * t;
  current.z += (target.z - current.z) * t;
}

function createTransmission(buffer, overrides) {
  overrides = overrides || {};
  const mat = new MeshTransmissionMaterialImpl(10);
  mat.buffer = buffer;
  mat.ior = overrides.ior != null ? overrides.ior : 1.15;
  mat.thickness = overrides.thickness != null ? overrides.thickness : 5;
  mat.anisotropicBlur = overrides.anisotropicBlur != null ? overrides.anisotropicBlur : 0.01;
  mat.chromaticAberration = overrides.chromaticAberration != null ? overrides.chromaticAberration : 0.1;
  mat._transmission = 1;
  mat.transmission = 0;
  mat.roughness = 0;
  mat.toneMapped = false;
  return mat;
}

function displayFontSize() {
  const w = window.innerWidth;
  if (w <= 639) return 0.272;
  if (w <= 1023) return 0.432;
  return 0.656;
}

function makeText(text, color, x, y, fontSize, maxWidth, anchorY, anchorX) {
  const t = new Text();
  t.text = text;
  t.fontSize = fontSize;
  t.color = color;
  t.font = INTER_BOLD;
  t.anchorX = anchorX || "left";
  t.anchorY = anchorY || "top";
  if (t.anchorX === "center") t.textAlign = "center";
  if (t.anchorX === "right") t.textAlign = "right";
  t.position.set(x, y, 0);
  if (maxWidth) t.maxWidth = maxWidth;
  t.outlineWidth = fontSize * 0.02;
  t.outlineBlur = fontSize * 0.2;
  t.outlineColor = 0x000000;
  t.outlineOpacity = 0.5;
  t.material.depthTest = false;
  t.renderOrder = 2;
  t.sync();
  return t;
}

function HeroFluidGlass(hero) {
  this.hero = hero;
  this.video = hero.querySelector(".figma-hero-video");
  this.canvas = document.createElement("canvas");
  this.canvas.className = "figma-hero-fluid-canvas";
  this.canvas.id = "figma-hero-fluid-canvas";
  this.canvas.setAttribute("aria-hidden", "true");
  hero.appendChild(this.canvas);

  this.renderer = new THREE.WebGLRenderer({
    canvas: this.canvas,
    alpha: true,
    antialias: true,
    powerPreference: "high-performance",
  });
  this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  this.renderer.toneMapping = THREE.NoToneMapping;

  this.camera = new THREE.PerspectiveCamera(15, 1, 0.1, 100);
  this.camera.position.set(0, 0, 20);

  this.bgScene = new THREE.Scene();
  this.displayScene = new THREE.Scene();
  this.clock = new THREE.Clock();
  this.lensPos = new THREE.Vector3(0, 0, LENS_Z);
  this.lensDest = new THREE.Vector3(0, 0, LENS_Z);
  this.pointer = { x: 0, y: 0 };
  this.textGroup = new THREE.Group();
  this.transmissionMats = [];
  this.raf = 0;
  this.geoWidth = 2;

  this.resize();
  this.buildBgScene();
  this.buildDisplayScene();
  this.bindEvents();
  this.hero.classList.add("figma-hero-main--fluid-glass");
  this.animate();
}

HeroFluidGlass.prototype.buildBgScene = function () {
  var self = this;
  this.bgScene.clear();
  this.textGroup = new THREE.Group();
  this.textGroup.position.z = CONTENT_Z;

  if (this.video) {
    var tex = new THREE.VideoTexture(this.video);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    this.videoTexture = tex;

    var v = viewportAt(this.camera, 10);
    var aspect = 16 / 9;
    if (this.video.videoWidth) aspect = this.video.videoWidth / this.video.videoHeight;

    var pw = v.width;
    var ph = pw / aspect;
    if (ph < v.height) {
      ph = v.height;
      pw = ph * aspect;
    }

    var plane = new THREE.Mesh(
      new THREE.PlaneGeometry(pw, ph),
      new THREE.MeshBasicMaterial({ map: tex, toneMapped: false })
    );
    plane.position.z = 10;
    this.bgScene.add(plane);
  }

  var v12 = viewportAt(this.camera, CONTENT_Z);
  var dFs = displayFontSize();
  var bottomY = -v12.height / 2 + v12.height * 0.08;
  var isNarrow = window.innerWidth <= 900;
  var pad = v12.width * 0.07;
  var ledeX = v12.width / 2 - pad;

  if (isNarrow) {
    var narrowW = v12.width * 0.82;
    var lede = makeText(HERO_LEDE, WHITE, ledeX, bottomY, dFs * 0.176, narrowW, "bottom", "right");
    lede.lineHeight = 1.55;
    lede.sync();
    this.textGroup.add(lede);
  } else {
    var ledeW = v12.width * 0.42;
    var lede = makeText(HERO_LEDE, WHITE, ledeX, bottomY, dFs * 0.176, ledeW, "bottom", "right");
    lede.lineHeight = 1.55;
    lede.sync();
    this.textGroup.add(lede);
  }

  this.bgScene.add(this.textGroup);
};

HeroFluidGlass.prototype.buildDisplayScene = function () {
  this.displayScene.clear();
  this.transmissionMats = [];

  var v = viewportAt(this.camera, LENS_Z);

  this.bufferPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(v.width, v.height),
    new THREE.MeshBasicMaterial({ map: this.fbo.texture, transparent: true, toneMapped: false })
  );
  this.bufferPlane.position.z = LENS_Z;
  this.bufferPlane.renderOrder = 0;
  this.displayScene.add(this.bufferPlane);

  var geo = new THREE.CylinderGeometry(1, 1, 0.18, 64);
  geo.rotateX(Math.PI / 2);
  geo.computeBoundingBox();
  this.geoWidth = geo.boundingBox.max.x - geo.boundingBox.min.x || 2;

  this.lensMat = createTransmission(this.fbo.texture);
  this.transmissionMats.push(this.lensMat);
  this.lens = new THREE.Mesh(geo, this.lensMat);
  this.lens.rotation.x = Math.PI / 2;
  this.lens.renderOrder = 3;
  this.updateLensScale();
  this.displayScene.add(this.lens);

  this.cubeGroup = new THREE.Group();
  var sizes = [0.36, 0.27, 0.19];
  for (var i = 0; i < sizes.length; i++) {
    var cubeMat = createTransmission(this.fbo.texture, {
      thickness: 8,
      chromaticAberration: 0.12,
    });
    this.transmissionMats.push(cubeMat);
    var cube = new THREE.Mesh(new THREE.BoxGeometry(sizes[i], sizes[i], sizes[i]), cubeMat);
    cube.rotation.set(0.45, 0.52 + i * 0.16, 0.22);
    cube.renderOrder = 2;
    this.cubeGroup.add(cube);
  }
  this.cubeGroup.position.set(v.width * 0.06, -v.height * 0.18, LENS_Z);
  this.displayScene.add(this.cubeGroup);
};

HeroFluidGlass.prototype.updateLensScale = function () {
  var v = viewportAt(this.camera, LENS_Z);
  var maxWorld = v.width * 0.9;
  var desired = maxWorld / this.geoWidth;
  var scale = Math.min(0.15, desired);
  this.lens.scale.setScalar(scale);
};

HeroFluidGlass.prototype.resize = function () {
  var w = this.hero.clientWidth;
  var h = this.hero.clientHeight;
  if (!w || !h) return;

  this.renderer.setSize(w, h, false);
  this.camera.aspect = w / h;
  this.camera.updateProjectionMatrix();

  var dpr = this.renderer.getPixelRatio();
  var rw = Math.floor(w * dpr);
  var rh = Math.floor(h * dpr);

  if (!this.fbo) {
    this.fbo = new THREE.WebGLRenderTarget(rw, rh, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
    });
  } else {
    this.fbo.setSize(rw, rh);
  }

  this.buildBgScene();
  if (this.bufferPlane) this.buildDisplayScene();
};

HeroFluidGlass.prototype.bindEvents = function () {
  var self = this;
  this.onMove = function (e) {
    var rect = self.canvas.getBoundingClientRect();
    self.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    self.pointer.y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
  };
  this.hero.addEventListener("mousemove", this.onMove);
  this.hero.addEventListener("mouseleave", function () {
    self.pointer.x = 0;
    self.pointer.y = 0;
  });
  window.addEventListener("resize", function () {
    self.resize();
  });
};

HeroFluidGlass.prototype.animate = function () {
  var self = this;
  this.raf = requestAnimationFrame(function () {
    self.animate();
  });

  var delta = Math.min(this.clock.getDelta(), 0.064);
  var v = viewportAt(this.camera, LENS_Z);

  this.lensDest.x = (this.pointer.x * v.width) / 2;
  this.lensDest.y = (this.pointer.y * v.height) / 2;
  this.lensDest.z = LENS_Z;
  damp3(this.lensPos, this.lensDest, 0.15, delta);
  this.lens.position.copy(this.lensPos);

  var elapsed = this.clock.elapsedTime;
  for (var i = 0; i < this.transmissionMats.length; i++) {
    this.transmissionMats[i].time = elapsed;
    this.transmissionMats[i].buffer = this.fbo.texture;
  }

  if (this.videoTexture) this.videoTexture.needsUpdate = true;

  this.renderer.setRenderTarget(this.fbo);
  this.renderer.setClearColor(0x000000, 1);
  this.renderer.render(this.bgScene, this.camera);

  this.renderer.setRenderTarget(null);
  this.renderer.setClearColor(0x000000, 0);
  this.renderer.render(this.displayScene, this.camera);
};

(function bootstrap() {
  var hero = document.querySelector(".figma-hero-main");
  if (!hero) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

  try {
    new HeroFluidGlass(hero);
  } catch (err) {
    console.warn("[figma-hero-fluid-glass]", err);
  }
})();
