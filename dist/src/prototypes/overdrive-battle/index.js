import { mountBattle } from './screen.js';
import { skillOrder } from './battle-skills.js';
const root = document.querySelector('#battle-root');
if (!root)
    throw new Error('전투 컨테이너가 없습니다.');
function start(root) {
    const battle = mountBattle({
        root,
        entry: {
            battleId: 'prototype',
            encounter: 'prototype',
            unlockedSkills: skillOrder,
        },
        onReturn: () => { },
    });
    // 준비 실패는 전투 화면에서 안내한다.
    void battle.ready.catch(() => { });
    return battle;
}
let screen = start(root);
window.addEventListener('pagehide', () => {
    screen?.dispose();
    screen = null;
});
window.addEventListener('pageshow', (event) => {
    if (event.persisted && !screen)
        screen = start(root);
});
