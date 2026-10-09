import { energyRules } from './harvest-energy.js';
export const clearingMarkup = `
<canvas id="clearing" tabindex="0" aria-label="숲속 공터. 방향키 이동, Space 또는 E 공격, Q 지면 강타, W 돌진."></canvas>
<header class="location-tag"><p>안전 채집지</p><h1>숲속 공터</h1></header>
<aside class="supplies resource-strip" aria-label="이번에 채집한 재료">
  <span class="resource-label">이번 채집</span>
  <span class="resource-count"><i class="wood-icon" aria-hidden="true"></i><span class="resource-name">목재</span><b id="wood">0</b><span id="wood-gain" class="resource-gain" aria-hidden="true" hidden></span></span>
  <span class="resource-count"><i class="stone-icon" aria-hidden="true"></i><span class="resource-name">돌</span><b id="stone">0</b><span id="stone-gain" class="resource-gain" aria-hidden="true" hidden></span></span>
</aside>
<p id="notice" class="notice" role="status" hidden></p>
<p id="target" class="target-hint" hidden></p>
<p id="exit-hint" class="exit-hint" hidden>마을 <span aria-hidden="true">↓</span></p>
<div class="abilities" aria-label="채집 기술">
  <div class="energy-control">
    <span id="charge-label">기세 0 / ${energyRules.capacity}</span>
    <progress id="charge" value="0" max="${energyRules.capacity}" aria-label="기세"></progress>
  </div>
  <div class="skill-controls">
    <button id="slam" type="button" disabled><kbd>Q</kbd> 강타 <small>기세 ${energyRules.costs.slam}</small></button>
    <button id="rush" type="button" disabled><kbd>W</kbd> 돌진 <small>기세 ${energyRules.costs.rush}</small></button>
  </div>
</div>
<div class="controls"><span><kbd>방향키</kbd> 이동</span><span><kbd>Space</kbd>/<kbd>E</kbd> 공격</span><span><kbd>Esc</kbd> 쉬기</span></div>
<button id="reset" class="reset" type="button">공터 초기화 ↺</button>
<section id="overlay" class="overlay" aria-live="polite">
  <div class="card">
    <h2 id="overlay-title">숲으로 들어가는 중</h2>
    <p id="overlay-message">잠시만 기다려 주세요.</p>
    <button id="resume" type="button" hidden>계속하기</button>
  </div>
</section>
<output id="diagnostics" hidden></output>
`;
