// STORE & FAMILY — 피그마 시안(S&F_store, S&F_family)
//
// 스크롤 흐름 (구간 값은 아래 T 에서 한 번에 조정)
//  1. 타이틀      STORE WORLDWIDE → 글자가 벌어지며 선 지구본(원 + 세로 타원)
//  2. 지구본      noart 레퍼런스 지구본(경위선 + 회색 대륙), 매장이 있는 나라마다 남색 네모, 제자리 자전 (지구본 클릭 = 바로 한반도로)
//  3. 전환        한반도를 정면으로 돌린 뒤 그대로 확대 (지도 전체를 코드로 그려서 확대해도 깨지지 않음)
//                 대륙 면·경위선은 사라지고 한반도 해안선·도 경계선만 남아 라인 지도가 됨
//  4. 한반도 지도  해안선·도 경계선 라인 + 매장 네모 (서울 하나 → 전체). 네모에 마우스 = 시안 매장 카드
//  5. FAMILY      시안 FAMILY 화면, 오른쪽 단어 목록이 위로 흐름 (santalarch 방식)
import * as THREE from 'three';
import { BaseSection } from '../../core/BaseSection.js';
import { ease, seg, lerp, clamp } from '../../core/tween.js';
import { STORES, COUNTRIES, FAMILY } from './data.js';

