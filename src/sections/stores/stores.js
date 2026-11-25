// STORE & FAMILY — 피그마 시안(S&F_store, S&F_family)
//
// 스크롤 흐름 (구간 값은 아래 T 에서 한 번에 조정)
//  1. 타이틀      STORE WORLDWIDE → 글자가 벌어지며 선 지구본(원 + 세로 타원)
//  2. 지구본      유럽 정면, 대륙은 망점 · 이케아 매장이 있는 점만 파랑, 제자리 자전 (지구본 클릭 = 바로 한반도로)
//  3. 전환        한반도를 정면으로 돌린 뒤 그대로 확대 → 지구본 망점이 같은 투영의 망점 한반도 지도로 이어짐
//  4. 평면 지도    서울 점 하나 → 전체 매장 점 (점에 마우스를 올리거나 누르면 매장 카드)
//  5. FAMILY      시안 FAMILY 화면, 오른쪽 단어 목록이 위로 흐름 (santalarch 방식)
import * as THREE from 'three';
import { BaseSection } from '../../core/BaseSection.js';
import { ease, seg, lerp, clamp } from '../../core/tween.js';
import { STORES, WORLD, FAMILY } from './data.js';

// ▼ 교체 포인트
const FILES = {
  land: 'assets/images/stores/globe-land.png',     // 지구본 대륙 판정용 (Natural Earth, 화면에는 안 보임)
  family: 'assets/images/stores/family-billy.jpg', // 시안 FAMILY 사진
  dots: new URL('./data/korea-dots.json', import.meta.url).href, // 한반도 망점 목록 (지도 이미지와 같은 점)
};

/** 스크롤 구간 (pin 0~1) */
const T = {
  wire: [0.02, 0.08], grow: [0.08, 0.16], spin: [0.16, 0.24], turn: [0.24, 0.33], reveal: [0.33, 0.45],
  first: [0.44, 0.47], dim: [0.47, 0.51], map: [0.49, 0.64],   // map = 평면 지도에서 매장 점을 고를 수 있는 구간
  family: [0.64, 0.72], list: [0.72, 0.99],
};
const GO = { location: 0.18, info: 0.56, family: 0.72 }; // 메뉴로 이동할 위치

// 한반도 지도 이미지 (지구본 정면과 같은 정사영, 3000 × 1400 시안 px, 2배 해상도)
// 중심 (127.8°E, 36.5°N) = (1500, 700), 중심에서 경도 1도 = 150px
const MAP = { w: 3000, h: 1400, cx: 1500, cy: 700, lat0: 36.5, lon0: 127.8, r: 10691.4 };
function mapXY(lat, lon) {
  const p = THREE.MathUtils.degToRad(lat), l = THREE.MathUtils.degToRad(lon - MAP.lon0), p0 = THREE.MathUtils.degToRad(MAP.lat0);
  return [
    MAP.cx + MAP.r * Math.cos(p) * Math.sin(l),
    MAP.cy - MAP.r * (Math.cos(p0) * Math.sin(p) - Math.sin(p0) * Math.cos(p) * Math.cos(l)),
  ];
}

