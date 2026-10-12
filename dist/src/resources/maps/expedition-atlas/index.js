import { atlasMap, atlasMaps } from './maps.js';
import { AtlasVisit } from './visit.js';
import { AtlasScene } from './scene.js';
import { drawAtlasMap } from './minimap.js';
import { embeddedScene, registerEmbeddedScene, reportEmbeddedSelection, } from '../../catalog/embedded-scene.js';
function element(root, selector) {
    const found = root.querySelector(selector);
    if (!found)
        throw new Error(`답사 화면 요소가 없습니다: ${selector}`);
    return found;
}
class AtlasScreen {
    root;
    lifetime = new AbortController();
    canvas;
    minimap;
    interaction;
    keys = new Set();
    progress = new Map();
    map;
    visit;
    scene;
    ready = false;
    overview = false;
    showBattles = false;
    frame = 0;
    previousTime = 0;
    disposed = false;
    constructor(root) {
        this.root = root;
        this.map = atlasMap(new URLSearchParams(location.search).get('map'));
        this.visit = new AtlasVisit(this.map);
        root.innerHTML = `<div class="atlas-frame"><canvas class="atlas-canvas" tabindex="0" aria-label="원정 지도 답사. 방향키 이동, Space 조사, M 전체 조망."></canvas>
      <header class="atlas-header"><label><span>원정 지도 답사</span><select id="atlas-select" aria-label="답사할 지도">${atlasMaps.map((map) => `<option value="${map.id}">${map.title}</option>`).join('')}</select></label><button id="atlas-overview" aria-pressed="false">전체 조망 · M</button><button id="atlas-revisit">재방문</button><button id="atlas-reset">초기화</button><button id="atlas-help" aria-expanded="false">지역 안내</button><a href="../regional-villages/">지역 마을</a></header>
      <aside class="atlas-info"><h1></h1><p data-structure></p><div class="atlas-progress" aria-label="주요 지점 답사 진행"></div></aside>
      <aside class="atlas-map"><canvas aria-label="실제 경로와 현재 위치"></canvas><p>밝은 점 · 조사 지점 · 주황 점 · 아타호</p></aside>
      <button class="atlas-interaction" hidden><strong></strong><span></span></button><span class="atlas-gauge" hidden aria-label="조사 진행"></span><p class="atlas-notice" role="status" hidden></p>
      <aside class="atlas-description" hidden><p></p><ul></ul></aside>
      <footer class="atlas-footer"><p data-status>방향키 이동 · Space 조사 · 입구에서 귀환</p><button id="atlas-battles" aria-pressed="false">전투 자리 보기</button><p class="quiet">다음 원정용 지도 답사 · 본게임 저장과 분리</p></footer></div>`;
        this.canvas = element(root, '.atlas-canvas');
        this.minimap = element(root, '.atlas-map canvas');
        this.interaction = element(root, '.atlas-interaction');
        this.scene = new AtlasScene(this.canvas, this.map);
        registerEmbeddedScene(() => this.dispose());
        this.describe();
        this.registerInput();
        void this.load(this.scene);
        Object.assign(window, {
            expeditionAtlas: Object.defineProperties({}, {
                ready: { get: () => this.ready },
                map: { get: () => this.map },
                snapshot: { get: () => this.visit.snapshot },
            }),
        });
    }
    describe() {
        element(this.root, '#atlas-select').value = this.map.id;
        const url = new URL(location.href);
        url.searchParams.set('map', this.map.id);
        history.replaceState(null, '', url);
        reportEmbeddedSelection(`local/atlas-${this.map.id}`);
        element(this.root, 'h1').textContent = this.map.title;
        element(this.root, '[data-structure]').textContent = this.map.structure;
        element(this.root, '.atlas-description p').textContent =
            this.map.description;
        const list = element(this.root, '.atlas-description ul');
        list.replaceChildren();
        this.map.battleAreas.forEach((area) => {
            const li = document.createElement('li');
            li.textContent = area.label;
            list.append(li);
        });
        element(this.root, '.atlas-progress').innerHTML = this.map.points
            .filter((p) => p.kind !== 'cache')
            .map((p) => `<i title="${p.label}" aria-label="${p.label}"></i>`)
            .join('');
    }
    async load(scene) {
        try {
            await scene.load();
            if (this.disposed || this.scene !== scene)
                return;
            this.ready = true;
            this.previousTime = performance.now();
            if (!embeddedScene)
                this.canvas.focus();
            this.frame = requestAnimationFrame(this.tick);
        }
        catch (error) {
            if (this.disposed || this.scene !== scene)
                return;
            const message = document.createElement('p');
            message.className = 'atlas-error';
            message.textContent =
                error instanceof Error
                    ? error.message
                    : '답사 화면을 준비하지 못했어요.';
            this.root.append(message);
        }
    }
    select(map) {
        this.clearInput();
        cancelAnimationFrame(this.frame);
        this.ready = false;
        this.scene.dispose();
        // 종료한 WebGL 문맥을 다시 쓰지 않고 지도별 캔버스 수명을 함께 교체한다.
        const canvas = this.canvas.cloneNode(false);
        this.canvas.replaceWith(canvas);
        this.canvas = canvas;
        this.root.querySelector('.atlas-error')?.remove();
        this.map = map;
        this.visit = new AtlasVisit(map, this.progress.get(map.id));
        this.scene = new AtlasScene(this.canvas, map);
        element(this.root, '.atlas-description').hidden = true;
        element(this.root, '#atlas-help').setAttribute('aria-expanded', 'false');
        this.describe();
        void this.load(this.scene);
    }
    clearInput() {
        this.keys.clear();
        this.visit.stop();
        this.previousTime = performance.now();
    }
    toggleOverview() {
        this.overview = !this.overview;
        element(this.root, '#atlas-overview').setAttribute('aria-pressed', String(this.overview));
        this.canvas.focus();
    }
    interact() {
        if (!this.ready || this.visit.snapshot.returned)
            return;
        if (this.visit.snapshot.canReturn) {
            if (this.visit.returnToEntrance()) {
                const state = this.visit.snapshot;
                this.progress.set(this.map.id, {
                    surveyed: state.surveyed,
                    shortcutOpened: state.shortcutOpened,
                });
            }
        }
        else
            this.visit.interact();
        this.clearInput();
        this.canvas.focus();
    }
    registerInput() {
        const { signal } = this.lifetime;
        element(this.root, '#atlas-select').addEventListener('change', (event) => {
            const target = event.currentTarget;
            this.select(atlasMap(target.value));
        }, { signal });
        element(this.root, '#atlas-revisit').addEventListener('click', () => this.select(this.map), { signal });
        element(this.root, '#atlas-reset').addEventListener('click', () => {
            this.progress.delete(this.map.id);
            this.select(this.map);
        }, { signal });
        element(this.root, '#atlas-overview').addEventListener('click', () => this.toggleOverview(), { signal });
        element(this.root, '#atlas-battles').addEventListener('click', () => {
            this.showBattles = !this.showBattles;
            element(this.root, '#atlas-battles').setAttribute('aria-pressed', String(this.showBattles));
            this.canvas.focus();
        }, { signal });
        element(this.root, '#atlas-help').addEventListener('click', () => {
            const help = element(this.root, '.atlas-description');
            help.hidden = !help.hidden;
            element(this.root, '#atlas-help').setAttribute('aria-expanded', String(!help.hidden));
            this.clearInput();
            this.canvas.focus();
        }, { signal });
        this.interaction.addEventListener('click', () => this.interact(), {
            signal,
        });
        this.root.addEventListener('keydown', (event) => {
            if (event.target instanceof HTMLSelectElement ||
                event.target instanceof HTMLButtonElement)
                return;
            if (!this.ready)
                return;
            if (event.code.startsWith('Arrow')) {
                event.preventDefault();
                this.keys.add(event.code);
            }
            if (event.repeat)
                return;
            if (event.code === 'Space') {
                event.preventDefault();
                if (element(this.root, '.atlas-description').hidden)
                    this.interact();
            }
            if (event.code === 'KeyM') {
                event.preventDefault();
                this.toggleOverview();
            }
            if (event.code === 'Escape') {
                element(this.root, '.atlas-description').hidden = true;
                element(this.root, '#atlas-help').setAttribute('aria-expanded', 'false');
                this.clearInput();
            }
        }, { signal });
        window.addEventListener('keyup', (event) => {
            this.keys.delete(event.code);
            if (!this.keys.size)
                this.visit.stop();
        }, { signal });
        window.addEventListener('blur', () => this.clearInput(), { signal });
        document.addEventListener('visibilitychange', () => this.clearInput(), {
            signal,
        });
    }
    tick = (time) => {
        if (this.disposed || !this.ready)
            return;
        const dt = Math.min(0.05, Math.max(0, (time - this.previousTime) / 1000));
        this.previousTime = time;
        const paused = !element(this.root, '.atlas-description').hidden || document.hidden;
        if (!paused) {
            const input = {
                x: Number(this.keys.has('ArrowRight')) -
                    Number(this.keys.has('ArrowLeft')),
                z: Number(this.keys.has('ArrowDown')) - Number(this.keys.has('ArrowUp')),
            };
            this.visit.walk(dt, input);
            this.visit.update(dt);
        }
        const state = this.visit.snapshot;
        this.scene.render(state, paused ? 0 : dt, {
            overview: this.overview,
            showBattles: this.showBattles,
        });
        drawAtlasMap(this.minimap, this.map, state, {
            showBattles: this.showBattles,
        });
        this.draw();
        this.frame = requestAnimationFrame(this.tick);
    };
    draw() {
        const state = this.visit.snapshot;
        const point = this.map.points.find((p) => p.id === (state.action?.point ?? state.nearby));
        this.interaction.hidden = state.returned || (!state.canReturn && !point);
        this.interaction.dataset.busy = String(!!state.action);
        this.interaction.disabled = !!state.action;
        const anchor = this.scene.project(state.canReturn ? this.map.entrance : (point ?? state.player), 1.1);
        this.interaction.style.left = `${anchor.x}px`;
        this.interaction.style.top = `${anchor.y - 8}px`;
        element(this.interaction, 'strong').textContent = state.canReturn
            ? '입구로 귀환'
            : (point?.label ?? '');
        element(this.interaction, 'span').textContent = state.action
            ? '조사 중'
            : point?.kind === 'mechanism'
                ? 'Space · 길 열기'
                : state.canReturn
                    ? 'Space · 답사 마치기'
                    : 'Space · 살펴보기';
        const gauge = element(this.root, '.atlas-gauge'), feet = this.scene.project(state.player, 1.9);
        gauge.hidden = !state.action;
        gauge.style.left = `${feet.x}px`;
        gauge.style.top = `${feet.y}px`;
        gauge.style.setProperty('--progress', `${(state.action?.progress ?? 0) * 360}deg`);
        const notice = element(this.root, '.atlas-notice');
        notice.hidden = !state.notice;
        notice.textContent = state.notice;
        const markers = this.root.querySelectorAll('.atlas-progress i');
        this.map.points
            .filter((p) => p.kind !== 'cache')
            .forEach((p, i) => {
            markers[i].dataset.done = String(state.surveyed.includes(p.id));
        });
        element(this.root, '[data-status]').textContent = state.returned
            ? '답사 기록 보관 · 재방문 버튼으로 열린 경로 확인'
            : state.complete
                ? '주요 지점 답사 완료 · 입구로 돌아가 귀환'
                : '방향키 이동 · Space 조사 · M 전체 조망';
    }
    dispose() {
        if (this.disposed)
            return;
        this.disposed = true;
        this.ready = false;
        this.clearInput();
        cancelAnimationFrame(this.frame);
        this.lifetime.abort();
        this.scene.dispose();
    }
}
const root = document.querySelector('#atlas');
if (!root)
    throw new Error('답사 화면이 없습니다.');
const screen = new AtlasScreen(root);
window.addEventListener('pagehide', () => screen.dispose(), { once: true });
