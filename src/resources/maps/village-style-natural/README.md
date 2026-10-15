# 산들 마을 — 자연 3D 도트 시안

리소스 ID: `local/village-style-natural`. 본게임과 연결하지 않는 독립 보행 시안이다.

## 제작과 비교 의도

A Short Hike의 [공식 소개](https://ashorthike.com/)와 [제작자 설명](https://blog.playstation.com/2021/08/05/crafting-a-tiny-open-world-a-look-behind-the-scenes-at-the-creation-of-a-short-hike/)을 참고했다. 제작자는 읽기 쉬운 낮은 해상도의 3D 공간, 통일된 명암과 안티앨리어싱 제거, 샛길의 호기심 보상을 설명한다. 원작 이미지·모델은 가져오지 않았다.

큰 지형과 나무 수관은 제한된 팔레트의 3D 형태로 만들고, 작은 풀은 16×20 런타임 도트 텍스처를 교차하는 고정 카드에 붙였다. `alphaTest`로 잘라내고 깊이를 기록하며, 카드 전체를 카메라에 회전시키지 않는다. 멀리서 풀 무늬가 심하게 반짝이지 않도록 축소에는 mipmap을 사용한다. [Three.js 투명성](https://threejs.org/manual/pages/transparency.html), [텍스처](https://threejs.org/manual/pages/textures.html), [Billboards](https://threejs.org/manual/pages/billboards.html) 설명을 함께 참고했다.

승인된 `ai/tiger-hero`의 대기·보행 프레임을 재사용했다. 캐릭터 판을 카메라 pitch만큼 기울였을 때 머리가 뒤쪽 도장 앞마루에 교차하는 문제가 실제 보행 중 확인됐다. 최종판은 인물판을 수직으로 유지하고 카메라 각도에 따른 세로 투영 배율만 보정한다. 인물이 건물 뒤에서는 깊이 검사로 가려진다.

개울과 언덕에 같은 높이 함수를 적용해 보행 위치와 발 높이를 일치시킨다. 화덕 마당 → 언덕 도장 → 개울 다리 → 물소리 쉼터 → 북쪽 다리 → 귀환의 작은 순환을 구성했다. 화덕 사용은 불꽃·빛·연기를 12초간 활성화하고, 쉼터 접근은 발견 문구를 보여준다. 도장 복구는 지붕·등불·깃발과 앞마당의 변화를 비교한다.

## 실행과 입력

프로젝트 루트에서 `npm run build` 후 기존 개발 서버로 `src/resources/maps/village-style-natural/`을 연다.

- WASD / 방향키: 보행
- 화면 클릭 / 터치: 지정 지점으로 직선 보행. 막힌 물·건물·나무를 자동으로 우회하지 않는다.
- Space / 시설 사용 버튼: 근처 장소 확인 및 화덕 반응
- R / 도장 복구 버튼: 복구 전후
- M / 전체 조망 버튼: 전체 지도
- Esc / 멈춤 버튼: 일시정지
- 입구로 버튼: 입구 귀환, 복구·방문 기록은 뷰어 안에서 유지

`?embed=1`과 `registerEmbeddedScene`을 지원한다. `pagehide` 또는 `resource-scene-dispose`에서 RAF·입력 리스너·GPU 리소스와 WebGL 컨텍스트를 정리한다. `window.villageStyleNatural`은 조회 전용으로 로딩·스냅샷·정지·조망·종료 상태와 렌더 횟수, 발 높이, 좌표 투영을 확인한다.

## 검증과 한계

- 프로젝트 `npm run check`, `npm run build` 확인.
- 당시 로직 검사: 경계·물·건물·화덕·나무 충돌, 두 다리 통과, 대각선 속도, 잘못된 입력, 큰 delta 제한, 언덕 높이, 화덕 근접 발동, 전체 순환과 쉼터 발견.
- 설치 Chrome/Playwright 실제 키보드·포인터로 화덕·복구·충돌·언덕·순환·일시정지·조망·임베드 종료 검증.
- 1366×768 PC와 390×844 CSS viewport를 확인한다. 실제 모바일 기기 검증은 아니다.
- 그림의 밀도와 입체감 비교용이다. 음향·NPC·본게임 보상·저장·경제는 포함하지 않는다.
- 물가의 작은 돌·표지판·작은 풀은 장식이며 모든 장식에 개별 충돌을 부여하지 않았다. 카메라는 회전하지 않는다.
