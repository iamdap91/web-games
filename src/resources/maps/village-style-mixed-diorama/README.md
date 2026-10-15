# 붓결이 머무는 마당 · 디오라마·회화·콜라주 조합

리소스 라이브러리에서 비교하는 독립적인 마을 시안이다. 작은 안료 화덕에서 불씨를 넣고 북서쪽 높은 기단의 도장을 복구한 뒤, 돌다리와 담 끝을 지나 천 쉼터를 찾는다. 돌아올 때 다리로 되돌아오거나 굽은 수로 끝과 낮은 천시장을 지나는 길을 고를 수 있다. 본게임 저장·경제·전투와 연결하지 않는다.

## 기존 기법의 재사용과 새 구성

- 기존 `village-style-diorama`의 정적 색/깊이 RenderTarget 저장, `gl_FragDepth` 복원, 동적 인물/불/연기/물결 합성 구조를 이 폴더 안으로 분리해 재사용했다. 깊이 복원 사각형은 `depthTest: true`, `AlwaysDepth`, `depthWrite: true`로 그린다. 깊이 검사를 끄면 깊이 쓰기가 생략될 수 있는 기존 검증을 반영했다. 정적 장면 전체를 매 프레임 다시 렌더하지 않는다.
- 기존 `village-style-painted`의 큰 색면 → 방향성 마른 붓 순서와 처마 명암을 3D 벽·지붕의 로컬 UV 소재판으로 옮겼다. 화면 필터나 캐릭터 뒤에 붙는 효과가 아니다. 지붕은 두께와 휘어진 끝이 있는 실제 곡면 기하다.
- 기존 `village-style-collage`의 껍질·이끼·천처럼 소재마다 결의 방향과 밀도를 달리하는 원리를 새 소재판과 로컬 장식으로 옮겼다. 껍질은 긴 균열, 이끼는 조밀한 짧은 알갱이, 천은 교차 결과 늘어지는 차양으로 읽힌다. 배경 사진을 잘라 붙인 것은 아니다.
- 반복 집 두 채와 방형 바닥을 제거했다. 불규칙하고 두꺼운 바닥, 북서로 비껴난 큰 도장 기단, 낮은 전면 천시장, 따뜻한 공방 마당, 동쪽에서 꺾이는 수로와 단일 다리·담 뒤 쉼터로 새 순환을 만든다. 원래 집의 질감·색만 바꾸는 구성에서 리뷰를 거쳐 배치와 보행 규칙까지 바꿨다.

## 표면 조명과 캐시

각 소재의 별도 높이판에서 tangent normal을 계산한다. normal 텍스처는 기본 `NoColorSpace`, 색판은 `SRGBColorSpace`로 사용한다. normal은 표면의 조명 방향을 바꾸며 기하 실루엣을 늘리지 않는다. 화덕 마당의 정적 `PointLight`가 껍질 기둥과 벽돌·천의 표면을 비추고, 복구 후에는 도장 등불의 정적 국소광도 켜진다. `화덕 빛 · L`과 `소재 요철 · N`에서 두 효과를 비교할 수 있다. normal 선택은 실제 normalMap 사용을 바꾸며 색판은 유지한다. 전체 화면 glow로 효과를 대신하지 않는다.

캐시 키는 실제 backing-store 너비/높이, 복구, 조망, 빛, normal이다. 이 키가 바뀌면 색과 깊이를 함께 한 번 재굽는다. 인물 이동·화덕 불씨·효과 시간은 키에 들어가지 않는다. 매 프레임 저장된 색과 깊이를 복원하고 동적 인물·불·연기·물결을 깊이 검사하여 합성하므로 지붕과 담 뒤 인물은 가려진다. 색·깊이 이미지가 같은 화면 UV로 맞물리는 것은 실제 앞/뒤 보행으로 확인했다.

동적 화덕의 불·연기와 지면/벽면의 국소 투명 색판은 정적 PointLight와 별개다. 불씨를 쓰거나 꺼질 때 배경을 재굽지 않는다. 인물과 효과는 매 프레임 합성하고, 정적 국소광은 배경 굽기에만 적용한다. 캐시는 최대 DPR 2로 저장한다. 프레임 시간이나 속도 향상을 측정하지 않았으며 성능 향상을 주장하지 않는다.

## 조작·상태·수명

WASD/방향키는 화면 방향으로 걷는다. 클릭/터치는 기단·계단·수로·담과 소품 충돌을 반영한 경로로 이동한다. Space 또는 시설 사용 버튼, R 복구, M 조망, L 빛, N 요철, Esc 정지를 지원한다. 입구로 버튼은 위치와 이동 경로만 되돌리며 복구·방문·불씨·세계 시간을 보존한다.

정지하면 입력·이동·시설 반응·불/물/연기 시간과 PNG 화면이 고정된다. 정지 중 resize는 상태·인물 프레임/자세·효과 시간을 보존하고 배경과 합성을 한 번만 다시 그린다. `?embed=1`은 설명을 숨기고 모든 조작 버튼을 유지한다. 처음 로딩할 때 focus를 가져오지 않는다. 캔버스나 버튼을 누르면 키보드 조작을 이어갈 수 있다. `resource-scene-dispose`와 `pagehide`에서 RAF·입력 이벤트·ResizeObserver·캐릭터/소재 텍스처·정적/동적 geometry·색/깊이 RenderTarget·그림자·WebGL 문맥을 정리한다.

