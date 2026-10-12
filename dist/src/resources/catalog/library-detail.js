import { resourceUrl } from './resource-url.js';
import { LibraryScene, libraryScenePath } from './library-scene.js';
import manifest from '../../../resources/manifest.json' with { type: 'json' };
import { libraryCategories, libraryLocation, readLibraryFilter, } from './library-data.js';
import { createCard, createText } from './resource-card.js';
import { ResourcePreview } from '../preview/preview.js';
import { showOriginals } from '../preview/originals.js';
function localLink(label, path) {
    const link = createText('a', label);
    link.href = resourceUrl(path).href;
    return link;
}
function comparisonLink(label, path, entry) {
    const link = localLink(label, path);
    const url = new URL(link.href);
    const current = new URL(location.href);
    url.searchParams.set('library-asset', entry.id);
    url.searchParams.set('project', current.searchParams.get('project') ?? entry.project);
    for (const key of ['category', 'group', 'q']) {
        const value = current.searchParams.get(key);
        if (value)
            url.searchParams.set(key, value);
    }
    link.href = url.href;
    return link;
}
/** 상세 콘텐츠의 미리보기·이벤트·음원을 소유하고 화면 전환 시 정리한다. */
export class LibraryDetail {
    entry;
    onSceneSelection;
    root = document.createElement('div');
    events = new AbortController();
    preview;
    scene;
    constructor(entry, onSceneSelection) {
        this.entry = entry;
        this.onSceneSelection = onSceneSelection;
        this.root.className = 'library-detail';
        this.root.innerHTML = `
      <nav class="detail-nav" aria-label="리소스 상세 탐색">
        <a id="back" href="../">← 리소스 목록</a>
        <a href="#preview">미리보기</a><a href="#information">파일·출처</a
        ><a href="#originals-section">원본·제작 기록</a>
      </nav>
      <header>
        <div>
          <p id="category" class="eyebrow"></p>
          <h1 id="name">리소스 상세</h1>
          <p id="description" class="intro"></p>
        </div>
      </header>
      <section id="preview">
        <h2>미리보기</h2>
        <div id="animated-preview" hidden>
          <div class="stage">
            <canvas
              id="scene"
              width="960"
              height="480"
              aria-label="선택 리소스 모션"
            ></canvas>
            <p id="status" role="status">로컬 이미지를 불러오는 중…</p>
          </div>
          <div class="controls">
            <label
              >모션·상태<select id="motion" disabled></select
              ><output id="frame">—</output></label
            ><button id="toggle" type="button" disabled>일시정지</button>
          </div>
          <p id="motion-notes"></p>
        </div>
        <div id="scene-preview"><div id="scene-viewer"></div><div id="scene-links"></div></div>
      </section>
      <section id="information">
        <h2>파일·프레임·출처</h2>
        <div id="resource-information"></div>
      </section>
      <section id="originals-section">
        <h2>원본·제작 기록</h2>
        <div id="records"></div>
        <details id="originals-panel" hidden>
          <summary>생성 원본 펼치기</summary>
          <div id="originals"></div>
        </details>
      </section>
`;
    }
    mount(container) {
        container.replaceChildren(this.root);
        try {
            this.showEntry(this.entry);
        }
        catch (error) {
            this.element('description').textContent =
                error instanceof Error
                    ? error.message
                    : '리소스를 표시하지 못했습니다.';
            this.element('description').setAttribute('role', 'alert');
        }
    }
    destroy() {
        this.events.abort();
        this.preview?.destroy();
        this.scene?.destroy();
        for (const audio of this.root.querySelectorAll('audio'))
            audio.pause();
        this.root.remove();
    }
    showSceneSelection(entry) {
        if (!this.scene?.accepts(entry))
            return false;
        this.entry = entry;
        this.scene.describe(entry);
        this.showEntry(entry);
        return true;
    }
    element(id) {
        const node = this.root.querySelector(`#${id}`);
        if (!node)
            throw new Error(`리소스 상세 요소가 없습니다: ${id}`);
        return node;
    }
    showEntry(entry) {
        this.element('name').textContent = entry.name;
        this.element('category').textContent =
            `${libraryCategories.find((category) => category.id === entry.category).name} / ${entry.group}`;
        this.element('description').textContent = entry.notes;
        const url = new URL(location.href);
        this.element('back').setAttribute('href', libraryLocation(readLibraryFilter(url)));
        this.element('back').dataset.libraryNavigation = 'true';
        const specialized = this.element('scene-links');
        specialized.replaceChildren();
        this.element('resource-information').replaceChildren();
        this.element('records').replaceChildren();
        if (!this.scene && libraryScenePath(entry)) {
            this.scene = new LibraryScene(entry, this.onSceneSelection);
            this.scene.mount(this.element('scene-viewer'));
        }
        if (entry.previewPath)
            specialized.append(comparisonLink(this.scene ? '별도 화면에서 크게 보기 →' : '비교·사용 장면을 열기 →', entry.previewPath, entry));
        if (entry.comparisonPath)
            specialized.append(comparisonLink('외형·제작 과정 비교 →', entry.comparisonPath, entry));
        if (entry.asset) {
            this.element('resource-information').append(createCard(entry.asset));
            const motions = Object.values(entry.asset.animations).filter((animation) => animation?.frames.length);
            if (motions.length && !entry.asset.audio) {
                this.element('animated-preview').hidden = false;
                const height = Math.max(...motions.flatMap((animation) => animation.frames.map((frame) => frame.height)));
                const preview = new ResourcePreview(entry.id, Math.min(4, 220 / height), { root: this.root });
                this.preview = preview;
                void preview.start().catch((error) => {
                    if (this.events.signal.aborted)
                        return;
                    this.element('status').textContent =
                        error instanceof Error
                            ? error.message
                            : '미리보기를 불러오지 못했습니다.';
                    this.element('status').setAttribute('role', 'alert');
                });
            }
            const asset = manifest.assets.find((item) => item.id === entry.id);
            if ('originals' in asset && asset.originals?.length) {
                this.element('originals-panel').hidden = false;
                let loaded = false;
                this.element('originals-panel').addEventListener('toggle', () => {
                    if (!loaded &&
                        this.element('originals-panel').open) {
                        showOriginals(entry.id, this.root);
                        loaded = true;
                    }
                }, { signal: this.events.signal });
            }
            if ('generationRecord' in asset &&
                typeof asset.generationRecord === 'string')
                this.element('records').append(localLink('제작 기록 열기', asset.generationRecord));
        }
        else {
            const information = this.element('resource-information');
            information.append(createText('p', `출처: ${entry.sourceName}`), createText('code', entry.id));
            for (const state of entry.states)
                information.append(createText('p', state));
            if (entry.sourcePath)
                information.append(localLink('모델·배치 코드 열기', entry.sourcePath));
            if (entry.thumbnailPath) {
                const image = new Image();
                image.src = resourceUrl(entry.thumbnailPath).href;
                image.alt = entry.name;
                specialized.prepend(image);
            }
            else if (!this.scene)
                specialized.prepend(createText('p', '입체 모델과 배치는 비교 화면에서 직접 살펴볼 수 있습니다.'));
            const resource = manifest.proceduralAssets.find((item) => item.id === entry.id);
            if ('generationRecordPath' in resource &&
                typeof resource.generationRecordPath === 'string')
                this.element('records').append(localLink('제작 기록 열기', resource.generationRecordPath));
        }
        if (!this.element('records').childElementCount)
            this.element('records').append(createText('p', '파일·출처와 연결된 비교 화면에서 제작 내용을 확인하세요.'));
    }
}
