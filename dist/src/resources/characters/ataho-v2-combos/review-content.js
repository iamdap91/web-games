// 기존 제작 자료의 설명과 원본 링크를 자료 패널을 열 때만 읽는다.
export const reviewContent = `<div id="review-library" class="review-library">
      <header class="review-header">
        <button class="back-link" type="button" data-close-reference>← 동작 조합실</button>
        <p class="eyebrow">아타호 v2 · 자료실</p>
        <h1>연출·제작 자료</h1>
        <p>
          적용한 연출을 비교하거나, 이전 그림과 공격 조합의 제작 과정을
          살펴보세요. 자료를 보는 동안 동작 시계는 현재 위치에 머물고, 자료를 닫으면
          이전 재생·정지 상태로 돌아갑니다.
        </p>
        <p class="review-method">
          비교 GIF는 제작 시점의 기록입니다. 별도 렌더링과 실제 브라우저 촬영
          여부는 각 묶음의 설명·제작 기록에서 확인할 수 있습니다.
        </p>
      </header>
      <details class="archive-note">
  <summary>연출 기법 검토 원문 · 만화·웹툰 / 애니 / 게임 / VFX</summary>
  <p>2026-10-16의278개 전수 검토와 분야별 출처·판정·한계는 원본 문서에 보존합니다.
  2026-10-19에 확인한536개로의 원문 갱신은 링크·본문 확인이며 전체 구현 적합성 재검토나 영상 검증을 뜻하지 않습니다.</p>
  <ul>
    <li><a href="../../../../docs/ataho-v2-glossary-review/README.md">전체 요약·집계·원문 갱신과 확인 범위</a></li>
    <li><a href="../../../../docs/ataho-v2-glossary-review/manga-webtoon.md">만화·웹툰68개 · M01–M68</a></li>
    <li><a href="../../../../docs/ataho-v2-glossary-review/anime.md">애니62개 · A01–A62</a></li>
    <li><a href="../../../../docs/ataho-v2-glossary-review/game.md">게임76개 · G01–G76</a></li>
    <li><a href="../../../../docs/ataho-v2-glossary-review/vfx.md">VFX72개 · V01–V72</a></li>
    <li><a href="../../../../docs/ataho-v2-glossary-review/implementation.md">후속 적용 목록·보존 조건·구현 책임</a></li>
  </ul>
</details>
      <nav class="review-nav" aria-label="자료 분류">
        <a href="#latest" data-review-link="latest" aria-current="location"
          >최근 연출 비교</a
        >
        <a href="#drawings" data-review-link="drawings">그림·부위 비교</a>
        <a href="#production-records" data-review-link="production-records"
          >제작 기록</a
        >
      </nav>
      <p id="review-status" class="review-status" aria-live="polite">
        최근 연출 비교 · 묶음을 열면 GIF를 불러옵니다.
      </p>
      <noscript
        ><p class="archive-note">
          각 묶음을 펼쳐 GIF 원본 링크로 볼 수 있습니다. 페이지 안의 재생은
          JavaScript가 필요합니다.
        </p></noscript
      >
      <section
        id="latest"
        class="review-category"
        data-review-category="최근 연출 비교"
        aria-labelledby="latest-title"
      >
        <h2 id="latest-title">최근 연출 비교</h2>
        <p class="category-description">
          배경·카메라·타격·이동 연출을 비교합니다. 필요한 묶음 하나를 열어
          보세요.
        </p>
        <details
          id="ki-sprites"
          class="review-group"
          data-review-scope="latest"
        >
          <summary>
            <span>기공 · 전용 그림과 형태 변화</span
            ><span class="group-count">전체 + 7개별 GIF</span>
          </summary>
          <div class="review-group-body">
            <p>
              호랑이 형상·유동 빔·응축 탄·초승달·지면 분출·부유기탄의 전용
              그림입니다. 현재 프로젝트 렌더러에서 별도 출력한 1배속·25fps
              자료이며, 샌드백과 접촉 효과를 켰습니다. 브라우저 녹화 영상은
              아닙니다.
            </p>
            <div class="preview-grid">
              <article>
                <h3>기공 전체 · 14초</h3>
                <a
                  class="gif-preview"
                  href="../../../../public/assets/maplestory/ataho-v2-ki/20261016/sprites/previews/ataho-ki-all.gif"
                  aria-label="기공 전체 GIF 원본 열기"
                  style="aspect-ratio: 720 / 438"
                >
                  <span
                    class="gif-placeholder"
                    data-gif-placeholder
                    aria-hidden="true"
                    >GIF 원본 열기 ↗</span
                  >
                  <img
                    data-src="../../../../public/assets/maplestory/ataho-v2-ki/20261016/sprites/previews/ataho-ki-all.gif"
                    alt="전용 스프라이트를 적용한 기공 여섯 기술과 호격권 두 변형"
                    width="720"
                    height="438"
                    loading="lazy"
                    hidden
                    decoding="async"
                  />
                </a>
              </article>
              <article>
                <h3>개별 기술 GIF</h3>
                <ul>
                  <li>
                    <a
                      href="../../../../public/assets/maplestory/ataho-v2-ki/20261016/sprites/previews/ki-tiger.gif"
                      >호격권 · 대상 현현</a
                    >
                  </li>
                  <li>
                    <a
                      href="../../../../public/assets/maplestory/ataho-v2-ki/20261016/sprites/previews/ki-tiger-wave.gif"
                      >호격권 · 선두 파동</a
                    >
                  </li>
                  <li>
                    <a
                      href="../../../../public/assets/maplestory/ataho-v2-ki/20261016/sprites/previews/ki-orb.gif"
                      >권기탄</a
                    >
                  </li>
                  <li>
                    <a
                      href="../../../../public/assets/maplestory/ataho-v2-ki/20261016/sprites/previews/ki-beam.gif"
                      >파동포</a
                    >
                  </li>
                  <li>
                    <a
                      href="../../../../public/assets/maplestory/ataho-v2-ki/20261016/sprites/previews/ki-crescent.gif"
                      >광파참</a
                    >
                  </li>
                  <li>
                    <a
                      href="../../../../public/assets/maplestory/ataho-v2-ki/20261016/sprites/previews/ki-eruption.gif"
                      >지열파</a
                    >
                  </li>
                  <li>
                    <a
                      href="../../../../public/assets/maplestory/ataho-v2-ki/20261016/sprites/previews/ki-orbit.gif"
                      >부유기탄</a
                    >
                  </li>
                </ul>
                <p>
                  <a
                    href="../../../../resources/ataho-v2-ki-sprite-generation.json"
                    >원본·전체 프롬프트·레퍼런스·검증 기록</a
                  >
                </p>
              </article>
            </div>
          </div>
        </details>
        <details
          id="scene-presentation"
          class="review-group"
          data-review-scope="latest"
          open
        >
          <summary>
            <span>배경·속도선·수평 추적·팔레트</span
            ><span class="group-count">4 GIF</span>
          </summary>
          <div class="review-group-body">
            <p>
              위는 비교 항목 끔, 아래는 켬입니다. 같은 그림·박자·대상 설정으로
              프로젝트 렌더러에서 별도 출력한 0.5배 자료입니다. 팔레트 컷은 두
              화면에 같은 명중 확대·반동을 사용하고 명암 강조만 바꿉니다.
            </p>
            <div class="preview-grid">
              <article>
                <h3>배경 명암 분리</h3>
                <a
                  href="../../../../public/assets/maplestory/ataho-v2-scene-presentation/20261016/previews/01-background-contrast.gif"
                  class="gif-preview"
                  aria-label="배경 명암 분리 GIF 원본 열기"
                  style="aspect-ratio: 600 / 852"
                  ><span
                    class="gif-placeholder"
                    data-gif-placeholder
                    aria-hidden="true"
                    >GIF 원본 열기 ↗</span
                  ><img
                    data-src="../../../../public/assets/maplestory/ataho-v2-scene-presentation/20261016/previews/01-background-contrast.gif"
                    alt="어퍼컷·철산고·망치주먹의 준비와 실제 강타에서 배경 명암 비교"
                    width="600"
                    height="852"
                    loading="lazy"
                    hidden
                    decoding="async"
                /></a>
                <small>캐릭터 색은 유지하고 준비·명중에서 배경만 낮춤</small>
              </article>
              <article>
                <h3>배경 속도선</h3>
                <a
                  href="../../../../public/assets/maplestory/ataho-v2-scene-presentation/20261016/previews/02-speed-lines.gif"
                  class="gif-preview"
                  aria-label="배경 속도선 GIF 원본 열기"
                  style="aspect-ratio: 600 / 852"
                  ><span
                    class="gif-placeholder"
                    data-gif-placeholder
                    aria-hidden="true"
                    >GIF 원본 열기 ↗</span
                  ><img
                    data-src="../../../../public/assets/maplestory/ataho-v2-scene-presentation/20261016/previews/02-speed-lines.gif"
                    alt="돌진·날아차기·재진입의 실제 이동 구간 배경 속도선 비교"
                    width="600"
                    height="852"
                    loading="lazy"
                    hidden
                    decoding="async"
                /></a>
                <small>실제 이동 속도에 맞춘 뒤쪽의 가는 선</small>
              </article>
              <article>
                <h3>선행·지연 추적</h3>
                <a
                  href="../../../../public/assets/maplestory/ataho-v2-scene-presentation/20261016/previews/03-tracking-camera.gif"
                  class="gif-preview"
                  aria-label="선행·지연 추적 GIF 원본 열기"
                  style="aspect-ratio: 600 / 852"
                  ><span
                    class="gif-placeholder"
                    data-gif-placeholder
                    aria-hidden="true"
                    >GIF 원본 열기 ↗</span
                  ><img
                    data-src="../../../../public/assets/maplestory/ataho-v2-scene-presentation/20261016/previews/03-tracking-camera.gif"
                    alt="돌진·슬라이딩·공중회피 재진입의 수평 추적 카메라 비교"
                    width="600"
                    height="852"
                    loading="lazy"
                    hidden
                    decoding="async"
                /></a>
                <small>배율과 바닥 높이는 유지하고 진행 방향을 따라 이동</small>
              </article>
              <article>
                <h3>제한 팔레트 컷</h3>
                <a
                  href="../../../../public/assets/maplestory/ataho-v2-scene-presentation/20261016/previews/04-palette-cut.gif"
                  class="gif-preview"
                  aria-label="제한 팔레트 컷 GIF 원본 열기"
                  style="aspect-ratio: 600 / 852"
                  ><span
                    class="gif-placeholder"
                    data-gif-placeholder
                    aria-hidden="true"
                    >GIF 원본 열기 ↗</span
                  ><img
                    data-src="../../../../public/assets/maplestory/ataho-v2-scene-presentation/20261016/previews/04-palette-cut.gif"
                    alt="실제 마지막 강타에서 같은 자세를 세 명도로 강조하는 컷 비교"
                    width="600"
                    height="852"
                    loading="lazy"
                    hidden
                    decoding="async"
                /></a>
                <small>마지막 강타가 명중한 순간에만 짧게 세 명도로 표시</small>
              </article>
            </div>
            <p class="record-link">
              <a href="../../../../resources/ataho-v2-scene-presentation.json"
                >이 묶음의 원본·제작 기록</a
              >
            </p>
          </div>
        </details>
        <details
          id="camera-staging"
          class="review-group"
          data-review-scope="latest"
        >
          <summary>
            <span>준비·명중·마무리·공중 카메라</span
            ><span class="group-count">4 GIF</span>
          </summary>
          <div class="review-group-body">
            <p>
              위는 기본 구도, 아래는 선택한 카메라 구도입니다. 같은 그림·박자와
              타격 설정으로 별도 렌더링한 0.5배 비교 자료입니다. 명중 확대는
              샌드백에 실제로 닿은 마지막 강타에서만 작동합니다.
            </p>
            <div class="preview-grid">
              <article>
                <h3>준비 집중</h3>
                <a
                  href="../../../../public/assets/maplestory/ataho-v2-camera-staging/20261015/previews/01-preparation.gif"
                  class="gif-preview"
                  aria-label="준비 집중 GIF 원본 열기"
                  style="aspect-ratio: 600 / 852"
                  ><span
                    class="gif-placeholder"
                    data-gif-placeholder
                    aria-hidden="true"
                    >GIF 원본 열기 ↗</span
                  ><img
                    data-src="../../../../public/assets/maplestory/ataho-v2-camera-staging/20261015/previews/01-preparation.gif"
                    alt="어퍼컷·철산고·망치주먹의 준비 구간 확대 비교"
                    width="600"
                    height="852"
                    loading="lazy"
                    hidden
                    decoding="async"
                /></a>
                <small>힘을 모을 때 천천히 확대하고 공격에서 복귀</small>
              </article>
              <article>
                <h3>명중 스냅 확대</h3>
                <a
                  href="../../../../public/assets/maplestory/ataho-v2-camera-staging/20261015/previews/02-impact.gif"
                  class="gif-preview"
                  aria-label="명중 스냅 확대 GIF 원본 열기"
                  style="aspect-ratio: 600 / 852"
                  ><span
                    class="gif-placeholder"
                    data-gif-placeholder
                    aria-hidden="true"
                    >GIF 원본 열기 ↗</span
                  ><img
                    data-src="../../../../public/assets/maplestory/ataho-v2-camera-staging/20261015/previews/02-impact.gif"
                    alt="철산고·양손 밀어치기·팔꿈치의 마지막 강타 명중 확대 비교"
                    width="600"
                    height="852"
                    loading="lazy"
                    hidden
                    decoding="async"
                /></a>
                <small>실제 명중 · 같은 히트스톱과 강타 반동</small>
              </article>
              <article>
                <h3>마무리 여운</h3>
                <a
                  href="../../../../public/assets/maplestory/ataho-v2-camera-staging/20261015/previews/03-finish.gif"
                  class="gif-preview"
                  aria-label="마무리 여운 GIF 원본 열기"
                  style="aspect-ratio: 600 / 852"
                  ><span
                    class="gif-placeholder"
                    data-gif-placeholder
                    aria-hidden="true"
                    >GIF 원본 열기 ↗</span
                  ><img
                    data-src="../../../../public/assets/maplestory/ataho-v2-camera-staging/20261015/previews/03-finish.gif"
                    alt="어퍼컷·팔꿈치·날아차기의 마지막 타격과 착지 구도 유지 비교"
                    width="600"
                    height="852"
                    loading="lazy"
                    hidden
                    decoding="async"
                /></a>
                <small>몸의 회수는 이어지고 카메라만 잠깐 구도 유지</small>
              </article>
              <article>
                <h3>공중 와이드</h3>
                <a
                  href="../../../../public/assets/maplestory/ataho-v2-camera-staging/20261015/previews/04-airborne.gif"
                  class="gif-preview"
                  aria-label="공중 와이드 GIF 원본 열기"
                  style="aspect-ratio: 600 / 852"
                  ><span
                    class="gif-placeholder"
                    data-gif-placeholder
                    aria-hidden="true"
                    >GIF 원본 열기 ↗</span
                  ><img
                    data-src="../../../../public/assets/maplestory/ataho-v2-camera-staging/20261015/previews/04-airborne.gif"
                    alt="날아차기·공중회피·공중 연계의 전신과 바닥을 담는 구도 비교"
                    width="600"
                    height="852"
                    loading="lazy"
                    hidden
                    decoding="async"
                /></a>
                <small>도약 전에 넓어지고 착지 뒤 원래 구도로 복귀</small>
              </article>
            </div>
            <p class="record-link">
              <a href="../../../../resources/ataho-v2-camera-staging.json"
                >이 묶음의 원본·제작 기록</a
              >
            </p>
          </div>
        </details>
        <details
          id="impact-ground"
          class="review-group"
          data-review-scope="latest"
        >
          <summary>
            <span>충격 모양·접지·착지 반응</span
            ><span class="group-count">3 GIF</span>
          </summary>
          <div class="review-group-body">
            <p>
              위는 비교 항목 끔, 아래는 켬입니다. 같은 그림·박자를 프로젝트
              렌더러로 별도 재생한0.5배 자료이며 브라우저 촬영이 아닙니다. 명중
              비교는 두 화면에 같은 샌드백과 히트스톱을 사용합니다.
            </p>
            <div class="preview-grid">
              <article>
                <h3>공격별 충격 모양</h3>
                <a
                  href="../../../../public/assets/maplestory/ataho-v2-impact-ground/20261015/previews/01-directional-impacts.gif"
                  class="gif-preview"
                  aria-label="공격별 충격 모양 GIF 원본 열기"
                  style="aspect-ratio: 600 / 852"
                  ><span
                    class="gif-placeholder"
                    data-gif-placeholder
                    aria-hidden="true"
                    >GIF 원본 열기 ↗</span
                  ><img
                    data-src="../../../../public/assets/maplestory/ataho-v2-impact-ground/20261015/previews/01-directional-impacts.gif"
                    alt="잽·어퍼컷·망치주먹·양손 밀기의 충격 모양 비교"
                    width="600"
                    height="852"
                    loading="lazy"
                    hidden
                    decoding="async"
                /></a>
                <small>위: 공통 방사형 / 아래: 공격별 방향·모양</small>
              </article>
              <article>
                <h3>접지·착지 반응</h3>
                <a
                  href="../../../../public/assets/maplestory/ataho-v2-impact-ground/20261015/previews/02-ground-contact.gif"
                  class="gif-preview"
                  aria-label="접지·착지 반응 GIF 원본 열기"
                  style="aspect-ratio: 600 / 852"
                  ><span
                    class="gif-placeholder"
                    data-gif-placeholder
                    aria-hidden="true"
                    >GIF 원본 열기 ↗</span
                  ><img
                    data-src="../../../../public/assets/maplestory/ataho-v2-impact-ground/20261015/previews/02-ground-contact.gif"
                    alt="날아차기·공중회피·슬라이딩의 발밑 반응과 그림자 비교"
                    width="600"
                    height="852"
                    loading="lazy"
                    hidden
                    decoding="async"
                /></a>
                <small>위: 기존 / 아래: 발밑 먼지·마찰·그림자</small>
              </article>
              <article>
                <h3>강타 카메라 반동</h3>
                <a
                  href="../../../../public/assets/maplestory/ataho-v2-impact-ground/20261015/previews/03-camera-recoil.gif"
                  class="gif-preview"
                  aria-label="강타 카메라 반동 GIF 원본 열기"
                  style="aspect-ratio: 600 / 852"
                  ><span
                    class="gif-placeholder"
                    data-gif-placeholder
                    aria-hidden="true"
                    >GIF 원본 열기 ↗</span
                  ><img
                    data-src="../../../../public/assets/maplestory/ataho-v2-impact-ground/20261015/previews/03-camera-recoil.gif"
                    alt="명중한 철산고·어퍼컷·밀어치기의 짧은 카메라 반동 비교"
                    width="600"
                    height="852"
                    loading="lazy"
                    hidden
                    decoding="async"
                /></a>
                <small>위: 고정 무대 / 아래: 강타에만 짧은 반동</small>
              </article>
            </div>
            <p class="record-link">
              <a href="../../../../resources/ataho-v2-impact-ground.json"
                >이 묶음의 원본·제작 기록</a
              >
            </p>
          </div>
        </details>
        <details
          id="motion-continuity"
          class="review-group"
          data-review-scope="latest"
        >
          <summary>
            <span>연결 박자·잔상 소멸·명중 반응</span
            ><span class="group-count">4 GIF</span>
          </summary>
          <div class="review-group-body">
            <p>
              현재 프로젝트 렌더러로 기본과 선택 연출을 비교한 자료입니다. 새
              연결 그림은 사용자 검토 후보입니다. 샌드백 비교에는 실제 재생
              시간의 강타 정지도 포함합니다.
            </p>
            <div class="preview-grid">
              <article>
                <h3>연속기 전용 연결 박자</h3>
                <a
                  href="../../../../public/assets/maplestory/ataho-v2-motion-continuity/20261015/previews/01-linked-rhythm.gif"
                  class="gif-preview"
                  aria-label="연속기 전용 연결 박자 GIF 원본 열기"
                  style="aspect-ratio: 600 / 852"
                  ><span
                    class="gif-placeholder"
                    data-gif-placeholder
                    aria-hidden="true"
                    >GIF 원본 열기 ↗</span
                  ><img
                    data-src="../../../../public/assets/maplestory/ataho-v2-motion-continuity/20261015/previews/01-linked-rhythm.gif"
                    alt="연속기 전용 연결 박자 기본과 선택 연출 비교"
                    width="600"
                    height="852"
                    loading="lazy"
                    hidden
                    decoding="async"
                /></a>
                <small>0.5배 · 위: 기본 / 아래: 연출 적용</small>
              </article>
              <article>
                <h3>잔상·궤적 꼬리 소멸</h3>
                <a
                  href="../../../../public/assets/maplestory/ataho-v2-motion-continuity/20261015/previews/02-trail-lifetime.gif"
                  class="gif-preview"
                  aria-label="잔상·궤적 꼬리 소멸 GIF 원본 열기"
                  style="aspect-ratio: 600 / 852"
                  ><span
                    class="gif-placeholder"
                    data-gif-placeholder
                    aria-hidden="true"
                    >GIF 원본 열기 ↗</span
                  ><img
                    data-src="../../../../public/assets/maplestory/ataho-v2-motion-continuity/20261015/previews/02-trail-lifetime.gif"
                    alt="잔상·궤적 꼬리 소멸 기본과 선택 연출 비교"
                    width="600"
                    height="852"
                    loading="lazy"
                    hidden
                    decoding="async"
                /></a>
                <small>0.5배 · 위: 기본 / 아래: 연출 적용</small>
              </article>
              <article>
                <h3>접지·소품 연결 그림</h3>
                <a
                  href="../../../../public/assets/maplestory/ataho-v2-motion-continuity/20261015/previews/03-connection-drawings.gif"
                  class="gif-preview"
                  aria-label="접지·소품 연결 그림 GIF 원본 열기"
                  style="aspect-ratio: 600 / 852"
                  ><span
                    class="gif-placeholder"
                    data-gif-placeholder
                    aria-hidden="true"
                    >GIF 원본 열기 ↗</span
                  ><img
                    data-src="../../../../public/assets/maplestory/ataho-v2-motion-continuity/20261015/previews/03-connection-drawings.gif"
                    alt="접지·소품 연결 그림 기본과 선택 연출 비교"
                    width="600"
                    height="852"
                    loading="lazy"
                    hidden
                    decoding="async"
                /></a>
                <small>0.5배 · 위: 기본 / 아래: 연출 적용</small>
              </article>
              <article>
                <h3>샌드백 반동·강타 히트스톱</h3>
                <a
                  href="../../../../public/assets/maplestory/ataho-v2-motion-continuity/20261015/previews/04-sandbag-response.gif"
                  class="gif-preview"
                  aria-label="샌드백 반동·강타 히트스톱 GIF 원본 열기"
                  style="aspect-ratio: 600 / 852"
                  ><span
                    class="gif-placeholder"
                    data-gif-placeholder
                    aria-hidden="true"
                    >GIF 원본 열기 ↗</span
                  ><img
                    data-src="../../../../public/assets/maplestory/ataho-v2-motion-continuity/20261015/previews/04-sandbag-response.gif"
                    alt="샌드백 반동·강타 히트스톱 기본과 선택 연출 비교"
                    width="600"
                    height="852"
                    loading="lazy"
                    hidden
                    decoding="async"
                /></a>
                <small>0.5배 · 위: 기본 / 아래: 연출 적용</small>
              </article>
            </div>
            <p class="record-link">
              <a href="../../../../resources/ataho-v2-motion-continuity.json"
                >이 묶음의 원본·제작 기록</a
              >
            </p>
          </div>
        </details>
      </section>
      <section
        id="drawings"
        class="review-category"
        data-review-category="그림·부위 비교"
        aria-labelledby="drawings-title"
      >
        <h2 id="drawings-title">그림·부위 비교</h2>
        <p class="category-description">
          추가 그림, 스미어, 부위의 지연·정착을 비교합니다. 새 그림의 채택
          여부와 제작 시점은 각 기록을 함께 확인해 주세요.
        </p>
        <details
          id="elbow-contact"
          class="review-group"
          data-review-scope="drawings"
          open
        >
          <summary>
            <span>팔꿈치 핵심 그림·타격 방향 반동</span
            ><span class="group-count">2 GIF</span>
          </summary>
          <div class="review-group-body">
            <p>
              위는 직전 작업본의 그림·반동, 아래는 새 팔꿈치 그림과 방향별
              반동입니다. 프로젝트 렌더러의0.5배 비교 자료이며 실제 브라우저
              촬영이 아닙니다. 새 그림은 사용자 검토 후보입니다.
            </p>
            <div class="preview-grid">
              <article>
                <h3>팔꿈치 장전·하강 그림</h3>
                <a
                  href="../../../../public/assets/maplestory/ataho-v2-elbow-contact/20261015/previews/01-elbow-keyposes.gif"
                  class="gif-preview"
                  aria-label="팔꿈치 장전·하강 그림 GIF 원본 열기"
                  style="aspect-ratio: 600 / 852"
                  ><span
                    class="gif-placeholder"
                    data-gif-placeholder
                    aria-hidden="true"
                    >GIF 원본 열기 ↗</span
                  ><img
                    data-src="../../../../public/assets/maplestory/ataho-v2-elbow-contact/20261015/previews/01-elbow-keyposes.gif"
                    alt="단독과 연계3종의 팔꿈치 핵심 그림 비교"
                    width="600"
                    height="852"
                    loading="lazy"
                    hidden
                    decoding="async"
                /></a>
                <small>0.5배 · 위: 기존 / 아래: 새 그림</small>
              </article>
              <article>
                <h3>상승·하강·수평 명중 반동</h3>
                <a
                  href="../../../../public/assets/maplestory/ataho-v2-elbow-contact/20261015/previews/02-directional-contact.gif"
                  class="gif-preview"
                  aria-label="상승·하강·수평 명중 반동 GIF 원본 열기"
                  style="aspect-ratio: 600 / 852"
                  ><span
                    class="gif-placeholder"
                    data-gif-placeholder
                    aria-hidden="true"
                    >GIF 원본 열기 ↗</span
                  ><img
                    data-src="../../../../public/assets/maplestory/ataho-v2-elbow-contact/20261015/previews/02-directional-contact.gif"
                    alt="어퍼컷·망치주먹·밀어치기의 방향별 샌드백 반동 비교"
                    width="600"
                    height="852"
                    loading="lazy"
                    hidden
                    decoding="async"
                /></a>
                <small>0.5배 · 위: 이전 반동 / 아래: 방향별 반동</small>
              </article>
            </div>
            <p class="record-link">
              <a href="../../../../resources/ataho-v2-elbow-contact.json"
                >이 묶음의 원본·제작 기록</a
              >
            </p>
          </div>
        </details>
        <details
          id="motion-refinement"
          class="review-group"
          data-review-scope="drawings"
        >
          <summary>
            <span>접촉·정착·꼬리·어깨 자세</span
            ><span class="group-count">4 GIF</span>
          </summary>
          <div class="review-group-body">
            <p>
              위는 이전 연출, 아래는 현재 연출입니다. 같은 재생 시점에서 접촉
              초반의 흐림, 동작별 꼬리 반응, 스미어 노출과 철산고의 새 세 자세를
              비교합니다.
            </p>
            <div class="preview-grid">
              <article>
                <h3>도착 순간의 블러 · 발끝 정착</h3>
                <a
                  href="../../../../public/assets/maplestory/ataho-v2-motion-refinement/20261015/previews/01-contact-clarity.gif"
                  class="gif-preview"
                  aria-label="도착 순간의 블러 · 발끝 정착 GIF 원본 열기"
                  style="aspect-ratio: 600 / 852"
                  ><span
                    class="gif-placeholder"
                    data-gif-placeholder
                    aria-hidden="true"
                    >GIF 원본 열기 ↗</span
                  ><img
                    data-src="../../../../public/assets/maplestory/ataho-v2-motion-refinement/20261015/previews/01-contact-clarity.gif"
                    alt="도착 순간의 블러 · 발끝 정착 적용 전후 비교"
                    width="600"
                    height="852"
                    loading="lazy"
                    hidden
                    decoding="async"
                /></a>
                <small>0.5배 · 위: 적용 전 / 아래: 적용 후</small>
              </article>
              <article>
                <h3>동작별 꼬리 반응</h3>
                <a
                  href="../../../../public/assets/maplestory/ataho-v2-motion-refinement/20261015/previews/02-tail-response.gif"
                  class="gif-preview"
                  aria-label="동작별 꼬리 반응 GIF 원본 열기"
                  style="aspect-ratio: 600 / 852"
                  ><span
                    class="gif-placeholder"
                    data-gif-placeholder
                    aria-hidden="true"
                    >GIF 원본 열기 ↗</span
                  ><img
                    data-src="../../../../public/assets/maplestory/ataho-v2-motion-refinement/20261015/previews/02-tail-response.gif"
                    alt="동작별 꼬리 반응 적용 전후 비교"
                    width="600"
                    height="852"
                    loading="lazy"
                    hidden
                    decoding="async"
                /></a>
                <small>0.5배 · 위: 적용 전 / 아래: 적용 후</small>
              </article>
              <article>
                <h3>훅 · 망치주먹 스미어 노출</h3>
                <a
                  href="../../../../public/assets/maplestory/ataho-v2-motion-refinement/20261015/previews/03-smear-exposure.gif"
                  class="gif-preview"
                  aria-label="훅 · 망치주먹 스미어 노출 GIF 원본 열기"
                  style="aspect-ratio: 600 / 852"
                  ><span
                    class="gif-placeholder"
                    data-gif-placeholder
                    aria-hidden="true"
                    >GIF 원본 열기 ↗</span
                  ><img
                    data-src="../../../../public/assets/maplestory/ataho-v2-motion-refinement/20261015/previews/03-smear-exposure.gif"
                    alt="훅 · 망치주먹 스미어 노출 적용 전후 비교"
                    width="600"
                    height="852"
                    loading="lazy"
                    hidden
                    decoding="async"
                /></a>
                <small>0.5배 · 위: 적용 전 / 아래: 적용 후</small>
              </article>
              <article>
                <h3>철산고 어깨 장전 · 충돌 그림</h3>
                <a
                  href="../../../../public/assets/maplestory/ataho-v2-motion-refinement/20261015/previews/04-shoulder-keyposes.gif"
                  class="gif-preview"
                  aria-label="철산고 어깨 장전 · 충돌 그림 GIF 원본 열기"
                  style="aspect-ratio: 600 / 852"
                  ><span
                    class="gif-placeholder"
                    data-gif-placeholder
                    aria-hidden="true"
                    >GIF 원본 열기 ↗</span
                  ><img
                    data-src="../../../../public/assets/maplestory/ataho-v2-motion-refinement/20261015/previews/04-shoulder-keyposes.gif"
                    alt="철산고 어깨 장전 · 충돌 그림 적용 전후 비교"
                    width="600"
                    height="852"
                    loading="lazy"
                    hidden
                    decoding="async"
                /></a>
                <small>0.5배 · 위: 적용 전 / 아래: 적용 후</small>
              </article>
            </div>
            <p class="record-link">
              <a href="../../../../resources/ataho-v2-motion-refinement.json"
                >이 묶음의 원본·제작 기록</a
              >
            </p>
          </div>
        </details>
        <details
          id="part-presentation"
          class="review-group"
          data-review-scope="drawings"
        >
          <summary>
            <span>스미어 그림·도약·착지·부위 움직임</span
            ><span class="group-count">4 GIF</span>
          </summary>
          <div class="review-group-body">
            <p>
              위는 기존 궤적·잔상, 아래는 이번 추가 그림·부위 효과입니다. 같은
              박자를 0.5배로 재생합니다.
            </p>
            <div class="preview-grid">
              <article>
                <h3>새 잽 스미어 그림</h3>
                <a
                  href="../../../../public/assets/maplestory/ataho-v2-part-presentation/20261015/previews/01-jab-smear.gif"
                  class="gif-preview"
                  aria-label="새 잽 스미어 그림 GIF 원본 열기"
                  style="aspect-ratio: 600 / 852"
                  ><span
                    class="gif-placeholder"
                    data-gif-placeholder
                    aria-hidden="true"
                    >GIF 원본 열기 ↗</span
                  ><img
                    data-src="../../../../public/assets/maplestory/ataho-v2-part-presentation/20261015/previews/01-jab-smear.gif"
                    alt="새 잽 스미어 그림 적용 전후 비교"
                    width="600"
                    height="852"
                    loading="lazy"
                    hidden
                    decoding="async"
                /></a>
                <small>0.5배 · 같은 박자 · 원본 그림/부위 자료 비교</small>
              </article>
              <article>
                <h3>도약 폄 · 착지 눌림</h3>
                <a
                  href="../../../../public/assets/maplestory/ataho-v2-part-presentation/20261015/previews/02-jump-compression.gif"
                  class="gif-preview"
                  aria-label="도약 폄 · 착지 눌림 GIF 원본 열기"
                  style="aspect-ratio: 600 / 852"
                  ><span
                    class="gif-placeholder"
                    data-gif-placeholder
                    aria-hidden="true"
                    >GIF 원본 열기 ↗</span
                  ><img
                    data-src="../../../../public/assets/maplestory/ataho-v2-part-presentation/20261015/previews/02-jump-compression.gif"
                    alt="도약 폄 · 착지 눌림 적용 전후 비교"
                    width="600"
                    height="852"
                    loading="lazy"
                    hidden
                    decoding="async"
                /></a>
                <small>0.5배 · 같은 박자 · 원본 그림/부위 자료 비교</small>
              </article>
              <article>
                <h3>발끝 스미어 · 블러 · 오버슈트</h3>
                <a
                  href="../../../../public/assets/maplestory/ataho-v2-part-presentation/20261015/previews/03-limb-effects.gif"
                  class="gif-preview"
                  aria-label="발끝 스미어 · 블러 · 오버슈트 GIF 원본 열기"
                  style="aspect-ratio: 600 / 852"
                  ><span
                    class="gif-placeholder"
                    data-gif-placeholder
                    aria-hidden="true"
                    >GIF 원본 열기 ↗</span
                  ><img
                    data-src="../../../../public/assets/maplestory/ataho-v2-part-presentation/20261015/previews/03-limb-effects.gif"
                    alt="발끝 스미어 · 블러 · 오버슈트 적용 전후 비교"
                    width="600"
                    height="852"
                    loading="lazy"
                    hidden
                    decoding="async"
                /></a>
                <small>0.5배 · 같은 박자 · 원본 그림/부위 자료 비교</small>
              </article>
              <article>
                <h3>꼬리 후속 움직임</h3>
                <a
                  href="../../../../public/assets/maplestory/ataho-v2-part-presentation/20261015/previews/04-tail-follow-through.gif"
                  class="gif-preview"
                  aria-label="꼬리 후속 움직임 GIF 원본 열기"
                  style="aspect-ratio: 600 / 852"
                  ><span
                    class="gif-placeholder"
                    data-gif-placeholder
                    aria-hidden="true"
                    >GIF 원본 열기 ↗</span
                  ><img
                    data-src="../../../../public/assets/maplestory/ataho-v2-part-presentation/20261015/previews/04-tail-follow-through.gif"
                    alt="꼬리 후속 움직임 적용 전후 비교"
                    width="600"
                    height="852"
                    loading="lazy"
                    hidden
                    decoding="async"
                /></a>
                <small>0.5배 · 같은 박자 · 원본 그림/부위 자료 비교</small>
              </article>
            </div>
            <p class="record-link">
              <a href="../../../../resources/ataho-v2-part-presentation.json"
                >이 묶음의 원본·제작 기록</a
              >
            </p>
          </div>
        </details>
      </section>
      <section
        id="production-records"
        class="review-category"
        data-review-category="제작 기록"
        aria-labelledby="production-title"
      >
        <h2 id="production-title">제작 기록</h2>
        <p class="category-description">
          이전 연계와 회피, 박자 비교, 원본 생성 시도를 보관합니다. 현재 공격
          목록과 구분되는 당시 자료입니다.
        </p>
        <details
          id="legacy-records"
          class="review-group"
          data-review-scope="production-records"
          open
        >
          <summary>
            <span>이전 연계·회피·박자 기록</span
            ><span class="group-count">20 GIF 링크</span>
          </summary>
          <div class="review-group-body">
            <p class="archive-note">
              제작 당시 선별·비교 자료입니다. 링크의 번호는 당시 기록의 번호이며
              현재 공격 목록의 순서가 아닙니다. GIF 이름을 누르면 원본을 엽니다.
            </p>
            <h3>이전 복합 공격·3종·4종 연계</h3>
            <ul class="record-list">
              <li>
                <a
                  href="../../../../public/assets/maplestory/ataho-v2-combo-lab/20261014/shortlist/one-two-uppercut-effects-off.gif"
                  >10. 원투 → 어퍼컷</a
                >
              </li>
              <li>
                <a
                  href="../../../../public/assets/maplestory/ataho-v2-combo-lab/20261014/shortlist/one-two-sweep-effects-off.gif"
                  >11. 원투 → 하단</a
                >
              </li>
              <li>
                <a
                  href="../../../../public/assets/maplestory/ataho-v2-combo-lab/20261014/shortlist/spin-one-two-effects-off.gif"
                  >12. 회전 → 원투</a
                >
              </li>
              <li>
                <a
                  href="../../../../public/assets/maplestory/ataho-v2-combo-lab/20261014/shortlist/one-two-elbow-effects-off.gif"
                  >13. 원투 → 팔꿈치</a
                >
              </li>
              <li>
                <a
                  href="../../../../public/assets/maplestory/ataho-v2-combo-lab/20261014/shortlist/punch-barrage-effects-off.gif"
                  >14. 연속 원투</a
                >
              </li>
              <li>
                <a
                  href="../../../../public/assets/maplestory/ataho-v2-combo-lab/20261014/shortlist/one-two-leap-kick-effects-off.gif"
                  >15. 원투 → 날아차기</a
                >
              </li>
              <li>
                <a
                  href="../../../../public/assets/maplestory/ataho-v2-combo-lab/20261014/three-four-review/three-ground-effects-off.gif"
                  >16. 원투 → 어퍼컷 → 내려치기</a
                >
              </li>
              <li>
                <a
                  href="../../../../public/assets/maplestory/ataho-v2-combo-lab/20261014/three-four-review/three-air-effects-off.gif"
                  >17. 원투 → 어퍼컷 → 날아차기</a
                >
              </li>
              <li>
                <a
                  href="../../../../public/assets/maplestory/ataho-v2-combo-lab/20261014/three-four-review/four-chain-effects-off.gif"
                  >18. 원투 → 어퍼컷 → 내려치기 → 날아차기</a
                >
              </li>
            </ul>
            <h3>이전 팔꿈치 박자</h3>
            <ul class="record-list">
              <li>
                <a
                  href="../../../../public/assets/maplestory/ataho-v2-combo-lab/20261014/shortlist/elbow-original-effects-off.gif"
                  >원래 박자</a
                >
              </li>
              <li>
                <a
                  href="../../../../public/assets/maplestory/ataho-v2-combo-lab/20261014/shortlist/elbow-fast-effects-off.gif"
                  >전체 빠르게</a
                >
              </li>
              <li>
                <a
                  href="../../../../public/assets/maplestory/ataho-v2-combo-lab/20261014/shortlist/elbow-rapid-effects-off.gif"
                  >가속과 멈춤 · 0.42초</a
                >
              </li>
              <li>
                <a
                  href="../../../../public/assets/maplestory/ataho-v2-combo-lab/20261014/shortlist/elbow-sharp-effects-off.gif"
                  >이전 가속과 멈춤 · 0.72초</a
                >
              </li>
            </ul>
            <h3>이전 회피·동작 조합</h3>
            <ul class="record-list">
              <li>
                <a
                  href="../../../../public/assets/maplestory/ataho-v2-combo-lab/20261014/refinement/rush-effects-off.gif"
                  >원투 GIF</a
                >
              </li>
              <li>
                <a
                  href="../../../../public/assets/maplestory/ataho-v2-combo-lab/20261014/refinement/dodge-effects-off.gif"
                  >회피 GIF</a
                >
              </li>
              <li>
                <a
                  href="../../../../public/assets/maplestory/ataho-v2-combo-lab/20261014/refinement/flying-kick-effects-off.gif"
                  >날아차기 GIF</a
                >
              </li>
              <li>
                <a
                  href="../../../../public/assets/maplestory/ataho-v2-combo-lab/20261014/additions/cheolsango-short-effects-off.gif"
                  >철산고 · 짧은 버전 GIF</a
                >
              </li>
              <li>
                <a
                  href="../../../../public/assets/maplestory/ataho-v2-combo-lab/20261014/additions/drink-effects-off.gif"
                  >마시기 GIF</a
                >
              </li>
              <li>
                <a
                  href="../../../../public/assets/maplestory/ataho-v2-combo-lab/20261014/review/ground-spin-effects-off.gif"
                  >지상 회전 GIF</a
                >
              </li>
              <li>
                <a
                  href="../../../../public/assets/maplestory/ataho-v2-combo-lab/20261014/review/elbow-chop-effects-off.gif"
                  >팔꿈치 GIF</a
                >
              </li>
            </ul>
            <h3>이전 제작 기록</h3>
            <ul class="record-list">
              <li>
                <a href="../../../../resources/ataho-v2-combo-multi-stage.json"
                  >선택한 3종·4종 연계 적용 기록</a
                >
              </li>
              <li>
                <a href="../../../../resources/ataho-v2-combo-shortlist.json"
                  >조합 선별·더 빠른 9번 기록</a
                >
              </li>
              <li>
                <a href="../../../../resources/ataho-v2-combo-compound.json"
                  >복합 공격·9번 박자 비교 기록</a
                >
              </li>
              <li>
                <a href="../../../../resources/ataho-v2-generation.json"
                  >원본 출처와 가져오기 기록</a
                >
              </li>
              <li>
                <a href="../../../../resources/ataho-v2-combo-additions.json"
                  >철산고·마시기 조합 기록</a
                >
              </li>
              <li>
                <a
                  href="../../../../resources/ataho-v2-combo-review-motions.json"
                  >지상 회전·팔꿈치 조합 기록</a
                >
              </li>
              <li>
                <a
                  href="../../../../resources/ataho-v2-combo-dodge-generation.json"
                  >회피 보강 생성 기록</a
                >
              </li>
              <li>
                <a
                  href="../../../../resources/ataho-v2-combo-slide-generation.json"
                  >하단 타격 생성 기록</a
                >
              </li>
            </ul>
          </div>
        </details>
        <details
          id="existing-attacks"
          class="review-group"
          data-review-scope="production-records"
        >
          <summary>
            <span>제작 당시 기존 그림 조합</span
            ><span class="group-count">6 GIF</span>
          </summary>
          <div class="review-group-body">
            <p class="archive-note">
              제작 당시 그림과 박자를 남긴 기록입니다. 현재 공격 목록이나 최종
              채택 상태와는 별도로 봐 주세요.
            </p>
            <div class="preview-grid">
              <article>
                <h3>빠른 잽 · 1타</h3>
                <a
                  href="../../../../public/assets/maplestory/ataho-v2-attack-additions/20261014/previews/quick-jab-effects-off.gif"
                  class="gif-preview"
                  aria-label="빠른 잽 · 1타 GIF 원본 열기"
                  style="aspect-ratio: 900 / 410"
                  ><span
                    class="gif-placeholder"
                    data-gif-placeholder
                    aria-hidden="true"
                    >GIF 원본 열기 ↗</span
                  ><img
                    data-src="../../../../public/assets/maplestory/ataho-v2-attack-additions/20261014/previews/quick-jab-effects-off.gif"
                    alt="빠른 잽 · 1타 효과 없는 GIF"
                    width="900"
                    height="410"
                    loading="lazy"
                    hidden
                    decoding="async"
                /></a>
                <p>준비·접촉·회수와 외형 전환을 비교해 주세요.</p>
                <small>0.365초 · 1타 · 반복 간격 포함</small>
              </article>
              <article>
                <h3>더블잽 · 2타</h3>
                <a
                  href="../../../../public/assets/maplestory/ataho-v2-attack-additions/20261014/previews/double-jab-effects-off.gif"
                  class="gif-preview"
                  aria-label="더블잽 · 2타 GIF 원본 열기"
                  style="aspect-ratio: 900 / 410"
                  ><span
                    class="gif-placeholder"
                    data-gif-placeholder
                    aria-hidden="true"
                    >GIF 원본 열기 ↗</span
                  ><img
                    data-src="../../../../public/assets/maplestory/ataho-v2-attack-additions/20261014/previews/double-jab-effects-off.gif"
                    alt="더블잽 · 2타 효과 없는 GIF"
                    width="900"
                    height="410"
                    loading="lazy"
                    hidden
                    decoding="async"
                /></a>
                <p>준비·접촉·회수와 외형 전환을 비교해 주세요.</p>
                <small>0.600초 · 2타 · 반복 간격 포함</small>
              </article>
              <article>
                <h3>한 걸음 후퇴 → 원투 · 2타</h3>
                <a
                  href="../../../../public/assets/maplestory/ataho-v2-attack-additions/20261014/previews/retreat-one-two-effects-off.gif"
                  class="gif-preview"
                  aria-label="한 걸음 후퇴 → 원투 · 2타 GIF 원본 열기"
                  style="aspect-ratio: 900 / 410"
                  ><span
                    class="gif-placeholder"
                    data-gif-placeholder
                    aria-hidden="true"
                    >GIF 원본 열기 ↗</span
                  ><img
                    data-src="../../../../public/assets/maplestory/ataho-v2-attack-additions/20261014/previews/retreat-one-two-effects-off.gif"
                    alt="한 걸음 후퇴 → 원투 · 2타 효과 없는 GIF"
                    width="900"
                    height="410"
                    loading="lazy"
                    hidden
                    decoding="async"
                /></a>
                <p>준비·접촉·회수와 외형 전환을 비교해 주세요.</p>
                <small>1.090초 · 2타 · 반복 간격 포함</small>
              </article>
              <article>
                <h3>모아치는 어퍼컷 · 1타</h3>
                <a
                  href="../../../../public/assets/maplestory/ataho-v2-attack-additions/20261014/previews/charged-uppercut-effects-off.gif"
                  class="gif-preview"
                  aria-label="모아치는 어퍼컷 · 1타 GIF 원본 열기"
                  style="aspect-ratio: 900 / 410"
                  ><span
                    class="gif-placeholder"
                    data-gif-placeholder
                    aria-hidden="true"
                    >GIF 원본 열기 ↗</span
                  ><img
                    data-src="../../../../public/assets/maplestory/ataho-v2-attack-additions/20261014/previews/charged-uppercut-effects-off.gif"
                    alt="모아치는 어퍼컷 · 1타 효과 없는 GIF"
                    width="900"
                    height="410"
                    loading="lazy"
                    hidden
                    decoding="async"
                /></a>
                <p>준비·접촉·회수와 외형 전환을 비교해 주세요.</p>
                <small>0.805초 · 1타 · 반복 간격 포함</small>
              </article>
              <article>
                <h3>날아차기 → 착지 원투 · 3타</h3>
                <a
                  href="../../../../public/assets/maplestory/ataho-v2-attack-additions/20261014/previews/landing-one-two-effects-off.gif"
                  class="gif-preview"
                  aria-label="날아차기 → 착지 원투 · 3타 GIF 원본 열기"
                  style="aspect-ratio: 900 / 410"
                  ><span
                    class="gif-placeholder"
                    data-gif-placeholder
                    aria-hidden="true"
                    >GIF 원본 열기 ↗</span
                  ><img
                    data-src="../../../../public/assets/maplestory/ataho-v2-attack-additions/20261014/previews/landing-one-two-effects-off.gif"
                    alt="날아차기 → 착지 원투 · 3타 효과 없는 GIF"
                    width="900"
                    height="410"
                    loading="lazy"
                    hidden
                    decoding="async"
                /></a>
                <p>준비·접촉·회수와 외형 전환을 비교해 주세요.</p>
                <small>1.815초 · 3타 · 반복 간격 포함</small>
              </article>
              <article>
                <h3>잽 → 지상 킥 · 2타</h3>
                <a
                  href="../../../../public/assets/maplestory/ataho-v2-attack-additions/20261014/previews/jab-ground-kick-effects-off.gif"
                  class="gif-preview"
                  aria-label="잽 → 지상 킥 · 2타 GIF 원본 열기"
                  style="aspect-ratio: 900 / 410"
                  ><span
                    class="gif-placeholder"
                    data-gif-placeholder
                    aria-hidden="true"
                    >GIF 원본 열기 ↗</span
                  ><img
                    data-src="../../../../public/assets/maplestory/ataho-v2-attack-additions/20261014/previews/jab-ground-kick-effects-off.gif"
                    alt="잽 → 지상 킥 · 2타 효과 없는 GIF"
                    width="900"
                    height="410"
                    loading="lazy"
                    hidden
                    decoding="async"
                /></a>
                <p>
                  지지발은 고정되지만 원투와 킥의 전환에서 상체가 약 18~20px
                  이동한다. 연결 자세가 부족하다.
                </p>
                <small>1.035초 · 2타 · 반복 간격 포함</small>
              </article>
            </div>
            <p class="record-link">
              <a
                href="../../../../resources/ataho-v2-attack-additions-generation.json"
                >이 묶음의 원본·제작 기록</a
              >
            </p>
          </div>
        </details>
        <details
          id="directional-attacks"
          class="review-group"
          data-review-scope="production-records"
        >
          <summary>
            <span>공격 원본·두 방향 생성 비교</span
            ><span class="group-count">8 GIF</span>
          </summary>
          <div class="review-group-body">
            <p class="archive-note">
              제작 당시 그림과 박자를 남긴 기록입니다. 현재 공격 목록이나 최종
              채택 상태와는 별도로 봐 주세요.
            </p>
            <div class="preview-grid">
              <article>
                <h3>앞 밀어차기 · 남동쪽</h3>
                <a
                  href="../../../../public/assets/maplestory/ataho-v2-attack-additions/20261014/previews/new-front-push-kick-south-east-effects-off.gif"
                  class="gif-preview"
                  aria-label="앞 밀어차기 · 남동쪽 GIF 원본 열기"
                  style="aspect-ratio: 900 / 410"
                  ><span
                    class="gif-placeholder"
                    data-gif-placeholder
                    aria-hidden="true"
                    >GIF 원본 열기 ↗</span
                  ><img
                    data-src="../../../../public/assets/maplestory/ataho-v2-attack-additions/20261014/previews/new-front-push-kick-south-east-effects-off.gif"
                    alt="앞 밀어차기 · 남동쪽 효과 없는 GIF"
                    width="900"
                    height="410"
                    loading="lazy"
                    hidden
                    decoding="async"
                /></a>
                <p>준비·접촉·회수와 외형 전환을 비교해 주세요.</p>
                <small>0.755초 · 1타 · 반복 간격 포함</small>
              </article>
              <article>
                <h3>앞 밀어차기 · 북동쪽</h3>
                <a
                  href="../../../../public/assets/maplestory/ataho-v2-attack-additions/20261014/previews/new-front-push-kick-north-east-effects-off.gif"
                  class="gif-preview"
                  aria-label="앞 밀어차기 · 북동쪽 GIF 원본 열기"
                  style="aspect-ratio: 900 / 410"
                  ><span
                    class="gif-placeholder"
                    data-gif-placeholder
                    aria-hidden="true"
                    >GIF 원본 열기 ↗</span
                  ><img
                    data-src="../../../../public/assets/maplestory/ataho-v2-attack-additions/20261014/previews/new-front-push-kick-north-east-effects-off.gif"
                    alt="앞 밀어차기 · 북동쪽 효과 없는 GIF"
                    width="900"
                    height="410"
                    loading="lazy"
                    hidden
                    decoding="async"
                /></a>
                <p>준비·접촉·회수와 외형 전환을 비교해 주세요.</p>
                <small>0.755초 · 1타 · 반복 간격 포함</small>
              </article>
              <article>
                <h3>가로 팔꿈치 치기 · 남동쪽</h3>
                <a
                  href="../../../../public/assets/maplestory/ataho-v2-attack-additions/20261014/previews/new-horizontal-elbow-south-east-effects-off.gif"
                  class="gif-preview"
                  aria-label="가로 팔꿈치 치기 · 남동쪽 GIF 원본 열기"
                  style="aspect-ratio: 900 / 410"
                  ><span
                    class="gif-placeholder"
                    data-gif-placeholder
                    aria-hidden="true"
                    >GIF 원본 열기 ↗</span
                  ><img
                    data-src="../../../../public/assets/maplestory/ataho-v2-attack-additions/20261014/previews/new-horizontal-elbow-south-east-effects-off.gif"
                    alt="가로 팔꿈치 치기 · 남동쪽 효과 없는 GIF"
                    width="900"
                    height="410"
                    loading="lazy"
                    hidden
                    decoding="async"
                /></a>
                <p>
                  첫 결과는 팔꿈치 돌출이 약하다. 두 번째 결과는 북동쪽이
                  앞모습으로 돌아가며 남동쪽 팔 윤곽에 큰 띠 모양이 생겼다. 두
                  결과 모두 최종 채택 전이다.
                </p>
                <small>0.730초 · 1타 · 반복 간격 포함</small>
              </article>
              <article>
                <h3>가로 팔꿈치 치기 · 북동쪽</h3>
                <a
                  href="../../../../public/assets/maplestory/ataho-v2-attack-additions/20261014/previews/new-horizontal-elbow-north-east-effects-off.gif"
                  class="gif-preview"
                  aria-label="가로 팔꿈치 치기 · 북동쪽 GIF 원본 열기"
                  style="aspect-ratio: 900 / 410"
                  ><span
                    class="gif-placeholder"
                    data-gif-placeholder
                    aria-hidden="true"
                    >GIF 원본 열기 ↗</span
                  ><img
                    data-src="../../../../public/assets/maplestory/ataho-v2-attack-additions/20261014/previews/new-horizontal-elbow-north-east-effects-off.gif"
                    alt="가로 팔꿈치 치기 · 북동쪽 효과 없는 GIF"
                    width="900"
                    height="410"
                    loading="lazy"
                    hidden
                    decoding="async"
                /></a>
                <p>
                  첫 결과는 팔꿈치 돌출이 약하다. 두 번째 결과는 북동쪽이
                  앞모습으로 돌아가며 남동쪽 팔 윤곽에 큰 띠 모양이 생겼다. 두
                  결과 모두 최종 채택 전이다.
                </p>
                <small>0.730초 · 1타 · 반복 간격 포함</small>
              </article>
              <article>
                <h3>양손 밀어치기 · 남동쪽</h3>
                <a
                  href="../../../../public/assets/maplestory/ataho-v2-attack-additions/20261014/previews/new-double-palm-south-east-effects-off.gif"
                  class="gif-preview"
                  aria-label="양손 밀어치기 · 남동쪽 GIF 원본 열기"
                  style="aspect-ratio: 900 / 410"
                  ><span
                    class="gif-placeholder"
                    data-gif-placeholder
                    aria-hidden="true"
                    >GIF 원본 열기 ↗</span
                  ><img
                    data-src="../../../../public/assets/maplestory/ataho-v2-attack-additions/20261014/previews/new-double-palm-south-east-effects-off.gif"
                    alt="양손 밀어치기 · 남동쪽 효과 없는 GIF"
                    width="900"
                    height="410"
                    loading="lazy"
                    hidden
                    decoding="async"
                /></a>
                <p>
                  남동쪽 두 손이 겹친다. 같은 구간의 역순으로 회수를 구성했다.
                </p>
                <small>0.840초 · 1타 · 반복 간격 포함</small>
              </article>
              <article>
                <h3>양손 밀어치기 · 북동쪽</h3>
                <a
                  href="../../../../public/assets/maplestory/ataho-v2-attack-additions/20261014/previews/new-double-palm-north-east-effects-off.gif"
                  class="gif-preview"
                  aria-label="양손 밀어치기 · 북동쪽 GIF 원본 열기"
                  style="aspect-ratio: 900 / 410"
                  ><span
                    class="gif-placeholder"
                    data-gif-placeholder
                    aria-hidden="true"
                    >GIF 원본 열기 ↗</span
                  ><img
                    data-src="../../../../public/assets/maplestory/ataho-v2-attack-additions/20261014/previews/new-double-palm-north-east-effects-off.gif"
                    alt="양손 밀어치기 · 북동쪽 효과 없는 GIF"
                    width="900"
                    height="410"
                    loading="lazy"
                    hidden
                    decoding="async"
                /></a>
                <p>
                  남동쪽 두 손이 겹친다. 같은 구간의 역순으로 회수를 구성했다.
                </p>
                <small>0.840초 · 1타 · 반복 간격 포함</small>
              </article>
              <article>
                <h3>발이 보이는 하단 쓸기 · 남동쪽</h3>
                <a
                  href="../../../../public/assets/maplestory/ataho-v2-attack-additions/20261014/previews/new-visible-low-sweep-south-east-effects-off.gif"
                  class="gif-preview"
                  aria-label="발이 보이는 하단 쓸기 · 남동쪽 GIF 원본 열기"
                  style="aspect-ratio: 900 / 410"
                  ><span
                    class="gif-placeholder"
                    data-gif-placeholder
                    aria-hidden="true"
                    >GIF 원본 열기 ↗</span
                  ><img
                    data-src="../../../../public/assets/maplestory/ataho-v2-attack-additions/20261014/previews/new-visible-low-sweep-south-east-effects-off.gif"
                    alt="발이 보이는 하단 쓸기 · 남동쪽 효과 없는 GIF"
                    width="900"
                    height="410"
                    loading="lazy"
                    hidden
                    decoding="async"
                /></a>
                <p>
                  공격 발이 몸 밖에 보이지만 낮추는 폭이 작고 두 방향 모두 화면
                  왼쪽으로 쓴다.
                </p>
                <small>0.795초 · 1타 · 반복 간격 포함</small>
              </article>
              <article>
                <h3>발이 보이는 하단 쓸기 · 북동쪽</h3>
                <a
                  href="../../../../public/assets/maplestory/ataho-v2-attack-additions/20261014/previews/new-visible-low-sweep-north-east-effects-off.gif"
                  class="gif-preview"
                  aria-label="발이 보이는 하단 쓸기 · 북동쪽 GIF 원본 열기"
                  style="aspect-ratio: 900 / 410"
                  ><span
                    class="gif-placeholder"
                    data-gif-placeholder
                    aria-hidden="true"
                    >GIF 원본 열기 ↗</span
                  ><img
                    data-src="../../../../public/assets/maplestory/ataho-v2-attack-additions/20261014/previews/new-visible-low-sweep-north-east-effects-off.gif"
                    alt="발이 보이는 하단 쓸기 · 북동쪽 효과 없는 GIF"
                    width="900"
                    height="410"
                    loading="lazy"
                    hidden
                    decoding="async"
                /></a>
                <p>
                  공격 발이 몸 밖에 보이지만 낮추는 폭이 작고 두 방향 모두 화면
                  왼쪽으로 쓴다.
                </p>
                <small>0.795초 · 1타 · 반복 간격 포함</small>
              </article>
            </div>
            <p class="record-link">
              <a
                href="../../../../resources/ataho-v2-attack-additions-generation.json"
                >이 묶음의 원본·제작 기록</a
              >
            </p>
          </div>
        </details>
        <details
          id="hybrid-attacks"
          class="review-group"
          data-review-scope="production-records"
        >
          <summary>
            <span>제작 당시 기존·새 공격 연계</span
            ><span class="group-count">2 GIF</span>
          </summary>
          <div class="review-group-body">
            <p class="archive-note">
              제작 당시 그림과 박자를 남긴 기록입니다. 현재 공격 목록이나 최종
              채택 상태와는 별도로 봐 주세요.
            </p>
            <div class="preview-grid">
              <article>
                <h3>원투 → 가로 팔꿈치 · 3타</h3>
                <a
                  href="../../../../public/assets/maplestory/ataho-v2-attack-additions/20261014/previews/one-two-horizontal-elbow-effects-off.gif"
                  class="gif-preview"
                  aria-label="원투 → 가로 팔꿈치 · 3타 GIF 원본 열기"
                  style="aspect-ratio: 900 / 410"
                  ><span
                    class="gif-placeholder"
                    data-gif-placeholder
                    aria-hidden="true"
                    >GIF 원본 열기 ↗</span
                  ><img
                    data-src="../../../../public/assets/maplestory/ataho-v2-attack-additions/20261014/previews/one-two-horizontal-elbow-effects-off.gif"
                    alt="원투 → 가로 팔꿈치 · 3타 효과 없는 GIF"
                    width="900"
                    height="410"
                    loading="lazy"
                    hidden
                    decoding="async"
                /></a>
                <p>
                  첫 결과는 팔꿈치 돌출이 약하다. 두 번째 결과는 북동쪽이
                  앞모습으로 돌아가며 남동쪽 팔 윤곽에 큰 띠 모양이 생겼다. 두
                  결과 모두 최종 채택 전이다.
                </p>
                <small>1.310초 · 3타 · 반복 간격 포함</small>
              </article>
              <article>
                <h3>앞 밀어차기 → 재진입 원투 · 3타</h3>
                <a
                  href="../../../../public/assets/maplestory/ataho-v2-attack-additions/20261014/previews/push-kick-reentry-one-two-effects-off.gif"
                  class="gif-preview"
                  aria-label="앞 밀어차기 → 재진입 원투 · 3타 GIF 원본 열기"
                  style="aspect-ratio: 900 / 410"
                  ><span
                    class="gif-placeholder"
                    data-gif-placeholder
                    aria-hidden="true"
                    >GIF 원본 열기 ↗</span
                  ><img
                    data-src="../../../../public/assets/maplestory/ataho-v2-attack-additions/20261014/previews/push-kick-reentry-one-two-effects-off.gif"
                    alt="앞 밀어차기 → 재진입 원투 · 3타 효과 없는 GIF"
                    width="900"
                    height="410"
                    loading="lazy"
                    hidden
                    decoding="async"
                /></a>
                <p>준비·접촉·회수와 외형 전환을 비교해 주세요.</p>
                <small>1.555초 · 3타 · 반복 간격 포함</small>
              </article>
            </div>
            <p class="record-link">
              <a
                href="../../../../resources/ataho-v2-attack-additions-generation.json"
                >이 묶음의 원본·제작 기록</a
              >
            </p>
          </div>
        </details>
        <details
          id="elbow-alternatives"
          class="review-group"
          data-review-scope="production-records"
        >
          <summary>
            <span>팔꿈치·두 번째 생성 비교</span
            ><span class="group-count">2 GIF</span>
          </summary>
          <div class="review-group-body">
            <p class="archive-note">
              제작 당시 그림과 박자를 남긴 기록입니다. 현재 공격 목록이나 최종
              채택 상태와는 별도로 봐 주세요.
            </p>
            <div class="preview-grid">
              <article>
                <h3>가로 팔꿈치 · 2차 · 북동쪽</h3>
                <a
                  href="../../../../public/assets/maplestory/ataho-v2-attack-additions/20261014/previews/comparison-horizontal-elbow-alternative-north-east-effects-off.gif"
                  class="gif-preview"
                  aria-label="가로 팔꿈치 · 2차 · 북동쪽 GIF 원본 열기"
                  style="aspect-ratio: 900 / 410"
                  ><span
                    class="gif-placeholder"
                    data-gif-placeholder
                    aria-hidden="true"
                    >GIF 원본 열기 ↗</span
                  ><img
                    data-src="../../../../public/assets/maplestory/ataho-v2-attack-additions/20261014/previews/comparison-horizontal-elbow-alternative-north-east-effects-off.gif"
                    alt="가로 팔꿈치 · 2차 · 북동쪽 효과 없는 GIF"
                    width="900"
                    height="410"
                    loading="lazy"
                    hidden
                    decoding="async"
                /></a>
                <p>
                  두 번째 생성 원본입니다. 팔 윤곽과 몸 방향 오류가 있어
                  비교용으로 보존합니다.
                </p>
                <small>1.040초 · 0타 · 반복 간격 포함</small>
              </article>
              <article>
                <h3>가로 팔꿈치 · 2차 · 남동쪽</h3>
                <a
                  href="../../../../public/assets/maplestory/ataho-v2-attack-additions/20261014/previews/comparison-horizontal-elbow-alternative-south-east-effects-off.gif"
                  class="gif-preview"
                  aria-label="가로 팔꿈치 · 2차 · 남동쪽 GIF 원본 열기"
                  style="aspect-ratio: 900 / 410"
                  ><span
                    class="gif-placeholder"
                    data-gif-placeholder
                    aria-hidden="true"
                    >GIF 원본 열기 ↗</span
                  ><img
                    data-src="../../../../public/assets/maplestory/ataho-v2-attack-additions/20261014/previews/comparison-horizontal-elbow-alternative-south-east-effects-off.gif"
                    alt="가로 팔꿈치 · 2차 · 남동쪽 효과 없는 GIF"
                    width="900"
                    height="410"
                    loading="lazy"
                    hidden
                    decoding="async"
                /></a>
                <p>
                  두 번째 생성 원본입니다. 팔 윤곽과 몸 방향 오류가 있어
                  비교용으로 보존합니다.
                </p>
                <small>1.040초 · 0타 · 반복 간격 포함</small>
              </article>
            </div>
            <p class="record-link">
              <a
                href="../../../../resources/ataho-v2-attack-additions-generation.json"
                >이 묶음의 원본·제작 기록</a
              >
            </p>
          </div>
        </details>
        <details
          id="smear-attacks"
          class="review-group"
          data-review-scope="production-records"
        >
          <summary>
            <span>궤적 공격·남동쪽 원본</span
            ><span class="group-count">2 GIF</span>
          </summary>
          <div class="review-group-body">
            <p class="archive-note">
              제작 당시 그림과 박자를 남긴 기록입니다. 현재 공격 목록이나 최종
              채택 상태와는 별도로 봐 주세요.
            </p>
            <p>
              팔이 이동 경로처럼 이어지는 중간 자세와 타격 뒤 회수를 비교해
              주세요.
            </p>
            <div class="preview-grid">
              <article>
                <h3>크게 감아치는 훅 · 남동쪽</h3>
                <a
                  href="../../../../public/assets/maplestory/ataho-v2-smear-attacks/20261015/previews/new-smear-hook-south-east-effects-off.gif"
                  class="gif-preview"
                  aria-label="크게 감아치는 훅 · 남동쪽 GIF 원본 열기"
                  style="aspect-ratio: 900 / 410"
                  ><span
                    class="gif-placeholder"
                    data-gif-placeholder
                    aria-hidden="true"
                    >GIF 원본 열기 ↗</span
                  ><img
                    data-src="../../../../public/assets/maplestory/ataho-v2-smear-attacks/20261015/previews/new-smear-hook-south-east-effects-off.gif"
                    alt="크게 감아치는 훅 · 남동쪽 효과 없는 GIF"
                    width="900"
                    height="410"
                    loading="lazy"
                    hidden
                    decoding="async"
                /></a>
                <p>
                  짧은 가로 띠 뒤 주먹이 멈추고 회수됩니다. 준비 중 몸통 회전과
                  띠의 형체는 검토 항목입니다.
                </p>
              </article>
              <article>
                <h3>대각 망치주먹 · 남동쪽</h3>
                <a
                  href="../../../../public/assets/maplestory/ataho-v2-smear-attacks/20261015/previews/new-smear-hammerfist-south-east-effects-off.gif"
                  class="gif-preview"
                  aria-label="대각 망치주먹 · 남동쪽 GIF 원본 열기"
                  style="aspect-ratio: 900 / 410"
                  ><span
                    class="gif-placeholder"
                    data-gif-placeholder
                    aria-hidden="true"
                    >GIF 원본 열기 ↗</span
                  ><img
                    data-src="../../../../public/assets/maplestory/ataho-v2-smear-attacks/20261015/previews/new-smear-hammerfist-south-east-effects-off.gif"
                    alt="대각 망치주먹 · 남동쪽 효과 없는 GIF"
                    width="900"
                    height="410"
                    loading="lazy"
                    hidden
                    decoding="async"
                /></a>
                <p>
                  짧은 대각 띠 뒤 낮은 주먹을 유지하고 회수합니다. 준비 주먹이
                  높이 올라가지 않는 한계가 남습니다.
                </p>
              </article>
            </div>
            <p class="record-link">
              <a
                href="../../../../resources/ataho-v2-smear-attacks-generation.json"
                >이 묶음의 원본·제작 기록</a
              >
            </p>
          </div>
        </details>
        <details
          id="sources"
          class="review-group"
          data-review-scope="production-records"
        >
          <summary>
            <span>출처·원본 생성 기록</span
            ><span class="group-count">참고 링크</span>
          </summary>
          <div class="review-group-body">
            <h3>기술 레퍼런스</h3>
            <p>
              <a href="../../../../resources/ataho-v2-finishers.json"
                >연타 필살기 4종 · 참고 영상·재구성·검증 기록</a
              >
            </p>
            <p>
              <a
                href="https://evolve-mma.com/blog/the-complete-guide-to-the-muay-thai-push-kick/"
                >앞 밀어차기 · Evolve</a
              >
              ·
              <a
                href="https://evolve-mma.com/blog/how-to-use-elbows-to-improve-your-clinch-game-for-mma/"
                >수평 팔꿈치 · Evolve</a
              >
              ·
              <a href="https://shaolin.org/review/fell-tree02.html"
                >양손 밀어치기 · Shaolin Wahnam</a
              >
              ·
              <a href="https://boxingtrainer.london/how-to-throw-a-hook/"
                >훅 · Paul Carroll</a
              >
              ·
              <a
                href="https://www.taekwondopreschool.com/tutorial_strike18.html"
                >하향 망치주먹 · 태권도 동작 도해</a
              >
              ·
              <a href="https://www.kungfuschoolchina.com/post/sweep-kicks"
                >하단 쓸기 · Xing Long</a
              >
            </p>
            <p>
              <a
                href="../../../../resources/ataho-v2-attack-additions-generation.json"
                >원본·요청·비용·GIF 기록</a
              >
            </p>
            <p>
              <a
                href="../../../../resources/ataho-v2-smear-attacks-generation.json"
                >남동쪽 궤적 공격 원본·요청·비용·검증 기록</a
              >
            </p>
          </div>
        </details>
      </section>
      <footer class="review-footer">
        <button type="button" data-close-reference>동작 조합실로 돌아가기</button
        ><span>GIF 이름이나 이미지를 누르면 원본을 엽니다.</span>
      </footer>
    </div>`;
