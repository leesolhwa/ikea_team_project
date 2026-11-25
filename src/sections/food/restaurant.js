(() => {
  const ACTS = [
    { key: 'rt', title: 'Restaurant', theme: 'light', bg: '#000622', angle: -74.7, items: [
      ['단호박죽', '3,500원', '단호박과 맷돌호박을 넣어 달콤하고 구수한 죽.'],
      ['베지볼 5알', '3,900원', '병아리콩과 채소로 만든 베지볼에 쿠스쿠스와 스윗갈릭 소스를 곁들인 메뉴.'],
      ['리치 토마토파스타', '6,900원', '진한 토마토소스에 파마산 치즈를 더한 파스타.'],
      ['플랜트 볼 8알', '5,400원', '식물성 볼에 으깬 감자, 채소, 잼, 그레이비를 곁들인 메뉴. 소스에는 동물성 원료가 들어가요.'],
      ['새로워진 미트볼 김치볶음밥', '5,900원', '직화로 지은 밥에 잘 익은 김치와 미트볼을 더한 볶음밥.'],
      ['국내산 무항생제 통등심 돈가스', '8,900원', '옥수수 크럼블을 입힌 바삭한 통등심 돈가스. 사진에는 밥과 채소가 함께 나와요.'],
    ] },
    { key: 'bo', title: 'Bistro', theme: 'light', bg: '#0c3494', angle: -43.8, items: [
      ['컵떡볶이', '2,500원', '쌀떡, 어묵, 메추리알을 담은 매콤달콤한 국물 떡볶이.'],
      ['김치 도그', '1,500원', '볶음김치와 바삭한 튀김 양파를 올린 핫도그.'],
      ['미트볼 도그', '1,900원', '부드러운 번에 미트볼과 토마토소스를 넣은 핫도그.'],
      ['달라호스 십원빵', '3,000원', '스웨덴 달라호스 문양을 새긴 빵에 모짜렐라와 슈크림을 넣은 간식.'],
      ['마르게리따 피자', '3,500원', '토마토와 치즈를 올린 마르게리따 피자.'],
    ] },
    { key: 'ce', title: 'Café', theme: 'dark', bg: '#fad917', angle: -9.7, items: [
      ['핫 커피', '1,500원', '따뜻하게 즐기는 블랙커피.'],
      ['따뜻한 제주 말차 라떼', '2,900원', '제주 말차의 풍미를 따뜻하게 즐기는 라떼.'],
      ['아이스 제주 말차 라떼', '2,900원', '제주 말차 라떼에 얼음을 넣어 차갑게 즐기는 음료.'],
      ['블루베리 라즈베리 치즈 케이크', '4,900원', '크림치즈에 블루베리와 라즈베리의 상큼함을 더한 케이크.'],
      ['크림치즈 프레즐', '1,900원', '쫄깃한 프레즐 속에 부드러운 크림치즈를 채운 빵.'],
      ['크림 롤 케이크', '3,900원', '부드러운 시트에 크림을 듬뿍 넣어 말아낸 케이크.'],
    ] },
    { key: 'fm', title: 'Food Market', theme: 'dark', bg: '#fcfaf6', angle: 22.2, items: [
      ['요거트 케이크', '19,900원', '레몬과 그릭요거트를 넣은 촉촉한 링 모양 파운드케이크.'],
      ['바게트', '2,900원', '길쭉하게 구운 클래식 바게트.'],
      ['블랙올리브 & 타임 바게트', '1,900원', '블랙올리브와 타임 향을 더한 미니 바게트.'],
      ['플레인 치아바타', '2,200원', '담백한 맛의 직사각형 치아바타.'],
      ['무화과 로프', '5,900원', '무화과를 넣고 로프 형태로 구운 빵.'],
      ['사워도우 브레드', '3,900원', '사워도우 반죽을 타원형으로 구운 빵.'],
    ] },
  ];

  // 조절 값
  const GAP = 470;           // 접시 중심 간격(시안 px)
  const SPIN = 180;          // 한 칸 이동할 때 회전 각도
  const STEP_SCROLL = 420;   // 한 칸 이동에 필요한 스크롤(px)
  const RECEIPT_STEPS = 2.6; // 마지막에 영수증이 나오는 구간(칸)
  const SNAP_WAIT = 160;     // 스크롤이 멈춘 뒤 접시가 중앙을 찾기까지(ms)

  const $ = (q, el = document) => el.querySelector(q);
  const $$ = (q, el = document) => [...el.querySelectorAll(q)];
  const root = document.documentElement;
  if (!window.gsap || !window.ScrollTrigger) root.classList.add('flat');
  const flat = root.classList.contains('flat');
  const desktop = root.classList.contains('d');
  const topbar = $('.topbar');
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const mix = (a, b, t) => a + (b - a) * t;

  let s = 1, vw = 0, vh = 0;
  function measure() {
    vw = root.clientWidth; vh = window.innerHeight;
    s = Math.min(vw / 1920, vh / 880);
    root.style.setProperty('--s', s);
    root.style.setProperty('--vw', vw);
  }
  measure();
  matchMedia('(max-width: 767px)').addEventListener('change', () => location.reload());

  const items = ACTS.flatMap((a, act) => a.items.map((it, i) => ({ act, name: it[0], price: it[1], desc: it[2], src: `../../../assets/images/food/restaurant/${a.key}${i + 1}.jpg` })));
  const LAST = items.length - 1;
  const firstOf = ACTS.map((_, a) => items.findIndex(i => i.act === a));

  function fillCaption(el, it) {
    const [n, p] = $$('.name span', el);
    n.textContent = it.name; p.textContent = it.price; $('.desc', el).textContent = it.desc;
  }

  /* ---------- 상단바: 색상 + 진행률 ---------- */
  // 위치는 한 번 재서 저장해 두고, 스크롤 중에는 다시 재지 않는다
  const progress = $('.progress'), themed = $$('[data-theme]:not(.topbar)');
  let max = 0, zones = [];
  function cacheZones() {
    max = root.scrollHeight - innerHeight;
    zones = themed.concat($$('.act')).map(el => {
      const box = (el.closest('.intro-pin, .bf-pin, .pin') || el).getBoundingClientRect();
      return { el, top: box.top + scrollY, bottom: box.bottom + scrollY, h: box.height };
    }).filter(z => z.h);
  }
  function updateTopbar() {
    progress.style.transform = `scaleX(${5 / 6 + (max > 0 ? clamp(scrollY / max) : 0) / 6})`;
    const y = scrollY + 30;
    const hit = zones.filter(z => z.top <= y && z.bottom > y).pop(), el = hit && hit.el;
    if (el && topbar.dataset.theme !== el.dataset.theme) topbar.dataset.theme = el.dataset.theme;
  }

  /* ---------- 스와이프 모드 ---------- */
  if (flat) {
    $('.acts').innerHTML = ACTS.map((a, i) => `<section class="act" data-theme="${a.theme}" style="background:${a.bg}">
      <h2 class="title">Swedish <strong>${a.title}</strong></h2>
      <div class="swipe" tabindex="0" aria-label="${a.title} 메뉴">${items.filter(x => x.act === i).map(x => `<img class="plate" src="${x.src}" alt="${x.name}">`).join('')}</div>
      <i class="point"></i><div class="caption"><p class="name"><span></span><i></i><span></span></p><p class="desc"></p></div></section>`).join('');
    $$('.act').forEach((el, a) => {
      const list = items.filter(x => x.act === a), sw = $('.swipe', el);
      let cur = -1;
      const sync = () => {
        const step = sw.children[1].offsetLeft - sw.children[0].offsetLeft;
        const i = clamp(Math.round(sw.scrollLeft / step), 0, list.length - 1);
        if (i !== cur) fillCaption(el, list[cur = i]);
      };
      sw.addEventListener('scroll', sync, { passive: true }); sync();
    });
  }

  /* ---------- 영수증: 7, 8번 위치 ---------- */
  const tail = $('.tail'), tailReceipt = $('.tail > .receipt');
  const stageReceipt = $('.stage .receipt');
  // x, y는 시안 좌표의 중심점. tail 위쪽 끝이 y = 0
  function place(el, x, y, r, k) {
    el.style.visibility = 'visible';
    el.style.transform = `translate(${x * k - 182.65}px, ${y * k - 307.3}px) rotate(${r}deg) scale(${k})`;
  }
  const tailX = x => x - 960; // tail 영수증은 left: 50% 기준
  const endY = () => 1238 + Math.max(vh / s, 1000) / 2 + 2.4;

  if (flat) {
    if (desktop) {
      const rest = () => { measure(); place(tailReceipt, tailX(504.9), endY(), 0, s); };
      rest(); addEventListener('resize', rest);
    } else addEventListener('resize', measure);
    cacheZones();
    addEventListener('resize', cacheZones);
    addEventListener('load', () => { cacheZones(); updateTopbar(); });
    addEventListener('scroll', updateTopbar, { passive: true });
    updateTopbar();
    return;
  }

  /* ================= 애니메이션 모드 ================= */
  gsap.registerPlugin(ScrollTrigger);
  let lenis = null;
  if (window.Lenis) {
    lenis = new Lenis({ lerp: 0.1 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  const goTo = y => lenis ? lenis.scrollTo(y, { duration: 1.4 }) : scrollTo({ top: y, behavior: 'smooth' });

  /* 배경 선 그리기 */
  $$('.scene:not(.intro) .lines').forEach(svg => {
    const drawn = $$('path:not(.edge):not(.light)', svg);
    drawn.forEach(p => { p.setAttribute('pathLength', 1); p.style.strokeDasharray = 1; });
    gsap.fromTo(drawn, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1.4, ease: 'power2.inOut', stagger: .08, scrollTrigger: { trigger: svg, start: 'top 70%' } });
  });

  /* 1. 인트로 — 가운데 선이 내려오다 갈라지고, 스크롤하면 탁자 위를 훑고 지나간다 */
  const rays = $$('.ray'), lights = $$('.intro .light'), introPin = $('.intro-pin');
  const introText = $$('.intro .display, .lead');
  // head: 빛의 위치(0~1) / open: 남은 한 줄이 지퍼처럼 벌어진 정도 / text: 문구 등장
  const iv = { head: 0, open: 0, text: 0, done: false };
  const RAY = [{ x0: 702, x1: 145, edge: 145.8 }, { x0: 1203, x1: 1792, edge: 1791 }]; // edge: 990원 화면의 바깥 세로선
  const tableLights = $$('.breakfast .light'), tableTrails = [$('#table0'), $('#table1')];
  let tableTop = 0; // 990원 화면의 시작 위치
  tableLights.forEach((el, i) => { el.style.stroke = `url(#table${i})`; });
  const glows = lights.slice(0, 2), beams = lights.slice(2);
  const trails = [$('#trail0'), $('#trail1')];
  const SPLIT = 340, TRAIL = 360; // 갈라지는 높이, 잔상 길이
  let sweep = 0;
  function renderIntro() {
    const half = vh / s / 2, y0 = 490 - half, y1 = 510 + half;
    // rise: 990원 화면이 올라온 정도. yb: 그 윗변의 위치(시안 좌표)
    const rise = clamp((vh - tableTop + scrollY) / vh), yb = 500 + half - rise * 2 * half;
    const pivot = 1 - Math.pow(1 - rise, 3), join = clamp(rise * 20);
    const scrolling = iv.done && sweep > 0 && sweep < 1;
    const head = y0 + (y1 + TRAIL - y0) * (iv.done ? clamp(sweep * 1.05) : iv.head);
    const drawn = Math.min(iv.done ? y1 : head, rise > 0 ? yb : y1); // 빛이 지나간 자리에만 선이 생긴다
    RAY.forEach((ray, i) => {
      // 갈림점(apex)이 가운데를 따라 위로 올라가며 열린다. 갈림점 아래는 항상 직선
      const slope = (ray.x1 - ray.x0) / 1000;
      const last = mix(ray.x0, ray.x1, y1 / 1000) - 960;
      const apex = mix(SPLIT, (960 - ray.x0) / slope, iv.open);
      const off = y => (y <= apex ? 0 : last * (y - apex) / (y1 - apex));
      // 위쪽은 벌어지고 아래쪽은 식탁 모서리에 붙어, 끝에는 완전히 세로로 선다
      const low = rise > 0 ? yb : y1, span = Math.max(low - y0, 1);
      const xTop = mix(off(y0), ray.edge - 960, pivot), xLow = mix(off(low), ray.edge - 960, join);
      const at = y => iv.open < 1 ? off(y) : mix(xTop, xLow, (y - y0) / span);
      // 갈라지기 전까지는 왼쪽 선 하나만 그려 완전한 한 줄로 보이게 한다
      const line = (a, b) => {
        if (i && a < apex) a = apex;
        if (b <= a) return '';
        const ys = a < apex && apex < b ? [a, apex, b] : [a, b];
        return 'M' + ys.map(y => (960 + at(y)).toFixed(2) + ' ' + y.toFixed(2)).join('L');
      };      rays[i].setAttribute('d', line(y0, drawn));
      const on = !iv.done || scrolling, a = Math.max(head - TRAIL, y0), b = Math.min(head, low);
      const d = on ? line(a, b) : '';
      beams[i].setAttribute('d', d); glows[i].setAttribute('d', d);
      if (d) {
        const g = trails[i];
        g.setAttribute('x1', 960 + at(head - TRAIL)); g.setAttribute('y1', head - TRAIL);
        g.setAttribute('x2', 960 + at(head)); g.setAttribute('y2', head);
      }
      // 꺾이는 지점을 지난 빛은 식탁 세로선에서 남색으로 이어진다
      const k = 500 - half - yb, va = Math.max(head - TRAIL, yb), vb = Math.min(head, y1);
      tableLights[i].setAttribute('d', scrolling && rise > 0 && vb > va ? `M${ray.edge} ${va + k}V${vb + k}` : '');
      const tg = tableTrails[i];
      tg.setAttribute('x1', ray.edge); tg.setAttribute('x2', ray.edge); tg.setAttribute('y1', head - TRAIL + k); tg.setAttribute('y2', head + k);
    });
    introText.forEach((el, i) => {
      const k = clamp(iv.text * 1.25 - i * .25), e = 1 - Math.pow(1 - k, 3);
      el.style.opacity = e * (1 - clamp((sweep - .18) / .37));
      el.style.transform = `translate3d(0, ${-150 * (1 - e) + 70 * sweep}px, 0) scale(${mix(.35, 1, e) + .2 * clamp(sweep / .55)})`;
    });
    mini.style.opacity = clamp(iv.text * 4 - 3) * (1 - clamp(sweep * 5));
  }
  lights.forEach((el, i) => { el.style.stroke = `url(#trail${i % 2})`; });
  const mini = $('.mini');  const introTl = gsap.timeline({ delay: .25, onUpdate: renderIntro, onComplete: () => { iv.done = true; renderIntro(); } })
    .to(iv, { head: 1, duration: 2.6, ease: 'power1.in' }, 0)
    .to(iv, { open: 1, duration: 1.7, ease: 'power2.inOut' }, 1.9)
    .to(iv, { text: 1, duration: 1.9, ease: 'none' }, 2.2);
  renderIntro();
  /* 2. 990원 아침식사 — 스크롤에 맞춰 사선이 돌고, 접시의 잘린 면도 같은 각도로 돈다 */
  const bfPin = $('.bf-pin'), dish = $('.dish'), dishImg = $('.dish img'), cutline = $('.cutline');
  const PIVOT = { x: 980, y: 620 }, FROM = -15, TO = 59.51; // 회전축, 시작 각도, 시안 각도
  const TURN = .75, TILT = 5;                               // 회전 길이(화면 높이 비율), 접시가 거꾸로 도는 각도
  dishImg.src = dishImg.dataset.full; dishImg.loading = 'eager';
  dishImg.decode().catch(() => {});
  const num = $('.num'), count = { v: 0 };
  const copyTl = gsap.timeline({ paused: true, defaults: { ease: 'power3.out' } })
    .from(['.price', '.breakfast h2', '.note', '.breakfast .btn'], { y: 36, autoAlpha: 0, duration: .9, stagger: .12 }, 0)
    .to(count, { v: 990, duration: 1.3, ease: 'power2.out', onUpdate: () => { num.textContent = Math.round(count.v); } }, 0);
  let copyOn = false, lastBf = '';
  function renderBreakfast() {
    const q = clamp((scrollY - tableTop) / (vh * TURN));
    const key = q + '|' + vh + '|' + s;
    if (key === lastBf) return;
    lastBf = key;
    const rad = mix(FROM, TO, q) * Math.PI / 180, cx = Math.cos(rad), cy = Math.sin(rad);
    // 다 돌았을 때 아래 끝이 메뉴 화면 사선의 시작점과 정확히 만나도록 회전하면서 옆으로 옮긴다
    const half = vh / s / 2, slope = 1 / Math.tan(TO * Math.PI / 180);
    const gap = (958.5 + .58975 * (1000 - half)) - (PIVOT.x + (500 + half - PIVOT.y) * slope);
    const px = PIVOT.x + gap * q * q * (3 - 2 * q), L = 3200;
    const p = (t, d) => [px + cx * t - cy * d, PIVOT.y + cy * t + cx * d];
    const css = v => `${v[0].toFixed(1)}px ${v[1].toFixed(1)}px`;
    const A = p(-L, 0), B = p(L, 0);
    cutline.setAttribute('d', `M${A[0]} ${A[1]}L${B[0]} ${B[1]}`);
    dish.style.clipPath = `polygon(${css(A)}, ${css(B)}, ${css(p(L, L))}, ${css(p(-L, L))})`;
    dishImg.style.transform = `translateY(${Math.max(0, half - 500)}px) rotate(${TILT * (1 - q)}deg)`;
    const on = copyOn ? q > .5 : q > .66; // 선이 문구 자리를 지난 뒤에만 보인다
    if (on !== copyOn) { copyOn = on; if (on) copyTl.timeScale(1).play(); else copyTl.timeScale(2.5).reverse(); }
  }
  /* 3~6. 메뉴 4막 */
  const pin = $('.pin'), stage = $('.stage'), track = $('.track'), splashes = $$('.splash');
  const title = $('.stage .title'), caption = $('.stage .caption');
  const dials = $$('.dial button'), hand = { a: ACTS[0].angle };
  items.forEach((it, i) => {
    const img = new Image(); img.decoding = 'async'; img.className = 'plate'; img.src = it.src; img.alt = it.name; img.style.left = i * GAP + 'px';
    track.append(img);
    img.decode().catch(() => {}); // 미리 풀어 두어 화면에 들어올 때 끊기지 않게
  });
  const plates = $$('.plate', track);
  const totalSteps = LAST + RECEIPT_STEPS;
  const pinLayout = () => {
    pin.style.height = totalSteps * STEP_SCROLL + vh + 'px';
    const d = Math.hypot(vw, vh) + 4;
    splashes.forEach(x => { x.style.width = x.style.height = d + 'px'; });
  };
  pinLayout();

  let index = -1, act = -1;
  function setAct(a, instant) {
    const prev = act; act = a;
    splashes.forEach((x, i) => gsap.set(x, { zIndex: i === a ? 2 : i === prev ? 1 : 0 }));
    gsap.killTweensOf(splashes[a]);
    if (prev >= 0) gsap.set(splashes[prev], { scale: 1 });
    gsap.fromTo(splashes[a], { xPercent: -50, yPercent: -50, x: 0, y: 0, scale: instant ? 1 : 0 }, { scale: 1, duration: instant ? 0 : .5, ease: 'power2.out' });
    stage.dataset.theme = ACTS[a].theme; stage.dataset.act = a;
    $('strong', title).textContent = ACTS[a].title;
    dials.forEach((b, i) => b.setAttribute('aria-current', i === a));
    // 점이 가상의 원을 따라 이동
    gsap.to(hand, { a: ACTS[a].angle, duration: instant ? 0 : .8, ease: 'power3.inOut', overwrite: true, onUpdate: () => { $('.hand').style.transform = `rotate(${hand.a}deg)`; } });
    if (!instant) gsap.fromTo(title, { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: .6, ease: 'power3.out', overwrite: true });
    updateTopbar();
  }
  function setIndex(i) {
    const first = index < 0; index = i;
    fillCaption(caption, items[i]);
    if (!first) gsap.fromTo(caption, { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: .45, ease: 'power3.out', overwrite: true });
    if (items[i].act !== act) setAct(items[i].act, first);
  }

  const state = { p: 0 };
  function render() {
    const p = Math.min(state.p, LAST);
    track.style.transform = `translate3d(${-p * GAP}px,0,0)`;
    plates.forEach((el, i) => {
      const near = Math.abs(i - p) < 3.2;
      if (near) el.style.transform = `rotate(${(i % 2 ? 1 : -1) * SPIN * (p - i)}deg)`;
      if (near !== el.near) { el.near = near; el.style.visibility = near ? 'visible' : 'hidden'; }
    });
    const i = Math.round(p);
    if (i !== index) setIndex(i);
  }
  // 6번에서 나온 영수증이 7, 8번까지 이어진다
  const P6 = { x: 1541, y: 913.6, r: 27.8 }, P7 = { x: 800.5, y: 591.2, r: -13.7 }, P8 = { x: 504.9, r: 0 };
  const ease = t => t * t * (3 - 2 * t);
  const NX = .8615, NY = -.5078; // 사선의 바깥쪽 방향
  const hermite = (a, b, sa, sb, len, d) => {
    const t = clamp(d / len), t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * a + (t3 - 2 * t2 + t) * len * sa + (3 * t2 - 2 * t3) * b + (t3 - t2) * len * sb;
  };
  // 사선 뒤에 숨어 있다가 영수증 길이 방향으로 출력되듯 빠져나온다
  const FEED = 700, AXIS = { x: -Math.sin(27.8 * Math.PI / 180), y: Math.cos(27.8 * Math.PI / 180) };
  let pinTop = 0, pinEnd = 0, tailTop = 0;
  function cachePin() {
    pinTop = pin.getBoundingClientRect().top + scrollY;
    pinEnd = pinTop + pin.offsetHeight - vh;
    tailTop = tail.getBoundingClientRect().top + scrollY;
  }
  function renderReceipt() {
    const bottom = 500 + vh / (2 * s);           // 고정 화면 아래쪽 끝(시안 좌표)
    const gone = (vh - tailTop + scrollY) / s;   // tail이 화면에 들어온 높이(시안 px)
    if (gone <= 0) {
      const left = 1 - ease(clamp((state.p - LAST - .4) / (RECEIPT_STEPS - .75)));
      tailReceipt.style.visibility = 'hidden';
      if (left >= 1) { stageReceipt.style.visibility = 'hidden'; return; }
      place(stageReceipt, P6.x - AXIS.x * FEED * left, P6.y - AXIS.y * FEED * left, P6.r, 1);
      return;
    }    // 6 → 7 → 8을 속도가 끊기지 않는 하나의 곡선으로 잇는다
    const view = vh / s, ey = endY();
    const mid = P7.y + view / 2, full = Math.min(ey + view / 2, 1238 + Math.max(view, 1000) - 1);
    const path = (a, b, c, sa, sb, sc) => gone < mid ? hermite(a, b, sa, sb, mid, gone) : hermite(b, c, sb, sc, full - mid, Math.min(gone, full) - mid);
    const x = path(P6.x, P7.x, P8.x, 0, -.45, 0);
    const y = path(P6.y - bottom, P7.y, ey, 1, .85, .6);
    const r = path(P6.r, P7.r, P8.r, 0, 0, 0);
    stageReceipt.style.visibility = 'hidden';
    place(tailReceipt, tailX(x), y, r, s);
    // 사선에 걸린 부분만 영수증 자체에서 잘라 낸다
    const th = r * Math.PI / 180, cos = Math.cos(th), sin = Math.sin(th);
    const c = NX * (1253.5 - x) + NY * (-bottom - y);
    const nx = NX * cos + NY * sin, ny = -NX * sin + NY * cos;
    if (c > 360) { tailReceipt.style.clipPath = 'none'; return; }
    const px = 182.65 + nx * c, py = 307.3 + ny * c, L = 1500;
    const pt = (t, d) => `${px - ny * t - nx * d}px ${py + nx * t - ny * d}px`;
    tailReceipt.style.clipPath = `polygon(${pt(-L, 0)}, ${pt(L, 0)}, ${pt(L, L)}, ${pt(-L, L)})`;
  }
  ScrollTrigger.addEventListener('refreshInit', () => { measure(); pinLayout(); });
  render();
  dials.forEach((b, a) => b.addEventListener('click', () => goTo(pinTop + firstOf[a] * STEP_SCROLL)));

  /* 스크롤이 멈췄을 때만 가까운 접시가 천천히 중앙에 자리 잡는다 */
  let snapTimer = 0, held = false;
  function waitSnap() {
    clearTimeout(snapTimer);
    snapTimer = setTimeout(() => {
      const steps = (scrollY - pinTop) / STEP_SCROLL;
      if (!lenis || held || steps < .02 || steps > LAST - .02) return;
      const y = pinTop + Math.round(steps) * STEP_SCROLL;
      if (Math.abs(y - scrollY) > 2) lenis.scrollTo(y, { duration: 1, easing: t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2 });
    }, SNAP_WAIT);
  }
  addEventListener('scroll', waitSnap, { passive: true });
  addEventListener('wheel', waitSnap, { passive: true });
  addEventListener('pointerdown', () => { held = true; });
  addEventListener('pointerup', () => { held = false; waitSnap(); });
  addEventListener('pointercancel', () => { held = false; });

  /* 파란 점: 평소에는 커서를 따라다니고, 접시 구간에서는 다이얼 원에 붙는다 */
  if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
    root.classList.add('has-dot');
    const dot = $('.dot'), mouse = { x: 0, y: 0, moved: false }, pos = { x: 0, y: 0 }, dock = { k: 0 };
    let docked = null, color = '', ready = false;
    addEventListener('pointermove', e => { mouse.x = e.clientX; mouse.y = e.clientY; mouse.moved = true; }, { passive: true });
    gsap.ticker.add((time, dt) => {
      const y = scrollY;
      if (!mouse.moved) { mouse.x = vw / 2; mouse.y = vh / 2 + 417 * s; } // 움직이기 전에는 인트로 시안 위치
      if (!ready) { pos.x = mouse.x; pos.y = mouse.y; ready = true; }
      const f = 1 - Math.exp(-Math.min(dt, 64) / 110);
      pos.x += (mouse.x - pos.x) * f; pos.y += (mouse.y - pos.y) * f;
      const on = y > pinTop - vh * .3 && y < pinEnd + vh * .25;
      if (on !== docked) { docked = on; gsap.to(dock, { k: on ? 1 : 0, duration: .9, ease: 'power3.inOut', overwrite: true }); }
      const c = on ? (ACTS[act].theme === 'dark' ? '#000c44' : '#ffffff') : '';
      if (c !== color) dot.style.background = color = c;
      const rad = hand.a * Math.PI / 180;
      const stageY = y < pinTop ? pinTop - y : y > pinEnd ? pinEnd - y : 0;
      const dx = vw / 2 + (499.4 + Math.cos(rad) * 181.8) * s;
      const dy = vh / 2 + stageY + (-20 + Math.sin(rad) * 181.8) * s;
      dot.style.transform = `translate3d(${mix(pos.x, dx, dock.k)}px, ${mix(pos.y, dy, dock.k)}px, 0) scale(${mix(1, Math.max(.55 * s, .45), dock.k)})`;
    });
  }
  /* 7. 흩어진 접시 — 나타나는 동작과 패럴랙스를 스크롤 하나로 처리 */
  const dishes = $$('.dishes .plate').map((el, i) => ({ el, i, depth: +el.dataset.s * 1.6, top: parseFloat(el.style.top) }));
  dishes.forEach(d => d.el.decode().catch(() => {}));
  tailReceipt.decode().catch(() => {});
  function renderDishes() {
    const gone = vh - tailTop + scrollY;
    dishes.forEach(d => {
      const v = (gone - d.top * s) / (vh + 349.5 * s);
      const show = v > -.15 && v < 1.15;
      if (show !== d.show) { d.show = show; d.el.style.visibility = show ? 'visible' : 'hidden'; }
      if (!show) return;
      const e = 1 - Math.pow(1 - clamp(v / .42), 3);
      d.el.style.opacity = clamp(v / .12);
      d.el.style.transform = `translate3d(0, ${mix(d.depth, -d.depth, v)}px, 0) rotate(${(d.i % 2 ? 60 : -60) * (1 - e)}deg) scale(${mix(.7, 1, e)})`;
    });
  }
  /* 8. 엔딩 */
  gsap.from('.ending .copy > *', { y: 40, autoAlpha: 0, duration: .9, stagger: .12, ease: 'power3.out', scrollTrigger: { trigger: '.ending .copy', start: 'top 75%' } });

  /* 화면 갱신마다 딱 한 번, 모든 스크롤 동작을 같은 값으로 그린다 */
  const leaving = [[title, 90], [caption, 320], [$('.stage .leave'), 260], [$('.stage .point'), 320], [$('.dial'), 260]];
  let lastY = -1, introLen = 1, lastLeave = -1;
  function frame(force) {
    const y = scrollY;
    if (y === lastY && force !== true) return;
    lastY = y;
    const sw = clamp(y / introLen);
    if (!iv.done && y > 20) introTl.timeScale(4); // 먼저 스크롤하면 인트로를 빠르게 마무리
    if (sw !== sweep || force === true) { sweep = sw; renderIntro(); }
    const p = clamp((y - pinTop) / STEP_SCROLL, 0, totalSteps);
    if (p !== state.p || force === true) { state.p = p; render(); }
    const out = Math.max(0, (y - pinEnd) / s);
    if (out !== lastLeave) { lastLeave = out; leaving.forEach(([el, d]) => { el.style.setProperty('--leave', 1 - clamp(out / d)); }); }
    renderBreakfast(); renderReceipt(); renderDishes(); updateTopbar();
  }
  const recache = () => { introLen = Math.max(1, introPin.offsetHeight - vh); tableTop = bfPin.getBoundingClientRect().top + scrollY; cacheZones(); cachePin(); frame(true); };
  ScrollTrigger.addEventListener('refresh', recache);
  gsap.ticker.add(() => frame());  addEventListener('load', () => ScrollTrigger.refresh());
  recache();
})();
