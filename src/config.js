// 전역 설정. 섹션 순서는 src/sections/index.js 에서 관리합니다.
const q = new URLSearchParams(location.search);

export const DEBUG = q.has('debug');          // ?debug  → 상태 패널 표시
export const START_AT = q.get('section');     // ?section=rooms → 인트로 건너뛰고 바로 진입 (intro|hub|outro|섹션 id)

export const FLOW = {
  smoothing: 0.12,          // 스크롤 관성(0~1, 클수록 즉각적)
  overscrollThreshold: 260, // 섹션 끝에서 이만큼(px) 더 스크롤하면 창문으로 복귀
  edgeDelay: 350,           // 끝에 도착한 직후 관성 스크롤 무시 시간(ms)
  stepThreshold: 40,        // 허브에서 창문 한 칸 넘어가는 최소 스크롤량(px)
  stepCooldown: 750,        // 허브 창문 이동 간격(ms)
  portalDuration: 900,      // 창문 확대/축소 시간(ms)
};

export const COLORS = {
  blue: '#0058a3',
  yellow: '#ffdb00',
  ink: '#111111',
  paper: '#f5f1e8',
  hub: '#06181c',
};
