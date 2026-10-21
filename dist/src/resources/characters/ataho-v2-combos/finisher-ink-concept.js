import { sampleActorPose } from './finisher-actors.js';
import { sampleDemonDescent } from './demon-descent.js';
const ink = '#120e15';
const contactLight = '#fff0d2';
function clamp(value) {
    return Math.max(0, Math.min(1, value));
}
function decay(ageMs, holdMs, endMs) {
    if (ageMs < 0 || ageMs >= endMs)
        return 0;
    return 1 - clamp((ageMs - holdMs) / (endMs - holdMs));
}
function grain(seed) {
    const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
    return value - Math.floor(value);
}
function sampleInkMoment(frame) {
    const { snapshot, finisher, options } = frame;
    if (finisher.definition.theme !== 'demon' ||
        !options.showMovement ||
        snapshot.waiting ||
        snapshot.elapsedMs >= snapshot.durationMs)
        return undefined;
    const opacity = clamp((snapshot.durationMs - snapshot.elapsedMs) / 140);
    const emphasis = finisher.beat.emphasis;
    const darkness = emphasis === 'intro'
        ? finisher.progress
        : emphasis === 'finish'
            ? 1 - clamp((snapshot.elapsedMs - finisher.startMs) / 180)
            : 1;
    const contacts = options.showContacts === false
        ? []
        : finisher.contacts.filter((contact) => {
            if (finisher.connectedOnly && !contact.connected)
                return false;
            const pose = sampleActorPose(snapshot.motion, contact.actorId, snapshot.elapsedMs);
            // 같은 그림을 쓰는 회수·종결로 밝기를 넘기지 않고 현재 접촉 원화만 드러낸다.
            return pose.stepIndex === contact.stepIndex && !!pose.step.contact;
        });
    return { contacts, opacity, baseOpacity: 1 - darkness * opacity * 0.82 };
}
/** 배경을 반전하지 않고 접촉 원화의 전신이 떠오르는 어두운 면을 유지한다. */
export function drawInkConceptBackdrop(ctx, frame) {
    const moment = sampleInkMoment(frame);
    if (!moment)
        return;
    const intro = frame.finisher.beat.emphasis === 'intro';
    const { left, top, right, bottom } = frame.bounds;
    ctx.save();
    ctx.fillStyle = ink;
    ctx.globalAlpha *=
        moment.opacity * (intro ? 0.56 + frame.finisher.progress * 0.4 : 0.97);
    ctx.fillRect(left, top, right - left, bottom - top);
    ctx.restore();
}
/** 작은 접촉핵만 남기며 몸과 피격 대상은 원래 그리기 단계에서 강조한다. */
export function drawInkConceptOverlay(ctx, frame) {
    const moment = sampleInkMoment(frame);
    if (!moment)
        return;
    const finalTimeMs = Math.max(...frame.finisher.contacts.map((contact) => contact.plannedTimeMs));
    const descent = sampleDemonDescent(frame.snapshot);
    for (const contact of moment.contacts) {
        const timeMs = frame.finisher.connectedOnly
            ? contact.timeMs
            : contact.plannedTimeMs;
        const ageMs = frame.snapshot.elapsedMs - timeMs;
        const final = contact.plannedTimeMs === finalTimeMs;
        // 끝타의 백열핵은 급강하의 파열과 같은 시계로 한 번만 그린다.
        if (final && descent)
            continue;
        const strength = decay(ageMs, 10, final ? 70 : 46);
        if (!strength)
            continue;
        ctx.save();
        ctx.translate(contact.x, contact.y);
        ctx.scale(frame.options.scale, frame.options.scale);
        ctx.globalAlpha *= strength * moment.opacity * 0.9;
        ctx.fillStyle = contactLight;
        ctx.beginPath();
        ctx.arc(0, 0, final ? 2.3 : 1.3, 0, Math.PI * 2);
        ctx.fill();
        for (let dot = 0; dot < 3; dot++) {
            const seed = contact.plannedTimeMs + dot * 7;
            const angle = grain(seed) * Math.PI * 2;
            const distance = 3 + grain(seed + 3) * (final ? 7 : 4);
            ctx.beginPath();
            ctx.arc(Math.cos(angle) * distance, Math.sin(angle) * distance * 0.7, 0.6 + grain(seed + 5) * 0.7, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }
}
/** 현재 접촉 원화의 실제 공격자만 전신 원색으로 남기고 접근·회수는 어둡게 한다. */
export function inkConceptActorOpacity(frame, actorId) {
    const moment = sampleInkMoment(frame);
    if (!moment)
        return 1;
    // 마지막 높은 도약은 하강 주체와 양손을 읽힌 뒤 암중 난타의 명암으로 돌아간다.
    const descent = actorId === 'body' ? sampleDemonDescent(frame.snapshot) : undefined;
    const contactOpacity = moment.contacts.some((contact) => contact.actorId === actorId)
        ? 1
        : moment.baseOpacity;
    return descent
        ? Math.max(contactOpacity, descent.bodyOpacity)
        : contactOpacity;
}
export function inkConceptBodyOpacity(frame) {
    return inkConceptActorOpacity(frame, 'body');
}
/** 대상은 실제 명중 뒤 현재 접촉 원화가 끝날 때까지만 함께 읽히게 한다. */
export function inkConceptTargetOpacity(frame) {
    const moment = sampleInkMoment(frame);
    if (!moment)
        return 1;
    const struck = moment.contacts.some((contact) => frame.snapshot.elapsedMs >=
        (frame.finisher.connectedOnly ? contact.timeMs : contact.plannedTimeMs));
    return struck ? 1 : moment.baseOpacity;
}
