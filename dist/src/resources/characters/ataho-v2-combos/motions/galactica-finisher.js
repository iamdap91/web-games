import { finisherAuthoringTargetX } from '../finisher-actors.js';
import { FinisherSequence } from './finisher-sequence.js';
const strikingX = finisherAuthoringTargetX - 28;
const loadedX = strikingX - 60;
const stoppingX = finisherAuthoringTargetX + 70;
function punchPose(frame, durationMs, phase, options = {}) {
    return {
        motion: 'cross-punch-east',
        frame,
        durationMs,
        x: options.x ?? loadedX,
        y: 0,
        anchor: 'feet',
        phase,
        emphasis: options.charge ? 'charge' : undefined,
        movementCurve: { x: 'hold' },
    };
}
const sequence = new FinisherSequence();
sequence
    .beat('蓄 · 한 주먹을 당긴 정적', 'intro', (track) => {
    track.append([
        punchPose(0, 120, '갤럭티카 팬텀 · 먼 거리의 대치'),
        punchPose(1, 100, '갤럭티카 팬텀 · 몸통으로 힘을 당기기'),
        punchPose(2, 100, '갤럭티카 팬텀 · 주먹을 뒤로 모으기'),
        {
            ...punchPose(4, 660, '갤럭티카 팬텀 · 뒤로 당긴 주먹에 힘 모으기', {
                charge: true,
            }),
            motion: 'presentation-galactica-charge-east',
        },
        {
            ...punchPose(4, 40, '갤럭티카 팬텀 · 터뜨리기 직전의 압축 정적'),
            motion: 'presentation-galactica-charge-east',
        },
    ]);
})
    .beat('踏 · 온몸을 던지는 돌진', 'rush', (track) => {
    track.append([
        ...[loadedX, loadedX + 20, loadedX + 40].map((x, frame) => ({
            motion: 'running-4-frames-east',
            frame,
            durationMs: 40,
            x,
            y: 0,
            anchor: 'feet',
            phase: '갤럭티카 팬텀 · 몸 전체의 가속',
        })),
        {
            ...punchPose(4, 30, '갤럭티카 팬텀 · 발을 뻗으며 주먹 열기', {
                x: strikingX - 8,
            }),
            movementCurve: undefined,
        },
    ]);
})
    .beat('貫 · 타격과 회전으로 흘린 반동', 'climax', (track) => {
    track.append([
        {
            ...punchPose(5, 95, '갤럭티카 팬텀 · 몸통을 틀어 관통하는 정권 한 타', {
                x: strikingX,
            }),
            movementCurve: { x: 'ease-out' },
            contact: {
                kind: 'punch',
                reach: 28,
                height: 32,
                strength: 1,
                reactionHold: 'motion-end',
            },
        },
        {
            ...punchPose(5, 25, '갤럭티카 팬텀 · 주먹이 걸린 반동을 몸통으로 넘기기', {
                x: stoppingX - 28,
            }),
            movementCurve: { x: 'ease-out' },
        },
        // 타격의 전진력이 남은 동안 지지발을 바꾸며 몸을 돈다. 추가 킥 판정은 없다.
        ...[
            { frame: 2, x: stoppingX - 11, durationMs: 45 },
            { frame: 3, x: stoppingX - 2, durationMs: 35 },
            { frame: 4, x: stoppingX + 4, durationMs: 40 },
            { frame: 5, x: stoppingX + 7, durationMs: 45 },
            { frame: 6, x: stoppingX + 5, durationMs: 65 },
        ].map((pose) => ({
            ...pose,
            motion: 'ataho-roundhouse-kick-skeleton-south-east-south-east',
            y: 0,
            anchor: 'feet',
            phase: pose.frame === 6
                ? '갤럭티카 팬텀 · 돌아온 발로 전진 반동을 받기'
                : '갤럭티카 팬텀 · 타격의 반동을 회전으로 흘리며 감속',
            movementCurve: { x: 'ease-out' },
        })),
    ]);
})
    .beat('踏 · 버티는 발과 풀어낸 주먹', 'finish', (track) => {
    track.append([
        {
            ...punchPose(4, 80, '갤럭티카 팬텀 · 발을 디뎌 남은 회전력 붙잡기', {
                x: stoppingX + 2,
            }),
            movementCurve: { x: 'ease-out' },
        },
        punchPose(3, 90, '갤럭티카 팬텀 · 표적을 지난 자리에서 주먹 회수', {
            x: stoppingX,
        }),
        ...[
            { frame: 9, durationMs: 80 },
            { frame: 10, durationMs: 75 },
            { frame: 11, durationMs: 75 },
            { frame: 12, durationMs: 80 },
            { frame: 13, durationMs: 85 },
            { frame: 14, durationMs: 400 },
        ].map((pose) => ({
            ...pose,
            motion: 'ataho-backward-lean-two-straight-arm-circles-south-east-south-east',
            x: stoppingX,
            y: 0,
            anchor: 'feet',
            phase: pose.frame === 14
                ? '갤럭티카 팬텀 · 어깨를 편 채 묵직하게 남긴 종결'
                : '갤럭티카 팬텀 · 버티는 발 위에서 장전한 팔의 긴장 풀기',
            movementCurve: { x: 'hold', y: 'hold' },
        })),
    ]);
});
export const galacticaFinisher = sequence.build({
    id: 'finisher-galactica-phantom',
    title: '갤럭티카 팬텀 · 1타',
    summary: '뒤주먹에 힘을 모아 한 번 치고 관통한다. 타격의 전진력이 남은 채 몸을 돌려 반동을 흘리고, 돌아온 발로 버텨 멈출 때까지 표적의 피격 자세를 유지한다.',
    priority: 'review',
    review: '장전은 동쪽 전용4번을660+40ms 유지하며 실제 뒤주먹(22,45)에 국소 스파크·전기를 모은다. 1020ms에 돌진해1170ms의 한 접촉과95ms 관통을 유지한다. 타격 뒤 제자리에서 기립8방향을 돌리던 구성을 제거하고 관통 직후25ms 안에 몸통 회수와 감속 회전을 잇는다. 정권5번의 타격 자세에서 남동 회전각2~6번으로 넘어가며 몸의 전진 거리는17→9→6→3px로 줄이고 최종 정지점을7px 넘긴 뒤 발을 디뎌 되돌린다. 회전 구간은 접촉 없이 반동을 받는 발 전환으로 사용하며 추가 타격·에너지포·이동 파면은 없다. 버팀 뒤 기존 팔 돌리기9~14번으로 장전한 팔의 긴장을 풀고 어깨를 편14번을400ms 남겨 한 발 준비 자세로 복귀하지 않는다. 전체는2485ms이며 실제 명중 표적은 종결까지 피격을 유지한다.',
    missingPose: '타격 반동 전용 턴 원본이 없어 기존 남동 회전각을 사용한다. 접힌 무릎과 들린 다리가 있어 반동을 받는 발 전환으로 읽히는지는 실제 재생 판단 대상이다. 동쪽 정권과 남동 회전각 사이 얼굴·팔·지지발 차이도 남는다. 원본의 픽셀·비율·방향은 변형하지 않는다.',
    finisher: {
        theme: 'galactica',
        subtitle: '장전 · 관통과 반동 회전 · 어깨를 편 종결',
        accent: '#eab477',
        endGlyph: '轟',
    },
});
