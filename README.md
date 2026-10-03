# Web Games

메이플스토리 월드 리소스를 활용하는 로컬 전용 웹 캔버스 미니게임 프로젝트.
전체 MMORPG를 재현하기보다, 소수의 조작과 규칙으로 완성되는 작은 게임을 만든다.

코드, 커밋, 디렉토리 구성 및 검증 기준은 [AGENTS.md](AGENTS.md)에 정리한다.

## 첫 프로토타입 범위

- 맵 하나, 플레이어 캐릭터 하나, 몬스터 한 종류
- 좌우 이동, 점프, 더블점프, 윗점프, 발판 착지
- 기본 공격과 피격 모션
- 메이플스토리와 유사한 이동 감각을 목표로 이동 속도, 중력, 점프와 공중 조작을 조정

최종 미니게임 장르와 승패 규칙은 프로토타입을 구체화하면서 결정한다.
8번출구, 삼국전기, Slay the Spire, 랜덤 타워 디펜스는 미니게임 방향의 예시다.

## 리소스 보관 원칙

- [메이플스토리 월드 리소스 검색](https://maplestoryworlds-resourcesearch-new.nexon.com/search?q=%EC%B9%B4%EB%A7%81&selected=mob/8880842.img)을 출처로 후보와 모션을 검토한다. 로컬 파일, 메타데이터, 사용 가능한 API나 직접 HTTP 요청을 우선 활용하고, 페이지 상호작용이 필요할 때 브라우저 도구를 사용한다. Playwright는 필수가 아니다.
- 다운로드한 이미지와 애니메이션 프레임은 `public/assets/maplestory/`에 보관한다.
- 게임 실행 시 프로젝트의 로컬 리소스를 사용한다. CDN을 반복 호출하지 않는다.
- 이미 로컬에 있는 파일은 재사용한다. 파일이 없거나 명시적으로 갱신할 때 다운로드한다.
- 다운로드한 원본, 변환본, 프레임 및 스프라이트 시트는 위 폴더에 함께 보관하며 Git 추적에서 제외한다.
- 리소스 추가 시 `resources/manifest.json`의 `assets`에 리소스 ID, 출처 URL, 프로젝트 기준 로컬 경로와 필요한 프레임 정보를 기록한다. 이 목록은 Git으로 관리한다.

리소스 파일은 Git에 포함되지 않으므로 다른 환경에서 저장소를 복제하면 별도로 준비해야 한다.

## 게임 설계 기준

- 이동·충돌·공격 판정과 Canvas 렌더링을 분리한다.
- 물리는 고정 시간 간격으로 계산하고, 렌더링은 `requestAnimationFrame`으로 실행한다.
- 시간은 초, 위치는 월드 픽셀, 속도는 월드 픽셀/초를 사용한다. 월드 좌표·화면 좌표·Canvas 실제 픽셀 크기를 구분한다.
- 키 입력은 `jump`, `attack` 같은 행동으로 매핑한다. 캐릭터 상태는 타입으로 정의하고 모션 전환과 일관되게 관리한다.
- 이동 속도·점프 높이·공격 범위는 설정으로, 프레임 시간·이미지 기준점·경로는 리소스 데이터로 관리한다. 충돌 영역은 이미지 크기와 별도로 정의한다.
- 점프 횟수 제한·발판 착지·피격 판정은 핵심 로직 테스트 대상으로 삼는다.

## 개발 도구

Node.js 요구 버전은 `package.json`의 `engines`를 따른다. 패키지는 npm과 `package-lock.json`으로 관리한다.

```sh
npm ci
npm run check
```

- `npm run lint`: JavaScript·TypeScript 코드 검사
- `npm run lint:fix`: 자동 수정 가능한 린트 문제 수정
- `npm run format`: 작은따옴표(`singleQuote: true`)를 적용하고 나머지는 Prettier 기본 설정으로 포맷
- `npm run format:check`: 파일 수정 없이 포맷 검사
- `npm run check`: 린트와 포맷 검사

[typescript-eslint 권장 설정](https://typescript-eslint.io/getting-started/)을 사용하고, [Prettier 설치 지침](https://prettier.io/docs/install)에 따라 버전을 고정한다. `eslint-config-prettier`로 포맷 관련 린트 충돌을 방지한다. 다운로드한 리소스와 생성물은 검사·포맷에서 제외한다.

## 현재 상태

저장소, 리소스 보관 구조, 린트·포맷 도구가 준비되어 있다. 게임 코드, 실행 도구 및 리소스 다운로드 기능은 아직 구현하지 않았다. TypeScript `strict` 설정과 타입 검사 명령은 첫 게임 소스를 추가할 때 구성한다. 린트는 컴파일러의 타입 검사를 대체하지 않는다.
