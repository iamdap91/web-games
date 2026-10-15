import { guard, recover, oneTwo, uppercut } from './attack-phrases.js';
import { sharpElbowSteps } from './elbow-timing.js';
import { flyingKickMotion } from './flying-kick.js';
// GIF로 확인한 연결을 유지한다. 다음 공격 전에 어퍼컷의 마지막 회수만 뺀다.
const linkedUppercutSteps = uppercut(0).filter((step) => step.frame !== 6);
const linkedElbowSteps = sharpElbowSteps
    .filter((step) => step.motion === 'ataho-firewood-elbow-chop-south-east-south-east' &&
    [3, 4, 5, 6].includes(step.frame))
    .map((step) => ({
    ...step,
    x: 0,
    y: 0,
    phase: step.contact ? '4타 · 빠른 내려치기' : `내려치기 · ${step.phase}`,
}));
function linkedLeapSteps(firstHit) {
    return flyingKickMotion.steps.slice(1, 17).map((step) => ({
        ...step,
        durationMs: Math.max(25, Math.round((step.durationMs * 0.85) / 5) * 5),
        phase: step.contact ? `${firstHit}타 · 공중 타격` : `도약 · ${step.phase}`,
    }));
}
export const multiStageChains = [
    {
        id: 'three-ground',
        title: '3종 지상 연계 · 4타',
        summary: '원투 → 어퍼컷 → 빠른 내려치기. 위로 올린 뒤 아래로 마무리한다.',
        priority: 'selected',
        review: '사용자가 GIF로 검토한 뒤 선택한 3종 지상 연계다. 같은 발 위치에서 원투와 어퍼컷을 잇고 0.42초 내려치기의 공격 구간으로 끝낸다. 원본 얼굴·자세의 전환과 작은 팔꿈치 실루엣은 남는다.',
        steps: [
            guard(0),
            ...oneTwo(0),
            ...linkedUppercutSteps,
            ...linkedElbowSteps,
            ...recover(0),
        ],
    },
    {
        id: 'three-air',
        title: '3종 공중 연계 · 4타',
        summary: '원투 → 어퍼컷 → 도약 날아차기. 지상 타격 뒤 전진 킥으로 착지한다.',
        priority: 'selected',
        review: '사용자가 GIF로 검토한 뒤 선택한 3종 공중 연계다. 원투와 어퍼컷 동안 발 위치를 유지하고 도약 뒤에만 전진한다. 공중 골반 기준 정렬과 착지 궤적을 그대로 사용하며 원본 얼굴과 발 위치의 전환은 남는다.',
        steps: [
            guard(0),
            ...oneTwo(0),
            ...linkedUppercutSteps,
            ...linkedLeapSteps(4),
            ...recover(74),
        ],
    },
    {
        id: 'four-chain',
        title: '4종 연속 공격 · 5타',
        summary: '원투 → 어퍼컷 → 빠른 내려치기 → 도약 날아차기. 네 동작을 이어 공중 킥으로 끝낸다.',
        priority: 'selected',
        review: '사용자가 GIF로 검토한 뒤 선택한 4종 연계다. 같은 발 위치의 지상 네 타격 뒤 기존 도약과 착지를 잇는다. 작은 팔꿈치 실루엣과 원본 얼굴·발 위치의 전환은 남으며 내려친 뒤 도약을 준비할 때 호흡이 한 번 나뉜다.',
        steps: [
            guard(0),
            ...oneTwo(0),
            ...linkedUppercutSteps,
            ...linkedElbowSteps,
            ...linkedLeapSteps(5),
            ...recover(74),
        ],
    },
];
