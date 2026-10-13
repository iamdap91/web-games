# 종이골목 · 팝업북 마을

펼친 책 위에 가옥 그림판을 세운 독립 보행 시안이다. 종이 책장 두께와 중앙 접힘, 책갈피, 얇은 외벽의 테두리, 접힌 색종이 지붕을 첫 화면에서 확인한다. 크림색 바탕에 붉은 찻집·도장, 청록 책방, 노란 바느질집을 두고 녹색 지형 대신 점선 골목과 종이 식생으로 공간을 읽는다.

## 시각 참고와 직접 구현

- [Nintendo 공식 Paper Mario: The Thousand-Year Door 소개](https://www.nintendo.com/en-gb/Games/Nintendo-Switch-games/Paper-Mario-The-Thousand-Year-Door-2445545.html)의 종이 세계 설명과 Rogueport 이미지를 시각 참고했다. 해당 작품의 내부 렌더링 방식은 확인하지 않았으며, 아래 구현은 이 프로젝트의 제안이다.
- `paper-art.ts`가 종이 섬유·잉크선·창·문·간판·지붕·식생을 CanvasTexture로 직접 그린다. 환경에는 외부 게임 그림이나 다운로드 모델을 사용하지 않는다.
- 가옥 정면은 얇은 ExtrudeGeometry, 옆면은 얇은 종이 판, 지붕은 두 장의 접힌 면이다. 흰 가장자리와 받침 탭, 그림자로 종이의 두께와 접힌 구조를 표현한다.
- 간판은 건물 로컬 앞면의 고정 이미지다. 나무·꽃은 흰 테두리가 있는 교차 면이며 alphaTest로 빈 공간이 깊이를 막지 않는다.
- 종이 환경은 빛과 그림자를 받고, 승인된 아타호 이미지 픽셀은 unlit으로 보존한다. 캐릭터는 `TrailSprite`/`SpriteTextures`/`trailMotions`의 기존 프레임 크기와 pivot을 재사용했다. 인물판은 수직을 유지하고 카메라 yaw만 맞춘다. 카메라 pitch에 따른 화면 세로 투영은 scale로 보정하여 원본 비율과 발 접지를 유지한다.
- 본게임 경제·전투·성장·저장은 연결하지 않는다. 새 패키지나 유료 생성 작업을 추가하지 않는다.

## 짧은 답사와 선택

입구 → 차 향 화덕 → 도장 복구 → 지붕 사이 골목 → 뒷장 쉼터 → 동쪽 귀환의 작은 한 바퀴를 걷는다. 화덕에서 서쪽 책방 뒤편의 긴 우회를 골라도 같은 쉼터에 닿는다. 화덕의 종이 불꽃 반응, 도장의 새 붉은 지붕과 등, 숨은 마당 발견 문구, 입구 귀환 반응이 각 보행의 결과다. 긴 성장 루프의 재미를 검증한 것은 아니다.

- 화면의 길 누르기 / 터치: 건물과 화덕을 우회하는 경로 이동. 건물을 누르면 가까운 골목으로 보정한다.
- WASD / 방향키: 화면 기준 직접 보행. 화면을 누른 뒤 키보드를 쓴다.
- Space / 시설 사용: 가까운 화덕·도장·쉼터 사용. 도장 사용은 복구 전후를 바꾼다.
- R / 도장 복구: 도장 복구 전후를 비교한다.
- M / 전체 조망: 책 전체를 보거나 좁은 화면에서 가까이 본다.
- Esc / 멈춤: 이동·불꽃·종이 꽃 흔들림·반응 시간까지 정지한다.
- 입구로: 보행 위치만 되돌리고 복구·방문 기록은 남긴다.

라이브러리 iframe `?embed=1`에서도 4개 주요 버튼과 시설 사용은 남긴다. 설명만 줄이고 남은 높이를 Canvas에 배분한다. 초기 키보드 포커스는 가져오지 않는다.

## 리소스와 검증

환경은 코드로만 작성했고 새 ignored 미디어 파일은 없다. `public/assets/maplestory/tiger-hero-ai/`에 있는 기존 승인된 아타호 그림을 워크트리의 읽기 symlink로 재사용한다. 썸네일은 통합 담당자가 최종 라이브러리의 실제 Canvas를 캡처하여 등록한다.

- `npm run check`, `npm run build`와 `tests/village-style-paper.test.mjs` 핵심 규칙 5개가 통과했다.
- 실제 Chrome에서 포인터 시설 순환, Space 사용, 도장 경사로 접지, 좁은 골목·서쪽 우회·동쪽 귀환, 도장 뒤 가림, 복구 상태 변화를 확인했다.
- 멈춤 시 읽기 snapshot과 반응 시간이 고정되는지 확인했다. iframe 종료 이벤트 `resource-scene-dispose`와 `pagehide`에서 RAF·입력 리스너·GPU를 정리한다.
- 1100/390 CSS 폭 × 620 높이 실제 iframe과 DPR2 터치 에뮬레이션에서 버튼·시설사용·이동·가로 넘침을 검사했다. 실제 휴대전화 검증을 뜻하지 않는다.

읽기 전용 `window.villageStylePaper`는 `ready`, `snapshot`, `paused`, `overview`, `disposed`, `diagnostics`, `screenPositions`, `project(point)`를 제공한다. `screenPositions[].screen`과 `project` 좌표는 Canvas 내부 CSS 픽셀이다. 외부에서 답사 상태를 직접 바꾸는 API는 없다.
