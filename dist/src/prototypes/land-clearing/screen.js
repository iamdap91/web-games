import { waitForRenderedFrame } from '../../games/tiger-rpg/screen-ready.js';
import { clearingMarkup } from './screen-template.js';
import { energyRules } from './harvest-energy.js';
import { rushRules } from './harvest-rush.js';
import { ClearingHudFeedback } from './hud-feedback.js';
import { discoveryLayout } from './clearing-discovery.js';
import { ClearingWorld, obstacleTypes, } from './world.js';
import { ClearingScene } from './scene.js';
import { ImpactSound } from './impact-sound.js';
/** 귀환 때 입력·루프를 멈추고 결과를 한 번 전달한다. 최종 제거는 호출자 책임이다. */
export function mountClearing(options) {
    return new ClearingScreen(options);
}
export function mountClearingPrototype(root) {
    return new ClearingScreen({ root });
}
const movementKeys = new Set([
    'ArrowUp',
    'ArrowLeft',
    'ArrowDown',
    'ArrowRight',
]);
const attackKeys = ['Space', 'KeyE'];
function targetDescription(target) {
    if (target.health === 0)
        return 'Space / E · 쓰러진 나무 방향 바꾸기';
    const label = target.id === discoveryLayout.source.id
        ? '물이 새는 바위'
        : obstacleTypes[target.kind].label;
    const action = { brush: '정리하기', rock: '깨기', tree: '쓰러뜨리기' }[target.kind];
    return `Space / E · ${label} ${action} · ${target.health}타`;
}
function interactionDescription(state) {
    if (state.rush.action)
        return `돌진 ${state.rush.action.remaining.toFixed(1)}초 · 방향키로 방향 전환`;
    if (state.slam.action)
        return '지면 강타!';
    if (state.crateTargetId !== null)
        return 'Space / E · 떠내려온 상자 열기';
    const target = state.obstacles.find((item) => item.id === state.targetId);
    if (target)
        return targetDescription(target);
    return '';
}
class ClearingScreen {
    options;
    canvas;
    overlay;
    overlayTitle;
    overlayMessage;
    resume;
    resetButton;
    targetLabel;
    woodLabel;
    stoneLabel;
    woodGain;
    stoneGain;
    hudFeedback;
    exitHint;
    notice;
    charge;
    chargeLabel;
    rushButton;
    rushRequested = false;
    slamButton;
    slamRequested = false;
    diagnostics;
    lifetime = new AbortController();
    keys = new Set();
    world;
    sound = new ImpactSound();
    dev = new URLSearchParams(location.search).get('dev') === '1';
    scene = null;
    frameId = 0;
    previousTime = 0;
    loaded = false;
    ready;
    host = document.createElement('section');
    stylesheet = document.createElement('link');
    paused = false;
    transitionBlocked = false;
    returning = false;
    storyBlocked = false;
    failed = false;
    disposed = false;
    noticeTime = 0;
    constructor(options) {
        this.options = options;
        this.world = new ClearingWorld('entry' in options ? options.entry : undefined);
        this.hudFeedback = new ClearingHudFeedback(this.world.snapshot);
        this.host.className = 'clearing-screen';
        this.host.setAttribute('aria-label', '숲속 공터');
        this.host.innerHTML = clearingMarkup;
        options.root.append(this.host);
        const element = (selector) => {
            const node = this.host.querySelector(selector);
            if (!node)
                throw new Error(`화면 요소가 없습니다: ${selector}`);
            return node;
        };
        this.canvas = element('#clearing');
        this.overlay = element('#overlay');
        this.overlayTitle = element('#overlay-title');
        this.overlayMessage = element('#overlay-message');
        this.resume = element('#resume');
        this.resetButton = element('#reset');
        this.targetLabel = element('#target');
        this.woodLabel = element('#wood');
        this.stoneLabel = element('#stone');
        this.woodGain = element('#wood-gain');
        this.stoneGain = element('#stone-gain');
        this.exitHint = element('#exit-hint');
        this.notice = element('#notice');
        this.charge = element('#charge');
        this.chargeLabel = element('#charge-label');
        this.rushButton = element('#rush');
        this.slamButton = element('#slam');
        this.diagnostics = element('#diagnostics');
        const integrated = 'entry' in options;
        this.resetButton.hidden = integrated;
        if (integrated) {
            this.exitHint.hidden = false;
            this.canvas.setAttribute('aria-label', `${this.canvas.getAttribute('aria-label')} 남쪽 숲길의 맵 경계로 이동하면 마을로 돌아갑니다.`);
        }
        this.registerInput();
        this.ready = this.start();
        // 호출자는 ready의 거부를 처리할 수 있고 독립 화면은 오류 안내를 계속 보여 준다.
        void this.ready.catch(() => { });
    }
    registerInput() {
        const { signal } = this.lifetime;
        this.host.addEventListener('keydown', (event) => {
            // 버튼의 기본 Enter가 제거한 게임 확정 별칭으로 남지 않게 한다.
            if (event.key === 'Enter' && event.target instanceof HTMLButtonElement)
                event.preventDefault();
            if (!this.loaded || this.failed || this.storyBlocked)
                return;
            if (event.code === 'Escape') {
                event.preventDefault();
                if (!event.repeat)
                    this.setPaused(!this.paused);
                return;
            }
            if (event.code === 'KeyQ' || event.code === 'KeyW') {
                if (event.target instanceof HTMLButtonElement)
                    return;
                event.preventDefault();
                if (!this.paused && !event.repeat && !this.keys.has(event.code)) {
                    if (event.code === 'KeyQ')
                        this.slamRequested = true;
                    else
                        this.rushRequested = true;
                    this.keys.add(event.code);
                }
                return;
            }
            if (!movementKeys.has(event.code) && !attackKeys.includes(event.code))
                return;
            if (event.target instanceof HTMLButtonElement)
                return;
            event.preventDefault();
            // 잠금·일시정지·버튼 선택 뒤에는 남은 키 반복으로 공격이나 보행을 재개하지 않는다.
            if (event.repeat && !this.keys.has(event.code))
                return;
            if (!this.paused) {
                this.keys.add(event.code);
                if (attackKeys.includes(event.code))
                    this.sound.unlock();
            }
        }, { signal });
        window.addEventListener('keyup', (event) => this.keys.delete(event.code), {
            signal,
        });
        window.addEventListener('blur', this.loseFocus, { signal });
        document.addEventListener('visibilitychange', () => {
            if (document.hidden)
                this.loseFocus();
        }, { signal });
        this.slamButton.addEventListener('click', () => {
            if (!this.loaded || this.paused || this.storyBlocked || this.failed)
                return;
            this.slamRequested = true;
            this.canvas.focus();
        }, { signal });
        this.rushButton.addEventListener('click', () => {
            if (!this.loaded || this.paused || this.storyBlocked || this.failed)
                return;
            this.rushRequested = true;
            this.canvas.focus();
        }, { signal });
        this.resume.addEventListener('click', () => {
            if (this.storyBlocked)
                return;
            if (this.failed) {
                location.reload();
                return;
            }
            this.setPaused(false);
            this.canvas.focus();
        }, { signal });
        this.resetButton.addEventListener('click', () => {
            if ('entry' in this.options ||
                !this.loaded ||
                this.failed ||
                this.storyBlocked)
                return;
            this.clearInput();
            this.world.reset();
            this.hudFeedback.reset(this.world.snapshot);
            this.renderHudFeedback(performance.now());
            this.scene?.reset();
            this.clearNotice();
            this.canvas.focus();
        }, { signal });
        this.canvas.addEventListener('pointerdown', () => this.canvas.focus(), {
            signal,
        });
        this.canvas.addEventListener('webglcontextlost', (event) => {
            event.preventDefault();
            this.showError('그래픽 연결이 끊겼어요. 화면을 다시 열어 주세요.');
        }, { signal });
    }
    async start() {
        try {
            await this.loadStylesheet();
            if (this.disposed)
                return;
            this.scene = new ClearingScene(this.canvas, this.world.snapshot);
            await this.scene.load();
            if (this.disposed)
                return;
            this.loaded = true;
            this.setPaused(false);
            const state = this.world.snapshot;
            this.scene.render(state, 0);
            this.renderHud(state);
            this.renderHudFeedback(performance.now());
            await waitForRenderedFrame(this.lifetime.signal);
            if (this.disposed)
                return;
            this.focus();
            if (!this.transitionBlocked)
                this.schedule();
        }
        catch (error) {
            if (this.disposed)
                return;
            this.scene?.dispose();
            this.scene = null;
            this.showError(error instanceof Error
                ? error.message
                : '공터를 준비하지 못했어요. WebGL 2 지원 브라우저에서 열어 주세요.');
            throw error;
        }
    }
    loadStylesheet() {
        return new Promise((resolve, reject) => {
            const { signal } = this.lifetime;
            this.stylesheet.rel = 'stylesheet';
            this.stylesheet.href = new URL('../../../../src/prototypes/land-clearing/style.css', import.meta.url).href;
            this.stylesheet.addEventListener('load', () => resolve(), {
                once: true,
                signal,
            });
            this.stylesheet.addEventListener('error', () => reject(new Error('채집 화면 스타일을 불러오지 못했어요.')), { once: true, signal });
            signal.addEventListener('abort', () => resolve(), { once: true });
            document.head.append(this.stylesheet);
        });
    }
    returnToTown() {
        if (!('entry' in this.options) ||
            !this.loaded ||
            this.paused ||
            this.storyBlocked ||
            this.failed ||
            this.disposed ||
            this.returning ||
            this.transitionBlocked)
            return;
        const result = this.world.returnToTown();
        if (!result)
            return;
        this.returning = true;
        this.setTransitionBlocked(true);
        this.options.onReturn(result);
    }
    showError(message) {
        this.failed = true;
        this.keys.clear();
        this.clearHudFeedback();
        cancelAnimationFrame(this.frameId);
        this.overlay.hidden = false;
        this.overlayTitle.textContent = '공터를 준비하지 못했어요';
        this.overlayMessage.textContent = message;
        this.resume.textContent = '다시 열기';
        this.resume.hidden = false;
    }
    clearInput = () => {
        // 창 밖에서 키를 놓쳐도 입력이 남지 않고, 복귀 시 누적 시간을 건너뛴다.
        this.keys.clear();
        this.slamRequested = false;
        this.rushRequested = false;
        this.world.cancelSkillRequest();
        this.previousTime = performance.now();
    };
    loseFocus = () => {
        this.clearInput();
        // 창을 떠난 동안 자동 돌진으로 멀리 이동하지 않는다.
        this.world.stopRush();
        this.hudFeedback.synchronizeReadiness(this.world.snapshot);
        this.renderHudFeedback(performance.now());
    };
    setPaused(paused) {
        if (!this.loaded || this.failed)
            return;
        this.paused = paused;
        this.clearInput();
        this.hudFeedback.synchronizeReadiness(this.world.snapshot);
        this.renderHudFeedback(performance.now());
        this.overlay.hidden = !paused;
        this.overlayTitle.textContent = '잠깐 쉬어가기';
        this.overlayMessage.textContent = '준비되면 공터 정리를 이어가세요.';
        this.resume.hidden = false;
    }
    schedule() {
        if (!this.loaded ||
            this.disposed ||
            this.failed ||
            this.transitionBlocked ||
            this.returning ||
            this.frameId)
            return;
        this.previousTime = performance.now();
        this.frameId = requestAnimationFrame(this.tick);
    }
    tick = (now) => {
        this.frameId = 0;
        if (this.disposed ||
            this.failed ||
            this.transitionBlocked ||
            this.returning)
            return;
        const dt = this.paused || this.storyBlocked
            ? 0
            : Math.max(0, Math.min((now - this.previousTime) / 1000, 0.05));
        this.previousTime = now;
        this.updateWorld(dt);
        if (this.world.canReturn) {
            this.returnToTown();
            if (this.disposed || this.returning || this.transitionBlocked)
                return;
        }
        this.presentImpacts();
        this.presentLoot();
        this.presentSlams();
        this.presentDiscoveries();
        if (this.disposed)
            return;
        this.noticeTime = Math.max(0, this.noticeTime - dt);
        this.notice.hidden = this.noticeTime <= 0;
        const state = this.world.snapshot;
        this.scene?.render(state, dt);
        this.renderHud(state);
        this.hudFeedback.update(state, now);
        this.renderHudFeedback(now);
        if (this.dev)
            this.diagnostics.textContent = JSON.stringify({
                ...state,
                paused: this.paused,
                transitionBlocked: this.transitionBlocked,
                storyBlocked: this.storyBlocked,
                canReturn: this.world.canReturn,
                ...this.scene?.diagnostics,
            });
        this.frameId = requestAnimationFrame(this.tick);
    };
    updateWorld(dt) {
        const pressed = (key) => Number(this.keys.has(key));
        this.world.update(dt, {
            x: pressed('ArrowRight') - pressed('ArrowLeft'),
            z: pressed('ArrowDown') - pressed('ArrowUp'),
            working: attackKeys.some((key) => this.keys.has(key)),
            slam: this.slamRequested,
            rush: this.rushRequested,
        });
        this.slamRequested = false;
        this.rushRequested = false;
    }
    presentImpacts() {
        const impacts = this.world.takeImpacts();
        this.scene?.addImpacts(impacts);
        for (const impact of impacts) {
            if (!impact.source || impact.source === 'normal')
                this.sound.play(impact);
        }
    }
    presentLoot() {
        const events = this.world.takeLootEvents();
        this.scene?.addLootEvents(events);
        if (events.some((event) => event.type === 'opened'))
            this.showNotice('떠내려온 상자를 열었어요', 2);
    }
    presentSlams() {
        const slams = this.world.takeSlams();
        this.scene?.addSlams(slams, this.world.snapshot);
        for (const slam of slams) {
            this.showNotice(slam.cleared > 0
                ? `지면 강타 · ${slam.cleared}개를 한 번에!`
                : '지면 강타', 2);
        }
    }
    presentDiscoveries() {
        for (const event of this.world.takeDiscoveries()) {
            const message = {
                'spring-opened': '샘물과 함께 나뭇가지가 떠내려와요',
                'bridge-ready': '쓰러진 나무가 물길을 이었어요',
                'bank-reached': '물길 너머 꽃밭까지 길이 이어졌어요',
            }[event];
            this.showNotice(message, 3);
            if ('entry' in this.options)
                this.options.onDiscovery?.(event);
            // 통지에서 호스트가 화면을 전환해도 뒤따르는 렌더·통지·루프를 남기지 않는다.
            if (this.disposed)
                return;
        }
    }
    showNotice(message, duration) {
        this.notice.textContent = message;
        this.noticeTime = duration;
    }
    clearNotice() {
        this.notice.textContent = '';
        this.noticeTime = 0;
    }
    renderHud(state) {
        this.charge.max = energyRules.capacity;
        this.charge.value = state.energy.charge;
        this.chargeLabel.textContent = `기세 ${state.energy.charge} / ${energyRules.capacity}`;
        this.slamButton.dataset.ready = String(state.slam.ready);
        this.rushButton.dataset.ready = String(state.rush.ready);
        this.rushButton.disabled =
            !state.rush.ready || this.paused || this.storyBlocked;
        this.rushButton.title = `W · 기세 ${energyRules.costs.rush}칸 · ${rushRules.duration}초 동안 방향키로 방향을 바꾸며 돌진`;
        this.slamButton.disabled =
            !state.slam.ready ||
                !!state.slam.action ||
                this.paused ||
                this.storyBlocked;
        this.slamButton.title = state.slam.ready
            ? `Q · 기세 ${energyRules.costs.slam}칸 · 주변 채집물을 한 번에 정리`
            : `Q · 기세 ${energyRules.costs.slam}칸 필요 · 채집물을 정리하면 충전`;
        this.woodLabel.textContent = String(state.wood);
        this.stoneLabel.textContent = String(state.stone);
        const marker = this.scene?.exitMarker;
        this.exitHint.hidden = !('entry' in this.options) || !marker?.visible;
        if (marker) {
            this.exitHint.style.left = `${marker.x}px`;
            this.exitHint.style.top = `${marker.y}px`;
        }
        this.targetLabel.textContent = interactionDescription(state);
        this.targetLabel.hidden = !this.targetLabel.textContent;
    }
    renderHudFeedback(now) {
        const feedback = this.hudFeedback.snapshot(now);
        for (const [element, amount] of [
            [this.woodGain, feedback.woodGain],
            [this.stoneGain, feedback.stoneGain],
        ]) {
            element.textContent = amount > 0 ? `+${amount}` : '';
            element.hidden = amount <= 0;
        }
        this.slamButton.dataset.readyPulse = String(feedback.slamPulse);
        this.rushButton.dataset.readyPulse = String(feedback.rushPulse);
    }
    clearHudFeedback() {
        this.hudFeedback.reset(this.world.snapshot);
        this.renderHudFeedback(performance.now());
    }
    getSpeakerAnchor(speaker) {
        if (speaker !== 'ataho' || !this.loaded || this.failed || this.disposed)
            return null;
        const anchor = this.scene?.speakerAnchor;
        if (!anchor)
            return null;
        const canvas = this.canvas.getBoundingClientRect();
        const root = this.options.root.getBoundingClientRect();
        return {
            x: anchor.x + canvas.left - root.left,
            y: anchor.y + canvas.top - root.top,
            visible: anchor.visible && canvas.width > 0 && canvas.height > 0,
        };
    }
    setStoryBlocked(blocked) {
        if (this.disposed)
            return;
        this.storyBlocked = blocked;
        this.loseFocus();
    }
    setTransitionBlocked(blocked) {
        if (this.disposed)
            return;
        this.transitionBlocked = blocked;
        this.host.inert = blocked;
        this.loseFocus();
        cancelAnimationFrame(this.frameId);
        this.frameId = 0;
        if (!blocked)
            this.schedule();
    }
    focus() {
        if (!this.loaded ||
            this.disposed ||
            this.failed ||
            this.storyBlocked ||
            this.transitionBlocked)
            return;
        if (this.paused)
            this.resume.focus();
        else
            this.canvas.focus();
    }
    dispose() {
        if (this.disposed)
            return;
        this.disposed = true;
        this.clearHudFeedback();
        this.lifetime.abort();
        cancelAnimationFrame(this.frameId);
        this.keys.clear();
        this.scene?.dispose();
        this.sound.dispose();
        this.stylesheet.remove();
        this.host.remove();
    }
}
