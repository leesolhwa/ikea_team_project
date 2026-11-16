// 공통 에셋 로더 + 임시 도형 헬퍼.
// 핵심은 modelSlot(): "임시 도형으로 자리를 잡아 두고, GLB 경로만 넣으면 교체"되는 그릇입니다.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const gltfLoader = new GLTFLoader();
const textureLoader = new THREE.TextureLoader();
const cache = new Map();
const used = new Set();

// Blender에서 Draco 압축으로 내보냈다면 아래 주석을 풀어 주세요.
// import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
// const draco = new DRACOLoader();
// draco.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
// gltfLoader.setDRACOLoader(draco);

/** GLB 로드 (같은 경로는 한 번만 요청) */
export function loadGLB(url) {
  if (!cache.has(url)) cache.set(url, gltfLoader.loadAsync(url));
  return cache.get(url);
}

export function loadTexture(url) {
  const tex = textureLoader.load(url);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * 모델 슬롯: 임시 도형(fallback)을 먼저 보여 주고, url 이 있으면 GLB로 교체합니다.
 *
 *   const sofa = modelSlot({
 *     url: null,                               // ← 모델 준비되면 'assets/models/rooms/sofa.glb'
 *     fallback: box(2, 0.8, 0.9, '#d8c7a8'),   // 임시 도형 (크기·위치의 기준이 됩니다)
 *   });
 *   sofa.position.set(0, 0, -1);               // 위치·회전은 슬롯에 주세요
 *
 * - fit: true 면 GLB를 임시 도형의 크기와 바닥 위치에 자동으로 맞춥니다.
 *   Blender에서 스케일을 정확히 맞춰 내보냈다면 fit: false.
 * - GLB에 애니메이션이 있으면 첫 클립을 자동 재생합니다 (slot.userData.mixer / clips).
 * - 로드에 실패하면 경고만 남기고 임시 도형을 유지합니다.
 */
export function modelSlot({ url = null, fallback, fit = true, name = 'modelSlot' } = {}) {
  const slot = new THREE.Group();
  slot.name = name;
  slot.add(fallback);
  fallback.updateMatrixWorld(true);
  const refBox = new THREE.Box3().setFromObject(fallback);
  slot.userData.isModelSlot = true;
  slot.userData.ready = Promise.resolve(slot);

  if (url) {
    slot.userData.ready = loadGLB(url)
      .then((gltf) => {
        // 같은 GLB를 여러 슬롯에서 쓸 수 있게 복제 (스킨 애니메이션 모델은 SkeletonUtils.clone 사용)
        const model = used.has(url) ? gltf.scene.clone(true) : gltf.scene;
        used.add(url);
        if (fit) fitToBox(model, refBox);
        slot.remove(fallback);
        slot.add(model);
        if (gltf.animations?.length) {
          const mixer = new THREE.AnimationMixer(model);
          mixer.clipAction(gltf.animations[0]).play();
          slot.userData.mixer = mixer;
          slot.userData.clips = gltf.animations;
        }
        return slot;
      })
      .catch((err) => {
        console.warn(`[assets] GLB 로드 실패 → 임시 도형 유지: ${url}`, err);
        return slot;
      });
  }
  return slot;
}

/** model 을 기준 박스(ref)와 같은 크기 · 같은 바닥 중심에 맞춥니다. */
function fitToBox(model, ref) {
  model.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(model);
  const a = ref.getSize(new THREE.Vector3());
  const b = box.getSize(new THREE.Vector3());
  const s = Math.max(a.x, a.y, a.z) / (Math.max(b.x, b.y, b.z) || 1);
  model.scale.multiplyScalar(s);
  model.updateMatrixWorld(true);
  box.setFromObject(model);
  const ca = ref.getCenter(new THREE.Vector3());
  const cb = box.getCenter(new THREE.Vector3());
  model.position.x += ca.x - cb.x;
  model.position.z += ca.z - cb.z;
  model.position.y += ref.min.y - box.min.y;
}

/* ---------- 임시 도형 헬퍼 ---------- */

const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...extra });

/** 바닥(y=0) 위에 놓이는 박스 */
export function box(w, h, d, color = '#cccccc', extra) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color, extra));
  m.position.y = h / 2;
  return m;
}

export function cylinder(rTop, rBottom, h, color = '#cccccc', segments = 32) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBottom, h, segments), mat(color));
  m.position.y = h / 2;
  return m;
}

export function sphere(r, color = '#cccccc') {
  return new THREE.Mesh(new THREE.SphereGeometry(r, 32, 24), mat(color));
}

/** 섹션 공통 기본 조명 */
export function addBasicLights(scene, { ambient = 1.3, sun = 2.0 } = {}) {
  const hemi = new THREE.HemisphereLight(0xffffff, 0x8a8a80, ambient);
  const dir = new THREE.DirectionalLight(0xffffff, sun);
  dir.position.set(4, 8, 6);
  scene.add(hemi, dir);
  return { hemi, dir };
}

/** 임시 도형 위에 붙이는 글자 라벨 (항상 카메라를 바라봄) */
export function labelSprite(text, { color = '#111', bg = 'rgba(255,255,255,.9)', height = 0.35 } = {}) {
  const c = document.createElement('canvas');
  const g = c.getContext('2d');
  const font = '600 44px system-ui, sans-serif';
  g.font = font;
  const w = Math.ceil(g.measureText(text).width) + 48;
  c.width = w; c.height = 80;
  g.font = font;
  g.fillStyle = bg;
  g.beginPath(); g.roundRect(0, 0, w, 80, 40); g.fill();
  g.fillStyle = color;
  g.textBaseline = 'middle';
  g.fillText(text, 24, 42);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
  sprite.scale.set((height * w) / 80, height, 1);
  sprite.renderOrder = 10;
  return sprite;
}
