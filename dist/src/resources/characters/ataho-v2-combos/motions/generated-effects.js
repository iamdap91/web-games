const pushKickTiming = {
    id: 'chambered-push-kick',
    label: '무릎 장전·빠른 밀기',
    summary: '무릎을 모으는 자세를 읽힌 뒤 빠르게 뻗고 발끝을 잠깐 유지합니다.',
    durations: [100, 125, 30, 90, 40, 50, 65, 80, 140],
    review: '기존 0→2→3→4→5→6→7→8→0번을 그대로 쓰고 유지 시간만 바꾼다. 무릎을 모으는 2번과 발을 뻗는 3번의 시간 차이를 키우고 4번 도착 뒤에는 같은 다리를 차례로 거둔다. 발 기준과 몸 위치는 고정하며 새로운 골반 추진이나 다리 변형은 만들지 않는다.',
};
const elbowTiming = {
    id: 'compact-elbow-beat',
    label: '짧은 공격·나눠 거두기',
    summary: '접힌 팔의 준비와 짧은 공격을 구분하고 회수는 차례로 풀어 줍니다.',
    durations: [100, 100, 50, 25, 75, 45, 55, 70, 140],
    review: '기존 0→2→3→4→5→4→3→2→0번의 순서와 접촉 5번을 보존한다. 준비 뒤 4번을 짧게 통과하고 접힌 팔의 도착을 유지한 다음 역순 회수의 시간을 점차 늘린다. 몸통 회전과 팔꿈치 돌출이 작은 원본의 한계는 그대로이며 위치와 접지는 바꾸지 않는다.',
};
const palmTiming = {
    id: 'gathered-double-palm',
    label: '모으기·빠른 양손 밀기',
    summary: '팔을 모으는 자세를 더 읽힌 뒤 두 손이 앞으로 나가는 박자를 짧게 끊습니다.',
    durations: [100, 100, 85, 70, 25, 90, 40, 50, 60, 75, 140],
    review: '기존 0→2→3→4→5→6→5→4→3→2→0번을 그대로 유지한다. 2~4번의 준비를 길게 읽히고 5번 통과와 6번 접촉을 구분한 뒤 같은 회수 자세로 돌아온다. 두 손은 원본 그림에 함께 들어 있으므로 별도로 움직이거나 늘이지 않으며 발 위치와 접지는 고정한다.',
};
const sweepTiming = {
    id: 'lowered-quick-sweep',
    label: '낮추기·빠른 쓸기',
    summary: '몸을 낮추는 준비 뒤 쓸기를 빠르게 잇고 낮은 타격 자세에서 거둡니다.',
    durations: [100, 105, 35, 90, 40, 45, 70, 85, 140],
    review: '기존 0→2→3→4→5→6→7→8→0번의 순서와 지면 기준은 유지한다. 2번 준비 뒤 낮은 3번을 짧게 통과하고 4번의 바깥으로 나온 발을 읽힌 다음 몸을 세운다. 원본보다 더 낮은 자세나 추가 회전은 만들지 않으며 두 방향 모두 화면 왼쪽으로 나온 발을 사용한다.',
};
// 각 방향의 손발 위치를 따로 잡아 원본에 없는 큰 회전이나 전신 이동을 만들지 않는다.
const generatedSetups = {
    'new-front-push-kick-south-east': {
        timing: pushKickTiming,
        effect: {
            id: 'push-kick-toe-line',
            label: '발끝 선 궤적',
            summary: '무릎을 모은 발이 화면 오른쪽으로 뻗는 경로를 가는 선으로 잇습니다.',
            kind: 'line',
            width: 1.4,
            tailMs: 70,
            paths: [
                {
                    motion: 'front-push-kick-south-east',
                    points: [
                        { frame: 2, x: 55, y: 69 },
                        { frame: 3, x: 68, y: 61 },
                        { frame: 4, x: 72, y: 57 },
                    ],
                },
            ],
        },
    },
    'new-front-push-kick-north-east': {
        timing: pushKickTiming,
        effect: {
            id: 'push-kick-toe-line',
            label: '발끝 선 궤적',
            summary: '뒤에서 보이는 발이 화면 오른쪽 위로 뻗는 경로를 가는 선으로 잇습니다.',
            kind: 'line',
            width: 1.4,
            tailMs: 70,
            paths: [
                {
                    motion: 'front-push-kick-north-east',
                    points: [
                        { frame: 2, x: 57, y: 68 },
                        { frame: 3, x: 68, y: 41 },
                        { frame: 4, x: 67, y: 35 },
                    ],
                },
            ],
        },
    },
    'new-horizontal-elbow-south-east': {
        timing: elbowTiming,
        effect: {
            id: 'compact-elbow-curve',
            label: '팔꿈치 작은 곡선',
            summary: '접힌 팔 바깥의 짧은 가로 이동만 작은 곡선으로 표시합니다.',
            kind: 'line',
            width: 1.3,
            tailMs: 65,
            paths: [
                {
                    motion: 'horizontal-elbow-south-east',
                    points: [
                        { frame: 3, x: 54, y: 46 },
                        { frame: 4, x: 61, y: 41 },
                        { frame: 5, x: 60, y: 44 },
                    ],
                },
            ],
        },
    },
    'new-horizontal-elbow-north-east': {
        timing: elbowTiming,
        effect: {
            id: 'compact-elbow-curve',
            label: '팔꿈치 작은 곡선',
            summary: '뒤에서 보이는 팔꿈치 바깥의 짧은 경로를 작은 선으로 잇습니다.',
            kind: 'line',
            width: 1.3,
            tailMs: 65,
            paths: [
                {
                    motion: 'horizontal-elbow-north-east',
                    points: [
                        { frame: 3, x: 53, y: 44 },
                        { frame: 4, x: 58, y: 39 },
                        { frame: 5, x: 56, y: 43 },
                    ],
                },
            ],
        },
    },
    'new-double-palm-south-east': {
        timing: palmTiming,
        effect: {
            id: 'double-palm-lines',
            label: '양손 선 궤적',
            summary: '앞으로 미는 두 손의 경로를 각각 짧고 가는 선으로 표시합니다.',
            kind: 'line',
            width: 1.3,
            tailMs: 80,
            paths: [
                {
                    motion: 'double-palm-south-east',
                    points: [
                        { frame: 4, x: 60, y: 48 },
                        { frame: 5, x: 66, y: 45 },
                        { frame: 6, x: 71, y: 42 },
                    ],
                },
                {
                    motion: 'double-palm-south-east',
                    points: [
                        { frame: 4, x: 48, y: 48 },
                        { frame: 5, x: 53, y: 47 },
                        { frame: 6, x: 58, y: 45 },
                    ],
                },
            ],
        },
    },
    'new-double-palm-north-east': {
        timing: palmTiming,
        effect: {
            id: 'double-palm-lines',
            label: '양손 선 궤적',
            summary: '뒤에서 보이는 두 손의 높이와 겹침에 맞춰 짧은 선 두 개를 남깁니다.',
            kind: 'line',
            width: 1.3,
            tailMs: 80,
            paths: [
                {
                    motion: 'double-palm-north-east',
                    points: [
                        { frame: 4, x: 61, y: 46 },
                        { frame: 5, x: 67, y: 42 },
                        { frame: 6, x: 72, y: 39 },
                    ],
                },
                {
                    motion: 'double-palm-north-east',
                    points: [
                        { frame: 4, x: 51, y: 43 },
                        { frame: 5, x: 58, y: 42 },
                        { frame: 6, x: 64, y: 40 },
                    ],
                },
            ],
        },
    },
    'new-visible-low-sweep-south-east': {
        timing: sweepTiming,
        effect: {
            id: 'low-sweep-ribbon',
            label: '낮은 쓸기 면 궤적',
            summary: '화면 왼쪽으로 낮게 쓸어 나가는 발의 자리를 얇은 면으로 잇습니다.',
            kind: 'ribbon',
            width: 4.8,
            tailMs: 85,
            paths: [
                {
                    motion: 'visible-low-sweep-south-east',
                    points: [
                        { frame: 2, x: 30, y: 72 },
                        { frame: 3, x: 22, y: 73 },
                        { frame: 4, x: 17, y: 70 },
                    ],
                },
            ],
        },
    },
    'new-visible-low-sweep-north-east': {
        timing: sweepTiming,
        effect: {
            id: 'low-sweep-ribbon',
            label: '낮은 쓸기 면 궤적',
            summary: '뒤에서 보이는 왼쪽 발의 높이를 따라 낮은 면을 짧게 남깁니다.',
            kind: 'ribbon',
            width: 4.8,
            tailMs: 85,
            paths: [
                {
                    motion: 'visible-low-sweep-north-east',
                    points: [
                        { frame: 2, x: 40, y: 72 },
                        { frame: 3, x: 28, y: 68 },
                        { frame: 4, x: 22, y: 61 },
                    ],
                },
            ],
        },
    },
    'new-smear-hook-south-east': {
        effect: {
            id: 'hook-outer-line',
            label: '훅 외곽 선 궤적',
            summary: '원본에 그려진 가로 스미어와 함께 바깥 경로의 가는 선을 남깁니다.',
            kind: 'line',
            width: 1.3,
            tailMs: 60,
            paths: [
                {
                    motion: 'smear-hook-stable-south-east',
                    points: [
                        { frame: 3, x: 83, y: 38 },
                        { frame: 4, x: 83, y: 44 },
                    ],
                },
            ],
        },
    },
    'new-smear-hammerfist-south-east': {
        effect: {
            id: 'hammerfist-diagonal-line',
            label: '망치주먹 대각 선 궤적',
            summary: '원본의 대각 스미어를 유지하며 낮은 주먹으로 이어지는 가는 선을 더합니다.',
            kind: 'line',
            width: 1.3,
            tailMs: 60,
            paths: [
                {
                    motion: 'smear-hammerfist-clean-south-east',
                    points: [
                        { frame: 3, x: 69, y: 40 },
                        { frame: 4, x: 76, y: 51 },
                        { frame: 5, x: 73, y: 58 },
                    ],
                },
            ],
        },
    },
};
export function withGeneratedEffects(motion) {
    const setup = generatedSetups[motion.id];
    if (!setup)
        return motion;
    const withEffect = {
        ...motion,
        effects: [...(motion.effects ?? []), setup.effect],
    };
    const timing = setup.timing;
    if (!timing)
        return withEffect;
    return {
        ...withEffect,
        presentations: [
            ...(motion.presentations ?? []),
            {
                id: timing.id,
                label: timing.label,
                summary: timing.summary,
                review: timing.review,
                steps: motion.steps.map((step, index) => ({
                    ...step,
                    durationMs: timing.durations[index],
                })),
            },
        ],
    };
}
