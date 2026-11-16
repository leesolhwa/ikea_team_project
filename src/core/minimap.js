// 공통 미니맵.
//  - 인트로: 전체 화면(layout 0) → 우측 하단(layout 1)으로 줄어듭니다.
//  - 허브·섹션: 구석에서 현재 위치를 표시하고, 노드를 클릭하면 해당 섹션으로 이동합니다.
//  - 지나온 동선(visited)을 기록해 두었다가 아웃트로에서 다시 그립니다.
// 지금 그림은 임시 SVG입니다. 디자인이 나오면 _build() 의 SVG만 교체하면 됩니다
// (.mm-route 경로와 .mm-node[data-id] 만 유지하면 나머지 로직은 그대로 동작).
import { Emitter } from './emitter.js';
import { lerp, clamp } from './tween.js';

const VB = { w: 400, h: 260 };

export class Minimap extends Emitter {
  constructor(el, metas) {
    super();
    this.el = el;
    this.metas = metas;
    this.t = 0;
    this.visited = [];
    this.current = null;
    this._build();
    this.setLayout(0);
  }

  _points() {
    const n = this.metas.length;
    const nodes = this.metas.map((_, i) => ({
      x: 96 + (n > 1 ? (i * 228) / (n - 1) : 114),
      y: i % 2 ? 176 : 92,
    }));
    return { start: { x: 44, y: 214 }, nodes, end: { x: 356, y: 50 } };
  }

  _pathD(pts) {
    // Catmull-Rom → 베지어 곡선
    let d = `M${pts[0].x},${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
      const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
      const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
      d += ` C${c1.x.toFixed(1)},${c1.y.toFixed(1)} ${c2.x.toFixed(1)},${c2.y.toFixed(1)} ${p2.x},${p2.y}`;
    }
    return d;
  }

  _svg({ forClone = false } = {}) {
    const { start, nodes, end } = this._points();
    const d = this._pathD([start, ...nodes, end]);
    this._d = d;
    return `
      <svg class="mm-svg" viewBox="0 0 ${VB.w} ${VB.h}" xmlns="http://www.w3.org/2000/svg">
        <rect class="mm-bg" x="3" y="3" width="${VB.w - 6}" height="${VB.h - 6}" rx="6" />
        <g class="mm-walls">
          <path d="M70,3 V70 M70,110 V150 M3,150 H120 M160,150 H200 M200,3 V60 M200,100 V257 M300,110 H397 M300,110 V160 M300,200 V257 M120,220 H200" />
        </g>
        <path class="mm-route" d="${d}" />
        <path class="mm-trail" d="${d}" ${forClone ? 'pathLength="1"' : ''} />
        <text class="mm-tag" x="${start.x}" y="${start.y + 22}">START</text>
        <text class="mm-tag" x="${end.x}" y="${end.y - 12}">EXIT</text>
        ${nodes.map((p, i) => `
          <g class="mm-node" data-id="${this.metas[i].id}" transform="translate(${p.x},${p.y})">
            <circle r="12" />
            <text class="mm-num" y="4">${String(i + 1).padStart(2, '0')}</text>
            <text class="mm-label" y="29">${this.metas[i].title}</text>
          </g>`).join('')}
        ${forClone ? '' : '<circle class="mm-here" r="5" />'}
      </svg>`;
  }

  _build() {
    this.el.innerHTML = this._svg();
    this.svg = this.el.querySelector('svg');
    this.route = this.el.querySelector('.mm-route');
    this.trail = this.el.querySelector('.mm-trail');
    this.here = this.el.querySelector('.mm-here');
    this.nodes = [...this.el.querySelectorAll('.mm-node')];
    this.total = this.route.getTotalLength();

    // 각 노드가 경로의 몇 % 지점인지 미리 계산 (동선 그리기용)
    const { nodes } = this._points();
    this.fractions = nodes.map((n) => {
      let best = 0, bestD = Infinity;
      for (let i = 0; i <= 300; i++) {
        const p = this.route.getPointAtLength((i / 300) * this.total);
        const dd = (p.x - n.x) ** 2 + (p.y - n.y) ** 2;
        if (dd < bestD) { bestD = dd; best = i / 300; }
      }
      return best;
    });
    this._nodePts = nodes;
    this._drawTrail();

    this.nodes.forEach((g) => g.addEventListener('click', () => {
      if (this.t > 0.99) this.emit('navigate', g.dataset.id); // 구석에 있을 때만 클릭 이동
    }));
  }

  show() { this.el.classList.add('is-on'); }
  hide() { this.el.classList.remove('is-on'); }

  /** 0 = 전체 화면, 1 = 우측 하단 구석. 인트로가 스크롤 진행도로 직접 움직입니다. */
  setLayout(t) {
    this.t = clamp(t);
    const vw = window.innerWidth, vh = window.innerHeight, ar = VB.w / VB.h;
    const fullW = Math.max(vw, vh * ar); // 전체 화면을 꽉 채움 (넘치는 부분은 잘림)
    const cornerW = clamp(vw * 0.15, 150, 230);
    const w = lerp(fullW, cornerW, this.t);
    const h = w / ar;
    const margin = 20;
    const s = this.el.style;
    s.width = `${w}px`;
    s.left = `${lerp((vw - fullW) / 2, vw - cornerW - margin, this.t)}px`;
    s.top = `${lerp((vh - fullW / ar) / 2, vh - cornerW / ar - margin, this.t)}px`;
    s.height = `${h}px`;
    this.el.classList.toggle('is-corner', this.t > 0.99);
  }

  /** 현재 위치 표시 + 방문 기록. id 가 null 이면 표시만 지웁니다. */
  setActive(id) {
    this.current = id;
    const i = this.metas.findIndex((m) => m.id === id);
    this.nodes.forEach((g, k) => g.classList.toggle('is-current', k === i));
    this.here.style.display = i < 0 ? 'none' : '';
    if (i < 0) return;
    this.here.setAttribute('cx', this._nodePts[i].x);
    this.here.setAttribute('cy', this._nodePts[i].y);
  }

  /** 섹션에 실제로 들어갔을 때 호출 → 동선에 기록 */
  markVisited(id) {
    if (!this.visited.includes(id)) this.visited.push(id);
    this.nodes.forEach((g) => g.classList.toggle('is-visited', this.visited.includes(g.dataset.id)));
    this._drawTrail();
  }

  _trailFraction() {
    return this.visited.reduce((m, id) => Math.max(m, this.fractions[this.metas.findIndex((x) => x.id === id)] || 0), 0);
  }

  _drawTrail() {
    this.trail.style.strokeDasharray = `${this.total * this._trailFraction()} ${this.total}`;
  }

  /** 경로 위 u(0~1) 지점의 화면 좌표. 캐릭터가 점선을 따라 달릴 때 사용 */
  pointAt(u) {
    const p = this.route.getPointAtLength(clamp(u) * this.total);
    const m = this.svg.getScreenCTM();
    return { x: p.x * m.a + m.e, y: p.y * m.d + m.f };
  }

  /**
   * 아웃트로용 동선 그림(SVG 문자열).
   * .mm-trail 은 pathLength=1 이므로 stroke-dashoffset 1→0 으로 그려지는 연출을 만들 수 있습니다.
   */
  routeMarkup() {
    return this._svg({ forClone: true });
  }

  /** 방문 여부와 상관없이 아웃트로에서 끝까지 그릴지 결정할 때 참고 */
  get trailFraction() { return this._trailFraction(); }
}
