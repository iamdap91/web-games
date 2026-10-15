# 목인 프리렌더 작업실

Three.js 기본 메시로 직접 만든 목인 모델과 관절 모션을 96 × 96 투명 PNG로 굽는 독립 시안이다. 외부 모델·텍스처·유료 서비스는 사용하지 않는다.

- 화면: `/src/resources/animation-lab/prerendered-model/`, 라이브러리 내부에서는 `?embed=1`.
- 비교: 왼쪽은 매 프레임 3D 자세 계산·렌더링, 오른쪽은 **저장된 PNG 시트에서 사각 영역을 읽는 2D Canvas 재생**이다. 오른쪽에서 3D 렌더링은 수행하지 않는다.
- 조작: 대기·걷기·정권, 정면·우측·후면·좌측, 0.5/1/2배속, 일시정지, 12장 프레임 탐색. 탐색하면 두 화면이 같은 시점에서 멈춘다.
- PNG·프레임 정보 JSON 다운로드 가능. 시트가 없을 때만 초기 베이크로 복구한다. `?bake=1`은 모델을 새로 굽는다.
- 모델·관절 소유권은 `WoodenModel`, 동작·시간 소유권은 `MotionPlayback`, 화면 이벤트·WebGL 수명은 `PrerenderLab`에 있다. pagehide와 라이브러리 종료 이벤트에 RAF·이벤트·GPU 자원을 정리한다.

## 저장 리소스

Git 제외 경로: `public/assets/maplestory/animation-lab/prerendered-model/`.

| 파일                | 규격                           | 용도                               |
| ------------------- | ------------------------------ | ---------------------------------- |
| `wooden-scout.png`  | 1152 × 1152 RGBA, 305482 bytes | 실제 기본 재생 자산                |
| `wooden-scout.json` | UTF-8 JSON                     | 출처·시트·프레임·피벗·시간·SHA-256 |

PNG SHA-256: `ca57f24c85011560a96949a5198bd85c6501819e65d48fe54883e2f29388402c`.

프레임은 96 × 96, 공통 피벗 `(48, 87)` (모델 바닥 중앙의 카메라 투영점을 픽셀로 반올림). 열은 프레임 0~11, 행은 다음과 같다.

| 행   | 동작          | 방향                |
| ---- | ------------- | ------------------- |
| 0~3  | idle, 2초     | 정면·우측·후면·좌측 |
| 4~7  | walk, 1초     | 정면·우측·후면·좌측 |
| 8~11 | attack, 1.2초 | 정면·우측·후면·좌측 |

총 144장, 3동작 모두 반복한다. 샘플 시각은 `frame / 12 * duration`이며 마지막 중복 자세는 넣지 않는다. 원본 카메라는 정사영이며 정면 방향도 약간 비스듬한 시점이다.

## 재생성

기존 프로젝트 의존성과 설치된 브라우저를 재사용한다. Playwright 경로는 환경에 맞게 지정한다. 새 패키지를 설치하지 않는다.

```sh
npm run build
python3 scripts/dev-server.py 8193 --bind 127.0.0.1
```

별도 터미널에서 다음 명령을 실행하면 워크트리의 지정된 Git 제외 경로에 PNG와 JSON을 저장한다.

```sh
PLAYWRIGHT_MODULE_PATH=/Users/3sam3/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs node src/resources/animation-lab/prerendered-model/generate-sheet.mjs http://127.0.0.1:8193
```

`CHROME_EXECUTABLE_PATH`로 설치된 Chrome 실행 경로를 바꿀 수 있다. 별도 headless browser를 생성하고 종료하므로 다른 작업 브라우저와 탭을 공유하지 않는다. 새 모델을 굽고 나면 `metadata.ts`와 이 문서의 hash·bytes를 갱신하고 담당 세션이 manifest에 기록한다. 브라우저·GPU가 달라지면 경계 픽셀과 PNG 해시도 달라질 수 있다.

## 확인과 한계

구현 당시 `npm run check`, `npm run build`와 프리렌더 프레임 재생 로직 검사가 통과했다. 별도 실제 headless Chrome에서 PNG 베이크·기본 PNG 재로드·프레임 진행·일시정지·3모션 × 4방향 탐색·2배속·PNG/JSON 다운로드·DPR 2·라이브러리 종료 후 프레임 정지·390px 화면 수평 넘침 없음·pageerror 없음 확인. 390px 검사는 CSS 뷰포트 검증이며 실제 모바일 기기 검증은 아니다.

낮은 해상도로 구운 3D라 경계에 중간 색이 있다. 손으로 정리한 도트 픽셀과 같지는 않다. 걷기는 제자리 걷기이며 이동·지형 접촉은 이 시안의 범위 밖이다. PNG 시트는 3D 모델이 없어도 재생 가능하지만 이 **비교 화면**은 원본 미리보기 때문에 WebGL을 사용한다.
