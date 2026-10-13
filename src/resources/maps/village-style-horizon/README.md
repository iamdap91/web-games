# 둥근 길 · 곡선 지평선

걷는 만큼 다음 집과 길이 지평선 위로 나타나는 독립 마을 시안이다. 입구에서 차 향 화덕을 사용하고, 지평 도장을 복구한 뒤 먼 노란 꽃밭 쉼터를 찾아 귀환한다. 초기 가까운 시점에서는 쉼터의 바닥이 지면 뒤에 가려져 있다. 전체 조망은 위에서 굽은 지형과 전체 길을 확인하는 비교 시점이다.

## 참고에서 확인한 내용과 이 시안의 선택

- 시각 참고: [Nintendo 공식 Animal Crossing: New Horizons 소개](https://www.nintendo.com/en-gb/Games/Nintendo-Switch-games/Animal-Crossing-New-Horizons-1438623.html)의 낮은 시점, 부드러운 마을 형태, 길을 따라 이어지는 풍경. 공식 페이지는 원작의 곡면 변환 수식을 설명하지 않는다. 이 시안의 반경·변형 방법·클릭 계산은 직접 결정한 구현이다.
- 기술 참고: [Three.js Object3D](https://threejs.org/docs/pages/Object3D.html)의 로컬/월드 변환과 [ShaderMaterial](https://threejs.org/docs/pages/ShaderMaterial.html)의 정점 처리. 이 시안은 custom shader를 쓰지 않고 CPU에서 실제 BufferGeometry 정점을 갱신한다. 따라서 native 깊이 검사, 광원과 그림자 패스가 같은 변형된 정점을 사용한다.
- 환경 그림은 `art.ts`의 CanvasTexture로 직접 그린 잔디·벽·기와·간판·투명 식생이다. 외부 게임 그림이나 3D 모델을 복사하지 않았다. 별도 유료 서비스·패키지도 사용하지 않았다.
- 캐릭터는 기존 승인 리소스 `ai/tiger-hero`의 stand/move 방향별 프레임을 재사용한다. 원본 RGBA와 프레임 width/height/pivot을 유지하고 `TrailSprite`/`SpriteTextures`로 읽는다. 발을 곡면 표시 좌표에 놓으며, 면은 pitch 없이 수직이고 카메라 pitch의 투영 비율만 Y scale로 보정한다.

## 표시와 보행의 연결

`curve.ts`에서 평면 `(x, z)`를 반경 18의 원통으로 옮긴다. 곡면 중심은 보행 중 플레이어의 z에서 2만큼 앞선 위치를 따라간다. 집·고정 간판·식생·바닥·해안선·그림자를 같은 변환으로 대응시킨다. 큰 지붕 면은 깊이 방향으로 10등분하여 벽과 지붕 이음새를 유지한다. 캐릭터의 발과 그림자, 불과 연기도 같은 위치 변환을 따른다.

충돌과 경로 계산은 `HorizonVisit`과 `layout.ts`의 평면에서만 진행한다. 클릭은 카메라 광선과 원통의 가까운 교점만 선택하고 atan2로 원래 보행 z를 되돌린다. 지평선 뒤 지면의 투영 위치를 누르면 앞쪽 바닥이 선택되므로, 보이지 않는 시설을 직접 클릭하는 대신 걸어서 드러내거나 전체 조망을 사용한다. 건물/화덕 클릭은 가장 가까운 보행 가능한 격자에 대응하며 건물 안을 관통하지 않는다.

## 조작과 답사

- 화면 길 누르기 / 터치, WASD / 방향키: 보행. Canvas를 눌러야 키 입력을 받으며 초기 focus를 가져가지 않는다.
- Space / 시설 사용: 가까운 화덕·도장·쉼터 사용. 화덕은 12초 동안 불·연기가 반응한다. 도장에는 판자 대신 문과 등불이 생긴다.
- C / 곡선: 같은 위치·카메라에서 곡면과 평면 비교.
- M / 전체 조망: 전체 길과 굽은 지형 확인 / 카메라가 플레이어를 따라 걷는 시점.
- R / 도장 복구: 복구 전후 비교.
- Esc / 멈춤: 이동·시설 입력·시간·효과를 정지한다. 입구로는 복구와 방문 기록을 보존한다.
- 시설 보행 좌표: 화덕 `(-3, 8.6)`, 도장 `(-2.1, -5.4)`, 쉼터 `(3.8, -21.3)`, 입구 `(0, 11)`.

`?embed=1`에서는 소개 설명만 숨기고 비교/복구/조망/정지/귀환/시설 버튼은 유지한다. `resource-scene-dispose` 및 pagehide에서 입력 이벤트·RAF·geometry·material·texture·renderer를 정리한다.

## 읽기 전용 관측 API

`window.villageStyleHorizon` getter: ready, snapshot, paused, overview, curved, disposed, screenPositions, project(point), diagnostics. 외부 게임 상태 변경 함수는 제공하지 않는다. project의 x/y는 Canvas CSS 좌표다. screenPositions의 world는 실제 보행 좌표이며 visible은 지면 앞면이 카메라에 보이는지 표시한다.

diagnostics는 radius/centerZ/curved/camera/actorFoot/actorPitch, 원본 sourceFrame 크기·pivot·경로, playerGround/playerBentGround/playerFootProjection/playerProjectionInverse, DPR backing-store 크기를 제공한다. actorFoot은 지면에서 법선 방향 0.035의 작은 간격을 둔다.

## 검증

- `npm run check`, `npm run build`와 전용 Node 테스트 4개 통과: 곡면/평면 변환과 역변환, 법선 및 발 높이 관계, 건물·화덕 충돌 경로, 세 시설 답사와 귀환, 반응 시간·초기화, 정규화 이동과 잘못된 입력 제한.
- 설치된 실제 Chrome + Playwright에서 1100×620/DPR2와 390×620/DPR2의 embed 화면 확인. 실제 키 입력 보행, 곡면/평면 숨김 차이, 카메라 z 추적, 원통 역투영 클릭으로 세 시설 도착 및 Space 반응, 쉼터 발견, 입구 귀환, pause 동안 snapshot 동결, 버튼 보존·가로 overflow 없음, dispose 이후 RAF 정지, browser 오류 0을 확인했다.
- 스크린샷은 곡면/평면 초기 시점, 복구 도장 가까운 시점, 발견한 쉼터, 좁은 조망을 각각 확인했다. 390px 검증은 브라우저 크기 조절이며 실제 휴대전화 검증은 아니다.

본게임 원정·경제·전투·성장·저장을 연결하지 않은 독립 표현/답사 실험이다. 원통 한 축을 쓰므로 지평선은 좌우로는 수평이고 앞뒤 길이 굽는다. 큰 맵이나 대규모 오브젝트용 성능 최적화는 이 시안의 범위에 포함하지 않는다.
