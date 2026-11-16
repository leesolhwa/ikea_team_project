// 의존성 없는 애니메이션 유틸. (GSAP을 쓰고 싶다면 섹션 내부에서 자유롭게 써도 됩니다)
export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;

/** 전체 진행도 p 중 [a, b] 구간만 0~1로 잘라냅니다. 스크롤 연출 구간 나눌 때 사용. */
export const seg = (p, a, b) => clamp((p - a) / (b - a));

export const ease = {
  linear: (t) => t,
  in: (t) => t * t * t,
  out: (t) => 1 - Math.pow(1 - t, 3),
  inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
};

/** 시간 기반 트윈. onUpdate(easedT) 가 매 프레임 호출되고, 끝나면 resolve 됩니다. */
export function tween({ duration = 600, ease: e = ease.inOut, onUpdate } = {}) {
  return new Promise((resolve) => {
    const t0 = performance.now();
    const frame = (now) => {
      const t = clamp((now - t0) / duration);
      onUpdate?.(e(t), t);
      if (t < 1) requestAnimationFrame(frame);
      else resolve();
    };
    requestAnimationFrame(frame);
  });
}

export const wait = (ms) => new Promise((r) => setTimeout(r, ms));
