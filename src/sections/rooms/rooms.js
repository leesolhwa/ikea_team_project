// ROOMS — 평면도를 바탕으로 방 4곳(거실/키친/욕실/침실)을 스크롤로 탐색하는 3D 섹션.
//  · 스크롤(pin 0~1): 카메라가 방에서 방으로 이동
//  · 거실의 기차를 클릭하면 히스토리(OUR ROOTS since 1943) 이스터에그가 열립니다
import * as THREE from 'three';
import { BaseSection } from '../../core/BaseSection.js';
import { addBasicLights, box, cylinder, labelSprite } from '../../core/assets.js';
import { ease, seg, lerp } from '../../core/tween.js';

const GAP = 8; // 방 사이 간격

// ▼ 교체 포인트: 가구마다 url 에 GLB 경로를 넣으면 임시 박스가 모델로 바뀝니다.
//   size = [가로, 높이, 깊이], pos = [x, z] (방 중심 기준)
const ROOMS = [
  {
    id: 'living', name: '거실', floor: '#e9dfcf',
    items: [
      { name: '소파', size: [2.4, 0.8, 1], pos: [-0.8, -1.6], color: '#d8c7a8', url: null },
      { name: '테이블', size: [1, 0.4, 1], pos: [-0.6, 0.2], color: '#b98b5e', url: null },
    ],
  },
  {
    id: 'kitchen', name: '키친', floor: '#dfe7dc',
    items: [
      { name: '조리대', size: [3.2, 0.9, 0.7], pos: [0, -2.4], color: '#f2f2ee', url: null },
      { name: '식탁', size: [1.5, 0.75, 0.9], pos: [0.4, 0.2], color: '#c9a878', url: null },
    ],
  },
  {
    id: 'bath', name: '욕실', floor: '#d9e6ee',
    items: [
      { name: '욕조', size: [1.9, 0.6, 0.85], pos: [-1, -2.2], color: '#ffffff', url: null },
      { name: '세면대', size: [0.8, 0.85, 0.5], pos: [1.4, -2.4], color: '#cfd8dc', url: null },
    ],
  },
  {
    id: 'bed', name: '침실', floor: '#ece0e6',
    items: [
      { name: '침대', size: [2, 0.5, 2.4], pos: [-0.6, -1.4], color: '#f4efe6', url: null },
      { name: '옷장', size: [1.3, 2, 0.6], pos: [1.9, -2.5], color: '#a8825c', url: null },
    ],
  },
];

const MODELS = {
  train: null, // 'assets/models/rooms/train.glb'
};

export class RoomsSection extends BaseSection {
  static meta = {
    id: 'rooms',
    title: 'Rooms',
    subtitle: '방 탐색',
    owner: '팀원 C',
    color: '#c9a37a',
    windowImage: 'assets/images/rooms/window.svg',
  };
  static css = new URL('./rooms.css', import.meta.url).href;
  static use3D = true;
  static pinned = 4;

  template() {
    return /* html */ `
      <header class="rooms-head">
        <p class="eyebrow">Rooms</p>
        <h2 class="rooms-name">${ROOMS[0].name}</h2>
        <p class="ph-note">스크롤로 방 이동 · 기차를 클릭해 보세요</p>
      </header>

      <nav class="rooms-nav" aria-label="방 선택">
        ${ROOMS.map((r, i) => `<button type="button" data-room="${i}">${r.name}</button>`).join('')}
      </nav>

      <!-- 이스터에그: 기차 클릭 시 열리는 히스토리 패널. data-native-scroll → 패널 안은 일반 스크롤 -->
      <aside class="rooms-history" data-native-scroll hidden>
        <button type="button" class="rooms-history-close" aria-label="닫기">닫기 ✕</button>
        <p class="eyebrow">Our roots — since 1943</p>
        <h3>1943</h3>
        <img class="ph-img" src="assets/images/rooms/ph-1.svg" alt="히스토리 임시 이미지" />
        <ol>
          <li><b>STATION 01</b> 연표 항목 자리</li>
          <li><b>STATION 02</b> 연표 항목 자리</li>
          <li><b>STATION 03</b> 연표 항목 자리</li>
        </ol>
        <p class="ph-note">기차가 역을 지나가며 연표가 넘어가는 연출은 담당자가 구현</p>
      </aside>
    `;
  }

