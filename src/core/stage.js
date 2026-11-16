// 공통 3D 스테이지: WebGL 렌더러는 사이트 전체에서 딱 하나만 씁니다.
// 각 섹션은 자기 scene / camera 만 갖고, 활성 섹션의 것만 렌더링됩니다.
import * as THREE from 'three';

export class Stage {
  constructor(canvas) {
    this.canvas = canvas;
    this.active = null;
    this.enabled = true;
    this._ndc = new THREE.Vector2();
    this._ray = new THREE.Raycaster();
    try {
      this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      this.renderer.setClearColor(0x000000, 0);
    } catch (err) {
      // WebGL을 못 쓰는 환경에서도 DOM 흐름은 계속 동작하게 둡니다.
      console.warn('[stage] WebGL 초기화 실패 — 3D 없이 진행합니다.', err);
      this.enabled = false;
    }
    this.resize();
  }

  setActive(section) {
    this.active = section?.scene && section?.camera ? section : null;
    this.canvas.style.visibility = this.active ? 'visible' : 'hidden';
  }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.width = w; this.height = h;
    this.renderer?.setSize(w, h, false);
  }

  render() {
    if (!this.enabled || !this.active) return;
    this.renderer.render(this.active.scene, this.active.camera);
  }

  /**
   * 마우스 위치의 3D 오브젝트 찾기.
   * 오브젝트(또는 부모)에 userData.pickId 를 달아 두면 그 값을 id 로 돌려줍니다.
   * @returns {{ id: string|null, object: THREE.Object3D, point: THREE.Vector3 } | null}
   */
  pick(event, camera, objects) {
    if (!this.enabled) return null;
    this._ndc.set((event.clientX / this.width) * 2 - 1, -(event.clientY / this.height) * 2 + 1);
    this._ray.setFromCamera(this._ndc, camera);
    const hit = this._ray.intersectObjects(objects, true)[0];
    if (!hit) return null;
    let o = hit.object, id = null;
    while (o) {
      if (o.userData?.pickId) { id = o.userData.pickId; break; }
      o = o.parent;
    }
    return { id, object: hit.object, point: hit.point };
  }
}
