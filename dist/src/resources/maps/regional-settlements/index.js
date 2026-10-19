import { embeddedScene, registerEmbeddedScene, reportEmbeddedSelection, } from '../../catalog/embedded-scene.js';
import { isEncounterId, ENCOUNTERS, } from '../../../prototypes/boar-turn-battle/encounters.js';
import { TrailVisit } from '../regional-trails/trail-visit.js';
import { SettlementGround } from './settlement-ground.js';
import { TrailScene } from '../regional-trails/trail-scene.js';
import { settlements, settlementBuilders } from './villages.js';
import { buildSettlementBuildings, SettlementDressing, } from './settlement-scenery.js';
function element(selector) {
    const result = document.querySelector(selector);
    if (!result)
        throw new Error(`마을 요소가 없습니다: ${selector}`);
    return result;
}
const requested = new URL(location.href).searchParams.get('region');
const region = isEncounterId(requested) ? requested : 'boar';
const query = new URL(location.href).searchParams;
/** 키보드·길 클릭·명소 명령을 보행 상태와 화면에 연결한다. */
class SettlementScreen {
    root = element('#settlement');
    canvas = element('canvas');
    village = settlements[region];
    definition = this.village.definition;
    view = query.get('view') === 'overview' ? 'overview' : 'game';
    ground = new SettlementGround(this.village);
    visit = new TrailVisit(this.ground);
    scene = new TrailScene(this.canvas, this.ground, this.view, {
        build: (kit, ground) => {
            buildSettlementBuildings(kit, this.village);
            settlementBuilders[region](kit, ground);
        },
        dress: (kit) => new SettlementDressing(this.village, kit),
    });
    lifetime = new AbortController();
    keys = new Set();
    observer;
    tags = [];
    landmarks = [];
    ready = false;
    disposed = false;
    paused = false;
    frame = 0;
    lastTime = performance.now();
    elapsed = 0;
    lastSync = 0;
    constructor() {
        document.title = `${this.definition.name} · 지역 마을`;
        element('#name').textContent = this.definition.name;
        element('#description').textContent = this.village.description;
        this.root.dataset.region = region;
        this.root.dataset.variant = 'village';
        this.root.dataset.asset = 'ai/ataho-v2';
        element('#zone-region').textContent = ENCOUNTERS[region].location;
        element('#zone-name').textContent = this.village.subtitle;
        element('#notice').textContent =
            '시설 이름을 누르면 건물과 주민을 피해 그곳까지 걸어갑니다. 도착하면 Space로 살펴보세요.';
        element('#journey-description').textContent =
            '중앙 마당과 생활 골목을 걷고 지역 탐험길과 비교해 보세요.';
        this.syncNavigation();
        const viewSelect = element('#view');
        viewSelect.value = this.view;
        this.root.dataset.view = this.view;
        viewSelect.addEventListener('change', () => {
            this.view = viewSelect.value === 'overview' ? 'overview' : 'game';
            this.root.dataset.view = this.view;
            this.scene.setView(this.view);
            if (this.ready)
                this.scene.draw(this.visit.snapshot, 0, this.elapsed);
            this.positionTags();
            const url = new URL(location.href);
            url.searchParams.set('view', this.view);
            history.replaceState(null, '', url);
            this.syncNavigation();
        }, { signal: this.lifetime.signal });
        for (const landmark of this.definition.landmarks) {
            const button = document.createElement('button');
            button.className = 'landmark';
            button.type = 'button';
            button.dataset.id = landmark.id;
            button.innerHTML =
                '<span class="stamp">○</span><span class="landmark-name"></span><small>이곳으로 걷기 →</small>';
            button.querySelector('.landmark-name').textContent = landmark.name;
            button.setAttribute('aria-label', `${landmark.name}까지 걷기`);
            button.addEventListener('click', () => {
                if (!this.ready || this.paused)
                    return;
                const moving = this.visit.navigate(landmark.position);
                this.notice(moving
                    ? `${landmark.name} 쪽으로 걷고 있어요. 도착하면 Space로 살펴보세요.`
                    : '이미 가까이 와 있어요. Space로 살펴보세요.');
                this.canvas.focus({ preventScroll: true });
            }, { signal: this.lifetime.signal });
            element('#landmarks').append(button);
            this.landmarks.push(button);
            const tag = document.createElement('span');
            tag.textContent = landmark.name;
            tag.className = `map-tag ${landmark.kind}`;
            element('#landmark-tags').append(tag);
            this.tags.push(tag);
        }
        const exit = element('#trail-exit');
        exit.href = `../regional-trails/?region=${region}&route=seamless&view=${this.view}${embeddedScene ? '&embed=1' : ''}`;
        exit.textContent = `${ENCOUNTERS[region].location} 탐험길로 →`;
        exit.hidden = true;
        this.registerInput();
        this.observer = new ResizeObserver(() => {
            this.scene.resize();
            if (this.ready)
                this.scene.draw(this.visit.snapshot, 0, this.elapsed);
            this.positionTags();
        });
        this.observer.observe(this.canvas);
        registerEmbeddedScene(() => this.dispose());
        window.addEventListener('pagehide', () => this.dispose(), {
            once: true,
            signal: this.lifetime.signal,
        });
        reportEmbeddedSelection(`local/regional-village-${region}`);
        this.sync();
        void this.load();
    }
    syncNavigation() {
        element('#trail-exit').href =
            `../regional-trails/?region=${region}&route=seamless&view=${this.view}${embeddedScene ? '&embed=1' : ''}`;
        const regions = element('#regions');
        regions.replaceChildren();
        for (const id of ['boar', 'bear', 'armadillo', 'mantis']) {
            const link = document.createElement('a');
            link.href = `?region=${id}&view=${this.view}${embeddedScene ? '&embed=1' : ''}`;
            link.textContent = settlements[id].title;
            if (id === region)
                link.setAttribute('aria-current', 'page');
            regions.append(link);
        }
        element('#view-note').textContent =
            this.view === 'game'
                ? '인게임 16:10 · 아타호 v2 · 탐험맵과 같은 인물 배율·시야'
                : '마을 전체 · 생활 시설과 골목 배치';
    }
    async load() {
        try {
            await this.scene.load();
            if (this.disposed)
                return;
            this.ready = true;
            element('#loading').hidden = true;
            this.root.dataset.ready = 'true';
            this.lastTime = performance.now();
            this.positionTags();
            this.scene.draw(this.visit.snapshot, 0, 0);
            if (!embeddedScene)
                this.canvas.focus({ preventScroll: true });
            this.frame = requestAnimationFrame(this.tick);
        }
        catch (error) {
            if (this.disposed)
                return;
            element('#loading').textContent =
                error instanceof Error ? error.message : '마을을 불러오지 못했습니다.';
            console.error(error);
        }
    }
    notice(message) {
        element('#notice').textContent = message;
    }
    inspect = () => {
        if (!this.ready || this.paused)
            return;
        this.notice(this.visit.inspect());
        element('#trail-exit').hidden = this.visit.nearby?.id !== 'exit';
        this.sync();
        this.canvas.focus({ preventScroll: true });
    };
    clearInput = () => {
        this.keys.clear();
        this.visit.stop();
    };
    togglePause = () => {
        if (!this.ready)
            return;
        this.paused = !this.paused;
        this.clearInput();
        element('#paused').hidden = !this.paused;
        element('#pause').setAttribute('aria-pressed', String(this.paused));
        element('#pause').firstChild.textContent = this.paused
            ? '다시 걷기 '
            : '잠시 멈춤 ';
        this.root.dataset.paused = String(this.paused);
        this.canvas.focus({ preventScroll: true });
    };
    togglePaths = () => {
        if (!this.ready)
            return;
        element('#paths').setAttribute('aria-pressed', String(this.scene.togglePaths()));
        if (this.paused)
            this.scene.draw(this.visit.snapshot, 0, this.elapsed);
        this.canvas.focus({ preventScroll: true });
    };
    reset = () => {
        if (!this.ready)
            return;
        this.clearInput();
        this.visit.reset();
        this.sync();
        this.notice('마을 입구로 돌아왔어요. 골목을 따라 시설을 둘러보세요.');
        this.scene.draw(this.visit.snapshot, 0, this.elapsed);
        this.canvas.focus({ preventScroll: true });
    };
    registerInput() {
        const { signal } = this.lifetime;
        window.addEventListener('keydown', (event) => {
            if (event.metaKey || event.ctrlKey || event.altKey)
                return;
            if (event.target instanceof HTMLElement &&
                event.target.closest('a,button,select,input,textarea'))
                return;
            const key = event.key.toLowerCase();
            if (![
                'w',
                'a',
                's',
                'd',
                'arrowup',
                'arrowdown',
                'arrowleft',
                'arrowright',
                ' ',
                'escape',
                'r',
                'm',
            ].includes(key))
                return;
            event.preventDefault();
            if (!event.repeat) {
                if (key === ' ')
                    this.inspect();
                if (key === 'escape')
                    this.togglePause();
                if (key === 'r')
                    this.reset();
                if (key === 'm')
                    this.togglePaths();
            }
            if (this.ready && !this.paused)
                this.keys.add(key);
        }, { signal });
        window.addEventListener('keyup', (event) => this.keys.delete(event.key.toLowerCase()), { signal });
        window.addEventListener('blur', this.clearInput, { signal });
        document.addEventListener('visibilitychange', () => {
            if (document.hidden)
                this.clearInput();
            this.lastTime = performance.now();
        }, { signal });
        this.canvas.addEventListener('pointerdown', (event) => {
            if (!this.ready || this.paused)
                return;
            const point = this.scene.pick(event.clientX, event.clientY);
            this.canvas.focus({ preventScroll: true });
            if (point && !this.visit.navigate(point))
                this.notice('열린 마당이나 골목을 눌러 주세요. 건물과 주민을 피해 걸어갑니다.');
        }, { signal });
        element('#inspect').addEventListener('click', this.inspect, { signal });
        element('#paths').addEventListener('click', this.togglePaths, { signal });
        element('#pause').addEventListener('click', this.togglePause, { signal });
        element('#reset').addEventListener('click', this.reset, { signal });
    }
    positionTags() {
        const rect = this.canvas.getBoundingClientRect();
        this.definition.landmarks.forEach((landmark, i) => {
            const p = this.scene.project(landmark.position), tag = this.tags[i];
            tag.style.left = `${p.x}px`;
            tag.style.top = `${p.y}px`;
            tag.hidden =
                p.x < 35 || p.x > rect.width - 35 || p.y < 0 || p.y > rect.height - 40;
        });
    }
    sync() {
        const snapshot = this.visit.snapshot, nearby = this.visit.nearby;
        if (nearby?.id !== 'exit')
            element('#trail-exit').hidden = true;
        Object.assign(this.root.dataset, {
            facing: snapshot.facing,
            x: snapshot.x.toFixed(2),
            z: snapshot.z.toFixed(2),
            moving: String(snapshot.moving),
            remaining: String(snapshot.remaining),
            nearby: nearby?.id ?? '',
            visited: snapshot.visited.join(','),
        });
        element('#walking-status').textContent = nearby
            ? `${nearby.name} · Space로 살펴보기`
            : snapshot.moving
                ? '길을 따라 걷는 중'
                : '길을 눌러 걷거나 방향키로 움직이세요.';
        element('#visit-count').textContent =
            `${snapshot.visited.length} / ${this.definition.landmarks.length}`;
        this.definition.landmarks.forEach((landmark, i) => {
            const visited = snapshot.visited.includes(landmark.id);
            this.landmarks[i].classList.toggle('visited', visited);
            this.landmarks[i].querySelector('.stamp').textContent = visited
                ? '●'
                : '○';
            this.tags[i].classList.toggle('visited', visited);
        });
    }
    tick = (time) => {
        if (this.disposed)
            return;
        const delta = Math.min((time - this.lastTime) / 1000, 0.04);
        this.lastTime = time;
        if (!this.paused && !document.hidden && this.ready) {
            this.elapsed += delta;
            const has = (...keys) => Number(keys.some((key) => this.keys.has(key)));
            this.visit.update(delta, {
                x: has('d', 'arrowright') - has('a', 'arrowleft'),
                z: has('s', 'arrowdown') - has('w', 'arrowup'),
            });
            this.scene.draw(this.visit.snapshot, delta, this.elapsed);
            this.positionTags();
            if (time - this.lastSync > 100) {
                this.sync();
                this.lastSync = time;
            }
        }
        this.frame = requestAnimationFrame(this.tick);
    };
    dispose() {
        if (this.disposed)
            return;
        this.disposed = true;
        this.lifetime.abort();
        cancelAnimationFrame(this.frame);
        this.observer.disconnect();
        this.keys.clear();
        this.scene.dispose();
        this.root.dataset.disposed = 'true';
    }
}
new SettlementScreen();
// 뒤로 가기로 되살린 문서에서는 정리된 WebGL 장면을 새로 준비한다.
window.addEventListener('pageshow', (event) => {
    if (event.persisted)
        location.reload();
});
