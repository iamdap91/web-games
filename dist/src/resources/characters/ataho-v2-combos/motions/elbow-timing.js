import { elbowChopMotion } from './elbow-chop.js';
const sharpFrames = [0, 1, 2, 3, 6, 7, 8, 9, 10, 12, 13, 14, 15];
const previousDurations = [80, 40, 50, 35, 90, 30, 75, 45, 35, 40, 40, 50, 110];
const sharpDurations = [45, 25, 30, 20, 50, 15, 40, 25, 20, 20, 25, 30, 75];
export const sharpElbowSteps = sharpFrames.map((index, order) => {
    const step = elbowChopMotion.steps[index];
    return {
        ...step,
        durationMs: sharpDurations[order],
        contact: index === 8 ? { kind: 'elbow', height: 32, reach: 18 } : undefined,
        phase: index === 6
            ? '한 박자 준비'
            : index === 7
                ? '빠른 하강'
                : index === 8
                    ? '내려친 자세 멈춤'
                    : step.phase,
    };
});
export const elbowTimingMotion = {
    ...elbowChopMotion,
    steps: sharpElbowSteps,
    priority: 'selected',
    review: '조합실에서 선택한 0.42초 내려치기다. 준비 50ms·하강 15ms·접촉 40ms로 재생한다. 원본 그림과 접지 위치를 유지하며 이전 박자는 비교용으로 보존한다.',
    summary: '짧게 준비한 뒤 빠르게 내려치고 가드로 돌아온다.',
    presentationLabel: '빠른 하강·짧은 멈춤 · 0.42초',
    presentationSummary: '팔을 올린 뒤 빠르게 내려치고 짧게 멈춘 다음 가드로 돌아옵니다.',
    presentations: [
        {
            id: 'sharp-previous',
            label: '빠른 하강·긴 멈춤 · 0.72초',
            summary: '준비와 내려친 자세를 더 오래 유지해 타격의 박자를 나눕니다.',
            steps: sharpElbowSteps.map((step, index) => ({
                ...step,
                durationMs: previousDurations[index],
            })),
            review: '이전 0.72초 비교본. 준비 90ms·하강 30ms·내려친 자세 75ms로 구성했던 박자를 보존한다. 새 0.42초 버전과 같은 자세 순서로 속도 차이를 비교한다.',
        },
        {
            id: 'fast',
            label: '전체 가속 · 0.808초',
            summary: '원래 동작의 시간 비율을 유지한 채 모든 구간을 빠르게 재생합니다.',
            steps: elbowChopMotion.steps.map((step) => ({
                ...step,
                durationMs: Math.round(step.durationMs * 0.65),
            })),
            review: '원래 자세와 타격 위치를 그대로 두고 모든 유지 시간을 65%로 줄였다. 약 1.54배 재생에 해당한다. 팔을 올리고 내리는 비율은 같으므로 단순 가속으로 공격감이 얼마나 바뀌는지 비교한다.',
        },
        {
            id: 'original',
            label: '원래 박자 · 1.24초',
            summary: '접근과 팔 올리기부터 회수까지 원래의 자세와 박자로 재생합니다.',
            steps: elbowChopMotion.steps,
            review: elbowChopMotion.review,
        },
    ],
};
