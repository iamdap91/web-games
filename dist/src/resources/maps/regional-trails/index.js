import { embeddedScene, registerEmbeddedScene, reportEmbeddedSelection, } from '../../catalog/embedded-scene.js';
import { isEncounterId, ENCOUNTERS, } from '../../../prototypes/boar-turn-battle/encounters.js';
import { battleMapDefinition } from '../../../prototypes/boar-turn-battle/battle-map.js';
import { trailDefinition, } from './trail-maps.js';
import { TrailVisit } from './trail-visit.js';
import { TrailGround } from './trail-ground.js';
import { TrailScene } from './trail-scene.js';
import { regionalJourneys } from './regional-journeys.js';
function element(selector) {
    const result = document.querySelector(selector);
    if (!result)
        throw new Error(`이동맵 요소가 없습니다: ${selector}`);
    return result;
}
const requested = new URL(location.href).searchParams.get('region');
const region = isEncounterId(requested) ? requested : 'boar';
const query = new URL(location.href).searchParams;
const variant = query.get('route') === 'seamless'
    ? 'seamless'
    : query.get('route') === 'alternate'
        ? 'alternate'
        : 'original';
/** 키보드·길 클릭·명소 명령을 보행 상태와 화면에 연결한다. */
class TrailScreen {
    root = element('#trail');
    canvas = element('canvas');
    definition = trailDefinition(region, variant);
    view = query.get('view') === 'overview' ? 'overview' : 'game';
    ground = new TrailGround({
        definition: this.definition,
        region,
        variant,
    });
    visit = new TrailVisit(this.ground);
    scene = new TrailScene(this.canvas, this.ground, this.view);
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
        document.title = `${this.definition.name} · 지역 이동맵`;
        element('#name').textContent = this.definition.name;
        element('#description').textContent = this.definition.description;
        this.root.dataset.region = region;
        this.root.dataset.variant = variant;
        this.root.dataset.asset = 'ai/ataho-v2';
        element('#zone-indicator').hidden = variant !== 'seamless';
        element('#zone-region').textContent = ENCOUNTERS[region].location;
        if (variant === 'seamless') {
            element('#notice').textContent = regionalJourneys[region].notice;
            element('#journey-description').textContent =
                regionalJourneys[region].description;
        }
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
        for (const variant of ['original', 'alternate']) {
            const link = element(`#battle-${variant}`);
            link.href = `../../../prototypes/boar-turn-battle/?boss=${region}${variant === 'alternate' ? '&map=alternate' : ''}`;
            link.textContent = `${variant === 'original' ? 'A' : 'B'} · ${battleMapDefinition(region, variant).name} ↗`;
        }
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
        reportEmbeddedSelection(`local/regional-trail-${region}${variant === 'original' ? '' : `-${variant}`}`);
        this.sync();
        void this.load();
    }
    syncNavigation() {
        element('#village-return').href =
            `../regional-settlements/?region=${region}&view=${this.view}${embeddedScene ? '&embed=1' : ''}`;
        const linkTo = (id, route) => {
            const url = new URL(location.href);
            url.search = '';
            url.searchParams.set('region', id);
            if (route !== 'original')
                url.searchParams.set('route', route);
            url.searchParams.set('view', this.view);
            if (embeddedScene)
                url.searchParams.set('embed', '1');
            return url.href;
        };
        const regions = element('#regions');
        regions.replaceChildren();
        for (const id of ['boar', 'bear', 'armadillo', 'mantis']) {
            const link = document.createElement('a');
            link.href = linkTo(id, variant);
            link.textContent = ENCOUNTERS[id].location;
            if (id === region)
                link.setAttribute('aria-current', 'page');
            regions.append(link);
        }
        const routes = element('#routes');
        routes.replaceChildren();
        const choices = variant === 'seamless'
            ? ['seamless']
            : ['original', 'alternate', 'seamless'];
        for (const route of choices) {
            const link = document.createElement('a');
            link.href = linkTo(region, route);
            const label = route === 'seamless' ? '이어걷기' : route === 'original' ? 'A' : 'B';
            link.textContent =
                route === 'seamless'
                    ? regionalJourneys[region].routeLabel
                    : `${label} · ${trailDefinition(region, route).name}`;
            if (route === variant)
                link.setAttribute('aria-current', 'page');
            routes.append(link);
        }
        if (variant === 'seamless') {
            const archive = document.createElement('a');
            archive.href =
                '../../?category=archive&group=' +
                    encodeURIComponent('이전 이동맵 A/B');
            archive.textContent = '이전 이동맵 A/B · archive →';
            routes.append(archive);
        }
        element('#view-note').textContent =
            this.view === 'game'
                ? '인게임 16:10 · 아타호 v2 · 본게임과 같은 인물 배율·시야'
                : '지도 전체 · 아타호 v2 · 길의 구조와 명소 배치';
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
                error instanceof Error
                    ? error.message
                    : '지역의 길을 불러오지 못했습니다.';
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
        this.notice('입구로 돌아왔어요. 표식을 따라 이 지역의 길을 걸어보세요.');
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
                this.notice('밝은 길 위를 눌러 주세요. 바위·물·수풀 사이로는 지나갈 수 없어요.');
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
        Object.assign(this.root.dataset, {
            facing: snapshot.facing,
            x: snapshot.x.toFixed(2),
            z: snapshot.z.toFixed(2),
            moving: String(snapshot.moving),
            remaining: String(snapshot.remaining),
            nearby: nearby?.id ?? '',
            visited: snapshot.visited.join(','),
        });
        if (variant === 'seamless') {
            const zone = regionalJourneys[region].zone(snapshot);
            this.root.dataset.zone = zone.id;
            element('#zone-name').textContent = zone.name;
        }
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
new TrailScreen();
// 뒤로 가기로 되살린 문서에서는 정리된 WebGL 장면을 새로 준비한다.
window.addEventListener('pageshow', (event) => {
    if (event.persisted)
        location.reload();
});
