import { FinisherSequence } from './finisher-sequence.js';
const demon = new FinisherSequence();
demon
    .beat('静 · 눈앞의 기척', 'intro', (sequence) => {
    sequence.hold('순옥살 · 고요하게 힘 모으기', 180);
    sequence.dash(103, '순옥살 · 짧은 돌입', 90);
})
    .beat('暗 · 암중 난타', 'rush', (sequence) => {
    const rounds = [
        { pace: 0.48, contactMs: 45 },
        { pace: 0.4, contactMs: 40 },
        { pace: 0.32, contactMs: 35 },
        { pace: 0.25, contactMs: 35 },
    ];
    for (const [index, round] of rounds.entries()) {
        sequence.attack('one-two', round);
        sequence.assist('straight', {
            direction: 'west',
            atMs: sequence.lastHitMs,
            pace: 0.4,
            y: index % 2 ? -18 : -4,
        });
    }
})
    .beat('連 · 숨 돌릴 틈 없이', 'rush', (sequence) => {
    sequence.attack('horizontal-elbow', { pace: 0.4, contactMs: 40 });
    sequence.attack('hook', { pace: 0.38, contactMs: 40 });
    sequence.attack('one-two', { pace: 0.35, contactMs: 35 });
    sequence.assist('straight', {
        direction: 'east',
        atMs: sequence.lastHitMs - 75,
        y: -22,
        pace: 0.35,
    });
    sequence.assist('high-kick', {
        direction: 'west',
        atMs: sequence.lastHitMs,
        pace: 0.4,
    });
})
    .beat('滅 · 응축한 결정타', 'climax', (sequence) => {
    sequence.attack('uppercut', { pace: 0.5, contactMs: 50 });
    sequence.attack('hammer', { pace: 0.55, contactMs: 60 });
    sequence.attack('straight', {
        pace: 0.45,
        contactMs: 60,
        recoveryMs: 100,
        windupHoldMs: 220,
    });
})
    .beat('天 · 마지막 정적', 'finish', (sequence) => {
    sequence.poseHold('순옥살 · 일격을 거둔 정적', 180);
    sequence.hold('순옥살 · 고요한 종결', 240);
});
const omnislash = new FinisherSequence();
omnislash
    .beat('분리 · 공격의 기점', 'intro', (sequence) => {
    sequence.hold('초구무신패참 ver.5 · 맨손으로 힘 모으기', 180);
    sequence.dash(112, '초구무신패참 ver.5 · 첫 돌입', 120);
})
    .beat('일섬 · 첫 접근', 'rush', (sequence) => {
    sequence.attack('straight', { pace: 0.5, contactMs: 45 });
})
    .beat('교차 · 표적을 가르는 세 궤도', 'rush', (sequence) => {
    sequence.cross(218, -30, '초구무신패참 · 표적 위를 넘어 오른쪽으로', 150);
    sequence.attack('straight', {
        direction: 'west',
        pace: 0.55,
        contactMs: 45,
        y: -18,
    });
    sequence.cross(50, -40, '초구무신패참 · 왼쪽 상공으로 역횡단', 125);
    sequence.attack('straight', {
        direction: 'east',
        pace: 0.55,
        contactMs: 45,
        y: -24,
    });
    sequence.cross(215, -12, '초구무신패참 · 낮은 대각선으로 재횡단', 105);
    sequence.attack('high-kick', {
        direction: 'west',
        pace: 0.55,
        contactMs: 45,
    });
})
    .beat('정점 · 다섯 번째 궤도', 'climax', (sequence) => {
    sequence.cross(74, -12, '초구무신패참 · 마지막 상승의 기점으로', 150);
    sequence.attack('uppercut', { pace: 0.6, contactMs: 50, y: -10 });
    sequence.cross(102, -42, '초구무신패참 ver.5 · 마지막 정점으로 상승', 160);
    sequence.poseHold('초구무신패참 ver.5 · 낙하 전 정점의 한 박자', 120);
    sequence.attack('hammer', {
        pace: 0.7,
        contactMs: 60,
        recoveryMs: 80,
        windupHoldMs: 180,
        y: -24,
        endY: -4,
    });
    sequence.land('초구무신패참 ver.5 · 무릎으로 착지 받기');
})
    .beat('종결 · 착지 뒤의 정적', 'finish', (sequence) => {
    sequence.poseHold('초구무신패참 ver.5 · 착지를 받은 여운', 180);
    sequence.hold('초구무신패참 ver.5 · 착지 뒤 수습', 180);
});
const drunkenTiger = new FinisherSequence();
drunkenTiger
    .beat('취 · 한 걸음 내주기', 'intro', (sequence) => {
    sequence.hold('초구취호패타 · 취권의 느슨한 대치', 180);
    sequence.move(58, '초구취호패타 · 후퇴로 유인', 180);
})
    .beat('호 · 가까이 파고들기', 'rush', (sequence) => {
    sequence.attack('one-two', { pace: 0.6, contactMs: 40 });
    sequence.attack('hammer', { pace: 0.65, contactMs: 50 });
})
    .beat('패 · 몸통을 감는 두 타', 'rush', (sequence) => {
    sequence.attack('horizontal-elbow', { pace: 0.45, contactMs: 45 });
    sequence.assist('straight', {
        direction: 'west',
        atMs: sequence.lastHitMs,
        pace: 0.55,
        y: -3,
    });
    sequence.assist('straight', {
        direction: 'east',
        atMs: sequence.lastHitMs,
        pace: 0.55,
        y: -22,
    });
    sequence.attack('hook', { pace: 0.4, contactMs: 45 });
    sequence.cross(196, 0, '초구취호패타 · 표적 뒤를 감아 반대편으로', 180);
    sequence.attack('straight', {
        direction: 'west',
        pace: 0.4,
        contactMs: 45,
    });
})
    .beat('타 · 올리고 내리기', 'climax', (sequence) => {
    sequence.cross(100, -10, '초구취호패타 · 낮게 미끄러져 다시 파고들기', 150);
    sequence.attack('uppercut', { pace: 0.65, contactMs: 55 });
    sequence.attack('air-kick', { pace: 0.6, contactMs: 45 });
    sequence.attack('elbow-down', { pace: 0.65, contactMs: 55 });
    sequence.attack('hammer', {
        pace: 0.7,
        contactMs: 60,
        recoveryMs: 85,
        windupHoldMs: 200,
    });
    sequence.assist('high-kick', {
        direction: 'west',
        atMs: sequence.lastHitMs,
        pace: 0.55,
    });
    sequence.assist('straight', {
        direction: 'east',
        atMs: sequence.lastHitMs,
        pace: 0.55,
        y: -20,
    });
})
    .beat('호 · 두 발을 디딘 종결', 'finish', (sequence) => {
    sequence.poseHold('초구취호패타 · 협공을 거둔 여운', 180);
    sequence.hold('초구취호패타 · 두 발을 디딘 정착', 240);
});
export const cinematicFinishers = [
    demon.build({
        id: 'finisher-demon',
        title: '순옥살 · 21타',
        summary: '어둠 속 좌우 협공이 점점 빨라진다. 마지막 주먹을 당겨 고요히 모았다가 한 번에 쏟고 여운을 남긴다.',
        priority: 'review',
        review: '공식 영상의 고요한 준비·암중 난타·정적 종결을 참고한 맨손 재해석이다. 본체15접촉에 실제 동·서쪽 원본의 공격 분신6접촉을 더했다. 네 묶음의 원투를 점차 가속하고 마지막 스트레이트 직전의 장전 그림을220ms 더 유지해 정적과 폭발을 나눈다. 다섯 번의 좌우 동시 타격과 상단 추격을 서로 다른 시점에 배치한다. 분신도 준비·접촉·회수를 재생하고 같은 고정 표적에 닿는다. 21타는 조합실용 설계이며 원작의 정확한 타수나 안무를 복제한 것은 아니다.',
        missingPose: '원작 전용 발동·등돌림·天 자세 그림과 잡기 상대는 없다. 기존 그림을 조합한 연출 비교 시안이며 tiger-rpg 본게임 판정을 옮기지 않는다.',
        finisher: {
            theme: 'demon',
            subtitle: '가속하는 암중 협공 · 장전의 정적 · 마지막 일격',
            accent: '#b53a47',
            endGlyph: '天',
        },
    }),
    omnislash.build({
        id: 'finisher-omnislash-v5',
        title: '초구무신패참 ver.5 · 6타',
        summary: '좌우와 상공의 교차가 점점 빨라진다. 정점에서 멈춰 망치주먹을 모은 뒤 내려치고 착지의 여운을 잇는다.',
        priority: 'review',
        review: 'AC 비교 영상의 다중 높이 교차·정점·하강·착지를 맨손6타로 재해석했다. 실제 동·서쪽 정권과 서쪽 하이킥을 사용해 오른쪽→왼쪽→오른쪽으로 표적을 횡단하며, 이동 중 최대42px 높이로 상승한다. 교차 이동은150→125→105ms로 가속하고 마지막 망치주먹의 준비 그림을180ms 더 유지한 뒤 내려친다. 원본 그림을 반전하거나 회전하지 않는다. 푸른 궤적은 실제 지난 몸 위치를 잇고 명중은 손발 접촉에서만 센다. 정확한 원작 타수는 확인하지 않았으며 분리검과 검 회수는 재현하지 않는다.',
        missingPose: '분리검·검 회수·전용 공중 검격·수직 낙하 자세가 없다. 기존 팔꿈치·훅·스트레이트·어퍼컷·망치 그림을 사용하는 맨손 재해석이다.',
        finisher: {
            theme: 'omnislash',
            subtitle: '가속하는 교차 궤도 · 정점의 장전 · 하강과 착지',
            accent: '#4f95c7',
            endGlyph: '終',
        },
    }),
    drunkenTiger.build({
        id: 'finisher-drunken-tiger',
        title: '초구취호패타 · 14타',
        summary: '느슨한 유인 뒤 갑자기 빨라져 표적 뒤를 감는다. 장전·하강 그림의 팔꿈치는 중간에 잇고 망치주먹의 삼면 협공으로 끝낸다.',
        priority: 'review',
        review: '기존 본게임의 균등 피해 이벤트를 복사하지 않고 본체10타·분신4타로 다시 구성했다. 느슨한 첫 원투와 망치 뒤 가로 팔꿈치·훅·반대편 정권을 가속해 완급을 나눈다. 후퇴 유인→근접 권격→본체·좌우 분신의 동시 세 타→표적 뒤로 횡단한 서쪽 정권→상하 연격→마지막 세 방향 협공으로 구분한다. 짧은 내려치기는 전용 장전·하강 그림과 접촉 좌표를 필수 적용해 중간 연격에만 사용한다. 마지막은 대각 망치주먹으로 바꾸고 준비 그림을200ms 더 유지하며 동시 협공의 명중 시점은 함께 이동한다. 분신의 접촉도 개별 타격 탐색·샌드백·카운터에 반영한다. 보류 세 동작의 모든 그림을 제외하며 본게임 피해·분노 규칙과 소리는 추가하지 않는다.',
        missingPose: '취권 전용 휘청임·적을 넘기는 던지기·전용 종결 그림은 없다. 서로 다른 원본의 얼굴·발 간격 전환은 실제 재생으로 비교해야 한다.',
        finisher: {
            theme: 'drunken-tiger',
            subtitle: '느슨한 유인 · 급격한 연격 · 응축한 삼면 협공',
            accent: '#cb8742',
            endGlyph: '虎',
        },
    }),
];
