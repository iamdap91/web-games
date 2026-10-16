import { sampleComboMotion } from './player.js';
import { posePosition, poseWithDrawing } from './pose-drawing.js';
import { frameKey } from './source-frames.js';
const sources = {
    jump: 'jumping-1-south-east',
    backflip: 'backflip-south-east',
    slide: 'running-slide-south-east',
    run: 'running-4-frames-south-east',
    walk: 'walking-3-south-east',
    punch: 'ataho-one-two-punch-south-east-south-east',
    guard: 'fight-stance-idle-8-frames-south-east',
    elbow: 'ataho-firewood-elbow-chop-south-east-south-east',
};
// 원본에서 보이는 발바닥을 지정하고 몸 중앙이나 꼬리 최하단에서는 내지 않는다.
// offsetY는 알파 최하단인 feetY에서 각 발바닥까지의 깊이 차이다.
const footprints = {
    [`${sources.jump}:3`]: [
        { x: 42, offsetY: 0 },
        { x: 62, offsetY: -2 },
    ],
    [`${sources.jump}:7`]: [
        { x: 39, offsetY: 0 },
        { x: 60, offsetY: -1 },
    ],
    [`${sources.backflip}:3`]: [
        { x: 43, offsetY: 0 },
        { x: 63, offsetY: 0 },
    ],
    [`${sources.slide}:2`]: [{ x: 53, offsetY: 0 }],
    [`${sources.slide}:3`]: [{ x: 49, offsetY: 0 }],
    'presentation-anatomical-jump-south-east:2': [
        { x: 39, offsetY: 0 },
        { x: 60, offsetY: 0 },
    ],
    'presentation-landing-drawing-south-east:0': [
        { x: 39, offsetY: 0 },
        { x: 61, offsetY: 0 },
    ],
    'presentation-motion-connections-south-east:1': [
        { x: 43, offsetY: 0 },
        { x: 65, offsetY: 0 },
    ],
    [`${sources.punch}:0`]: [{ x: 64, offsetY: -1 }],
    [`${sources.guard}:0`]: [{ x: 64, offsetY: -1 }],
    [`${sources.elbow}:0`]: [{ x: 49, offsetY: -1 }],
};
function onGround(step) {
    return Math.abs(step.y ?? 0) < 0.01;
}
function directionFrom(step, previous, next) {
    const movement = (next?.x ?? step.x) - step.x || step.x - (previous?.x ?? step.x);
    return movement < 0 ? -1 : 1;
}
function groundEvents(motion) {
    const events = [];
    let timeMs = 0;
    let airborneHeight = 0;
    for (const [index, step] of motion.steps.entries()) {
        const previous = motion.steps[index - 1];
        const next = motion.steps[index + 1];
        const direction = directionFrom(step, previous, next);
        airborneHeight = Math.max(airborneHeight, -(step.y ?? 0));
        if (step.motion === sources.jump &&
            step.frame === 3 &&
            previous?.motion === sources.jump &&
            previous.frame === 2 &&
            onGround(step) &&
            (next?.y ?? 0) < -1) {
            events.push({
                kind: 'takeoff',
                timeMs,
                // 실제 도약 그림의 발 위치를 선택하고 생긴 먼지는 그 자리에 고정한다.
                poseTimeMs: timeMs,
                durationMs: 190,
                strength: 0.46,
                direction,
            });
        }
        if (step.motion === sources.backflip &&
            step.frame === 3 &&
            previous?.motion === sources.backflip &&
            previous.frame === 2 &&
            (step.y ?? 0) >= -4) {
            events.push({
                kind: 'takeoff',
                timeMs,
                poseTimeMs: timeMs,
                durationMs: 190,
                strength: 0.4,
                direction,
            });
        }
        if (step.motion === sources.jump &&
            step.frame === 7 &&
            onGround(step) &&
            (previous?.y ?? 0) < -1) {
            events.push({
                kind: 'landing',
                timeMs,
                poseTimeMs: timeMs,
                durationMs: 240,
                strength: Math.min(0.82, 0.4 + airborneHeight * 0.01),
                direction,
            });
        }
        if (step.motion === sources.slide &&
            (step.frame === 2 || step.frame === 3) &&
            onGround(step) &&
            Math.abs((next?.x ?? step.x) - step.x) >= 3) {
            // 마찰은 실제로 미끄러지는 두 자세에서만 방출하고 복귀 중에는 멈춘다.
            const count = Math.ceil(step.durationMs / 50);
            for (let sample = 0; sample < count; sample++) {
                const atMs = timeMs + (sample * step.durationMs) / count;
                events.push({
                    kind: 'slide',
                    timeMs: atMs,
                    poseTimeMs: atMs,
                    durationMs: 160,
                    strength: 0.38,
                    direction,
                });
            }
        }
        const afterApproach = previous?.motion === sources.run || previous?.motion === sources.walk;
        const plantAfterApproach = afterApproach &&
            (step.motion === sources.punch || step.motion === sources.elbow) &&
            step.frame === 0;
        const plantAfterRetreat = previous?.motion === sources.walk &&
            step.motion === sources.guard &&
            step.frame === 0 &&
            Math.abs(previous.x - step.x) >= 2;
        if (onGround(step) && (plantAfterApproach || plantAfterRetreat)) {
            events.push({
                kind: 'step',
                timeMs,
                poseTimeMs: timeMs,
                durationMs: 150,
                strength: 0.28,
                direction,
            });
        }
        if (onGround(step))
            airborneHeight = 0;
        timeMs += step.durationMs;
    }
    return events;
}
export function hasGroundEffects(motion) {
    return groundEvents(motion).length > 0;
}
export function sampleGroundEffects(snapshot, frames, options) {
    if (snapshot.waiting)
        return [];
    return groundEvents(snapshot.motion).flatMap((event) => {
        const ageMs = snapshot.elapsedMs - event.timeMs;
        if (ageMs < 0 || ageMs >= event.durationMs)
            return [];
        const pose = poseWithDrawing(sampleComboMotion(snapshot.motion, event.poseTimeMs), options.enabledEffects);
        const key = frameKey(pose.step);
        const source = frames.get(key);
        const feet = footprints[key];
        // 발 위치가 확인되지 않은 새 자세는 몸 중심으로 대체하지 않는다.
        if (!source || !feet)
            return [];
        const position = posePosition(pose, source, {
            scale: options.scale,
            showMovement: true,
        });
        return feet.map((foot) => ({
            kind: event.kind,
            x: position.left + foot.x * options.scale,
            // 이륙 후의 높이를 제거해 발이 떠도 이미 생긴 먼지는 지면에 고정한다.
            y: position.top + (source.feetY + foot.offsetY - pose.y) * options.scale,
            ageMs,
            durationMs: event.durationMs,
            strength: event.strength,
            direction: event.direction,
        }));
    });
}
export function groundShadow(snapshot) {
    const height = Math.min(1, Math.max(0, -snapshot.y) / 45);
    let compression = 0;
    if (!snapshot.waiting) {
        for (const event of groundEvents(snapshot.motion)) {
            const age = snapshot.elapsedMs - event.timeMs;
            if (event.kind === 'landing' && age >= 0 && age < 150)
                compression = Math.max(compression, (1 - age / 150) ** 2 * (event.strength / 0.8));
        }
    }
    return {
        opacity: 1 - height * 0.62 + compression * 0.3,
        widthScale: 1 + compression * 0.12,
        heightScale: 1 - height * 0.2 - compression * 0.1,
    };
}
