# IKEA 포트폴리오 공통 뼈대

기본 화면은 Room Atlas입니다. 스크롤하면 다음 방으로 걸어갑니다. 도착 후 방의 배경, 가구 또는 제목을 클릭하면 해당 상세페이지가 열립니다. 오른쪽 위 당김줄로 조명을 켜고 끌 수 있습니다. 미니맵에는 현재 위치까지의 동선이 표시됩니다. 방 순서는 About → IKEA PS → 3D room → Store & Family → Restaurant → 출구입니다.

## 실행과 수정

- 프로젝트 폴더에서 `npm run dev`를 실행하고 `http://localhost:5173/`을 엽니다. 메인 데모는 `index.html`을 브라우저로 바로 열어도 동작합니다.
- 방과 가구 배치는 `src/core/atlas/scene.js`, 렌더링과 호버 처리는 `src/core/atlas/render.js`, 이동 경로와 상세페이지 콘텐츠는 `src/core/atlas/app.js`에서 수정합니다.
- 페이지 구조는 `index.html`, 테마와 전환 스타일은 `src/styles/atlas.css`에서 수정합니다.
- 상세페이지 바로가기는 `#about`, `#ikea-ps`, `#3d-room`, `#store-family`, `#restaurant`입니다.

## 내 상세페이지를 메인에 연결하기 (섹션 담당이 직접)

페이지를 만든 PR에서 **연결까지 같이** 해야 머지하자마자 메인에서 열립니다. 연결을 빼먹으면 페이지는 있어도 메인에서 안 열립니다.

1. 페이지를 `src/sections/<내 폴더>/<이름>.html`로 만듭니다. **‘나가기’의 목적지는 해당 섹션의 방 앞**입니다. 링크에 `../../../index.html?room=<방 id>`를 넣습니다. 레스토랑 예시는 다음과 같습니다.

   ```html
   <a href="../../../index.html?room=restaurant">나가기</a>
   ```

   `?room=restaurant`는 미니맵 5번 방에 카메라를 놓고, `#restaurant`는 상세페이지를 엽니다. 방 id는 아래 표의 첫 열에서 가져옵니다. 기본 메인 주소만 쓰면 입구에서 시작합니다. 브라우저 뒤로 가기는 방문 기록을 따르므로 ‘나가기’ 버튼은 위 링크로 직접 연결합니다.
2. `src/core/atlas/app.js` 맨 위 `rooms`에서 **내 방 항목에만** `page:'경로'`를 추가합니다. 이 한 줄 외에는 고치지 않습니다.

   ```js
   {id:'restaurant',name:'Restaurant',ko:'키친 & 다이닝',page:'./src/sections/food/restaurant.html', ...
   ```
3. 로컬 서버에서 방 클릭, 메인 푸터 링크, 상세 주소 직접 접속으로 각각 상세페이지에 들어갑니다. 세 경우 모두 ‘나가기’를 눌렀을 때 해당 방 제목과 미니맵 번호가 바로 표시되는지 확인합니다. 브라우저의 뒤로 가기도 별도로 확인합니다.

| 방 id | 연결된 페이지 |
| --- | --- |
| `about` | (아직 없음) |
| `ikea-ps` | `./src/sections/collection/collection.html` |
| `3d-room` | `./src/sections/rooms/room3d.html` |
| `store-family` | `./src/sections/stores/store-family.html` |
| `restaurant` | `./src/sections/food/restaurant.html` |

AI에게는 이렇게 말하면 됩니다: **"나는 ○○ 담당이야. 내 상세페이지 만들고 메인 ○○ 방에 연결까지 해서 PR 올려줘."**

## 팀 섹션 개발

기존 `src/sections/` 작업은 로컬 서버의 `sections.html`에서 실행합니다. 팀에서 사용하던 `/?section=rooms&debug` 등의 주소도 이 개발 화면으로 연결됩니다. 메인의 상세페이지 콘텐츠는 현재 Room Atlas 데모 버전입니다.

## 섹션 개발 화면 안내

스토리보드 기준으로 **전체 이동 흐름만 먼저 연결한 뼈대**입니다.
화면에 보이는 것은 전부 임시 이미지와 단순 3D 도형이며, 각자 자기 섹션 폴더 안에서 디자인과 GLB 모델로 교체하면 됩니다.
헤더·푸터는 이번 단계에서 뺐습니다.

