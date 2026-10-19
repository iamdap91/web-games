import { finisherAuthoringTargetX } from '../finisher-actors.js';
import { FinisherSequence, finisherGuard } from './finisher-sequence.js';
import { groundKickSteps } from './kick-additions.js';
import { groundSpinMotion } from './ground-spin.js';
const kickReach = 27;
const kickX = finisherAuthoringTargetX - kickReach;
const openingX = 132 - 12;
const flipContactReach = 19;
const flipX = finisherAuthoringTargetX - flipContactReach;
const reverseKickReach = 30 - 48;
const reverseKickHeight = 81 - 45;
const reverseKickX = finisherAuthoringTargetX - reverseKickReach;
function openingSpin() {
    const durations = [45, 50, 35, 30, 55, 25, 35, 45];
    return groundSpinMotion.steps.slice(1, 9).map((step, index) => ({
        ...step,
        x: openingX,
        y: 0,
        durationMs: durations[index],
        phase: step.contact
            ? '봉황천무각 · 발을 접어 짧게 여는 지상 회전각'
            : `봉황천무각 · 첫 지상각 · ${step.phase}`,
        movementCurve: { x: 'hold', y: 'hold' },
    }));
}
function highKick(options) {
    const label = options.kind === 'air'
        ? '낮은 도약의 공중 연각'
        : '앞으로 뻗는 두 번째 지상각';
    return groundKickSteps.map((step) => ({
        ...step,
        x: kickX,
        y: options.kind === 'air' ? options.bodyArcY[step.frame] : 0,
        durationMs: options.durations[step.frame],
        contact: step.contact
            ? {
                ...step.contact,
                heightReference: options.kind === 'air' ? 'body' : 'ground',
            }
            : undefined,
        phase: step.contact
            ? `봉황천무각 · ${label}`
            : `봉황천무각 · ${label} · ${step.phase.replace(/^.*? · /, '')}`,
        movementCurve: step.contact ? { x: 'hold', y: 'hold' } : undefined,
    }));
}
function lowTakeOff() {
    return [
        { frame: 2, y: 0, durationMs: 55, phase: '무릎을 접어 낮은 도약 준비' },
        { frame: 3, y: -2, durationMs: 35, phase: '발로 지면을 짧게 밀기' },
        { frame: 4, y: -6, durationMs: 35, phase: '상체를 펴며 낮게 떠오르기' },
    ].map((pose) => ({
        ...pose,
        motion: 'jumping-1-south-east',
        x: kickX,
        anchor: 'feet',
        phase: `봉황천무각 · ${pose.phase}`,
    }));
}
/** 뒤집힌 머리가 아니라 실제 오른발이 올라오는 원본6에만 한 접촉을 둔다. */
function attackingBackflip() {
    const poses = [
        {
            frame: 3,
            dx: 12,
            y: -12,
            durationMs: 35,
            anchor: 'feet',
            phase: '공중 연각을 거두고 몸 접기',
        },
        {
            frame: 4,
            dx: 9,
            y: -11,
            durationMs: 40,
            anchor: { x: 45, y: 78 },
            phase: '한 번만 뒤로 젖히기',
        },
        {
            frame: 5,
            dx: 5,
            y: -9,
            durationMs: 35,
            anchor: { x: 44, y: 85 },
            phase: '오른발을 앞으로 돌려 올리기',
        },
        {
            frame: 6,
            dx: 0,
            y: -7,
            durationMs: 60,
            anchor: { x: 42, y: 89 },
            phase: '공중 전환의 뒤돌려차기',
        },
        {
            frame: 7,
            dx: -5,
            y: -5,
            durationMs: 40,
            anchor: { x: 52, y: 100 },
            phase: '발이 지난 뒤 회전 거두기',
        },
        {
            frame: 8,
            dx: -11,
            y: -2,
            durationMs: 45,
            anchor: { x: 56, y: 87 },
            phase: '몸을 풀어 두 발 아래로 보내기',
        },
        {
            frame: 9,
            dx: -15,
            y: 0,
            durationMs: 45,
            anchor: 'feet',
            phase: '돌아온 발로 지면 찾기',
        },
    ];
    return poses.map((pose) => ({
        ...pose,
        motion: 'backflip-south-east',
        x: flipX + pose.dx,
        phase: `봉황천무각 · 한 번의 공격 백덤블링 · ${pose.phase}`,
        // 원본6의 오른발(61,43)에서 몸 기준(42,89)을 뺀 실제 발끝이다.
        contact: pose.frame === 6
            ? {
                kind: 'kick',
                reach: flipContactReach,
                height: 46,
                heightReference: 'body',
            }
            : undefined,
        movementCurve: pose.frame === 6 ? { x: 'hold', y: 'hold' } : undefined,
    }));
}
function landForPass() {
    return [
        {
            motion: 'jumping-1-south-east',
            frame: 7,
            x: kickX,
            y: 0,
            durationMs: 70,
            anchor: 'feet',
            phase: '봉황천무각 · 회전을 끝내고 두 무릎으로 착지 받기',
            movementCurve: { x: 'hold', y: 'hold' },
        },
        {
            motion: 'jumping-1-south-east',
            frame: 8,
            x: kickX,
            y: 0,
            durationMs: 35,
            anchor: 'feet',
            phase: '봉황천무각 · 관통 이동을 위해 지면 밀기',
            movementCurve: { x: 'hold', y: 'hold' },
        },
    ];
}
/** 표적을 지난 뒤 실제 방향별 달리기로 반바퀴를 돌고, 왼쪽 발끝으로 한 번만 친다. */
function passingReverseKick() {
    return [
        ...[kickX, 145, 174, 194].map((x, frame) => ({
            motion: 'running-4-frames-east',
            frame,
            x,
            y: 0,
            durationMs: [30, 30, 35, 35][frame],
            anchor: 'feet',
            phase: '봉황천무각 · 표적 오른편으로 빠르게 관통 이동',
            movementCurve: { x: frame === 2 ? 'ease-out' : undefined, y: 'hold' },
        })),
        ...[
            { direction: 'north-east', frame: 0, x: 194, durationMs: 30 },
            { direction: 'north', frame: 1, x: 190, durationMs: 30 },
            { direction: 'north-west', frame: 2, x: 181, durationMs: 35 },
            { direction: 'west', frame: 3, x: 174, durationMs: 40 },
        ].map((pose) => ({
            ...pose,
            motion: `running-4-frames-${pose.direction}`,
            y: 0,
            anchor: 'feet',
            phase: '봉황천무각 · 감속하며 등을 거쳐 왼쪽으로 반바퀴 돌기',
            movementCurve: { y: 'hold' },
        })),
        ...[0, 1, 2, 3, 4, 5, 6].map((frame) => ({
            motion: 'high-kick-west',
            frame,
            x: [
                170,
                168,
                166,
                reverseKickX,
                reverseKickX,
                reverseKickX,
                reverseKickX,
            ][frame],
            y: 0,
            durationMs: [25, 35, 30, 30, 80, 50, 65][frame],
            anchor: 'feet',
            phase: frame === 4
                ? '봉황천무각 · 반대편에서 돌아 차는 단발 끝각'
                : '봉황천무각 · 돌아선 왼쪽 발차기의 준비와 회수',
            // 서쪽 원본4의 바깥 발끝(30,45), 원본 feet 기준(48,81)이다.
            contact: frame === 4
                ? { kind: 'kick', reach: reverseKickReach, height: reverseKickHeight }
                : undefined,
            movementCurve: frame >= 3 ? { x: 'hold', y: 'hold' } : { y: 'hold' },
        })),
    ];
}
const phoenix = new FinisherSequence();
phoenix
    .beat('시 · 앞발로 잡은 거리', 'intro', (sequence) => {
    sequence.append([
        finisherGuard(openingX, 100, '봉황천무각 · 지상 두 각격의 대치'),
    ]);
})
    .beat('지 · 짧은 회전각과 뻗는 지상각', 'rush', (sequence) => {
    sequence.append(openingSpin());
    sequence.append(highKick({
        kind: 'ground',
        durations: [30, 40, 25, 20, 50, 25, 35],
    }));
})
    .beat('연 · 낮은 도약의 두 연각', 'rush', (sequence) => {
    // 두 킥마다 몸을 띄우지 않고 하나의 낮은 상승·정점·하강 위에서 발만 반복한다.
    sequence.append(lowTakeOff());
    sequence.append(highKick({
        kind: 'air',
        bodyArcY: [-8, -11, -14, -16, -17, -18, -18],
        durations: [25, 30, 20, 20, 40, 20, 25],
    }));
    sequence.append(highKick({
        kind: 'air',
        bodyArcY: [-18, -18, -17, -16, -15, -14, -13],
        durations: [20, 25, 20, 20, 40, 20, 25],
    }));
})
    .beat('전 · 한 번의 뒤돌려차기로 전환', 'rush', (sequence) => {
    sequence.append(attackingBackflip());
})
    .beat('착 · 착지에서 곧바로 반대편을 향하기', 'rush', (sequence) => {
    sequence.append(landForPass());
})
    .beat('각 · 관통 뒤 돌아 차는 끝각', 'climax', (sequence) => {
    sequence.append(passingReverseKick());
})
    .beat('귀 · 돌아선 등과 남긴 잔심', 'finish', (sequence) => {
    sequence.append([
        {
            motion: 'high-kick-west',
            frame: 6,
            x: reverseKickX,
            y: 0,
            durationMs: 70,
            anchor: 'feet',
            phase: '봉황천무각 · 돌아 찬 다리를 두 발로 받기',
            movementCurve: { x: 'hold', y: 'hold' },
        },
        ...[
            { frame: 0, durationMs: 95 },
            { frame: 1, durationMs: 75 },
            { frame: 2, durationMs: 320 },
        ].map((pose) => ({
            ...pose,
            motion: 'fight-stance-idle-8-frames-north-west',
            x: reverseKickX,
            y: 0,
            anchor: 'feet',
            phase: pose.frame === 2
                ? '봉황천무각 · 등을 보인 채 왼쪽 표적을 향한 잔심'
                : '봉황천무각 · 돌아선 어깨와 낮게 세운 가드',
            movementCurve: { x: 'hold', y: 'hold' },
        })),
    ]);
});
export const phoenixFinisher = phoenix.build({
    id: 'finisher-phoenix',
    title: '봉황천무각 · 6타',
    summary: '지상 두 각격에서 낮게 뛰어 두 연각을 잇고 한 번의 공격 백덤블링으로 공중 흐름을 바꾼다. 착지하자마자 표적 반대편으로 빠르게 지나가 몸을 반바퀴 돌린 뒤, 왼쪽으로 돌아 찬 단발 끝각으로 끝낸다.',
    priority: 'review',
    review: '지상2타→낮은 도약2타→공격 백덤블링1타의 첫5타를 유지하고, 정적 장전의 마지막 남동 킥을 반대편 관통·반바퀴 뒤의 서쪽 킥1타로 바꿨다. 첫 지상각은 짧은 회전각 원본4의 reach12·height24, 남동 하이킥 원본4는 발끝(62,46), 앵커(35,83), reach27·height37을 유지한다. 공중 두 각격은 같은 발 타점을 몸 기준으로 바꾸고 한 번의 낮은 도약호(y-8→-18→-13) 위에서 잇는다. 정점은 두 각격 사이에 두고 백덤블링의 몸 기준도y-12→0으로 계속 내려 착지까지 한 번의 상승·하강으로 읽힌다. 발 궤적은 과거 몸 이동을 뺀 발의 상대 위치를 현재 몸 기준에 옮겨 최근80ms만 남긴다. 백덤블링 남동 원본3~9는 한 번만 쓰며 원본6의 오른발(61,43), 앵커(42,89), reach19·height46(body), y-7에만 접촉을 둔다. 점프7·8번의105ms 착지 뒤 실제 동쪽 달리기로130ms 관통하고 북동·북·북서·서쪽 달리기 원본을135ms로 이어 몸 방향을 돌린다. 서쪽 하이킥 원본4의 실제 바깥 발끝(30,45), feet 앵커(48,81)를 기준으로 reach-18·height36의 마지막 한 접촉만 둔다. 기존 공통 서쪽 킥의 height59는 이 원본 발끝이 아니므로 사용하지 않는다. 마지막 한 발 준비 자세 복귀를 제거하고 북서 가드0→1→2로 돌아선 등과 낮은 가드를 남기며2번을320ms 유지한다. 새 몸그림·반전·원본 회전·비율 변형·날개·분신·소리는 없으며 원작의 정확한 안무 복제를 뜻하지 않는다.',
    missingPose: '완전히 뻗는 앞 밀어차기와 전용 백덤블링 킥·좌우 교대다리·회전 뒤돌려차기 연결 그림은 없다. 마지막은 실제 방향별 달리기를 짧게 이어 돌고 서쪽 높은 킥으로 끝내므로 전용 턴처럼 골반과 발이 매끈하게 이어지지는 않는다. 첫 회전각은 접힌 다리의 짧은 타격이고 공중 연각은 같은 다리다. 원본 간 얼굴·팔·지지발 전환은 실제 재생으로 판단해야 한다.',
    finisher: {
        theme: 'phoenix',
        subtitle: '지상2각 · 공중 전환 · 반대편 끝각 · 돌아선 잔심',
        accent: '#d8b178',
    },
});
