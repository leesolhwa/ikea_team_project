// 상세페이지 공통 나가기 (일반 스크롤 페이지용)
// 사용법: 상세페이지 <head> 에 한 줄 → <script defer src="../../../src/core/page-exit.js"></script>
//  ① 나가기 아이콘(a.exit, 주소가 index.html?room=…)을 누르면
//  ② 맨 아래까지 내린 뒤 더 내리면 (휠 260px 또는 터치로 위로 밀기)
//  → 메인의 그 방으로 돌아가고, 메인이 아이보리 원을 점으로 오므리며 방을 보여 줌 (들어갈 때 원이 커지던 것의 반대)
// 스크롤이 없는 페이지(3D 화면 등)는 ② 없이 ①만 동작합니다.
(function () {
  const link = document.querySelector('a.exit[href*="index.html?room="]') || document.querySelector('a[href*="index.html?room="]');
  if (!link) return;
  let leaving = false;
  const go = () => {
    if (leaving) return;
    leaving = true;
    const url = new URL(link.getAttribute('href'), location.href);
    url.searchParams.set('from', 'page');
    location.href = url.href;
  };
  link.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button > 0) return;
    e.preventDefault();
    go();
  });

  const doc = document.scrollingElement || document.documentElement;
  const scrollable = () => doc.scrollHeight - innerHeight > 40;
  const atBottom = () => scrollable() && Math.ceil(doc.scrollTop + innerHeight) >= doc.scrollHeight - 2;
  const NEED = 260, SETTLE = 350; // 더 내려야 하는 양(px), 맨 아래 도착 직후 관성 스크롤 무시(ms)
  let acc = 0, arrived = 0, reset = 0;
  const push = (dy) => {
    if (dy <= 0 || !atBottom()) { acc = 0; arrived = 0; return; }
    const now = performance.now();
    if (!arrived) { arrived = now; return; }
    if (now - arrived < SETTLE) return;
    acc += dy;
    clearTimeout(reset);
    reset = setTimeout(() => { acc = 0; }, 900);
    if (acc >= NEED) go();
  };
  addEventListener('wheel', (e) => push(e.deltaY), { passive: true });
  let touchY = null;
  addEventListener('touchstart', (e) => { touchY = e.touches.length === 1 ? e.touches[0].clientY : null; }, { passive: true });
  addEventListener('touchmove', (e) => {
    if (touchY === null) return;
    const y = e.touches[0].clientY;
    push((touchY - y) * 2);
    touchY = y;
  }, { passive: true });
  addEventListener('pageshow', (e) => { if (e.persisted) { leaving = false; acc = 0; arrived = 0; } });
})();
