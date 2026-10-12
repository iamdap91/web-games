import { resourceUrl } from '../../catalog/resource-url.js';
import manifest from '../../../../resources/manifest.json' with { type: 'json' };
import generation from '../../../../resources/monsters-a-generation.json' with { type: 'json' };
import { AnimationPlayer, } from '../../preview/animation-player.js';
function element(id, type) {
    const item = document.getElementById(id);
    if (!(item instanceof type))
        throw new Error(`몬스터 검토 요소가 없습니다: ${id}`);
    return item;
}
class MonstersPreview {
    views = [];
    images = new Map();
    events = new AbortController();
    motion = element('motion', HTMLSelectElement);
    scale = element('scale', HTMLSelectElement);
    background = element('background', HTMLSelectElement);
    toggle = element('toggle', HTMLButtonElement);
    restart = element('restart', HTMLButtonElement);
    frameId = 0;
    lastTime = 0;
    paused = false;
    disposed = false;
    async start() {
        const container = element('monsters', HTMLElement);
        const catalog = generation.monsters;
        for (const monster of catalog) {
            const asset = manifest.assets.find((item) => item.id === monster.assetId);
            const animations = new Map();
            const available = asset?.animations ?? monster.animations;
            if (available)
                for (const [key, clip] of Object.entries(available))
                    if (clip)
                        animations.set(key, clip);
            const originalPath = monster.selectedOriginal?.localPath;
            const article = document.createElement('article');
            article.dataset.monster = monster.id;
            const title = document.createElement('h2');
            title.textContent = monster.name;
            const metadata = document.createElement('p');
            metadata.className = 'metadata';
            metadata.textContent = `${monster.id} · ${monster.theme} · ${monster.role} · ${monster.nativeFacing ?? '방향 검토 중'}`;
            const canvas = document.createElement('canvas');
            canvas.dataset.monster = monster.id;
            canvas.setAttribute('aria-label', `${monster.name} 모션`);
            const output = document.createElement('output');
            const note = document.createElement('p');
            note.className = 'note';
            article.append(title, metadata, canvas, output, note);
            container.append(article);
            this.views.push({
                id: monster.id,
                canvas,
                output,
                note,
                originalPath,
                originalPivot: {
                    x: monster.anchor?.x ?? 32,
                    y: 64 - (monster.anchor?.y ?? 60),
                },
                animations,
                player: animations.has('stand')
                    ? new AnimationPlayer(animations, 'stand')
                    : undefined,
            });
        }
        const paths = new Set(this.views.flatMap((view) => [
            ...(view.originalPath ? [view.originalPath] : []),
            ...[...view.animations.values()].flatMap((clip) => clip.frames.map((frame) => frame.localPath)),
        ]));
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
        this.motion.addEventListener('change', this.reset, { signal });
        this.restart.addEventListener('click', this.reset, { signal });
        this.toggle.addEventListener('click', () => {
            this.paused = !this.paused;
            this.toggle.textContent = this.paused ? '재생' : '일시정지';
        }, { signal });
        window.addEventListener('pagehide', () => this.dispose(), { signal });
        const complete = this.views.filter((view) => ['stand', 'move', 'attack1', 'hit1', 'die1'].every((key) => view.animations.has(key))).length;
        element('status', HTMLParagraphElement).textContent =
            `${complete}/15종 모션 준비 · 로컬 PNG ${this.images.size}개 · 전 프레임·발 기준·단발 끝자세 검토`;
        this.frameId = requestAnimationFrame(this.render);
    }
    reset = () => {
        for (const view of this.views)
            if (view.animations.has(this.motion.value))
                view.player?.play(this.motion.value);
    };
    render = (time) => {
        if (this.disposed)
            return;
        const delta = this.lastTime
            ? Math.min((time - this.lastTime) / 1000, 0.1)
            : 0;
        this.lastTime = time;
        for (const view of this.views) {
            if (!this.paused)
                view.player?.update(delta);
            this.draw(view);
        }
        this.frameId = requestAnimationFrame(this.render);
    };
    draw(view) {
        const bounds = view.canvas.getBoundingClientRect();
        const dpr = Math.min(devicePixelRatio || 1, 2);
        const width = Math.round(bounds.width * dpr), height = Math.round(bounds.height * dpr);
        if (view.canvas.width !== width || view.canvas.height !== height) {
            view.canvas.width = width;
            view.canvas.height = height;
        }
        const context = view.canvas.getContext('2d');
        if (!context)
            throw new Error('몬스터 검토 Canvas를 사용할 수 없습니다.');
        context.setTransform(dpr, 0, 0, dpr, 0, 0);
        context.imageSmoothingEnabled = false;
        const dark = this.background.value === 'dark';
        for (let y = 0; y < bounds.height; y += 12)
            for (let x = 0; x < bounds.width; x += 12) {
                const alternate = (Math.floor(x / 12) + Math.floor(y / 12)) % 2;
                context.fillStyle = dark
                    ? alternate
                        ? '#233031'
                        : '#1d292b'
                    : alternate
                        ? '#e8e0c9'
                        : '#f1ebd8';
                context.fillRect(x, y, 12, 12);
            }
        const ground = Math.round(bounds.height - 28), center = Math.round(bounds.width / 2), scale = Number(this.scale.value);
        context.fillStyle = dark ? '#60837b' : '#a99b7b';
        context.fillRect(0, ground, bounds.width, 1);
        const current = view.animations.has(this.motion.value)
            ? view.player?.currentFrame
            : undefined;
        const frame = current?.frame ??
            (view.originalPath
                ? {
                    width: 64,
                    height: 64,
                    pivot: view.originalPivot,
                    localPath: view.originalPath,
                }
                : undefined);
        if (frame) {
            const image = this.images.get(frame.localPath);
            if (image)
                context.drawImage(image, Math.round(center - frame.pivot.x * scale), Math.round(ground - (frame.height - frame.pivot.y) * scale), frame.width * scale, frame.height * scale);
            view.canvas.dataset.frame = String(current?.index ?? 0);
            view.canvas.dataset.motion = current ? this.motion.value : 'original';
            view.canvas.dataset.path = frame.localPath;
            view.output.textContent = current
                ? `${current.index + 1}/${current.totalFrames} · ${view.animations.get(this.motion.value)?.loop === false ? '단발' : '반복'}`
                : '원본 후보 · 모션 제작 전';
            view.note.textContent = current
                ? (view.animations.get(this.motion.value)?.notes ?? '')
                : view.id === 'thicket-bat'
                    ? '오른쪽 원본 유지. 전투 연결은 nativeFacing에 따라 거울 표시.'
                    : '채택된 원본. 선택한 모션은 아직 제작 중입니다.';
        }
        else {
            view.output.textContent = '제작 대기';
            view.note.textContent =
                '첫 3종의 스타일 확인 후 같은 기준으로 제작합니다.';
        }
    }
    dispose() {
        this.disposed = true;
        cancelAnimationFrame(this.frameId);
        this.events.abort();
        this.images.clear();
    }
}
new MonstersPreview().start().catch((error) => {
    element('status', HTMLParagraphElement).textContent =
        error instanceof Error ? error.message : '리소스를 불러오지 못했습니다.';
});
