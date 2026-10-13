# 계단 위 불빛 · HD-2D 마을

리소스 라이브러리 ID: `local/village-style-hd2d`.

아래 골목의 공동 화덕에서 중앙 계단을 올라 언덕 도장에 닿고, 건물 뒤편 골목과 동쪽 경사로를 통해 강변 쉼터·다리로 돌아오는 독립 스타일 시안이다. 위쪽의 목적지와 계단이 같은 화면에 보이도록 제한된 정면 사선 카메라를 사용한다.

## 실행과 조작

- 저장소 루트에서 `npm run build`, `python3 scripts/dev-server.py 8197 --bind 127.0.0.1`.
- `/src/resources/maps/village-style-hd2d/`를 연다. 라이브러리 삽입은 `?embed=1`.
- 방향키/WASD: 직접 보행. 길 누르기/터치: 건물과 절벽을 우회해 이동.
- Space/시설 사용: 가까운 화덕·도장·쉼터 사용.
- R/도장 복구: 도장 복구 전후 전환. M/전체 조망: 화면 범위 전환.
- Esc/멈춤: 일시정지. 입구로: 보행 위치·방문 표시 초기화.

## 표현과 제작 기록

- 외부 모델·새 AI 생성·새 패키지·유료 작업 없이 제작했다. 옥토패스의 이미지나 맵을 복제하지 않는다.
- `pixel-art.ts`에 직접 작성한 128px 벽면·기와·석재·바닥·간판과 96px 식생의 사각 픽셀 무늬가 있다. 고정 seed의 무늬만 쓰므로 실행마다 재현된다.
- 기단·옹벽·지붕 경사·계단·다리·노점·항아리는 Three.js 지오메트리. 건축 표면은 UV 픽셀 그림과 조명을 받는 `MeshStandardMaterial`로 묶는다.
- 창문·문·목조 골격은 facade 그림에 포함된다. 간판은 건물의 로컬 좌표에 고정한 작은 평면이다. `polygonOffset`과 작은 면 간격으로 벽과의 겹침을 피한다. 간판을 카메라 방향으로 회전하지 않는다.
- 식생은 실제 입체 줄기와 서로 다른 각도의 고정 cutout 면 3장으로 구성한다. `alphaTest`와 불투명 depth 기록을 사용한다. 연기는 별도 부드러운 투명 카메라 지향 면이다.
- 확대는 nearest, 건축·지면 축소는 nearest mipmap을 사용한다. 전체 화면은 최대 가로 960px로 그린 뒤 CSS 픽셀 확대한다. 심도 흐림은 사용하지 않는다.
- 아타호는 기존 승인 리소스 `ai/tiger-hero`, manifest의 `stand`, `stand-back`, `stand-left`, `stand-right`, `move`, `move-back`, `move-left`, `move-right` 프레임을 변경 없이 재사용한다. 좌우 대기는 승인된 `exact-side/20261011/stand-left-04.png`, `stand-right-04.png`를 manifest가 지정한다. 캐릭터는 기존 `TrailSprite`/`SpriteTextures`로 원본 프레임의 폭·높이·발 피벗을 유지하고 30px/세계 단위로 배치한다. 수직 면의 세로 투영을 카메라의 높이/깊이 비율로 보정해 화면에서 원본 픽셀 비율을 유지하며, 발바닥을 실제 지면 높이에 연결하고 3D 건물에 가려진다.
- 도장 복구 전에는 지붕의 빈 부분·덧댐·깨진 기와·막힌 문·꺼진 등을, 복구 후에는 완성된 기와·문 앞 천·등불을 표시한다. 화덕은 사용 후 6초 동안 불꽃 크기·빛·연기가 강해진다.
- `visit.ts`가 보행·높이·충돌·경로·시설 상태를 소유한다. 계단과 경사로의 높이 정의는 렌더링과 공유한다. `index.ts`가 입력·RAF·ResizeObserver·이벤트 수명을, `scene.ts`가 GPU 자원을 정리한다.
- `window.villageStyleHd2d`는 확인용 getter이며 `ready`, 복사된 `snapshot`, `paused`, `overview`, `disposed`, 원본 비율/발 접지 확인용 `sprite`, 시설의 `screenPositions`를 제공한다. 상태를 바꾸는 기능은 제공하지 않는다.

