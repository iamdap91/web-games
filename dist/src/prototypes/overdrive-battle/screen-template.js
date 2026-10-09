// 독립 프로토타입과 본게임이 같은 전투 화면을 사용한다.
export const battleMarkup = `
<div class="battle-viewport">
    <main id="battle-screen" data-phase="command">
      <canvas
        id="battle"
        tabindex="0"
        aria-label="산길의 결투. 위아래 방향키로 행동을 고르고 Space로 선택합니다. 기술은 오른쪽 방향키로도 목록을 엽니다. 기술창에서 왼쪽 방향키 또는 Esc로 돌아갑니다. 단일 공격은 방향키로 적을 고르고 Space로 실행합니다. 선풍각은 방향키 또는 마우스로 바닥 범위를 지정하고 Space 또는 클릭으로 실행합니다. 분노가 가득 차면 초구취호패타를 선택할 수 있습니다. Esc는 대상 선택 취소입니다. R로 오버드라이브를 발동하고 방향키로 이동, Space 또는 E를 길게 눌러 공격합니다."
      ></canvas>
      <div class="vignette" aria-hidden="true"></div>
      <header class="heading">
        <p class="eyebrow"><span class="diamond">◆</span> 산들마을 외곽</p>
        <h1>산길의 결투</h1>
      </header>
      <aside class="turn-order" aria-label="전투 순서">
        <div class="turn-heading">
          <span id="round">ROUND 01</span
          ><span id="turn-label" class="turn-label">아타호의 차례</span>
        </div>
        <div class="order-list"></div>
      </aside>
      <p id="message" class="battle-message" role="status">
        아타호의 차례. 사용할 행동을 골라보세요.
      </p>
      <div id="enemy-labels" class="enemy-labels" aria-label="공격 대상"></div>
      <div id="damage-labels" class="damage-labels" aria-hidden="true"></div>
      <div id="drive-banner" class="drive-banner" aria-hidden="true">
        <p>아직, 내 차례다!</p>
        <strong>OVERDRIVE</strong>
      </div>
      <section
        id="drive-hud"
        class="drive-hud"
        aria-label="오버드라이브"
        hidden
      >
        <div class="drive-clock">
          <span>아타호의 차례</span><strong id="drive-time">8.0</strong
          ><small>SECONDS</small>
        </div>
        <div class="drive-meter"><div id="drive-time-fill"></div></div>
        <div class="combo">
          <strong id="hit-count">0</strong><span>HITS</span
          ><b id="drive-damage">0 피해</b>
        </div>
        <p>
          <kbd>방향키</kbd> 이동 <span>·</span> <kbd>Space</kbd>/<kbd>E</kbd>
          길게 눌러 연속 공격
        </p>
        <small id="drive-rule" class="drive-rule">0 / 4 · 회전 강타</small>
      </section>
      <div id="ultimate-title" class="ultimate-title" aria-hidden="true" hidden>
        <small>아타호 비기</small><strong>초구취호패타</strong>
      </div>
      <div id="return-summary" class="return-summary" hidden></div>
      <section id="command-panel" class="command-panel" aria-label="전투 명령">
        <p class="command-heading">
          <span>아타호</span><span id="selection-step">행동 선택</span>
        </p>
        <div class="commands">
          <button id="attack" type="button">
            <span class="command-cursor" aria-hidden="true">▸</span
            ><strong>공격</strong><small>기력 +2</small>
          </button>
          <button
            id="skill"
            type="button"
            aria-expanded="false"
            aria-controls="skill-panel"
          >
            <span class="command-cursor" aria-hidden="true">▸</span
            ><strong>기술</strong><small>목록 ▸</small>
          </button>
          <button id="guard" type="button">
            <span class="command-cursor" aria-hidden="true">▸</span
            ><strong>방어</strong><small>피해 ½ · 기력 +4</small>
          </button>
          <button id="ultimate" class="rage-command" type="button" hidden>
            <span class="rage-claws" aria-hidden="true"
              ><i></i><i></i><i></i
            ></span>
            <span class="command-cursor" aria-hidden="true">▸</span
            ><strong>초구취호패타</strong><small>분노 소모</small>
          </button>
        </div>
        <section
          id="skill-panel"
          class="skill-panel"
          aria-label="아타호 기술"
          hidden
        >
          <div class="skill-heading">
            <strong>기술</strong
            ><button id="skill-back" type="button" aria-label="기술 목록 닫기">
              ← 뒤로
            </button>
          </div>
          <div id="skill-list" class="skill-list"></div>
          <p id="skill-description" class="skill-description"></p>
          <p class="skill-hint">↑↓ 이동 · Space 선택</p>
        </section>
        <div class="target-hint">
          <span id="target-name">방향키 이동 · Space 선택</span>
          <button id="cancel-target" type="button" hidden>
            <kbd>Esc</kbd> 취소
          </button>
        </div>
      </section>
      <section id="battle-dock" class="battle-dock" aria-label="아타호 상태">
        <div class="hero-status">
          <div class="overdrive-card">
            <progress
              id="gauge"
              class="gauge-meter"
              max="100"
              value="100"
              aria-label="아타호 오버드라이브 게이지"
            ></progress>
            <button
              id="overdrive"
              class="overdrive-trigger"
              type="button"
              aria-label="아타호 오버드라이브 발동 (R)"
              aria-keyshortcuts="R"
              aria-describedby="gauge-label"
              disabled
            >
              <span class="overdrive-caption">
                <strong>OVERDRIVE</strong><span id="gauge-label">100%</span>
              </span>
              <kbd id="overdrive-key" aria-hidden="true">R</kbd>
              <span class="overdrive-track" aria-hidden="true">
                <span class="overdrive-fill"></span>
                <span class="overdrive-sheen"></span>
              </span>
            </button>
          </div>
          <div class="hero-card">
            <div class="portrait">
              <img
                src="${new URL('../../../../public/assets/maplestory/ataho/frames/battle-1-6.png', import.meta.url).href}"
                alt=""
              />
            </div>
            <div class="hero-stats">
              <p class="hero-name">아타호 <span>무투가</span></p>
              <p id="drunken-status" class="drunken-status" hidden></p>
              <div class="stat-label">
                <span>체력</span><b id="health-label">180 / 180</b>
              </div>
              <progress
                id="health"
                max="180"
                value="180"
                aria-label="아타호 체력"
              ></progress>
              <div class="stat-label energy">
                <span>기력</span><b id="energy-label">12 / 12</b>
              </div>
              <progress
                id="energy"
                class="energy-meter"
                max="12"
                value="12"
                aria-label="아타호 기력"
              ></progress>
            </div>
          </div>
          <div class="rage-gauge empty" title="분노: 피격과 턴 진행으로 충전">
            <progress
              id="rage"
              class="gauge-meter"
              max="100"
              value="0"
              aria-label="분노 게이지"
            ></progress>
            <div class="rage-fill" aria-hidden="true">
              <span class="rage-embers"></span>
            </div>
          </div>
        </div>
      </section>
      <footer>
        <span id="footer-hint">방향키 이동 · Space 선택</span>
        <div>
          <button
            id="dev-toggle"
            type="button"
            aria-expanded="false"
            aria-controls="dev-panel"
          >
            개발
          </button>
          <button id="sound" type="button" aria-pressed="false">소리 켬</button
          ><button id="reset" type="button">다시 대결 <span>↻</span></button>
        </div>
      </footer>
      <section
        id="dev-panel"
        class="dev-panel"
        aria-labelledby="dev-title"
        hidden
      >
        <div class="dev-heading">
          <h2 id="dev-title">게이지 조절</h2>
          <button id="dev-close" type="button" aria-label="개발 탭 닫기">
            닫기
          </button>
        </div>
        <div class="dev-gauge">
          <label for="dev-rage"
            >분노 <output id="dev-rage-value" for="dev-rage">0%</output></label
          >
          <input
            id="dev-rage"
            type="range"
            min="0"
            max="100"
            step="1"
            value="0"
          />
          <div
            id="dev-rage-presets"
            class="dev-presets"
            role="group"
            aria-label="분노 빠른 설정"
          >
            <button type="button" value="0">0</button>
            <button type="button" value="50">50</button>
            <button type="button" value="100">100</button>
          </div>
        </div>
        <div class="dev-gauge">
          <label for="dev-overdrive"
            >오버드라이브
            <output id="dev-overdrive-value" for="dev-overdrive"
              >100%</output
            ></label
          >
          <input
            id="dev-overdrive"
            type="range"
            min="0"
            max="100"
            step="1"
            value="100"
          />
          <div
            id="dev-overdrive-presets"
            class="dev-presets"
            role="group"
            aria-label="오버드라이브 빠른 설정"
          >
            <button type="button" value="0">0</button>
            <button type="button" value="50">50</button>
            <button type="button" value="100">100</button>
          </div>
        </div>
        <p>즉시 반영 · 다시 대결 시 초기화</p>
      </section>
      <div id="shards" class="shards" aria-hidden="true"></div>
      <section id="overlay" class="overlay" aria-live="polite">
        <div class="overlay-card">
          <p class="eyebrow">산길의 결투</p>
          <h2 id="overlay-title">대결 준비 중</h2>
          <p id="overlay-message">아타호와 숲의 손님들을 불러오고 있어요.</p>
          <button id="resume" type="button" hidden>계속하기</button
          ><button id="retry" type="button" hidden>다시 대결</button>
          <button id="return" type="button" hidden>마을로 돌아가기</button>
        </div>
      </section>
      <output id="diagnostics" hidden></output>
    </main>
</div>
`;
