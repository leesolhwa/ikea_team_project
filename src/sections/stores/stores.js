// STORE & FAMILY — 피그마 시안(S&F_store, S&F_family)
//
// 스크롤 흐름 (구간 값은 아래 T 에서 한 번에 조정)
//  1. 타이틀      STORE WORLDWIDE → 글자가 벌어지며 선 지구본(원 + 세로 타원)
//  2. 지구본      noart 레퍼런스 지구본(경위선 + 회색 대륙), 매장이 있는 나라마다 남색 점, 제자리 자전 (지구본 클릭 = 바로 한반도로)
//  3. 전환        한반도를 정면으로 돌린 뒤 그대로 확대 (지도 전체를 코드로 그려서 확대해도 깨지지 않음)
//                 대륙 면·경위선은 사라지고 한반도 해안선·도 경계선만 남아 라인 지도가 됨
//  4. 한반도 지도  해안선·도 경계선 라인 + 매장 점 (서울 하나 → 전체). 점에 마우스 = 시안 매장 카드
//     점 클릭 = 그 매장 동네 3D 지도 (오픈스트리트맵 건물·길·하천, 반경 2.2km). 닫기·Esc = 다시 한반도 지도
//  5. FAMILY      시안 FAMILY 화면, 오른쪽 단어 목록이 위로 흐름 (santalarch 방식)
import * as THREE from 'three';
import { BaseSection } from '../../core/BaseSection.js';
import { ease, seg, lerp, clamp } from '../../core/tween.js';
import { STORES, FAMILY } from './data.js';

// ▼ 교체 포인트
const FILES = {
  world: new URL('./data/world.json', import.meta.url).href, // 세계 나라 경계 (Natural Earth 1:50m, 한국·북한 제외, 0.05도 단위 차분 부호화)
  korea: new URL('./data/korea.json', import.meta.url).href, // 한반도 해안선(남해 섬 정리) + 도 경계선 (0.001도 단위 차분 부호화)
  family: 'assets/images/stores/family-billy.webp', // 시안 FAMILY 사진
  // 매장 동네 3D 지도 데이터 (매장마다 한 파일, 누를 때만 불러옴)
  // © OpenStreetMap contributors (ODbL). 매장 중심 기준 m 단위 차분 부호화. 다시 받는 방법은 README 참고
  city: (id) => new URL(`./data/city/${id}.json`, import.meta.url).href,
};