## 참고 자료와 실제 적용

- [Octopath Traveler II 개발자 인터뷰](https://www.unrealengine.com/developer-interviews/octopath-traveler-ii-builds-a-bigger-bolder-world-in-its-stunning-hd-2d-style?lang=ko-kr): 2D 캐릭터와 3D 배경을 맞추는 난점, 고정 카메라 한 화면에서 목적지를 보이게 하는 공간 구성. 아래 마당·중앙 계단·위쪽 도장의 전중후경으로 적용했다.
- [Three.js Billboards](https://threejs.org/manual/pages/billboards.html): 카메라를 향하는 이미지 면과 고정된 면의 용도 구분. 간판·건축 장식은 고정 면으로 두고 연기만 카메라 지향 면으로 삼았다.
- [Three.js Textures](https://threejs.org/manual/pages/textures.html): UV와 필터·mipmap. 건축 텍스처에 nearest 확대와 mipmap 축소를 사용했다.
- [Three.js Transparency](https://threejs.org/manual/pages/transparency.html): 겹치는 투명 면의 깊이 문제. 식생은 alphaTest cutout으로 처리했다.
- [MeshBasicMaterial](https://threejs.org/docs/pages/MeshBasicMaterial.html): 조명 영향을 받지 않는 재질. 캐릭터·불꽃은 색을 유지하고 건축·장식은 조명을 받는 재질로 구분했다.

## 실제 검증

2026-10-13, 전용 워크트리와 `8197` 서버에서 검증했다.

- `npm run check`, `npm run build`, `node --test tests/village-style-hd2d.test.mjs`: 통과. 핵심 규칙 테스트 3개는 계단 실제 높이·옹벽 차단·강과 다리·건물과 화덕 충돌·계단/경사로 경로·시설 상태를 확인한다.
- 설치된 Google Chrome와 Playwright로 1366×768에서 화면을 실제 렌더링하고 입력했다. 화덕 → 도장 → 강변 쉼터를 길 누르기로 방문하고 Space 사용, 화덕 불꽃 진행, 도장 높이 2.8, 복구 전후, 직접 키보드 계단 상승과 도장 벽 충돌을 확인했다. 원본 정면 45×63px의 세계 크기 1.5×2.1과 카메라 세로 보정 1.2080909763, 걷는 중 발 높이=지면+0.035를 검사했다. 도장 뒤 골목(-0.0003, -10.35, 높이 2.8)에서 실제 건물 가림 화면도 확인했다.
- Esc 정지 중 보행 불변, M 조망, 입구로 초기화, `?embed=1`의 `resource-scene-dispose` 후 `ready=false`, `disposed=true`와 embedded 초기 자동 canvas focus가 없는 것을 확인했다. console/pageerror 0.
- Chrome 390×844, DPR 2, touch emulation에서 실제 tap 경로 이동·화덕 사용·복구 버튼과 화면 배치를 확인했다. 실제 휴대폰 검증은 아니다.
- 실제 화면 캡처: `/private/tmp/hd2d-initial.png`, `hd2d-fire.png`, `hd2d-restored.png`, `hd2d-stairs.png`, `hd2d-rest.png`, `hd2d-overview.png`, `hd2d-mobile.png`, `hd2d-mobile-fire.png`, `hd2d-behind.png`, `hd2d-walking.png`.

## 한계와 다음 판단

카메라 회전과 내부 방은 범위 밖이다. 잎 면과 간판은 주시점에 맞췄으므로 큰 카메라 회전에 그대로 재사용하려면 추가 각도 검증이 필요하다. 건물 뒤에서는 캐릭터가 실제로 가려지며 자동 건물 투명화는 없다. 화덕의 연기·반짝이는 물은 표현 시안이며 유체 시뮬레이션이나 실제 반사 렌더링은 아니다. 노점 NPC·이야기·경제·전투·저장·마을 성장 규칙은 연결하지 않는다.

복구 전후와 동선을 통해 스타일 차이를 직접 비교하는 데 목적이 있다. 장기 플레이의 재미나 본게임 스타일 채택을 확정한 결과는 아니다.
