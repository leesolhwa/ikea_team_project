// 섹션 등록부. 섹션을 추가·삭제하거나 창문 순서를 바꿀 때 이 파일만 고치면
// 창문 허브와 미니맵이 자동으로 따라갑니다.
import { IntroSection } from './intro/intro.js';
import { AboutSection } from './about/about.js';
import { RoomsSection } from './rooms/rooms.js';
import { StoresSection } from './stores/stores.js';
import { FoodSection } from './food/food.js';
import { OutroSection } from './outro/outro.js';

export { IntroSection, OutroSection };

/** 창문 허브에 나오는 순서 */
export const HUB_SECTIONS = [AboutSection, RoomsSection, StoresSection, FoodSection];
