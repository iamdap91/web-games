# 오래된 나루 · 표시 박자 기능 전이

A `village-style-retro`의 픽셀 재질 돌벽·목재 건축, 시장/수로/계단/다리와 승인된 아타호를 유지한다. B `village-style-stopmotion`의 **모형 표시 시간 양자화와 입력 시간 분리**를 간판·차양·공방의 작업 바퀴에 옮긴 독립 시안이다.

## 새 동작

간판은 좌우로 흔들리고 차양은 바람에 기울며 작업 바퀴는 돌아간다. 기본은 표시 시간 `floor(seconds × 12) / 12`로 세 동작만 12fps 박자에 맞춘다. C/비교 버튼으로 같은 장치를 연속 표시로 바꿔 리듬과 부드러움을 비교한다. 아타호의 위치 계산과 sprite 애니메이션, 클릭 경로, 화덕 반응·수면은 연속 시간축을 쓴다. 화면 전체의 RAF를 낮추지 않으므로 저박자 표시 동안에도 입력과 보행은 즉시 반응한다.

일시정지는 모형 시간·입력·화덕·수면을 함께 멈춘다. 초기 상태를 바꾸는 대신 비교 모드를 바로 확인할 수 있으며, 재입구는 기존 방문과 복구 상태를 보존한다. 본게임 저장·경제에 연결하지 않는다.

## 조작·검증 좌표

WASD/방향키·길 클릭으로 이동, Space 근처 사용, R 도장복구, C 12fps/연속 비교, M 조망, Esc 정지, 입구로 복귀. embed=1에서도 C 버튼을 사용할 수 있다.

월드 `{x,z}`: 입구 `{0,9.5}`, 화덕 `{-4.75,1.25}`, 도장 `{1.25,-5.75}`, 쉼터 `{10.25,-6.75}`. 읽기 전용 `window.villageStyleRetroCadence.project(point)`, `screenPositions`, `ready/snapshot/paused/disposed/diagnostics`를 제공한다. `snapshot.stepped/elapsed`, 진단 `modelCadence.time/frame/stepped`, `signAngles/awningAngles/workWheelAngle/continuousTime`으로 표시와 보행 시간축을 비교한다.

## 책임·검증

`RetroVisit`은 연속 보행/입력/시설과 비교 모드, `ModelCadence`는 표시 시간, `RetroScenery`는 시간에 따른 실제 간판·차양·바퀴 mesh 변환을 소유한다.

`tests/village-style-retro-cadence.test.mjs`에서 같은 12fps 프레임 안의 매 입력 이동, 연속 시간 비교, delta0 정지를 검사한다. Chrome 실제키보드 이동·간판/차양/바퀴 진행·비교 모드·일시정지·모바일 resize·dispose를 확인했고 페이지 오류가 없었다. 타입 빌드·담당 ESLint를 통과했다.

## 라이브러리 통합 검토 · 2026-10-13

표시 프레임과 연속 시간을 비교하고 A키 보행·연속 표시 전환을 확인했다. 간판·차양·바퀴의 표시 박자가 실제로 바뀌었다.

맵·마을에서 “기능 전이”로 검색한 9개 항목과 원래 맵·기능 출처 연결을 확인했다. 상세 안의 실제 키보드 보행 및 항목 전환 후 이전 뷰어의 disposed=true를 확인했다. 대표 PNG의 크기·SHA256은 resources/manifest.json에 기록한다. 좁은 화면 검증은 데스크톱 브라우저 뷰포트·DPR 에뮬레이션이다.
