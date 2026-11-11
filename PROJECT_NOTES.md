## Current: authored city scene, no final photograph
The hero keeps the large approved IKEA building and its two continuous rising line streams. The photo swap has been removed entirely. assets/city-scene.js draws the surrounding environment as native SVG in the same calibrated photograph coordinate plane: 43 irregular white city blocks, angled roofs/setbacks/chimneys, a curved street with four tram rails, service-road markings, paved plaza, planters, benches, bicycle stands/bicycles, service cylinders, six branching street trees, and 84 individually posed people. No raster photo or generated background is used for the environment. The existing main-building render and separated plant assets remain as approved.
Surrounding linework draws during the construction sequence; white massing and paving resolve with the building render, street details and people appear by 10s, then header at 10.25s. No hero copy. Main building remains large and centered. All blocks have opaque depth-sorted side faces so paving cannot show through walls. Verified by work/check-city-scene.cjs, work/check-rising-growth.cjs, scripts/verify-motion.cjs, and visual browser review. Local server port 3001.
## Enlarged object and original photo (current)
Removed the generated environment from the active hero. Main stage is full width and centered, with viewBox -50 -70 1650 1200 so authored object occupies approximately 80% of available height. The original untouched ikea-city.jpg is overlaid in the SAME SVG coordinate system at x=-300,y=-171,width=2166,height=1444. Photo building landmarks match the model scale/position approximately. The original photo fades in after trees finish (10.25s, 1.15s fade), with the header. No copy. No generated background or CSS cover zoom.
## Fixed-scale building over expanded environment (current)
Removed Home Begins with You copy entirely. The animated building never fades out or changes size/position when environment appears. Opening and final SVG use the same 66%-width left-aligned stage (mobile 116% stage). Background now uses assets/ikea-city-extended.png: a generated environment-only expansion of the user photo, central IKEA building removed to avoid duplicates, surrounding white city retained and plaza extended. Background fades in at renderStart 7.25s; header still appears after vegetation at 10.25s. No readability gradient remains.
Generated with built-in imagegen. Prompt: remove the central IKEA building and its shadow; extend the white model city into a panoramic architectural plaza with central open ground, matching original camera and daylight, no text or new focal building.
## Photo background and right-aligned black headline
User-supplied img.jpg is copied unchanged to assets/ikea-city.jpg. After the growth sequence finishes, the hero crossfades into this full city photograph as the header and headline appear. The isolated animated building fades out to avoid a duplicate building over the photo. Headline remains Pretendard 850, black, two lines, positioned on the right. A restrained light gradient behind the right-hand type improves legibility. The drawing stage is now left aligned during the opening. The server allowlist includes the new JPG.
## Main hero integrated with final headline
The main prototype uses the approved two-stream building animation. Plants now grow in 1.45s (previously 2.8s); the final plant finishes by 10.174s. Header and the two-line Pretendard 850 headline, “Home Begins” / “with You”, enter together at 10.25s. Main composition places the headline on the left and the building on the right, with stacked placement on mobile. Existing original logo, navigation, GO IKEA button, and brand journey remain intact.
## Current correction: two continuous upward streams
Both streams begin at the ground floor, NOT every floor at once. Interior advances at a 0.725s/storey rate with a 1.45s overlapping pen window. Exterior advances at 0.8s/storey with a 1.6s overlapping pen window. Two storeys overlap continuously, so there is no pause or sequential interior/exterior alternation per floor. Interior leads the exterior front. These rules replace the previous simultaneous-all-storeys instruction.
Vegetation is 77 individually clipped plants, with hand-authored root anchors and crown separation, including formerly joined rooftop crowns. No plant group uses an automatically connected grove or shared root. Original raster remains unchanged; native SVG clip geometry removes the low-alpha haze and isolates each botanical element. Each plant scales at its own fixed anchor after architecture renders.
## Current hero motion — simultaneous floors (2026-11-10)
All floors, including the roof, begin together. There is no floor-index delay. Interior starts at 0.15s and draws for 5.8s; exterior starts at 0.45s and draws for 6.4s. Both streams run continuously with smooth easing. Interior lines remain darker than exterior lines.
Architecture renders at 7.25s using the complete plant-free building asset. Botanical-only cutouts grow uniformly from fixed root anchors from 8.35s, with small overlapping timing offsets. No animated reveal rectangles, empty plant masks, or scaled architectural pixels. Header arrives after growth at 11.7s. Preserve supplied IKEA SVG, Pretendard, and GO IKEA button.
Validated with work/check-rising-growth.cjs, scripts/verify-motion.cjs, and browser inspection at 2.5s and 9.8s. These timings supersede earlier motion notes below.
## 현재 동작: 동시 시간차 + 가려진 건축 복원 + 고정 식재 드러남

실내는 0.2초, 외곽은 0.8초부터 시작해 0.6초 시차로 동시에 올라옵니다. 실내 층 간격은 1.0초, 외곽은 0.94초이며 한쪽이 모두 끝날 때까지 기다리지 않습니다. 전체 선은 약 8.2초에 완성되고 8.4초부터 건물 렌더를 입힙니다.

