import { guard, recover } from './attack-phrases.js';
import { flyingKickMotion } from './flying-kick.js';
import { groundKickSteps, kickAdditions, landingOneTwo, } from './kick-additions.js';
import { withLegacyEffects } from './legacy-effects.js';
import { withPoseEffects } from './pose-effects.js';
function attackPhases(steps, finish) {
    let hit = 0;
    return steps.map((step, index) => ({
        ...step,
        phase: step.contact
            ? `${++hit}타 · ${step.phase.replace(/^\d+타 · /, '')}`
            : index === steps.length - 1
                ? finish
                : step.phase,
    }));
}
function landingSteps(steps) {
    const start = steps.findIndex((step) => step.motion === 'jumping-1-south-east' &&
        step.frame === 7 &&
        (step.y ?? 0) === 0);
    if (start < 0)
        throw new Error('착지 원투의 낮은 착지 자세가 없습니다.');
    return attackPhases(steps.slice(start), '착지 원투 뒤 가드 복귀');
}
function groundKickTimingSteps(steps) {
    const start = steps.findIndex((step) => step.motion === 'high-kick-south-east');
    if (start < 0)
        throw new Error('지상 하이킥의 준비 자세가 없습니다.');
    // 앞선 잽은 떼고 같은 시작 가드와 킥부터 회수까지의 박자만 남긴다.
    return attackPhases([steps[0], ...steps.slice(start)], '지상 하이킥 뒤 가드 복귀');
}
const landingRecovery = {
    id: 'landing-one-two-standalone',
    title: '착지 원투 · 2타',
    summary: '낮은 착지 자세에서 일어나 발을 고정하고 원투를 잇는다.',
    priority: landingOneTwo.priority,
    review: '기존 날아차기 → 착지 원투에서 첫 지상 점프 7번부터 종료 가드까지 분리했다. 낮은 착지 100ms·일어서기 70ms·연결 1번과 0번 각45ms 뒤 기존 원투와 회수를 유지하며 두 접촉을 1·2타로 다시 표시한다. x74·높이0과 기존 발 기준을 끝까지 보존한다. 선행 비행이나 낙하는 없고 낮은 착지 자세에서 시작하므로 실제 낙하 충격을 추가하지 않는다. 일어서기와 원투 사이의 얼굴·발 간격 전환은 남는다.',
    steps: landingSteps(landingOneTwo.steps),
    presentations: (kickAdditions.find((motion) => motion.id === landingOneTwo.id)
        ?.presentations ?? []).map((presentation) => ({
        id: 'landing-one-two-recovery-rhythm',
        label: '착지 유지·원투 마무리',
        summary: '낮은 착지와 일어서기를 마친 뒤 원투의 마지막 스트레이트를 유지합니다.',
        review: '기존 연속 하강·착지 뒤 원투 박자의 지상 착지 이후 구간만 쓴다. 낮은 착지 110ms·일어서기 65ms·두 연결 자세 각45ms, 원투 첫 준비 65ms·마지막 접촉 85ms와 기존 회수를 보존한다. 앞선 비행·킥·접촉은 없고 x74·높이0과 두 타격을 유지한다.',
        steps: landingSteps(presentation.steps),
    })),
    effects: withPoseEffects(flyingKickMotion).effects?.filter((effect) => effect.id === 'landing-compression-drawing'),
};
const groundHighKick = {
    id: 'ground-high-kick',
    title: '지상 하이킥 · 1타',
    summary: '한 발로 버티며 높은 발차기를 하고 다리를 거두어 가드로 돌아온다.',
    priority: 'review',
    review: '기존 잽 → 지상 킥에서 잽을 제외하고 같은 시작 가드·하이킥 0~6번·회수를 쓴다. 프레임별 지지발 앵커와 x0·높이0, 접촉 80ms를 유지하며 킥을 1타로 표시한다. 같은 하이킥 원본의 발끝 선과 짧은 잔상은 지상 앵커로 다시 투영한다. 원본의 다리 뻗음·몸통 기울임과 가드 전환의 발 간격 한계는 남는다.',
    missingPose: '두 발 가드에서 한 발 지지로 옮기는 디딤과 킥 뒤 같은 발 간격으로 돌아오는 연결 자세는 원본에 충분하지 않다.',
    steps: attackPhases([guard(0), ...groundKickSteps, ...recover(0)], '지상 하이킥 뒤 가드 복귀'),
    presentations: (kickAdditions.find((motion) => motion.id === 'jab-ground-kick')
        ?.presentations ?? []).map((presentation) => ({
        id: 'ground-high-kick-accent',
        label: '킥 장전·접촉 유지',
        summary: '한 발 지지로 장전한 뒤 높은 킥을 읽히고 발을 내린 다음 가드로 돌아옵니다.',
        review: '기존 잽 회수·지상 킥 유지 박자에서 잽을 제외했다. 시작 가드 뒤 킥 장전 55+50ms·발 올리기와 내밀기 40+35ms·접촉 95ms·회수 55ms·발 내리기 75ms와 종료 회수를 유지한다. 프레임별 발 앵커·x0·높이0은 기본 박자와 같다.',
        steps: groundKickTimingSteps(presentation.steps),
    })),
    effects: withLegacyEffects(flyingKickMotion).effects?.map((effect) => effect.kind === 'afterimage'
        ? {
            ...effect,
            id: 'ground-high-kick-afterimage',
            label: '킥 잔상',
            summary: '발을 올리고 거두는 킥 자세를 짧게 남깁니다.',
        }
        : {
            ...effect,
            id: 'ground-high-kick-foot-line',
            summary: '같은 원본 발끝의 상승 경로를 지상 발 기준에 맞춰 표시합니다.',
        }),
};
export const standaloneAttacks = [
    landingRecovery,
    groundHighKick,
];
