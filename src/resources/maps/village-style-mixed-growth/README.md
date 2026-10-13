# 살아나는 골목 · 연결건축·단면생활 조합

독립 시안 `local/village-style-mixed-growth`. 실행 경로는 `src/resources/maps/village-style-mixed-growth/`, 답사 API는 읽기 전용 `window.villageStyleMixedGrowth`다. 본게임 연결·main 병합·배포는 이 작업의 범위에 포함하지 않는다.

## 가져온 원리와 새 3D 변환

- 기존 `village-style-modular`의 인접 표에서 공유 외벽과 개구부를 파생하는 원리를 가져왔다. 새 조합은 빈 통행 아치 대신 실제 바닥이 있는 방과 복도를 잇고, 후면 숙소를 더하는 작은 L형 건축이다. 0단계는 공방/도장 2방, 1단계는 복도 포함 3방/공유벽 2쌍, 2단계는 숙소 포함 4방/공유벽 3쌍이다. 1단계에서 세 방 위에 하나의 긴 연결 지붕이 생기며 2단계는 후면 지붕을 더한다.
- 기존 `village-style-cutaway`는 Canvas2D로 실내와 복도·주민을 표현했다. 이번에는 벽·실내 바닥·가구·주민 실루엣·계단·지붕 모두 실제 Three.js geometry다. 같은 방의 앞벽/지붕만 숨기고 공유벽의 기둥과 보는 남긴다. 단면은 별도 병렬 화면이 아니라 같은 세계의 표시 변경이다.
- 기존 `village-style-lit2d`의 높이장→normal 생성 함수를 재사용했다. flat2D 셰이더는 사용하지 않는다. 화덕 벽돌과 공방/복도 작업대는 실제 `MeshStandardMaterial.normalMap`을 쓰며 `PointLight`의 위치와 색을 바꾸면 표면의 빛이 바뀐다. 큰 형태는 geometry가 소유하고 normal은 국소 표면 방향만 바꾼다.

