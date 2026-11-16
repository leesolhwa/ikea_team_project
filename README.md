# IKEA 포트폴리오 — 공통 뼈대

스토리보드 기준으로 **전체 이동 흐름만 먼저 연결한 뼈대**입니다.
화면에 보이는 것은 전부 임시 이미지와 단순 3D 도형이며, 각자 자기 섹션 폴더 안에서 디자인과 GLB 모델로 교체하면 됩니다.
헤더·푸터는 이번 단계에서 뺐습니다.

## 실행

ES 모듈을 쓰기 때문에 `index.html`을 더블클릭하면 열리지 않습니다. 로컬 서버로 여세요.

- VS Code **Live Server** 확장 → `index.html`에서 "Go Live"
- 또는 터미널에서 `npm run dev` (= `npx serve`) / `python3 -m http.server 5173`

Three.js(0.170.0)는 `index.html`의 import map으로 CDN에서 불러오므로 설치할 것이 없습니다(인터넷 연결 필요).

### 개발용 주소

| 주소 | 동작 |
| --- | --- |
| `/?section=rooms` | 인트로를 건너뛰고 해당 섹션으로 바로 진입 (`about` `rooms` `stores` `food` `hub` `outro`) |
| `/?debug` | 좌측 상단에 현재 상태·진행도 표시 (`?section=food&debug` 처럼 함께 사용 가능) |

콘솔에서 `__app.flow.goTo('stores')` 로도 이동할 수 있습니다.

## 전체 흐름

```
intro ─▶ 창문 허브 [About] ⇄ [Rooms] ⇄ [Stores] ⇄ [Food] ─▶ outro
              │ ▲
        클릭  ▼ │ 섹션 끝에서 계속 스크롤(Bye!) / 처음에서 위로 스크롤 / Esc
            섹션 풀뷰
```

- **인트로**: 블라인드 열림 → 미니맵 전체 화면 → 조케가 점선을 따라 달림 → 미니맵이 우측 하단으로 줄고 첫 창문 등장
- **허브**: 스크롤 한 번에 창문 한 칸, 클릭(또는 Enter)으로 진입
- **섹션**: 스크롤로 진행. 끝에서 더 스크롤하면 풀뷰가 창문으로 줄어들고 다음 창문으로 이동
- **아웃트로**: 블라인드 닫힘 → 로고 → 조케 인사 + 지나온 동선 그리기
- 미니맵 노드를 클릭하면 어디서든 해당 섹션으로 이동

## 폴더 구조와 담당

```
index.html              레이어 뼈대 + Three.js import map
src/
  main.js               진입점 (수정할 일 거의 없음)
  config.js             스크롤 감도·전환 시간 등 전역 값
  core/                 ★ 공통 — 담당자 한 명이 관리
    flow.js             흐름(상태 머신): 인트로→허브→섹션→아웃트로
    scroll.js           스크롤 제어 (휠·터치·키 → 진행도)
    windows.js          창문 허브 + 창문 확대/축소 전환
    minimap.js          미니맵 (위치 표시, 클릭 이동, 동선 기록)
    character.js        캐릭터 조케 (2D 스프라이트 + 3D)
    stage.js            WebGL 렌더러 1개, 3D 클릭 판정(pick)
    assets.js           GLB 로더, modelSlot, 임시 도형 헬퍼
    BaseSection.js      섹션 규약 (모든 섹션이 상속)
    hud.js / tween.js / emitter.js
  components/blinds.js  블라인드 (인트로·아웃트로 공용)
  styles/base.css       리셋·토큰·레이어 순서
  styles/common.css     창문·미니맵·캐릭터·블라인드·HUD 스타일
  sections/
    index.js            섹션 등록부 (창문 순서)
    intro/  outro/      팀원 A
    about/              팀원 B
    rooms/              팀원 C  (+ 기차 클릭 → 히스토리 이스터에그)
    stores/             팀원 D  (+ Family 멤버십)
    food/               팀원 E
assets/
  images/<섹션>/        임시 이미지 (window.svg, ph-1~3.svg)
  models/<섹션>/        GLB 넣는 곳
```

담당 배정은 예시입니다. 각 섹션 파일의 `static meta.owner`만 바꾸면 됩니다.

## 섹션 만드는 법 (규약)

모든 섹션은 `BaseSection`을 상속하고, 자기 폴더의 JS + CSS 두 파일만 다룹니다.

```js
export class RoomsSection extends BaseSection {
  static meta = { id: 'rooms', title: 'Rooms', subtitle: '방 탐색', owner: '팀원 C',
                  color: '#c9a37a', windowImage: 'assets/images/rooms/window.svg' };
  static css = new URL('./rooms.css', import.meta.url).href; // 자동 로드
  static use3D = true;   // this.scene / this.camera 생성
  static pinned = 4;     // 화면 고정 상태로 진행되는 스크롤 길이 (화면 높이 × 4)

  template() { return `...HTML...`; }      // .sec-scroll 이 있으면 pinned 뒤에 자동 세로 스크롤
  init() {}                                 // 최초 1회: DOM 참조, 3D 생성
  enter() {}                                // 들어올 때마다
  update({ progress, pin, scroll, dt, time }) {}  // 매 프레임
  leave() {}                                // 나갈 때마다
  resize(w, h) {}
}
```

