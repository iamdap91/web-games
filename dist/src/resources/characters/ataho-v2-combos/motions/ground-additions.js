import { guard, oneTwo, recover, uppercut } from './attack-phrases.js';
import { dodgeMotion } from './dodge.js';
const jabDurations = [55, 25, 45, 35];
const chargedUppercutDurations = [180, 100, 35, 90, 40, 45, 60];
function jab(firstHit) {
    const attack = oneTwo(0, firstHit)
        .slice(0, 4)
        .map((step, index) => ({
        ...step,
        durationMs: jabDurations[index],
        phase: step.contact
            ? `${firstHit}타 · 잽 접촉`
            : step.phase.replace(/^원투 · /, '잽 · '),
    }));
    // 첫 주먹을 거둔 같은 계열의 준비 자세로 돌아와 다음 잽을 장전한다.
    return [...attack, { ...attack[0], durationMs: 45, phase: '잽 회수 완료' }];
}
export const groundAdditions = [
    {
        id: 'quick-jab',
        title: '빠른 잽 · 1타',
        summary: '접근 없이 첫 주먹만 짧게 치고 같은 자리에서 가드로 돌아온다.',
        priority: 'review',
        review: '기존 원투 0~3번과 0번 회수만 사용한 단발이다. 몸을 고정하고 두 번째 펀치와 긴 회수를 제외했다. 새 타격 실루엣이 생기는 것은 아니며, 짧은 기본 공격의 박자가 읽히는지 효과 없이 검토한다.',
        steps: [
            guard(0, 60),
            ...jab(1),
            { ...guard(0, 100), phase: '잽 뒤 가드 복귀' },
        ],
    },
    {
        id: 'double-jab',
        title: '더블잽 · 2타',
        summary: '첫 주먹을 거둔 뒤 같은 손으로 한 번 더 짧게 친다.',
        priority: 'review',
        review: '같은 원투 첫 공격 0~3번을 두 번 사용하고 각 잽 뒤 0번으로 주먹을 회수한다. 두 타격 동안 위치를 고정한다. 서로 다른 손을 잇는 원투와 박자는 다르지만 그림을 반복하므로 두 번째 잽의 독립적인 타격감은 실제 재생으로 판단한다.',
        steps: [
            guard(0, 70),
            ...jab(1),
            ...jab(2),
            { ...guard(0, 120), phase: '더블잽 뒤 가드 복귀' },
        ],
    },
    {
        id: 'retreat-one-two',
        title: '한 걸음 후퇴 → 원투 · 2타',
        summary: '상대를 보며 물러나고 발을 멈춘 뒤 잽과 스트레이트로 반격한다.',
        priority: 'review',
        review: '기존 회피 반격의 역순 보행 3→2→1→0번과 접지 자세를 그대로 사용한다. x46에서 x22로 물러난 뒤 같은 자리에서 원투를 치고 회수한다. 큰 취권 뒤젖힘이나 새로운 정권 그림이 아니라 후퇴와 두 타의 역할 변화를 비교하는 동작이다.',
        steps: [
            { ...guard(46, 80), phase: '근접 대치' },
            ...dodgeMotion.steps.slice(1, 6),
            ...oneTwo(22),
            ...recover(22),
        ],
    },
    {
        id: 'charged-uppercut',
        title: '모아치는 어퍼컷 · 1타',
        summary: '낮은 자세로 힘을 모은 뒤 짧게 상승시키고 주먹과 몸통을 회수한다.',
        priority: 'review',
        review: '남동쪽 어퍼컷 0~6번을 순서대로 사용한다. 0번 180ms와 1번 100ms로 준비를 읽히게 하고 2번 상승은 35ms, 3번 타격은 90ms로 둔다. 공격과 회수 동안 발 위치를 고정한다. 새로운 강공격 자세가 생기지는 않으며, 준비를 늘린 박자가 모아치는 공격으로 읽히는지 검토한다.',
        steps: [
            guard(0, 70),
            ...uppercut(0, 1).map((step) => ({
                ...step,
                durationMs: chargedUppercutDurations[step.frame],
                phase: step.frame === 0
                    ? '낮은 자세로 힘 모으기'
                    : step.frame === 1
                        ? '앞발에 체중 싣기'
                        : step.contact
                            ? '1타 · 모아친 어퍼컷 접촉'
                            : step.phase,
            })),
            {
                motion: 'ataho-one-two-punch-south-east-south-east',
                frame: 16,
                durationMs: 65,
                x: 0,
                y: 0,
                anchor: 'feet',
                phase: '어퍼컷 뒤 가드 올리기',
            },
            { ...guard(0, 120), phase: '모아친 뒤 가드 복귀' },
        ],
    },
];
