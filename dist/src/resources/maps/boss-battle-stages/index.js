import { registerEmbeddedScene } from '../../catalog/embedded-scene.js';
import { TurnBattle, } from '../../../prototypes/boar-turn-battle/battle.js';
import { battleMapDefinition, } from '../../../prototypes/boar-turn-battle/battle-map.js';
import { ENCOUNTERS, } from '../../../prototypes/boar-turn-battle/encounters.js';
import { BattleRenderer, } from '../../../prototypes/boar-turn-battle/renderer.js';
import { battleStage } from '../../../prototypes/boar-turn-battle/battle-stage.js';
const encounterIds = [
    'boar',
    'bear',
    'armadillo',
    'mantis',
];
const mapVariants = ['original', 'alternate'];
function element(root, selector) {
    const result = root.querySelector(selector);
    if (!result)
        throw new Error(`전투맵 비교 요소가 없습니다: ${selector}`);
    return result;
}
/** 실제 전투 렌더러를 같은 대기 장면으로 보여주고 전투 진행은 연결 화면에 맡긴다. */
class BattleStagesScreen {
    root = element(document, 'main');
    cards;
    lifetime = new AbortController();
    observer;
    view = 'compare';
    paused = false;
    disposed = false;
    frame = 0;
    draws = 0;
    constructor() {
        this.root.style.setProperty('--battle-stage-width', `${battleStage.width}px`);
        const gallery = element(this.root, '#stages');
        this.cards = encounterIds.flatMap((id) => {
            this.createRegionHeading(gallery, id);
            return mapVariants.map((variant) => this.createCard(gallery, id, variant));
        });
        registerEmbeddedScene(() => this.dispose());
        window.addEventListener('pagehide', () => this.dispose(), {
            once: true,
            signal: this.lifetime.signal,
        });
        element(this.root, '#pause').addEventListener('click', () => {
            this.paused = !this.paused;
            this.syncControls();
        }, { signal: this.lifetime.signal });
        for (const view of ['compare', 'game'])
            element(this.root, `#view-${view}`).addEventListener('click', () => {
                this.view = view;
                this.syncControls();
            }, { signal: this.lifetime.signal });
        this.observer = new ResizeObserver(() => {
            // 멈춘 그림은 CSS 크기만 바꿔 포즈를 보존하고 재개 뒤 해상도를 맞춘다.
            if (!this.paused)
                this.draw();
        });
        for (const card of this.cards)
            this.observer.observe(card.canvas);
        this.syncControls();
        this.publishState();
        this.frame = requestAnimationFrame(this.tick);
        void this.load();
    }
    createRegionHeading(gallery, id) {
        const heading = document.createElement('div');
        heading.className = 'region-heading';
        heading.innerHTML =
            '<h2></h2><a class="trail-link" target="_blank" rel="noopener"></a>';
        element(heading, 'h2').textContent = ENCOUNTERS[id].location;
        const link = element(heading, '.trail-link');
        link.href = `../regional-trails/?region=${id}`;
        link.textContent = '이동맵 A/B 걷기';
        gallery.append(heading);
    }
    createCard(gallery, id, variant) {
        const definition = battleMapDefinition(id, variant);
        const encounter = ENCOUNTERS[id];
        const card = document.createElement('article');
        card.className = 'stage-card';
        card.dataset.encounter = id;
        card.dataset.variant = variant;
        card.innerHTML = `<div class="stage-view"><canvas></canvas><div class="stage-loading" role="status">전장을 불러오는 중…</div></div><div class="stage-content"><span class="stage-variant"></span><div class="stage-title"><h3></h3><span class="boss-name"></span></div><p class="stage-description"></p><a class="stage-link" target="_blank" rel="noopener"></a></div>`;
        element(card, '.stage-variant').textContent =
            variant === 'original' ? 'A · 기존 전투맵' : 'B · 추가 전투맵';
        element(card, 'h3').textContent = definition.name;
        element(card, '.boss-name').textContent = encounter.name;
        element(card, '.stage-description').textContent = definition.description;
        const canvas = element(card, 'canvas');
        canvas.setAttribute('aria-label', `${definition.name}, ${variant === 'original' ? '기존' : '추가'} 전투맵의 아타호·연묵·비월과 ${encounter.name}`);
        const link = element(card, '.stage-link');
        link.href = `../../../prototypes/boar-turn-battle/?boss=${id}&map=${variant}`;
        link.textContent = `${encounter.name} 보스전 열기`;
        gallery.append(card);
        const snapshot = new TurnBattle(encounter).snapshot;
        const visual = {
            stage: 'idle',
            action: null,
            actorId: null,
            targetIds: snapshot.targetIds,
            counterActorId: null,
            element: null,
            hits: [],
            warded: false,
            progress: 0,
            intent: snapshot.intent,
            guarded: false,
            countered: false,
            message: '',
            messageTone: 'neutral',
            messageAge: 0,
        };
        return {
            id,
            variant,
            canvas,
            renderer: new BattleRenderer(canvas, id, { mapVariant: variant }),
            snapshot,
            visual,
            loading: element(card, '.stage-loading'),
            ready: false,
            failed: false,
            renders: 0,
        };
    }
    async load() {
        await Promise.all(this.cards.map(async (card) => {
            try {
                await card.renderer.load();
                if (this.disposed)
                    return;
                card.ready = true;
                this.drawCard(card);
                card.loading.hidden = true;
            }
            catch (error) {
                if (this.disposed)
                    return;
                card.failed = true;
                card.loading.textContent =
                    '전장을 불러오지 못했습니다. 새로고침해 주세요.';
                console.error(error);
            }
            this.syncControls();
        }));
    }
    syncControls() {
        this.root.dataset.view = this.view;
        for (const view of ['compare', 'game'])
            element(this.root, `#view-${view}`).setAttribute('aria-pressed', String(view === this.view));
        element(this.root, '#view-description').textContent =
            this.view === 'game'
                ? `실제 보스전과 같은 16:10 비율 · ${battleStage.width}px 크기로 보고 좁은 화면에서는 맞춥니다.`
                : '실제 보스전과 같은 16:10 비율 · 지역마다 두 전장을 나란히 비교합니다.';
        const count = this.cards.filter((card) => card.ready).length;
        const pause = element(this.root, '#pause');
        pause.disabled = count === 0;
        pause.setAttribute('aria-pressed', String(this.paused));
        pause.textContent = this.paused ? '움직임 재개' : '움직임 멈춤';
        element(this.root, '#status').textContent = this.cards.some((card) => card.failed)
            ? '일부 지도를 불러오지 못했습니다. 새로고침해 주세요.'
            : count < this.cards.length
                ? `전투맵 ${count}/${this.cards.length} 준비`
                : this.paused
                    ? '움직임이 멈춰 있습니다.'
                    : '보스전 링크에서 해당 전투를 시작할 수 있습니다.';
    }
    drawCard(card) {
        if (!card.ready || this.disposed)
            return;
        card.renderer.draw(card.snapshot, card.visual);
        card.renders++;
    }
    draw() {
        if (this.disposed)
            return;
        for (const card of this.cards)
            this.drawCard(card);
        this.draws++;
    }
    tick = () => {
        if (this.disposed)
            return;
        if (!this.paused && !document.hidden)
            this.draw();
        this.frame = requestAnimationFrame(this.tick);
    };
    publishState() {
        const api = Object.freeze(Object.defineProperties({}, {
            ready: {
                get: () => !this.disposed && this.cards.every((card) => card.ready),
                enumerable: true,
            },
            paused: { get: () => this.paused, enumerable: true },
            view: { get: () => this.view, enumerable: true },
            disposed: { get: () => this.disposed, enumerable: true },
            diagnostics: {
                get: () => Object.freeze({
                    view: this.view,
                    draws: this.draws,
                    cards: Object.freeze(this.cards.map((card) => Object.freeze({
                        id: card.id,
                        variant: card.variant,
                        ready: card.ready,
                        failed: card.failed,
                        renders: card.renders,
                        width: card.canvas.width,
                        height: card.canvas.height,
                    }))),
                }),
                enumerable: true,
            },
        }));
        Object.defineProperty(window, 'bossBattleStages', {
            value: api,
            configurable: true,
        });
    }
    dispose() {
        if (this.disposed)
            return;
        this.disposed = true;
        this.lifetime.abort();
        cancelAnimationFrame(this.frame);
        this.observer.disconnect();
        for (const card of this.cards)
            card.renderer.destroy();
    }
}
new BattleStagesScreen();
