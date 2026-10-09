import { mountClearingPrototype } from './screen.js';
const root = document.querySelector('#clearing-root');
if (!root)
    throw new Error('채집 화면을 담을 요소가 없습니다.');
let screen = mountClearingPrototype(root);
window.addEventListener('pagehide', () => {
    screen?.dispose();
    screen = null;
});
window.addEventListener('pageshow', (event) => {
    if (event.persisted && !screen)
        screen = mountClearingPrototype(root);
});
