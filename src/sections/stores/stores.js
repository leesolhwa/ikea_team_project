// STORE & FAMILY — 피그마 시안(S&F_store, S&F_family) 기준
//
//  pin 0.00 ~ 0.10 : STORE WORLDWIDE 타이틀 → 글자가 벌어지며 선 지구본(원 + 세로 타원)
//  pin 0.10 ~ 0.20 : 지구본이 커지며 대륙·매장 점 등장 (유럽 정면)
//  pin 0.20 ~ 0.30 : 지구본이 제자리에서 자전 (지구본 클릭 시 바로 한반도로)
//  pin 0.30 ~ 0.44 : 지금 보이는 자리에서 가장 짧은 길로 돌아 한반도 정면 + 확대
//  pin 0.38 ~ 0.52 : 지구본 → 시안 평면 지도(서울 점 하나), WORLDWIDE → KOREA
//  pin 0.56 ~ 0.62 : 지도가 연해지고 매장 점·매장 카드 등장 (점에 마우스 = 카드 변경)
//  pin 0.78 ~ 0.86 : IKEA FAMILY 화면이 올라옴, 혜택 단어가 계단처럼 들어옴
//  pin 0.86 ~ 1.00 : 오른쪽 단어 목록이 위로 올라가며 SPECIAL 옆 단어가 하나씩 바뀜 (santalarch 방식)
import * as THREE from 'three';
import { BaseSection } from '../../core/BaseSection.js';
import { loadTexture } from '../../core/assets.js';
import { ease, seg, lerp, clamp } from '../../core/tween.js';
import { STORES, WORLD, FAMILY } from './data.js';

// ▼ 교체 포인트
const IMG = {
  land: 'assets/images/stores/globe-land.png',    // 지구본 대륙 텍스처 (Natural Earth)
  korea: 'assets/images/stores/korea-map.png',    // 시안 한반도 지도 (Figma, 1014 × 984)
  family: 'assets/images/stores/family-billy.jpg', // 시안 FAMILY 사진
};

// 시안 지도 이미지의 좌표계: 메르카토르, 경도 1도 = 150px, (127.8°E, 36.5°N) = (504, 405)
const MAP = { w: 1014, h: 984, k: 150, lon0: 127.8, lat0: 36.5, x0: 504, y0: 405 };
const merc = (lat) => THREE.MathUtils.radToDeg(Math.log(Math.tan(Math.PI / 4 + THREE.MathUtils.degToRad(lat) / 2)));
const mapXY = (lat, lon) => [(lon - MAP.lon0) * MAP.k + MAP.x0, -(merc(lat) - merc(MAP.lat0)) * MAP.k + MAP.y0];

const R = 2;      // 지구본 반지름
const FOV = 30;
const KOREA = { lat: 36.5, lon: 127.8 };
const EUROPE = { lat: 50, lon: 18 };   // 시안 3번 화면에서 정면에 보이는 곳
const FIRST = 'gangdong';              // 시안 4번 화면: 서울에 점 하나
const DEFAULT = 'pangyo';              // 시안 5번 화면: 처음 보이는 매장 카드
const C = { ivory: '#fcfaf6', line: '#c9c6bf', blue: '#0c3494', yellow: '#ffc800' };

