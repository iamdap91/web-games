import { resourceUrl } from './resource-url.js';
import { startLibrary } from './library-page.js';
/** 이전 카테고리 주소도 새 탐색 화면의 동일한 선택 상태로 연결한다. */
export function showCategory(id) {
    const url = resourceUrl('src/resources/');
    url.searchParams.set('category', id === 'backgrounds' ? 'maps' : id);
    history.replaceState(null, '', `${url.pathname}${url.search}`);
    startLibrary();
}
