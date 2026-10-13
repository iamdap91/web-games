# 온빛 도장 · 입체·자연·회화 조합

독립 시안 `local/village-style-mixed-dojo`. 굽은 입구 흙길에서 비대칭 화덕 광장으로 들어가 중앙 계단 또는 동쪽 언덕길로 도장을 복구하고 나무 뒤 쉼터를 찾는다. 기존 18개 시안 파일과 본게임은 수정하지 않는다.

## 가져온 기법과 다시 구성한 부분

- `village-style-hd2d/scene.ts`: 실제 3D 집·기와 지붕·기단·단계단, 깊이 가림, `TrailSprite`의 원본 프레임 배치·수직 인물판을 재사용했다. 마을 배치와 지형/보행 높이·시설 상태·화면 수명은 이 시안에서 새로 작성했다.
- `village-style-natural/layout.ts`, `scenery.ts`: 길에 가까운 곳을 성기게 심는 원리, 자연 언덕과 곡선 접근길의 구성을 참고했다. 기존 맵 좌표를 복사하지 않고 비대칭 흙광장, S자 입구, 계단과 뒤쪽 언덕 우회, 나무 뒤 쉼터를 같은 지형에 다시 배치했다.
- `village-style-painted/drawing.ts`: 큰 색면을 먼저 놓고 표면 방향으로 낮은 밀도의 마른 붓을 쌓는 기법, 처마 아래 큰 먹그늘을 참고했다. 화면 좌표에서 그리던 2D 붓질을 128px 자체 색 텍스처로 재작성해 3D 지면·벽·기와 UV에 붙였다. 일반 표면은 세계 4단위마다 같은 무늬 밀도를 쓰며, 집 정면/간판은 의미 있는 위치를 유지하는 전용 UV를 쓴다.
- `village-style-lit2d/normal.ts`: 색 그림과 높이장을 분리하는 계산을 재사용했다. 2D 셰이더는 가져오지 않았다. 벽돌·석재·기와의 홈과 능선을 독립 `Float32Array` 높이장으로 만들고 `normalPixels`를 `MeshStandardMaterial.normalMap`에 전달한다.

## 빛·높이·인물 규칙

- `THREE.TangentSpaceNormalMap`. 색 텍스처는 `SRGBColorSpace`, 방향 데이터는 `NoColorSpace`. 색/normal 크기와 `flipY`, 반복 UV를 일치시키고 이미지의 아래쪽 y와 GL 위쪽 y를 normal 계산에서 보정한다.
- `#normal`은 같은 색 텍스처에서 normal만 끄고 켠다. `#light`는 실제 화덕 `PointLight`를 왼쪽 `(-6.5, 1.55, 3.9)`과 오른쪽 `(-3.6, 1.55, 3.9)`으로 옮긴다. 시설에서 불을 살리면 18초 동안 불/연기/빛이 강해진다.
- 큰 계단·집·나무·언덕 높이는 실제 메시와 공유 높이 함수가 책임진다. normal은 표면 방향만 바꾸므로 실루엣·통행 높이는 바꾸지 않는다. 계단 위 지형 면은 제외하고 절벽을 가로지르는 길 삼각형은 연결하지 않는다.
- 승인 아타호 원본 `ai/tiger-hero` 4방향 대기·보행 RGBA를 그대로 사용한다. 원본 width/height, 이미지 아래 기준 pivot.y, 프레임과 nearest 필터를 유지한다. 인물판은 수직 yaw만 허용하고 카메라 pitch의 세로 투영량만 보정하여 발 접지와 건물/나무 뒤 가림을 보존한다.
- 자료 출처는 이 저장소의 위 시안과 승인 캐릭터 리소스다. 외부 게임 미디어·추가 다운로드·유료 생성·패키지 추가는 없다. Three.js 재질 기준: <https://threejs.org/docs/pages/MeshStandardMaterial.html>.

## 조작·수명

