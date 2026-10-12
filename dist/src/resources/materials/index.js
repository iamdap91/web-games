import { MaterialScene } from './material-scene.js';
import { normalizeOutlineSize, outlineGroups, outlineLabel, outlineSettings, surfaces, } from '../../rendering/surface-types.js';
function element(selector) {
    const element = document.querySelector(selector);
    if (!element)
        throw new Error(`화면 요소가 없습니다: ${selector}`);
    return element;
}
class MaterialScreen {
    canvas = element('#scene');
    status = element('#status');
    outlineInput = element('#outline');
    outlineOutput = element('#outline-value');
    lifetime = new AbortController();
    observer;
    controls = new Map();
    outlineControls = new Map();
    scene = null;
    frameId = 0;
    disposed = false;
    constructor() {
        const { signal } = this.lifetime;
        this.outlineInput.min = '0';
        this.outlineInput.max = String(outlineSettings.maxPixelSize);
        this.outlineInput.step = String(outlineSettings.step);
        this.createOutlineControls();
        this.setAllOutlines(outlineSettings.defaultPixelSize);
        this.outlineInput.addEventListener('input', () => {
            this.setAllOutlines(this.outlineInput.valueAsNumber);
            this.requestRender();
        }, { signal });
        const list = element('#surface-controls');
        list.replaceChildren();
        for (const surface of surfaces) {
            const label = document.createElement('label');
            label.className = 'surface-control';
            label.style.setProperty('--swatch', surface.color);
            const name = document.createElement('span');
            name.className = 'surface-name';
            name.textContent = surface.label;
            const description = document.createElement('span');
            description.className = 'surface-description';
            description.id = `${surface.id}-description`;
            description.textContent = surface.description;
            const output = document.createElement('output');
            output.htmlFor = `${surface.id}-strength`;
            output.textContent = `${surface.recommendedStrength}%`;
            const input = document.createElement('input');
            input.type = 'range';
            input.id = `${surface.id}-strength`;
            input.min = '0';
            input.max = '100';
            input.step = '1';
            input.value = String(surface.recommendedStrength);
            input.disabled = true;
            input.setAttribute('aria-label', `${surface.label} 질감 강도`);
            input.setAttribute('aria-describedby', description.id);
            input.setAttribute('aria-valuetext', `${surface.recommendedStrength}%`);
            input.addEventListener('input', () => {
                this.setStrength(surface.id, input.valueAsNumber);
                this.requestRender();
            }, { signal });
            label.append(name, output, description, input);
            list.append(label);
            this.controls.set(surface.id, { input, output });
        }
        element('#outline-recommended').addEventListener('click', () => {
            for (const { id, recommendedPixelSize } of outlineGroups)
                this.setOutline(id, recommendedPixelSize);
            this.refreshOutlineSummary();
            this.requestRender();
        }, { signal });
        const recommended = element('#recommended');
        recommended.addEventListener('click', () => {
            for (const { id, recommendedStrength } of surfaces)
                this.setStrength(id, recommendedStrength);
            this.requestRender();
        }, { signal });
        const reset = element('#reset');
        reset.addEventListener('click', () => {
            for (const { id } of surfaces)
                this.setStrength(id, 100);
            this.requestRender();
        }, { signal });
        this.observer = new ResizeObserver(() => this.requestRender());
        this.observer.observe(this.canvas);
        window.addEventListener('resize', () => this.requestRender(), { signal });
        this.canvas.addEventListener('webglcontextlost', (event) => {
            event.preventDefault();
            this.showError('그래픽 연결이 끊겼어요. 새로고침해 주세요.');
        }, { signal });
        void this.initialize();
    }
    async initialize() {
        try {
            const scene = new MaterialScene(this.canvas);
            this.scene = scene;
            await scene.loadReference();
            if (this.disposed || this.scene !== scene)
                return;
            scene.render();
            this.outlineInput.disabled = false;
            for (const { input } of this.outlineControls.values())
                input.disabled = false;
            for (const { input } of this.controls.values())
                input.disabled = false;
            element('#outline-recommended').disabled = false;
            element('#recommended').disabled = false;
            element('#reset').disabled = false;
            this.status.textContent =
                '윤곽과 표면 무늬를 각각 비교해 보세요. 아타호는 원본 도트를 유지합니다.';
        }
        catch (error) {
            if (this.disposed)
                return;
            this.showError(error instanceof Error ? error.message : '미리보기를 열지 못했어요.');
        }
    }
    createOutlineControls() {
        const list = element('#outline-controls');
        list.replaceChildren();
        for (const group of outlineGroups) {
            const label = document.createElement('label');
            label.className = 'resource-outline';
            const name = document.createElement('span');
            name.className = 'outline-title';
            name.textContent = group.label;
            const description = document.createElement('span');
            description.className = 'outline-description';
            description.id = `${group.id}-outline-description`;
            description.textContent = group.description;
            const input = document.createElement('input');
            input.type = 'range';
            input.id = `${group.id}-outline`;
            input.min = '0';
            input.max = String(outlineSettings.maxPixelSize);
            input.step = String(outlineSettings.step);
            input.disabled = true;
            input.setAttribute('aria-label', `${group.label} 윤곽`);
            input.setAttribute('aria-describedby', description.id);
            const output = document.createElement('output');
            output.htmlFor = input.id;
            input.addEventListener('input', () => {
                this.setOutline(group.id, input.valueAsNumber);
                this.refreshOutlineSummary();
                this.requestRender();
            }, { signal: this.lifetime.signal });
            label.append(name, output, description, input);
            list.append(label);
            this.outlineControls.set(group.id, { input, output });
        }
    }
    setAllOutlines(value) {
        for (const { id } of outlineGroups)
            this.setOutline(id, value);
        this.refreshOutlineSummary();
    }
    setOutline(kind, value) {
        const pixelSize = normalizeOutlineSize(value);
        const label = outlineLabel(pixelSize);
        const { input, output } = this.outlineControls.get(kind);
        input.value = String(pixelSize);
        input.setAttribute('aria-valuetext', label);
        output.textContent = label;
        this.scene?.setOutlinePixelSize(kind, pixelSize);
    }
    refreshOutlineSummary() {
        const sizes = new Set([...this.outlineControls.values()].map(({ input }) => input.valueAsNumber));
        const [value] = sizes;
        const mixed = sizes.size > 1;
        if (!mixed && value !== undefined)
            this.outlineInput.value = String(value);
        const label = mixed
            ? '개별 설정'
            : outlineLabel(value ?? outlineSettings.defaultPixelSize);
        this.outlineOutput.textContent = label;
        this.outlineInput.setAttribute('aria-valuetext', label);
    }
    setStrength(kind, value) {
        const { input, output } = this.controls.get(kind);
        input.value = String(value);
        input.setAttribute('aria-valuetext', `${value}%`);
        output.textContent = `${value}%`;
        this.scene?.setStrength(kind, value);
    }
    requestRender() {
        if (this.disposed || !this.scene || this.frameId)
            return;
        // 슬라이더의 연속 입력을 한 화면 갱신으로 모으고, 멈추면 렌더링도 멈춘다.
        this.frameId = requestAnimationFrame(() => {
            this.frameId = 0;
            this.scene?.render();
        });
    }
    showError(message) {
        cancelAnimationFrame(this.frameId);
        this.frameId = 0;
        this.scene?.dispose();
        this.scene = null;
        this.outlineInput.disabled = true;
        for (const { input } of this.outlineControls.values())
            input.disabled = true;
        for (const { input } of this.controls.values())
            input.disabled = true;
        element('#outline-recommended').disabled = true;
        element('#recommended').disabled = true;
        element('#reset').disabled = true;
        this.status.textContent = message;
    }
    dispose() {
        this.disposed = true;
        cancelAnimationFrame(this.frameId);
        this.observer.disconnect();
        this.lifetime.abort();
        this.scene?.dispose();
    }
}
let screen = new MaterialScreen();
window.addEventListener('pagehide', () => {
    screen?.dispose();
    screen = null;
});
window.addEventListener('pageshow', (event) => {
    if (event.persisted && !screen)
        screen = new MaterialScreen();
});
