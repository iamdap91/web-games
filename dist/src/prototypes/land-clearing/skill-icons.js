import { energyRules } from './harvest-energy.js';
// 옆에서 본 네 손가락의 접힌 면과 감싼 엄지를 나눠, 작게 보여도 주먹으로 읽히게 한다.
const fist = `<path d="M4 12h8l5-4c1-1 3-1 4 0l4 3h3c3 0 4 3 2 5 2 1 2 3 0 5 1 2 0 4-2 4-1 2-2 3-5 3h-5l-7-5H4z" fill="currentColor"/><path d="M23 15h7m-7 5h7m-8 5h6M12 14l6-2c2 0 4 2 3 4l-2 3-5 1" class="skill-cut"/><path d="M9 12v11" class="skill-cut"/>`;
const artwork = {
    slam: `<g transform="translate(8 -1) rotate(90 16 16)">${fist}</g><path d="m10 32 9 4-5 4m24-8-9 4 5 4M24 35v8M5 42h8m22 0h8"/><path d="m21 30 3 4 3-4" fill="currentColor"/>`,
    rush: `<g transform="translate(11 4)">${fist}</g><path d="M4 13h11M2 21h9m-5 8h10M10 38h28l-5-5m5 5-5 5"/>`,
    weakStrike: `<path d="m6 34 5-9 13-2 11 10-4 11H10z" fill="currentColor" fill-opacity=".28"/><path d="m6 34 5-9 13-2 11 10-4 11H10z"/><path d="m24 24-6 9 7 1-6 10" stroke-width="3"/><g transform="translate(18 4) scale(.85) rotate(125 16 16)">${fist}</g><path d="m14 20-3-4m4 9-6-1m25 5 5-1"/>`,
    energy: `<path d="M17 3c2 7-5 7-2 12 2-1 4-3 4-6 6 5 8 10 5 15-4 7-16 7-19 0-3-6 2-11 6-15-1 6 1 7 2 8-2-7 4-9 4-14z" fill="currentColor" fill-opacity=".35"/><path d="M17 3c2 7-5 7-2 12 2-1 4-3 4-6 6 5 8 10 5 15-4 7-16 7-19 0-3-6 2-11 6-15-1 6 1 7 2 8-2-7 4-9 4-14z"/>`,
    lock: `<rect x="7" y="14" width="18" height="14" rx="2"/><path d="M11 14V9a5 5 0 0 1 10 0v5m-5 5v4"/>`,
};
export function skillIcon(name) {
    const viewBox = name === 'energy' || name === 'lock' ? '0 0 32 32' : '0 0 48 48';
    return `<svg class="skill-icon" viewBox="${viewBox}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${artwork[name]}</svg>`;
}
export function energyCost(cost) {
    const segments = Array.from({ length: energyRules.capacity }, (_, index) => `<i${index < cost ? ' class="required"' : ''}></i>`).join('');
    return `<span class="skill-cost" aria-hidden="true">${segments}</span>`;
}
export const holdKey = `<span class="hold-key" aria-hidden="true"><kbd>E</kbd><svg viewBox="0 0 36 36"><circle class="hold-track" cx="18" cy="18" r="16"/><circle class="hold-fill" cx="18" cy="18" r="16" pathLength="100"/></svg></span>`;
