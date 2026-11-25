// STORE & FAMILY 섹션 데이터.
// 매장 좌표는 OpenStreetMap(Nominatim) 검색 결과, 주소는 언론 보도·매장 안내를 기준으로 적었습니다(2026-11 기준).
// 팝업은 기간이 끝나면 이 목록에서 해당 줄만 지우면 됩니다. 주소·기간은 올리기 전에 이케아 공식 사이트에서 한 번 더 확인하세요.
//   type: 'store' = 정식 매장(파란 점), 'popup' = 팝업(노란 점)
export const STORES = [
  { id: 'gwangmyeong', type: 'store', name: '이케아 광명점', addr: '경기 광명시 일직로 17', lat: 37.42436, lon: 126.88279, url: 'https://www.ikea.com/kr/ko/stores/gwangmyeong/' },
  { id: 'goyang', type: 'store', name: '이케아 고양점', addr: '경기 고양시 덕양구 권율대로 420', lat: 37.6294, lon: 126.86301, url: 'https://www.ikea.com/kr/ko/stores/goyang/' },
  { id: 'giheung', type: 'store', name: '이케아 기흥점', addr: '경기 용인시 기흥구 신고매로 62', lat: 37.22253, lon: 127.11618, url: 'https://www.ikea.com/kr/ko/stores/giheung/' },
  { id: 'dongbusan', type: 'store', name: '이케아 동부산점', addr: '부산 기장군 기장읍 동부산관광3로 17', lat: 35.19013, lon: 129.21025, url: 'https://www.ikea.com/kr/ko/stores/dongbusan/' },
  { id: 'gangdong', type: 'store', name: '이케아 강동점', addr: '서울 강동구 고덕비즈밸리로', lat: 37.56645, lon: 127.15721, url: 'https://www.ikea.com/kr/ko/stores/' },
  { id: 'gwangju', type: 'store', name: '이케아 롯데 광주점', addr: '광주 동구 롯데백화점 광주점', lat: 35.15454, lon: 126.9122, url: 'https://www.ikea.com/kr/ko/stores/' },
  { id: 'songdo', type: 'store', name: '이케아 현대프리미엄아울렛 송도점', addr: '인천 연수구 현대프리미엄아울렛 송도점 지하 1층', lat: 37.3826, lon: 126.6563, url: 'https://www.ikea.com/kr/ko/stores/' },
  { id: 'daegu', type: 'store', name: '이케아 신세계백화점 대구점', addr: '대구 동구 신세계백화점 대구점 8층', lat: 35.87777, lon: 128.62914, url: 'https://www.ikea.com/kr/ko/stores/' },
  { id: 'daejeon', type: 'store', name: '이케아 현대프리미엄아울렛 대전점', addr: '대전 유성구 테크노중앙로 123', lat: 36.42347, lon: 127.39927, url: 'https://www.ikea.com/kr/ko/stores/' },
  { id: 'pangyo', type: 'popup', name: '이케아 팝업 현대백화점 판교점', addr: '경기 성남시 분당구 판교역로146번길 20 현대백화점 판교점 지하 1층', lat: 37.3928, lon: 127.11199, url: 'https://www.ikea.com/kr/ko/stores/' },
  { id: 'cheonan', type: 'popup', name: '이케아 팝업 갤러리아 센터시티', addr: '충남 천안시 갤러리아백화점 센터시티 2층 · ~2027.01.03', lat: 36.8188, lon: 127.155, url: 'https://www.ikea.com/kr/ko/stores/' },
];

// 지구본에 찍는 세계 매장 점 — 이케아가 진출한 주요 도시(대표 위치, 실제 매장 좌표와 다를 수 있음)
export const WORLD = [
  [59.33, 18.06], [56.55, 14.14], [59.91, 10.75], [55.68, 12.57], [60.17, 24.94], [52.52, 13.4],
  [53.55, 9.99], [48.14, 11.58], [52.37, 4.9], [50.85, 4.35], [48.86, 2.35], [51.51, -0.13],
  [53.48, -2.24], [53.35, -6.26], [40.42, -3.7], [41.39, 2.17], [38.72, -9.14], [45.46, 9.19],
  [41.9, 12.5], [48.21, 16.37], [47.37, 8.54], [52.23, 21.01], [50.08, 14.44], [47.5, 19.04],
  [44.43, 26.1], [37.98, 23.73], [41.01, 28.98], [32.08, 34.78], [25.2, 55.27], [24.71, 46.68],
  [30.04, 31.24], [19.08, 72.88], [17.39, 78.49], [13.76, 100.5], [3.14, 101.69], [1.35, 103.82],
  [-6.21, 106.85], [14.6, 120.98], [31.23, 121.47], [39.9, 116.41], [22.32, 114.17], [25.03, 121.57],
  [35.68, 139.69], [34.69, 135.5], [-33.87, 151.21], [-37.81, 144.96], [-36.85, 174.76], [40.71, -74.01],
  [41.88, -87.63], [34.05, -118.24], [43.65, -79.38], [19.43, -99.13], [-33.45, -70.67], [4.71, -74.07],
  [-12.05, -77.04],
];

// IKEA FAMILY 혜택 목록 (시안 순서 그대로). 첫 줄은 SPECIAL 과 이어지는 PRICE 입니다.
export const FAMILY = ['PRICE', 'HEJ POINT', 'FOOD', 'PRESENT', '2 WEEK SERVICE', 'EVENT', 'STYLING'];
