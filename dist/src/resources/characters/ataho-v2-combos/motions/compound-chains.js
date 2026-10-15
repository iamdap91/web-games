import { guard, recover, oneTwo, uppercut } from './attack-phrases.js';
import { flyingKickMotion } from './flying-kick.js';
export const boxingChain = {
    id: 'one-two-uppercut',
    title: '원투 → 어퍼컷 · 3타',
    summary: '잽·스트레이트로 열고, 가드로 쉬지 않고 몸을 낮춰 어퍼컷으로 끝낸다.',
    priority: 'selected',
    review: '두 번의 짧은 펀치 뒤 낮은 장전과 긴 어퍼컷 멈춤을 붙였다. 중간 가드와 돌진을 빼고 같은 발 위치에서 연속 타격한다. 원투에서 낮은 어퍼컷 준비로 바뀌는 몸통 연결을 효과 없이 비교한다.',
    steps: [guard(0), ...oneTwo(0), ...uppercut(0), ...recover(0)],
};
export const barrageChain = {
    id: 'punch-barrage',
    title: '연속 원투 → 어퍼컷 · 5타',
    summary: '원투를 두 차례 빠르게 몰아친 뒤 한 박자 낮춰 모으고 어퍼컷을 올린다.',
    priority: 'review',
    review: '첫 원투의 힘 풀기에서 두 번째 원투의 앞발 디딤으로 이어 다섯 타격을 만든다. 뒤 원투는 더 촘촘하게, 마지막 어퍼컷 장전은 길게 두었다. 같은 주먹 프레임의 반복이라 앞 네 타격의 실루엣은 같으며, 연타와 마무리의 박자 차이를 비교하는 시안이다.',
    steps: [
        guard(0),
        ...oneTwo(0),
        ...oneTwo(0, 3).map((step) => ({
            ...step,
            durationMs: Math.max(25, step.durationMs - 10),
        })),
        ...uppercut(0, 5).map((step, index) => ({
            ...step,
            durationMs: index === 0 ? 120 : step.durationMs,
        })),
        ...recover(0),
    ],
};
export const leapChain = {
    id: 'one-two-leap-kick',
    title: '원투 → 도약 날아차기 · 3타',
    summary: '지상 원투 뒤 무릎을 굽혀 뛰고, 앞으로 날아차기를 이어 착지한다.',
    priority: 'selected',
    review: '원투의 손 회수에서 기존 도약 준비로 연결한다. 준비 중에는 발과 위치를 유지하며 도약 뒤에만 전진한다. 공중 킥은 기존 골반 기준 정렬과 궤적을 유지한다. 손 공격에서 도약 자세로 넘어가는 짧은 전환과 원본의 얼굴 변화는 남는다.',
    steps: [
        guard(0),
        ...oneTwo(0),
        ...flyingKickMotion.steps.slice(1, 17).map((step) => ({
            ...step,
            durationMs: Math.max(25, Math.round((step.durationMs * 0.85) / 5) * 5),
            phase: step.contact ? `3타 · ${step.phase}` : `도약 · ${step.phase}`,
        })),
        ...recover(74),
    ],
};