`assets/ikea-building-bare.png`는 제공된 렌더에서 나무와 원예만 제거하고 가려졌던 바닥·벽·프레임을 복원한 AI 편집 이미지입니다. 프롬프트: 원본 카메라·크기·배치를 유지하며 식재만 제거하고 뒤의 건축 구조를 이어 복원. 원본과의 작은 차이를 줄이기 위해 식재 영역의 배경을 메우는 용도로만 사용합니다. 다른 부분은 원본 렌더를 유지합니다.

나무는 식재 전용 클리핑 영역의 아래쪽에서 위쪽으로만 드러납니다. 원본 이미지나 건물 조각에 scale/translate를 적용하지 않습니다. 식재 영역의 가려진 건축 배경을 먼저 복원해 빈 구멍도 남기지 않습니다. 이전 순차 단계/식재 확대 효과 설명은 이 상태로 대체합니다.

## 최신 확정: 실내 전체 이후 외곽 전체, 식재는 마지막 고정 렌더

- 0.2~5.51초: 실내만 1층부터 6층까지 완성합니다. 외곽은 아직 나타나지 않습니다.
- 5.65~10.33초: 외곽·창틀·층 사이 보/기둥을 1층부터 6층과 옥상까지 완성합니다. 실내보다 다른 층 간격/드로잉 속도를 사용합니다.
- 10.45~11.35초: 식재를 제외한 건물 렌더를 입힙니다.
- 11.5~12.3초: 나무·원예만 원본 위치에서 불투명도 전환으로 표시합니다. 이동·크기 변형은 없습니다. 헤더는 12.45초부터 내려옵니다.
- 실내/외곽이 섞여 올라가던 이전 동작과 식재 성장 transform은 삭제했습니다. 건물 사이의 내부 보·기둥을 외곽 단계에 추가했습니다.

## 최신 조정: 느리게 올라오는 드로잉과 식재 성장

좌우 클리핑 채움은 제거하고 경로 드로잉으로 돌아왔습니다. 실내는 0.25초부터 층 간격 1.06초, 외곽은 0.65초부터 층 간격 1.0초로 올라옵니다. 실내가 먼저 시작하고 외곽이 따라잡아 약 8.6초에 전체 선이 완성됩니다. 8.75초부터 건물 렌더를 입힙니다.

`assets/foliage-regions.js`는 원본 이미지에서 추출한 식재 영역의 SVG 클리핑 데이터이며 원본 PNG는 변경하지 않았습니다. `assets/growing-render.js`가 건물과 식재를 분리해 렌더하고 38개 식재 영역을 각 하단 기준점에서 세로로 성장시킵니다. 식재는 약 9.1~11.5초에 성장하고 헤더는 11.7초 후 나타납니다. 선 단계에는 식재 경로가 없습니다.

## 최신 조정: 고정 시점 좌우 채움

실내·외곽 골조·창틀·옥상 프레임을 모두 선으로 완성합니다. 외곽 불투명도는 0.34, 창틀 등 외부 디테일은 0.42로 올렸고 실내 벽체는 1.0을 유지합니다. 나무 경로는 없으며 렌더에만 포함됩니다. 경로 둘레를 따라 도는 stroke-dash 애니메이션을 제거하고, 층별 좌우 클리핑 영역이 화면 양끝에서 중앙으로 차오르도록 변경했습니다. 시점과 건물 방향은 고정합니다. 모든 층의 양쪽 영역이 완성된 뒤 B 렌더로 전환합니다.

## 현재 확정 상태 (2026-11-10)

- 공유한 `이케아로고 2.svg`를 수정 없이 `assets/ikea-logo.svg`로 사용합니다. 헤더에는 텍스트로 만든 임시 로고를 사용하지 않습니다.
- 헤더 메뉴와 GO IKEA는 로컬 Pretendard 가변 폰트를 사용합니다. 폰트는 공식 v1.3.9 배포본이며 라이선스를 `assets/fonts/`에 보존합니다. 출처: https://github.com/orioncactus/pretendard
- GO IKEA는 파란 글자와 노란 원형 화살표를 가진 링크 버튼입니다. 공식 한국 사이트로 연결합니다.
- 라인은 서로 다른 실내 도면이 양쪽에서 연속으로 쌓입니다. 실내 벽체는 진한 파랑, 가구는 파랑, 외곽 골조와 창틀은 옅은 회청색입니다. 완성된 실내 선을 렌더 직전까지 유지합니다.
- 나무/식재는 라인 경로에서 완전히 제외합니다. 식재 자리는 비워두고, B안의 전체 렌더가 나타날 때 사진 안의 나무도 함께 나타납니다.
- 라인 완료 후 약 0.07초 이내 렌더 전환을 시작합니다. 중간 대기 구간 없이 층별 드로잉이 겹쳐 진행됩니다.
- `assets/interior-scene.js`가 메인과 비교 화면의 공통 모델/타이밍/색상/선 굵기를 담당합니다. `assets/brand-header.css`가 공통 헤더를 담당합니다.
- `compare.html`은 A(선 유지)와 B(전체 렌더 전환)를 비교합니다. 메인 `index.html`은 B 흐름을 사용합니다.

