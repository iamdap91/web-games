import inazumaKeyposes from '../../../../../resources/ataho-v2-inazuma-kick-keyposes-r2.json' with { type: 'json' };
import { flyingKickMotion } from './flying-kick.js';
const playback = inazumaKeyposes.playback;
const sourceMotion = playback.sourceMotionId;
const contactFrame = playback.frames[1];
// 표시 크기와 타점은 같은 기록에서 파생해 원화 변경 때 이중으로 관리하지 않는다.
const kickContact = {
    kind: 'kick',
    reach: playback.contact.x - contactFrame.pivot.x,
    height: contactFrame.height - contactFrame.pivot.y - playback.contact.y,
    heightReference: 'body',
};
export const enhancedFlyingKickMotion = {
    id: 'flying-kick-enhanced',
    title: '도약 날아차기 · A/B 강화',
    summary: '기존 도약에서 앞무릎을 모으고 사선으로 한 번 뻗은 뒤 같은 다리를 접어 착지한다.',
    priority: 'review',
    variant: {
        groupId: 'flying-kick',
        groupTitle: '도약 날아차기',
        label: 'A/B 강화',
    },
    review: '기존 준비와 도약·착지 원본 사이에 승인한 r2 A 장전과 B 사선 신전을 연결한다. 점프4·5번의 접힌 무릎으로 진입과 회수를 잇고, A/B는 같은 몸 기준을 사용해 다리를 뻗을 때 골반이 튀지 않게 한다. B 첫 구간의 실제 발바닥 접촉만 1타로 세며 뒤의 자세 유지와 A 회수에는 접촉을 추가하지 않는다. 원본 그림의 회전·반전·비율 변형이나 새 중간 그림은 없다.',
    missingPose: 'A와 B 사이의 중간 신전 그림은 없으며 기존 점프와 새 키포즈 사이에는 얼굴·옷주름 차이가 남는다. 강한 발앞 원근보다 짧은 체형의 공중 사선킥으로 읽히는 시안이다.',
    steps: [
        ...flyingKickMotion.steps.slice(0, 6),
        {
            motion: 'jumping-1-south-east',
            frame: 4,
            durationMs: 45,
            x: 8,
            y: -10,
            anchor: { x: 48, y: 75 },
            phase: '공중에서 두 무릎 접기',
        },
        {
            motion: sourceMotion,
            frame: 0,
            durationMs: 90,
            x: 16,
            y: -18,
            anchor: 'motion',
            movementCurve: { y: 'ease-out' },
            phase: 'A · 앞무릎 모아 상승',
        },
        {
            motion: sourceMotion,
            frame: 0,
            durationMs: 45,
            x: 32,
            y: -27,
            anchor: 'motion',
            movementCurve: { x: 'ease-in', y: 'ease-out' },
            phase: 'A · 정점 장전에서 발 내밀기',
        },
        {
            motion: sourceMotion,
            frame: 1,
            durationMs: 60,
            x: 52,
            y: -28,
            anchor: 'motion',
            contact: kickContact,
            phase: '1타 · B · 사선으로 뻗은 발바닥 접촉',
        },
        {
            motion: sourceMotion,
            frame: 1,
            durationMs: 35,
            x: 64,
            y: -23,
            anchor: 'motion',
            phase: 'B · 타격을 풀며 전진 하강',
        },
        {
            motion: sourceMotion,
            frame: 0,
            durationMs: 70,
            x: 72,
            y: -12,
            anchor: 'motion',
            phase: 'A · 같은 다리를 접어 회수',
        },
        {
            motion: 'jumping-1-south-east',
            frame: 5,
            durationMs: 35,
            x: 74,
            y: -8,
            anchor: { x: 48, y: 75 },
            phase: '접은 무릎에서 착지로 하강',
        },
        ...flyingKickMotion.steps.slice(-4).map((step, index) => ({
            ...step,
            x: 76,
            y: index === 0 ? -4 : 0,
        })),
    ],
    effects: [
        {
            id: 'flying-kick-enhanced-afterimage',
            label: 'A/B 공중 잔상',
            summary: '실제 장전·신전 자세 두 개를 짧고 옅게 남깁니다.',
            kind: 'afterimage',
            sources: [{ motion: sourceMotion, frames: [0, 1] }],
            intervalMs: 35,
            count: 2,
            opacity: 0.2,
        },
    ],
};
