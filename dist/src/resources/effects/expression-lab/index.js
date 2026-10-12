import { createCombatComparison, } from './combat-view.js';
import { createEnvironmentComparison, } from './environment-view.js';
function element(id) {
    const result = document.getElementById(id);
    if (!result)
        throw new Error(`표현 비교 요소가 없습니다: ${id}`);
    return result;
}
function setText(id, value) {
    const node = element(id);
    if (node.textContent !== value)
        node.textContent = value;
}
const directions = {
    up: { x: 0, z: -1 },
    down: { x: 0, z: 1 },
    left: { x: -1, z: 0 },
    right: { x: 1, z: 0 },
};
const arrowDirections = {
    ArrowUp: 'up',
    ArrowDown: 'down',
    ArrowLeft: 'left',
    ArrowRight: 'right',
};
/** 비교장의 시간과 입력만 소유하며 게임 진행·저장에는 연결하지 않는다. */
class ExpressionLab {
    events = new AbortController();
    motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
    heldDirections = new Set();
    combat = null;
    environment = null;
    scene = 'combat';
    elapsed = 0;
    lastTime = 0;
    frameId = 0;
    paused = false;
    disposed = false;
    nextAttackAt = null;
    async start() {
        this.bindControls();
        const results = await Promise.allSettled([
            createCombatComparison({
                baseline: element('combat-baseline'),
                enhanced: element('combat-enhanced'),
            }),
            createEnvironmentComparison({
                baseline: element('environment-baseline'),
                enhanced: element('environment-enhanced'),
            }),
        ]);
        const [combat, environment] = results;
        if (combat.status === 'fulfilled')
            this.combat = combat.value;
        if (environment.status === 'fulfilled')
            this.environment = environment.value;
        if (this.disposed) {
            this.disposeComparisons();
            return;
        }
        const failure = results.find((result) => result.status === 'rejected');
        if (failure?.status === 'rejected') {
            this.disposeComparisons();
            const status = element('loading');
            status.setAttribute('role', 'alert');
            status.textContent =
                failure.reason instanceof Error
                    ? failure.reason.message
                    : '비교 장면을 준비하지 못했어요. 로컬 리소스를 확인해 주세요.';
            return;
        }
        element('controls').disabled = false;
        document
            .querySelectorAll('.exploration button')
            .forEach((button) => {
            button.disabled = false;
        });
        element('timeline').disabled = false;
        element('loading').hidden = true;
        this.combat?.attack();
        this.refreshSettings();
        this.frameId = requestAnimationFrame((time) => this.draw(time));
    }
    get settings() {
        const checked = (id) => element(id).checked;
        return {
            timing: checked('timing'),
            trails: checked('trails'),
            secondary: checked('secondary'),
            lighting: checked('lighting'),
            height: checked('height'),
            guides: checked('guides'),
            reducedMotion: this.motionPreference.matches,
        };
    }
    bindControls() {
        const options = { signal: this.events.signal };
        const click = (id, action) => element(id).addEventListener('click', action, options);
        click('combat-tab', () => this.selectScene('combat'));
        click('environment-tab', () => this.selectScene('environment'));
        click('pause', () => this.setPaused(!this.paused));
        click('reset', () => {
            this.elapsed = 0;
            this.nextAttackAt = null;
            this.releaseMovement();
            this.combat?.reset();
            this.environment?.reset();
            this.combat?.attack();
            this.setPaused(false);
        });
        click('attack', () => this.attack());
        click('pulse', () => {
            this.environment?.pulse();
            this.setPaused(false);
        });
        click('upper-route', () => this.followRoute('upper'));
        click('lower-route', () => this.followRoute('lower'));
        element('timeline').addEventListener('input', () => {
            this.setPaused(true);
            this.combat?.seek(Number(element('timeline').value) / 1000);
            this.nextAttackAt = null;
        }, options);
        for (const id of [
            'timing',
            'trails',
            'secondary',
            'lighting',
            'height',
            'guides',
        ])
            element(id).addEventListener('change', () => this.refreshSettings(), options);
        window.addEventListener('keydown', (event) => this.keyDown(event), options);
        window.addEventListener('keyup', (event) => {
            const direction = arrowDirections[event.code];
            if (direction) {
                this.heldDirections.delete(direction);
                this.updateMovement();
            }
        }, options);
        window.addEventListener('blur', () => this.releaseMovement(), options);
        document.addEventListener('visibilitychange', () => {
            this.releaseMovement();
            this.lastTime = 0;
        }, options);
        window.addEventListener('pagehide', (event) => {
            if (!event.persisted)
                this.dispose();
            else
                this.releaseMovement();
        }, options);
        for (const stage of document.querySelectorAll('.stage'))
            stage.addEventListener('pointerdown', () => stage.focus({ preventScroll: true }), options);
        for (const button of document.querySelectorAll('[data-direction]')) {
            const direction = button.dataset.direction;
            button.addEventListener('pointerdown', (event) => {
                button.setPointerCapture(event.pointerId);
                this.heldDirections.add(direction);
                this.setPaused(false);
                this.updateMovement();
            }, options);
            const release = () => {
                this.heldDirections.delete(direction);
                this.updateMovement();
            };
            button.addEventListener('pointerup', release, options);
            button.addEventListener('pointercancel', release, options);
            button.addEventListener('lostpointercapture', release, options);
        }
    }
    keyDown(event) {
        if (event.altKey ||
            event.ctrlKey ||
            event.metaKey ||
            (event.target instanceof HTMLElement &&
                event.target.closest('input, select, textarea, a')))
            return;
        const direction = arrowDirections[event.code];
        if (direction && this.scene === 'environment') {
            event.preventDefault();
            this.heldDirections.add(direction);
            this.updateMovement();
            this.setPaused(false);
        }
        else if (event.code === 'Space') {
            if (event.target instanceof HTMLElement && event.target.closest('button'))
                return;
            event.preventDefault();
            if (event.repeat)
                return;
            if (this.scene === 'combat')
                this.attack();
            else {
                this.environment?.pulse();
                this.setPaused(false);
            }
        }
        else if (event.code === 'KeyP' && !event.repeat)
            this.setPaused(!this.paused);
    }
    updateMovement() {
        let x = 0;
        let z = 0;
        for (const name of this.heldDirections) {
            const direction = directions[name];
            if (direction) {
                x += direction.x;
                z += direction.z;
            }
        }
        this.environment?.setMovement({ x, z });
    }
    releaseMovement() {
        this.heldDirections.clear();
        this.environment?.setMovement({ x: 0, z: 0 });
    }
    attack() {
        this.combat?.attack();
        this.nextAttackAt = null;
        this.setPaused(false);
    }
    followRoute(route) {
        this.releaseMovement();
        this.environment?.followRoute(route);
        this.setPaused(false);
    }
    selectScene(scene) {
        this.scene = scene;
        this.releaseMovement();
        for (const name of ['combat', 'environment']) {
            const active = name === scene;
            element(`${name}-tab`).setAttribute('aria-pressed', String(active));
            for (const suffix of ['panel', 'options', 'notes'])
                element(`${name}-${suffix}`).hidden = !active;
        }
        element('attack-timeline').hidden = scene !== 'combat';
        element('exploration-controls').hidden = scene !== 'environment';
        this.lastTime = 0;
        this.setPaused(false);
    }
    setPaused(paused) {
        this.paused = paused;
        if (paused)
            this.releaseMovement();
        setText('pause', paused ? '재생' : '일시정지');
        element('pause').setAttribute('aria-pressed', String(paused));
    }
    refreshSettings() {
        const settings = this.settings;
        for (const feature of [
            'timing',
            'trails',
            'secondary',
            'lighting',
            'height',
        ]) {
            const note = document.querySelector(`[data-feature="${feature}"]`);
            if (note)
                note.dataset.active = String(settings[feature]);
        }
    }
    draw(time) {
        if (this.disposed)
            return;
        const delta = this.paused || document.hidden || !this.lastTime
            ? 0
            : Math.min(0.05, (time - this.lastTime) / 1000) *
                (element('slow').checked ? 0.25 : 1);
        this.lastTime = time;
        this.elapsed += delta;
        const frame = { elapsed: this.elapsed, delta, settings: this.settings };
        if (this.scene === 'combat') {
            this.combat?.draw(frame);
            if (this.combat?.finished && this.nextAttackAt === null)
                this.nextAttackAt = this.elapsed + 0.8;
            if (delta > 0 &&
                element('loop').checked &&
                this.nextAttackAt !== null &&
                this.elapsed >= this.nextAttackAt)
                this.attack();
            const progress = this.combat?.progress ?? 0;
            if (!this.paused)
                element('timeline').value = String(Math.round(progress * 1000));
            setText('timeline-detail', `${Math.round(progress * 100)}%`);
            for (const variant of ['baseline', 'enhanced']) {
                const data = element(`combat-${variant}`).dataset;
                setText(`combat-${variant}-detail`, `${data.phase ?? '대기'} · 자세 ${Number(data.frameIndex ?? 0) + 1} · 접촉 ${data.impactCount ?? '0'}회${data.frozen === 'true' ? ' · 타격 정지' : ''}`);
            }
        }
        else {
            this.environment?.draw(frame);
            for (const variant of ['baseline', 'enhanced']) {
                const data = element(`environment-${variant}`).dataset;
                const height = Number(data.y ?? 0);
                const location = height > 0.05 ? '다리 위' : '지면';
                setText(`environment-${variant}-detail`, `${location}${data.discovered === 'true' ? ' · 숨은 장소 발견' : ''}`);
            }
        }
        this.frameId = requestAnimationFrame((next) => this.draw(next));
    }
    disposeComparisons() {
        this.combat?.dispose();
        this.environment?.dispose();
        this.combat = this.environment = null;
    }
    dispose() {
        this.disposed = true;
        cancelAnimationFrame(this.frameId);
        this.events.abort();
        this.disposeComparisons();
    }
}
void new ExpressionLab().start().catch((error) => {
    const status = element('loading');
    status.hidden = false;
    status.setAttribute('role', 'alert');
    status.textContent =
        error instanceof Error ? error.message : '표현 비교를 시작하지 못했어요.';
});
