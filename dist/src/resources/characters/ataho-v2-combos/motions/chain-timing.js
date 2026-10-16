// 연속 공격에서는 앞 기술의 회수를 줄이고 마지막 타격과 착지는 따로 읽힌다.
// 단독 기술의 선택 박자를 복사하지 않고 각 연계의 준비·연결·마무리에 배분한다.
const linkedOneTwo = [60, 25, 40, 30, 35, 25, 55, 30, 30];
const finalOneTwo = [55, 25, 40, 30, 35, 25, 85, 35, 40];
const linkedUppercut = [55, 30, 30, 65, 30, 35];
const finalUppercut = [65, 30, 35, 100, 35, 45, 50];
const linkedElbow = [40, 25, 55, 30];
const finalElbow = [55, 25, 75, 35];
const linkedFlight = [
    35, 40, 60, 30, 40, 35, 35, 40, 50, 40, 25, 35, 30, 20, 95, 50,
];
const entryFlight = [
    50, 55, 80, 35, 45, 40, 40, 45, 55, 45, 25, 40, 35, 25, 110, 65,
];
const chainRecovery = [40, 55, 150];
const timings = {
    'one-two-uppercut': {
        label: '짧은 연결·어퍼컷 마무리',
        summary: '원투의 회수를 줄여 낮은 장전으로 잇고 마지막 어퍼컷은 선명하게 유지합니다.',
        review: '기존 자세·세 타격·접지를 보존한다. 원투 회수는 30+30ms로 낮은 어퍼컷 준비에 잇고, 어퍼컷은 65+30ms 준비·35ms 상승 뒤 접촉을 100ms 유지한다. 끝 회수는 40+55ms 뒤 가드 150ms로 마친다.',
        durations: [110, ...linkedOneTwo, ...finalUppercut, ...chainRecovery],
    },
    'punch-barrage': {
        label: '촘촘한 연타·어퍼컷 마무리',
        summary: '두 번째 원투를 촘촘하게 잇고 마지막 어퍼컷의 장전과 타격을 구분합니다.',
        review: '기존 다섯 타격과 제자리 접지를 보존한다. 두 번째 원투는 45ms 준비로 바로 잇고 두 접촉은 35·45ms로 짧게 끊는다. 마지막 어퍼컷은 낮은 장전 100ms·보조 준비 30ms·상승 35ms 뒤 접촉 100ms로 연타와 마무리의 박자를 나눈다.',
        durations: [
            110,
            ...linkedOneTwo,
            45,
            25,
            35,
            25,
            30,
            25,
            45,
            25,
            25,
            100,
            30,
            35,
            100,
            35,
            45,
            50,
            ...chainRecovery,
        ],
    },
    'one-two-leap-kick': {
        label: '원투 연결·연속 비행',
        summary: '원투 회수에서 도약으로 잇고 공중 타격 중에도 전진·하강합니다.',
        review: '기존 세 타격과 골반 기준을 보존한다. 원투 뒤 도약 준비는 35+40ms와 같은 낮은 자세 60+30ms로 모은다. 정점에서는 상승을 풀고, 공중 접촉 40ms·이어지는 같은 자세 25ms 동안 x57→62→66과 y−32→−28→−23으로 계속 움직인다. 낮은 착지는 95ms로 읽히고 가드로 회수한다.',
        durations: [110, ...linkedOneTwo, ...linkedFlight, ...chainRecovery],
        flightFrom: 10,
    },
    'three-ground': {
        label: '상승 연결·내려치기 유지',
        summary: '어퍼컷의 회수를 짧게 이어 올린 팔을 내려치고 마지막 타격을 유지합니다.',
        review: '기존 네 타격·자세 순서·접지를 보존한다. 연결 어퍼컷의 접촉은 65ms, 회수는 30+35ms로 내려치기에 잇는다. 마지막 내려치기는 준비 55ms·하강 25ms·접촉 75ms·풀기 35ms로 앞타보다 마무리를 또렷하게 둔다.',
        durations: [
            110,
            ...linkedOneTwo,
            ...linkedUppercut,
            ...finalElbow,
            ...chainRecovery,
        ],
    },
    'three-air': {
        label: '어퍼컷 연결·연속 비행',
        summary: '어퍼컷을 거두며 도약을 준비하고 공중 타격과 하강을 끊김 없이 잇습니다.',
        review: '기존 네 타격과 지상 접지를 보존한다. 어퍼컷 접촉 65ms 뒤 30+35ms 회수로 도약에 잇는다. 도약 준비·비행에는 연속기 전용 660ms를 배분하며 정점 감속과 공중 접촉 40+25ms 동안 이동을 이어 준다. 착지는 95ms 유지한 뒤 같은 x74에서 가드로 돌아온다.',
        durations: [
            110,
            ...linkedOneTwo,
            ...linkedUppercut,
            ...linkedFlight,
            ...chainRecovery,
        ],
        flightFrom: 16,
    },
    'four-chain': {
        label: '지상 연결·연속 비행',
        summary: '어퍼컷과 내려치기를 짧게 연결하고 도약 날아차기를 마지막 타격으로 읽힙니다.',
        review: '기존 다섯 타격과 자세 순서를 보존한다. 중간 내려치기는 준비 40ms·하강 25ms·접촉 55ms·풀기 30ms로 도약 직전의 긴 정지를 줄인다. 도약은 접지 준비를 남기고 공중 접촉 40+25ms에도 전진·하강하며, 마지막 낮은 착지는 95ms로 유지한다.',
        durations: [
            110,
            ...linkedOneTwo,
            ...linkedUppercut,
            ...linkedElbow,
            ...linkedFlight,
            ...chainRecovery,
        ],
        flightFrom: 20,
    },
    'one-two-horizontal-elbow': {
        label: '원투 연결·팔꿈치 유지',
        summary: '원투 회수에서 접힌 팔을 짧게 모아 돌리고 마지막 팔꿈치를 잠깐 유지합니다.',
        review: '기존 세 타격·그림 순서·접지를 보존한다. 팔꿈치 구간은 65+45ms 준비·30ms 통과·85ms 접촉 뒤 40→45→60ms로 회수한다. 단독 기술의 박자를 복사하지 않고 앞선 원투와 마지막 팔꿈치의 대비에 370ms를 배분한다. 원본의 작은 몸통 회전과 팔꿈치 돌출은 그대로다.',
        durations: [
            110,
            ...linkedOneTwo,
            65,
            45,
            30,
            85,
            40,
            45,
            60,
            ...chainRecovery,
        ],
    },
    'push-kick-reentry-one-two': {
        label: '재진입 감속·스트레이트 유지',
        summary: '앞차기를 거둬 다시 접근한 뒤 감속해 발을 딛고 마지막 스트레이트를 유지합니다.',
        review: '기존 세 타격과 앞차기 회수 뒤 재진입 순서를 보존한다. 앞차기는 95ms 장전·35ms 뻗기·75ms 접촉 뒤 35→40→50→60ms로 발을 내린다. 재진입은 45→45→40ms로 x0→7→15→22를 이동하고 마지막 이동을 감속한다. 제자리 달리기 자세는 25ms만 연결하며 스트레이트는 85ms 유지한다.',
        durations: [
            110,
            95,
            35,
            75,
            35,
            40,
            50,
            60,
            45,
            45,
            40,
            25,
            ...finalOneTwo,
            ...chainRecovery,
        ],
        brakingIndex: 10,
    },
    'one-two-sweep': {
        label: '원투 연결·낮은 쓸기 유지',
        summary: '원투 뒤 몸을 낮추는 시간을 남기고 낮은 마지막 타격을 읽힌 뒤 일어섭니다.',
        review: '기존 세 타격·낮추기·발 접지를 보존한다. 하단 준비는 65+45ms, 다리 통과는 35ms로 두고 쓸기 접촉 75ms와 같은 자세 풀기 25ms를 잇는다. 회수는 45→55→70ms로 몸을 세워 빠른 원투와 낮은 마무리의 박자를 구분한다. 가려진 다리의 실루엣은 그대로다.',
        durations: [
            110,
            ...linkedOneTwo,
            65,
            45,
            35,
            75,
            25,
            45,
            55,
            70,
            ...chainRecovery,
        ],
    },
    'spin-one-two': {
        label: '회전 중심 회복·원투 마무리',
        summary: '회전 뒤 지지한 중심을 되찾고 원투를 이어 마지막 스트레이트를 유지합니다.',
        review: '기존 세 타격·지지발·제자리 위치를 보존한다. 회전 준비는 75+80ms, 진입은 45+35ms, 접촉과 풀기는 55+25ms로 나눈다. 55+80ms 동안 중심을 회복한 뒤 원투에 연결하며 마지막 스트레이트는 85ms 유지한다. 원본의 접힌 다리를 큰 돌려차기로 바꾸지 않는다.',
        durations: [
            90,
            75,
            80,
            45,
            35,
            55,
            25,
            55,
            80,
            ...finalOneTwo,
            ...chainRecovery,
        ],
    },
    'one-two-elbow': {
        label: '접근 연결·내려치기 마무리',
        summary: '기존 보행으로 발을 딛고 원투를 이어 마지막 내려치기의 준비와 접촉을 남깁니다.',
        review: '기존 세 타격과 x0→8→14 보행·공격 중 접지를 보존한다. 접근은 기존 65+70+60ms를 유지한다. 내려치기는 보조 준비 40ms·장전 85ms·하강 30ms·접촉 90ms 뒤 45→35→40ms로 팔과 몸을 회수한다. 앞선 원투의 회수를 줄이되 마지막 팔 올리기와 발 디딤은 생략하지 않는다.',
        durations: [
            100,
            65,
            70,
            60,
            ...linkedOneTwo,
            40,
            85,
            30,
            90,
            45,
            35,
            40,
            ...chainRecovery,
        ],
    },
    'landing-one-two': {
        label: '연속 하강·착지 뒤 원투',
        summary: '공중 타격 중에도 내려오고 착지 충격과 일어서기를 마친 뒤 원투를 잇습니다.',
        review: '기존 세 타격·골반 기준·착지 뒤 x74 접지를 보존한다. 첫 도약 준비에는 50+55ms와 낮은 자세 80+35ms를 남긴다. 공중 접촉 45ms와 같은 자세 25ms 동안 전진·하강하고, 낮은 착지 110ms·일어서기 65ms 뒤 기존 연결 두 자세를 각각 45ms 유지한다. 원투 첫 준비는 65ms, 마지막 스트레이트는 85ms로 착지와 펀치를 구분한다.',
        durations: [
            100,
            ...entryFlight,
            45,
            45,
            65,
            25,
            40,
            30,
            35,
            25,
            85,
            35,
            40,
            ...chainRecovery,
        ],
        flightFrom: 1,
    },
    'jab-ground-kick': {
        label: '잽 회수·지상 킥 유지',
        summary: '잽을 거둬 한 발 지지로 옮긴 뒤 높은 킥을 읽히고 발을 내립니다.',
        review: '기존 두 타격·지지발 기준·높이0을 보존한다. 잽의 준비·뻗기·접촉·회수는 60→25→40→30→35ms로 잇는다. 킥 장전은 55+50ms, 발 올리기와 내밀기는 40+35ms, 마지막 킥은 95ms 유지한다. 다리 회수 55ms와 발 내리기 75ms를 마친 뒤에만 가드로 돌아간다. 한 발 지지로 옮기는 원본 연결의 한계는 남는다.',
        durations: [
            110,
            60,
            25,
            40,
            30,
            35,
            55,
            50,
            40,
            35,
            95,
            55,
            75,
            ...chainRecovery,
        ],
    },
};
function flightStep(step, index) {
    if (index === 7)
        return {
            ...step,
            y: -33,
            movementCurve: { ...step.movementCurve, y: 'ease-out' },
        };
    if (index === 8)
        return { ...step, movementCurve: { ...step.movementCurve, y: 'ease-in' } };
    if (index === 9)
        return {
            ...step,
            x: 57,
            y: -32,
            contact: step.contact
                ? { ...step.contact, height: 37, heightReference: 'body' }
                : undefined,
        };
    if (index === 10)
        return { ...step, x: 62, y: -28 };
    if (index === 11)
        return { ...step, y: -23 };
    if (index === 12)
        return { ...step, y: -14 };
    if (index === 13)
        return { ...step, y: -5 };
    return step;
}
export function withChainTiming(motion) {
    const timing = timings[motion.id];
    if (!timing)
        return motion;
    if (timing.durations.length !== motion.steps.length)
        throw new Error(`연속기 박자의 자세 수가 다릅니다: ${motion.id}`);
    const steps = motion.steps.map((step, index) => {
        let timed = { ...step, durationMs: timing.durations[index] };
        if (timing.flightFrom !== undefined)
            timed = flightStep(timed, index - timing.flightFrom);
        if (index === timing.brakingIndex)
            timed = {
                ...timed,
                movementCurve: { ...timed.movementCurve, x: 'ease-out' },
            };
        return timed;
    });
    return {
        ...motion,
        presentations: [
            ...(motion.presentations ?? []),
            {
                id: 'linked-chain-rhythm',
                label: timing.label,
                summary: timing.summary,
                review: timing.review,
                steps,
            },
        ],
    };
}