`update()`로 들어오는 값:

| 값 | 의미 |
| --- | --- |
| `progress` | 섹션 전체 진행도 0~1 |
| `pin` | 화면 고정 구간 진행도 0~1 (3D 연출, 타이포 확대 등) |
| `scroll` | `.sec-scroll` 콘텐츠 스크롤 진행도 0~1 |
| `dt`, `time` | 프레임 간격(초), 누적 시간(초) |

구간을 나눌 때는 `seg(pin, 0.2, 0.6)` (tween.js)처럼 쓰면 그 구간만 0~1로 잘립니다.

### 지켜야 할 것

1. **자기 섹션 폴더 밖은 수정하지 않기.** 공통 수정이 필요하면 공통 담당자에게 요청.
2. **CSS 선택자는 전부 `.sec-<id>`로 시작** (예: `.sec-rooms .rooms-nav`). 다른 섹션과 충돌 방지.
3. **`wheel`·`scroll`·`touch` 이벤트를 직접 달지 않기.** `update()`의 진행도만 사용.
   특정 위치로 보내려면 `this.ctx.scroll.scrollTo(0.5)`, 모달이 열린 동안은 `this.ctx.scroll.lock('이름')` / `unlock('이름')`.
   모달 내부를 일반 스크롤로 두려면 그 요소에 `data-native-scroll` 속성.
4. **렌더러·`requestAnimationFrame` 루프를 새로 만들지 않기.** `this.scene`에 추가만 하면 공통 스테이지가 그려 줍니다.
5. 섹션에서 켠 것(툴팁, 잠금 등)은 `leave()`에서 정리.

### 공통 모듈 사용 (`this.ctx`)

| 모듈 | 자주 쓰는 것 |
| --- | --- |
| `ctx.scroll` | `scrollTo(p)`, `lock(reason)`, `unlock(reason)`, `progress` |
| `ctx.stage` | `pick(event, this.camera, [objects])` → `{ id, object, point }` (오브젝트의 `userData.pickId`) |
| `ctx.character` | `show()`, `hide()`, `place(x, y)`, `moveTo(x, y, { jump })`, `wave()`, `say('Hej!')` |
| `ctx.minimap` | `setActive(id)`, `pointAt(u)`, `routeMarkup()` |
| `ctx.flow` | `goTo(id)`, `exitSection()`, `state` |
| `ctx.hud` | `hint('문구')` |

## 교체 가이드

### 이미지
`assets/images/<섹션>/`의 임시 SVG를 **같은 파일명으로 덮어쓰거나**, 템플릿의 `src`를 새 경로로 바꿉니다.
창문 속 이미지는 `window.svg`(세로 3:4.3 비율 권장)이며 경로는 `static meta.windowImage`에 있습니다.

### GLB 모델 (Blender)
각 섹션 JS 상단의 `MODELS`(Rooms는 `ROOMS[].items[].url`)에 경로만 넣으면 임시 도형이 모델로 바뀝니다.

```js
const MODELS = { house: 'assets/models/about/house.glb' };  // null → 임시 도형
```

- 내부적으로 `this.addModel({ url, fallback })` = `modelSlot`을 씁니다. 위치·회전은 슬롯에 주고, 모델은 임시 도형의 **크기와 바닥 위치에 자동으로 맞춰집니다**(`fit: true`). Blender 스케일을 그대로 쓰려면 `fit: false`.
- GLB에 애니메이션이 있으면 첫 클립이 자동 재생됩니다 (`slot.userData.mixer`, `slot.userData.clips`).
- 파일이 없거나 로드에 실패하면 경고만 남기고 임시 도형을 유지하므로 흐름이 끊기지 않습니다.
- 내보내기: glTF Binary(.glb), +Y Up, Apply Modifiers 체크, 텍스처는 1~2K 권장. Draco 압축을 쓰면 `core/assets.js` 상단의 주석을 해제하세요.

### 공통 요소 디자인
| 대상 | 위치 |
| --- | --- |
| 캐릭터 2D | `core/character.js`의 `SPRITE` |
| 캐릭터 3D | `core/character.js`의 `CHARACTER_GLB` |
| 미니맵 그림 | `core/minimap.js`의 `_svg()` (`.mm-route` 경로와 `.mm-node[data-id]`만 유지) |
| 창문 프레임 | `styles/common.css`의 `.win-frame`, `.win-glass` |
| 블라인드 | `components/blinds.js` + `common.css`의 `.blind-slat` |
| 로고 | `assets/images/common/logo.svg` (지금은 자리 표시용) |
| 색·폰트 토큰 | `styles/base.css`의 `:root` |

### 섹션 추가·순서 변경
`src/sections/index.js`의 `HUB_SECTIONS` 배열만 고치면 창문 허브와 미니맵이 따라갑니다.

## 아직 임시인 것

- 매장 목록·좌표(`stores/data.js`), 메뉴명·가격, 문구는 자리 표시용입니다. 실제 값으로 교체하세요.
- 모바일은 터치 스크롤만 연결돼 있고 레이아웃 최적화는 하지 않았습니다.
- Vite 등 번들러로 옮길 경우: `npm i three` 후 `index.html`의 import map 블록을 삭제하면 됩니다.
