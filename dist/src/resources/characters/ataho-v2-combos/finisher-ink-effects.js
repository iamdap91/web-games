import { contactPoint } from './contact-geometry.js';
import { collectContactCues, motionActors, sampleActorPose, } from './finisher-actors.js';
import { inkProfiles } from './ink-profiles.js';
import { sampleMotionInkTrails } from './ink-trail-motion.js';
import { inkPivots } from './ink-types.js';
import { kiHitPoint, sampleKiShot } from './ki-sampling.js';
import { groundY, motionWithActorDrawingContacts, startX, } from './pose-drawing.js';
import { collectSandbagContacts } from './sandbag.js';
function attackProfile(step) {
    const source = step.motion;
    let id = 'rush';
    if (step.contact?.kind === 'shoulder')
        id = 'cheolsango';
    else if (/hammerfist/.test(source))
        id = 'new-smear-hammerfist';
    else if (/aerial-smash|martial-stomp|elbow-keyposes|elbow-chop|firewood/.test(source))
        id = 'elbow-chop';
    else if (/uppercut/.test(source))
        id = 'charged-uppercut';
    else if (/hook/.test(source))
        id = 'new-smear-hook';
    else if (/roundhouse/.test(source))
        id = 'ground-spin';
    else if (step.contact?.kind === 'kick')
        id = 'ground-high-kick';
    else if (step.contact?.kind === 'elbow')
        id = 'new-horizontal-elbow';
    else if (step.contact?.kind === 'sweep')
        id = 'slide-sweep';
    return inkProfiles[id];
}
export function hasFinisherInkEffects(motion) {
    return !!motion.finisher && collectContactCues(motion).length > 0;
}
export function finisherInkSpriteSheets(motion) {
    if (!hasFinisherInkEffects(motion))
        return [];
    if (motion.ki)
        return motion.ki.shots.length ? ['stroke', 'impact'] : ['impact'];
    const sheets = new Set(['impact']);
    for (const cue of collectContactCues(motion))
        sheets.add(attackProfile(cue.step).sweep.sheet);
    return [...sheets];
}
function pointAt(points, timeMs) {
    for (let index = 1; index < points.length; index++) {
        const next = points[index];
        if (timeMs > next.timeMs)
            continue;
        const previous = points[index - 1];
        const progress = Math.max(0, Math.min(1, (timeMs - previous.timeMs) / Math.max(1, next.timeMs - previous.timeMs)));
        return {
            x: previous.x + (next.x - previous.x) * progress,
            y: previous.y + (next.y - previous.y) * progress,
        };
    }
    return points.at(-1);
}
function attackSweep(snapshot, trail, step, options) {
    const first = trail.points[0];
    const last = trail.points.at(-1);
    if (!first || !last || first === last)
        return undefined;
    const style = attackProfile(step).sweep;
    // 원본 경로가 남는 시간을 넘겨 먹획 꼬리만 늘리지 않는다.
    const tailMs = Math.min(step.durationMs * style.tailRatio, trail.lifetimeMs);
    const durationMs = last.timeMs - first.timeMs + tailMs;
    const ageMs = snapshot.elapsedMs - first.timeMs;
    if (ageMs < 0 || ageMs >= durationMs || durationMs <= 0)
        return undefined;
    const position = pointAt(trail.points, snapshot.elapsedMs);
    const direction = (step.contact?.reach ?? 26) < 0 ? -1 : 1;
    const travelAngle = Math.atan2(last.y - first.y, last.x - first.x);
    const mirrorX = style.sheet === 'arc' && direction < 0;
    const rotation = style.rotation === undefined
        ? travelAngle
        : style.sheet === 'arc'
            ? style.rotation * direction
            : direction < 0
                ? Math.PI - style.rotation
                : style.rotation;
    const width = style.width * options.scale;
    const tipDistance = width * (style.sheet === 'arc' ? 0.08 : 0.38);
    const tipDirection = mirrorX ? -1 : 1;
    return {
        sheet: style.sheet,
        ageMs,
        durationMs,
        x: position.x - Math.cos(rotation) * tipDistance * tipDirection,
        y: position.y -
            Math.sin(rotation) * tipDistance * tipDirection +
            (style.offsetY ?? 0) * options.scale,
        width,
        height: style.height * options.scale,
        rotation,
        mirrorX,
        opacity: style.opacity * trail.opacity * snapshot.opacity,
        layer: style.layer,
        phase: 'sweep',
    };
}
function impactSample(input) {
    const { contact, profile, point, ageMs, durationMs, scale } = input;
    if (ageMs < 0 || ageMs >= durationMs || durationMs <= 0)
        return undefined;
    const strength = Math.max(0, Math.min(1, contact.strength));
    const size = 0.65 + strength * 0.35;
    const width = profile.impact.width * scale * size;
    const rotation = contact.reaction === 'rising'
        ? -Math.PI / 2
        : contact.reaction === 'falling'
            ? Math.PI / 2
            : input.arrivalAngle === undefined
                ? 0
                : input.arrivalAngle - (contact.directionX < 0 ? Math.PI : 0);
    const mirrorX = contact.directionX < 0 && contact.reaction === 'horizontal';
    const direction = mirrorX ? -1 : 1;
    return {
        sheet: 'impact',
        ageMs,
        durationMs,
        x: point.x +
            Math.cos(rotation) * direction * width * (0.5 - inkPivots.impact.x),
        y: point.y +
            Math.sin(rotation) * direction * width * (0.5 - inkPivots.impact.x),
        width,
        height: profile.impact.height * scale * size,
        rotation,
        mirrorX,
        opacity: profile.impact.opacity * input.opacity,
        layer: 'front',
        phase: 'impact',
    };
}
function physicalSamples(snapshot, frames, options) {
    const motion = motionWithActorDrawingContacts(snapshot.motion, options.enabledEffects);
    const current = { ...snapshot, motion };
    const actors = motionActors(motion);
    const samples = [];
    // 추적 수묵과 같은 접촉 경로를 읽어 분신·교체 그림·순간이동의 경계를 공유한다.
    for (const trail of sampleMotionInkTrails(current, frames, options)) {
        const attack = trail.attack;
        if (!attack)
            continue;
        const actor = actors.find((item) => item.id === attack.actorId);
        const step = actor?.steps[attack.stepIndex];
        if (!step?.contact)
            continue;
        const sample = attackSweep(current, trail, step, options);
        if (sample)
            samples.push(sample);
    }
    if (!options.showContacts)
        return samples;
    for (const contact of collectSandbagContacts(motion, options)) {
        if (options.showSandbag && !contact.connected)
            continue;
        const actor = actors.find((item) => item.id === contact.actorId);
        const step = actor?.steps[contact.stepIndex];
        if (!actor || !step?.contact)
            continue;
        const profile = attackProfile(step);
        const timeMs = options.showSandbag ? contact.timeMs : contact.plannedTimeMs;
        // 샌드백을 숨기면 최초 교차점이 아니라 해당 공격자의 계획 접촉점으로 되돌린다.
        const point = options.showSandbag
            ? contact
            : contactPoint({
                ...sampleActorPose(motion, actor.id, contact.plannedTimeMs),
                step,
            }, options);
        if (!point)
            continue;
        const nextStep = actor.steps[contact.stepIndex + 1];
        const durationMs = Math.max(45, Math.min(180, contact.durationMs +
            (nextStep?.durationMs ?? 0) * profile.impact.tailRatio)) *
            (0.75 + Math.max(0, Math.min(1, contact.strength)) * 0.25);
        const sample = impactSample({
            contact,
            profile,
            point,
            ageMs: snapshot.elapsedMs - timeMs,
            durationMs,
            scale: options.scale,
            opacity: actor.opacity * snapshot.opacity,
        });
        if (sample)
            samples.push(sample);
    }
    return samples;
}
function kiSamples(snapshot, options) {
    const definition = snapshot.motion.ki;
    if (!definition)
        return [];
    const profile = inkProfiles.rush;
    const samples = [];
    for (const shot of definition.shots) {
        const ageMs = snapshot.elapsedMs - shot.launchMs;
        const flightMs = shot.arriveMs - shot.launchMs;
        const tailMs = 45;
        if (ageMs < 0 || ageMs >= flightMs + tailMs)
            continue;
        const timeMs = Math.min(snapshot.elapsedMs, shot.arriveMs);
        const point = sampleKiShot(shot, timeMs).point;
        const previous = sampleKiShot(shot, Math.max(shot.launchMs, timeMs - 24)).point;
        const tangentEnd = timeMs === shot.launchMs
            ? sampleKiShot(shot, Math.min(shot.arriveMs, shot.launchMs + 1)).point
            : point;
        const dx = tangentEnd.x - previous.x;
        const dy = tangentEnd.y - previous.y;
        const rotation = Math.atan2(dy, dx);
        const size = Math.max(0.25, Math.min(0.65, shot.radius / 5));
        const width = profile.sweep.width * options.scale * size;
        // 광탄 자체를 바꾸지 않고 실제 비행 접선 뒤에 짧은 기존 먹획만 붙인다.
        samples.push({
            sheet: 'stroke',
            ageMs,
            durationMs: flightMs + tailMs,
            x: startX + point.x * options.scale - Math.cos(rotation) * width * 0.38,
            y: groundY + point.y * options.scale - Math.sin(rotation) * width * 0.38,
            width,
            height: profile.sweep.height * options.scale * size * 0.65,
            rotation,
            mirrorX: false,
            opacity: profile.sweep.opacity *
                snapshot.opacity *
                Math.max(0, Math.min(1, (flightMs + tailMs - ageMs) / tailMs)),
            layer: 'back',
            phase: 'sweep',
        });
    }
    if (!options.showContacts)
        return samples;
    for (const contact of collectSandbagContacts(snapshot.motion, options)) {
        if (options.showSandbag && !contact.connected)
            continue;
        const hit = definition.hits.find((item) => `ki:${item.id}` === contact.actorId);
        if (!hit)
            continue;
        const shot = definition.shots.find((item) => item.id === hit.shotId);
        const point = kiHitPoint(definition, hit);
        const arrival = shot ? sampleKiShot(shot, shot.arriveMs).point : undefined;
        const beforeArrival = shot
            ? sampleKiShot(shot, shot.arriveMs - 24).point
            : undefined;
        const dx = arrival && beforeArrival ? arrival.x - beforeArrival.x : 1;
        const dy = arrival && beforeArrival ? arrival.y - beforeArrival.y : 0;
        const timeMs = options.showSandbag ? contact.timeMs : hit.atMs;
        const sample = impactSample({
            contact: { ...contact, directionX: dx < 0 ? -1 : 1 },
            profile,
            point: options.showSandbag
                ? contact
                : {
                    x: startX + point.x * options.scale,
                    y: groundY + point.y * options.scale,
                },
            ageMs: snapshot.elapsedMs - timeMs,
            durationMs: hit.durationMs * (0.7 + Math.max(0, Math.min(1, hit.strength)) * 0.3),
            scale: options.scale,
            opacity: snapshot.opacity,
            arrivalAngle: Math.atan2(dy, dx),
        });
        if (sample)
            samples.push(sample);
    }
    return samples;
}
/** 공격자별 경로와 실제 기공 시각만 읽으며 접촉이나 재생 이력을 새로 만들지 않는다. */
export function sampleFinisherInkEffects(snapshot, frames, options) {
    if (!snapshot.motion.finisher ||
        snapshot.waiting ||
        snapshot.elapsedMs >= snapshot.durationMs)
        return [];
    return snapshot.motion.ki
        ? kiSamples(snapshot, options)
        : physicalSamples(snapshot, frames, options);
}