아래는 이전 작업의 기록입니다. 충돌하는 설명은 위의 현재 확정 상태를 따릅니다.

# 이어서 작업할 때

## 확정된 방향

이케아를 소개하는 브랜드 경험 웹사이트입니다. 매장 구역명이나 제품 카테고리를 그대로 나열하는 쇼핑몰로 바꾸지 않습니다.

매장 안내도는 이동 방향과 경로 형태만 참고합니다. 미니맵에는 매장 구역 대신 브랜드 챕터를 표시합니다.

## 중요한 구분

`routeKnots`와 `minimapKnots`는 서로 독립적입니다.

- 메인 화면은 방향을 따라 이동합니다.
- 미니맵 선은 사용자가 그린 파란 곡선의 모양과 되돌아오는 고리를 반영합니다.
- 미니맵 곡선을 수정한다고 메인 화면까지 같은 작은 고리 모양으로 움직이게 만들지 않습니다.

## 섹션 구성

1. Hej, IKEA — 단일 섹션
2. 스웨덴에서 시작된 생각
3. 모두를 위한 디자인 — 다섯 원칙 선택
4. 작은 아이디어의 힘 — 스티키 3장면
5. 플랫팩의 생각 — 테이블 조립
6. 집에서 시작하는 디자인
7. 일상으로 이어지는 디자인 — 대표 제품 3개와 공식몰 연결
8. 함께 만드는 일상 — 겨울 분위기 선택
9. 당신의 일상으로 — 카드 저장

마지막에는 큰 IKEA 로고 푸터를 배치합니다.

## 모션 수정 시

- 화면 좌표를 스크롤 이벤트마다 갑자기 바꾸지 않습니다.
- `tick()`에서 기하 계산이나 레이아웃 크기 읽기를 반복하지 않습니다.
- 화면·부품 모션은 하나의 애니메이션 루프에서 갱신합니다.
- `measure()`는 초기화·리사이즈·로드 시 크기를 다시 계산합니다.
- 시간표는 `unitFromTime()`과 `timeFromUnit()`이 담당합니다. 4번 스티키 구간의 길이는 `holdDurations[3]`입니다.
- 연결점의 연속성, 타이밍 역변환, 3장면 순서 등을 `npm test`로 확인할 수 있습니다.

## 다음 작업

## 히어로 건축 애니메이션

`assets/concept-plans.js`가 6개 층과 옥상 정원, 총 7개의 서로 다른 포트폴리오용 도면을 생성합니다. 제공된 건물의 외부 테라스·외부 계단·중앙 수직 동선에 착안한 새 배치입니다. 1F 입구/갤러리, 2F 거실/쇼룸, 3F 주방/수납, 4F 레스토랑, 5F 스튜디오, 6F 객실, 옥상 정원을 각각 다르게 그렸습니다. 중앙 계단 위치는 층 사이에서 유지합니다. 실제 건축 도면의 복제나 검증된 실측 도면은 아닙니다.

`assets/hero.js`는 선으로만 6층과 옥상을 쌓은 뒤 전체 이미지로 전환하고 헤더를 보여줍니다. 채워진 바닥 면·중간 사진·그림자는 없습니다. `compare.html`과 `assets/compare.js`는 두 시작점에서 시간차로 올라가는 빠른 A안과 마지막에 건물 렌더로 전환하는 B안을 나란히 보여줍니다. 층별 보기와 도면 한눈에 보기를 지원합니다. 이전 공개 도면 데이터 `architect-plans.js`는 보존되어 있지만 현재 화면에서는 사용하지 않습니다.


## 입체 건축 선 업데이트

현재 애니메이션은 평면도 쌓기 대신 `assets/building-model.js`의 사진 비례에 맞춘 입체 구조선을 사용합니다. 층별 슬래브·기둥·깊이 있는 창틀·유리창 분할·루버·발코니 난간·외부 지그재그 계단·옥상 퍼걸러 및 태양광 패널을 포함합니다. `assets/building-traces.js`는 원본 이미지를 변경하지 않고 픽셀 윤곽을 벡터 경로로 추출한 추가 디테일입니다. 구조선 이후 이미지와 정렬된 세부 선을 완성하고, B안에서만 전체 렌더로 전환합니다. `concept-plans.js`의 서로 다른 평면도는 비교 페이지의 도면 한눈에 보기에서만 보조 자료로 사용합니다.


## 실내 우선 순서

현재 `assets/interior-scene.js`가 메인과 비교 화면의 공통 순서를 담당합니다. 초기에는 서로 다른 실내 도면의 칸막이·가구·계단만 그립니다. `perimeter`와 `landscape` 경로를 제외해 외곽 큐브/기둥 골조와 식재가 먼저 나타나지 않습니다. 실내 도면 완성 후 이미지에 정렬된 창틀·외벽 윤곽이 이어지고, 식재와 옥상 윤곽은 마지막 단계에 나타납니다. 이후 B안에서 완성 이미지로 전환됩니다. 비교 화면의 실내 단계 버튼으로 첫 구간만 정지해 확인할 수 있습니다.







