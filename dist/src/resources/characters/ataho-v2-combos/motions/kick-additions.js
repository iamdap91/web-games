import { guard, oneTwo, recover } from './attack-phrases.js';
import { flyingKickMotion } from './flying-kick.js';
import { withChainTiming } from './chain-timing.js';
export const landingOneTwo = {
    id: 'landing-one-two',
    title: '날아차기 → 착지 원투 · 3타',
    summary: '앞으로 날아차고 무릎으로 착지 충격을 받은 뒤 같은 자리에서 원투를 잇는다.',
    priority: 'review',
    review: '기존 날아차기의 준비·공중 골반 기준·이동 궤적·착지 100ms·일어서기 70ms를 그대로 쓴다. 낮은 착지에서 일어난 뒤 x74에 발을 고정하고 원투를 잇는다. 공중 킥과 펀치의 원본 얼굴 변화, 일어서기에서 펀치 가드로 바뀌는 발 간격의 전환은 남는다. 원본의 짧은 발 뻗음과 팔 뻗음은 효과 없이 비교한다.',
    steps: [
        ...flyingKickMotion.steps.slice(0, 17),
        {
            motion: 'jumping-1-south-east',
            frame: 1,
            durationMs: 45,
            x: 74,
            y: 0,
            anchor: 'feet',
            phase: '착지 뒤 무릎 펴기',
        },
        {
            motion: 'jumping-1-south-east',
            frame: 0,
            durationMs: 45,
            x: 74,
            y: 0,
            anchor: 'feet',
            phase: '착지 뒤 상체 세우기',
        },
        ...oneTwo(74, 2),
        ...recover(74),
    ],
};
// 원투의 뒤쪽 지지발(기준점 오른쪽 15px)에 하이킥 최하단 발의 중심을 맞춘다.
// y는 각 원본의 알파 최하단이므로 공중 궤적 없이 접촉면을 지면에 유지한다.
const groundKickPoses = [
    { frame: 0, durationMs: 50, anchor: { x: 38, y: 77 }, phase: '무릎 들기' },
    { frame: 1, durationMs: 45, anchor: { x: 37, y: 77 }, phase: '킥 장전' },
    { frame: 2, durationMs: 55, anchor: { x: 35, y: 81 }, phase: '발 올리기' },
    { frame: 3, durationMs: 55, anchor: { x: 34, y: 82 }, phase: '발 내밀기' },
    {
        frame: 4,
        durationMs: 80,
        anchor: { x: 35, y: 83 },
        phase: '2타 · 지상 킥',
    },
    { frame: 5, durationMs: 55, anchor: { x: 33, y: 81 }, phase: '다리 거두기' },
    { frame: 6, durationMs: 70, anchor: { x: 33, y: 77 }, phase: '발 내리기' },
];
export const groundKickSteps = groundKickPoses.map((pose) => ({
    ...pose,
    motion: 'high-kick-south-east',
    x: 0,
    y: 0,
    phase: pose.frame === 4 ? pose.phase : `지상 킥 · ${pose.phase}`,
    contact: pose.frame === 4 ? { kind: 'kick', height: 37, reach: 27 } : undefined,
}));
const jabGroundKick = {
    id: 'jab-ground-kick',
    title: '잽 → 지상 킥 · 2타',
    summary: '짧은 잽으로 열고 뒤쪽 발을 딛은 채 높은 발차기를 잇는다.',
    priority: 'review',
    review: '원투의 잽과 손 회수만 남기고 남동쪽 하이킥 0~6번을 지상에서 잇는다. 원본마다 달라지는 지지발의 중심과 최하단을 맞추고 이동량·높이 궤적은 0으로 둔다. 원본의 발 모양·몸통 기울임과 가드 전환의 발 간격 변화는 남는다. 다리를 완전히 펴는 앞 밀어차기가 아니므로 기존 높은 킥의 접촉과 연결을 효과 없이 검토한다.',
    missingPose: '잽의 두 발 자세에서 한 발 지지로 넘어가는 발 디딤과, 하이킥 뒤 같은 발 간격으로 돌아오는 연결 자세는 원본에 충분하지 않다.',
    steps: [
        guard(0),
        ...oneTwo(0, 1).slice(0, 5),
        ...groundKickSteps,
        ...recover(0),
    ],
};
export const kickAdditions = [
    landingOneTwo,
    jabGroundKick,
].map(withChainTiming);
