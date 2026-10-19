import { attackDefinition, } from './attack-definitions.js';
import { sampleAttack } from './attack-motion.js';
import { clamp, sprite, drawStage, drawTarget, } from './attack-drawing.js';
import { drawYeonmukAdditionalEffects } from './yeonmuk-additional-effects.js';
function ease(value) {
    const t = clamp(value);
    return t * t * (3 - 2 * t);
}
function approach(start, end, progress) {
    const t = ease(progress);
    return {
        x: start.x + (end.x - start.x) * t,
        y: start.y + (end.y - start.y) * t,
    };
}
function biwolPosition(definition, elapsed, home, near) {
    const travel = definition.travel;
    if (!travel)
        return { ground: home, height: 0 };
    if (elapsed < travel.arrive) {
        const progress = clamp((elapsed - travel.begin) / (travel.arrive - travel.begin));
        return {
            ground: approach(home, near, progress),
            height: Math.sin(progress * Math.PI) * travel.jumpHeight,
        };
    }
    return {
        ground: approach(near, home, (elapsed - travel.returnStart) / (travel.returnEnd - travel.returnStart)),
        height: 0,
    };
}
function drawBiwolEffect(context, options, target, vector, contact) {
    const { move, elapsed } = options;
    const time = elapsed - contact;
    if (time < -0.06 || time > 0.21)
        return;
    const progress = clamp((time + 0.06) / 0.27);
    context.save();
    context.translate(target.x, target.y - 56);
    context.globalAlpha = Math.min(1, (1 - progress) * 2);
    context.strokeStyle = '#f0dfcb';
    context.lineWidth = 3;
    context.beginPath();
    if (move === 'lunge') {
        const length = 24 + progress * 34;
        context.moveTo(-vector.x * length, -vector.y * length);
        context.lineTo(vector.x * 12, vector.y * 12);
        context.stroke();
        context.strokeStyle = '#a8789d';
        context.lineWidth = 1;
        context.beginPath();
        context.moveTo(-vector.x * length, -vector.y * length + 6);
        context.lineTo(vector.x * 8, vector.y * 8 + 6);
    }
    else if (move === 'spin') {
        const start = Math.PI * 0.1 + progress * Math.PI * 1.5;
        context.ellipse(0, 8, 47, 18, 0, start, start + Math.PI * 0.8);
    }
    else {
        context.moveTo(-vector.x * 12, -28);
        context.lineTo(vector.x * 8, 25);
    }
    context.stroke();
    if (time >= 0) {
        for (let i = 0; i < 5; i++) {
            context.fillStyle = i % 2 ? '#e2c7a5' : '#976c9e';
            const angle = (i * Math.PI * 2) / 5;
            const reach = progress * 24;
            context.fillRect(Math.round(Math.cos(angle) * reach), Math.round(Math.sin(angle) * reach), 3, 3);
        }
    }
    context.restore();
}
export function renderAdditionalAttack(context, study, images, options) {
    const { actor, facing, elapsed, light, move } = options;
    const definition = attackDefinition(actor, move);
    const motion = sampleAttack(actor, elapsed, facing, move);
    const sign = facing === 'south-east' ? 1 : -1;
    const vector = { x: sign * 0.92, y: sign * 0.38 };
    const target = { x: 336, y: 238 };
    const home = { x: target.x - vector.x * 190, y: target.y - vector.y * 190 };
    const near = { x: target.x - vector.x * 56, y: target.y - vector.y * 56 };
    const position = actor === 'biwol'
        ? biwolPosition(definition, elapsed, home, near)
        : { ground: home, height: 0 };
    drawStage(context, { home, target, light });
    context.fillStyle = light ? '#6b5265' : '#d4bac9';
    context.textAlign = 'left';
    context.font = '15px sans-serif';
    context.fillText(definition.label, 18, 27);
    const direction = study.directions[facing];
    const index = Math.min(direction.frames.length - 1, Math.floor(motion.bodyProgress * direction.frames.length));
    const frame = motion.idle ? direction.idle : direction.frames[index];
    const image = images.get(frame.localPath);
    if (!image)
        return;
    if (actor === 'biwol' && !motion.idle) {
        context.save();
        context.globalAlpha = 0.2;
        context.fillStyle = '#090c17';
        context.beginPath();
        context.ellipse(position.ground.x, position.ground.y + 2, 23 - position.height * 0.09, 6 - position.height * 0.025, 0, 0, Math.PI * 2);
        context.fill();
        context.restore();
    }
    const drawBody = () => sprite(context, image, frame, {
        x: position.ground.x,
        y: position.ground.y - position.height,
    });
    if (position.ground.y < target.y || position.height > 25)
        drawBody();
    drawTarget(context, target, elapsed, motion.contact, vector);
    if (position.ground.y >= target.y && position.height <= 25)
        drawBody();
    if (actor === 'biwol') {
        if (direction.bakedEffects !== true)
            drawBiwolEffect(context, options, target, vector, definition.contacts[0]);
        return;
    }
    if (move !== 'volley' && move !== 'eruption' && move !== 'ink')
        return;
    const palm = {
        x: home.x + sign * (move === 'ink' ? 42 : 35),
        y: home.y - (facing === 'south-east' ? 73 : 86),
    };
    drawYeonmukAdditionalEffects(context, {
        kind: move,
        facing,
        elapsed,
        home,
        target,
        palm,
        contacts: definition.contacts,
    });
}
