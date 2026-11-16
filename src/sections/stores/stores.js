// STORES — 지구본이 확대되며 한반도로 줌인 → 매장 핀이 깜빡이고, 호버하면 지점명·사진 → IKEA Family 안내
//  pin 0.00 ~ 0.40 : 지구본 회전 + 줌인
//  pin 0.38 ~ 0.52 : 한반도 지도 보드 + 매장 핀 등장
//  pin 0.70 ~ 0.88 : 멤버십(Family) 패널이 아래에서 올라옴
import * as THREE from 'three';
import { BaseSection } from '../../core/BaseSection.js';
import { addBasicLights } from '../../core/assets.js';
import { ease, seg, lerp } from '../../core/tween.js';
import { STORES } from './data.js';

// ▼ 교체 포인트
const MODELS = {
  globe: null, // 'assets/models/stores/globe.glb'  (반지름 2 기준, fit 로 자동 맞춤)
  korea: null, // 'assets/models/stores/korea.glb'  (한반도 지도 모델)
};

const R = 2; // 지구본 반지름
const KOREA = { lat: 36.5, lon: 127.8 };

function latLonToVec3(lat, lon, r) {
  const phi = THREE.MathUtils.degToRad(90 - lat);
  const theta = THREE.MathUtils.degToRad(lon + 180);
  return new THREE.Vector3(-r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta));
}

export class StoresSection extends BaseSection {
  static meta = {
    id: 'stores',
    title: 'Stores',
    subtitle: '매장 찾기 · Family',
    owner: '팀원 D',
    color: '#d8d2c2',
    windowImage: 'assets/images/stores/window.svg',
  };
  static css = new URL('./stores.css', import.meta.url).href;
  static use3D = true;
  static pinned = 4;

  template() {
    return /* html */ `
      <header class="stores-head">
        <p class="eyebrow">Store directory</p>
        <h2>EXPLORE<br />IKEA <em>KOREA.</em></h2>
        <p class="ph-note">스크롤하면 한반도로 줌인 · 핀에 마우스를 올려 보세요</p>
      </header>

      <div class="stores-tip" hidden>
        <img class="ph-img" alt="" />
        <strong></strong>
        <span class="ph-note">주소 · 영업시간 자리</span>
      </div>

      <section class="stores-family">
        <h3>Hej!</h3>
        <p class="stores-family-sub">IKEA Family 멤버십 혜택</p>
        <ul>
          <li><img class="ph-img" src="assets/images/stores/ph-2.svg" alt="임시 이미지" /><strong>혜택 카드 1</strong><span class="ph-note">설명 자리</span></li>
          <li><img class="ph-img" src="assets/images/stores/ph-3.svg" alt="임시 이미지" /><strong>혜택 카드 2</strong><span class="ph-note">설명 자리</span></li>
        </ul>
      </section>
    `;
  }

