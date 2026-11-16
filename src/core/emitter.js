// 아주 작은 이벤트 버스. on() 은 해제 함수를 돌려줍니다.
export class Emitter {
  constructor() { this._l = new Map(); }
  on(type, fn) {
    if (!this._l.has(type)) this._l.set(type, new Set());
    this._l.get(type).add(fn);
    return () => this._l.get(type)?.delete(fn);
  }
  emit(type, payload) { this._l.get(type)?.forEach((fn) => fn(payload)); }
}