`#restore`, `#overview`, `#pause`, `#reset`, `#interact`, `#light`, `#normal`과 WASD/방향키, 길 누르기, Space를 제공한다. 입구 복귀는 위치·입력만 초기화하고 복구·방문·세계 시간을 보존한다. 도장 도착은 계단/언덕 경로에 따라 대사가 달라진다.

초기 로딩은 focus를 가져가지 않고 첫 실제 렌더 뒤 `ready`를 켠다. `embed=1`은 설명만 숨겨 모든 조작을 남긴다. pause는 RAF·시간·입력을 멈추고 현재 보행 프레임과 snapshot을 유지한다. 정지 중 크기 변경은 같은 snapshot/delta=0으로 한 번 다시 그린다. `resource-scene-dispose`와 `pagehide`에서 RAF·이벤트·ResizeObserver·GPU geometry/material/texture·SpriteTextures cache를 정리한다.

`window.villageStyleMixedDojo` 조회 API: ready, snapshot(x/z/height/nearby/visited/restored/fire/elapsed/arrival), paused, overview, disposed, `project({x,z})` (canvas 내부 CSS 좌표), 시설 접근점 screenPositions, 혼합 기법·normal·광원·원본 인물 비율 diagnostics.

## 검증과 한계

- 높이/단계단·옹벽 충돌·건물/화덕/줄기·계단과 언덕 경로·3시설 답사·복귀 보존·normal 방향을 로직 테스트한다.
- 실제 격리 Chrome에서 1100×620 DPR2와 390px DPR2, 좁은 iframe, 클릭 보행·Space·시설 복구, 중앙 계단/뒤쪽 언덕/건물 뒤 가림, normal/광원 비교 PNG, pause PNG 완전 일치 및 정지 리사이즈, 부모 focus 보존, 종료 이후 RAF 정지를 확인한다.
- 성능·표면 재질 비교를 위한 작은 독립 답사이며 저장·경제·전투·주민 AI는 연결하지 않는다. 원경 숲은 보행 범위 밖 장식이다. 모바일은 CSS 화면/입력 검증으로 실제 기기 검증은 포함하지 않는다.

### 2026-10-13 실행 결과

`npm run check`, `npm run build`, 소유 로직 테스트 6개 통과. 격리 Chrome의 console/pageerror 0. 실제 WASD/방향키 이동(각각 약 1.6단위)과 클릭/Space 답사에서 방문 `[fire, dojo, rest]`와 복구를 확인했고, 중앙 계단의 발 높이 `0.95808`은 공유 지면 `0.92308 + 0.035`와 일치했다. 도장 뒤에서 인물이 건물에 가려지는 PNG, 뒤 언덕에서 도장으로 진입하는 `arrival=hill`도 확인했다.

정지 PNG의 SHA256 `fae006e5207715be9dc1233f020ecb51173183faff668a55b81a3c96cdea2e25`가 입력/500ms 대기 전후에 같았다. 정지 리사이즈는 snapshot과 actor 프레임을 보존했다. 390×720 DPR2의 새 페이지에서 화덕 클릭 답사와 정지 리사이즈를 통과했고 `scrollWidth=390`, 실제 canvas width `780`을 확인했다. 390×400 iframe은 조작 7개를 모두 표시하고 부모 입력 focus를 보존했다. 종료 후 renderCount가 증가하지 않았다.

동일한 색/기하의 화덕 벽돌·기와 구역 10,752픽셀을 PNG로 비교했다. normal on/off는 6,671픽셀(채널 평균 차 5.72), 실제 점광원 왼쪽/오른쪽은 10,618픽셀(평균 차 25.39)에 변화가 있었다. 설명/정지 오버레이만 캡처에서 가려 같은 표면을 비교했다. 비교 이미지와 diagnostics JSON은 ignored 리소스 폴더 `public/assets/maplestory/village-style-mixed-dojo/`에 저장했다.
