import { drawPose, posePosition, } from './pose-drawing.js';
function isPartEffect(effect) {
    return (effect.kind === 'part-blur' ||
        effect.kind === 'part-smear' ||
        effect.kind === 'follow-through' ||
        effect.kind === 'overshoot');
}
function partProgress(part, snapshot) {
    if (snapshot.step.motion !== part.motion ||
        snapshot.step.frame !== part.frame)
        return undefined;
    const runs = [];
    let timeMs = 0;
    for (const [index, step] of snapshot.motion.steps.entries()) {
        if (step.motion === part.motion && step.frame === part.frame) {
            const previous = runs.at(-1);
            if (previous?.lastIndex === index - 1) {
                previous.lastIndex = index;
                previous.durationMs += step.durationMs;
            }
            else {
                runs.push({
                    firstIndex: index,
                    lastIndex: index,
                    startMs: timeMs,
                    durationMs: step.durationMs,
                });
            }
        }
        timeMs += step.durationMs;
    }
    const run = part.occurrence === 'last' ? runs.at(-1) : runs[part.occurrence ?? 0];
    if (!run ||
        run.durationMs <= 0 ||
        snapshot.stepIndex < run.firstIndex ||
        snapshot.stepIndex > run.lastIndex)
        return undefined;
    // 접촉과 유지가 같은 자세이면 연속 구간 전체에서 한 번만 변형을 진행한다.
    return Math.max(0, Math.min(1, (snapshot.elapsedMs - run.startMs) / run.durationMs));
}
function unitAxis(part) {
    const length = Math.hypot(part.axis.x, part.axis.y);
    return length > 0
        ? { x: part.axis.x / length, y: part.axis.y / length }
        : { x: 1, y: 0 };
}
function partTransform(actions) {
    let rotation = 0;
    let offsetX = 0;
    let offsetY = 0;
    const stretches = [];
    for (const { effect, part, progress } of actions) {
        const envelope = Math.sin(Math.PI * progress);
        if (effect.kind === 'part-smear') {
            const axis = unitAxis(part);
            stretches.push({
                angle: Math.atan2(axis.y, axis.x),
                scale: Math.max(0.05, 1 + effect.stretch * envelope),
            });
        }
        else if (effect.kind === 'follow-through') {
            const swing = Math.sin(Math.PI * 2 * progress) * (1 - progress);
            rotation += (effect.swingDegrees * Math.PI * swing) / 180;
        }
        else if (effect.kind === 'overshoot') {
            const axis = unitAxis(part);
            rotation += (effect.rotationDegrees * Math.PI * envelope) / 180;
            offsetX += axis.x * effect.distance * envelope;
            offsetY += axis.y * effect.distance * envelope;
        }
    }
    return { rotation, offsetX, offsetY, stretches };
}
function partPlans(snapshot, enabledEffects) {
    const groups = new Map();
    for (const effect of snapshot.motion.effects ?? []) {
        if (!enabledEffects.has(effect.id) || !isPartEffect(effect))
            continue;
        for (const part of effect.parts) {
            if (part.mask.length < 3)
                continue;
            const progress = partProgress(part, snapshot);
            if (progress === undefined)
                continue;
            let group = groups.get(part.id);
            if (!group) {
                group = { part, actions: [] };
                groups.set(part.id, group);
            }
            group.actions.push({ effect, part, progress });
        }
    }
    return [...groups.values()].map((group) => {
        const transform = partTransform(group.actions);
        const replacesOriginal = Math.abs(transform.rotation) > 0.000001 ||
            Math.abs(transform.offsetX) > 0.000001 ||
            Math.abs(transform.offsetY) > 0.000001 ||
            transform.stretches.some(({ scale }) => Math.abs(scale - 1) > 0.000001);
        return { ...group, transform, replacesOriginal };
    });
}
function traceMask(ctx, part) {
    const first = part.mask[0];
    ctx.moveTo(first.x, first.y);
    for (const point of part.mask.slice(1))
        ctx.lineTo(point.x, point.y);
    ctx.closePath();
}
function drawPart(ctx, plan, source, position, scale, exposure = { x: 0, y: 0 }) {
    const { part, transform } = plan;
    ctx.save();
    ctx.translate(position.left, position.top);
    ctx.scale(scale, scale);
    ctx.translate(part.pivot.x + transform.offsetX + exposure.x, part.pivot.y + transform.offsetY + exposure.y);
    ctx.rotate(transform.rotation);
    for (const stretch of transform.stretches) {
        ctx.rotate(stretch.angle);
        ctx.scale(stretch.scale, 1);
        ctx.rotate(-stretch.angle);
    }
    ctx.translate(-part.pivot.x, -part.pivot.y);
    ctx.beginPath();
    traceMask(ctx, part);
    ctx.clip();
    ctx.drawImage(source.image, 0, 0);
    ctx.restore();
}
function drawPartExposures(ctx, plan, source, position, scale) {
    for (const { effect, part, progress } of plan.actions) {
        if (effect.kind !== 'part-blur')
            continue;
        const distance = effect.distance * Math.sin(Math.PI * progress);
        const samples = Math.floor(effect.samples);
        if (distance <= 0.000001 || !Number.isFinite(samples) || samples < 1)
            continue;
        const axis = unitAxis(part);
        for (let index = samples; index >= 1; index--) {
            const fraction = index / samples;
            ctx.save();
            ctx.globalAlpha *= (0.5 * (1 - index / (samples + 1))) / samples;
            drawPart(ctx, plan, source, position, scale, {
                x: -axis.x * distance * fraction,
                y: -axis.y * distance * fraction,
            });
            ctx.restore();
        }
    }
}
function drawRemainingPose(ctx, plans, source, position, scale) {
    ctx.save();
    ctx.translate(position.left, position.top);
    ctx.scale(scale, scale);
    for (const plan of plans) {
        if (!plan.replacesOriginal)
            continue;
        // 마스크가 겹쳐도 원본 조각이 다시 남지 않도록 바깥 영역을 차례로 교집합한다.
        ctx.beginPath();
        ctx.rect(0, 0, source.image.naturalWidth, source.image.naturalHeight);
        traceMask(ctx, plan.part);
        ctx.clip('evenodd');
    }
    ctx.drawImage(source.image, 0, 0);
    ctx.restore();
}
export function drawPoseWithParts(ctx, snapshot, source, options) {
    if (!options.showMovement || snapshot.waiting) {
        drawPose(ctx, snapshot, source, options);
        return;
    }
    const plans = partPlans(snapshot, options.enabledEffects);
    if (!plans.length) {
        drawPose(ctx, snapshot, source, options);
        return;
    }
    const position = posePosition(snapshot, source, options);
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    for (const plan of plans)
        drawPartExposures(ctx, plan, source, position, options.scale);
    drawRemainingPose(ctx, plans, source, position, options.scale);
    for (const plan of plans) {
        if (plan.replacesOriginal)
            drawPart(ctx, plan, source, position, options.scale);
    }
    ctx.restore();
}