const R = 2;      // 지구본 반지름
const FOV = 30;
const KOREA = { lat: 36.5, lon: 127.8 };
const EUROPE = { lat: 44, lon: 16 };   // 시안 3번 화면에서 정면에 보이는 곳
const FIRST = 'gangdong';              // 시안 4번 화면: 서울에 핀 하나
const DEFAULT = 'pangyo';              // 시안 5번 화면: 처음 보이는 매장 카드
const C = { ivory: '#fcfaf6', line: '#e6e3dd', blue: '#0c3494', yellow: '#ffc800', dot: '#c9c3ba' };
/** 구간 값: keys = [[pin, 값], ...] 사이를 부드럽게 잇습니다 */
function kf(p, keys) {
  if (p <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (p <= keys[i][0]) return lerp(keys[i - 1][1], keys[i][1], ease.inOut(seg(p, keys[i - 1][0], keys[i][0])));
  }
  return keys[keys.length - 1][1];
}
const at = (p, [a, b]) => seg(p, a, b);
function latLonToVec3(lat, lon, r) {
  const phi = THREE.MathUtils.degToRad(90 - lat);
  const theta = THREE.MathUtils.degToRad(lon + 180);
  return new THREE.Vector3(-r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta));
}
/** 해당 지점이 정면(+Z)에 오게 하는 회전값 */
function yawFor(lat, lon) {
  const v = latLonToVec3(lat, lon, 1);
  return -Math.atan2(v.x, v.z);
}
/** 동그란 점 텍스처 (지구본 망점) */
const DOT = (() => {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#fff';
  g.beginPath(); g.arc(32, 32, 28, 0, Math.PI * 2); g.fill();
  const t = new THREE.CanvasTexture(c);
  t.generateMipmaps = false; // 작게 그려도 마름모가 아닌 동그라미로
  t.minFilter = THREE.LinearFilter;
  return t;
})();
/* ---------- 매장 빛 번짐 (시안 C: 안쪽은 진하게 채우고, 가장자리는 점이 흩어지듯) ---------- */
const hash = (x, y) => { const v = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return v - Math.floor(v); };
function vnoise(x, y) { // 부드러운 값 잡음 (-1 ~ 1)
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return (a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v) * 2 - 1;
}
const GLOW = { reach: 3, warp: 4, hover: 1.6 };   // 번짐 반경(망점 칸) · 테두리 일그러짐 · 마우스 올렸을 때 배율
/** (u, v) 칸에서 매장 빛 세기. srcs = [{u, v, pop, k}] (k = 세기 배율 0~), 결과 = 색 또는 null(회색) */
function glowAt(u, v, srcs, reach = GLOW.reach) {
  const wu = u + GLOW.warp * vnoise(u / 3, v / 3) * 0.6, wv = v + GLOW.warp * vnoise((u + 50) / 6, (v + 50) / 6) * 0.6;
  let fb = 0, fy = 0;
  for (const s of srcs) {
    if (!s.k) continue;
    const du = wu - s.u, dv = wv - s.v, r = reach * (s.r || 1);
    if (du * du + dv * dv > 9 * r * r) continue;
    const f = s.k * Math.exp(-(du * du + dv * dv) / (2 * r * r));
    if (s.pop) fy += f; else fb += f;
  }
  const val = Math.min(1, Math.max(fb, fy));
  if (val < 0.03) return null;
  const base = fy > fb ? GLOW_COL.y : GLOW_COL.b;
  if (val > 0.55) return [base, Math.min(1, 0.55 + val * 0.5)];
  if (hash(u + 0.37, v + 0.71) < Math.pow(val / 0.55, 1.4)) return [base, 0.35 + 0.5 * val];
  return null;
}
const GLOW_COL = { b: new THREE.Color('#0c3494'), y: new THREE.Color('#ffc800'), gray: new THREE.Color('#c9c3ba') };
const byId = (id) => STORES.find((s) => s.id === id);
const shortName = (s) => s.name.replace(/^이케아 (팝업 )?/, '');

export class StoresSection extends BaseSection {
  static meta = {
    id: 'stores',
    title: 'Store & Family',
    subtitle: '매장 찾기 · IKEA Family',
    owner: '팀원 D',
    color: '#d8d2c2',
    windowImage: 'assets/images/stores/window.svg',
  };
  static css = new URL('./stores.css', import.meta.url).href;
  static use3D = true;
  static pinned = 14;

  template() {
    const pins = STORES.map((s) => {
      // 지도 망점(간격 6)과 같은 칸 (매장 빛이 번지는 중심, 버튼 자체는 보이지 않음)
      const [x, y] = mapXY(s.lat, s.lon).map((v) => 3 + Math.round((v - 3) / 6) * 6);
      return `<button type="button" class="sf-pin${s.type === 'popup' ? ' is-popup' : ''}" data-id="${s.id}" data-u="${(x - 3) / 6}" data-v="${(y - 3) / 6}" aria-label="${s.name} 매장 정보 보기"
        style="left:${((x / MAP.w) * 100).toFixed(3)}%;top:${((y / MAP.h) * 100).toFixed(3)}%"><i></i></button>`;
    }).join('');
    const list = FAMILY.map((w) => `<li>${w}</li>`).join('');
    return /* html */ `
      <div class="sf-reveal">
        <canvas class="sf-mapcv" aria-hidden="true"></canvas>
        <figure class="sf-map" aria-label="이케아 국내 매장 지도">
          <div class="sf-dots">${pins}</div>
        </figure>
      </div>

      <section class="sf-family" aria-label="IKEA Family 혜택">
        <p class="sf-offers">Store offers<br />IKEA Family</p>
        <figure class="sf-photo"><img src="${FILES.family}" alt="BILLY 책장 조립 설명서와 부품" /></figure>
        <h3 class="sf-special">Special</h3>
        <ul class="sf-list">${list}</ul>
      </section>

      <div class="sf-layer sf-titles" aria-hidden="true">
        <p class="sf-word sf-w1">Store</p>
        <p class="sf-word sf-w2"><span class="cur">Worldwide</span><span class="alt">Korea</span></p>
      </div>

      <div class="sf-layer sf-grid" aria-hidden="true">
        <i class="sf-h top"></i><i class="sf-h mid"></i>
        <i class="sf-vl v1"></i><i class="sf-vl v2"></i><i class="sf-vl v3"></i>
      </div>

      <nav class="sf-layer sf-nav" aria-label="Store & Family 진행">
        <span class="sf-navbg"></span>
        <span class="sf-bar"></span>
        <button type="button" data-go="${GO.location}" style="left:calc(560 * var(--u))">Store location</button>
        <button type="button" data-go="${GO.info}" style="left:calc(959 * var(--u))">Store information</button>
        <button type="button" data-go="${GO.family}" style="left:calc(1360 * var(--u))">IKEA Family service</button>
      </nav>

      <article class="sf-card" aria-live="polite">
        <div><h3></h3><p></p></div>
        <a target="_blank" rel="noopener">View more</a>
      </article>
    `;
  }

