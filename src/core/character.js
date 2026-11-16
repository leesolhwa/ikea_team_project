// 공통 캐릭터 "조케".
//  1) Character      : 화면 위에 떠 있는 2D 캐릭터 (미니맵 달리기, 창문 옆 인사, 아웃트로 등)
//  2) createCharacter3D() : 3D 씬 안에 넣는 캐릭터 (Rooms의 기차 운전 등)
// 둘 다 지금은 임시 도형입니다. 교체 위치는 아래 두 상수/템플릿뿐입니다.
import * as THREE from 'three';
import { modelSlot } from './assets.js';
import { tween, ease, lerp } from './tween.js';

/** 3D 캐릭터 GLB 경로. 준비되면 'assets/models/common/joke.glb' 처럼 넣으세요. */
export const CHARACTER_GLB = null;

/** 2D 캐릭터 임시 그림. 디자인이 나오면 이 SVG(또는 <img>)만 교체하세요. */
const SPRITE = `
  <svg viewBox="0 0 64 96" xmlns="http://www.w3.org/2000/svg">
    <g fill="#fff" stroke="#0a2a6b" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
      <path d="M22 92 V70 M42 92 V70" fill="none" />
      <rect x="18" y="36" width="28" height="38" rx="12" />
      <path class="joke-arm-l" d="M19 46 L8 60" fill="none" />
      <path class="joke-arm-r" d="M45 46 L57 30" fill="none" />
      <circle cx="32" cy="20" r="14" />
      <circle cx="37" cy="18" r="1.6" fill="#0a2a6b" stroke="none" />
      <path d="M30 26 q5 4 9 0" fill="none" stroke-width="2.4" />
    </g>
  </svg>`;

export class Character {
  constructor(el) {
    this.el = el;
    el.innerHTML = `<div class="joke"><div class="joke-say"></div><div class="joke-body">${SPRITE}</div></div>`;
    this.node = el.querySelector('.joke');
    this.sayEl = el.querySelector('.joke-say');
    this.x = 0; this.y = 0; this.scale = 1;
    this._sayTimer = 0;
  }

  show() { this.node.classList.add('is-on'); return this; }
  hide() { this.node.classList.remove('is-on', 'is-waving'); this.say(''); return this; }

  /** 즉시 배치. (x, y)는 캐릭터 발 위치의 화면 좌표(px). 스크롤 연동 연출에서 매 프레임 호출해도 됩니다. */
  place(x, y, { scale = this.scale, flip = false } = {}) {
    this.x = x; this.y = y; this.scale = scale;
    this.node.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -100%) scale(${flip ? -scale : scale}, ${scale})`;
    return this;
  }

  /** 시간 기반 이동. jump 값을 주면 포물선으로 점프합니다. */
  async moveTo(x, y, { duration = 600, jump = 0, scale = this.scale } = {}) {
    const x0 = this.x, y0 = this.y, s0 = this.scale;
    await tween({
      duration,
      ease: ease.inOut,
      onUpdate: (t) => this.place(lerp(x0, x, t), lerp(y0, y, t) - Math.sin(Math.PI * t) * jump, { scale: lerp(s0, scale, t), flip: x < x0 }),
    });
    this.place(x, y, { scale });
  }

  wave(on = true) { this.node.classList.toggle('is-waving', on); return this; }

  /** 말풍선. ms 뒤 자동으로 사라집니다 (0이면 유지, 빈 문자열이면 숨김) */
  say(text, ms = 1800) {
    clearTimeout(this._sayTimer);
    this.sayEl.textContent = text;
    this.sayEl.classList.toggle('is-on', !!text);
    if (text && ms) this._sayTimer = setTimeout(() => this.say(''), ms);
    return this;
  }
}

/**
 * 3D 캐릭터. 키 약 1(단위) 크기의 임시 도형이며, CHARACTER_GLB 를 넣으면 교체됩니다.
 * 반환된 그룹의 userData.setWave(0~1) 로 임시 도형의 팔을 흔들 수 있습니다
 * (GLB로 교체한 뒤에는 Blender 애니메이션 클립을 쓰세요: slot.userData.mixer / clips).
 */
export function createCharacter3D() {
  const white = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.6 });
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.36, 6, 16), white);
  body.position.y = 0.42;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.19, 24, 16), white);
  head.position.y = 0.92;
  const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.28, 4, 8), white);
  arm.geometry.translate(0, 0.16, 0);
  arm.position.set(0.22, 0.6, 0);
  arm.rotation.z = -0.9;
  g.add(body, head, arm);

  const slot = modelSlot({ url: CHARACTER_GLB, fallback: g, name: 'character' });
  slot.userData.setWave = (t) => { arm.rotation.z = -0.9 + Math.sin(t * Math.PI * 2) * 0.5; };
  return slot;
}
