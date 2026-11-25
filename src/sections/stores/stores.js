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
  korea: 'assets/images/stores/korea-map.png',     // 한반도 망점 지도 (해안선 단순화, 안쪽 큰 점 → 해안 작은 점)
  family: 'assets/images/stores/family-billy.jpg', // 시안 FAMILY 사진
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
const C = { ivory: '#fcfaf6', line: '#d2cdc6', blue: '#0c3494', yellow: '#ffc800', dot: '#c9c3ba' };
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
      // 지도 망점(간격 9)과 같은 칸에 맞춰 그 점을 칠한 것처럼
      const [x, y] = mapXY(s.lat, s.lon).map((v) => 4 + Math.round((v - 4) / 9) * 9);
      return `<button type="button" class="sf-pin${s.type === 'popup' ? ' is-popup' : ''}" data-id="${s.id}" aria-label="${s.name} 매장 정보 보기"
        style="left:${((x / MAP.w) * 100).toFixed(3)}%;top:${((y / MAP.h) * 100).toFixed(3)}%"><i></i></button>`;
    }).join('');
    const list = FAMILY.map((w) => `<li>${w}</li>`).join('');
    return /* html */ `
      <div class="sf-reveal">
        <figure class="sf-map" aria-label="이케아 국내 매장 지도">
          <img src="${FILES.korea}" alt="" />
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
      reveal: this.$('.sf-reveal'), map: this.$('.sf-map'), mapImg: this.$('.sf-map img'), pins: this.$$('.sf-pin'),
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
      const m = new THREE.PointsMaterial({ size, sizeAttenuation: true, map: DOT, vertexColors: true, transparent: true, opacity: 0, depthWrite: false, alphaTest: 0.01 });
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
    this.dotMat = mat(0.065);
    this.storeDotMat = mat(0.065); // 매장 점 = 망점과 같은 크기
    this.buildDots();
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
    const N = 26000, ga = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < N; i++) {
      const y = 1 - (2 * (i + 0.5)) / N, th = ga * i;
      const lat = THREE.MathUtils.radToDeg(Math.asin(y));
      const lon = THREE.MathUtils.radToDeg(Math.atan2(Math.sin(th), Math.cos(th)));
      if (isLand(lat, lon)) land.push(latLonToVec3(lat, lon, R * 1.001));
    }
    const nearest = (lat, lon) => {
      const p = latLonToVec3(lat, lon, R * 1.001);
      let best = 0, bd = Infinity;
      land.forEach((q, i) => { const d = p.distanceToSquared(q); if (d < bd) { bd = d; best = i; } });
      return best;
    };
    const paint = new Map();
    WORLD.forEach(([lat, lon]) => paint.set(nearest(lat, lon), C.blue));
    STORES.forEach((s) => paint.set(nearest(s.lat, s.lon), s.type === 'popup' ? C.yellow : C.blue));
    const build = (pick, material) => {
      const pos = [], cols = [], c = new THREE.Color();
      land.forEach((p, i) => {
        const col = pick(i);
        if (!col) return;
        pos.push(p.x, p.y, p.z);
        c.set(col); cols.push(c.r, c.g, c.b);
      });
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
      this.globe.add(new THREE.Points(geo, material));
    };
    build((i) => !paint.has(i) && C.dot, this.dotMat);
    build((i) => paint.get(i), this.storeDotMat);
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
    this.dom.map.style.setProperty('--dot', `${(2.6 * 2 * k).toFixed(2)}px`); // 지도 망점 지름과 같게
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

    const globeFade = 1 - ease.inOut(seg(reveal, 0.55, 0.95)); // 확대 끝에서 지구본 망점 → 지도 망점
    this.dotMat.opacity = grow * globeFade;
    this.rimMat.opacity = wire * (1 - reveal);
    this.ovalMat.opacity = wire * (1 - grow);
    // 핀이 지구본 안쪽에서 쑥 꽂혀 나옴
    const pinsUp = ease.out(seg(pin, T.grow[0] + 0.03, T.grow[1]));
    this.storeDotMat.opacity = pinsUp * (1 - ease.inOut(seg(reveal, 0.35, 0.8))); // 세계 매장 점은 조금 먼저 사라짐
    // 확대하는 동안 점이 커다랗게 번지지 않게: 화면에서 점 크기를 거의 그대로 (조금씩만 커짐)
    const grow2 = Math.pow((camD - R) / (this.D0 * 0.86 - R), 0.6);
    this.dotMat.size = 0.065 * Math.min(1, grow2);
    this.storeDotMat.size = 0.065 * Math.min(1, grow2);

    this.camera.position.set(0, 0, camD);
    this.camera.lookAt(0, 0, 0);
    this.face.quaternion.copy(this.camera.quaternion);
    this.camera.updateProjectionMatrix();
    this.camera.updateMatrixWorld();
    this.globeCenter.value.copy(this.tilt.position).applyMatrix4(this.camera.matrixWorldInverse); // 가장자리 흐림용

    // ---- 한반도 지도: 확대되는 지구본 위 한반도 자리에 맞춰 붙어서 함께 커짐 ----
    if (reveal > 0 && reveal < 1) {
      this.globe.updateMatrixWorld(true);
      const kp = latLonToVec3(KOREA.lat, KOREA.lon, R).applyMatrix4(this.globe.matrixWorld).project(this.camera);
      const kx = (kp.x * 0.5 + 0.5) * this.vw, ky = (-kp.y * 0.5 + 0.5) * this.vh;
      const nowPx = this.vh / 2 / ((camD - R * s) * t);
      d.map.style.transform = `translate(${(kx - mx).toFixed(1)}px, ${(ky - my).toFixed(1)}px) scale(${(nowPx / endPx).toFixed(4)})`;
    } else {
      d.map.style.transform = '';
    }
    d.reveal.style.opacity = ease.inOut(seg(reveal, 0.45, 0.9)).toFixed(3);
    d.reveal.style.visibility = reveal > 0 && fam < 1 ? 'visible' : 'hidden';

    // ---- 평면 지도 (시안 4·5번) ----
    d.mapImg.style.opacity = lerp(1, 0.6, ease.inOut(at(pin, T.dim)));
    d.map.classList.toggle('is-on', pin > T.map[0] && pin < T.map[1]);
    d.pins.forEach((b, i) => {
      // 4번에서는 서울(강동) 핀 하나만, 5번에서 나머지가 차례로 꽂힘
      const a = b.dataset.id === FIRST ? at(pin, T.first) : seg(pin, T.dim[0] + (i % 6) * 0.006, T.dim[0] + 0.03 + (i % 6) * 0.006);
      b.style.setProperty('--pop', ease.out(a).toFixed(3));
    });
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
