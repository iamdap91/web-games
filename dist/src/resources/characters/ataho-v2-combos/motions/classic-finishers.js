import { finisherAttack, FinisherSequence, } from './finisher-sequence.js';
/** 공통 단발의 최소 박자에 묶이지 않고 이 난무의 준비·접촉·회수 시간을 정한다. */
function pressureAttack(sequence, kind, options) {
    const { timings, ...attackOptions } = options;
    const source = finisherAttack(kind, attackOptions);
    if (source.length !== timings.length)
        throw new Error(`용호난무의 원본 자세와 박자 수가 다릅니다: ${kind}`);
    if (options.approachMs !== undefined)
        sequence.move(source[0].x, '용호난무 · 두 번째 권격으로 발 디딤', options.approachMs);
    sequence.append(source.map((step, index) => ({ ...step, durationMs: timings[index] })));
}
const dragon = new FinisherSequence();
dragon
    .beat('기합 · 낮게 모은 힘', 'intro', (sequence) => {
    sequence.hold('용호난무 · 짧게 기합을 모으기', 160);
    sequence.move(103, '용호난무 · 공격 거리로 돌입', 150);
})
    .beat('권 · 본체로 세 번 누르기', 'rush', (sequence) => {
    // 첫 세 타는 접촉 뒤 몸을 거두는 시간을 남겨 후반의 짧은 회수와 대비한다.
    pressureAttack(sequence, 'jab', {
        firstTargetX: 132,
        timings: [95, 35, 55, 85],
    });
    pressureAttack(sequence, 'straight', {
        targetX: 143,
        approachMs: 75,
        timings: [65, 55, 55, 60, 55],
    });
    pressureAttack(sequence, 'hook', {
        targetX: 145,
        timings: [65, 25, 50, 40, 45],
    });
})
    .beat('각 · 틈을 좁히는 압박', 'rush', (sequence) => {
    // 접촉 원화의 길이는 유지하고 준비·회수만 단계적으로 압축한다.
    pressureAttack(sequence, 'high-kick', {
        targetX: 145,
        timings: [30, 26, 22, 20, 45, 18, 18],
    });
    pressureAttack(sequence, 'horizontal-elbow', {
        targetX: 146,
        timings: [22, 20, 16, 40, 16, 16, 16],
    });
    // 첫 분신은 초반 세 타가 끝난 뒤 중반 압박 사이에 늦게 끼어든다.
    sequence.assist('straight', {
        direction: 'west',
        role: 'echo',
        atMs: sequence.lastHitMs + 80,
        approachMs: 90,
        pace: 0.46,
        contactMs: 45,
        y: -4,
    });
    pressureAttack(sequence, 'jab', {
        targetX: 146,
        timings: [22, 16, 35, 16],
    });
    pressureAttack(sequence, 'straight', {
        targetX: 146,
        timings: [18, 16, 35, 14, 14],
    });
})
    .beat('난 · 엇박이 겹치는 폭주', 'rush', (sequence) => {
    pressureAttack(sequence, 'hook', {
        targetX: 147,
        timings: [16, 14, 35, 14, 14],
    });
    pressureAttack(sequence, 'hammer', {
        targetX: 147,
        timings: [18, 18, 12, 35, 12, 12],
    });
    sequence.assist('straight', {
        direction: 'west',
        role: 'echo',
        atMs: sequence.lastHitMs + 24,
        approachMs: 55,
        pace: 0.28,
        contactMs: 35,
        y: -16,
    });
    pressureAttack(sequence, 'jab', {
        targetX: 148,
        timings: [14, 12, 35, 12],
    });
    // 분신의 킥이 본체 잽보다 먼저 닿아 고른 교대 대신 짧은 겹침을 만든다.
    sequence.assist('high-kick', {
        direction: 'west',
        role: 'echo',
        atMs: sequence.lastHitMs - 8,
        approachMs: 45,
        pace: 0.22,
        contactMs: 35,
    });
    pressureAttack(sequence, 'straight', {
        targetX: 148,
        timings: [12, 12, 35, 12, 12],
    });
})
    .beat('승 · 압박을 모아 상승권', 'climax', (sequence) => {
    pressureAttack(sequence, 'straight', {
        targetX: 149,
        timings: [12, 12, 45, 12, 16],
    });
    pressureAttack(sequence, 'uppercut', {
        targetX: 149,
        windupHoldMs: 160,
        timings: [35, 22, 160, 20, 60, 30, 30, 80],
    });
    sequence.assist('uppercut', {
        direction: 'west',
        role: 'echo',
        atMs: sequence.lastHitMs + 48,
        approachMs: 75,
        pace: 0.4,
        contactMs: 60,
    });
})
    .beat('정 · 발을 디딘 여운', 'finish', (sequence) => {
    sequence.poseHold('용호난무 · 상승권을 거둔 여운', 180);
    sequence.hold('용호난무 · 오른 주먹을 거두고 정착', 140);
});
export const classicFinishers = [
    dragon.build({
        id: 'finisher-ryuko-ranbu',
        title: '용호난무 · 17타',
        summary: '처음은 본체의 묵직한 세 타로 누르고 회수를 점점 좁힌다. 중반에 끼어든 분신이 후반의 짧은 엇박·겹침으로 압박을 높이고 마지막 두 상승권으로 거둔다.',
        priority: 'review',
        review: 'SNK 공식 영상1:17~1:21의 근접 발동·난무·상승 마무리를 참고했다. 기술명 식별은 추론이며 정확한 원작 타수·순서 복제는 아니다. 기존 본체13접촉과 서쪽 원본 공격 분신4접촉으로17타를 유지한다. 초반 세 타의 접촉55·55·50ms는 유지하고 회수85ms·115ms·85ms를 남긴다. 중반 팔꿈치·권격의 회수는48→16→28ms, 후반 권격은28→24→12→24ms로 좁혀 접촉35~45ms가 빠른 연결 속에서도 읽히게 한다. 분신은 중반 팔꿈치 뒤80ms, 후반 망치 뒤24ms, 잽보다8ms 먼저, 마지막 상승권 뒤48ms로 고른 등장 주기를 깨뜨린다. 후반 두 분신은 짧은 간격으로 함께 압박하며 각자의 준비·돌입·실제 접촉·흩어짐을 절대 시각에서 재생한다. 마지막 본체 어퍼컷 직전160ms 장전은 남기고 시차 상승권 뒤 회수 자세의 여운을 거쳐 정착한다. 장식 잔상은 기존2~3겹·90~130ms의 절제값을 유지하며 보류 동작과 소리는 추가하지 않는다.',
        missingPose: '원작 전용 돌진·난무·상승 자세와 피격 상대가 없어 기존 맨손 공격을 조합한다. 후반12~24ms로 줄인 연결 자세와 원본 간 얼굴·발 간격 전환이 자연스럽게 읽히는지는 실제 재생으로 검토해야 한다.',
        finisher: {
            theme: 'dragon',
            subtitle: '묵직한 세 타 · 좁아지는 회수 · 엇박 압박 · 시차 상승권',
            accent: '#d3a54e',
            endGlyph: '龍',
        },
    }),
];
