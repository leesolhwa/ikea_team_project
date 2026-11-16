// FOOD — "GOOD FOOD. GOOD DAY." 큰 타이포가 스크롤에 따라 확대 → 레스토랑/비스트로/푸드 마켓/카페 메뉴
//  · pinned 구간(pin 0~1): 타이포 확대 + 3D 접시가 돌아감
//  · 그 뒤(scroll 0~1)   : .sec-scroll 메뉴 목록이 자동으로 세로 스크롤
import * as THREE from 'three';
import { BaseSection } from '../../core/BaseSection.js';
import { addBasicLights } from '../../core/assets.js';
import { ease } from '../../core/tween.js';

// ▼ 교체 포인트: 접시 위 음식 모델 (null 이면 임시 도넛)
const MODELS = {
  dishes: [null, null, null], // 예: 'assets/models/food/donut.glb'
};

// 메뉴 데이터(임시). 이름·가격·이미지는 실제 값으로 교체하세요.
const CATEGORIES = [
  { name: '스웨디시 레스토랑', en: 'Swedish Restaurant', items: ['메뉴 1', '메뉴 2', '메뉴 3'] },
  { name: '스웨디시 비스트로', en: 'Swedish Bistro', items: ['메뉴 1', '메뉴 2', '메뉴 3'] },
  { name: '스웨디시 푸드 마켓', en: 'Swedish Food Market', items: ['메뉴 1', '메뉴 2', '메뉴 3'] },
  { name: '스웨디시 카페', en: 'Swedish Café', items: ['메뉴 1', '메뉴 2', '메뉴 3'] },
];

export class FoodSection extends BaseSection {
  static meta = {
    id: 'food',
    title: 'Food',
    subtitle: '스웨디시 푸드',
    owner: '팀원 E',
    color: '#f1e7d9',
    windowImage: 'assets/images/food/window.svg',
  };
  static css = new URL('./food.css', import.meta.url).href;
  static use3D = true;
  static pinned = 1.2;

  template() {
    return /* html */ `
      <div class="food-hero">
        <h2 class="food-title">GOOD<br />FOOD.<br />GOOD<br />DAY.</h2>
      </div>

      <div class="sec-scroll">
        ${CATEGORIES.map((c, ci) => `
          <section class="food-cat">
            <header>
              <p class="eyebrow">${c.en}</p>
              <h3>${c.name}</h3>
            </header>
            <ul class="food-items">
              ${c.items.map((name, i) => `
                <li>
                  <img class="ph-img" src="assets/images/food/ph-${((ci + i) % 3) + 1}.svg" alt="임시 이미지" />
                  <strong>${name}</strong>
                  <span class="food-price">₩0,000</span>
                </li>`).join('')}
            </ul>
          </section>`).join('')}
        <section class="food-cat food-end"><p class="eyebrow">End of Food</p></section>
      </div>
    `;
  }

  init() {
    this.title = this.$('.food-title');

    this.scene.background = new THREE.Color('#f1e7d9');
    addBasicLights(this.scene);
    this.camera.position.set(0, 0, 7);
    this.camera.lookAt(0, 0, 0);

    // 접시 3개(임시: 원기둥 + 도넛)가 화면 오른쪽에 세로로 놓입니다
    this.column = new THREE.Group();
    this.scene.add(this.column);
    this.plates = MODELS.dishes.map((url, i) => {
      const tilt = new THREE.Group();   // 카메라 쪽으로 기울이는 그룹
      tilt.position.set(0, 1.5 - i * 1.5, 0);
      tilt.rotation.x = 1.0;
      const spin = new THREE.Group();   // 접시 자체가 도는 그룹
      tilt.add(spin);
      spin.add(new THREE.Mesh(
        new THREE.CylinderGeometry(0.7, 0.55, 0.06, 48),
        new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.4 }),
      ));
      const donut = new THREE.Mesh(
        new THREE.TorusGeometry(0.26, 0.12, 16, 32),
        new THREE.MeshStandardMaterial({ color: '#b5651d', roughness: 0.7 }),
      );
      donut.rotation.x = Math.PI / 2;
      donut.position.set(0.12, 0.15, 0);
      this.addModel({ url, fallback: donut, name: `dish-${i}` }, spin);
      this.column.add(tilt);
      return spin;
    });
    this.resize(window.innerWidth, window.innerHeight);
  }

  resize(w, h) {
    // 화면 비율에 맞춰 접시 열을 오른쪽 가장자리 근처에 배치
    if (this.column) this.column.position.x = Math.min(3.2, (w / h) * 1.9);
  }

  update({ pin, progress, time }) {
    // 큰 타이포가 쭉 확대
    this.title.style.transform = `scale(${1 + ease.in(pin) * 2.4})`;

    // 접시와 음식이 살짝씩 돌아감 (시간 + 스크롤)
    this.plates.forEach((spin, i) => { spin.rotation.y = time * 0.25 + progress * 9 + i * 1.3; });
    this.column.position.y = progress * 1.2;
  }
}
