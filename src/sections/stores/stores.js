// STORE & FAMILY — 지구본 → 한반도 3D 지도(OpenStreetMap 건물) → 매장 카드 → IKEA FAMILY
//
//  pin 0.00 ~ 0.10 : STORE WORLDWIDE 타이틀, 글자가 벌어지며 선 지구본 등장
//  pin 0.10 ~ 0.20 : 지구본이 커지고 대륙·세계 매장 점 등장
//  pin 0.20 ~ 0.30 : 지구본이 제자리에서 계속 자전 (지구본 클릭 시 바로 한반도로)
//  pin 0.30 ~ 0.44 : 지금 보이는 자리에서 가장 짧은 길로 돌아 한반도 정면 + 확대
//  pin 0.40 ~ 0.56 : 지구본이 사라지고 한반도 3D 판 등장 → 비스듬히 기울어짐
//  pin 0.56 ~ 0.78 : 매장 핀 호버 = 카드, 클릭 = 그 동네로 날아가 실제 건물 보기 (Esc / 돌아가기)
//  pin 0.78 ~ 1.00 : IKEA FAMILY 패널이 올라오고 혜택 단어가 계단처럼 들어옴
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { BaseSection } from '../../core/BaseSection.js';
import { loadTexture } from '../../core/assets.js';
import { ease, seg, lerp, clamp } from '../../core/tween.js';
import { STORES, WORLD, FAMILY } from './data.js';

// ▼ 교체 포인트
const FILES = {
  korea: new URL('./data/korea.json', import.meta.url).href,         // 한반도 해안선·시도 경계 (Natural Earth, 통계청)
  buildings: new URL('./data/buildings.json', import.meta.url).href, // 매장 주변 건물 (© OpenStreetMap)
  land: 'assets/images/stores/globe-land.png',                       // 지구본 대륙 텍스처
  family: 'assets/images/stores/family-billy.jpg',                   // FAMILY 사진
};

const R = 2;                    // 지구본 반지름
const FOV = 30;
const KOREA = { lat: 36.5, lon: 127.8 };
const KX = 111.32 * Math.cos(THREE.MathUtils.degToRad(KOREA.lat)); // 경도 1도 = km
const KY = 110.57;
const EXAG = 14;                // 전체 지도에서 도시 건물을 키워 보이는 배율
const C = { ink: '#000c44', ivory: '#fcfaf6', land: '#e4e3df', side: '#d3d1cb', bld: '#f7f6f2', ikea: '#0058a3', red: '#e8321e', pop: '#f4b400', dot: '#0c3494' };

