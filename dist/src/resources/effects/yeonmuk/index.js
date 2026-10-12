import { resourceUrl } from '../../catalog/resource-url.js';
import manifest from '../../../../resources/manifest.json' with { type: 'json' };
function element(id) {
    const found = document.getElementById(id);
    if (!found)
        throw new Error(`연묵 효과 화면 요소가 없습니다: ${id}`);
    return found;
}
function frameAt(clip, elapsed) {
    let remaining = clip.loop
        ? elapsed % clip.durationSeconds
        : Math.min(elapsed, clip.durationSeconds);
    for (const [index, frame] of clip.frames.entries()) {
        remaining -= frame.durationSeconds ?? 0.14;
        if (remaining < 0 || index === clip.frames.length - 1)
            return index;
    }
    return 0;
}
class YeonmukVfxPreview {
    images = new Map();
    clips = new Map();
    views = [];
    events = new AbortController();
    toggle = element('toggle');
    restart = element('restart');
    scale = element('scale');
    elapsed = 0;
    previousTime = 0;
    paused = false;
    disposed = false;
    animationFrame = 0;
    actorPath = 'public/assets/maplestory/fox-talismanist-ai/runtime/yeonmuk-front-01.png';
    async start() {
        const asset = manifest.assets.find((item) => item.id === 'ai/yeonmuk-vfx');
        if (!asset || !('talisman-flight' in asset.animations))
            throw new Error('연묵 효과 리소스가 없습니다.');
        const container = element('clips');
        for (const [key, clip] of Object.entries(asset.animations)) {
            this.clips.set(key, clip);
            const article = document.createElement('article');
            const title = document.createElement('h2');
            title.textContent = clip.label;
            const canvas = document.createElement('canvas');
            canvas.dataset.clip = key;
            canvas.setAttribute('aria-label', clip.label);
            const output = document.createElement('output');
            output.dataset.clip = key;
            const note = document.createElement('p');
            note.textContent = `${clip.frames[0].width}×${clip.frames[0].height} · ${clip.frames.length}프레임 · ${(clip.durationSeconds * 1000).toFixed(0)}ms · ${clip.loop ? '반복' : '단발'}`;
            article.append(title, canvas, output, note);
            container.append(article);
            this.views.push({ key, canvas, output });
        }
        const paths = new Set([
            this.actorPath,
            ...Array.from({ length: 8 }, (_, index) => this.castPath(index)),
            ...[...this.clips.values()].flatMap((clip) => clip.frames.map((frame) => frame.localPath)),
        ]);
        await Promise.all([...paths].map((path) => new Promise((resolve, reject) => {
            const image = new Image();
            image.onload = () => {
                this.images.set(path, image);
                resolve();
            };
            image.onerror = () => reject(new Error(`이미지를 불러올 수 없습니다: ${path}`));
            image.src = resourceUrl(path).href;
        })));
        if (this.disposed)
            return;
        const { signal } = this.events;
        this.toggle.addEventListener('click', () => {
            this.paused = !this.paused;
            this.toggle.textContent = this.paused ? '재생' : '일시정지';
        }, { signal });
        this.restart.addEventListener('click', () => {
            this.elapsed = 0;
        }, { signal });
        element('background').addEventListener('change', (event) => {
            document.body.dataset.background = event.currentTarget.value;
        }, { signal });
        this.toggle.disabled = false;
        this.restart.disabled = false;
        element('status').textContent =
            `효과 35프레임과 연묵 원본 준비 완료 · 시전과 보호 연결을 실제 재생 중`;
        this.animationFrame = requestAnimationFrame(this.render);
    }
    clip(key) {
        const clip = this.clips.get(key);
        if (!clip)
            throw new Error(`효과가 없습니다: ${key}`);
        return clip;
    }
    context(canvas) {
        const bounds = canvas.getBoundingClientRect();
        const dpr = Math.min(devicePixelRatio || 1, 2);
        const width = Math.max(1, Math.round(bounds.width * dpr));
        const height = Math.max(1, Math.round(bounds.height * dpr));
        if (canvas.width !== width || canvas.height !== height) {
            canvas.width = width;
            canvas.height = height;
        }
        const context = canvas.getContext('2d');
        if (!context)
            throw new Error('효과 검토 Canvas를 사용할 수 없습니다.');
        context.setTransform(dpr, 0, 0, dpr, 0, 0);
        context.clearRect(0, 0, bounds.width, bounds.height);
        context.imageSmoothingEnabled = false;
        return context;
    }
    draw(context, frame, x, y, scale) {
        const image = this.images.get(frame.localPath);
        if (!image)
            return;
        context.drawImage(image, Math.round(x - frame.pivot.x * scale), Math.round(y - (frame.height - frame.pivot.y) * scale), frame.width * scale, frame.height * scale);
    }
    effect(context, key, elapsed, x, y, scale) {
        const clip = this.clip(key);
        const index = frameAt(clip, elapsed);
        this.draw(context, clip.frames[index], x, y, scale);
        return index;
    }
    castPath(index) {
        return `public/assets/maplestory/fox-talismanist-ai/runtime/talisman-cast/${String(index).padStart(2, '0')}.png`;
    }
    actor(context, x, ground, scale, castElapsed) {
        let path = this.actorPath;
        if (castElapsed !== undefined) {
            let remaining = castElapsed;
            let index = 0;
            for (const duration of [0.1, 0.12, 0.14, 0.08, 0.07, 0.06, 0.04, 0.04]) {
                if (remaining < duration)
                    break;
                remaining -= duration;
                index = Math.min(index + 1, 7);
            }
            path = this.castPath(index);
        }
        const image = this.images.get(path);
        if (image)
            context.drawImage(image, Math.round(x - 32 * scale), ground - 62 * scale, 64 * scale, 64 * scale);
    }
    attackSequence() {
        const canvas = element('attack');
        const context = this.context(canvas);
        const width = canvas.getBoundingClientRect().width;
        const scale = width < 360 ? 1 : 2;
        const time = this.elapsed % 1.4;
        const start = Math.round(width * 0.28);
        const target = Math.round(width * 0.8);
        this.actor(context, start, 184, scale, time < 0.65 ? time : undefined);
        context.strokeStyle = '#73958c';
        context.beginPath();
        context.arc(target, 140, 12, 0, Math.PI * 2);
        context.stroke();
        let phase = '준비';
        let index = -1;
        if (time >= 0.22 && time < 0.36) {
            phase = '비행';
            const progress = (time - 0.22) / 0.14;
            index = this.effect(context, 'talisman-flight', time - 0.22, start + 18 * scale + (target - start - 18 * scale) * progress, 124, scale / 2);
        }
        else if (time >= 0.36 && time < 0.624) {
            phase = '적중';
            index = this.effect(context, 'talisman-hit', time - 0.36, target, 124, scale / 2);
        }
        else if (time >= 0.65)
            phase = '복귀';
        element('attack-frame').value =
            `${phase} · ${time.toFixed(3)}초 · 효과 ${index < 0 ? '없음' : index + 1 + '번'}`;
        canvas.dataset.phase = phase;
        canvas.dataset.frame = String(index);
    }
    wardSequence() {
        const canvas = element('ward');
        const context = this.context(canvas);
        const width = canvas.getBoundingClientRect().width;
        const scale = width < 360 ? 1 : 2;
        const time = this.elapsed % 2.2;
        const x = Math.round(width / 2);
        this.actor(context, x, 184, scale);
        const castDuration = this.clip('ward-cast').durationSeconds;
        const triggerAt = castDuration + 1;
        let key = 'ward-cast', localTime = time, phase = '형성';
        if (time >= castDuration && time < triggerAt) {
            key = 'ward-idle';
            localTime -= castDuration;
            phase = '보호 표식';
        }
        else if (time >= triggerAt) {
            key = 'ward-trigger';
            localTime -= triggerAt;
            phase = '소모';
        }
        const index = this.effect(context, key, localTime, x + 24 * scale, 184 - 39 * scale, scale / 2);
        element('ward-frame').value =
            `${phase} · ${time.toFixed(3)}초 · ${index + 1}번`;
        canvas.dataset.phase = phase;
        canvas.dataset.frame = String(index);
    }
    render = (now) => {
        if (this.disposed)
            return;
        const dt = this.previousTime
            ? Math.min(0.05, (now - this.previousTime) / 1000)
            : 0;
        this.previousTime = now;
        if (!this.paused && !document.hidden)
            this.elapsed += dt;
        const scale = Number(this.scale.value);
        for (const view of this.views) {
            const clip = this.clip(view.key);
            const time = this.elapsed %
                (clip.loop ? clip.durationSeconds : clip.durationSeconds + 0.65);
            const index = frameAt(clip, time);
            const context = this.context(view.canvas);
            this.draw(context, clip.frames[index], Math.round(view.canvas.getBoundingClientRect().width / 2), 110, scale);
            view.output.value = `${index + 1} / ${clip.frames.length} · ${time.toFixed(3)}초`;
            view.canvas.dataset.frame = String(index);
        }
        this.attackSequence();
        this.wardSequence();
        this.animationFrame = requestAnimationFrame(this.render);
    };
    dispose() {
        this.disposed = true;
        this.events.abort();
        cancelAnimationFrame(this.animationFrame);
        this.images.clear();
    }
}
const preview = new YeonmukVfxPreview();
window.addEventListener('pagehide', () => preview.dispose(), { once: true });
void preview.start().catch((error) => {
    element('status').textContent =
        error instanceof Error ? error.message : '연묵 효과를 불러오지 못했어요.';
    preview.dispose();
});
