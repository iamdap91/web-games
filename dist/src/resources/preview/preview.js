import { resourceUrl } from '../catalog/resource-url.js';
import manifest from '../../../resources/manifest.json' with { type: 'json' };
import { AnimationPlayer, } from './animation-player.js';
import { drawFrame, drawLandscape, sceneHeight, sceneWidth, } from './preview-renderer.js';
const motionNames = {
    stand: '대기',
    move: '이동',
    jump: '점프',
    attack1: '공격',
    hit1: '피격',
    die1: '사망',
};
function getElement(root, id, type) {
    const element = root.querySelector(`#${id}`);
    if (!(element instanceof type))
        throw new Error(`화면 요소를 찾을 수 없습니다: ${id}`);
    return element;
}
export class ResourcePreview {
    canvas;
    status;
    toggle;
    select;
    output;
    root;
    context;
    images = new Map();
    imagePaths;
    animation;
    motions;
    name;
    scale;
    reference;
    resizeObserver = new ResizeObserver(() => this.resizeCanvas());
    events = new AbortController();
    state = 'idle';
    paused = false;
    previousTime = 0;
    animationFrameId = 0;
    constructor(id, scale, previewOptions = {}) {
        this.root = previewOptions.root ?? document;
        this.canvas = getElement(this.root, 'scene', HTMLCanvasElement);
        this.status = getElement(this.root, 'status', HTMLParagraphElement);
        this.toggle = getElement(this.root, 'toggle', HTMLButtonElement);
        this.select = getElement(this.root, 'motion', HTMLSelectElement);
        this.output = getElement(this.root, 'frame', HTMLOutputElement);
        const context = this.canvas.getContext('2d');
        if (!context)
            throw new Error('Canvas 2D를 사용할 수 없습니다.');
        this.context = context;
        const asset = manifest.assets.find((entry) => entry.id === id);
        if (!asset)
            throw new Error(`리소스 목록에 ${id}가 없습니다.`);
        const animations = new Map();
        for (const [name, animation] of Object.entries(asset.animations)) {
            if (!animation || animation.frames.length === 0)
                continue;
            animations.set(name, animation);
        }
        const initialMotion = animations.has('stand')
            ? 'stand'
            : animations.keys().next().value;
        if (!initialMotion)
            throw new Error(`표시할 모션이 없습니다: ${asset.name}`);
        this.animation = new AnimationPlayer(animations, initialMotion);
        this.motions = animations;
        this.name = asset.name;
        this.scale = scale;
        const referenceAsset = previewOptions.reference
            ? manifest.assets.find((item) => item.id === previewOptions.reference.assetId)
            : null;
        const referenceFrame = referenceAsset?.animations.stand?.frames[0];
        if (previewOptions.reference && !referenceFrame)
            throw new Error('비교할 대기 리소스가 없습니다.');
        this.reference =
            referenceAsset && referenceFrame && previewOptions.reference
                ? {
                    name: referenceAsset.name,
                    frame: referenceFrame,
                    scale: previewOptions.reference.scale,
                }
                : null;
        this.imagePaths = [
            ...new Set([
                ...(this.reference ? [this.reference.frame.localPath] : []),
                ...[...animations.values()].flatMap((animation) => animation.frames.map((frame) => frame.localPath)),
            ]),
        ];
        const options = document.createDocumentFragment();
        const groups = new Map();
        for (const [name, animation] of animations) {
            const option = new Option(animation.label ?? motionNames[name] ?? name, name);
            if (!animation.group) {
                options.append(option);
                continue;
            }
            let group = groups.get(animation.group);
            if (!group) {
                group = document.createElement('optgroup');
                group.label = animation.group;
                groups.set(animation.group, group);
                options.append(group);
            }
            group.append(option);
        }
        this.select.replaceChildren(options);
        this.select.value = initialMotion;
        this.showMotionNotes();
    }
    async start() {
        if (this.state !== 'idle')
            return;
        this.state = 'loading';
        const { signal } = this.events;
        window.addEventListener('pagehide', this.handlePageHide, { signal });
        this.resizeCanvas();
        try {
            await Promise.all(this.imagePaths.map((path) => this.loadImage(path)));
        }
        catch (error) {
            if (signal.aborted)
                return;
            this.destroy();
            throw error;
        }
        // 로딩 중 화면이 종료되면 이벤트와 실행 루프를 다시 등록하지 않는다.
        if (signal.aborted)
            return;
        this.state = 'running';
        this.select.disabled = false;
        this.toggle.disabled = false;
        this.status.textContent = `로컬 이미지 ${this.images.size}개 준비 완료 · ←/↑ 이전 · →/↓ 다음 모션`;
        this.select.addEventListener('change', this.handleMotionChange, { signal });
        this.toggle.addEventListener('click', this.handleToggle, { signal });
        window.addEventListener('keydown', this.handleMotionKeyDown, { signal });
        window.addEventListener('resize', this.resizeCanvas, { signal });
        this.resizeObserver.observe(this.canvas);
        this.animationFrameId = requestAnimationFrame(this.animate);
    }
    destroy() {
        this.state = 'destroyed';
        cancelAnimationFrame(this.animationFrameId);
        this.resizeObserver.disconnect();
        this.events.abort();
        this.images.clear();
        this.select.disabled = true;
        this.toggle.disabled = true;
    }
    restart() {
        if (this.state !== 'running')
            return;
        this.animation.play(this.select.value);
        this.previousTime = 0;
        this.paused = false;
        this.toggle.textContent = '일시정지';
        this.draw();
    }
    async loadImage(path) {
        const image = new Image();
        image.src = resourceUrl(path).href;
        try {
            await image.decode();
        }
        catch {
            throw new Error(`로컬 이미지가 없습니다: ${path}`);
        }
        if (!this.events.signal.aborted)
            this.images.set(path, image);
    }
    handlePageHide = (event) => {
        // 뒤로 가기 캐시에 보관되는 화면은 복귀 후 기존 상태로 재생을 이어간다.
        if (!event.persisted)
            this.destroy();
    };
    handleMotionChange = () => {
        this.animation.play(this.select.value);
        this.showMotionNotes();
        this.draw();
    };
    handleMotionKeyDown = (event) => {
        if (event.defaultPrevented ||
            event.altKey ||
            event.ctrlKey ||
            event.metaKey ||
            event.shiftKey ||
            this.select.options.length < 2)
            return;
        let direction;
        if (event.key === 'ArrowLeft' || event.key === 'ArrowUp')
            direction = -1;
        else if (event.key === 'ArrowRight' || event.key === 'ArrowDown')
            direction = 1;
        else
            return;
        // 모션 선택 외의 입력창에서는 기존 키보드 조작을 유지한다.
        const target = event.target;
        if (target instanceof HTMLElement &&
            target !== this.select &&
            (target.isContentEditable || target.closest('input, textarea, select')))
            return;
        event.preventDefault();
        const nextIndex = Math.max(0, Math.min(this.select.options.length - 1, this.select.selectedIndex + direction));
        if (nextIndex === this.select.selectedIndex)
            return;
        this.select.selectedIndex = nextIndex;
        this.handleMotionChange();
    };
    showMotionNotes() {
        const notes = this.root.querySelector('#motion-notes');
        if (notes)
            notes.textContent = this.motions.get(this.select.value)?.notes ?? '';
    }
    handleToggle = () => {
        this.paused = !this.paused;
        this.toggle.textContent = this.paused ? '재생' : '일시정지';
    };
    resizeCanvas = () => {
        const bounds = this.canvas.getBoundingClientRect();
        const ratio = window.devicePixelRatio || 1;
        this.canvas.width = Math.round(bounds.width * ratio);
        this.canvas.height = Math.round(bounds.height * ratio);
        // 월드 좌표를 backing store에 직접 매핑해 CSS 크기와 DPR을 함께 반영한다.
        this.context.setTransform(this.canvas.width / sceneWidth, 0, 0, this.canvas.height / sceneHeight, 0, 0);
        this.context.imageSmoothingEnabled = false;
        this.draw();
    };
    draw() {
        drawLandscape(this.context);
        const { frame, index, totalFrames } = this.animation.currentFrame;
        const image = this.images.get(frame.localPath);
        if (!image)
            return;
        if (this.reference) {
            const referenceImage = this.images.get(this.reference.frame.localPath);
            if (referenceImage)
                drawFrame(this.context, this.reference.frame, referenceImage, this.reference.name, this.reference.scale, { x: sceneWidth * 0.26 });
        }
        drawFrame(this.context, frame, image, this.name, this.scale, {
            x: this.reference ? sceneWidth * 0.7 : sceneWidth / 2,
        });
        const label = `${index + 1} / ${totalFrames} 프레임`;
        if (this.output.value !== label)
            this.output.value = label;
    }
    animate = (time) => {
        const delta = this.previousTime === 0
            ? 0
            : Math.min((time - this.previousTime) / 1000, 0.1);
        this.previousTime = time;
        if (!this.paused && !document.hidden) {
            this.animation.update(delta);
            this.draw();
        }
        this.animationFrameId = requestAnimationFrame(this.animate);
    };
}
export function startPreview(id, scale) {
    const status = getElement(document, 'status', HTMLParagraphElement);
    const showError = (error) => {
        status.textContent =
            error instanceof Error ? error.message : '리소스를 불러오지 못했습니다.';
        status.setAttribute('role', 'alert');
    };
    try {
        const preview = new ResourcePreview(id, scale);
        void preview.start().catch(showError);
    }
    catch (error) {
        showError(error);
    }
}
