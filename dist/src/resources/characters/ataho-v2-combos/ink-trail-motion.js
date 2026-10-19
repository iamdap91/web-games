import { contactPoint } from './contact-geometry.js';
import { motionActors, sampleActorPose, } from './finisher-actors.js';
import { visibleInkTrailPoints, } from './ink-trail-types.js';
import { motionOptionId } from './motion-options.js';
import { comboDuration } from './player.js';
import { groundY, motionWithActorDrawingContacts, posePosition, poseWithDrawing, startX, } from './pose-drawing.js';
import { frameKey } from './source-frames.js';
const attackTrailLifetimeMs = 125;
const movementTrailLifetimeMs = 80;
const attackLookbackMs = 120;
const deferredAttacks = new Set([
    'new-double-palm',
    'new-front-push-kick',
    'new-visible-low-sweep',
]);
export function hasInkTrails(motion) {
    if (deferredAttacks.has(motionOptionId(motion)))
        return false;
    return (!!motion.ki ||
        !!motion.finisher ||
        motion.steps.some((step) => !!step.contact));
}
function actorStarts(actor) {
    let timeMs = actor.startMs;
    return actor.steps.map((step) => {
        const start = timeMs;
        timeMs += step.durationMs;
        return start;
    });
}
function actorOpacity(actor, timeMs) {
    if (actor.role === 'body')
        return actor.opacity;
    const ageMs = timeMs - actor.startMs;
    const durationMs = actor.steps.reduce((duration, step) => duration + step.durationMs, 0);
    return (actor.opacity *
        Math.max(0, Math.min(1, ageMs / 45, (durationMs - ageMs) / 85)));
}
function trailSeed(id) {
    let seed = 17;
    for (const character of id)
        seed = (seed * 31 + character.charCodeAt(0)) | 0;
    return seed >>> 0;
}
function authoredAttackPath(motion, actor, contactIndex, starts, frames, options) {
    const contact = actor.steps[contactIndex];
    for (const effect of motion.effects ?? []) {
        if (effect.kind !== 'line' && effect.kind !== 'ribbon')
            continue;
        for (const path of effect.paths) {
            if (path.space === 'ground' || path.motion !== contact.motion)
                continue;
            const end = path.points.findIndex((point) => point.frame === contact.frame);
            if (end < 1)
                continue;
            const points = [];
            let cursor = contactIndex;
            for (const point of path.points.slice(0, end + 1).reverse()) {
                while (cursor >= 0 &&
                    (actor.steps[cursor].motion !== path.motion ||
                        actor.steps[cursor].frame !== point.frame)) {
                    if (actor.steps[cursor].teleport || actor.steps[cursor].contact)
                        break;
                    cursor--;
                }
                const step = actor.steps[cursor];
                if (!step ||
                    step.teleport ||
                    step.motion !== path.motion ||
                    step.frame !== point.frame)
                    break;
                const timeMs = starts[cursor];
                const pose = sampleActorPose(motion, actor.id, timeMs);
                // 다른 그림으로 교체한 자세에는 원본 PNG의 손발 좌표를 얹지 않는다.
                if (poseWithDrawing(pose, options.enabledEffects).step.motion !==
                    step.motion)
                    break;
                const source = frames.get(frameKey(step));
                if (!source)
                    break;
                const position = posePosition(pose, source, {
                    scale: options.scale,
                    showMovement: true,
                });
                points.unshift({
                    timeMs,
                    x: position.left + point.x * options.scale,
                    y: position.top + point.y * options.scale,
                });
                cursor--;
            }
            if (points.length !== end + 1)
                continue;
            return {
                points: visibleInkTrailPoints(points, starts[contactIndex], attackLookbackMs),
                layer: path.layer ?? 'front',
            };
        }
    }
    return undefined;
}
function attackOffsets(motion, step) {
    const contact = step.contact;
    const direction = Math.sign(contact.reach ?? 26) || 1;
    const source = step.motion;
    if (/uppercut/.test(source))
        return [
            { progress: 0, x: 9, y: 22 },
            { progress: 0.5, x: 5, y: 9 },
            { progress: 1, x: 0, y: 0 },
        ];
    if (/hammerfist|elbow-chop|firewood|aerial-smash|martial-stomp/.test(source)) {
        const height = source.includes('aerial-smash') ? 9 : 22;
        return [
            { progress: 0, x: -4 * direction, y: -height },
            { progress: 0.5, x: 2 * direction, y: -height * 0.45 },
            { progress: 1, x: 0, y: 0 },
        ];
    }
    if (/hook|roundhouse/.test(source))
        return [
            { progress: 0, x: -22 * direction, y: 7 },
            { progress: 0.45, x: -10 * direction, y: -4 },
            { progress: 1, x: 0, y: 0 },
        ];
    if (contact.kind === 'shoulder') {
        // 철산고의 먹 시작점을 들어 올린 팔에서 몸 앞 어깨로 옮긴다.
        const offset = motion.id === 'cheolsango' ? { x: direction * 6, y: 7 } : { x: 0, y: 0 };
        return [
            { progress: 0, ...offset },
            { progress: 1, ...offset },
        ];
    }
    if (contact.kind === 'kick' && contact.height > 15)
        return [
            { progress: 0, x: -9 * direction, y: 20 },
            { progress: 0.5, x: -2 * direction, y: 9 },
            { progress: 1, x: 0, y: 0 },
        ];
    return [
        { progress: 0, x: -12 * direction, y: contact.kind === 'sweep' ? 3 : 0 },
        { progress: 0.5, x: -6 * direction, y: contact.kind === 'sweep' ? 1 : -1 },
        { progress: 1, x: 0, y: 0 },
    ];
}
function contactAttackPath(motion, actor, index, starts, options) {
    const step = actor.steps[index];
    const endMs = starts[index];
    const previous = actor.steps[index - 1];
    if (!previous || previous.teleport || step.teleport)
        return [];
    const startMs = Math.max(starts[index - 1], endMs - 105);
    if (startMs >= endMs)
        return [];
    const endPose = sampleActorPose(motion, actor.id, endMs);
    const end = contactPoint(endPose, options);
    if (!end)
        return [];
    const offsets = attackOffsets(motion, step);
    const first = offsets[0];
    const last = offsets.at(-1);
    const middle = offsets.length === 3 ? offsets[1] : undefined;
    const control = middle
        ? {
            x: (middle.x -
                first.x * (1 - middle.progress) ** 2 -
                last.x * middle.progress ** 2) /
                (2 * middle.progress * (1 - middle.progress)),
            y: (middle.y -
                first.y * (1 - middle.progress) ** 2 -
                last.y * middle.progress ** 2) /
                (2 * middle.progress * (1 - middle.progress)),
        }
        : undefined;
    // 붓의 가운데 지점을 통과하는 곡선을 실제 몸 이동에 더한다.
    const divisions = control ? 8 : 1;
    return Array.from({ length: divisions + 1 }, (_, index) => {
        const progress = index / divisions;
        const timeMs = startMs + (endMs - startMs) * progress;
        const pose = sampleActorPose(motion, actor.id, timeMs);
        const x = control
            ? first.x * (1 - progress) ** 2 +
                2 * control.x * progress * (1 - progress) +
                last.x * progress ** 2
            : first.x + (last.x - first.x) * progress;
        const y = control
            ? first.y * (1 - progress) ** 2 +
                2 * control.y * progress * (1 - progress) +
                last.y * progress ** 2
            : first.y + (last.y - first.y) * progress;
        return {
            timeMs,
            x: end.x + (pose.x - endPose.x + x) * options.scale,
            y: end.y + (pose.y - endPose.y + y) * options.scale,
        };
    });
}
function attackWidth(contact) {
    if (contact.kind === 'shoulder')
        return 7;
    if (contact.kind === 'kick' || contact.kind === 'sweep')
        return 5.5;
    return contact.kind === 'elbow' ? 4.5 : 5;
}
function movementPath(motion, actor, index, starts, options) {
    const step = actor.steps[index];
    const next = actor.steps[index + 1];
    if (!next ||
        step.teleport ||
        next.teleport ||
        step.emphasis === 'charge' ||
        /회수|복귀|되돌|완료|정착|풀기|여운|거두/.test(step.phase))
        return [];
    const startMs = starts[index];
    // hold 축이 다음 자세에서 갑자기 바뀌어도 두 위치를 선으로 잇지 않는다.
    const endMs = starts[index + 1] - 0.0001;
    const first = sampleActorPose(motion, actor.id, startMs);
    const last = sampleActorPose(motion, actor.id, endMs);
    const distance = Math.hypot(last.x - first.x, last.y - first.y);
    if (distance < 4 || distance / step.durationMs < 0.055)
        return [];
    return [0, 0.25, 0.5, 0.75, 1].map((progress) => {
        const timeMs = startMs + (endMs - startMs) * progress;
        const pose = sampleActorPose(motion, actor.id, timeMs);
        return {
            timeMs,
            x: startX + pose.x * options.scale,
            y: groundY + (pose.y - 3) * options.scale,
        };
    });
}
export function sampleMotionInkTrails(snapshot, frames, options) {
    if (!hasInkTrails(snapshot.motion) || snapshot.waiting)
        return [];
    const motion = motionWithActorDrawingContacts(snapshot.motion, options.enabledEffects);
    const samples = [];
    for (const actor of motionActors(motion)) {
        const opacity = actorOpacity(actor, snapshot.elapsedMs);
        if (opacity <= 0)
            continue;
        const starts = actorStarts(actor);
        const endMs = actor.startMs + comboDuration({ ...motion, steps: actor.steps });
        if (snapshot.elapsedMs < actor.startMs ||
            snapshot.elapsedMs >=
                endMs + Math.max(attackTrailLifetimeMs, movementTrailLifetimeMs))
            continue;
        for (const [index, step] of actor.steps.entries()) {
            const timeMs = starts[index];
            if (step.contact &&
                !step.teleport &&
                snapshot.elapsedMs >= timeMs - attackLookbackMs &&
                snapshot.elapsedMs < timeMs + attackTrailLifetimeMs) {
                const authored = authoredAttackPath(motion, actor, index, starts, frames, options);
                const authoredLength = authored?.points.reduce((length, point, pointIndex, points) => {
                    const previous = points[pointIndex - 1];
                    return (length +
                        (previous
                            ? Math.hypot(point.x - previous.x, point.y - previous.y)
                            : 0));
                }, 0) ?? 0;
                // 끝 주먹만 찍은 짧은 선 대신 접촉에 맞춘 휘두름 곡선을 사용한다.
                const shortSwing = (step.contact.kind === 'punch' ||
                    /hook|uppercut|kick/.test(step.motion)) &&
                    authoredLength < 16 * options.scale;
                const points = authored && !shortSwing
                    ? authored.points
                    : contactAttackPath(motion, actor, index, starts, options);
                if (points.length >= 2) {
                    const id = `${actor.id}:attack:${index}`;
                    samples.push({
                        id,
                        attack: { actorId: actor.id, stepIndex: index },
                        points,
                        width: attackWidth(step.contact) * options.scale,
                        lifetimeMs: attackTrailLifetimeMs,
                        opacity,
                        layer: authored?.layer ?? 'front',
                        seed: trailSeed(id),
                    });
                }
            }
            if (snapshot.elapsedMs < timeMs ||
                snapshot.elapsedMs >= timeMs + step.durationMs + movementTrailLifetimeMs)
                continue;
            const points = movementPath(motion, actor, index, starts, options);
            if (points.length < 2)
                continue;
            const id = `${actor.id}:movement:${index}`;
            samples.push({
                id,
                points,
                width: 3 * options.scale,
                lifetimeMs: movementTrailLifetimeMs,
                opacity: opacity * 0.65,
                layer: 'back',
                seed: trailSeed(id),
            });
        }
    }
    return samples;
}
