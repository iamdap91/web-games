import { resourceUrl } from './resource-url.js';
const scenePaths = new Set([
    'src/resources/characters/ataho-hybrid/index.html',
    'src/resources/maps/village-style-natural/',
    'src/resources/maps/village-style-pixel2d/',
    'src/resources/maps/village-style-hd2d/',
    'src/resources/maps/village-style-voxel/',
    'src/resources/maps/village-style-paper/',
    'src/resources/maps/village-style-painted/',
    'src/resources/maps/village-style-toy/',
    'src/resources/maps/village-style-diorama/',
    'src/resources/maps/village-style-retro/',
    'src/resources/maps/village-style-line/',
    'src/resources/maps/village-style-side/',
    'src/resources/maps/village-style-cutaway/',
    'src/resources/maps/village-style-collage/',
    'src/resources/maps/village-style-modular/',
    'src/resources/maps/village-style-limited/',
    'src/resources/maps/village-style-horizon/',
    'src/resources/maps/village-style-stopmotion/',
    'src/resources/maps/village-style-lit2d/',
    'src/resources/maps/village-style-mixed-dojo/',
    'src/resources/maps/village-style-mixed-forest/',
    'src/resources/maps/village-style-mixed-diorama/',
    'src/resources/maps/village-style-mixed-growth/',
    'src/resources/maps/village-style-lived-dojo/',
    'src/resources/maps/village-style-living-diorama/',
    'src/resources/maps/village-style-root-expedition/',
    'src/resources/maps/village-style-lit-street/',
    'src/resources/maps/village-style-popup-book/',
    'src/resources/maps/village-style-window-village/',
    'src/resources/maps/village-style-color-restoration/',
    'src/resources/maps/village-style-horizon-harbor/',
    'src/resources/maps/village-style-modular-assembly/',
    'src/resources/maps/village-style-voxel-linked/',
    'src/resources/maps/village-style-toy-interior/',
    'src/resources/maps/village-style-diorama-growth/',
    'src/resources/maps/village-style-paper-repair/',
    'src/resources/maps/village-style-limited-light/',
    'src/resources/maps/village-style-horizon-interior/',
    'src/resources/maps/village-style-natural-crossing/',
    'src/resources/maps/village-style-retro-cadence/',
    'src/resources/maps/village-hybrid-references/',
    'src/resources/animation-lab/procedural-creature/',
    'src/resources/animation-lab/sprite-stacking/',
    'src/resources/animation-lab/prerendered-model/',
    'src/resources/maps/expedition-atlas/',
    'src/resources/maps/regional-villages/',
    'src/resources/facilities/basecamp/',
]);
/** 독립 조작 뷰어와 아타호 작업실을 내부 장면으로 연다. */
export function libraryScenePath(entry) {
    if (!entry.previewPath)
        return undefined;
    const path = entry.previewPath.split(/[?#]/)[0];
    if (entry.asset &&
        path !== 'src/resources/characters/ataho-hybrid/index.html')
        return undefined;
    return scenePaths.has(path) ? resourceUrl(entry.previewPath).href : undefined;
}
/** 조작 뷰어의 문서·입력을 격리하고 부모 상세 선택과 수명을 연결한다. */
export class LibraryScene {
    frame = document.createElement('iframe');
    events = new AbortController();
    path;
    resize;
    constructor(entry, onSelection) {
        const path = libraryScenePath(entry);
        if (!path)
            throw new Error(`내부 장면이 없습니다: ${entry.id}`);
        const url = new URL(path, location.origin);
        this.path = url.pathname;
        url.searchParams.set('embed', '1');
        this.frame.src = url.href;
        this.frame.className = 'library-scene';
        if (entry.previewPath?.startsWith('src/resources/characters/ataho-hybrid/')) {
            this.frame.classList.add('comparison-scene');
            this.frame.setAttribute('scrolling', 'no');
            this.frame.addEventListener('load', () => this.fitComparison(), {
                signal: this.events.signal,
            });
        }
        this.frame.classList.toggle('animation-scene', entry.previewPath?.startsWith('src/resources/animation-lab/') ?? false);
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
        this.frame.title = `${entry.name} · 조작 미리보기`;
    }
    fitComparison() {
        this.resize?.disconnect();
        const main = this.frame.contentDocument?.querySelector('main');
        const child = this.frame.contentWindow;
        if (!main || !child)
            return;
        const fit = () => {
            const bottom = main.getBoundingClientRect().bottom + child.scrollY;
            const margin = parseFloat(child.getComputedStyle(main).marginBottom) || 0;
            const style = getComputedStyle(this.frame);
            const border = parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth);
            this.frame.style.height = `${Math.ceil(bottom + margin + border)}px`;
        };
        this.resize = new ResizeObserver(fit);
        this.resize.observe(main);
        fit();
    }
    destroy() {
        this.events.abort();
        this.resize?.disconnect();
        // 문서를 제거하기 전에 실행 루프와 WebGL 리소스의 소유자에게 동기 종료를 알린다.
        try {
            this.frame.contentWindow?.dispatchEvent(new Event('resource-scene-dispose'));
        }
        finally {
            this.frame.remove();
        }
    }
}
