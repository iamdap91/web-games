import { isRecord, readStudioState, } from './bridge.js';
import { studioSceneUrl } from './catalog.js';
/** 선택한 한 장면의 문서·연결만 소유하며 재생 시각은 자식 화면에 둔다. */
export class StudioViewport {
    onState;
    onStep;
    frame = document.createElement('iframe');
    events = new AbortController();
    item;
    ready = false;
    constructor(container, onState, onStep) {
        this.onState = onState;
        this.onStep = onStep;
        this.frame.title = '선택 연출';
        this.frame.className = 'studio-frame';
        container.append(this.frame);
        window.addEventListener('message', (event) => {
            if (event.origin !== location.origin ||
                event.source !== this.frame.contentWindow)
                return;
            if (isRecord(event.data) &&
                event.data.type === 'cutscene-studio-step' &&
                (event.data.direction === -1 || event.data.direction === 1)) {
                this.onStep(event.data.direction);
                return;
            }
            const message = readStudioState(event.data);
            if (!message || message.source !== this.item?.source)
                return;
            this.ready = true;
            if (message.state.itemId !== this.item.sampleId) {
                this.send({ action: 'select', value: this.item.sampleId });
                return;
            }
            this.onState(message);
        }, { signal: this.events.signal });
    }
    show(item) {
        const previous = this.item;
        this.item = item;
        this.frame.title = `${item.title} · 연출`;
        if (previous?.source === item.source) {
            if (this.ready)
                this.send({ action: 'select', value: item.sampleId });
            return;
        }
        this.release();
        this.ready = false;
        this.frame.src = studioSceneUrl(item).href;
    }
    send(command) {
        if (this.ready)
            this.frame.contentWindow?.postMessage({ type: 'cutscene-studio-command', command }, location.origin);
    }
    release() {
        try {
            this.frame.contentWindow?.dispatchEvent(new Event('resource-scene-dispose'));
        }
        catch {
            /* 문서가 바뀌는 중이면 pagehide가 화면을 정리한다. */
        }
    }
    dispose() {
        this.release();
        this.events.abort();
        this.frame.remove();
        this.item = undefined;
        this.ready = false;
    }
}
