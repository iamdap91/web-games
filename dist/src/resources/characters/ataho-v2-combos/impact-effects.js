import { contactPoint } from './contact-geometry.js';
import { sampleActorPose } from './finisher-actors.js';
import { poseWithDrawing } from './pose-drawing.js';
import { collectSandbagContacts } from './sandbag.js';
function impactLifetimeMs(contact) {
    return 90 + Math.max(0, Math.min(1, contact.strength)) * 60;
}
/** 발생 시각의 위치를 보관한 값만 계산해 자세 전환 뒤에도 충격이 따라 움직이지 않는다. */
export function sampleImpacts(snapshot, options) {
    const contacts = collectSandbagContacts(snapshot.motion, options);
    const impacts = [];
    for (const contact of contacts) {
        if (options.showSandbag && !contact.connected)
            continue;
        const timeMs = options.showSandbag ? contact.timeMs : contact.plannedTimeMs;
        const ageMs = snapshot.elapsedMs - timeMs;
        if (ageMs < 0 || ageMs >= impactLifetimeMs(contact))
            continue;
        if (options.showSandbag || contact.actorId.startsWith('ki:')) {
            impacts.push({ contact, ageMs });
            continue;
        }
        const pose = poseWithDrawing(sampleActorPose(snapshot.motion, contact.actorId, timeMs), options.enabledEffects);
        const point = contactPoint(pose, options);
        if (!point)
            continue;
        impacts.push({
            contact: {
                ...contact,
                ...point,
                timeMs,
                // 대상 없는 계획 표시를 카메라 등의 실제 명중 이벤트로 소비하지 않는다.
                connected: false,
            },
            ageMs,
        });
    }
    return impacts;
}
function strokeSegment(ctx, fromX, fromY, toX, toY) {
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.stroke();
}
function drawRadialImpact(ctx, progress) {
    ctx.strokeStyle = '#fff7d5';
    ctx.lineWidth = 4;
    const radius = 16 + progress * 35;
    for (let index = 0; index < 7; index++) {
        const angle = (index * Math.PI * 2) / 7;
        strokeSegment(ctx, Math.cos(angle) * radius * 0.35, Math.sin(angle) * radius * 0.35, Math.cos(angle) * radius, Math.sin(angle) * radius);
    }
}
function drawCompactImpact(ctx, expansion) {
    const radius = 5 + expansion * 4;
    // 손발 안쪽으로 뻗는 선을 줄이고 타격점 바깥의 작은 부채꼴에만 모은다.
    for (const angle of [-1.15, -0.55, 0, 0.55, 1.15]) {
        strokeSegment(ctx, Math.cos(angle) * radius * 0.4, Math.sin(angle) * radius * 0.4, Math.cos(angle) * radius, Math.sin(angle) * radius);
    }
}
function drawSweepImpact(ctx, expansion) {
    ctx.beginPath();
    ctx.ellipse(1 + expansion * 2, 0, 5 + expansion * 4, 1.7 + expansion, 0, -Math.PI * 0.5, Math.PI * 0.5);
    ctx.stroke();
    for (const offset of [-2.5, 2.5])
        strokeSegment(ctx, 4, offset, 8 + expansion * 4, offset * 1.4);
}
function drawVerticalImpact(ctx, expansion, directionY) {
    ctx.save();
    ctx.scale(1, directionY);
    const length = 7 + expansion * 4;
    strokeSegment(ctx, 2, 2, 2, length);
    strokeSegment(ctx, 0, 2, -1, length * 0.65);
    strokeSegment(ctx, 4, 2, 6, length * 0.65);
    ctx.beginPath();
    ctx.ellipse(2, 2, 4 + expansion * 2, 1.5, 0, 0, Math.PI);
    ctx.stroke();
    ctx.restore();
}
function drawBroadImpact(ctx, expansion) {
    ctx.beginPath();
    ctx.ellipse(1, 0, 2.2 + expansion * 1.8, 6 + expansion * 4, 0, -Math.PI * 0.5, Math.PI * 0.5);
    ctx.stroke();
    for (const direction of [-1, 1])
        strokeSegment(ctx, 4, direction * 4, 8 + expansion * 3, direction * (5 + expansion));
}
/** 호출한 쪽의 불투명도와 무대 변환을 보존하며 고정된 접촉 위치에만 그린다. */
export function drawImpacts(ctx, impacts, options) {
    for (const { contact, ageMs } of impacts) {
        const progress = ageMs / impactLifetimeMs(contact);
        if (progress < 0 || progress >= 1)
            continue;
        ctx.save();
        ctx.globalAlpha *= 1 - progress;
        ctx.translate(contact.x, contact.y);
        if (!options.directional) {
            drawRadialImpact(ctx, progress);
            ctx.restore();
            continue;
        }
        ctx.scale(options.scale * contact.directionX, options.scale);
        ctx.strokeStyle = '#fff1c4';
        ctx.lineWidth = 0.75 + contact.strength * 0.2;
        ctx.lineCap = 'round';
        const expansion = 1 - (1 - progress) ** 2;
        if (contact.kind === 'sweep')
            drawSweepImpact(ctx, expansion);
        else if (contact.reaction === 'rising')
            drawVerticalImpact(ctx, expansion, -1);
        else if (contact.reaction === 'falling')
            drawVerticalImpact(ctx, expansion, 1);
        else if (contact.kind === 'shoulder' || contact.kind === 'palm')
            drawBroadImpact(ctx, expansion);
        else {
            if (contact.kind === 'kick')
                ctx.scale(1.25, 0.85);
            drawCompactImpact(ctx, expansion);
        }
        ctx.restore();
    }
}
