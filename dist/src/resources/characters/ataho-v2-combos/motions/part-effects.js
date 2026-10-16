const oneTwoSource = 'ataho-one-two-punch-south-east-south-east';
const highKickSource = 'high-kick-south-east';
const spinSource = 'ataho-roundhouse-kick-skeleton-south-east-south-east';
// 원본 PNG 좌표다. one-two/south-east/frame_002.png의 손목 바깥 주먹만 잡는다.
// 새 잽 중간 그림이 들어갈 1번은 건드리지 않고 접촉 2번 진입 직후만 흐린다.
const jabHand = {
    id: 'jab-contact-hand',
    motion: oneTwoSource,
    frame: 2,
    mask: [
        { x: 73, y: 40 },
        { x: 79, y: 40 },
        { x: 82, y: 44 },
        { x: 82, y: 49 },
        { x: 78, y: 51 },
        { x: 73, y: 50 },
    ],
    pivot: { x: 73, y: 46 },
    axis: { x: 1, y: 0 },
};
const jabBlur = {
    id: 'jab-tip-blur',
    label: '잽 손끝 블러',
    summary: '잽이 닿는 순간만 손끝을 흐리고 유지 자세는 선명하게 둡니다.',
    kind: 'part-blur',
    distance: 1.5,
    samples: 4,
    timing: [
        { atMs: 0, amount: 1 },
        { atMs: 8, amount: 0.55 },
        { atMs: 22, amount: 0 },
    ],
    parts: [jabHand],
};
// Fight_Stance_Idle/south-east/frame_000.png의 x 23~35 꼬리 끝이다.
// x 36 이후의 몸·바지와 뿌리는 제외하고 바깥 꼬리 끝만 약1~1.5px 흔든다.
// 몸 반대쪽은 투명 여백까지 포함해 검은 외곽선이 마스크 경계에 잘리지 않게 한다.
// 같은 가드가 준비에도 나오므로 마지막 연속 run만 사용하고 동작별 정착 시간을 둔다.
const guardTail = {
    id: 'guard-tail-follow-through',
    label: '꼬리 끝 후속 움직임',
    summary: '돌진 뒤 가드를 세우면 꼬리 끝이 늦게 따라와 작게 가라앉습니다.',
    kind: 'follow-through',
    swingDegrees: 4,
    timing: [
        { atMs: 0, amount: 0 },
        { atMs: 8, amount: 0 },
        { atMs: 30, amount: 1 },
        { atMs: 62, amount: -0.22 },
        { atMs: 110, amount: 0 },
    ],
    parts: [
        {
            id: 'final-guard-tail-tip',
            motion: 'fight-stance-idle-8-frames-south-east',
            frame: 0,
            occurrence: 'last',
            mask: [
                { x: 22, y: 62 },
                { x: 35, y: 62 },
                { x: 35, y: 72 },
                { x: 22, y: 72 },
            ],
            pivot: { x: 35, y: 67 },
            axis: { x: -1, y: 0 },
        },
    ],
};
function guardTailResponse(response) {
    return { ...guardTail, ...response };
}
// High_Kick/south-east의 3·4번에서 바지 밖으로 나온 공중 발끝만 분리한다.
// 지지발과 골반은 마스크에 포함하지 않으며 3번 늘어남은 약 2px 이내다.
const flyingTransitFoot = {
    id: 'flying-transit-foot-tip',
    motion: highKickSource,
    frame: 3,
    mask: [
        { x: 61, y: 48 },
        { x: 66, y: 49 },
        { x: 67, y: 54 },
        { x: 65, y: 58 },
        { x: 61, y: 59 },
        { x: 60, y: 54 },
    ],
    pivot: { x: 61, y: 57 },
    axis: { x: 0.4, y: -0.9 },
};
const flyingContactFoot = {
    id: 'flying-contact-foot-tip',
    motion: highKickSource,
    frame: 4,
    mask: [
        { x: 62, y: 36 },
        { x: 66, y: 37 },
        { x: 69, y: 40 },
        { x: 69, y: 47 },
        { x: 66, y: 51 },
        { x: 62, y: 49 },
    ],
    pivot: { x: 62, y: 49 },
    axis: { x: 0.4, y: -0.9 },
};
// roundhouse/south-east/frame_004.png의 오른쪽 바깥 발끝이다.
// 접힌 무릎·바지·아래 지지발은 제외한다. 원본 발을 대체하지 않는 블러만 쓴다.
const spinFoot = {
    id: 'spin-contact-foot-tip',
    motion: spinSource,
    frame: 4,
    mask: [
        { x: 64, y: 46 },
        { x: 68, y: 47 },
        { x: 70, y: 50 },
        { x: 69, y: 54 },
        { x: 65, y: 57 },
        { x: 62, y: 55 },
        { x: 62, y: 50 },
    ],
    pivot: { x: 62, y: 54 },
    axis: { x: 1, y: -0.1 },
};
// attack-additions의 방향별 원본을 각각 확인했다. SE를 뒤집어 NE에 쓰지 않는다.
// front-push-kick 3번은 발목 밖 말단, 4번은 뻗은 발끝만 잡고 회색 바지를 뺀다.
// 4번 발끝의 자유 외곽은 투명 여백까지 잡아 회전 뒤 원래 검은 테두리가 남지 않게 한다.
const pushKickSeTransit = {
    id: 'push-kick-se-transit-toe',
    motion: 'front-push-kick-south-east',
    frame: 3,
    mask: [
        { x: 66, y: 55 },
        { x: 71, y: 56 },
        { x: 73, y: 59 },
        { x: 71, y: 62 },
        { x: 67, y: 64 },
        { x: 65, y: 63 },
        { x: 65, y: 59 },
    ],
    pivot: { x: 65, y: 62 },
    axis: { x: 1, y: -0.25 },
};
const pushKickSeContact = {
    id: 'push-kick-se-contact-toe',
    motion: 'front-push-kick-south-east',
    frame: 4,
    mask: [
        { x: 67, y: 50 },
        { x: 76, y: 50 },
        { x: 77, y: 54 },
        { x: 77, y: 61 },
        { x: 73, y: 65 },
        { x: 67, y: 65 },
        { x: 66, y: 61 },
        { x: 67, y: 56 },
    ],
    pivot: { x: 67, y: 61 },
    axis: { x: 1, y: -0.25 },
};
const pushKickNeTransit = {
    id: 'push-kick-ne-transit-toe',
    motion: 'front-push-kick-north-east',
    frame: 3,
    mask: [
        { x: 66, y: 33 },
        { x: 71, y: 34 },
        { x: 73, y: 38 },
        { x: 73, y: 44 },
        { x: 70, y: 47 },
        { x: 65, y: 46 },
        { x: 65, y: 39 },
    ],
    pivot: { x: 65, y: 44 },
    axis: { x: 0.2, y: -1 },
};
const pushKickNeContact = {
    id: 'push-kick-ne-contact-toe',
    motion: 'front-push-kick-north-east',
    frame: 4,
    mask: [
        { x: 62, y: 27 },
        { x: 69, y: 28 },
        { x: 72, y: 32 },
        { x: 72, y: 42 },
        { x: 68, y: 44 },
        { x: 63, y: 41 },
        { x: 63, y: 34 },
    ],
    pivot: { x: 63, y: 40 },
    axis: { x: 0.15, y: -1 },
};
// double-palm 5·6번의 가장 바깥 손끝만 사용한다. 겹친 안쪽 손·소매·얼굴은 제외한다.
// 손가락 뿌리 쪽을 고정하므로 늘어남은 말단 약 1px에 한정된다.
const palmSeTransit = {
    id: 'palm-se-transit-fingertips',
    motion: 'double-palm-south-east',
    frame: 5,
    mask: [
        { x: 67, y: 39 },
        { x: 70, y: 39 },
        { x: 72, y: 42 },
        { x: 72, y: 45 },
        { x: 68, y: 47 },
        { x: 67, y: 44 },
    ],
    pivot: { x: 67, y: 44 },
    axis: { x: 1, y: -0.2 },
};
const palmSeContact = {
    id: 'palm-se-contact-fingertips',
    motion: 'double-palm-south-east',
    frame: 6,
    mask: [
        { x: 68, y: 38 },
        { x: 71, y: 38 },
        { x: 74, y: 41 },
        { x: 74, y: 45 },
        { x: 70, y: 47 },
        { x: 68, y: 44 },
    ],
    pivot: { x: 68, y: 44 },
    axis: { x: 1, y: -0.2 },
};
const palmNeTransit = {
    id: 'palm-ne-transit-fingertips',
    motion: 'double-palm-north-east',
    frame: 5,
    mask: [
        { x: 70, y: 35 },
        { x: 73, y: 36 },
        { x: 76, y: 38 },
        { x: 75, y: 41 },
        { x: 71, y: 42 },
        { x: 69, y: 39 },
    ],
    pivot: { x: 69, y: 39 },
    axis: { x: 1, y: -0.25 },
};
const palmNeContact = {
    id: 'palm-ne-contact-fingertips',
    motion: 'double-palm-north-east',
    frame: 6,
    mask: [
        { x: 70, y: 37 },
        { x: 73, y: 37 },
        { x: 76, y: 40 },
        { x: 76, y: 43 },
        { x: 72, y: 45 },
        { x: 69, y: 42 },
    ],
    pivot: { x: 69, y: 42 },
    axis: { x: 1, y: -0.25 },
};
// visible-low-sweep 4번의 화면 왼쪽 발끝이다. 두 방향의 발 높이가 달라 별도 마스크다.
// 지면에 닿는 발의 실제 모양·각도를 바꾸지 않고 1.2px 흐림만 덧그린다.
const sweepSeFoot = {
    id: 'sweep-se-contact-toe',
    motion: 'visible-low-sweep-south-east',
    frame: 4,
    mask: [
        { x: 16, y: 68 },
        { x: 21, y: 67 },
        { x: 25, y: 68 },
        { x: 26, y: 72 },
        { x: 23, y: 75 },
        { x: 17, y: 75 },
        { x: 13, y: 72 },
    ],
    pivot: { x: 25, y: 71 },
    axis: { x: -1, y: 0 },
};
const sweepNeFoot = {
    id: 'sweep-ne-contact-toe',
    motion: 'visible-low-sweep-north-east',
    frame: 4,
    mask: [
        { x: 18, y: 54 },
        { x: 24, y: 54 },
        { x: 24, y: 62 },
        { x: 23, y: 65 },
        { x: 18, y: 65 },
        { x: 17, y: 61 },
        { x: 17, y: 57 },
    ],
    pivot: { x: 24, y: 60 },
    axis: { x: -1, y: 0 },
};
// horizontal-elbow-south-east/frame_000.png은 역순 회수 뒤 실제로 돌아오는 가드다.
// 몸의 왼쪽에 드러난 굽은 꼬리 끝을 잡고 위쪽 몸·바지는 뺀다.
// 아래 외곽은 투명 여백까지 감싸고 실제 몸쪽 연결점에 회전 중심을 둔다.
const elbowSeTail = {
    id: 'elbow-tail-follow-through',
    label: '꼬리 끝 후속 움직임',
    summary: '가로 회수 뒤 꼬리 끝이 반대쪽으로 늦게 따라오고 짧게 정착합니다.',
    kind: 'follow-through',
    swingDegrees: 4,
    timing: [
        { atMs: 0, amount: 0 },
        { atMs: 12, amount: 0 },
        { atMs: 34, amount: -1 },
        { atMs: 68, amount: 0.24 },
        { atMs: 116, amount: 0 },
    ],
    parts: [
        {
            id: 'elbow-se-final-tail-tip',
            motion: 'horizontal-elbow-south-east',
            frame: 0,
            occurrence: 'last',
            mask: [
                { x: 20, y: 55 },
                { x: 27, y: 55 },
                { x: 28, y: 60 },
                { x: 30, y: 61 },
                { x: 30, y: 64 },
                { x: 35, y: 65 },
                { x: 35, y: 68 },
                { x: 20, y: 68 },
            ],
            pivot: { x: 35, y: 65 },
            axis: { x: -0.8, y: -0.6 },
        },
    ],
};
// smear-hook-stable-south-east/frame_008.png의 x 27~39 바깥 꼬리 끝이다.
// 몸통과 기존 가로 띠는 포함하지 않으며 104px 원본 자체 좌표를 사용한다.
const hookTail = {
    id: 'hook-tail-follow-through',
    label: '꼬리 끝 후속 움직임',
    summary: '훅을 거두면 꼬리 끝이 회전 방향을 따라온 뒤 작은 반동을 거쳐 가라앉습니다.',
    kind: 'follow-through',
    swingDegrees: 5,
    timing: [
        { atMs: 0, amount: 0 },
        { atMs: 6, amount: 0 },
        { atMs: 30, amount: 1 },
        { atMs: 78, amount: -0.32 },
        { atMs: 125, amount: 0 },
    ],
    parts: [
        {
            id: 'hook-final-tail-tip',
            motion: 'smear-hook-stable-south-east',
            frame: 8,
            occurrence: 'last',
            mask: [
                { x: 26, y: 62 },
                { x: 39, y: 62 },
                { x: 39, y: 72 },
                { x: 26, y: 72 },
            ],
            pivot: { x: 39, y: 67 },
            axis: { x: -1, y: 0 },
        },
    ],
};
// smear-hammerfist-clean-south-east/frame_008.png에서 따로 확인한 꼬리 끝이다.
// x 36 이후의 몸·바지와 공격 중 대각 띠를 건드리지 않고 마지막 가드만 쓴다.
const hammerTail = {
    id: 'hammer-tail-follow-through',
    label: '꼬리 끝 후속 움직임',
    summary: '내려친 몸을 세운 뒤 꼬리 끝이 아래로 늦게 따라오고 짧게 가라앉습니다.',
    kind: 'follow-through',
    swingDegrees: 5,
    timing: [
        { atMs: 0, amount: 0 },
        { atMs: 16, amount: 0 },
        { atMs: 42, amount: -1 },
        { atMs: 82, amount: 0.28 },
        { atMs: 120, amount: 0 },
    ],
    parts: [
        {
            id: 'hammer-final-tail-tip',
            motion: 'smear-hammerfist-clean-south-east',
            frame: 8,
            occurrence: 'last',
            mask: [
                { x: 22, y: 62 },
                { x: 35, y: 62 },
                { x: 35, y: 72 },
                { x: 22, y: 72 },
            ],
            pivot: { x: 35, y: 67 },
            axis: { x: -1, y: 0 },
        },
    ],
};
const effectsByMotion = {
    rush: [jabBlur, guardTail],
    'flying-kick': [
        {
            id: 'flying-toe-smear',
            label: '올라가는 발끝 스미어',
            summary: '공중에서 발이 올라가는 중간 자세의 발끝만 짧게 늘입니다.',
            kind: 'part-smear',
            stretch: 0.18,
            parts: [flyingTransitFoot],
        },
        {
            id: 'flying-toe-blur',
            label: '공중 발끝 블러',
            summary: '발끝이 도착한 순간만 상승 방향으로 흐리고 공중 유지에서는 선명해집니다.',
            kind: 'part-blur',
            distance: 1.5,
            samples: 4,
            timing: [
                { atMs: 0, amount: 1 },
                { atMs: 10, amount: 0.5 },
                { atMs: 28, amount: 0 },
            ],
            parts: [flyingContactFoot],
        },
        guardTailResponse({
            summary: '착지 뒤 몸을 세우면 꼬리 끝이 아래로 늦게 따라온 뒤 짧게 정착합니다.',
            swingDegrees: 6,
            timing: [
                { atMs: 0, amount: 0 },
                { atMs: 16, amount: 0 },
                { atMs: 40, amount: -1 },
                { atMs: 78, amount: 0.24 },
                { atMs: 130, amount: 0 },
            ],
        }),
    ],
    // 이 네 동작의 몸·팔다리는 원본에서 겹침이 커 바깥 꼬리 끝만 움직인다.
    'slide-sweep': [
        guardTailResponse({
            summary: '낮은 이동을 멈춘 뒤 꼬리 끝이 뒤로 따라오고 짧게 가라앉습니다.',
            swingDegrees: 5,
            timing: [
                { atMs: 0, amount: 0 },
                { atMs: 6, amount: 0 },
                { atMs: 24, amount: 1 },
                { atMs: 62, amount: -0.28 },
                { atMs: 106, amount: 0 },
            ],
        }),
    ],
    cheolsango: [
        guardTailResponse({
            summary: '몸통 충돌을 거두면 꼬리 끝이 짧게 따라와 가라앉습니다.',
            swingDegrees: 6,
            timing: [
                { atMs: 0, amount: 0 },
                { atMs: 4, amount: 0 },
                { atMs: 22, amount: -1 },
                { atMs: 52, amount: 0.32 },
                { atMs: 98, amount: 0 },
            ],
        }),
    ],
    'elbow-chop': [
        guardTailResponse({
            summary: '빠른 내려치기 뒤 꼬리 끝도 짧게 반응하고 가드 안에서 가라앉습니다.',
            swingDegrees: 4,
            timing: [
                { atMs: 0, amount: 0 },
                { atMs: 6, amount: 0 },
                { atMs: 20, amount: -1 },
                { atMs: 42, amount: 0.22 },
                { atMs: 68, amount: 0 },
            ],
        }),
    ],
    'charged-uppercut': [
        guardTailResponse({
            summary: '올려친 몸을 낮추면 꼬리 끝이 늦게 따라오고 짧게 정착합니다.',
            swingDegrees: 5,
            timing: [
                { atMs: 0, amount: 0 },
                { atMs: 8, amount: 0 },
                { atMs: 30, amount: 1 },
                { atMs: 60, amount: -0.24 },
                { atMs: 108, amount: 0 },
            ],
        }),
    ],
    'ground-spin': [
        {
            id: 'spin-toe-blur',
            label: '회전 발끝 블러',
            summary: '회전 발끝이 도착한 순간만 흐리고 멈춘 자세는 선명하게 둡니다.',
            kind: 'part-blur',
            distance: 1.4,
            samples: 4,
            timing: [
                { atMs: 0, amount: 1 },
                { atMs: 10, amount: 0.55 },
                { atMs: 30, amount: 0 },
            ],
            parts: [spinFoot],
        },
        guardTailResponse({
            summary: '회전 회수 뒤 꼬리 끝이 늦게 돌아온 다음 가라앉습니다.',
            swingDegrees: 5,
            timing: [
                { atMs: 0, amount: 0 },
                { atMs: 8, amount: 0 },
                { atMs: 30, amount: 1 },
                { atMs: 70, amount: -0.3 },
                { atMs: 122, amount: 0 },
            ],
        }),
    ],
    'quick-jab': [jabBlur],
    'double-jab': [
        {
            ...jabBlur,
            id: 'double-jab-tip-blur',
            summary: '두 잽 각각 접촉 순간만 손끝을 흐리고 유지 자세는 선명하게 둡니다.',
            parts: [
                { ...jabHand, occurrence: 0 },
                { ...jabHand, id: 'second-jab-contact-hand', occurrence: 1 },
            ],
        },
    ],
    'new-horizontal-elbow-south-east': [elbowSeTail],
    'new-smear-hook-south-east': [hookTail],
    'new-smear-hammerfist-south-east': [hammerTail],
    'new-front-push-kick-south-east': [
        {
            id: 'push-kick-toe-smear',
            label: '밀어내는 발끝 스미어',
            summary: '발을 뻗는 중간 자세에서 발끝만 약 2px 이내로 늘입니다.',
            kind: 'part-smear',
            stretch: 0.2,
            parts: [pushKickSeTransit],
        },
        {
            id: 'push-kick-toe-blur',
            label: '앞차기 발끝 블러',
            summary: '발을 뻗은 직후 짧은 흐림을 걷어 밀어낸 끝 자세를 선명하게 둡니다.',
            kind: 'part-blur',
            distance: 1.5,
            samples: 4,
            timing: [
                { atMs: 0, amount: 1 },
                { atMs: 12, amount: 0.45 },
                { atMs: 34, amount: 0 },
            ],
            parts: [pushKickSeContact],
        },
        {
            id: 'push-kick-toe-overshoot',
            label: '발끝 작은 오버슈트',
            summary: '공중 발끝이 목표 자세를 아주 조금 지난 뒤 같은 자리로 돌아옵니다.',
            kind: 'overshoot',
            rotationDegrees: -3,
            distance: 0.4,
            timing: [
                { atMs: 0, amount: 0 },
                { atMs: 12, amount: 1 },
                { atMs: 38, amount: -0.16 },
                { atMs: 64, amount: 0 },
            ],
            parts: [pushKickSeContact],
        },
    ],
    'new-front-push-kick-north-east': [
        {
            id: 'push-kick-toe-smear',
            label: '밀어내는 발끝 스미어',
            summary: '뒤에서 보이는 발의 중간 자세에서 발끝만 짧게 늘입니다.',
            kind: 'part-smear',
            stretch: 0.16,
            parts: [pushKickNeTransit],
        },
        {
            id: 'push-kick-toe-blur',
            label: '앞차기 발끝 블러',
            summary: '뒤에서 보이는 발끝도 도착 직후 흐림이 빠르게 걷힙니다.',
            kind: 'part-blur',
            distance: 1.5,
            samples: 4,
            timing: [
                { atMs: 0, amount: 1 },
                { atMs: 10, amount: 0.45 },
                { atMs: 30, amount: 0 },
            ],
            parts: [pushKickNeContact],
        },
        {
            id: 'push-kick-toe-overshoot',
            label: '발끝 작은 오버슈트',
            summary: '들어 올린 발끝이 아주 조금 더 향했다가 원래 각도로 가라앉습니다.',
            kind: 'overshoot',
            rotationDegrees: 3,
            distance: 0.4,
            timing: [
                { atMs: 0, amount: 0 },
                { atMs: 15, amount: 1 },
                { atMs: 43, amount: -0.14 },
                { atMs: 70, amount: 0 },
            ],
            parts: [pushKickNeContact],
        },
    ],
    'new-double-palm-south-east': [
        {
            id: 'palm-fingertip-smear',
            label: '앞 손끝 스미어',
            summary: '양손을 미는 중간 자세의 바깥 손끝만 짧게 늘입니다.',
            kind: 'part-smear',
            stretch: 0.18,
            parts: [palmSeTransit],
        },
        {
            id: 'palm-fingertip-blur',
            label: '앞 손끝 블러',
            summary: '양손이 도착한 순간만 바깥 손끝에 흐림을 남기고 유지 때 걷습니다.',
            kind: 'part-blur',
            distance: 1.2,
            samples: 4,
            timing: [
                { atMs: 0, amount: 1 },
                { atMs: 9, amount: 0.5 },
                { atMs: 28, amount: 0 },
            ],
            parts: [palmSeContact],
        },
    ],
    'new-double-palm-north-east': [
        {
            id: 'palm-fingertip-smear',
            label: '앞 손끝 스미어',
            summary: '뒤에서 보이는 바깥 손끝만 짧게 늘여 빠른 밀기를 연결합니다.',
            kind: 'part-smear',
            stretch: 0.18,
            parts: [palmNeTransit],
        },
        {
            id: 'palm-fingertip-blur',
            label: '앞 손끝 블러',
            summary: '뒤에서 보이는 손끝의 흐림이 빠르게 걷히고 끝 자세는 선명하게 남습니다.',
            kind: 'part-blur',
            distance: 1.2,
            samples: 4,
            timing: [
                { atMs: 0, amount: 1 },
                { atMs: 8, amount: 0.5 },
                { atMs: 26, amount: 0 },
            ],
            parts: [palmNeContact],
        },
    ],
    'new-visible-low-sweep-south-east': [
        {
            id: 'sweep-toe-blur',
            label: '낮은 발끝 블러',
            summary: '낮은 쓸기의 도착 직후만 발끝을 흐리고 접지 각도는 보존합니다.',
            kind: 'part-blur',
            distance: 1.2,
            samples: 4,
            timing: [
                { atMs: 0, amount: 1 },
                { atMs: 12, amount: 0.5 },
                { atMs: 32, amount: 0 },
            ],
            parts: [sweepSeFoot],
        },
    ],
    'new-visible-low-sweep-north-east': [
        {
            id: 'sweep-toe-blur',
            label: '낮은 발끝 블러',
            summary: '뒤에서 보이는 낮은 발끝도 도착 직후 흐림이 걷히고 접지 각도를 보존합니다.',
            kind: 'part-blur',
            distance: 1.2,
            samples: 4,
            timing: [
                { atMs: 0, amount: 1 },
                { atMs: 11, amount: 0.5 },
                { atMs: 30, amount: 0 },
            ],
            parts: [sweepNeFoot],
        },
    ],
};
// 가로 팔꿈치 NE의 마지막 가드0는 꼬리가 몸·바지 외곽에 겹쳐 있어 제외한다.
// 가로 팔꿈치의 겹친 팔과 훅·망치의 기존 스미어 띠는 분리·변형하지 않는다.
// 원본 마스크·발 기준·기본 자세는 유지하고 노출과 정착 시간만 동작별로 조절한다.
export function withPartEffects(motion) {
    const effects = effectsByMotion[motion.id];
    if (!effects)
        return motion;
    return { ...motion, effects: [...(motion.effects ?? []), ...effects] };
}
