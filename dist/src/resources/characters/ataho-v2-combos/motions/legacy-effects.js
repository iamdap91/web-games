const oneTwoSource = 'ataho-one-two-punch-south-east-south-east';
const highKickSource = 'high-kick-south-east';
const spinSource = 'ataho-roundhouse-kick-skeleton-south-east-south-east';
const elbowSource = 'ataho-firewood-elbow-chop-south-east-south-east';
const uppercutSource = 'surprise-uppercut-south-east';
// 좌표는 원본 PNG에서 확인한 손·발의 바깥쪽 픽셀이다. 짧은 팔·접힌 다리의 범위를 늘리지 않는다.
const effectsByMotion = {
    rush: [
        {
            id: 'rush-running-afterimage',
            label: '달리기 잔상',
            summary: '달리기 자세 두 개를 짧게 남기고 디딤으로 넘어가며 지웁니다.',
            kind: 'afterimage',
            sources: [{ motion: 'running-4-frames-south-east' }],
            intervalMs: 35,
            count: 2,
            opacity: 0.16,
        },
        {
            id: 'rush-punch-lines',
            label: '원투 주먹선',
            summary: '잽과 스트레이트의 실제 손끝을 각각 짧은 선으로 잇습니다.',
            kind: 'line',
            paths: [
                {
                    motion: oneTwoSource,
                    points: [
                        { frame: 1, x: 77, y: 46 },
                        { frame: 2, x: 79, y: 46 },
                    ],
                },
                {
                    motion: oneTwoSource,
                    points: [
                        { frame: 11, x: 65, y: 49 },
                        { frame: 12, x: 71, y: 49 },
                    ],
                },
            ],
            width: 1.5,
            tailMs: 70,
        },
    ],
    'flying-kick': [
        {
            id: 'flying-kick-afterimage',
            label: '공중 잔상',
            summary: '공중 킥 자세를 짧게 남기고 착지 초반까지 각자 옅어지며 사라집니다.',
            kind: 'afterimage',
            sources: [{ motion: highKickSource }],
            intervalMs: 35,
            count: 2,
            opacity: 0.14,
        },
        {
            id: 'flying-kick-foot-line',
            label: '발끝 상승선',
            summary: '접힌 발이 올라가는 짧은 경로를 가는 선으로 보여 줍니다.',
            kind: 'line',
            paths: [
                {
                    motion: highKickSource,
                    points: [
                        { frame: 2, x: 57, y: 66 },
                        { frame: 3, x: 64, y: 57 },
                        { frame: 4, x: 66, y: 43 },
                    ],
                },
            ],
            width: 1.5,
            tailMs: 70,
        },
    ],
    'slide-sweep': [
        {
            id: 'slide-ground-line',
            label: '낮은 이동선',
            summary: '슬라이딩의 실제 이동을 바닥 가까이에 남깁니다.',
            kind: 'line',
            paths: [
                {
                    motion: 'running-slide-south-east',
                    space: 'ground',
                    points: [
                        { frame: 0, x: 0, y: -2 },
                        { frame: 1, x: 0, y: -2 },
                        { frame: 2, x: 0, y: -2 },
                        { frame: 3, x: 0, y: -2 },
                        { frame: 4, x: 0, y: -2 },
                    ],
                },
            ],
            width: 1.5,
            tailMs: 90,
        },
    ],
    cheolsango: [
        {
            id: 'cheolsango-entry-afterimage',
            label: '진입 잔상',
            summary: '몸통이 진입할 때 직전 자세 하나를 옅게 남깁니다.',
            kind: 'afterimage',
            sources: [{ motion: 'cheolsango-short', frames: [2] }],
            intervalMs: 25,
            count: 1,
            opacity: 0.18,
        },
    ],
    'ground-spin': [
        {
            id: 'ground-spin-knee-ribbon',
            label: '작은 회전면',
            summary: '접힌 다리의 실제 짧은 회전 범위만 좁은 면으로 잇습니다.',
            kind: 'ribbon',
            paths: [
                {
                    motion: spinSource,
                    points: [
                        { frame: 2, x: 60, y: 75 },
                        { frame: 3, x: 66, y: 52 },
                        { frame: 4, x: 67, y: 51 },
                    ],
                },
            ],
            width: 4,
            tailMs: 70,
        },
    ],
    'elbow-chop': [
        {
            id: 'elbow-downward-line',
            label: '짧은 하향선',
            summary: '보이는 팔의 하강을 짧은 선으로 따라갑니다.',
            kind: 'line',
            paths: [
                {
                    motion: elbowSource,
                    layer: 'back',
                    points: [
                        { frame: 3, x: 58, y: 26 },
                        { frame: 4, x: 61, y: 41 },
                        { frame: 5, x: 57, y: 51 },
                    ],
                },
            ],
            width: 1.6,
            tailMs: 60,
        },
    ],
    'quick-jab': [
        {
            id: 'quick-jab-line',
            label: '짧은 주먹선',
            summary: '짧게 뻗는 손끝에만 가는 선을 남깁니다.',
            kind: 'line',
            paths: [
                {
                    motion: oneTwoSource,
                    points: [
                        { frame: 1, x: 77, y: 46 },
                        { frame: 2, x: 79, y: 46 },
                    ],
                },
            ],
            width: 1.3,
            tailMs: 50,
        },
    ],
    'double-jab': [
        {
            id: 'double-jab-lines',
            label: '두 번 끊기는 주먹선',
            summary: '각 잽의 손끝을 잇고 다음 잽이 나오기 전에 선을 걷습니다.',
            kind: 'line',
            paths: [
                {
                    motion: oneTwoSource,
                    occurrence: 0,
                    points: [
                        { frame: 1, x: 77, y: 46 },
                        { frame: 2, x: 79, y: 46 },
                    ],
                },
                {
                    motion: oneTwoSource,
                    occurrence: 1,
                    points: [
                        { frame: 1, x: 77, y: 46 },
                        { frame: 2, x: 79, y: 46 },
                    ],
                },
            ],
            width: 1.4,
            tailMs: 50,
        },
    ],
    'charged-uppercut': [
        {
            id: 'charged-uppercut-ribbon',
            label: '좁은 상승면',
            summary: '힘을 모은 뒤 올라가는 주먹의 짧은 경로에만 좁은 면을 남깁니다.',
            kind: 'ribbon',
            paths: [
                {
                    motion: uppercutSource,
                    points: [
                        { frame: 2, x: 64, y: 35 },
                        { frame: 3, x: 53, y: 28 },
                    ],
                },
            ],
            width: 5,
            tailMs: 60,
        },
    ],
};
const timingsByMotion = {
    'slide-sweep': {
        id: 'slide-deceleration',
        label: '미끄러짐 감속·짧은 쓸기',
        summary: '미끄러짐을 빠르게 시작해 멈추고, 쓸기는 짧게 끊습니다.',
        review: '기존 15자세의 순서·이동량·기준점·접촉을 유지한다. 슬라이딩 2번은 75ms, 3번 감속은 110ms의 ease-out 이동으로 두고 낮은 받침은 65ms 유지한다. 쓸기 접촉과 풀기는 55+20ms로 줄인다. 접촉 뒤 위치는 x92 그대로이며 가려진 타격 다리를 새로 만들지 않는다.',
        durations: [85, 55, 55, 45, 50, 75, 110, 65, 60, 55, 20, 55, 65, 90, 130],
    },
    'ground-spin': {
        id: 'accelerated-short-spin',
        label: '회전 가속·짧은 타격',
        summary: '디딤 뒤 빠르게 돌고 접힌 다리의 멈춤을 짧게 줄입니다.',
        review: '기존 12자세의 그림·순서·접지·접촉을 유지한다. 디딤은 95ms, 회전은 50ms, 무릎 올리기는 35ms로 가속하며 접촉과 풀기는 기존 95+35ms에서 60+20ms로 줄인다. 제자리 x0·y0와 원본의 접힌 다리를 유지하므로 큰 돌려차기나 새로운 다리 뻗음은 생기지 않는다.',
        durations: [110, 90, 95, 50, 35, 60, 20, 55, 95, 50, 70, 140],
    },
    'quick-jab': {
        id: 'quick-jab-return',
        label: '짧은 접촉·빠른 회수',
        summary: '가볍게 접촉한 뒤 손을 빠르게 거두어 가드로 돌아옵니다.',
        review: '기존 7자세와 x0 접지를 유지한다. 손 뻗기는 20ms, 접촉은 45ms에서 30ms, 팔 회수와 준비 자세 복귀는 35+45ms에서 25+30ms로 줄인다. 준비를 길게 늘리거나 새로운 주먹 자세를 추가하지 않는다.',
        durations: [60, 50, 20, 30, 25, 30, 100],
    },
    'double-jab': {
        id: 'double-jab-accent',
        label: '가벼운 첫 잽·강한 둘째 잽',
        summary: '첫 잽은 짧게 끊고 두 번째 잽의 준비와 접촉을 조금 더 유지합니다.',
        review: '기존 12자세와 두 번의 회수, x0 접지를 유지한다. 첫 잽의 준비·접촉은 45·30ms, 두 번째는 60·50ms로 두어 같은 손 반복의 박자를 나눈다. 두 번 모두 회수는 25+35ms이며 새로운 타격 실루엣이나 전진 이동은 추가하지 않는다.',
        durations: [70, 45, 20, 30, 25, 35, 60, 20, 50, 25, 35, 120],
    },
};
function legacyPresentation(motion) {
    const timing = timingsByMotion[motion.id];
    if (!timing)
        return undefined;
    const steps = motion.steps.map((step, index) => {
        const durationMs = timing.durations[index];
        if (motion.id === 'slide-sweep' && index === 6) {
            return {
                ...step,
                durationMs,
                movementCurve: { ...step.movementCurve, x: 'ease-out' },
            };
        }
        return { ...step, durationMs };
    });
    return {
        id: timing.id,
        label: timing.label,
        summary: timing.summary,
        review: timing.review,
        steps,
    };
}
export function withLegacyEffects(motion) {
    const effects = effectsByMotion[motion.id];
    if (!effects)
        return motion;
    const presentation = legacyPresentation(motion);
    return {
        ...motion,
        effects: [...(motion.effects ?? []), ...effects],
        ...(presentation
            ? { presentations: [...(motion.presentations ?? []), presentation] }
            : {}),
    };
}
