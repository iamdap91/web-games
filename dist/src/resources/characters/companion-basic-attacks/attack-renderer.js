import { sampleAttack, } from './attack-motion.js';
import { clamp, sprite, scatter, drawTarget, drawPaper, drawSeal, drawSlash, drawStage, } from './attack-drawing.js';
import { renderAdditionalAttack } from './additional-renderer.js';
export function renderAttack(context, study, images, options) {
    if (options.move !== 'basic') {
        renderAdditionalAttack(context, study, images, options);
        return;
    }
    const { actor, facing, elapsed, light } = options;
    const motion = sampleAttack(actor, elapsed, facing);
    const direction = study.directions[facing];
    const sign = facing === 'south-east' ? 1 : -1;
    const vector = { x: sign * 0.92, y: sign * 0.38 };
    const target = { x: 336, y: 238 };
    const home = actor === 'biwol'
        ? { x: target.x + vector.x * 190, y: target.y + vector.y * 190 }
        : { x: target.x - vector.x * 190, y: target.y - vector.y * 190 };
    const rear = { x: target.x - vector.x * 57, y: target.y - vector.y * 57 };
    drawStage(context, { home, target, light });
    const inIdle = motion.idle;
    const bodyIndex = Math.min(direction.frames.length - 1, Math.floor(motion.bodyProgress * direction.frames.length));
    const frame = inIdle ? direction.idle : direction.frames[bodyIndex];
    const image = images.get(frame.localPath);
    if (!image)
        return;
    const drawBody = () => {
        if (actor === 'yeonmuk') {
            sprite(context, image, frame, home);
            return;
        }
        if (elapsed < 0.13)
            sprite(context, image, frame, home);
        else if (elapsed < 0.27)
            scatter(context, image, frame, home, (elapsed - 0.13) / 0.14);
        else if (elapsed < 0.34)
            return;
        else if (elapsed < 0.42)
            scatter(context, image, frame, rear, 1 - (elapsed - 0.34) / 0.08);
        else if (elapsed < 0.67)
            sprite(context, image, frame, rear);
        else if (elapsed < 0.74)
            scatter(context, image, frame, rear, (elapsed - 0.67) / 0.07);
        else if (elapsed < 0.83)
            scatter(context, image, frame, home, 1 - (elapsed - 0.74) / 0.09);
        else
            sprite(context, image, frame, home);
    };
    const actorY = actor === 'biwol' && elapsed >= 0.34 && elapsed < 0.74 ? rear.y : home.y;
    if (actorY < target.y)
        drawBody();
    drawTarget(context, target, elapsed, motion.contact, vector);
    if (actorY >= target.y)
        drawBody();
    if (actor === 'biwol') {
        if (elapsed >= 0.44 && elapsed < 0.6)
            drawSlash(context, target, (elapsed - 0.44) / 0.16, sign);
        return;
    }
    const palm = {
        x: home.x + sign * 35,
        y: home.y - (facing === 'south-east' ? 73 : 86),
    };
    const hit = { x: target.x, y: target.y - 61 };
    if (elapsed >= 0.27 && elapsed < 0.43) {
        const t = clamp((elapsed - 0.27) / 0.16);
        drawPaper(context, {
            x: palm.x + (hit.x - palm.x) * t,
            y: palm.y + (hit.y - palm.y) * t - Math.sin(t * Math.PI) * 5,
        }, Math.sin(t * Math.PI * 2) * 0.25);
    }
    else if (elapsed >= 0.43 && elapsed < 0.51) {
        drawPaper(context, hit, 0, elapsed < 0.48 ? 1 : 1 - (elapsed - 0.48) / 0.03);
    }
    if (elapsed >= motion.contact && elapsed < 0.69)
        drawSeal(context, target, (elapsed - motion.contact) / 0.21);
}
