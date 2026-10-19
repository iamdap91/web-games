import { groundY, startX } from './pose-drawing.js';
export function sampleShockwave(snapshot, options) {
    if (!options.showMovement)
        return undefined;
    const ki = snapshot.motion.ki;
    const final = snapshot.motion.finisher && options.showSandbag
        ? options.contacts.filter((contact) => contact.connected).at(-1)
        : undefined;
    const release = ki?.style === 'beam' ? ki.releaseMs : undefined;
    const timeMs = final?.timeMs ?? release;
    if (timeMs === undefined)
        return undefined;
    const age = snapshot.elapsedMs - timeMs;
    if (age < 0 || age >= 190)
        return undefined;
    const progress = age / 190;
    return {
        x: final?.x ?? startX + ki.origin.x * options.scale,
        y: final?.y ?? groundY + ki.origin.y * options.scale,
        radius: 14 + progress * 180,
        amplitude: Math.sin(progress * Math.PI) * 2.8,
    };
}
/** 현재 프레임의 배경만 한 번 복사하고 인물을 그리기 전에 좁은 파면을 옮긴다. */
export class BackgroundShockwave {
    background = document.createElement('canvas');
    context = this.background.getContext('2d');
    draw(ctx, wave) {
        if (!wave || wave.amplitude < 0.1)
            return;
        const source = ctx.canvas;
        if (this.background.width !== source.width ||
            this.background.height !== source.height) {
            this.background.width = source.width;
            this.background.height = source.height;
        }
        this.context.clearRect(0, 0, source.width, source.height);
        this.context.drawImage(source, 0, 0);
        const transform = ctx.getTransform();
        const tile = 8;
        const width = 18;
        const extent = wave.radius + width;
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        for (let y = Math.floor((wave.y - extent) / tile) * tile; y < wave.y + extent; y += tile) {
            for (let x = Math.floor((wave.x - extent) / tile) * tile; x < wave.x + extent; x += tile) {
                const dx = x + tile / 2 - wave.x;
                const dy = y + tile / 2 - wave.y;
                const distance = Math.hypot(dx, dy);
                const band = (distance - wave.radius) / width;
                if (Math.abs(band) >= 1 || distance <= 0)
                    continue;
                const amount = Math.sin(band * Math.PI) * wave.amplitude;
                const offsetX = Math.round((dx / distance) * amount);
                const offsetY = Math.round((dy / distance) * amount);
                if (!offsetX && !offsetY)
                    continue;
                ctx.drawImage(this.background, (x + offsetX) * transform.a + transform.e, (y + offsetY) * transform.d + transform.f, tile * transform.a, tile * transform.d, x, y, tile, tile);
            }
        }
        ctx.restore();
    }
}
