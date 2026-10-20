import { battleImpact, battleLayout } from './battle.js';
import { drawLightEffects } from './effects-light.js';
import { drawFlightEffects } from './effects-flight.js';
import { drawExplosionEffects, } from './effects-explosions.js';
import { width } from './types.js';
const placements = {
    'fx-kanada-light': { x: 549, y: 266, scale: 0.72, emphasis: 1.2 },
    'fx-kanada-beam': {
        x: 267,
        y: 300,
        scale: 0.34,
        emphasis: 1.34,
        rotation: 0,
    },
    'fx-kanada-explosion': { x: 550, y: 334, scale: 0.63, emphasis: 1.18 },
    'fx-kanada-dragon': {
        x: 292,
        y: 269,
        scale: 0.38,
        emphasis: 1.28,
        rotation: 0,
    },
    'fx-anno': {
        x: 546,
        y: 407,
        scale: 0.68,
        emphasis: 1.06,
        anchor: 'ground',
    },
    'fx-iso-explosion': { x: 548, y: 352, scale: 0.66, emphasis: 1.22 },
    'fx-iso-debris': { x: 550, y: 390, scale: 0.8, emphasis: 1.13 },
    'fx-nakamura': { x: 551, y: 389, scale: 0.8, emphasis: 1.08 },
    'fx-hashimoto': {
        x: 548,
        y: 387,
        scale: 0.64,
        emphasis: 1.2,
        anchor: 'ground',
    },
    'fx-norio': { x: 548, y: 372, scale: 0.64, emphasis: 1.23 },
    'fx-mori': { x: 410, y: 310, scale: 0.65, emphasis: 1.12, rotation: -0.8 },
    'fx-araki': { x: 503, y: 277, scale: 0.58, emphasis: 1.27 },
    'fx-yoshinari': { x: 548, y: 325, scale: 0.68, emphasis: 1.15 },
    'fx-oki': { x: 550, y: 330, scale: 0.65, emphasis: 1.2 },
    'fx-kozuma': { x: 285, y: 300, scale: 0.36, emphasis: 1.38, rotation: 0 },
    'fx-tatsuzo': { x: 551, y: 284, scale: 0.58, emphasis: 1.4 },
    'fx-shigeta': { x: 548, y: 300, scale: 0.75, emphasis: 1.1 },
    'fx-anime-r': { x: 548, y: 371, scale: 0.8, emphasis: 1.15 },
    'fx-kutsuna': { x: 296, y: 288, scale: 0.37, emphasis: 1.32, rotation: 0 },
};
/** 같은 무대 원점에 기법의 원래 배치와 합성 견본의 보정만 더한다. */
export function drawEffectLayer(ctx, id, frame, options) {
    const placement = placements[id];
    if (!placement)
        return false;
    ctx.save();
    try {
        const impact = battleImpact(frame);
        const ground = battleLayout.target.ground;
        const anchor = options.anchor ?? placement.anchor ?? 'impact';
        const point = options.point ?? {
            x: impact.x,
            y: anchor === 'ground' ? ground : impact.y,
        };
        if (anchor === 'ground') {
            // 클립을 무대 좌표에서 먼저 고정해 회전·크기 보정에도 바닥을 유지한다.
            ctx.beginPath();
            ctx.rect(0, 0, width, ground);
            ctx.clip();
        }
        ctx.translate(point.x, point.y);
        ctx.rotate((placement.rotation ?? 0) + (options.rotation ?? 0));
        const motionScale = frame.reducedMotion ? 0.75 : 1;
        const emphasis = frame.enhanced && !frame.reducedMotion ? placement.emphasis : 1;
        const scale = placement.scale * 1.3 * motionScale * emphasis * (options.scale ?? 1);
        ctx.scale(scale, scale);
        ctx.translate(-placement.x, -placement.y);
        ctx.globalAlpha *= options.opacity ?? 1;
        if (options.layer === 'back')
            return drawExplosionEffects(ctx, id, frame, options.layer);
        return (drawLightEffects(ctx, id, frame) ||
            drawFlightEffects(ctx, id, frame) ||
            drawExplosionEffects(ctx, id, frame, options.layer));
    }
    finally {
        ctx.restore();
    }
}
