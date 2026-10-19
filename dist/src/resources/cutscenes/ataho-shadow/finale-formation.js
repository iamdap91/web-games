import { ease, unit } from '../shared/playback.js';
import { finaleAttacks, finaleGuard, finalePose, } from './finale-attacks.js';
import { finaleDarkenMs, finaleVeilMs, finaleRevealLocalMs, finaleReadyLocalMs, finaleCrossLocalMs, finalePassMs, finaleContactLocalMs, finaleExitLocalMs, finaleVanishLocalMs, finaleVanishMs, finaleQuietLocalMs, } from './finale-timing.js';
export const finaleTarget = { x: 480, baseY: 470, height: 150 };
export const finaleContactPoint = { x: 480, y: 385 };
// 전후 깊이를 지닌 지상 포위망이다. 원본 방향·크기를 유지하고 역할과 출발 순서를 분리한다.
const members = [
    { id: 'shadow-a', attack: 'kick-e', offset: { x: -300, y: 0 }, delayMs: 20 },
    { id: 'shadow-b', attack: 'kick-w', offset: { x: 300, y: 0 }, delayMs: 80 },
    { id: 'body', attack: 'punch-se', offset: { x: -190, y: -70 }, delayMs: 60 },
    {
        id: 'shadow-c',
        attack: 'punch-sw',
        offset: { x: 190, y: -70 },
        delayMs: 0,
    },
    {
        id: 'shadow-d',
        attack: 'punch-se',
        offset: { x: -85, y: -95 },
        delayMs: 120,
    },
    {
        id: 'shadow-e',
        attack: 'uppercut-e',
        offset: { x: -190, y: 65 },
        delayMs: 100,
    },
    {
        id: 'shadow-f',
        attack: 'uppercut-w',
        offset: { x: 190, y: 65 },
        delayMs: 40,
    },
];
function blend(from, to, progress) {
    return from + (to - from) * progress;
}
function strikeOffset(member) {
    const profile = finaleAttacks[member.attack];
    const anchor = profile.anchors[profile.contactIndex];
    return {
        x: (profile.contact.x - anchor.x) * profile.scale,
        y: (profile.contact.y - anchor.y) * profile.scale,
    };
}
function hitTime(member) {
    return finaleCrossLocalMs + member.delayMs + finalePassMs / 2;
}
function attackFrame(member, localMs) {
    const profile = finaleAttacks[member.attack];
    const ageMs = localMs - hitTime(member);
    if (ageMs >= -30 && ageMs < 45)
        return profile.contactIndex;
    if (ageMs >= 45)
        return Math.min(profile.frames.length - 1, profile.contactIndex + 1 + Math.floor((ageMs - 45) / 55));
    const preparation = unit((localMs - finaleReadyLocalMs - member.delayMs / 2) /
        (hitTime(member) - 30 - finaleReadyLocalMs - member.delayMs / 2));
    return Math.min(profile.contactIndex - 1, Math.floor(preparation * profile.contactIndex));
}
function sampleActor(member, localMs) {
    const offset = strikeOffset(member);
    const through = { x: finaleTarget.x, y: finaleTarget.baseY + offset.y };
    const from = {
        x: through.x + member.offset.x,
        y: through.y + member.offset.y,
    };
    const to = { x: through.x - member.offset.x, y: through.y - member.offset.y };
    const travel = unit((localMs - finaleCrossLocalMs - member.delayMs) / finalePassMs);
    // 중앙 시각에 반드시 적을 지나고, 진입·회수에서만 속도를 줄인다.
    const progress = travel * travel * (3 - 2 * travel);
    const tip = {
        x: blend(from.x, to.x, progress),
        y: blend(from.y, to.y, progress),
    };
    const initial = localMs < finaleDarkenMs + 18;
    const pose = initial
        ? finaleGuard
        : finalePose(member.attack, attackFrame(member, localMs));
    const reveal = ease((localMs - finaleRevealLocalMs) / 65);
    const vanish = 1 - ease((localMs - finaleVanishLocalMs) / finaleVanishMs);
    return {
        id: member.id,
        attack: member.attack,
        ...pose,
        x: initial ? 375 : tip.x - offset.x,
        feetY: initial ? finaleTarget.baseY : tip.y - offset.y,
        rotation: 0,
        opacity: initial ? (member.id === 'body' ? 1 : 0) : reveal * vanish,
        colorMix: initial && member.id === 'body' ? 1 - ease(localMs / finaleDarkenMs) : 0,
        trail: {
            from,
            through,
            to,
            tip,
            progress,
            ageMs: localMs - finaleCrossLocalMs - member.delayMs,
        },
    };
}
function formationPhase(localMs) {
    if (localMs < finaleDarkenMs)
        return 'darken';
    if (localMs < finaleRevealLocalMs)
        return 'veil';
    if (localMs < finaleReadyLocalMs)
        return 'encircle';
    if (localMs < finaleCrossLocalMs)
        return 'charge';
    if (localMs < finaleExitLocalMs)
        return 'crossing';
    if (localMs < finaleVanishLocalMs)
        return 'exit';
    if (localMs < finaleQuietLocalMs)
        return 'vanish';
    return 'quiet';
}
/** 손발이 적 중심을 지나는 시각과 바닥 이동을 같은 절대시각에서 계산한다. */
export function sampleFinaleFormation(localMs, options) {
    const veilAgeMs = localMs - finaleDarkenMs;
    const concealment = Math.min(ease(veilAgeMs / 18), 1 - ease((veilAgeMs - (finaleVeilMs - 22)) / 22));
    const ageMs = localMs - finaleContactLocalMs;
    const emphasis = ease((localMs - finaleCrossLocalMs) / 200) * (1 - ease((ageMs - 45) / 180));
    return {
        actors: members.map((member) => sampleActor(member, localMs)),
        camera: {
            zoom: options.reducedMotion ? 0.92 : blend(0.9, 0.96, emphasis),
            focusX: 480,
            focusY: 350,
        },
        target: finaleTarget,
        concealment,
        contact: {
            ...finaleContactPoint,
            active: ageMs >= 0,
            held: false,
            ageMs,
            effectAgeMs: Math.max(0, ageMs),
        },
        strikes: members.map((member) => ({
            x: finaleTarget.x,
            y: finaleTarget.baseY + strikeOffset(member).y,
            direction: { x: -member.offset.x, y: -member.offset.y },
            ageMs: localMs - hitTime(member),
            active: localMs >= hitTime(member),
        })),
        crossing: {
            active: ageMs >= 0,
            ageMs,
            effectAgeMs: Math.max(0, ageMs),
        },
        phase: formationPhase(localMs),
    };
}
