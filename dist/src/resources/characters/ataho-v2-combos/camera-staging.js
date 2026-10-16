import { airborneCameraCue, cameraGuardStart, lastLandingCameraStep, preparationCameraCue, } from './camera-cues.js';
import { contactPoint } from './contact-geometry.js';
import { sampleActorPose } from './finisher-actors.js';
import { sampleComboMotion } from './player.js';
import { groundY, poseWithDrawing, startX } from './pose-drawing.js';
import { collectSandbagContacts, contactHitStopMs, } from './sandbag.js';
import { sampleCameraTracking, trackingCameraCue } from './camera-tracking.js';
import { finisherCameraStaging } from './finisher-presentation.js';
export const cameraStagingChoices = [
    {
        id: 'none',
        label: '기본 구도',
        summary: '추가 확대·축소 없이 기존 구도를 유지합니다.',
    },
    {
        id: 'finisher',
        label: '필살기 컷 구성',
        summary: '돌입·연타·결정타의 구도를 기술 구성에 맞춰 전환합니다.',
    },
    {
        id: 'preparation',
        label: '준비 집중',
        summary: '힘을 모으는 동안 가까워지고 공격이 시작되면 구도를 풉니다.',
    },
    {
        id: 'impact',
        label: '명중 스냅 확대',
        summary: '샌드백에 명중한 마지막 강타만 순간 확대합니다.',
    },
    {
        id: 'finish',
        label: '마무리 여운',
        summary: '마지막 강타나 낮은 착지의 구도를 유지하며 회수합니다.',
    },
    {
        id: 'airborne',
        label: '공중 와이드',
        summary: '도약 전에 넓어지고 전신과 바닥을 함께 담아 착지를 잇습니다.',
    },
    {
        id: 'tracking',
        label: '선행·지연 추적',
        summary: '이동 방향을 조금 먼저 보며 수평으로 뒤따르고 가드 전에 돌아옵니다.',
    },
];
function restingStaging() {
    return { zoom: 1, focusX: startX, focusY: groundY, active: false };
}
function smoothProgress(timeMs, fromMs, toMs) {
    if (toMs <= fromMs)
        return timeMs >= toMs ? 1 : 0;
    const progress = Math.max(0, Math.min(1, (timeMs - fromMs) / (toMs - fromMs)));
    return progress * progress * (3 - 2 * progress);
}
function staging(zoom, focus) {
    if (Math.abs(zoom - 1) < 0.000001)
        return restingStaging();
    return { zoom, ...focus, active: true };
}
function bodyFocus(motion, timeMs, options) {
    const pose = sampleComboMotion(motion, timeMs);
    return {
        focusX: startX + pose.x * options.scale,
        focusY: groundY + (pose.y - 38) * options.scale,
    };
}
function finalContact(motion, options) {
    return collectSandbagContacts(motion, options).at(-1);
}
function strongContact(contact) {
    // 지원 목록은 타격 유형으로 정하고 실제 명중 여부는 시점 계산 때 검사한다.
    return (contactHitStopMs({ ...contact, connected: true }, { finalContact: true }) >
        0);
}
function finalLanding(motion, contact) {
    const landing = lastLandingCameraStep(motion);
    // 착지 뒤 재진입하는 연계의 중간 구간을 전체 마무리로 오인하지 않는다.
    return landing && (!contact || landing.startMs > contact.plannedTimeMs)
        ? landing
        : undefined;
}
export function availableCameraModes(motion) {
    const modes = ['none'];
    if (motion.finisher)
        modes.push('finisher');
    const contact = finalContact(motion, { scale: 3 });
    if (preparationCameraCue(motion))
        modes.push('preparation');
    if (contact && strongContact(contact))
        modes.push('impact');
    if (finalLanding(motion, contact) || (contact && strongContact(contact)))
        modes.push('finish');
    if (airborneCameraCue(motion))
        modes.push('airborne');
    if (trackingCameraCue(motion))
        modes.push('tracking');
    return modes;
}
function contactFocus(snapshot, contact, timeMs, options) {
    if (contact.actorId.startsWith('ki:')) {
        return { focusX: (startX + contact.x) * 0.5, focusY: contact.y };
    }
    const pose = poseWithDrawing(sampleActorPose(snapshot.motion, contact.actorId, timeMs), options.enabledEffects);
    const point = options.showSandbag ? contact : contactPoint(pose, options);
    const body = {
        focusX: startX + pose.x * options.scale,
        focusY: groundY + (pose.y - 38) * options.scale,
    };
    return point
        ? {
            focusX: (body.focusX + point.x) * 0.5,
            focusY: (body.focusY + point.y) * 0.5,
        }
        : body;
}
function samplePreparation(snapshot, options) {
    const cue = preparationCameraCue(snapshot.motion);
    if (!cue ||
        snapshot.elapsedMs < cue.startMs ||
        snapshot.elapsedMs >= cue.endMs)
        return restingStaging();
    const amount = smoothProgress(snapshot.elapsedMs, cue.startMs, cue.peakMs) *
        (1 - smoothProgress(snapshot.elapsedMs, cue.peakMs, cue.endMs));
    return staging(1 + 0.08 * amount, bodyFocus(snapshot.motion, cue.peakMs, options));
}
function sampleImpact(snapshot, options) {
    if (!options.showSandbag)
        return restingStaging();
    const contact = finalContact(snapshot.motion, options);
    if (!contact || !contactHitStopMs(contact, { finalContact: true }))
        return restingStaging();
    const endMs = Math.min(contact.timeMs + 140, cameraGuardStart(snapshot.motion));
    if (snapshot.elapsedMs < contact.timeMs || snapshot.elapsedMs >= endMs)
        return restingStaging();
    const holdEndMs = Math.min(contact.timeMs + 40, endMs);
    const amount = 1 - smoothProgress(snapshot.elapsedMs, holdEndMs, endMs);
    return staging(1 + 0.06 * amount, contactFocus(snapshot, contact, contact.timeMs, options));
}
function sampleFinish(snapshot, options) {
    const contact = finalContact(snapshot.motion, options);
    const landing = finalLanding(snapshot.motion, contact);
    if (!landing &&
        (!contact ||
            !(options.showSandbag
                ? contactHitStopMs(contact, { finalContact: true })
                : strongContact(contact))))
        return restingStaging();
    const timeMs = landing
        ? landing.startMs
        : options.showSandbag
            ? contact.timeMs
            : contact.plannedTimeMs;
    const guardMs = cameraGuardStart(snapshot.motion);
    const durationMs = landing
        ? landing.endMs - landing.startMs
        : contact.durationMs;
    const holdEndMs = Math.min(timeMs + Math.max(100, Math.min(160, durationMs)), guardMs - 24);
    const endMs = Math.min(holdEndMs + 120, guardMs);
    if (snapshot.elapsedMs < timeMs ||
        snapshot.elapsedMs >= endMs ||
        holdEndMs <= timeMs)
        return restingStaging();
    const amount = smoothProgress(snapshot.elapsedMs, timeMs, Math.min(timeMs + 24, holdEndMs)) *
        (1 - smoothProgress(snapshot.elapsedMs, holdEndMs, endMs));
    const focus = landing
        ? {
            focusX: startX + landing.step.x * options.scale,
            focusY: groundY - 24 * options.scale,
        }
        : contactFocus(snapshot, contact, timeMs, options);
    return staging(1 + 0.04 * amount, focus);
}
function sampleAirborne(snapshot, options) {
    const cue = airborneCameraCue(snapshot.motion);
    if (!cue ||
        snapshot.elapsedMs < cue.startMs ||
        snapshot.elapsedMs >= cue.endMs)
        return restingStaging();
    const amount = smoothProgress(snapshot.elapsedMs, cue.startMs, cue.wideMs) *
        (1 - smoothProgress(snapshot.elapsedMs, cue.landingEndMs, cue.endMs));
    return staging(1 - 0.06 * amount, {
        focusX: startX + cue.focusRootX * options.scale,
        focusY: groundY,
    });
}
/** 동작 시각만 계산하며 정지·시점 탐색·방향과 박자 전환에 실행 이력을 남기지 않는다. */
export function sampleCameraStaging(snapshot, options) {
    if (options.mode === 'none' || snapshot.waiting)
        return restingStaging();
    if (options.mode === 'finisher')
        return finisherCameraStaging(snapshot, options);
    if (snapshot.elapsedMs >= cameraGuardStart(snapshot.motion))
        return restingStaging();
    switch (options.mode) {
        case 'preparation':
            return samplePreparation(snapshot, options);
        case 'impact':
            return sampleImpact(snapshot, options);
        case 'finish':
            return sampleFinish(snapshot, options);
        case 'airborne':
            return sampleAirborne(snapshot, options);
        case 'tracking':
            return {
                zoom: 1,
                focusX: startX,
                focusY: groundY,
                ...sampleCameraTracking(snapshot, options),
            };
        default:
            return restingStaging();
    }
}
