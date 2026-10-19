import { backflipMotion } from './backflip.js';
import { dodgeMotion } from './dodge.js';
import { withPoseEffects } from './pose-effects.js';
const backflip = {
    id: 'backflip',
    title: '뒤공중돌기',
    summary: '뒤로 한 바퀴 돌아 두 발로 착지하고 그 자리에서 가드로 돌아온다.',
    priority: backflipMotion.priority,
    review: '기존 공중회피 후 재진입의 첫 가드부터 뒤공중돌기 1~9번, 점프 7~8번의 착지·일어서기까지 같은 그림·박자·이동을 쓴다. 이후 달리기와 펀치는 제외하고 착지 위치 x−44에서 기존 가드 그림을 100ms 유지한다. 회전 뒤 착지 그림은 같은 점프 7번에만 적용한다. 회전 원본의 얼굴·몸 방향과 착지에서 가드로 바뀌는 발 간격의 한계는 남는다.',
    steps: [
        ...backflipMotion.steps
            .slice(0, 12)
            .map((step) => step.motion === 'jumping-1-south-east' && step.frame === 8
            ? { ...step, phase: '착지 뒤 일어서기' }
            : step),
        {
            ...backflipMotion.steps[0],
            x: -44,
            y: 0,
            phase: '뒤공중돌기 뒤 가드 복귀',
        },
    ],
    effects: [
        ...(withPoseEffects(backflipMotion).effects?.filter((effect) => effect.id === 'backflip-landing-drawing') ?? []),
        {
            id: 'backflip-short-afterimage',
            label: '회전 구간 짧은 잔상',
            summary: '공중 회전의 두 자세만 남기고 착지 전에 지워 발 디딤을 선명하게 둡니다.',
            kind: 'afterimage',
            sources: [{ motion: 'backflip-south-east', frames: [5, 6, 7] }],
            intervalMs: 40,
            count: 2,
            opacity: 0.12,
        },
    ],
};
const stepBack = {
    id: 'step-back',
    title: '한 걸음 후퇴',
    summary: '상대를 보며 한 걸음 물러나 발을 디디고 가드를 유지한다.',
    priority: dodgeMotion.priority,
    review: '기존 취권 회피 반격의 첫 가드 110ms와 역순 보행 3→2→1→0번, 후퇴 디딤 65ms를 그대로 쓴다. x46에서 x22로 물러난 뒤 어퍼컷을 제외하고 기존 종료 가드를 같은 x22에서 140ms 유지한다. 새로운 취권 뒤젖힘이나 반격은 없으며, 역순 보행이 후퇴로 읽히는지 비교하는 이동 구간이다.',
    steps: [
        ...dodgeMotion.steps.slice(0, 6),
        {
            ...dodgeMotion.steps.at(-1),
            x: 22,
            y: 0,
            phase: '후퇴 뒤 가드 유지',
        },
    ],
};
export const movementPrimitives = [backflip, stepBack];