// ▼ 교체 포인트
const FILES = {
  world: new URL('./data/world.json', import.meta.url).href, // 세계 나라 경계 (Natural Earth 1:50m, 한국·북한 제외, 0.05도 단위 차분 부호화)
  korea: new URL('./data/korea.json', import.meta.url).href, // 한반도 해안선(남해 섬 정리) + 도 경계선 (0.001도 단위 차분 부호화)
  family: 'assets/images/stores/family-billy.webp', // 시안 FAMILY 사진
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
const C = { ivory: '#fcfaf6', line: '#e6e3dd', grat: '#bdb6ab', navy: '#000c44', yellow: '#ffc800', ocean: '#f9f7f2', land: '#dddcd8', edge: '#bebbb5', krEdge: '#b2aea7' };
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
      const [x, y] = mapXY(s.lat, s.lon);
      return `<button type="button" class="sf-pin${s.type === 'popup' ? ' is-popup' : ''}" data-id="${s.id}" aria-label="${s.name} 매장 정보 보기"
        style="left:${((x / MAP.w) * 100).toFixed(3)}%;top:${((y / MAP.h) * 100).toFixed(3)}%"><i></i></button>`;
    }).join('');
    const list = FAMILY.map((w) => `<li>${w}</li>`).join('');
    return /* html */ `
      <div class="sf-reveal">
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
      </article>
    `;
  }

  init() {
    this.dom = {
      w1: this.$('.sf-w1'), w2: this.$('.sf-w2'), cur: this.$('.sf-w2 .cur'), alt: this.$('.sf-w2 .alt'),
      v1: this.$('.sf-vl.v1'), v2: this.$('.sf-vl.v2'), v3: this.$('.sf-vl.v3'), mid: this.$('.sf-h.mid'),
      bar: this.$('.sf-bar'), nav: this.$('.sf-nav'), grid: this.$('.sf-grid'), navBtns: this.$$('.sf-nav button'),
      reveal: this.$('.sf-reveal'), map: this.$('.sf-map'),  pins: this.$$('.sf-pin'),
      card: this.$('.sf-card'), cardName: this.$('.sf-card h3'), cardAddr: this.$('.sf-card p'),
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
      const show = () => { clearTimeout(this.hideT); this.pickStore(store); this.hovering = true; };
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

    // 대륙: noart 레퍼런스처럼 바다 + 회색 대륙 + 나라 경계선. 이미지 대신 지도 좌표로 직접 그림
    this.oceanMat = new THREE.MeshBasicMaterial({ color: C.ocean, transparent: true, opacity: 0 });
    this.globe.add(new THREE.Mesh(new THREE.SphereGeometry(R * 0.999, 128, 96), this.oceanMat));
    this.landMat = new THREE.MeshBasicMaterial({ color: C.land, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
    this.krLandMat = this.landMat.clone();
    this.edgeMat = new THREE.LineBasicMaterial({ color: C.edge, transparent: true, opacity: 0 });
    this.krEdgeMat = new THREE.LineBasicMaterial({ color: C.krEdge, transparent: true, opacity: 0 });
    this.buildMap();
    const grat = [];
    for (let lon = -180; lon < 180; lon += 15) {
      for (let lat = -88; lat < 88; lat += 2) grat.push(latLonToVec3(lat, lon, R * 1.001), latLonToVec3(lat + 2, lon, R * 1.001));
    }
    for (let lat = -75; lat <= 75; lat += 15) {
      for (let lon = -180; lon < 180; lon += 2) grat.push(latLonToVec3(lat, lon, R * 1.001), latLonToVec3(lat, lon + 2, R * 1.001));
    }
    this.gratMat = new THREE.LineBasicMaterial({ color: C.grat, transparent: true, opacity: 0 });
    this.globe.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(grat), this.gratMat));

    // 매장 표시: 매장이 있는 나라마다 남색 네모 하나 (한국은 조금 크게). 점은 화면 px 크기라 확대해도 그대로
    const marks = (list, size) => {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(list.flatMap(([lat, lon]) => latLonToVec3(lat, lon, R * 1.003).toArray()), 3));
      const m = new THREE.PointsMaterial({ size, sizeAttenuation: false, color: C.navy, transparent: true, opacity: 0, depthWrite: false });
      const o = new THREE.Points(geo, m);
      o.renderOrder = 3;
      this.globe.add(o);
      return m;
    };
    this.markMat = marks(COUNTRIES, 7);
    this.markKrMat = marks([[KOREA.lat, KOREA.lon]], 10);
  }

  /** 세계·한반도 지도를 지도 좌표로 그림 (면 = 경위도 평면에서 삼각형으로 나눈 뒤 잘게 쪼개 구에 붙임, 선 = 0.5도 간격으로 구 위를 따라감) */
  async buildMap() {
    let world, korea;
    try {
      [world, korea] = await Promise.all([fetch(FILES.world).then((r) => r.json()), fetch(FILES.korea).then((r) => r.json())]);
    } catch (err) { console.warn('[stores] 지도 데이터를 불러오지 못했습니다', err); return; }
    const decode = (d, unit) => { // 차분 부호화된 [x, y, dx, dy, ...] → [[경도, 위도], ...]
      const out = [];
      let x = 0, y = 0;
      for (let i = 0; i < d.length; i += 2) { x += d[i]; y += d[i + 1]; out.push([x / unit, y / unit]); }
      return out;
    };
    const fill = [], lines = [], krFill = [], krLines = [];
    const add = (a, b) => { for (let i = 0; i < b.length; i++) a.push(b[i]); };
    const fillRings = (rings, out) => {
      const v2 = (r) => r.map(([x, y]) => new THREE.Vector2(x, y));
      const outer = v2(rings[0]), holes = rings.slice(1).map(v2);
      if (outer.length < 3) return;
      let all = outer;
      for (const h of holes) all = all.concat(h);
      const put = (a, b, c, depth) => { // 2.5도보다 긴 변은 반으로 쪼개서 구의 곡면을 따라가게
        const ab = a.distanceTo(b), bc = b.distanceTo(c), ca = c.distanceTo(a), m = Math.max(ab, bc, ca);
        if (m > 2.5 && depth < 7) {
          if (m === ab) { const h = a.clone().lerp(b, 0.5); put(a, h, c, depth + 1); put(h, b, c, depth + 1); }
          else if (m === bc) { const h = b.clone().lerp(c, 0.5); put(a, b, h, depth + 1); put(a, h, c, depth + 1); }
          else { const h = c.clone().lerp(a, 0.5); put(a, b, h, depth + 1); put(h, b, c, depth + 1); }
          return;
        }
        for (const p of [a, b, c]) { const v = latLonToVec3(p.y, p.x, R * 1.0004); out.push(v.x, v.y, v.z); }
      };
      for (const [i, j, k] of THREE.ShapeUtils.triangulateShape(outer, holes)) put(all[i], all[j], all[k], 0);
    };
    const strokeRing = (ring, out, r) => {
      for (let i = 0; i < ring.length - 1; i++) {
        const [x1, y1] = ring[i], [x2, y2] = ring[i + 1];
        if (Math.abs(x1 - x2) > 90) continue; // 날짜변경선
        const n = Math.max(1, Math.ceil(Math.hypot(x2 - x1, y2 - y1) / 0.5));
        for (let k = 0; k < n; k++) {
          const a = latLonToVec3(lerp(y1, y2, k / n), lerp(x1, x2, k / n), r), b = latLonToVec3(lerp(y1, y2, (k + 1) / n), lerp(x1, x2, (k + 1) / n), r);
          out.push(a.x, a.y, a.z, b.x, b.y, b.z);
        }
      }
    };
    for (const poly of world) {
      const rings = poly.map((d) => { const r = decode(d, 20); r.push(r[0]); return r; });
      fillRings(rings, fill);
      for (const r of rings) strokeRing(r, lines, R * 1.0008);
    }
    for (const d of korea.coast) {
      const r = decode(d, 1000); r.push(r[0]);
      fillRings([r], krFill);
      strokeRing(r, krLines, R * 1.0009);
    }
    for (const d of korea.inner) strokeRing(decode(d, 1000), krLines, R * 1.0009);
    const mesh = (pos, mat, order, isLine) => {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      const o = isLine ? new THREE.LineSegments(g, mat) : new THREE.Mesh(g, mat);
      o.renderOrder = order;
      this.globe.add(o);
    };
    mesh(fill, this.landMat, 1); mesh(krFill, this.krLandMat, 1);
    mesh(lines, this.edgeMat, 2, true); mesh(krLines, this.krEdgeMat, 3, true);
  }

  /* ---------------- 매장 카드 ---------------- */
  pickStore(s) {
    if (!s || this.selected === s) return;
    this.selected = s;
    const d = this.dom;
    d.cardName.textContent = s.name;
    d.cardAddr.textContent = s.addr;
    d.pins.forEach((b) => b.classList.toggle('is-sel', b.dataset.id === s.id));
  }

  hideCard() {
    clearTimeout(this.hideT);
    this.hideT = setTimeout(() => { this.hovering = false; }, 220);
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
    const globeOn = fam < 1; // 확대가 끝나도 한반도 선은 3D 그대로 남아 지도가 됨
    this.tilt.visible = globeOn;
    this.face.visible = reveal < 1;
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

    const globeFade = 1 - ease.inOut(seg(reveal, 0.55, 0.95)); // 확대 끝: 바다·대륙 면·경위선은 사라지고 한반도 선만
    this.oceanMat.opacity = this.landMat.opacity = this.krLandMat.opacity = grow * globeFade;
    this.edgeMat.opacity = this.gratMat.opacity = grow * globeFade;
    this.krEdgeMat.opacity = grow;
    this.rimMat.opacity = wire * (1 - reveal);
    this.ovalMat.opacity = wire * (1 - grow);
    const pinsUp = ease.out(seg(pin, T.grow[0] + 0.03, T.grow[1]));
    this.markMat.opacity = pinsUp * (1 - ease.inOut(seg(reveal, 0.2, 0.5)));
    this.markKrMat.opacity = pinsUp * (1 - ease.inOut(seg(reveal, 0.6, 0.9)));

    this.camera.position.set(0, 0, camD);
    this.camera.lookAt(0, 0, 0);

    this.face.quaternion.copy(this.camera.quaternion);
    this.camera.updateProjectionMatrix();
    this.camera.updateMatrixWorld();

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
    d.reveal.style.opacity = '1'; // 매장 네모만 담는 층
    d.reveal.style.visibility = reveal > 0 && fam < 1 ? 'visible' : 'hidden';

    // ---- 평면 지도 (시안 4·5번) ----
    d.map.classList.toggle('is-on', pin > T.map[0] && pin < T.map[1]);
    // 4번에서는 서울(강동) 네모 하나만, 5번에서 나머지가 차례로
    d.pins.forEach((b, i) => {
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
