import { energyCost, holdKey, skillIcon } from './skill-icons.js';
import { energyRules } from './harvest-energy.js';
export const clearingMarkup = `
<canvas id="clearing" tabindex="0" aria-label="숲속 공터. 방향키 이동, Space 공격 또는 E 짧게 눌렀다 떼기, Q 지면 강타, W 돌진, E 길게 눌렀다 떼기 약점 강타, Esc 메뉴."></canvas>
<header class="location-tag"><p>안전 채집지</p><h1>숲속 공터</h1></header>
<aside class="supplies resource-strip" aria-label="이번에 채집한 재료">
  <span class="resource-label">이번 채집</span>
  <span class="resource-count"><i class="wood-icon" aria-hidden="true"></i><span class="resource-name">목재</span><b id="wood">0</b><span id="wood-gain" class="resource-gain" aria-hidden="true" hidden></span></span>
  <span class="resource-count"><i class="stone-icon" aria-hidden="true"></i><span class="resource-name">돌</span><b id="stone">0</b><span id="stone-gain" class="resource-gain" aria-hidden="true" hidden></span></span>
</aside>
<p id="notice" class="notice" role="status" hidden></p>
<p id="target" class="target-hint" hidden></p>
<p id="grove-hint" class="grove-hint world-label" hidden><strong>바람숲</strong><span>균열바위 너머</span></p>
<button id="forest-hint" class="world-label forest-hint" type="button" hidden><strong>숲의 흔적</strong><span>Space · 살펴보기</span></button>
<p id="weak-hint" class="weak-hint world-label" hidden><span class="weak-action">${holdKey}${skillIcon('weakStrike')}${energyCost(energyRules.costs.weakStrike)}</span><span class="weak-status" hidden></span></p>
<p id="exit-hint" class="exit-hint world-label" hidden><strong>마을</strong><span>귀환 ↓</span></p>
<div class="abilities" aria-label="채집 기술">
  <div class="energy-control">
    ${skillIcon('energy')}<span id="charge-label" class="sr-only">기세 0 / ${energyRules.capacity}</span>
    <progress id="charge" value="0" max="${energyRules.capacity}" aria-label="기세"></progress>
  </div>
  <div class="skill-controls">
    <button id="slam" type="button" aria-label="Q 지면 강타, 기세 ${energyRules.costs.slam}칸" disabled><kbd>Q</kbd>${skillIcon('slam')}${energyCost(energyRules.costs.slam)}</button>
    <button id="rush" type="button" aria-label="W 돌진, 기세 ${energyRules.costs.rush}칸" disabled><kbd>W</kbd>${skillIcon('rush')}${energyCost(energyRules.costs.rush)}</button>
    <button id="weak-strike" type="button" aria-label="E 길게 눌렀다 떼기, 약점 강타, 기세 ${energyRules.costs.weakStrike}칸" disabled>${holdKey}${skillIcon('weakStrike')}${energyCost(energyRules.costs.weakStrike)}<span class="skill-lock" hidden>${skillIcon('lock')}</span></button>
  </div>
</div>
<button id="menu" class="menu-toggle" type="button">메뉴</button>
<button id="reset" class="reset" type="button">공터 초기화 ↺</button>
<section id="overlay" class="overlay" aria-live="polite">
  <div class="card">
    <h2 id="overlay-title">숲으로 들어가는 중</h2>
    <p id="overlay-message">잠시만 기다려 주세요.</p>
  </div>
</section>
<output id="diagnostics" hidden></output>
`;