[Three.js MeshStandardMaterial 문서](https://threejs.org/docs/pages/MeshStandardMaterial.html)의 normalMap/normalScale 규칙과 [Object3D 문서](https://threejs.org/docs/pages/Object3D.html)의 부모/자식 변환을 확인했다. 색 그림은 SRGB, normal은 NoColorSpace다. 재사용한 높이 변환은 화면 아래 방향 기울기를 GL 위 방향으로 반전하며 tangent y는 양의 normalScale을 쓴다. 문패와 생활 그림은 건물 Group의 로컬 면에 고정한다.

## 자체 코드와 원본 자산

환경, 픽셀 무늬, 색/normal texture, 가구와 작은 주민은 자체 코드다. 외부 게임 자산, 새 이미지 생성, 유료 서비스, 패키지 추가는 없다. 아타호만 승인된 `ai/tiger-hero`의 원본 RGBA 프레임을 `TrailSprite`/`SpriteTextures`/`frame-pivot`으로 읽는다. 원본 가로/세로 비율과 아래 pivot을 유지하고 y축 yaw만 회전한다. 카메라 세로 투영을 scale.y로 보정해 발의 실내/계단 높이와 그림을 함께 맞춘다. 주민 높이는 약1.48 world이며 아타호 원본 크기를 변경하지 않는다.

`GrowthVisit`가 성장·복구·방문·화덕 시간·누적 시간·걸음·경로를 소유한다. `growthTopology(stage)` 하나에서 방/공유벽/가구/생활 상태를 파생하며 렌더와 통행이 같은 벽/문 폭을 쓴다. 방 크기, 격자, 경계는 `growthRules`에서 파생한다. 새 벽과 겹치는 위치는 가까운 유효 통행점으로 보정한다.

## 작은 플레이 루프와 비교

길 클릭/터치, WASD/방향키로 이동한다. 공방 화덕 근처 Space는 14초 동안 불과 빛을 키우고 주민의 작업 팔을 움직인다. 도장 Space는 마룻장을 고쳐 수련 매트와 움직임을 돌려준다. 빈터 쉼터를 발견한 뒤 성장2단계에서는 도장 뒤 실제 계단 위 숙소로 올라간다. 세 시설을 방문하고 입구로 돌아오면 한 바퀴 완료가 남는다.

- `#growth`: 분리 방 → 공유 복도 → 숙소·꽃 마당 → 분리 방. 성장 비교는 방문/복구/세계시간/걸음/화덕 시간을 지우지 않는다.
- `#restore`: 도장 수리 전/복구. 성장과 별개다.
- `#cutaway`: 같은 건물 외벽·지붕/단면. 통행 상태는 바꾸지 않는다.
- `#normal`, `#light`: 실제3D 벽돌/나무 요철과 화덕 쪽/창가 쪽 광원 비교.
- `#overview`, `#pause`, `#reset`, `#interact`: 전체조망, 정지, 위치만 입구 복귀, 시설 사용. `#reset`은 기록/시간/성장/불을 보존한다.

`embed=1`에서는 설명만 숨긴다. 비교 8버튼과 시설 사용 버튼은 390×620에서도 유지한다. 최초 로딩은 부모/문서 focus를 옮기지 않는다. 원본 프레임 로드와 첫 실제 렌더 뒤 ready가 true다. 정지 중 키/시설/상태/시간/PNG 렌더를 멈추며, resize 때는 마지막 snapshot과 animation delta0으로 한 번만 다시 그린다. pagehide/resource-scene-dispose에서 RAF, 이벤트, ResizeObserver, geometry, material, texture, WebGL context를 정리한다.

## 검증과 한계

회귀 테스트는 `tests/village-style-mixed-growth.test.mjs`에 있다. 성장 adjacency/실내 같은 상태, 실제 벽·가구 우회와 연결 뒤 경로 단축, 세 시설/귀환, 입구 복귀 보존, 새 벽 끼임의 근거리 보정, 계단 발높이/대각선 속도/잘못된 입력/불시간을 검증한다.

`npm run check`, `npm run build`, 6개 로직 회귀가 통과했다. 실제 Chrome 1100×620 DPR2에서 초기 BODY focus, 키보드/지면 클릭/세 시설 Space, 세 성장 단계의 공유벽·지붕 갱신, 외벽/단면의 상태 보존, 주민 작업 반응, normal/광원 비교, 계단 발높이0.7, 귀환을 확인했다. Canvas PNG는 정지 중 동일했고 정지 resize에서 renderCount가 정확히1회 증가했다. 종료 후 ready=false/disposed=true와 textureCache=0을 확인했다.

390×620 DPR2와 같은 크기의 실제 iframe에서 비교8버튼+시설 버튼9개가 모두 화면 안에 있고, 부모 입력 focus를 보존하며 클릭/Space로 세 시설을 방문했다. 가까이 보기에서 화면 밖 시설은 실제 전체조망 버튼으로 찾아갔다. iframe 계단/정지 PNG/pagehide 종료도 확인했다. 새 숙소 벽 위치 `{x:3,z:-4.5}`를 실제로 밟은 뒤 성장하면 `{x:3,z:-4.2}`로0.3만 보정됐고 기록은 남았다. 실내 인물은 외벽/지붕을 닫으면 실제 Mesh에 가려진다. 숙소는 높은 바닥0.7에 맞춰 벽과 지붕도0.48 높여 원본 인물의 머리가 지붕 위로 나오지 않게 했다. 반복 성장 후 같은 단계에서 materialCache128/textureCache17을 유지했다. 브라우저 검증의 pageerror/console error는0건이다.

실제 Chrome의 Playwright 입력 검증 결과와 PNG는 Git 제외 `public/assets/maplestory/village-style-mixed-growth/`에 보관한다. 캡처와 검증 세부는 완료 보고에 함께 제공한다. CSS 폭 검증은 실제 휴대기기 검증이 아니다.

작은 고정 세 단계이며 자유 건축, 경제, 저장, 전투, 다층 자유 편집은 없다. 주민은 짧은 작업동작을 반복하는 자체 3D 실루엣이며 완전한 AI 생활 시뮬레이션은 아니다. 단면에서도 실제 공유벽은 인물/가구를 가리고, 외벽을 닫으면 실내가 지붕 뒤로 숨는다. normal은 충돌·실루엣·큰 요철을 바꾸지 않는다.
