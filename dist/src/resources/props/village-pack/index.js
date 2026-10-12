import { resourceUrl } from '../../catalog/resource-url.js';
import { PackStage } from './stage.js';
import { residents, residentGroups, professionProps, stateProps, statePairs, } from './pack.js';
const root = document.querySelector('#pack');
if (!root)
    throw new Error('마을 리소스 화면이 없습니다.');
function image(entry) {
    return `<img class="pixel" src="${resourceUrl(entry.frame.localPath).href}" alt="${entry.label}" style="width:${entry.frame.width * 2}px"/>`;
}
function residentCard(entry) {
    if (!entry.conceptPath)
        throw new Error(`주민 원화 경로가 없습니다: ${entry.key}`);
    const firstImage = entry.previousPath
        ? `<img class="pixel previous-resident" src="${resourceUrl(entry.previousPath).href}" alt="${entry.label} 이전 정면"/>`
        : `<img src="${resourceUrl(entry.conceptPath).href}" alt="${entry.label} 원화 시안"/>`;
    return `<article class="resident-card"><h3>${entry.label}</h3><div class="resident-images"><figure>${firstImage}<figcaption>${entry.previousPath ? '이전' : '원화 시안'}</figcaption></figure><figure>${image(entry)}<figcaption>${entry.previousPath ? '직업 강조' : '정면 도트'}</figcaption></figure></div><p>정면 시안 · 방향과 모션은 외형 선택 후 제작</p><a class="resource-link" href="${resourceUrl(entry.frame.localPath).href}">정면 PNG 원본 크기로 보기 →</a><a class="resource-link" href="${resourceUrl(entry.conceptPath).href}">원화 원본 보기 →</a></article>`;
}
const residentEntries = residents();
root.querySelector('.resident-groups').innerHTML = residentGroups
    .map(({ id, label }) => `<section class="resident-group" id="residents-${id}"><h3>${label}</h3><div class="resident-grid">${residentEntries
    .filter((entry) => entry.village === id)
    .map(residentCard)
    .join('')}</div></section>`)
    .join('');
for (const previous of root.querySelectorAll('.previous-resident')) {
    const resize = () => {
        previous.style.width = `${previous.naturalWidth * 2}px`;
    };
    if (previous.complete)
        resize();
    else
        previous.addEventListener('load', resize, { once: true });
}
root.querySelector('.prop-grid').innerHTML = professionProps()
    .map((entry) => `<article class="prop-card"><h3>${entry.label}</h3><div class="prop-image">${image(entry)}</div><a class="resource-link" href="${resourceUrl(entry.frame.localPath).href}">${entry.frame.width} × ${entry.frame.height} · PNG 보기 →</a></article>`)
    .join('');
const states = new Map(stateProps().map((entry) => [entry.key, entry]));
root.querySelector('.pair-grid').innerHTML = statePairs
    .map((pair) => `<article class="pair-card"><h3>${pair.label}</h3><div class="pair-images">${['before', 'after']
    .map((mode) => {
    const entry = states.get(pair[mode]);
    return `<figure data-state="${mode}" data-selected="${mode === 'before'}"><div class="prop-image">${image(entry)}</div><figcaption>${mode === 'before' ? '작업 전' : '작업 후'} · ${entry.label}</figcaption></figure>`;
})
    .join('')}</div></article>`)
    .join('');
const stage = new PackStage(root.querySelector('#scene'));
for (const button of root.querySelectorAll('[data-mode]'))
    button.addEventListener('click', () => {
        const mode = button.dataset.mode === 'after' ? 'after' : 'before';
        stage.showState(mode);
        for (const item of root.querySelectorAll('[data-mode]'))
            item.setAttribute('aria-pressed', String(item.dataset.mode === mode));
        for (const figure of root.querySelectorAll('[data-state]'))
            figure.dataset.selected = String(figure.dataset.state === mode);
    });
