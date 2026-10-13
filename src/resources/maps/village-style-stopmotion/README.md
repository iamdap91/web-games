# 손끝 골목 · 스톱모션 모형

두꺼운 골판지 작업판에 손칠한 건물을 맞춰 세운 작은 마을 시안이다. 작은 화덕을 쓰고, 어긋난 도장 지붕을 복구하고, 비틀린 뒷골목의 판지 벤치를 발견한 뒤 입구로 돌아온다. 지붕 사이 중앙 골목과 서쪽 긴 우회로를 선택할 수 있으며 동쪽 길로 돌아오면 방문 세 곳과 귀환에 반응한다.

## 출처와 실제 방법

2026-10-13 확인한 [Amanita Design의 Phonopolis 공식 Steam 소개](https://store.steampowered.com/app/1206070/Phonopolis/)는 실제 판지에 손칠한 건물·인물·연기·불꽃 조각을 디지털화해 3D 세계에 쓰며 전통 12FPS 애니메이션을 적용한다고 설명한다. 이것이 이 시안의 판지 재료감과 움직임 박자에 대한 시각 참고다.

이 시안은 물리 모형을 촬영·스캔한 결과물이 아니다. `model-art.ts`의 Canvas2D 붓 결·판지 단면·알파 조각과 `scene.ts`의 비대칭 BoxGeometry·두꺼운 지붕·건물 로컬 장식을 직접 작성했다. `cadence.ts`가 표시 시간을 1/12초 단위로 고정하고 간판·불꽃·연기·시설 표시·식생의 실제 포즈를 그 경계에서만 바꾼다. 원작의 엔진과 제작 파이프라인을 재현했다고 주장하지 않는다. 외부 게임 미디어, 유료 이미지 생성, 새 패키지는 사용하지 않았다.

종이 팝업북 시안과는 책의 접힘 대신 모형 건물과 지붕의 두께·노출된 골판지·벗겨진 손칠이 다르다. 둥근 플라스틱 장난감 시안과는 거친 재료·불균일 모서리가 다르며, 고정 배경 캐시 방식과는 3D 모형의 실제 포즈가 12FPS로 계속 움직이는 점이 다르다.

아타호는 기존 `ai/tiger-hero`의 승인된 원본 RGBA와 보행·대기 프레임만 재사용한다. `TrailSprite`와 `SpriteTextures`의 프레임 재생을 쓰며 이미지 재생성·색상 필터는 없다. 원본 폭·높이에 같은 pixelsPerUnit을 적용하고 하단 pivot을 유지한다. 인물판은 수직 yaw 회전만 하며 카메라 pitch로 줄어드는 투영 높이만 보정한다. 알파 장식은 alphaTest와 깊이 쓰기를 함께 사용하고 벽의 문·창문·간판은 건물 로컬 좌표에 둔다.

## 조작

- 길 클릭·터치: 건물을 우회해 걷기. WASD·방향키: 연속 보행. 캔버스를 누른 뒤 키보드 입력을 받는다.
- Space / 시설 사용: 가까운 화덕·도장·쉼터 반응.
- R / 도장 복구: 복구 전후 비교. M / 전체 조망: 전체 작업판 보기.
- 모형 박자: 12FPS 장식 표시와 연속 장식 표시 비교. 두 모드 모두 보행·입력·충돌은 연속이다.
- Esc / 멈춤: 입력과 보행·반응 시간·스프라이트·장식 표시 시간을 모두 멈춘다. 정지 후 창 크기가 바뀌면 마지막 표시 포즈를 유지한 채 새 크기로 한 번 다시 투영한다. 입구로: 복구와 방문 기록을 남겨 입구로 돌아간다.
- `?embed=1`: 설명만 숨기고 모든 비교·조작 버튼을 유지한다.

## 책임과 확인용 API

`StopmotionVisit`가 위치·클릭 경로·시설 반응·방문·귀환을 소유한다. `ModelCadence`가 표시 시간만 소유하며 `StopmotionScene`가 렌더링과 GPU 자원을 정리한다. `StopmotionScreen`은 입력과 화면 수명을 연결한다. `resource-scene-dispose`와 `pagehide`에서 RAF·이벤트·텍스처·geometry·material·renderer를 정리하며 최초 로딩 때 focus를 가져오지 않는다.

`window.villageStyleStopmotion`은 조회용이다. `ready`, `snapshot(position{x,z,y,facing,moving},nearby,visited,restored,fireSeconds,elapsed,shelterDiscovered,loopComplete,routeRemaining,notice)`, `paused`, `overview`, `disposed`, Canvas CSS 좌표의 `project({x,z})`, 걸어서 접근 가능한 `screenPositions`를 제공한다. `diagnostics`는 표시 frame/time/cadence/실제 pose와 별도의 simulationTime, 원본 인물판 크기·pitch 보정·backing pixel 크기를 제공한다. 상태를 직접 조작하는 함수는 공개하지 않는다.

시설 접근 좌표는 화덕 `(-4.2,3.5)`, 도장 `(1,-3.45)`, 뒷골목 `(7.5,-6.4)`, 입구 `(0,9.45)`다. 좌표는 `(x,z)`이며 시설 중심이 아니라 충돌 밖 접근 지점이다.

## 검증 기록

- `npm run check`, `npm run build`, `node --test tests/village-style-stopmotion.test.mjs`: 통과. 의미 있는 로직 테스트 7개로 경로·시설 한 바퀴·우회·반경 충돌·대각선 속도·잘못된 시간·12FPS 경계 유지와 그 사이 보행 연속성을 검증했다.
- 설치된 Playwright와 실제 `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`을 격리 실행했다. 1100×620 / DPR2에서 실제 표시 포즈 증가, 같은 displayFrame의 포즈 유지, simulationTime 증가, 실제 키보드 보행과 화덕→도장→쉼터→동쪽 귀환을 검증했다.
- 12FPS/연속 비교 버튼에서 같은 표시 frame 내부의 포즈 변화 차이를 확인했다. 일시정지 후 snapshot·diagnostics와 두 PNG가 동일함을 확인했다. 정지 상태에서 1100→390 너비로 바꿔 backing 크기·aspect를 갱신하면서 위치·시간·표시 포즈가 고정됨도 확인했다.
- 390×620 / DPR2의 embed 화면에서 여섯 버튼, 연속 보행, 전체 조망, 시설 세 곳과 귀환 한 바퀴, canvas backing width 780을 확인했다. 실제 휴대전화 기기 검증은 아니다.
- embed 수명 종료 후 disposed·ready 변경, RAF 정지, GPU context loss와 입력 이벤트 제거를 확인했다. 페이지·콘솔 오류 0.

본게임의 저장·전투·경제·성장에는 연결하지 않는다. 생성물은 모두 소유 디렉터리 안의 코드이며 추가 다운로드 파일은 없다.
