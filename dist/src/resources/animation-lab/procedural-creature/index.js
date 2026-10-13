import { embeddedScene, registerEmbeddedScene, } from '../../catalog/embedded-scene.js';
import { ProceduralCreature, groundY, sceneSize, } from './creature.js';
import { drawScene } from './drawing.js';
function element(id, type) {
    const item = document.getElementById(id);
    if (!(item instanceof type))
        throw new Error(`필수 화면 요소 없음: ${id}`);
    return item;
}
class CreatureScene {
    creature = new ProceduralCreature();
    events = new AbortController();
    canvas = element('scene', HTMLCanvasElement);
    context = this.canvas.getContext('2d');
    buffer = document.createElement('canvas');
    bufferContext = this.buffer.getContext('2d');
    resizeObserver;
    keys = new Set();
    frame = 0;
    previousTime = 0;
    disposed = false;
    skeleton = false;
    selectedRock = null;
    dragPointer = null;
    heldDirection = 0;
    lastStatus = '';
    mode = element('mode', HTMLSpanElement);
    reaction = element('reaction', HTMLSpanElement);
    steps = element('steps', HTMLSpanElement);
    constructor() {
        if (!this.context || !this.bufferContext)
            throw new Error('Canvas 2D를 사용할 수 없습니다.');
        this.buffer.width = sceneSize.width;
        this.buffer.height = sceneSize.height;
        this.resizeObserver = new ResizeObserver(() => this.resize());
        this.resizeObserver.observe(this.canvas);
        this.bindControls();
        this.bindPointer();
        window.addEventListener('keydown', (event) => this.keyDown(event), {
            signal: this.events.signal,
        });
        window.addEventListener('keyup', (event) => {
            this.keys.delete(event.code);
            this.updateMovement();
        }, { signal: this.events.signal });
        window.addEventListener('blur', () => this.releaseInput(), {
            signal: this.events.signal,
        });
        document.addEventListener('visibilitychange', () => {
            if (document.hidden)
                this.releaseInput();
            this.previousTime = 0;
        }, { signal: this.events.signal });
        window.addEventListener('pagehide', () => this.dispose(), {
            once: true,
            signal: this.events.signal,
        });
        registerEmbeddedScene(() => this.dispose());
        this.resize();
        this.frame = requestAnimationFrame((time) => this.animate(time));
    }
    dispose() {
        if (this.disposed)
            return;
        this.disposed = true;
        cancelAnimationFrame(this.frame);
        this.resizeObserver.disconnect();
        this.events.abort();
        this.releaseInput();
    }
    bindControls() {
        const actions = {
            automatic: () => this.creature.toggleAutomatic(),
            reverse: () => this.creature.reverse(),
            push: () => this.creature.push(),
            pause: () => this.creature.togglePause(),
            slow: () => this.creature.toggleSlow(),
            skeleton: () => {
                this.skeleton = !this.skeleton;
            },
            reset: () => {
                this.releaseInput();
                this.creature.reset();
                this.selectedRock = null;
            },
        };
        for (const [id, action] of Object.entries(actions)) {
            element(id, HTMLButtonElement).addEventListener('click', () => {
                action();
                this.syncControls();
            }, { signal: this.events.signal });
        }
        for (const [id, direction] of [
            ['left', -1],
            ['right', 1],
        ]) {
            const button = element(id, HTMLButtonElement);
            button.addEventListener('pointerdown', (event) => {
                button.setPointerCapture(event.pointerId);
                this.heldDirection = direction;
                this.updateMovement();
            }, { signal: this.events.signal });
            for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) {
                button.addEventListener(name, () => {
                    this.heldDirection = 0;
                    this.updateMovement();
                }, { signal: this.events.signal });
            }
        }
        this.syncControls();
    }
    keyDown(event) {
        const target = event.target;
        if (target instanceof HTMLInputElement ||
            target instanceof HTMLTextAreaElement ||
            (target instanceof HTMLElement && target.isContentEditable))
            return;
        const recognized = [
            'ArrowLeft',
            'ArrowRight',
            'KeyA',
            'KeyD',
            'KeyR',
            'Space',
            'KeyP',
            'Delete',
            'Backspace',
        ];
        if (!recognized.includes(event.code))
            return;
        if (event.code === 'Space' && target instanceof HTMLButtonElement)
            return;
        event.preventDefault();
        this.keys.add(event.code);
        this.updateMovement();
        if (event.repeat)
            return;
        if (event.code === 'KeyR')
            this.creature.reverse();
        if (event.code === 'Space')
            this.creature.push();
        if (event.code === 'KeyP')
            this.creature.togglePause();
        if (['Delete', 'Backspace'].includes(event.code) &&
            this.selectedRock !== null) {
            this.creature.removeRock(this.selectedRock);
            this.selectedRock = null;
        }
        this.syncControls();
    }
    updateMovement() {
        const left = this.keys.has('ArrowLeft') || this.keys.has('KeyA');
        const right = this.keys.has('ArrowRight') || this.keys.has('KeyD');
        this.creature.move(this.heldDirection || (left === right ? 0 : left ? -1 : 1));
    }
    releaseInput() {
        this.keys.clear();
        this.heldDirection = 0;
        this.creature.move(0);
        if (this.dragPointer !== null &&
            this.canvas.hasPointerCapture(this.dragPointer))
            this.canvas.releasePointerCapture(this.dragPointer);
        this.dragPointer = null;
    }
    pointerPosition(event) {
        const bounds = this.canvas.getBoundingClientRect();
        return {
            x: ((event.clientX - bounds.left) / bounds.width) * sceneSize.width,
            y: ((event.clientY - bounds.top) / bounds.height) * sceneSize.height,
        };
    }
    bindPointer() {
        this.canvas.addEventListener('pointerdown', (event) => {
            if (event.button !== 0 || this.dragPointer !== null)
                return;
            this.canvas.focus({ preventScroll: true });
            const point = this.pointerPosition(event);
            const rock = [...this.creature.pose.rocks]
                .reverse()
                .find((item) => Math.abs(point.x - item.x) < item.width / 2 + 6 &&
                point.y > groundY - item.height - 12);
            this.selectedRock =
                rock?.id ?? this.creature.addRock(point.x, groundY - point.y);
            this.dragPointer = event.pointerId;
            this.canvas.setPointerCapture(event.pointerId);
        }, { signal: this.events.signal });
        this.canvas.addEventListener('pointermove', (event) => {
            if (event.pointerId !== this.dragPointer || this.selectedRock === null)
                return;
            const point = this.pointerPosition(event);
            this.creature.placeRock(this.selectedRock, point.x, groundY - point.y);
        }, { signal: this.events.signal });
        for (const name of [
            'pointerup',
            'pointercancel',
            'lostpointercapture',
        ]) {
            this.canvas.addEventListener(name, (event) => {
                if (event.pointerId !== this.dragPointer)
                    return;
                this.dragPointer = null;
                if (this.canvas.hasPointerCapture(event.pointerId))
                    this.canvas.releasePointerCapture(event.pointerId);
            }, { signal: this.events.signal });
        }
    }
    resize() {
        const bounds = this.canvas.getBoundingClientRect();
        const dpr = Math.min(window.devicePixelRatio || 1, 3);
        this.canvas.width = Math.max(1, Math.round(bounds.width * dpr));
        this.canvas.height = Math.max(1, Math.round(bounds.height * dpr));
        this.draw();
    }
    animate(time) {
        if (this.disposed)
            return;
        if (this.previousTime && !document.hidden)
            this.creature.update((time - this.previousTime) / 1000);
        this.previousTime = time;
        this.draw();
        this.frame = requestAnimationFrame((next) => this.animate(next));
    }
    draw() {
        if (!this.context || !this.bufferContext)
            return;
        const pose = this.creature.pose;
        drawScene(this.bufferContext, pose, {
            skeleton: this.skeleton,
            selectedRock: this.selectedRock,
        });
        this.context.setTransform(1, 0, 0, 1, 0, 0);
        this.context.imageSmoothingEnabled = false;
        this.context.drawImage(this.buffer, 0, 0, this.canvas.width, this.canvas.height);
        const status = `${pose.reaction}/${pose.steps}/${pose.paused}/${pose.automatic}`;
        if (status === this.lastStatus)
            return;
        this.lastStatus = status;
        this.reaction.textContent = pose.reaction;
        this.steps.textContent = `${pose.steps} 걸음`;
        this.mode.textContent = pose.paused
            ? '시간 멈춤'
            : pose.automatic
                ? '자동 산책'
                : '직접 움직이기';
    }
    syncControls() {
        const pose = this.creature.pose;
        for (const [id, pressed] of [
            ['automatic', pose.automatic],
            ['pause', pose.paused],
            ['slow', pose.slow],
            ['skeleton', this.skeleton],
        ]) {
            element(id, HTMLButtonElement).setAttribute('aria-pressed', String(pressed));
        }
        element('pause', HTMLButtonElement).textContent = pose.paused
            ? '계속하기'
            : '일시정지';
    }
}
new CreatureScene();
if (embeddedScene)
    document.body.dataset.embedded = 'true';
