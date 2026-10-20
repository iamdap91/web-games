import { registerEmbeddedScene } from '../../catalog/embedded-scene.js';
import { resourceUrl } from '../../catalog/resource-url.js';
import { findStudioItem, filterStudioItems, studioGroups, studioItems, } from './catalog.js';
import { StudioViewport } from './viewport.js';
function element(id, kind) {
    const value = document.getElementById(id);
    if (!(value instanceof kind))
        throw new Error(`연출실 요소가 없습니다: ${id}`);
    return value;
}
/** 탐색·선택·공통 조작만 소유하며 재생 시각은 선택한 장면에서 관찰한다. */
class StudioScreen {
    events = new AbortController();
    list = element('items', HTMLElement);
    search = element('search', HTMLInputElement);
    seek = element('seek', HTMLInputElement);
    viewport;
    current = findStudioItem(new URL(location.href).searchParams.get('item')) ??
        studioItems[0];
    group = this.current.group;
    state;
    metadataKey = '';
    disposed = false;
    constructor() {
        if (studioItems.length === 0 ||
            new Set(studioItems.map((item) => item.id)).size !== studioItems.length)
            throw new Error('연출실 목록이 비었거나 ID가 겹칩니다.');
        element('studio-total', HTMLElement).textContent =
            `${studioItems.length}개의 장면과 기법`;
        this.search.value = new URL(location.href).searchParams.get('search') ?? '';
        this.viewport = new StudioViewport(element('viewport', HTMLElement), (message) => this.observe(message), (direction) => this.step(direction));
        const { signal } = this.events;
        const groups = element('groups', HTMLElement);
        for (const group of studioGroups) {
            const button = document.createElement('button');
            button.type = 'button';
            button.dataset.group = group.id;
            button.title = group.description;
            const label = document.createElement('span');
            label.textContent = group.name;
            const count = document.createElement('small');
            count.textContent = String(studioItems.filter((item) => item.group === group.id).length);
            button.append(label, count);
            button.addEventListener('click', () => {
                this.group = group.id;
                const matches = this.filtered();
                if (this.current.group !== group.id && matches[0])
                    this.select(matches[0]);
                else {
                    this.renderList();
                    this.writeLocation('push');
                }
            }, { signal });
            groups.append(button);
        }
        this.search.addEventListener('input', () => {
            this.renderList();
            this.writeLocation('replace');
        }, { signal });
        this.list.addEventListener('click', (event) => {
            const button = event.target instanceof Element
                ? event.target.closest('button[data-item]')
                : null;
            const item = findStudioItem(button?.dataset.item ?? null);
            if (item)
                this.select(item);
        }, { signal });
        element('play', HTMLButtonElement).addEventListener('click', () => this.viewport.send({ action: 'toggle' }), { signal });
        element('restart', HTMLButtonElement).addEventListener('click', () => this.viewport.send({ action: 'restart' }), { signal });
        for (const [id, direction] of [
            ['previous', -1],
            ['next', 1],
        ])
            element(id, HTMLButtonElement).addEventListener('click', () => this.step(direction), { signal });
        for (const [id, direction] of [
            ['frame-back', -1],
            ['frame-next', 1],
        ])
            element(id, HTMLButtonElement).addEventListener('click', () => this.stepFrame(direction), { signal });
        this.seek.addEventListener('input', () => this.viewport.send({ action: 'seek', value: Number(this.seek.value) }), { signal });
        element('speed', HTMLSelectElement).addEventListener('change', (event) => {
            if (event.currentTarget instanceof HTMLSelectElement)
                this.viewport.send({
                    action: 'speed',
                    value: Number(event.currentTarget.value),
                });
        }, { signal });
        for (const action of ['loop', 'compare', 'reduced'])
            element(action, HTMLInputElement).addEventListener('change', (event) => {
                if (event.currentTarget instanceof HTMLInputElement)
                    this.viewport.send({ action, value: event.currentTarget.checked });
            }, { signal });
        element('facing', HTMLSelectElement).addEventListener('change', (event) => {
            if (event.currentTarget instanceof HTMLSelectElement)
                this.viewport.send({
                    action: 'facing',
                    value: event.currentTarget.value,
                });
        }, { signal });
        for (const action of ['gif', 'png', 'cancel-export'])
            element(action, HTMLButtonElement).addEventListener('click', () => this.viewport.send({ action }), { signal });
        window.addEventListener('keydown', (event) => {
            if (event.target instanceof Element &&
                event.target.closest('input,select,textarea,button,a,summary'))
                return;
            if (event.code === 'Space' && !event.repeat) {
                event.preventDefault();
                this.viewport.send({ action: 'toggle' });
            }
            if (event.code === 'ArrowLeft' || event.code === 'ArrowRight') {
                event.preventDefault();
                this.stepFrame((event.code === 'ArrowLeft' ? -1 : 1) * (event.shiftKey ? 5 : 1));
            }
            if (event.code === 'ArrowUp' || event.code === 'ArrowDown') {
                event.preventDefault();
                this.step(event.code === 'ArrowUp' ? -1 : 1);
            }
        }, { signal });
        window.addEventListener('popstate', () => {
            const url = new URL(location.href);
            this.search.value = url.searchParams.get('search') ?? '';
            this.select(findStudioItem(url.searchParams.get('item')) ?? studioItems[0], 'none');
        }, { signal });
        window.addEventListener('pagehide', () => this.dispose(), {
            once: true,
            signal,
        });
        registerEmbeddedScene(() => this.dispose());
        element('record', HTMLAnchorElement).href = resourceUrl('resources/cutscene-studio.json').href;
        this.select(this.current, 'replace');
    }
    filtered() {
        return filterStudioItems(this.group, this.search.value);
    }
    renderList() {
        const items = this.filtered();
        this.list.replaceChildren();
        for (const item of items) {
            const button = document.createElement('button');
            button.type = 'button';
            button.dataset.item = item.id;
            button.setAttribute('aria-current', String(item === this.current));
            const title = document.createElement('strong');
            title.textContent = item.title;
            const origin = document.createElement('small');
            origin.textContent = item.origin;
            button.append(title, origin);
            this.list.append(button);
        }
        for (const button of element('groups', HTMLElement).querySelectorAll('button'))
            button.setAttribute('aria-pressed', String(button.dataset.group === this.group));
        element('list-title', HTMLElement).textContent = studioGroups.find((group) => group.id === this.group).name;
        element('list-count', HTMLOutputElement).textContent =
            `${items.length} / ${studioItems.filter((item) => item.group === this.group).length}`;
        element('empty', HTMLElement).hidden = items.length > 0;
    }
    select(item, historyMode = 'push') {
        this.current = item;
        this.group = item.group;
        this.state = undefined;
        this.metadataKey = '';
        element('title', HTMLElement).textContent = item.title;
        element('origin', HTMLElement).textContent = item.origin;
        element('description', HTMLElement).textContent = '';
        element('record', HTMLAnchorElement).href = resourceUrl(item.recordPath).href;
        element('beats', HTMLElement).replaceChildren();
        element('export-status', HTMLOutputElement).textContent = '';
        element('status', HTMLOutputElement).textContent = '그림 준비 중…';
        element('viewport', HTMLElement).setAttribute('aria-busy', 'true');
        this.setReady(false);
        for (const id of [
            'loop-option',
            'compare-option',
            'facing-option',
            'reduced-option',
            'png',
            'gif',
            'cancel-export',
            'comparison-labels',
        ])
            element(id, HTMLElement).hidden = true;
        element('viewport', HTMLElement).classList.remove('comparing');
        this.renderList();
        if (historyMode !== 'none')
            this.writeLocation(historyMode);
        this.viewport.show(item);
    }
    writeLocation(mode) {
        const url = new URL(location.href);
        url.searchParams.set('item', this.current.id);
        if (this.search.value)
            url.searchParams.set('search', this.search.value);
        else
            url.searchParams.delete('search');
        url.hash = '';
        if (mode === 'push')
            history.pushState(null, '', url);
        else
            history.replaceState(null, '', url);
    }
    setReady(ready) {
        for (const id of ['play', 'restart', 'frame-back', 'frame-next'])
            element(id, HTMLButtonElement).disabled = !ready;
        this.seek.disabled = !ready;
        element('speed', HTMLSelectElement).disabled = !ready;
    }
    observe(message) {
        if (this.disposed)
            return;
        const { state, capabilities } = message;
        const initial = !this.state;
        this.state = state;
        if (initial)
            this.viewport.send({
                action: 'speed',
                value: Number(element('speed', HTMLSelectElement).value),
            });
        const ready = !state.loading;
        this.setReady(ready);
        element('viewport', HTMLElement).setAttribute('aria-busy', String(!ready));
        element('viewport', HTMLElement).dataset.item = this.current.id;
        element('viewport', HTMLElement).dataset.timeMs = String(state.timeMs);
        element('viewport', HTMLElement).dataset.playing = String(state.playing);
        element('title', HTMLElement).textContent = state.title;
        element('description', HTMLElement).textContent = state.description;
        this.seek.max = String(state.durationMs);
        this.seek.value = String(state.timeMs);
        element('time', HTMLOutputElement).textContent =
            `${(state.timeMs / 1000).toFixed(3)} / ${(state.durationMs / 1000).toFixed(3)} s`;
        element('play', HTMLButtonElement).textContent = state.playing
            ? '정지'
            : '재생';
        element('status', HTMLOutputElement).textContent = !ready
            ? '그림 준비 중…'
            : state.playing
                ? '재생 중'
                : state.timeMs >= state.durationMs
                    ? '감상 완료'
                    : '일시정지 · 무음';
        for (const action of ['loop', 'compare', 'facing', 'reduced'])
            element(`${action}-option`, HTMLElement).hidden =
                !capabilities.includes(action) ||
                    (action === 'facing' && (state.facingOptions?.length ?? 0) < 2);
        for (const action of ['gif', 'png']) {
            const button = element(action, HTMLButtonElement);
            button.hidden = !capabilities.includes(action);
            button.disabled = !ready || !!state.exporting;
        }
        element('cancel-export', HTMLButtonElement).hidden =
            !state.exporting || !capabilities.includes('cancelExport');
        element('loop', HTMLInputElement).checked = state.loop ?? false;
        element('compare', HTMLInputElement).checked = state.compare ?? false;
        element('reduced', HTMLInputElement).checked = state.reducedMotion ?? false;
        element('viewport', HTMLElement).classList.toggle('comparing', state.compare ?? false);
        element('comparison-labels', HTMLElement).hidden = !state.compare;
        element('export-status', HTMLOutputElement).textContent =
            state.exportStatus ?? '';
        const key = `${this.current.id}:${JSON.stringify(state.facingOptions)}:${JSON.stringify(state.beats)}`;
        if (key !== this.metadataKey) {
            this.metadataKey = key;
            const beats = element('beats', HTMLElement);
            beats.replaceChildren();
            for (const beat of state.beats) {
                const button = document.createElement('button');
                button.type = 'button';
                button.dataset.timeMs = String(beat.timeMs);
                button.textContent = `${(beat.timeMs / 1000).toFixed(2)}s ${beat.label}`;
                button.addEventListener('click', () => this.viewport.send({ action: 'seek', value: beat.timeMs }), { signal: this.events.signal });
                beats.append(button);
            }
            const facing = element('facing', HTMLSelectElement);
            facing.replaceChildren();
            for (const choice of state.facingOptions ?? []) {
                const option = document.createElement('option');
                option.value = choice.value;
                option.textContent = choice.label;
                facing.append(option);
            }
        }
        if (state.facing)
            element('facing', HTMLSelectElement).value = state.facing;
    }
    stepFrame(direction) {
        if (this.state)
            this.viewport.send({
                action: 'seek',
                value: this.state.timeMs + (direction * 1000) / 24,
            });
    }
    step(direction) {
        const items = this.filtered();
        if (!items.length)
            return;
        const index = items.indexOf(this.current);
        this.select(items[(Math.max(0, index) + direction + items.length) % items.length]);
    }
    dispose() {
        if (this.disposed)
            return;
        this.disposed = true;
        this.events.abort();
        this.viewport.dispose();
    }
}
try {
    new StudioScreen();
}
catch (error) {
    const output = element('error', HTMLElement);
    output.hidden = false;
    output.textContent =
        error instanceof Error ? error.message : '연출실을 준비하지 못했습니다.';
}
