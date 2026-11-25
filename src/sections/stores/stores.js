// STORE & FAMILY — 피그마 시안(S&F_store, S&F_family) + cheesedesign 식 3D 매장 지도
//
// 스크롤 흐름 (구간 값은 아래 T 에서 한 번에 조정)
//  1. 타이틀      STORE WORLDWIDE → 글자가 벌어지며 선 지구본(원 + 세로 타원)
//  2. 지구본      유럽 정면, 세계 이케아 매장이 반투명 핀으로 솟음, 제자리 자전 (지구본 클릭 = 바로 한반도로)
//  3. 전환        한반도를 정면으로 돌린 뒤, 그 자리에서 원이 퍼지며 시안 평면 지도가 열림
//  4. 평면 지도    서울 핀 하나 → 지도가 연해지고 전체 핀·매장 카드 (핀에 마우스 = 카드, 클릭 = 3D 로 이동)
//  5. 동네 3D     지도가 사라지고 고른 매장 동네가 3D 로 솟아 천천히 돎 (OpenStreetMap 건물)
//  6. 매장 패널    수도권·지방 매장 동네 패널이 올라옴 (클릭 = 그 매장 3D 로)
//  7. FAMILY      시안 FAMILY 화면, 오른쪽 단어 목록이 위로 흐름 (santalarch 방식)
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { BaseSection } from '../../core/BaseSection.js';
import { loadTexture } from '../../core/assets.js';
import { ease, seg, lerp, clamp } from '../../core/tween.js';
import { STORES, WORLD, FAMILY } from './data.js';

// ▼ 교체 포인트
const FILES = {
  land: 'assets/images/stores/globe-land.png',     // 지구본 대륙 텍스처 (Natural Earth)
  korea: 'assets/images/stores/korea-map.png',     // 시안 한반도 지도 (Figma, 1014 × 984)
  family: 'assets/images/stores/family-billy.jpg', // 시안 FAMILY 사진
  panel: (id) => `assets/images/stores/panels/${id}.jpg`, // 매장 동네 패널 (OSM 건물을 미리 렌더링)
  city: new URL('./data/city.json', import.meta.url).href, // 매장 동네 건물 (© OpenStreetMap)
};

/** 스크롤 구간 (pin 0~1) */
const T = {
  wire: [0.02, 0.08], grow: [0.08, 0.16], spin: [0.16, 0.24], turn: [0.24, 0.33], reveal: [0.33, 0.41],
  first: [0.39, 0.43], dim: [0.45, 0.5], map: [0.48, 0.58],   // map = 평면 지도에서 핀을 고를 수 있는 구간
  city: [0.56, 0.62], orbit: [0.62, 0.7], panels: [0.68, 0.74], family: [0.8, 0.87], list: [0.87, 0.99],
};
const GO = { location: 0.18, city: 0.65, panels: 0.76, family: 0.87 }; // 메뉴·클릭으로 이동할 위치

// 시안 지도 이미지의 좌표계: 메르카토르, 경도 1도 = 150px, (127.8°E, 36.5°N) = (504, 405)
const MAP = { w: 1014, h: 984, k: 150, lon0: 127.8, lat0: 36.5, x0: 504, y0: 405 };
const merc = (lat) => THREE.MathUtils.radToDeg(Math.log(Math.tan(Math.PI / 4 + THREE.MathUtils.degToRad(lat) / 2)));
const mapXY = (lat, lon) => [(lon - MAP.lon0) * MAP.k + MAP.x0, -(merc(lat) - merc(MAP.lat0)) * MAP.k + MAP.y0];

