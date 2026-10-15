# 불빛 골목 · 조명 반응 도트

색 그림은 그대로 두고 표면 방향과 빛 위치를 바꾸는 독립 2D 마을 시안이다. 직접 그린 벽돌·기와·문살·돌길의 요철에 달빛, 이동 등불, 화덕이 닿는다. 본게임 경제·전투·성장·저장은 연결하지 않는다.

## 직접 구현한 방법

- `art.ts`: 원색 640×400 Canvas와 같은 좌표의 높이장·발광 mask를 함께 기록한다. 벽돌·기와 등의 가장자리에서 높이를 낮춰 작은 경사를 만든다.
- `normal.ts`: 높이장의 좌우·상하 차를 단위 normal로 변환한다. 화면 아래 방향 y를 GL 위 방향 y로 맞춘다.
- `drawing.ts`: 기존 Three.js의 ShaderMaterial로 세 지도를 같은 UV에서 nearest sampling한다. normal 데이터와 mask는 `NoColorSpace`, 원색과 승인된 아타호만 `SRGBColorSpace`다. 방향 내적과 거리 감쇠로 광원별 확산광을 구한다. 별도 주변 후광 원으로 효과를 대신하지 않는다.
- normal 켜기/끄기는 실제 셰이더가 읽는 방향을 바꾼다. 끄면 모든 픽셀을 정면 normal로 계산한다. 등불 위치는 중앙·왼쪽·오른쪽이며, 위치 버튼을 누르면 이동을 멈추어 같은 조건에서 비교할 수 있다.
- 승인된 `ai/tiger-hero`의 원본 RGBA PNG 36프레임을 다시 그리지 않고 읽는다. 원본 가로세로 비율과 아래 기준 pivot을 unlit plane에 반영한다. 표면 조명으로 인한 배우 색 변화는 추가하지 않는다.
- 작은 격자 경로와 반경 판정은 `LitVisit`이 소유한다. 시설 선택은 화덕 장작 넣기, 도장 복구, 달빛 쉼터 사용이다. 입구로 돌아가도 방문과 복구는 유지한다.

normal은 외곽 형태·실제 깊이·그림자 투영을 바꾸지 않는다. 건물 앞마당의 걸을 수 있는 영역으로 답사 범위를 한정했다. 실제 그림자, 반사, PBR 재질과 본게임 통합은 이 시안 범위에 포함하지 않는다. 외부 게임 media와 신규 유료 서비스·패키지는 사용하지 않았다.

## 출처에서 확인한 사실과 시안의 선택

[Unity 공식 secondary textures 문서](https://docs.unity.com/en-us/engine/7000.0/manual/unity2d/2d-urp/2d-index/secondary-textures)는 normal로 2D 빛에 반응하는 요철을 만들고 mask로 조명 수신 영역을 조절하는 방법을 설명한다. 원색과 지도는 같은 UV 정렬을 사용하고 지도에 sRGB 색 변환을 끄도록 안내한다. 이 기술 원칙을 참고했으며 Unity 엔진이나 문서의 그림을 가져오지 않았다. 이 시안의 빨강 mask 채널은 직접 작성한 발광량으로 사용한다.

[Three.js MeshStandardMaterial 공식 문서](https://threejs.org/docs/pages/MeshStandardMaterial.html)는 normal이 표면 명암에 영향을 주고 외곽 형태를 바꾸지 않는다고 설명한다. 이 시안은 MeshStandardMaterial의 PBR 파이프라인 대신 간단한 전용 2D 방향 조명 셰이더를 사용한다. 원본 배우 출처와 프레임 정보는 저장소의 `resources/manifest.json`에 보존된다.

## 조작과 진단

- WASD / 방향키 또는 열린 돌길 클릭·터치로 걷는다. Space / 시설 버튼으로 가까운 곳을 사용한다.
- 도장 복구, 전체 조망/가까이 걷기, 멈춤, 입구로 버튼은 독립 화면과 `?embed=1` 모두 유지한다.
- 요철 조명, 등불 위치, 등불 움직임 버튼으로 조명 반응을 비교한다.
- 멈춤은 보행·시설 입력·광원 이동·화덕 시간·배우 프레임을 고정한다. RAF는 UI 표시에만 남고 픽셀은 변하지 않는다.
- `window.villageStyleLit2d`: 읽기 전용 `ready`, `snapshot`, `paused`, `overview`, `disposed`, `diagnostics`, `screenPositions`, `project({x,z})`다. `project`는 캔버스 CSS 좌표를 반환한다. 조망 변경 후 다음 렌더 프레임에서 새 투영을 읽는다.
- 시설의 걸을 수 있는 접근점은 화덕 `(-7,4.7)`, 도장 `(1,-3.8)`, 쉼터 `(8,6.5)`다. 입구는 `(0,10)`이다.
- `resource-scene-dispose` 또는 `pagehide`에서 RAF, 입력 이벤트, ResizeObserver, 지도·배우 texture, material, geometry, renderer와 WebGL context를 정리한다. 최초 로딩 때 입력 focus를 가져오지 않는다.

## 검증 기록

2026-10-13 전용 워크트리에서 `npm run check`, `npm run build`와 로직 검사 7개를 통과했다. normal 단위 길이·방향, 광원 반전 시 모서리 명암 반전, 지도 크기·RGBA, 원본 아래 기준 pivot, 충돌·경로·시설 반응·시간·대각선 속도를 검사했다.

설치된 실제 Chrome과 Playwright로 DPR 2의 1100×620 및 390×620 iframe을 실행했다. 직접 방향키 보행, 클릭 경로로 세 시설 방문과 Space 사용, 화덕 시간 감소, 도장 복구, 입구 복귀, normal on/off, 좌우 광원과 조망 전환을 확인했다. 멈춤 전후 캔버스 PNG가 바이트 단위로 동일하고 정지 중 입력과 snapshot도 변하지 않았다. normal/광원 비교 버튼이 좁은 화면에서도 유지되고 수평 overflow·입구 배우 버튼 가림·브라우저 오류가 없었다. dispose 후 렌더 프레임 증가가 멈췄다.

실제 캡처는 `/private/tmp/lit2d-normal-on.png`, `/private/tmp/lit2d-normal-off.png`, `/private/tmp/lit2d-right.png`, `/private/tmp/lit2d-final.png`, `/private/tmp/lit2d-pc.png`, `/private/tmp/lit2d-narrow.png`에서 검토했다. 라이브러리 최종 썸네일과 통합 검증은 담당 루트가 저장한다. 390px 검사는 브라우저 viewport 검사이며 실제 휴대전화 검사가 아니다.
