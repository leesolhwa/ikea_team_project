// 공통 스크롤 제어.
// 브라우저 기본 스크롤을 쓰지 않고 휠/터치/키 입력을 하나의 "가상 스크롤"로 모읍니다.
//  - scrub 모드: 현재 섹션의 진행도(0~1)를 움직입니다. 끝에서 더 밀면 'edge' 이벤트.
//  - step  모드: 창문 허브에서 한 번에 한 칸씩 'step' 이벤트.
// 섹션 안에서 직접 휠 이벤트를 달지 말고, update() 로 넘어오는 progress 만 사용하세요.
import { Emitter } from './emitter.js';
import { clamp } from './tween.js';
import { FLOW } from '../config.js';

export class ScrollController extends Emitter {
  constructor() {
    super();
    this.mode = 'scrub';
    this.length = 1;   // px
    this.target = 0;   // px (입력 즉시 반영)
    this.current = 0;  // px (부드럽게 따라감)
    this._locks = new Set();
    this._over = 0;
    this._overDir = 0;
    this._edgeAt = 0;
    this._stepAcc = 0;
    this._lastStep = 0;
    this._overTimer = 0;
    this._bind();
  }

  get progress() { return clamp(this.current / this.length); }
  get locked() { return this._locks.size > 0; }

  /** 스크롤 잠금. 이유(reason)별로 관리해서 서로의 잠금을 풀어버리지 않게 합니다. */
  lock(reason = 'default') { this._locks.add(reason); }
  unlock(reason = 'default') { this._locks.delete(reason); }

  setScrub(length, progress = 0) {
    this.mode = 'scrub';
    this.length = Math.max(1, length);
    this.target = this.current = clamp(progress) * this.length;
    this._resetOver();
    this._edgeAt = performance.now();
  }

  setStep() {
    this.mode = 'step';
    this._stepAcc = 0;
    this._lastStep = performance.now() - FLOW.stepCooldown / 2;
    this._resetOver();
  }

  /** 리사이즈 등으로 길이만 바뀔 때: 진행도는 유지 */
  setLength(length) {
    const p = this.progress;
    this.length = Math.max(1, length);
    this.target = this.current = p * this.length;
  }

  /** 섹션에서 특정 진행도로 이동시킬 때 (예: 방 선택 버튼) */
  scrollTo(progress, { immediate = false } = {}) {
    if (this.mode !== 'scrub') return;
    this.target = clamp(progress) * this.length;
    if (immediate) this.current = this.target;
  }

  update(dt) {
    if (this.mode !== 'scrub') return;
    const k = 1 - Math.pow(1 - FLOW.smoothing, dt * 60);
    this.current += (this.target - this.current) * k;
    if (Math.abs(this.target - this.current) < 0.05) this.current = this.target;
  }

  _resetOver() {
    clearTimeout(this._overTimer);
    if (this._over) this.emit('overscroll', { dir: 0, ratio: 0 });
    this._over = 0;
    this._overDir = 0;
  }

  _input(dy) {
    if (this.locked || !dy) return;
    const now = performance.now();

    if (this.mode === 'step') {
      if (now - this._lastStep < FLOW.stepCooldown) { this._stepAcc = 0; return; }
      this._stepAcc += dy;
      if (Math.abs(this._stepAcc) >= FLOW.stepThreshold) {
        const dir = Math.sign(this._stepAcc);
        this._stepAcc = 0;
        this._lastStep = now;
        this.emit('step', dir);
      }
      return;
    }

    const next = this.target + dy;
    if (next >= 0 && next <= this.length) {
      this.target = next;
      if (this._over) this._resetOver();
      return;
    }

    // 끝을 넘어선 입력 → 오버스크롤 누적
    const dir = next < 0 ? -1 : 1;
    this.target = clamp(next, 0, this.length);
    if (Math.abs(this.current - this.target) > 2) { this._edgeAt = now; return; } // 아직 끝에 도착 중
    if (now - this._edgeAt < FLOW.edgeDelay) return;                              // 관성 스크롤 무시
    if (dir !== this._overDir) { this._over = 0; this._overDir = dir; }
    this._over += Math.abs(dy);
    clearTimeout(this._overTimer);
    this._overTimer = setTimeout(() => this._resetOver(), 900);
    const ratio = clamp(this._over / FLOW.overscrollThreshold);
    this.emit('overscroll', { dir, ratio });
    if (ratio >= 1) {
      this._resetOver();
      this.emit('edge', dir);
    }
  }

  _bind() {
    // [data-native-scroll] 안쪽은 브라우저 기본 스크롤을 그대로 둡니다 (모달 등)
    const native = (e) => e.target instanceof Element && e.target.closest('[data-native-scroll]');

    window.addEventListener('wheel', (e) => {
      if (native(e)) return;
      e.preventDefault();
      let dy = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (e.deltaMode === 1) dy *= 40;
      else if (e.deltaMode === 2) dy *= window.innerHeight;
      this._input(dy);
    }, { passive: false });

    let tx = 0, ty = 0;
    window.addEventListener('touchstart', (e) => {
      tx = e.touches[0].clientX; ty = e.touches[0].clientY;
    }, { passive: true });
    window.addEventListener('touchmove', (e) => {
      if (native(e)) return;
      e.preventDefault();
      const x = e.touches[0].clientX, y = e.touches[0].clientY;
      const dx = tx - x, dy = ty - y;
      tx = x; ty = y;
      this._input((Math.abs(dx) > Math.abs(dy) ? dx : dy) * 1.6);
    }, { passive: false });

    window.addEventListener('keydown', (e) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const page = window.innerHeight * 0.6;
      const map = { ArrowDown: page / 3, ArrowUp: -page / 3, PageDown: page, PageUp: -page, ' ': page };
      if (this.mode === 'step') Object.assign(map, { ArrowRight: page, ArrowLeft: -page, ArrowDown: page, ArrowUp: -page });
      if (e.key in map) { e.preventDefault(); this._input(map[e.key]); }
    });
  }
}
