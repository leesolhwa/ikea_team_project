// ABOUT — 창문 속 초원에서 조케가 인사 → "Hej!" 글자가 커지며 흰 화면 → 비전 / 데모크래틱 디자인 / 지속가능성
//  · pinned 구간(pin 0~1): 3D 초원 + Hej! 확대
//  · 그 뒤(scroll 0~1)   : .sec-scroll 콘텐츠가 자동으로 세로 스크롤
import * as THREE from 'three';
import { BaseSection } from '../../core/BaseSection.js';
import { addBasicLights, box } from '../../core/assets.js';
import { seg, ease, lerp } from '../../core/tween.js';

// ▼ 교체 포인트: Blender 모델이 준비되면 경로를 넣으세요 (null 이면 임시 도형)
const MODELS = {
  house: null, // 'assets/models/about/house.glb'
};

const DESIGN = [
  ['Form', '형태'], ['Function', '기능'], ['Quality', '품질'], ['Sustainability', '지속가능성'], ['Low price', '낮은 가격'],
];

export class AboutSection extends BaseSection {
  static meta = {
    id: 'about',
    title: 'About',
    subtitle: '이케아 이야기',
    owner: '팀원 B',
    color: '#8fbf7a',
    windowImage: 'assets/images/about/window.svg',
  };
  static css = new URL('./about.css', import.meta.url).href;
  static use3D = true;
  static pinned = 1.4;

  template() {
    return /* html */ `
      <div class="about-hej"><span>Hej!</span></div>
      <div class="about-white"></div>

      <div class="sec-scroll">
        <section class="about-block about-vision">
          <p class="eyebrow">About</p>
          <h2>To create a better everyday life<br />for the many people</h2>
          <p class="ph-note">비전 문구 번역·서체는 디자인 확정 후 교체</p>
        </section>

        <section class="about-block about-design">
          <p class="eyebrow">Democratic Design</p>
          <ul class="about-cards">
            ${DESIGN.map(([en, ko], i) => `
              <li>
                <span class="about-card-fig">${String(i + 1).padStart(2, '0')}</span>
                <strong>${en}</strong>
                <em>${ko}</em>
                <p class="ph-note">설명 문구 자리</p>
              </li>`).join('')}
          </ul>
        </section>

        <section class="about-block about-sustain">
          <p class="eyebrow">Sustainability</p>
          <ul class="about-rows">
            ${[1, 2, 3].map((n) => `
              <li>
                <img class="ph-img" src="assets/images/about/ph-${n}.svg" alt="임시 이미지 ${n}" />
                <div>
                  <h3>TITLE ${n}</h3>
                  <p class="ph-note">지속가능성 항목 ${n} — 본문 자리</p>
                </div>
              </li>`).join('')}
          </ul>
        </section>

        <section class="about-block about-end">
          <p class="eyebrow">End of About</p>
        </section>
      </div>
    `;
  }

  init() {
    this.hej = this.$('.about-hej span');
    this.white = this.$('.about-white');

    // --- 3D: 초원 + 집 + 조케 (전부 임시 도형) ---
    this.scene.background = new THREE.Color('#bfe0f2');
    addBasicLights(this.scene);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(80, 80),
      new THREE.MeshStandardMaterial({ color: '#7fb069', roughness: 1 }),
    );
    ground.rotation.x = -Math.PI / 2;
    this.scene.add(ground);

    const houseFallback = new THREE.Group();
    const roof = new THREE.Mesh(new THREE.ConeGeometry(1.25, 0.7, 4), new THREE.MeshStandardMaterial({ color: '#d9392b' }));
    roof.position.y = 1.35;
    roof.rotation.y = Math.PI / 4;
    houseFallback.add(box(1.6, 1, 1.2, '#ffffff'), roof);
    this.house = this.addModel({ url: MODELS.house, fallback: houseFallback, name: 'house' });
    this.house.position.set(0.6, 0, -2);

    this.joke = this.addCharacter();
    this.joke.position.set(-0.9, 0, -0.6);
  }

  update({ pin, time }) {
    // Hej! 확대 → 흰 화면
    const grow = ease.in(seg(pin, 0.15, 1));
    this.hej.style.transform = `scale(${1 + grow * 40})`;
    this.hej.style.opacity = seg(pin, 0, 0.12);
    this.white.style.opacity = seg(pin, 0.72, 0.98);

    // 카메라가 초원 쪽으로 다가감
    this.camera.position.set(0, 1.5, lerp(7.5, 4.5, ease.inOut(pin)));
    this.camera.lookAt(0, 0.9, -1);
    this.joke.userData.setWave(time);
  }
}
