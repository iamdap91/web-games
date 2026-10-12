import { resourceUrl } from './resource-url.js';
const scenePaths = new Set([
    'src/resources/maps/expedition-atlas/',
    'src/resources/maps/regional-villages/',
    'src/resources/facilities/basecamp/',
]);
/** 독립 입체 뷰어가 있는 코드 리소스만 내부 장면으로 연다. */
export function libraryScenePath(entry) {
    if (entry.asset || !entry.previewPath)
        return undefined;
    return scenePaths.has(entry.previewPath.split('?')[0])
        ? resourceUrl(entry.previewPath).href
        : undefined;
}
/** 입체 뷰어의 문서·입력을 격리하고 부모 상세 선택과 수명을 연결한다. */
export class LibraryScene {
    frame = document.createElement('iframe');
    events = new AbortController();
    path;
    constructor(entry, onSelection) {
        const path = libraryScenePath(entry);
        if (!path)
            throw new Error(`내부 장면이 없습니다: ${entry.id}`);
        const url = new URL(path, location.origin);
        this.path = url.pathname;
        url.searchParams.set('embed', '1');
        this.frame.src = url.href;
        this.frame.className = 'library-scene';
        this.frame.classList.toggle('facility-scene', entry.category === 'facilities');
        this.describe(entry);
        window.addEventListener('message', (event) => {
            if (event.origin !== location.origin ||
                event.source !== this.frame.contentWindow)
                return;
            const data = event.data;
            if (typeof data !== 'object' ||
                data === null ||
                !('type' in data) ||
                data.type !== 'resource-scene-selection' ||
                !('assetId' in data) ||
                typeof data.assetId !== 'string')
                return;
            onSelection(data.assetId);
        }, { signal: this.events.signal });
    }
    mount(container) {
        container.replaceChildren(this.frame);
    }
    accepts(entry) {
        const path = libraryScenePath(entry);
        return !!path && new URL(path, location.origin).pathname === this.path;
    }
    describe(entry) {
        this.frame.title = `${entry.name} · 입체 장면 미리보기`;
    }
    destroy() {
        this.events.abort();
        // 문서를 제거하기 전에 실행 루프와 WebGL 리소스의 소유자에게 동기 종료를 알린다.
        try {
            this.frame.contentWindow?.dispatchEvent(new Event('resource-scene-dispose'));
        }
        finally {
            this.frame.remove();
        }
    }
}
