// INTRO — 블라인드가 열리고 → 미니맵이 화면을 채우고 → 조케가 점선을 따라 달리고
//         → 미니맵이 우측 하단으로 줄어들며 첫 창문이 나타납니다.
// 전부 스크롤 진행도(progress)에 맞춰 움직이므로 거꾸로 스크롤하면 그대로 되감깁니다.
import { BaseSection } from '../../core/BaseSection.js';
import { Blinds } from '../../components/blinds.js';
import { seg, ease, lerp } from '../../core/tween.js';

export class IntroSection extends BaseSection {
  static meta = { id: 'intro', title: 'Intro', owner: '팀원 A' };
  static css = new URL('./intro.css', import.meta.url).href;
  static layer = 'overlay';
  static pinned = 3.2; // 인트로 전체 길이 = 화면 높이 × 3.2 만큼의 스크롤

  template() {
    return /* html */ `
      <div class="intro-blinds"></div>
      <div class="intro-logo"><img src="assets/images/common/logo.svg" alt="로고 자리(임시)" /></div>
      <!-- 블라인드 틈으로 눈이 마주치는 연출(임시). 마우스를 따라 눈동자가 움직입니다 -->
      <div class="intro-peek"><i></i><i></i></div>
    `;
  }

  init() {
    this.blinds = new Blinds(this.$('.intro-blinds'), { count: 10 });
    this.logo = this.$('.intro-logo');
    this.peek = this.$('.intro-peek');
    window.addEventListener('pointermove', (e) => {
      if (!this.active) return;
      this.peek.style.setProperty('--px', `${(e.clientX / window.innerWidth - 0.5) * 10}px`);
      this.peek.style.setProperty('--py', `${(e.clientY / window.innerHeight - 0.5) * 6}px`);
    });
  }

  enter() {
    this._lastX = 0;
  }

  update({ progress: p }) {
    const { minimap, character, hub, hud } = this.ctx;

    // 1) 블라인드 열림 (0.02 ~ 0.38)
    this.blinds.set(ease.inOut(seg(p, 0.02, 0.38)));
    this.logo.style.opacity = 1 - seg(p, 0.04, 0.22);
    this.peek.style.opacity = seg(p, 0.08, 0.16) * (1 - seg(p, 0.26, 0.34));
    if (p > 0.03) hud.hint('');

    // 2) 미니맵 전체 화면에서 조케가 점선을 따라 달림 (0.40 ~ 0.74)
    const run = seg(p, 0.4, 0.74);

    // 3) 미니맵이 구석으로 줄어들고, 조케는 첫 창문 옆으로 점프 (0.76 ~ 1)
    const shrink = ease.inOut(seg(p, 0.76, 1));
    minimap.setLayout(shrink);
    hub.setReveal(1);

    if (p < 0.38) {
      character.hide();
      return;
    }
    character.show();
    if (shrink <= 0) {
      const pt = minimap.pointAt(run);
      character.place(pt.x, pt.y, { scale: 1.5, flip: pt.x < this._lastX - 0.5 });
      character.wave(false);
      this._lastX = pt.x;
    } else {
      const from = minimap.pointAt(1);
      const to = hub.getAnchor();
      const jump = Math.sin(Math.PI * shrink) * window.innerHeight * 0.22;
      character.place(lerp(from.x, to.x, shrink), lerp(from.y, to.y, shrink) - jump, { scale: lerp(1.5, 1, shrink) });
      character.wave(shrink > 0.9);
    }
  }
}
