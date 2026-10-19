import { finisherAuthoringTargetX } from '../finisher-actors.js';
import { FinisherSequence, finisherGuard } from './finisher-sequence.js';
import { groundSpinMotion } from './ground-spin.js';
const targetX = finisherAuthoringTargetX;
function fixedPose(motion, frame, x, durationMs, phase) {
    return {
        motion,
        frame,
        x,
        y: 0,
        durationMs,
        phase,
        anchor: 'feet',
        movementCurve: { x: 'hold', y: 'hold' },
    };
}
/** 첫 주먹은 표적의 앞면에서 한 번 닿고 몸은 그대로 반대편으로 통과한다. */
function openingPass(fromX) {
    const strikingX = 132 - 28;
    const stopX = targetX + 64;
    return [
        {
            ...fixedPose('running-4-frames-east', 0, fromX, 35, '취호 · 빈틈으로 갑자기 뛰어들기'),
            movementCurve: undefined,
        },
        {
            ...fixedPose('running-4-frames-east', 1, (fromX + strikingX) / 2, 35, '취호 · 주먹을 내며 진입'),
            movementCurve: undefined,
        },
        {
            ...fixedPose('cross-punch-east', 4, strikingX - 7, 25, '취호 · 스쳐 지나갈 주먹'),
            movementCurve: undefined,
        },
        {
            ...fixedPose('cross-punch-east', 5, strikingX, 70, '취호 · 표적을 치고 오른편으로 통과'),
            movementCurve: { x: 'ease-out' },
            contact: { kind: 'punch', reach: 28, height: 32 },
        },
        fixedPose('cross-punch-east', 5, stopX, 35, '취호 · 때린 손을 남긴 채 지나치기'),
        fixedPose('cross-punch-east', 4, stopX, 30, '취호 · 팔을 접으며 등 보이기'),
        fixedPose('cheolsango-short', 0, stopX, 35, '취호 · 뒤의 표적을 등으로 받기'),
    ];
}
/** 왼쪽을 치는 실제 등·어깨 그림으로 되받고, 첫 철산고는 다시 표적을 지나간다. */
function reverseShoulder(options) {
    const strikingX = targetX + 20;
    const phase = options.final
        ? '취호 · 빈 박자 뒤에 실은 마지막 철산고'
        : '취호 · 등을 밀어 반대편으로 되받기';
    return [
        fixedPose('cheolsango-short', 0, options.fromX, options.windupMs, '취호 · 힘을 푼 채 등·어깨 모으기'),
        {
            ...fixedPose('cheolsango-short', 1, options.fromX, 40, '취호 · 뒤로 발 디딤'),
            movementCurve: undefined,
        },
        {
            ...fixedPose('cheolsango-short', 2, strikingX + 22, 35, '취호 · 뒤의 표적 쪽으로 몸통 밀기'),
            movementCurve: { x: 'ease-in' },
        },
        {
            ...fixedPose('cheolsango-short', 3, strikingX, options.final ? 70 : 80, phase),
            movementCurve: options.final ? { x: 'hold' } : { x: 'ease-out' },
            contact: { kind: 'shoulder', reach: -20, height: 41 },
        },
        fixedPose('cheolsango-short', 3, options.stopX, 35, '취호 · 등·어깨 충돌을 거두기'),
        ...[2, 1, 0].map((frame) => fixedPose('cheolsango-short', frame, options.stopX, 30, '취호 · 힘을 빼며 중심 회수')),
    ];
}
function turningKick() {
    const durations = [35, 45, 30, 25, 45, 25, 35, 45];
    return groundSpinMotion.steps.slice(1, 9).map((step, index) => ({
        ...step,
        x: targetX - 12,
        y: 0,
        durationMs: durations[index],
        movementCurve: { x: 'hold', y: 'hold' },
        phase: step.contact
            ? '취호 · 방향을 바꾸며 접힌 다리로 회전각'
            : `취호 · 방향 전환 · ${step.phase}`,
    }));
}
const sequence = new FinisherSequence();
sequence
    .beat('허 · 한 걸음 물러선 빈틈', 'intro', (track) => {
    track.hold('취호 · 힘을 푼 대치', 90);
    track.move(68, '취호 · 한 걸음 물러나 유인', 150);
    track.poseHold('취호 · 먼저 오라는 빈 박자', 110);
})
    .beat('관 · 치고 지나쳐 등으로 받기', 'rush', (track) => {
    track.append(openingPass(track.x));
    track.append(reverseShoulder({ fromX: track.x, stopX: 94, windupMs: 85 }));
})
    .beat('전 · 돌아선 회전각과 짧은 권격', 'rush', (track) => {
    track.cross(targetX - 12, 0, '취호 · 표적 앞에서 방향을 돌리기', 90);
    track.append(turningKick());
    track.attack('jab', { pace: 0.34, contactMs: 35, recoveryMs: 30 });
    track.poseHold('취호 · 연타를 끊어 다음 수 숨기기', 165);
})
    .beat('엇 · 반대편에서 늦게 오는 두 타', 'rush', (track) => {
    track.cross(198, 0, '취호 · 공격 없이 표적 뒤로 비껴가기', 125);
    track.attack('high-kick', {
        direction: 'west',
        pace: 0.43,
        contactMs: 40,
        recoveryMs: 35,
    });
    track.poseHold('취호 · 발을 내리고 한 박자 기다리기', 95);
    track.attack('straight', {
        direction: 'west',
        pace: 0.28,
        contactMs: 35,
        recoveryMs: 25,
    });
})
    .beat('타 · 허를 찌른 뒤 등의 일격', 'climax', (track) => {
    track.cross(108, 0, '취호 · 정면으로 다시 비집고 들어가기', 110);
    track.attack('hook', { pace: 0.38, contactMs: 40, recoveryMs: 40 });
    track.poseHold('취호 · 힘을 다 쓴 듯 비워 두기', 180);
    track.cross(targetX + 64, 0, '취호 · 마지막으로 등을 보이며 지나치기', 150);
    track.append(reverseShoulder({
        fromX: track.x,
        stopX: targetX + 20,
        windupMs: 160,
        final: true,
    }));
})
    .beat('정 · 표적 곁에 남은 한 몸', 'finish', (track) => {
    track.poseHold('취호 · 철산고의 무게를 거두기', 110);
    track.append([
        finisherGuard(track.x, 220, '취호 · 두 발로 조용히 중심 잡기'),
    ]);
});
export const drunkenTigerFinisher = sequence.build({
    id: 'finisher-drunken-tiger',
    title: '초구취호패타 · 8타',
    summary: '느슨한 유인 뒤 주먹으로 표적을 통과하고, 등·어깨로 반대편을 되받는다. 방향을 바꾼 회전각과 앞뒤의 엇박 공격 뒤 마지막 철산고로 끝낸다.',
    priority: 'review',
    review: '실제 공격 분신을 없애고 본체 하나의8타로 재편했다. 오른쪽으로 통과하는 주먹→왼쪽으로 되받으며 지나가는 철산고→다시 동쪽으로 돌려 차기를 앞부분에 연결한다. 짧은 잽 뒤165ms의 빈 박자, 반대편 높은 킥 뒤95ms의 기다림, 훅 뒤180ms의 힘 풀기로 불규칙한 간격을 만든다. 방향 전환에는 실제 동·서쪽 달리기 원본을 쓰고 접촉은 각 원본 손·발·왼쪽 어깨 방향에 맞춘다. 마지막은 표적 오른편에서 왼쪽으로 실은 철산고 한 타다. 보류 자세·새 그림·반전·몸 비율 변형·순간이동은 사용하지 않는다.',
    missingPose: '취권 전용 휘청임과 크게 뻗는 회전차기 원본은 없다. 기존 회전각은 접힌 다리의 짧은 타격이며, 등·어깨 치기는 왼쪽을 향하는 기존 철산고 네 자세다. 얼굴·팔 전환의 차이는 남는다.',
    finisher: {
        theme: 'drunken-tiger',
        subtitle: '한 몸의 앞뒤 공방 · 빈 박자와 기습 · 뒤로 실은 철산고',
        accent: '#cb8742',
        endGlyph: '虎',
    },
});
