import { resourceUrl } from './resource-url.js';
import { LibraryDetail } from './library-detail.js';
import { createText } from './resource-card.js';
import { atahoNavigationEntries, filterLibrary, findLibraryEntry, libraryListEntry, libraryCategories, libraryLocation, readLibraryFilter, } from './library-data.js';
function element(id, type) {
    const found = document.getElementById(id);
    if (!(found instanceof type))
        throw new Error(`리소스 탐색 요소가 없습니다: ${id}`);
    return found;
}
/** 라이브러리의 주소·탐색 메뉴와 콘텐츠 전환을 조율한다. */
class LibraryPage {
    tree = element('resource-tree', HTMLElement);
    grid = element('library-grid', HTMLDivElement);
    search = element('library-search', HTMLInputElement);
    project = element('library-project', HTMLSelectElement);
    count = element('library-count', HTMLParagraphElement);
    title = element('library-title', HTMLHeadingElement);
    events = new AbortController();
    filter = readLibraryFilter(new URL(location.href));
    assetId = new URL(location.href).searchParams.get('asset');
    treeProject;
    treeSelection = '';
    detail;
    detailAssetId;
    content = element('library-content', HTMLDivElement);
    constructor() {
        this.restoreLocation();
        const { signal } = this.events;
        document.addEventListener('click', this.navigate, { signal });
        this.search.addEventListener('input', () => this.change({ ...this.filter, query: this.search.value }), { signal });
        this.project.addEventListener('change', () => this.change({
            ...this.filter,
            project: this.project.value === 'all' || this.project.value === 'other'
                ? this.project.value
                : 'tiger-rpg',
        }), { signal });
        window.addEventListener('popstate', () => {
            this.restoreLocation();
            this.render();
        }, { signal });
        window.addEventListener('pagehide', (event) => {
            if (!event.persisted) {
                this.detail?.destroy();
                this.events.abort();
            }
        }, { signal });
        this.render();
    }
    restoreLocation() {
        const url = new URL(location.href);
        this.filter = readLibraryFilter(url);
        this.assetId = url.searchParams.get('asset');
        const entry = findLibraryEntry(this.assetId);
        if (entry?.project === 'other' && !url.searchParams.has('project')) {
            this.filter = { ...this.filter, project: entry.project };
            history.replaceState(null, '', `${libraryLocation(this.filter, entry.id)}${url.hash}`);
        }
    }
    navigate = (event) => {
        if (event.button !== 0 ||
            event.metaKey ||
            event.ctrlKey ||
            event.shiftKey ||
            event.altKey)
            return;
        const target = event.target;
        if (!(target instanceof Element))
            return;
        const link = target.closest('a[data-library-navigation]');
        if (!link || link.target || link.hasAttribute('download'))
            return;
        const url = new URL(link.href);
        if (url.origin !== location.origin)
            return;
        event.preventDefault();
        if (url.href === location.href)
            return;
        this.filter = readLibraryFilter(url);
        this.assetId = url.searchParams.get('asset');
        history.pushState(null, '', `${url.pathname}${url.search}`);
        this.render();
        this.content.closest('main')?.scrollTo({ top: 0 });
    };
    selectSceneEntry = (assetId) => {
        if (assetId === this.assetId)
            return;
        const entry = findLibraryEntry(assetId);
        if (!entry || !this.detail?.showSceneSelection(entry))
            return;
        this.assetId = entry.id;
        this.detailAssetId = entry.id;
        history.replaceState(null, '', libraryLocation(this.filter, entry.id));
        this.updateTree(entry);
        document.title = `${entry.name} · 리소스 라이브러리`;
    };
    change(filter) {
        this.filter = filter;
        this.assetId = null;
        history.replaceState(null, '', libraryLocation(filter));
        this.render();
    }
    detailLocation(entry) {
        return libraryLocation(this.filter, entry.id);
    }
    link(label, filter) {
        const link = createText('a', label);
        link.href = libraryLocation(filter);
        link.dataset.libraryNavigation = 'true';
        link.dataset.category = filter.category ?? '';
        link.dataset.group = filter.group ?? '';
        return link;
    }
    renderTree() {
        const expanded = new Set([...this.tree.querySelectorAll('details[open]')].map((branch) => JSON.stringify([branch.dataset.category, branch.dataset.group ?? ''])));
        const entries = filterLibrary({ project: this.filter.project });
        const nodes = document.createDocumentFragment();
        const all = this.link('전체 리소스', {
            ...this.filter,
            category: undefined,
            group: undefined,
        });
        all.className = 'tree-all';
        nodes.append(all);
        for (const category of libraryCategories) {
            const items = entries.filter((entry) => entry.category === category.id);
            const branch = document.createElement('details');
            branch.dataset.category = category.id;
            branch.open = expanded.has(JSON.stringify([category.id, '']));
            const summary = document.createElement('summary');
            const link = this.link(category.name, {
                ...this.filter,
                category: category.id,
                group: undefined,
            });
            link.append(createText('span', String(items.length)));
            summary.append(link);
            branch.append(summary);
            for (const group of [...new Set(items.map((entry) => entry.group))]) {
                const groupEntries = items.filter((item) => item.group === group);
                const onlyEntry = groupEntries[0];
                if (category.id === 'cutscenes' &&
                    group === '연출실' &&
                    groupEntries.length === 1 &&
                    onlyEntry?.id === 'local/cutscene-studio') {
                    const item = this.treeEntry(onlyEntry);
                    item.dataset.category = category.id;
                    item.dataset.group = group;
                    branch.append(item);
                    continue;
                }
                const groupNode = document.createElement('details');
                groupNode.className = 'tree-group';
                groupNode.dataset.category = category.id;
                groupNode.dataset.group = group;
                groupNode.open = expanded.has(JSON.stringify([category.id, group]));
                const heading = document.createElement('summary');
                heading.append(this.link(group, {
                    ...this.filter,
                    category: category.id,
                    group,
                }));
                groupNode.append(heading);
                if (category.id === 'characters' && group === '아타호') {
                    let currentSection = '';
                    for (const { section, label, entry } of atahoNavigationEntries(groupEntries)) {
                        if (section !== currentSection) {
                            const sectionHeading = createText('p', section);
                            sectionHeading.className = 'tree-section-label';
                            groupNode.append(sectionHeading);
                            currentSection = section;
                        }
                        groupNode.append(this.treeEntry(entry, label));
                    }
                }
                else {
                    for (const entry of groupEntries)
                        groupNode.append(this.treeEntry(entry));
                }
                branch.append(groupNode);
            }
            nodes.append(branch);
        }
        this.tree.replaceChildren(nodes);
        this.treeProject = this.filter.project;
    }
    treeEntry(entry, label = entry.name) {
        const item = createText('a', label);
        item.href = this.detailLocation(entry);
        item.className = 'tree-entry';
        item.dataset.libraryNavigation = 'true';
        item.dataset.asset = entry.id;
        if (label !== entry.name) {
            item.title = entry.name;
            item.setAttribute('aria-label', `${label} · ${entry.name}`);
        }
        return item;
    }
    updateTree(entry) {
        if (this.treeProject !== this.filter.project)
            this.renderTree();
        const selectedId = entry ? libraryListEntry(entry).id : this.assetId;
        for (const link of this.tree.querySelectorAll('a')) {
            const assetId = link.dataset.asset;
            const category = libraryCategories.find((item) => item.id === link.dataset.category)?.id;
            const group = link.dataset.group || undefined;
            link.href = libraryLocation(assetId && !category
                ? this.filter
                : { ...this.filter, category, group }, assetId);
            const selected = assetId
                ? assetId === selectedId
                : !this.assetId &&
                    category === this.filter.category &&
                    group === this.filter.group;
            if (selected)
                link.setAttribute('aria-current', 'page');
            else
                link.removeAttribute('aria-current');
        }
        const selection = JSON.stringify([
            this.filter.project,
            this.filter.category,
            this.filter.group,
            this.assetId,
        ]);
        if (selection === this.treeSelection)
            return;
        this.treeSelection = selection;
        const category = entry?.category ?? this.filter.category;
        const group = entry?.group ?? this.filter.group;
        for (const branch of this.tree.querySelectorAll('details')) {
            if (branch.dataset.category === category &&
                (!branch.dataset.group || branch.dataset.group === group))
                branch.open = true;
        }
    }
    card(entry) {
        const card = document.createElement('article');
        card.className = 'library-card';
        card.dataset.resource = entry.id;
        const link = document.createElement('a');
        link.href = this.detailLocation(entry);
        link.className = 'card-main';
        link.dataset.libraryNavigation = 'true';
        const imageArea = document.createElement('div');
        imageArea.className = 'card-image';
        if (entry.thumbnailPath) {
            const image = new Image();
            image.src = resourceUrl(entry.thumbnailPath).href;
            image.alt = entry.name;
            image.loading = 'lazy';
            image.addEventListener('error', () => {
                image.remove();
                imageArea.append(createText('span', '이미지를 준비해주세요'));
            }, { once: true });
            imageArea.append(image);
        }
        else {
            const symbol = createText('span', entry.category === 'audio'
                ? '♪'
                : entry.category === 'maps'
                    ? '◇'
                    : entry.category === 'effects'
                        ? '✧'
                        : '▥');
            symbol.className = 'card-symbol';
            symbol.setAttribute('aria-hidden', 'true');
            imageArea.append(symbol, createText('small', entry.category === 'audio' ? '미리듣기' : '장면에서 확인'));
        }
        const copy = document.createElement('div');
        copy.className = 'card-copy';
        copy.append(createText('p', `${entry.group} · ${entry.kind === 'files' ? '로컬 파일' : '코드·합성'}`), createText('h2', entry.name));
        link.append(imageArea, copy);
        card.append(link);
        const footer = document.createElement('div');
        footer.className = 'card-footer';
        const summary = entry.asset?.audio
            ? `${entry.asset.audio.durationSeconds.toFixed(2)}초`
            : entry.asset
                ? `${Object.keys(entry.asset.animations).length}개 모션·상태`
                : `${entry.states.length}개 상태`;
        footer.append(createText('span', summary));
        const detail = createText('a', '살펴보기 →');
        detail.href = link.href;
        detail.dataset.libraryNavigation = 'true';
        detail.setAttribute('aria-label', `${entry.name} 상세 보기`);
        footer.append(detail);
        card.append(footer);
        return card;
    }
    render() {
        this.search.value = this.filter.query ?? '';
        this.project.value = this.filter.project;
        const category = libraryCategories.find((item) => item.id === this.filter.category);
        this.title.textContent =
            this.filter.group ?? category?.name ?? '전체 리소스';
        element('library-description', HTMLParagraphElement).textContent =
            category?.description ??
                '캐릭터부터 지도와 시설까지, 게임에 쓰는 재료를 살펴보세요.';
        const entry = findLibraryEntry(this.assetId);
        this.updateTree(entry);
        if (this.detail && this.detailAssetId === this.assetId)
            return;
        this.detail?.destroy();
        this.detail = undefined;
        this.detailAssetId = undefined;
        this.content.hidden = this.assetId === null;
        element('library-list', HTMLDivElement).hidden = this.assetId !== null;
        if (entry) {
            this.detailAssetId = entry.id;
            this.detail = new LibraryDetail(entry, this.selectSceneEntry);
            this.detail.mount(this.content);
            document.title = `${entry.name} · 리소스 라이브러리`;
            return;
        }
        if (this.assetId !== null) {
            const message = createText('p', '리소스를 찾을 수 없습니다. 왼쪽 메뉴에서 항목을 다시 선택해주세요.');
            message.setAttribute('role', 'alert');
            this.content.replaceChildren(message);
            document.title = '리소스를 찾을 수 없습니다 · 리소스 라이브러리';
            return;
        }
        const entries = filterLibrary(this.filter);
        this.count.textContent = `${entries.length}개 항목${this.filter.query ? ` · “${this.filter.query}” 검색 결과` : ''}`;
        this.grid.replaceChildren(...entries.map((entry) => this.card(entry)));
        element('library-empty', HTMLParagraphElement).hidden = entries.length > 0;
        document.title = `${this.title.textContent} · 리소스 라이브러리`;
    }
}
export function startLibrary() {
    new LibraryPage();
}