/** 구간 값: keys = [[pin, 값], ...] 사이를 부드럽게 잇습니다 */
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
/** 해당 지점이 정면(+Z)에 오게 하는 회전값 */
function yawFor(lat, lon) {
  const v = latLonToVec3(lat, lon, 1);
  return -Math.atan2(v.x, v.z);
}

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
    const dots = STORES.map((s) => {
      const [x, y] = mapXY(s.lat, s.lon);
      return `<button type="button" class="${s.type === 'popup' ? 'is-popup' : ''}" data-id="${s.id}" aria-label="${s.name}"
        style="left:${((x / MAP.w) * 100).toFixed(2)}%;top:${((y / MAP.h) * 100).toFixed(2)}%"></button>`;
    }).join('');
    const list = FAMILY.map((w) => `<li>${w}</li>`).join('');
    return /* html */ `
      <figure class="sf-map" aria-label="이케아 국내 매장 지도">
        <img src="${IMG.korea}" alt="" />
        <div class="sf-dots">${dots}</div>
      </figure>

      <section class="sf-family" aria-label="IKEA Family 혜택">
        <p class="sf-offers">Store offers<br />IKEA Family</p>
        <figure class="sf-photo"><img src="${IMG.family}" alt="BILLY 책장 조립 설명서와 부품" /></figure>
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
        <button type="button" data-go="0.2" style="left:calc(560 * var(--u))">Store location</button>
        <button type="button" data-go="0.66" style="left:calc(959 * var(--u))">Store information</button>
        <button type="button" data-go="0.86" style="left:calc(1360 * var(--u))">IKEA Family service</button>
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
      v1: this.$('.sf-vl.v1'), v2: this.$('.sf-vl.v2'), v3: this.$('.sf-vl.v3'),
      bar: this.$('.sf-bar'), navBtns: this.$$('.sf-nav button'),
      map: this.$('.sf-map'), mapImg: this.$('.sf-map img'), dots: this.$$('.sf-dots button'),
      card: this.$('.sf-card'), cardName: this.$('.sf-card h3'), cardAddr: this.$('.sf-card p'), cardLink: this.$('.sf-card a'),
      family: this.$('.sf-family'), photo: this.$('.sf-photo'), special: this.$('.sf-special'), words: this.$$('.sf-list li'),
    };

    this.camera.fov = FOV;
    this.camera.updateProjectionMatrix();
    this.scene.background = new THREE.Color(C.ivory);
    this.buildGlobe();

    this.spin = yawFor(EUROPE.lat, EUROPE.lon);
    this.from = null;
    this.selected = STORES.find((s) => s.id === DEFAULT) || STORES[0];
    this.showCard(this.selected);

    // 매장 점: 마우스를 올리거나 포커스하면 카드가 그 매장으로 바뀜 (색은 그대로, 점만 커짐)
    this.dom.dots.forEach((b) => {
      const store = STORES.find((s) => s.id === b.dataset.id);
      const pickStore = () => { this.selected = store; this.showCard(store); };
      b.addEventListener('pointerenter', pickStore);
      b.addEventListener('focus', pickStore);
      b.addEventListener('click', pickStore);
    });
    // 지구본이 자전 중일 때 클릭 → 바로 한반도로
    this.el.addEventListener('click', (e) => {
      if (this.pin > 0.12 && this.pin < 0.3 && this.ctx.stage.pick(e, this.camera, [this.globeHit])) this.ctx.scroll.scrollTo(0.62);
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

    // 뒤쪽 선을 가리는 투명 구 (깊이만 씀) — 클릭 판정에도 사용
    this.globeHit = new THREE.Mesh(new THREE.SphereGeometry(R * 0.998, 64, 48), new THREE.MeshBasicMaterial({ colorWrite: false }));
    this.globeHit.renderOrder = -1;
    this.globe.add(this.globeHit);

    const tex = loadTexture(IMG.land);
    tex.anisotropy = 4;
    this.landMat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0, depthWrite: false });
    this.globe.add(new THREE.Mesh(new THREE.SphereGeometry(R, 96, 64), this.landMat));

    // 위경선 (시안 3번: 옅은 격자)
    const pts = [];
    for (let lon = -180; lon < 180; lon += 20) {
      for (let lat = -88; lat < 88; lat += 4) pts.push(latLonToVec3(lat, lon, R * 1.001), latLonToVec3(lat + 4, lon, R * 1.001));
    }
    for (let lat = -60; lat <= 75; lat += 15) {
      for (let lon = -180; lon < 180; lon += 4) pts.push(latLonToVec3(lat, lon, R * 1.001), latLonToVec3(lat, lon + 4, R * 1.001));
    }
    this.gratMat = new THREE.LineBasicMaterial({ color: C.line, transparent: true, opacity: 0 });
    this.globe.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), this.gratMat));

    // 카메라를 보는 평면 요소: 테두리 원 · 시안 2번 세로 타원 · 구 가장자리 음영
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
    const shade = document.createElement('canvas');
    shade.width = shade.height = 256;
    const g = shade.getContext('2d');
    const grd = g.createRadialGradient(128, 128, 60, 128, 128, 128);
    grd.addColorStop(0, 'rgba(40,36,30,0)');
    grd.addColorStop(0.82, 'rgba(40,36,30,0.04)');
    grd.addColorStop(1, 'rgba(40,36,30,0.13)');
    g.fillStyle = grd;
    g.beginPath(); g.arc(128, 128, 128, 0, Math.PI * 2); g.fill();
    this.shadeMat = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(shade), transparent: true, opacity: 0, depthTest: false, depthWrite: false });
    const shadeMesh = new THREE.Mesh(new THREE.PlaneGeometry(R * 2, R * 2), this.shadeMat);
    shadeMesh.renderOrder = 2;
    rim.renderOrder = oval.renderOrder = 3;
    this.face.add(shadeMesh, rim, oval);

    // 매장 점: 세계(파랑) + 한국(정식 파랑, 팝업 노랑)
    const sq = new THREE.PlaneGeometry(0.036, 0.036);
    const dots = [
      ...WORLD.map(([lat, lon]) => ({ lat, lon, color: C.blue })),
      ...STORES.map((s) => ({ lat: s.lat, lon: s.lon, color: s.type === 'popup' ? C.yellow : C.blue })),
    ];
    this.dots = dots.map((d, i) => {
      const m = new THREE.Mesh(sq, new THREE.MeshBasicMaterial({ color: d.color, transparent: true, opacity: 0, side: THREE.DoubleSide }));
      const p = latLonToVec3(d.lat, d.lon, R * 1.004);
      m.position.copy(p);
      m.lookAt(p.clone().multiplyScalar(2));
      m.userData.delay = (i % 17) / 17;
      this.globe.add(m);
      return m;
    });
  }

  showCard(s) {
    const d = this.dom;
    d.cardName.textContent = s.name;
    d.cardAddr.textContent = s.addr;
    d.cardLink.href = s.url;
    d.dots.forEach((b) => b.classList.toggle('is-sel', b.dataset.id === s.id));
  }

  leave() {
    this.el.style.cursor = '';
  }

  resize(w, h) {
    // 지구본이 시안처럼 화면 높이의 74%(800 / 1080px)를 차지하는 거리. 세로 화면이면 가로 기준
    const t = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    this.D0 = Math.max((2 * R) / (0.741 * 2 * t), (2 * R) / (0.86 * 2 * t * (w / h)));
    this.vw = w; this.vh = h;
    this.mapRect = null; // 다음 프레임에 지도 위치를 다시 잼
  }

  /** 지구본 확대가 끝날 때 한반도 크기·위치가 시안 지도와 겹치도록 맞추는 값 */
  mapMatch() {
    if (!this.mapRect) {
      const r = this.dom.map.getBoundingClientRect();
      if (!r.width) return null;
      const s = r.width / MAP.w;
      this.mapRect = {
        x: r.left + MAP.x0 * s - this.vw / 2,       // 화면 가운데 기준 한반도 중심 위치(px)
        y: r.top + MAP.y0 * s - this.vh / 2,
        pxPerDeg: MAP.k * s,
      };
    }
    return this.mapRect;
  }

  /* ---------------- 매 프레임 ---------------- */
  update({ pin, dt }) {
    this.pin = pin;
    const d = this.dom;
    const px = (v) => `calc(${v} * var(--u))`;
    this.ctx.minimap?.hide(); // 이 섹션에서는 미니맵을 숨김

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
    const swap = ease.inOut(seg(pin, 0.4, 0.48));
    d.cur.style.opacity = 1 - swap;
    d.alt.style.opacity = swap;
    d.w1.style.opacity = d.w2.style.opacity = 1 - fam;

    // ---- 상단 진행 바 (시안: 559 → 960 → 1541) ----
    let bar = lerp(559, 960, ease.inOut(seg(pin, 0.44, 0.52)));
    bar = lerp(bar, 1541, ease.inOut(seg(pin, 0.78, 0.86)));
    d.bar.style.width = px(bar);
    const step = pin < 0.48 ? 0 : pin < 0.82 ? 1 : 2;
    d.navBtns.forEach((b, i) => b.classList.toggle('is-on', i === step));

    // ---- 지구본 ----
    const wire = seg(pin, 0.02, 0.1);
    const grow = ease.inOut(seg(pin, 0.1, 0.2));
    const f = seg(pin, 0.3, 0.44);
    const fe = ease.inOut(f);
    const fadeOut = 1 - seg(pin, 0.38, 0.44);
    const globeOn = fadeOut > 0;
    this.tilt.visible = this.face.visible = globeOn;

    if (f <= 0) {
      this.from = null;
      if (pin >= 0.2 && pin < 0.3) this.spin += dt * 0.1; // 시안 3번(유럽 정면)에서 출발해 제자리 자전
    } else if (this.from === null) {
      this.from = this.spin;
    }
    let yaw = this.spin;
    if (this.from !== null) {
      const target = yawFor(KOREA.lat, KOREA.lon);
      const k = Math.round((this.from - target) / (Math.PI * 2));
      yaw = lerp(this.from, target + k * Math.PI * 2, fe);
    }
    this.globe.rotation.y = yaw;
    this.tilt.rotation.x = lerp(THREE.MathUtils.degToRad(EUROPE.lat), THREE.MathUtils.degToRad(KOREA.lat), fe);
    const s = lerp(0.27, 1, grow);
    this.tilt.scale.setScalar(s);

    // 카메라 거리: 처음엔 시안 크기, 확대가 끝나면 한반도가 시안 지도와 같은 크기·위치
    const t = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    const m = this.mapMatch();
    const lonArc = R * THREE.MathUtils.degToRad(1) * Math.cos(THREE.MathUtils.degToRad(KOREA.lat));
    const hEnd = m ? (lonArc * this.vh) / (2 * t * m.pxPerDeg) : 0.4;
    const camD = lerp(this.D0, R + hEnd, fe);
    const visH0 = 2 * this.D0 * t;
    const startY = -(574 / 1080 - 0.5) * visH0;
    // 확대가 끝날 때 한반도가 시안 지도 속 한반도 위치에 오도록 지구본을 옮김
    const worldPerPx = (2 * hEnd * t) / this.vh;
    const endX = m ? m.x * worldPerPx : 0;
    const endY = m ? -m.y * worldPerPx : 0;
    this.tilt.position.set(lerp(0, endX, fe), lerp(startY, endY, fe), 0);
    this.face.position.copy(this.tilt.position);
    // 원근 때문에 구의 실루엣이 조금 더 크게 보이므로 테두리·음영을 그만큼 키움
    this.face.scale.setScalar(s / Math.sqrt(Math.max(0.05, 1 - ((R * s) / camD) ** 2)));

    this.landMat.opacity = grow * fadeOut;
    this.gratMat.opacity = 0.5 * grow * fadeOut;
    this.rimMat.opacity = wire * fadeOut;
    this.ovalMat.opacity = wire * (1 - grow);
    this.shadeMat.opacity = grow * fadeOut * (1 - fe);
    const dotK = clamp((camD - R * s) / (this.D0 - R), 0.1, 1); // 확대할수록 점이 커지지 않게
    this.dots.forEach((dot) => {
      const a = seg(pin, 0.13 + dot.userData.delay * 0.06, 0.16 + dot.userData.delay * 0.06);
      dot.material.opacity = a * fadeOut * (1 - fe);
      dot.scale.setScalar(Math.max(0.001, ease.out(a) * dotK));
    });

    this.camera.position.set(0, 0, camD);
    this.camera.lookAt(0, 0, 0);
    this.face.quaternion.copy(this.camera.quaternion);
    this.camera.near = 0.01;
    this.camera.far = 100;
    this.camera.updateProjectionMatrix();

    // ---- 한반도 평면 지도 (시안 4·5번) ----
    const mapIn = ease.inOut(seg(pin, 0.38, 0.45));
    const dim = ease.inOut(seg(pin, 0.56, 0.62));      // 5번: 지도가 한 톤 연해짐
    d.map.style.opacity = mapIn * (1 - fam);
    d.mapImg.style.opacity = lerp(1, 0.6, dim);
    d.map.classList.toggle('is-on', pin > 0.5 && pin < 0.8);
    d.dots.forEach((b, i) => {
      // 4번에서는 서울(강동) 점 하나만, 5번에서 나머지가 차례로 등장
      const a = b.dataset.id === FIRST ? seg(pin, 0.46, 0.5) : seg(pin, 0.56 + (i % 6) * 0.008, 0.6 + (i % 6) * 0.008);
      b.style.setProperty('--pop', ease.out(a).toFixed(3));
    });
    d.card.classList.toggle('is-on', pin > 0.58 && pin < 0.8);

    // ---- IKEA FAMILY ----
    d.family.style.transform = `translateY(${(1 - fam) * 100}%)`;
    d.family.classList.toggle('is-on', fam > 0.95);
    d.photo.style.clipPath = `inset(0 ${(1 - ease.out(seg(pin, 0.8, 0.86))) * 100}% 0 0)`;
    d.special.style.transform = `translateX(${px((1 - ease.out(seg(pin, 0.8, 0.86))) * -420)})`;
    // santalarch 방식: 오른쪽 목록이 위로 올라가고, SPECIAL 줄에 닿은 단어가 굵어짐.
    // 아직 줄 아래에 있는 단어는 시안처럼 한 줄에 50px 씩 계단, 줄을 지난 단어는 왼쪽으로 정렬
    const k = ease.inOut(seg(pin, 0.86, 0.99)) * (FAMILY.length - 1);
    d.words.forEach((w, i) => {
      const rel = i - k;
      const intro = ease.out(seg(pin, 0.8 + i * 0.006, 0.86 + i * 0.006));
      const x = Math.max(0, rel) * 50 + (1 - intro) * (240 + i * i * 46);
      const y = -k * 166;
      w.style.transform = `translate(${px(x)}, calc(${y} * var(--f)))`;
      w.style.fontWeight = Math.round(200 + 200 * clamp(1 - Math.abs(rel)));
    });
  }
}