const R = 2;      // 지구본 반지름
const FOV = 30;
const KOREA = { lat: 36.5, lon: 127.8 };
const EUROPE = { lat: 44, lon: 16 };   // 시안 3번 화면에서 정면에 보이는 곳
const FIRST = 'gangdong';              // 시안 4번 화면: 서울에 핀 하나
const DEFAULT = 'pangyo';              // 시안 5번 화면: 처음 보이는 매장 카드
const C = { ivory: '#fcfaf6', line: '#d2cdc6', blue: '#0c3494', yellow: '#ffc800', bld: '#fbfaf6' };
const CITY = { dist: 3000, polar: 57, az: 4, pinH: 300 };   // 동네 3D 카메라 (m, 도)
const PANEL_PIN = { gangdong: 0.407, goyang: 0.407 };      // 패널 이미지 속 핀 머리 높이(기본 0.371)
const REGIONS = [
  { name: '수도권', ids: ['gwangmyeong', 'goyang', 'gangdong', 'pangyo', 'songdo', 'giheung'] },
  { name: '지방', ids: ['daegu', 'dongbusan', 'gwangju', 'daejeon', 'cheonan'] },
];

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
      return `<button type="button" class="${s.type === 'popup' ? 'is-popup' : ''}" data-id="${s.id}" aria-label="${s.name} 동네 보기"
        style="left:${((x / MAP.w) * 100).toFixed(2)}%;top:${((y / MAP.h) * 100).toFixed(2)}%"></button>`;
    }).join('');
    const panels = REGIONS.map((r) => `
      <div class="sf-region"><h4>${r.name}</h4>
        ${r.ids.map((id) => {
          const s = byId(id);
          return `<button type="button" class="sf-panel${s.type === 'popup' ? ' is-popup' : ''}" data-id="${id}" style="--top:${((PANEL_PIN[id] || 0.371) * 100).toFixed(1)}%">
            <span class="img"><img src="${FILES.panel(id)}" alt="" loading="lazy" /><i class="pin"></i></span>
            <span class="cap">${shortName(s)}<small>${s.type === 'popup' ? 'Pop-up' : 'Store'}</small></span>
          </button>`;
        }).join('')}
      </div>`).join('');
    const list = FAMILY.map((w) => `<li>${w}</li>`).join('');
    return /* html */ `
      <div class="sf-city" aria-hidden="true"><div class="sf-citylabels"></div><span class="sf-citypin"></span></div>

      <div class="sf-reveal">
        <figure class="sf-map" aria-label="이케아 국내 매장 지도">
          <img src="${FILES.korea}" alt="" />
          <div class="sf-dots">${pins}</div>
        </figure>
      </div>

      <section class="sf-panels" aria-label="지역별 이케아 매장">${panels}</section>

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
        <button type="button" data-go="${GO.city}" style="left:calc(959 * var(--u))">Store information</button>
        <button type="button" data-go="${GO.family}" style="left:calc(1360 * var(--u))">IKEA Family service</button>
      </nav>

      <article class="sf-card" aria-live="polite">
        <div><h3></h3><p></p></div>
        <a target="_blank" rel="noopener">View more</a>
      </article>
      <p class="sf-attr">지도 데이터 © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors</p>
    `;
  }

  init() {
    this.dom = {
      w1: this.$('.sf-w1'), w2: this.$('.sf-w2'), cur: this.$('.sf-w2 .cur'), alt: this.$('.sf-w2 .alt'),
      v1: this.$('.sf-vl.v1'), v2: this.$('.sf-vl.v2'), v3: this.$('.sf-vl.v3'), mid: this.$('.sf-h.mid'),
      bar: this.$('.sf-bar'), nav: this.$('.sf-nav'), grid: this.$('.sf-grid'), navBtns: this.$$('.sf-nav button'),
      reveal: this.$('.sf-reveal'), map: this.$('.sf-map'), mapImg: this.$('.sf-map img'), pins: this.$$('.sf-dots button'),
      city: this.$('.sf-city'), cityLabels: this.$('.sf-citylabels'), cityPin: this.$('.sf-citypin'),
      panels: this.$('.sf-panels'), panelBtns: this.$$('.sf-panel'),
      card: this.$('.sf-card'), cardName: this.$('.sf-card h3'), cardAddr: this.$('.sf-card p'), cardLink: this.$('.sf-card a'),
      attr: this.$('.sf-attr'),
      family: this.$('.sf-family'), photo: this.$('.sf-photo'), special: this.$('.sf-special'), words: this.$$('.sf-list li'),
    };

    this.camera.fov = FOV;
    this.camera.updateProjectionMatrix();
    this.scene.background = new THREE.Color(C.ivory);
    this.scene.add(new THREE.HemisphereLight('#ffffff', '#cfc9bd', 1.35)); // 동네 3D 건물용 (지구본은 조명 영향 없음)
    const sun = new THREE.DirectionalLight('#fffaf0', 1.9);
    sun.position.set(-0.55, 1, 0.35);
    this.scene.add(sun);
    this.buildGlobe();

    this.spin = yawFor(EUROPE.lat, EUROPE.lon);
    this.from = null;
    this.cities = new Map();
    this.cityGroup = new THREE.Group();
    this.cityGroup.visible = false;
    this.scene.add(this.cityGroup);
    this.bldMat = new THREE.MeshLambertMaterial({ color: C.bld });
    this.pickStore(byId(DEFAULT) || STORES[0]);

    // 평면 지도 핀: 마우스 = 카드, 클릭 = 그 매장 동네 3D 로
    this.dom.pins.forEach((b) => {
      const store = byId(b.dataset.id);
      b.addEventListener('pointerenter', () => this.pickStore(store));
      b.addEventListener('focus', () => this.pickStore(store));
      b.addEventListener('click', (e) => { e.stopPropagation(); this.pickStore(store); this.ctx.scroll.scrollTo(GO.city); });
    });
    // 매장 패널: 클릭 = 그 매장 동네 3D 로
    this.dom.panelBtns.forEach((b) => b.addEventListener('click', (e) => {
      e.stopPropagation();
      this.pickStore(byId(b.dataset.id));
      this.ctx.scroll.scrollTo(GO.city);
    }));
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

    const tex = loadTexture(FILES.land);
    tex.anisotropy = 4;
    this.landMat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0, depthWrite: false });
    this.globe.add(new THREE.Mesh(new THREE.SphereGeometry(R, 96, 64), this.landMat));

    // 위경선
    const pts = [];
    for (let lon = -180; lon < 180; lon += 20) {
      for (let lat = -88; lat < 88; lat += 4) pts.push(latLonToVec3(lat, lon, R * 1.001), latLonToVec3(lat + 4, lon, R * 1.001));
    }
    for (let lat = -60; lat <= 75; lat += 15) {
      for (let lon = -180; lon < 180; lon += 4) pts.push(latLonToVec3(lat, lon, R * 1.001), latLonToVec3(lat, lon + 4, R * 1.001));
    }
    this.gratMat = new THREE.LineBasicMaterial({ color: C.line, transparent: true, opacity: 0 });
    this.globe.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), this.gratMat));

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

    // 매장 핀: 표면에서 바깥으로 솟은 가는 기둥 + 반투명 동그란 머리 (겹쳐도 덩어리지지 않게)
    const list = [
      ...WORLD.map(([lat, lon]) => ({ lat, lon, color: C.blue })),
      ...STORES.map((s) => ({ lat: s.lat, lon: s.lon, color: s.type === 'popup' ? C.yellow : C.blue })),
    ];
    const stem = [], heads = [], colors = [];
    const col = new THREE.Color();
    for (const d of list) {
      stem.push(latLonToVec3(d.lat, d.lon, R), latLonToVec3(d.lat, d.lon, R * 1.03));
      const h = latLonToVec3(d.lat, d.lon, R * 1.032);
      heads.push(h.x, h.y, h.z);
      col.set(d.color);
      colors.push(col.r, col.g, col.b);
    }
    this.stemMat = new THREE.LineBasicMaterial({ color: C.blue, transparent: true, opacity: 0 });
    this.stems = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(stem), this.stemMat);
    this.globe.add(this.stems);
    const dot = document.createElement('canvas');
    dot.width = dot.height = 64;
    const g = dot.getContext('2d');
    g.fillStyle = '#fff';
    g.beginPath(); g.arc(32, 32, 28, 0, Math.PI * 2); g.fill();
    const headGeo = new THREE.BufferGeometry();
    headGeo.setAttribute('position', new THREE.Float32BufferAttribute(heads, 3));
    headGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    this.headMat = new THREE.PointsMaterial({
      size: 0.042, sizeAttenuation: true, map: new THREE.CanvasTexture(dot), vertexColors: true,
      transparent: true, opacity: 0, depthWrite: false, alphaTest: 0.02,
    });
    this.globe.add(new THREE.Points(headGeo, this.headMat));
  }

  /* ---------------- 매장 카드 · 동네 3D ---------------- */
  pickStore(s) {
    if (!s) return;
    this.selected = s;
    const d = this.dom;
    d.cardName.textContent = s.name;
    d.cardAddr.textContent = s.addr;
    d.cardLink.href = s.url;
    d.pins.forEach((b) => b.classList.toggle('is-sel', b.dataset.id === s.id));
    d.panelBtns.forEach((b) => b.classList.toggle('is-sel', b.dataset.id === s.id));
    this.showCity(s.id);
  }

  loadCities() {
    if (!this._cityData) {
      this._cityData = fetch(FILES.city).then((r) => r.json())
        .catch((err) => { console.warn('[stores] 동네 건물 데이터를 불러오지 못했습니다', err); return {}; });
    }
    return this._cityData;
  }

  /** 한 매장 동네의 건물을 한 덩어리로 만듭니다 (매장마다 처음 한 번만) */
  async buildCity(id) {
    if (this.cities.has(id)) return this.cities.get(id);
    const data = (await this.loadCities())[id];
    const group = new THREE.Group();
    if (data) {
      const geos = [];
      for (const b of data.b.split(';')) {
        if (!b) continue;
        const [head, rest] = b.replace('*', '').split(':');
        let h = parseInt(head, 10) || 0;
        let x = 0, y = 0;
        const pts = rest.split(' ').map((p, i) => {
          const [dx, dy] = p.split(',').map(Number);
          x = i ? x + dx : dx; y = i ? y + dy : dy;
          return new THREE.Vector2(x, -y);
        });
        if (pts.length < 3) continue;
        if (!h) {
          const area = Math.abs(THREE.ShapeUtils.area(pts));
          h = head.endsWith('a') ? 55 : head.endsWith('h') ? 7 : area > 5000 ? 24 : area > 1500 ? 16 : area > 300 ? 11 : 7;
        }
        const geo = new THREE.ExtrudeGeometry(new THREE.Shape(pts), { depth: h, bevelEnabled: false, curveSegments: 1 });
        geo.rotateX(-Math.PI / 2);
        geo.deleteAttribute('uv');
        geos.push(geo);
      }
      if (geos.length) group.add(new THREE.Mesh(mergeGeometries(geos), this.bldMat));
      geos.forEach((geo) => geo.dispose());
    }
    const city = { group, stations: data?.st || [] };
    this.cities.set(id, city);
    return city;
  }

  /** 고른 매장의 동네를 3D 무대에 올립니다 */
  async showCity(id) {
    this.cityId = id;
    const city = await this.buildCity(id);
    if (this.cityId !== id) return; // 그사이 다른 매장을 고른 경우
    this.cityGroup.clear();
    this.cityGroup.add(city.group);
    this.cityStations = city.stations;
    this.dom.cityLabels.innerHTML = city.stations
      .map(([name], i) => `<span class="lab" data-i="${i}"><i></i>${name.replace(/역$/, '')}</span>`).join('');
  }

  leave() {
    this.el.style.cursor = '';
  }

  resize(w, h) {
    // 지구본 = 시안 800px: 화면 높이의 74% 이면서 가로의 42% 를 넘지 않게 (정사각형 화면에서도 글자와 안 겹침)
    const t = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    this.D0 = Math.max((2 * R) / (0.741 * 2 * t), (2 * R) / (0.417 * 2 * t * (w / h)));
    this.vw = w; this.vh = h;
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
    const cityIn = ease.inOut(at(pin, T.city));
    const panelsIn = ease.inOut(at(pin, T.panels));
    const fam = ease.inOut(at(pin, T.family));

    // ---- 격자선 · 타이틀 (시안 좌표) ----
    const v1 = kf(pin, [[T.wire[0], 960], [T.wire[1], 860], [T.grow[1], 560], [T.family[0], 560], [T.family[1], 250]]);
    const v3 = kf(pin, [[T.wire[0], 960], [T.wire[1], 1060], [T.grow[1], 1360], [T.family[0], 1360], [T.family[1], 960]]);
    d.v1.style.transform = `translateX(${px(v1)})`;
    d.v2.style.transform = `translateX(${px(960)})`;
    d.v3.style.transform = `translateX(${px(v3)})`;
    const gridDim = panelsIn * (1 - fam);  // 매장 패널 화면에서는 세로선·가운데 선을 숨김
    d.v1.style.opacity = d.v3.style.opacity = d.mid.style.opacity = 1 - gridDim;
    d.v2.style.opacity = 1 - gridDim;

    const sz = kf(pin, [[T.wire[1], 1], [T.grow[1], 0.5]]);
    const x1 = kf(pin, [[T.wire[0], 590], [T.wire[1], 490], [T.grow[1], 319], [T.reveal[0], 319], [T.reveal[1], 115]]);
    const x2 = kf(pin, [[T.wire[0], 1000], [T.wire[1], 1100], [T.grow[1], 1462], [T.reveal[0], 1462], [T.reveal[1], 1522]]);
    d.w1.style.transform = `translate(${px(x1)}, -50%) scale(${sz})`;
    d.w2.style.transform = `translate(${px(x2)}, -50%) scale(${sz})`;
    const swap = ease.inOut(seg(pin, T.reveal[0], T.reveal[1] - 0.02));
    d.cur.style.opacity = 1 - swap;
    d.alt.style.opacity = swap;
    d.w1.style.opacity = d.w2.style.opacity = (1 - panelsIn) * (1 - fam);

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

    const t = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    const camD = lerp(this.D0, this.D0 * 0.86, turn); // 한반도를 돌리며 살짝만 다가감
    const startY = -(574 / 1080 - 0.5) * 2 * this.D0 * t;
    this.tilt.position.set(0, lerp(startY, startY * 0.4, turn), 0);
    this.face.position.copy(this.tilt.position);
    this.face.scale.setScalar(s / Math.sqrt(Math.max(0.05, 1 - ((R * s) / camD) ** 2))); // 원근 보정

    this.landMat.opacity = grow;
    this.gratMat.opacity = 0.85 * grow;
    this.rimMat.opacity = wire;
    this.ovalMat.opacity = wire * (1 - grow);
    const pinsUp = ease.out(seg(pin, T.grow[0] + 0.03, T.grow[1]));
    this.headMat.opacity = 0.62 * pinsUp;
    this.headMat.size = 0.042 * pinsUp;
    this.stemMat.opacity = 0.35 * pinsUp;
    this.stems.scale.setScalar(1);

    // ---- 동네 3D (평면 지도 다음, 스크롤로 진행) ----
    const cityOn = cityIn > 0 && panelsIn < 1 && fam < 1;
    this.cityGroup.visible = cityOn;
    if (cityOn) {
      // 위에서 내려다보다가 비스듬히 내려앉고, 머무는 동안 천천히 돎
      const orbit = at(pin, T.orbit);
      const pol = THREE.MathUtils.degToRad(lerp(18, CITY.polar, cityIn));
      const az = THREE.MathUtils.degToRad(CITY.az + orbit * 18 + Math.sin(time * 0.15) * 1.5);
      const dist = CITY.dist * Math.max(1, 1.5 / (this.vw / this.vh)) * lerp(1.6, 1, cityIn); // 세로로 긴 화면이면 조금 멀리
      this.camera.position.set(dist * Math.sin(pol) * Math.sin(az), dist * Math.cos(pol), dist * Math.sin(pol) * Math.cos(az));
      this.camera.lookAt(0, 0, 420 * cityIn); // 매장이 카드보다 위에 보이게
      this.camera.near = 10; this.camera.far = 20000;
    } else {
      this.camera.position.set(0, 0, camD);
      this.camera.lookAt(0, 0, 0);
      this.camera.near = 0.01; this.camera.far = 100;
    }
    this.face.quaternion.copy(this.camera.quaternion);
    this.camera.updateProjectionMatrix();

    // ---- 지도가 원형으로 열림 (원의 중심 = 지구본 위 한반도의 화면 위치) ----
    if (globeOn) {
      this.globe.updateMatrixWorld(true);
      const kp = latLonToVec3(KOREA.lat, KOREA.lon, R).applyMatrix4(this.globe.matrixWorld).project(this.camera);
      this.revealAt = [(kp.x * 0.5 + 0.5) * this.vw, (-kp.y * 0.5 + 0.5) * this.vh];
    }
    const [cx, cy] = this.revealAt || [this.vw / 2, this.vh / 2];
    const far = Math.hypot(Math.max(cx, this.vw - cx), Math.max(cy, this.vh - cy));
    d.reveal.style.clipPath = reveal >= 1 ? 'none' : `circle(${(reveal * far).toFixed(1)}px at ${cx.toFixed(1)}px ${cy.toFixed(1)}px)`;
    d.reveal.style.visibility = reveal > 0 && cityIn < 1 ? 'visible' : 'hidden';
    d.reveal.style.opacity = 1 - cityIn;

    // ---- 평면 지도 (시안 4·5번) ----
    d.mapImg.style.opacity = lerp(1, 0.6, ease.inOut(at(pin, T.dim)));
    d.map.classList.toggle('is-on', pin > T.map[0] && pin < T.map[1]);
    d.pins.forEach((b, i) => {
      // 4번에서는 서울(강동) 핀 하나만, 5번에서 나머지가 차례로 등장
      const a = b.dataset.id === FIRST ? at(pin, T.first) : seg(pin, T.dim[0] + (i % 6) * 0.006, T.dim[0] + 0.03 + (i % 6) * 0.006);
      b.style.setProperty('--pop', ease.out(a).toFixed(3));
    });
    const cardOn = pin > T.dim[0] + 0.02 && pin < T.panels[0] + 0.02;
    d.card.classList.toggle('is-on', cardOn);

    // ---- 동네 3D 표시 (핀 · 역 이름 · 가장자리를 배경색으로 흐리게) ----
    const cityShow = cityIn * (1 - panelsIn);
    d.city.style.opacity = cityShow;
    d.attr.style.opacity = Math.max(cityShow, panelsIn * (1 - fam));
    if (cityOn && this.cityStations) {
      const v = new THREE.Vector3();
      const toScreen = (x, y, z) => { v.set(x, y, z).project(this.camera); return [(v.x * 0.5 + 0.5) * this.vw, (-v.y * 0.5 + 0.5) * this.vh, v.z]; };
      const [, gy] = toScreen(0, 0, 0);
      const [hx, hy] = toScreen(0, CITY.pinH, 0);
      d.cityPin.style.transform = `translate(${hx}px, ${hy}px)`;
      d.cityPin.style.height = `${Math.max(0, gy - hy)}px`;
      d.cityPin.classList.toggle('is-popup', this.selected?.type === 'popup');
      const cr = d.card.getBoundingClientRect();
      const hostR = this.el.getBoundingClientRect();
      [...d.cityLabels.children].forEach((el) => {
        const [, x, y] = this.cityStations[+el.dataset.i];
        const [sx, sy, z] = toScreen(x, 0, y);
        const nx = sx / this.vw - 0.5, ny = sy / this.vh - 0.55;
        el.style.transform = `translate(${sx}px, ${sy}px)`;
        const onCard = sx + hostR.left > cr.left - 20 && sx + hostR.left < cr.right + 20 && sy + hostR.top > cr.top - 20 && sy + hostR.top < cr.bottom + 20;
        el.style.opacity = z < 1 && !onCard && nx * nx + ny * ny < 0.045 ? 1 : 0;
      });
    }

    // ---- 매장 패널 (아래에서 올라옴) ----
    d.panels.style.transform = `translateY(${(1 - panelsIn) * 100}%)`;
    d.panels.classList.toggle('is-on', panelsIn > 0.95 && fam < 0.05);

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
