(() => {
  // 조절 값 — 각 고정 구간의 길이(화면 높이 배수)
  const LEN_A = 5.4;  // 인트로 → 사선 회전 → 색상 반전 → TO CREATE
  const LEN_G = 2.6;  // 격자 → 짧은 정사각형 상자 → Sustainability(끝에 잠시 머문다)
  const G_REF = 3.4, G_KEEP = 1.53; // 장면이 짜인 기준 길이, 그중 길이를 그대로 두는 앞부분(칸으로 다가가기까지)
  const LEN_I = 2.8;  // 지속가능성 세 가지
  const D = 1265.79;  // DEMOCRATIC DESIGN 시안이 남색 첫 화면보다 아래에 있는 거리(시안 px)
  const SHIFT = 362 - 469; // TO CREATE 문장 위치 변경만큼 이어지는 곡선을 옮긴다
  const STEP = 4; // 선을 재는 간격(시안 px)

  const $ = (q, el = document) => el.querySelector(q);
  const $$ = (q, el = document) => [...el.querySelectorAll(q)];
  const root = document.documentElement;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const mix = (a, b, t) => a + (b - a) * t;
  const seg = (q, a, b) => clamp((q - a) / (b - a));
  const out3 = t => 1 - Math.pow(1 - t, 3);
  const inOut = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  // 한 칸씩 넘어가되, 칸마다 잠깐 머문다
  const steps = (v, hold = .3) => { const i = Math.floor(v), f = v - i; return i + inOut(clamp((f - hold / 2) / (1 - hold))); };

  gsap.registerPlugin(ScrollTrigger);
  const calm = root.classList.contains('calm');
  let lenis = null;
  if (window.Lenis && !calm) {
    lenis = new Lenis({ lerp: 0.1 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  let s = 1, vw = 0, vh = 0, oy = 0;
  function measure() {
    vw = root.clientWidth; vh = innerHeight;
    s = Math.min(vw / 1920, vh / 1040);
    oy = vh / 2 - 540 * s; // 고정 화면에서 시안 맨 위가 놓이는 위치
    root.style.setProperty('--s', s);
  }

  const topbar = $('.topbar'), progress = $('.progress');
  const pinA = $('.pin-a'), pinG = $('.pin-g'), pinI = $('.pin-i'), story = $('.story');
  function layout() {
    pinA.style.height = (LEN_A + 1) * vh + 'px';
    pinG.style.height = (LEN_G + 1) * vh + 'px';
    pinI.style.height = (LEN_I + 1) * vh + 'px';
    // 남색 첫 화면이 풀려 올라가는 순간, 그 아래로 시안 좌표가 그대로 이어지게 한다
    // TO CREATE 문장이 시안(469)보다 위(362)로 올라가서, 아래 곡선·그림도 같은 만큼 올린다
    story.style.setProperty('--story-top', oy - vh + SHIFT * s + 'px');
    story.style.height = Math.max(0, (D + 3021 + SHIFT) * s + oy - vh) + 'px';
    layoutRoom();
  }
  let aTop = 0, aEnd = 0, gTop = 0, iTop = 0, max = 1;
  const top = el => el.getBoundingClientRect().top + scrollY;
  function cache() {
    aTop = top(pinA); aEnd = aTop + LEN_A * vh;
    gTop = top(pinG); iTop = top(pinI); storyTop = top(story);
    max = Math.max(1, root.scrollHeight - vh);
  }

  /* ---------- 1~3. 인트로 · 사선 · 띠 ---------- */
  const heroAbout = $('.t-about'), heroIkea = $('.t-ikea');
  const diag = $('.stage-a .diag'), h574 = $('.stage-a .h574');
  diag.style.transformOrigin = '960px 540px'; h574.style.transformOrigin = '960px 573.5px';
  const layerOld = $('.layer.old'), layerNew = $('.layer.new'), ingvarLines = $$('.ingvar .il > span'), koBrand = $('.ko-brand');
  const ingvarP = $('.ingvar'), brandEl = $('.brand'), ingvarTails = $$('.ingvar .tail');
  // 사선: 첫 화면 대각선(A0)에서 시작해 "/" 모양을 지나 ONE BRAND 화면의 회색 사선(AF)에 닿을 때 처음 멈춘다
  const A0 = 29.36, AF = 58.55 + 180; // 시계 방향: 대각선 → 세로 → "/" → 가로 → 회색 사선
  // 사선과 나란한 경계(사선에서 o만큼 떨어진 선)의 한쪽 면만 남기는 다각형. o가 작을수록 넓게 보인다
  function side(a, o) {
    const r = a * Math.PI / 180, dx = Math.cos(r), dy = Math.sin(r), nx = -dy, ny = dx, R = 4000;
    const cx = 960 + nx * o, cy = 540 + ny * o;
    const p = (u, v) => `${(cx + dx * u + nx * v).toFixed(1)}px ${(cy + dy * u + ny * v).toFixed(1)}px`;
    return `polygon(${p(-R, 0)},${p(R, 0)},${p(R, R)},${p(-R, R)})`;
  }
  const band = $('.band'), missionLines = $$('.mission .ml'), mission = $('.mission'), koMission = $('.ko-mission'), koLines = $$('.ko-mission .kl');
  const STRIP = [751, 838];   // 반전 때 남는 크림색 띠(= AND MANY, MANY PEOPLE 줄, 시안 위치)
  const CEN = (STRIP[0] + STRIP[1]) / 2 - 540; // 그 줄을 화면 정가운데로 올리는 거리
  const LIFT = 759 - CEN - 362; // 가운데 줄의 TO CREATE 첫 줄 → 최종 자리까지 올라가는 거리
  let bandLight = false, lastA = null;
  function renderA(q) {
    const k1 = inOut(seg(q, 0, .9));
    heroAbout.style.transform = `translate3d(0, ${-420 * k1}px, 0)`;
    heroIkea.style.transform = `translate3d(0, ${-420 * inOut(seg(q, .06, .96))}px, 0)`;
    topbar.style.transform = `translate3d(0, ${252 * s * (1 - k1)}px, 0)`;
    // Ingvar…: 스크롤을 시작하면 한 줄씩 세로선 뒤에서 나온다
    ingvarLines.forEach((el, i) => {
      const k = out3(seg(q, .04 + i * .07, .42 + i * .07));
      el.style.transform = `translate3d(${(-101 * (1 - k)).toFixed(2)}%, 0, 0)`;
    });
    // 이어서 첫 글자만 남는다: 나머지 글자가 오른쪽 끝부터 첫 글자 쪽으로 접히며 사라져 세로로 I·K·E·A가 된다
    ingvarTails.forEach((el, i) => {
      const k = inOut(seg(q, .7 + i * .06, 1.0 + i * .06));
      el.style.clipPath = `inset(-10% ${(k * 100).toFixed(2)}% -20% 0)`;
    });
    const r = seg(q, .25, 2.45), ang = mix(A0, AF, inOut(r)); // 회전 구간을 늘려 천천히 돈다
    diag.style.transform = `rotate(${ang.toFixed(3)}deg)`;
    h574.style.transform = `scaleX(${out3(seg(q, .8, 1.6))})`;
    // 가림막: 사선 위쪽(왼쪽 위) 면이 빈 면. 처음엔 화면 밖에 있다가 사선에 붙어 같이 돌고(중간 "/" 모양),
    // 끝으로 갈수록 다시 밀려나 ONE BRAND가 다 드러난다. Ingvar는 반대로 사선 쪽에서 밀려오는 경계에 잘려 사라진다
    // ONE BRAND는 처음부터 사선이 경계(가려져 있다가 사선이 지나가며 드러남). 후반엔 경계가 물러나 나머지가 열린다
    const half2 = inOut(seg(r, .5, 1));
    const oNew = r < .5 ? 0 : mix(0, -1600, half2);
    const oOld = r < .5 ? 0 : mix(0, 700, half2);
    // 둘이 붙어 보이지 않게: Ingvar는 위로 올라가며 잘려 나가고, ONE BRAND는 아래에서 시작해 멈출 때 제자리로
    // (가림막은 층에, 움직임은 그 안의 글에 줘서 경계가 사선에서 벗어나지 않게 한다)
    // Ingvar가 먼저 위로 멀리 올라가며 잘려 나가고, 그 뒤에 ONE BRAND가 아래에서 올라온다(시간을 엇갈려 간격 확보)
    ingvarP.style.transform = `translate3d(0, ${(-330 * inOut(seg(r, 0, .6))).toFixed(1)}px, 0)`;
    // 색상 반전 때는 문장 전체가 위로 올라와 띠가 화면 정가운데에 오게 한다
    const shut = inOut(seg(q, 2.7, 3.3));
    const down = `translate3d(0, ${(130 * (1 - inOut(seg(r, .35, 1))) - CEN * shut).toFixed(1)}px, 0)`;
    brandEl.style.transform = down; koBrand.style.transform = down;
    const key = ang.toFixed(3) + oNew.toFixed(1) + oOld.toFixed(1);
    if (key !== lastA) {
      lastA = key;
      // 시계 방향으로 돌 때 보이는 면(오른쪽 아래)이 앞쪽이 되도록 선 방향을 뒤집어 쓴다
      layerNew.style.clipPath = r >= 1 ? 'none' : side(ang + 180, oNew);
      layerOld.style.clipPath = side(ang + 180, oOld);
      layerOld.style.visibility = r >= 1 ? 'hidden' : 'visible';
    }
    koBrand.style.opacity = inOut(seg(q, 2.05, 2.45)).toFixed(3); // 한글은 같은 자리의 Ingvar가 다 잘려 나간 뒤에

    // 색상 반전: ONE BRAND 화면에서 멈춘 뒤, 남색이 위아래에서 덮어 오고 가운데 크림색 띠가 좁아진다.
    // 띠 안은 원래 남색 글자, 띠 밖(남색)은 같은 자리의 흰 TO CREATE — 띠가 선이 되었다 사라지면 남색 화면만 남는다
    const close = inOut(seg(q, 3.5, 4.1));
    const s0 = STRIP[0] - CEN * shut, s1 = STRIP[1] - CEN * shut, mid = (s0 + s1) / 2; // 띠도 글과 같이 가운데로
    const t = mix(mix(-60, s0, shut), mid, close), b = mix(mix(1140, s1, shut), mid, close);
    const tv = (oy + t * s).toFixed(1), bv = (oy + b * s).toFixed(1);
    band.style.visibility = shut > 0 ? 'visible' : 'hidden';
    band.style.clipPath = close >= 1 ? 'none' : `polygon(evenodd, 0 0, 100% 0, 100% 100%, 0 100%, 0 0, 0 ${tv}px, 100% ${tv}px, 100% ${bv}px, 0 ${bv}px, 0 ${tv}px)`;
    // 띠가 닫힌 뒤 나머지 줄이 떠오르며 문장 전체가 제자리로 올라간다
    const rest = inOut(seg(q, 4.15, 4.65)), lift = inOut(seg(q, 4.2, 5.1));
    const y = (LIFT * (1 - lift)).toFixed(1);
    mission.style.transform = `translate3d(0, ${y}px, 0)`; koMission.style.transform = `translate3d(0, ${y}px, 0)`;
    missionLines.forEach((el, i) => { if (i) el.style.opacity = rest; });
    koLines.forEach((el, i) => { if (i) el.style.opacity = rest; });
    bandLight = close >= 1 || (shut > 0 && oy + t * s > 56); // 위에서 내려온 남색이 상단바를 덮으면 흰 글자
  }

  /* ---------- 4. 스크롤을 따라 선이 그려지고, 그려지는 끝에 빛줄기가 지나간다 ---------- */
  const NS = 'http://www.w3.org/2000/svg';
  const lightG = $('.lights');
  // 레스토랑 빛처럼 앞은 밝고 뒤로 갈수록 흐려지도록, 길이가 다른 빛을 겹친다 [길이 비율, 진하기, 굵기]
  const LAYERS = [[1, .08, 1.4], [.8, .1, 1.4], [.6, .14, 1.4], [.4, .3, 1.4], [.25, .5, 1.4], [.1, .8, 1.4]];
  function addLight(o, tx, ty, T) {
    o.T = T;
    o.lights = LAYERS.map(([r, a, w]) => {
      const el = document.createElementNS(NS, 'path'), l = T * r;
      el.setAttribute('d', o.p.getAttribute('d')); el.setAttribute('transform', `translate(${tx} ${ty})`);
      el.setAttribute('stroke-width', w); el.style.opacity = a;
      el.style.strokeDasharray = `${l} ${o.len + T}`;
      lightG.append(el); return { el, l };
    });
  }
  let chain = null;
  const labels = $$('.label');
  async function loadChain() {
    const parser = new DOMParser();
    const groups = $$('.chain .seg');
    await Promise.all(groups.map(async g => {
      const svg = parser.parseFromString(await (await fetch(g.dataset.src)).text(), 'image/svg+xml').documentElement;
      $$('path', svg).forEach(p => { p.removeAttribute('id'); g.append(document.importNode(p, true)); });
    }));
    chain = groups.map(g => {
      const [tx, ty] = g.getAttribute('transform').match(/[-\d.]+/g).map(Number);
      const illo = g.classList.contains('illo');
      const paths = $$('path', g).map(p => {
        const len = p.getTotalLength();
        p.style.strokeDasharray = len; p.style.strokeDashoffset = len;
        const o = { p, len, off: len };
        if (!illo) addLight(o, tx, ty, 360);
        return o;
      });
      const c = { g, ty, illo, paths, k: -1 };
      if (!c.illo) {
        // 선을 STEP 간격으로 재 두고, "지금까지 가장 아래로 내려온 높이"로 스크롤 위치와 짝을 맞춘다
        const { p, len } = paths[0], pts = [], low = [];
        let m = -Infinity;
        for (let l = 0; l <= len + STEP; l += STEP) {
          const pt = p.getPointAtLength(Math.min(l, len)), x = pt.x + tx, y = pt.y + ty;
          m = Math.max(m, y); pts.push(x, y); low.push(m);
        }
        Object.assign(c, { len, pts, low, start: pts[1], end: pts[pts.length - 1] });
      }
      return c;
    });
    // 그림은 들어오는 선의 끝에서 나가는 선의 시작까지 그려진다
    let j = 0;
    chain.forEach((c, i) => {
      if (!c.illo) return;
      c.y0 = chain[i - 1].end;
      c.y1 = chain[i + 1] ? chain[i + 1].start : c.g.getBBox().y + c.g.getBBox().height + c.ty;
      c.label = labels[j++];
    });
    renderChain(lastTarget, true);
  }
  const lookup = (c, target) => {
    const low = c.low;
    if (target < low[0]) return 0;
    if (target >= low[low.length - 1]) return c.len;
    let a = 0, b = low.length - 1;
    while (b - a > 1) { const m = (a + b) >> 1; if (low[m] <= target) a = m; else b = m; }
    return Math.min(c.len, a * STEP + STEP * (target - low[a]) / Math.max(low[b] - low[a], 1e-3));
  };
  function setOff(o, v) {
    if (Math.abs(o.off - v) <= .05) return;
    o.off = v; o.p.style.strokeDashoffset = v;
    // 빛의 앞머리 = 지금 그려진 끝. 다 그려졌거나 아직 시작 전이면 숨긴다
    if (!o.lights) return;
    const drawn = o.len - v, on = drawn > .5 && drawn < o.len - .5;
    o.lights.forEach(({ el, l }) => {
      if (on !== el.on) { el.on = on; el.style.visibility = on ? 'visible' : 'hidden'; }
      if (on) el.style.strokeDashoffset = l - drawn;
    });
  }
  // 스크롤이 움직이는 동안에만 빛이 보이고, 멈추면 천천히 사라진다
  let lastTarget = -1e9, moved = 0, glow = 0;
  gsap.ticker.add((t, dt) => {
    const goal = performance.now() - moved < 120 ? 1 : 0;
    glow += (goal - glow) * (1 - Math.exp(-Math.min(dt, 50) / (goal ? 60 : 260)));
    if (glow < .01 && !goal) glow = 0;
    lightG.style.opacity = glow.toFixed(3);
  });
  function renderChain(target, force) {
    if (Math.abs(target - lastTarget) > .1 && lastTarget > -1e8) moved = performance.now();
    lastTarget = target;
    if (!chain) return;
    chain.forEach(c => {
      if (c.illo) {
        const k = clamp((target - c.y0 + 120) / (c.y1 - c.y0 + 120)); // 선이 닿기 조금 전부터 그리기 시작
        if (k === c.k && !force) return;
        c.k = k;
        c.paths.forEach(o => setOff(o, o.len * (1 - inOut(k))));
        setLabel(c, k);
      } else {
        setOff(c.paths[0], c.len - lookup(c, target));
      }
    });
  }

  /* 라벨: 그림이 반쯤 그려지면 나타나고, 라벨 쪽 짧은 선도 하얗게 그려진다 */
  const beams = $$('.beam').map(el => {
    const len = el.getTotalLength();
    el.style.strokeDasharray = len; el.style.strokeDashoffset = len;
    return { el, i: +el.dataset.i, len };
  });
  function setLabel(c, k) {
    const on = c.on ? k > .35 : k > .55;
    if (on === !!c.on) return;
    c.on = on;
    const i = labels.indexOf(c.label);
    gsap.killTweensOf(c.label);
    if (on) gsap.fromTo(c.label, { autoAlpha: 0, y: 36 }, { autoAlpha: 1, y: 0, duration: .9, ease: 'power3.out' });
    else gsap.to(c.label, { autoAlpha: 0, y: 20, duration: .35 });
    const bm = beams.find(b => b.i === i);
    if (bm) shootBeam(bm, on);
  }
  function shootBeam(bm, on) {
    gsap.to(bm.el, { strokeDashoffset: on ? 0 : bm.len, duration: on ? .9 : .35, ease: 'power2.inOut', overwrite: true });
  }

  gsap.from('.dd-copy > *', { y: 50, autoAlpha: 0, duration: 1, stagger: .15, ease: 'power3.out', scrollTrigger: { trigger: '.dd-copy', start: 'top 80%', toggleActions: 'play none none reverse' } });

  /* ---------- 5. 격자 속으로 — 빛줄기가 가운데 칸으로 모이고, 칸이 하얘지면 그 안으로 들어간다 ---------- */
  const plane = $('.plane'), cell = $('.cell'), edge = $('.sparks .edge');
  // 칸 크기: 위 DEMOCRATIC DESIGN의 세로선(x=332.5, 1226.5)이 격자선으로 이어지도록 맞춘 값.
  // 가운데 칸은 판(4800×4800)의 정가운데 = 화면 정가운데
  const CELL = 178.5, C0 = 2400 - CELL / 2, C1 = 2400 + CELL / 2;
  edge.setAttribute('d', `M${C0} ${C0}H${C1}V${C1}H${C0}Z`);
  // 격자선: 배경 무늬 대신 선으로 만들어, 화면에 들어올 때 하나씩 그어지게 한다
  const gridLines = [];
  {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', 'gridlines'); $('.sparks').prepend(g);
    for (let k = -14; k <= 14; k++) {
      const v = C0 + k * CELL;
      if (v < 0 || v > 4800) continue;
      [`M${v} 0V4800`, `M0 ${v}H4800`].forEach((d, j) => {
        const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        p.setAttribute('d', d); p.setAttribute('pathLength', 1); g.append(p);
        // 위에서 내려온 빛이 닿는 세로선(화면 x≈1228, k=2)부터 옆으로 퍼지고, 가로선은 위에서부터 차례로
        const delay = j ? .06 + clamp((v - 1860) / 1080) * .3 : Math.abs(k - 2) * .04;
        gridLines.push({ p, delay, off: 1 });
      });
    }
  }
  function drawGrid(pre) {
    gridLines.forEach(l => {
      const v = 1 - inOut(seg(pre, .36 + l.delay, .86 + l.delay));
      if (Math.abs(v - l.off) > .001) { l.off = v; l.p.style.strokeDashoffset = v; }
    });
  }
  // 빛줄기: 격자선을 타고 가운데 칸(C0~C1)의 모서리로 모인다. [시작 x, y, 끝 x, y, 출발 지연]
  const SPARK_T = 360;
  const sparks = [
    [0, C0, C0, C0, 0], [4800, C1, C1, C1, .03], [C1, 0, C1, C0, .06], [C0, 4800, C0, C1, .02],
    [700, C1, C0, C1, .08], [C0, 900, C0, C0, .05], [C1, 4000, C1, C1, .09],
    // 오른쪽 위에서 가운데 칸 위 모서리로 오는 빛은 카트에서 내려온 빛(relay)이 맡는다
  ].map(([x0, y0, x1, y1, d], i) => ({ x0, y0, x1, y1, d, el: $$('.sparks .spark')[i], grad: $('#sg' + i) }));
  /* 카트에서 격자로 이어지는 빛: 카트가 다 그려지면 옆 세로선(x≈1227)을 타고 내려와 격자로 들어가고,
     격자 가로선(가운데 칸 윗변 줄)을 따라 가운데 칸 오른쪽 위 모서리에 닿는다. 화면 좌표로 매 프레임 계산 */
  const relayPath = $('.relay-lit'), relayG = $('#relayG');
  const RX = 1227.5, GY = C0 - 1860, CX = C1 - 1440; // 세로선 x, 격자 가로선 y, 가운데 칸 오른쪽 모서리 x (화면 시안 좌표)
  let storyTop = 0, relayOn = false;
  function renderRelay(y) {
    const trolley = chain && chain[chain.length - 1];
    if (!trolley) return;
    const toX = X => vw / 2 + (X - 960) * s;
    const storyY = Y => storyTop + oy - vh + (SHIFT + Y) * s - y;    // 위 구간(스크롤과 함께 움직임)
    const stageTop = y < gTop ? gTop - y : 0;                        // 격자 화면(도착하면 고정)
    const x0 = toX(RX), y0 = storyY(trolley.y1), y1 = stageTop + oy + GY * s, x2 = toX(CX);
    // 빛 머리는 위 선이 그려지던 높이(=선 그리기 머리 위치)에 머문다 → 카트가 다 그려지는 순간 이어서 출발
    const len1 = Math.max(0, y1 - y0), len2 = Math.max(0, x0 - x2), T = 360 * s, at = (664 + SHIFT) * s + oy;
    // 세로 구간: 빛 머리는 그 높이에 머물고 그림이 지나간다 / 가로 구간: 격자 화면 안에서 스크롤로 나아간다
    const v = (y - gTop) / vh, v0 = (oy + GY * s - at) / vh;
    let d = clamp(at - y0, 0, len1);
    if (d >= len1) d = len1 + len2 * inOut(seg(v, v0, .75));
    const tailK = seg(v, .75, .9); // 모서리에 닿은 뒤 꼬리가 따라 들어와 사라진다
    const tail = Math.max(0, d - T * (1 - tailK));
    const on = d > 0 && d - tail > 1 && tailK < 1;
    if (on !== relayOn) { relayOn = on; relayPath.style.visibility = on ? 'visible' : 'hidden'; }
    if (!on) return;
    const pt = t => t <= len1 ? [x0, y0 + t] : [x0 - (t - len1), y1];
    const a = pt(tail), b = pt(d), g = pt(Math.max(0, d - T)), f = p => p[0].toFixed(1) + ' ' + p[1].toFixed(1);
    relayPath.setAttribute('d', `M${f(a)}${tail < len1 && d > len1 ? 'L' + f([x0, y1]) : ''}L${f(b)}`);
    relayG.setAttribute('x1', g[0]); relayG.setAttribute('y1', g[1]); relayG.setAttribute('x2', b[0]); relayG.setAttribute('y2', b[1]);
  }

  /* 짧은 정사각형 상자: 면은 칠하지 않고 선(평면 SVG 한 장)과 단어 4개만 그린다.
     끝 정사각형이 서서히 밝아지고, 도착하면 가로로 펼쳐지며 Sustainability 화면이 된다 */
  const room = $('.room'), tunnel = $('.tunnel'), sus = $('.sus');
  const railSvg = $('.rails'), gridG = $('.rails .grid'), backSq = $('.back-sq'), reveal = $('.reveal');
  const rails = $$('.rails .rail').map((el, i) => ({ el, lit: $$('.rails .lit')[i], grad: $('#rg' + i), x: +el.dataset.x, y: +el.dataset.y }));
  const words3d = $$('.word3d').map(el => ({ el, side: el.dataset.face }));
  const P = 700, DEP = 5000, LIT = 360; // 원근 거리, 상자 깊이, 선 위 빛줄기 길이(px)
  const T0 = .45, CAM = .84, T1 = .9;   // 상자에 들어감 · 끝에 닿음 · 화면으로 펼쳐짐(u)
  const RINGS = 4, DIV = 4;             // 깊이 방향 사각 테두리 수, 벽 한 면을 나누는 칸 수
  let W = 0, H = 0, A = 0;
  // 격자 선(한 번만 만든다): 깊이마다 정사각형 테두리 + 벽마다 깊이 방향 선
  const NSG = 'http://www.w3.org/2000/svg';
  const rings = Array.from({ length: RINGS }, (_, i) => ({ d: DEP * (i + 1) / (RINGS + 1), el: gridG.appendChild(document.createElementNS(NSG, 'path')) }));
  const longs = [];
  for (let j = 1; j < DIV; j++) {
    const v = -1 + 2 * j / DIV;
    [[v, -1], [v, 1], [-1, v], [1, v]].forEach(([x, y]) => longs.push({ x, y, el: gridG.appendChild(document.createElementNS(NSG, 'path')) }));
  }
  function layoutRoom() {
    W = root.clientWidth; H = vh; A = H / 2; // 상자 단면 = 화면 높이만 한 정사각형
    room.style.setProperty('--P', P + 'px');
    railSvg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    reveal.setAttribute('height', H);
    // 단어: 옆벽은 세로로 세우고(레퍼런스처럼), 천장·바닥은 가로로 눕힌다
    words3d.forEach(w => {
      const fs = H * .2, el = w.el;
      el.style.setProperty('--fs', fs + 'px');
      const tw = el.offsetWidth, mid = (H - tw) / 2;
      const t = {
        left: [`translate3d(${-A}px, ${-A}px, 0) rotateY(90deg) translate(${DEP * .3 + fs}px, ${mid}px) rotate(90deg)`, DEP * .3],
        right: [`translate3d(${A}px, ${-A}px, ${-DEP}px) rotateY(-90deg) translate(${DEP * .58 + fs}px, ${mid}px) rotate(90deg)`, DEP * .42],
        top: [`translate3d(${-A}px, ${-A}px, 0) rotateX(-90deg) translate(${mid}px, ${DEP * .52}px)`, DEP * .52],
        bottom: [`translate3d(${-A}px, ${A}px, ${-DEP}px) rotateX(90deg) translate(${mid}px, ${DEP * .38}px)`, DEP * .62],
      }[w.side];
      el.style.transform = t[0]; w.depth = t[1];
    });
  }
  const str = p => p[0].toFixed(1) + ' ' + p[1].toFixed(1);
  function renderRoom(u) {
    const show = u > T0 - .005 && u < .96;
    if (show !== room.on) { room.on = show; room.style.visibility = show ? 'visible' : 'hidden'; }
    const done = u >= .88;
    if (done !== sus.on) { sus.on = done; sus.style.visibility = done ? 'visible' : 'hidden'; }
    sus.style.opacity = seg(u, .88, .95).toFixed(3);
    realTicks.forEach((el, j) => { el.style.transform = `scaleY(${inOut(clamp((seg(u, .9, .99) - j / realTicks.length * .6) / .4)).toFixed(3)})`; });
    const cam = DEP * inOut(seg(u, T0, CAM)), zc = P * .9;
    // 상자 입구(격자 면)도 카메라에 맞춰 같이 커진다. 화면 밖으로 나가면 숨긴다
    if (u >= T0) plane.style.transform = `scale(${(H / (CELL * s) * P / (P - Math.min(cam, P * .85))).toFixed(4)})`;
    plane.style.visibility = u < T0 || cam < P * .85 ? 'visible' : 'hidden';
    if (!show) return;
    tunnel.style.transform = `translateZ(${cam.toFixed(1)}px)`;
    // 3D 점 → 화면. d는 입구에서 잰 깊이(0~DEP)
    const proj = (x, y, d) => { const f = P / (P - (cam - d)); return [W / 2 + x * f, H / 2 + y * f]; };
    const dNear = Math.max(0, cam - zc); // 카메라 뒤로 지나간 앞부분은 그리지 않는다
    const k = inOut(seg(u, T0, T0 + .14)); // 앞 30%: 선이 빛줄기와 함께 안쪽으로 그어진다
    const reach = DEP * k;
    rails.forEach(r => {
      const pt = d => proj(r.x * A, r.y * A, d);
      if (reach <= dNear) { r.el.setAttribute('d', ''); r.lit.setAttribute('d', ''); return; }
      r.el.setAttribute('d', `M${str(pt(dNear))}L${str(pt(reach))}`);
      if (!(k > 0 && k < 1)) { r.lit.setAttribute('d', ''); return; }
      const a2 = pt(Math.max(dNear, reach - LIT)), b2 = pt(reach), g0 = pt(Math.max(0, reach - LIT));
      r.lit.setAttribute('d', `M${str(a2)}L${str(b2)}`);
      r.lit.style.opacity = (1 - seg(k, .75, .98)).toFixed(3); // 끝 모서리에 닿기 전에 서서히 사라져 점이 남지 않게
      r.grad.setAttribute('x1', g0[0]); r.grad.setAttribute('y1', g0[1]); r.grad.setAttribute('x2', b2[0]); r.grad.setAttribute('y2', b2[1]);
    });
    // 사각 격자: 선이 지나간 곳까지만, 멀수록 흐리게
    longs.forEach(l => {
      l.el.setAttribute('d', reach > dNear ? `M${str(proj(l.x * A, l.y * A, dNear))}L${str(proj(l.x * A, l.y * A, reach))}` : '');
      l.el.style.opacity = .2; // 흰색 20%
    });
    rings.forEach(r => {
      const on = r.d > dNear && r.d <= reach;
      if (!on) { r.el.setAttribute('d', ''); return; }
      const c = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([x, y]) => str(proj(x * A, y * A, r.d)));
      r.el.setAttribute('d', `M${c.join('L')}Z`);
      r.el.style.opacity = (.2 * clamp(1 - (r.d - cam) / DEP)).toFixed(3); // 가까울 때 흰색 20%, 멀수록 흐리게
    });
    // 끝 정사각형: 테두리가 그어지고, 안이 어두운 색에서 천천히 밝아진다(페이지는 아직 그리지 않는다)
    const bc = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([x, y]) => str(proj(x * A, y * A, DEP)));
    backSq.setAttribute('d', `M${bc.join('L')}Z`);
    backSq.style.strokeOpacity = (.6 * inOut(seg(u, T0 + .12, T0 + .2))).toFixed(3); // 모서리 선이 다 도착한 뒤 네 변이 한꺼번에
    backSq.style.fillOpacity = inOut(seg(u, .6, .82)).toFixed(3);
    // 도착: 끝 정사각형이 가로로 펼쳐지며 화면 전체가 된다
    const open = u >= CAM;
    reveal.style.visibility = open ? 'visible' : 'hidden';
    if (open) { const w = mix(H, W, inOut(seg(u, CAM, T1))); reveal.setAttribute('x', ((W - w) / 2).toFixed(1)); reveal.setAttribute('width', w.toFixed(1)); }
    // 벽 단어: 멀수록 흐리고 가까울수록 또렷하다
    words3d.forEach(w => {
      const d = w.depth - cam;
      w.el.style.opacity = (seg(u, T0 + .03, T0 + .1) * (d < -P * .6 ? 0 : clamp(1 - d / (DEP * .9)) * .2)).toFixed(3); // 가까울 때 흰색 20%
    });
  }

  function renderG(u) {
    sparks.forEach(sp => {
      const p = inOut(seg(u, .03 + sp.d * .5, .2 + sp.d * .25));   // 달려오기
      const c = seg(u, .2 + sp.d * .25, .25 + sp.d * .25);          // 모서리에 닿은 뒤 꼬리가 따라 들어와 사라진다
      const len = Math.hypot(sp.x1 - sp.x0, sp.y1 - sp.y0), dx = (sp.x1 - sp.x0) / len, dy = (sp.y1 - sp.y0) / len;
      const head = len * p, tail = Math.max(0, head - SPARK_T * (1 - c));
      if (p <= 0 || c >= 1 || head - tail < 1) { sp.el.setAttribute('d', ''); return; }
      const hx = sp.x0 + dx * head, hy = sp.y0 + dy * head;
      sp.el.setAttribute('d', `M${(sp.x0 + dx * tail).toFixed(1)} ${(sp.y0 + dy * tail).toFixed(1)}L${hx.toFixed(1)} ${hy.toFixed(1)}`);
      sp.grad.setAttribute('x1', hx - dx * SPARK_T); sp.grad.setAttribute('y1', hy - dy * SPARK_T);
      sp.grad.setAttribute('x2', hx); sp.grad.setAttribute('y2', hy);
    });
    // 빛이 모이면 칸 테두리가 하얗게 이어진다(칸은 어두운 채). 그 테두리가 상자의 입구가 된다
    edge.style.strokeDashoffset = 1 - inOut(seg(u, .22, .28));
    // 빛이 모여 한 번 밝게 뜬 뒤, 다가가면서 격자 선 밝기로 가라앉는다(그 사이 모서리에서 원근 선이 출발한다)
    edge.style.opacity = (1 - .75 * inOut(seg(u, .33, .47))).toFixed(3);
    // 칸이 화면 높이만큼 커질 때까지 다가간다
    if (u < T0) plane.style.transform = `scale(${Math.pow(H / (CELL * s), inOut(seg(u, .3, T0))).toFixed(4)})`;
    renderRoom(u);
  }

  /* ---------- 6. Sustainability — 글자를 좌우로만 옮기고, 놓은 자리에 그대로 둔다 ---------- */
  const word = $('.word'), hint = $('.hint');
  let chs = [], home = [], xs = [], realTicks = [];
  const EDGE = 150; // 첫 글자·마지막 글자가 바깥으로 나갈 수 있는 거리(시안 px)
  function buildWord() {
    const text = 'Sustainability', cv = document.createElement('canvas').getContext('2d');
    cv.font = '500 140px Alexandria';
    word.innerHTML = ''; chs = []; home = []; xs = [];
    [...text].forEach((ch, i) => {
      const m = cv.measureText(ch), inkL = -m.actualBoundingBoxLeft, inkR = m.actualBoundingBoxRight;
      const el = document.createElement('span'); el.className = 'ch'; el.setAttribute('aria-hidden', 'true');
      // 글자의 실제 잉크 양 끝에 눈금을 세우고, 왼쪽 눈금에 번호를 단다
      el.innerHTML = `<span class="glyph">${ch}</span><i class="tk" style="left:${inkL.toFixed(2)}px"></i><i class="tk" style="left:${inkR.toFixed(2)}px"></i><span class="num" style="left:${inkL.toFixed(2)}px">${i}</span>` +
        (i === text.length - 1 ? `<span class="num" style="left:${inkR.toFixed(2)}px">${i + 1}</span>` : '');
      word.append(el);
      home.push({ l: el.offsetLeft + inkL, r: el.offsetLeft + inkR });
      chs.push(el); xs.push(0); drag(el, i);
    });
    realTicks = $$('.tk', word); // 도착한 뒤 하나씩 그어진다
    frame(true);
  }
  // 옆 글자의 잉크 끝에 닿으면 멈춘다. 처음부터 겹쳐 있던 글자는 지금 위치까지는 허용한다
  function range(i) {
    const lo = i ? home[i - 1].r + xs[i - 1] - home[i].l : -EDGE;
    const hi = i < chs.length - 1 ? home[i + 1].l + xs[i + 1] - home[i].r : EDGE;
    return [Math.min(lo, xs[i]), Math.max(hi, xs[i])];
  }
  function moveTo(i, x) {
    xs[i] = x;
    gsap.set(chs[i], { x });
  }
  function drag(el, i) {
    let id = null, sx = 0, bx = 0, lastDown = 0, lastX = 0;
    const reset = () => {
      const [lo, hi] = range(i), o = { x: xs[i] };
      gsap.to(o, { x: clamp(0, lo, hi), duration: .7, ease: 'power3.inOut', onUpdate: () => moveTo(i, o.x) });
    };
    el.addEventListener('pointerdown', e => {
      // 두 번 빠르게 누르면(더블클릭·더블탭) 그 글자만 처음 자리로
      const now = performance.now(), twice = now - lastDown < 350 && Math.abs(e.clientX - lastX) < 6;
      lastDown = twice ? 0 : now; lastX = e.clientX;
      if (twice) { reset(); return; }
      id = e.pointerId; el.setPointerCapture(id); el.classList.add('held');
      sx = e.clientX; bx = xs[i];
      gsap.to(hint, { autoAlpha: 0, duration: .4 });
    });
    el.addEventListener('pointermove', e => {
      if (e.pointerId !== id) return;
      const [lo, hi] = range(i);
      moveTo(i, clamp(bx + (e.clientX - sx) / s, lo, hi)); // 화면 배율만큼 나눠 시안 좌표로
    });
    const up = e => { if (e.pointerId === id) { id = null; el.classList.remove('held'); } };
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
  }
  const ready = () => { buildWord(); layoutRoom(); frame(true); };
  Promise.all([document.fonts.load('500 140px Alexandria'), document.fonts.load('300 100px Alexandria')]).then(ready, ready);

  /* ---------- 7. 세 가지 항목 ---------- */
  const titles = $$('.titles h3'), descs = $$('.descs p'), shots = $$('.shots img');
  const GRAY = [210, 205, 198], NAVY = [0, 12, 68];
  function renderI(r) {
    const p = steps(clamp(r * 2.3 - .15, 0, 2), .35);
    titles.forEach((el, i) => {
      const d = i - p, c = clamp(1 - Math.abs(d));
      el.style.transform = `translate3d(${670 + d * (d < 0 ? 695 : 754)}px, 0, 0)`;
      el.style.color = `rgb(${GRAY.map((g, k) => Math.round(mix(g, NAVY[k], c))).join(',')})`;
      const wt = Math.abs(d) < .5 ? '500' : '300'; // 가운데 온 제목만 미디움
      if (el.style.fontWeight !== wt) el.style.fontWeight = wt;
    });
    descs.forEach((el, i) => {
      const d = i - p;
      el.style.opacity = clamp(1 - Math.abs(d) * 2.5);
      el.style.transform = `translate3d(0, ${d * 24}px, 0)`;
    });
    shots.forEach((el, i) => {
      // 들어오는 사진은 아래에서 열리고, 나가는 사진은 위로 접힌다
      const d = i - p, v = clamp(1 - Math.abs(d));
      el.style.zIndex = d >= 0 ? 2 : 1;
      el.style.clipPath = d >= 0 ? `inset(${((1 - v) * 100).toFixed(2)}% 0 0 0)` : `inset(0 0 ${((1 - v) * 100).toFixed(2)}% 0)`;
      el.style.transform = `scale(${(1.12 - .12 * v).toFixed(4)})`;
    });
  }

  /* ---------- 화면 갱신마다 한 번, 모든 스크롤 동작을 같은 값으로 그린다 ---------- */
  let lastY = -1;
  function frame(force) {
    const y = scrollY;
    if (y === lastY && force !== true) return;
    lastY = y;
    const q = clamp((y - aTop) / vh, 0, LEN_A);
    renderA(q);
    renderChain((y - aEnd) / s + 664, force === true);
    renderRelay(y);
    // 격자 구간: 격자·빛줄기·칸으로 다가가기까지는 그대로, 상자(통로)를 지나는 뒷부분만 짧게 줄인다.
    // 아래 장면들은 원래 길이(G_REF) 기준의 진행도(u)로 짜여 있어서, 실제 스크롤을 그 진행도로 바꿔 준다
    const v = clamp((y - gTop) / vh, 0, LEN_G);
    const u = (v <= G_KEEP ? v : G_KEEP + (v - G_KEEP) * (G_REF - G_KEEP) / (LEN_G - G_KEEP)) / G_REF;
    drawGrid((y - gTop) / vh + 1); // 격자 화면이 아래에서 올라오는 동안 선이 그어진다
    renderG(u);
    renderI(clamp((y - iTop) / (LEN_I * vh)));
    // 상단바 색: 남색 구간에서는 흰색
    const light = y < aEnd + vh ? bandLight : y < gTop + LEN_G * vh ? !(y >= gTop && (u > .88)) : false;
    const theme = light ? 'light' : 'dark';
    if (topbar.dataset.theme !== theme) topbar.dataset.theme = theme;
    progress.style.transform = `scaleX(${1 / 6 + clamp(y / max) / 6})`;
  }

  measure(); layout();
  ScrollTrigger.addEventListener('refreshInit', () => { measure(); layout(); });
  ScrollTrigger.addEventListener('refresh', () => { cache(); frame(true); });
  gsap.ticker.add(() => frame());
  cache(); frame(true);
  loadChain().catch(() => {
    // 서버 없이 파일로 열어 SVG를 못 불러오면 그림만이라도 보이게 한다
    $$('.chain .seg').forEach(g => {
      const img = document.createElementNS(NS, 'image');
      img.setAttribute('href', g.dataset.src); g.append(img);
    });
    labels.forEach(l => gsap.set(l, { autoAlpha: 1 }));
  });
  addEventListener('load', () => ScrollTrigger.refresh());
})();
