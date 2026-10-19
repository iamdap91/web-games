import { sampleKi, beamChargePoint, tigerChargePoint, sampleOrbitHeld, } from './ki-sampling.js';
import { groundY, startX, stageWidth, stageHeight } from './pose-drawing.js';
/** 빛의 위치도 탄과 같은 절대 시각에서 구한다. 사라진 핵은 계속 비추지 않는다. */
export function sampleKiLights(snapshot, options) {
    const definition = snapshot.motion.ki;
    if (!definition || !options.showMovement)
        return [];
    const sample = sampleKi(definition, snapshot.elapsedMs);
    if (sample.phase === 'idle' || sample.phase === 'done')
        return [];
    const lights = [];
    const add = (point, strength) => {
        lights.push({
            x: startX + point.x * options.scale,
            y: groundY + point.y * options.scale,
            radius: 54 * options.scale,
            strength,
            color: definition.accent,
        });
    };
    if (definition.style === 'orbit') {
        for (const held of sampleOrbitHeld(definition, sample))
            add(held.point, 0.3 + held.growth * 0.4);
    }
    else if (sample.phase === 'charge') {
        add(definition.style === 'beam'
            ? beamChargePoint(definition, sample)
            : definition.style === 'tiger-manifest' ||
                definition.style === 'tiger-wave'
                ? tigerChargePoint(definition, sample)
                : (definition.chargeOrigin ?? definition.origin), 0.2 + sample.charge * 0.65);
    }
    for (const shot of sample.shots)
        if (shot.visible)
            add(shot.point, 0.7);
    if (definition.style === 'beam' &&
        sample.timeMs >= definition.releaseMs &&
        sample.timeMs < (definition.hits.at(-1)?.atMs ?? definition.releaseMs) + 100)
        add(definition.origin, 0.8);
    if (definition.style === 'tiger-manifest') {
        const pulse = sample.hits.filter((hit) => hit.occurred).at(-1);
        if (pulse) {
            const final = pulse.hit === definition.hits.at(-1);
            const strength = final ? Math.max(0, 1 - pulse.ageMs / 345) : 0.65;
            if (strength > 0)
                add(pulse.point, strength);
        }
    }
    for (const hit of sample.hits) {
        if (hit.ageMs < 0 || hit.ageMs >= 110)
            continue;
        const contact = options.contacts?.find((item) => item.actorId === `ki:${hit.hit.id}`);
        if (options.showSandbag && !contact?.connected)
            continue;
        add(hit.point, 0.7 * (1 - hit.ageMs / 110));
    }
    return lights.sort((a, b) => b.strength - a.strength).slice(0, 4);
}
export function drawKiFloorLight(ctx, lights) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    for (const light of lights) {
        const proximity = Math.max(0, 1 - Math.abs(light.y - groundY) / 240);
        if (proximity <= 0)
            continue;
        ctx.save();
        ctx.translate(light.x, groundY + 5);
        ctx.scale(1, 0.16);
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, light.radius * 0.8);
        gradient.addColorStop(0, light.color);
        gradient.addColorStop(1, 'transparent');
        ctx.globalAlpha *= light.strength * proximity * 0.3;
        ctx.fillStyle = gradient;
        ctx.fillRect(-light.radius, -light.radius, light.radius * 2, light.radius * 2);
        ctx.restore();
    }
    ctx.restore();
}
/** 화면이 소유하는 재사용 표면. 변형된 본체의 실제 알파 안에만 빛을 합성한다. */
export class KiLighting {
    mask = document.createElement('canvas');
    tint = document.createElement('canvas');
    maskContext = this.mask.getContext('2d');
    tintContext = this.tint.getContext('2d');
    constructor() {
        for (const canvas of [this.mask, this.tint]) {
            canvas.width = stageWidth;
            canvas.height = stageHeight;
        }
    }
    drawBody(ctx, lights, draw, bodyCenter) {
        draw(ctx);
        if (!lights.length)
            return;
        const mask = this.maskContext;
        mask.clearRect(0, 0, stageWidth, stageHeight);
        draw(mask);
        const tint = this.tintContext;
        tint.clearRect(0, 0, stageWidth, stageHeight);
        tint.save();
        for (const light of lights) {
            const gradient = tint.createRadialGradient(light.x, light.y, 0, light.x, light.y, light.radius);
            gradient.addColorStop(0, light.color);
            gradient.addColorStop(1, 'transparent');
            tint.globalAlpha = light.strength * 0.25;
            tint.fillStyle = gradient;
            tint.fillRect(light.x - light.radius, light.y - light.radius, light.radius * 2, light.radius * 2);
        }
        tint.globalAlpha = 1;
        tint.globalCompositeOperation = 'destination-in';
        tint.drawImage(this.mask, 0, 0);
        tint.restore();
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.globalCompositeOperation = 'screen';
        ctx.drawImage(this.tint, 0, 0);
        // 가까운 빛 쪽의 두 픽셀 테두리만 남겨 전신 외곽의 발광을 피한다.
        const light = lights.reduce((nearest, item) => Math.hypot(item.x - bodyCenter.x, item.y - bodyCenter.y) <
            Math.hypot(nearest.x - bodyCenter.x, nearest.y - bodyCenter.y)
            ? item
            : nearest);
        const distance = Math.hypot(light.x - bodyCenter.x, light.y - bodyCenter.y);
        if (distance < light.radius + 70) {
            tint.clearRect(0, 0, stageWidth, stageHeight);
            tint.save();
            tint.drawImage(this.mask, 0, 0);
            tint.globalCompositeOperation = 'destination-out';
            tint.drawImage(this.mask, -Math.round(((light.x - bodyCenter.x) / Math.max(1, distance)) * 2), -Math.round(((light.y - bodyCenter.y) / Math.max(1, distance)) * 2));
            tint.globalCompositeOperation = 'source-in';
            const gradient = tint.createRadialGradient(light.x, light.y, 0, light.x, light.y, light.radius + 70);
            gradient.addColorStop(0, light.color);
            gradient.addColorStop(1, 'transparent');
            tint.globalAlpha = light.strength * 0.65;
            tint.fillStyle = gradient;
            tint.fillRect(0, 0, stageWidth, stageHeight);
            tint.restore();
            ctx.drawImage(this.tint, 0, 0);
        }
        ctx.restore();
    }
}
