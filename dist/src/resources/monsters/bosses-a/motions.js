import { resourceUrl } from '../../catalog/resource-url.js';
import generation from '../../../../resources/map-bosses-a-generation.json' with { type: 'json' };
import { AnimationPlayer, } from '../../preview/animation-player.js';
function element(id, type) {
    const item = document.getElementById(id);
    if (!(item instanceof type))
        throw new Error(`모션 검토 요소가 없습니다: ${id}`);
    return item;
}
class MotionReview {
    views = [];
    images = new Map();
    events = new AbortController();
    motion = element('motion', HTMLSelectElement);
    scale = element('scale', HTMLSelectElement);
    background = element('background', HTMLSelectElement);
    toggle = element('toggle', HTMLButtonElement);
    paused = false;
    disposed = false;
    frameId = 0;
    lastTime = 0;
    async start() {
        const creatures = generation.monsters;
        const paths = new Set(), container = element('creatures', HTMLElement);
        for (const creature of creatures) {
            if (!creature.selectedOriginal)
                continue;
            const article = document.createElement('article'), title = document.createElement('h2'), meta = document.createElement('p'), canvas = document.createElement('canvas'), output = document.createElement('output');
            title.textContent = creature.name;
            meta.textContent = `${creature.mapName} · ${creature.tier === 'boss' ? '보스' : '중간보스'} · 원본 ${creature.nativeFacing}`;
            canvas.dataset.creature = creature.id;
            canvas.setAttribute('aria-label', `${creature.name} 실제 모션`);
            article.append(title, meta, canvas, output);
            container.append(article);
            const animations = new Map();
            for (const [name, clip] of Object.entries(creature.animations))
                if (clip) {
                    animations.set(name, clip);
                    for (const frame of clip.frames)
                        paths.add(frame.localPath);
                }
            paths.add(creature.selectedOriginal.localPath);
            this.views.push({
                creature,
                canvas,
                output,
                player: animations.has('stand')
                    ? new AnimationPlayer(animations, 'stand')
                    : undefined,
            });
        }
        await Promise.all([...paths].map(async (path) => {
            const image = new Image();
            image.src = resourceUrl(path).href;
            await image.decode();
            if (!this.disposed)
                this.images.set(path, image);
        }));
        if (this.disposed)
            return;
        const { signal } = this.events;
        this.motion.addEventListener('change', this.restart, { signal });
        element('restart', HTMLButtonElement).addEventListener('click', this.restart, { signal });
        this.toggle.addEventListener('click', () => {
            this.paused = !this.paused;
            this.toggle.textContent = this.paused ? '재생' : '일시정지';
        }, { signal });
        window.addEventListener('pagehide', this.dispose, { signal, once: true });
        const ready = this.views.filter((v) => ['stand', 'move', 'attack1', 'hit1', 'die1'].every((k) => v.creature.animations[k]?.frames.length)).length;
        element('status', HTMLParagraphElement).textContent =
            `${this.views.length}/15종 원본 · ${ready}/15종 기본5동작 · 로컬 PNG ${this.images.size}개`;
        this.frameId = requestAnimationFrame(this.render);
    }
    restart = () => {
        for (const view of this.views)
            if (view.creature.animations[this.motion.value])
                view.player?.play(this.motion.value);
    };
    render = (time) => {
        if (this.disposed)
            return;
        const dt = this.lastTime ? Math.min((time - this.lastTime) / 1000, 0.1) : 0;
        this.lastTime = time;
        for (const view of this.views) {
            if (!this.paused)
                view.player?.update(dt);
            this.draw(view);
        }
        this.frameId = requestAnimationFrame(this.render);
    };
    draw(view) {
        const bounds = view.canvas.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2), width = Math.round(bounds.width * dpr), height = Math.round(bounds.height * dpr);
        if (view.canvas.width !== width || view.canvas.height !== height) {
            view.canvas.width = width;
            view.canvas.height = height;
        }
        const context = view.canvas.getContext('2d');
        if (!context)
            throw new Error('Canvas를 사용할 수 없습니다.');
        context.setTransform(dpr, 0, 0, dpr, 0, 0);
        context.imageSmoothingEnabled = false;
        const dark = this.background.value === 'dark';
        for (let y = 0; y < bounds.height; y += 12)
            for (let x = 0; x < bounds.width; x += 12) {
                const alternate = (Math.floor(x / 12) + Math.floor(y / 12)) % 2;
                context.fillStyle = dark
                    ? alternate
                        ? '#2a3a32'
                        : '#22342d'
                    : alternate
                        ? '#e7dfc6'
                        : '#f3ecd8';
                context.fillRect(x, y, 12, 12);
            }
        const ground = Math.round(bounds.height - 35), scale = Number(this.scale.value);
        context.fillStyle = dark ? '#8ca48a' : '#a99c78';
        context.fillRect(0, ground, bounds.width, 1);
        const clip = view.creature.animations[this.motion.value], current = clip ? view.player?.currentFrame : undefined, frame = current?.frame ?? view.creature.selectedOriginal;
        if (frame) {
            const image = this.images.get(frame.localPath);
            if (image)
                context.drawImage(image, Math.round(bounds.width / 2 - frame.pivot.x * scale), Math.round(ground - (frame.height - frame.pivot.y) * scale), frame.width * scale, frame.height * scale);
            view.canvas.dataset.path = frame.localPath;
        }
        view.canvas.dataset.frame = String(current?.index ?? 0);
        view.canvas.dataset.motion = current ? this.motion.value : 'original';
        view.output.textContent =
            clip && current
                ? `${current.index + 1}/${clip.frames.length} · ${clip.loop ? '반복' : '단발 · 끝자세 유지'}${this.motion.value === 'attack1' ? ' · 접촉은 생성 기록 참고' : ''}`
                : `${this.motion.selectedOptions[0]?.textContent} 미생성 · 승인 원본 참고`;
    }
    dispose = () => {
        this.disposed = true;
        cancelAnimationFrame(this.frameId);
        this.events.abort();
        this.images.clear();
    };
}
void new MotionReview().start().catch((error) => {
    element('status', HTMLParagraphElement).textContent =
        error instanceof Error ? error.message : '모션을 표시할 수 없습니다.';
});