## 실행

ES 모듈을 쓰기 때문에 `index.html`을 더블클릭하면 열리지 않습니다. 로컬 서버로 여세요.

- VS Code **Live Server** 확장 → `sections.html`에서 "Go Live"
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
sections.html           레이어 뼈대 + Three.js import map
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

## 협업 방법 (Git)

`main`은 항상 실행되는 상태로 둡니다. 작업은 브랜치에서 하고 PR로 합칩니다.

```bash
git pull origin main                  # 1. 시작 전에 최신 main 받기
git checkout -b rooms/camera-path     # 2. 브랜치 만들기 (섹션명/작업내용)
# ... 자기 섹션 폴더에서 작업 ...
git add -A
git commit -m "rooms: 카메라 이동 경로 수정"
git push -u origin rooms/camera-path  # 3. 브랜치 올리기
```

4. GitHub에서 **PR 열기** → 변경 내용을 같이 확인하고 댓글로 의견 남기기
5. 다른 팀원이 한 명 이상 확인하면 **Merge pull request**, 머지된 브랜치는 삭제
6. 나머지 팀원은 `git pull origin main`으로 최신 상태 받기

규칙:

- **`main`에 직접 푸시하지 않기.**
- **PR은 작게, 자주.** 며칠치를 한 번에 올리면 확인이 어렵고 충돌이 커집니다.
- **공통 파일(`src/core/`, `src/styles/`, `src/main.js`, `index.html`)은 공통 담당자만 수정.** 필요하면 담당자에게 요청하거나 그 수정만 따로 PR로 올립니다. 단, `app.js`의 `rooms`에서 **내 방의 `page` 한 줄**은 섹션 담당이 직접 추가합니다(위 "내 상세페이지를 메인에 연결하기").
- **머지 전에 실행 확인.** `?section=자기섹션`으로 자기 섹션을, 주소 그대로 열어 전체 흐름을 한 번씩 확인합니다.
- **GLB는 파일당 100MB 이하.** GitHub은 100MB가 넘는 파일을 거부합니다(50MB부터 경고). Blender 원본(`.blend`)은 저장소에 올리지 말고 드라이브 등으로 공유합니다.
- 충돌이 나면 혼자 덮어쓰지 말고 해당 파일 담당자와 같이 해결합니다.

## AI(Claude Code · Codex)로 작업할 때

저장소에 AI용 규칙 파일이 들어 있어서, 도구가 저장소를 열면 "자기 섹션 폴더만 수정 · `main` 직접 푸시 금지 · 브랜치와 PR로 작업"을 자동으로 따릅니다.
규칙 본문은 `AGENTS.md`(Codex가 읽음)에 있고, `CLAUDE.md`(Claude Code가 읽음)는 그 파일을 불러오기만 합니다. 규칙을 바꿀 때는 `AGENTS.md`만 고치세요.

터미널 없이 아래처럼만 말하면 됩니다.

| 상황 | 프롬프트 예시 |
| --- | --- |
| 처음 시작 | `나는 rooms 담당이야. 최신 main 받아서 새 브랜치 만들고 시작하자.` |
| 작업 | `기차를 클릭하면 열리는 히스토리 패널에 연표 3개를 넣어 줘.` |
| 올리기 | `지금까지 한 거 PR로 올려 줘.` |
| 이어서 작업 | `main 최신 내용 받아서 새 브랜치로 다음 작업 시작하자.` |
| PR 확인 | `PR 3번 확인해 줘. 규칙 어긴 거 있는지 봐 줘.` |

머지는 AI에게 맡기지 말고, 팀원이 확인한 뒤 GitHub PR 페이지에서 직접 누릅니다.

## 아직 임시인 것

- 매장 목록·좌표(`stores/data.js`), 메뉴명·가격, 문구는 자리 표시용입니다. 실제 값으로 교체하세요.
- 모바일은 터치 스크롤만 연결돼 있고 레이아웃 최적화는 하지 않았습니다.
- Vite 등 번들러로 옮길 경우: `npm i three` 후 `index.html`의 import map 블록을 삭제하면 됩니다.
