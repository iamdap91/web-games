import { FinisherSequence } from './finisher-sequence.js';
const dragon = new FinisherSequence();
dragon
    .beat('기합 · 낮게 모은 힘', 'intro', (sequence) => {
    sequence.hold('용호난무 · 짧게 기합을 모으기', 160);
    sequence.move(103, '용호난무 · 공격 거리로 돌입', 150);
})
    .beat('권 · 세 방향으로 열기', 'rush', (sequence) => {
    sequence.attack('jab', { pace: 0.42, contactMs: 40 });
    sequence.attack('straight', { pace: 0.4, contactMs: 40, targetX: 143 });
    sequence.attack('hook', { pace: 0.4, contactMs: 40, targetX: 145 });
    sequence.assist('straight', {
        direction: 'west',
        role: 'echo',
        atMs: sequence.lastHitMs + 65,
        pace: 0.4,
        y: -4,
    });
})
    .beat('각 · 발과 팔꿈치로 압박', 'rush', (sequence) => {
    sequence.attack('high-kick', { pace: 0.38, contactMs: 40, targetX: 145 });
    sequence.attack('horizontal-elbow', {
        pace: 0.36,
        contactMs: 35,
        targetX: 146,
    });
    sequence.attack('jab', { pace: 0.36, contactMs: 35, targetX: 146 });
    sequence.attack('straight', { pace: 0.36, contactMs: 35, targetX: 146 });
    sequence.assist('straight', {
        direction: 'west',
        role: 'echo',
        atMs: sequence.lastHitMs + 65,
        pace: 0.4,
        y: -16,
    });
})
    .beat('난 · 위아래를 바꾸는 권격', 'rush', (sequence) => {
    sequence.attack('hook', { pace: 0.36, contactMs: 35, targetX: 147 });
    sequence.attack('hammer', { pace: 0.36, contactMs: 40, targetX: 147 });
    sequence.attack('jab', { pace: 0.25, contactMs: 35, targetX: 148 });
    sequence.attack('straight', { pace: 0.25, contactMs: 35, targetX: 148 });
    sequence.assist('high-kick', {
        direction: 'west',
        role: 'echo',
        atMs: sequence.lastHitMs + 65,
        pace: 0.4,
    });
})
    .beat('승 · 밀어붙이고 올려치기', 'climax', (sequence) => {
    sequence.attack('straight', { pace: 0.35, contactMs: 45, targetX: 149 });
    sequence.attack('uppercut', {
        pace: 0.55,
        contactMs: 60,
        targetX: 149,
        recoveryMs: 90,
        windupHoldMs: 160,
    });
    sequence.assist('uppercut', {
        direction: 'west',
        role: 'echo',
        atMs: sequence.lastHitMs + 65,
        pace: 0.55,
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
        summary: '권각 난무가 점점 빨라지고 반대편 잔상이 추격한다. 마지막 어퍼컷을 당겨 모은 뒤 두 상승권이 시차를 두고 솟구친다.',
        priority: 'review',
        review: 'SNK 공식 영상1:17~1:21의 근접 발동·난무·상승 마무리를 참고했다. 기술명 식별은 추론이며 정확한 원작 타수·순서 복제는 아니다. 본체의 지상 권각13접촉 뒤 네 개의 서쪽 원본 공격 잔상이65ms 늦게 닿아17타를 만든다. 난무 후반의 잽·스트레이트를 가속하고 마지막 본체 어퍼컷 직전 준비 그림을160ms 더 유지해 상승의 힘을 모은다. 잔상의 준비·돌입·실제 접촉·흩어짐을 독립 시각으로 재생하며 장식 잔상과 구분한다. 마지막 본체 어퍼컷 뒤 반대편 어퍼컷이65ms 늦게 솟고 회수 자세의 여운을 거쳐 정착한다. 보류 동작과 소리는 추가하지 않는다.',
        missingPose: '원작 전용 돌진·난무·상승 자세와 피격 상대가 없어 기존 맨손 공격을 조합한다. 원본 간 얼굴·발 간격 전환과 연속 타격의 리듬은 실제 재생으로 검토하는 시안이다.',
        finisher: {
            theme: 'dragon',
            subtitle: '가속하는 권각 · 응축한 장전 · 시차를 둔 상승권',
            accent: '#d3a54e',
            endGlyph: '龍',
        },
    }),
];