`window.villageStyleMixedDiorama`는 읽기용 API다. `ready`는 리소스 로딩과 첫 렌더 후에 참이 된다. `snapshot`에는 `player`, `position: {x,z}`, `nearby`/`nearbyID`, `visited`, `restored`, `fire`, 발견과 경로 정보가 있다. `paused`, `overview`, `disposed`, Canvas CSS 좌표를 돌려주는 `project({x,z})`, 시설별 `screenPositions`를 제공한다. `diagnostics`에는 `bakedBackgroundRenders`, `backgroundRevision`, `frameCount`, `elapsed`, backing-store 크기, 빛/normal 상태, 원본 actor width/height/pivot와 수직 yaw/pitch 보정 정보가 있다.

시설 접근점은 화덕 `(-4.5, 3.4)`, 도장 `(-2.8, -4.9)`, 쉼터 `(9, -6.7)`이다. 입구 `(-2, 10.5)`, 수로 끝 우회점 `(9, 4.8)`, 도장 북쪽 가림 확인점 `(-2.8, -9.5)`도 걸을 수 있다.

## 리소스와 출처

환경 기하·색판·normal 판·간판·장식은 이 폴더 코드에서 직접 만든다. 기존 디오라마·회화·콜라주의 표현 원리를 조합했고 기존 18개 폴더는 변경하지 않았다. 외부 환경 사진·모델·새 패키지·유료 생성물을 사용하지 않았다. [Three.js RenderTarget](https://threejs.org/docs/pages/RenderTarget.html), [DepthTexture](https://threejs.org/docs/pages/DepthTexture.html), [MeshStandardMaterial](https://threejs.org/docs/pages/MeshStandardMaterial.html)의 기반 기능을 사용한다.

아타호는 승인된 `ai/tiger-hero`를 기존 `TrailSprite`와 `SpriteTextures`로 읽는다. RGBA·프레임 width/height·pivot를 재작성하지 않는다. 기존 바닥 pivot.y 기준을 유지하고 수직 인물판에는 카메라 수평 yaw와 pitch 투영 압축에 대한 scale만 적용한다. 예를 들어 실제 기본 대기 프레임은 45×63, pivot `(25,0)`으로 로딩됐고, actor pitch는 0이다. 인물 접지 그림자는 현재 보행 높이를 따른다.

미리보기와 실행 증거는 로컬 Git 제외 폴더 `public/assets/maplestory/village-style-mixed-diorama/`에 보관한다. `preview.png`, `restored.png`, `hearth.png`, `shelter.png`, `river-detour.png`, `roof-occlusion.png`, `light-off.png`/`light-on.png`, `normal-off.png`/`normal-on.png`, `narrow-paused.png`, `iframe390.png`가 있다. `browser-check.json`과 `iframe-check.json`은 실제 상태·캐시 진단 기록이다. 라이브러리 등록 메타데이터는 이 폴더의 `library-entry.json`이며 공통 manifest/catalog 등록은 담당 통합 세션이 수행한다.

## 검증 기록과 제약

- 당시 로직 검사 6개: 높은 기단의 두 계단과 절벽, 불규칙 바닥·수로·화덕·담 충돌, 단일 다리/수로 끝 경로, 세 시설 순환·불씨·복구와 입구복귀의 상태 보존, 복구 소품 아래 재배치, 배경 무효화 키.
- 실제 Google Chrome 1100×620·DPR 2에서 키보드 보행, 시설을 실제 좌표로 클릭한 화덕→도장 복구→담 뒤 쉼터 순환, 수로 끝 우회 귀환, 높은 마당 접지와 지붕 뒤 가림을 확인했다. 보행 동안 `bakedBackgroundRenders=1`이 유지됐다. 복구/빛 off·on/normal off·on/조망 off·on/resize가 각각 배경을 한 번 갱신했고 전체 검사 종료 시 9회였다.
- 정지 입력 및 700ms 경과 후 snapshot·elapsed·frameCount·Canvas PNG 바이트가 모두 같았다. 정지한 채 390×620으로 resize했을 때 인물 프레임/위치·상태·시간이 같고 frameCount와 배경 굽기는 각각 1회만 증가했다. 추가 대기 중에는 다시 증가하지 않았다.
- 실제 390×620 iframe·DPR 2에서 터치로 화덕 접근과 시설 사용, 설명 숨김/버튼 유지, 정지 터치 차단과 PNG 고정, iframe resize 1회, pagehide 종료를 확인했다. 별도 `resource-scene-dispose` 검사에서도 ready가 꺼지고 깊이 캐시가 종료되며 프레임이 더 늘지 않았다. 브라우저 오류 0개였다.
- `npm run check`, `npm run build`를 실행한다. 모바일 크기·터치 emulation은 실제 휴대폰 검증으로 간주하지 않는다. 실물 모형 사진이나 예술가 원화의 세밀함과 같은 수준이라고 주장하지 않는다.
