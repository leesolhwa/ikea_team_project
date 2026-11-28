/* =========================================================
   IKEA 로딩 인트로 (src/core/loading-intro.js)
   index.html 의 <div id="intro"><svg id="introSvg"></svg></div> 바로 뒤에서 불러와야
   첫 화면부터 인트로가 뜸 (defer/async 쓰지 말 것)
   흐름: 풀컬러 → 다크블루 → 설계도(로딩 %) → 선 → 해체 → 세로선 → 위로 빠지며 메인 공개
   - 같은 탭에서 한 번만 재생 (sessionStorage)
   - 상세페이지에서 방으로 돌아올 때(html.atlas-returning)는 재생 안 함
   - 확인용 주소: ?intro (항상 재생), ?intro=hold (설계도 단계에서 멈춤)
   ========================================================= */
(function () {
  'use strict';

  var CFG = {
    navyAt: 800,          // ① 풀컬러 → ② 다크블루 시작 (ms)
    draftAt: 1400,        // ③ 설계도 시작
    draftMin: 1900,       // 설계도(치수선까지)가 다 그려질 시간 (이보다 빨리 안 넘어감)
    minDuration: 3300,    // 로딩이 빨라도 최소 이만큼은 보여줌
    maxWait: 8000,        // 로딩이 늦어도 이 시간 지나면 그냥 넘어감
    lineHold: 750,        // ④ 치수선 지워지고 선만 남는 단계 길이
    dissolveDur: 1350,    // ⑤ 해체 전체 길이 (마지막 바깥 타원이 점으로 모일 때까지, intro.css 지연값과 맞춤)
    dropDur: 600,         // ⑥ 세로선 내려가는 시간
    mergedHold: 120,      // 세로선 다 내려온 뒤 잠깐 멈춤
    exitDur: 1000,        // ⑥ 위로 빠지는 시간 (intro.css 의 .p-exit 와 맞출 것)
    oncePerSession: true, // 같은 세션 재방문이면 인트로 생략
    storageKey: 'ikeaIntroSeen'
  };

  var intro = document.getElementById('intro');
  var svg = document.getElementById('introSvg');
  if (!intro || !svg) return;
  var root = document.documentElement;

  var seen = false;
  try { seen = CFG.oncePerSession && sessionStorage.getItem(CFG.storageKey) === '1'; } catch (e) {}
  // 테스트용: 주소 뒤에 ?intro 붙이면 항상 재생
  if (/[?&]intro\b/.test(location.search)) seen = false;
  // 디자인 확인용: ?intro=hold 면 설계도 단계에서 멈춰 있음
  var hold = /[?&]intro=hold\b/.test(location.search);
  // 상세페이지에서 방으로 돌아오는 중이면 생략 (index.html 머리의 스크립트가 붙이는 클래스)
  if (root.classList.contains('atlas-returning')) seen = true;
  if (seen) { intro.parentNode.removeChild(intro); return; }

  root.classList.add('intro-active');

  // 인트로가 떠 있는 동안 뒤쪽 공간(Room Atlas)이 휠·키·터치에 반응하지 않게 막음
  // (로딩이 끝난 뒤라면 이 입력이 '건너뛰기' 신호가 됨)
  var BLOCK = ['wheel', 'keydown', 'touchstart', 'touchmove', 'pointerdown', 'click'];
  function blockInput(e) {
    skip = true;
    e.stopImmediatePropagation();
    if (e.cancelable && (e.type === 'wheel' || e.type === 'touchmove' || e.type === 'keydown')) e.preventDefault();
  }
  BLOCK.forEach(function (ev) { window.addEventListener(ev, blockInput, { capture: true, passive: false }); });

  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------- SVG 헬퍼 ---------------- */
  var NS = 'http://www.w3.org/2000/svg';
  function el(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function seg(x1, y1, x2, y2, cls, delay, parent) {
    return el('path', {
      d: 'M' + x1 + ' ' + y1 + 'L' + x2 + ' ' + y2,
      pathLength: 1,
      'class': 'd ' + (cls || ''),
      style: '--d:' + (delay || 0) + 'ms'
    }, parent);
  }
  function text(x, y, str, attrs, parent) {
    var t = el('text', attrs || {}, parent);
    t.setAttribute('x', x); t.setAttribute('y', y);
    t.textContent = str;
    return t;
  }
  function ellD(cx, cy, rx, ry) {
    return 'M' + (cx - rx) + ' ' + cy +
      'A' + rx + ' ' + ry + ' 0 1 0 ' + (cx + rx) + ' ' + cy +
      'A' + rx + ' ' + ry + ' 0 1 0 ' + (cx - rx) + ' ' + cy + 'Z';
  }

  /* ---------------- 레이어 ---------------- */
  var defs = el('defs', {}, svg);
  var clip = el('clipPath', { id: 'introClip', clipPathUnits: 'userSpaceOnUse' }, defs);
  var clipRect = el('rect', {}, clip);

  var gGrid = el('g', { 'class': 'grid' }, svg);
  var gConsWrap = el('g', { 'clip-path': 'url(#introClip)' }, svg);
  var gCons = el('g', { 'class': 'cons ls' }, gConsWrap);
  var gLogoSpace = el('g', { 'class': 'ls' }, svg);
  var gLogo = el('g', { 'class': 'logo' }, gLogoSpace);
  var gDims = el('g', { 'class': 'dims' }, gLogo);
  var dropLine = el('path', { 'class': 'd drop', pathLength: 1 }, svg);
  var gTb = el('g', { 'class': 'tblock' }, svg);   // 우측 하단 도면 표제란 (로딩 %)

  /* ---------------- 로고 (피그마 좌표 그대로, 1920×1080 기준) ---------------- */
  el('rect', { 'class': 'bluebox', x: 607, y: 392, width: 706, height: 296 }, gLogo);
  el('path', { 'class': 'ell ell-outer', d: ellD(960, 540, 340, 137) }, gLogo);
  el('path', { 'class': 'ell ell-mid', d: ellD(960, 540, 336, 133) }, gLogo);
  el('path', { 'class': 'ell ell-inner', d: ellD(960, 540, 332, 128.5) }, gLogo);

  // 해체용 반쪽 타원: 아래 중앙에서 출발 → 왼쪽/오른쪽으로 돌아 맨 위까지.
  // 끝(맨 위)부터 지워지면 양쪽 끝이 곡선을 타고 아래 중앙점으로 내려옴.
  [[332, 128.5, 0], [336, 133, 90], [340, 137, 180]].forEach(function (e) {
    var rx = e[0], ry = e[1], b = 540 + ry, t = 540 - ry;
    [[960 - rx, 1], [960 + rx, 0]].forEach(function (side) {
      el('path', {
        'class': 'half', pathLength: 1,
        d: 'M960 ' + b + 'A' + rx + ' ' + ry + ' 0 0 ' + side[1] + ' ' + side[0] + ' 540' +
           'A' + rx + ' ' + ry + ' 0 0 ' + side[1] + ' 960 ' + t,
        style: '--xd:' + (520 + e[2]) + 'ms'
      }, gLogo);
    });
  });

  var LETTERS = [
    { x: 695.13, d: 'M0 0L57 0L57 118L0 118Z' },
    { x: 783.13, d: 'M0 0L57 0L57 47.12L88.73 0L148.29 0L112.36 51.12L156.38 118L87.23 118L57 69.06L57 118L0 118Z' },
    { x: 948.12, d: 'M0 0L109.36 0L109.36 30.6L57 30.6L57 45.02L100.59 45.02L100.59 71.09L57 71.09L57 86.01L109.36 86.01L109.36 118L0 118Z' },
    { x: 1068.08, d: 'M38.63 0L114.92 0L156.67 118L97.28 118L90.51 98.39L51.46 98.39L44.98 118L0 118Z' }
  ];
  // --xd = 해체 때 지워지는 순서 (바깥 글자 I, A 먼저 → 안쪽 K, E)
  var LETTER_OUT = [140, 280, 350, 210];
  LETTERS.forEach(function (L, i) {
    el('path', {
      'class': 'd letter', d: L.d, pathLength: 1,
      transform: 'translate(' + L.x + ' 480.27)',
      style: '--d:' + (i * 90) + 'ms;--xd:' + LETTER_OUT[i] + 'ms'
    }, gLogo);
  });
  el('path', {
    'class': 'd letter counter', d: 'M11.02 0L0 35.36L23.04 35.36Z', pathLength: 1,
    transform: 'translate(1128.24 517.31)', style: '--d:360ms;--xd:210ms'
  }, gLogo);
  el('path', { 'class': 'reg-c', d: ellD(1217.57, 495.27, 15, 15), pathLength: 1, style: '--xd:120ms' }, gLogo);
  text(1217.57, 503.8, 'R', { 'class': 'reg-t', 'text-anchor': 'middle' }, gLogo);
  gLogo.appendChild(gDims); // 치수선은 로고 위에

  var scan = seg(560, 403, 1360, 403, 'scan', 0, gLogo);
  scan.setAttribute('class', 'scan');

  /* ---------------- 보조선 (레퍼런스처럼 화면 끝까지 뻗는 선) ---------------- */
  // 전부 피그마 로고 좌표 그대로 (글자 모서리·타원 끝에 정확히 겹침)
  var X = {
    ellL: 620, iL: 695.13, iR: 752.13, kL: 783.13, kStem: 840.13, kR: 939.51,
    eL: 948.12, eR: 1057.48, aL: 1068.08, aR: 1224.75, ellR: 1300
  };
  var Y = { ellT: 403, top: 480.27, mid: 540, bot: 598.27, ellB: 677 };
  var CONS = [
    // 가로: 타원 위/아래 끝, 글자 윗선/아랫선, 중심축
    [960, Y.mid, 1, 0], [960, Y.top, 1, 0], [960, Y.bot, 1, 0], [960, Y.ellT, 1, 0], [960, Y.ellB, 1, 0],
    // 세로: 타원 좌/우 끝 + 글자 모서리 (= 치수 눈금 위치)
    [X.ellL, Y.mid, 0, 1], [X.iL, Y.mid, 0, 1], [X.iR, Y.mid, 0, 1], [X.kL, Y.mid, 0, 1],
    [X.kStem, Y.mid, 0, 1], [X.kR, Y.mid, 0, 1], [X.eL, Y.mid, 0, 1], [X.eR, Y.mid, 0, 1],
    [X.aL, Y.mid, 0, 1], [X.aR, Y.mid, 0, 1], [X.ellR, Y.mid, 0, 1],
    // 사선: K 4개 획, A 바깥 2개 획 (획 위에 정확히)
    [871.86, 480.27, -31.73, 47.12],   // K 윗팔 안쪽
    [931.42, 480.27, -35.93, 51.12],   // K 윗팔 바깥쪽
    [895.49, 531.39, 44.02, 66.88],    // K 다리 바깥쪽
    [870.36, 598.27, -30.23, -48.94],  // K 다리 안쪽
    [1106.71, 480.27, -38.63, 118],    // A 왼쪽 획
    [1182.99, 480.27, 41.75, 118]      // A 오른쪽 획
  ];
  CONS.forEach(function (c, i) {
    var len = Math.sqrt(c[2] * c[2] + c[3] * c[3]);
    var ux = c[2] / len * 4000, uy = c[3] / len * 4000;
    var delay = 120 + i * 45;
    seg(c[0], c[1], c[0] + ux, c[1] + uy, '', delay, gCons);
    seg(c[0], c[1], c[0] - ux, c[1] - uy, '', delay, gCons);
  });

  /* ---------------- 치수선 (Splash_1 참고해서 다시 그림) ---------------- */
  var dimDelay = 300;
  function slash(x, y, parent, delay) { seg(x - 4, y + 4, x + 4, y - 4, '', delay, parent); }
  function dimH(x1, x2, y, label, delay, ticks) {
    seg(x1, y, x2, y, '', delay, gDims);
    (ticks || [x1, x2]).forEach(function (x) { slash(x, y, gDims, delay + 200); });
    if (label != null) return text((x1 + x2) / 2, y - 7, label, { style: '--d:' + (delay + 300) + 'ms' }, gDims);
  }
  function dimV(x, y1, y2, label, delay) {
    seg(x, y1, x, y2, '', delay, gDims);
    slash(x, y1, gDims, delay + 200); slash(x, y2, gDims, delay + 200);
    var cy = (y1 + y2) / 2;
    text(x - 8, cy, label, { transform: 'rotate(-90 ' + (x - 8) + ' ' + cy + ')', style: '--d:' + (delay + 300) + 'ms' }, gDims);
  }
  function ext(x1, y1, x2, y2, delay) { seg(x1, y1, x2, y2, 'ext', delay, gDims); }
  function leader(pts, label, lx, ly, delay) {
    var d = 'M' + pts.map(function (p) { return p.join(' '); }).join('L');
    el('path', { d: d, pathLength: 1, 'class': 'd', style: '--d:' + delay + 'ms' }, gDims);
    el('circle', { cx: pts[0][0], cy: pts[0][1], r: 2.5, fill: '#000c44', 'class': 'dot' }, gDims);
    text(lx, ly, label, { style: '--d:' + (delay + 300) + 'ms' }, gDims);
  }

  // 전체 폭 240 (← 로딩 카운터). 끝점 = 타원 좌우 끝 (세로 보조선과 일치)
  var totalLabel = dimH(X.ellL, X.ellR, 318, '0', dimDelay);
  totalLabel.setAttribute('class', 'dim-total');

  // 32 / 36 / 36 / 36 / 36 / 32 — 눈금 = 타원 끝 + 각 글자 왼쪽/오른쪽 모서리
  var TICKS = [X.ellL, X.iL, X.kL, X.eL, X.aL, X.aR, X.ellR];
  var SEG = ['32', '36', '36', '36', '36', '32'];
  dimH(X.ellL, X.ellR, 352, null, dimDelay + 120, TICKS);
  SEG.forEach(function (s, i) {
    text((TICKS[i] + TICKS[i + 1]) / 2, 345, s, { style: '--d:' + (dimDelay + 420 + i * 50) + 'ms' }, gDims);
  });

  // 세로 100 (타원 높이) / 36 (글자 높이) — 끝점이 가로 보조선과 일치
  dimV(548, Y.ellT, Y.ellB, '100', dimDelay + 240);
  dimV(590, Y.top, Y.bot, '36', dimDelay + 300);

  // 글자 디테일: 20 = I 폭, 28 = K 다리 밑변, 12 = A 안쪽 삼각형 밑변, 6 = I~K 간격
  dimH(X.iR, X.kL, 512, '6', dimDelay + 380);
  dimH(X.iL, X.iR, 618, '20', dimDelay + 420);
  ext(870.36, Y.bot, 870.36, 626, dimDelay + 440);
  dimH(870.36, X.kR, 618, '28', dimDelay + 460);
  ext(1128.24, 552.67, 1128.24, 626, dimDelay + 480); ext(1151.28, 552.67, 1151.28, 626, dimDelay + 480);
  dimH(1128.24, 1151.28, 618, '12', dimDelay + 500);

  // 반지름 R200 / R100 / R12
  leader([[719.6, 636.9], [650, 712], [585, 712]], 'R200', 615, 705, dimDelay + 520);
  leader([[840, 659.9], [800, 736], [745, 736]], 'R100', 772, 729, dimDelay + 560);
  leader([[1228.2, 484.7], [1280, 455], [1330, 455]], 'R12', 1305, 448, dimDelay + 600);

  /* ---------------- 반응형: 격자 + 로고 배치 ---------------- */
  var tbPct, L = {};
  function layout() {
    // 인트로 중엔 스크롤바가 없으니 창 전체 크기 = 그리는 영역 (화면 끝까지 꽉 채움)
    var W = window.innerWidth, H = window.innerHeight;
    var m = W < 768 ? 12 : 20;
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);

    var s = W >= 768 ? Math.min(W / 1920, H / 1080) : Math.min(W * 0.92 / 860, H * 0.6 / 440);
    var tx = W / 2 - 960 * s, ty = H / 2 - 540 * s;
    [gCons, gLogoSpace].forEach(function (g) {
      g.setAttribute('transform', 'translate(' + tx + ' ' + ty + ') scale(' + s + ')');
    });
    clipRect.setAttribute('x', m); clipRect.setAttribute('y', m);
    clipRect.setAttribute('width', W - 2 * m); clipRect.setAttribute('height', H - 2 * m);

    // 격자 (피그마 '격자' 그룹: 테두리 + 8칸 눈금 + H~A / 8~1)
    while (gGrid.firstChild) gGrid.removeChild(gGrid.firstChild);
    seg(m, 0, m, H, '', 0, gGrid); seg(W - m, H, W - m, 0, '', 0, gGrid);
    seg(W, m, 0, m, '', 100, gGrid); seg(0, H - m, W, H - m, '', 100, gGrid);
    var COLS = 'HGFEDCBA', ROWS = '87654321';
    for (var k = 1; k < 8; k++) {
      var x = W * k / 8, y = H * k / 8, dl = 250 + k * 40;
      seg(x, 0, x, m, '', dl, gGrid); seg(x, H - m, x, H, '', dl, gGrid);
      seg(0, y, m, y, '', dl, gGrid); seg(W - m, y, W, y, '', dl, gGrid);
    }
    var fs = 'text-anchor:middle;';
    for (var i = 0; i < 8; i++) {
      var cx = W * (i + .5) / 8, cy = H * (i + .5) / 8, td = 'style';
      text(cx, m / 2 + 3.5, COLS[i], { style: fs + '--d:' + (400 + i * 40) + 'ms' }, gGrid);
      text(cx, H - m / 2 + 3.5, COLS[i], { style: fs + '--d:' + (400 + i * 40) + 'ms' }, gGrid);
      text(m / 2, cy + 3.5, ROWS[i], { style: fs + '--d:' + (400 + i * 40) + 'ms' }, gGrid);
      text(W - m / 2, cy + 3.5, ROWS[i], { style: fs + '--d:' + (400 + i * 40) + 'ms' }, gGrid);
    }

    // 세로선: 타원 아래 중앙 → 화면 아래 끝 (화면 가로 중앙)
    L = { W: W, H: H, cx: W / 2, y0: ty + 677 * s };
    dropLine.setAttribute('d', 'M' + L.cx + ' ' + L.y0 + 'L' + L.cx + ' ' + H);

    // 우측 하단 도면 표제란 (로딩 %)
    buildTitleBlock(W, H, m);
  }

  var tbBar, tbBarW = 0, tbBarX = 0, tbBarY = 0;
  function buildTitleBlock(W, H, m) {
    while (gTb.firstChild) gTb.removeChild(gTb.firstChild);
    var w = W < 768 ? 210 : 280, h = 100, pad = 14;
    var x = W - m - (W < 768 ? 10 : 18) - w, y = H - m - (W < 768 ? 10 : 18) - h;
    gTb.setAttribute('transform', 'translate(' + x + ' ' + y + ')');
    el('rect', { 'class': 'tb-bg', x: 0, y: 0, width: w, height: h }, gTb);
    seg(0, 0, w, 0, '', 300, gTb); seg(w, 0, w, h, '', 300, gTb);
    seg(w, h, 0, h, '', 300, gTb); seg(0, h, 0, 0, '', 300, gTb);
    seg(0, 44, w, 44, '', 450, gTb);
    seg(w * 0.62, 22, w * 0.62, 44, '', 500, gTb);
    seg(0, 22, w, 22, '', 500, gTb);
    text(pad, 15.5, 'IKEA EXPERIENCE RENEWAL', { 'class': 'tb-s' }, gTb);
    text(pad, 37.5, 'DWG. LOGO-01', { 'class': 'tb-s' }, gTb);
    text(w * 0.62 + 10, 37.5, 'SCALE 1:1', { 'class': 'tb-s' }, gTb);
    text(pad, 66, 'LOADING', { 'class': 'tb-s' }, gTb);
    tbPct = text(w - pad, 74, '000%', { 'class': 'tb-pct', 'text-anchor': 'end' }, gTb);
    tbBarX = pad; tbBarY = h - 13; tbBarW = w - pad * 2;
    el('path', { 'class': 'tb-track', d: 'M' + tbBarX + ' ' + tbBarY + 'h' + tbBarW }, gTb);
    tbBar = el('path', { 'class': 'tb-bar' }, gTb);
  }
  function setProgress(p) {
    totalLabel.textContent = Math.round(p * 240);
    tbPct.textContent = ('00' + Math.round(p * 100)).slice(-3) + '%';
    tbBar.setAttribute('d', 'M' + tbBarX + ' ' + tbBarY + 'h' + (tbBarW * p).toFixed(1));
  }
  layout();
  window.addEventListener('resize', layout);

  /* ---------------- 로딩 추적 ---------------- */
  var tasks = 0, done = 0;
  function track(p) {
    tasks++;
    Promise.resolve(p).catch(function () {}).then(function () { done++; });
  }
  if (document.fonts && document.fonts.ready) track(document.fonts.ready);
  track(new Promise(function (r) {
    if (document.readyState === 'complete') r();
    else window.addEventListener('load', function () { r(); }, { once: true });
  }));
  // 다른 리소스도 기다리고 싶으면: IntroLoader.wait(promise)
  window.IntroLoader = { wait: track };

  /* ---------------- 시퀀스 ---------------- */
  var t0 = performance.now();
  var draftStart = 0, shown = 0, finishing = false, skip = false;
  function add(c) { intro.classList.add(c); }
  function later(fn, ms) { setTimeout(fn, ms); }

  if (reduce) {
    add('p-color'); add('p-navy');
  } else {
    requestAnimationFrame(function () { requestAnimationFrame(function () { add('p-color'); }); });
    later(function () { add('p-navy'); }, CFG.navyAt);
    later(function () { add('p-draft'); draftStart = performance.now(); }, CFG.draftAt);
  }

  function tick() {
    if (finishing) return;
    var now = performance.now(), elapsed = now - t0;
    var loaded = tasks > 0 && done >= tasks;

    // 표시용 진행률: 실제 로딩 + 시간 기반으로 부드럽게 (완료 전엔 92%에서 멈춤)
    var creep = 0.92 * (1 - Math.exp(-elapsed / 1600));
    var goal = loaded ? 1 : Math.min(0.92, Math.max(creep, (done / Math.max(tasks, 1)) * 0.92));
    shown += (goal - shown) * (loaded ? 0.12 : 0.06);
    if (loaded && goal - shown < 0.004) shown = 1;

    setProgress(shown);

    var timeUp = elapsed >= CFG.maxWait;
    var drawn = reduce || (draftStart && now - draftStart >= CFG.draftMin);
    var ready = !hold && ((loaded && shown === 1) || timeUp);
    if (hold) timeUp = false;

    intro.classList.toggle('is-waiting', !!(drawn && !ready));

    if (ready && (reduce || drawn) && (elapsed >= CFG.minDuration || skip || timeUp)) {
      if (timeUp) setProgress(1);
      finish();
      return;
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  function finish() {
    finishing = true;
    intro.classList.remove('is-waiting');
    if (reduce) {
      add('p-fade');
      later(cleanup, 450);
      return;
    }
    add('p-line');                 // ④ 치수선·보조선 지워짐 → Frame 93 상태
    later(function () {
      add('p-dissolve');           // ⑤ 격자·글자·® 는 자기 선 따라 지워지고, 타원은 반갈라 아래 중앙점으로
      later(function () {
        add('p-drop');             // ⑥ 그 점에서 세로선이 아래로
        later(function () {
          add('p-exit');           // ⑦ 위로 빠지며 메인 공개
          document.dispatchEvent(new CustomEvent('intro:exit'));
          later(cleanup, CFG.exitDur + 50);
        }, CFG.dropDur + CFG.mergedHold);
      }, CFG.dissolveDur);
    }, CFG.lineHold);
  }

  function cleanup() {
    try { sessionStorage.setItem(CFG.storageKey, '1'); } catch (e) {}
    window.removeEventListener('resize', layout);
    BLOCK.forEach(function (ev) { window.removeEventListener(ev, blockInput, { capture: true }); });
    root.classList.remove('intro-active');
    if (intro.parentNode) intro.parentNode.removeChild(intro);
    document.dispatchEvent(new CustomEvent('intro:done'));
  }
})();
