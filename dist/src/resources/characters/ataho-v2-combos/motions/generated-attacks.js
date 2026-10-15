import { guard, oneTwo, recover } from './attack-phrases.js';
const directions = [
    { id: 'south-east', label: '남동쪽' },
    { id: 'north-east', label: '북동쪽' },
];
// 접촉 효과는 88px 원본의 pivot x44와 알파 24 초과 최하단을 기준으로 둔다.
// 팔꿈치는 뚜렷한 끝점 대신 실제로 보이는 접힌 팔의 바깥 윤곽을 후보로 쓴다.
const techniques = [
    {
        id: 'front-push-kick',
        title: '앞 밀어차기',
        frames: [0, 2, 3, 4, 5, 6, 7, 8, 0],
        durations: [100, 90, 50, 110, 50, 55, 70, 90, 140],
        contactFrame: 4,
        contactKind: 'kick',
        contactPositions: {
            // 원본 발 좌표 (72, 57), feetY 75.
            'south-east': { height: 18, reach: 28 },
            // 원본 발 좌표 (67, 35), feetY 73.
            'north-east': { height: 38, reach: 23 },
        },
        summary: '무릎을 모아 앞쪽으로 발을 내밀고 같은 다리를 거둔다.',
        review: 'Evolve의 앞 밀어차기 시범을 동작 설명에 반영한 새 원본이다. 0·1번의 같은 준비 그림은 한 번만 쓰고 4번을 접촉으로 유지한다. 실제 발 뻗음·골반 추진·지지발 변화가 밀어차기로 읽히는지 효과 없이 비교한다.',
    },
    {
        id: 'horizontal-elbow',
        title: '가로 팔꿈치 치기',
        frames: [0, 2, 3, 4, 5, 4, 3, 2, 0],
        durations: [100, 80, 70, 40, 100, 60, 60, 80, 140],
        contactFrame: 5,
        contactKind: 'elbow',
        contactPositions: {
            // 접힌 팔 윤곽 (60, 44), feetY 75.
            'south-east': { height: 31, reach: 16 },
            // 접힌 팔 윤곽 (56, 43), feetY 73.
            'north-east': { height: 30, reach: 12 },
        },
        summary: '팔을 접어 몸통 앞을 가로지른 뒤 같은 자세를 되짚어 회수한다.',
        review: 'Evolve의 수평 팔꿈치 설명을 반영한 생성 시안이다. 접은 팔의 5번을 타격 후보로 두고 4→3→2번으로 거둔다. 몸통 회전과 팔꿈치 돌출이 작아 짧은 팔 모으기로 보일 수 있다. 타격 효과가 없는 상태에서 원래 내려치기와 다른 공격으로 읽히는지 사용자 검토가 필요하다.',
    },
    {
        id: 'double-palm',
        title: '양손 밀어치기',
        frames: [0, 2, 3, 4, 5, 6, 5, 4, 3, 2, 0],
        durations: [100, 80, 70, 60, 45, 110, 50, 55, 60, 70, 140],
        contactFrame: 6,
        contactKind: 'palm',
        contactPositions: {
            // 앞쪽 손 윤곽 (71, 42), feetY 75.
            'south-east': { height: 33, reach: 27 },
            // 앞쪽 손 윤곽 (72, 39), feetY 73.
            'north-east': { height: 34, reach: 28 },
        },
        summary: '체중을 싣고 두 손바닥을 함께 내민 뒤 팔과 몸통을 거둔다.',
        review: 'Shaolin Wahnam의 양손 밀어치기 준비·접촉 사진을 참고한 생성 시안이다. 원본 끝에도 손이 앞에 남아 있어 6번 이후 같은 5→4→3→2번을 역순으로 재생해 회수를 만든다. 두 손이 구분되는지, 체중 이동과 뻗는 거리가 충분한지는 실제 GIF로 판단한다.',
    },
    {
        id: 'visible-low-sweep',
        title: '발이 보이는 하단 쓸기',
        frames: [0, 2, 3, 4, 5, 6, 7, 8, 0],
        durations: [100, 90, 60, 110, 55, 60, 80, 100, 140],
        contactFrame: 4,
        contactKind: 'sweep',
        contactPositions: {
            // 뻗은 발 (17, 70), feetY 75. 두 방향 모두 화면 왼쪽으로 쓴다.
            'south-east': { height: 5, reach: -27 },
            // 뻗은 발 (22, 61), feetY 75.
            'north-east': { height: 14, reach: -22 },
        },
        summary: '몸을 낮추며 밖으로 드러난 다리를 낮게 쓸고 일어선다.',
        review: 'Xing Long 학교의 낮은 쓸기 시범을 참고한 생성 시안이다. 4번의 몸 밖으로 나온 발을 타격 후보로 유지한다. 기존 쓸기보다 다리는 드러나지만 몸을 낮추는 폭과 지지발의 회전·접지가 충분한지는 별도 검토한다.',
    },
];
export const generatedAttacks = techniques.flatMap((technique) => directions.map((direction) => {
    const source = `${technique.id}-${direction.id}`;
    return {
        id: `new-${source}`,
        title: `${technique.title} · ${direction.label}`,
        summary: technique.summary,
        priority: 'review',
        review: technique.review,
        steps: technique.frames.map((frame, index) => ({
            motion: source,
            frame,
            durationMs: technique.durations[index],
            x: 0,
            y: 0,
            anchor: 'feet',
            phase: index === 0
                ? '준비'
                : index === technique.frames.length - 1
                    ? '기립 복귀'
                    : frame === technique.contactFrame &&
                        index === technique.frames.indexOf(technique.contactFrame)
                        ? `1타 · ${technique.title} 접촉 후보`
                        : index < technique.frames.indexOf(technique.contactFrame)
                            ? '공격 준비와 진입'
                            : '타격 여운과 회수',
            contact: frame === technique.contactFrame &&
                index === technique.frames.indexOf(technique.contactFrame)
                ? {
                    kind: technique.contactKind,
                    ...technique.contactPositions[direction.id],
                }
                : undefined,
        })),
    };
}));
function attack(id) {
    const source = generatedAttacks.find((motion) => motion.id === `new-${id}-south-east`);
    if (!source)
        throw new Error(`새 공격 구간이 없습니다: ${id}`);
    // 새 원본의 준비·회수는 남기고 처음과 끝 기립만 기존 가드에 연결한다.
    return source.steps.slice(1, -1);
}
export const hybridAttacks = [
    {
        id: 'one-two-horizontal-elbow',
        title: '원투 → 가로 팔꿈치 · 3타',
        summary: '기존 두 펀치 뒤 새로 만든 수평 팔꿈치 구간을 잇는다.',
        priority: 'review',
        review: '남동쪽 원투와 같은 방향으로 생성한 팔꿈치만 연결한다. 공격 중 발 위치는 고정하지만 새 원본의 얼굴·몸 크기와 접힌 팔의 윤곽 전환은 남는다. 원투 뒤 준비와 가드 복귀가 자연스러운지는 효과 없는 GIF로 비교한다.',
        steps: [
            guard(0),
            ...oneTwo(0),
            ...attack('horizontal-elbow').map((step) => ({
                ...step,
                phase: step.contact ? '3타 · 가로 팔꿈치 접촉 후보' : step.phase,
            })),
            ...recover(0),
        ],
    },
    {
        id: 'push-kick-reentry-one-two',
        title: '앞 밀어차기 → 재진입 원투 · 3타',
        summary: '새 앞차기를 거둔 뒤 짧게 다시 접근해 기존 원투를 잇는다.',
        priority: 'review',
        review: '같은 남동쪽 앞차기와 기존 달리기·원투를 연결한다. 킥 회수와 발 내림을 마친 뒤에만 재진입하며 원투 두 타 동안 x22에 고정한다. 원본끼리 몸 크기·얼굴·발 간격이 다르므로 연결 검토 시안이다. 상대를 밀어내는 전투 판정은 만들지 않는다.',
        steps: [
            guard(0),
            ...attack('front-push-kick'),
            ...[0, 1, 2, 3].map((frame, index) => ({
                motion: 'running-4-frames-south-east',
                frame,
                durationMs: 55,
                x: [0, 7, 15, 22][index],
                y: 0,
                anchor: 'feet',
                phase: '앞차기 뒤 재진입',
            })),
            ...oneTwo(22, 2),
            ...recover(22),
        ],
    },
];
