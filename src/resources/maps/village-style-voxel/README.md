# 네모골 마을 · 복셀풍 모형 시안

리소스 라이브러리 ID: `local/village-style-voxel`. 독립 화면은 이 폴더의 `index.html`, 라이브러리 임베드는 `?embed=1`을 사용한다. 기존 아타호와 자체 작성한 3D 메시·32×16 도트 간판만 사용하며 본게임의 저장·경제·전투와 연결하지 않는다.

## 비교 목적

다른 시안의 둥근 자연 지형·그림 배경·픽셀 무늬 건축과 비교해 **각진 덩어리와 모형의 두께**가 마을의 개성과 시설 성장에 어울리는지 확인한다. 입구 → 화덕 작업마당 → 돌계단 도장 → 수로 끝 쉼터 → 입구의 순환을 짧게 걸어볼 수 있다. 도장으로 곧장 가거나 두 다리와 동쪽 계단을 거쳐 돌아올 수 있다.

## 제작 방식

실제 볼륨 복셀 데이터를 편집하는 엔진은 아니다. 0.45 월드 단위의 기와·수관·벽돌·돌 단위를 Three.js BoxGeometry로 조합했다. 같은 재질의 정적 조각은 InstancedMesh로 묶고, 물레방아·화덕 불꽃·굴뚝 연기·깃발만 개별 메시를 움직인다. 약29도 비스듬한 고정 정투영 카메라와 선명한 렌더 해상도로 단상 옆면·나무 층·수로 단면을 보여준다.

도장과 공방의 간판은 32×16 CanvasTexture를 생성해 건물의 자식인 고정 PlaneGeometry에 붙인다. 간판은 벽 앞 0.03~0.1단위에 두고 원본 픽셀은 NearestFilter로 확대한다. 3D 벽과 같은 Lambert 조명을 받아 밝기와 깊이 가림이 함께 작동한다. 바람에 카메라를 따라 도는 billboard 간판이나 별도의 전역 후처리 셰이더를 추가하지 않았다.

승인 `ai/tiger-hero`의 TrailSprite·SpriteTextures를 재사용한다. 프레임 width/height/pivot과 원본 RGBA는 그대로 유지하고 인물판은 수직으로 세운다. 카메라 yaw만 맞춘 뒤 화면의 세로 투영 비율을 보정한다. 도장 단상·계단·다리의 높이는 같은 groundHeight 함수를 입력 역투영·인물 발·이동 판정에서 사용한다. 화면 방향키는 카메라의 오른쪽·앞쪽 기준으로 월드 좌표에 변환한다.

## 상태와 입력

- WASD / 방향키: 화면 방향 기준 보행. 건물·나무 줄기·작업대·화덕·돌담·난간·단상 옆면을 통과하지 않는다.
- 클릭 / 터치: 0.25단위 이동 격자로 시설·지형을 우회한다. 시설 안을 누르면 근처 접근 가능한 지점으로 향한다.
- Space / 시설 사용: 가까운 화덕·도장·쉼터 반응. 화덕은 불꽃·굴뚝 연기·주변 조명이 12초간 반응한다.
- R / 도장 복구: 빈 기와 패치가 채워지고 용마루·목인·깃발·등불이 생긴다. 새 목인과 등불의 충돌도 반영한다.
- M / 전체 조망: 마을의 순환과 두 다리를 확인한다.
- Esc / 멈춤: 입력과 모든 시안 애니메이션·반응 시간이 정지한다.
- 입구로: 방문·복구 비교 상태를 보존하면서 위치를 입구로 돌린다.

`window.villageStyleVoxel`는 ready / snapshot / overview / paused / disposed / diagnostics / project / screenPositions를 읽기 전용 진단 조회로 제공한다. library `resource-scene-dispose`와 pagehide에서 입력·RAF·GPU 수명을 정리한다. 임베드 초기 로딩은 canvas 포커스를 가져가지 않는다. 작은 화면에서도 조망·복구·정지·입구 버튼은 남는다.

## 참고 자료

- [The Touryst Deluxe 공식 스크린샷](https://thetouryst.shinen.com/deluxe/): 각진 나무·건물의 실루엣과 작은 입체 마을을 시각적으로 참고했다. 공식 사이트를 그 게임의 내부 구현 방식에 대한 증거로 사용하지 않는다.
- [Cloud Gardens 제작자 페이지](https://noio.itch.io/cloud-gardens): 작은 디오라마 안에 구조물·식생·생활 흔적을 응축하는 공간 구성을 참고했다.
- [Three.js Billboards](https://threejs.org/manual/pages/billboards.html): 캐릭터 판과 벽 고정 판의 역할을 구분했다.
- [Three.js Transparency](https://threejs.org/manual/pages/transparency.html): 인물의 투명 여백을 alphaTest로 깊이 가림에서 제외했다.
- [Three.js Textures](https://threejs.org/manual/pages/textures.html): 작은 도트 간판 확대 필터를 선택했다.

외부 이미지·게임 모델 다운로드, 새 유료 생성, 아타호 재생성은 하지 않았다. 간판 패턴은 이 시안에서 만든 도트 장식이며 외부 서체나 상표를 쓰지 않는다.

## 검증과 범위

`npm run check`, `npm run build`로 타입·린트·형식과 빌드 상태를 확인한다. 실제 Chrome 1366×768에서 방향키·화덕·계단 높이 1.1·클릭 우회·복구·두 다리·쉼터 발견·입구 순환·정지를 확인했다. 390 CSS×844 / DPR2 / touch 및 `?embed=1`에서 포커스·조작 버튼·터치 이동·dispose 뒤 RAF 정지를 확인했다. 이는 CSS·브라우저 에뮬레이션이며 실제 휴대폰 검증은 아니다.

복구 후 실루엣과 시설 반응을 비교하기 위한 작은 시안이다. 물에는 들어갈 수 없고, 건물 내부 입장·카메라 회전·복셀 편집·NPC 시뮬레이션은 포함하지 않는다.
