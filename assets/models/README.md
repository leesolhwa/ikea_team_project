# GLB 모델 넣는 곳

섹션별 폴더에 `.glb` 파일을 넣고, 해당 섹션 JS 상단의 `MODELS`에 경로를 적으면 임시 도형이 교체됩니다.

```
assets/models/common/joke.glb      → src/core/character.js 의 CHARACTER_GLB
assets/models/about/house.glb      → src/sections/about/about.js 의 MODELS.house
assets/models/rooms/sofa.glb       → src/sections/rooms/rooms.js 의 ROOMS[].items[].url
assets/models/rooms/train.glb      → src/sections/rooms/rooms.js 의 MODELS.train
assets/models/stores/globe.glb     → src/sections/stores/stores.js 의 MODELS.globe
assets/models/stores/korea.glb     → src/sections/stores/stores.js 의 MODELS.korea
assets/models/food/donut.glb       → src/sections/food/food.js 의 MODELS.dishes
```

파일명은 예시입니다. Blender 원본(`.blend`)은 용량이 크니 저장소에 올리지 말고 따로 공유하세요.
