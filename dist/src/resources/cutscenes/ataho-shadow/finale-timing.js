import { rushContacts, rushDurationMs, sampleRush } from './choreography.js';
import { rushPreludeDurationMs, rushSourceCutoverMs, samplePresetRush, } from './preset-rush.js';
export const finaleSourceStartMs = rushPreludeDurationMs;
const finalContact = rushContacts.filter((contact) => contact.connected).at(-1);
if (!finalContact)
    throw new Error('암중호격의 마지막 접촉이 없습니다.');
export const finaleSourceContactMs = finalContact.timeMs;
export const finaleDarkenMs = 90;
export const finaleVeilMs = 70;
export const finaleRevealLocalMs = finaleDarkenMs + finaleVeilMs;
export const finaleReadyLocalMs = finaleRevealLocalMs + 180;
export const finaleCrossLocalMs = finaleReadyLocalMs + 200;
export const finalePassMs = 400;
export const finaleLastDelayMs = 120;
export const finaleContactLocalMs = finaleCrossLocalMs + finaleLastDelayMs + finalePassMs / 2;
export const finaleExitLocalMs = finaleCrossLocalMs + finaleLastDelayMs + finalePassMs;
export const finaleVanishMs = 70;
export const finaleVanishLocalMs = finaleExitLocalMs + 90;
export const finaleQuietLocalMs = finaleVanishLocalMs + finaleVanishMs;
export const finaleQuietMs = 230;
export const finaleEndLocalMs = finaleQuietLocalMs + finaleQuietMs;
const originalApproachMs = finaleSourceContactMs - rushSourceCutoverMs;
export const presentedRushDurationMs = finaleSourceStartMs + finaleEndLocalMs;
export const presentedStillMs = finaleSourceStartMs + finaleQuietLocalMs;
/** 협공 마지막 접촉에서 원본21타를 한 번만 통과하고, 소멸 뒤 원본 회수로 잇는다. */
export function originalRushTime(timeMs) {
    const localMs = timeMs - finaleSourceStartMs;
    if (localMs <= 0)
        return samplePresetRush(timeMs).snapshot.elapsedMs;
    if (localMs < finaleContactLocalMs)
        return (rushSourceCutoverMs +
            originalApproachMs * (localMs / finaleContactLocalMs));
    if (localMs < finaleVanishLocalMs)
        return finaleSourceContactMs;
    const recovery = Math.min(1, (localMs - finaleVanishLocalMs) / (finaleEndLocalMs - finaleVanishLocalMs));
    return (finaleSourceContactMs + (rushDurationMs - finaleSourceContactMs) * recovery);
}
export function samplePresentedRush(timeMs) {
    return sampleRush(originalRushTime(timeMs));
}
export function finaleShot(timeMs) {
    const localMs = timeMs - finaleSourceStartMs;
    if (localMs < 0)
        return '암중 협공';
    if (localMs < finaleDarkenMs)
        return '지상 암전 · 정체를 숨기는 준비';
    if (localMs < finaleRevealLocalMs)
        return '먹빛 가림 · 추적 끊기';
    if (localMs < finaleReadyLocalMs)
        return '먹빛 아타호7기 · 지상 포위';
    if (localMs < finaleCrossLocalMs)
        return '정권·킥·어퍼컷 · 교차 준비';
    if (localMs < finaleExitLocalMs)
        return '전원 교차 강습 · 적을 지나 반대편으로';
    if (localMs < finaleVanishLocalMs)
        return '포위 역전 · 공격 회수';
    if (localMs < finaleQuietLocalMs)
        return '실루엣7기 · 동시 소멸';
    return '빈 공간의 정적 · 등 뒤 공개를 기다리는 여운';
}
