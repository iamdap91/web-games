import { contactPoint } from './contact-geometry.js';
import { inkPivots } from './ink-types.js';
import { motionOptionId } from './motion-options.js';
import { sampleComboMotion } from './player.js';
import { groundY, motionWithDrawingContacts, posePosition, startX, } from './pose-drawing.js';
import { collectSandbagContacts } from './sandbag.js';
import { frameKey } from './source-frames.js';
const shortPunch = {
    sweep: {
        sheet: 'stroke',
        width: 26,
        height: 8,
        opacity: 0.9,
        layer: 'front',
        tailRatio: 0.72,
    },
    impact: { width: 20, height: 18, tailRatio: 0.25, opacity: 0.9 },
};
const highKick = {
    trailId: 'flying-kick-foot-line',
    sweep: {
        sheet: 'arc',
        width: 38,
        height: 46,
        opacity: 0.88,
        layer: 'back',
        rotation: -0.18,
        offsetY: 9,
        tailRatio: 0.8,
    },
    impact: { width: 27, height: 23, tailRatio: 0.4, opacity: 0.95 },
};
// 크기는 원본 논리 픽셀이다. 접힌 다리·팔꿈치를 큰 검기처럼 늘리지 않는다.
const profiles = {
    rush: { ...shortPunch, trailId: 'rush-punch-lines' },
    'landing-one-two-standalone': shortPunch,
    'quick-jab': { ...shortPunch, trailId: 'quick-jab-line' },
    'double-jab': { ...shortPunch, trailId: 'double-jab-lines' },
    'flying-kick': highKick,
    'ground-high-kick': { ...highKick, trailId: 'ground-high-kick-foot-line' },
    'ground-spin': {
        trailId: 'ground-spin-knee-ribbon',
        sweep: {
            sheet: 'arc',
            width: 29,
            height: 30,
            opacity: 0.85,
            layer: 'back',
            rotation: -0.12,
            offsetY: 5,
            tailRatio: 0.64,
        },
        impact: { width: 23, height: 20, tailRatio: 0.3, opacity: 0.9 },
    },
    'charged-uppercut': {
        trailId: 'charged-uppercut-ribbon',
        sweep: {
            sheet: 'arc',
            width: 33,
            height: 49,
            opacity: 0.92,
            layer: 'back',
            rotation: -0.35,
            offsetY: 11,
            tailRatio: 0.8,
        },
        impact: { width: 26, height: 22, tailRatio: 0.4, opacity: 0.95 },
    },
    'new-smear-hook': {
        trailId: 'hook-outer-line',
        sweep: {
            sheet: 'arc',
            width: 52,
            height: 34,
            opacity: 0.9,
            layer: 'back',
            rotation: 0.08,
            tailRatio: 0.65,
        },
        impact: { width: 25, height: 23, tailRatio: 0.4, opacity: 0.95 },
    },
    'new-smear-hammerfist': {
        trailId: 'hammerfist-diagonal-line',
        trimStart: 1,
        sweep: {
            sheet: 'stroke',
            width: 43,
            height: 15,
            rotation: Math.PI * 0.34,
            opacity: 0.94,
            layer: 'back',
            tailRatio: 0.72,
        },
        impact: { width: 28, height: 24, tailRatio: 0.5, opacity: 0.98 },
    },
    'new-horizontal-elbow': {
        trailId: 'compact-elbow-curve',
        sweep: {
            sheet: 'stroke',
            width: 21,
            height: 9,
            opacity: 0.88,
            layer: 'front',
            tailRatio: 0.58,
        },
        impact: { width: 22, height: 21, tailRatio: 0.35, opacity: 0.9 },
    },
    'elbow-chop': {
        sweep: {
            sheet: 'stroke',
            width: 29,
            height: 13,
            opacity: 0.9,
            layer: 'back',
            tailRatio: 0.72,
        },
        impact: { width: 25, height: 23, tailRatio: 0.5, opacity: 0.96 },
    },
    cheolsango: {
        sweep: {
            sheet: 'stroke',
            width: 29,
            height: 27,
            opacity: 0.86,
            layer: 'back',
            tailRatio: 0.6,
        },
        impact: { width: 34, height: 30, tailRatio: 0.5, opacity: 0.98 },
    },
    'slide-sweep': {
        trailId: 'slide-ground-line',
        trimStart: 2,
        sweep: {
            sheet: 'stroke',
            width: 38,
            height: 6,
            opacity: 0.66,
            layer: 'back',
            tailRatio: 0.35,
        },
        impact: { width: 25, height: 13, tailRatio: 0.4, opacity: 0.9 },
    },
};
export function hasInkEffects(motion) {
    return profiles[motionOptionId(motion)] !== undefined;
}
function stepStarts(motion) {
    let timeMs = 0;
    return motion.steps.map((step) => {
        const start = timeMs;
        timeMs += step.durationMs;
        return start;
    });
}
function sourcePath(motion, path, starts, frames, options) {
    const first = path.points[0];
    if (!first)
        return [];
    let occurrence = path.occurrence ?? 0;
    let cursor = motion.steps.findIndex((step) => step.motion === path.motion &&
        step.frame === first.frame &&
        occurrence-- === 0);
    if (cursor < 0)
        return [];
    const points = [];
    for (const point of path.points) {
        while (cursor < motion.steps.length) {
            const step = motion.steps[cursor];
            if (step.motion === path.motion && step.frame === point.frame)
                break;
            cursor++;
        }
        if (cursor >= motion.steps.length)
            return [];
        const timeMs = starts[cursor];
        const pose = sampleComboMotion(motion, timeMs);
        const source = frames.get(frameKey(pose.step));
        if (!source)
            return [];
        const position = posePosition(pose, source, {
            scale: options.scale,
            showMovement: true,
        });
        points.push({
            timeMs,
            stepIndex: cursor,
            x: path.space === 'ground'
                ? startX + (pose.x + point.x) * options.scale
                : position.left + point.x * options.scale,
            y: path.space === 'ground'
                ? groundY + point.y * options.scale
                : position.top + point.y * options.scale,
        });
        cursor++;
    }
    return points;
}
function pointAt(points, timeMs) {
    for (let index = 1; index < points.length; index++) {
        const point = points[index];
        if (timeMs > point.timeMs)
            continue;
        const previous = points[index - 1];
        const progress = Math.max(0, (timeMs - previous.timeMs) / (point.timeMs - previous.timeMs));
        return {
            x: previous.x + (point.x - previous.x) * progress,
            y: previous.y + (point.y - previous.y) * progress,
        };
    }
    return points.at(-1);
}
function sweepSample(snapshot, points, style, options) {
    const first = points[0];
    const last = points.at(-1);
    if (!first || !last || first === last)
        return undefined;
    const endingStep = snapshot.motion.steps[last.stepIndex];
    const durationMs = last.timeMs - first.timeMs + endingStep.durationMs * style.tailRatio;
    const ageMs = snapshot.elapsedMs - first.timeMs;
    if (ageMs < 0 || ageMs >= durationMs || durationMs <= 0)
        return undefined;
    const position = pointAt(points, snapshot.elapsedMs);
    const travelAngle = Math.atan2(last.y - first.y, last.x - first.x);
    const rotation = style.rotation ?? travelAngle;
    const width = style.width * options.scale;
    const height = style.height * options.scale;
    // 먹 호는 손발 바깥의 빈 공간으로 펼쳐 몸에 가려지지 않게 하고,
    // 직선 획은 끝을 손발에 맞춘다. 회수 뒤에는 그 자리에 남긴다.
    const tipDistance = width * (style.sheet === 'arc' ? 0.08 : 0.38);
    return {
        sheet: style.sheet,
        ageMs,
        durationMs,
        x: position.x - Math.cos(rotation) * tipDistance,
        y: position.y -
            Math.sin(rotation) * tipDistance +
            (style.offsetY ?? 0) * options.scale,
        width,
        height,
        rotation,
        mirrorX: false,
        opacity: style.opacity * snapshot.opacity,
        layer: style.layer,
        phase: 'sweep',
    };
}
function contactPaths(motion, starts, options) {
    const id = motionOptionId(motion);
    if (!['cheolsango', 'elbow-chop', 'slide-sweep'].includes(id))
        return [];
    const paths = [];
    for (const [index, step] of motion.steps.entries()) {
        if (!step.contact || index === 0)
            continue;
        const previous = motion.steps[index - 1];
        // 타격 다리가 가려진 쓸기는 접촉까지의 낮은 폭만 표현한다.
        const startRatio = id === 'elbow-chop' ? 0.72 : id === 'cheolsango' ? 0.22 : 0;
        const startMs = starts[index - 1] + previous.durationMs * startRatio;
        const endMs = starts[index];
        const end = contactPoint(sampleComboMotion(motion, endMs), options);
        const startPose = sampleComboMotion(motion, startMs);
        const reach = step.contact.reach ?? 35;
        const offsetX = id === 'elbow-chop' ? -4 : id === 'slide-sweep' ? -15 : 0;
        const offsetY = id === 'elbow-chop' ? -21 : id === 'slide-sweep' ? 2 : 0;
        paths.push([
            {
                timeMs: startMs,
                stepIndex: index - 1,
                x: startX + (startPose.x + reach + offsetX) * options.scale,
                y: end.y + offsetY * options.scale,
            },
            { ...end, timeMs: endMs, stepIndex: index },
        ]);
    }
    return paths;
}
const landingPunchPaths = [
    {
        motion: 'ataho-one-two-punch-south-east-south-east',
        points: [
            { frame: 1, x: 77, y: 46 },
            { frame: 2, x: 79, y: 46 },
        ],
    },
    {
        motion: 'ataho-one-two-punch-south-east-south-east',
        points: [
            { frame: 11, x: 65, y: 49 },
            { frame: 12, x: 71, y: 49 },
        ],
    },
];
function impactSamples(snapshot, profile, options) {
    if (!options.showContacts)
        return [];
    return collectSandbagContacts(snapshot.motion, options).flatMap((contact) => {
        if (options.showSandbag && !contact.connected)
            return [];
        const timeMs = options.showSandbag ? contact.timeMs : contact.plannedTimeMs;
        const ageMs = snapshot.elapsedMs - timeMs;
        const nextStep = snapshot.motion.steps[contact.stepIndex + 1];
        const durationMs = contact.durationMs +
            (nextStep?.durationMs ?? 0) * profile.impact.tailRatio;
        if (ageMs < 0 || ageMs >= durationMs || durationMs <= 0)
            return [];
        const point = options.showSandbag
            ? contact
            : contactPoint(sampleComboMotion(snapshot.motion, timeMs), options);
        if (!point)
            return [];
        const rotation = contact.reaction === 'rising'
            ? -Math.PI / 2
            : contact.reaction === 'falling'
                ? Math.PI / 2
                : 0;
        const mirrorX = contact.directionX < 0 && contact.reaction === 'horizontal';
        const width = profile.impact.width * options.scale;
        const direction = mirrorX ? -1 : 1;
        return [
            {
                sheet: 'impact',
                ageMs,
                durationMs,
                x: point.x +
                    Math.cos(rotation) * direction * width * (0.5 - inkPivots.impact.x),
                y: point.y + Math.sin(rotation) * width * (0.5 - inkPivots.impact.x),
                width,
                height: profile.impact.height * options.scale,
                rotation,
                mirrorX,
                opacity: profile.impact.opacity * snapshot.opacity,
                layer: 'front',
                phase: 'impact',
            },
        ];
    });
}
/** 현재 박자의 실제 자세 구간에서 계산하므로 정지·탐색·반복에 누적 상태가 없다. */
export function sampleInkEffects(snapshot, frames, options) {
    const id = motionOptionId(snapshot.motion);
    const profile = profiles[id];
    if (!profile || snapshot.waiting)
        return [];
    const motion = motionWithDrawingContacts(snapshot.motion, options.enabledEffects);
    // 원본 팔꿈치 그림 비교에는 공격 접촉과 수묵 타격을 덧붙이지 않는다.
    if (id === 'elbow-chop' && !motion.steps.some((step) => step.contact))
        return [];
    const current = { ...snapshot, motion };
    const starts = stepStarts(motion);
    const trail = motion.effects?.find((effect) => effect.id === profile.trailId);
    const paths = trail && (trail.kind === 'line' || trail.kind === 'ribbon')
        ? trail.paths.map((path) => ({
            ...path,
            points: path.points.slice(profile.trimStart ?? 0),
        }))
        : id === 'landing-one-two-standalone'
            ? landingPunchPaths
            : [];
    const samples = [];
    for (const path of paths) {
        const sample = sweepSample(current, sourcePath(motion, path, starts, frames, options), profile.sweep, options);
        if (sample)
            samples.push(sample);
    }
    for (const points of contactPaths(motion, starts, options)) {
        const style = id === 'slide-sweep'
            ? {
                ...profile.sweep,
                width: 33,
                height: 9,
                opacity: 0.85,
                layer: 'front',
                tailRatio: 0.7,
            }
            : profile.sweep;
        const sample = sweepSample(current, points, style, options);
        if (sample)
            samples.push(sample);
    }
    return [...samples, ...impactSamples(current, profile, options)];
}
