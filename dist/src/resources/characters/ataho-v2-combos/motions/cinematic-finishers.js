import { finisherAuthoringTargetX } from '../finisher-actors.js';
import { finisherAttack, FinisherSequence } from './finisher-sequence.js';
import { drunkenTigerFinisher } from './drunken-tiger-finisher.js';
import { impactAttacks } from './impact-attacks.js';
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
    const smash = impactAttacks.find((motion) => motion.id === 'aerial-smash');
    const contact = smash?.steps.find((step) => step.contact);
    if (!smash || !contact?.contact?.reach)
        throw new Error('순옥살 끝타의 공중 양손 내려찍기 원본이 없습니다.');
    // 낮은 실제 손끝은 그대로 두고, 그 접촉점만 고정 표적의 x에 맞춘다.
    const xOffset = finisherAuthoringTargetX - contact.x - contact.contact.reach;
    const hammer = finisherAttack('hammer', { pace: 0.55, contactMs: 60 });
    sequence.move(hammer[0].x, '순옥살 · 망치주먹으로 발 디딤', 100);
    // 앞타의 회수에서 후퇴를 마쳐, 도약 전에 다시 걷고 멈추는 박자를 없앤다.
    sequence.append(hammer.map((step, index) => index === hammer.length - 1
        ? {
            ...step,
            x: smash.steps[0].x + xOffset,
            phase: '순옥살 · 팔을 거두며 도약 거리로 중심 옮기기',
        }
        : step));
    const launchTimings = [25, 40, 45, 90, 35, 100];
    const launchHeights = [0, 0, 0, -34, -60, -52];
    sequence.append(smash.steps.map((step, index) => ({
        ...step,
        x: step.x + xOffset,
        y: launchHeights[index] ?? step.y,
        durationMs: launchTimings[index] ?? step.durationMs,
        movementCurve: step.frame === 3
            ? { x: 'ease-in', y: 'ease-in' }
            : step.movementCurve,
        phase: step.frame === 3
            ? '순옥살 · 양손을 모은 채 정점을 지나 급강하'
            : `순옥살 · ${step.phase.replace(/^\d+타 · /, '')}`,
    })));
})
    .beat('天 · 마지막 정적', 'finish', (sequence) => {
    sequence.poseHold('순옥살 · 일격을 거둔 정적', 180);
    sequence.poseHold('순옥살 · 두 발을 디딘 고요한 종결', 240);
});
const omnislash = new FinisherSequence({ relocation: 'teleport' });
omnislash
    .beat('분리 · 공격의 기점', 'intro', (sequence) => {
    sequence.hold('초구무신패참 ver.5 · 맨손으로 힘 모으기', 180);
})
    .beat('일섬 · 첫 접근', 'rush', (sequence) => {
    sequence.attack('straight', { pace: 0.5, contactMs: 45, approachMs: 110 });
})
    .beat('교차 · 표적을 가르는 세 궤도', 'rush', (sequence) => {
    sequence.attack('straight', {
        direction: 'west',
        pace: 0.55,
        contactMs: 45,
        y: -18,
        approachMs: 100,
    });
    sequence.attack('straight', {
        direction: 'east',
        pace: 0.55,
        contactMs: 45,
        y: -24,
        approachMs: 90,
    });
    sequence.attack('high-kick', {
        direction: 'west',
        pace: 0.55,
        contactMs: 45,
        approachMs: 80,
    });
})
    .beat('정점 · 교차 뒤 응축한 상승 일격', 'climax', (sequence) => {
    sequence.attack('uppercut', {
        pace: 0.6,
        contactMs: 50,
        y: -10,
        approachMs: 90,
    });
    // 동쪽 원본4의 주먹끝(60,24)을 발81·중심48에 맞추며 공통 어퍼 판정은 바꾸지 않는다.
    const uppercutPose = {
        motion: 'surprise-uppercut-east',
        x: finisherAuthoringTargetX - 12,
        y: 0,
        anchor: 'feet',
        movementCurve: { x: 'hold', y: 'hold' },
    };
    sequence.append([
        {
            ...uppercutPose,
            motion: 'surprise-uppercut-south-east',
            frame: 6,
            x: sequence.x,
            y: -10,
            durationMs: 27.5,
            teleport: 'vanish',
            phase: '6타 앞 · 순간이동 · 공중 상승권의 기척 소실',
        },
        {
            ...uppercutPose,
            frame: 0,
            durationMs: 55,
            teleport: 'hidden',
            phase: '6타 앞 · 순간이동 · 몸이 사라진 공백',
        },
        {
            ...uppercutPose,
            frame: 0,
            durationMs: 27.5,
            teleport: 'appear',
            phase: '6타 앞 · 순간이동 · 표적 옆 지상에 재등장',
        },
        {
            ...uppercutPose,
            frame: 0,
            durationMs: 50,
            phase: '초구무신패참 ver.5 · 지상에서 발을 고정하기',
        },
        {
            ...uppercutPose,
            frame: 1,
            durationMs: 300,
            emphasis: 'charge',
            phase: '초구무신패참 ver.5 · 동쪽 상승권을 모으기',
        },
        {
            ...uppercutPose,
            frame: 1,
            durationMs: 45,
            phase: '초구무신패참 ver.5 · 응축한 주먹을 풀기 직전',
        },
        {
            ...uppercutPose,
            frame: 2,
            durationMs: 35,
            phase: '초구무신패참 ver.5 · 지상에서 주먹을 올리기',
        },
        {
            ...uppercutPose,
            frame: 3,
            durationMs: 35,
            phase: '초구무신패참 ver.5 · 몸통으로 상승권을 밀어 올리기',
        },
        {
            ...uppercutPose,
            frame: 4,
            durationMs: 70,
            contact: { kind: 'punch', reach: 12, height: 57 },
            phase: '초구무신패참 ver.5 · 모아친 동쪽 상승 일격',
        },
        {
            ...uppercutPose,
            frame: 5,
            durationMs: 90,
            phase: '초구무신패참 ver.5 · 상승권의 주먹을 거두기',
        },
        {
            ...uppercutPose,
            frame: 6,
            durationMs: 110,
            phase: '초구무신패참 ver.5 · 지상 가드로 되돌아오기',
        },
    ]);
})
    .beat('종결 · 지상 가드의 정적', 'finish', (sequence) => {
    sequence.poseHold('초구무신패참 ver.5 · 상승권을 거둔 지상 가드', 260);
    sequence.poseHold('초구무신패참 ver.5 · 두 발로 버티는 여운', 180);
});
export const cinematicFinishers = [
    demon.build({
        id: 'finisher-demon',
        title: '순옥살 · 21타',
        summary: '어둠 속 좌우 협공이 점점 빨라진다. 마지막 회수에서 바로 높이 도약하고, 양손을 모은 채 정점을 지나 급강하한 뒤 착지와 정적으로 끝낸다.',
        priority: 'review',
        review: '공식 영상의 고요한 준비·암중 난타·정적 종결을 참고한 맨손 재해석이다. 본체15타와 실제 공격 분신6타를 합친21타 구성이며 첫20타의 순서와 시각은 유지한다. 끝타는 기존 공중 양손 내려찍기0~8번 그림을 재사용하고, 앞 망치주먹의70ms 회수에서 도약 거리로 중심을 옮긴다. 중복 준비를65ms로 줄이고135ms 동안 높이60까지 상승한 뒤35ms 정점 통과와100ms 하강을 이어20→21타 간격을750ms에서465ms로 좁힌다. 정점에 멈추지 않으며 실제 손끝 접촉과 착지·회수·종결의 여운은 유지한다.',
        missingPose: '원작 전용 발동·등돌림·天 자세 그림과 잡기 상대는 없다. 도약 직전 다리가 완전히 펴진 그림도 없어 기존 준비·공중 자세와 좌표 이동으로 높은 궤적을 잇는다. 기존 그림을 조합한 연출 비교 시안이며 tiger-rpg 본게임 판정을 옮기지 않는다.',
        finisher: {
            theme: 'demon',
            subtitle: '가속하는 암중 협공 · 높은 도약과 급강하 · 내려찍기와 착지의 정적',
            accent: '#b53a47',
            endGlyph: '天',
        },
    }),
    omnislash.build({
        id: 'finisher-omnislash-v5',
        title: '초구무신패참 ver.5 · 6타',
        summary: '몸이 짧게 사라졌다가 표적의 좌우·상공에 번갈아 재등장한다. 마지막은 지상에서 주먹을 오래 모아 동쪽 상승권을 꽂고 가드의 여운으로 끝낸다.',
        priority: 'review',
        review: '첫5타의 실제 동·서쪽 정권·서쪽 하이킥·남동 상승권과 접촉 시각을 유지하고, 각 공격 준비 위치로 소실→공백→재등장한다. 공격마다 화면 고정 균열을 누적하고 마지막 상승권에서 화면 유리를 파쇄한다. 이동과 장전의 사각 틀은 사용하지 않는다. 기존 Hit 공식 영상에서 확인한 짧은 소실·재등장을 참고했으며 원작 게임이나 코드 실행은 하지 않았다. 마지막은 공중 망치주먹 대신 지상에 재등장한 동쪽 어퍼컷 원본0~6을 쓴다. 준비 원본1을300ms 유지하고 원본2·3을각35ms로 잇는 뒤 원본4의 실제 주먹끝(60,24), 발81, 중심48에 reach12·height57의 한 접촉을 맞춘다. 남동 공중 상승권과 지상 장전·몸 방향·완급을 대비하고 동쪽 가드로 종결한다. 원본 그림을 늘이거나 반전·회전하지 않으며 총6타를 유지한다. 정확한 원작 타수는 확인하지 않았고 분리검과 검 회수는 재현하지 않는다.',
        missingPose: '분리검·검 회수·전용 공중 검격·수직 낙하 자세가 없다. 기존 정권·하이킥·남동과 동쪽 어퍼컷을 사용하는 맨손 재해석이며 마지막은 검의 하강 대신 지상 상승권으로 재구성했다.',
        finisher: {
            theme: 'omnislash',
            subtitle: '소실과 재등장 · 지상에서 응축한 상승권 · 가드의 여운',
            accent: '#4f95c7',
            endGlyph: '終',
        },
    }),
    drunkenTigerFinisher,
];
