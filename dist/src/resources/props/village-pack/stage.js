import { WalkMapScene } from '../../../rendering/walk-map-scene.js';
import { VillageVisit, } from '../../maps/regional-villages/visit.js';
import { packVillage } from './pack.js';
import { PackScenery } from './scenery.js';
/** 비교 화면의 지역·전후 상태·입력과 렌더러 수명을 소유한다. */
export class PackStage {
    root;
    lifetime = new AbortController();
    keys = new Set();
    canvas;
    map = packVillage('harbor');
    visit = new VillageVisit(this.map);
    scene = null;
    mode = 'before';
    overview = true;
    paused = false;
    ready = false;
    disposed = false;
    generation = 0;
    previous = performance.now();
    frame = 0;
    constructor(root) {
        this.root = root;
        this.canvas = root.querySelector('canvas');
        const { signal } = this.lifetime;
        this.canvas.addEventListener('pointerdown', () => this.canvas.focus(), {
            signal,
        });
        root.addEventListener('pointerdown', (event) => {
            if (event.target instanceof HTMLCanvasElement)
                this.canvas.focus();
        }, { signal });
        window.addEventListener('keydown', this.keyDown, { signal });
        window.addEventListener('keyup', (event) => this.keys.delete(event.key.toLowerCase()), { signal });
        window.addEventListener('blur', () => this.stop(), { signal });
        root.querySelector('select').addEventListener('change', (event) => {
            const target = event.currentTarget;
            void this.select(target.value);
        }, { signal });
        root.querySelector('[data-overview]').addEventListener('click', () => {
            this.overview = !this.overview;
            this.canvas.focus();
        }, { signal });
        root
            .querySelector('[data-reset]')
            .addEventListener('click', () => void this.select(this.map.id), {
            signal,
        });
        window.addEventListener('pagehide', () => this.dispose(), {
            once: true,
            signal,
        });
        Object.defineProperty(window, 'villagePackPreview', {
            configurable: true,
            get: () => ({
                ready: this.ready,
                region: this.map.id,
                mode: this.mode,
                paused: this.paused,
                snapshot: this.visit.snapshot,
            }),
        });
        void this.select('harbor');
        this.frame = requestAnimationFrame(this.tick);
    }
    showState(mode) {
        this.mode = mode;
    }
    stop() {
        this.keys.clear();
        this.visit.stop();
    }
    async select(id) {
        const token = ++this.generation;
        this.ready = false;
        this.stop();
        this.scene?.dispose();
        const next = this.canvas.cloneNode();
        this.canvas.replaceWith(next);
        this.canvas = next;
        this.map = packVillage(id);
        this.visit = new VillageVisit(this.map);
        this.paused = false;
        this.scene = new WalkMapScene(this.canvas, this.map, new PackScenery(this.map));
        const status = this.root.querySelector('[data-stage-status]');
        status.textContent = '리소스를 불러오는 중…';
        try {
            await this.scene.load();
            if (token !== this.generation || this.disposed)
                return;
            this.ready = true;
            this.previous = performance.now();
        }
        catch (error) {
            if (token !== this.generation || this.disposed)
                return;
            status.textContent =
                error instanceof Error ? error.message : '화면을 준비하지 못했어요.';
        }
    }
    keyDown = (event) => {
        if (document.activeElement !== this.canvas || !this.ready)
            return;
        const key = event.key.toLowerCase();
        if ([
            'arrowup',
            'arrowdown',
            'arrowleft',
            'arrowright',
            ' ',
            'm',
            'escape',
        ].includes(key))
            event.preventDefault();
        if (!event.repeat) {
            if (key === 'm')
                this.overview = !this.overview;
            if (key === 'escape') {
                this.paused = !this.paused;
                this.stop();
            }
            if (key === ' ' && !this.paused)
                this.visit.interact();
        }
        if (!this.paused)
            this.keys.add(key);
    };
    tick = (time) => {
        if (this.disposed)
            return;
        const delta = Math.min((time - this.previous) / 1000, 0.05);
        this.previous = time;
        if (this.ready && this.scene) {
            if (!this.paused) {
                this.visit.walk(delta, {
                    x: Number(this.keys.has('arrowright')) -
                        Number(this.keys.has('arrowleft')),
                    z: Number(this.keys.has('arrowdown')) -
                        Number(this.keys.has('arrowup')),
                });
                this.visit.update(delta);
            }
            const state = this.visit.snapshot;
            this.scene.render(state, this.paused ? 0 : delta, {
                overview: this.overview,
                mode: this.mode,
            });
            this.root.querySelector('[data-stage-status]').textContent =
                this.paused
                    ? '일시정지 · Esc'
                    : (state.notice ??
                        `${this.map.title} · ${this.mode === 'before' ? '작업 전' : '작업 후'} 소품 · 정면 시안`);
        }
        this.frame = requestAnimationFrame(this.tick);
    };
    dispose() {
        if (this.disposed)
            return;
        this.disposed = true;
        this.generation++;
        this.lifetime.abort();
        cancelAnimationFrame(this.frame);
        this.scene?.dispose();
        this.stop();
    }
}
