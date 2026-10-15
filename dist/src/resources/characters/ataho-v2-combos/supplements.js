const generatedPath = 'public/assets/maplestory/ataho-v2-combo-generated/20261014/';
export const supplementFrames = {
    'generated-dodge-lean': {
        label: '생성 보강 · 뒤젖힘',
        frames: [
            {
                width: 96,
                height: 96,
                pivot: { x: 48, y: 16 },
                localPath: `${generatedPath}dodge-lean-96.png`,
            },
        ],
    },
    'generated-slide-sweep': {
        label: '생성 보강 · 하단 타격',
        frames: [
            {
                width: 96,
                height: 96,
                pivot: { x: 48, y: 16 },
                localPath: `${generatedPath}slide-sweep-96.png`,
            },
        ],
    },
};
export function withSupplement(motion) {
    if (motion.id === 'slide-sweep') {
        return {
            ...motion,
            supplementedReview: '기존 쓸기의 정점과 짧은 유지 구간을 생성 자세 한 장으로 교체해 오른쪽으로 뻗은 다리와 발을 보이게 했다. 얼굴과 도트 질감은 원본과 조금 달라 비교 후보로 둔다. 누운 슬라이딩에서 한 손을 짚는 회전 자세로 넘어가는 연결은 보완할 여지가 있다.',
            supplementedMissingPose: '옆으로 누운 슬라이딩 자세에서 한 손을 바닥에 짚고 골반을 돌리며 쓸기 자세로 들어가는 연결 그림 한 장.',
            supplementedSteps: motion.steps.map((step) => step.motion === 'leg-sweep-south-east' && step.frame === 3
                ? {
                    ...step,
                    motion: 'generated-slide-sweep',
                    frame: 0,
                    phase: step.contact ? '하단 타격 · 보강' : '다리 회수 직전',
                }
                : step),
        };
    }
    return motion;
}
export function applySupplement(motion) {
    // 현재 선택한 박자에 그림 교체를 적용해 두 설정이 서로 덮어쓰지 않게 한다.
    const supplemented = withSupplement(motion);
    if (!supplemented.supplementedSteps)
        return motion;
    return {
        ...motion,
        steps: supplemented.supplementedSteps,
        review: supplemented.supplementedReview ?? motion.review,
        missingPose: supplemented.supplementedMissingPose,
    };
}
