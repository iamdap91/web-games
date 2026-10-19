import { unit } from '../shared/playback.js';
import { placement, punchTouchesFace } from './contact.js';
export const approachDistance = 273;
const impactDurationMs = 90;
const impactSlowMotion = { durationMs: 120, timeScale: 0.35 };
export const timing = {
    loadMs: 110,
    openMs: 310,
    chamberMs: 410,
    advanceMs: 730,
    strikeMs: 750,
    contactMs: 820,
    closeUpMs: 1040,
    releaseMs: 1680,
    settleMs: 2110,
    endMs: 2900,
};
export const cuts = [
    {
        id: 'face-off',
        label: '대치',
        startMs: 0,
        endMs: timing.loadMs,
        previewMs: 50,
    },
    {
        id: 'load',
        label: '몸통 장전',
        startMs: timing.loadMs,
        endMs: timing.advanceMs,
        previewMs: 440,
    },
    {
        id: 'contact',
        label: '진입·접촉',
        startMs: timing.advanceMs,
        endMs: timing.closeUpMs,
        previewMs: 150,
    },
    {
        id: 'ink',
        label: '흑백 결정타',
        startMs: timing.closeUpMs,
        endMs: timing.releaseMs,
        previewMs: 270,
    },
    {
        id: 'release',
        label: '관통·방출',
        startMs: timing.releaseMs,
        endMs: timing.settleMs,
        previewMs: 90,
    },
    {
        id: 'aftermath',
        label: '잔여와 정착',
        startMs: timing.settleMs,
        endMs: timing.endMs,
        previewMs: 300,
    },
];
/** 장전은 제자리에서 한 번만 하고, 뻗은 정권을 유지하며 한 번에 파고든다. */
function approachOffset(timeMs) {
    const advance = unit((timeMs - timing.advanceMs) / (timing.contactMs - timing.advanceMs));
    return -approachDistance * (1 - advance * advance);
}
/** 실제 접촉 뒤 첫 120ms만 늦추는 공통 동작 시간이다. 명중 시각은 바꾸지 않는다. */
function contactElapsedAt(timeMs) {
    const age = Math.max(0, timeMs - timing.contactMs);
    return (Math.min(age, impactSlowMotion.durationMs) * impactSlowMotion.timeScale +
        Math.max(0, age - impactSlowMotion.durationMs));
}
/** 정권을 뻗는 시각과 닿는 시각을 나누고, 명중·첫 튕김은 실제 도착에서 함께 시작한다. */
export function samplePunch(timeMs) {
    const contactElapsedMs = contactElapsedAt(timeMs);
    // 짧은 슬로 뒤에도 같은 방출 시각에 밀림의 끝점에 도착하게 정규화한다.
    const pressure = unit(contactElapsedMs / contactElapsedAt(timing.releaseMs));
    const push = 66 * pressure ** 1.7;
    const flight = unit((timeMs - timing.releaseMs) / 320);
    const follow = unit((timeMs - timing.releaseMs) / 170);
    let pose = 'guard';
    if (timeMs >= timing.loadMs)
        pose = 'coil';
    if (timeMs >= 220)
        pose = 'load';
    if (timeMs >= timing.openMs)
        pose = 'open';
    if (timeMs >= timing.chamberMs)
        pose = 'chamber';
    if (timeMs >= timing.strikeMs)
        pose = 'strike';
    if (timeMs >= timing.releaseMs + 210)
        pose = 'recover';
    if (timeMs >= timing.releaseMs + 560)
        pose = 'guard';
    const impactOffset = approachOffset(Math.min(timeMs, timing.contactMs));
    const reached = timeMs >= timing.contactMs &&
        punchTouchesFace({ x: placement.actorFeet.x + impactOffset, y: placement.actorFeet.y }, placement.targetOrigin);
    const released = timeMs >= timing.releaseMs;
    const contactTimeScale = reached && timeMs < timing.contactMs + impactSlowMotion.durationMs
        ? impactSlowMotion.timeScale
        : 1;
    return {
        pose,
        actorX: reached
            ? push + 48 * (1 - (1 - follow) ** 3)
            : approachOffset(timeMs),
        actorY: 0,
        // 접근 중에 정권이 먼저 뻗어도, 표적은 주먹 끝이 얼굴에 닿은 뒤에만 반응한다.
        targetX: reached ? push + pressure * 90 + flight * 1100 : 0,
        targetY: reached ? -pressure * 16 - flight * 210 + flight * flight * 35 : 0,
        pressure: reached ? pressure : 0,
        flight: reached ? (pressure * 90 + flight * 1100) / 1190 : 0,
        hitCount: reached ? 1 : 0,
        impactProgress: reached && contactElapsedMs < impactDurationMs
            ? contactElapsedMs / impactDurationMs
            : null,
        contactElapsedMs,
        contactTimeScale,
        ink: timeMs >= timing.loadMs && !released,
    };
}
