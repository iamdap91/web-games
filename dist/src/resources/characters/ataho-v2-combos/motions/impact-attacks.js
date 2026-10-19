const aerialSource = 'presentation-aerial-smash-south-east';
const aerialPoses = [
    {
        frame: 0,
        durationMs: 80,
        x: 0,
        y: 0,
        movementCurve: { x: 'hold', y: 'hold' },
        phase: '공중 양손 내려찍기 · 준비',
    },
    {
        frame: 1,
        durationMs: 70,
        x: 0,
        y: 0,
        movementCurve: { x: 'hold', y: 'hold' },
        phase: '공중 양손 내려찍기 · 두 주먹과 무릎 모으기',
    },
    {
        frame: 1,
        durationMs: 35,
        x: 0,
        y: 0,
        movementCurve: { x: 'ease-out', y: 'ease-out' },
        phase: '공중 양손 내려찍기 · 지면 밀어 도약',
    },
    {
        frame: 2,
        durationMs: 65,
        x: 5,
        y: -22,
        movementCurve: { y: 'ease-out' },
        phase: '공중 양손 내려찍기 · 두 무릎 접어 상승',
    },
    {
        frame: 3,
        durationMs: 115,
        x: 8,
        y: -32,
        movementCurve: { x: 'hold', y: 'hold' },
        phase: '공중 양손 내려찍기 · 정점에서 양손 장전',
    },
    {
        frame: 4,
        durationMs: 50,
        x: 10,
        y: -28,
        movementCurve: { x: 'ease-out', y: 'ease-in' },
        phase: '공중 양손 내려찍기 · 양손과 몸을 함께 하강',
    },
    {
        frame: 5,
        durationMs: 80,
        x: 14,
        y: 0,
        movementCurve: { x: 'hold', y: 'hold' },
        phase: '1타 · 공중 내려찍기 · 양손 망치 접촉',
        // 원본88px의 손 끝(64,69), 중앙44와 발 경계77을 함께 사용한다.
        contact: { kind: 'punch', reach: 20, height: 8, strength: 1 },
    },
    {
        frame: 6,
        durationMs: 45,
        x: 14,
        y: 0,
        phase: '공중 양손 내려찍기 · 무릎으로 충격 받기',
    },
    {
        frame: 7,
        durationMs: 35,
        x: 14,
        y: 0,
        phase: '공중 양손 내려찍기 · 낮게 누른 여운',
    },
    {
        frame: 8,
        durationMs: 55,
        x: 14,
        y: 0,
        phase: '공중 양손 내려찍기 · 양손을 거두며 중심 세우기',
    },
    {
        frame: 1,
        durationMs: 130,
        x: 14,
        y: 0,
        phase: '공중 양손 내려찍기 · 같은 원본 가드로 회수',
    },
    {
        frame: 0,
        durationMs: 120,
        x: 14,
        y: 0,
        phase: '공중 양손 내려찍기 · 두 발 정착',
    },
];
const aerialSmash = {
    id: 'aerial-smash',
    title: '공중 양손 내려찍기 · 남동쪽',
    technique: {
        id: 'aerial-smash',
        title: '공중 양손 내려찍기',
        direction: 'south-east',
    },
    summary: '두 무릎을 접어 뛰어오르고 정점에서 양손을 장전한 뒤, 빠르게 내려찍으며 낮은 한 번의 접촉으로 무게를 싣는다.',
    priority: 'review',
    review: '기존 아타호 캐릭터의 남동 방향으로 PixelLab PixMiniMax를 한 번 생성한 원본0~8번을 사용한다. 2→3번의 공중 자세와115ms 정점 장전,4번의50ms 하강을 거쳐5번에서 한 번만 접촉한다. 원본 손 위치를 기준으로 발보다8px 높은 타점을 사용하며 지면0으로 내리지 않는다. 6~8번의 착지·낮은 손 여운 뒤 같은 생성의1번 가드와0번 준비로 돌아온다. 원본의 회전·반전·몸 변형이나 별도 타격은 추가하지 않는다.',
    missingPose: '도약 직전 완전히 뻗은 다리와 완전한 가드 복귀가 별도 프레임으로 나오지 않았다. 준비1번을 짧게 상승시켜 도약하고 마지막8번 뒤 같은 생성의1번 가드를 재사용한다. 양손 모양과 몸 연결의 최종 채택은 실제 재생으로 판단한다.',
    steps: aerialPoses.map((pose) => ({
        ...pose,
        motion: aerialSource,
        anchor: 'feet',
    })),
};
const stompLoadSource = 'presentation-martial-stomp-load-south-east';
const stompImpactSource = 'presentation-martial-stomp-impact-south-east';
const stompPoses = [
    {
        motion: stompLoadSource,
        frame: 1,
        durationMs: 80,
        phase: '진각 · 두 주먹 가드에서 중심 잡기',
    },
    {
        motion: stompLoadSource,
        frame: 2,
        durationMs: 100,
        phase: '진각 · 지지발을 남기고 앞무릎 들기',
    },
    {
        motion: stompImpactSource,
        frame: 4,
        durationMs: 30,
        phase: '진각 · 든 발을 곧게 내려 디딤',
    },
    {
        motion: stompImpactSource,
        frame: 5,
        durationMs: 70,
        phase: '1타 · 진각 · 앞발바닥으로 지면 찍기',
        // 원본88px 앞발 밑면(61,73), 중앙44·지지발 경계75 기준의 실제 타점이다.
        contact: { kind: 'kick', reach: 17, height: 2, strength: 1 },
    },
    {
        motion: stompImpactSource,
        frame: 6,
        durationMs: 60,
        phase: '진각 · 디딘 발로 무게 받기',
    },
    {
        motion: stompLoadSource,
        frame: 1,
        durationMs: 90,
        phase: '진각 · 다음 공격을 위한 가드',
    },
    {
        motion: stompLoadSource,
        frame: 0,
        durationMs: 110,
        phase: '진각 · 두 발 정착',
    },
];
const martialStomp = {
    id: 'martial-stomp',
    title: '진각 · 남동쪽',
    technique: {
        id: 'martial-stomp',
        title: '진각',
        direction: 'south-east',
    },
    summary: '가드에서 한 무릎을 들고 앞발을 바로 내려 디딘다. 발바닥의 한 번 접촉 뒤 짧게 무게를 받고 다음 공격을 위한 가드로 돌아온다.',
    priority: 'review',
    review: '같은 아타호·같은 남동 방향의 두 생성 원본에서 첫 PixMiniMax의1→2번 발들기와 v3의4→5→6번 직하 디딤·접촉·정착을 잇는 후보 시안이다. v3의 흰 효과가 내장된7~8번과 첫 생성의 전방 킥·먼지는 사용하지 않는다. 210ms에 앞발 끝의 실제 픽셀로 한 번만 접촉하며 판정은 발보다2px 위다. 70ms 접촉 뒤60ms 정착과 같은 첫 생성의1→0번 회수로 전체540ms를 구성한다. 픽셀·방향·몸 비율을 수정하지 않으며 최종 채택을 확정한 결과는 아니다.',
    missingPose: '발들기는 분명하지만 두 모델 사이에서 팔 가드가 내려왔다 돌아오는 차이가 있고 v3의 골반 하강은 작다. 같은 캐릭터·방향의 후보 조합이며 실제1배 재생에서 진각으로 읽히는지 검토한다.',
    steps: stompPoses.map((pose) => ({
        ...pose,
        x: 0,
        y: 0,
        anchor: 'feet',
    })),
};
export const impactAttacks = [
    aerialSmash,
    martialStomp,
];