  init() {
    this.dom = {
      w1: this.$('.sf-w1'), w2: this.$('.sf-w2'), cur: this.$('.sf-w2 .cur'), alt: this.$('.sf-w2 .alt'),
      v1: this.$('.sf-vl.v1'), v2: this.$('.sf-vl.v2'), v3: this.$('.sf-vl.v3'), mid: this.$('.sf-h.mid'),
      bar: this.$('.sf-bar'), nav: this.$('.sf-nav'), grid: this.$('.sf-grid'), navBtns: this.$$('.sf-nav button'),
      reveal: this.$('.sf-reveal'), map: this.$('.sf-map'), mapCv: this.$('.sf-mapcv'), pins: this.$$('.sf-pin'),
      card: this.$('.sf-card'), cardName: this.$('.sf-card h3'), cardAddr: this.$('.sf-card p'), cardLink: this.$('.sf-card a'),
      family: this.$('.sf-family'), photo: this.$('.sf-photo'), special: this.$('.sf-special'), words: this.$$('.sf-list li'),
    };

    this.camera.fov = FOV;
    this.camera.updateProjectionMatrix();
    this.scene.background = new THREE.Color(C.ivory);
    this.scene.add(new THREE.HemisphereLight('#ffffff', '#cfc9bd', 1.35));
    const sun = new THREE.DirectionalLight('#fffaf0', 1.9);
    sun.position.set(-0.55, 1, 0.35);
    this.scene.add(sun);
    this.buildGlobe();

    this.spin = yawFor(EUROPE.lat, EUROPE.lon);
    this.from = null;
    this.pickStore(byId(DEFAULT) || STORES[0]);

    // 평면 지도 핀: 마우스 = 카드, 클릭 = 매장 정보 패널로
    this.dom.pins.forEach((b) => {
      const store = byId(b.dataset.id);
      const show = () => { clearTimeout(this.hideT); this.pickStore(store); this.hovering = true; this.placeCard(b); };
      const hide = () => this.hideCard();
      b.addEventListener('pointerenter', show);
      b.addEventListener('focus', show);
      b.addEventListener('pointerleave', hide);
      b.addEventListener('blur', hide);
      b.addEventListener('click', (e) => { e.stopPropagation(); show(); }); // 터치 화면에서는 눌러서 카드
    });
    // 카드 위로 마우스를 옮겨도 유지 (VIEW MORE 를 누를 수 있게)
    this.dom.card.addEventListener('pointerenter', () => clearTimeout(this.hideT));
    this.dom.card.addEventListener('pointerleave', () => this.hideCard());
    // 지구본이 자전 중일 때 클릭 → 바로 한반도로
    this.el.addEventListener('click', (e) => {
      if (this.pin > T.grow[0] && this.pin < T.turn[0] && this.ctx.stage.pick(e, this.camera, [this.globeHit])) this.ctx.scroll.scrollTo(T.dim[1] + 0.02);
    });
    this.dom.navBtns.forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); this.ctx.scroll.scrollTo(+b.dataset.go); }));
    this.resize(window.innerWidth, window.innerHeight);
  }

  /* ---------------- 지구본 ---------------- */
  buildGlobe() {
    this.tilt = new THREE.Group();
    this.globe = new THREE.Group();
    this.tilt.add(this.globe);
    this.scene.add(this.tilt);

    // 뒤쪽 선·핀을 가리는 투명 구 (깊이만 씀) — 클릭 판정에도 사용
    this.globeHit = new THREE.Mesh(new THREE.SphereGeometry(R * 0.998, 64, 48), new THREE.MeshBasicMaterial({ colorWrite: false }));
    this.globeHit.renderOrder = -1;
    this.globe.add(this.globeHit);

    // 카메라를 보는 평면 요소: 테두리 원 · 시안 2번 세로 타원
    this.face = new THREE.Group();
    this.scene.add(this.face);
    const circle = [];
    for (let i = 0; i <= 128; i++) { const a = (i / 128) * Math.PI * 2; circle.push(new THREE.Vector3(Math.cos(a) * R, Math.sin(a) * R, 0)); }
    const circleGeo = new THREE.BufferGeometry().setFromPoints(circle);
    this.rimMat = new THREE.LineBasicMaterial({ color: C.line, transparent: true, opacity: 0, depthTest: false });
    this.ovalMat = new THREE.LineBasicMaterial({ color: C.line, transparent: true, opacity: 0, depthTest: false });
    const rim = new THREE.Line(circleGeo, this.rimMat);
    const oval = new THREE.Line(circleGeo, this.ovalMat);
    oval.scale.x = 0.5;
    rim.renderOrder = oval.renderOrder = 3;
    this.face.add(rim, oval);

    // 대륙 = 망점, 매장이 있는 자리의 점만 파랑(정규)·노랑(팝업)으로 칠함
    const mat = (size) => {
      const m = new THREE.PointsMaterial({ size, sizeAttenuation: false, map: DOT, vertexColors: true, transparent: true, opacity: 0, depthWrite: false, alphaTest: 0.01 });
      // 지구본 가장자리로 갈수록 점을 배경색으로 (가장자리에 점이 몰려 진해지지 않게)
      m.onBeforeCompile = (sh) => {
        sh.uniforms.uCenter = this.globeCenter;
        sh.uniforms.uBg = { value: new THREE.Color(C.ivory) };
        sh.vertexShader = sh.vertexShader
          .replace('#include <common>', '#include <common>\nuniform vec3 uCenter;\nvarying float vFace;')
          .replace('#include <project_vertex>', '#include <project_vertex>\nvFace = clamp((dot(normalize(mvPosition.xyz - uCenter), normalize(-mvPosition.xyz)) - 0.12) / 0.38, 0.0, 1.0);');
        sh.fragmentShader = sh.fragmentShader
          .replace('#include <common>', '#include <common>\nuniform vec3 uBg;\nvarying float vFace;')
          .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb = mix(uBg, diffuseColor.rgb, vFace);');
      };
      return m;
    };
    this.globeCenter = { value: new THREE.Vector3() };
    // 점 크기는 화면 px (모든 점 같은 크기, 매장 점도 같은 크기)
    this.dotMat = mat(3);
    this.storeDotMat = mat(3);
    this.koreaMat = mat(1); // 확대할 때 나타나는 한반도 망점 (지도 이미지와 같은 점)
    this.buildDots();
    this.buildKoreaDots();
  }

  /** 육지 위에 고르게 점을 뿌리고 (피보나치 구), 매장과 가장 가까운 점을 칠함 */
  async buildDots() {
    const img = new Image();
    img.src = FILES.land;
    try { await img.decode(); } catch (err) { console.warn('[stores] 지구본 대륙 이미지를 불러오지 못했습니다', err); return; }
    const cv = document.createElement('canvas');
    cv.width = img.width; cv.height = img.height;
    const g = cv.getContext('2d', { willReadFrequently: true });
    g.drawImage(img, 0, 0);
    const px = g.getImageData(0, 0, cv.width, cv.height).data;
    const isLand = (lat, lon) => {
      const x = Math.min(cv.width - 1, Math.floor(((lon + 180) / 360) * cv.width));
      const y = Math.min(cv.height - 1, Math.floor(((90 - lat) / 180) * cv.height));
      return px[(y * cv.width + x) * 4] < 238;
    };
    const land = [];
    const N = 90000, ga = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < N; i++) {
      const y = 1 - (2 * (i + 0.5)) / N, th = ga * i;
      const lat = THREE.MathUtils.radToDeg(Math.asin(y));
      const lon = THREE.MathUtils.radToDeg(Math.atan2(Math.sin(th), Math.cos(th)));
      if (isLand(lat, lon)) land.push(latLonToVec3(lat, lon, R * 1.001));
    }
    // 세계 매장 빛 번짐: 경위도를 망점 칸 단위로 바꿔 지도와 같은 방식으로 계산
    const CELL = 0.68; // 지구본 망점 간격(도)
    const srcs = [
      ...WORLD.map(([lat, lon]) => ({ lat, lon, pop: 0 })),
      ...STORES.map((st) => ({ lat: st.lat, lon: st.lon, pop: st.type === 'popup' ? 1 : 0 })),
    ];
    const gray = [], glow = [], glowCol = [];
    for (const p of land) {
      const lat = 90 - THREE.MathUtils.radToDeg(Math.acos(p.y / (R * 1.001)));
      const lon = THREE.MathUtils.radToDeg(Math.atan2(p.z, -p.x)) - 180;
      const cl = Math.cos(THREE.MathUtils.degToRad(lat));
      const near = srcs.filter((q) => Math.abs(q.lat - lat) < 6).map((q) => {
        let dl = lon - q.lon; dl -= Math.round(dl / 360) * 360;
        return { u: ((lon - dl) * cl) / CELL, v: q.lat / CELL, pop: q.pop, k: 1 };
      });
      const g = near.length ? glowAt((lon * cl) / CELL, lat / CELL, near, 1.2) : null; // 지구본은 매장이 많아 좁게
      gray.push(p);
      if (g) { glow.push(p); const c = GLOW_COL.gray.clone().lerp(g[0], g[1]); glowCol.push(c.r, c.g, c.b); }
    }
    const pts = (list, cols, material, order) => {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(list.flatMap((p) => [p.x, p.y, p.z]), 3));
      geo.setAttribute('color', new THREE.Float32BufferAttribute(cols || list.flatMap(() => [GLOW_COL.gray.r, GLOW_COL.gray.g, GLOW_COL.gray.b]), 3));
      const o = new THREE.Points(geo, material);
      o.renderOrder = order;
      this.globe.add(o);
    };
    pts(gray, null, this.dotMat, 0);
    pts(glow, glowCol, this.storeDotMat, 1); // 매장 빛은 회색 망점 위에 겹쳐 그려서 서서히 나타나게
  }

  /** 지도 이미지의 망점을 그대로 지구본 위에 (정사영을 거꾸로 계산) → 확대 끝에서 지도와 점 하나하나가 겹침 */
  async buildKoreaDots() {
    let data;
    try { data = await (await fetch(FILES.dots)).json(); } catch (err) { console.warn('[stores] 한반도 망점을 불러오지 못했습니다', err); return; }
    const p0 = THREE.MathUtils.degToRad(MAP.lat0), sp0 = Math.sin(p0), cp0 = Math.cos(p0);
    const pos = [], cols = [], c = new THREE.Color(C.dot);
    const half = data.step / 2;
    this.koreaGrid = { step: data.step, r: data.r, cells: [] };
    for (const [j, ...runs] of data.rows) {
      for (let k = 0; k < runs.length; k += 2) {
        for (let i = runs[k]; i < runs[k] + runs[k + 1]; i++) {
          this.koreaGrid.cells.push(i, j);
          const x = (half + i * data.step - MAP.cx) / MAP.r, y = (MAP.cy - half - j * data.step) / MAP.r;
          const rho = Math.hypot(x, y), cc = Math.asin(Math.min(1, rho));
          const lat = rho ? Math.asin(Math.cos(cc) * sp0 + (y * Math.sin(cc) * cp0) / rho) : p0;
          const lon = THREE.MathUtils.degToRad(MAP.lon0) + Math.atan2(x * Math.sin(cc), rho * Math.cos(cc) * cp0 - y * Math.sin(cc) * sp0);
          const v = latLonToVec3(THREE.MathUtils.radToDeg(lat), THREE.MathUtils.radToDeg(lon), R * 1.0015);
          pos.push(v.x, v.y, v.z); cols.push(c.r, c.g, c.b);
        }
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    this.globe.add(new THREE.Points(geo, this.koreaMat));
    this.mapKey = '';
  }

  /** 한반도 망점 지도를 캔버스에 그림 (매장 빛 번짐 포함). 바뀐 게 있을 때만 다시 그림 */
  drawMap(srcs) {
    const g = this.koreaGrid, cv = this.dom.mapCv;
    if (!g || !this.mapAt) return;
    const key = srcs.map((q) => `${q.k.toFixed(3)}:${(q.r || 1).toFixed(3)}`).join('|') + `|${this.vw}x${this.vh}`;
    if (key === this.mapKey) return;
    this.mapKey = key;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (cv.width !== Math.round(this.vw * dpr) || cv.height !== Math.round(this.vh * dpr)) {
      cv.width = Math.round(this.vw * dpr); cv.height = Math.round(this.vh * dpr);
    }
    const x = cv.getContext('2d');
    x.setTransform(dpr, 0, 0, dpr, 0, 0);
    x.clearRect(0, 0, this.vw, this.vh);
    const { k, cx, cy } = this.mapAt, half = g.step / 2, rad = g.r * k;
    const col = new THREE.Color();
    const live = srcs.filter((q) => q.k > 0);
    const groups = new Map(); // 색별로 모아서 한 번에 그림
    for (let n = 0; n < g.cells.length; n += 2) {
      const i = g.cells[n], j = g.cells[n + 1];
      const px = cx + (half + i * g.step - MAP.cx) * k, py = cy + (half + j * g.step - MAP.cy) * k;
      if (px < -4 || py < -4 || px > this.vw + 4 || py > this.vh + 4) continue;
      const hit = live.length ? glowAt(i, j, live) : null;
      const style = hit ? `#${col.copy(GLOW_COL.gray).lerp(hit[0], hit[1]).getHexString()}` : C.dot;
      if (!groups.has(style)) groups.set(style, []);
      groups.get(style).push(px, py);
    }
    for (const [style, list] of groups) {
      x.fillStyle = style;
      x.beginPath();
      for (let n = 0; n < list.length; n += 2) { x.moveTo(list[n] + rad, list[n + 1]); x.arc(list[n], list[n + 1], rad, 0, Math.PI * 2); }
      x.fill();
    }
  }

  /* ---------------- 매장 카드 ---------------- */
  pickStore(s) {
    if (!s || this.selected === s) return;
    this.selected = s;
    const d = this.dom;
    d.cardName.textContent = s.name;
    d.cardAddr.textContent = s.addr;
    d.cardLink.href = s.url;
    d.pins.forEach((b) => b.classList.toggle('is-sel', b.dataset.id === s.id));
  }

  hideCard() {
    clearTimeout(this.hideT);
    this.hideT = setTimeout(() => { this.hovering = false; }, 220);
  }

  /** 매장 카드를 핀 옆에 띄움 (오른쪽에 자리가 없으면 왼쪽) */
  placeCard(pinEl) {
    const host = this.el.getBoundingClientRect();
    const r = pinEl.getBoundingClientRect();
    const card = this.dom.card;
    const w = card.offsetWidth || 320;
    let x = r.right - host.left + 14;
    if (x + w > host.width - 24) x = r.left - host.left - 14 - w;
    card.style.left = `${Math.max(16, x)}px`;
    card.style.top = `${r.top + r.height / 2 - host.top - 10}px`; // 매장 이름 첫 줄이 점과 같은 높이
  }

  leave() {
    this.el.style.cursor = '';
    clearTimeout(this.hideT);
    this.hovering = false;
  }

  resize(w, h) {
    // 지구본 = 시안 800px: 화면 높이의 74% 이면서 가로의 42% 를 넘지 않게 (정사각형 화면에서도 글자와 안 겹침)
    const t = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    this.D0 = Math.max((2 * R) / (0.741 * 2 * t), (2 * R) / (0.417 * 2 * t * (w / h)));
    this.vw = w; this.vh = h;
    // 한반도 지도: 메뉴 아래 높이에 남한(제주 포함)이 다 들어가게, 지도 이미지는 화면을 꽉 채움
    const nav = (96 / 1080) * h;
    const k = Math.min((h - nav) / 1010, w / 1150);
    const cx = (936 / 1920) * w, cy = nav + 392 * k;
    Object.assign(this.dom.map.style, {
      width: `${MAP.w * k}px`, left: `${cx - MAP.cx * k}px`, top: `${cy - MAP.cy * k}px`,
      transformOrigin: `${(MAP.cx / MAP.w) * 100}% ${(MAP.cy / MAP.h) * 100}%`,
    });
    this.mapAt = { k, cx, cy };
    this.dom.map.style.setProperty('--dot', `${(1.5 * 2 * k).toFixed(2)}px`); // 지도 망점 지름과 같게
  }

  /* ---------------- 매 프레임 ---------------- */
  update({ pin, dt, time }) {
    this.pin = pin;
    const d = this.dom;
    const px = (v) => `calc(${v} * var(--u))`;
    this.ctx.minimap?.hide(); // 이 섹션에서는 미니맵을 숨김

    // ---- 구간 진행도 ----
    const wire = at(pin, T.wire);
    const grow = ease.inOut(at(pin, T.grow));
    const turn = ease.inOut(at(pin, T.turn));
    const reveal = ease.inOut(at(pin, T.reveal));
    const fam = ease.inOut(at(pin, T.family));

    // ---- 격자선 · 타이틀 (시안 좌표) ----
    const v1 = kf(pin, [[T.wire[0], 960], [T.wire[1], 860], [T.grow[1], 560], [T.family[0], 560], [T.family[1], 250]]);
    const v3 = kf(pin, [[T.wire[0], 960], [T.wire[1], 1060], [T.grow[1], 1360], [T.family[0], 1360], [T.family[1], 960]]);
    d.v1.style.transform = `translateX(${px(v1)})`;
    d.v2.style.transform = `translateX(${px(960)})`;
    d.v3.style.transform = `translateX(${px(v3)})`;

    const sz = kf(pin, [[T.wire[1], 1], [T.grow[1], 0.5]]);
    const x1 = kf(pin, [[T.wire[0], 590], [T.wire[1], 490], [T.grow[1], 319], [T.reveal[0], 319], [T.reveal[1], 115]]);
    const x2 = kf(pin, [[T.wire[0], 1000], [T.wire[1], 1100], [T.grow[1], 1462], [T.reveal[0], 1462], [T.reveal[1], 1522]]);
    d.w1.style.transform = `translate(${px(x1)}, -50%) scale(${sz})`;
    d.w2.style.transform = `translate(${px(x2)}, -50%) scale(${sz})`;
    const swap = ease.inOut(seg(pin, T.reveal[0], T.reveal[1] - 0.02));
    d.cur.style.opacity = 1 - swap;
    d.alt.style.opacity = swap;
    d.w1.style.opacity = d.w2.style.opacity = 1 - fam;

    // ---- 상단 진행 바 (시안: 559 → 960 → 1541) ----
    let bar = lerp(559, 960, ease.inOut(seg(pin, T.reveal[0], T.reveal[1])));
    bar = lerp(bar, 1541, fam);
    d.bar.style.width = px(bar);
    const step = pin < T.reveal[0] + 0.04 ? 0 : pin < T.family[0] + 0.03 ? 1 : 2;
    d.navBtns.forEach((b, i) => b.classList.toggle('is-on', i === step));
    d.nav.classList.toggle('is-family', fam > 0.5);
    d.grid.classList.toggle('is-family', fam > 0.5);

    // ---- 지구본 ----
    const globeOn = reveal < 1;
    this.tilt.visible = this.face.visible = globeOn;
    this.camera.near = 0.01;
    if (turn <= 0) {
      this.from = null;
      if (pin >= T.spin[0] && pin < T.turn[0]) this.spin += dt * 0.1; // 시안 3번(유럽 정면)에서 출발해 제자리 자전
    } else if (this.from === null) {
      this.from = this.spin;
    }
    let yaw = this.spin;
    if (this.from !== null) {
      const target = yawFor(KOREA.lat, KOREA.lon);
      const k = Math.round((this.from - target) / (Math.PI * 2));
      yaw = lerp(this.from, target + k * Math.PI * 2, turn);
    }
    this.globe.rotation.y = yaw;
    this.tilt.rotation.x = lerp(THREE.MathUtils.degToRad(EUROPE.lat), THREE.MathUtils.degToRad(KOREA.lat), turn);
    const s = lerp(0.27, 1, grow);
    this.tilt.scale.setScalar(s);

    // 한반도를 돌리며 살짝 다가간 뒤(turn), 한반도로 확대(reveal).
    // 확대 끝 = 지구본 위 한반도가 평면 지도와 같은 크기·같은 자리 (지도는 지구본 정면과 같은 정사영)
    const t = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    const { k: mk, cx: mx, cy: my } = this.mapAt;
    const unitPx = (MAP.r / R) * mk;                       // 확대 끝에서 지구본 1 단위 = 화면 px
    const gapA = this.D0 * 0.86 - R, gapB = this.vh / 2 / (t * unitPx); // 카메라 ~ 한반도 표면 거리
    const camD = reveal <= 0 ? lerp(this.D0, this.D0 * 0.86, turn) : R + gapA * Math.pow(gapB / gapA, reveal); // 일정한 속도로 확대
    const startY = -(574 / 1080 - 0.5) * 2 * this.D0 * t;
    const endPx = this.vh / 2 / (gapB * t);
    this.tilt.position.set(
      lerp(0, (mx - this.vw / 2) / endPx, reveal),
      lerp(lerp(startY, startY * 0.4, turn), -(my - this.vh / 2) / endPx, reveal),
      0,
    );
    this.face.position.copy(this.tilt.position);
    this.face.scale.setScalar(s / Math.sqrt(Math.max(0.05, 1 - ((R * s) / camD) ** 2))); // 원근 보정

    const worldFade = 1 - ease.inOut(seg(reveal, 0.3, 0.65)); // 확대하며 세계 망점은 사라지고
    this.dotMat.opacity = grow * worldFade;
    this.koreaMat.opacity = ease.inOut(seg(reveal, 0.08, 0.45)); // 한반도 촘촘한 망점이 나타남
    this.rimMat.opacity = wire * (1 - reveal);
    this.ovalMat.opacity = wire * (1 - grow);
    // 핀이 지구본 안쪽에서 쑥 꽂혀 나옴
    const pinsUp = ease.out(seg(pin, T.grow[0] + 0.03, T.grow[1]));
    this.storeDotMat.opacity = pinsUp * worldFade;
    // 점 크기 (화면 px): 세계 망점은 확대하며 조금 커지고, 한반도 망점은 확대 비율 그대로 커져 끝에서 지도 점과 같아짐
    const zoomNow = this.vh / 2 / ((camD - R * s) * t) / endPx;   // 확대 끝 대비 지금 배율
    this.dotMat.size = this.storeDotMat.size = 3 * (1 + reveal * 0.6);
    this.koreaMat.size = Math.max(0.6, 1.5 * 2 * mk * zoomNow);

    this.camera.position.set(0, 0, camD);
    this.camera.lookAt(0, 0, 0);
    this.face.quaternion.copy(this.camera.quaternion);
    this.camera.updateProjectionMatrix();
    this.camera.updateMatrixWorld();
    this.globeCenter.value.copy(this.tilt.position).applyMatrix4(this.camera.matrixWorldInverse); // 가장자리 흐림용

    // ---- 한반도 지도: 확대 끝에서 3D 한반도 망점과 똑같은 캔버스 지도로 바꿔 끼움 ----
    d.reveal.style.opacity = reveal >= 1 ? '1' : '0';
    d.reveal.style.visibility = reveal > 0 && fam < 1 ? 'visible' : 'hidden';

    // ---- 평면 지도 (시안 4·5번) ----
    d.map.classList.toggle('is-on', pin > T.map[0] && pin < T.map[1]);
    // 4번에서는 서울(강동) 빛 하나만, 5번에서 나머지가 차례로 번짐. 마우스를 올린 매장은 더 넓게 번짐
    const mapLiveNow = pin > T.dim[0] + 0.02 && pin < T.family[0] + 0.01;
    this.hoverAmt = this.hoverAmt || {};
    const srcs = d.pins.map((b, i) => {
      const id = b.dataset.id;
      const a = id === FIRST ? at(pin, T.first) : seg(pin, T.dim[0] + (i % 6) * 0.006, T.dim[0] + 0.03 + (i % 6) * 0.006);
      const want = mapLiveNow && this.hovering && this.selected?.id === id ? 1 : 0;
      const h = (this.hoverAmt[id] = lerp(this.hoverAmt[id] || 0, want, Math.min(1, dt * 10)));
      b.style.setProperty('--pop', ease.out(a).toFixed(3));
      return { u: +b.dataset.u, v: +b.dataset.v, pop: b.classList.contains('is-popup') ? 1 : 0, k: ease.out(a), r: 1 + (GLOW.hover - 1) * ease.inOut(Math.min(1, h)) };
    });
    if (reveal >= 1 && fam < 1) this.drawMap(srcs);
    // 매장 카드: 핀에 마우스를 올렸을 때만
    const mapLive = pin > T.dim[0] + 0.02 && pin < T.family[0] + 0.01;
    d.card.classList.toggle('is-on', mapLive && !!this.hovering);
    d.pins.forEach((b) => b.classList.toggle('is-sel', mapLive && !!this.hovering && b.dataset.id === this.selected?.id));

    // ---- IKEA FAMILY ----
    d.family.style.transform = `translateY(${(1 - fam) * 100}%)`;
    d.family.classList.toggle('is-on', fam > 0.95);
    const famIn = ease.out(seg(pin, T.family[0] + 0.02, T.family[1]));
    d.photo.style.clipPath = `inset(0 ${(1 - famIn) * 100}% 0 0)`;
    d.special.style.transform = `translateX(${px((1 - famIn) * -420)})`;
    // santalarch 방식: 오른쪽 목록이 위로 올라가고, SPECIAL 줄에 닿은 단어가 굵어짐.
    // 아직 줄 아래에 있는 단어는 시안처럼 한 줄에 50px 씩 계단, 줄을 지난 단어는 왼쪽으로 정렬
    const k = ease.inOut(at(pin, T.list)) * (FAMILY.length - 1);
    d.words.forEach((w, i) => {
      const rel = i - k;
      const intro = ease.out(seg(pin, T.family[0] + 0.02 + i * 0.006, T.family[1] + i * 0.006));
      const x = Math.max(0, rel) * 50 + (1 - intro) * (240 + i * i * 46);
      w.style.transform = `translate(${px(x)}, calc(${-k * 166} * var(--f)))`;
      w.style.fontWeight = Math.round(200 + 200 * clamp(1 - Math.abs(rel)));
    });
  }
}