/** 매장 동네 3D 지도 모양 (시안 확정값) */
const CITY = {
  fov: 24, dist: 6000, pitch: 60, yaw: 10,          // 카메라: 거리(m) · 내려다보는 각도 · 방향
  fadeIn: 1300, fadeOut: 2150,                      // 이 반경(m)부터 바탕으로 서서히 사라짐
  building: '#f8f6f2', road: '#efece6', water: '#f0ede8', park: '#f8f6f2',
  hemi: 2.7, sun: 0.2,                              // 그림자 약하게 (대비 낮춤)
  road_w: { m: 22, p: 16, t: 11, r: 6, s: 3.5, x: 4 }, // 길 폭(m): 고속도로·큰길·중간길·골목·진입로·철도
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
/** 여러 도형을 한 덩어리로 (그리는 횟수를 줄여 가볍게). 위치·법선만 씀 */
function mergeAll(geos) {
  // 모양이 꼬인 건물 외곽선은 좌표가 NaN 이 될 수 있어 빼고 합침
  const parts = geos.map((g) => (g.index ? g.toNonIndexed() : g)).filter((g) => !g.attributes.position.array.some(Number.isNaN));
  let n = 0;
  for (const g of parts) n += g.attributes.position.count;
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3);
  let o = 0;
  for (const g of parts) {
    if (!g.attributes.normal) g.computeVertexNormals();
    pos.set(g.attributes.position.array, o * 3);
    nor.set(g.attributes.normal.array, o * 3);
    o += g.attributes.position.count;
    g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  return out;
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

      <div class="sf-city" aria-hidden="true"></div>
      <button type="button" class="sf-close">지도로 돌아가기 <i></i></button>
      <p class="sf-osm">지도 데이터 © OpenStreetMap contributors</p>

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
      city: this.$('.sf-city'), close: this.$('.sf-close'), osm: this.$('.sf-osm'),
      family: this.$('.sf-family'), photo: this.$('.sf-photo'), special: this.$('.sf-special'), words: this.$$('.sf-list li'),
    };

    this.camera.fov = FOV;
    this.camera.updateProjectionMatrix();
    this.scene.background = null; // 캔버스를 투명하게: 뒤에 깐 격자선이 비쳐 보이게 (배경색은 화면 바탕이 담당)
    this.hemi = new THREE.HemisphereLight('#ffffff', '#cfc9bd', 1.35);
    this.scene.add(this.hemi);
    const sun = this.sun = new THREE.DirectionalLight('#fffaf0', 1.9);
    sun.position.set(-0.55, 1, 0.35);
    this.scene.add(sun);
    this.cityK = 0; // 0 = 한반도 지도, 1 = 매장 동네 3D
    this.far0 = this.camera.far;
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
      b.addEventListener('click', (e) => { e.stopPropagation(); show(); this.openCity(store); }); // 클릭 = 그 매장 동네 3D 지도
    });
    // 카드 위로 마우스를 옮겨도 유지 (VIEW MORE 를 누를 수 있게)
    this.dom.card.addEventListener('pointerenter', () => clearTimeout(this.hideT));
    this.dom.card.addEventListener('pointerleave', () => this.hideCard());
    // 지구본이 자전 중일 때 클릭 → 바로 한반도로
    this.el.addEventListener('click', (e) => {
      if (this.pin > T.grow[0] && this.pin < T.turn[0] && this.ctx.stage.pick(e, this.camera, [this.globeHit])) this.ctx.scroll.scrollTo(T.dim[1] + 0.02);
    });
    this.dom.navBtns.forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); this.closeCity(); this.ctx.scroll.scrollTo(+b.dataset.go); }));
    this.dom.close.addEventListener('click', (e) => { e.stopPropagation(); this.closeCity(); });
    this.onKey = (e) => { if (e.key === 'Escape' && this.cityOn) { e.preventDefault(); e.stopPropagation(); this.closeCity(); } }; // Esc: 창을 닫지 않고 지도로만 돌아감
    // 격자선은 항상 콘텐츠 뒤 배경: 3D 캔버스보다도 아래층으로 옮김 (같은 .sec-stores 변수·스타일을 쓰도록 감싸서)
    this.under = document.createElement('div');
    this.under.className = 'sec-stores sf-under';
    this.under.setAttribute('aria-hidden', 'true');
    this.under.append(this.dom.grid);
    const cv = this.ctx.stage?.canvas;
    if (cv?.parentNode) cv.parentNode.insertBefore(this.under, cv); else this.el.prepend(this.under);
    this.under.hidden = true;
    this.resize(window.innerWidth, window.innerHeight);
  }

  enter() {
    this.under.hidden = false;
    window.addEventListener('keydown', this.onKey, true);
  }

  /* ---------------- 매장 동네 3D 지도 ---------------- */
  async openCity(store) {
    if (this.cityOn && this.cityStore === store) return;
    this.cityOn = true;
    this.cityStore = store;
    this.ctx.scroll.lock('stores-city'); // 3D 지도를 보는 동안 스크롤로 다른 장면으로 넘어가지 않게
    this.hovering = false;
    if (this.cityId === store.id) return;
    try {
      const data = await (await fetch(FILES.city(store.id))).json();
      if (this.cityStore !== store) return; // 불러오는 사이 다른 매장을 눌렀으면 버림
      this.disposeCity();
      this.city = this.buildCity(data, store);
      this.cityId = store.id;
      this.scene.add(this.city);
    } catch (err) {
      console.warn('[stores] 동네 지도를 불러오지 못했습니다:', err);
      this.closeCity();
    }
  }

  closeCity() {
    if (!this.cityOn) return;
    this.cityOn = false;
    this.ctx.scroll.unlock('stores-city');
  }

  disposeCity() {
    if (!this.city) return;
    this.scene.remove(this.city);
    this.city.traverse((o) => { o.geometry?.dispose(); o.material?.dispose(); });
    this.city = null;
    this.cityId = null;
  }

  buildCity(data, store) {
    const group = new THREE.Group();
    this.cityMats = [];
    // 반경이 멀어질수록 투명해지는 재질 (가장자리가 바탕으로 녹아듦, 뒤 격자선이 비침)
    const fadeMat = (mat) => {
      mat.transparent = true;
      mat.onBeforeCompile = (sh) => {
        sh.uniforms.uFade = { value: new THREE.Vector3(CITY.fadeIn, CITY.fadeOut, 0) };
        mat.userData.sh = sh;
        sh.vertexShader = sh.vertexShader
          .replace('#include <common>', '#include <common>\nvarying vec2 vCityXZ;')
          .replace('#include <begin_vertex>', '#include <begin_vertex>\nvCityXZ = (modelMatrix * vec4(transformed, 1.0)).xz;');
        sh.fragmentShader = sh.fragmentShader
          .replace('#include <common>', '#include <common>\nvarying vec2 vCityXZ;\nuniform vec3 uFade;')
          .replace('#include <dithering_fragment>', '#include <dithering_fragment>\ngl_FragColor.a *= 1.0 - smoothstep(uFade.x, uFade.y, length(vCityXZ));');
      };
      this.cityMats.push(mat);
      return mat;
    };
    // 차분 부호화 풀기: "머리:x,y dx,dy ..." 를 ; 로 이어 붙인 문자열
    const decode = (str, head) => (str ? str.split(';') : []).filter(Boolean).map((t) => {
      const m = t.match(head);
      let x = 0, y = 0;
      const pts = m[2].split(' ').map((q, i) => {
        const [dx, dy] = q.split(',').map(Number);
        x = i ? x + dx : dx; y = i ? y + dy : dy;
        return [x, y];
      });
      return [m[1], pts];
    });

    // 바닥: 공원 → 하천 → 길 순서로 얇게 (건물보다 먼저 그려서 항상 건물 아래)
    const flat = (str, color, order) => {
      const geos = [];
      for (const [, pts] of decode(str, /^()(.*)$/)) {
        if (pts.length < 3) continue;
        const g = new THREE.ShapeGeometry(new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, -y))));
        g.rotateX(-Math.PI / 2);
        geos.push(g);
      }
      if (!geos.length) return;
      const mesh = new THREE.Mesh(mergeAll(geos), fadeMat(new THREE.MeshBasicMaterial({ color, depthWrite: false, side: THREE.DoubleSide })));
      mesh.renderOrder = order;
      group.add(mesh);
    };
    flat(data.g, CITY.park, 1);
    flat(data.w, CITY.water, 2);
    const pos = [];
    for (const [c, pts] of decode(data.r, /^([a-z]?)(.*)$/)) {
      const w = (CITY.road_w[c] || 5) / 2;
      for (let i = 1; i < pts.length; i++) {
        const [ax, ay] = pts[i - 1], [bx, by] = pts[i];
        const L = Math.hypot(bx - ax, by - ay) || 1, nx = (-(by - ay) / L) * w, ny = ((bx - ax) / L) * w;
        pos.push(ax + nx, 0, ay + ny, ax - nx, 0, ay - ny, bx - nx, 0, by - ny, ax + nx, 0, ay + ny, bx - nx, 0, by - ny, bx + nx, 0, by + ny);
      }
    }
    if (pos.length) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      const road = new THREE.Mesh(g, fadeMat(new THREE.MeshBasicMaterial({ color: CITY.road, depthWrite: false, side: THREE.DoubleSide })));
      road.renderOrder = 3;
      group.add(road);
    }

    // 건물: 높이를 모르면 면적·종류로 짐작 (a = 아파트, h = 주택)
    const geos = [];
    for (const [head, pts] of decode(data.b, /^(\*?\d*[ah]?):(.*)$/)) {
      if (pts.length < 3) continue;
      const shape = pts.map(([x, y]) => new THREE.Vector2(x, -y));
      let h = parseInt(head.replace('*', ''), 10) || 0;
      if (!h) {
        const A = Math.abs(THREE.ShapeUtils.area(shape));
        h = head.endsWith('a') ? 55 : head.endsWith('h') ? 7 : A > 5000 ? 24 : A > 1500 ? 16 : A > 300 ? 11 : 7;
      }
      const g = new THREE.ExtrudeGeometry(new THREE.Shape(shape), { depth: h, bevelEnabled: false, curveSegments: 1 });
      g.rotateX(-Math.PI / 2);
      g.deleteAttribute('uv');
      geos.push(g);
    }
    if (geos.length) {
      const b = new THREE.Mesh(mergeAll(geos), fadeMat(new THREE.MeshLambertMaterial({ color: CITY.building })));
      b.renderOrder = 4;
      group.add(b);
    }

    // 화면 글자: 역 이름 + 매장 점 (지도와 같은 동그란 점)
    const d = this.dom;
    d.city.innerHTML = data.st.map(([n]) => `<span class="sf-st"><i></i>${n}</span>`).join('')
      + `<span class="sf-cpin${store.type === 'popup' ? ' is-popup' : ''}"></span>`;
    this.cityMarks = [...data.st.map(([, x, y]) => new THREE.Vector3(x, 0, y)), new THREE.Vector3(0, 0, 0)];
    this.cityEls = [...d.city.children];
    return group;
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
    this.under.hidden = true;
    window.removeEventListener('keydown', this.onKey, true);
    this.closeCity();
    this.cityK = 0;
    this.disposeCity();
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
    this.krEdgeMat.opacity = grow * (1 - fam); // FAMILY 가 올라오면 한반도 선도 사라짐
    this.rimMat.opacity = wire * (1 - reveal);
    this.ovalMat.opacity = wire * (1 - grow);

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
    d.reveal.style.opacity = '1'; // 매장 점만 담는 층
    d.reveal.style.visibility = reveal > 0 && fam < 1 ? 'visible' : 'hidden';
    d.reveal.style.opacity = (1 - fam).toFixed(3);

    // ---- 평면 지도 (시안 4·5번) ----
    d.map.classList.toggle('is-on', pin > T.first[0] + 0.01 && pin < T.family[0] + 0.01);
    // 4번에서는 서울(강동) 점 하나만, 5번에서 나머지가 차례로
    d.pins.forEach((b, i) => {
      const a = b.dataset.id === FIRST ? at(pin, T.first) : seg(pin, T.dim[0] + (i % 6) * 0.006, T.dim[0] + 0.03 + (i % 6) * 0.006);
      b.style.setProperty('--pop', ease.out(a).toFixed(3));
    });
    // 매장 카드: 핀에 마우스를 올렸을 때만
    const mapLive = pin > T.first[0] + 0.01 && pin < T.family[0] + 0.01;
    d.card.classList.toggle('is-on', mapLive && !!this.hovering);
    d.pins.forEach((b) => b.classList.toggle('is-sel', mapLive && !!this.hovering && b.dataset.id === this.selected?.id));

    // ---- IKEA FAMILY ----
    d.family.style.transform = `translateY(${(1 - fam) * 100}%)`;
    d.family.classList.toggle('is-on', fam > 0.95);
    const famIn = ease.out(seg(pin, T.family[0] + 0.02, T.family[1]));
    d.photo.style.clipPath = `inset(0 ${(1 - famIn) * 100}% 0 0)`;
    d.special.style.transform = `translateX(${px((1 - famIn) * -420)})`;
    // santalarch 방식: 오른쪽 목록이 반원(타원 반쪽)을 따라 위로 올라감.
    // SPECIAL 줄에 온 단어만 왼쪽 끝(시안 자리)에 닿아 굵어지고, 줄 아래·위 단어는 같은 반원을 따라 오른쪽으로 비켜남
    const ARC = { w: 520, rows: 4.5, show: 3.2 }; // 반원 폭(시안 px) · 반원 끝까지의 줄 수(클수록 완만) · 보이는 줄 수
    const k = ease.inOut(at(pin, T.list)) * (FAMILY.length - 1);
    d.words.forEach((w, i) => {
      const rel = i - k;
      const u = Math.min(1, Math.abs(rel) / ARC.rows);
      const intro = ease.out(seg(pin, T.family[0] + 0.02 + i * 0.006, T.family[1] + i * 0.006));
      const x = ARC.w * (1 - Math.sqrt(1 - u * u)) + (1 - intro) * (240 + i * i * 46);
      w.style.transform = `translate(${px(x)}, calc(${-k * 166} * var(--f)))`;
      w.style.opacity = clamp((ARC.show + 0.4 - Math.abs(rel)) / 0.6).toFixed(3); // 줄에서 멀어지면 서서히 사라짐
      const b = clamp((0.6 - Math.abs(rel)) / 0.25);              // 줄에 온 단어만 굵게
      w.style.fontWeight = Math.round(200 + 400 * b * b * (3 - 2 * b));
    });

    this.updateCity(dt, fam);
  }

  /** 한반도 지도 ↔ 매장 동네 3D 지도 전환 (앞 절반: 지도가 사라짐, 뒤 절반: 3D 가 내려앉으며 나타남) */
  updateCity(dt, fam) {
    const d = this.dom;
    const want = this.cityOn && this.city ? 1 : 0;
    this.cityK = clamp(this.cityK + Math.sign(want - this.cityK) * (dt / 0.9));
    const ck = this.cityK;
    const out = ease.inOut(clamp(ck / 0.5)), inn = ease.inOut(clamp((ck - 0.5) / 0.5));
    const show = ck > 0.5 && !!this.city;

    if (ck > 0) {
      this.krEdgeMat.opacity *= 1 - out;
      d.reveal.style.opacity = ((1 - fam) * (1 - out)).toFixed(3);
      d.w1.style.opacity = d.w2.style.opacity = (1 - fam) * (1 - out);
      d.card.classList.remove('is-on');
    }
    d.reveal.style.pointerEvents = ck > 0 ? 'none' : '';
    d.close.classList.toggle('is-on', this.cityOn);
    d.city.style.opacity = d.osm.style.opacity = inn.toFixed(3);
    if (this.city) this.city.visible = show;
    if (show) { this.tilt.visible = false; this.face.visible = false; }

    // 조명: 3D 동네일 때만 그림자 약하게
    this.hemi.intensity = show ? CITY.hemi : 1.35;
    this.hemi.groundColor.set(show ? '#e6e3dd' : '#cfc9bd');
    this.sun.intensity = show ? CITY.sun : 1.9;

    const cam = this.camera;
    if (!show) {
      if (cam.fov !== FOV) { cam.fov = FOV; cam.far = this.far0; cam.updateProjectionMatrix(); }
      return;
    }
    for (const m of this.cityMats) m.opacity = inn;
    if (this.far0 === undefined) this.far0 = cam.far;
    cam.fov = CITY.fov; cam.near = 10; cam.far = 40000;
    const D = CITY.dist * (1 + 0.25 * (1 - inn)); // 살짝 위에서 내려앉음
    const p = THREE.MathUtils.degToRad(CITY.pitch), a = THREE.MathUtils.degToRad(CITY.yaw);
    cam.position.set(D * Math.sin(p) * Math.sin(a), D * Math.cos(p), D * Math.sin(p) * Math.cos(a));
    cam.lookAt(0, 0, 0);
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld();
    // 역 이름 · 매장 점을 3D 위치에 맞춰 붙임 (화면 가운데 근처만)
    const v = new THREE.Vector3();
    this.cityMarks.forEach((m, i) => {
      v.copy(m).project(cam);
      const el = this.cityEls[i];
      const isPin = i === this.cityMarks.length - 1;
      const off = !isPin && (v.x * v.x + (v.y * 1.4) ** 2 > 0.55 || v.z > 1);
      el.style.visibility = off ? 'hidden' : '';
      el.style.transform = `translate(${((v.x * 0.5 + 0.5) * this.vw).toFixed(1)}px, ${((-v.y * 0.5 + 0.5) * this.vh).toFixed(1)}px)`;
    });
  }
}
