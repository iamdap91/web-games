import { cameraGuardStart, preparationCameraCue } from './camera-cues.js';
import { collectSandbagContacts, contactHitStopMs, } from './sandbag.js';
export const emphasisChoices = [
    {
        id: 'none',
        label: '기본 명암',
        summary: '원래 배경 명암과 캐릭터 색을 유지합니다.',
    },
    {
        id: 'background',
        label: '배경 명암 분리',
        summary: '준비 중 배경을 낮추고 마지막 강타의 실제 명중을 짧게 강조합니다.',
    },
    {
        id: 'palette',
        label: '제한 팔레트 컷',
        summary: '마지막 강타가 명중한 한순간만 세 명도로 자세를 강조합니다.',
    },
    {
        id: 'impact',
        label: '결정타 임팩트 컷',
        summary: '실제 끝타의 접촉 방향에 먹빛과 밝은 쐐기를 짧게 겹쳐 힘을 강조합니다.',
    },
];
const paletteDurationMs = 28;
const accentDurationMs = 36;
const impactHoldMs = 24;
const impactDurationMs = 120;
function restingEmphasis() {
    return { backgroundDim: 0, palette: false, phase: 'none' };
}
function smoothProgress(timeMs, startMs, endMs) {
    if (endMs <= startMs)
        return timeMs >= endMs ? 1 : 0;
    const progress = Math.max(0, Math.min(1, (timeMs - startMs) / (endMs - startMs)));
    return progress * progress * (3 - 2 * progress);
}
function strongContact(contact) {
    // 지원 목록은 연결 가능성과 무관하게 고정하고 실제 명중은 재생 시점에 검사한다.
    return (contactHitStopMs({ ...contact, connected: true }, { finalContact: true }) >
        0);
}
export function availableEmphasisModes(motion) {
    const modes = ['none'];
    const preparation = preparationCameraCue(motion);
    const contact = collectSandbagContacts(motion, { scale: 3 }).at(-1);
    const strong = !!contact && strongContact(contact);
    if (preparation || strong)
        modes.push('background');
    if (strong)
        modes.push('palette');
    if (strong || motion.finisher)
        modes.push('impact');
    return modes;
}
export function emphasisNeedsTarget(motion, mode) {
    return (mode === 'palette' ||
        mode === 'impact' ||
        (mode === 'background' && !preparationCameraCue(motion)));
}
function preparationDim(snapshot) {
    const cue = preparationCameraCue(snapshot.motion);
    if (!cue ||
        snapshot.elapsedMs < cue.startMs ||
        snapshot.elapsedMs >= cue.endMs)
        return 0;
    return (0.18 *
        smoothProgress(snapshot.elapsedMs, cue.startMs, cue.peakMs) *
        (1 - smoothProgress(snapshot.elapsedMs, cue.peakMs, cue.endMs)));
}
function impactContact(snapshot, options) {
    if (!options.showSandbag)
        return undefined;
    const final = collectContactCues(snapshot.motion).at(-1);
    const finalStartMs = final?.plannedTimeMs ?? -1;
    const finalEndMs = final ? final.plannedTimeMs + final.durationMs : -1;
    const durationMs = options.mode === 'palette'
        ? paletteDurationMs
        : options.mode === 'impact'
            ? accentDurationMs
            : impactDurationMs;
    // 실제 명중은 접촉 자세 안에서만 일어나므로 후보 구간 밖에서는 교차를 계산하지 않는다.
    if (finalStartMs < 0 ||
        snapshot.elapsedMs < finalStartMs ||
        snapshot.elapsedMs >= finalEndMs + durationMs)
        return undefined;
    const contact = collectSandbagContacts(snapshot.motion, options).at(-1);
    if (!contact ||
        !contactHitStopMs(contact, {
            finalContact: true,
            finisherClimax: options.mode === 'impact' && !!snapshot.motion.finisher,
        }))
        return undefined;
    return contact;
}
/** 절대 동작 시각만 사용해 정지·탐색·반복에서도 같은 명암을 돌려준다. */
export function sampleEmphasis(snapshot, options) {
    if (options.mode === 'none' || snapshot.waiting)
        return restingEmphasis();
    if (snapshot.elapsedMs >= cameraGuardStart(snapshot.motion))
        return restingEmphasis();
    const contact = impactContact(snapshot, options);
    if (contact) {
        const ageMs = snapshot.elapsedMs - contact.timeMs;
        if (options.mode === 'impact') {
            return ageMs >= 0 && ageMs < accentDurationMs
                ? {
                    backgroundDim: 0.9,
                    palette: true,
                    phase: 'impact',
                    accent: {
                        x: contact.x,
                        y: contact.y,
                        directionX: contact.directionX,
                        directionY: contact.directionY,
                        progress: ageMs / accentDurationMs,
                    },
                }
                : restingEmphasis();
        }
        if (options.mode === 'palette') {
            return ageMs >= 0 && ageMs < paletteDurationMs
                ? { backgroundDim: 0.75, palette: true, phase: 'impact' }
                : restingEmphasis();
        }
        if (ageMs >= 0 && ageMs < impactDurationMs) {
            const dim = 0.32 * (1 - smoothProgress(ageMs, impactHoldMs, impactDurationMs));
            return {
                backgroundDim: Math.max(dim, preparationDim(snapshot)),
                palette: false,
                phase: 'impact',
            };
        }
    }
    if (options.mode !== 'background')
        return restingEmphasis();
    const dim = preparationDim(snapshot);
    return dim > 0
        ? { backgroundDim: dim, palette: false, phase: 'preparation' }
        : restingEmphasis();
}
import { collectContactCues } from './finisher-actors.js';
/** 접촉점 바깥에만 쐐기를 그려 몸과 공격 범위의 읽힘을 지킨다. */
export function drawImpactAccent(ctx, sample, options) {
    const accent = sample.accent;
    if (!accent)
        return;
    const size = options.scale;
    ctx.save();
    ctx.translate(accent.x, accent.y);
    ctx.rotate(Math.atan2(accent.directionY, accent.directionX));
    ctx.globalAlpha *= 1 - accent.progress * 0.45;
    for (let index = 0; index < 7; index++) {
        const angle = -1.05 + index * 0.35;
        const inner = (4 + (index % 2) * 2) * size;
        const outer = (17 + (index % 3) * 5 + accent.progress * 5) * size;
        ctx.beginPath();
        ctx.moveTo(Math.cos(angle - 0.055) * inner, Math.sin(angle - 0.055) * inner);
        ctx.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
        ctx.lineTo(Math.cos(angle + 0.055) * inner, Math.sin(angle + 0.055) * inner);
        ctx.closePath();
        ctx.fillStyle = index % 2 ? '#161213' : '#fff1cb';
        ctx.fill();
    }
    ctx.restore();
}
