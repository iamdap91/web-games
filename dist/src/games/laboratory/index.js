import { VirtualStick } from './virtual-stick.js';
import { GameDisplay } from './game-display.js';
import { LoadingOverlay } from './loading-overlay.js';
import { WebSpace } from './web-space.js';
import { anomalies, anomalyDetails } from './anomalies.js';
import { AnimationPlayer } from '../../resources/preview/animation-player.js';
import { getContext, loadAssets } from './assets.js';
import { LaboratoryGame, isSelection, } from './game.js';
import { drawGame } from './renderer.js';
import { viewport } from './layout.js';
import { formatDiagnostics } from './diagnostics.js';
function element(id, type) {
    const node = document.getElementById(id);
    if (!(node instanceof type))
        throw new Error(`화면 요소가 없습니다: ${id}`);
    return node;
}
function setText(node, value) {
    if (node.textContent !== value)
        node.textContent = value;
}
class GameScreen {
    game = new LaboratoryGame();
    canvas = element('scene', HTMLCanvasElement);
    context = getContext(this.canvas);
    shell = element('game-shell', HTMLDivElement);
    jumpButton = element('jump', HTMLButtonElement);
    stick = null;
    display = null;
    playArea = element('play-area', HTMLDivElement);
    ending = element('ending', HTMLElement);
    endingTitle = element('ending-title', HTMLHeadingElement);
    status = element('status', HTMLParagraphElement);
    restartButton = element('restart', HTMLButtonElement);
    replayButton = element('replay', HTMLButtonElement);
    previewExitButton = element('preview-exit', HTMLButtonElement);
    selection = element('scenario', HTMLSelectElement);
    characterSelection = element('character', HTMLSelectElement);
    diagnostics = element('diagnostics', HTMLParagraphElement);
    developer = new URLSearchParams(location.search).get('dev') === '1';
    events = new AbortController();
    observer = new ResizeObserver(() => this.resize());
    keys = new Set();
    jumpPointers = new Set();
    controlPointers = new Set();
    suppressControlClick = false;
    assets = null;
    animation = null;
    webSpace = null;
    loadingOverlay = null;
    motion = 'stand';
    requestId = 0;
    previousTime = 0;
    accumulator = 0;
    paused = false;
    lastPhase = '';
    async start() {
        const { signal } = this.events;
        window.addEventListener('pagehide', (event) => {
            this.clearInput();
            if (!event.persisted)
                this.destroy();
        }, { signal });
        this.display = new GameDisplay(this.shell, element('stage-slot', HTMLDivElement), element('stage-frame', HTMLDivElement), element('landscape-toggle', HTMLButtonElement), () => {
            this.clearInput();
            this.resize();
        });
        this.assets = await loadAssets();
        if (signal.aborted)
            return;
        this.animation = new AnimationPlayer(this.assets.character.appearance.animations, 'stand');
        this.webSpace = new WebSpace(this.canvas, this.assets, this.shell, () => this.display?.rotated ?? false);
        this.loadingOverlay = new LoadingOverlay(this.canvas, this.assets);
        element('developer', HTMLElement).hidden = !this.developer;
        this.selection.disabled =
            this.replayButton.disabled =
                this.previewExitButton.disabled =
                    !this.developer;
        for (const key of anomalies) {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = anomalyDetails[key].title;
            this.selection.append(option);
        }
        this.restartButton.disabled = false;
        this.characterSelection.value = 'toben';
        this.characterSelection.disabled = false;
        this.characterSelection.addEventListener('change', () => this.changeCharacter(), { signal });
        this.selection.addEventListener('change', () => this.restart(), { signal });
        this.replayButton.addEventListener('click', () => this.restart(), {
            signal,
        });
        this.restartButton.addEventListener('click', () => this.restart(), {
            signal,
        });
        this.previewExitButton.addEventListener('click', () => {
            if (!this.developer)
                return;
            this.clearInput();
            this.game.previewExit();
            this.motion = 'stand';
            this.animation?.play('stand');
            this.updateInterface();
            this.canvas.focus({ preventScroll: true });
        }, { signal });
        element('ending-restart', HTMLButtonElement).addEventListener('click', () => this.restart(), { signal });
        element('show-records', HTMLButtonElement).addEventListener('click', () => this.showEndingPanel('records'), { signal });
        element('show-credits', HTMLButtonElement).addEventListener('click', () => this.showEndingPanel('credits'), { signal });
        window.addEventListener('keydown', this.keyDown, { signal });
        window.addEventListener('keyup', (event) => {
            if (document.activeElement === this.canvas &&
                (event.code === 'AltLeft' || event.code === 'AltRight'))
                event.preventDefault();
            this.keys.delete(event.code);
        }, { signal });
        window.addEventListener('blur', () => {
            this.paused = true;
            this.clearInput();
        }, { signal });
        window.addEventListener('focus', () => {
            this.paused = false;
            this.previousTime = 0;
        }, { signal });
        document.addEventListener('visibilitychange', () => {
            this.paused = document.hidden;
            this.clearInput();
        }, { signal });
        this.canvas.addEventListener('blur', () => this.clearInput(), { signal });
        this.canvas.addEventListener('pointerdown', () => this.canvas.focus(), {
            signal,
        });
        this.stick = new VirtualStick({
            root: element('move-stick', HTMLDivElement),
            knob: element('stick-knob', HTMLSpanElement),
            isRotated: () => this.display?.rotated ?? false,
            onStart: (pointerId) => {
                this.canvas.focus({ preventScroll: true });
                this.controlPointers.add(pointerId);
            },
            onDirection: (direction) => this.game.face(direction),
        });
        this.bindJump();
        // 엔딩으로 조작 버튼이 사라져도 손을 떼며 새 화면의 버튼을 누르지 않게 한다.
        window.addEventListener('pointerdown', (event) => {
            this.suppressControlClick = false;
            if (event.isPrimary)
                this.controlPointers.clear();
            this.controlPointers.delete(event.pointerId);
        }, { signal, capture: true });
        window.addEventListener('pointerup', (event) => {
            this.suppressControlClick = this.controlPointers.delete(event.pointerId);
        }, { signal, capture: true });
        window.addEventListener('click', (event) => {
            if (!this.suppressControlClick || event.detail === 0)
                return;
            this.suppressControlClick = false;
            event.preventDefault();
            event.stopPropagation();
        }, { signal, capture: true });
        window.addEventListener('pointercancel', (event) => {
            this.controlPointers.delete(event.pointerId);
        }, { signal });
        window.addEventListener('resize', () => this.resize(), { signal });
        this.observer.observe(this.canvas);
        this.resize();
        this.status.classList.add('sr-only');
        this.canvas.focus({ preventScroll: true });
        if (this.animation)
            this.webSpace?.render(this.game.snapshot, this.animation.currentFrame.frame);
        if (this.animation)
            this.loadingOverlay?.render(this.game.snapshot, this.animation.currentFrame.frame);
        this.updateInterface();
        this.requestId = requestAnimationFrame(this.tick);
    }
    destroy() {
        this.events.abort();
        this.display?.destroy();
        this.stick?.destroy();
        this.webSpace?.destroy();
        this.loadingOverlay?.destroy();
        this.observer.disconnect();
        cancelAnimationFrame(this.requestId);
        this.clearInput();
    }
    changeCharacter() {
        const character = this.characterSelection.value;
        if (!this.assets ||
            (character !== 'toben' && character !== 'ataho' && character !== 'smashu'))
            return;
        this.clearInput();
        this.assets.character.select(character);
        const player = this.game.snapshot.player;
        this.motion = player.motion;
        this.animation = new AnimationPlayer(this.assets.character.appearance.animations, player.motion);
        this.animation.update(player.motionElapsed);
        this.canvas.focus({ preventScroll: true });
    }
    restart() {
        const value = this.selection.value;
        const selection = this.developer && isSelection(value) ? value : 'random';
        this.clearInput();
        this.game.reset(selection);
        this.motion = 'stand';
        this.animation?.play('stand');
        this.updateInterface();
        this.canvas.focus({ preventScroll: true });
    }
    keyDown = (event) => {
        // 선택 상자·버튼에 포커스가 있으면 브라우저 기본 조작에 맡긴다.
        if (document.activeElement !== this.canvas)
            return;
        if (!['ArrowLeft', 'ArrowRight', 'AltLeft', 'AltRight'].includes(event.code))
            return;
        event.preventDefault();
        if (event.repeat)
            return;
        this.keys.add(event.code);
        this.game.face(this.direction);
        if (event.code === 'AltLeft' || event.code === 'AltRight')
            this.game.jump(this.direction);
    };
    bindJump() {
        const button = this.jumpButton;
        const { signal } = this.events;
        button.disabled = false;
        button.addEventListener('pointerdown', (event) => {
            if (event.button !== 0)
                return;
            event.preventDefault();
            this.canvas.focus({ preventScroll: true });
            button.setPointerCapture(event.pointerId);
            this.controlPointers.add(event.pointerId);
            this.jumpPointers.add(event.pointerId);
            button.classList.add('pressed');
            this.game.jump(this.direction);
        }, { signal });
        const release = (event) => {
            this.jumpPointers.delete(event.pointerId);
            button.classList.toggle('pressed', this.jumpPointers.size > 0);
        };
        button.addEventListener('contextmenu', (event) => event.preventDefault(), {
            signal,
        });
        button.addEventListener('pointerup', release, { signal });
        button.addEventListener('pointercancel', release, { signal });
        button.addEventListener('lostpointercapture', release, { signal });
    }
    get direction() {
        const left = this.keys.has('ArrowLeft') || this.stick?.direction === -1;
        const right = this.keys.has('ArrowRight') || this.stick?.direction === 1;
        return left === right ? 0 : left ? -1 : 1;
    }
    clearInput() {
        this.keys.clear();
        this.jumpPointers.clear();
        this.jumpButton.classList.remove('pressed');
        this.stick?.reset();
        this.accumulator = 0;
        this.previousTime = 0;
    }
    resize() {
        const bounds = this.canvas.getBoundingClientRect();
        const width = this.display?.rotated ? bounds.height : bounds.width;
        const height = this.display?.rotated ? bounds.width : bounds.height;
        if (width === 0 || height === 0)
            return;
        this.canvas.width = Math.round(width * devicePixelRatio);
        this.canvas.height = Math.round(height * devicePixelRatio);
        this.context.setTransform(this.canvas.width / viewport.width, 0, 0, this.canvas.height / viewport.height, 0, 0);
        this.context.imageSmoothingEnabled = false;
        this.webSpace?.resize(width, devicePixelRatio);
        this.loadingOverlay?.resize(width, devicePixelRatio);
    }
    tick = (now) => {
        if (this.events.signal.aborted)
            return;
        const elapsed = this.previousTime
            ? Math.min((now - this.previousTime) / 1000, 0.1)
            : 0;
        this.previousTime = now;
        if (!this.paused && !document.hidden) {
            this.accumulator += elapsed;
            // 프레임이 느려져도 긴 거리를 건너뛰지 않도록 고정 간격으로 계산한다.
            while (this.accumulator >= 1 / 120) {
                this.game.update(1 / 120, this.direction);
                this.accumulator -= 1 / 120;
            }
            const state = this.game.snapshot;
            if (state.player.motion !== this.motion) {
                this.motion = state.player.motion;
                this.animation?.play(this.motion);
            }
            if (state.phase === 'playing')
                this.animation?.update(elapsed);
        }
        if (this.assets && this.animation)
            drawGame(this.context, this.assets, this.game.snapshot, this.animation.currentFrame.frame);
        if (this.animation)
            this.webSpace?.render(this.game.snapshot, this.animation.currentFrame.frame);
        if (this.animation)
            this.loadingOverlay?.render(this.game.snapshot, this.animation.currentFrame.frame);
        this.updateInterface();
        this.requestId = requestAnimationFrame(this.tick);
    };
    showEndingPanel(panel) {
        for (const name of ['records', 'credits']) {
            element(name, HTMLElement).hidden = name !== panel;
            element(`show-${name}`, HTMLButtonElement).setAttribute('aria-pressed', String(name === panel));
        }
    }
    renderEnding() {
        const encounters = element('encounters', HTMLUListElement);
        encounters.replaceChildren();
        const seen = this.game.snapshot.encountered;
        element('no-encounters', HTMLParagraphElement).hidden = seen.length > 0;
        for (const anomaly of seen) {
            const item = document.createElement('li');
            const title = document.createElement('h3');
            const description = document.createElement('p');
            title.textContent = anomalyDetails[anomaly].title;
            description.textContent = anomalyDetails[anomaly].description;
            item.append(title, description);
            encounters.append(item);
        }
        this.showEndingPanel('records');
        this.endingTitle.focus({ preventScroll: true });
    }
    updateInterface() {
        const state = this.game.snapshot;
        document.body.classList.toggle('escaped', state.phase === 'complete');
        this.playArea.hidden = state.phase === 'complete';
        this.restartButton.hidden = state.phase === 'complete';
        this.ending.hidden = state.phase !== 'complete';
        if (state.phase !== this.lastPhase) {
            if (state.phase === 'complete')
                this.renderEnding();
            // 전환 직전의 키가 새 방에서 곧바로 재탈출을 일으키지 않게 해제한다.
            if (state.phase !== 'playing')
                this.clearInput();
        }
        if (state.phase !== 'transition') {
            setText(this.status, state.phase === 'complete'
                ? '8번 방. 탈출했습니다.'
                : state.progress === 8
                    ? '8번 방. 오른쪽에서 빛이 들어옵니다.'
                    : `${state.progress}번 방`);
        }
        this.lastPhase = state.phase;
        setText(this.restartButton, state.phase === 'complete' ? '다시 들어가기' : '처음부터');
        if (this.developer) {
            setText(element('anomaly-cue', HTMLParagraphElement), state.scenario === 'normal'
                ? '정상 기준 풍경'
                : anomalyDetails[state.scenario].cue);
            setText(this.diagnostics, formatDiagnostics(state));
        }
    }
}
const screen = new GameScreen();
void screen.start().catch((error) => {
    screen.destroy();
    const status = element('status', HTMLParagraphElement);
    status.textContent =
        error instanceof Error ? error.message : '게임을 시작하지 못했습니다.';
    status.classList.remove('sr-only');
    status.setAttribute('role', 'alert');
});
