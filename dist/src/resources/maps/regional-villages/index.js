import { villageMap, villageMaps } from './maps.js';
import { VillageVisit } from './visit.js';
import { RegionalVillageScene } from './scene.js';
import { facilityIcon } from './facility-icons.js';
import { embeddedScene, registerEmbeddedScene, reportEmbeddedSelection, } from '../../catalog/embedded-scene.js';
function element(root, selector) {
    const result = root.querySelector(selector);
    if (!result)
        throw new Error(`마을 화면 요소가 없습니다: ${selector}`);
    return result;
}
/** 화면 입력·선택·일시정지와 렌더러 수명을 소유한다. */
class RegionalVillageScreen {
    root;
    lifetime = new AbortController();
    keys = new Set();
    select;
    overviewButton;
    prompt;
    notice;
    pausedPanel;
    map = villageMap(new URLSearchParams(location.search).get('village'));
    visit = new VillageVisit(this.map);
    scene = null;
    canvas;
    overview = false;
    paused = false;
    ready = false;
    generation = 0;
    lastTime = performance.now();
    frame = 0;
    disposed = false;
    displayedNotice = null;
    displayedNoticePoint = null;
    constructor(root) {
        this.root = root;
        root.innerHTML = `<header><div><h1>지역 마을 둘러보기</h1><p>지역마다 다른 생활 공간과 원정 출발점</p></div><nav><select aria-label="마을 선택">${villageMaps.map((m) => `<option value="${m.id}">${m.title}</option>`).join('')}</select><button id="overview" aria-pressed="false">전체 지도 · M</button><button id="reset">입구로</button><a href="../expedition-atlas/">원정 지도</a></nav></header><div class="stage"><canvas tabindex="0" aria-label="마을 보행 화면"></canvas><aside class="intro"><strong></strong><p></p></aside><aside class="legend"><b>시설과 길목</b><ul></ul></aside><div class="prompt" hidden></div><div class="notice" role="status"></div><div class="paused" hidden>잠시 멈춤 · Esc</div></div><footer><span>방향키 / WASD 이동 · Space 시설 확인 · M 전체 지도 · Esc 일시정지</span><span id="status">마을을 불러오는 중…</span></footer>`;
        this.select = element(root, 'select');
        this.overviewButton = element(root, '#overview');
        this.prompt = element(root, '.prompt');
        this.notice = element(root, '.notice');
        this.pausedPanel = element(root, '.paused');
        this.canvas = element(root, 'canvas');
        registerEmbeddedScene(() => this.dispose());
        this.registerInput();
        Object.defineProperty(window, 'regionalVillages', {
            configurable: true,
            get: () => ({
                ready: this.ready,
                map: this.map,
                snapshot: this.visit.snapshot,
                overview: this.overview,
                paused: this.paused,
            }),
        });
        void this.openVillage(this.map.id);
        this.frame = requestAnimationFrame(this.render);
    }
    setOverview(value) {
        this.overview = value;
        this.overviewButton.setAttribute('aria-pressed', String(value));
    }
    clearInput = () => {
        this.keys.clear();
        this.visit.stop();
    };
    async openVillage(id) {
        const token = ++this.generation;
        this.ready = false;
        this.prompt.hidden = true;
        this.notice.hidden = true;
        this.clearInput();
        this.scene?.dispose();
        const next = this.canvas.cloneNode();
        this.canvas.replaceWith(next);
        this.canvas = next;
        this.map = villageMap(id);
        this.visit = new VillageVisit(this.map);
        this.select.value = this.map.id;
        this.paused = false;
        this.pausedPanel.hidden = true;
        element(this.root, '.intro strong').textContent = this.map.subtitle;
        element(this.root, '.intro p').textContent = this.map.description;
        element(this.root, '.legend ul').innerHTML = this.map.points
            .map((p) => `<li>${facilityIcon(p.id)} ${p.label}<span data-point="${p.id}"></span></li>`)
            .join('');
        element(this.root, '#status').textContent = '마을을 불러오는 중…';
        const url = new URL(location.href);
        url.searchParams.set('village', this.map.id);
        history.replaceState(null, '', url);
        reportEmbeddedSelection(`local/village-${this.map.id}`);
        const nextScene = new RegionalVillageScene(this.canvas, this.map);
        this.scene = nextScene;
        try {
            await nextScene.load();
            if (token !== this.generation || this.disposed)
                return;
            this.ready = true;
            this.lastTime = performance.now();
            if (!embeddedScene)
                this.canvas.focus();
        }
        catch (error) {
            if (token !== this.generation || this.disposed)
                return;
            element(this.root, '#status').textContent =
                error instanceof Error ? error.message : '리소스를 불러오지 못했어요.';
        }
    }
    onKeyDown = (event) => {
        if (event.target instanceof HTMLSelectElement ||
            event.target instanceof HTMLButtonElement ||
            event.target instanceof HTMLAnchorElement)
            return;
        const key = event.key.toLowerCase();
        if ([
            'arrowup',
            'arrowdown',
            'arrowleft',
            'arrowright',
            ' ',
            'w',
            'a',
            's',
            'd',
            'm',
            'escape',
        ].includes(key))
            event.preventDefault();
        if (!this.ready)
            return;
        if (!event.repeat) {
            if (key === 'm')
                this.setOverview(!this.overview);
            if (key === 'escape') {
                this.paused = !this.paused;
                this.clearInput();
                this.pausedPanel.hidden = !this.paused;
            }
            if (key === ' ' && !this.paused)
                this.visit.interact();
        }
        if (!this.paused)
            this.keys.add(key);
    };
    registerInput() {
        const { signal } = this.lifetime;
        window.addEventListener('keydown', this.onKeyDown, { signal });
        window.addEventListener('keyup', (event) => this.keys.delete(event.key.toLowerCase()), { signal });
        window.addEventListener('blur', this.clearInput, { signal });
        this.select.addEventListener('change', () => void this.openVillage(this.select.value), { signal });
        this.overviewButton.addEventListener('click', () => {
            this.setOverview(!this.overview);
            this.canvas.focus();
        }, { signal });
        element(this.root, '#reset').addEventListener('click', () => void this.openVillage(this.map.id), { signal });
        element(this.root, '.stage').addEventListener('pointerdown', () => this.canvas.focus(), { signal });
        window.addEventListener('pagehide', () => this.dispose(), {
            once: true,
            signal,
        });
    }
    render = (time) => {
        if (this.disposed)
            return;
        const delta = Math.min((time - this.lastTime) / 1000, 0.05);
        this.lastTime = time;
        if (this.ready && this.scene) {
            if (!this.paused) {
                this.visit.walk(delta, {
                    x: Number(this.keys.has('arrowright') || this.keys.has('d')) -
                        Number(this.keys.has('arrowleft') || this.keys.has('a')),
                    z: Number(this.keys.has('arrowdown') || this.keys.has('s')) -
                        Number(this.keys.has('arrowup') || this.keys.has('w')),
                });
                this.visit.update(delta);
            }
            const state = this.visit.snapshot;
            this.scene.render(state, this.paused ? 0 : delta, {
                overview: this.overview,
            });
            const nearby = this.map.points.find((p) => p.id === state.nearby);
            this.prompt.hidden = !nearby || this.paused;
            if (nearby) {
                this.prompt.innerHTML = `<kbd>Space</kbd>${facilityIcon(nearby.id)} ${nearby.label}`;
                const anchor = this.scene.project(state.player, 2.45);
                this.prompt.style.left = `${anchor.x}px`;
                this.prompt.style.top = `${anchor.y}px`;
            }
            this.showNotice(state);
            this.notice.hidden = !state.notice;
            for (const p of this.map.points)
                element(this.root, `[data-point="${p.id}"]`).textContent =
                    state.visited.includes(p.id) ? '✓' : '';
            element(this.root, '#status').textContent =
                `${this.map.title} · 시설 ${state.visited.length} / ${this.map.points.length}`;
        }
        this.frame = requestAnimationFrame(this.render);
    };
    showNotice(state) {
        if (this.displayedNotice === state.notice &&
            this.displayedNoticePoint === state.noticePoint)
            return;
        this.displayedNotice = state.notice;
        this.displayedNoticePoint = state.noticePoint;
        this.notice.replaceChildren(document.createTextNode(state.notice ?? ''));
        const point = this.map.points.find((point) => point.id === state.noticePoint);
        // 이동 링크는 안내가 바뀔 때만 생성해 클릭 도중 노드가 교체되지 않는다.
        if (state.notice && point?.destination) {
            const link = document.createElement('a');
            link.href = `../expedition-atlas/?map=${point.destination}`;
            link.textContent = '원정 지도 둘러보기 →';
            this.notice.append(link);
        }
    }
    dispose() {
        if (this.disposed)
            return;
        this.disposed = true;
        this.ready = false;
        this.generation++;
        this.lifetime.abort();
        cancelAnimationFrame(this.frame);
        this.scene?.dispose();
        this.clearInput();
    }
}
const host = document.querySelector('#villages');
if (!host)
    throw new Error('마을 화면이 없습니다.');
new RegionalVillageScreen(host);
