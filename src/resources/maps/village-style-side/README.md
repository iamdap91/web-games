# 옆길 마을 · 횡스크롤 거리

마을을 옆에서 바라보며 한 거리의 상점 앞·지붕·뒷골목을 선택하는 독립 Canvas2D 시안. 배경과 환경은 직접 작성한 도형으로 그렸고, 승인된 아타호 원본 프레임을 재사용한다.

## 참고와 구현의 경계

[Finji의 Night in the Woods 공식 소개](https://finji.itch.io/night-in-the-woods)는 귀향한 주인공이 작은 마을을 걸으며 사람들과 다시 만나는 배경을 설명하고 횡측면 마을 이미지를 제공한다. 그 마을의 수평 거리 구성과 간판·전후경이 겹치는 시각을 참고했다. 배경 카메라 계수나 세 보행층 연결이 원작 내부 구현이라는 근거는 없으며, 아래 규칙은 이번 시안의 독자 구현이다. 외부 게임 이미지·모델·음악은 다운로드하거나 복사하지 않았다.

## 실제 표현과 조작

- 능선 0.12, 뒤집 0.38, 상점 앞길 1.0, 전경 기둥·풀 1.15의 서로 다른 카메라 이동 계수. 정적인 색상 변경이나 화면 전체 필터가 아니다.
- 상점 앞길과 건물 위 지붕길, 외벽에 가려지는 뒷골목을 두 계단(x=12, 28)이 연결한다. 클릭 경로도 반드시 계단을 거친다.
- A D / 좌우 키는 보행층 안에서 이동. 계단 근처 W / 위 키는 지붕 쪽, S / 아래 키는 골목 쪽 층으로 이동. 화면 클릭은 좌표에 해당하는 길까지 걷는다.
- 찻집 화덕에서 Space: 8초 불과 연기. 도장 앞 Space 또는 복구 버튼: 지붕·창·간판 복구 비교. 지붕 중앙은 풍경 발견, 뒷골목 쉼터는 꽃등 아래 휴식 반응.
- 전체 거리 / 가까이 걷기, 정지 / 재개, 입구 귀환. 귀환은 발견·복구를 보존한다. 정지 중 시설·시간·보행·보기 입력 모두 동결된다.
- `?embed=1`은 설명만 숨기고 모든 조작 버튼을 유지한다. 최초 로딩은 키보드 초점을 이동시키지 않는다. Canvas 클릭만 초점을 받는다.

## 캐릭터와 리소스

`resources/manifest.json`의 `ai/tiger-hero` stand-left/right, move-left/right 프레임을 원본 파일·frame.width/height·pivot·durationSeconds 그대로 읽는다. 기존 `AnimationPlayer`를 재사용하며 이미지 RGB/alpha를 수정하지 않는다. 환경은 직접 그린 Canvas2D 도형으로 별도 생성 서비스·새 패키지·외부 그림이 없다. 원본은 main의 tiger-hero-ai 디렉터리 읽기 링크로 재사용한다. main 리소스를 쓰거나 변경하지 않는다.

## 진단 좌표와 수명

읽기 전용 `window.villageStyleSide`: ready, snapshot, paused, overview, disposed, cameraX, layers, screenPositions, project({x,z}). 상태 조작 함수는 노출하지 않는다.

- x는 가로 거리의 월드 좌표(1..37), z는 높이 미터가 아닌 보행층 번호. -1 지붕, 0 상점 앞, +1 뒷골목. 연결 계단을 지나는 동안 z는 연속값이다.
- snapshot.position/lane/nearby(시설 ID)/nearbyName/visited/restored/fireSeconds/rooftopFound는 관측 결과. 시설 접근점: hearth {x:6,z:0}, dojo {x:20,z:0}, refuge {x:33,z:1}.
- project 반환은 Canvas 좌상단 기준 CSS px이며 DPR에 영향을 받지 않는다. 카메라 변경 뒤 한 프레임 이상 기다린 다음 읽는다. screenPositions.world는 시설 월드 좌표다.
- layers.offset은 화면 CSS px 카메라 이동분, ratio는 해당 층의 실제 렌더 계수. 머무를 때와 걷는 중 차이를 비교할 수 있다.
- `resource-scene-dispose`, pagehide는 RAF·ResizeObserver·키보드/포인터/버튼 이벤트·이미지 참조를 정리한다.

## 검증

핵심 규칙 테스트 3개: 계단 밖 층 변경 금지와 클릭 계단 경유, 수동 층 변경/층 경계, 시설 불 수명·복구·귀환 보존. `npm run check`, `npm run build`, `node --test tests/village-style-side.test.mjs` 통과.

실제 Chrome 1100×620 DPR2와 390×620에서 보행·카메라 계수 차이·찻집 불·도장 복구·지붕 발견·뒷골목 클릭 이동·정지 입력 동결·가로 넘침·종료를 확인한다. 모바일 화면 크기는 브라우저 뷰포트 검증이며 실제 휴대폰 검증은 아니다. 결과 PNG는 검토 후 루트 라이브러리에 보관한다.

본게임 저장·경제·전투·성장 연결 및 main 병합은 이 시안의 범위에 포함하지 않는다.