  init() {
    const { scroll } = this.ctx;
    this.nameEl = this.$('.rooms-name');
    this.navBtns = this.$$('.rooms-nav button');
    this.history = this.$('.rooms-history');
    this.current = -1;

    // 방 버튼 → 해당 방 위치로 스크롤 (공통 스크롤 컨트롤러 사용)
    this.navBtns.forEach((b, i) => b.addEventListener('click', () => scroll.scrollTo(i / (ROOMS.length - 1))));
    this.$('.rooms-history-close').addEventListener('click', () => this.closeHistory());

    // --- 3D ---
    this.scene.background = new THREE.Color('#f3efe6');
    addBasicLights(this.scene);

    ROOMS.forEach((room, i) => {
      const g = new THREE.Group();
      g.position.x = i * GAP;
      const floor = box(6, 0.1, 6, room.floor);
      floor.position.y = -0.05;
      const back = box(6, 3, 0.1, '#ffffff');
      back.position.z = -3;
      const side = box(0.1, 3, 6, '#f7f4ee');
      side.position.x = -3;
      g.add(floor, back, side);

      room.items.forEach((it) => {
        const slot = this.addModel({ url: it.url, fallback: box(...it.size, it.color), name: it.name }, g);
        slot.position.set(it.pos[0], 0, it.pos[1]);
        const label = labelSprite(`${it.name} (임시)`);
        label.position.set(it.pos[0], it.size[1] + 0.45, it.pos[1]);
        g.add(label);
      });
      this.scene.add(g);
    });

    // 기차(임시 도형) + 운전하는 조케
    const trainFallback = new THREE.Group();
    const boiler = cylinder(0.14, 0.14, 0.5, '#ffdb00');
    boiler.rotation.z = Math.PI / 2;
    boiler.position.set(0.18, 0.26, 0);
    const cabin = box(0.3, 0.42, 0.3, '#ffdb00');
    cabin.position.x = -0.22;
    trainFallback.add(box(0.8, 0.12, 0.32, '#0058a3'), boiler, cabin);
    this.train = this.addModel({ url: MODELS.train, fallback: trainFallback, name: 'train' });
    this.train.userData.pickId = 'train'; // stage.pick() 이 이 id 를 돌려줍니다
    const driver = this.addCharacter(this.train);
    driver.scale.setScalar(0.45);
    driver.position.set(-0.22, 0.42, 0);

    // 3D 오브젝트 클릭/호버는 공통 stage.pick() 으로 처리
    this.el.addEventListener('click', (e) => {
      if (e.target.closest('button, .rooms-history')) return;
      if (this.ctx.stage.pick(e, this.camera, [this.train])?.id === 'train') this.openHistory();
    });
    this.el.addEventListener('pointermove', (e) => {
      const over = this.ctx.stage.pick(e, this.camera, [this.train])?.id === 'train';
      this.el.style.cursor = over ? 'pointer' : '';
    });
  }

  openHistory() {
    this.history.hidden = false;
    this.ctx.scroll.lock('rooms-history'); // 패널이 열려 있는 동안 섹션 스크롤 잠금
  }

  closeHistory() {
    this.history.hidden = true;
    this.ctx.scroll.unlock('rooms-history');
  }

  leave() {
    this.closeHistory();
  }

  update({ pin, time }) {
    // 방마다 잠깐 머물렀다가 다음 방으로 넘어가는 카메라
    const f = pin * (ROOMS.length - 1);
    const i = Math.min(Math.floor(f), ROOMS.length - 2);
    const x = (i + ease.inOut(seg(f - i, 0.25, 0.75))) * GAP;
    this.camera.position.set(x + 1.2, 3.4, 8.2);
    this.camera.lookAt(x, 0.9, -0.6);

    const idx = Math.round(f);
    if (idx !== this.current) {
      this.current = idx;
      this.nameEl.textContent = ROOMS[idx].name;
      this.navBtns.forEach((b, k) => b.classList.toggle('is-on', k === idx));
    }

    // 기차가 거실 앞쪽을 빙글빙글
    const a = time * 0.7;
    this.train.position.set(1.4 + Math.cos(a) * 1.1, 0, 1 + Math.sin(a) * 1.1);
    this.train.rotation.y = -a - Math.PI / 2;
    this.train.position.y = lerp(0, 0.02, Math.abs(Math.sin(time * 9)));
  }
}