/** 시안 기준 구간 값: keys = [[pin, 값], ...] 사이를 부드럽게 잇습니다 */
function kf(p, keys) {
  if (p <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (p <= keys[i][0]) return lerp(keys[i - 1][1], keys[i][1], ease.inOut(seg(p, keys[i - 1][0], keys[i][0])));
  }
  return keys[keys.length - 1][1];
}
function latLonToVec3(lat, lon, r) {
  const phi = THREE.MathUtils.degToRad(90 - lat);
  const theta = THREE.MathUtils.degToRad(lon + 180);
  return new THREE.Vector3(-r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta));
}
/** 위경도 → 한반도 판 좌표(km). x = 동쪽, z = 남쪽 */
const toMap = (lat, lon) => new THREE.Vector3((lon - KOREA.lon) * KX, 0, -(lat - KOREA.lat) * KY);

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
  static pinned = 12;

  template() {
    const list = FAMILY.map((w, i) => `<li style="padding-left:calc(${i * 50} * var(--u))">${w}</li>`).join('');
    return /* html */ `
      <section class="sf-family" aria-label="IKEA Family 혜택">
        <div class="sf-fam-inner">
          <p class="sf-offers">Store offers<br />IKEA Family</p>
          <figure class="sf-photo"><img src="${FILES.family}" alt="BILLY 책장 조립 설명서와 부품" /></figure>
          <h3 class="sf-special">Special</h3>
          <ul class="sf-list">${list}</ul>
        </div>
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
        <button type="button" data-go="0.2" style="left:calc(560 * var(--u))">Store location</button>
        <button type="button" data-go="0.6" style="left:calc(959 * var(--u))">Store information</button>
        <button type="button" data-go="0.9" style="left:calc(1360 * var(--u))">IKEA Family service</button>
      </nav>

      <div class="sf-layer sf-dots">${STORES.map((s) => `<button type="button" data-id="${s.id}" aria-label="${s.name}"></button>`).join('')}</div>

      <article class="sf-card" aria-live="polite">
        <div><h3></h3><p></p></div>
        <a target="_blank" rel="noopener">View more</a>
      </article>
      <button type="button" class="sf-back">← Korea</button>
      <p class="sf-attr">지도 데이터 © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors · Natural Earth</p>
    `;
  }

  async init() {
    this.dom = {
      w1: this.$('.sf-w1'), w2: this.$('.sf-w2'), cur: this.$('.sf-w2 .cur'), alt: this.$('.sf-w2 .alt'),
      v1: this.$('.sf-vl.v1'), v2: this.$('.sf-vl.v2'), v3: this.$('.sf-vl.v3'),
      bar: this.$('.sf-bar'), navBtns: this.$$('.sf-nav button'),
      card: this.$('.sf-card'), cardName: this.$('.sf-card h3'), cardAddr: this.$('.sf-card p'), cardLink: this.$('.sf-card a'),
      dots: this.$$('.sf-dots button'), back: this.$('.sf-back'), attr: this.$('.sf-attr'),
      family: this.$('.sf-family'), famInner: this.$('.sf-fam-inner'), photo: this.$('.sf-photo'), special: this.$('.sf-special'), words: this.$$('.sf-list li'),
    };

    // 카메라·조명
    this.camera.fov = FOV;
    this.camera.updateProjectionMatrix();
    this.scene.background = new THREE.Color(C.ivory);
    this.fog = this.scene.fog = new THREE.Fog(C.ivory, 1e6, 2e6);
    this.scene.add(new THREE.HemisphereLight('#ffffff', '#cfcac2', 1.6));
    const sun = new THREE.DirectionalLight('#ffffff', 1.5);
    sun.position.set(-0.6, 1, 0.45);
    this.scene.add(sun);

    this.buildGlobe();
    try {
      const [korea, buildings] = await Promise.all([fetch(FILES.korea).then((r) => r.json()), fetch(FILES.buildings).then((r) => r.json())]);
      this.buildKorea(korea, buildings);
    } catch (err) {
      console.warn('[stores] 지도 데이터를 불러오지 못했습니다 — 한반도 지도 없이 진행합니다.', err);
    }

    // 상태
    this.spin = -this.yawFor(48, 12) - 0.4; // 처음엔 유럽 쪽이 보이게
    this.from = null;
    this.hover = null;
    this.selected = STORES[0];
    this.focusId = null;
    this.focusT = 0;
    this.nudge = new THREE.Vector3();
    this.pin = 0;
    this.showCard(this.selected);

    // 입력: 포인터 이동·클릭은 섹션 요소에서만 받습니다 (휠·스크롤은 공통 코어가 처리)
    this.el.addEventListener('click', (e) => this.onClick(e));
    this.dom.dots.forEach((b) => {
      const store = STORES.find((s) => s.id === b.dataset.id);
      b.addEventListener('pointerenter', () => this.setHover(store));
      b.addEventListener('pointerleave', () => this.setHover(null));
      b.addEventListener('focus', () => this.setHover(store));
      b.addEventListener('click', (e) => { e.stopPropagation(); this.focus(store); });
    });
    this.dom.navBtns.forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); this.unfocus(true); this.ctx.scroll.scrollTo(+b.dataset.go); }));
    this.dom.back.addEventListener('click', (e) => { e.stopPropagation(); this.unfocus(); });
    this.dom.card.addEventListener('click', (e) => { if (e.target.closest('a')) e.stopPropagation(); });
    // 동네 보기 중 Esc 는 지도로 돌아가기만 하고, 상세페이지 닫기(Room Atlas)로 이어지지 않게 막음
    this.onKey = (e) => { if (this.active && e.key === 'Escape' && this.focusId) { e.preventDefault(); e.stopPropagation(); this.unfocus(); } };
    window.addEventListener('keydown', this.onKey, true);
    this.resize(window.innerWidth, window.innerHeight);
  }

  /* ---------------- 지구본 ---------------- */
  buildGlobe() {
    this.tilt = new THREE.Group();
    this.globe = new THREE.Group();
    this.tilt.add(this.globe);
    this.scene.add(this.tilt);
    this.globeMats = [];

    // 뒤쪽 선을 가리는 투명 구 (깊이만 씀)
    const occ = new THREE.Mesh(new THREE.SphereGeometry(R * 0.998, 64, 48), new THREE.MeshBasicMaterial({ colorWrite: false }));
    occ.renderOrder = -1;
    this.globe.add(occ);

    const tex = loadTexture(FILES.land);
    tex.anisotropy = 4;
    this.landMat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0, depthWrite: false });
    this.globe.add(new THREE.Mesh(new THREE.SphereGeometry(R, 96, 64), this.landMat));

    // 위경선 (30도 간격)
    const pts = [];
    for (let lon = -180; lon < 180; lon += 30) {
      for (let lat = -88; lat < 88; lat += 4) pts.push(latLonToVec3(lat, lon, R * 1.001), latLonToVec3(lat + 4, lon, R * 1.001));
    }
    for (let lat = -60; lat <= 60; lat += 30) {
      for (let lon = -180; lon < 180; lon += 4) pts.push(latLonToVec3(lat, lon, R * 1.001), latLonToVec3(lat, lon + 4, R * 1.001));
    }
    this.gratMat = new THREE.LineBasicMaterial({ color: '#c9c6bf', transparent: true, opacity: 0 });
    this.globe.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), this.gratMat));

    // 테두리 원 (항상 카메라를 봄)
    const ring = [];
    for (let i = 0; i <= 128; i++) { const a = (i / 128) * Math.PI * 2; ring.push(new THREE.Vector3(Math.cos(a) * R * 1.003, Math.sin(a) * R * 1.003, 0)); }
    this.rimMat = new THREE.LineBasicMaterial({ color: '#b9b5ad', transparent: true, opacity: 0 });
    this.rim = new THREE.Line(new THREE.BufferGeometry().setFromPoints(ring), this.rimMat);
    this.scene.add(this.rim);

    // 매장 점: 세계(남색 네모) + 한국(빨강·노랑 네모)
    const sq = new THREE.PlaneGeometry(0.036, 0.036);
    const dots = [...WORLD.map(([lat, lon]) => ({ lat, lon, color: C.dot })), ...STORES.map((s) => ({ lat: s.lat, lon: s.lon, color: C.dot }))];
    this.dots = dots.map((d, i) => {
      const m = new THREE.Mesh(sq, new THREE.MeshBasicMaterial({ color: d.color, transparent: true, side: THREE.DoubleSide }));
      const p = latLonToVec3(d.lat, d.lon, R * 1.004);
      m.position.copy(p);
      m.lookAt(p.clone().multiplyScalar(2));
      m.userData.delay = (i % 17) / 17;
      this.globe.add(m);
      return m;
    });
    this.globeMats.push(this.landMat, this.gratMat, this.rimMat, ...this.dots.map((d) => d.material));
    this.globeHit = occ;
  }

  /** 해당 경도가 정면(+Z)에 오게 하는 회전값 */
  yawFor(lat, lon) {
    const v = latLonToVec3(lat, lon, 1);
    return -Math.atan2(v.x, v.z);
  }

  /* ---------------- 한반도 3D ---------------- */
  buildKorea(korea, buildings) {
    this.map = new THREE.Group();
    this.map.visible = false;
    this.scene.add(this.map);
    this.mapMats = [];
    const fadeMat = (m) => { m.transparent = true; this.mapMats.push(m); return m; };

    // 땅: 해안선 모양을 두께 8km 로 뽑아 눕힘 (윗면 y = 0)
    const shapes = korea.land.map((ring) => new THREE.Shape(ring.map(([x, y]) => new THREE.Vector2(x, -y))));
    const plate = new THREE.ExtrudeGeometry(shapes, { depth: 8, bevelEnabled: false, curveSegments: 1 });
    plate.rotateX(-Math.PI / 2);
    plate.translate(0, -8, 0);
    const land = new THREE.Mesh(plate, [fadeMat(new THREE.MeshLambertMaterial({ color: C.land })), fadeMat(new THREE.MeshLambertMaterial({ color: C.side }))]);
    this.map.add(land);

    // 시·도 경계 (흰 선)
    const seg2 = [];
    for (const line of korea.borders) for (let i = 1; i < line.length; i++) seg2.push(new THREE.Vector3(line[i - 1][0], 0.25, line[i - 1][1]), new THREE.Vector3(line[i][0], 0.25, line[i][1]));
    this.map.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(seg2), fadeMat(new THREE.LineBasicMaterial({ color: '#ffffff' }))));

    // 매장별 건물 묶음 + 핀
    const bldMat = fadeMat(new THREE.MeshLambertMaterial({ color: C.bld }));
    const ikeaMat = fadeMat(new THREE.MeshLambertMaterial({ color: C.ikea }));
    const unit = (buildings.unit || 2) / 1000, hUnit = (buildings.hUnit || 3) / 1000;
    this.spots = [];
    for (const s of STORES) {
      const at = toMap(s.lat, s.lon);
      const city = new THREE.Group();
      city.position.copy(at);
      city.scale.setScalar(EXAG);
      const raw = buildings.b?.[s.osm || s.id];
      if (raw) {
        const normal = [], ikea = [];
        for (const b of raw.split(';')) {
          const isIkea = b[0] === '*';
          const [h, rest] = b.replace('*', '').split(':');
          let x = 0, y = 0;
          const pts = rest.split(' ').map((p, i) => {
            const [dx, dy] = p.split(',').map(Number);
            x = i ? x + dx : dx; y = i ? y + dy : dy;
            return new THREE.Vector2(x * unit, -y * unit);
          });
          if (pts.length < 3) continue;
          const g = new THREE.ExtrudeGeometry(new THREE.Shape(pts), { depth: Math.max(1, +h) * hUnit, bevelEnabled: false, curveSegments: 1 });
          g.rotateX(-Math.PI / 2);
          g.deleteAttribute('uv');
          (isIkea ? ikea : normal).push(g);
        }
        if (normal.length) city.add(new THREE.Mesh(mergeGeometries(normal), bldMat));
        if (ikea.length) city.add(new THREE.Mesh(mergeGeometries(ikea), ikeaMat));
        [...normal, ...ikea].forEach((g) => g.dispose());
      }
      this.map.add(city);

      this.spots.push({ store: s, at: at.clone().setY(0.3), city });
    }
    this._mapFade = -1;
  }

  setMapOpacity(o) {
    if (!this.map || Math.abs(o - this._mapFade) < 0.001) return;
    const solid = o > 0.999;
    for (const m of this.mapMats) {
      m.opacity = o;
      if (m.transparent === solid) { m.transparent = !solid; m.needsUpdate = true; }
    }
    this._mapFade = o;
  }

  /* ---------------- 입력 ---------------- */
  setHover(store) {
    if (this.hover === store) return;
    this.hover = store;
    this.el.style.cursor = store ? 'pointer' : '';
    if (store) { this.selected = store; this.showCard(store); }
  }

  onClick(e) {
    if (e.target.closest('a, button, .sf-family')) return;
    // 지구본이 자전 중일 때 클릭 → 바로 한반도로
    if (this.pin > 0.12 && this.pin < 0.3) {
      if (this.ctx.stage.pick(e, this.camera, [this.globeHit])) this.ctx.scroll.scrollTo(0.58);
      return;
    }
    if (this.focusId) this.unfocus();
  }

  focus(store) {
    this.focusId = store.id;
    this.selected = store;
    this.showCard(store);
    this.ctx.scroll.lock('stores-focus');
  }

  unfocus(immediate = false) {
    this.focusId = null;
    if (immediate) this.focusT = 0;
    this.ctx.scroll.unlock('stores-focus');
  }

  showCard(s) {
    const d = this.dom;
    d.cardName.textContent = s.name;
    d.cardAddr.textContent = s.addr;
    d.cardLink.href = s.url;
  }

  leave() {
    this.unfocus(true);
    this.setHover(null);
    this.el.style.cursor = '';
  }

  resize(w, h) {
    // 지구본이 화면 높이의 74%(시안 800px / 1080px)를 차지하는 거리. 세로 화면이면 가로 기준으로 맞춤
    const t = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    const byH = (2 * R) / (0.741 * 2 * t);
    const byW = (2 * R) / (0.86 * 2 * t * (w / h));
    this.D0 = Math.max(byH, byW);
    this.aspect = w / h;
  }

  /* ---------------- 매 프레임 ---------------- */
  update({ pin, dt, time }) {
    this.pin = pin;
    const d = this.dom;
    const px = (v) => `calc(${v} * var(--u))`;

    // ---- 격자선 · 타이틀 (시안 좌표) ----
    const v1 = kf(pin, [[0.02, 960], [0.1, 860], [0.2, 560], [0.78, 560], [0.86, 250]]);
    const v3 = kf(pin, [[0.02, 960], [0.1, 1060], [0.2, 1360], [0.78, 1360], [0.86, 960]]);
    d.v1.style.transform = `translateX(${px(v1)})`;
    d.v2.style.transform = `translateX(${px(960)})`;
    d.v3.style.transform = `translateX(${px(v3)})`;

    const fam = ease.inOut(seg(pin, 0.78, 0.86));
    const sz = kf(pin, [[0.1, 1], [0.2, 0.5]]);
    const x1 = kf(pin, [[0.02, 590], [0.1, 490], [0.2, 319], [0.44, 319], [0.52, 115]]);
    const x2 = kf(pin, [[0.02, 1000], [0.1, 1100], [0.2, 1462], [0.44, 1462], [0.52, 1522]]);
    d.w1.style.transform = `translate(${px(x1)}, -50%) scale(${sz})`;
    d.w2.style.transform = `translate(${px(x2)}, -50%) scale(${sz})`;
    const swap = ease.inOut(seg(pin, 0.38, 0.46));
    d.cur.style.opacity = 1 - swap;
    d.alt.style.opacity = swap;
    d.w1.style.opacity = d.w2.style.opacity = 1 - fam;

    // ---- 상단 진행 바 ----
    let bar = lerp(559, 960, ease.inOut(seg(pin, 0.44, 0.56)));
    bar = lerp(bar, 1541, ease.inOut(seg(pin, 0.78, 0.86)));
    d.bar.style.width = px(bar);
    const step = pin < 0.5 ? 0 : pin < 0.82 ? 1 : 2;
    d.navBtns.forEach((b, i) => b.classList.toggle('is-on', i === step));

    // ---- 지구본 ----
    const wire = seg(pin, 0.02, 0.1);
    const grow = ease.inOut(seg(pin, 0.1, 0.2));
    const f = seg(pin, 0.3, 0.44);
    const out = seg(pin, 0.4, 0.46);           // 지구본이 사라짐
    const globeOn = pin < 0.47;
    this.tilt.visible = this.rim.visible = globeOn;

    if (f <= 0) {
      this.from = null;
      if (pin < 0.3) this.spin += dt * 0.12;
    } else if (this.from === null) {
      this.from = this.spin;
    }
    let yaw = this.spin;
    if (this.from !== null) {
      const target = this.yawFor(KOREA.lat, KOREA.lon);
      const k = Math.round((this.from - target) / (Math.PI * 2));
      yaw = lerp(this.from, target + k * Math.PI * 2, ease.inOut(f));
    }
    this.globe.rotation.y = yaw;
    this.tilt.rotation.x = lerp(0.32, THREE.MathUtils.degToRad(KOREA.lat), ease.inOut(f));
    const s = lerp(0.27, 1, grow);
    this.tilt.scale.setScalar(s);
    const visH0 = 2 * this.D0 * Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    const gy = lerp(-(574 / 1080 - 0.5) * visH0, 0, ease.inOut(f));
    this.tilt.position.y = gy;
    this.rim.position.y = gy;
    // 원근 때문에 구의 실루엣이 조금 더 크게 보이므로 테두리를 그만큼 키움
    const camD = lerp(this.D0, R + 0.75, ease.inOut(f));
    this.rim.scale.setScalar(s / Math.sqrt(Math.max(0.05, 1 - ((R * s) / camD) ** 2)));

    const fadeOut = 1 - out;
    const dotK = clamp((camD - R * s) / (this.D0 - R), 0.1, 1); // 확대할수록 점이 커지지 않게
    this.landMat.opacity = grow * fadeOut;
    this.gratMat.opacity = lerp(wire * 0.9, 0.55, grow) * fadeOut;
    this.rimMat.opacity = wire * fadeOut;
    this.dots.forEach((m) => {
      const a = seg(pin, 0.13 + m.userData.delay * 0.06, 0.16 + m.userData.delay * 0.06);
      m.material.opacity = a * fadeOut;
      m.scale.setScalar(Math.max(0.001, ease.out(a) * dotK));
    });

    // ---- 카메라: 지구본 단계 ----
    if (globeOn) {
      const dist = lerp(this.D0, R + 0.75, ease.inOut(f));
      this.camera.up.set(0, 1, 0);
      this.camera.position.set(0, 0, dist);
      this.camera.lookAt(0, 0, 0);
      this.rim.quaternion.copy(this.camera.quaternion);
      this.camera.near = 0.05; this.camera.far = 100;
      this.camera.updateProjectionMatrix();
    }

    // ---- 한반도 ----
    if (this.map) this.updateMap(pin, dt, time, globeOn);

    // ---- 힌트 · 출처 ----
    this.ctx.minimap?.hide(); // 이 섹션에서는 미니맵을 숨김 (나가면 공통 흐름이 다시 보여 줌)
    d.attr.style.opacity = pin > 0.48 && pin < 0.8 ? 1 : 0;

    // ---- IKEA FAMILY ----
    d.family.style.transform = `translateY(${(1 - fam) * 100}%)`;
    d.family.classList.toggle('is-on', fam > 0.95);
    d.photo.style.clipPath = `inset(0 ${(1 - ease.out(seg(pin, 0.83, 0.9))) * 100}% 0 0)`;
    const sp = ease.out(seg(pin, 0.82, 0.9));
    d.special.style.transform = `translateX(${px((1 - sp) * -420)})`;
    d.words.forEach((w, i) => {
      // santalarch 처럼: 처음엔 계단이 크게 벌어져 있다가 스크롤하면 시안의 계단 간격으로 모입니다
      const e = ease.out(seg(pin, 0.82 + i * 0.012, 0.92 + i * 0.012));
      w.style.transform = `translateX(${px((1 - e) * (240 + i * i * 46))})`;
    });
    const lift = ease.inOut(seg(pin, 0.9, 1));
    d.famInner.style.transform = `translateY(calc(${-lift * 640} * var(--v)))`;
  }

  updateMap(pin, dt, time, globeOn) {
    const d = this.dom;
    const appear = seg(pin, 0.47, 0.52);
    const tiltT = ease.inOut(seg(pin, 0.47, 0.58));
    this.map.visible = !globeOn;
    this.setMapOpacity(appear);

    // 포커스(매장 동네로 날아가기) 진행도: 시간 기준
    const want = this.focusId ? 1 : 0;
    this.focusT = clamp(this.focusT + Math.sign(want - this.focusT) * dt / 1.1);
    if (!this.focusId && this.focusT === 0) this.ctx.scroll.unlock('stores-focus');
    const ft = ease.inOut(this.focusT);
    const fStore = STORES.find((s) => s.id === (this.focusId || this.lastFocus)) || this.selected;
    if (this.focusId) this.lastFocus = this.focusId;

    // 전체 지도 자세 (화면 비율에 맞춰 거리 조정)
    const fitH = 700, fitW = 540;
    const t = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    const overDist = Math.max(fitH / (2 * t), fitW / (2 * t * this.aspect)) * 0.98;
    const topDist = 1281 / (2 * t);
    const target = new THREE.Vector3(lerp(0, 10, tiltT), 0, lerp(0, 5, tiltT));
    let polar = lerp(0.0001, THREE.MathUtils.degToRad(34), tiltT);
    let az = 0;
    let dist = lerp(topDist, overDist, tiltT);

    // 핀에 올리면 그쪽으로 살짝 다가감
    const hv = this.hover && !this.focusId ? toMap(this.hover.lat, this.hover.lon) : null;
    const k = 1 - Math.pow(0.002, dt);
    this.nudge.lerp(hv ? hv.sub(target).multiplyScalar(0.12) : new THREE.Vector3(), k);
    target.add(this.nudge);
    dist *= 1 - this.nudge.length() / 4000;

    // 동네 자세로 보간 (거리는 로그 보간이라 줌이 자연스럽게)
    if (ft > 0 && fStore) {
      const at = toMap(fStore.lat, fStore.lon);
      target.lerp(at, ft);
      polar = lerp(polar, THREE.MathUtils.degToRad(52), ft);
      az = lerp(0, 0.5, ft);
      dist = Math.exp(lerp(Math.log(dist), Math.log(2.9), ft));
    }

    // 도시 건물 배율: 포커스한 동네는 실제 크기로
    for (const p of this.spots) p.city.scale.setScalar(p.store.id === fStore?.id ? lerp(EXAG, 1, ft) : EXAG);

    if (!globeOn) {
      this.camera.up.set(0, 0, -1);
      this.camera.position.set(
        target.x + dist * Math.sin(polar) * Math.sin(az),
        dist * Math.cos(polar),
        target.z + dist * Math.sin(polar) * Math.cos(az),
      );
      this.camera.lookAt(target);
      this.camera.near = Math.max(0.0005, dist * 0.002);
      this.camera.far = dist * 6 + 400;
      this.camera.updateProjectionMatrix();
    }
    // 동네 보기에서는 가장자리가 배경색으로 흐려지게 (cheesedesign 느낌)
    this.fog.near = lerp(1e6, dist * 1.05, ft);
    this.fog.far = lerp(2e6, dist * 2.1, ft);

    // 매장 점(시안: 7px 파란 네모, 선택 = 노란 네모) — 3D 위치를 화면 좌표로 옮겨 DOM 으로 그림
    const info = pin > 0.52 && pin < 0.8;
    const tmp = new THREE.Vector3();
    this.spots.forEach((p, i) => {
      const el = d.dots[i];
      const v = tmp.copy(p.at).project(this.camera);
      const on = !globeOn && appear > 0.6 && pin < 0.8 && v.z < 1;
      const pop = seg(pin, 0.5 + (i % 6) * 0.008, 0.53 + (i % 6) * 0.008);
      el.style.transform = `translate(${(v.x * 0.5 + 0.5) * innerWidth}px, ${(-v.y * 0.5 + 0.5) * innerHeight}px) scale(${pop})`;
      el.classList.toggle('is-on', on);
      el.classList.toggle('is-sel', p.store === this.selected);
    });

    // 카드 · 돌아가기
    d.card.classList.toggle('is-on', info);
    d.back.classList.toggle('is-on', !!this.focusId);
  }
}
