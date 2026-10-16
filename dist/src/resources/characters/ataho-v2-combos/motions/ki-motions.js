const guardMotion = 'fight-stance-idle-8-frames-south-east';
const punchMotion = 'ataho-one-two-punch-south-east-south-east';
const origin = { x: 24, y: -34 };
const beamOrigin = { x: 22, y: -28 };
const target = { x: 150, y: -36 };
/** 기공은 몸의 접촉을 발생시키지 않으며 모든 자세를 같은 발 위치에 둔다. */
function poses(endMs, sequence) {
    return sequence.map((pose, index) => ({
        motion: pose.motion,
        frame: pose.frame,
        phase: pose.phase,
        emphasis: pose.emphasis,
        durationMs: (sequence[index + 1]?.atMs ?? endMs) - pose.atMs,
        x: 0,
        y: 0,
        anchor: 'feet',
    }));
}
function guard(atMs, phase = '기공 준비') {
    return { atMs, motion: guardMotion, frame: 0, phase };
}
function punch(atMs, frame, phase) {
    return { atMs, motion: punchMotion, frame, phase };
}
function shot(id, launchMs, arriveMs, radius, options = {}) {
    return {
        id,
        launchMs,
        arriveMs,
        from: options.from ?? origin,
        to: target,
        radius,
        curveY: options.curveY,
        travelCurve: options.travelCurve,
    };
}
function hit(id, atMs, options = {}) {
    return {
        id,
        atMs,
        durationMs: options.durationMs ?? 190,
        point: options.point ?? target,
        radius: options.radius ?? 14,
        strength: options.strength ?? 1,
        reaction: options.reaction ?? 'horizontal',
        shotId: options.shotId,
    };
}
function definition(config) {
    return { origin, target, ...config };
}
const tigerManifest = definition({
    style: 'tiger-manifest',
    accent: '#ffcf63',
    chargeStartMs: 120,
    releaseMs: 600,
    endMs: 1580,
    shots: [],
    hits: [
        hit('tiger-pulse-1', 760, { radius: 23, strength: 0.68 }),
        hit('tiger-pulse-2', 920, { radius: 23, strength: 0.8 }),
        hit('tiger-pulse-3', 1080, { radius: 25, strength: 1.15, durationMs: 240 }),
    ],
});
const tigerWave = definition({
    style: 'tiger-wave',
    accent: '#ffd66d',
    chargeStartMs: 120,
    releaseMs: 780,
    endMs: 1630,
    shots: [shot('tiger-head', 780, 960, 22)],
    hits: [
        hit('tiger-bite', 960, {
            shotId: 'tiger-head',
            radius: 25,
            strength: 1.4,
            durationMs: 260,
        }),
    ],
});
const orb = definition({
    style: 'orb',
    accent: '#73e3f7',
    chargeStartMs: 100,
    releaseMs: 340,
    endMs: 1100,
    shots: [shot('palm-orb', 340, 620, 10)],
    hits: [
        hit('orb-burst', 620, {
            shotId: 'palm-orb',
            radius: 16,
            strength: 1.05,
            durationMs: 220,
        }),
    ],
});
const beam = definition({
    style: 'beam',
    accent: '#8bdfff',
    origin: beamOrigin,
    chargeOrigin: { x: 6, y: -22 },
    chargeStartMs: 120,
    releaseMs: 900,
    endMs: 2050,
    shots: [shot('beam-front', 900, 1030, 15, { from: beamOrigin })],
    hits: [
        hit('beam-pressure-1', 1030, {
            shotId: 'beam-front',
            radius: 17,
            strength: 0.5,
            durationMs: 170,
        }),
        hit('beam-pressure-2', 1200, {
            shotId: 'beam-front',
            radius: 17,
            strength: 0.62,
            durationMs: 170,
        }),
        hit('beam-pressure-3', 1370, {
            shotId: 'beam-front',
            radius: 18,
            strength: 0.76,
            durationMs: 170,
        }),
        hit('beam-pressure-4', 1540, {
            shotId: 'beam-front',
            radius: 21,
            strength: 1.3,
            durationMs: 240,
        }),
    ],
});
const crescent = definition({
    style: 'crescent',
    accent: '#b4eaff',
    chargeStartMs: 90,
    releaseMs: 350,
    endMs: 1100,
    shots: [shot('light-crescent', 350, 660, 22)],
    hits: [
        hit('crescent-split', 660, {
            shotId: 'light-crescent',
            radius: 24,
            strength: 1.12,
            durationMs: 240,
        }),
    ],
});
const eruption = definition({
    style: 'eruption',
    accent: '#ff9d54',
    origin: { x: 25, y: -21 },
    chargeStartMs: 120,
    releaseMs: 660,
    endMs: 1770,
    shots: [],
    hits: [
        hit('earth-burst-1', 960, {
            point: { x: 150, y: -22 },
            radius: 22,
            strength: 0.75,
            reaction: 'rising',
            durationMs: 160,
        }),
        hit('earth-burst-2', 1100, {
            point: { x: 150, y: -35 },
            radius: 24,
            strength: 0.9,
            reaction: 'rising',
            durationMs: 160,
        }),
        hit('earth-burst-3', 1240, {
            point: { x: 150, y: -42 },
            radius: 26,
            strength: 1.45,
            reaction: 'rising',
            durationMs: 260,
        }),
    ],
});
const orbitShots = [
    shot('orbit-high', 980, 1320, 8, {
        from: { x: 4, y: -77 },
        curveY: -14,
        travelCurve: 'ease-in',
    }),
    shot('orbit-rear', 1160, 1510, 8, {
        from: { x: -22, y: -52 },
        curveY: -28,
        travelCurve: 'ease-in',
    }),
    shot('orbit-front', 1320, 1700, 8, {
        from: { x: 43, y: -66 },
        curveY: -10,
        travelCurve: 'ease-in',
    }),
    shot('orbit-low', 1480, 1890, 9, {
        from: { x: 55, y: -25 },
        curveY: 11,
        travelCurve: 'ease-in',
    }),
];
const orbit = definition({
    style: 'orbit',
    accent: '#bc9dff',
    chargeStartMs: 120,
    releaseMs: 900,
    endMs: 2400,
    shots: orbitShots,
    hits: orbitShots.map((item, index) => hit(`orbit-impact-${index + 1}`, item.arriveMs, {
        shotId: item.id,
        radius: index === 3 ? 19 : 14,
        strength: index === 3 ? 1.25 : 0.68,
        durationMs: index === 3 ? 260 : 180,
    })),
});
export const kiMotions = [
    {
        id: 'ki-tiger',
        title: '호격권',
        variant: {
            groupId: 'ki-tiger',
            groupTitle: '호격권',
            label: '대상에 호랑이 형상',
        },
        summary: '대상 위치에 나타난 호랑이의 포효와 발톱 압력이 세 박자로 몰아친다.',
        priority: 'review',
        ki: tigerManifest,
        review: '원작 신기의 대상 현현과 던파 공식 영상의 기운 결집·호랑이 형상·파열을 참고한다. 전용 호랑이 그림이 첫 명중부터 선명해지고 두 번째 포효를 유지한 뒤 마지막 압력에서 조각으로 갈라진다. 세 압력 시점만 명중으로 세며 세 박자는 이 조합실의 해석이다.',
        steps: poses(tigerManifest.endMs, [
            guard(0),
            { ...punch(120, 11, '권기 응축'), emphasis: 'charge' },
            punch(555, 11, '권기 발동 직전'),
            punch(600, 12, '호랑이 형상 방출'),
            punch(810, 13, '주먹 회수 · 포효와 발톱 압력'),
            punch(1010, 15, '호랑이 형상의 마지막 압력'),
            guard(1330, '형상 소멸 · 가드 복귀'),
        ]),
    },
    {
        id: 'ki-tiger-wave',
        title: '호격권',
        variant: {
            groupId: 'ki-tiger',
            groupTitle: '호격권',
            label: '호랑이 선두 파동',
        },
        summary: '주먹에 연결된 금빛 핵이 호랑이의 기세로 전방을 관통하고 붉은 잔류선이 남는다.',
        priority: 'review',
        ki: tigerWave,
        review: '플러스 신기 영상의 호랑이 선두·금빛 핵·붉은 잔류선을 참고한다. 분리된 얼굴 탄을 날리는 대신 주먹에 연결된 금빛 기운을 빠르게 관통시킨다. 선두가 대상에 도착한960ms에 한 번만 명중하며 유지되는 금빛 핵과 붉은 잔류선에는 추가 타격이 없다.',
        steps: poses(tigerWave.endMs, [
            guard(0),
            { ...punch(120, 11, '금빛 권기 모으기'), emphasis: 'charge' },
            punch(735, 11, '발사 직전'),
            punch(780, 12, '호랑이 선두 파동 발사'),
            punch(1200, 13, '금빛 핵 수축 · 주먹 회수'),
            punch(1360, 15, '붉은 잔류선 소멸'),
            guard(1480, '호격권 뒤 가드 복귀'),
        ]),
    },
    {
        id: 'ki-orb',
        title: '권기탄',
        summary: '주먹 앞에서 빠르게 압축한 기공핵을 한 발 쏘아 날카롭게 파열시킨다.',
        priority: 'recommended',
        ki: orb,
        review: '짧은 응축 뒤 한 발이 분리되는 빠른 단발 기공이다. 몸의 정권은 방출 자세만 맡고 접촉을 발생시키지 않으며 기공핵이620ms에 도착한 순간만 한 타로 센다. 초기 명칭은 권기탄이며 특정 원작 기술을 재현한 것은 아니다.',
        steps: poses(orb.endMs, [
            guard(0),
            { ...punch(100, 11, '손 앞의 기공핵 응축'), emphasis: 'charge' },
            punch(300, 11, '빠른 압축 · 방출 직전'),
            punch(340, 12, '권기탄 발사'),
            punch(430, 13, '기공탄 비행 · 팔 회수'),
            punch(560, 15, '명중 준비 · 가드 올리기'),
            guard(800, '파열 뒤 가드 복귀'),
        ]),
    },
    {
        id: 'ki-beam',
        title: '파동포',
        summary: '양손에 압축한 핵에서 갈라지는 빔을 쏟고, 손에서 분리된 후단을 앞으로 보내며 반동을 거둔다.',
        priority: 'review',
        ki: beam,
        review: '전용 준비·발사 유지·반동의 세 그림을 사용한다. 선두광이 대상에 도달한 뒤 네 번의 압력 타격을 발생시키며 몸 자세와 끝 잔광에는 접촉을 붙이지 않는다. 보류한 양손 밀어치기를 사용하지 않는다.',
        steps: poses(beam.endMs, [
            guard(0),
            {
                atMs: 120,
                motion: 'presentation-ki-beam-poses-south-east',
                frame: 0,
                phase: '양손에 파동핵 장전',
                emphasis: 'charge',
            },
            {
                atMs: 900,
                motion: 'presentation-ki-beam-poses-south-east',
                frame: 1,
                phase: '파동포 방출 · 압력 유지',
            },
            {
                atMs: 1700,
                motion: 'presentation-ki-beam-poses-south-east',
                frame: 2,
                phase: '포구 분리 · 발사 반동',
            },
            guard(1880, '파동포 뒤 가드 복귀'),
        ]),
    },
    {
        id: 'ki-crescent',
        title: '광파참',
        summary: '팔의 짧은 휘두름에서 얇은 초승달 기공면을 떼어 날리고 절단 방향으로 흩뜨린다.',
        priority: 'recommended',
        ki: crescent,
        review: '크게 감아치는 훅의 짧은 준비·휘두름에 전용 초승달 그림을 연결한다. 열린 기공면의 밝은 날과 깨진 후면이 다르게 변하고 도착 뒤 두 갈래의 긴 파편으로 흩어진다. 초승달이660ms에 도착할 때만 한 번 명중한다.',
        steps: poses(crescent.endMs, [
            guard(0),
            {
                atMs: 90,
                motion: 'smear-hook-stable-south-east',
                frame: 2,
                phase: '팔을 당겨 초승달 장전',
                emphasis: 'charge',
            },
            {
                atMs: 310,
                motion: 'smear-hook-stable-south-east',
                frame: 3,
                phase: '짧은 휘두름 궤적',
            },
            {
                atMs: 350,
                motion: 'smear-hook-stable-south-east',
                frame: 4,
                phase: '광파참 분리 · 비행',
            },
            {
                atMs: 460,
                motion: 'smear-hook-stable-south-east',
                frame: 6,
                phase: '팔 회수 · 참격 비행',
            },
            {
                atMs: 600,
                motion: 'smear-hook-stable-south-east',
                frame: 7,
                phase: '참격 도달 · 빛 조각 소멸',
            },
            guard(850, '광파참 뒤 가드 복귀'),
        ]),
    },
    {
        id: 'ki-eruption',
        title: '지열파',
        summary: '손에서 바닥으로 보낸 기운이 균열을 따라 전진하고 대상 아래 한 분출에서 세 압력이 솟는다.',
        priority: 'recommended',
        ki: eruption,
        review: '대각 망치주먹의 실측 손점(25,-21)에서 바닥으로 기운을 전달하며 짧은 팔꿈치를 사용하지 않는다. 주먹이 지면에 직접 닿는 것으로 표현하지 않는다. 전진하는 균열과 작은 분출은 장식이고 대상 아래 하나의 큰 분출에 속한 세 압력만 명중 판정한다.',
        steps: poses(eruption.endMs, [
            guard(0),
            {
                atMs: 120,
                motion: 'smear-hammerfist-clean-south-east',
                frame: 1,
                phase: '주먹을 들어 지면기 장전',
            },
            {
                atMs: 230,
                motion: 'smear-hammerfist-clean-south-east',
                frame: 3,
                phase: '손에서 바닥으로 기운을 보내기 전 응축',
                emphasis: 'charge',
            },
            {
                atMs: 620,
                motion: 'smear-hammerfist-clean-south-east',
                frame: 4,
                phase: '대각 하강 · 짧은 변형',
            },
            {
                atMs: 660,
                motion: 'smear-hammerfist-clean-south-east',
                frame: 5,
                phase: '손에서 바닥으로 기운 전달',
            },
            {
                atMs: 880,
                motion: 'smear-hammerfist-clean-south-east',
                frame: 6,
                phase: '균열 전진 · 주먹 회수',
            },
            {
                atMs: 1100,
                motion: 'smear-hammerfist-clean-south-east',
                frame: 7,
                phase: '한 분출의 연속 압력',
            },
            guard(1480, '지열파 뒤 가드 복귀'),
        ]),
    },
    {
        id: 'ki-orbit',
        title: '부유기탄',
        summary: '다른 높이에 배치한 네 기공구를 하나씩 활성화하고 서로 다른 곡선으로 가속 사출한다.',
        priority: 'recommended',
        ki: orbit,
        review: '네 구체의 배치·대기·선택 활성·개별 사출을 구분한다. 공중 준비 위치와 도착 시각은 유지하고 각 탄은 같은 순수 샘플의 가속 곡선으로 날린다. 몸의 주먹에는 접촉이 없으며 각 구체의 실제 도착 한 번씩만 네 타로 센다. 정지 구체·선택 표시·잔광은 타수를 더하지 않는다.',
        steps: poses(orbit.endMs, [
            guard(0),
            { ...punch(120, 11, '네 부유기공 핵 응축'), emphasis: 'charge' },
            punch(900, 0, '부유기탄 대기 · 선택 활성'),
            punch(980, 1, '첫 기공구 사출'),
            punch(1160, 12, '둘째 기공구 사출'),
            punch(1320, 13, '셋째 기공구 사출'),
            punch(1480, 15, '넷째 기공구 사출'),
            guard(1670, '시간차 명중 · 기공구 회수'),
            guard(2200, '부유기탄 뒤 가드 정착'),
        ]),
    },
];