  init() {
    this.tip = this.$('.stores-tip');
    this.family = this.$('.stores-family');
    this.mapP = 0;
    this.famP = 0;

    this.scene.background = new THREE.Color('#efeae0');
    addBasicLights(this.scene);

    // --- 지구본 (임시: 구 + 와이어프레임) ---
    this.globe = new THREE.Group();
    this.scene.add(this.globe);
    const earth = new THREE.Mesh(
      new THREE.SphereGeometry(R, 48, 32),
      new THREE.MeshStandardMaterial({ color: '#2a2a28', roughness: 1 }),
    );
    this.addModel({ url: MODELS.globe, fallback: earth, name: 'globe' }, this.globe);
    this.globe.add(new THREE.Mesh(
      new THREE.SphereGeometry(R * 1.004, 24, 16),
      new THREE.MeshBasicMaterial({ color: '#efeae0', wireframe: true, transparent: true, opacity: 0.22 }),
    ));
    const koreaPos = latLonToVec3(KOREA.lat, KOREA.lon, R * 1.01);
    const marker = new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 12), new THREE.MeshBasicMaterial({ color: '#ffdb00' }));
    marker.position.copy(koreaPos);
    this.globe.add(marker);

    // 한국이 카메라(+Z)를 정면으로 보게 하는 회전
    this.qFace = new THREE.Quaternion().setFromUnitVectors(koreaPos.clone().normalize(), new THREE.Vector3(0, 0, 1));
    this.qSpin = new THREE.Quaternion();
    this.yAxis = new THREE.Vector3(0, 1, 0);

    // --- 한반도 지도 보드 + 매장 핀 (지구본 표면 바로 앞에 작게 놓임) ---
    this.board = new THREE.Group();
    this.board.position.set(0, 0, R + 0.06);
    this.scene.add(this.board);
    this.board.add(new THREE.Mesh(new THREE.PlaneGeometry(2.6, 3.2), new THREE.MeshBasicMaterial({ color: '#efeae0' })));
    const land = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.4, 0.05), new THREE.MeshStandardMaterial({ color: '#2a2a28', roughness: 1 }));
    land.position.z = 0.03;
    this.addModel({ url: MODELS.korea, fallback: land, name: 'korea' }, this.board);

    this.pins = STORES.map((store) => {
      const pin = new THREE.Group();
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.18, 16), new THREE.MeshStandardMaterial({ color: '#0058a3' }));
      cone.rotation.x = -Math.PI / 2; // 뾰족한 끝이 지도 쪽을 향하게
      cone.position.z = 0.09;
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.075, 16, 12), new THREE.MeshStandardMaterial({ color: '#ffdb00' }));
      head.position.z = 0.2;
      pin.add(cone, head);
      pin.position.set(store.x * 0.7, store.y * 1.2, 0.06);
      pin.userData.pickId = store.id;
      this.board.add(pin);
      return pin;
    });

    this.el.addEventListener('pointermove', (e) => this.onPointer(e));
    this.el.addEventListener('pointerleave', () => { this.tip.hidden = true; });
  }

  onPointer(e) {
    const interactive = this.mapP > 0.9 && this.famP < 0.05;
    const hit = interactive ? this.ctx.stage.pick(e, this.camera, this.pins) : null;
    const store = hit && STORES.find((s) => s.id === hit.id);
    this.el.style.cursor = store ? 'pointer' : '';
    this.tip.hidden = !store;
    if (!store) return;
    this.tip.querySelector('img').src = store.image;
    this.tip.querySelector('strong').textContent = store.name;
    this.tip.style.transform = `translate(${e.clientX + 18}px, ${e.clientY + 18}px)`;
  }

  leave() {
    this.tip.hidden = true;
  }

  update({ pin, time }) {
    const zoom = ease.inOut(seg(pin, 0, 0.4));
    this.mapP = seg(pin, 0.38, 0.52);
    this.famP = seg(pin, 0.7, 0.88);

    // 지구본: 처음엔 천천히 돌다가, 줌인하면서 한국이 정면에 오도록 멈춤
    this.qSpin.setFromAxisAngle(this.yAxis, (1 - zoom) * (-2.4 + time * 0.12));
    this.globe.quaternion.copy(this.qSpin).multiply(this.qFace);
    this.camera.position.set(0, 0, lerp(7, 2.62, zoom));
    this.camera.lookAt(0, 0, 0);

    // 지도 보드 + 핀
    const s = 0.13 * ease.out(this.mapP);
    this.board.visible = this.mapP > 0;
    this.board.scale.setScalar(Math.max(s, 0.0001));
    this.pins.forEach((p, i) => p.scale.setScalar(1 + Math.sin(time * 4 + i) * 0.18)); // 깜빡임

    // Family 패널
    this.family.style.transform = `translateY(${(1 - ease.out(this.famP)) * 100}%)`;
    if (this.famP > 0.05) this.tip.hidden = true;
  }
}
